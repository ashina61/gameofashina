/**
 * YAPAY RAKİP BEYNİ — dünyanın kendi kendine yaşaması.
 *
 * Rakip hükümdarlar (gerçek oyuncu değil, yapay rakip) saat başı karar verir:
 *  • Kendi aralarında savaşırlar: savaşçı ve denizci hükümdarlar öbür ittifaktan
 *    birine savaş açar, her saat bir çarpışma olur; kazanan güçlenir, kaybeden
 *    zayıflar (seviyeye -5..+5 etki eder, sıralamada görünür).
 *  • Sana teklif getirirler: mal satarlar, fazla malını almak isterler, anlaşma
 *    önerirler, güçlü savaşçılar haraç ister, dostlar hediye yollar, savaştaki
 *    müttefikin yardım ister. Teklifler birkaç saat sonra düşer.
 *  • Olan biten "Dünya haberleri"ne yazılır.
 *  • Kişilik (V2 Faz 5.8): her hükümdarın dostu ve düşmanı vardır (BONDS);
 *    savaşı düşmanına açar, dostu yardıma koşar. Mektuplar geçmişi anar
 *    (intikam, minnet) ve haberlerde birkaç bölüm süren hikâyeler işler.
 * Tempo ayarı (sakin / normal / hareketli) oyunu denemek için bu olayları
 * sıklaştırır. Hepsi deterministiktir: aynı kayıt aynı dünyayı üretir.
 */
import { GOOD_NAMES, LUXURY_IDS, logEvent, travelFactor, type Good } from './engine'
import { activeCity, advanceEmpire, type Empire } from './empire'
import { idleMerchants, shipCargo } from './expeditions'
import { ISLANDS } from './islands'
import { pactHour } from './pact'
import { da, de, den, e } from './turkce'
import {
  BONDS, FAIR_PRICE, MAX_DELIVERIES, RIVALS, TREATIES, addGood, enemyOf, friendOf, recall, remember, culturalTreaties, embassyLevel, mail, peek, playerScore, relate, rivalById, rivalLevel,
  isAlly, rivalScore, rivalState, roll, seaMinutes, stockOf, world, type Rival, type TreatyId, type World,
} from './rivals'

const HOUR = 3600_000
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n))
const round10 = (n: number) => Math.max(10, Math.round(n / 10) * 10)
const pick = <T,>(list: T[], seed: string) => list[Math.floor(roll(seed) * list.length)]

export type Pace = 'sakin' | 'normal' | 'hareketli'
export const PACE_IDS: Pace[] = ['sakin', 'normal', 'hareketli']
export const PACES: Record<Pace, { name: string; text: string; k: number; warEvery: number; warDivan: number; graceHours: number }> = {
  sakin: { name: 'Sakin', text: 'Rakipler seyrek teklif getirir; sana savaş açmaları nadirdir.', k: 0.5, warEvery: 12, warDivan: 7, graceHours: 96 },
  normal: { name: 'Normal', text: 'Birkaç saatte bir haber, arada bir teklif; savaşçılar iki gün sonra saldırabilir.', k: 1, warEvery: 6, warDivan: 5, graceHours: 48 },
  hareketli: { name: 'Hareketli', text: 'Deneme için: rakipler sık savaşır ve sık teklif getirir; Divanhane 3\'ten itibaren sana da saldırabilirler.', k: 3, warEvery: 2, warDivan: 3, graceHours: 0 },
}

export type RivalWar = { id: string; a: string; b: string; since: number; until: number; score: number }
export type NewsKind = 'savas' | 'catisma' | 'baris' | 'ticaret' | 'buyume' | 'anlasma'
export type NewsStory = { id: string; step: number; of: number; title: string }
export type News = { id: string; time: number; kind: NewsKind; text: string; rivals: string[]; story?: NewsStory }
/** Birkaç bölüm süren hikâye (kan davası, düğün, kıtlık, korsan avı). */
export type StoryKind = 'kan' | 'dugun' | 'kitlik' | 'korsan'
export type Story = { id: string; kind: StoryKind; a: string; b: string; step: number; next: number }
export const STORY_TITLES: Record<StoryKind, string> = { kan: 'Kan davası', dugun: 'Düğün', kitlik: 'Kıtlık', korsan: 'Korsan avı' }
export const STORY_STEPS = 3
const MAX_STORIES = 2
export type ProposalKind = 'satis' | 'alis' | 'anlasma' | 'harac' | 'yardim' | 'hediye'
export type Deal = { good: Good; amount: number }
export type Proposal = {
  id: string; rivalId: string; kind: ProposalKind; time: number; until: number; text: string
  /** Rakibin sana vereceği. */
  give?: Deal
  /** Rakibin senden istediği. */
  want?: Deal
  treaty?: TreatyId
}
export const PROPOSAL_NAMES: Record<ProposalKind, string> = {
  satis: 'Satış teklifi', alis: 'Alım teklifi', anlasma: 'Anlaşma teklifi', harac: 'Haraç talebi', yardim: 'Yardım çağrısı', hediye: 'Hediye',
}
export const MAX_NEWS = 30
export const MAX_PROPOSALS = 5
export const PROPOSAL_MS = 8 * HOUR
export const TRUCE_MS = 24 * HOUR
const MAX_WARS = 2
const TRADE_GOODS: Good[] = ['wood', ...LUXURY_IDS]

/* ------------------------------------------------------------ YARDIMCILAR */

export function busyAtWar(empire: Empire, rivalId: string) {
  return (empire.world?.wars ?? []).some(w => w.a === rivalId || w.b === rivalId)
}
export function warOf(empire: Empire, rivalId: string) {
  return (empire.world?.wars ?? []).find(w => w.a === rivalId || w.b === rivalId)
}
export function worldNews(empire: Empire, time: number, kind: NewsKind, text: string, rivals: string[], story?: NewsStory) {
  const w = world(empire)
  const list = w.news ?? []
  w.news = [{ id: `n-${time}-${kind}-${rivals.join('.')}-${list.length}`, time, kind, text, rivals, ...(story ? { story } : {}) }, ...list].slice(0, MAX_NEWS)
}
function shiftPower(w: World, id: string, d: number) {
  const next = { ...w.power, [id]: clamp((w.power?.[id] ?? 0) + d, -5, 5) }
  if (!next[id]) delete next[id]
  if (Object.keys(next).length) w.power = next
  else delete w.power
}
const goodName = (g: Good) => GOOD_NAMES[g].toLocaleLowerCase('tr')
const dealText = (d: Deal) => `${d.amount.toLocaleString('tr-TR')} ${goodName(d.good)}`

/* ------------------------------------------------------------- SAAT BAŞI */

/** advanceWorld içinden, her saat için bir kez. */
export function aiHour(empire: Empire, at: number, s: number) {
  const w = world(empire)
  const k = PACES[w.pace ?? 'normal'].k
  if (w.proposals) {
    w.proposals = w.proposals.filter(p => p.until > at)
    if (!w.proposals.length) delete w.proposals
  }
  if (w.truce) {
    w.truce = Object.fromEntries(Object.entries(w.truce).filter(([, until]) => until > at))
    if (!Object.keys(w.truce).length) delete w.truce
  }
  fightWars(empire, w, at, s)
  if (roll(`warstart-${s}`) < 0.035 * k) startRivalWar(empire, w, at, s)
  stories(empire, w, at, s, k)
  if (roll(`prop-${s}`) < 0.14 * k) propose(empire, w, at, s)
  if (roll(`caravan-${s}`) < 0.06 * k) caravan(empire, at, s)
  pactHour(empire, at, s, k)
  // Hariciye Nazırı: ittifak üyelerinden ek ticaret teklifi.
  if (w.pact && Object.values(w.pact.ranks).includes('hariciye') && roll(`propx-${s}`) < 0.08 * k) propose(empire, w, at, s + 0.5)
  growth(empire, at)
}

function fightWars(empire: Empire, w: World, at: number, s: number) {
  if (!w.wars?.length) return
  for (const war of w.wars) {
    if (at <= war.since) continue
    const A = rivalById(war.a)!, B = rivalById(war.b)!
    const pa = rivalScore(empire, A, at).military, pb = rivalScore(empire, B, at).military
    const winA = roll(`fight-${war.id}-${s}`) < pa / Math.max(1, pa + pb)
    war.score += winA ? 1 : -1
    if (s % 3 === 0) worldNews(empire, at, 'catisma', winA ? `${A.city} ordusu ${B.city} önlerinde bir çarpışmayı kazandı.` : `${B.city}, ${A.city} ordusunun saldırısını püskürttü.`, [A.id, B.id])
  }
  const ended = w.wars.filter(x => Math.abs(x.score) >= 4 || at >= x.until)
  for (const war of ended) {
    const A = rivalById(war.a)!, B = rivalById(war.b)!
    if (war.score === 0) { worldNews(empire, at, 'baris', `${A.city} ile ${B.city} ateşkes imzaladı; savaş berabere bitti.`, [A.id, B.id]); continue }
    const [W, L] = war.score > 0 ? [A, B] : [B, A]
    shiftPower(w, W.id, 1)
    shiftPower(w, L.id, -1)
    worldNews(empire, at, 'baris', `${W.city} savaşı kazandı; ${L.city} barış için haraç ödedi. ${W.ruler} güçleniyor.`, [W.id, L.id])
    // Müttefiklerin savaşı biterse haber mektupla da gelir.
    if (isAlly(empire, W.id) || isAlly(empire, L.id)) {
      const ally = isAlly(empire, W.id) ? W : L
      mail(empire, at, ally.ruler, ally === W ? 'Zafer' : 'Yenilgi', ally === W ? `${L.city} diz çöktü. Destek verenleri unutmayız.` : `${W.city} karşısında geri çekildik. İttifak yeniden toparlanacak.`, ally.id)
    }
  }
  w.wars = w.wars.filter(x => !ended.includes(x))
  if (!w.wars.length) delete w.wars
}

function startRivalWar(empire: Empire, w: World, at: number, s: number) {
  if ((w.wars?.length ?? 0) >= MAX_WARS) return
  const free = RIVALS.filter(r => !busyAtWar(empire, r.id))
  const aggressors = free.filter(r => r.style === 'savasci' || r.style === 'denizci')
  if (!aggressors.length) return
  // İttifakın savaştığı yapay ittifak varsa üyelerin ordusu önce ona yürür.
  const foe = w.pact && (Object.entries(w.pact.stance).find(([, st]) => st === 'savas')?.[0] as Rival['faction'] | undefined)
  const warriors = foe ? free.filter(r => w.pact!.members.includes(r.id)) : []
  const A = warriors.length && roll(`wp-${s}`) < 0.6 ? pick(warriors, `wpa-${s}`) : pick(aggressors, `wa-${s}`)
  const side = (r: Rival) => w.pact?.members.includes(r.id) ? 'pact' : r.faction
  const targets = free.filter(r => r.id !== A.id && r.id !== BONDS[A.id]?.friend && side(r) !== side(A) && (!warriors.includes(A) || r.faction === foe))
  if (!targets.length) return
  // Kişilik: düşmanı meydandaysa kılıcını önce ona çeker.
  const sworn = targets.find(r => r.id === BONDS[A.id]?.enemy)
  const B = sworn && roll(`wsw-${s}`) < 0.6 ? sworn : pick(targets, `wb-${s}`)
  openWar(empire, w, A, B, at, s, sworn === B ? `${A.ruler} eski düşmanı ${B.ruler} ile hesaplaşmak için ${B.city} şehrine savaş açtı.` : undefined)
}

/** İki hükümdar arasında savaş başlatır; savunanın dostu yardıma koşar. */
function openWar(empire: Empire, w: World, A: Rival, B: Rival, at: number, s: number, text?: string) {
  const war: RivalWar = { id: `w-${A.id}-${B.id}-${s}`, a: A.id, b: B.id, since: at, until: at + (12 + Math.floor(roll(`wd-${s}`) * 24)) * HOUR, score: 0 }
  w.wars = [...(w.wars ?? []), war]
  worldNews(empire, at, 'savas', text ?? `${A.ruler} (${A.city}) ${B.city} şehrine savaş açtı.`, [A.id, B.id])
  const helper = friendOf(B.id)
  if (helper && helper.id !== A.id && !busyAtWar(empire, helper.id)) {
    war.score -= 1
    worldNews(empire, at, 'catisma', `${helper.ruler}, dostu ${B.city} yalnız kalmasın diye asker gönderdi.`, [helper.id, B.id])
  }
  // İttifaktaki bir üye saldırıya uğrarsa senden yardım ister.
  const ally = isAlly(empire, B.id) ? B : isAlly(empire, A.id) ? A : null
  if (ally) addProposal(w, {
    id: `p-${ally.id}-${s}-y`, rivalId: ally.id, kind: 'yardim', time: at, until: at + PROPOSAL_MS,
    want: { good: 'gold', amount: round10(rivalLevel(empire, ally, at) * 150) },
    text: `${ally === A ? B.city : A.city} ile savaştayız. İttifak kardeşliği adına savaş sandığımıza destek ver; zaferde payını unutmayız.`,
  })
}

function addProposal(w: World, p: Proposal) {
  if ((w.proposals ?? []).some(x => x.id === p.id || x.rivalId === p.rivalId)) return
  w.proposals = [...(w.proposals ?? []), p].slice(-MAX_PROPOSALS)
}

function propose(empire: Empire, w: World, at: number, s: number) {
  if ((w.proposals?.length ?? 0) >= MAX_PROPOSALS) return
  const cands = RIVALS.filter(r => peek(empire, r.id).relation > -40 && !(w.proposals ?? []).some(p => p.rivalId === r.id))
  if (!cands.length) return
  const r = pick(cands, `pr-${s}`)
  const p = draft(empire, r, at, s)
  // Aynı mal için ikinci bir teklif getirmezler; çeşit olsun.
  const good = (x: Proposal) => x.kind === 'alis' ? x.want?.good : x.kind === 'satis' ? x.give?.good : undefined
  if (p && good(p) && (w.proposals ?? []).some(x => x.kind === p.kind && good(x) === good(p))) return
  if (p) addProposal(w, p)
}

const lead = (line: string) => line ? `${line} ` : ''
/** Bu hükümdarın bu saatte getireceği teklif. */
function draft(empire: Empire, r: Rival, at: number, s: number): Proposal | null {
  const g = activeCity(empire).game
  const st = peek(empire, r.id)
  const rel = st.relation
  const L = rivalLevel(empire, r, at)
  const x = roll(`pk-${r.id}-${s}`)
  const base = { id: `p-${r.id}-${s}`, rivalId: r.id, time: at, until: at + PROPOSAL_MS }
  // Güçlü savaşçı haraç ister.
  if (r.style === 'savasci' && rel < 0 && rivalScore(empire, r, at).military > playerScore(empire).military * 1.2 && x < 0.6) {
    return { ...base, kind: 'harac', want: { good: 'gold', amount: round10(L * 120) },
      text: `${lead(recall(empire, r.id, 'kin', at))}Ordumuzun gölgesi adanızın üstünde. Haracı ödeyin, bir gün boyunca kılıcımız kınında kalsın. Ödemezseniz hesabını sorarız.` }
  }
  // İlişki yeterliyse anlaşma önerirler (kültür için müze yeri de gerekir).
  const museums = empire.cities.reduce((sum, c) => sum + c.game.buildings.muze, 0)
  const treaty = (Object.keys(TREATIES) as TreatyId[]).find(t => !st.treaties.includes(t) && rel >= TREATIES[t].need + 5 &&
    (t !== 'kultur' || (museums > culturalTreaties(empire) && empire.cities.some(c => c.game.research.includes('kultur')))))
  if (treaty && x < 0.35) {
    return { ...base, kind: 'anlasma', treaty, text: `${lead(recall(empire, r.id, 'minnet', at))}Aramızdaki dostluk bir mühre değer. ${TREATIES[treaty].name} imzalayalım: ${TREATIES[treaty].description} Elçilik masrafını biz üstleniyoruz.` }
  }
  // Dostlar hediye gönderir.
  if (rel >= 40 && x < 0.2) {
    const good = pick(TRADE_GOODS, `pg-${r.id}-${s}`)
    return { ...base, kind: 'hediye', give: { good, amount: round10(L * 30) }, text: `${lead(recall(empire, r.id, 'minnet', at))}Dostluğumuzun nişanı olarak ambarlarımızdan küçük bir armağan. Karşılık beklemiyoruz.` }
  }
  // Ticaret: fazla malını almak ister ya da eksiğini satar.
  const trade = st.treaties.includes('ticaret')
  const room = (good: Good) => stockOf(g, good)
  const plenty = TRADE_GOODS.filter(good => room(good) >= 400)
  const buy = plenty.length > 0 && (r.style === 'savasci' || roll(`ps-${r.id}-${s}`) < 0.5)
  if (buy) {
    const good = pick(plenty, `pb-${r.id}-${s}`)
    const amount = round10(Math.min(room(good) * 0.35, 150 + L * 40))
    const price = FAIR_PRICE[good] * (1.25 + clamp(rel, 0, 100) / 400) * (trade ? 1.1 : 1)
    return { ...base, kind: 'alis', want: { good, amount }, give: { good: 'gold', amount: Math.round(amount * price) },
      text: `${goodName(good)[0].toLocaleUpperCase('tr')}${goodName(good).slice(1)} ihtiyacımız var ve ambarlarınızın dolu olduğunu duyduk. Pazardan iyi fiyat veriyoruz.` }
  }
  // Satış: en az bulunan lüks ya da yapı malı.
  const lacking = [...TRADE_GOODS].sort((a, b) => room(a) - room(b))
  const good = lacking[Math.floor(roll(`pl-${r.id}-${s}`) * 2)]
  const amount = round10((150 + L * 25) * (0.7 + roll(`pa-${r.id}-${s}`) * 0.6))
  const price = FAIR_PRICE[good] * (0.95 - clamp(rel, 0, 100) / 400) * (r.style === 'tuccar' ? 0.9 : 1) * (trade ? 0.9 : 1)
  return { ...base, kind: 'satis', give: { good, amount }, want: { good: 'gold', amount: Math.round(amount * price) },
    text: `Ambarlarımızda ${goodName(good)} fazlası var; sizde az olduğunu tüccarlarımız söyledi. Gemilerimiz yüklenmeye hazır.` }
}

function caravan(empire: Empire, at: number, s: number) {
  const traders = RIVALS.filter(r => (r.style === 'tuccar' || r.style === 'denizci') && !busyAtWar(empire, r.id))
  if (!traders.length) return
  const A = pick(traders, `ca-${s}`)
  const partners = RIVALS.filter(r => r.id !== A.id && r.faction === A.faction && !busyAtWar(empire, r.id))
  if (!partners.length) return
  const B = pick(partners, `cb-${s}`)
  const good = pick(TRADE_GOODS, `cg-${s}`)
  const amount = round10((200 + rivalLevel(empire, A, at) * 40) * (0.6 + roll(`cn-${s}`)))
  worldNews(empire, at, 'ticaret', `${A.city} ${r2(A)} ${B.city} pazarına ${amount.toLocaleString('tr-TR')} ${goodName(good)} götürdü.`, [A.id, B.id])
}
const r2 = (r: Rival) => r.style === 'denizci' ? 'gemileri' : 'kervanı'

/* ----------------------------------------------------------- HİKÂYELER */

/** Süren hikâyeleri bir bölüm ilerletir, yer varsa yenisini başlatır. */
function stories(empire: Empire, w: World, at: number, s: number, k: number) {
  for (const st of [...(w.stories ?? [])]) if (st.next <= at) chapter(empire, w, st, at, s)
  w.stories = (w.stories ?? []).filter(st => st.step < STORY_STEPS)
  if ((w.stories.length) < MAX_STORIES && roll(`story-${s}`) < 0.07 * k) begin(empire, w, at, s)
  if (!w.stories.length) delete w.stories
}
const gap = (seed: string) => (6 + Math.floor(roll(seed) * 14)) * HOUR
function begin(empire: Empire, w: World, at: number, s: number) {
  const busy = new Set((w.stories ?? []).flatMap(st => [st.a, st.b]))
  const free = RIVALS.filter(r => !busy.has(r.id))
  // Aynı türden iki hikâye aynı anda sürmez; son biten tür de hemen dönmez.
  const kinds = (['kan', 'dugun', 'kitlik', 'korsan'] as StoryKind[]).filter(k => !(w.stories ?? []).some(st => st.kind === k) && k !== w.lastStory)
  const kind = kinds[Math.floor(roll(`sk-${s}`) * kinds.length)]
  const pool = kind === 'korsan' ? free.filter(r => r.style === 'denizci') : free
  const cands = pool.filter(r => {
    const other = kind === 'kan' ? enemyOf(r.id) : friendOf(r.id)
    return other && !busy.has(other.id)
  })
  if (!cands.length) return
  const A = pick(cands, `sa-${s}`)
  const B = (kind === 'kan' ? enemyOf(A.id) : friendOf(A.id))!
  const st: Story = { id: `s-${kind}-${A.id}-${s}`, kind, a: A.id, b: B.id, step: 0, next: at }
  w.lastStory = kind
  w.stories = [...(w.stories ?? []), st]
  chapter(empire, w, st, at, s)
}
function chapter(empire: Empire, w: World, st: Story, at: number, s: number) {
  const A = rivalById(st.a)!, B = rivalById(st.b)!
  st.step += 1
  st.next = at + gap(`sg-${st.id}-${st.step}`)
  const tag = { id: st.id, step: st.step, of: STORY_STEPS, title: STORY_TITLES[st.kind] }
  const say = (kind: NewsKind, text: string, rivals = [A.id, B.id]) => worldNews(empire, at, kind, text, rivals, tag)
  const sea = ISLANDS.find(i => i.id === A.islandId)?.name ?? 'ada'
  switch (st.kind) {
    case 'kan':
      if (st.step === 1) say('catisma', `${A.ruler} ile ${B.ruler} arasındaki eski kan davası alevlendi: ${B.city} elçisi ${A.city} divanında hakarete uğradı.`)
      else if (st.step === 2) say('catisma', `Kan davası sürüyor: ${A.city} ile ${B.city} sınır köylerinde kılıçlar çekildi.`)
      else if (!busyAtWar(empire, A.id) && !busyAtWar(empire, B.id) && (w.wars?.length ?? 0) < MAX_WARS && roll(`sw-${st.id}`) < 0.6) {
        say('savas', `Kan davası savaşa döndü: ${A.ruler}, ${B.city} üzerine ordu yürüttü.`)
        openWar(empire, w, A, B, at, s)
      } else say('baris', `${A.city} ile ${B.city} kadıların huzurunda diyet ödeşti; kan davası şimdilik kapandı.`)
      break
    case 'dugun':
      if (st.step === 1) say('anlasma', `${A.ruler} ile ${B.ruler} hanedanları arasında söz kesildi; iki şehir düğüne hazırlanıyor.`)
      else if (st.step === 2) say('ticaret', `Çeyiz yola çıktı: ${A.city} gemileri ${B.city} limanına ipek ve gümüş taşıyor.`)
      else {
        say('anlasma', `Kırk gün kırk gece süren düğün bitti: ${A.city} ile ${B.city} artık akraba.`)
        if (peek(empire, A.id).relation >= 20) mail(empire, at, A.ruler, 'Düğün davetiyesi', `${B.city} ile akraba olduk. Sofralarımızda sizin de yeriniz vardı; dostluğunuzu bu sevinçte de andık.`, A.id)
      }
      break
    case 'kitlik':
      if (st.step === 1) say('buyume', `${de(A.city)} kuraklık: ambarlar boşalıyor, ekmek pahalandı.`, [A.id])
      else if (st.step === 2) {
        say('ticaret', `Kıtlık sürüyor; ${B.ruler}, dostu ${A.city} için buğday gemileri gönderdi.`)
        if (peek(empire, A.id).relation > -20) addProposal(w, {
          id: `p-${A.id}-${s}-k`, rivalId: A.id, kind: 'yardim', time: at, until: at + PROPOSAL_MS,
          want: { good: 'gold', amount: round10(rivalLevel(empire, A, at) * 80) },
          text: `${lead(recall(empire, A.id, 'minnet', at))}Kıtlık halkımızı kırıyor. ${B.city} elini uzattı; sizden de bir avuç akçe bekliyoruz. Bu iyiliği unutmayız.`,
        })
      } else say('buyume', `${de(A.city)} yağmurlar geldi; kıtlık bitti, pazar yeniden doldu.`, [A.id])
      break
    case 'korsan':
      if (st.step === 1) say('catisma', `${A.ruler} korsan avına çıktı; ${sea} sularında kara bayraklı gemiler aranıyor.`, [A.id])
      else if (st.step === 2) say('catisma', `${A.city} donanması korsanları ${sea} açıklarında sıkıştırdı; ${da(B.ruler)} gemi gönderdi.`)
      else {
        say('baris', `${A.ruler} korsan reisini esir aldı; denizler biraz daha güvenli.`, [A.id])
        shiftPower(w, A.id, 1)
      }
      break
  }
}

function growth(empire: Empire, at: number) {
  for (const r of RIVALS) {
    const now = rivalLevel(empire, r, at), before = rivalLevel(empire, r, at - HOUR)
    if (now > before && now % 10 === 0) worldNews(empire, at, 'buyume', `${r.city} büyüyor: ${r.ruler} şehrini ${now}. seviyeye çıkardı.`, [r.id])
  }
}

/* ---------------------------------------------------- OYUNCUNUN CEVABI */

export function acceptProposal(source: Empire, id: string, now: number): { empire: Empire; error?: string } {
  const empire = advanceEmpire(source, now)
  const w = world(empire)
  const p = (w.proposals ?? []).find(x => x.id === id)
  if (!p) return { empire, error: 'Bu teklifin süresi doldu.' }
  const r = rivalById(p.rivalId)!
  const city = activeCity(empire), g = city.game
  const st = rivalState(empire, r.id)
  if (p.kind === 'anlasma' && p.treaty) {
    if (embassyLevel(empire) < 1) return { empire, error: 'Anlaşmayı imzalamak için bir şehrinde Elçilik gerekli.' }
    if (st.treaties.includes(p.treaty)) return { empire, error: 'Bu anlaşma zaten yürürlükte.' }
    st.treaties = [...st.treaties, p.treaty]
    relate(empire, r.id, 5)
    worldNews(empire, now, 'anlasma', `${city.name} ile ${r.city} ${TREATIES[p.treaty].name.toLocaleLowerCase('tr')} imzaladı.`, [r.id])
    logEvent(g, `${r.ruler} ile ${TREATIES[p.treaty].name.toLocaleLowerCase('tr')} imzalandı.`, now)
    if (p.treaty === 'baris') {
      empire.threats = (empire.threats ?? []).filter(t => t.npcId !== r.id || !!t.battle)
      empire.sieges = (empire.sieges ?? []).filter(x => x.rivalId !== r.id)
      if (!empire.sieges.length) delete empire.sieges
    }
  } else {
    const want = p.want
    if (p.give && w.deliveries.length >= MAX_DELIVERIES) return { empire, error: 'Limanlarda bekleyen yük çok; önce ambarlarda yer aç.' }
    if (want) {
      if (want.good === 'gold') {
        if (g.resources.gold < want.amount) return { empire, error: `${want.amount.toLocaleString('tr-TR')} akçe gerekli.` }
      } else {
        if (g.buildings.liman < 1) return { empire, error: 'Mal göndermek için bu şehirde Ticaret Limanı gerekli.' }
        const cap = idleMerchants(empire) * shipCargo(g)
        if (cap < want.amount) return { empire, error: `Boş ticaret gemilerin ${cap} mal taşır; bu teklif ${want.amount} ister.` }
        if (stockOf(g, want.good) < want.amount) return { empire, error: `Ambarda ${want.amount} ${goodName(want.good)} yok.` }
      }
      addGood(g, want.good, -want.amount)
    }
    if (p.give) {
      const eta = now + Math.round(seaMinutes(r.islandId, city.islandId) * 60_000 * travelFactor(g))
      w.deliveries = [...w.deliveries, { id: `d-${p.id}`, cityId: city.id, good: p.give.good, amount: p.give.amount, eta, from: r.city }]
    }
    if (p.kind === 'harac') {
      w.truce = { ...w.truce, [r.id]: now + TRUCE_MS }
      empire.threats = (empire.threats ?? []).filter(t => t.npcId !== r.id || !!t.battle)
      relate(empire, r.id, 10)
      logEvent(g, `${e(r.ruler)} haraç ödendi; bir gün saldırmayacak.`, now)
    } else if (p.kind === 'yardim') {
      relate(empire, r.id, 8)
      remember(empire, r.id, 'yardim', now)
      const war = warOf(empire, r.id)
      if (war) war.score += war.a === r.id ? 1 : -1
      logEvent(g, war ? `${r.city} savaş sandığına ${dealText(want!)} gönderildi.` : `${r.city} halkına ${dealText(want!)} yardım gönderildi.`, now)
    } else if (p.kind === 'hediye') {
      relate(empire, r.id, 3)
      logEvent(g, `${r.city} hediyesi yolda: ${dealText(p.give!)}.`, now)
    } else {
      relate(empire, r.id, 2)
      const goods = p.kind === 'satis' ? p.give! : want!
      worldNews(empire, now, 'ticaret', `${city.name} ile ${r.city} arasında ${dealText(goods)} el değiştirdi.`, [r.id])
      logEvent(g, p.kind === 'satis' ? `${den(r.city)} ${dealText(p.give!)} alındı; gemiler yolda.` : `${dealText(want!)} ${e(r.city)} satıldı; bedeli yolda.`, now)
    }
  }
  w.proposals = (w.proposals ?? []).filter(x => x.id !== id)
  if (!w.proposals.length) delete w.proposals
  return { empire }
}

export function declineProposal(source: Empire, id: string, now: number): { empire: Empire; error?: string } {
  const empire = advanceEmpire(source, now)
  const w = world(empire)
  const p = (w.proposals ?? []).find(x => x.id === id)
  if (!p) return { empire, error: 'Bu teklifin süresi doldu.' }
  const r = rivalById(p.rivalId)!
  if (p.kind === 'harac') {
    relate(empire, r.id, -8)
    remember(empire, r.id, 'red', now)
    mail(empire, now, r.ruler, 'Haraç reddedildi', 'Cevabınızı aldık. Kılıçlarımız da cevabınızı alacak.', r.id)
  } else if (p.kind === 'yardim') { relate(empire, r.id, -5); remember(empire, r.id, 'red', now) }
  else if (p.kind === 'anlasma') relate(empire, r.id, -2)
  w.proposals = (w.proposals ?? []).filter(x => x.id !== id)
  if (!w.proposals.length) delete w.proposals
  return { empire }
}

export function setPace(source: Empire, pace: Pace, now: number): { empire: Empire; error?: string } {
  const empire = advanceEmpire(source, now)
  if (!PACE_IDS.includes(pace)) return { empire, error: 'Bilinmeyen tempo.' }
  const w = world(empire)
  if (pace === 'normal') delete w.pace
  else w.pace = pace
  return { empire }
}

/* ---------------------------------------------------------- KAYIT DENETİMİ */

export function parseAi(w: World, bad: () => never) {
  const fin = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0
  const goods = new Set(Object.keys(FAIR_PRICE))
  const deal = (d: Deal | undefined) => d === undefined || (!!d && goods.has(d.good) && Number.isSafeInteger(d.amount) && d.amount > 0)
  if (w.pace !== undefined && !PACE_IDS.includes(w.pace)) bad()
  if (w.wars !== undefined && (!Array.isArray(w.wars) || w.wars.length > MAX_WARS)) bad()
  for (const x of w.wars ?? []) if (!x || typeof x.id !== 'string' || !rivalById(x.a) || !rivalById(x.b) || !fin(x.since) || !fin(x.until) || !Number.isInteger(x.score)) bad()
  if (w.news !== undefined && (!Array.isArray(w.news) || w.news.length > MAX_NEWS)) bad()
  for (const n of w.news ?? []) if (!n || typeof n.id !== 'string' || !fin(n.time) || typeof n.text !== 'string' || !Array.isArray(n.rivals) || !n.rivals.every(id => rivalById(id))) bad()
  for (const n of w.news ?? []) if (n.story !== undefined && (!n.story || typeof n.story.id !== 'string' || typeof n.story.title !== 'string' ||
      !Number.isInteger(n.story.step) || !Number.isInteger(n.story.of) || n.story.step < 1 || n.story.step > n.story.of)) bad()
  if (w.stories !== undefined && (!Array.isArray(w.stories) || w.stories.length > MAX_STORIES)) bad()
  if (w.lastStory !== undefined && !(w.lastStory in STORY_TITLES)) bad()
  for (const x of w.stories ?? []) if (!x || typeof x.id !== 'string' || !(x.kind in STORY_TITLES) || !rivalById(x.a) || !rivalById(x.b) ||
      !Number.isInteger(x.step) || x.step < 0 || x.step >= STORY_STEPS || !fin(x.next)) bad()
  if (w.proposals !== undefined && (!Array.isArray(w.proposals) || w.proposals.length > MAX_PROPOSALS)) bad()
  for (const p of w.proposals ?? []) {
    if (!p || typeof p.id !== 'string' || !rivalById(p.rivalId) || !(p.kind in PROPOSAL_NAMES) || !fin(p.time) || !fin(p.until) ||
        typeof p.text !== 'string' || !deal(p.give) || !deal(p.want) || (p.treaty !== undefined && !(p.treaty in TREATIES))) bad()
  }
  for (const key of ['power', 'truce'] as const) {
    const m = w[key]
    if (m !== undefined && (!m || typeof m !== 'object' || !Object.entries(m).every(([id, v]) => rivalById(id) && Number.isFinite(v) && (key === 'truce' ? v >= 0 : Math.abs(v) <= 5)))) bad()
  }
}
