/**
 * İTTİFAK (Ikariam'daki ittifak sistemi) — oyuncunun KENDİ kurduğu ittifak.
 *
 * Oyuncu Elçilik kurunca ittifak açar (ad + kısaltma), ilişkisi iyi olan
 * yapay rakip hükümdarları davet eder. Üyeler eski ittifaklarından ayrılıp
 * sana katılır. İttifakta:
 *  • Rütbeler: Lider (sen), Başkomutan, Hariciye Nazırı, Dahiliye Nazırı, Üye.
 *    Başkomutan baskında daha çok asker yollar; Hariciye Nazırı ticaret
 *    tekliflerini sıklaştırır; Dahiliye Nazırı yeni üyeleri ikna eder.
 *  • Genelge: bütün üyelere mesaj; üyeler cevap yazar, ilişki ısınır.
 *  • İttifaklar arası diplomasi: Doğu / Batı Birliği ile barış, saldırmazlık
 *    ya da savaş.
 *  • Sıralama: ittifaklar üyelerinin puanıyla yarışır.
 * Üyeler sana saldırmaz, baskında yardıma gelir, şehirlerine destek birliği
 * gönderebilirsin. Bütün üyeler yapay rakiptir; gerçek oyuncu yoktur.
 */
import { logEvent } from './engine'
import { activeCity, advanceEmpire, type Empire } from './empire'
import {
  FACTIONS, RIVALS, embassyLevel, mail, peek, playerScore, relate, rivalById, rivalLevel, rivalScore, roll, world,
  type FactionId, type Rival,
} from './rivals'

const HOUR = 3600_000
export type PactRank = 'genel' | 'hariciye' | 'dahiliye' | 'uye'
export const PACT_RANKS: Record<PactRank, { name: string; text: string }> = {
  genel: { name: 'Başkomutan', text: 'Baskında ittifakın yardım ordusunu yönetir: bu üye iki kat asker yollar.' },
  hariciye: { name: 'Hariciye Nazırı', text: 'Pazarlıkları yürütür: üyelerden gelen ticaret teklifleri sıklaşır.' },
  dahiliye: { name: 'Dahiliye Nazırı', text: 'Yeni üyeleri ikna eder: davet için gereken ilişki 10 azalır.' },
  uye: { name: 'Üye', text: 'İttifakın sıradan üyesi.' },
}
export type Stance = 'baris' | 'saldirmazlik' | 'savas'
export const STANCES: Record<Stance, string> = { baris: 'Tarafsız', saldirmazlik: 'Saldırmazlık', savas: 'Savaş' }
export type Circular = { id: string; time: number; from: string; subject: string; body: string; read: boolean; replies?: { rivalId: string; text: string }[] }
export type Pact = {
  name: string; tag: string; motto: string; founded: number
  members: string[]; ranks: Record<string, PactRank>
  circulars: Circular[]; stance: Partial<Record<FactionId, Stance>>
}
export const MAX_CIRCULARS = 24
export const INVITE_NEED = 20
export const CIRCULAR_COOLDOWN_MS = 2 * HOUR

/** Elçilik seviyesine göre en fazla üye (sen hariç). */
export const pactCap = (empire: Empire) => 2 + embassyLevel(empire) * 2
export const pactOf = (empire: Empire) => empire.world?.pact
export const inPact = (empire: Empire, rivalId: string) => !!empire.world?.pact?.members.includes(rivalId)

/* ------------------------------------------------------------ KURULUŞ */

export function foundPact(source: Empire, name: string, tag: string, now: number): { empire: Empire; error?: string } {
  const empire = advanceEmpire(source, now)
  const w = world(empire)
  const n = name.replace(/\s+/g, ' ').trim(), t = tag.replace(/\s+/g, '').trim().toLocaleUpperCase('tr')
  if (w.pact) return { empire, error: 'Zaten bir ittifakın var.' }
  if (w.alliance) return { empire, error: `Önce ${FACTIONS[w.alliance].name} üyeliğinden ayrıl.` }
  if (embassyLevel(empire) < 1) return { empire, error: 'İttifak kurmak için bir şehrinde Elçilik gerekli.' }
  if (n.length < 3 || n.length > 30) return { empire, error: 'İttifak adı 3-30 harf olmalı.' }
  if (t.length < 2 || t.length > 5) return { empire, error: 'Kısaltma 2-5 harf olmalı.' }
  if (Object.values(FACTIONS).some(f => f.name.toLocaleLowerCase('tr') === n.toLocaleLowerCase('tr'))) return { empire, error: 'Bu ad başka bir ittifakın.' }
  w.pact = { name: n, tag: t, motto: '', founded: now, members: [], ranks: {}, circulars: [], stance: {} }
  circular(w.pact, now, 'sen', 'İttifak kuruldu', `${n} [${t}] bugün kuruldu. Kapımız dostlara açık.`)
  logEvent(activeCity(empire).game, `${n} [${t}] ittifakı kuruldu.`, now)
  return { empire }
}

function circular(p: Pact, time: number, from: string, subject: string, body: string, replies?: Circular['replies'], read = true) {
  const c: Circular = { id: `c-${time}-${p.circulars.length}-${from}`, time, from, subject, body, read }
  if (replies?.length) c.replies = replies
  p.circulars = [c, ...p.circulars].slice(0, MAX_CIRCULARS)
}

/** Davet için gereken ilişki (Dahiliye Nazırı varsa daha az). */
export function inviteNeed(p: Pact) {
  return INVITE_NEED - (Object.values(p.ranks).includes('dahiliye') ? 10 : 0)
}

export function invitePact(source: Empire, rivalId: string, now: number): { empire: Empire; error?: string } {
  const empire = advanceEmpire(source, now)
  const w = world(empire), p = w.pact, r = rivalById(rivalId)
  if (!p) return { empire, error: 'Önce bir ittifak kur.' }
  if (!r) return { empire, error: 'Bilinmeyen hükümdar.' }
  if (p.members.includes(rivalId)) return { empire, error: 'Zaten üyemiz.' }
  if (p.members.length >= pactCap(empire)) return { empire, error: `Üye sınırı dolu (${pactCap(empire)}). Elçiliği yükselt.` }
  const rel = peek(empire, rivalId).relation
  if (rel < inviteNeed(p)) {
    relate(empire, rivalId, -1)
    return { empire, error: `${r.ruler} daveti geri çevirdi (ilişki ${rel}, gereken ${inviteNeed(p)}). Hediye ve selamla ilişkiyi ısıt.` }
  }
  p.members = [...p.members, rivalId]
  p.ranks[rivalId] = 'uye'
  relate(empire, rivalId, 5)
  // Eski ittifakı küser.
  for (const o of RIVALS) if (o.faction === r.faction && o.id !== r.id && !p.members.includes(o.id)) relate(empire, o.id, -3)
  circular(p, now, rivalId, 'Aramıza katıldı', `${r.ruler} (${r.city}) ${FACTIONS[r.faction].name}'nden ayrılıp ${p.name} [${p.tag}] saflarına katıldı.`, undefined, false)
  return { empire }
}

export function kickMember(source: Empire, rivalId: string, now: number): { empire: Empire; error?: string } {
  const empire = advanceEmpire(source, now)
  const p = world(empire).pact, r = rivalById(rivalId)
  if (!p || !r || !p.members.includes(rivalId)) return { empire, error: 'Böyle bir üye yok.' }
  p.members = p.members.filter(id => id !== rivalId)
  delete p.ranks[rivalId]
  relate(empire, rivalId, -15)
  circular(p, now, 'sen', 'Üye çıkarıldı', `${r.ruler} (${r.city}) ittifaktan çıkarıldı.`)
  mail(empire, now, r.ruler, 'İttifaktan çıkarıldık', 'Bu hakareti unutmayacağız.', rivalId)
  return { empire }
}

export function setRank(source: Empire, rivalId: string, rank: PactRank, now: number): { empire: Empire; error?: string } {
  const empire = advanceEmpire(source, now)
  const p = world(empire).pact
  if (!p || !p.members.includes(rivalId)) return { empire, error: 'Böyle bir üye yok.' }
  if (!(rank in PACT_RANKS)) return { empire, error: 'Bilinmeyen rütbe.' }
  // Her nazırlık tek kişinin: yeni atanınca eskisi üyeliğe döner.
  if (rank !== 'uye') for (const [id, rk] of Object.entries(p.ranks)) if (rk === rank) p.ranks[id] = 'uye'
  p.ranks[rivalId] = rank
  if (rank !== 'uye') relate(empire, rivalId, 3)
  return { empire }
}

export function setPactMotto(source: Empire, motto: string, now: number): { empire: Empire; error?: string } {
  const empire = advanceEmpire(source, now)
  const p = world(empire).pact
  if (!p) return { empire, error: 'Önce bir ittifak kur.' }
  const m = motto.trim()
  if (m.length > 80) return { empire, error: 'Düstur en fazla 80 harf.' }
  p.motto = m
  return { empire }
}

export function leavePact(source: Empire, now: number): { empire: Empire; error?: string } {
  const empire = advanceEmpire(source, now)
  const w = world(empire)
  if (!w.pact) return { empire, error: 'Bir ittifakın yok.' }
  for (const id of w.pact.members) relate(empire, id, -5)
  logEvent(activeCity(empire).game, `${w.pact.name} [${w.pact.tag}] dağıtıldı; üyeler eski ittifaklarına döndü.`, now)
  delete w.pact
  return { empire }
}

/* ------------------------------------------------------------ GENELGE */

export const CIRCULAR_TOPICS = {
  savunma: { subject: 'Savunmaya hazır olun', body: 'Kıyılarda düşman görüldü. Surlarınızı ve garnizonlarınızı hazır tutun; baskın olursa birbirimize koşacağız.' },
  ticaret: { subject: 'Ticaret yolları', body: 'İttifak içinde kervanlar serbest dolaşsın. Fazla malınızı kardeşlerinize satın.' },
  sefer: { subject: 'Ortak sefer', body: 'Ordularımızı birleştirip düşmanın üstüne yürüme vakti geldi. Hazırlığınızı bildirin.' },
  selam: { subject: 'Selam ve dua', body: 'Bütün kardeşlerimize selam olsun. İttifakımız daim, sancağımız yüce olsun.' },
} as const
export type CircularTopic = keyof typeof CIRCULAR_TOPICS
const REPLIES: Record<CircularTopic, string[]> = {
  savunma: ['Surlarımız sağlam, ordumuz hazır.', 'Casuslarımızı kıyıya yolladık.', 'Bir işaretinizle geliriz.'],
  ticaret: ['Ambarlarımız kardeşlere açık.', 'Kervanlarımız yola çıkmaya hazır.', 'Fazla kerestemiz var, haber verin.'],
  sefer: ['Kılıçlarımız keskin, emrinizi bekliyoruz.', 'Önce keşif, sonra hücum.', 'Süvarilerimiz eyerlendi.'],
  selam: ['Aleykümselam, ittifakımız daim olsun.', 'Selamınız başımız üstüne.', 'Dostluğumuz ebedî.'],
}

export function sendCircular(source: Empire, topic: CircularTopic, note: string, now: number): { empire: Empire; error?: string } {
  const empire = advanceEmpire(source, now)
  const p = world(empire).pact
  if (!p) return { empire, error: 'Önce bir ittifak kur.' }
  if (!(topic in CIRCULAR_TOPICS)) return { empire, error: 'Bilinmeyen konu.' }
  const last = p.circulars.find(c => c.from === 'sen' && c.subject !== 'İttifak kuruldu' && c.subject !== 'Üye çıkarıldı')
  if (last && now < last.time + CIRCULAR_COOLDOWN_MS) return { empire, error: `Yeni genelge için ${Math.ceil((last.time + CIRCULAR_COOLDOWN_MS - now) / 60_000)} dk bekle.` }
  const extra = note.trim().slice(0, 140)
  const t = CIRCULAR_TOPICS[topic]
  const replies = p.members.map((id, i) => ({ rivalId: id, text: REPLIES[topic][Math.floor(roll(`rep-${id}-${now}-${i}`) * REPLIES[topic].length)] }))
  circular(p, now, 'sen', t.subject, extra ? `${t.body} ${extra}` : t.body, replies)
  for (const id of p.members) relate(empire, id, 2)
  return { empire }
}

export function readCirculars(source: Empire, now: number): { empire: Empire; error?: string } {
  const empire = advanceEmpire(source, now)
  const p = world(empire).pact
  if (p) p.circulars = p.circulars.map(c => ({ ...c, read: true }))
  return { empire }
}

/* ------------------------------------------------ İTTİFAKLAR ARASI DİPLOMASİ */

export function setStance(source: Empire, f: FactionId, stance: Stance, now: number): { empire: Empire; error?: string } {
  const empire = advanceEmpire(source, now)
  const p = world(empire).pact
  if (!p) return { empire, error: 'Önce bir ittifak kur.' }
  if (!(f in FACTIONS) || !(stance in STANCES)) return { empire, error: 'Geçersiz seçim.' }
  const before = p.stance[f] ?? 'baris'
  if (before === stance) return { empire }
  const roster = RIVALS.filter(r => r.faction === f && !p.members.includes(r.id))
  if (stance === 'saldirmazlik') {
    const avg = roster.length ? roster.reduce((s, r) => s + peek(empire, r.id).relation, 0) / roster.length : 0
    if (avg < 0) return { empire, error: `${FACTIONS[f].name} saldırmazlığı reddetti (ortalama ilişki ${Math.round(avg)}). Önce ilişkiyi düzelt.` }
  }
  for (const r of roster) relate(empire, r.id, stance === 'savas' ? -20 : stance === 'saldirmazlik' ? 5 : 0)
  if (stance === 'baris') delete p.stance[f]
  else p.stance[f] = stance
  circular(p, now, 'sen', `${FACTIONS[f].name}: ${STANCES[stance]}`, stance === 'savas'
    ? `${FACTIONS[f].name}'ne savaş ilan ettik. Bütün üyeler hazır olsun!` : stance === 'saldirmazlik'
      ? `${FACTIONS[f].name} ile saldırmazlık antlaşması imzalandı.` : `${FACTIONS[f].name} ile ilişkilerimiz tarafsızlığa döndü.`)
  return { empire }
}

/** İttifak sıralaması: kendi ittifakın ve iki yapay ittifak, üyelerin puanıyla. */
export function allianceRankings(empire: Empire, now: number) {
  const p = empire.world?.pact
  const rows: { id: string; name: string; tag: string; members: number; score: number; you: boolean }[] = []
  const score = (r: Rival) => rivalScore(empire, r, now).total
  if (p) rows.push({ id: 'pact', name: p.name, tag: p.tag, members: p.members.length + 1, you: true,
    score: playerScore(empire).total + p.members.reduce((s, id) => s + score(rivalById(id)!), 0) })
  for (const f of Object.keys(FACTIONS) as FactionId[]) {
    const roster = RIVALS.filter(r => r.faction === f && !p?.members.includes(r.id))
    const mine = empire.world?.alliance === f
    rows.push({ id: f, name: FACTIONS[f].name, tag: f === 'dogu' ? 'DOĞU' : 'BATI', members: roster.length + (mine ? 1 : 0), you: mine,
      score: roster.reduce((s, r) => s + score(r), 0) + (mine ? playerScore(empire).total : 0) })
  }
  return rows.sort((a, b) => b.score - a.score)
}

/** Baskında ittifakın yolladığı yardım çarpanı (Başkomutan iki kat). */
export function pactHelpLevel(empire: Empire, now: number) {
  const p = empire.world?.pact
  if (!p || !p.members.length) return 0
  return p.members.reduce((s, id) => s + rivalLevel(empire, rivalById(id)!, now) * (p.ranks[id] === 'genel' ? 2 : 1), 0) / Math.max(1, p.members.length) * Math.min(3, 1 + p.members.length * 0.25)
}

/* ------------------------------------------------------------ SAAT BAŞI */

const MEMBER_POSTS = [
  ['Kervan haberi', 'Ambarlarımız doldu; ihtiyacı olan kardeşe yarı fiyatına satarız.'],
  ['Gözcü raporu', 'Korsan gemileri adaların arasında dolaşıyor. Tetikte olun.'],
  ['Hasat', 'Bu yıl bereketli geçti. İttifaka şükran olsun.'],
  ['Talim', 'Askerlerimiz talimde; ittifak çağırırsa hazırız.'],
]
/** aiHour içinden: üyeler ara sıra genelge yazar. */
export function pactHour(empire: Empire, at: number, s: number, k: number) {
  const p = empire.world?.pact
  if (!p || !p.members.length) return
  if (roll(`pact-${s}`) > 0.06 * k) return
  const id = p.members[Math.floor(roll(`pactm-${s}`) * p.members.length)]
  const r = rivalById(id)!
  const [subject, body] = MEMBER_POSTS[Math.floor(roll(`pactl-${s}`) * MEMBER_POSTS.length)]
  circular(p, at, id, subject, `${body} — ${r.ruler}`, undefined, false)
}

/* ---------------------------------------------------------- KAYIT DENETİMİ */

export function parsePact(raw: unknown, bad: () => never): Pact | undefined {
  if (raw === undefined) return undefined
  const p = raw as Pact
  const fin = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0
  if (!p || typeof p.name !== 'string' || p.name.length < 1 || p.name.length > 30 || typeof p.tag !== 'string' || p.tag.length > 5 ||
      typeof p.motto !== 'string' || p.motto.length > 80 || !fin(p.founded) || !Array.isArray(p.members) || p.members.length > 20 ||
      !p.members.every(id => rivalById(id)) || new Set(p.members).size !== p.members.length ||
      !p.ranks || typeof p.ranks !== 'object' || !Object.entries(p.ranks).every(([id, rk]) => p.members.includes(id) && rk in PACT_RANKS) ||
      !Array.isArray(p.circulars) || p.circulars.length > MAX_CIRCULARS ||
      !p.stance || typeof p.stance !== 'object' || !Object.entries(p.stance).every(([f, st]) => f in FACTIONS && st in STANCES)) bad()
  for (const c of p.circulars) {
    if (!c || typeof c.id !== 'string' || !fin(c.time) || typeof c.from !== 'string' || typeof c.subject !== 'string' || typeof c.body !== 'string' ||
        typeof c.read !== 'boolean' || (c.replies !== undefined && (!Array.isArray(c.replies) || !c.replies.every(x => x && rivalById(x.rivalId) && typeof x.text === 'string')))) bad()
  }
  return p
}
