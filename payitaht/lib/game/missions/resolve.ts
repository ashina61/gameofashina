import { UNITS, UNIT_IDS, capacity, power, BUILDING_EFFECTS, logEvent, actionPoints, travelFactor, idleWorkers, garrisonLimit, garrisonUsed, inGarrison, RESEARCH, RESEARCH_BRANCHES, RESEARCH_IDS, type Army, type Game, type UnitId } from '../engine'
import { MAX_ROUNDS, ROUND_MS, battleRound, endBattle, fieldSize, replayBattle, retreatBattle, troopList, type BattleResult, type BattleSide, type Troops } from '../battle'
import { activeCity, advanceEmpire, bump, type CityRecord, type Empire } from '../empire'
import { isAlly, onRivalRaided, rivalAttackMul, rivalById, rivalFleet, rivalGarrison, rivalIntel, rivalLevel, rivalState, rivalWallHp, FACTIONS, factionMembers, mail } from '../rivals'
import { ESCORT_MUL, type LiveBattle, MAX_MISSIONS, MAX_NPC_LEVEL, MAX_REPORTS, MAX_THREATS, type Mission, type NpcState, RAID_UNITS, type Report, SPY_TYPES, SPY_TYPE_IDS, type SpyType, type StoredBattle, type Target, WARSHIPS, actionsInUse, availableUnits, cloneSide, hasTroops, joinLive, liveBattleAt, npcById, npcDefense, npcWall, openBattle, piracyTarget, rivalField, seaTravelMs, targetInfo, targetIsland, targetName, targetTravelMs, transportsNeeded, trimReports, underSiege } from './world'
import { roll, spyChance, targetCheck } from './dispatch'
import { type Siege, type Threat, siegeBlock } from './threats'

/** Seçili birliklerin bonus çarpanları (araştırma, Tophane, mucize). */
export function multipliers(g: Game, units: Troops, branch: 'kara' | 'deniz') {
  const picked = (Object.entries(units) as [UnitId, number][]).filter(([id]) => UNITS[id].branch === branch)
  const raw = (key: 'attack' | 'defense') => picked.reduce((sum, [id, n]) => sum + UNITS[id][key] * n, 0)
  const army = Object.fromEntries(UNIT_IDS.map(id => [id, 0])) as Army
  for (const [id, n] of picked) army[id] = n
  const p = power({ ...g, army }, branch)
  return {
    attackMul: raw('attack') > 0 ? p.attack / raw('attack') : 1, defenseMul: raw('defense') > 0 ? p.defense / raw('defense') : 1,
    moraleMul: g.research.includes('seref') ? 0.8 : 1, healPerDoctor: g.research.includes('anatomi') ? 6 : 3,
  }
}
export const only = (t: Troops, ids: UnitId[]): Troops =>
  Object.fromEntries((Object.entries(t) as [UnitId, number][]).filter(([id, n]) => ids.includes(id) && n > 0))

const unitList = (units: Partial<Record<UnitId, number>>) =>
  (Object.entries(units) as [UnitId, number][]).filter(([, n]) => n > 0).map(([id, n]) => `${n} ${UNITS[id].name}`).join(', ') || 'yok'

/** Görevin raporu (savaşları rapor görünümünde tur tur açılır). */
function missionReport(empire: Empire, m: Mission, at: number, success: boolean, title: string, lines: string[], battles: StoredBattle[] = []) {
  const city = empire.cities.find(c => c.id === m.cityId)
  empire.reports = trimReports([{ id: `r-${m.id}`, time: at, kind: m.kind, cityId: m.cityId, npcId: m.npcId, success, title, lines, battles: battles.length ? battles : undefined },
    ...(empire.reports ?? [])])
  if (city) logEvent(city.game, title, at)
}
/** Görev sonuçlandı: dönüş yolu savaşın bittiği andan başlar. */
function concludeMission(m: Mission, at: number) {
  const travel = m.returnAt - m.arriveAt
  m.resolved = true
  delete m.battle
  m.returnAt = Math.max(at, m.arriveAt) + travel
}
const isAssault = (k: Mission['kind']) => k === 'raid' || k === 'occupy'

/**
 * Varış: casusluk hemen çözülür; sefer, abluka ve korsan seferi bir SAVAŞ
 * başlatır (ilk tur varış anında). `empire` yerinde değiştirilir.
 */
export function resolveArrival(empire: Empire, m: Mission) {
  const city = empire.cities.find(c => c.id === m.cityId)
  if (!city) { m.resolved = true; return }
  if (m.kind === 'deploy') { m.resolved = true; return resolveDeploy(empire, city, m) }
  if (m.kind === 'piracy') return openPiracy(city, m)
  const npc = targetInfo(empire, m.npcId, m.arriveAt)
  if (!npc) { m.resolved = true; return }
  const g = city.game
  const report = (success: boolean, title: string, lines: string[]) => {
    missionReport(empire, m, m.arriveAt, success, title, lines)
    concludeMission(m, m.arriveAt)
  }
  if (m.kind === 'spy') {
    const count = m.units.casus ?? 0
    const chance = spyChance(g, count, npc.level)
    // Aynı şehrin casusları zaten içerideyse yenileri onlara katılır.
    const inside = (empire.missions ?? []).find(x => x !== m && x.kind === 'spy' && x.stationed && x.cityId === m.cityId && x.npcId === m.npcId)
    if (roll(m.id) < chance) {
      if (inside) {
        inside.units.casus = (inside.units.casus ?? 0) + count
        m.units = {}; m.resolved = true; m.returnAt = m.arriveAt
        logEvent(g, `${count} casus ${npc.name} içindeki ağımıza katıldı.`, m.arriveAt)
        return
      }
      report(true, `Casuslar ${npc.name} içine sızdı.`, [
        `${count} casus şehirde gizlendi (sızma şansı %${Math.round(chance * 100)} idi).`,
        'Hedef panelinden görev ver: hazine, garnizon, surlar, liman ya da asker hareketleri. Başarısız görevde bir casus yakalanır.'])
      m.stationed = true
    } else {
      g.army.casus = Math.max(0, g.army.casus - count)
      m.units = {}
      if (npc.rival) rivalState(empire, m.npcId).relation = Math.max(-100, rivalState(empire, m.npcId).relation - 10)
      report(false, `${count} casus ${npc.name} muhafızlarına yakalandı.`, [
        `Sızma şansı %${Math.round(chance * 100)} idi. Daha çok casus gönder ya da Elçiliği yükselt.`,
      ])
    }
    return
  }
  if (m.kind === 'support') {
    const r = rivalById(m.npcId)!
    rivalState(empire, m.npcId).relation = Math.min(100, rivalState(empire, m.npcId).relation + 5)
    mail(empire, m.arriveAt, r.ruler, 'Destek', `Askerlerin ${r.city} surlarına dizildi. Birliğimize bağlılığını unutmayacağız.`, r.id)
    report(true, `Destek birliklerimiz ${npc.name} şehrine ulaştı.`, [`Konuşlanan: ${unitList(m.units)}.`,
      `${FACTIONS[r.faction].name} düşmanları saldırırsa birliklerimiz müttefikle birlikte savunur. Seferler panelinden geri çağırabilirsin.`])
    m.stationed = true
    m.supportAt = m.arriveAt + SUPPORT_WATCH_MS
    return
  }
  // TAKVİYE: aynı şehirden gelen ordu, hedefte süren savaşa sıradaki turda katılır.
  const host = liveBattleAt(empire, m.npcId)
  if (host && host !== m) {
    if (host.cityId !== m.cityId || !isAssault(host.kind) || !isAssault(m.kind)) {
      // Meydan dolu: bu ordu önceki savaş bitene kadar hedefin önünde bekler.
      m.arriveAt += ROUND_MS; m.returnAt += ROUND_MS
      return
    }
    const lb = host.battle!
    for (const [id, n] of Object.entries(m.units) as [UnitId, number][]) host.units[id] = (host.units[id] ?? 0) + n
    joinLive(lb, 'a', only(m.units, lb.stage === 'naval' ? WARSHIPS : RAID_UNITS))
    logEvent(g, `Takviye ${npc.name} önündeki savaşa katıldı: ${troopList(m.units)}.`, m.arriveAt)
    m.units = {}; m.resolved = true; m.returnAt = m.arriveAt
    return
  }
  // DENİZ SAVAŞI: başka adadaki hedefin donanması çıkarmayı engeller (abluka zaten batırdıysa yok).
  const overseas = npc.islandId !== city.islandId
  const blockadedByUs = (empire.missions ?? []).some(x => x.npcId === m.npcId && x.kind === 'blockade' && x.stationed)
  const fleet = blockadedByUs ? {} : npc.fleet
  const ships = only(m.units, WARSHIPS)
  const openNaval = () => {
    m.battle = openBattle('naval', 'Deniz savaşı', 'Filomuz', `${npc.name} donanması`, { troops: ships, ...multipliers(g, ships, 'deniz') },
      { troops: { ...fleet }, attackMul: npc.mul, defenseMul: npc.mul, fieldLevel: npc.field, naval: true }, m.arriveAt)
  }
  if (m.kind === 'blockade') {
    if (!hasTroops(fleet)) return concludeBlockade(empire, m, city, m.arriveAt, [], [])
    return openNaval()
  }
  if (overseas && hasTroops(fleet)) {
    if (!hasTroops(ships)) {
      report(false, `${npc.name} önünde çıkarma yapılamadı.`, [
        `${npc.name} donanması (${troopList(fleet)}) kıyıyı tutuyor. Eskortsuz nakliye gemileri çıkarma yapamadı.`,
        'Savaş gemileriyle (kadırga, ateş gemisi...) eskort ederek tekrar dene.'])
      return
    }
    return openNaval()
  }
  openLand(m, g, npc, m.arriveAt, [], [])
}

/**
 * MÜTTEFİKE DESTEK (Ikariam'da müttefik şehre birlik konuşlandırma): ittifak
 * üyesi hükümdarın şehrine asker ve gemi gönderilir; orada kalır, bakımı
 * senden düşer. Karşı ittifak o şehre saldırırsa birliklerin müttefikin
 * garnizonuyla birlikte savunur; kazanınca ödül ve itibar gelir.
 */
export const SUPPORT_WATCH_MS = 2 * 3600_000
export function dispatchSupport(source: Empire, rivalId: string, units: Partial<Record<UnitId, number>>, now: number): { empire: Empire; error?: string } {
  const empire = advanceEmpire(source, now)
  const t = targetCheck(empire, rivalId, 'support', now)
  if ('error' in t) return { empire, error: t.error }
  const free = availableUnits(empire, t.city.id)
  const clean: Partial<Record<UnitId, number>> = {}
  for (const [id, n] of Object.entries(units) as [UnitId, number][]) {
    if (!(RAID_UNITS.includes(id) || WARSHIPS.includes(id)) || !Number.isInteger(n) || n < 0) return { empire, error: 'Geçersiz birlik seçimi.' }
    if (n > free[id]) return { empire, error: `Bu kadar boşta ${UNITS[id].name} yok.` }
    if (n > 0) clean[id] = n
  }
  if (!hasTroops(clean)) return { empire, error: 'En az bir birlik seç.' }
  if (t.npc.islandId !== t.city.islandId) {
    const ships = transportsNeeded(clean)
    if (ships > free.nakliye) return { empire, error: `Bu destek için ${ships} nakliye gemisi gerekli (boşta ${free.nakliye}).` }
    if (ships) clean.nakliye = ships
  }
  const travel = targetTravelMs(t.city, rivalId, 'raid', t.npc.level, clean)
  empire.missions = [...(empire.missions ?? []), {
    id: `support-${t.city.id}-${rivalId}-${now}`, kind: 'support', cityId: t.city.id, npcId: rivalId, units: clean,
    departAt: now, arriveAt: now + travel, returnAt: now + 2 * travel, resolved: false, loot: { gold: 0, wood: 0, stone: 0 },
  }]
  logEvent(t.city.game, `Destek birlikleri müttefik ${t.npc.name} şehrine yola çıktı.`, now)
  return { empire }
}
/** Nöbet: karşı ittifak saldırırsa savaş (anında çözülür, raporda tur tur izlenir). */
function resolveSupportWatch(empire: Empire, m: Mission) {
  const at = m.supportAt!
  const r = rivalById(m.npcId)
  const city = empire.cities.find(c => c.id === m.cityId)
  if (!r || !city) { delete m.supportAt; return }
  // İttifaktan ayrıldıysan birlikler kendiliğinden döner.
  if (!isAlly(empire, r.id)) {
    m.stationed = false; delete m.supportAt
    m.returnAt = at + (m.arriveAt - m.departAt)
    logEvent(city.game, `${r.city} artık müttefik değil; destek birlikleri dönüyor.`, at)
    return
  }
  m.supportAt = at + SUPPORT_WATCH_MS + Math.round(roll(`${m.id}-${at}-next`) * 3600_000)
  if (roll(`${m.id}-${at}`) >= 0.35) return
  const g = city.game
  const enemies = factionMembers(r.faction === 'dogu' ? 'bati' : 'dogu')
  const foe = enemies[Math.floor(roll(`${m.id}-${at}-foe`) * enemies.length)]
  const L = rivalLevel(empire, foe, at), own = rivalLevel(empire, r, at)
  const scale = (t: Troops, k: number) => Object.fromEntries((Object.entries(t) as [UnitId, number][]).filter(([, n]) => n).map(([id, n]) => [id, Math.ceil(n * k)])) as Troops
  const merge = (x: Troops, y: Troops) => { const o: Troops = { ...x }; for (const [id, n] of Object.entries(y) as [UnitId, number][]) o[id] = (o[id] ?? 0) + n; return o }
  /** Kayıplar müttefikle orantılı paylaşılır; bizimkiler ordudan düşer. */
  const share = (lostAll: Troops, ours: Troops, all: Troops) => {
    const lost: Troops = {}
    for (const [id, n] of Object.entries(lostAll) as [UnitId, number][]) {
      const k = Math.min(ours[id] ?? 0, Math.round(n * (ours[id] ?? 0) / Math.max(1, all[id] ?? 0)))
      if (k > 0) { lost[id] = k; g.army[id] = Math.max(0, g.army[id] - k); m.units[id] = Math.max(0, (m.units[id] ?? 0) - k) }
    }
    return lost
  }
  const lines = [`${foe.ruler} (${FACTIONS[foe.faction].name}, yapay rakip) ${r.city} şehrine saldırdı.`]
  const battles: StoredBattle[] = []
  let win = false, bountyFrom: Troops = {}
  // DENİZ: başka adadan gelen düşman önce limanı zorlar; filomuz müttefik donanmasıyla karşılar.
  const enemyFleet = foe.islandId !== r.islandId ? scale(rivalFleet(L, foe.style), 0.6) : {}
  let landed = true
  if (hasTroops(enemyFleet)) {
    const ourShips = only(m.units, WARSHIPS)
    const fleet = merge(scale(rivalFleet(own, r.style), 0.5), ourShips)
    const ms = multipliers(g, ourShips, 'deniz')
    const na: BattleSide = { troops: enemyFleet, attackMul: rivalAttackMul(L), defenseMul: rivalAttackMul(L) }
    const nd: BattleSide = { troops: fleet, attackMul: ms.attackMul, defenseMul: ms.defenseMul, fieldLevel: rivalField(own), naval: true }
    battles.push({ title: 'Liman savunması', attacker: `${foe.city} donanması`, defender: `${r.city} limanı ve filomuz`, a: cloneSide(na), d: cloneSide(nd) })
    const nres = hasTroops(fleet) ? replayBattle(na, nd) : null
    if (nres) {
      const lostShips = share(nres.defenderLost, ourShips, fleet)
      lines.push('Deniz savaşı:', ...roundLines(nres.rounds, 'batan düşman', 'batan savunan'), `Filomuzun kaybı: ${troopList(lostShips)}.`, nres.reason)
      if (nres.winner === 'defender') { landed = false; win = true; bountyFrom = nres.attackerLost; lines.push('Düşman donanması limanın önünde dağıldı; ordu karaya çıkamadı.') }
    } else battles.pop()
  }
  if (landed) {
    const band: Troops = {}
    for (const [id, n] of Object.entries(rivalGarrison(L, foe.style)) as [UnitId, number][]) if (n && UNITS[id].role !== 'support') band[id] = Math.ceil(n * 0.6)
    // Müttefikin kendi garnizonunun yarısı + bizim kara birliklerimiz.
    const ours = only(m.units, RAID_UNITS)
    const defenders = merge(scale(rivalGarrison(own, r.style), 0.5), ours)
    const mul = multipliers(g, ours, 'kara')
    const a: BattleSide = { troops: band, attackMul: rivalAttackMul(L), defenseMul: rivalAttackMul(L) }
    const d: BattleSide = { troops: defenders, attackMul: mul.attackMul, defenseMul: mul.defenseMul, wall: rivalWallHp(own), fieldLevel: rivalField(own) }
    battles.push({ title: 'Müttefik savunması', attacker: `${foe.city} ordusu`, defender: `${r.city} ve birliklerimiz`, a: cloneSide(a), d: cloneSide(d) })
    const res = replayBattle(a, d)
    const lost = share(res.defenderLost, ours, defenders)
    lines.push(...roundLines(res.rounds, 'saldıran kaybı', 'savunan kaybı'), `Birliklerimizin kaybı: ${troopList(lost)}.`, res.reason)
    win = res.winner === 'defender'
    bountyFrom = res.attackerLost
  }
  if (win) {
    const bounty = Math.round((Object.entries(bountyFrom) as [UnitId, number][]).reduce((s, [id, n]) => s + UNITS[id].pop * n, 0) * 10)
    g.resources.gold = Math.min(capacity(g), g.resources.gold + bounty)
    rivalState(empire, r.id).relation = Math.min(100, rivalState(empire, r.id).relation + 10)
    for (const x of factionMembers(r.faction)) if (x.id !== r.id) rivalState(empire, x.id).relation = Math.min(100, rivalState(empire, x.id).relation + 3)
    lines.push(`Saldırı püskürtüldü. ${r.ruler} ${bounty} akçe gönderdi; ittifakta itibarın arttı.`)
  } else lines.push('Şehir düştü; sağ kalan birliklerimiz surlarda direniyor.')
  empire.reports = trimReports([{ id: `r-${m.id}-${at}`, time: at, kind: 'support' as const, cityId: m.cityId, npcId: m.npcId, success: win,
    title: win ? `${r.city} savunmasında zafer!` : `${r.city} savunmasında ağır kayıp.`, lines, battles }, ...(empire.reports ?? [])])
  logEvent(g, win ? `${r.city} savunmasında zafer!` : `${r.city} savunmasında ağır kayıp.`, at)
  if (!hasTroops(only(m.units, [...RAID_UNITS, ...WARSHIPS]))) {
    m.stationed = false; delete m.supportAt; m.returnAt = at + (m.arriveAt - m.departAt)
  }
}

/** Bir casus görevinin başarı şansı. */
export function spyTaskChance(g: Game, count: number, level: number, type: SpyType) {
  return Math.min(0.95, Math.max(0.05, spyChance(g, count, level) + SPY_TYPES[type].bonus))
}
/** İçerideki casuslara görev ver. */
export function spyMission(source: Empire, missionId: string, type: SpyType, now: number): { empire: Empire; error?: string } {
  const empire = advanceEmpire(source, now)
  const m = (empire.missions ?? []).find(x => x.id === missionId)
  if (!m || m.kind !== 'spy' || !m.stationed) return { empire, error: 'Orada casusun yok.' }
  if (!SPY_TYPES[type]) return { empire, error: 'Bilinmeyen görev.' }
  if (m.spyTask) return { empire, error: 'Casuslar başka bir görevde.' }
  if (type === 'arastirma' && !rivalById(m.npcId)) return { empire, error: 'Bu yerleşimin âlimleri yok; araştırma yalnız hükümdar şehirlerinde incelenir.' }
  const city = empire.cities.find(c => c.id === m.cityId)!
  m.spyTask = { type, at: now + Math.round(SPY_TYPES[type].minutes * 60_000 * travelFactor(city.game)) }
  logEvent(city.game, `Casuslara görev verildi: ${SPY_TYPES[type].name} (${targetName(m.npcId)}).`, now)
  return { empire }
}
/**
 * Yapay rakibin bildiği araştırmalar: şehir seviyesi ve huyuna göre her
 * daldaki ilk araştırmalar (deterministik). Huyu kendi dalını öne çıkarır.
 */
export function rivalResearch(r: { style: string }, level: number): string[] {
  const favor: Record<string, string> = { tuccar: 'ekonomi', alim: 'bilim', savasci: 'askeri', denizci: 'denizcilik' }
  const out: string[] = []
  for (const b of RESEARCH_BRANCHES) {
    const ids = RESEARCH_IDS.filter(id => RESEARCH[id].branch === b.key)
    const n = Math.min(ids.length, Math.floor(level * 0.8 + (favor[r.style] === b.key ? 4 : 0)))
    const last = ids.slice(Math.max(0, n - 2), n).map(id => RESEARCH[id].name)
    out.push(`${b.title}: ${n}/${ids.length}${last.length ? ` · son öğrenilen: ${last.join(', ')}` : ''}.`)
  }
  return out
}
/** Görev zamanı geldi: istihbarat raporu ya da yakalanan casus. */
function resolveSpyTask(empire: Empire, m: Mission) {
  const task = m.spyTask!
  delete m.spyTask
  const city = empire.cities.find(c => c.id === m.cityId)
  const npc = targetInfo(empire, m.npcId, task.at)
  if (!city || !npc) return
  const g = city.game
  const count = m.units.casus ?? 0
  const chance = spyTaskChance(g, count, npc.level, task.type)
  const info = SPY_TYPES[task.type]
  const push = (success: boolean, title: string, lines: string[]) => {
    empire.reports = trimReports([{ id: `r-${m.id}-${task.at}`, time: task.at, kind: 'spy' as const, cityId: m.cityId, npcId: m.npcId, success, title, lines,
      intel: success ? task.type : undefined }, ...(empire.reports ?? [])])
    logEvent(g, title, task.at)
  }
  if (roll(`${m.id}-${task.type}-${task.at}`) >= chance) {
    g.army.casus = Math.max(0, g.army.casus - 1)
    m.units.casus = Math.max(0, count - 1)
    if (npc.rival) rivalState(empire, m.npcId).relation = Math.max(-100, rivalState(empire, m.npcId).relation - 5)
    const left = m.units.casus ?? 0
    push(false, `${npc.name}: bir casusumuz yakalandı.`, [`${info.name} başarısız (şans %${Math.round(chance * 100)}).`,
      left ? `İçeride ${left} casus kaldı.` : 'Şehirde casusumuz kalmadı.'])
    if (!left) { m.stationed = false; m.resolved = true; m.returnAt = task.at }
    return
  }
  const field = fieldSize(npc.field)
  const d = npc.rival ? null : npcDefense(npc.level, false)
  const lines: string[] = [`Seviye ${npc.level} ${npc.kindName}.`]
  if (task.type === 'hazine') lines.push(`Hazine: ${npc.loot.gold} akçe, ${npc.loot.wood} kereste, ${npc.loot.stone} taş.`,
    npc.rival ? 'Yağmalanan hazine 2 saatte dolar.' : 'Yağmalanan hazine 45 dakikada dolar.')
  if (task.type === 'garnizon') lines.push(`Garnizon: ${unitList(npc.garrison)}.`,
    `Savaş meydanı: ${field.name} (Divanhane ${npc.field} karşılığı · ön cephe ${field.front}, kanat ${field.flank}, menzil ${field.range}, kuşatma ${field.artillery}, hava ${field.air}+${field.fighter} yuva).`)
  if (task.type === 'sur') lines.push(d ? `Sur: seviye ${npcWall(npc.level)}, can ${npc.wallHp}.` : `Sur canı ${npc.wallHp}.`,
    `Toplam savunma ${d ? d.total : Math.round(UNIT_IDS.reduce((s, id) => s + UNITS[id].defense * npc.garrison[id], 0) + npc.wallHp / 3)}.`)
  if (task.type === 'donanma') lines.push(`Donanma: ${troopList(npc.fleet)}.`)
  if (task.type === 'hareket') {
    const coming = (empire.threats ?? []).filter(t => t.npcId === m.npcId)
    lines.push(...(coming.length ? coming.map(t => `${empire.cities.find(c => c.id === t.cityId)?.name ?? 'Şehrin'} üzerine yolda: ${troopList(t.troops)}${hasTroops(t.fleet) ? ` · filo ${troopList(t.fleet)}` : ''} · varış ${new Date(t.arriveAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}.`)
      : ['Şu an sana doğru yola çıkmış bir ordu yok.']))
    if (npc.rival) {
      const rel = rivalState(empire, m.npcId).relation
      lines.push(rel <= -20 ? `İlişki ${rel}: saldırı hazırlığı konuşuluyor.` : rel >= 20 ? `İlişki ${rel}: sana karşı iyi niyetliler.` : `İlişki ${rel}: temkinli bekliyorlar.`)
      if (rivalById(m.npcId)) lines.push(...rivalIntel(empire, rivalById(m.npcId)!, task.at).slice(0, 1))
    }
  }
  if (task.type === 'arastirma') {
    const r = rivalById(m.npcId)
    if (r) lines.push(...rivalResearch(r, npc.level))
  }
  lines.push(`Görev şansı %${Math.round(chance * 100)} idi.`)
  push(true, `${info.name}: ${npc.name}`, lines)
}

/** Kara savaşını başlat (surlu garnizona karşı). */
function openLand(m: Mission, g: Game, npc: Target, at: number, lines: string[], done: StoredBattle[]) {
  const land = only(m.units, RAID_UNITS)
  m.battle = openBattle('land', 'Kara savaşı', 'Ordumuz', npc.name, { troops: land, ...multipliers(g, land, 'kara') },
    { troops: only(npc.garrison, [...UNIT_IDS]), attackMul: npc.mul, defenseMul: npc.mul, wall: npc.wallHp, fieldLevel: npc.field }, at, lines, done)
}

function concludeBlockade(empire: Empire, m: Mission, city: CityRecord, at: number, lines: string[], done: StoredBattle[]) {
  m.stationed = true
  onRivalRaided(empire, m.npcId, city, at)
  missionReport(empire, m, at, true, `${targetName(m.npcId)} limanı abluka altında!`, [...lines,
    'Liman kapandı: pazarı kapanır, donanması sana çıkamaz. Filo her saat liman haracı toplar; Seferler panelinden geri çağırabilirsin.'], done)
  concludeMission(m, at)
}

/** Süren savaşın bir turu (görevin ordusu saldırandır). */
function stepMission(empire: Empire, m: Mission) {
  const lb = m.battle!
  const city = empire.cities.find(c => c.id === m.cityId)
  if (!city) { concludeMission(m, lb.nextAt); return }
  const at = lb.nextAt
  const r = battleRound(lb.state)
  if (r) for (const [id, n] of Object.entries(r.attackerLoss) as [UnitId, number][]) {
    city.game.army[id] = Math.max(0, city.game.army[id] - n)
    m.units[id] = Math.max(0, (m.units[id] ?? 0) - n)
  }
  if (lb.state.over) finishMission(empire, m, at)
  else lb.nextAt += ROUND_MS
}

/**
 * GERİ ÇEKİL: süren savaştan ordu tur arasında çekilir (Ikariam'daki gibi).
 * Kayıplar kalır; sağ kalanlar ganimetsiz döner.
 */
export function retreatMission(source: Empire, missionId: string, now: number): { empire: Empire; error?: string } {
  const empire = advanceEmpire(source, now)
  const m = (empire.missions ?? []).find(x => x.id === missionId)
  if (!m?.battle) return { empire, error: 'Geri çekilecek bir savaş yok.' }
  m.battle.info.retreat = m.battle.state.round
  retreatBattle(m.battle.state)
  finishMission(empire, m, now)
  return { empire }
}

export const roundLines = (rounds: BattleResult['rounds'], us = 'kaybımız', them = 'düşman kaybı') => rounds.map(r =>
  `Tur ${r.round}: ${us} ${troopList(r.attackerLoss)} · ${them} ${troopList(r.defenderLoss)}${r.wall ? ` · sur ${r.wall}` : ''} · moral ${r.moraleA}/${r.moraleD}.`)

/** Savaşın bir aşaması bitti: sonraki aşamayı aç ya da görevi sonuçlandır. */
function finishMission(empire: Empire, m: Mission, at: number) {
  const lb = m.battle!
  const city = empire.cities.find(c => c.id === m.cityId)!
  const g = city.game
  const res = endBattle(lb.state)
  // Hekimlerin kurtardıkları orduya döner.
  for (const [id, n] of Object.entries(res.healed) as [UnitId, number][]) {
    g.army[id] += n
    m.units[id] = (m.units[id] ?? 0) + n
  }
  m.units = Object.fromEntries((Object.entries(m.units) as [UnitId, number][]).filter(([, n]) => n > 0))
  const done = [...lb.done, lb.info]
  const lines = [...lb.lines]
  delete m.battle
  if (m.kind === 'piracy') return concludePiracy(empire, m, city, res, at, done)
  const npc = targetInfo(empire, m.npcId, at)!
  const finish = (success: boolean, title: string, more: string[]) => {
    missionReport(empire, m, at, success, title, [...lines, ...more], done)
    concludeMission(m, at)
  }
  if (lb.stage === 'naval') {
    lines.push('Deniz savaşı:', ...roundLines(res.rounds, 'batan gemimiz', 'batan düşman'),
      `Donanma kaybı: ${troopList(res.attackerLost)} · düşman kaybı: ${troopList(res.defenderLost)}.`, res.reason)
    if (m.kind === 'blockade') {
      if (res.winner !== 'attacker') return finish(false, `${npc.name} donanması ablukayı kırdı.`, ['Filo geri çekiliyor.'])
      return concludeBlockade(empire, m, city, at, lines, done)
    }
    if (res.winner !== 'attacker') return finish(false, `${npc.name} donanması filomuzu geri püskürttü.`, ['Ordu karaya çıkamadan döndü.'])
    lines.push('Kıyı temizlendi; ordu karaya çıktı.', 'Kara savaşı:')
    return openLand(m, g, npc, at + ROUND_MS, lines, done)
  }
  lines.push(...roundLines(res.rounds))
  lines.push(`Toplam kayıp: ${troopList(res.attackerLost)}${Object.keys(res.healed).length ? ` (hekimler ${troopList(res.healed)} kurtardı)` : ''}.`,
    `Düşman kaybı: ${troopList(res.defenderLost)}.`, res.reason)
  if (res.winner !== 'attacker') return finish(false, `${npc.name} önünde bozguna uğradık.`, [lb.info.retreat !== undefined ? 'Ordu ganimetsiz döndü.' : 'Garnizon direndi; ordu geri çekildi.'])
  // Kara askeri kişi başı 30 taşır; deniz aşırıda ganimeti nakliye ambarları taşır.
  const carry = Math.max(
    (Object.entries(only(m.units, RAID_UNITS)) as [UnitId, number][]).reduce((sum, [id, n]) => sum + UNITS[id].pop * n * 30, 0),
    (m.units.nakliye ?? 0) * UNITS.nakliye.cargo)
  const raw = npc.loot
  const bonus = 1 + g.buildings.korsan_kalesi * BUILDING_EFFECTS.korsanLoot
  const pool = { gold: Math.floor(raw.gold * bonus), wood: Math.floor(raw.wood * bonus), stone: Math.floor(raw.stone * bonus) }
  const total = pool.gold + pool.wood + pool.stone
  const take = total > 0 ? Math.min(1, carry / total) : 0
  m.loot = { gold: Math.floor(pool.gold * take), wood: Math.floor(pool.wood * take), stone: Math.floor(pool.stone * take) }
  const more = [`Ganimet (taşıma ${carry}): ${m.loot.gold} akçe, ${m.loot.wood} kereste, ${m.loot.stone} taş.`]
  if (npc.rival) {
    onRivalRaided(empire, m.npcId, city, at)
    if (m.kind === 'occupy') {
      more.push('Şehir işgal edildi: ordu orada kalır, her saat haraç toplar ve hükümdar sana saldıramaz. Seferler panelinden geri çağır.')
    } else more.push(`${rivalById(m.npcId)!.ruler} intikam yemini etti.`)
  } else {
    const next = Math.min(MAX_NPC_LEVEL, npc.level + 1)
    empire.npcs = { ...(empire.npcs ?? {}), [m.npcId]: { level: next, raidedAt: at } }
    more.push(`${npc.name} toparlanıp güçlenecek (seviye ${next}).`)
  }
  bump(empire, 'raids')
  finish(true, m.kind === 'occupy' ? `${npc.name} işgal edildi!` : `${npc.name} düştü! Ordu ganimetle dönüyor.`, more)
  if (m.kind === 'occupy') m.stationed = true
}

/**
 * BİRLİK AKTARMA: kendi şehirlerin arasında asker ve gemi taşı. Kara birlikleri
 * nakliyeyle geçer. Varışta hedefte yeterli boş halk yoksa sığmayanlar geri döner.
 */
export function dispatchDeploy(source: Empire, toCityId: string, units: Partial<Record<UnitId, number>>, now: number): { empire: Empire; error?: string } {
  const empire = advanceEmpire(source, now)
  const from = activeCity(empire)
  const to = empire.cities.find(c => c.id === toCityId)
  if (!to || to.id === from.id) return { empire, error: 'Geçerli bir hedef şehir seç.' }
  if (actionsInUse(empire, from.id) >= actionPoints(from.game)) return { empire, error: `Sefer hakkın doldu (${actionPoints(from.game)}).` }
  if (underSiege(empire, from.id)) return { empire, error: 'Şehrin önünde savaş sürüyor: birlikler surlardan ayrılamaz.' }
  const blocked = siegeBlock(empire, from.id, true)
  if (blocked) return { empire, error: blocked }
  const free = availableUnits(empire, from.id)
  const clean: Partial<Record<UnitId, number>> = {}
  for (const [id, n] of Object.entries(units) as [UnitId, number][]) {
    if (!UNIT_IDS.includes(id) || id === 'nakliye' || !Number.isInteger(n) || n < 0) return { empire, error: 'Geçersiz birlik seçimi.' }
    if (n > free[id]) return { empire, error: `Bu kadar boşta ${UNITS[id].name} yok.` }
    if (n > 0) clean[id] = n
  }
  if (!hasTroops(clean)) return { empire, error: 'En az bir birlik seç.' }
  const overseas = from.islandId !== to.islandId
  if (overseas) {
    if (from.game.buildings.liman < 1) return { empire, error: 'Başka adaya aktarma için Ticaret Limanı gerekli.' }
    const ships = transportsNeeded(clean)
    if (ships > free.nakliye) return { empire, error: `${ships} nakliye gemisi gerekli (boşta ${free.nakliye}).` }
    if (ships) clean.nakliye = ships
  }
  const need = (Object.entries(clean) as [UnitId, number][]).filter(([id]) => id !== 'nakliye').reduce((s, [id, n]) => s + UNITS[id].pop * n, 0)
  if (idleWorkers(to.game) < need) return { empire, error: `${to.name} bu birlikleri barındıramaz: ${need} boş vatandaş yeri gerekli (şu an ${idleWorkers(to.game)}).` }
  for (const branch of ['kara', 'deniz'] as const) {
    const add = (Object.entries(clean) as [UnitId, number][]).filter(([id]) => UNITS[id].branch === branch && inGarrison(id)).reduce((s, [id, n]) => s + UNITS[id].pop * n, 0)
    const room = garrisonLimit(to.game, branch) - garrisonUsed(to.game, branch)
    if (add > room) return { empire, error: `${to.name} garnizonu dolu: ${branch === 'kara' ? 'kara' : 'deniz'} birlikleri için ${Math.max(0, room)} yer var, ${add} gerekli.` }
  }
  const travel = 60_000 + seaTravelMs(from.islandId, to.islandId, from.game)
  empire.missions = [...(empire.missions ?? []), {
    id: `deploy-${from.id}-${to.id}-${now}`, kind: 'deploy', cityId: from.id, npcId: to.id, units: clean,
    departAt: now, arriveAt: now + travel, returnAt: now + 2 * travel, resolved: false, loot: { gold: 0, wood: 0, stone: 0 },
  }]
  logEvent(from.game, `Birlikler ${to.name} şehrine yola çıktı.`, now)
  return { empire }
}
function resolveDeploy(empire: Empire, from: CityRecord, m: Mission) {
  const to = empire.cities.find(c => c.id === m.npcId)
  if (!to) return
  let room = idleWorkers(to.game)
  // Garnizon sınırı: hedefte yer yoksa sığmayanlar geri döner.
  const garrisonRoom = { kara: garrisonLimit(to.game, 'kara') - garrisonUsed(to.game, 'kara'), deniz: garrisonLimit(to.game, 'deniz') - garrisonUsed(to.game, 'deniz') }
  const moved: Troops = {}, back: Troops = {}
  for (const [id, n] of Object.entries(m.units) as [UnitId, number][]) {
    if (id === 'nakliye') { back[id] = n; continue }
    const cap = inGarrison(id) ? Math.max(0, garrisonRoom[UNITS[id].branch]) : Infinity
    const fit = Math.min(n, Math.floor(room / UNITS[id].pop), Math.floor(cap / UNITS[id].pop))
    room -= fit * UNITS[id].pop
    if (inGarrison(id)) garrisonRoom[UNITS[id].branch] -= fit * UNITS[id].pop
    if (fit > 0) moved[id] = fit
    if (n - fit > 0) back[id] = n - fit
  }
  for (const [id, n] of Object.entries(moved) as [UnitId, number][]) {
    from.game.army[id] = Math.max(0, from.game.army[id] - n)
    to.game.army[id] += n
  }
  m.units = back
  logEvent(to.game, `${troopList(moved)} ${from.name} şehrinden geldi.`, m.arriveAt)
  logEvent(from.game, hasTroops(only(back, UNIT_IDS.filter(id => id !== 'nakliye')))
    ? `${to.name} yer bulamadı: ${troopList(back)} geri dönüyor.` : `Birlikler ${to.name} şehrine ulaştı.`, m.arriveAt)
}

/** Korsan Kalesi seferinin varışı: eskortla deniz savaşı başlar. */
function openPiracy(city: CityRecord, m: Mission) {
  const target = piracyTarget(m.npcId)
  if (!target) { m.resolved = true; return }
  m.battle = openBattle('naval', 'Deniz baskını', 'Korsan filomuz', target.name, { troops: { ...m.units }, ...multipliers(city.game, m.units, 'deniz') },
    { troops: { ...target.escort }, ...ESCORT_MUL, fieldLevel: target.level * 2, naval: true }, m.arriveAt)
}
function concludePiracy(empire: Empire, m: Mission, city: CityRecord, result: BattleResult, at: number, done: StoredBattle[]) {
  const g = city.game
  const target = piracyTarget(m.npcId)!
  m.units = only(m.units, WARSHIPS)
  const lines = [...roundLines(result.rounds, 'batan gemimiz', 'batan eskort'),
    `Kayıp: ${troopList(result.attackerLost)} · eskort kaybı: ${troopList(result.defenderLost)}.`, result.reason]
  let success = false
  if (result.winner === 'attacker') {
    success = true
    const gold = Math.round(target.gold * (1 + g.buildings.korsan_kalesi * BUILDING_EFFECTS.korsanLoot + (g.research.includes('korsanlik') ? 0.2 : 0)))
    m.loot = { gold, wood: 0, stone: 0 }
    g.piracy = (g.piracy ?? 0) + target.points
    bump(empire, 'piracy')
    lines.push(`Ganimet: ${gold} akçe (Korsan Kalesi +%${Math.round(g.buildings.korsan_kalesi * BUILDING_EFFECTS.korsanLoot * 100)}).`,
      `Korsan şöhreti +${target.points} (toplam ${g.piracy}).`)
  } else lines.push('Eskort direndi; filo ganimetsiz dönüyor.')
  missionReport(empire, m, at, success, success ? `${target.name} ele geçirildi!` : `${target.name} kaçtı.`, lines, done)
  concludeMission(m, at)
}

/** Dönüş: hayatta kalanlar zaten ordudadır; ganimet ambara iner. */
export function resolveReturn(empire: Empire, m: Mission) {
  const city = empire.cities.find(c => c.id === m.cityId)
  if (!city) return
  const g = city.game
  const cap = capacity(g)
  for (const r of ['gold', 'wood', 'stone'] as const) g.resources[r] = Math.min(cap, g.resources[r] + m.loot[r])
  // Savaşa katılıp birliklerini ana orduya devreden takviyenin dönecek kimsesi yoktur.
  if (!hasTroops(m.units) && m.kind !== 'spy') return
  if (m.kind !== 'spy' || (m.units.casus ?? 0) > 0) logEvent(g, m.kind === 'raid' || m.kind === 'occupy' ? 'Ordu şehre döndü.' : m.kind === 'support' ? 'Destek birlikleri şehre döndü.' : m.kind === 'blockade' ? 'Filo limana döndü.' : m.kind === 'piracy' ? 'Filo limana döndü.' : m.kind === 'deploy' ? 'Aktarılamayan birlikler döndü.' : 'Casuslar şehre döndü.', m.returnAt)
}

/**
 * advanceEmpire içinden: zamanı gelen olayları (varış, savaş turu, dönüş)
 * zaman sırasıyla işler; böylece takviye doğru tura katılır.
 */
export function advanceMissions(empire: Empire, now: number) {
  const gone = new Set<Mission>()
  const due = (m: Mission) => gone.has(m) ? Infinity : m.battle ? m.battle.nextAt : !m.resolved ? m.arriveAt
    : m.stationed ? m.spyTask?.at ?? m.supportAt ?? Infinity : m.returnAt
  for (let guard = 0; guard < 20_000; guard++) {
    let next: Mission | undefined, at = Infinity
    for (const m of empire.missions ?? []) { const d = due(m); if (d <= now && d < at) { at = d; next = m } }
    if (!next) break
    if (next.battle) stepMission(empire, next)
    else if (!next.resolved) resolveArrival(empire, next)
    else if (next.stationed && next.spyTask) resolveSpyTask(empire, next)
    else if (next.stationed && next.supportAt !== undefined) resolveSupportWatch(empire, next)
    else { resolveReturn(empire, next); gone.add(next) }
  }
  empire.missions = (empire.missions ?? []).filter(m => !gone.has(m))
}

/** Kayıttan gelen görev/rapor/NPC alanlarını doğrular (bozuksa atar). */
export function parseMissionState(obj: Record<string, unknown>, cityIds: Set<string>) {
  const finite = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0
  const missions = Array.isArray(obj.missions) ? (obj.missions as Mission[]) : []
  const threats = Array.isArray(obj.threats) ? (obj.threats as Threat[]) : []
  const nextThreat = obj.nextThreat && typeof obj.nextThreat === 'object' ? (obj.nextThreat as Record<string, number>) : {}
  const troopsOk = (t: unknown) => !!t && typeof t === 'object' &&
    (Object.entries(t as object) as [string, number][]).every(([id, n]) => UNIT_IDS.includes(id as UnitId) && Number.isInteger(n) && n >= 0 && n < 1e6)
  // Süren savaş: ordular, sur, moral ve sıradaki tur zamanı.
  const liveOk = (b: unknown) => {
    if (b === undefined) return true
    const lb = b as LiveBattle
    return !!lb && (lb.stage === 'naval' || lb.stage === 'land') && finite(lb.nextAt) && !!lb.state && !!lb.info &&
      troopsOk(lb.state.a?.troops) && troopsOk(lb.state.d?.troops) && finite(lb.state.wall) && Number.isInteger(lb.state.round) &&
      lb.state.round >= 0 && lb.state.round <= MAX_ROUNDS && Array.isArray(lb.state.rounds) && Array.isArray(lb.lines) && Array.isArray(lb.done)
  }
  // 12 şehrin korsanları + 14 hükümdarın intikamı + savaş ilanı aynı anda gelebilir.
  if (threats.length > MAX_THREATS) throw new Error('Baskın kayıtları okunamadı.')
  for (const t of threats) {
    if (!t || typeof t.id !== 'string' || !cityIds.has(t.cityId) || !targetIsland(t.npcId) || !Number.isInteger(t.level) || t.level < 1 ||
        t.level > 100 || !finite(t.arriveAt) || !troopsOk(t.troops) || !troopsOk(t.fleet) || !liveOk(t.battle) ||
        (t.spare !== undefined && !troopsOk(t.spare)) || (t.ownLost !== undefined && !troopsOk(t.ownLost)) ||
        (t.intent !== undefined && !['raid', 'occupy', 'blockade'].includes(t.intent))) throw new Error('Baskın kayıtları okunamadı.')
  }
  for (const [id, at] of Object.entries(nextThreat)) if (!cityIds.has(id) || !finite(at)) throw new Error('Baskın kayıtları okunamadı.')
  const reports = Array.isArray(obj.reports) ? (obj.reports as Report[]) : []
  const npcs = obj.npcs && typeof obj.npcs === 'object' ? (obj.npcs as Record<string, NpcState>) : {}
  if (missions.length > MAX_MISSIONS || reports.length > MAX_REPORTS + 10) throw new Error('Sefer kayıtları okunamadı.')
  for (const m of missions) {
    if (!m || typeof m.id !== 'string' || !['raid', 'spy', 'piracy', 'deploy', 'occupy', 'blockade', 'support'].includes(m.kind) || !cityIds.has(m.cityId) ||
        !(m.kind === 'piracy' ? piracyTarget(m.npcId) : m.kind === 'deploy' ? cityIds.has(m.npcId) : targetIsland(m.npcId)) ||
        (m.stationed !== undefined && typeof m.stationed !== 'boolean') ||
        !finite(m.departAt) || !finite(m.arriveAt) || !finite(m.returnAt) || typeof m.resolved !== 'boolean' ||
        !m.units || typeof m.units !== 'object' ||
        !(Object.entries(m.units) as [string, number][]).every(([id, n]) => UNIT_IDS.includes(id as UnitId) && Number.isInteger(n) && n >= 0) ||
        !m.loot || !finite(m.loot.gold) || !finite(m.loot.wood) || !finite(m.loot.stone) || !liveOk(m.battle) ||
        (m.supportAt !== undefined && !finite(m.supportAt)) ||
        (m.spyTask !== undefined && (!m.spyTask || !SPY_TYPE_IDS.includes(m.spyTask.type) || !finite(m.spyTask.at)))) throw new Error('Sefer kayıtları okunamadı.')
  }
  for (const r of reports) {
    if (!r || typeof r.id !== 'string' || typeof r.title !== 'string' || !Array.isArray(r.lines) || !finite(r.time) ||
        (r.kept !== undefined && r.kept !== true)) throw new Error('Rapor kayıtları okunamadı.')
  }
  for (const [id, s] of Object.entries(npcs)) {
    if (!npcById(id) || !s || !Number.isInteger(s.level) || s.level < 1 || s.level > MAX_NPC_LEVEL || !finite(s.raidedAt)) throw new Error('Ada kayıtları okunamadı.')
  }
  const sieges = Array.isArray(obj.sieges) ? (obj.sieges as Siege[]) : []
  if (sieges.length > 48) throw new Error('Kuşatma kayıtları okunamadı.')
  for (const s of sieges) {
    if (!s || typeof s.id !== 'string' || !rivalById(s.rivalId) || !cityIds.has(s.cityId) || (s.kind !== 'occupy' && s.kind !== 'blockade') ||
        !Number.isInteger(s.level) || s.level < 1 || s.level > 100 || !finite(s.since) || !finite(s.tick) || !troopsOk(s.troops)) throw new Error('Kuşatma kayıtları okunamadı.')
  }
  return {
    missions: missions.map(m => ({ ...m })), reports: reports.map(r => ({ ...r })), npcs: { ...npcs },
    threats: threats.map(t => ({ ...t })), nextThreat: { ...nextThreat },
    ...(sieges.length ? { sieges: sieges.map(s => ({ ...s, troops: { ...s.troops } })) } : {}),
  }
}

/* ------------------------------------------------------------ KORSAN BASKINLARI */
