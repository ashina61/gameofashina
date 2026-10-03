import { emptyShows, showContentment, showOn } from '../theatre'
import { seasonContentment, tradeMul, woodMul } from '../events'
import { GODS, blessing, emptyGods, godBuff } from '../gods'
import { GUILDS, emptyGuilds, guildBonus } from '../guilds'
import { START_ROADS } from '../layout'
import { BUILDING_IDS, type BuildingId, type Game, type Good, LUXURY_IDS, type Luxury, type LuxuryStock, RESEARCH_IDS, RESOURCE_IDS, type ResearchBranch, type Resource, type Resources, WORKERS_PER_LEVEL, WORKER_IDS, type WorkerId, type Workers, anarchy, forestCapacity, govIs, miracle, priestCapacity } from './types'
import { BUILDINGS, BUILDING_EFFECTS, RESEARCH, UNITS, UNIT_IDS, type UnitId } from './data'

/** Her anahtari sifir olan bir kayit - yeni bir bina eklendiginde kendiliginden buyur. */
function blank<T extends string>(ids: readonly T[]): Record<T, number> {
  return Object.fromEntries(ids.map(id => [id, 0])) as Record<T, number>
}
function blankNull<T extends string>(ids: readonly T[]): Record<T, number | null> {
  return Object.fromEntries(ids.map(id => [id, null])) as Record<T, number | null>
}

/** Oyunun basladigi sehir: bes yapi, izgaranin ilk sirasinda. */
const START_LEVELS: Partial<Record<BuildingId, number>> = { divan: 1, konut: 1, kereste: 1, tas: 1, ambar: 1 }
// Belediye (divan) MERKEZDE, index 0, cakili. Digerleri ilk halkaya dagilir.
const START_PLOTS: Partial<Record<BuildingId, number>> = { divan: 0, konut: 2, kereste: 4, tas: 6, ambar: 8 }

export function initialGame(now: number): Game {
  return {
    version: 3, updatedAt: now,
    resources: { gold: 1240, wood: 860, stone: 540, knowledge: 40 },
    buildings: { ...blank(BUILDING_IDS), ...START_LEVELS },
    /*
     * Baslangic sehri. Yalnizca KURULU yapilarin arsasi vardir; gerisini
     * oyuncu yerlestirir. Liste katalogdan turedigi icin yeni bir bina
     * eklemek burayi degistirmeyi GEREKTIRMEZ.
     */
    placement: { ...blankNull(BUILDING_IDS), ...START_PLOTS },
    workers: { ...blank(WORKER_IDS), kereste: WORKERS_PER_LEVEL, tas: WORKERS_PER_LEVEL },
    army: blank(UNIT_IDS),
    roads: [...START_ROADS], flips: [], coastFacing: { liman: 'straight', tersane: 'straight' },
    luxury: { kahve: 0, mermer: 0, kristal: 0, kukurt: 0 },
    // Başkent Sahil Adası'nda: mermer yatağı. Koloniler kendi adasınınkini alır.
    mine: { specialty: 'mermer', level: 1, wood: 0, miners: 0 },
    temple: { priests: 0, faith: 0, wonder: 'kalkan', wonderLevel: 0, wonderWood: 0, active: null, until: 0, cooldownUntil: 0 },
    upgrades: {},
    future: { ekonomi: 0, bilim: 0, askeri: 0, denizcilik: 0, mitoloji: 0 },
    piracy: 0,
    forest: { level: 1, wood: 0, workers: 0 },
    government: { id: 'saltanat', changedAt: 0, anarchyUntil: 0 },
    guilds: emptyGuilds(),
    gods: emptyGods(),
    shows: emptyShows(),
    stats: { builds: 0, trained: 0, researched: 0, donated: 0 },
    research: [], queue: [], study: null, drills: [], claimed: [],
    log: [{ text: 'Sahilhisar kuruldu. Hikâyen burada başlıyor.', time: now }],
  }
}

/** Bir uretim yapisinin alabilecegi en fazla isci. */
export function workerCapacity(g: Game, id: WorkerId) { return g.buildings[id] * WORKERS_PER_LEVEL }
/** Dagitilmis toplam isci. */
export function assignedWorkers(g: Game) { return WORKER_IDS.reduce((sum, id) => sum + g.workers[id], 0) }
/**
 * Isi olmayan halk.
 *
 * Askerler nufusun icindedir ama ISCI DEGILDIR: uretim yapmazlar ve baska bir
 * ise verilemezler. Bu yuzden bosta kalan halk hesabindan once onlar dusulur.
 */
export function idleWorkers(g: Game) { return Math.max(0, population(g) - assignedWorkers(g) - g.mine.miners - (g.forest?.workers ?? 0) - (g.temple?.priests ?? 0) - soldiers(g)) }

/**
 * GARNİZON SINIRI (Ikariam): şehrin besleyip barındırabileceği asker ve gemi,
 * nüfus (birlik başına halk) cinsinden. Kara birlikleri Divanhane ve Surlar,
 * savaş gemileri Tersane ile artar. Casus (Elçilik sınırı) ve nakliye sayılmaz.
 */
export function garrisonLimit(g: Game, branch: 'kara' | 'deniz') {
  return branch === 'kara' ? 100 + 50 * g.buildings.divan + 50 * g.buildings.surlar
    : g.buildings.tersane > 0 ? 40 + 60 * g.buildings.tersane : 0
}
export const inGarrison = (id: UnitId) => id !== 'casus' && id !== 'nakliye'
/** Garnizonda sayılan birlikler (seferdekiler dahil) + eğitimi süren. */
export function garrisonUsed(g: Game, branch: 'kara' | 'deniz') {
  const job = (g.drills ?? []).reduce((s, j) => s + (UNITS[j.id as UnitId].branch === branch && inGarrison(j.id as UnitId) ? UNITS[j.id as UnitId].pop * (j.count ?? 0) : 0), 0)
  return UNIT_IDS.reduce((s, id) => s + (UNITS[id].branch === branch && inGarrison(id) ? UNITS[id].pop * (g.army?.[id] ?? 0) : 0), 0) + job
}

/** Egitimi SUREN birligin simdiden ayirdigi vatandas. */
export function trainingPop(g: Game): number {
  return (g.drills ?? []).reduce((s, job) => s + UNITS[job.id as UnitId].pop * (job.count ?? 0), 0)
}
/** Bir yapının eğitim sırasına en fazla bu kadar emir girer. */
export const DRILL_QUEUE_LIMIT = 5
/** Yapının sıradaki eğitim emirleri (ilk yürüyen). */
export function drillsAt(g: Game, home: BuildingId) { return (g.drills ?? []).filter(j => UNITS[j.id as UnitId].home === home) }

/**
 * Askere gitmis vatandas sayisi.
 *
 * Egitimi suren birlik de sayilir: emir verildigi anda o vatandaslar sehirden
 * ayrilir. Aksi halde oyuncu ayni bos halkla arka arkaya iki emir verebilir ve
 * egitimler bitince nufus borca duserdi.
 */
export function soldiers(g: Game): number {
  return UNIT_IDS.reduce((sum, id) => sum + UNITS[id].pop * (g.army?.[id] ?? 0), 0) + trainingPop(g)
}

/** Elindeki birliklerin toplam saldiri ve savunma gucu. */
/** Tophane yükseltmesi: seviye başına birliğin saldırısı ya da zırhı +%5. */
export function unitBonus(g: Game, id: UnitId) {
  const u = g.upgrades?.[id]
  return { atk: 1 + (u?.atk ?? 0) * 0.05, def: 1 + (u?.def ?? 0) * 0.05 }
}
export function power(g: Game, branch: 'kara' | 'deniz') {
  const base = UNIT_IDS.filter(id => UNITS[id].branch === branch).reduce(
    (sum, id) => ({ attack: sum.attack + UNITS[id].attack * g.army[id] * unitBonus(g, id).atk *
      (id === 'topcu' && g.research.includes('barut') ? 1.15 : 1) *
      (UNITS[id].role === 'artillery' && g.research.includes('balistik') ? 1.15 : 1),
      defense: sum.defense + UNITS[id].defense * g.army[id] * unitBonus(g, id).def }),
    { attack: 0, defense: 0 })
  const atkTech = branch === 'kara' ? 'celik' : 'yelken'
  const attackBonus = (g.research.includes(atkTech) ? 1.15 : 1) * (branch === 'deniz' && g.research.includes('guverte') ? 1.1 : 1)
  const defenseTech = branch === 'kara' ? 'zirh' : 'gemi_govdesi'
  const defenseBonus = g.research.includes(defenseTech) ? (branch === 'kara' ? 1.10 : 1.12) : 1
  const workshop = 1 + (g.buildings.tophane ?? 0) * BUILDING_EFFECTS.tophanePower + (g.future?.askeri ?? 0) * 0.02
  const war = 1 + miracle(g, 'savas') * 0.05
  // Lonca himayesi: Demirciler kara saldırısını, Gemiciler gemilerin saldırı ve zırhını artırır.
  const guildAtk = 1 + (branch === 'kara' ? guildBonus(g, 'demirci') * GUILDS.demirci.per : guildBonus(g, 'gemici') * GUILDS.gemici.per)
  const guildDef = 1 + (branch === 'deniz' ? guildBonus(g, 'gemici') * GUILDS.gemici.per : 0)
  // Tanrılar: Erlik ve Kızagan karada, Su İyesi denizde; süreli kudretler.
  const godAtk = 1 + (branch === 'kara' ? blessing(g, 'erlik') * GODS.erlik.per + (godBuff(g, 'kizagan') ? 0.2 : 0)
    : blessing(g, 'su') * GODS.su.per + (godBuff(g, 'su') ? 0.25 : 0))
  const godDef = 1 + (branch === 'kara' ? blessing(g, 'kizagan') * GODS.kizagan.per : blessing(g, 'su') * GODS.su.per + (godBuff(g, 'su') ? 0.25 : 0))
  return { attack: Math.round(base.attack * attackBonus * workshop * war * guildAtk * godAtk), defense: Math.round(base.defense * defenseBonus * workshop * guildDef * godDef) }
}

/** Surlarin asker gerektirmeyen savunmasi. İstihkâm araştırması %30 artırır. */
export function wallDefense(g: Game) { return Math.round(g.buildings.surlar * 150 * (g.research.includes('istihkam') ? 1.3 : 1) * (1 + blessing(g, 'kizagan') * GODS.kizagan.per)) }

/** Sehrin toplam savunmasi: surlar + kara birlikleri. */
export function cityDefense(g: Game) { return Math.round((wallDefense(g) + power(g, 'kara').defense) * (1 + miracle(g, 'kalkan') * 0.1)) }

/**
 * ŞEHİR GÜCÜ — tek bir "kudret" sayisi.
 *
 * Referans oyunlardaki gibi sehrin genel gucunu tek buyuk sayiyla gosterir:
 * bina seviyeleri, ordu, arastirma ve sur savunmasi birlesir. Yalnizca gorsel/
 * ozet amacli; denge hesaplarina girmez.
 */
export function might(g: Game): number {
  const buildingLevels = BUILDING_IDS.reduce((s, id) => s + g.buildings[id], 0)
  const armyPower = power(g, 'kara').attack + power(g, 'kara').defense + power(g, 'deniz').attack + power(g, 'deniz').defense
  return buildingLevels * 4200 + armyPower * 30 + g.research.length * 6500 + wallDefense(g) * 4
}

/** Nakliye gemilerinin tasidigi mal. Pusula araştırması %50 artırır. */
export function cargoCapacity(g: Game) { return Math.round(g.army.nakliye * UNITS.nakliye.cargo *
  (g.research.includes('pusula') ? 1.5 : 1) * (g.research.includes('yukleme') ? 1.2 : 1)) }

/** Ticaret limaninin ayni anda tasinmasina izin verdigi mal. Ticaret Yolları %30 artırır. */
export function tradeCapacity(g: Game) { return Math.round(g.buildings.liman * 1200 * (g.research.includes('ticaret') ? 1.3 : 1) * (govIs(g, 'loncalar') ? 1.2 : 1) * tradeMul(g.updatedAt)) }
/** Limanın dakikada yüklediği mal (nakliye süresine eklenir). */
export function loadingSpeed(g: Game) { return Math.max(1, g.buildings.liman) * 300 * (g.research.includes('yabanci_kultur') ? 2 : 1) }

/**
 * Isci dagitimini GECERLI hale getirir.
 *
 * Uc sinir vardir: yapinin kapasitesi, sehrin nufusu ve askere gitmis halk.
 * Bina yikilmaz ama
 * SEVIYE DUSMESI ya da eski bir kayittan gelen bozuk sayi kapasiteyi asabilir;
 * nufus da konut seviyesinden turedigi icin degisir. Dagitim bu yuzden tek bir
 * yerden budanir - uretim hesabinin asla kapasitenin ustunde calismamasi icin.
 */
export function clampWorkers(g: Game): Workers {
  const limit = Math.max(0, population(g) - soldiers(g))
  const out: Workers = { kereste: 0, tas: 0, medrese: 0, carsi: 0 }
  let left = limit
  for (const id of WORKER_IDS) {
    const want = Number.isFinite(g.workers?.[id]) ? Math.max(0, Math.floor(g.workers[id])) : 0
    const take = Math.min(want, workerCapacity(g, id), left)
    out[id] = take
    left -= take
  }
  return out
}
/** Maden işçileri: kapasite ve (üretim yapılarından artan) boştaki halkla sınırlı. */
export function clampForest(g: Game): number {
  const free = Math.max(0, population(g) - soldiers(g) - assignedWorkers(g) - g.mine.miners)
  const want = Number.isFinite(g.forest.workers) ? Math.max(0, Math.floor(g.forest.workers)) : 0
  return Math.min(want, forestCapacity(g), free)
}
export function clampPriests(g: Game): number {
  const free = Math.max(0, population(g) - soldiers(g) - assignedWorkers(g) - g.mine.miners - (g.forest?.workers ?? 0))
  const want = Number.isFinite(g.temple.priests) ? Math.max(0, Math.floor(g.temple.priests)) : 0
  return Math.min(want, priestCapacity(g), free)
}
export function clampMiners(g: Game): number {
  const free = Math.max(0, population(g) - soldiers(g) - assignedWorkers(g))
  const want = Number.isFinite(g.mine.miners) ? Math.max(0, Math.floor(g.mine.miners)) : 0
  return Math.min(want, mineCapacity(g), free)
}
export function capacity(g: Game) {
  const level = g.buildings.ambar
  // Level 1 remains exactly 4,500: existing city saves and first-game
  // economy do not regress. High-level stores grow so late-game upgrade
  // costs are actually storable with one warehouse per city's slot model.
  const warehouse = level === 0 ? 0 : 1500 * (1.32 ** level - 1) / 0.32
  const multiplier = (g.research.includes('storage') ? 1.25 : 1) *
    (g.research.includes('ambar_teknigi') ? 1.15 : 1)
  return Math.floor((3000 + warehouse) * multiplier) + (g.buildings.depo ?? 0) * BUILDING_EFFECTS.depoStorage
}

/**
 * YOLSUZLUK (Ikariam): başkentte yoktur. Kolonide Valilik seviyesi koloni
 * sayısına yetişmezse üretim düşer: 1 - (Valilik+1)/(koloni+1), yarı şiddetle.
 */
export function corruption(g: Game) {
  const e = g.empire
  if (!e || e.capital) return 0
  const colonies = Math.max(1, e.cities - 1)
  const base = Math.max(0, 1 - (g.buildings.valilik + 1) / (colonies + 1)) * 0.5 * (g.research.includes('yasama') ? 0.75 : 1)
  return Math.max(0, Math.min(0.9, base + (govIs(g, 'ayan') ? 0.03 : 0) - (govIs(g, 'kanun') ? 0.05 : 0)))
}

/** Dakikalık birlik bakım gideri (akçe). */
export function armyUpkeep(g: Game) {
  const ships = g.research?.includes('zift') ? 0.75 : 1
  const pro = (g.research?.includes('meslek_ordusu') ? 0.85 : 1) * (govIs(g, 'sipahi') ? 0.8 : govIs(g, 'meclis') ? 1.05 : 1)
  return UNIT_IDS.reduce((sum, id) => sum + UNITS[id].upkeep * (g.army?.[id] ?? 0) * (UNITS[id].branch === 'deniz' ? ships : 1), 0) * pro
}

/** Yolculuk süresi çarpanı: Harita Arşivi, Denizcilik Geleceği, Poyraz mucizesi. */
export function travelFactor(g: Game) {
  return (1 - Math.min(0.5, g.buildings.harita_arsivi * BUILDING_EFFECTS.harita)) *
    (1 - Math.min(0.3, (g.future?.denizcilik ?? 0) * 0.03)) * (1 - miracle(g, 'ruzgar') * 0.08) * (govIs(g, 'loncalar') ? 0.9 : 1) *
    (1 - Math.min(0.4, blessing(g, 'yel') * GODS.yel.per)) * (godBuff(g, 'yel') ? 0.7 : 1)
}

/** Aynı anda yürütülebilecek görev (sefer, casusluk, nakliye) sayısı: Divanhane ile artar. */
export function actionPoints(g: Game) { return 2 + Math.floor(g.buildings.divan / 4) + (g.research.includes('burokrasi') ? 1 : 0) }
/**
 * Dakikadaki uretim.
 *
 * Uretim artik yalnizca BINA SEVIYESINE degil, o binada CALISAN HALKA da
 * baglidir: bir yapi kapasitesinin yarisi kadar isciyle yarim uretir. Kapasite
 * tamamen doluyken sayilar eski dengeyle birebir aynidir, yani mevcut sehirler
 * bu degisiklikten zarar gormez.
 *
 * Akce konuttan gelir ve isci istemez - halkin kendisi vergi verir.
 */
/** Each staffed Medrese scientist consumes 9 akçe/hour in the accelerated
 *  Payitaht economy. In Ikariam a scientist likewise has an upkeep cost.
 *  Production speed here is intentionally accelerated for a mobile prototype. */
export const SCIENTIST_UPKEEP_PER_HOUR = 9
export function scientistCount(g: Game): number { return clampWorkers(g).medrese }
export function scientistUpkeepPerMinute(g: Game): number {
  return scientistCount(g) * SCIENTIST_UPKEEP_PER_HOUR / 60 * (govIs(g, 'ilmiye') ? 0.8 : 1)
}
export function rates(g: Game): Resources {
  const multiplier = (g.research.includes('tools') ? 1.2 : 1) * (1 - corruption(g)) * (1 + blessing(g, 'tengri') * GODS.tengri.per) *
    (1 + (g.future?.ekonomi ?? 0) * 0.02 + miracle(g, 'bereket') * 0.05) * (anarchy(g) ? 0.75 : 1)
  const workers = clampWorkers(g)
  const share = (id: WorkerId) => {
    const cap = workerCapacity(g, id)
    return cap > 0 ? workers[id] / cap : 0
  }
  return {
    // Akce iki kaynaktan gelir: halkin vergisi (isci istemez) ve carsi esnafi.
    gold: Math.max(0, (60 + g.buildings.konut * 120 +
      g.buildings.carsi * 100 * share('carsi')) * multiplier * (1 + g.buildings.saray * BUILDING_EFFECTS.sarayGold) * (govIs(g, 'ayan') ? 1.05 : 1) *
      (1 + guildBonus(g, 'tuccar') * GUILDS.tuccar.per) -
      scientistUpkeepPerMinute(g) - armyUpkeep(g)),
    wood: (g.buildings.kereste * 120 * share('kereste') + forestProduction(g)) * multiplier *
      (g.research.includes('ormancilik') ? 1.15 : 1) * (1 + g.buildings.ormanci * BUILDING_EFFECTS.ormanciWood) * (showOn(g, 'dram') ? 1.1 : 1) * woodMul(g.updatedAt),
    stone: g.buildings.tas * 90 * share('tas') * multiplier *
      (g.research.includes('tascilik') ? 1.15 : 1) * (1 + g.buildings.tasci * BUILDING_EFFECTS.tasciStone) * (showOn(g, 'dram') ? 1.1 : 1),
    knowledge: g.buildings.medrese * 8 * share('medrese') * multiplier * (1 + g.buildings.cami * BUILDING_EFFECTS.camiKnowledge) *
      (1 + (g.future?.bilim ?? 0) * 0.03 + miracle(g, 'ilim') * 0.1) / (1 + miracle(g, 'bereket') * 0.05) *
      (g.research.includes('alimler') ? 1.3 : 1) *
      (1 + (g.research.includes('kagit') ? .02 : 0) +
       (g.research.includes('murekkep') ? .04 : 0) +
       (g.research.includes('mekanik_kalem') ? .08 : 0)) *
      (g.research.includes('matbaa') ? 1.1 : 1) * (govIs(g, 'ilmiye') ? 1.1 : govIs(g, 'meclis') ? 1.05 : govIs(g, 'mesihat') ? 0.95 : 1) *
      (1 + guildBonus(g, 'katip') * GUILDS.katip.per) * (1 + blessing(g, 'ulgen') * GODS.ulgen.per),
  }
}
/** Ada ormanındaki işçilerin dakikalık kerestesi (çarpanlardan önce). */
export function forestProduction(g: Game) { return Math.min(g.forest?.workers ?? 0, g.forest ? forestCapacity(g) : 0) * 4 }
/** Konaklarin barindirabilecegi en fazla nufus. */
export function housing(g: Game) {
  // Divanhane her seviyede (1'in üstünde) şehre 20 kişilik idari barınma ekler.
  return 80 + g.buildings.konut * 40 + Math.max(0, g.buildings.divan - 1) * BUILDING_EFFECTS.divanHousing +
    (g.research.includes('kent_planlama') ? 40 : 0) + (g.research.includes('kuyu') && (g.empire?.capital ?? true) ? 50 : 0)
}

/**
 * Sehrin HUZURLA tutabilecegi nufus.
 *
 * Ikariam'in ana kisiti budur: dam altina almak yetmez, halki memnun da
 * etmek gerekir. Taban 120 secildi cunku oyunun basindaki konut seviyesi 1
 * ile barinma da 120'dir - yani kisit ilk andan itibaren canimizi yakmaz,
 * ancak oyuncu Konaklar'i YUKSELTTIGINDE devreye girer ve Hamam'i anlamli
 * kilar.
 */
export function contentment(g: Game) {
  const capital = g.empire?.capital ?? true
  const gov = govIs(g, 'meclis') ? 75 : govIs(g, 'mesihat') ? 50 : govIs(g, 'sipahi') ? -75 : govIs(g, 'ilmiye') ? -25 : 0
  return Math.max(0, 120 + g.buildings.hamam * 60 + g.buildings.kahvehane * BUILDING_EFFECTS.kahvehaneContentment + miracle(g, 'huzur') * 40 +
    (wineServed(g) ? tavernLevel(g) * BUILDING_EFFECTS.kahvehaneWineBonus * (g.research.includes('mutfak') ? 1.2 : 1) : 0) +
    g.buildings.cami * BUILDING_EFFECTS.camiContentment +
    g.buildings.muze * BUILDING_EFFECTS.muzeContentment * (g.research.includes('kultur') ? 1.5 : 1) + (g.culture ?? 0) * 50 +
    (g.research.includes('tatil') ? 25 : 0) + (g.research.includes('kuyu') && capital ? 50 : 0) +
    (g.research.includes('utopya') && capital ? 200 : 0) + gov - (anarchy(g) ? 50 : 0) + guildBonus(g, 'kahveci') * GUILDS.kahveci.per + blessing(g, 'umay') * 4 +
    (showOn(g, 'kultur') ? showContentment(g.buildings.karagoz) : 0) + seasonContentment(g.updatedAt))
}

/**
 * Sehirde GERCEKTEN yasayan nufus.
 *
 * Iki kisidan hangisi kucukse o. Barinma huzurdan buyukse fazla konutlar bos
 * kalir; oyuncu bunu "Halk" panelinde dogrudan gorur.
 */
/* ------------------------------------------------------------------ LÜKS */

/** Ada madeninin alabileceği en fazla işçi (Ikariam'da maden seviyesiyle büyür). */
export const MINERS_PER_LEVEL = 12
export const MINE_MAX_LEVEL = 20
export function mineCapacity(g: Game) { return Math.floor(g.mine.level * MINERS_PER_LEVEL * (g.research.includes('yardim_eli') ? 1.25 : 1)) }
/** Bir sonraki maden seviyesi için gereken toplam kereste bağışı. */
export function mineUpgradeCost(level: number) { return Math.round(600 * 1.55 ** (level - 1)) }

/** Kahvehane kahve ikram ediyor mu? (Ambarda kahve var ya da maden kahve çıkarıyor.) */
/** Kahvehane'de ikram edilen seviye (oyuncu kısabilir). */
export function tavernLevel(g: Game) { return Math.max(0, Math.min(g.buildings.kahvehane, g.tavern ?? g.buildings.kahvehane)) }
export function wineServed(g: Game) {
  if (tavernLevel(g) <= 0) return false
  return g.luxury.kahve > 0 || luxuryProduction(g).kahve >= wineConsumption(g)
}

/** Kahvehane'nin dakikalık kahve tüketimi (Kahve Kileri azaltır). */
export function wineConsumption(g: Game) {
  return tavernLevel(g) * BUILDING_EFFECTS.kahvehaneWine * Math.max(0.5, 1 - g.buildings.mahzen * BUILDING_EFFECTS.mahzenWine) *
    (g.research.includes('mutfak') ? 0.9 : 1)
}

/** Maden işçilerinin dakikadaki brüt lüks üretimi (yalnızca adanın kaynağı). */
export function luxuryProduction(g: Game): LuxuryStock {
  const out: LuxuryStock = { kahve: 0, mermer: 0, kristal: 0, kukurt: 0 }
  const miners = Math.min(g.mine.miners, mineCapacity(g))
  const boost: Record<Luxury, number> = {
    kahve: g.buildings.bagci * BUILDING_EFFECTS.bagciWine,
    kukurt: g.buildings.simyahane * BUILDING_EFFECTS.simyaSulfur,
    kristal: g.buildings.camci * BUILDING_EFFECTS.camciCrystal,
    mermer: g.buildings.tasci * BUILDING_EFFECTS.tasciStone,
  }
  out[g.mine.specialty] = miners * 3 * (g.research.includes('tools') ? 1.2 : 1) * (1 + boost[g.mine.specialty]) * (1 - corruption(g)) *
    (1 + miracle(g, 'bolluk') * 0.1) * (g.research.includes('zenginlik') ? 1.1 : 1) * (anarchy(g) ? 0.75 : 1) * (showOn(g, 'komedi') ? 1.1 : 1)
  return out
}

/** Dakikadaki NET lüks değişimi: üretim eksi Kahvehane'nin kahve ikramı. */
export function luxuryRates(g: Game): LuxuryStock {
  const out = luxuryProduction(g)
  if (tavernLevel(g) > 0 && (g.luxury.kahve > 0 || out.kahve > 0)) {
    out.kahve -= wineConsumption(g)
  }
  return out
}

/**
 * Bir bina yükseltmesinin LÜKS maliyeti.
 *
 * Ikariam'daki gibi: gelişmiş binalar mermer, bilim/kültür yapıları kristal
 * ister. Başlangıçta hiçbir şey istenmez (seviye 3'e kadar mermersiz,
 * seviye 4'e kadar kristalsiz) - yeni oyuncu tıkanmaz, ilerledikçe ada
 * ticareti gerekli olur. Mimarbaşı mermeri de ucuzlatır.
 */
const MARBLE_FREE = new Set<BuildingId>(['konut', 'kereste', 'tas'])
const CRYSTAL_NEEDS = new Set<BuildingId>(['medrese', 'muze', 'mimar', 'cami', 'saray', 'elcilik'])
export function luxuryCost(g: Game, id: BuildingId): Partial<LuxuryStock> {
  const level = g.buildings[id]
  const base = Math.round(BUILDINGS[id].base * BUILDING_GROWTH[id] ** level)
  const out: Partial<LuxuryStock> = {}
  if (level >= 3 && !MARBLE_FREE.has(id)) {
    const factor = Math.max(0.5, 1 - constructionDiscount(g) - g.buildings.mimar * BUILDING_EFFECTS.mimarStone)
    out.mermer = Math.round(base * 0.22 * factor)
  }
  if (level >= 4 && CRYSTAL_NEEDS.has(id)) out.kristal = Math.round(base * 0.12 * Math.max(0.5, 1 - g.buildings.gozlukcu * BUILDING_EFFECTS.gozlukcuCrystal))
  return out
}

/** Ağır birlikler kükürt (barut) ister. */
/**
 * Birliklerin lüks mal bedeli (Ikariam gibi): barutlu ve ağır birlikler
 * kükürt, aşçı kahve, hekim kristal ister. Barut Deneme Alanı ve Top
 * Döküm araştırması kükürdü azaltır.
 */
export const UNIT_LUX: Partial<Record<UnitId, Partial<LuxuryStock>>> = {
  yeniceri: { kukurt: 6 }, azap: { kukurt: 10 }, okcu: { kukurt: 8 }, tufekci: { kukurt: 25 }, mancinik: { kukurt: 30 },
  topcu: { kukurt: 40 }, deli: { kukurt: 45 }, humbaraci: { kukurt: 50 }, hezarfen: { kukurt: 30 }, lagari: { kukurt: 60 },
  asci: { kahve: 30 }, hekim: { kristal: 30 },
  kadirga: { kukurt: 30 }, kalyon: { kukurt: 90 }, ates_gemisi: { kukurt: 45 }, mancinik_gemisi: { kukurt: 60 }, humbara_gemisi: { kukurt: 120 },
  balon_gemisi: { kukurt: 110 }, buharli_koc: { kukurt: 80 }, dalgic_gemisi: { kukurt: 40 },
}
/** Eski adıyla yalnız kükürt tablosu (geriye uyum). */
export const UNIT_SULFUR: Partial<Record<UnitId, number>> = Object.fromEntries(
  Object.entries(UNIT_LUX).filter(([, c]) => c?.kukurt).map(([id, c]) => [id, c!.kukurt!])) as Partial<Record<UnitId, number>>
export function unitLuxuryCost(id: UnitId, count: number, g?: Game): Partial<LuxuryStock> {
  const base = UNIT_LUX[id]
  if (!base) return {}
  const sulfur = g ? Math.max(0.5, 1 - g.buildings.barutane * BUILDING_EFFECTS.barutaneSulfur) *
    ((id === 'topcu' || id === 'humbaraci') && g.research.includes('top_dokum') ? 0.75 : 1) : 1
  const out: Partial<LuxuryStock> = {}
  for (const [lux, n] of Object.entries(base) as [Luxury, number][]) out[lux] = Math.round(n * count * (lux === 'kukurt' ? sulfur : 1))
  return out
}

export function payLuxury(g: Game, need: Partial<LuxuryStock>) {
  for (const id of LUXURY_IDS) g.luxury[id] -= need[id] ?? 0
}

/* ------------------------------------------------ TOPHANE / GELECEK / KARA PAZAR */

/** Tophane seviyesinin izin verdiği en yüksek yükseltme seviyesi (en fazla 8). */
export function upgradeCap(g: Game) { return Math.min(8, Math.floor(g.buildings.tophane / 2)) }
export function upgradeCost(g: Game, id: UnitId, stat: 'atk' | 'def') {
  const level = g.upgrades?.[id]?.[stat] ?? 0
  const pop = Math.max(1, UNITS[id].pop)
  return { gold: Math.round(150 * (level + 1) ** 1.7 * pop), kristal: Math.round(30 * (level + 1) * pop) }
}
export function upgradeReason(g: Game, id: UnitId, stat: 'atk' | 'def'): string | null {
  const role = UNITS[id].role
  if (role === 'spy' || role === 'transport' || role === 'support') return 'Bu birlik savaşmaz; yükseltilemez.'
  if (g.buildings.tophane < 2) return 'Tophane 2. seviye gerekli.'
  const level = g.upgrades?.[id]?.[stat] ?? 0
  if (level >= upgradeCap(g)) return upgradeCap(g) >= 8 ? 'En yüksek yükseltme.' : `Tophane'yi yükselt (şu an en fazla ${upgradeCap(g)}. seviye).`
  const c = upgradeCost(g, id, stat)
  if (g.resources.gold < c.gold || g.luxury.kristal < c.kristal) return `${c.gold} akçe ve ${c.kristal} kristal gerekli.`
  return null
}
export function futureCost(level: number) { return Math.round(1200 * 1.55 ** level) }
export function futureReason(g: Game, branch: ResearchBranch): string | null {
  const missing = RESEARCH_IDS.filter(id => RESEARCH[id].branch === branch && !g.research.includes(id))
  if (missing.length) return `Önce bu dalın bütün araştırmaları bitmeli (${missing.length} kaldı).`
  if (g.resources.knowledge < futureCost(g.future[branch])) return `${futureCost(g.future[branch])} ilim gerekli.`
  return null
}
export const GOOD_NAMES: Record<Good, string> = {
  gold: 'Akçe', wood: 'Kereste', stone: 'Taş', knowledge: 'İlim', kahve: 'Kahve', mermer: 'Mermer', kristal: 'Kristal', kukurt: 'Kükürt',
}
export function goodAmount(g: Game, good: Good) { return (LUXURY_IDS as readonly string[]).includes(good) ? g.luxury[good as Luxury] : g.resources[good as Resource] }
export function addGood(g: Game, good: Good, n: number) {
  if ((LUXURY_IDS as readonly string[]).includes(good)) g.luxury[good as Luxury] += n
  else g.resources[good as Resource] += n
}
/** Kara Pazar oranı: kaç birim ver, 1 birim al (3.2'den 2'ye iner). */
export function exchangeRate(g: Game) { return Math.max(2, Math.round((3.2 - 0.1 * g.buildings.kara_pazar) * 10) / 10) }
export function exchangeLimit(g: Game) { return 400 * g.buildings.kara_pazar }

/** Çarşıdaki tüccar: akçe karşılığı lüks alım/satım (NPC; oyuncu pazarı değil). */
export const MERCHANT_BUY = 6
export const MERCHANT_SELL = 2
export function merchantLimit(g: Game) { return Math.round((g.buildings.carsi * 150 + g.buildings.ticaret_merkezi * BUILDING_EFFECTS.merchantLimit) * tradeMul(g.updatedAt)) }
/** Ticaret Merkezi fiyatları iyileştirir: alış en az 3, satış en çok 4 akçe. */
export function merchantBuyPrice(g: Game) { return Math.max(3, MERCHANT_BUY - g.buildings.ticaret_merkezi * BUILDING_EFFECTS.merchantBuyStep) }
export function merchantSellPrice(g: Game) { return Math.min(4, MERCHANT_SELL + g.buildings.ticaret_merkezi * BUILDING_EFFECTS.merchantSellStep) }

/** Barınma ve huzurun izin verdiği en yüksek nüfus. */
export function maxPopulation(g: Game) { return Math.min(housing(g), contentment(g)) }
/**
 * Şehirde yaşayan nüfus. Ikariam'daki gibi tavana ZAMANLA yaklaşır
 * (advance içinde büyür); tavan düşerse hemen iner. Eski kayıtta tavandadır.
 */
export function population(g: Game) {
  const max = maxPopulation(g)
  return g.citizens === undefined ? max : Math.min(max, Math.floor(g.citizens))
}
/** Dakikalık nüfus artışı (huzur fazlası büyümeyi hızlandırır). */
export function growthRate(g: Game) {
  const max = maxPopulation(g)
  const now = g.citizens ?? max
  if (now >= max) return 0
  const surplus = Math.max(0, contentment(g) - now) / Math.max(1, contentment(g))
  return Math.max(1, (max - now) * (0.03 + 0.12 * surplus) * (1 + blessing(g, 'umay') * GODS.umay.per))
}

/** Huzursuzluk yuzunden bos kalan barinma. */
export function unhousedByUnrest(g: Game) { return Math.max(0, housing(g) - contentment(g)) }

/**
 * Ambari DOLMUS kaynaklar.
 *
 * Dolu bir ambarda uretim bosa gider: advance() kaynagi kapasiteye kirpar ve
 * aradaki fark sessizce kaybolur. Oyuncu bunu ancak sayilarin ilerlemedigini
 * fark ederek anliyordu - yani oyunun ona soylemesi gereken bir seyi kendi
 * kesfetmek zorundaydi.
 *
 * Esik %99,5: kayan noktali birikimde tam esitlik neredeyse hic yakalanmaz.
 */
export function fullResources(g: Game): Resource[] {
  const limit = capacity(g)
  return RESOURCE_IDS.filter(id => g.resources[id] >= limit * 0.995)
}

/** Ambari dolmaya YAKIN kaynaklar - uyari icin, kayip icin degil. */
export function nearlyFullResources(g: Game): Resource[] {
  const limit = capacity(g)
  return RESOURCE_IDS.filter(id => g.resources[id] >= limit * 0.9 && g.resources[id] < limit * 0.995)
}
/**
 * Each building has its own growth curve instead of a universal 1.65 factor.
 * These are Payitaht-balanced curves inspired by the exponential shape of
 * Ikariam upgrade tables; NOT a claim of exact current-server Ikariam prices.
 * Level 0 construction cost is unchanged for existing players.
 */
export const BUILDING_GROWTH: Record<BuildingId, number> = {
  divan: 1.35, saray: 1.49, elcilik: 1.36, konut: 1.31, hamam: 1.38,
  carsi: 1.35, ambar: 1.39, kereste: 1.31, tas: 1.31, medrese: 1.40,
  kisla: 1.37, surlar: 1.43, liman: 1.37, tersane: 1.41,
  kahvehane: 1.34, cami: 1.38, muze: 1.40, marangoz: 1.33, mimar: 1.34, ormanci: 1.32, tasci: 1.32, tophane: 1.39,
  bagci: 1.32, simyahane: 1.33, camci: 1.33, mahzen: 1.33, gozlukcu: 1.34, barutane: 1.35, depo: 1.36,
  ticaret_merkezi: 1.37, harita_arsivi: 1.36, valilik: 1.45, korsan_kalesi: 1.40, kara_pazar: 1.37, siginak: 1.36, tekke: 1.37, mabet: 1.38, karagoz: 1.34,
}
export function constructionDiscount(g: Game): number {
  return (g.research.includes('makara') ? .02 : 0) +
    (g.research.includes('geometri') ? .04 : 0) +
    (g.research.includes('su_terazisi') ? .08 : 0)
}
export function cost(g: Game, id: BuildingId): Resources {
  const base = Math.round(BUILDINGS[id].base * BUILDING_GROWTH[id] ** g.buildings[id])
  const materialFactor = 1 - constructionDiscount(g) - guildBonus(g, 'dulger') * GUILDS.dulger.per
  // Ikariam: Marangoz keresteyi, Mimar taşı seviye başına %1 ucuzlatır.
  const woodFactor = materialFactor - g.buildings.marangoz * BUILDING_EFFECTS.marangozWood
  const stoneFactor = materialFactor - g.buildings.mimar * BUILDING_EFFECTS.mimarStone
  return { gold: base, wood: Math.round(base * 1.2 * Math.max(0.5, woodFactor)),
    stone: Math.round(base * .75 * Math.max(0.5, stoneFactor)), knowledge: 0 }
}
/** 5. seviyeden sonra her seviyenin süre çarpanı. */
export const LATE_PACE = 1.16
/** Tek bir yükseltme en çok 12 saat sürer (bir gece). */
export const MAX_BUILD_SECONDS = 12 * 3600
export function duration(g: Game, id: BuildingId) {
  const level = g.buildings[id]
  // Early-game timers remain unchanged; high levels become progressively
  // longer, with distinct building curves instead of a linear universal timer.
  const growth = level < 3 ? 1 : (BUILDING_GROWTH[id] / 1.25) ** (level - 2)
  // Uzun soluk: ilk beş seviye dakikalar sürer (oyuncu hızla ısınır); sonra
  // her seviye %16 daha uzun sürer — 15. seviye yarım saat, 25. seviye saatler.
  const pace = level <= 5 ? 1 : LATE_PACE ** (level - 5)
  return Math.min(MAX_BUILD_SECONDS, Math.round((20 + level * 10) * growth * pace *
    (g.research.includes('architecture') ? .75 : 1) * (govIs(g, 'ayan') ? 0.8 : govIs(g, 'loncalar') ? 1.05 : 1) *
    (1 - Math.min(0.3, blessing(g, 'kayra') * GODS.kayra.per))))
}
export function logEvent(g: Game, text: string, time: number) { g.log = [{ text, time }, ...g.log].slice(0, 60) }
/**
 * Günlüğü gösterim için toplar: art arda aynı metin tek satır olur
 * (en yeni saat, kaç kez olduğu). Kayıt değişmez.
 */
export function groupLog(log: Game['log']): { text: string; time: number; count: number; first: number }[] {
  const out: { text: string; time: number; count: number; first: number }[] = []
  for (const l of log) {
    const last = out[out.length - 1]
    if (last && last.text === l.text) { last.count++; last.first = l.time } else out.push({ text: l.text, time: l.time, count: 1, first: l.time })
  }
  return out
}
