/**
 * İZOMETRİK METRİKLER — tek doğruluk kaynağı.
 *
 * Brief'in 2. maddesi: TILE_WIDTH/TILE_HEIGHT gibi değerler koda dağılmış
 * sabitler olmayacak, TEK bir config'te toplanacak. Izgara→ekran çevrimi de
 * buradan yapılır. Grid 14×14 authoritative; koordinatlar buradan world
 * pozisyonuna döner.
 *
 * Projeksiyon 2:1 elmas (klasik izometri): karo genişliği yüksekliğinin iki
 * katı, ~30° eğim hissi. Değerler brief örneğiyle (96×48) başlar ama TEK
 * yerde durur; kompozisyon ayarı buradan yapılır, sahnelere gömülmez.
 */
export interface IsometricMetrics {
  /** Bir karonun ekran genişliği (piksel). */
  tileWidth: number
  /** Bir karonun ekran yüksekliği (piksel) — genelde genişliğin yarısı. */
  tileHeight: number
  /** Izgara sütun sayısı (authoritative). */
  cols: number
  /** Izgara satır sayısı (authoritative). */
  rows: number
}

/** Varsayılan metrikler. Grid 14×14, karo 96×48 (2:1 elmas). */
export const ISO: IsometricMetrics = {
  tileWidth: 96,
  tileHeight: 48,
  cols: 14,
  rows: 14,
}

export interface Point {
  x: number
  y: number
}

/**
 * Izgara hücresi → ekran (world) pozisyonu; hücrenin MERKEZİ döner.
 *
 * x = (gx - gy) * tileWidth / 2
 * y = (gx + gy) * tileHeight / 2
 */
export function gridToScreen(gx: number, gy: number, m: IsometricMetrics = ISO): Point {
  return {
    x: (gx - gy) * (m.tileWidth / 2),
    y: (gx + gy) * (m.tileHeight / 2),
  }
}

/**
 * Ekran (world) pozisyonu → kesirli ızgara koordinatı.
 *
 * Dokunulan karoyu bulmak için: sonucu Math.floor/round ile hücreye indir.
 */
export function screenToGrid(sx: number, sy: number, m: IsometricMetrics = ISO): Point {
  const a = sx / (m.tileWidth / 2)
  const b = sy / (m.tileHeight / 2)
  return {
    x: (a + b) / 2,
    y: (b - a) / 2,
  }
}

/** Bir karonun elmas köşeleri (üst, sağ, alt, sol) — zemin/vurgu çizimi için. */
export function tileDiamond(gx: number, gy: number, m: IsometricMetrics = ISO): Point[] {
  const c = gridToScreen(gx, gy, m)
  const hw = m.tileWidth / 2
  const hh = m.tileHeight / 2
  return [
    { x: c.x, y: c.y - hh }, // üst
    { x: c.x + hw, y: c.y }, // sağ
    { x: c.x, y: c.y + hh }, // alt
    { x: c.x - hw, y: c.y }, // sol
  ]
}

/**
 * Tüm ızgarayı kapsayan world sınırları (elmas köşe köşe).
 *
 * Kamera fit ve dünya boyutu için. 14×14 elmas doğal olarak GENİŞ (2:1);
 * dikey ekranda genişliğe göre sığar ve kaydırılır.
 */
export function gridBounds(m: IsometricMetrics = ISO) {
  const corners = [
    gridToScreen(0, 0, m),
    gridToScreen(m.cols - 1, 0, m),
    gridToScreen(0, m.rows - 1, m),
    gridToScreen(m.cols - 1, m.rows - 1, m),
  ]
  const xs = corners.map(p => p.x)
  const ys = corners.map(p => p.y)
  return {
    left: Math.min(...xs) - m.tileWidth / 2,
    right: Math.max(...xs) + m.tileWidth / 2,
    top: Math.min(...ys) - m.tileHeight / 2,
    bottom: Math.max(...ys) + m.tileHeight / 2,
  }
}

/**
 * DEPTH — izometrik çizim sırası.
 *
 * Arkadaki (küçük gx+gy) önce, öndeki (büyük gx+gy) sonra çizilir. Bina
 * yüksekliği/anchor'ı için footprintDepth ve visualOffset eklenir. Merkezi
 * DepthSorter buradan besler; creation-order'a güvenilmez.
 */
export function isoDepth(gx: number, gy: number, footprintDepth = 0, visualOffset = 0): number {
  return (gx + gy) + footprintDepth + visualOffset
}
