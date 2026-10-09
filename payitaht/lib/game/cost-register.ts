import { BUILDING_EFFECTS as E, constructionDiscount, cost, luxuryCost, tavernLevel, unitLuxuryCost, wineConsumption, type BuildingId, type Game, type Luxury } from './engine'
import { GUILDS, guildBonus } from './guilds'

export const COST_WORKSHOPS = {
  marangoz: { resource: 'wood', alt: 'Osmanlı marangozhanesinde kereste işleyen ustalar', title: 'Binaların kereste bedeli', target: 'medrese', action: 'Medreseyi aç' },
  mimar: { resource: 'mermer', alt: 'Osmanlı mimarbaşının mermer işleme avlusu', title: 'Binaların mermer bedeli', target: 'medrese', action: 'Medreseyi aç' },
  mahzen: { resource: 'kahve', alt: 'Osmanlı kahve kilerinde çekirdek saklama ve ölçüm', title: 'Kahvehanenin kahve tüketimi', target: 'kahvehane', action: 'Kahve ikramını düzenle' },
  gozlukcu: { resource: 'kristal', alt: 'Osmanlı gözlükçüsünde mercek işleyen usta', title: 'Binaların kristal bedeli', target: 'medrese', action: 'Medreseyi aç' },
  barutane: { resource: 'kukurt', alt: 'Osmanlı barut deneme avlusunda top ve ölçüm araçları', title: 'Birliklerin kükürt bedeli', target: 'kisla', action: 'Kışlayı aç' },
} as const
export type CostWorkshopId = keyof typeof COST_WORKSHOPS
export const isCostWorkshop = (id: BuildingId): id is CostWorkshopId => id in COST_WORKSHOPS
export type DiscountPart = { label: string; cut: number }

/** Display model only. Actual example prices always come from the game engine. */
export function costRegister(game: Game, id: CostWorkshopId) {
  const research = constructionDiscount(game)
  const building = game.buildings[id] * ({ marangoz: E.marangozWood, mimar: E.mimarMarble, mahzen: E.mahzenWine, gozlukcu: E.gozlukcuCrystal, barutane: E.barutaneSulfur }[id])
  const parts: DiscountPart[] = []
  if (id === 'marangoz' || id === 'mimar') parts.push({ label: 'İnşaat araştırmaları', cut: research })
  if (id === 'marangoz') parts.push({ label: 'Dülgerler loncası', cut: guildBonus(game, 'dulger') * GUILDS.dulger.per })
  parts.push({ label: 'Bu yapının katkısı', cut: building })
  const materialFactor = Math.max(0.5, 1 - parts.reduce((sum, part) => sum + part.cut, 0))
  const extra = id === 'mahzen' && game.research.includes('mutfak') ? 0.9 : 1
  const heavy = id === 'barutane' && game.research.includes('top_dokum') ? 0.75 : 1
  const without = { ...game, buildings: { ...game.buildings, [id]: 0 } }
  const resource = COST_WORKSHOPS[id].resource
  const before = id === 'mahzen' ? wineConsumption(without) : id === 'barutane' ? unitLuxuryCost('topcu', 10, without).kukurt ?? 0 : resource === 'wood' ? cost(without, 'medrese').wood : luxuryCost(without, 'medrese')[resource as Luxury] ?? 0
  const after = id === 'mahzen' ? wineConsumption(game) : id === 'barutane' ? unitLuxuryCost('topcu', 10, game).kukurt ?? 0 : resource === 'wood' ? cost(game, 'medrese').wood : luxuryCost(game, 'medrese')[resource as Luxury] ?? 0
  return { parts, materialFactor, factor: materialFactor * extra, heavyFactor: materialFactor * heavy, kitchen: extra < 1, artillery: heavy < 1, before, after, saved: Math.max(0, before - after), served: tavernLevel(game), building }
}
