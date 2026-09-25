/**
 * GRAPHICS FIRINLAMA (performans).
 *
 * Phaser WebGL'de her Graphics nesnesi HER KAREDE yeniden üçgenlenir; binlerce
 * şekilden oluşan sabit katmanlar (bağ sıraları, dere, fırça darbeleri,
 * sur parçaları) telefonu dondurur. Sabit bir Graphics bir kez RenderTexture'a
 * çizilir ve yerine tek bir dokulu dörtgen kalır. Büyük katmanlar düşük
 * çözünürlükte pişirilir (bellek bütçesi), en fazla 2048 px'lik parçalara
 * bölünür.
 */
import * as Phaser from 'phaser'

/** Komut kodu → argüman sayısı (Phaser 3.90 Graphics.commandBuffer düzeni). */
const ARGS: Record<number, number> = {
  0: 7, 1: 0, 2: 0, 3: 4, 4: 2, 5: 2, 6: 3, 7: 2, 8: 0, 9: 0, 10: 6, 11: 6,
  14: 0, 15: 0, 16: 2, 17: 2, 18: 1, 21: 8, 22: 6,
}

export type Bounds = { x: number; y: number; w: number; h: number }

/** Komut tamponundan dünya sınırları (dönüşüm komutu varsa null). */
export function graphicsBounds(g: Phaser.GameObjects.Graphics): Bounds | null {
  const b = g.commandBuffer as number[]
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, line = 0
  const add = (x: number, y: number, r = 0) => {
    if (x - r < minX) minX = x - r
    if (y - r < minY) minY = y - r
    if (x + r > maxX) maxX = x + r
    if (y + r > maxY) maxY = y + r
  }
  for (let i = 0; i < b.length;) {
    const op = b[i]
    const n = ARGS[op]
    if (n === undefined || op === 16 || op === 17 || op === 18) return null
    if (op === 6 || op === 22) line = Math.max(line, b[i + 1])
    else if (op === 0) add(b[i + 1], b[i + 2], b[i + 3])
    else if (op === 3) { add(b[i + 1], b[i + 2]); add(b[i + 1] + b[i + 3], b[i + 2] + b[i + 4]) }
    else if (op === 4 || op === 5) add(b[i + 1], b[i + 2])
    else if (op === 10 || op === 11) { add(b[i + 1], b[i + 2]); add(b[i + 3], b[i + 4]); add(b[i + 5], b[i + 6]) }
    i += n + 1
  }
  if (!isFinite(minX)) return null
  const pad = line / 2 + 2
  return { x: Math.floor(minX - pad), y: Math.floor(minY - pad), w: Math.ceil(maxX - minX + pad * 2), h: Math.ceil(maxY - minY + pad * 2) }
}

const MAX_TILE = 2048
/** Tek bir nesne için doku bütçesi (piksel): büyük katmanlar küçültülür. */
const MAX_PIXELS = 1_600_000

/**
 * Graphics'i dokuya pişirir ve yok eder. Dönen RenderTexture parçaları aynı
 * derinlikte ve konumdadır. Küçük/ucuz nesneler olduğu gibi bırakılır.
 */
export function bakeGraphics(
  scene: Phaser.Scene, g: Phaser.GameObjects.Graphics, opts: { minCommands?: number; keep?: boolean; maxPixels?: number } = {},
): Phaser.GameObjects.GameObject[] {
  const minCommands = opts.minCommands ?? 240
  if ((g.commandBuffer as number[]).length < minCommands || g.x !== 0 || g.y !== 0 || g.scaleX !== 1 || g.scaleY !== 1) return [g]
  const b = graphicsBounds(g)
  if (!b || b.w < 2 || b.h < 2) return [g]
  const s = Math.max(0.3, Math.min(1, Math.sqrt((opts.maxPixels ?? MAX_PIXELS) / (b.w * b.h))))
  const tw = Math.ceil(b.w * s), th = Math.ceil(b.h * s)
  const out: Phaser.GameObjects.GameObject[] = []
  g.setScale(s)
  for (let ty = 0; ty < th; ty += MAX_TILE) {
    for (let tx = 0; tx < tw; tx += MAX_TILE) {
      const w = Math.min(MAX_TILE, tw - tx), h = Math.min(MAX_TILE, th - ty)
      const rt = scene.add.renderTexture(b.x + tx / s, b.y + ty / s, w, h)
        .setOrigin(0, 0).setScale(1 / s).setDepth(g.depth).setAlpha(g.alpha)
      rt.draw(g, -b.x * s - tx, -b.y * s - ty)
      out.push(rt)
    }
  }
  if (opts.keep) { g.setScale(1).setPosition(0, 0).setVisible(false) } else g.destroy()
  return out
}

/*
 * DOKU ATLASI: küçük sabit Graphics'ler (sur parçası, çeşme, mezar taşı,
 * saz, tarla...) tek bir 2048'lik DynamicTexture sayfasına raf usulü
 * yerleştirilir; her biri o sayfadan bir kareyle Image olur. Tek framebuffer,
 * tek doku: açılış hızlı, çizim tek toplu çağrı.
 */
const PAGE = 2048
const SMALL = 640
let atlasSeq = 0
export class BakeAtlas {
  private pages: Phaser.Textures.DynamicTexture[] = []
  private x = 0
  private y = 0
  private row = 0
  private frames = 0
  constructor(private scene: Phaser.Scene, private prefix: string) {}

  private pending: Phaser.GameObjects.Graphics[] = []
  private page() {
    this.pages[this.pages.length - 1]?.endDraw()
    const key = `${this.prefix}-${++atlasSeq}`
    const dt = this.scene.textures.addDynamicTexture(key, PAGE, PAGE)
    if (!dt) throw new Error('atlas sayfası açılamadı')
    dt.beginDraw() // tek framebuffer bağlaması, bütün çizimler toplu
    this.pages.push(dt)
    this.x = 0; this.y = 0; this.row = 0
    return dt
  }

  /** Graphics'i atlasa (küçükse) ya da ayrı dokuya (büyükse) pişirir. */
  bake(g: Phaser.GameObjects.Graphics, opts: { minCommands?: number; maxPixels?: number } = {}): Phaser.GameObjects.GameObject[] {
    const minCommands = opts.minCommands ?? 120
    if ((g.commandBuffer as number[]).length < minCommands || g.x !== 0 || g.y !== 0 || g.scaleX !== 1 || g.scaleY !== 1 || !g.visible) return [g]
    const b = graphicsBounds(g)
    if (!b || b.w < 2 || b.h < 2) return [g]
    if (b.w > SMALL || b.h > SMALL) {
      // Büyük katman: ayrı doku. Açık toplu çizimi araya karıştırmamak için kapat-aç.
      const cur = this.pages[this.pages.length - 1]
      cur?.endDraw()
      const out = bakeGraphics(this.scene, g, { minCommands, maxPixels: opts.maxPixels })
      cur?.beginDraw()
      return out
    }
    let dt = this.pages[this.pages.length - 1] ?? this.page()
    if (this.x + b.w + 2 > PAGE) { this.x = 0; this.y += this.row + 2; this.row = 0 }
    if (this.y + b.h + 2 > PAGE) dt = this.page()
    const fx = this.x, fy = this.y
    dt.batchDraw(g, fx - b.x, fy - b.y)
    const name = `f${++this.frames}`
    dt.add(name, 0, fx, fy, b.w, b.h)
    this.x += b.w + 2
    this.row = Math.max(this.row, b.h)
    const img = this.scene.add.image(b.x, b.y, dt.key, name).setOrigin(0, 0).setDepth(g.depth).setAlpha(g.alpha)
    g.setVisible(false)
    this.pending.push(g) // toplu çizim bitince yok edilir
    return [img]
  }

  /** Toplu çizimi kapatır; pişirilen kaynak Graphics'leri yok eder. */
  finish() {
    this.pages[this.pages.length - 1]?.endDraw()
    for (const g of this.pending) g.destroy()
    this.pending = []
  }

  destroy() {
    for (const dt of this.pages) this.scene.textures.remove(dt)
    this.pages = []
  }
}
