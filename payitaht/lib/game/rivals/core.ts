import { BUILDING_IDS, UNITS, UNIT_IDS, type Army, type Good, type UnitId } from '../engine'
import { type Troops } from '../battle'
import { activeCity, type Empire } from '../empire'
import { type IslandId } from '../islands'
import { type Pact } from '../pact'
import { type News, type Pace, type Proposal, type RivalWar, type Story, type StoryKind } from '../ai'

const HOUR_MS = 3600_000
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
/**
 * KİŞİLİK (V2 Faz 5.8): her hükümdarın bir dostu ve bir düşmanı var.
 * Savaş açarken düşmanını seçer, dostuna el kaldırmaz; sen birine
 * saldırınca dostu kin, düşmanı minnet duyar.
 */
export const BONDS: Record<string, { friend: string; enemy: string }> = {
  'r-kemer': { friend: 'r-ates', enemy: 'r-sarp' },
  'r-lale': { friend: 'r-bag', enemy: 'r-sakiz' },
  'r-ilim': { friend: 'r-kule', enemy: 'r-fener' },
  'r-ates': { friend: 'r-kemer', enemy: 'r-kartal' },
  'r-mavi': { friend: 'r-kor', enemy: 'r-mercan' },
  'r-kule': { friend: 'r-ilim', enemy: 'r-cinar' },
  'r-bag': { friend: 'r-lale', enemy: 'r-kemer' },
  'r-kor': { friend: 'r-mavi', enemy: 'r-sarp' },
  'r-cinar': { friend: 'r-fener', enemy: 'r-kule' },
  'r-sarp': { friend: 'r-kartal', enemy: 'r-kemer' },
  'r-mercan': { friend: 'r-kartal', enemy: 'r-mavi' },
  'r-sakiz': { friend: 'r-cinar', enemy: 'r-lale' },
  'r-kartal': { friend: 'r-sarp', enemy: 'r-ates' },
  'r-fener': { friend: 'r-cinar', enemy: 'r-ilim' },
}
export const friendOf = (id: string) => rivalById(BONDS[id]?.friend ?? '')
export const enemyOf = (id: string) => rivalById(BONDS[id]?.enemy ?? '')

/** Hükümdarın seninle ilgili hatırladıkları; mektuplarında anar. */
export type MemoKind = 'yagma' | 'yardim' | 'hediye' | 'red' | 'dostuna' | 'dusmanina'
export const MEMO_KINDS: MemoKind[] = ['yagma', 'yardim', 'hediye', 'red', 'dostuna', 'dusmanina']
export type Memo = { kind: MemoKind; at: number; of?: string }
export const MEMO_MS = 14 * 24 * HOUR_MS
export type RivalState = { relation: number; lootedAt: number; treaties: TreatyId[]; giftAt: number; greetDay: string; memo?: Memo[] }
export type Message = { id: string; time: number; from: string; rivalId?: string; subject: string; body: string; read: boolean }
export type Offer = { id: string; cityId: string; good: Good; amount: number; left: number; price: number; since: number; tick: number }
export type Delivery = { id: string; cityId: string; good: Good; amount: number; eta: number; from: string }
export type World = {
  start: number; slot: number; alliance: FactionId | null; allianceAt: number
  rivals: Record<string, RivalState>; messages: Message[]; offers: Offer[]; deliveries: Delivery[]; traded: string[]
  /** Şehirlerine sızmış yakalanmamış düşman casusları (Gizli Sığınak görür ve kovar). */
  spies?: ForeignSpy[]
  /** Şehir başına son kovma denemesi. */
  expelAt?: Record<string, number>
  /** Yapay rakiplerin temposu (deneme için "hareketli"). Yoksa "normal". */
  pace?: Pace
  /** Rakiplerin kendi aralarındaki savaşlar (ai.ts). */
  wars?: RivalWar[]
  /** Haberlerde süren hikâyeler (ai.ts, V2 Faz 5.8). */
  stories?: Story[]
  /** Son başlayan hikâyenin türü (art arda aynısı gelmesin). */
  lastStory?: StoryKind
  /** Dünya haberleri: savaş, barış, ticaret, büyüme. */
  news?: News[]
  /** Rakiplerin sana getirdiği teklifler (ticaret, anlaşma, haraç, yardım, hediye). */
  proposals?: Proposal[]
  /** Savaşlarla kazanılan / kaybedilen güç (seviye farkı, -5..+5). */
  power?: Record<string, number>
  /** Haraç ödendi: bu zamana kadar o hükümdar saldırmaz. */
  truce?: Record<string, number>
  /** Oyuncunun kendi kurduğu ittifak (pact.ts). */
  pact?: Pact
}
/** Bu hükümdar senin ittifakında mı (kendi ittifakın ya da katıldığın yapay ittifak)? */
export function isAlly(empire: Empire, rivalId: string) {
  const w = empire.world
  if (w?.pact) return w.pact.members.includes(rivalId)
  const r = rivalById(rivalId)
  return !!r && !!w?.alliance && w.alliance === r.faction
}
export type ForeignSpy = { id: string; rivalId: string; cityId: string; since: number }
export const MAX_FOREIGN_SPIES = 3
/** Aynı anda yolda olabilecek en fazla teslimat (ambarı dolu limanda bekleyenler dahil). */
export const MAX_DELIVERIES = 60
export const EXPEL_COOLDOWN_MS = 30 * 60_000

export const HOUR = HOUR_MS
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n))
export function roll(seed: string) {
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
export const peek = (empire: Empire, id: string): RivalState =>
  empire.world?.rivals[id] ?? { relation: 0, lootedAt: 0, treaties: [], giftAt: 0, greetDay: '' }
export function mail(empire: Empire, time: number, from: string, subject: string, body: string, rivalId?: string) {
  const w = world(empire)
  const msg: Message = { id: `m-${time}-${w.messages.length}-${rivalId ?? 'x'}`, time, from, subject, body, read: false }
  if (rivalId) msg.rivalId = rivalId
  w.messages = [msg, ...w.messages].slice(0, 40)
}
export function relate(empire: Empire, id: string, delta: number) {
  const s = rivalState(empire, id)
  s.relation = clamp(Math.round(s.relation + delta), -100, 100)
}
export function remember(empire: Empire, id: string, kind: MemoKind, at: number, of?: string) {
  const s = rivalState(empire, id)
  s.memo = [{ kind, at, ...(of ? { of } : {}) }, ...(s.memo ?? []).filter(m => at - m.at < MEMO_MS)].slice(0, 6)
}
const ago = (ms: number) => ms < 20 * HOUR_MS ? 'Az önce' : ms < 44 * HOUR_MS ? 'Dün' : `${Math.round(ms / (24 * HOUR_MS))} gün önce`
const KIN: MemoKind[] = ['yagma', 'red', 'dostuna'], MINNET: MemoKind[] = ['yardim', 'hediye', 'dusmanina']
/**
 * Mektuba eklenecek hatıra cümlesi: kin (yağma, geri çevrilen el, dosta
 * saldırı) ya da minnet (yardım, hediye, düşmana darbe). Yoksa boş.
 */
export function recall(empire: Empire, rivalId: string, tone: 'kin' | 'minnet', at: number): string {
  const kinds = tone === 'kin' ? KIN : MINNET
  const m = (peek(empire, rivalId).memo ?? []).find(x => kinds.includes(x.kind) && at - x.at < MEMO_MS && at >= x.at)
  if (!m) return ''
  const other = rivalById(m.of ?? '')?.city ?? 'komşumuz'
  const when = ago(at - m.at)
  switch (m.kind) {
    case 'yagma': {
      const n = (peek(empire, rivalId).memo ?? []).filter(x => x.kind === 'yagma').length
      return n > 1 ? `Hazinemizi ${n} kez yağmaladınız; hiçbirini unutmadık.` : `${when} hazinemizi yağmaladınız; bunu unutmadık.`
    }
    case 'red': return `${when} uzattığımız eli geri çevirdiniz.`
    case 'dostuna': return `Dostumuz ${other} üzerine yürüdünüz; onun yarası bizim de yaramız.`
    case 'yardim': return `${when} uzattığınız yardım eli hâlâ dilimizde.`
    case 'hediye': return `${when} gönderdiğiniz hediye hâlâ divanımızın baş köşesinde.`
    case 'dusmanina': return `Düşmanımız ${other} üzerine indirdiğiniz darbeyi minnetle anıyoruz.`
  }
}

/* --------------------------------------------------------------- GÜÇ VE HAZİNE */

export function rivalLevel(empire: Empire, r: Rival, now: number) {
  const start = empire.world?.start ?? now
  return clamp(r.base + Math.floor(Math.max(0, now - start) / (5 * HOUR)) + (empire.world?.power?.[r.id] ?? 0), 1, 40)
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
