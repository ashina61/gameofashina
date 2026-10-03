/**
 * DENGE RAPORU (V2 Faz 5.9) — birimlerin maliyet başına savaş değeri.
 *
 *   değer   = √(saldırı × can × (1 + savunma / 50))   (vuruş gücü ile dayanıklılığın ortası)
 *   maliyet = akçe + kereste + 4 × lüks mal + 60 × nüfus + 120 × saatlik bakım
 *   verim   = değer / maliyet × 1000
 *
 * Birimler kendi kolunda (kara/deniz) ve rolünde (ön cephe, kanat, menzil,
 * kuşatma, hava...) karşılaştırılır. Kural: hiçbir birim, rolünün ortanca
 * veriminden %30'dan fazla üstün olmamalı. Destek, casus ve nakliye savaş
 * değeri taşımadığı için dışarıda kalır.
 */
import { UNITS, UNIT_IDS, UNIT_LUX, type UnitId } from './engine'

export type BalanceRow = { id: UnitId; name: string; group: string; value: number; cost: number; efficiency: number; vsMedian: number }

const NON_COMBAT = new Set(['support', 'spy', 'transport'])
export const BALANCE_LIMIT = 1.3

export function unitValue(id: UnitId) {
  const u = UNITS[id]
  return Math.sqrt(u.attack * u.hp * (1 + u.defense / 50))
}

export function unitCostScore(id: UnitId) {
  const u = UNITS[id]
  const lux = Object.values(UNIT_LUX[id] ?? {}).reduce((s, n) => s + (n ?? 0), 0)
  return u.cost.gold + u.cost.wood + 4 * lux + 60 * u.pop + 120 * u.upkeep
}

export function balanceTable(): BalanceRow[] {
  const rows = UNIT_IDS.filter(id => !NON_COMBAT.has(UNITS[id].role)).map(id => {
    const value = unitValue(id), cost = unitCostScore(id)
    return { id, name: UNITS[id].name, group: `${UNITS[id].branch}/${UNITS[id].role}`, value, cost, efficiency: value / cost * 1000, vsMedian: 1 }
  })
  const groups = new Map<string, BalanceRow[]>()
  for (const r of rows) groups.set(r.group, [...(groups.get(r.group) ?? []), r])
  for (const list of groups.values()) {
    const sorted = list.map(r => r.efficiency).sort((a, b) => a - b)
    const mid = sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    for (const r of list) r.vsMedian = list.length > 1 ? r.efficiency / mid : 1
  }
  return rows.sort((a, b) => a.group.localeCompare(b.group) || b.efficiency - a.efficiency)
}

export const balanceOutliers = () => balanceTable().filter(r => r.vsMedian > BALANCE_LIMIT)
