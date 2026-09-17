/*
 * Phaser'in ESM paketinde VARSAYILAN DISA AKTARIM YOK - yalnizca adlandirilmis
 * disa aktarimlar var. `import Phaser from 'phaser'` tur denetiminden gecer
 * ama derlemede "Export default doesn't exist" ile patlar; ad alani olarak
 * almak dogru bicimdir.
 */
import * as Phaser from 'phaser'
import {
  WORLD, TILE_WORLD, toWorldX, toWorldY, px, diamondPoints, groundShapes, buildingPlacement, cityCenter,
  visualSignature, type Poly,
} from '@/lib/game/city-render'
import { SLOTS } from '@/lib/game/layout'
import { paletteFor, shapeFor } from '@/lib/game/building-art'
import { BUILDINGS, BUILDING_IDS, activeJob, type BuildingId, type Game } from '@/lib/game/engine'
import { asset, buildingImage } from '@/lib/asset'

/*
 * ŞEHİR SAHNESİ.
 *
 * Neden tuval: sehri parmakla gezebilmek icin dunyanin EKRANDAN BUYUK olmasi
 * gerekir. Eski DOM surumunde tuval, sehri sigdirmak icin tam olarak ekran
 * kadar olcekleniyordu - yani kaydirilacak tasma yoktu ve parmak hicbir sey
 * yapmiyordu. Sehir bu yuzden "olu" gorunuyordu; sorun render hizi degil,
 * dunya boyutuydu.
 *
 * Tuval bunu cozerken iki sey daha getiriyor: gercek bir kamera (ivmeli
 * kaydirma, iki parmakla yakinlastirma) ve ileride yuzlerce hareketli nesneyi
 * tasiyacak bir zemin.
 *
 * Paneller ve arayuz DOM'da kaliyor. Bu ikisi ayri katman - buyuk mobil
 * sehir oyunlari da boyle yapar: dunya tuvalde, menuler ustunde.
 */

const COLOR = {
  platform: 0x8f8760, platformEdge: 0x5f5940, rim: 0x6d6549,
  street: 0xb5ab85, road: 0x9a9070,
  padFull: 0xcbb98f, padFullEdge: 0x6f5f44,
  padFree: 0xaea583, padFreeEdge: 0x6f6a4e,
  wall: 0xc0b18c, wallEdge: 0x6b6049, wallTop: 0xe6dabb, gate: 0x9c8f6f, gateDark: 0x3f3828,
  quay: 0xa79b7d,
  pending: 0x6f6350, pendingEdge: 0xd9c185,
  label: 0x162b22, labelEdge: 0xc5aa72, labelActive: 0x594728,
  plot: 0x1f3a2a, plotEdge: 0xe9d7a6,
  sea: 0x123c46,
}

/** Suruklemeyi dokunustan ayiran esik (ekran pikseli). */
const TAP_SLOP = 12

/**
 * Bu birakma gercek bir DOKUNUS mu?
 *
 * Phaser, nesnenin uzerinde bir `pointerup` gorurse - basma baska yerde olsa
 * bile - olayi tetikler. Iki kosul aranir: parmak gercekten BASMIS olmali
 * (downTime) ve kalktigi yer bastigi yere yakin olmali. Ikincisi, haritayi
 * kaydirirken parmagin ustunden gectigi binanin panelinin acilmasini onler.
 */
function isTap(pointer: Phaser.Input.Pointer) {
  return pointer.downTime > 0
    && Phaser.Math.Distance.Between(pointer.downX, pointer.downY, pointer.upX, pointer.upY) < TAP_SLOP
}
const MIN_ZOOM = 0.3
const MAX_ZOOM = 1.6
/** Binanin ekranin ne kadarini kaplamasi hedefleniyor. */
const TARGET_BUILDING_FRACTION = 0.3

export type CityEvents = {
  onBuilding: (id: BuildingId) => void
  onPlot: (index: number) => void
}

export class CityScene extends Phaser.Scene {
  /** Oyun durumu. `game` adi Phaser.Scene tarafindan kullaniliyor. */
  private state!: Game
  private events$!: CityEvents
  private ground!: Phaser.GameObjects.Graphics
  private pieces: Phaser.GameObjects.GameObject[] = []
  private signature = ''
  private showLabels = false
  /** Insa kipi: bos arsalar yalnizca bu acikken gorunur. */
  private placing = false
  /** Surukleme mesafesi; dokunus mu kaydirma mi buradan anlasilir. */
  private dragDistance = 0
  private velocity = { x: 0, y: 0 }
  private pinchStart: { distance: number; zoom: number } | null = null

  constructor() { super('city') }

  init(data: { game: Game; events: CityEvents }) {
    this.state = data.game
    this.events$ = data.events
  }

  preload() {
    this.load.image('island', asset('/images/game/island.webp'))
    for (const id of BUILDING_IDS) if (BUILDINGS[id].art) this.load.image(id, buildingImage(id))
  }

  create() {
    this.cameras.main.setBackgroundColor(COLOR.sea)
    this.add.image(0, 0, 'island').setOrigin(0, 0).setDisplaySize(WORLD, WORLD).setDepth(-1000)
    this.ground = this.add.graphics().setDepth(-500)

    const cam = this.cameras.main
    cam.setBounds(0, 0, WORLD, WORLD)
    cam.setZoom(this.defaultZoom())
    const center = cityCenter()
    cam.centerOn(center.x, center.y)

    this.installCamera()
    this.redraw(true)
    this.scale.on('resize', () => this.cameras.main.setZoom(
      Phaser.Math.Clamp(this.cameras.main.zoom, this.minZoom(), MAX_ZOOM)))
  }

  /** Binayi ekranin hedeflenen oranina getiren yakinlastirma. */
  private defaultZoom() {
    return Phaser.Math.Clamp(
      (this.scale.width * TARGET_BUILDING_FRACTION) / TILE_WORLD,
      this.minZoom(), 1.2)
  }

  /** Dunyanin ekrandan kucuk kalmasini onleyen alt sinir. */
  private minZoom() {
    return Math.max(MIN_ZOOM, this.scale.width / WORLD, this.scale.height / WORLD)
  }

  /*
   * KAMERA.
   *
   * Surukleme, ivme ve iki parmakla yakinlastirma elle yazildi: Phaser'in
   * hazir kamera eklentisi masaustu fare jestlerine gore ayarli ve telefonda
   * hissi yanlis. Ivme, parmak kalktiktan sonra hareketin sonmesini saglar -
   * bu, "olu" ile "canli" arasindaki farkin buyuk kismi.
   */
  private installCamera() {
    this.input.addPointer(1)
    let last: { x: number; y: number } | null = null

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.input.pointer2?.isDown && this.input.pointer1?.isDown) {
        this.pinchStart = { distance: this.pointerGap(), zoom: this.cameras.main.zoom }
        return
      }
      last = { x: pointer.x, y: pointer.y }
      this.dragDistance = 0
      this.velocity = { x: 0, y: 0 }
    })

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      const cam = this.cameras.main
      if (this.pinchStart && this.input.pointer1?.isDown && this.input.pointer2?.isDown) {
        const gap = this.pointerGap()
        if (gap > 0 && this.pinchStart.distance > 0) {
          cam.setZoom(Phaser.Math.Clamp(
            this.pinchStart.zoom * (gap / this.pinchStart.distance), this.minZoom(), MAX_ZOOM))
        }
        return
      }
      if (!pointer.isDown || !last) return
      const dx = pointer.x - last.x, dy = pointer.y - last.y
      last = { x: pointer.x, y: pointer.y }
      this.dragDistance += Math.hypot(dx, dy)
      cam.scrollX -= dx / cam.zoom
      cam.scrollY -= dy / cam.zoom
      this.velocity = { x: -dx / cam.zoom, y: -dy / cam.zoom }
    })

    this.input.on('pointerup', () => {
      last = null
      if (!this.input.pointer1?.isDown && !this.input.pointer2?.isDown) this.pinchStart = null
    })

    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      const cam = this.cameras.main
      cam.setZoom(Phaser.Math.Clamp(cam.zoom * (dy > 0 ? 0.9 : 1.1), this.minZoom(), MAX_ZOOM))
    })
  }

  private pointerGap() {
    const a = this.input.pointer1, b = this.input.pointer2
    return a && b ? Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y) : 0
  }

  update() {
    // Parmak kalktiktan sonra hareket sonerek durur.
    if (Math.abs(this.velocity.x) < 0.08 && Math.abs(this.velocity.y) < 0.08) return
    if (this.input.activePointer.isDown) return
    const cam = this.cameras.main
    cam.scrollX += this.velocity.x
    cam.scrollY += this.velocity.y
    this.velocity.x *= 0.92
    this.velocity.y *= 0.92
  }

  /** React tarafindan cagrilir; yalnizca GORUNEN bir sey degistiyse cizer. */
  sync(game: Game, showLabels: boolean, placing: boolean) {
    this.state = game
    // Sahne hazir olmadan cagrilabilir: React durumu, Phaser boot'undan hizli.
    if (!this.ground) return
    const next = `${visualSignature(game)}|${showLabels}|${placing}`
    if (next === this.signature) return
    this.showLabels = showLabels
    this.placing = placing
    this.redraw(false)
  }

  /** Yakinlastirmayi bir carpanla degistirir (masaustu dugmeleri icin). */
  zoomBy(factor: number) {
    if (!this.ground) return
    const cam = this.cameras.main
    cam.setZoom(Phaser.Math.Clamp(cam.zoom * factor, this.minZoom(), MAX_ZOOM))
  }

  /** Kamerayi sehrin merkezine ve varsayilan yakinliga dondurur. */
  recenter() {
    if (!this.ground) return
    const cam = this.cameras.main
    cam.setZoom(this.defaultZoom())
    const center = cityCenter()
    cam.centerOn(center.x, center.y)
    this.velocity = { x: 0, y: 0 }
  }

  private fill(poly: Poly, color: number, alpha = 1) {
    this.ground.fillStyle(color, alpha)
    this.ground.fillPoints(poly, true)
  }

  private stroke(poly: Poly, color: number, width: number, alpha = 1) {
    this.ground.lineStyle(width, color, alpha)
    this.ground.strokePoints(poly, true)
  }

  /**
   * Icı bos bir HALKA cizer.
   *
   * Phaser'in Graphics'i evenodd dolgu kurali sunmaz; ici dolu bir cokgenden
   * digerini "kesmek" mumkun degil. Cozum, halkayi kose kose dort kenarli
   * seritlere bolmek: her serit dis ve ic cokgenin ayni iki kosesinden olusur.
   * Boylece sur, arkasindaki boyali sehri ortmeden orulur.
   */
  private drawRing(outer: Poly, inner: Poly, color: number) {
    this.ground.fillStyle(color, 1)
    for (let i = 0; i < outer.length; i++) {
      const j = (i + 1) % outer.length
      this.ground.fillPoints([outer[i], outer[j], inner[j], inner[i]], true)
    }
  }

  private redraw(first: boolean) {
    this.signature = `${visualSignature(this.state)}|${this.showLabels}|${this.placing}`
    const shapes = groundShapes(this.state)

    this.ground.clear()

    /*
     * Yollar. Zemin boyali oldugu icin yol da yari saydam cizilir: altindaki
     * toprak dokusu okunur, yol onun uzerine serilmis tas gibi durur.
     */
    for (const street of shapes.streets) {
      this.ground.fillStyle(COLOR.street, 0.34)
      this.ground.fillRect(street.x, street.y, street.w, street.h)
      this.ground.lineStyle(2, COLOR.padFullEdge, 0.22)
      this.ground.strokeRect(street.x, street.y, street.w, street.h)
    }
    if (shapes.walls) {
      const w = shapes.walls
      /*
       * Sur bir HALKA: dis cokgen dolduruluyor, ic cokgen zemin rengiyle
       * geri kaziniyor. Phaser'in Graphics'i evenodd kurali sunmadigi icin
       * yol bu - sonuc ayni, ici bos bir kale duvari.
       */
      this.drawRing(w.outer, w.inner, COLOR.wall)
      this.stroke(w.outer, COLOR.wallEdge, 5)
      /*
       * Halkanin ICI, arkaplanin boyali topragiyla ayni renge boyanmaz -
       * oyuk, arkaplani gosterecek sekilde "kesilir". Phaser Graphics
       * evenodd sunmadigi icin ic cokgen yalnizca cizgiyle isaretlenir;
       * dolgu olsaydi boyali zemini ortecekti.
       */
      this.stroke(w.inner, COLOR.wallEdge, 4)
      for (const tower of w.towers) {
        this.fill(tower, COLOR.wallTop)
        this.stroke(tower, COLOR.wallEdge, 4)
      }
      this.fill(w.gate, COLOR.gate)
      this.stroke(w.gate, COLOR.wallEdge, 4)
      this.ground.fillStyle(COLOR.gateDark, 1)
      this.ground.fillEllipse(w.gateArch.x, w.gateArch.y, px(3.6), px(3.4))
    }

    /*
     * BOS arsa yalnizca insa kipinde gorunur.
     *
     * Yirmi kesik cizgili elmasi surekli cizmek, dunyayi bir dunya degil bir
     * EDITOR gibi gosteriyordu - referans oyunlarin hicbirinde bos arsa
     * isareti durmaz, yalnizca yerlestirme aninda belirir.
     */
    if (this.placing) {
      for (const pad of shapes.pads) {
        if (pad.occupied) continue
        this.fill(pad.shape, COLOR.padFree, 0.34)
        this.stroke(pad.shape, COLOR.padFreeEdge, 5)
      }
    }

    for (const piece of this.pieces) piece.destroy()
    this.pieces = []
    const running = activeJob(this.state)?.id
    for (const slot of SLOTS) {
      const id = BUILDING_IDS.find(b => this.state.placement[b] === slot.index) ?? null
      if (id) this.addBuilding(id, slot, running === id)
      else this.addEmptyPlot(slot)
    }
    if (first) this.ground.setAlpha(0).setAlpha(1)
  }

  private addBuilding(id: BuildingId, slot: typeof SLOTS[number], building: boolean) {
    const p = buildingPlacement(id, slot)
    const level = this.state.buildings[id]
    let object: Phaser.GameObjects.GameObject

    /*
     * Binanin YERE BASMASI icin altina yumusak bir golge.
     *
     * Golgesiz sprite zeminin uzerinde YUZUYOR gibi durur; bu, ucuz gorunmenin
     * en sik sebeplerinden biri. Golge karonun kendisinden biraz kucuk ve
     * isik yonune (sol ust) gore hafif saga kaydirilmistir.
     */
    const shadow = this.add.graphics().setDepth(p.depth - 0.3)
    shadow.fillStyle(0x0d1c16, 0.3)
    shadow.fillEllipse(p.x + px(0.8), p.y + px(0.5), p.size * 0.66, p.size * 0.3)
    this.pieces.push(shadow)

    if (BUILDINGS[id].art) {
      const image = this.add.image(p.x, p.y, id).setOrigin(0.5, p.originY)
      image.setDisplaySize(p.size, p.size)
      image.setDepth(p.depth)
      object = image
    } else {
      // Gorseli olmayan yapi, kutu yerine basit bir izometrik bina olarak
      // cizilir (bkz. building-art.ts).
      const plate = this.add.graphics().setDepth(p.depth)
      this.drawPlaceholder(plate, p.x, p.y, p.size, id, level)
      object = plate
    }
    this.pieces.push(object)

    const hit = this.add.rectangle(p.x, p.y - p.size * 0.3, p.size * 0.86, p.size * 0.7)
      .setInteractive({ useHandCursor: true })
      .setFillStyle(0xffffff, 0)
      .setDepth(p.depth + 0.2)
    hit.on('pointerup', (pointer: Phaser.Input.Pointer) => { if (isTap(pointer)) this.events$.onBuilding(id) })
    this.pieces.push(hit)

    /*
     * Varsayilan olarak yalnizca SEVIYE ROZETI gorunur.
     *
     * Yirmi arsanin her birine ad levhasi koymak sehri bir yazi yigini
     * yapiyordu; referans oyunlarda bina adi haritada hic yazmaz, dokununca
     * panelde cikar. Ad levhasi bayrak dugmesiyle acilir.
     */
    this.pieces.push(this.makeBadge(p.x + p.size * 0.30, p.y + px(1.1), level, p.depth + 0.4, building))
    if (this.showLabels) {
      this.pieces.push(this.makeLabel(p.x, p.y + px(2.4), BUILDINGS[id].name, p.depth + 0.5, building))
    }
  }

  private addEmptyPlot(slot: typeof SLOTS[number]) {
    const x = toWorldX(slot.x), y = toWorldY(slot.y)
    const r = TILE_WORLD * 0.14
    if (!this.placing) {
      // Isaret yok ama dokunma alani duruyor: bos zemine dokunmak yine de
      // "buraya ne kurulur" panelini acar.
      this.addPlotHit(x, y, slot.index)
      return
    }
    const mark = this.add.graphics().setDepth(slot.y + 0.1)
    mark.fillStyle(COLOR.plot, 0.62)
    mark.fillCircle(x, y, r)
    mark.lineStyle(3, COLOR.plotEdge, 0.6)
    mark.strokeCircle(x, y, r)
    mark.lineStyle(5, COLOR.plotEdge, 0.85)
    mark.lineBetween(x - r * 0.45, y, x + r * 0.45, y)
    mark.lineBetween(x, y - r * 0.45, x, y + r * 0.45)
    this.pieces.push(mark)

    this.addPlotHit(x, y, slot.index)
  }

  private addPlotHit(x: number, y: number, index: number) {
    const hit = this.add.rectangle(x, y, TILE_WORLD * 0.8, TILE_WORLD * 0.4)
      .setInteractive({ useHandCursor: true })
      .setFillStyle(0xffffff, 0)
      .setDepth(y + 0.2)
    hit.on('pointerup', (pointer: Phaser.Input.Pointer) => { if (isTap(pointer)) this.events$.onPlot(index) })
    this.pieces.push(hit)
  }

  /**
   * Basit izometrik bina: tas kaide, iki duvar yuzu, piramit cati.
   *
   * Isik sol ustten geldigi icin SOL-ON yuz aydinlik, SAG-ON yuz golgede.
   * Guney tarafindan bakildigi icin yalnizca bu iki yuz gorunur; arka yuzleri
   * cizmek bosa is olurdu.
   */
  private drawPlaceholder(g: Phaser.GameObjects.Graphics, x: number, y: number, size: number, id: BuildingId, level: number) {
    const c = paletteFor(id)
    const s = shapeFor(size, level)
    const hw = s.width / 2, hd = s.depth / 2
    const top = y - s.body

    // Tas kaide: binanin yere bastigi yer.
    g.fillStyle(c.base, 1)
    g.fillPoints(diamondPoints(x, y, s.foot, s.foot / 2), true)
    g.lineStyle(3, c.baseEdge, 0.9)
    g.strokePoints(diamondPoints(x, y, s.foot, s.foot / 2), true)

    // Duvarlar: sol-on (aydinlik) ve sag-on (golge).
    g.fillStyle(c.wallLit, 1)
    g.fillPoints([{ x: x - hw, y }, { x, y: y + hd }, { x, y: top + hd }, { x: x - hw, y: top }], true)
    g.fillStyle(c.wallShade, 1)
    g.fillPoints([{ x, y: y + hd }, { x: x + hw, y }, { x: x + hw, y: top }, { x, y: top + hd }], true)

    // Cati: saçaklı piramit, tepe noktasi ortada.
    const ew = hw + s.eave, ed = hd + s.eave / 2
    const apex = { x, y: top - s.roof }
    g.fillStyle(c.roofLit, 1)
    g.fillPoints([{ x: x - ew, y: top }, { x, y: top + ed }, apex], true)
    g.fillStyle(c.roofShade, 1)
    g.fillPoints([{ x, y: top + ed }, { x: x + ew, y: top }, apex], true)
    // Saçak cizgisi ve mahya, siluete keskinlik verir.
    g.lineStyle(2.5, c.baseEdge, 0.5)
    g.strokePoints([{ x: x - ew, y: top }, { x, y: top + ed }, { x: x + ew, y: top }], false)
    g.lineBetween(x, top + ed, apex.x, apex.y)
    // Duvarlarin dis hatti: bina, altindaki topraga yapismis gibi durmasin.
    g.lineStyle(2.5, c.baseEdge, 0.45)
    g.strokePoints([{ x: x - hw, y }, { x, y: y + hd }, { x: x + hw, y }], false)
    g.lineBetween(x, y + hd, x, top + hd)
  }

  /** Bina adi levhasi: arkasi koyu plaka, kenari pirinc. */
  private makeLabel(x: number, y: number, text: string, depth: number, active: boolean) {
    const label = this.add.text(0, 0, text, {
      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      fontSize: `${Math.round(px(1.35))}px`,
      color: '#fff2d8',
      fontStyle: '600',
    }).setOrigin(0.5, 0.5).setResolution(2)

    const padX = px(0.9), padY = px(0.5)
    const w = label.width + padX * 2, h = label.height + padY * 2
    const plate = this.add.graphics()
    plate.fillStyle(active ? COLOR.labelActive : COLOR.label, 0.92)
    plate.fillRoundedRect(-w / 2, -h / 2, w, h, px(0.4))
    plate.lineStyle(3, COLOR.labelEdge, active ? 1 : 0.55)
    plate.strokeRoundedRect(-w / 2, -h / 2, w, h, px(0.4))

    return this.add.container(x, y, [plate, label]).setDepth(depth)
  }

  /** Kucuk seviye rozeti: altin bir pul, uzerinde sayi. */
  private makeBadge(x: number, y: number, level: number, depth: number, active: boolean) {
    const r = px(1.5)
    const plate = this.add.graphics()
    plate.fillStyle(active ? COLOR.labelActive : 0x13281f, 0.94)
    plate.fillCircle(0, 0, r)
    plate.lineStyle(2.5, COLOR.labelEdge, active ? 1 : 0.8)
    plate.strokeCircle(0, 0, r)
    const text = this.add.text(0, 0, String(level), {
      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      fontSize: `${Math.round(px(1.45))}px`,
      color: '#f5e2b4',
      fontStyle: '700',
    }).setOrigin(0.5, 0.5).setResolution(2)
    return this.add.container(x, y, [plate, text]).setDepth(depth)
  }
}
