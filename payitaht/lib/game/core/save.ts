import { SHOW_IDS, type Shows } from '../theatre'
import { GOD_IDS, emptyGods, type GodId, type Gods } from '../gods'
import { GUILD_IDS, emptyGuilds, type Guilds } from '../guilds'
import { SLOTS, isRoadCell } from '../layout'
import { BUILDING_IDS, type BuildingId, COAST_FACING_IDS, type CoastFacing, type CoastFacings, FOREST_MAX_LEVEL, GOVERNMENT_IDS, type Game, type Government, type IslandForest, type IslandMine, type Job, LUXURY_IDS, type LuxuryStock, MIRACLE_IDS, PLOTS, QUEUE_LIMIT, RESEARCH_BRANCHES, RESEARCH_IDS, RESOURCE_IDS, type ResearchBranch, type ResearchId, type Resources, type Temple, WONDER_MAX, WORKERS_PER_LEVEL, WORKER_IDS, type WorkerId, takesPlot, zoneOf } from './types'
import { type Army, OBJECTIVES, UNIT_IDS, type UnitId } from './data'
import { MINE_MAX_LEVEL, clampWorkers, maxPopulation, soldiers } from './economy'
import { MAX_LEVEL } from './rules'

/**
 * v1 kaydini v2'ye tasir.
 *
 * v1'de yapi konumlari SABITTI (her yapinin katalogda tek bir x/y'si vardi) ve
 * isci diye bir kavram yoktu. Ikisi de v2'de oyuncunun karari oldugu icin eski
 * sehirler makul varsayilanlarla tasinir:
 *   - Yerlesim: yapilar eskiden bulunduklari arsalara oturur, boylece sehir
 *     oyuncunun hatirladigi gibi gorunur.
 *   - Isciler: uretim yapilari KAPASITELERINE kadar doldurulur; eski denge
 *     tam kapasiteyle hesaplanmisti, dolayisiyla uretim ayni kalir.
 */
const LEGACY_PLOT: Record<BuildingId, number> = {
  // v1'deki Taş Ocağı (3) 0.42'de kalktı; v3→v4 adımı onu iade eder.
  divan: 0, konut: 1, kereste: 2, ambar: 4, medrese: 5, carsi: 6, hamam: 6,
  // v1'de bunlar yoktu; hicbir eski kayitta seviyeleri sifirdan buyuk olamaz.
  saray: 6, elcilik: 6, kisla: 6, surlar: 6, liman: 6, tersane: 6,
  kahvehane: 6, cami: 6, muze: 6, marangoz: 6, mimar: 6, ormanci: 6, tasci: 6, tophane: 6,
  bagci: 6, simyahane: 6, camci: 6, mahzen: 6, gozlukcu: 6, barutane: 6, depo: 6,
  ticaret_merkezi: 6, harita_arsivi: 6, valilik: 6, korsan_kalesi: 6, kara_pazar: 6, siginak: 6, tekke: 6, mabet: 6, karagoz: 6,
}

/**
 * KATALOGA YENI YAPI EKLENDIGINDE eski kayitlari tasir.
 *
 * Yeni bir yapi, eski kayitlarda hic bulunmayan uc alan demektir: seviye,
 * arsa ve isci. Bunlarin dogru baslangic degeri bellidir - kurulmamis, arsasiz,
 * iscisiz - yani bu bir SURUM YUKSELTMESI degil, eksik alanin doldurulmasidir.
 * Surumu artirmak her yeni bina icin ayri bir goc yolu acardi ve kazanci
 * olmazdi.
 *
 * Taninmayan anahtarlar da ayiklanir: katalogdan CIKARILMIS bir yapi kayitta
 * kalirsa dogrulama onu reddederdi.
 *
 * Ayni gerekce ORDU icin de gecerli: askerler eklendiginde eski kayitlarda
 * `army` ve `drill` alanlari yoktu. Dogru baslangic degeri bellidir - ordu
 * yok, egitim yok - yani yine bir surum yukseltmesi degil, eksik alanin
 * doldurulmasidir.
 */
function fillMissing(g: Record<string, unknown>): Record<string, unknown> {
  const buildings = { ...(g.buildings as Record<string, number> | undefined) }
  const placement = { ...(g.placement as Record<string, number | null> | undefined) }
  const workers = { ...(g.workers as Record<string, number> | undefined) }
  const out: { buildings: Record<string, number>; placement: Record<string, number | null>; workers: Record<string, number> } =
    { buildings: {}, placement: {}, workers: {} }
  for (const id of BUILDING_IDS) {
    out.buildings[id] = Number.isInteger(buildings[id]) ? buildings[id] : 0
    out.placement[id] = placement[id] === undefined ? null : placement[id]
  }
  for (const id of WORKER_IDS) out.workers[id] = Number.isInteger(workers[id]) ? workers[id] : 0
  /*
   * IZGARA DEGISTIGINDE sehri yikmamak icin yeniden yerlestirme.
   *
   * Arsa sayisi ya da bolgeler degisirse eski bir kayittaki indeks artik
   * baska bir yere - ya da hicbir yere - isaret edebilir. Boyle bir kaydi
   * reddetmek oyuncunun sehrini silmek olurdu; oysa bilgi kayipsiz
   * tasinabilir: yapiyi KENDI BOLGESINDE bos bir arsaya tasi.
   *
   * Bu, izgarayi degistirmeyi ucuz kilan sey. Satir eklemek ya da cikarmak
   * artik bir goc yolu yazmayi gerektirmiyor.
   */
  const used = new Set<number>()
  for (const id of BUILDING_IDS) {
    const at = out.placement[id]
    if (at === null) continue
    const fits = Number.isInteger(at) && at >= 0 && at < SLOTS.length && SLOTS[at].zone === zoneOf(id as BuildingId)
      && (!SLOTS[at].islet || id === 'korsan_kalesi')
    if (fits && !used.has(at as number)) { used.add(at as number); continue }
    /*
     * Once KENDI BOLGESINDE bos arsa aranir; yoksa herhangi bir bos arsa.
     *
     * Ikinci adim bir odun: arsalar artik arkaplan resminden olculdugu icin
     * sayilari ve bolgeleri resimle birlikte degisir. Yeni resimde iskele
     * yoksa, kurulu bir Tersane'yi yok saymak oyuncunun sehrini silmek
     * olurdu - yanlis bolgede durmasi, hic durmamasindan iyidir.
     */
    const free = SLOTS.find(slot => slot.zone === zoneOf(id as BuildingId) && !slot.islet && !used.has(slot.index))
      ?? SLOTS.find(slot => !slot.islet && !used.has(slot.index))
    out.placement[id] = free ? free.index : null
    if (free) used.add(free.index)
  }
  const army = { ...(g.army as Record<string, number> | undefined) }
  const filled: Record<string, number> = {}
  for (const id of UNIT_IDS) filled[id] = Number.isInteger(army[id]) ? army[id] : 0
  /*
   * YOLLAR ve AYNALAMA yeni alanlar: eski kayitlarda yok. Dogru baslangic
   * bellidir - yol yok, aynalama yok - ve gecersiz/yinelenen ogeler ayiklanir
   * (izgara degisirse eski yol kimlikleri artik gecersiz olabilir).
   */
  const roads = Array.isArray(g.roads)
    ? [...new Set((g.roads as unknown[]).filter((c): c is string => typeof c === 'string' && isRoadCell(c)))]
    : []
  const rawFlips = Array.isArray(g.flips)
    ? [...new Set((g.flips as unknown[]).filter((id): id is BuildingId => BUILDING_IDS.includes(id as BuildingId)))]
    : []
  const rawFacing = (g.coastFacing ?? {}) as Record<string, unknown>
  const validFacing = (v: unknown): v is CoastFacing => v === 'left' || v === 'straight' || v === 'right'
  const coastFacing: CoastFacings = {
    // Eski kayitta coast bina flip edilmisse bunu yeni sistemde Sag olarak koru.
    liman: validFacing(rawFacing.liman) ? rawFacing.liman : rawFlips.includes('liman') ? 'right' : 'straight',
    tersane: validFacing(rawFacing.tersane) ? rawFacing.tersane : rawFlips.includes('tersane') ? 'right' : 'straight',
  }
  const flips = rawFlips.filter(id => !(COAST_FACING_IDS as readonly string[]).includes(id))
  // Lüks kaynaklar ve ada madeni sonradan eklendi: eski kayıtta boş başlar.
  const lux = (g.luxury ?? {}) as Record<string, unknown>
  const luxury: Record<string, unknown> = {}
  for (const id of LUXURY_IDS) luxury[id] = lux[id] === undefined ? 0 : lux[id]
  const m = (g.mine ?? {}) as Record<string, unknown>
  const mine = { specialty: m.specialty ?? 'mermer', level: m.level ?? 1, wood: m.wood ?? 0, miners: m.miners ?? 0 }
  const t = (g.temple ?? {}) as Record<string, unknown>
  const temple = {
    priests: t.priests ?? 0, faith: t.faith ?? 0, wonder: t.wonder ?? 'kalkan', wonderLevel: t.wonderLevel ?? 0,
    wonderWood: t.wonderWood ?? 0, active: t.active ?? null, until: t.until ?? 0, cooldownUntil: t.cooldownUntil ?? 0,
  }
  const f = (g.future ?? {}) as Record<string, unknown>
  const future = { ekonomi: f.ekonomi ?? 0, bilim: f.bilim ?? 0, askeri: f.askeri ?? 0, denizcilik: f.denizcilik ?? 0, mitoloji: f.mitoloji ?? 0 }
  const fo = (g.forest ?? {}) as Record<string, unknown>
  const forest = { level: fo.level ?? 1, wood: fo.wood ?? 0, workers: fo.workers ?? 0 }
  const gv = (g.government ?? {}) as Record<string, unknown>
  const government = { id: gv.id ?? 'saltanat', changedAt: gv.changedAt ?? 0, anarchyUntil: gv.anarchyUntil ?? 0 }
  const st = (g.stats ?? {}) as Record<string, unknown>
  const stats = { builds: st.builds ?? 0, trained: st.trained ?? 0, researched: st.researched ?? 0, donated: st.donated ?? 0, ...(st.raids ? { raids: st.raids } : {}) }
  // Eski kayıtta tek eğitim emri (drill) vardı; sıraya çevrilir.
  const drills = Array.isArray(g.drills) ? g.drills : g.drill ? [g.drill] : []
  delete (g as Record<string, unknown>).drill
  const gdo = (g.gods ?? {}) as Partial<Gods>
  const gods: Gods = { ...emptyGods(), ...gdo, rest: { ...(gdo.rest ?? {}) }, buff: gdo.buff ?? null, patron: gdo.patron ?? null }
  const gd = (g.guilds ?? {}) as Partial<Guilds>
  const guilds: Guilds = { ...emptyGuilds(), ...gd, devotion: { ...emptyGuilds().devotion, ...(gd.devotion ?? {}) }, patrons: Array.isArray(gd.patrons) ? gd.patrons : [] }
  const sho = (g.shows ?? {}) as Partial<Shows>
  const shows: Shows = { active: sho.active ?? null, readyAt: sho.readyAt ?? 0 }
  return { ...g, ...out, army: filled, roads, flips, coastFacing, drills, luxury, mine, temple, guilds, gods, shows,
    upgrades: g.upgrades && typeof g.upgrades === 'object' ? g.upgrades : {}, future, piracy: g.piracy ?? 0, forest, government, stats }
}

/**
 * v2 -> v3: tek insaat alani SIRAYA donusur.
 *
 * Devam eden bir is varsa sira tek elemanli baslar; yoksa bos. Sure ve fiyat
 * zaten ise yazilmis oldugu icin oyuncunun beklemesi degismez.
 */
function migrateQueue(g: Record<string, unknown>): Record<string, unknown> {
  if (g.version !== 2) return g
  const construction = g.construction as Job | null | undefined
  const { construction: _drop, ...rest } = g
  return { ...rest, version: 3, queue: construction ? [construction] : [] }
}

/**
 * v3 -> v4 (0.42): TAŞ OYUNDAN KALKTI (Ikariam gibi: kereste + lüks mallar).
 *   - Ambardaki taş akçeye çevrilir (1:1).
 *   - Taş Ocağı yıkılır: her seviyesi için 200 akçe + 150 kereste iade, arsası
 *     boşalır, taşçıları boşta halka döner. Sıradaki Taş Ocağı işi iptal edilip
 *     300 akçe iade edilir.
 * Oyuncu emeğinin karşılığını kaybetmesin diye iade cömerttir ve ambar
 * sınırına takılmaz (sonraki ilerleme fazlayı tutmaz ama silmez de).
 */
function migrateStone(g: Record<string, unknown>): Record<string, unknown> {
  if (g.version !== 3) return g
  const res = { ...(g.resources as Record<string, number>) }
  const stone = Math.max(0, Math.floor(res.stone ?? 0))
  delete res.stone
  const buildings = { ...(g.buildings as Record<string, number>) }
  const level = Math.max(0, Math.floor(buildings.tas ?? 0))
  delete buildings.tas
  const placement = { ...(g.placement as Record<string, number | null>) }
  delete placement.tas
  const workers = { ...(g.workers as Record<string, number>) }
  delete workers.tas
  const queue = Array.isArray(g.queue) ? (g.queue as Job[]) : []
  const cancelled = queue.filter(j => (j.id as string) === 'tas').length
  res.gold = (res.gold ?? 0) + stone + level * 200 + cancelled * 300
  res.wood = (res.wood ?? 0) + level * 150
  const log = Array.isArray(g.log) ? [...(g.log as { text: string; time: number }[])] : []
  if (stone || level || cancelled) {
    const when = typeof g.updatedAt === 'number' ? g.updatedAt : 0
    log.unshift({ text: `Taş artık kullanılmıyor: ${stone} taş akçeye çevrildi${level ? `, Taş Ocağı kaldırıldı (${level * 200} akçe + ${level * 150} kereste iade)` : ''}.`, time: when })
  }
  return { ...g, version: 4, resources: res, buildings, placement, workers, queue: queue.filter(j => (j.id as string) !== 'tas'), log: log.slice(0, 60) }
}

function migrate(g: Record<string, unknown>): Record<string, unknown> {
  if (g.version !== 1) return g
  const buildings = g.buildings as Record<BuildingId, number>
  const placement: Record<string, number | null> = {}
  for (const id of BUILDING_IDS) placement[id] = buildings?.[id] > 0 ? LEGACY_PLOT[id] : null
  const workers: Record<string, number> = {}
  for (const id of WORKER_IDS) workers[id] = (buildings?.[id] ?? 0) * WORKERS_PER_LEVEL
  return { ...g, version: 2, placement, workers }
}

/**
 * ŞEHİR KAYDI GÖÇ ZİNCİRİ (V2 Faz 7.5). Her adım kaydı bir şema sürümünden
 * bir sonrakine taşır; kayıt hangi sürümden gelirse gelsin sırayla en yeniye
 * ulaşır. Yalnız ALAN EKLEYEN değişiklikler göç istemez: onları fillMissing
 * varsayılanla doldurur. Alanın anlamı ya da biçimi değişirse buraya yeni bir
 * adım eklenir ve GAME_SCHEMA bir artar.
 */
export const GAME_SCHEMA = 4
export const GAME_MIGRATIONS: Record<number, (g: Record<string, unknown>) => Record<string, unknown>> = {
  1: migrate,
  2: migrateQueue,
  3: migrateStone,
}
export function migrateGame(source: unknown): Record<string, unknown> {
  if (!source || typeof source !== 'object') throw new Error('Kayıt okunamadı.')
  let g = source as Record<string, unknown>
  if (typeof g.version === 'number' && g.version > GAME_SCHEMA) throw new Error(NEWER_SAVE)
  while (typeof g.version === 'number' && g.version < GAME_SCHEMA && GAME_MIGRATIONS[g.version]) g = GAME_MIGRATIONS[g.version](g)
  return g
}
/** Eski bir uygulamaya yeni sürümün kaydı yüklenirse gösterilen açıklama. */
export const NEWER_SAVE = 'Bu kayıt oyunun daha yeni bir sürümüyle yapılmış. Kaydın korunuyor; oyunu güncelleyip yeniden aç.'

export function parseSave(raw: string): Game {
  const g = fillMissing(migrateGame(JSON.parse(raw)))
  const finite = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0
  const jobIds = { build: BUILDING_IDS, research: RESEARCH_IDS, drill: UNIT_IDS } as const
  const validJob = (j: Job | null, kind: Job['kind']) => j === null || (j && j.kind === kind && jobIds[kind].includes(j.id as never) && finite(j.start) && finite(j.end) && j.end > j.start
    // Egitim emri kac birlik oldugunu tasir; digerlerinde adet kavrami yoktur.
    && (kind === 'drill' ? Number.isInteger(j.count) && (j.count as number) > 0 && (j.count as number) <= 500 : j.count === undefined))
  const placement = g.placement as Record<BuildingId, number | null> | undefined
  const workers = g.workers as Record<WorkerId, number> | undefined
  /*
   * Yerlesim iki kosulu saglamali: her deger ya null ya gecerli bir arsa
   * indeksi olmali VE iki yapi ayni arsayi paylasmamali. Paylasirlarsa
   * ekranda ust uste cizilirlerdi.
   */
  const placed = placement ? BUILDING_IDS.map(id => placement[id]).filter((p): p is number => p !== null) : []
  const levels = g.buildings as Record<BuildingId, number> | undefined
  const queued = new Set((Array.isArray(g.queue) ? (g.queue as Job[]) : []).map(job => job.id))
  /*
   * Yerlesim kurali, INSAAT HALINDEKI yapiyi da kapsamak zorunda.
   *
   * Yeni bir yapinin arsasi is SIRAYA GIRDIGI anda ayrilir - haritada
   * "inşaat sürüyor" olarak gorunmesi icin - ama seviyesi is bitene kadar
   * 0'dir. "seviye > 0 ise arsa vardir, yoksa yoktur" seklindeki ilk kural
   * bu araligi gecersiz sayiyordu ve oyuncunun sehri, ilk yeni yapisini
   * kurar kurmaz sayfa yenilendiginde SILINIYORDU.
   *
   * Dogru kural iki yonlu degil, tek yonludur:
   *   - kurulmus yapinin arsasi OLMALI,
   *   - arsasi olan yapi ya kurulmus ya da sirada OLMALI.
   */
  const placementValid = !!placement && !!levels
    && BUILDING_IDS.every(id => placement[id] === null || (Number.isInteger(placement[id]) && (placement[id] as number) >= 0 && (placement[id] as number) < PLOTS.length))
    // Arsa kaplamayan yapinin (Surlar) arsasi OLMAMALI; kaplayanin olmali.
    && BUILDING_IDS.every(id => (takesPlot(id) ? !(levels[id] > 0) || placement[id] !== null : placement[id] === null))
    /*
     * Bolge kurali INSA SIRASINDA uygulanir (bkz. buildReason), kayitta
     * degil: arsalar arkaplan resminden olculdugu icin resim degistiginde
     * eski bir yapi kendi bolgesi disinda kalabilir. Onarim onu tasir;
     * reddetmek sehri silmek olurdu.
     */
    && BUILDING_IDS.every(id => placement[id] === null || levels[id] > 0 || queued.has(id))
    && new Set(placed).size === placed.length
  const workersValid = !!workers && WORKER_IDS.every(id => Number.isInteger(workers[id]) && workers[id] >= 0)
  const lux = g.luxury as LuxuryStock
  const mine = g.mine as IslandMine
  if (!LUXURY_IDS.every(id => finite(lux[id])) || !LUXURY_IDS.includes(mine.specialty) ||
      !Number.isInteger(mine.level) || mine.level < 1 || mine.level > MINE_MAX_LEVEL ||
      !finite(mine.wood) || !Number.isInteger(mine.miners) || mine.miners < 0) {
    throw new Error('Kayıt dosyası okunamadı. Eski kaydın korunuyor; yeni oyun başlatabilirsin.')
  }
  const temple = g.temple as Temple
  const future = g.future as Record<ResearchBranch, number>
  const upgrades = g.upgrades as Partial<Record<UnitId, { atk: number; def: number }>>
  if (!finite(temple.faith) || !Number.isInteger(temple.priests) || temple.priests < 0 || !MIRACLE_IDS.includes(temple.wonder) ||
      !Number.isInteger(temple.wonderLevel) || temple.wonderLevel < 0 || temple.wonderLevel > WONDER_MAX || !finite(temple.wonderWood) ||
      !(temple.active === null || MIRACLE_IDS.includes(temple.active)) || !finite(temple.until) || !finite(temple.cooldownUntil) ||
      !RESEARCH_BRANCHES.every(b => Number.isInteger(future[b.key]) && future[b.key] >= 0) || !finite(g.piracy) ||
      (g.citizens !== undefined && !finite(g.citizens)) ||
      !Object.entries(upgrades).every(([id, u]) => UNIT_IDS.includes(id as UnitId) && !!u && Number.isInteger(u.atk) && Number.isInteger(u.def) && u.atk >= 0 && u.def >= 0 && u.atk <= 8 && u.def <= 8)) {
    throw new Error('Kayıt dosyası okunamadı. Eski kaydın korunuyor; yeni oyun başlatabilirsin.')
  }
  const gs = g.guilds as Guilds
  if (!finite(gs.himmet) || !finite(gs.changedAt) || !GUILD_IDS.every(id => finite(gs.devotion[id])) ||
      !gs.patrons.every(id => GUILD_IDS.includes(id)) || new Set(gs.patrons).size !== gs.patrons.length || gs.patrons.length > 3) {
    throw new Error('Kayıt dosyası okunamadı. Eski kaydın korunuyor; yeni oyun başlatabilirsin.')
  }
  const gv = g.gods as Gods
  if (!finite(gv.lutuf) || !finite(gv.changedAt) || !(gv.patron === null || GOD_IDS.includes(gv.patron)) ||
      !Object.entries(gv.rest).every(([id, t]) => GOD_IDS.includes(id as GodId) && finite(t)) ||
      !(gv.buff === null || (GOD_IDS.includes(gv.buff.god) && finite(gv.buff.until)))) {
    throw new Error('Kayıt dosyası okunamadı. Eski kaydın korunuyor; yeni oyun başlatabilirsin.')
  }
  const sh = g.shows as Shows | undefined
  if (sh && (!finite(sh.readyAt) || !(sh.active === null || (SHOW_IDS.includes(sh.active.id) && finite(sh.active.until))))) {
    throw new Error('Kayıt dosyası okunamadı. Eski kaydın korunuyor; yeni oyun başlatabilirsin.')
  }
  const forest = g.forest as IslandForest
  const government = g.government as Government
  const stats = g.stats as Game['stats']
  if (!Number.isInteger(forest.level) || forest.level < 1 || forest.level > FOREST_MAX_LEVEL || !finite(forest.wood) ||
      !Number.isInteger(forest.workers) || forest.workers < 0 ||
      !GOVERNMENT_IDS.includes(government.id) || !finite(government.changedAt) || !finite(government.anarchyUntil) ||
      !(['builds', 'trained', 'researched', 'donated'] as const).every(k => finite(stats[k])) || (stats.raids !== undefined && !finite(stats.raids)) ||
      (g.tavern !== undefined && !(Number.isInteger(g.tavern) && (g.tavern as number) >= 0)) ||
      (g.culture !== undefined && !(Number.isInteger(g.culture) && (g.culture as number) >= 0 && (g.culture as number) <= 20))) {
    throw new Error('Kayıt dosyası okunamadı. Eski kaydın korunuyor; yeni oyun başlatabilirsin.')
  }
  const army = g.army as Army | undefined
  const armyValid = !!army && UNIT_IDS.every(id => Number.isInteger(army[id]) && army[id] >= 0 && army[id] <= 100_000)
  const queue = g.queue as Job[] | undefined
  /*
   * Sira gecerli olmali: uzunlugu sinirin altinda, her ogesi gecerli bir is,
   * ayni yapi birden fazla kez YOK ve isler zaman sirasinda.
   */
  const queueValid = Array.isArray(queue) && queue.length <= QUEUE_LIMIT
    && queue.every(job => validJob(job, 'build'))
    && new Set(queue.map(job => job.id)).size === queue.length
    && queue.every((job, i) => i === 0 || job.start >= queue[i - 1].end - 1)
  if (!g || g.version !== GAME_SCHEMA || !queueValid || !finite(g.updatedAt) || !g.resources || !g.buildings || !placementValid || !workersValid || !armyValid || !Array.isArray(g.drills) || (g.drills as Job[]).length > 20 || !(g.drills as Job[]).every(j => validJob(j, 'drill')) || !RESOURCE_IDS.every(r => finite((g.resources as Resources)[r])) || !BUILDING_IDS.every(b => Number.isInteger((g.buildings as Record<BuildingId, number>)[b]) && (g.buildings as Record<BuildingId, number>)[b] >= 0 && (g.buildings as Record<BuildingId, number>)[b] <= MAX_LEVEL[b]) || (g.buildings as Record<BuildingId, number>).divan < 1 || !Array.isArray(g.research) || !(g.research as ResearchId[]).every((id: ResearchId) => RESEARCH_IDS.includes(id)) || new Set(g.research as ResearchId[]).size !== (g.research as ResearchId[]).length || !Array.isArray(g.claimed) || !(g.claimed as string[]).every((id: string) => OBJECTIVES.some(o => o.id === id)) || !validJob(g.study as Job | null, 'research') || !Array.isArray(g.log) || (g.log as unknown[]).length > 60 || !(g.log as { text: unknown; time: unknown }[]).every((l) => typeof l.text === 'string' && l.text.length < 500 && finite(l.time))) throw new Error('Kayıt dosyası okunamadı. Eski kaydın korunuyor; yeni oyun başlatabilirsin.')
  const game = g as unknown as Game
  if (game.queue.some(job => game.buildings[job.id as BuildingId] >= MAX_LEVEL[job.id as BuildingId])) throw new Error('İnşaat kaydı geçersiz.')
  if (game.study && game.research.includes(game.study.id as ResearchId)) throw new Error('Araştırma kaydı geçersiz.')
  /*
   * Ordunun BEDELI nufustur: bir kayit, sehrin besleyebileceginden fazla asker
   * tasiyamaz. Elle duzenlenmis ya da bozulmus bir dosya bu sinirin ustune
   * cikarsa isci hesabi eksiye duser ve uretim anlamsizlasir.
   */
  if (soldiers(game) > maxPopulation(game)) throw new Error('Ordu kaydı geçersiz.')
  // Nufus konut seviyesinden turer; kayittaki dagitim onu asiyorsa budanir.
  game.workers = clampWorkers(game)
  return game
}
