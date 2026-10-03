import { threatIntervalMul } from '../events'
import { UNITS, capacity, logEvent, miracle, LUXURY_IDS, type Game, type UnitId } from '../engine'
import { ROUND_MS, battleRound, endBattle, replayBattle, troopList, type BattleSide, type Troops } from '../battle'
import { godBuff } from '../gods'
import { advanceEmpire, type CityRecord, type Empire } from '../empire'
import { allyHelp, rivalById } from '../rivals'
import { type LiveBattle, NPC_SETTLEMENTS, RAID_UNITS, type StoredBattle, WARSHIPS, availableUnits, hasTroops, joinLive, npcState, openBattle, targetName, trimReports } from './world'
import { roll } from './dispatch'
import { multipliers, only, roundLines } from './resolve'

/**
 * ŞEHRE GELEN SALDIRILAR. Divanhane'si 5. seviyeye ulaşan şehir acemi
 * korumasından çıkar ve adasındaki Korsan İni birkaç saatte bir baskın düzenler.
 * Baskın 15 dakika önceden görünür: oyuncu asker yetiştirebilir, sur
 * yükseltebilir, seferdeki ordusunu bekleyebilir ya da Kalkan mucizesini çağırabilir.
 * Önce limandaki savaş gemileri korsan filosunu karşılar; yenerlerse baskın
 * denizde biter. Yoksa korsanlar surlara ve şehrin kara birliklerine çarpar.
 * Kazanırlarsa ambarın korunan kısmının üstündekini yağmalarlar.
 */
export type Threat = {
  id: string; cityId: string; npcId: string; level: number; arriveAt: number; troops: Troops; fleet: Troops
  /** Kapıda süren savaş. */
  battle?: LiveBattle
  /** Savaştaki sur muhafızı ve müttefik askerleri (kayıpları şehrin ordusundan düşmez). */
  spare?: Troops
  /** Şehrin ordusundan düşen kayıplar (hekim kurtarması için). */
  ownLost?: Troops
  /** Hükümdar saldırısının niyeti: yağma, şehri işgal ya da limanı abluka. */
  intent?: WarIntent
}
export type WarIntent = 'raid' | 'occupy' | 'blockade'
/**
 * KUŞATMA: yapay rakip şehrini işgal etti ya da limanını abluka etti.
 * İşgalde şehirden ordu ve nakliye çıkamaz; ablukada deniz yolu kapanır.
 * Her saat haraç alınır; en fazla 12 saat sürer ya da sen kurtarırsın.
 */
export type Siege = { id: string; rivalId: string; cityId: string; kind: 'occupy' | 'blockade'; level: number; since: number; tick: number; troops: Troops }
export const SIEGE_MAX_MS = 12 * 3600_000
export function siegeAt(empire: Empire, cityId: string, kind?: Siege['kind']) {
  return (empire.sieges ?? []).find(s => s.cityId === cityId && (!kind || s.kind === kind))
}
/** Kuşatma altındaki şehirden yapılamayan işin sebebi (yoksa null). */
export function siegeBlock(empire: Empire, cityId: string, overseas: boolean): string | null {
  const occ = siegeAt(empire, cityId, 'occupy')
  if (occ) return `${targetName(occ.rivalId)} ordusu şehri işgal etti: kapılar tutuluyor. Önce şehri kurtar.`
  const blk = siegeAt(empire, cityId, 'blockade')
  if (blk && overseas) return `Liman ${targetName(blk.rivalId)} filosunun ablukasında: deniz yolu kapalı. Önce ablukayı kır.`
  return null
}
export const PROTECTION_DIVAN = 5
export const THREAT_WARNING_MS = 15 * 60_000
const FIRST_THREAT_MS = 2 * 3600_000
const THREAT_INTERVAL_MS = 3 * 3600_000

export function pirateBand(level: number): { troops: Troops; fleet: Troops } {
  return {
    troops: { azap: 2 * level, sapanci: 2 * level, okcu: level, yeniceri: level, topcu: Math.floor(level / 4) },
    fleet: { kadirga: Math.floor(level / 3) },
  }
}
/** Ambarın yağmadan korunan kısmı (kapasitenin %20'si, Koruma Usulü ile %35; her malda). */
export function safeStock(g: Game) { return Math.round(capacity(g) * (g.research.includes('koruma') ? 0.35 : 0.2)) }
/** Şehrin surundaki muhafızlar (orduya sayılmaz, sur seviyesi başına 4 mızrakçı). */
export function cityGuards(g: Game) { return g.buildings.surlar * 4 }
export function cityWallHp(g: Game) {
  return Math.round(g.buildings.surlar * 400 * (g.research.includes('istihkam') ? 1.3 : 1) * (1 + miracle(g, 'kalkan') * 0.1))
}

function scheduleThreat(empire: Empire, city: CityRecord, at: number) {
  const korsan = NPC_SETTLEMENTS.find(n => n.islandId === city.islandId && n.kind === 'korsan')!
  const level = Math.max(npcState(empire, korsan.id).level, Math.floor(city.game.buildings.divan / 2))
  const band = pirateBand(level)
  empire.threats = [...(empire.threats ?? []), {
    id: `threat-${city.id}-${at}`, cityId: city.id, npcId: korsan.id, level, arriveAt: at, ...band,
  }]
  logEvent(city.game, `Gözcüler ${korsan.name} korsanlarını gördü! Baskın yaklaşıyor.`, at - THREAT_WARNING_MS)
}

/**
 * Baskın kapıya dayandı: önce limandaki savaş gemileri korsan filosunu
 * karşılar, yoksa korsanlar doğrudan sura ve kara birliklerine çarpar.
 * Savaş tur tur sürer; turlar arasında şehirde boşa çıkan birlikler
 * (biten eğitim, dönen sefer) savunmaya katılır.
 */
function openDefense(empire: Empire, t: Threat): boolean {
  const city = empire.cities.find(c => c.id === t.cityId)
  if (!city) return false
  const g = city.game
  const ships = only(availableUnits(empire, city.id), WARSHIPS)
  t.spare = {}; t.ownLost = {}
  // Erlik Han'ın Karanlık Korkusu: baskıncıların üçte biri kapıya varmadan kaçar.
  const fear: string[] = []
  if (godBuff(g, 'erlik', t.arriveAt)) {
    const cut = (x: Troops) => Object.fromEntries((Object.entries(x) as [UnitId, number][]).map(([id, n]) => [id, Math.floor(n * 2 / 3)]).filter(([, n]) => (n as number) > 0)) as Troops
    t.troops = cut(t.troops); t.fleet = cut(t.fleet)
    fear.push('Erlik Han\'ın karanlık korkusu çöktü: baskıncıların üçte biri kaçtı.')
  }
  if (t.intent === 'blockade' && !hasTroops(ships)) {
    // Limanda savaş gemisi yok: düşman filosu savaşmadan limanı kapatır.
    startSiege(empire, t, 'blockade', t.fleet, t.arriveAt)
    const title = `${targetName(t.npcId)} filosu limanı savaşsız abluka etti!`
    empire.reports = trimReports([{ id: `r-${t.id}`, time: t.arriveAt, kind: 'defense' as const, cityId: city.id, npcId: t.npcId, success: false, title,
      lines: [...fear, `Filo: ${troopList(t.fleet)}.`, 'Limanda savaş gemisi yoktu. Deniz yolu kapandı; her saat liman haracı alınır. Tersane\'de savaş gemisi yapıp ablukayı kır.'] },
      ...(empire.reports ?? [])])
    logEvent(g, title, t.arriveAt)
    return false
  }
  if (hasTroops(ships) && hasTroops(t.fleet)) {
    const m = multipliers(g, ships, 'deniz'), shield = 1 + miracle(g, 'kalkan') * 0.1, mul = 1 + t.level * 0.03
    t.battle = openBattle('naval', 'Deniz savaşı', targetName(t.npcId), 'Donanmamız', { troops: { ...t.fleet }, attackMul: mul, defenseMul: mul },
      { troops: ships, attackMul: m.attackMul * shield, defenseMul: m.defenseMul * shield, fieldLevel: Math.max(g.buildings.liman, g.buildings.tersane), naval: true }, t.arriveAt, fear)
  } else openLandDefense(empire, t, t.arriveAt, fear, [])
  return true
}
/** Kara savaşı: sur muhafızları + şehrin kara birlikleri (+ ittifak yardımı), sur önce hasar emer. */
function openLandDefense(empire: Empire, t: Threat, at: number, lines: string[], done: StoredBattle[]) {
  const city = empire.cities.find(c => c.id === t.cityId)!
  const g = city.game
  const land = only(availableUnits(empire, city.id), RAID_UNITS)
  const m = multipliers(g, land, 'kara'), shield = 1 + miracle(g, 'kalkan') * 0.1, mul = 1 + t.level * 0.03
  // İttifak üyeleri yardıma asker gönderir; muhafızlar ve müttefikler (kayıpları onlarındır) önce düşer.
  const help = allyHelp(empire, at)
  if (hasTroops(help)) lines.push(`İttifak yardımı: ${troopList(help)}.`)
  const spare: Troops = { ...help }
  spare.mizrakci = (spare.mizrakci ?? 0) + cityGuards(g)
  const defenders: Troops = { ...land }
  for (const [id, n] of Object.entries(spare) as [UnitId, number][]) defenders[id] = (defenders[id] ?? 0) + n
  t.spare = spare; t.ownLost = {}
  t.battle = openBattle('land', 'Şehir savunması', targetName(t.npcId), 'Şehrimiz', { troops: { ...t.troops }, attackMul: mul, defenseMul: mul },
    { troops: defenders, attackMul: m.attackMul * shield, defenseMul: m.defenseMul * shield, wall: cityWallHp(g), fieldLevel: g.buildings.divan,
      healPerDoctor: m.healPerDoctor, moraleMul: m.moraleMul }, at, lines, done)
}
/** Savunma savaşının bir turu; savaş bittiyse true. */
function stepThreat(empire: Empire, t: Threat): boolean {
  const lb = t.battle!
  const city = empire.cities.find(c => c.id === t.cityId)
  if (!city) return true
  const g = city.game, st = lb.state, at = lb.nextAt
  const spare = t.spare ?? {}, ownLost = t.ownLost ?? {}
  // Takviye: şehirde boşta olup henüz savaşmayan birlikler sıradaki tura katılır.
  const free = availableUnits(empire, city.id)
  const diff: Troops = {}
  for (const id of lb.stage === 'naval' ? WARSHIPS : RAID_UNITS) {
    const d = free[id] - Math.max(0, (st.d.troops[id] ?? 0) - (spare[id] ?? 0))
    if (d) diff[id] = d
  }
  joinLive(lb, 'd', diff)
  const r = battleRound(st)
  if (r) for (const [id, n] of Object.entries(r.defenderLoss) as [UnitId, number][]) {
    const fromSpare = Math.min(n, spare[id] ?? 0)
    spare[id] = (spare[id] ?? 0) - fromSpare
    const own = n - fromSpare
    if (own > 0) { g.army[id] = Math.max(0, g.army[id] - own); ownLost[id] = (ownLost[id] ?? 0) + own }
  }
  t.spare = spare; t.ownLost = ownLost
  if (!st.over) { lb.nextAt += ROUND_MS; return false }
  return finishDefense(empire, t, at)
}
/** Aynı olay hep aynı cümleyle gelmesin: olay kimliğinden seçilen anlatım. */
function variant(id: string, options: string[]): string {
  let h = 0
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return options[h % options.length]
}
function finishDefense(empire: Empire, t: Threat, at: number): boolean {
  const lb = t.battle!
  const city = empire.cities.find(c => c.id === t.cityId)!
  const g = city.game
  const res = endBattle(lb.state)
  const lost: Troops = { ...(t.ownLost ?? {}) }
  // Hekimlerin kurtardığı şehir askerleri orduya döner.
  for (const [id, n] of Object.entries(res.healedD) as [UnitId, number][]) {
    const back = Math.min(n, lost[id] ?? 0)
    if (back > 0) { g.army[id] += back; lost[id] = (lost[id] ?? 0) - back }
  }
  const done = [...lb.done, lb.info]
  const lines = [...lb.lines]
  delete t.battle
  const name = targetName(t.npcId)
  const rival = !!rivalById(t.npcId)
  const report = (success: boolean, title: string) => {
    empire.reports = trimReports([{ id: `r-${t.id}`, time: at, kind: 'defense' as const, cityId: city.id, npcId: t.npcId, success, title, lines, battles: done },
      ...(empire.reports ?? [])])
    logEvent(g, title, at)
  }
  const bounty = () => {
    const n = Math.round((Object.entries(res.attackerLost) as [UnitId, number][]).reduce((s, [id, k]) => s + UNITS[id].pop * k, 0) * 8)
    g.resources.gold = Math.min(capacity(g), g.resources.gold + n)
    return n
  }
  if (lb.stage === 'naval') {
    lines.push('Deniz savaşı:', ...roundLines(res.rounds, 'batan korsan', 'batan gemimiz'),
      `Donanma kaybı: ${troopList(lost)} · korsan kaybı: ${troopList(res.attackerLost)}.`, res.reason)
    if (res.winner === 'defender') {
      lines.push(variant(t.id + 'l', [
        `Korsanlar karaya çıkamadan kaçtı. Ödül: ${bounty()} akçe.`,
        `Kıyıdaki halk zafer şenliği yaptı; Divan ${bounty()} akçe ödül dağıttı.`,
        `Yelkenleri yırtılan korsanlar ufka kaçtı. Ganimet: ${bounty()} akçe.`,
      ]))
      report(true, variant(t.id, [
        `Donanmamız ${name} korsanlarını denizde durdurdu.`,
        `${name} korsanları limana yaklaşamadan battı!`,
        `Toplarımız ${name} filosunu geri çevirdi.`,
        `Deniz bizim: ${name} korsanları kaçtı.`,
      ]))
      return true
    }
    if (t.intent === 'blockade') {
      startSiege(empire, t, 'blockade', res.attackerLeft, at)
      lines.push('Düşman filosu limanı kapattı: deniz yolu kapalı, her saat liman haracı alınır. Ordu panelinden ablukayı kırabilirsin.')
      report(false, `${name} filosu limanı abluka etti!`)
      return true
    }
    lines.push(rival ? 'Düşman filosu kıyıya ulaştı.' : 'Korsan filosu kıyıya ulaştı.')
    openLandDefense(empire, t, at + ROUND_MS, lines, done)
    return false
  }
  lines.push(...roundLines(res.rounds, 'korsan kaybı', 'kaybımız'),
    `Şehrin kaybı: ${troopList(lost)} (sur muhafızları: ${cityGuards(g)}).`, `Korsan kaybı: ${troopList(res.attackerLost)}.`, res.reason)
  if (res.winner === 'defender') {
    lines.push(variant(t.id + 'l', [`Baskın püskürtüldü. Ödül: ${bounty()} akçe.`, `Surlar dayandı; kaçan düşmandan ${bounty()} akçe ganimet kaldı.`, `Muhafızlar kapıyı tuttu. Ödül: ${bounty()} akçe.`]))
    report(true, rival
      ? variant(t.id, [`${name} ordusu surlarda durduruldu!`, `${name} askerleri surlarımızda dağıldı!`, `Kapılar tuttu: ${name} geri çekildi.`])
      : variant(t.id, [`${name} korsanları surlarda durduruldu!`, `Surlar ${name} korsanlarına geçit vermedi!`, `${name} baskını kanlı bitti: korsanlar kaçtı.`]))
    return true
  }
  if (t.intent === 'occupy') {
    startSiege(empire, t, 'occupy', res.attackerLeft, at)
    lines.push('Düşman ordusu şehre yerleşti: şehirden ordu, casus ve nakliye çıkamaz; her saat haraç alınır. Ordu panelinden şehri kurtarabilirsin.')
    report(false, `${name} ordusu şehri işgal etti!`)
    return true
  }
  // Yağma: sağ kalan korsan kişi başı 30 taşır; korunan kısım dokunulmaz.
  let carry = (Object.entries(res.attackerLeft) as [UnitId, number][]).reduce((s, [id, n]) => s + UNITS[id].pop * n * 30, 0)
  const safe = safeStock(g)
  const taken: string[] = []
  for (const r of ['gold', 'wood', 'stone'] as const) {
    const n = Math.min(carry, Math.max(0, Math.floor(g.resources[r] - safe)) >> 1)
    if (n > 0) { g.resources[r] -= n; carry -= n; taken.push(`${n} ${r === 'gold' ? 'akçe' : r === 'wood' ? 'kereste' : 'taş'}`) }
  }
  for (const r of LUXURY_IDS) {
    const n = Math.min(carry, Math.max(0, Math.floor(g.luxury[r] - safe)) >> 1)
    if (n > 0) { g.luxury[r] -= n; carry -= n; taken.push(`${n} ${r}`) }
  }
  lines.push(taken.length ? `Yağmalanan: ${taken.join(', ')}.` : 'Ambarda korunan miktarın üstünde mal yoktu.',
    `Ambar her malın ${safe} birimini korur. Surları yükselt, asker yetiştir ya da Kalkan mucizesini çağır.`)
  report(false, rival ? `${name} ordusu şehri yağmaladı.` : `${name} korsanları şehri yağmaladı.`)
  return true
}

function startSiege(empire: Empire, t: Threat, kind: Siege['kind'], troops: Troops, at: number) {
  const left = Object.fromEntries((Object.entries(troops) as [UnitId, number][]).filter(([, n]) => n > 0)) as Troops
  empire.sieges = [...(empire.sieges ?? []).filter(s => !(s.cityId === t.cityId && s.kind === kind)),
    { id: `siege-${t.id}`, rivalId: t.npcId, cityId: t.cityId, kind, level: t.level, since: at, tick: at, troops: left }]
}
/** Kuşatmanın saatlik haracı (akçe; işgalde kereste ve taştan da). */
export function siegeTribute(s: Siege) { return s.level * (s.kind === 'occupy' ? 90 : 50) }
/** advanceEmpire içinden: kuşatma haracı ve süre dolunca çekilme. */
export function advanceSieges(empire: Empire, now: number) {
  const keep: Siege[] = []
  for (const s of empire.sieges ?? []) {
    const city = empire.cities.find(c => c.id === s.cityId)
    if (!city) continue
    const g = city.game, end = s.since + SIEGE_MAX_MS
    for (let h = s.tick + 3600_000; h <= Math.min(now, end); h += 3600_000) {
      const gold = Math.min(Math.max(0, Math.floor(g.resources.gold)), siegeTribute(s))
      g.resources.gold -= gold
      if (s.kind === 'occupy') for (const r of ['wood', 'stone'] as const) g.resources[r] -= Math.min(Math.max(0, Math.floor(g.resources[r])), s.level * 40)
      s.tick = h
      logEvent(g, s.kind === 'occupy' ? `İşgalciler ${gold} akçe haraç topladı.` : `Abluka yüzünden liman ${gold} akçe kaybetti.`, h)
    }
    if (now >= end) {
      const title = s.kind === 'occupy' ? `${targetName(s.rivalId)} ordusu şehirden çekildi.` : `${targetName(s.rivalId)} filosu ablukayı kaldırdı.`
      empire.reports = trimReports([{ id: `r-${s.id}-end`, time: end, kind: 'defense' as const, cityId: s.cityId, npcId: s.rivalId, success: true, title,
        lines: ['Kuşatma on iki saatte bitti; düşman ikmalsiz kaldı ve geri döndü.'] }, ...(empire.reports ?? [])])
      logEvent(g, title, end)
      continue
    }
    keep.push(s)
  }
  if (keep.length) empire.sieges = keep
  else delete empire.sieges
}
/**
 * ŞEHRİ KURTAR: şehirdeki kara birlikleri işgalcilere (ya da limandaki savaş
 * gemileri abluka filosuna) saldırır. Savaş tek seferde çözülür, raporda tur
 * tur izlenir. Kazanırsan kuşatma kalkar ve düşmanın kaybı kadar ödül alırsın.
 */
export function liberateCity(source: Empire, cityId: string, kind: Siege['kind'], now: number): { empire: Empire; error?: string } {
  const empire = advanceEmpire(source, now)
  const s = siegeAt(empire, cityId, kind)
  const city = empire.cities.find(c => c.id === cityId)
  if (!s || !city) return { empire, error: 'Burada kuşatma yok.' }
  const g = city.game
  const branch = kind === 'occupy' ? 'kara' : 'deniz'
  const units = only(availableUnits(empire, cityId), kind === 'occupy' ? RAID_UNITS : WARSHIPS)
  if (!hasTroops(units)) return { empire, error: kind === 'occupy' ? 'Şehirde kara birliği yok. Başka şehirden birlik aktar ya da Kışla\'da eğit.' : 'Limanda savaş gemisi yok. Tersane\'de gemi yap.' }
  const m = multipliers(g, units, branch), mul = 1 + s.level * 0.03
  const a: BattleSide = { troops: units, attackMul: m.attackMul, defenseMul: m.defenseMul, fieldLevel: kind === 'occupy' ? g.buildings.divan : Math.max(g.buildings.liman, g.buildings.tersane), naval: kind === 'blockade', healPerDoctor: m.healPerDoctor, moraleMul: m.moraleMul }
  const d: BattleSide = { troops: { ...s.troops }, attackMul: mul, defenseMul: mul, fieldLevel: g.buildings.divan, naval: kind === 'blockade' }
  const res = replayBattle(a, d)
  for (const [id, n] of Object.entries(res.attackerLost) as [UnitId, number][]) g.army[id] = Math.max(0, g.army[id] - Math.max(0, n - (res.healed[id] ?? 0)))
  s.troops = Object.fromEntries((Object.entries(res.defenderLeft) as [UnitId, number][]).filter(([, n]) => n > 0)) as Troops
  const name = targetName(s.rivalId)
  const title = res.winner === 'attacker' ? (kind === 'occupy' ? `${city.name} kurtarıldı! ${name} ordusu kovuldu.` : `Abluka kırıldı! ${name} filosu dağıldı.`)
    : (kind === 'occupy' ? `Kurtarma saldırısı püskürtüldü; ${city.name} hâlâ işgal altında.` : `Ablukayı kırma denemesi başarısız.`)
  const lines = [...roundLines(res.rounds, kind === 'occupy' ? 'kaybımız' : 'batan gemimiz', kind === 'occupy' ? 'işgalci kaybı' : 'batan düşman'),
    `Kaybımız: ${troopList(res.attackerLost)} · düşman kaybı: ${troopList(res.defenderLost)}.`, res.reason]
  if (res.winner === 'attacker') {
    empire.sieges = (empire.sieges ?? []).filter(x => x !== s)
    if (!empire.sieges.length) delete empire.sieges
    const bounty = Math.round((Object.entries(res.defenderLost) as [UnitId, number][]).reduce((n, [id, k]) => n + UNITS[id].pop * k, 0) * 10)
    g.resources.gold = Math.min(capacity(g), g.resources.gold + bounty)
    lines.push(`Ödül: ${bounty} akçe.`)
  } else lines.push(`Kalan düşman: ${troopList(s.troops)}.`)
  empire.reports = trimReports([{ id: `r-free-${s.id}-${now}`, time: now, kind: 'defense' as const, cityId, npcId: s.rivalId, success: res.winner === 'attacker', title, lines,
    battles: [{ title: kind === 'occupy' ? 'Kurtuluş savaşı' : 'Abluka savaşı', attacker: city.name, defender: name, a, d }] }, ...(empire.reports ?? [])])
  logEvent(g, title, now)
  return res.winner === 'attacker' ? { empire } : { empire, error: title }
}

/** advanceEmpire içinden: baskınları zamanlar, savaşlarını tur tur yürütür. */
export function advanceThreats(empire: Empire, now: number) {
  const next = { ...(empire.nextThreat ?? {}) }
  const threats: Threat[] = []
  for (const t of [...(empire.threats ?? [])].sort((a, b) => a.arriveAt - b.arriveAt)) {
    let finished = false, end = t.arriveAt
    for (let guard = 0; guard < 100 && !finished; guard++) {
      const due = t.battle ? t.battle.nextAt : t.arriveAt
      if (now < due) break
      end = due
      if (!t.battle) finished = !openDefense(empire, t)
      else finished = stepThreat(empire, t)
    }
    if (!finished) { threats.push(t); continue }
    // Bir sonraki baskın 3-5 saat sonra; uzun yokluktan sonra en fazla bir baskın.
    next[t.cityId] = Math.max(end, now) + Math.round((THREAT_INTERVAL_MS + roll(t.id) * 2 * 3600_000) * threatIntervalMul(now))
  }
  empire.threats = threats
  for (const city of empire.cities) {
    if (city.game.buildings.divan < PROTECTION_DIVAN) { delete next[city.id]; continue }
    if (next[city.id] === undefined) next[city.id] = now + FIRST_THREAT_MS
    if (empire.threats.some(t => t.cityId === city.id)) continue
    if (now >= next[city.id] - THREAT_WARNING_MS) scheduleThreat(empire, city, Math.max(next[city.id], now + THREAT_WARNING_MS))
  }
  empire.nextThreat = next
}
