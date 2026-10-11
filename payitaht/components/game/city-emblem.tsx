/** Shared painted silk city insignia; the existing unlock rules are unchanged. */
import type { EmblemId } from '@/lib/game/empire'
import { asset } from '@/lib/asset'

export function CityEmblem({ id = 'sancak', size = 40, locked = false }: { id?: EmblemId; size?: number; locked?: boolean }) {
  return <img src={asset(`/images/game/ui/legacy-replacement/emblem-${id}.webp`)} alt="" width={size} height={size * 52 / 48} aria-hidden="true" className={locked ? 'city-emblem-art is-locked' : 'city-emblem-art'} style={{ objectFit: 'contain' }} />
}
