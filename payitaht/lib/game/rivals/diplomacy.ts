import { UNITS, UNIT_IDS, capacity, counterSpy, logEvent } from '../engine'
import { type Troops } from '../battle'
import { activeCity, advanceEmpire, type CityRecord, type Empire } from '../empire'
import { pactHelpLevel } from '../pact'
import { busyAtWar, worldNews, PACES } from '../ai'
import { BONDS, EXPEL_COOLDOWN_MS, FACTIONS, type FactionId, HOUR, type MemoKind, RIVALS, type Rival, TREATIES, type TreatyId, isAlly, mail, peek, playerScore, recall, relate, remember, rivalById, rivalFleet, rivalGarrison, rivalLevel, rivalScore, rivalState, roll, world } from './core'

export function embassyLevel(empire: Empire) { return Math.max(...empire.cities.map(c => c.game.buildings.elcilik)) }
export function treatyCost(empire: Empire, r: Rival, now: number) { return 150 * rivalLevel(empire, r, now) }
function accepts(empire: Empire, r: Rival, kind: TreatyId) {
  const s = peek(empire, r.id)
  const liking = (r.style === 'tuccar' && kind === 'ticaret' ? 10 : 0) + (r.style === 'alim' && kind === 'kultur' ? 10 : 0) -
    (r.style === 'savasci' && kind === 'baris' ? 15 : 0) + (isAlly(empire, r.id) ? 15 : 0)
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
  if (kind === 'baris') {
    // Barış: yoldaki orduları döner, kuşatmaları kalkar.
    empire.threats = (empire.threats ?? []).filter(t => t.npcId !== rivalId || !!t.battle)
    empire.sieges = (empire.sieges ?? []).filter(x => x.rivalId !== rivalId)
    if (!empire.sieges.length) delete empire.sieges
  }
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
  const wound = gain > 0 && (s.memo ?? []).some(m => m.kind === 'yagma') ? ' Yağmanızı unutmadık, ama bu hediye yarayı biraz sarıyor.' : ''
  if (gain > 0) remember(empire, rivalId, 'hediye', now)
  mail(empire, now, r.ruler, 'Hediyeniz ulaştı', gain > 0 ? `${amount} akçelik hediyeniz için teşekkürler.${wound} (ilişki +${gain})` : 'Nezaketiniz için teşekkürler; ama bu hediye hazinemizde fark edilmedi.', rivalId)
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
  if (w.pact) return { empire, error: `Kendi ittifakın var (${w.pact.name}). Katılmak için önce onu dağıt.` }
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
  if (empire.world?.pact) {
    const L = Math.round(pactHelpLevel(empire, now))
    return L ? { mizrakci: 2 * L, yeniceri: L, okcu: L } : {}
  }
  const f = empire.world?.alliance
  if (!f) return {}
  const avg = Math.round(factionMembers(f).reduce((s, r) => s + rivalLevel(empire, r, now), 0) / factionMembers(f).length)
  return { mizrakci: 2 * avg, yeniceri: avg, okcu: avg }
}
/** Bu hükümdar sana saldırmaz mı (barış, ittifak, işgal ya da abluka)? */
export function pacified(empire: Empire, rivalId: string) {
  const r = rivalById(rivalId)
  if (!r) return false
  return peek(empire, rivalId).treaties.includes('baris') || isAlly(empire, rivalId) ||
    (empire.world?.pact?.stance[r.faction] === 'saldirmazlik') ||
    (empire.world?.truce?.[rivalId] ?? 0) > (empire.world?.slot ?? 0) * HOUR ||
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
  remember(empire, rivalId, 'yagma', at)
  for (const other of factionMembers(r.faction)) if (other.id !== rivalId) relate(empire, other.id, -5)
  // Dostunun kini, düşmanının minneti (aynı hatıra günde bir kez yazılır).
  for (const other of RIVALS) {
    if (other.id === rivalId) continue
    const bond = BONDS[other.id]
    const kind: MemoKind | null = bond?.friend === rivalId ? 'dostuna' : bond?.enemy === rivalId ? 'dusmanina' : null
    if (!kind) continue
    relate(empire, other.id, kind === 'dostuna' ? -6 : 6)
    if ((peek(empire, other.id).memo ?? []).some(m => m.kind === kind && m.of === rivalId && at - m.at < 24 * HOUR)) continue
    remember(empire, other.id, kind, at, rivalId)
    mail(empire, at, other.ruler, kind === 'dostuna' ? 'Dostumuza saldırdınız' : 'Düşmanımın düşmanı',
      kind === 'dostuna' ? `${r.city} bizim dostumuzdur. Ona kaldırılan kılıç bize de kalkmış sayılır.` : `${r.city} hazinesini boşalttığınızı duyduk. Düşmanımızın düşmanı dostumuzdur; divanımızın kapısı size açık.`, other.id)
  }
  // Düşmanımın düşmanı: bu hükümdarla savaşta olan rakip sevinir.
  for (const war of empire.world?.wars ?? []) {
    const foe = war.a === rivalId ? war.b : war.b === rivalId ? war.a : null
    if (foe) relate(empire, foe, 5)
  }
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
  const twice = (peek(empire, r.id).memo ?? []).filter(m => m.kind === 'yagma').length > 1
  mail(empire, at, r.ruler, 'İntikam', `${twice ? recall(empire, r.id, 'kin', at) + ' ' : ''}${city.name} bunun hesabını verecek. Ordumuz yola çıkıyor.`, r.id)
}
/**
 * SAVAŞ İLANI (Ikariam'da düşman oyuncunun saldırısı): düşman ya da savaşçı
 * huylu hükümdarlar kendiliğinden saldırır. Niyet huya ve ilişkiye göre:
 * denizci limanı abluka eder, savaşçı ya da kin güden şehri işgal eder,
 * diğerleri yağmalar. Şehirde casusu varsa ordusu daha iyi hazırlanır.
 */
export function declareWar(empire: Empire, r: Rival, city: CityRecord, at: number, intent: 'raid' | 'occupy' | 'blockade') {
  const L = rivalLevel(empire, r, at)
  const spy = (world(empire).spies ?? []).some(x => x.rivalId === r.id && x.cityId === city.id)
  const k = (intent === 'raid' ? 0.6 : 0.75) * (spy ? 1.15 : 1)
  const g = rivalGarrison(L, r.style)
  const troops: Troops = {}
  if (intent !== 'blockade') for (const id of UNIT_IDS) if (g[id] && UNITS[id].role !== 'support') troops[id] = Math.ceil(g[id] * k)
  const overseas = r.islandId !== city.islandId
  const fleet = overseas || intent === 'blockade'
    ? Object.fromEntries(Object.entries(rivalFleet(L, r.style)).map(([id, n]) => [id, Math.ceil((n ?? 0) * k)])) as Troops : {}
  const arriveAt = at + 2 * HOUR
  empire.threats = [...(empire.threats ?? []), { id: `war-${r.id}-${at}`, cityId: city.id, npcId: r.id, level: L, arriveAt, troops, fleet, intent }]
  const aim = intent === 'occupy' ? 'şehrinizi işgal etmek' : intent === 'blockade' ? 'limanınızı abluka etmek' : 'hazinenizi yağmalamak'
  const grudge = recall(empire, r.id, 'kin', at)
  mail(empire, at, r.ruler, 'Savaş ilanı', `${grudge ? grudge + ' ' : ''}${city.name} üzerine yürüyoruz; niyetimiz ${aim}. Ordumuz iki saate kapınızda.${spy ? ' Casuslarımız surlarınızı iyi tanıyor.' : ''}`, r.id)
  logEvent(city.game, `${r.ruler} savaş ilan etti! Ordusu iki saate ${city.name} kapısında (${aim.split(' ').pop()}).`, at)
  worldNews(empire, at, 'savas', `${r.ruler} (${r.city}) senin şehrin ${city.name} üzerine yürüyor.`, [r.id])
}
/** Saatlik dünya olayı: düşman bir hükümdar savaş ilan eder mi? */
export function considerWar(empire: Empire, at: number, s: number) {
  if ((empire.threats ?? []).some(t => rivalById(t.npcId)) || (empire.sieges ?? []).length) return
  const w = world(empire)
  const pace = PACES[w.pace ?? 'normal']
  const cities = empire.cities.filter(c => c.game.buildings.divan >= pace.warDivan && !(empire.threats ?? []).some(t => t.cityId === c.id))
  if (!cities.length) return
  // Kışkırtılmamış savaşçı hükümdarlar dünyanın ilk günlerinde saldırmaz (hareketli tempoda bekleme yok).
  const seasoned = at - w.start >= pace.graceHours * HOUR
  // Başka bir rakiple savaşan hükümdarın ordusu cephededir.
  const cands = RIVALS.filter(r => !pacified(empire, r.id) && !isAlly(empire, r.id) && !busyAtWar(empire, r.id) &&
    (peek(empire, r.id).relation <= -10 || w.pact?.stance[r.faction] === 'savas' || (r.style === 'savasci' && seasoned && peek(empire, r.id).relation <= 0)))
    .sort((a, b) => peek(empire, a.id).relation - peek(empire, b.id).relation)
  for (const r of cands) {
    const rel = peek(empire, r.id).relation
    const spyCity = cities.find(c => (w.spies ?? []).some(x => x.rivalId === r.id && x.cityId === c.id))
    const chance = 0.1 + (rel <= -40 ? 0.2 : rel <= -10 ? 0.1 : 0) + (r.style === 'savasci' ? 0.06 : 0) + (spyCity ? 0.1 : 0)
    if (roll(`war-${r.id}-${s}`) >= chance) continue
    const city = spyCity ?? cities[Math.floor(roll(`warc-${r.id}-${s}`) * cities.length)]
    const intent = r.style === 'denizci' && city.game.buildings.liman > 0 ? 'blockade'
      : r.style === 'savasci' || rel <= -40 ? 'occupy' : 'raid'
    declareWar(empire, r, city, at, intent)
    return
  }
}

/** GİZLİ SIĞINAK: şehirdeki yabancı casusları kovmayı dener (yarım saatte bir). */
export function expelSpies(source: Empire, cityId: string, now: number): { empire: Empire; error?: string } {
  const empire = advanceEmpire(source, now)
  const city = empire.cities.find(c => c.id === cityId)
  const w = world(empire)
  if (!city) return { empire, error: 'Şehir bulunamadı.' }
  if (city.game.buildings.siginak < 1) return { empire, error: 'Yabancı casusları bulmak için Gizli Sığınak gerekli.' }
  const here = (w.spies ?? []).filter(x => x.cityId === cityId)
  if (!here.length) return { empire, error: 'Bu şehirde bilinen yabancı casus yok.' }
  const last = w.expelAt?.[cityId] ?? 0
  if (now < last + EXPEL_COOLDOWN_MS) return { empire, error: `Muhafızlar yeniden arama yapmak için ${Math.ceil((last + EXPEL_COOLDOWN_MS - now) / 60_000)} dk bekliyor.` }
  w.expelAt = { ...(w.expelAt ?? {}), [cityId]: now }
  const chance = Math.min(0.95, 0.4 + counterSpy(city.game))
  const caught = here.filter(x => roll(`expel-${x.id}-${now}`) < chance)
  w.spies = (w.spies ?? []).filter(x => !caught.includes(x))
  for (const x of caught) {
    relate(empire, x.rivalId, -3)
    mail(empire, now, 'Gizli Sığınak', 'Casus kovuldu', `${rivalById(x.rivalId)?.ruler ?? 'Bir hükümdar'} hesabına çalışan casus ${city.name} şehrinden kovuldu.`)
  }
  logEvent(city.game, caught.length ? `${caught.length} yabancı casus yakalanıp kovuldu.` : 'Yabancı casuslar muhafızlardan kaçtı; saklanmaya devam ediyorlar.', now)
  return caught.length ? { empire } : { empire, error: 'Casuslar kaçtı; biraz sonra yeniden dene.' }
}

/** İşgal / abluka saatlik haracı. */
export function stationTribute(empire: Empire, rivalId: string, kind: 'occupy' | 'blockade', now: number) {
  const r = rivalById(rivalId)
  return r ? rivalLevel(empire, r, now) * (kind === 'occupy' ? 90 : 50) : 0
}

/* ------------------------------------------------------------------ PAZAR */
