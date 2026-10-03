/** G6 painted figures: API and accessible names are preserved. */
import { UNITS, type UnitId } from '@/lib/game/engine'
import { asset } from '@/lib/asset'

/** bare omits the land/sea medallion in battle slots. */
export function UnitFigure({ id, size = 56, bare = false, title }: { id: UnitId; size?: number; bare?: boolean; title?: string }) {
  const sea = UNITS[id].branch === 'deniz'
  return <img src={asset(`/images/game/units/${id}.webp`)} width={size} height={size}
    alt={title ?? UNITS[id].name} className="unit-figure" draggable={false}
    style={{ objectFit: 'contain', borderRadius: bare ? undefined : 12,
      background: bare ? undefined : `radial-gradient(ellipse at 50% 40%, ${sea ? '#cfe3ea, #7fa9b8' : '#e9e6c8, #a9b77e'})`,
      border: bare ? undefined : '2px solid #8a5a22' }} />
}
