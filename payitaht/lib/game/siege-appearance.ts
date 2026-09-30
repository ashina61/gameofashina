import type { Empire } from './empire'
import { activeCity } from './empire'
import { rivalById } from './rivals'

export type SiegeForceLook = { id: string; name: string; color: number }
export type SiegeAppearance = { occupation: SiegeForceLook | null; blockade: SiegeForceLook | null }
export const PEACEFUL_CITY: SiegeAppearance = { occupation: null, blockade: null }

/** Presentation only: never infer occupation from an outgoing mission or another colony. */
export function citySiegeAppearance(empire?: Empire): SiegeAppearance {
  if (!empire) return PEACEFUL_CITY
  const cityId = activeCity(empire).id
  const look = (kind: 'occupy' | 'blockade'): SiegeForceLook | null => {
    const siege = empire.sieges?.find(s => s.cityId === cityId && s.kind === kind)
    if (!siege) return null
    const rival = rivalById(siege.rivalId)
    return { id: siege.rivalId, name: rival?.city ?? 'Düşman', color: rival?.faction === 'dogu' ? 0x743b82 : 0x254b83 }
  }
  return { occupation: look('occupy'), blockade: look('blockade') }
}

export function siegeAppearanceKey(siege: SiegeAppearance) {
  return `${siege.occupation?.id ?? '-'}:${siege.occupation?.color ?? '-'}|${siege.blockade?.id ?? '-'}:${siege.blockade?.color ?? '-'}`
}
