/** G3 painted advisor busts; the circular frame crops shoulders in every size. */
import { asset } from '@/lib/asset'
export type AdvisorId = 'city' | 'army' | 'research' | 'diplo'
export function AdvisorPortrait({ id, size = 44 }: { id: AdvisorId; size?: number }) {
  return <img className="advisor-portrait" data-advisor={id} alt="" aria-hidden="true"
    src={asset(`/images/game/portraits/advisor-${id}.webp`)} width={size} height={size} />
}
