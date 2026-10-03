import { SHOWS, SHOW_IDS, emptyShows, showLength, showCooldownMs, showFavor, type ShowId } from '../theatre'
import { GODS, GOD_IDS, OFFER_RATE, patronChangeMs, powerRestMs, lutufCap, type GodId } from '../gods'
import { GUILDS, GUILD_IDS, GUILD_MAX, PATRON_COOLDOWN_MS, devotionFor, guildLevel, patronSlots, type GuildId } from '../guilds'
import { isRoadCell } from '../layout'
import { ANARCHY_MS, BUILDING_IDS, type BuildingId, COAST_FACING_IDS, type CoastBuildingId, type CoastFacing, FOREST_MAX_LEVEL, GOVERNMENTS, GOVERNMENT_COOLDOWN_MS, GOVERNMENT_IDS, type Game, type Good, type GovernmentId, LUXURY_IDS, LUXURY_NAMES, type Luxury, MIRACLES, MIRACLE_COOLDOWN_MS, RESEARCH_BRANCHES, RESOURCE_IDS, type ResearchBranch, type ResearchId, WONDER_MAX, WORKER_IDS, type WorkerId, forestUpgradeCost, governmentCost, miracleCost, miracleMinutes, takesPlot, wonderCost, zoneOf } from './types'
import { BUILDINGS, OBJECTIVES, RESEARCH, UNITS, type UnitId } from './data'
import { GOOD_NAMES, MINE_MAX_LEVEL, addGood, capacity, clampForest, clampMiners, clampPriests, clampWorkers, cost, drillsAt, duration, exchangeLimit, exchangeRate, futureCost, futureReason, goodAmount, logEvent, luxuryCost, maxPopulation, merchantBuyPrice, merchantLimit, merchantSellPrice, mineUpgradeCost, payLuxury, population, rates, soldiers, unitLuxuryCost, upgradeCost, upgradeReason, workerCapacity } from './economy'
import { advance, buildReason, freePlots, objectiveDone, recruitReason, researchReason, unitCost, unitDuration } from './rules'

export type Command =
  | { type: 'build'; id: BuildingId; plot?: number }
  | { type: 'research'; id: ResearchId }
  | { type: 'claim'; id: string }
  | { type: 'workers'; id: WorkerId; value: number }
  | { type: 'recruit'; id: UnitId; count: number }
  /** Bir yol hucresini ac/kapat (oyuncu yolu kendi doser). */
  | { type: 'road'; cell: string }
  /** Bir binayi yatayda aynala (sag-sol cevir). Kara binalari icin. */
  | { type: 'flip'; id: BuildingId }
  /** Liman/Tersane icin gorsel yon: sol / duz / sag. */
  | { type: 'face'; id: CoastBuildingId; facing: CoastFacing }
  /** Kurulu bir binayi BOS bir arsaya tasi. */
  | { type: 'move'; id: BuildingId; plot: number }
  /** Ada madenine işçi ata. */
  | { type: 'miners'; value: number }
  /** Ada madenine kereste bağışla (maden seviyesi yükselir). */
  | { type: 'donate'; amount: number }
  /** Çarşıdaki tüccardan lüks kaynak al ya da sat. */
  | { type: 'trade'; id: Luxury; side: 'buy' | 'sell'; amount: number }
  /** Cami'ye imam ata. */
  | { type: 'priests'; value: number }
  /** Adanın harikasına kereste bağışla. */
  | { type: 'wonder'; amount: number }
  /** Harikanın mucizesini çağır. */
  | { type: 'miracle' }
  /** Ahi Tekkesi: himmeti bir loncaya ada / loncayı himayeye al ya da bırak. */
  | { type: 'devote'; guild: GuildId; amount: number }
  | { type: 'patron'; guild: GuildId }
  /** Ongun Mabedi: hami tanrı seç, sunu adak, kudret çağır. */
  | { type: 'god'; god: GodId }
  | { type: 'offering'; good: 'gold' | 'wood' | 'stone' | Luxury; amount: number }
  | { type: 'invoke' }
  | { type: 'show'; show: ShowId }
  /** Tophane'de bir birliğin saldırısını ya da zırhını yükselt. */
  | { type: 'upgrade'; id: UnitId; stat: 'atk' | 'def' }
  /** Bir dalın "Gelecek" araştırmasını bir seviye ilerlet. */
  | { type: 'future'; branch: ResearchBranch }
  /** Kara Pazar'da bir malı başka bir mala çevir. */
  | { type: 'exchange'; from: Good; to: Good; amount: number }
  /** Ada ormanına işçi ata / kereste bağışla. */
  | { type: 'foresters'; value: number }
  | { type: 'forestDonate'; amount: number }
  /** Kahvehane'de ikram edilecek seviye. */
  | { type: 'tavern'; value: number }
  /** Yönetim biçimini değiştir. */
  | { type: 'government'; id: GovernmentId }
  /** Bir binayı bir seviye yık. */
  | { type: 'demolish'; id: BuildingId; all?: boolean }
  /** Deneyler: kristali ilime çevir (100'lük partiler). */
  | { type: 'experiment'; batches: number }
export function execute(source: Game, command: Command, now: number): { game: Game; error?: string } {
  const g = advance(source, now)
  if (command.type === 'build') {
    const reason = buildReason(g, command.id)
    if (reason) return { game: g, error: reason }
    /*
     * YENI bir yapi bir ARSAYA kurulur.
     *
     * Oyuncu arsayi secebilir; secmediyse ilk bos arsa kullanilir. Secilen
     * arsa doluysa komut reddedilir - aksi halde iki yapi ust uste cizilirdi.
     */
    if (takesPlot(command.id) && g.placement[command.id] === null) {
      const free = freePlots(g, zoneOf(command.id))
      const plot = command.plot ?? free[0]
      if (plot === undefined || !free.includes(plot)) {
        return { game: g, error: zoneOf(command.id) === 'liman' ? 'Bu yapı limana kurulur. Boş bir iskele seç.' : 'Bu arsa dolu. Başka bir arsa seç.' }
      }
      g.placement[command.id] = plot
    }
    const c = cost(g, command.id)
    for (const r of RESOURCE_IDS) g.resources[r] -= c[r]
    payLuxury(g, luxuryCost(g, command.id))
    /*
     * Sirada bekleyen isin sayaci, KENDINDEN ONCEKI bittiginde baslar.
     * Baslangici "now" yapmak, sirayla eklenen uc isin ayni anda bitmesi
     * demek olurdu.
     */
    const start = Math.max(now, g.queue[g.queue.length - 1]?.end ?? now)
    g.queue.push({ id: command.id, kind: 'build', start, end: start + duration(g, command.id) * 1000 })
    logEvent(g, g.queue.length > 1
      ? `${BUILDINGS[command.id].name} inşaat sırasına alındı.`
      : `${BUILDINGS[command.id].name} için ustalar çalışmaya başladı.`, now)
  } else if (command.type === 'workers') {
    /*
     * Isci dagitimi: istenen sayi once kapasiteye, sonra BOSTAKI halka gore
     * budanir. Basarisiz bir komut hata dondurmez - kaydirma cubugunu ucuna
     * dayamak bir hata degildir, oyuncu zaten siniri gorur.
     */
    const others = WORKER_IDS.filter(w => w !== command.id).reduce((sum, w) => sum + g.workers[w], 0)
    const want = Number.isFinite(command.value) ? Math.max(0, Math.floor(command.value)) : 0
    g.workers[command.id] = Math.min(want, workerCapacity(g, command.id), Math.max(0, population(g) - soldiers(g) - others))
  } else if (command.type === 'recruit') {
    const reason = recruitReason(g, command.id, command.count)
    if (reason) return { game: g, error: reason }
    const c = unitCost(command.id, command.count, g)
    for (const r of RESOURCE_IDS) g.resources[r] -= c[r]
    payLuxury(g, unitLuxuryCost(command.id, command.count, g))
    // Aynı yapıdaki önceki emir bitince başlar; diğer yapılar paralel yürür.
    const start = Math.max(now, ...drillsAt(g, UNITS[command.id].home).map(j => j.end))
    g.drills.push({ id: command.id, kind: 'drill', start, end: start + unitDuration(g, command.id, command.count) * 1000, count: command.count })
    logEvent(g, start > now ? `${command.count} ${UNITS[command.id].name} eğitim sırasına girdi.` : `${command.count} ${UNITS[command.id].name} için eğitim başladı.`, now)
  } else if (command.type === 'research') {
    const reason = researchReason(g, command.id)
    if (reason) return { game: g, error: reason }
    g.resources.knowledge -= RESEARCH[command.id].cost
    g.study = { id: command.id, kind: 'research', start: now, end: now + RESEARCH[command.id].duration * 1000 }
    logEvent(g, `${RESEARCH[command.id].name} araştırması başladı.`, now)
  } else if (command.type === 'road') {
    /*
     * Yol dosemek/silmek SESSIZ ve BEDAVA: oyuncu haritada bos zemine dokunup
     * yol agini serbestce cizer. Gecersiz hucre yok sayilir.
     */
    if (!isRoadCell(command.cell)) return { game: g }
    g.roads = g.roads.includes(command.cell)
      ? g.roads.filter(c => c !== command.cell)
      : [...g.roads, command.cell]
  } else if (command.type === 'flip') {
    // Kara binalarini yatayda aynala. Kiyi yapilari artik 3 yonlu facing kullanir.
    if ((COAST_FACING_IDS as readonly string[]).includes(command.id)) return { game: g }
    g.flips = g.flips.includes(command.id)
      ? g.flips.filter(id => id !== command.id)
      : [...g.flips, command.id]
  } else if (command.type === 'face') {
    if (!(COAST_FACING_IDS as readonly string[]).includes(command.id)) return { game: g, error: 'Bu yapı kıyı yönü kullanmıyor.' }
    if (!(['left', 'straight', 'right'] as const).includes(command.facing)) return { game: g, error: 'Geçersiz yapı yönü.' }
    g.coastFacing = { ...g.coastFacing, [command.id]: command.facing }
    // Eski save'lerdeki coast flip state'i yeni facing ile cakismasin.
    g.flips = g.flips.filter(id => id !== command.id)
  } else if (command.type === 'miners') {
    g.mine.miners = Number.isFinite(command.value) ? Math.max(0, Math.floor(command.value)) : 0
    g.mine.miners = clampMiners(g)
  } else if (command.type === 'donate') {
    const amount = Math.floor(command.amount)
    if (!Number.isSafeInteger(amount) || amount <= 0) return { game: g, error: 'Geçersiz bağış.' }
    if (g.mine.level >= MINE_MAX_LEVEL) return { game: g, error: 'Maden en yüksek seviyede.' }
    if (g.resources.wood < amount) return { game: g, error: 'Bu kadar kereste yok.' }
    g.resources.wood -= amount
    g.mine.wood += amount
    // Birikmiş bağış eşiği geçtikçe maden seviye atlar (Ikariam'daki ada bağışı).
    while (g.mine.level < MINE_MAX_LEVEL && g.mine.wood >= mineUpgradeCost(g.mine.level)) {
      g.mine.wood -= mineUpgradeCost(g.mine.level)
      g.mine.level += 1
      logEvent(g, `${LUXURY_NAMES[g.mine.specialty]} madeni ${g.mine.level}. seviyeye ulaştı.`, now)
    }
    if (g.mine.level >= MINE_MAX_LEVEL) { g.resources.wood += g.mine.wood; g.mine.wood = 0 }
  } else if (command.type === 'trade') {
    const amount = Math.floor(command.amount)
    if (!LUXURY_IDS.includes(command.id) || !Number.isSafeInteger(amount) || amount <= 0) return { game: g, error: 'Geçersiz miktar.' }
    if (g.buildings.carsi < 1) return { game: g, error: 'Tüccar için önce Çarşı kur.' }
    if (amount > merchantLimit(g)) return { game: g, error: `Tüccar tek seferde en fazla ${merchantLimit(g)} birim işler.` }
    if (command.side === 'buy') {
      const price = Math.ceil(amount * merchantBuyPrice(g))
      if (g.resources.gold < price) return { game: g, error: `${price} akçe gerekli.` }
      if (g.luxury[command.id] + amount > capacity(g)) return { game: g, error: 'Ambarda yer yok.' }
      g.resources.gold -= price
      g.luxury[command.id] += amount
      logEvent(g, `Tüccardan ${amount} ${LUXURY_NAMES[command.id]} alındı (${price} akçe).`, now)
    } else {
      if (g.luxury[command.id] < amount) return { game: g, error: `Bu kadar ${LUXURY_NAMES[command.id]} yok.` }
      g.luxury[command.id] -= amount
      g.resources.gold = Math.min(capacity(g), g.resources.gold + Math.floor(amount * merchantSellPrice(g)))
      logEvent(g, `Tüccara ${amount} ${LUXURY_NAMES[command.id]} satıldı.`, now)
    }
  } else if (command.type === 'priests') {
    g.temple.priests = Number.isFinite(command.value) ? Math.max(0, Math.floor(command.value)) : 0
    g.temple.priests = clampPriests(g)
  } else if (command.type === 'wonder') {
    const amount = Math.floor(command.amount)
    if (!Number.isSafeInteger(amount) || amount <= 0) return { game: g, error: 'Geçersiz bağış.' }
    if (g.temple.wonderLevel >= WONDER_MAX) return { game: g, error: 'Harika en yüksek seviyede.' }
    if (g.resources.wood < amount) return { game: g, error: 'Bu kadar kereste yok.' }
    g.resources.wood -= amount
    g.temple.wonderWood += amount
    while (g.temple.wonderLevel < WONDER_MAX && g.temple.wonderWood >= wonderCost(g.temple.wonderLevel)) {
      g.temple.wonderWood -= wonderCost(g.temple.wonderLevel)
      g.temple.wonderLevel += 1
      logEvent(g, `${MIRACLES[g.temple.wonder].wonder} ${g.temple.wonderLevel}. seviyeye yükseldi.`, now)
    }
  } else if (command.type === 'miracle') {
    const t = g.temple
    if (g.buildings.cami < 1) return { game: g, error: 'Mucize için önce Cami kur.' }
    if (t.wonderLevel < 1) return { game: g, error: 'Adanın harikası henüz kurulmadı. Kereste bağışla.' }
    if (t.active && now < t.until) return { game: g, error: 'Mucize zaten etkin.' }
    if (now < t.cooldownUntil) return { game: g, error: 'Harika dinleniyor; bir süre sonra tekrar dene.' }
    if (t.faith < miracleCost(t.wonderLevel)) return { game: g, error: `${miracleCost(t.wonderLevel)} inanç gerekli. İmamların biriktiriyor.` }
    t.faith -= miracleCost(t.wonderLevel)
    t.active = t.wonder
    t.until = now + miracleMinutes(t.wonderLevel) * 60_000
    t.cooldownUntil = t.until + MIRACLE_COOLDOWN_MS * (g.research.includes('din') ? 2 / 3 : 1)
    logEvent(g, `${MIRACLES[t.wonder].name} mucizesi başladı: ${MIRACLES[t.wonder].effect(t.wonderLevel)}.`, now)
  } else if (command.type === 'devote') {
    if (g.buildings.tekke < 1) return { game: g, error: 'Önce Ahi Tekkesi kur.' }
    if (!GUILD_IDS.includes(command.guild)) return { game: g, error: 'Bilinmeyen lonca.' }
    const amount = Math.floor(Math.min(command.amount, g.guilds.himmet, Math.max(0, devotionFor(GUILD_MAX) - g.guilds.devotion[command.guild])))
    if (!Number.isFinite(amount) || amount <= 0) return { game: g, error: g.guilds.himmet < 1 ? 'Adanacak himmet yok; tekke biriktiriyor.' : 'Bu lonca en yüksek derecede.' }
    const before = guildLevel(g.guilds.devotion[command.guild])
    g.guilds.himmet -= amount
    g.guilds.devotion[command.guild] += amount
    const after = guildLevel(g.guilds.devotion[command.guild])
    if (after > before) logEvent(g, `${GUILDS[command.guild].name} loncası ${after}. dereceye yükseldi.`, now)
  } else if (command.type === 'patron') {
    if (g.buildings.tekke < 1) return { game: g, error: 'Önce Ahi Tekkesi kur.' }
    if (!GUILD_IDS.includes(command.guild)) return { game: g, error: 'Bilinmeyen lonca.' }
    if (now < g.guilds.changedAt + PATRON_COOLDOWN_MS) return { game: g, error: 'Loncalar yeni düzene alışıyor; biraz sonra tekrar dene.' }
    const on = g.guilds.patrons.includes(command.guild)
    if (!on && g.guilds.patrons.length >= patronSlots(g.buildings.tekke)) return { game: g, error: `Tekke ${patronSlots(g.buildings.tekke)} loncayı himaye edebilir. Birini bırak ya da Tekke'yi yükselt.` }
    g.guilds.patrons = on ? g.guilds.patrons.filter(x => x !== command.guild) : [...g.guilds.patrons, command.guild]
    g.guilds.changedAt = now
    logEvent(g, on ? `${GUILDS[command.guild].name} himayeden çıktı.` : `${GUILDS[command.guild].name} loncası himayene girdi.`, now)
  } else if (command.type === 'god') {
    const t = g.gods
    if (g.buildings.mabet < 1) return { game: g, error: 'Önce Ongun Mabedi kur.' }
    if (!GOD_IDS.includes(command.god)) return { game: g, error: 'Bilinmeyen tanrı.' }
    if (t.patron === command.god) return { game: g, error: `${GODS[command.god].name} zaten hamin.` }
    if (t.patron && now < t.changedAt + patronChangeMs(g)) return { game: g, error: 'Tanrılar küsebilir: hamini değiştirmek için bekle.' }
    t.patron = command.god
    t.changedAt = now
    logEvent(g, `Şehir ${GODS[command.god].name} tanrısını hami seçti.`, now)
  } else if (command.type === 'offering') {
    if (g.buildings.mabet < 1) return { game: g, error: 'Önce Ongun Mabedi kur.' }
    const lux = (LUXURY_IDS as readonly string[]).includes(command.good)
    const have = lux ? g.luxury[command.good as Luxury] : (command.good === 'gold' || command.good === 'wood' || command.good === 'stone') ? g.resources[command.good] : -1
    if (have < 0) return { game: g, error: 'Bu mal sunulamaz.' }
    const rate = lux ? OFFER_RATE.luxury : OFFER_RATE[command.good as 'gold' | 'wood' | 'stone']
    const room = Math.max(0, lutufCap(g) - g.gods.lutuf)
    const amount = Math.floor(Math.min(command.amount, have, room * rate))
    if (!Number.isFinite(amount) || amount < rate) return { game: g, error: room < 1 ? 'Mabet lütufla dolu.' : 'Sunu için yeterli mal yok.' }
    if (lux) g.luxury[command.good as Luxury] -= amount
    else g.resources[command.good as 'gold' | 'wood' | 'stone'] -= amount
    g.gods.lutuf += amount / rate
  } else if (command.type === 'show') {
    const lv = g.buildings.karagoz
    if (lv < 1) return { game: g, error: 'Önce Karagöz Perdesi kur.' }
    if (!SHOW_IDS.includes(command.show)) return { game: g, error: 'Bilinmeyen gösteri.' }
    const sh = g.shows ?? emptyShows()
    if (sh.active && now < sh.active.until) return { game: g, error: `${SHOWS[sh.active.id].name} sürüyor.` }
    if (now < sh.readyAt) return { game: g, error: 'Perde dinleniyor; yeni gösteri için bekle.' }
    if (command.show === 'tanrisal' && g.buildings.mabet < 1) return { game: g, error: 'Tanrısal gösterim için Ongun Mabedi gerekli.' }
    g.shows = { active: { id: command.show, until: now + showLength(g) }, readyAt: now + showCooldownMs(lv) }
    if (command.show === 'tanrisal') g.gods.lutuf = Math.min(lutufCap(g), g.gods.lutuf + showFavor(lv))
    logEvent(g, `Karagöz Perdesi: "${SHOWS[command.show].play}" sahnelendi (${SHOWS[command.show].name}).`, now)
  } else if (command.type === 'invoke') {
    const t = g.gods
    if (g.buildings.mabet < 1) return { game: g, error: 'Önce Ongun Mabedi kur.' }
    if (!t.patron) return { game: g, error: 'Önce bir hami tanrı seç.' }
    const god = GODS[t.patron]
    if (now < (t.rest[t.patron] ?? 0)) return { game: g, error: `${god.name} dinleniyor.` }
    if (t.lutuf < god.cost) return { game: g, error: `${god.cost} lütuf gerekli.` }
    if (t.patron === 'ulgen' && !g.study) return { game: g, error: 'Süren bir araştırma yok.' }
    if (t.patron === 'kayra' && !g.queue.length) return { game: g, error: 'Süren bir inşaat yok.' }
    t.lutuf -= god.cost
    t.rest[t.patron] = now + powerRestMs(g)
    if (t.patron === 'tengri') {
      const r = rates(g)
      for (const k of RESOURCE_IDS) g.resources[k] = Math.min(capacity(g), g.resources[k] + Math.max(0, r[k]) * 60)
    } else if (t.patron === 'umay') {
      g.citizens = maxPopulation(g)
    } else if (t.patron === 'ulgen' && g.study) {
      g.study.end = now + Math.max(0, g.study.end - now) / 2
    } else if (t.patron === 'kayra') {
      const first = g.queue[0]
      const cut = Math.max(0, first.end - Math.max(now, first.start)) / 2
      g.queue = g.queue.map((j, i) => i === 0 ? { ...j, end: j.end - cut } : { ...j, start: j.start - cut, end: j.end - cut })
    } else if (god.minutes) {
      t.buff = { god: t.patron, until: now + god.minutes * 60_000 }
    }
    logEvent(g, `${god.name} kudretini gösterdi: ${god.power}. ${god.powerText}`, now)
  } else if (command.type === 'upgrade') {
    const reason = upgradeReason(g, command.id, command.stat)
    if (reason) return { game: g, error: reason }
    const c = upgradeCost(g, command.id, command.stat)
    g.resources.gold -= c.gold
    g.luxury.kristal -= c.kristal
    const u = g.upgrades[command.id] ?? { atk: 0, def: 0 }
    u[command.stat] += 1
    g.upgrades = { ...g.upgrades, [command.id]: u }
    logEvent(g, `${UNITS[command.id].name} ${command.stat === 'atk' ? 'saldırısı' : 'zırhı'} ${u[command.stat]}. seviyeye çıktı.`, now)
  } else if (command.type === 'future') {
    const reason = futureReason(g, command.branch)
    if (reason) return { game: g, error: reason }
    g.resources.knowledge -= futureCost(g.future[command.branch])
    g.future = { ...g.future, [command.branch]: g.future[command.branch] + 1 }
    logEvent(g, `${RESEARCH_BRANCHES.find(b => b.key === command.branch)!.title} Geleceği ${g.future[command.branch]}. seviyeye ulaştı.`, now)
  } else if (command.type === 'foresters') {
    g.forest.workers = Number.isFinite(command.value) ? Math.max(0, Math.floor(command.value)) : 0
    g.forest.workers = clampForest(g)
    g.temple.priests = clampPriests(g)
  } else if (command.type === 'forestDonate') {
    const amount = Math.floor(command.amount)
    if (!Number.isSafeInteger(amount) || amount <= 0) return { game: g, error: 'Geçersiz bağış.' }
    if (g.forest.level >= FOREST_MAX_LEVEL) return { game: g, error: 'Orman en yüksek seviyede.' }
    if (g.resources.wood < amount) return { game: g, error: 'Bu kadar kereste yok.' }
    g.resources.wood -= amount
    g.forest.wood += amount
    g.stats.donated += amount
    while (g.forest.level < FOREST_MAX_LEVEL && g.forest.wood >= forestUpgradeCost(g.forest.level)) {
      g.forest.wood -= forestUpgradeCost(g.forest.level)
      g.forest.level += 1
      logEvent(g, `Ada ormanı ${g.forest.level}. seviyeye ulaştı.`, now)
    }
    if (g.forest.level >= FOREST_MAX_LEVEL) { g.resources.wood += g.forest.wood; g.forest.wood = 0 }
  } else if (command.type === 'tavern') {
    if (!Number.isFinite(command.value)) return { game: g, error: 'Geçersiz seviye.' }
    g.tavern = Math.max(0, Math.min(g.buildings.kahvehane, Math.floor(command.value)))
  } else if (command.type === 'government') {
    if (!GOVERNMENT_IDS.includes(command.id)) return { game: g, error: 'Bilinmeyen yönetim biçimi.' }
    if (!g.research.includes('devlet')) return { game: g, error: 'Devlet Nizamı araştırması gerekli.' }
    if (g.government.id === command.id) return { game: g, error: 'Zaten bu yönetim biçimi yürürlükte.' }
    if (g.government.changedAt && now < g.government.changedAt + GOVERNMENT_COOLDOWN_MS) {
      return { game: g, error: 'Yönetim yakın zamanda değişti; halk bir süre daha yeni düzene alışmalı.' }
    }
    if (g.resources.gold < governmentCost(g)) return { game: g, error: `${governmentCost(g)} akçe gerekli.` }
    g.resources.gold -= governmentCost(g)
    g.government = { id: command.id, changedAt: now, anarchyUntil: now + ANARCHY_MS }
    logEvent(g, `${GOVERNMENTS[command.id].name} ilan edildi. ${ANARCHY_MS / 60_000} dakika kargaşa sürecek.`, now)
  } else if (command.type === 'demolish') {
    const id = command.id
    if (!BUILDING_IDS.includes(id)) return { game: g, error: 'Bilinmeyen yapı.' }
    if (id === 'divan') return { game: g, error: 'Divanhane yıkılamaz.' }
    if (g.buildings[id] < 1) return { game: g, error: 'Bu yapı kurulu değil.' }
    if (g.queue.some(job => job.id === id)) return { game: g, error: 'İnşaat sırasındaki yapı yıkılamaz.' }
    if (drillsAt(g, id).length) return { game: g, error: 'Burada eğitim sürüyor; önce bitmesini bekle.' }
    g.buildings[id] = command.all ? 0 : g.buildings[id] - 1
    if (g.buildings[id] === 0 && takesPlot(id)) {
      g.placement[id] = null
      g.flips = g.flips.filter(f => f !== id)
    }
    g.workers = clampWorkers(g)
    g.tavern = g.tavern === undefined ? undefined : Math.min(g.tavern, g.buildings.kahvehane)
    g.temple.priests = clampPriests(g)
    logEvent(g, g.buildings[id] ? `${BUILDINGS[id].name} ${g.buildings[id]}. seviyeye indirildi.` : `${BUILDINGS[id].name} yıkıldı.`, now)
  } else if (command.type === 'experiment') {
    const batches = Math.floor(command.batches)
    if (!g.research.includes('deney')) return { game: g, error: 'Deneyler araştırması gerekli.' }
    if (!Number.isSafeInteger(batches) || batches <= 0 || batches > 50) return { game: g, error: 'Geçersiz miktar.' }
    if (g.luxury.kristal < batches * 100) return { game: g, error: `${batches * 100} kristal gerekli.` }
    g.luxury.kristal -= batches * 100
    g.resources.knowledge = Math.min(capacity(g), g.resources.knowledge + batches * 150)
    logEvent(g, `Medrese deneyleri: ${batches * 100} kristal → ${batches * 150} ilim.`, now)
  } else if (command.type === 'exchange') {
    const amount = Math.floor(command.amount)
    const goods = [...RESOURCE_IDS, ...LUXURY_IDS] as Good[]
    if (!goods.includes(command.from) || !goods.includes(command.to) || command.from === command.to || !Number.isSafeInteger(amount) || amount <= 0) {
      return { game: g, error: 'Geçersiz takas.' }
    }
    if (g.buildings.kara_pazar < 1) return { game: g, error: 'Takas için Kara Pazar kur.' }
    if (amount > exchangeLimit(g)) return { game: g, error: `Kara Pazar tek seferde en fazla ${exchangeLimit(g)} birim takas eder.` }
    if (goodAmount(g, command.from) < amount) return { game: g, error: 'Bu kadar mal yok.' }
    const got = Math.floor(amount / exchangeRate(g))
    if (goodAmount(g, command.to) + got > capacity(g)) return { game: g, error: 'Ambarda yer yok.' }
    addGood(g, command.from, -amount)
    addGood(g, command.to, got)
    logEvent(g, `Kara Pazar: ${amount} ${GOOD_NAMES[command.from]} → ${got} ${GOOD_NAMES[command.to]}.`, now)
  } else if (command.type === 'move') {
    /*
     * Kurulu bir binayi BOS bir arsaya tasi. Hedef arsa bos ve ayni bolgede
     * olmali; degilse komut reddedilir (ust uste bina cizilmez).
     */
    if (g.placement[command.id] === null) return { game: g, error: 'Bu yapı henüz kurulmadı.' }
    if (g.placement[command.id] === command.plot) return { game: g } // ayni yer: sessiz
    if (!freePlots(g, zoneOf(command.id)).includes(command.plot)) return { game: g, error: 'Bu arsa dolu. Başka bir arsa seç.' }
    g.placement[command.id] = command.plot
    logEvent(g, `${BUILDINGS[command.id].name} yeni arsasına taşındı.`, now)
  } else {
    const objective = OBJECTIVES.find(o => o.id === command.id)
    if (!objective || !objectiveDone(g, objective.id) || g.claimed.includes(objective.id)) return { game: g, error: 'Bu ödül henüz alınamaz veya zaten alındı.' }
    g.claimed.push(objective.id)
    g.resources.gold = Math.min(capacity(g), g.resources.gold + objective.reward)
    logEvent(g, `${objective.title}: ${objective.reward} akçe ödülü alındı.`, now)
  }
  return { game: g }
}
