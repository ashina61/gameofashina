import { BANNERS, type BannerId } from './profile'

/** Shared fabric silhouettes for SVG previews and live city flags. */
function outline(banner: BannerId): [number, number][] {
  const tip = banner === 'yuvarlak' ? .9 : banner === 'sivri' ? .82 : 1
  const taper = banner === 'ucgen' ? .46 : banner === 'sivri' ? .12 : banner === 'dar' ? .2 : 0
  const top: [number, number][] = Array.from({ length: 13 }, (_, i) => [i / 12 * tip, i / 12 * taper])
  const bottom: [number, number][] = top.map(([x, y]): [number, number] => [x, 1 - y]).reverse()
  const fly: [number, number][] = banner === 'kirlangic' ? [[.74, .5]]
    : banner === 'cifte' ? [[.98, .16], [.88, .34], [.52, .5], [.88, .66], [.98, .84]]
    : banner === 'sivri' ? [[1, .5]]
    : banner === 'oyuk' ? [[.58, .5]]
    : banner === 'yuvarlak' ? Array.from({ length: 11 }, (_, i): [number, number] => { const a = (i + 1) / 12 * Math.PI; return [.9 + .1 * Math.sin(a), (1 - Math.cos(a)) / 2] })
    : banner === 'testere' ? [[.82, .125], [1, .25], [.82, .375], [1, .5], [.82, .625], [1, .75], [.82, .875]]
    : banner === 'ucdil' ? [[.78, .25], [1, .5], [.78, .75]] : []
  return [...top, ...fly, ...bottom]
}

export const BANNER_OUTLINES = Object.fromEntries(BANNERS.map(b => [b, outline(b)])) as Record<BannerId, [number, number][]>
