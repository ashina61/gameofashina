/**
 * SANCAK GÖRÜNÜMÜ — şehirdeki ve sayfalardaki bütün bayraklar oyuncunun
 * sancağını taşır: renk, biçim (kırlangıç, çifte dil, üçgen, dört köşe) ve arma.
 */
import type { Empire } from './empire'
import { profileOf, type BannerId, type CrestId } from './profile'
import flags from './city-map/building-flags.json'

export type BannerLook = { color: string; shape: BannerId; crest: CrestId }
export const DEFAULT_LOOK: BannerLook = { color: '#b3261e', shape: 'kirlangic', crest: 'hilal' }
export function bannerLook(empire: Empire | undefined): BannerLook {
  if (!empire) return DEFAULT_LOOK
  const p = profileOf(empire)
  return { color: p.color, shape: p.banner ?? 'kirlangic', crest: p.crest }
}

/** Bina görsellerindeki sancak direkleri: [genişlik, yükseklik, [x, y, kumaş eni, kumaş boyu][]]. */
export type FlagAnchors = [number, number, [number, number, number, number][]]
export const BUILDING_FLAGS = flags as unknown as Record<string, FlagAnchors>
