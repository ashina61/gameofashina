/*
 * Phaser'in ESM paketinde VARSAYILAN DISA AKTARIM YOK - yalnizca adlandirilmis
 * disa aktarimlar var. `import Phaser from 'phaser'` tur denetiminden gecer
 * ama derlemede "Export default doesn't exist" ile patlar; ad alani olarak
 * almak dogru bicimdir.
 */
import * as Phaser from 'phaser'
import {
  WORLD, TILE_WORLD, toWorldX, toWorldY, px, diamondPoints, groundShapes, buildingPlacement, islandExtent,
  visualSignature, type Poly,
} from '@/lib/game/city-render'
import { SLOTS, USES_MEASURED, CENTER, ringOf } from '@/lib/game/layout'
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

/*
 * PALET - duz, stilize, tek elden.
 *
 * Boyali gercekcilikten vazgectik: dunyanin tamamini kod ciziyor, dolayisiyla
 * butun renkler burada, tek bir yerde. Uyum, asset sayisindan degil tek bir
 * paletten gelir. Sicak Akdeniz: turkuaz deniz, kum kiyi, zeytin yesili cim.
 */
const COLOR = {
  sea: 0x1c6b78, seaDeep: 0x114a54,
  beach: 0xe6d3a2, beachEdge: 0xcdb478,
  grass: 0x74a44a, grassAlt: 0x689740, grassEdge: 0x527f34,
  street: 0xd6c28c, streetEdge: 0xb09a5f,
  padFull: 0xd9c58b, padFullEdge: 0xa8925c,
  padFree: 0xe5d29a, padFreeEdge: 0xbaa46c,
  wall: 0xbcb4a4, wallEdge: 0x6b6354, wallTop: 0xdcd4c2, gate: 0x9c8f6f, gateDark: 0x37301f, wallShadow: 0x2a3b2e,
  pending: 0x9c8f74, pendingEdge: 0xd9c185,
  label: 0x14281f, labelEdge: 0xc5aa72, labelActive: 0x5a4728,
  plot: 0x27492d, plotEdge: 0xf0e2b4,
  tree: 0x4a8a44, treeDark: 0x356a34, trunk: 0x6b4a2e,
  rock: 0x9a9488, rockDark: 0x6f6a5e,
  // Liman iskelesi: denize uzanan ahsap platform.
  deck: 0xb8895a, deckDark: 0x8a6238, deckEdge: 0x5f4223, post: 0x4a331d,
}

/*
 * Sabit tohumlu rastgele.
 *
 * Dekor (agac, kaya) her cizimde AYNI yerde durmali; Math.random her karede
 * ormani zipzip oynatirdi. Bu uretec tohumdan deterministiktir.
 */
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Nokta bir cokgenin icinde mi? (dekoru adanin disina tasirmamak icin) */
function inPoly(px: number, py: number, poly: { x: number; y: number }[]) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j]
    if ((a.y > py) !== (b.y > py) && px < ((b.x - a.x) * (py - a.y)) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
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
/** Ust ve alt arayuz seritleri icin acilis fitinden dusulen CSS piksel. */
const OVERLAY = 260

/** Yuklenecek zemin karolari (public/images/game/terrain/*.png). */
const TERRAIN_TILES = ['grass', 'water'] as const

/** Adanin bos yerlerine serpilen dogal dekor (public/images/game/decor/*.png). */
const DECOR_SCATTER = ['olive-tree', 'bush', 'flower', 'rock'] as const
/** Sehre hayat katan landmark objeleri (cesme, heykel, tezgah...). */
const DECOR_LANDMARK = ['fountain', 'statue', 'market-stall', 'cart', 'amphora', 'barrel', 'bench', 'lamp'] as const

/**
 * YOL KAROLARI. AI uretimi tek-parca karolar; baglantiya gore secilip
 * flipX/flipY ile dondurulur. Temel karolarin yonu ekrandan kalibre edildi.
 */
const RD = { straight: 'r_ee461161', curve: 'r_2f35a6f0', cross: 'r_dfb488f8', t: 'r_d3a81f84', plaza: 'r_8c27c20f' } as const
const ROAD_FILES = ['ee461161', '2f35a6f0', 'dfb488f8', 'd3a81f84', '8c27c20f'] as const


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
  /** Statik zemin karolari - bir kez kurulur, redraw'da temizlenmez. */
  private terrain: Phaser.GameObjects.Image[] = []
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
    // Boyali arkaplan modunda ada resmini yukle; stilize modda dunyayi
    // tamamen kod ciziyor, resme gerek yok.
    if (USES_MEASURED) this.load.image('island', asset('/images/game/island.webp'))
    for (const id of BUILDING_IDS) if (BUILDINGS[id].art) this.load.image(id, buildingImage(id))
    // Zemin tile'lari: kara ve deniz artik gercek boyali izometrik karolar.
    for (const t of TERRAIN_TILES) this.load.image(`t_${t}`, asset(`/images/game/terrain/${t}.png`))
    // Dogal dekor + landmark sprite'lari.
    for (const d of DECOR_SCATTER) this.load.image(`d_${d}`, asset(`/images/game/decor/${d}.png`))
    for (const d of DECOR_LANDMARK) this.load.image(`d_${d}`, asset(`/images/game/decor/${d}.png`))
    // Yol karolari.
    for (const r of ROAD_FILES) this.load.image(`r_${r}`, asset(`/images/game/roads/${r}.png`))
  }

  create() {
    this.cameras.main.setBackgroundColor(COLOR.sea)
    if (USES_MEASURED) {
      this.add.image(0, 0, 'island').setOrigin(0, 0).setDisplaySize(WORLD, WORLD).setDepth(-1000)
    } else {
      // Kara ve deniz artik gercek izometrik zemin karolariyla dosenir.
      this.drawTerrain()
    }
    this.ground = this.add.graphics().setDepth(-500)

    const cam = this.cameras.main
    cam.setBounds(0, 0, WORLD, WORLD)
    cam.setZoom(this.defaultZoom())
    const island = islandExtent()
    cam.centerOn(island.cx, island.cy)

    this.installCamera()
    this.redraw(true)
    this.scale.on('resize', () => this.cameras.main.setZoom(
      Phaser.Math.Clamp(this.cameras.main.zoom, this.minZoom(), MAX_ZOOM)))
  }

  /**
   * ADAYI EKRANA SIGDIRAN yakinlastirma.
   *
   * Eskiden yalnizca bina boyutuna bakiyordu ve ada ekrana sigmadigi icin
   * altta koca bir bos cim kaliyordu. Artik ada govdesini hem genislige hem
   * yukseklige (arayuz seritlerini dustukten sonra) sigdirir; iki oranin
   * kucugu secilir ki ada tam gorunsun.
   */
  private defaultZoom() {
    const island = islandExtent()
    /*
     * Binalar arsalarindan TASAR (yuksek catilar, genis tabanlar); kamera
     * yalnizca arsa sinirlarina sigdirirsa kenardaki binalar kirpilir. Bu
     * yuzden hem yatayda hem dikeyde ekstra pay birakilir - island.w/h zaten
     * arsa kutusu, binalarin tasmasi icin ustune %30 marj.
     */
    const overflow = 1.32
    const fitW = (this.scale.width * 0.94) / (island.w * overflow)
    const fitH = (this.scale.height - OVERLAY * this.dpr()) / (island.h * overflow)
    return Phaser.Math.Clamp(Math.min(fitW, fitH), this.minZoom(), 1.1)
  }

  /** Ust (kaynak/oyuncu) ve alt (menu) seritlerinin ekranda kapladigi CSS px. */
  private dpr() { return Math.min(2, (typeof window !== 'undefined' ? window.devicePixelRatio : 1) || 1) }

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

  /**
   * ZEMİN KAROLARI.
   *
   * Kara ve deniz artik kod-cizimi degil, gercek boyali izometrik karolar
   * (public/images/game/terrain). Karolar bir IZOMETRIK IZGARADA arka-on
   * siralamayla dizilir: onualardaki karonun govdesi arkatakinin toprak
   * yamacini orter, boylece yalnizca adanin ON kenarinda kesit gorunur -
   * geri kalan her yer duz cim yuzeyidir.
   *
   * Karonun UST YUZU 2:1 bir elmastir; govde (toprak) altta kalir. Karo,
   * ust-yuz elmasinin merkezi hucreye denk gelecek sekilde yerlestirilir.
   */
  private drawTerrain() {
    /*
     * Karo GENISLIGI izgara adiminin biraz USTUNDE: komsu karolar hafifce
     * bindirir ve elmas dikisleri (koyu kenar cizgileri) kapanir - "yamali
     * bohca" hissi kalkar, tek bir cim yuzeyi gibi okunur.
     */
    const STEP = TILE_WORLD * 1.02        // hucre merkezleri arasi yatay yari-adim
    const TW = STEP * 2.16                // karo cizim genisligi (adimdan buyuk = bindirme)
    const island = islandExtent()
    const R = 12
    const rnd = seeded(4242)
    /*
     * DENIZ SADECE ALTTA. Sehir bir ada degil: cim EKRANI DOLDURUR, su yalnizca
     * en alttaki LIMAN bandindadir. Kara/su ayrimi bir cokgen degil, tek bir
     * KIYI CIZGISI (yatay): en alt sehir arsasinin biraz altindan itibaren su.
     * Boylece ust/sag/sol'da gereksiz deniz kalmaz.
     */
    const cityBottom = Math.max(...SLOTS.filter(s => s.zone === 'sehir').map(s => toWorldY(s.y)))
    const coastY = cityBottom + TW * 0.35
    const cells: { cx: number; cy: number; land: boolean; d: number; flip: boolean }[] = []
    for (let gx = -R; gx <= R; gx++) {
      for (let gy = -R; gy <= R; gy++) {
        const cx = island.cx + (gx - gy) * STEP
        const cy = island.cy + (gx + gy) * (STEP / 2)
        cells.push({ cx, cy, land: cy < coastY, d: gx + gy, flip: rnd() > 0.5 })
      }
    }
    // Arkadan ona: onualardaki karo, arkatakinin toprak yamacini ortsun.
    cells.sort((a, b) => a.d - b.d)
    for (const c of cells) {
      this.terrain.push(this.placeTerrainTile(c.land ? 't_grass' : 't_water', c.cx, c.cy, TW, -1200 + c.d, c.flip))
    }
  }

  /** Bir zemin karosunu ust-yuz elmasinin merkezi (cx,cy)'ye gelecek sekilde koyar. */
  private placeTerrainTile(key: string, cx: number, cy: number, tw: number, depth: number, flip: boolean, flipY = false) {
    const src = this.textures.get(key).getSourceImage() as HTMLImageElement | HTMLCanvasElement
    const iw = src.width, ih = src.height
    // Ust yuz tam genislikte; elmas yuksekligi genisligin yarisi, merkezi
    // resmin tepesinden iw/4 asagida. Origin bu noktaya sabitlenir.
    const img = this.add.image(cx, cy, key).setOrigin(0.5, (iw / 4) / ih)
    img.setDisplaySize(tw, tw * ih / iw).setDepth(depth).setFlipX(flip).setFlipY(flipY)
    return img
  }

  /** Terrain/yol izgarasinin yatay yari-adimi (dunya pikseli). */
  private gridStepPx() { return TILE_WORLD * 1.02 }

  /** Izgara hucresi (gx,gy) -> dunya konumu (terrain ile ayni izgara). */
  private gridWorld(gx: number, gy: number) {
    const S = this.gridStepPx(), isl = islandExtent()
    return { x: isl.cx + (gx - gy) * S, y: isl.cy + (gx + gy) * (S / 2) }
  }

  /** Dunya konumu -> en yakin izgara hucresi. */
  private worldToCell(wx: number, wy: number) {
    const S = this.gridStepPx(), isl = islandExtent()
    const dx = (wx - isl.cx) / S, dy = (wy - isl.cy) / (S / 2)
    return { gx: Math.round((dx + dy) / 2), gy: Math.round((dy - dx) / 2) }
  }

  /**
   * YOL AGI - gercek tas yol karolari.
   *
   * Her KARA binasindan merkeze grid-hizali bir L-yol dosenir (once bir eksen,
   * sonra digeri). Ortak hucreler tek yol olur; her hucre 4 komsusuna gore
   * duz/kose/T/kavsak karosu alir. Merkez mozaik meydandir. Bezier yollarin
   * yerini alir; yollar artik binalar gibi karo.
   */
  private drawRoads() {
    if (USES_MEASURED) return
    const key = (x: number, y: number) => `${x},${y}`
    const road = new Map<string, { gx: number; gy: number }>()
    const add = (x: number, y: number) => road.set(key(x, y), { gx: x, gy: y })
    const center = this.worldToCell(toWorldX(CENTER.x), toWorldY(CENTER.y))
    add(center.gx, center.gy)
    for (const slot of SLOTS) {
      if (slot.zone === 'liman') continue
      const id = BUILDING_IDS.find(b => this.state.placement[b] === slot.index)
      if (!id) continue
      const bc = this.worldToCell(toWorldX(slot.x), toWorldY(slot.y))
      let x = center.gx, y = center.gy
      const sx = Math.sign(bc.gx - x)
      while (x !== bc.gx) { x += sx; add(x, y) }
      const sy = Math.sign(bc.gy - y)
      while (y !== bc.gy) { y += sy; add(x, y) }
    }
    // Cizim: her hucre baglantisina gore karo + flip. Arkadan ona sirala.
    // Terrain'den biraz BUYUK: komsu yol karolari bindirir, toprak dikisler kapanir.
    const TW = this.gridStepPx() * 2.45
    const cells = [...road.values()].sort((a, b) => (a.gx + a.gy) - (b.gx + b.gy))
    for (const c of cells) {
      const n = road.has(key(c.gx, c.gy - 1)), e = road.has(key(c.gx + 1, c.gy))
      const s = road.has(key(c.gx, c.gy + 1)), w = road.has(key(c.gx - 1, c.gy))
      const isC = c.gx === center.gx && c.gy === center.gy
      const t = this.roadTile(isC, n, e, s, w)
      const p = this.gridWorld(c.gx, c.gy)
      this.pieces.push(this.placeTerrainTile(t.key, p.x, p.y, TW, -820 + (c.gx + c.gy), t.fx, t.fy))
    }
  }

  /**
   * Baglanti kombinasyonuna gore yol karosu + ayna secimi.
   *
   * n=NE(-gy), e=SE(+gx), s=SW(+gy), w=NW(-gx). Temel karolarin yonu ekrandan
   * kalibre edildi; diger yonler flipX (fx) / flipY (fy) ile turer.
   */
  private roadTile(center: boolean, n: boolean, e: boolean, s: boolean, w: boolean): { key: string; fx: boolean; fy: boolean } {
    if (center) return { key: RD.plaza, fx: false, fy: false }
    const count = (n ? 1 : 0) + (e ? 1 : 0) + (s ? 1 : 0) + (w ? 1 : 0)
    if (count >= 4) return { key: RD.cross, fx: false, fy: false }
    if (count === 3) {
      // T: eksik yona gore dondur. Kaba - kalibre edilecek.
      if (!n) return { key: RD.t, fx: false, fy: false }
      if (!s) return { key: RD.t, fx: false, fy: true }
      if (!e) return { key: RD.t, fx: true, fy: false }
      return { key: RD.t, fx: false, fy: false }
    }
    // Duz: iki karsi yon. ee461161 temel ekseni NW-SE (e&w); n&s icin flipX.
    if (e && w) return { key: RD.straight, fx: false, fy: false }
    if (n && s) return { key: RD.straight, fx: true, fy: false }
    // Kose (iki bitisik yon): kavis karosu, dort yon flipX/flipY ile.
    if (e && s) return { key: RD.curve, fx: false, fy: false } // SE+SW
    if (s && w) return { key: RD.curve, fx: true, fy: false }  // SW+NW
    if (w && n) return { key: RD.curve, fx: true, fy: true }   // NW+NE
    if (n && e) return { key: RD.curve, fx: false, fy: true }  // NE+SE
    // Tek uc: eksene gore duz.
    return (n || s) ? { key: RD.straight, fx: true, fy: false } : { key: RD.straight, fx: false, fy: false }
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
    const island = islandExtent()
    cam.centerOn(island.cx, island.cy)
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

  /** Kuadratik bezier'i (a, kontrol, b) cizilebilir noktalara orneklier. */
  private curvePoints(a: Poly[number], c: Poly[number], b: Poly[number], steps = 14): Poly {
    const pts: Poly = []
    for (let i = 0; i <= steps; i++) {
      const t = i / steps, u = 1 - t
      pts.push({
        x: u * u * a.x + 2 * u * t * c.x + t * t * b.x,
        y: u * u * a.y + 2 * u * t * c.y + t * t * b.y,
      })
    }
    return pts
  }

  /** Bir cokgenin bounding box'i. */
  private bounds(poly: Poly) {
    const xs = poly.map(p => p.x), ys = poly.map(p => p.y)
    return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) }
  }

  /**
   * Cim uzerine hafif ton lekeleri.
   *
   * Tek duz yesil karton gibi duruyor; tohumlu, yari saydam koyu/acik elmaslar
   * ona el ciziminin dagi­nikligini verir - doku degil, HISSI.
   */
  private drawGrassTexture(body: Poly) {
    const b = this.bounds(body)
    const rnd = seeded(1337)
    const step = px(9)
    for (let y = b.minY; y < b.maxY; y += step) {
      for (let x = b.minX; x < b.maxX; x += step) {
        const cx = x + (rnd() - 0.5) * step, cy = y + (rnd() - 0.5) * step
        if (!inPoly(cx, cy, body)) continue
        const r = rnd()
        this.ground.fillStyle(r > 0.5 ? COLOR.grassAlt : COLOR.grass, 0.5)
        this.ground.fillPoints(diamondPoints(cx, cy, px(6) * (0.6 + r * 0.6), px(3) * (0.6 + r * 0.6)), true)
      }
    }
  }

  /**
   * Dekor — SİSTEMLİ, rastgele DEĞİL (Ikariam gibi).
   *
   * İki katman:
   *  1) DOĞA adanın KIYI ŞERİDİNE bir yeşil kuşak olarak dizilir: gövde
   *     poligonunun kenarı boyunca eşit aralıkla örneklenip merkeze doğru
   *     içeri kaydırılır. İç kısım (arsalar arası) TEMİZ kalır — grid
   *     baskın olmasın, şehir "yerleşik" görünsün. Alt kıyı (liman) boş
   *     bırakılır: orada iskeleler var.
   *  2) LANDMARK'lar SABİT noktalarda: meydanda çeşme, iki yanında simetrik
   *     heykel. Rastgele serpme yok — her açılışta aynı yerde.
   *
   * Tümü deterministik: kaydırınca yerinden oynamaz.
   */
  private drawDecor(body: Poly, pads: { shape: Poly }[]) {
    const b = this.bounds(body)
    const cx = (b.minX + b.maxX) / 2, cy = (b.minY + b.maxY) / 2
    const centres = pads.map(p => {
      const xs = p.shape.map(q => q.x), ys = p.shape.map(q => q.y)
      return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 }
    })
    const clear = TILE_WORLD * 0.9
    const rnd = seeded(90210)

    const place = (key: string, x: number, y: number, w: number) => {
      if (!this.textures.exists(key)) return
      const img = this.add.image(x, y, key).setOrigin(0.5, 0.92)
      img.setScale(w / img.width).setDepth(y)
      this.pieces.push(img)
    }

    // 1) KIYI YEŞİL KUŞAĞI. Gövde kenarını arc-length boyunca eşit örnekle,
    //    her noktayı merkeze doğru içeri kaydır (kıyının hemen içi). Doğa
    //    türleri sabit bir desende döner: zeytin, çalı, zeytin, kaya, çiçek.
    const edge: { x: number; y: number }[] = []
    let peri = 0
    for (let i = 0; i < body.length; i++) {
      const a = body[i], c = body[(i + 1) % body.length]
      peri += Math.hypot(c.x - a.x, c.y - a.y)
    }
    const SAMPLES = 44
    const gapArc = peri / SAMPLES
    let acc = 0, next = gapArc * 0.5
    const cycle = ['olive-tree', 'bush', 'olive-tree', 'rock', 'bush', 'flower']
    let ci = 0
    for (let i = 0; i < body.length; i++) {
      const a = body[i], c = body[(i + 1) % body.length]
      const segLen = Math.hypot(c.x - a.x, c.y - a.y)
      while (next < acc + segLen) {
        const t = (next - acc) / segLen
        let px0 = a.x + (c.x - a.x) * t, py0 = a.y + (c.y - a.y) * t
        // İçeri kaydır: kıyıdan land'e doğru, hafif deterministik sapmayla.
        const inset = TILE_WORLD * (1.15 + rnd() * 0.5)
        const dx = cx - px0, dy = cy - py0
        const d = Math.hypot(dx, dy) || 1
        const x = px0 + (dx / d) * inset, y = py0 + (dy / d) * inset
        next += gapArc
        // Alt kıyı (liman/iskele) ve arsalara çok yakın noktaları atla.
        if (y > cy + (b.maxY - cy) * 0.55) { ci++; continue }
        if (!inPoly(x, y, body)) { ci++; continue }
        if (centres.some(cc => Math.hypot(cc.x - x, cc.y - y) < clear)) { ci++; continue }
        const kind = cycle[ci % cycle.length]; ci++
        const w = kind === 'olive-tree' ? TILE_WORLD * (0.78 + rnd() * 0.22)
          : kind === 'rock' ? TILE_WORLD * (0.5 + rnd() * 0.2)
          : kind === 'bush' ? TILE_WORLD * (0.5 + rnd() * 0.18)
          : TILE_WORLD * 0.46
        place(`d_${kind}`, x, y, w)
      }
      acc += segLen
    }

    // 2) SABİT LANDMARK'lar. Meydan (merkez arsa) çevresinde: çeşme merkezin
    //    hemen önünde, iki heykel simetrik yanlarda. Arsa doluysa üstüne
    //    binmesin diye merkezden yeterince açıkta dururlar.
    const uTile = TILE_WORLD
    const landmarks: { key: string; x: number; y: number; w: number }[] = [
      { key: 'd_fountain', x: cx, y: cy - uTile * 0.2, w: uTile * 1.0 },
      { key: 'd_statue', x: cx - uTile * 1.9, y: cy + uTile * 0.5, w: uTile * 0.9 },
      { key: 'd_statue', x: cx + uTile * 1.9, y: cy + uTile * 0.5, w: uTile * 0.9 },
      { key: 'd_market-stall', x: cx - uTile * 0.9, y: cy - uTile * 1.5, w: uTile * 0.95 },
      { key: 'd_cart', x: cx + uTile * 1.0, y: cy - uTile * 1.6, w: uTile * 0.7 },
    ]
    for (const lm of landmarks) {
      if (!inPoly(lm.x, lm.y, body)) continue
      if (centres.some(cc => Math.hypot(cc.x - lm.x, cc.y - lm.y) < clear)) continue
      place(lm.key, lm.x, lm.y, lm.w)
    }
  }

  private drawTree(g: Phaser.GameObjects.Graphics, x: number, y: number, scale: number) {
    const h = px(4.2) * scale, r = px(1.9) * scale
    g.fillStyle(0x0d1c16, 0.28); g.fillEllipse(x + px(0.5), y, r * 1.5, r * 0.6)
    g.fillStyle(COLOR.trunk, 1); g.fillRect(x - px(0.28) * scale, y - h * 0.5, px(0.56) * scale, h * 0.5)
    g.fillStyle(COLOR.treeDark, 1); g.fillCircle(x, y - h * 0.62, r)
    g.fillStyle(COLOR.tree, 1); g.fillCircle(x - r * 0.25, y - h * 0.72, r * 0.8)
  }

  private drawBush(g: Phaser.GameObjects.Graphics, x: number, y: number, scale: number) {
    const r = px(1.3) * scale
    g.fillStyle(0x0d1c16, 0.22); g.fillEllipse(x, y + px(0.2), r * 1.8, r * 0.6)
    g.fillStyle(COLOR.treeDark, 1); g.fillCircle(x - r * 0.5, y - r * 0.3, r * 0.7)
    g.fillStyle(COLOR.tree, 1); g.fillCircle(x + r * 0.4, y - r * 0.4, r * 0.75)
  }

  private drawRock(g: Phaser.GameObjects.Graphics, x: number, y: number, scale: number) {
    const r = px(1.7) * scale
    g.fillStyle(0x0d1c16, 0.25); g.fillEllipse(x + px(0.4), y + px(0.3), r * 1.8, r * 0.7)
    g.fillStyle(COLOR.rockDark, 1)
    g.fillPoints(diamondPoints(x, y - r * 0.4, r * 2, r * 1.4), true)
    g.fillStyle(COLOR.rock, 1)
    g.fillPoints([{ x: x - r, y: y - r * 0.4 }, { x, y: y - r * 1.1 }, { x: x + r * 0.3, y: y - r * 0.5 }, { x: x - r * 0.4, y: y - r * 0.1 }], true)
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

  /**
   * LIMAN İSKELESİ: denizin ustunde duran ahsap platform.
   *
   * Sehir arsalari cime gomulu tas tabandir; iskele ise SUYUN uzerinde durur.
   * Once suya dusen golge, sonra destek kaziklari, sonra ahsap gude ve tahta
   * cizgileri. Uzerine tersane/liman binasi oturur.
   */
  private drawQuay(shape: Poly, occupied: boolean) {
    const b = this.bounds(shape)
    const cx = (b.minX + b.maxX) / 2
    // Suya dusen golge: gudenin biraz asagi kaydirilmis koyu kopyasi.
    this.fill(shape.map(p => ({ x: p.x, y: p.y + px(1.4) })), COLOR.seaDeep, 0.55)
    // Destek kaziklari: iskelenin dort kosesinden suya inen kisa direkler.
    this.ground.fillStyle(COLOR.post, 1)
    for (const c of [{ x: b.minX + px(1), y: b.maxY }, { x: b.maxX - px(1), y: b.maxY }, { x: cx, y: b.maxY + px(0.6) }]) {
      this.ground.fillRect(c.x - px(0.5), c.y, px(1), px(2.4))
    }
    // Ahsap gude.
    this.fill(shape, occupied ? COLOR.deck : COLOR.deckDark, 1)
    this.stroke(shape, COLOR.deckEdge, 3)
    // Tahta cizgileri: gudenin uzerinde birkac paralel oluk, ahsap hissi.
    this.ground.lineStyle(2, COLOR.deckEdge, 0.4)
    for (let i = 1; i <= 3; i++) {
      const t = i / 4
      const y = b.minY + (b.maxY - b.minY) * t
      this.ground.lineBetween(b.minX + px(1), y, b.maxX - px(1), y)
    }
    // Insa kipinde bos iskele vurgulanir.
    if (!occupied && this.placing) this.stroke(shape, COLOR.padFreeEdge, 5)
  }

  private redraw(first: boolean) {
    this.signature = `${visualSignature(this.state)}|${this.showLabels}|${this.placing}`
    const shapes = groundShapes(this.state)

    this.ground.clear()

    /*
     * STILIZE ADA, distan ice: deniz golgesi, kum kiyi, cim govde, cim doku.
     * Boyali arkaplan modunda bu katmanlar cizilmez (shapes.body null).
     */
    /*
     * Kod-cizimi ada (kum+cim+doku) ARTIK CIZILMIYOR: zemin gercek karolarla
     * (drawTerrain) doseniyor. shapes.beach/body yalnizca dekor ve arsa
     * siniri icin hesap olarak duruyor.
     */

    if (shapes.walls) {
      const w = shapes.walls
      /*
       * Sur bir HALKA: dis cokgen dolduruluyor, ic cokgen zemin rengiyle
       * geri kaziniyor. Phaser'in Graphics'i evenodd kurali sunmadigi icin
       * yol bu - sonuc ayni, ici bos bir kale duvari.
       */
      // Once yere dusen golge: sur yukselmis bir tas duvar gibi dursun.
      this.drawRing(w.outer.map(p => ({ x: p.x, y: p.y + px(0.9) })), w.inner, COLOR.wallShadow)
      this.drawRing(w.outer, w.inner, COLOR.wall)
      this.stroke(w.outer, COLOR.wallEdge, 4)
      this.stroke(w.inner, COLOR.wallEdge, 3)
      // Dis hat boyunca acik tepe cizgisi (mazgal hissi).
      this.stroke(w.outer.map(p => ({ x: p.x, y: p.y - px(0.5) })), COLOR.wallTop, 3)
      for (const tower of w.towers) {
        this.fill(tower.map(p => ({ x: p.x, y: p.y + px(0.9) })), COLOR.wallShadow)
        this.fill(tower, COLOR.wallTop)
        this.stroke(tower, COLOR.wallEdge, 3)
      }
      this.fill(w.gate, COLOR.gate)
      this.stroke(w.gate, COLOR.wallEdge, 4)
      this.ground.fillStyle(COLOR.gateDark, 1)
      this.ground.fillEllipse(w.gateArch.x, w.gateArch.y, px(3.6), px(3.4))
    }

    /*
     * Arsalar. DOLU arsanin altina her zaman bir tas taban cizilir - bina
     * zemine oturmus gorunsun diye. BOS arsa stilize modda cimde acik bir
     * leke olarak durur ve insa kipinde vurgulanir; boyali modda yalnizca
     * insa kipinde gorunur.
     */
    for (const pad of shapes.pads) {
      /*
       * DOLU arsaya taban CIZILMEZ: bina sprite'i kendi zemin elmasini
       * (tas/cim/su) icinde tasir, altina ikinci bir taban koymak sprite'in
       * kenarindan tasar. Yalnizca BOS arsalar isaretlenir.
       */
      if (pad.occupied) continue
      if (pad.slot.zone === 'liman') {
        // Bos iskele: denize uzanan ahsap platform her zaman gorunur ki
        // limanin nereye kurulacagi belli olsun.
        this.drawQuay(pad.shape, false)
      } else if (this.placing) {
        this.fill(pad.shape, COLOR.padFree, 0.85)
        this.stroke(pad.shape, COLOR.padFreeEdge, 5)
      }
      // İnşa modunda DEĞİLKEN boş arsa işareti YOK: açık arsalar bayrakla
      // (addEmptyPlot → drawBuildFlag), kilitli arsalar soluk izle gösterilir.
      // Zemine ayrıca soluk bir düzlük çizmek grid'i baskın yapıyordu.
    }

    for (const piece of this.pieces) piece.destroy()
    this.pieces = []
    // Yollar ve dekor pieces TEMIZLENDIKTEN sonra eklenir, yoksa ayni karede
    // silinir. Yollar once (dekor/binalarin altinda).
    if (!USES_MEASURED) this.drawRoads()
    if (shapes.body) this.drawDecor(shapes.body, shapes.pads)
    const running = activeJob(this.state)?.id
    for (const slot of SLOTS) {
      const id = BUILDING_IDS.find(b => this.state.placement[b] === slot.index) ?? null
      if (id) this.addBuilding(id, slot, running === id)
      else this.addEmptyPlot(slot)
    }
    if (first) this.ground.setAlpha(0).setAlpha(1)
  }

  /*
   * Bina sprite'inin karo genisligine gore OLCEGI.
   *
   * Sprite kendi zemin elmasini icinde tasir; taban genisligi ~ sprite
   * genisligi. Divanhane ve Saray sehrin baskin yapilaridir, digerlerinden
   * buyuk cizilir. Liman/tersane iskele sprite'lari kendi rihtimini tasir.
   */
  private artScale(id: BuildingId) {
    if (id === 'divan') return 1.6
    if (id === 'saray') return 1.45
    if (id === 'konut' || id === 'kisla' || id === 'medrese') return 1.25
    return 1.12
  }

  private addBuilding(id: BuildingId, slot: typeof SLOTS[number], building: boolean) {
    const p = buildingPlacement(id, slot)
    const level = this.state.buildings[id]
    let object: Phaser.GameObjects.GameObject
    // Sprite'in ekranda kaplayacagi taban genisligi.
    const w = TILE_WORLD * this.artScale(id)

    /*
     * Binanin YERE BASMASI icin altina yumusak bir golge.
     *
     * Golgesiz sprite zeminin uzerinde YUZUYOR gibi durur; bu, ucuz gorunmenin
     * en sik sebeplerinden biri. Golge karonun kendisinden biraz kucuk ve
     * isik yonune (sol ust) gore hafif saga kaydirilmistir.
     */
    const shadow = this.add.graphics().setDepth(p.depth - 0.3)
    shadow.fillStyle(0x0d1c16, 0.28)
    shadow.fillEllipse(p.x + px(0.8), p.y + px(0.6), w * 0.6, w * 0.26)
    this.pieces.push(shadow)

    if (BUILDINGS[id].art && this.textures.exists(id)) {
      /*
       * Sprite EN-BOY ORANI KORUNARAK olceklenir - kareye sikistirilirsa
       * kuleler ezilir. Taban genisligi karoya oturtulur, yukseklik dogal
       * olarak takip eder. Baglanma noktasi zemin elmasinin merkezine yakin
       * (0.5, 0.80): bina karonun uzerine basar, tepesi yukari tasar.
       */
      const image = this.add.image(p.x, p.y, id).setOrigin(0.5, 0.8)
      image.setScale(w / image.width)
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

    const hit = this.add.rectangle(p.x, p.y - w * 0.25, w * 0.8, w * 0.6)
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
    this.pieces.push(this.makeBadge(p.x + w * 0.28, p.y + px(1.1), level, p.depth + 0.4, building))
    if (this.showLabels) {
      this.pieces.push(this.makeLabel(p.x, p.y + px(2.4), BUILDINGS[id].name, p.depth + 0.5, building))
    }
  }

  /**
   * BOŞ ARSA — Ikariam gibi.
   *
   * Açık boş arsa HER ZAMAN bir BAYRAK gösterir (inşa moduna gerek yok):
   * oyuncu bayrağa dokunur, ne kurmak istediğini seçer. Arsalar KADEMELİ
   * açılır: bir arsa ancak Divanhane o halkaya ulaşınca (ringOf ≤ divan
   * seviyesi) açılır - Ikariam'da yeni arsanın seviye/araştırmayla açılması
   * gibi. Kilitli arsa yalnızca soluk bir iz gösterir ve tıklanamaz.
   */
  private addEmptyPlot(slot: typeof SLOTS[number]) {
    const x = toWorldX(slot.x), y = toWorldY(slot.y)
    const unlocked = slot.zone === 'liman' || ringOf(slot.index) <= this.state.buildings.divan
    if (!unlocked) {
      const g = this.add.graphics().setDepth(slot.y)
      g.fillStyle(COLOR.plot, 0.12)
      g.fillPoints(diamondPoints(x, y, TILE_WORLD * 0.82, TILE_WORLD * 0.41), true)
      this.pieces.push(g)
      return
    }
    this.drawBuildFlag(x, y, slot.y)
    this.addPlotHit(x, y, slot.index)
  }

  /** İnşa bayrağı: taş taban + ahşap direk + kırmızı flama. "Buraya kur." */
  private drawBuildFlag(x: number, y: number, depthY: number) {
    const s = TILE_WORLD
    const g = this.add.graphics().setDepth(depthY)
    // Tas taban (arsa izi).
    g.fillStyle(COLOR.padFree, 0.5); g.fillPoints(diamondPoints(x, y, s * 0.62, s * 0.31), true)
    g.lineStyle(2.5, COLOR.padFreeEdge, 0.8); g.strokePoints(diamondPoints(x, y, s * 0.62, s * 0.31), true)
    // Yere dusen golge.
    g.fillStyle(0x0d1c16, 0.18); g.fillEllipse(x + s * 0.05, y + s * 0.03, s * 0.22, s * 0.1)
    // Direk.
    const poleH = s * 0.9
    g.fillStyle(0x5a3d24, 1); g.fillRect(x - s * 0.035, y - poleH, s * 0.07, poleH)
    // Flama (ucgen).
    g.fillStyle(0x9c3b2e, 1)
    g.fillPoints([{ x: x + s * 0.035, y: y - poleH }, { x: x + s * 0.035, y: y - poleH + s * 0.28 }, { x: x + s * 0.4, y: y - poleH + s * 0.14 }], true)
    g.fillStyle(0xcaa24a, 1); g.fillCircle(x, y - poleH, s * 0.055)
    this.pieces.push(g)
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
