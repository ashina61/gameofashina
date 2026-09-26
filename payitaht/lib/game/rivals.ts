/**
 * YAPAY RAKİP HÜKÜMDARLAR — Ikariam'ın çok oyunculu dünyasının tek oyunculu karşılığı.
 *
 * Bunlar GERÇEK OYUNCU DEĞİLDİR; arayüzde her yerde "yapay rakip" diye anılır.
 * Her birinin adası, şehri, huyu (tüccar, savaşçı, âlim, denizci) ve bir
 * ittifakı (Doğu / Batı Birliği) vardır. Güçleri dünya yaşıyla büyür.
 *
 * Oyuncu onlarla Ikariam'daki gibi her şeyi yapar: casus gönderir, yağmalar,
 * şehrini işgal eder, limanını abluka altına alır, sıralamada yarışır, pazarda
 * alışveriş eder, kültür / ticaret / barış anlaşması yapar, ittifaka katılır ve
 * mesajlaşır. Hepsi deterministiktir: aynı kayıt aynı dünyayı üretir.
 */
import {
  BUILDING_IDS, LUXURY_IDS, UNITS, UNIT_IDS, capacity, cargoCapacity, logEvent, travelFactor,
  type Army, type Game, type Good, type UnitId,
} from './engine'
import { troopList, type Troops } from './battle'
import { activeCity, advanceEmpire, type CityRecord, type Empire } from './empire'
import { ISLANDS, type IslandId } from './islands'

export type RivalStyle = 'tuccar' | 'savasci' | 'alim' | 'denizci'
export type FactionId = 'dogu' | 'bati'
export type Rival = { id: string; city: string; ruler: string; islandId: IslandId; style: RivalStyle; faction: FactionId; base: number }
export const STYLE_NAMES: Record<RivalStyle, string> = { tuccar: 'Tüccar', savasci: 'Savaşçı', alim: 'Âlim', denizci: 'Denizci' }
export const FACTIONS: Record<FactionId, { name: string; motto: string }> = {
  dogu: { name: 'Doğu Birliği', motto: 'Kervan yolları açık kalsın.' },
  bati: { name: 'Batı Birliği', motto: 'Deniz kimsenin tekelinde değildir.' },
}
export const RIVALS: Rival[] = [
  { id: 'r-kemer', city: 'Kemerkale', ruler: 'Kara Murad Bey', islandId: 'sahil', style: 'savasci', faction: 'bati', base: 2 },
  { id: 'r-lale', city: 'Lalezar', ruler: 'Nilüfer Hatun', islandId: 'zeytin', style: 'tuccar', faction: 'dogu', base: 3 },
  { id: 'r-ilim', city: 'Beytülhikme', ruler: 'Molla Sadreddin', islandId: 'akcam', style: 'alim', faction: 'dogu', base: 3 },
  { id: 'r-ates', city: 'Ateşkapı', ruler: 'Demirci Oruç Reis', islandId: 'kizil', style: 'savasci', faction: 'bati', base: 5 },
  { id: 'r-mavi', city: 'Mavisu', ruler: 'Kaptan Hızır', islandId: 'akdeniz', style: 'denizci', faction: 'bati', base: 4 },
  { id: 'r-kule', city: 'Kulebaşı', ruler: 'Sultan Hatun', islandId: 'yalcin', style: 'alim', faction: 'dogu', base: 6 },
  { id: 'r-bag', city: 'Bağbaşı', ruler: 'Hacı Bekir Ağa', islandId: 'baglik', style: 'tuccar', faction: 'dogu', base: 4 },
  { id: 'r-kor', city: 'Korsuyu', ruler: 'Turgut Reis', islandId: 'atessiz', style: 'denizci', faction: 'bati', base: 7 },
  { id: 'r-cinar', city: 'Çınaraltı', ruler: 'Gülbahar Sultan', islandId: 'zeytin', style: 'alim', faction: 'bati', base: 5 },
  { id: 'r-sarp', city: 'Sarphisar', ruler: 'Deli Ali Paşa', islandId: 'kizil', style: 'savasci', faction: 'dogu', base: 8 },
  // Uzak adaların hükümdarları (0.18.0).
  { id: 'r-mercan', city: 'Mercanköy', ruler: 'Piyale Reis', islandId: 'mercan', style: 'denizci', faction: 'dogu', base: 6 },
  { id: 'r-sakiz', city: 'Sakızlı', ruler: 'Mihrimah Hatun', islandId: 'sakiz', style: 'tuccar', faction: 'bati', base: 7 },
  { id: 'r-kartal', city: 'Kartalkaya', ruler: 'Koca Yusuf Ağa', islandId: 'kartal', style: 'savasci', faction: 'dogu', base: 9 },
  { id: 'r-fener', city: 'Fenerbahçe', ruler: 'Ali Kuşçu Efendi', islandId: 'fener', style: 'alim', faction: 'bati', base: 8 },
]
export const rivalById = (id: string) => RIVALS.find(r => r.id === id)

export type TreatyId = 'kultur' | 'ticaret' | 'baris'
export const TREATIES: Record<TreatyId, { name: string; description: string; need: number }> = {
  kultur: { name: 'Kültür anlaşması', description: 'Müzede onların eserleri sergilenir: her anlaşma, Müze seviyesi kadar şehirde +50 huzur.', need: 0 },
  ticaret: { name: 'Ticaret anlaşması', description: 'Pazarda onlardan %10 ucuz alır, onlara %10 pahalı satarsın; bir teklif daha açarlar.', need: 10 },
  baris: { name: 'Barış anlaşması', description: 'Birbirinize saldırmazsınız; intikam baskını gelmez.', need: 25 },
}
export type RivalState = { relation: number; lootedAt: number; treaties: TreatyId[]; giftAt: number; greetDay: string }
export type Message = { id: string; time: number; from: string; rivalId?: string; subject: string; body: string; read: boolean }
export type Offer = { id: string; cityId: string; good: Good; amount: number; left: number; price: number; since: number; tick: number }
export type Delivery = { id: string; cityId: string; good: Good; amount: number; eta: number; from: string }
export type World = {
  start: number; slot: number; alliance: FactionId | null; allianceAt: number
  rivals: Record<string, RivalState>; messages: Message[]; offers: Offer[]; deliveries: Delivery[]; traded: string[]
}

const HOUR = 3600_000
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n))
function roll(seed: string) {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
  h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15
  return (h >>> 0) / 4294967296
}

/* ------------------------------------------------------------------ DÜNYA */

export function initialWorld(now: number): World {
  return { start: now, slot: Math.floor(now / HOUR), alliance: null, allianceAt: 0, rivals: {}, messages: [], offers: [], deliveries: [], traded: [] }
}
export function world(empire: Empire): World {
  if (!empire.world) empire.world = initialWorld(empire.cities[0].game.updatedAt)
  return empire.world
}
export function rivalState(empire: Empire, id: string): RivalState {
  const w = world(empire)
  if (!w.rivals[id]) w.rivals[id] = { relation: 0, lootedAt: 0, treaties: [], giftAt: 0, greetDay: '' }
  return w.rivals[id]
}
const peek = (empire: Empire, id: string): RivalState =>
  empire.world?.rivals[id] ?? { relation: 0, lootedAt: 0, treaties: [], giftAt: 0, greetDay: '' }
export function mail(empire: Empire, time: number, from: string, subject: string, body: string, rivalId?: string) {
  const w = world(empire)
  const msg: Message = { id: `m-${time}-${w.messages.length}-${rivalId ?? 'x'}`, time, from, subject, body, read: false }
  if (rivalId) msg.rivalId = rivalId
  w.messages = [msg, ...w.messages].slice(0, 40)
}
function relate(empire: Empire, id: string, delta: number) {
  const s = rivalState(empire, id)
  s.relation = clamp(Math.round(s.relation + delta), -100, 100)
}

/* --------------------------------------------------------------- GÜÇ VE HAZİNE */

export function rivalLevel(empire: Empire, r: Rival, now: number) {
  const start = empire.world?.start ?? now
  return clamp(r.base + Math.floor(Math.max(0, now - start) / (5 * HOUR)), 1, 40)
}
export function rivalGarrison(level: number, style: RivalStyle): Army {
  const k = style === 'savasci' ? 1.4 : style === 'tuccar' ? 0.8 : 1
  const a = Object.fromEntries(UNIT_IDS.map(id => [id, 0])) as Army
  a.mizrakci = Math.round(3 * level * k); a.yeniceri = Math.round(2 * level * k); a.okcu = Math.round(2 * level * k)
  a.sapanci = Math.round(level * k); a.azap = Math.round(level * k); a.sipahi = Math.floor(level / 2 * k)
  a.topcu = Math.floor(level / 4); a.hekim = Math.floor(level / 5); a.deli = Math.max(0, Math.floor((level - 8) / 2))
  // Güçlenen hükümdarlar hava birlikleri de besler.
  a.hezarfen = Math.max(0, Math.floor((level - 10) / 2)); a.lagari = Math.max(0, Math.floor((level - 14) / 3))
  return a
}
export function rivalFleet(level: number, style: RivalStyle): Troops {
  const k = style === 'denizci' ? 2 : 1
  return { kadirga: Math.floor(level / 2 * k), ates_gemisi: Math.floor(level / 4 * k), kalyon: Math.floor(level / 8 * k),
    karamursel: Math.floor(level / 8 * k), balon_gemisi: Math.floor(level / 14 * k) }
}
export const rivalWallHp = (level: number) => level * 350
export function rivalTreasury(level: number, style: RivalStyle) {
  const k = style === 'tuccar' ? 1.5 : 1
  return { gold: Math.round(900 * level * k), wood: Math.round(800 * level * k), stone: Math.round(500 * level * k) }
}
/** Yağmalanabilir hazine: %20'si korunur, yağmadan sonra 2 saatte dolar. */
export function rivalLoot(empire: Empire, r: Rival, now: number) {
  const t = rivalTreasury(rivalLevel(empire, r, now), r.style)
  const fill = clamp((now - peek(empire, r.id).lootedAt) / (2 * HOUR), 0, 1)
  return { gold: Math.floor(t.gold * 0.8 * fill), wood: Math.floor(t.wood * 0.8 * fill), stone: Math.floor(t.stone * 0.8 * fill) }
}

/* --------------------------------------------------------------- SIRALAMA */

export type Score = {
  name: string; ruler: string; rivalId?: string; you?: boolean
  total: number; military: number; science: number; gold: number; buildings: number
  /** Ikariam'ın ek sıralama kolları: inşaatçı, saldırı, savunma, ticaret. */
  builder: number; offense: number; defense: number; trade: number
}
export type RankKey = 'total' | 'builder' | 'military' | 'offense' | 'defense' | 'science' | 'gold' | 'trade'
const sidePower = (t: Troops, key: 'attack' | 'defense') => (Object.entries(t) as [UnitId, number][]).reduce((s, [id, n]) => s + UNITS[id][key] * (n ?? 0), 0)
const troopPower = (t: Troops) => (Object.entries(t) as [UnitId, number][]).reduce((s, [id, n]) => s + (UNITS[id].attack + UNITS[id].defense) * n, 0)
export function rivalScore(empire: Empire, r: Rival, now: number): Score {
  const L = rivalLevel(empire, r, now)
  const buildings = L * 16
  const science = Math.round(Math.min(90, L * (r.style === 'alim' ? 3 : 2.2)) * 100)
  const military = Math.round(troopPower(rivalGarrison(L, r.style)) + troopPower(rivalFleet(L, r.style)))
  const gold = rivalTreasury(L, r.style).gold
  const troops = { ...rivalGarrison(L, r.style), ...Object.fromEntries(Object.entries(rivalFleet(L, r.style)).map(([k, v]) => [k, (rivalGarrison(L, r.style)[k as UnitId] ?? 0) + (v ?? 0)])) } as Troops
  const offense = Math.round(sidePower(troops, 'attack'))
  const defense = Math.round(sidePower(troops, 'defense') + rivalWallHp(L) / 3)
  const trade = Math.round(L * (r.style === 'tuccar' ? 260 : r.style === 'denizci' ? 180 : 110))
  return { name: r.city, ruler: r.ruler, rivalId: r.id, total: buildings * 100 + science + military + Math.round(gold / 10), military, science, gold, buildings,
    builder: buildings * 100, offense, defense, trade }
}
export function playerScore(empire: Empire): Score {
  let buildings = 0, military = 0, gold = 0, research = 0, offense = 0, defense = 0, ports = 0
  for (const c of empire.cities) {
    buildings += BUILDING_IDS.reduce((s, id) => s + c.game.buildings[id], 0)
    military += troopPower(c.game.army)
    gold += c.game.resources.gold
    research = Math.max(research, c.game.research.length)
    offense += sidePower(c.game.army, 'attack')
    defense += sidePower(c.game.army, 'defense') + c.game.buildings.surlar * 150
    ports += c.game.buildings.liman + c.game.buildings.ticaret_merkezi
  }
  const science = research * 100
  const trade = (empire.stats?.shipments ?? 0) * 120 + ports * 60 + (empire.world?.offers ?? []).reduce((s, o) => s + (o.amount - o.left), 0)
  return { name: activeCity(empire).name, ruler: empire.profile?.ruler ?? 'Sen', you: true, total: buildings * 100 + science + military + Math.round(gold / 10), military, science, gold, buildings,
    builder: buildings * 100, offense: Math.round(offense), defense: Math.round(defense), trade: Math.round(trade) }
}
export function rankings(empire: Empire, now: number, key: RankKey = 'total') {
  return [playerScore(empire), ...RIVALS.map(r => rivalScore(empire, r, now))].sort((a, b) => b[key] - a[key])
}

/* --------------------------------------------------------------- DİPLOMASİ */

export function embassyLevel(empire: Empire) { return Math.max(...empire.cities.map(c => c.game.buildings.elcilik)) }
export function treatyCost(empire: Empire, r: Rival, now: number) { return 150 * rivalLevel(empire, r, now) }
function accepts(empire: Empire, r: Rival, kind: TreatyId) {
  const s = peek(empire, r.id)
  const liking = (r.style === 'tuccar' && kind === 'ticaret' ? 10 : 0) + (r.style === 'alim' && kind === 'kultur' ? 10 : 0) -
    (r.style === 'savasci' && kind === 'baris' ? 15 : 0) + (empire.world?.alliance === r.faction ? 15 : 0)
  return s.relation + liking >= TREATIES[kind].need
}
export function culturalTreaties(empire: Empire) {
  return Object.values(empire.world?.rivals ?? {}).filter(s => s.treaties.includes('kultur')).length
}
export function proposeTreaty(source: Empire, rivalId: string, kind: TreatyId, now: number): { empire: Empire; error?: string } {
  const empire = advanceEmpire(source, now)
  const r = rivalById(rivalId)
  if (!r || !TREATIES[kind]) return { empire, error: 'Bilinmeyen anlaşma.' }
  const s = rivalState(empire, rivalId)
  if (s.treaties.includes(kind)) return { empire, error: 'Bu anlaşma zaten yürürlükte.' }
  if (embassyLevel(empire) < 1) return { empire, error: 'Anlaşma için Elçilik gerekli.' }
  const g = activeCity(empire).game
  if (kind === 'kultur') {
    if (!empire.cities.some(c => c.game.research.includes('kultur'))) return { empire, error: 'Kültür Alışverişi araştırması gerekli.' }
    const museums = empire.cities.reduce((sum, c) => sum + c.game.buildings.muze, 0)
    if (culturalTreaties(empire) >= museums) return { empire, error: `Müzelerin en fazla ${museums} kültür anlaşması sergiler. Müzeyi yükselt.` }
  }
  const price = treatyCost(empire, r, now)
  if (g.resources.gold < price) return { empire, error: `Elçilik masrafı ${price} akçe.` }
  g.resources.gold -= price
  if (!accepts(empire, r, kind)) {
    relate(empire, rivalId, -2)
    mail(empire, now, r.ruler, `${TREATIES[kind].name}: ret`, `Elçiniz ağırlandı ama teklifiniz kabul görmedi. Önce aramızdaki güveni artırın (ilişki ${s.relation}, gereken ${TREATIES[kind].need}).`, rivalId)
    return { empire, error: `${r.ruler} teklifi reddetti. Hediye gönder ya da selam yolla; ilişki yükselince tekrar dene.` }
  }
  s.treaties = [...s.treaties, kind]
  relate(empire, rivalId, 5)
  mail(empire, now, r.ruler, `${TREATIES[kind].name}: kabul`, `${TREATIES[kind].description} Hayırlı olsun.`, rivalId)
  logEvent(g, `${r.ruler} ile ${TREATIES[kind].name.toLocaleLowerCase('tr')} imzalandı.`, now)
  return { empire }
}
export function cancelTreaty(source: Empire, rivalId: string, kind: TreatyId, now: number): { empire: Empire; error?: string } {
  const empire = advanceEmpire(source, now)
  const r = rivalById(rivalId)
  const s = rivalState(empire, rivalId)
  if (!r || !s.treaties.includes(kind)) return { empire, error: 'Böyle bir anlaşma yok.' }
  s.treaties = s.treaties.filter(t => t !== kind)
  relate(empire, rivalId, -10)
  mail(empire, now, r.ruler, `${TREATIES[kind].name} bozuldu`, 'Sözünüzden döndünüz. Bunu unutmayacağız.', rivalId)
  return { empire }
}
export function sendGift(source: Empire, rivalId: string, gold: number, now: number): { empire: Empire; error?: string } {
  const empire = advanceEmpire(source, now)
  const r = rivalById(rivalId)
  const amount = Math.floor(gold)
  if (!r || !Number.isSafeInteger(amount) || amount <= 0) return { empire, error: 'Geçersiz hediye.' }
  const s = rivalState(empire, rivalId)
  if (now < s.giftAt + HOUR) return { empire, error: 'Az önce hediye gönderdin; bir saat bekle.' }
  const g = activeCity(empire).game
  if (g.resources.gold < amount) return { empire, error: 'Bu kadar akçe yok.' }
  g.resources.gold -= amount
  const gain = Math.min(20, Math.floor(amount / (rivalLevel(empire, r, now) * 30)))
  relate(empire, rivalId, gain)
  s.giftAt = now
  mail(empire, now, r.ruler, 'Hediyeniz ulaştı', gain > 0 ? `${amount} akçelik hediyeniz için teşekkürler. (ilişki +${gain})` : 'Nezaketiniz için teşekkürler; ama bu hediye hazinemizde fark edilmedi.', rivalId)
  return { empire }
}

/** Mesaj gönder: selam, tehdit, haraç talebi. */
export type Letter = 'selam' | 'tehdit' | 'harac'
export function writeLetter(source: Empire, rivalId: string, kind: Letter, now: number): { empire: Empire; error?: string } {
  const empire = advanceEmpire(source, now)
  const r = rivalById(rivalId)
  if (!r) return { empire, error: 'Bilinmeyen hükümdar.' }
  const s = rivalState(empire, rivalId)
  const g = activeCity(empire).game
  const mine = playerScore(empire), theirs = rivalScore(empire, r, now)
  const day = new Date(now).toISOString().slice(0, 10)
  if (kind === 'selam') {
    if (s.greetDay === day) return { empire, error: 'Bugün bu hükümdara zaten selam gönderdin.' }
    s.greetDay = day
    relate(empire, rivalId, 3)
    mail(empire, now, r.ruler, 'Selamınıza selam', `${FACTIONS[r.faction].motto} Dostluğunuz makbulümüzdür.`, rivalId)
  } else if (kind === 'tehdit') {
    relate(empire, rivalId, -10)
    if (mine.military > theirs.military * 1.5) {
      const pay = rivalLevel(empire, r, now) * 100
      g.resources.gold = Math.min(capacity(g), g.resources.gold + pay)
      mail(empire, now, r.ruler, 'Kan dökülmesin', `Ordunuzun gücünü biliyoruz. ${pay} akçeyi kabul edin ve bizi rahat bırakın.`, rivalId)
    } else {
      mail(empire, now, r.ruler, 'Tehdidiniz boş', 'Sözlerinizin arkasında duracak kılıç göremiyoruz. Gelin de görün.', rivalId)
      revenge(empire, r, activeCity(empire), now)
    }
  } else {
    if (s.treaties.includes('baris')) return { empire, error: 'Barış anlaşması varken haraç istenmez.' }
    if (mine.military > theirs.military * 2) {
      const pay = rivalLevel(empire, r, now) * 200
      g.resources.gold = Math.min(capacity(g), g.resources.gold + pay)
      relate(empire, rivalId, -20)
      mail(empire, now, r.ruler, 'Haraç gönderildi', `${pay} akçe yola çıktı. Ama bu küskünlük uzun sürecek.`, rivalId)
    } else {
      relate(empire, rivalId, -10)
      mail(empire, now, r.ruler, 'Haraç mı?', 'Haraç isteyen, önce gücünü göstermeli.', rivalId)
    }
  }
  return { empire }
}

/* ----------------------------------------------------------------- İTTİFAK */

export function factionMembers(f: FactionId) { return RIVALS.filter(r => r.faction === f) }
export function factionStanding(empire: Empire, f: FactionId) {
  const m = factionMembers(f)
  return Math.round(m.reduce((s, r) => s + peek(empire, r.id).relation, 0) / m.length)
}
export function joinAlliance(source: Empire, f: FactionId, now: number): { empire: Empire; error?: string } {
  const empire = advanceEmpire(source, now)
  const w = world(empire)
  if (!FACTIONS[f]) return { empire, error: 'Bilinmeyen ittifak.' }
  if (w.alliance) return { empire, error: `Zaten ${FACTIONS[w.alliance].name} üyesisin.` }
  if (embassyLevel(empire) < 3) return { empire, error: 'İttifaka katılmak için Elçilik 3. seviye gerekli.' }
  if (factionStanding(empire, f) < 5) return { empire, error: `${FACTIONS[f].name} seni henüz tanımıyor (ortalama ilişki ${factionStanding(empire, f)}, gereken 5). Üyelerine selam ve hediye gönder.` }
  w.alliance = f; w.allianceAt = now
  for (const r of RIVALS) relate(empire, r.id, r.faction === f ? 10 : -10)
  mail(empire, now, FACTIONS[f].name, 'Aramıza hoş geldin', `${FACTIONS[f].motto} Üyeler sana saldırmaz, baskında yardımına asker gönderir.`)
  return { empire }
}
export function leaveAlliance(source: Empire, now: number): { empire: Empire; error?: string } {
  const empire = advanceEmpire(source, now)
  const w = world(empire)
  if (!w.alliance) return { empire, error: 'Bir ittifakta değilsin.' }
  for (const r of factionMembers(w.alliance)) relate(empire, r.id, -10)
  mail(empire, now, FACTIONS[w.alliance].name, 'Ayrılık', 'Yolun açık olsun. Kapımız bir daha kolay açılmaz.')
  w.alliance = null
  return { empire }
}
/** Baskına uğrayan şehre ittifakın gönderdiği yardım. */
export function allyHelp(empire: Empire, now: number): Troops {
  const f = empire.world?.alliance
  if (!f) return {}
  const avg = Math.round(factionMembers(f).reduce((s, r) => s + rivalLevel(empire, r, now), 0) / factionMembers(f).length)
  return { mizrakci: 2 * avg, yeniceri: avg, okcu: avg }
}
/** Bu hükümdar sana saldırmaz mı (barış, ittifak, işgal ya da abluka)? */
export function pacified(empire: Empire, rivalId: string) {
  const r = rivalById(rivalId)
  if (!r) return false
  return peek(empire, rivalId).treaties.includes('baris') || empire.world?.alliance === r.faction ||
    (empire.missions ?? []).some(m => m.npcId === rivalId && m.stationed && (m.kind === 'occupy' || m.kind === 'blockade'))
}

/* ------------------------------------------------------ SAVAŞ SONUÇLARI */

/** Yağmadan sonra: ilişki düşer, hazine boşalır, intikam baskını planlanır. */
export function onRivalRaided(empire: Empire, rivalId: string, city: CityRecord, at: number) {
  const r = rivalById(rivalId)
  if (!r) return
  const s = rivalState(empire, rivalId)
  s.lootedAt = at
  relate(empire, rivalId, -25)
  for (const other of factionMembers(r.faction)) if (other.id !== rivalId) relate(empire, other.id, -5)
  revenge(empire, r, city, at)
}
function revenge(empire: Empire, r: Rival, city: CityRecord, at: number) {
  if (pacified(empire, r.id)) return
  if ((empire.threats ?? []).some(t => t.npcId === r.id)) return
  const L = rivalLevel(empire, r, at)
  const g = rivalGarrison(L, r.style)
  const troops: Troops = {}
  for (const id of UNIT_IDS) if (g[id] && UNITS[id].role !== 'support') troops[id] = Math.ceil(g[id] * 0.5)
  const overseas = r.islandId !== city.islandId
  const fleet = overseas ? Object.fromEntries(Object.entries(rivalFleet(L, r.style)).map(([id, n]) => [id, Math.ceil((n ?? 0) * 0.5)])) as Troops : {}
  const arriveAt = at + HOUR + Math.round(roll(`${r.id}-${at}`) * HOUR)
  empire.threats = [...(empire.threats ?? []), { id: `revenge-${r.id}-${at}`, cityId: city.id, npcId: r.id, level: L, arriveAt, troops, fleet }]
  mail(empire, at, r.ruler, 'İntikam', `${city.name} bunun hesabını verecek. Ordumuz yola çıkıyor.`, r.id)
}
/** İşgal / abluka saatlik haracı. */
export function stationTribute(empire: Empire, rivalId: string, kind: 'occupy' | 'blockade', now: number) {
  const r = rivalById(rivalId)
  return r ? rivalLevel(empire, r, now) * (kind === 'occupy' ? 90 : 50) : 0
}

/* ------------------------------------------------------------------ PAZAR */

export const FAIR_PRICE: Record<Good, number> = { gold: 1, wood: 2, stone: 3, knowledge: 0, uzum: 5, mermer: 5, kristal: 6, kukurt: 6 }
export const MARKET_GOODS: Good[] = ['wood', 'stone', ...LUXURY_IDS]
export type MarketOffer = { id: string; rivalId: string; side: 'sell' | 'buy'; good: Good; amount: number; price: number }
function blockaded(empire: Empire, rivalId: string) { return (empire.missions ?? []).some(m => m.npcId === rivalId && m.kind === 'blockade' && m.stationed) }
/** Bu saatin pazar teklifleri (rakipler satar ya da alır). */
export function marketOffers(empire: Empire, now: number): MarketOffer[] {
  const slot = Math.floor(now / HOUR)
  const out: MarketOffer[] = []
  for (const r of RIVALS) {
    if (blockaded(empire, r.id)) continue
    const s = peek(empire, r.id)
    const trade = s.treaties.includes('ticaret')
    const n = (r.style === 'tuccar' ? 2 : 1) + (trade ? 1 : 0)
    for (let i = 0; i < n; i++) {
      const key = `${r.id}-${slot}-${i}`
      const good = MARKET_GOODS[Math.floor(roll(`${key}-g`) * MARKET_GOODS.length)]
      const side = roll(`${key}-s`) < 0.55 ? 'sell' : 'buy'
      const L = rivalLevel(empire, r, now)
      const amount = Math.round((100 + roll(`${key}-a`) * 300) * (1 + L / 10) / 10) * 10
      const spread = side === 'sell' ? 1.1 + roll(`${key}-p`) * 0.5 : 0.6 + roll(`${key}-p`) * 0.35
      const price = Math.max(1, Math.round(FAIR_PRICE[good] * spread * (trade ? (side === 'sell' ? 0.9 : 1.1) : 1) * 10) / 10)
      out.push({ id: key, rivalId: r.id, side, good, amount, price })
    }
  }
  return out.filter(o => !(empire.world?.traded ?? []).includes(o.id))
}
const addGood = (g: Game, good: Good, n: number) => {
  if ((LUXURY_IDS as readonly string[]).includes(good)) g.luxury[good as keyof Game['luxury']] += n
  else g.resources[good as keyof Game['resources']] += n
}
const stockOf = (g: Game, good: Good) => (LUXURY_IDS as readonly string[]).includes(good) ? g.luxury[good as keyof Game['luxury']] : g.resources[good as keyof Game['resources']]
export function seaMinutes(a: IslandId, b: IslandId) {
  const A = ISLANDS.find(i => i.id === a)!, B = ISLANDS.find(i => i.id === b)!
  return 2 + Math.hypot(A.x - B.x, A.y - B.y) / 3
}
export function acceptOffer(source: Empire, offerId: string, now: number): { empire: Empire; error?: string } {
  const empire = advanceEmpire(source, now)
  const offer = marketOffers(empire, now).find(o => o.id === offerId)
  if (!offer) return { empire, error: 'Bu teklif artık geçerli değil.' }
  const r = rivalById(offer.rivalId)!
  const city = activeCity(empire)
  const g = city.game
  const total = Math.round(offer.amount * offer.price)
  const eta = now + Math.round(seaMinutes(r.islandId, city.islandId) * 60_000 * travelFactor(g))
  const w = world(empire)
  if (offer.side === 'sell') {
    if (g.resources.gold < total) return { empire, error: `${total} akçe gerekli.` }
    g.resources.gold -= total
    w.deliveries = [...w.deliveries, { id: `d-${offer.id}`, cityId: city.id, good: offer.good, amount: offer.amount, eta, from: r.city }]
    logEvent(g, `${r.city} pazarından ${offer.amount} ${offer.good} alındı; gemileri yolda.`, now)
  } else {
    if (g.buildings.liman < 1) return { empire, error: 'Satış için Ticaret Limanı gerekli.' }
    if (cargoCapacity(g) < offer.amount) return { empire, error: `Nakliye gemilerin ${cargoCapacity(g)} mal taşır; bu satış ${offer.amount} ister.` }
    if (stockOf(g, offer.good) < offer.amount) return { empire, error: 'Bu kadar malın yok.' }
    addGood(g, offer.good, -offer.amount)
    w.deliveries = [...w.deliveries, { id: `d-${offer.id}`, cityId: city.id, good: 'gold', amount: total, eta, from: r.city }]
    logEvent(g, `${offer.amount} ${offer.good} ${r.city} pazarına satıldı; bedeli dönüşte gelir.`, now)
  }
  w.traded = [...w.traded.filter(id => Number(id.split('-').at(-2)) >= Math.floor(now / HOUR) - 1), offer.id]
  relate(empire, r.id, 1)
  return { empire }
}
/** Oyuncunun Ticaret Merkezi'ndeki satış teklifleri; yapay tüccarlar fiyata göre alır. */
export function offerSlots(g: Game) { return g.buildings.ticaret_merkezi }
export function postOffer(source: Empire, good: Good, amount: number, price: number, now: number): { empire: Empire; error?: string } {
  const empire = advanceEmpire(source, now)
  const city = activeCity(empire)
  const g = city.game
  const n = Math.floor(amount), p = Math.round(price * 10) / 10
  if (!MARKET_GOODS.includes(good) || !Number.isSafeInteger(n) || n <= 0 || !(p > 0) || p > 100) return { empire, error: 'Geçersiz teklif.' }
  if (offerSlots(g) < 1) return { empire, error: 'Teklif vermek için Ticaret Merkezi kur.' }
  const w = world(empire)
  if (w.offers.filter(o => o.cityId === city.id).length >= offerSlots(g)) return { empire, error: `Ticaret Merkezi ${offerSlots(g)} teklif taşır.` }
  if (stockOf(g, good) < n) return { empire, error: 'Bu kadar malın yok.' }
  addGood(g, good, -n)
  w.offers = [...w.offers, { id: `o-${city.id}-${now}`, cityId: city.id, good, amount: n, left: n, price: p, since: now, tick: now }]
  return { empire }
}
export function cancelOffer(source: Empire, offerId: string, now: number): { empire: Empire; error?: string } {
  const empire = advanceEmpire(source, now)
  const w = world(empire)
  const o = w.offers.find(x => x.id === offerId)
  const city = o && empire.cities.find(c => c.id === o.cityId)
  if (!o || !city) return { empire, error: 'Teklif bulunamadı.' }
  addGood(city.game, o.good, Math.min(o.left, Math.max(0, capacity(city.game) - stockOf(city.game, o.good))))
  w.offers = w.offers.filter(x => x.id !== offerId)
  return { empire }
}
/** Dakikada satılan miktar: adil fiyatın %60 üstünde hiç satılmaz. */
export function fillRate(empire: Empire, o: Offer) {
  const fair = FAIR_PRICE[o.good]
  const trade = Object.values(empire.world?.rivals ?? {}).filter(s => s.treaties.includes('ticaret')).length
  return Math.max(0, (fair * 1.6 - o.price) / (fair * 1.6)) * 12 * (1 + 0.2 * trade)
}

/* ------------------------------------------------------------ DÜNYA SAATİ */

const MAIL_LINES = [
  ['Kervan haberi', 'Doğu yolunda kervanlar yeniden işliyor. Pazarımıza uğrayın.'],
  ['Korsan uyarısı', 'Korsanlar son günlerde kıyılarımızı yokluyor. Surlarınızı sağlam tutun.'],
  ['Hasat', 'Bu yıl bağlar bereketli. Üzüm fazlamızı satmaya hazırız.'],
  ['Elçi daveti', 'Sarayımızın kapısı dostlara açık. Bir anlaşma konuşalım mı?'],
  ['Sınır gerginliği', 'Adalar arasında huzursuzluk var. Tarafını iyi seç.'],
]
/** advanceEmpire içinden: teslimatlar, pazar satışları, haraç ve saatlik olaylar. */
export function advanceWorld(empire: Empire, now: number) {
  const w = world(empire)
  // Teslimatlar
  w.deliveries = w.deliveries.flatMap(d => {
    if (now < d.eta) return [d]
    const city = empire.cities.find(c => c.id === d.cityId)
    if (!city) return []
    const room = Math.max(0, Math.floor(capacity(city.game) - stockOf(city.game, d.good)))
    const put = Math.min(room, d.amount)
    addGood(city.game, d.good, put)
    return d.amount - put > 0 ? [{ ...d, amount: d.amount - put }] : []
  })
  // Oyuncunun teklifleri
  for (const o of w.offers) {
    const city = empire.cities.find(c => c.id === o.cityId)
    if (!city || now <= o.tick) continue
    const sold = Math.min(o.left, Math.floor(fillRate(empire, o) * (now - o.since) / 60_000) - (o.amount - o.left))
    o.tick = now
    if (sold <= 0) continue
    o.left -= sold
    city.game.resources.gold = Math.min(capacity(city.game), city.game.resources.gold + Math.round(sold * o.price))
  }
  const done = w.offers.filter(o => o.left <= 0)
  for (const o of done) {
    const city = empire.cities.find(c => c.id === o.cityId)
    if (city) logEvent(city.game, `Ticaret Merkezi: ${o.amount} ${o.good} satıldı.`, now)
  }
  w.offers = w.offers.filter(o => o.left > 0)
  // Kültür anlaşmaları şehirlerin müzelerine dağılır.
  const culture = culturalTreaties(empire)
  for (const c of empire.cities) c.game.culture = Math.min(c.game.buildings.muze, culture)
  // Saatlik olaylar (en fazla 12 saat geriye).
  const slot = Math.floor(now / HOUR)
  for (let s = Math.max(w.slot + 1, slot - 11); s <= slot; s++) {
    const at = s * HOUR
    for (const m of empire.missions ?? []) {
      if (!m.stationed || (m.kind !== 'occupy' && m.kind !== 'blockade') || at <= m.arriveAt) continue
      m.loot = { ...m.loot, gold: m.loot.gold + stationTribute(empire, m.npcId, m.kind, at) }
    }
    if (s % 6 === 0) {
      const r = RIVALS[Math.floor(roll(`mail-${s}`) * RIVALS.length)]
      const [subject, body] = MAIL_LINES[Math.floor(roll(`line-${s}`) * MAIL_LINES.length)]
      mail(empire, at, r.ruler, subject, body, r.id)
    }
    if (s % 4 === 0) {
      // Düşman hükümdarların casusları: Gizli Sığınak yakalar.
      const hostile = RIVALS.filter(r => peek(empire, r.id).relation <= -20)
      if (hostile.length) {
        const r = hostile[Math.floor(roll(`spy-${s}`) * hostile.length)]
        const city = empire.cities[Math.floor(roll(`spyc-${s}`) * empire.cities.length)]
        const caught = roll(`spyk-${s}`) < Math.min(0.9, city.game.buildings.siginak * 0.06)
        if (caught) {
          relate(empire, r.id, -3)
          mail(empire, at, 'Gizli Sığınak', 'Casus yakalandı', `${r.ruler} hesabına çalışan bir casus ${city.name} ambarını gözetlerken yakalandı.`)
        }
      }
    }
  }
  w.slot = Math.max(w.slot, slot)
}

export function parseWorld(raw: unknown, cityIds: Set<string>): World | undefined {
  if (raw === undefined) return undefined
  const w = raw as World
  const fin = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0
  const bad = () => { throw new Error('Dünya kaydı okunamadı.') }
  if (!w || !fin(w.start) || !Number.isInteger(w.slot) || !(w.alliance === null || w.alliance in FACTIONS) || !fin(w.allianceAt) ||
      !w.rivals || typeof w.rivals !== 'object' || !Array.isArray(w.messages) || w.messages.length > 40 ||
      !Array.isArray(w.offers) || w.offers.length > 40 || !Array.isArray(w.deliveries) || w.deliveries.length > 60 ||
      !Array.isArray(w.traded) || w.traded.length > 200) bad()
  for (const [id, s] of Object.entries(w.rivals)) {
    if (!rivalById(id) || !s || !Number.isFinite(s.relation) || Math.abs(s.relation) > 100 || !fin(s.lootedAt) || !fin(s.giftAt) ||
        typeof s.greetDay !== 'string' || !Array.isArray(s.treaties) || !s.treaties.every(t => t in TREATIES)) bad()
  }
  for (const m of w.messages) if (!m || typeof m.id !== 'string' || !fin(m.time) || typeof m.subject !== 'string' || typeof m.body !== 'string' || typeof m.read !== 'boolean') bad()
  for (const o of w.offers) {
    if (!o || typeof o.id !== 'string' || !cityIds.has(o.cityId) || !MARKET_GOODS.includes(o.good) || !Number.isInteger(o.amount) ||
        !Number.isInteger(o.left) || o.left < 0 || o.left > o.amount || !fin(o.price) || !fin(o.since) || !fin(o.tick)) bad()
  }
  for (const d of w.deliveries) {
    if (!d || typeof d.id !== 'string' || !cityIds.has(d.cityId) || !(d.good in FAIR_PRICE) || !Number.isInteger(d.amount) || d.amount < 0 || !fin(d.eta)) bad()
  }
  return structuredClone(w)
}

/** İstihbarat satırları (casus raporu). */
export function rivalIntel(empire: Empire, r: Rival, now: number) {
  const L = rivalLevel(empire, r, now)
  const loot = rivalLoot(empire, r, now)
  return [
    `${r.ruler} · ${STYLE_NAMES[r.style]} · ${FACTIONS[r.faction].name} · şehir seviyesi ${L}.`,
    `Garnizon: ${troopList(rivalGarrison(L, r.style))}.`,
    `Sur canı ${rivalWallHp(L)}. Donanma: ${troopList(rivalFleet(L, r.style))}.`,
    `Ambar (korunan hariç): ${loot.gold} akçe, ${loot.wood} kereste, ${loot.stone} taş.`,
    `İlişki: ${peek(empire, r.id).relation}.`,
  ]
}
export const rivalAttackMul = (level: number) => 1 + level * 0.03

/** Mesajları okundu işaretle. */
export function readMessages(source: Empire, now: number): { empire: Empire; error?: string } {
  const empire = advanceEmpire(source, now)
  const w = world(empire)
  w.messages = w.messages.map(m => ({ ...m, read: true }))
  return { empire }
}
