/** G9 painted atlas crops, displayed as native CSS background textures. */
import { asset } from '@/lib/asset'
import { RIVALS } from '@/lib/game/rivals'

const ATLASES = {
  'research-ekonomi': { file: 'research/ekonomi.webp', cols: 5, rows: 4 },
  'research-bilim': { file: 'research/bilim.webp', cols: 5, rows: 4 },
  'research-askeri': { file: 'research/askeri.webp', cols: 4, rows: 4 },
  'research-denizcilik': { file: 'research/denizcilik.webp', cols: 5, rows: 4 },
  'research-mitoloji': { file: 'research/mitoloji.webp', cols: 3, rows: 2 },
  gods: { file: 'portraits/gods.webp', cols: 4, rows: 2 },
  rivals: { file: 'portraits/rivals.webp', cols: 4, rows: 4 },
  culture: { file: 'culture/emblems.webp', cols: 4, rows: 5 },
  wonders: { file: 'culture/wonders.webp', cols: 4, rows: 2 },
  medals: { file: 'medals/achievements.webp', cols: 6, rows: 5 },
} as const
export type ArtAtlas = keyof typeof ATLASES

export function AtlasArt({ atlas, index, size = 56, label, className }: {
  atlas: ArtAtlas; index: number; size?: number; label?: string; className?: string
}) {
  const a = ATLASES[atlas]
  const col = index % a.cols, row = Math.floor(index / a.cols)
  return <span className={className} data-art-atlas={atlas}
    role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}
    style={{ display: 'inline-block', width: size, height: size, flexShrink: 0,
      backgroundImage: `url(${asset(`/images/game/${a.file}`)})`,
      backgroundSize: `${a.cols * 100}% ${a.rows * 100}%`,
      backgroundPosition: `${col / (a.cols - 1) * 100}% ${row / (a.rows - 1) * 100}%`,
      clipPath: atlas === 'research-mitoloji' ? 'circle(46%)' : undefined }} />
}

export function RivalPortrait({ id, size = 56 }: { id: string; size?: number }) {
  const index = RIVALS.findIndex(r => r.id === id)
  if (index < 0) return null
  return <AtlasArt atlas="rivals" index={index} size={size} label={`${RIVALS[index].ruler} (yapay rakip)`} />
}
