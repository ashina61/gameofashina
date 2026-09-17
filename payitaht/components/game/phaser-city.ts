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
  private showLabels = true
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
  sync(game: Game, showLabels: boolean) {
    this.state = game
    // Sahne hazir olmadan cagrilabilir: React durumu, Phaser boot'undan hizli.
    if (!this.ground) return
    const next = `${visualSignature(game)}|${showLabels}`
    if (next === this.signature) return
    this.showLabels = showLabels
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
    this.signature = `${visualSignature(this.state)}|${this.showLabels}`
    const shapes = groundShapes(this.state)

    this.ground.clear()
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

    for (const pad of shapes.pads) {
      this.fill(pad.shape, pad.occupied ? COLOR.padFull : COLOR.padFree, pad.occupied ? 0.5 : 0.34)
      this.stroke(pad.shape, pad.occupied ? COLOR.padFullEdge : COLOR.padFreeEdge, 5)
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
      /*
       * Gorseli HENUZ gelmemis yapi, kirik resim yerine bir SANTIYE olarak
       * cizilir: tas temel, uzerinde iskele. Duz bir dikdortgen "eksik varlik"
       * gibi duruyordu; santiye ise oyunun kendi diliyle "yapiliyor" der ve
       * boyali gorsel geldiginde tek bir bayrak cevrilir.
       */
      const w = p.size * 0.62, h = w * 0.58
      const top = p.y - h - px(0.6)
      const plate = this.add.graphics().setDepth(p.depth)
      // Tas temel: karonun uzerine oturan kucuk bir elmas.
      plate.fillStyle(0x7d7461, 1)
      plate.fillPoints(diamondPoints(p.x, p.y, p.size * 0.66, p.size * 0.3).map(pt => ({ x: pt.x, y: pt.y })), true)
      plate.lineStyle(4, 0x554e3f, 1)
      plate.strokePoints(diamondPoints(p.x, p.y, p.size * 0.66, p.size * 0.3), true)
      // Govde ve iskele.
      plate.fillStyle(COLOR.pending, 0.95)
      plate.fillRect(p.x - w / 2, top, w, h)
      plate.lineStyle(4, COLOR.pendingEdge, 0.75)
      plate.strokeRect(p.x - w / 2, top, w, h)
      plate.lineStyle(3, COLOR.pendingEdge, 0.45)
      plate.lineBetween(p.x - w / 2, top + h, p.x + w / 2, top)
      plate.lineBetween(p.x - w / 2, top + h / 2, p.x + w / 2, top + h / 2)
      object = plate
    }
    this.pieces.push(object)

    const hit = this.add.rectangle(p.x, p.y - p.size * 0.3, p.size * 0.86, p.size * 0.7)
      .setInteractive({ useHandCursor: true })
      .setFillStyle(0xffffff, 0)
      .setDepth(p.depth + 0.2)
    hit.on('pointerup', (pointer: Phaser.Input.Pointer) => { if (isTap(pointer)) this.events$.onBuilding(id) })
    this.pieces.push(hit)

    if (this.showLabels || building) {
      this.pieces.push(this.makeLabel(
        p.x, p.y + px(1.6), `${BUILDINGS[id].name}  ${level}`, p.depth + 0.4, building))
    }
  }

  private addEmptyPlot(slot: typeof SLOTS[number]) {
    const x = toWorldX(slot.x), y = toWorldY(slot.y)
    const r = TILE_WORLD * 0.14
    const mark = this.add.graphics().setDepth(slot.y + 0.1)
    mark.fillStyle(COLOR.plot, 0.62)
    mark.fillCircle(x, y, r)
    mark.lineStyle(3, COLOR.plotEdge, 0.6)
    mark.strokeCircle(x, y, r)
    mark.lineStyle(5, COLOR.plotEdge, 0.85)
    mark.lineBetween(x - r * 0.45, y, x + r * 0.45, y)
    mark.lineBetween(x, y - r * 0.45, x, y + r * 0.45)
    this.pieces.push(mark)

    const hit = this.add.rectangle(x, y, TILE_WORLD * 0.8, TILE_WORLD * 0.4)
      .setInteractive({ useHandCursor: true })
      .setFillStyle(0xffffff, 0)
      .setDepth(slot.y + 0.2)
    hit.on('pointerup', (pointer: Phaser.Input.Pointer) => { if (isTap(pointer)) this.events$.onPlot(slot.index) })
    this.pieces.push(hit)
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
}
