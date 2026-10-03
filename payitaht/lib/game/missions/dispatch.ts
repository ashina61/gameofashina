import { UNITS, logEvent, actionPoints, travelFactor, spyBonus, type Game, type UnitId } from '../engine'
import { activeCity, advanceEmpire, bump, type Empire } from '../empire'
import { isAlly, rivalById } from '../rivals'
import { type Mission, RAID_UNITS, WARSHIPS, actionsInUse, availableUnits, hasTroops, piracyTarget, seaTravelMs, targetInfo, targetName, targetTravelMs, transportsNeeded, underSiege } from './world'
import { siegeBlock } from './threats'

/** Deterministik zar: görev kimliğinden [0,1). */
export function roll(seed: string) {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
  h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15
  return (h >>> 0) / 4294967296
}
export function spyChance(g: Game, count: number, level: number) {
  return Math.min(0.95, Math.max(0.05, 0.3 + 0.12 * count + spyBonus(g) - 0.06 * level))
}

export function targetCheck(empire: Empire, npcId: string, kind: Mission['kind'], now: number) {
  const city = activeCity(empire)
  const npc = kind === 'piracy' ? null : targetInfo(empire, npcId, now)
  if (kind !== 'piracy' && !npc) return { error: 'Bilinmeyen hedef.' }
  if (kind === 'piracy' && !piracyTarget(npcId)) return { error: 'Bilinmeyen hedef.' }
  if (kind === 'support') {
    const r = npc?.rival ? rivalById(npcId) : undefined
    if (!r || !isAlly(empire, r.id)) return { error: 'Destek birliği yalnızca ittifak üyesi hükümdarlara gönderilir.' }
  } else if (npc?.rival && kind !== 'spy') {
    const r = rivalById(npcId)!
    const s = empire.world?.rivals[npcId]
    if (s?.treaties.includes('baris')) return { error: `${r.ruler} ile barış anlaşman var. Önce anlaşmayı boz.` }
    if (isAlly(empire, r.id)) return { error: 'İttifak üyesine saldırılmaz.' }
  }
  if ((kind === 'occupy' || kind === 'blockade') && !npc?.rival) return { error: 'İşgal ve abluka yalnızca hükümdar şehirlerine yapılır.' }
  if ((kind === 'occupy' || kind === 'blockade') && (empire.missions ?? []).some(m => m.npcId === npcId && (m.kind === 'occupy' || m.kind === 'blockade') && m.kind === kind)) {
    return { error: kind === 'occupy' ? 'Bu şehir zaten işgal altında (ya da ordun yolda).' : 'Bu liman zaten abluka altında (ya da filon yolda).' }
  }
  if (npc && npc.islandId !== city.islandId && city.game.buildings.liman < 1) {
    return { error: 'Başka adaya sefer için bu şehirde Ticaret Limanı gerekli.' }
  }
  if (actionsInUse(empire, city.id) >= actionPoints(city.game)) {
    return { error: `Sefer hakkın doldu (${actionPoints(city.game)}). Bir görevin dönmesini bekle ya da Divanhane'yi yükselt.` }
  }
  if (kind !== 'spy' && underSiege(empire, city.id)) return { error: 'Şehrin önünde savaş sürüyor: birlikler surlardan ayrılamaz.' }
  const blocked = siegeBlock(empire, city.id, kind === 'piracy' || (!!npc && npc.islandId !== city.islandId))
  if (blocked) return { error: blocked }
  // Savaşı süren bir sefere aynı şehirden TAKVİYE gönderilebilir; yolda olana ikinci ordu gönderilmez.
  if ((empire.missions ?? []).some(m => m.cityId === city.id && m.npcId === npcId && m.kind === kind && !m.resolved && !m.battle)) {
    return { error: kind === 'spy' ? 'Bu hedefe giden casuslar zaten yolda.' : kind === 'piracy' ? 'Bu hedefe giden filo zaten yolda.' : 'Bu hedefe giden bir ordu zaten yolda.' }
  }
  return { city, npc: npc! }
}

export function dispatchSpies(source: Empire, npcId: string, count: number, now: number): { empire: Empire; error?: string } {
  const empire = advanceEmpire(source, now)
  const t = targetCheck(empire, npcId, 'spy', now)
  if ('error' in t) return { empire, error: t.error }
  if (!Number.isInteger(count) || count <= 0) return { empire, error: 'En az bir casus seç.' }
  if (availableUnits(empire, t.city.id).casus < count) return { empire, error: 'Bu kadar boşta casus yok. Elçilikte casus yetiştir.' }
  const level = t.npc.level
  const id = `spy-${t.city.id}-${npcId}-${now}`
  const travel = targetTravelMs(t.city, npcId, 'spy', level)
  empire.missions = [...(empire.missions ?? []), {
    id, kind: 'spy', cityId: t.city.id, npcId, units: { casus: count },
    departAt: now, arriveAt: now + travel, returnAt: now + 2 * travel,
    resolved: false, loot: { gold: 0, wood: 0 },
  }]
  logEvent(t.city.game, `${count} casus ${t.npc.name} yönüne yola çıktı.`, now)
  bump(empire, 'spies')
  return { empire }
}

export function dispatchRaid(source: Empire, npcId: string, units: Partial<Record<UnitId, number>>, now: number, mode: 'raid' | 'occupy' = 'raid'): { empire: Empire; error?: string } {
  const empire = advanceEmpire(source, now)
  const t = targetCheck(empire, npcId, mode, now)
  if ('error' in t) return { empire, error: t.error }
  const free = availableUnits(empire, t.city.id)
  const clean: Partial<Record<UnitId, number>> = {}
  const overseas = t.npc.islandId !== t.city.islandId
  for (const [id, n] of Object.entries(units) as [UnitId, number][]) {
    if (!(RAID_UNITS.includes(id) || WARSHIPS.includes(id)) || !Number.isInteger(n) || n < 0) return { empire, error: 'Geçersiz birlik seçimi.' }
    if (n > free[id]) return { empire, error: `Bu kadar boşta ${UNITS[id].name} yok.` }
    if (n > 0) clean[id] = n
  }
  if (!RAID_UNITS.some(id => (clean[id] ?? 0) > 0)) return { empire, error: 'Sefere en az bir kara birliği seç (yağmayı askerler yapar).' }
  if (!overseas && WARSHIPS.some(id => clean[id])) return { empire, error: 'Savaş gemileri yalnızca başka adaya giden seferlere katılır.' }
  if (overseas) {
    // Ordu denizi nakliye gemileriyle geçer: her gemi 40 kişilik asker taşır.
    const ships = transportsNeeded(clean)
    if (ships > free.nakliye) return { empire, error: `Bu ordu için ${ships} nakliye gemisi gerekli (boşta ${free.nakliye}).` }
    clean.nakliye = ships
  }
  const level = t.npc.level
  const travel = targetTravelMs(t.city, npcId, 'raid', level, clean)
  empire.missions = [...(empire.missions ?? []), {
    id: `${mode}-${t.city.id}-${npcId}-${now}`, kind: mode, cityId: t.city.id, npcId, units: clean,
    departAt: now, arriveAt: now + travel, returnAt: now + 2 * travel,
    resolved: false, loot: { gold: 0, wood: 0 },
  }]
  if (mode === 'raid') t.city.game.stats.raids = (t.city.game.stats.raids ?? 0) + 1
  logEvent(t.city.game, overseas ? `Ordu ${clean.nakliye} gemiyle ${t.npc.name} üzerine denize açıldı.` : `Ordu ${t.npc.name} üzerine sefere çıktı.`, now)
  return { empire }
}

/** Korsan Kalesi seferi: yalnızca savaş gemileri. */
export function dispatchPiracy(source: Empire, targetId: string, units: Partial<Record<UnitId, number>>, now: number): { empire: Empire; error?: string } {
  const empire = advanceEmpire(source, now)
  const t = targetCheck(empire, targetId, 'piracy', now)
  if ('error' in t) return { empire, error: t.error }
  const target = piracyTarget(targetId)!
  const g = t.city.game
  if (g.buildings.korsan_kalesi < 1) return { empire, error: 'Korsan seferi için Korsan Kalesi kur.' }
  if (g.buildings.korsan_kalesi < target.level) return { empire, error: `Bu hedef için Korsan Kalesi ${target.level}. seviye gerekli.` }
  const free = availableUnits(empire, t.city.id)
  const clean: Partial<Record<UnitId, number>> = {}
  for (const [id, n] of Object.entries(units) as [UnitId, number][]) {
    if (!WARSHIPS.includes(id) || !Number.isInteger(n) || n < 0) return { empire, error: 'Korsan seferine yalnızca savaş gemileri çıkar.' }
    if (n > free[id]) return { empire, error: `Bu kadar boşta ${UNITS[id].name} yok.` }
    if (n > 0) clean[id] = n
  }
  if (!hasTroops(clean)) return { empire, error: 'En az bir savaş gemisi seç.' }
  const travel = Math.round(target.minutes * 60_000 * travelFactor(g))
  empire.missions = [...(empire.missions ?? []), {
    id: `piracy-${t.city.id}-${targetId}-${now}`, kind: 'piracy', cityId: t.city.id, npcId: targetId, units: clean,
    departAt: now, arriveAt: now + travel, returnAt: now + 2 * travel,
    resolved: false, loot: { gold: 0, wood: 0 },
  }]
  logEvent(g, `Filo ${target.name} peşine düştü.`, now)
  return { empire }
}

/** ABLUKA: savaş gemileri hükümdarın limanını kapatır (önce donanmasıyla savaş). */
export function dispatchBlockade(source: Empire, rivalId: string, units: Partial<Record<UnitId, number>>, now: number): { empire: Empire; error?: string } {
  const empire = advanceEmpire(source, now)
  const t = targetCheck(empire, rivalId, 'blockade', now)
  if ('error' in t) return { empire, error: t.error }
  if (t.city.game.buildings.liman < 1) return { empire, error: 'Abluka için Ticaret Limanı gerekli.' }
  const free = availableUnits(empire, t.city.id)
  const clean: Partial<Record<UnitId, number>> = {}
  for (const [id, n] of Object.entries(units) as [UnitId, number][]) {
    if (!WARSHIPS.includes(id) || !Number.isInteger(n) || n < 0) return { empire, error: 'Ablukaya yalnızca savaş gemileri çıkar.' }
    if (n > free[id]) return { empire, error: `Bu kadar boşta ${UNITS[id].name} yok.` }
    if (n > 0) clean[id] = n
  }
  if (!hasTroops(clean)) return { empire, error: 'En az bir savaş gemisi seç.' }
  const travel = 60_000 + seaTravelMs(t.city.islandId, t.npc.islandId, t.city.game)
  empire.missions = [...(empire.missions ?? []), {
    id: `blockade-${t.city.id}-${rivalId}-${now}`, kind: 'blockade', cityId: t.city.id, npcId: rivalId, units: clean,
    departAt: now, arriveAt: now + travel, returnAt: now + 2 * travel, resolved: false, loot: { gold: 0, wood: 0 },
  }]
  logEvent(t.city.game, `Filo ${t.npc.name} limanını kapatmaya gidiyor.`, now)
  return { empire }
}
/** İşgal ya da ablukadaki birlikleri (haraçla birlikte) geri çağır. */
export function recallMission(source: Empire, missionId: string, now: number): { empire: Empire; error?: string } {
  const empire = advanceEmpire(source, now)
  const m = (empire.missions ?? []).find(x => x.id === missionId)
  if (!m || !m.stationed) return { empire, error: 'Geri çağrılacak birlik yok.' }
  m.stationed = false
  m.returnAt = now + (m.arriveAt - m.departAt)
  const city = empire.cities.find(c => c.id === m.cityId)
  delete m.spyTask
  delete m.supportAt
  if (city) logEvent(city.game, m.kind === 'support' ? `${targetName(m.npcId)} içindeki destek birlikleri geri çağrıldı.` : m.kind === 'spy' ? `${targetName(m.npcId)} içindeki casuslar geri çağrıldı.` : `${targetName(m.npcId)} bırakıldı; birlikler ${m.loot.gold} akçe haraçla dönüyor.`, now)
  return { empire }
}
