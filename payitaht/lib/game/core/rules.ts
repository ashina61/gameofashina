import { lutufCap, lutufRate } from '../gods'
import { himmetCap, himmetRate } from '../guilds'
import { type Zone } from '../layout'
import { type BuildingId, FAITH_CAP, type Game, type Job, LUXURY_IDS, LUXURY_NAMES, PLOTS, QUEUE_LIMIT, RESOURCE_IDS, type ResearchId, type Resources, WORKERS_PER_LEVEL, WORKER_IDS, type WorkerId, govIs, miracle, priestCapacity, takesPlot, zoneOf } from './types'
import { BUILDINGS, BUILDING_EFFECTS, OBJECTIVES, RESEARCH, UNITS, type UnitId } from './data'
import { DRILL_QUEUE_LIMIT, capacity, clampForest, clampMiners, clampPriests, clampWorkers, cost, drillsAt, garrisonLimit, garrisonUsed, growthRate, idleWorkers, inGarrison, logEvent, luxuryCost, luxuryRates, maxPopulation, rates, unitLuxuryCost, workerCapacity } from './economy'

/**
 * ÇEVRİMDIŞI ÜRETİM SINIRI (V2 Faz 5.3): oyun kapalıyken kaynaklar 8 saat
 * birikir; Ambar'ın her seviyesi bir saat ekler (en çok 24). Sınır, ileri
 * alınan cihaz saatinin kazancını da keser (lib/game/clock.ts).
 */
export function offlineCapHours(g: Game): number { return Math.min(24, 8 + g.buildings.ambar) }
export function advance(source: Game, now: number): Game {
  const g: Game = structuredClone(source)
  if (now <= g.updatedAt) return g
  const start = g.updatedAt
  if (g.citizens === undefined) g.citizens = maxPopulation(g)
  const cutoff = Math.min(now, start + offlineCapHours(g) * 3600_000)
  let cursor = start
  function produce(until: number) {
    const minutes = Math.max(0, Math.min(until, cutoff) - Math.min(cursor, cutoff)) / 60_000
    const speed = rates(g)
    for (const r of RESOURCE_IDS) g.resources[r] = Math.min(capacity(g), g.resources[r] + speed[r] * minutes)
    const lux = luxuryRates(g)
    for (const r of LUXURY_IDS) g.luxury[r] = Math.max(0, Math.min(capacity(g), g.luxury[r] + lux[r] * minutes))
    // Nüfus tavana doğru büyür; tavan düştüyse hemen iner.
    const max = maxPopulation(g)
    const citizens = g.citizens ?? max
    g.citizens = citizens >= max ? max : Math.min(max, citizens + growthRate(g) * minutes)
    // İmamlar inanç biriktirir.
    g.temple.faith = Math.min(FAITH_CAP, g.temple.faith + Math.min(g.temple.priests, priestCapacity(g)) * 0.5 * minutes *
      (g.research.includes('din') ? 1.5 : 1) * (govIs(g, 'mesihat') ? 1.5 : 1))
    // Mabet lütuf biriktirir.
    g.gods.lutuf = Math.min(lutufCap(g), g.gods.lutuf + lutufRate(g) * minutes)
    // Tekke himmet biriktirir.
    g.guilds.himmet = Math.min(himmetCap(g), g.guilds.himmet + himmetRate(g) * minutes)
    cursor = until
  }
  /*
   * Biten isler ZAMAN SIRASIYLA islenir.
   *
   * Kuyruktan yalnizca BASTAN itibaren bitmis olanlar alinir: sirada bekleyen
   * bir isin sayaci kendinden oncekiler bitmeden baslamaz, dolayisiyla arada
   * bitmis bir is olamaz. Arastirma ayri yurur ve araya girebilir; bu yuzden
   * hepsi bitis zamanina gore siralanir - uretim hesabi (produce) is bitislerini
   * dogru anlarda bolmek zorunda.
   */
  const jobs: Job[] = []
  while (g.queue.length > 0 && g.queue[0].end <= now) jobs.push(g.queue.shift() as Job)
  if (g.study && g.study.end <= now) jobs.push(g.study)
  for (const job of g.drills) if (job.end <= now) jobs.push(job)
  g.drills = g.drills.filter(job => job.end > now)
  jobs.sort((a, b) => a.end - b.end)
  for (const job of jobs) {
    produce(Math.max(cursor, job.end))
    if (job.kind === 'build') {
      const id = job.id as BuildingId
      g.buildings[id] += 1
      /*
       * Yeni seviye yeni isci kapasitesi acar. Bosta halk varsa fark
       * KENDILIGINDEN doldurulur: oyuncunun her yukseltmeden sonra panele
       * girip elle atama yapmasi gereksiz bir angarya olurdu.
       */
      if ((WORKER_IDS as readonly string[]).includes(id)) {
        const slot = id as WorkerId
        g.workers[slot] = Math.min(workerCapacity(g, slot), g.workers[slot] + WORKERS_PER_LEVEL)
      }
      g.workers = clampWorkers(g)
      g.stats.builds += 1
      logEvent(g, `${BUILDINGS[id].name} ${g.buildings[id]}. seviyeye ulaştı.`, job.end)
    } else if (job.kind === 'research') {
      const id = job.id as ResearchId
      if (!g.research.includes(id)) g.research.push(id)
      g.stats.researched += 1
      g.study = null
      logEvent(g, `${RESEARCH[id].name} araştırması tamamlandı.`, job.end)
    } else {
      /*
       * Egitim bitti. Vatandaslar emir verildigi anda ayrilmisti (trainingPop),
       * simdi orduya gecerler - yani sehrin nufus dengesi DEGISMEZ, yalnizca
       * ayni kisiler artik `army` icinde sayilir.
       */
      const id = job.id as UnitId
      const count = job.count ?? 0
      g.army[id] += count
      g.stats.trained += count
      logEvent(g, `${count} ${UNITS[id].name} sancağın altına girdi.`, job.end)
    }
  }
  produce(now)
  g.mine.miners = clampMiners(g)
  g.forest.workers = clampForest(g)
  g.temple.priests = clampPriests(g)
  if (now - start > 5 * 60_000) {
    const m = Math.floor((now - start) / 60_000), away = m >= 60 ? `${Math.floor(m / 60)} saat${m % 60 ? ` ${m % 60} dakika` : ''}` : `${m} dakika`
    logEvent(g, `Hoş geldin! Yokluğundaki ${away}${away.endsWith('saat') ? 'lik' : 'lık'} üretim ambara kondu${m > 480 ? ' (en fazla 8 saati sayılır)' : ''}.`, now)
  }
  g.updatedAt = now
  return g
}
/**
 * Uzerinde yapi olmayan arsalarin indeksleri.
 *
 * `zone` verilirse yalnizca o bolgedekiler doner: Tersane bir yamac
 * arsasina, Konaklar bir iskeleye kurulamaz.
 */
export function freePlots(g: Game, zone?: Zone): number[] {
  const taken = new Set(Object.values(g.placement).filter((p): p is number => p !== null))
  return PLOTS.filter(slot => !taken.has(slot.index) && plotOpen(g, slot.index) && (zone === undefined || slot.zone === zone)).map(slot => slot.index)
}

/**
 * ŞEHRİN BÜYÜMESİ (Ikariam): kara arsaları belediyeden dışa doğru, Divanhane
 * seviyesiyle açılır — başta 9, her seviyede 2 arsa daha. Arsa sırası
 * belediyeye uzaklıktır (city-slots.json), yani şehir merkezden kenarlara
 * yayılır. Liman (deniz) arsaları hep açıktır. Açılmamış arsada daha önce
 * kurulmuş bir yapı varsa (eski kayıt) yerinde kalır.
 */
export const LAND_PLOTS = PLOTS.filter(p => p.zone === 'sehir').length - 1
export function landPlotsOpen(g: Game) { return Math.min(LAND_PLOTS, 7 + 2 * Math.max(1, g.buildings.divan)) }
export function plotOpen(g: Game, index: number) {
  const slot = PLOTS[index]
  if (!slot) return false
  return slot.zone === 'liman' || index <= landPlotsOpen(g)
}
/** Bir sonraki arsayı açan Divanhane seviyesi (hepsi açıksa null). */
export function nextPlotDivan(g: Game) { return landPlotsOpen(g) >= LAND_PLOTS ? null : Math.max(1, g.buildings.divan) + 1 }

/**
 * BİNA EN YÜKSEK SEVİYELERİ — Ikariam benzeri.
 *
 * Ikariam'da binalar yüksek seviyelere çıkar (Belediye 32+, çoğu bina Belediye
 * seviyesiyle sınırlı). Burada da tavan 32; ayrıca hiçbir bina Divanhane'yi
 * geçemez (bkz. buildReason) - yani gerçek sınır Divanhane seviyesidir.
 * Surlar biraz daha yükseğe çıkar (kalıcı savunma).
 */
export const MAX_LEVEL: Record<BuildingId, number> = {
  divan: 32, saray: 32, elcilik: 32, konut: 32, hamam: 32, carsi: 32, ambar: 32,
  kereste: 32, tas: 32, medrese: 32, kisla: 32, surlar: 40, liman: 32, tersane: 32,
  kahvehane: 32, cami: 32, muze: 32, marangoz: 32, mimar: 32, ormanci: 32, tasci: 32, tophane: 32,
  bagci: 32, simyahane: 32, camci: 32, mahzen: 32, gozlukcu: 32, barutane: 32, depo: 32,
  ticaret_merkezi: 32, harita_arsivi: 32, valilik: 32, korsan_kalesi: 32, kara_pazar: 32, siginak: 32, tekke: 32, mabet: 32, karagoz: 32,
}

export function buildReason(g: Game, id: BuildingId): string | null {
  if (g.queue.length >= QUEUE_LIMIT) return `İnşaat sırası dolu (en fazla ${QUEUE_LIMIT}).`
  /*
   * Ayni yapi siraya IKI KEZ girmez.
   *
   * Maliyet ve sure O ANKI seviyeden hesaplanir; ayni yapiyi iki kez siraya
   * almak iki seviyeyi tek seviyenin fiyatina almak olurdu. Ikariam'da sira
   * ayni binayi kabul eder ama orada her sira ogesi kendi seviyesinden
   * fiyatlanir - o hesabi kurmadan bu kapiyi acmak dengeyi bozar.
   */
  if (g.queue.some(job => job.id === id)) return 'Bu yapı zaten inşaat sırasında.'
  if (g.buildings[id] >= MAX_LEVEL[id]) return 'En yüksek seviyeye ulaşıldı.'
  /*
   * ON KOSUL, ARSADAN ONCE sorulur.
   *
   * Henuz Ticaret Limani kurmamis bir oyuncuya "limanda bos iskele yok"
   * demek yanlis cevaptir: eksik olan iskele degil, limanin kendisi. Once
   * neyin eksik oldugunu soyle, sonra nereye sigmayacagini.
   */
  const needs = BUILDINGS[id].needs
  if (needs && g.buildings[needs.id] < needs.level) return `${BUILDINGS[needs.id].name} ${needs.level}. seviye gerekli.`
  const tech = BUILDINGS[id].tech
  if (tech && !g.research.includes(tech)) return `${RESEARCH[tech].name} araştırması gerekli.`
  const only = BUILDINGS[id].only
  const capital = g.empire?.capital ?? true
  if (only === 'capital' && !capital) return 'Saray yalnızca başkentte kurulur; kolonide Valilik kur.'
  if (only === 'colony' && capital) return 'Valilik yalnızca kolonilerde kurulur; başkentte Saray var.'
  // Hic kurulmamis yapi once KENDI BOLGESINDE bir arsaya yerlestirilmeli.
  if (takesPlot(id) && g.placement[id] === null && freePlots(g, zoneOf(id)).length === 0) {
    return zoneOf(id) === 'liman' ? 'Limanda boş iskele kalmadı.'
      : nextPlotDivan(g) ? `Boş arsa kalmadı. Divanhane ${nextPlotDivan(g)}. seviyede şehir büyür, yeni arsalar açılır.` : 'Boş arsa kalmadı.'
  }
  if (id !== 'divan' && g.buildings[id] >= g.buildings.divan + 1) return `Divanhane ${g.buildings.divan + 1}. seviye gerekli.`
  const c = cost(g, id)
  if (RESOURCE_IDS.some(r => g.resources[r] < c[r])) return 'Yeterli kaynak yok. Üretimin devam ediyor.'
  const lux = luxuryCost(g, id)
  const missing = LUXURY_IDS.find(r => g.luxury[r] < (lux[r] ?? 0))
  if (missing) return `${lux[missing]} ${LUXURY_NAMES[missing]} gerekli. Adandan, nakliyeyle ya da Çarşı'daki tüccardan edin.`
  return null
}
/** Bir egitim emrinin toplam maliyeti. */
export function unitCost(id: UnitId, count: number, game?: Game): Resources {
  const c = UNITS[id].cost
  const factor = game?.research.includes('askeri_lojistik') ? .9 : 1
  return { gold: Math.floor(c.gold * count * factor),
    wood: Math.floor(c.wood * count * factor),
    stone: c.stone * count, knowledge: 0 }
}

/** Bir egitim emrinin suresi, saniye. */
export function unitDuration(g: Game, id: UnitId, count: number) {
  return Math.round(UNITS[id].seconds * count *
    (g.research.includes('architecture') ? .75 : 1) *
    (g.research.includes('talim') ? .90 : 1) * (1 - drillBonus(g, UNITS[id].home)) * (1 - miracle(g, 'demirci') * 0.08) *
    (UNITS[id].branch === 'deniz' && g.research.includes('kuru_havuz') ? 0.8 : 1) * (govIs(g, 'sipahi') ? 0.9 : govIs(g, 'kanun') ? 1.05 : 1))
}

/** Elçiliğin barındırabileceği casus sayısı. */
export function spyCapacity(g: Game) { return g.buildings.elcilik * BUILDING_EFFECTS.elcilikSpies + g.buildings.siginak * BUILDING_EFFECTS.siginakSpies }
/** Casusluk başarısına şehir katkısı (Elçilik, Gizli Sığınak, Casusluk). */
export function spyBonus(g: Game) {
  return g.buildings.elcilik * BUILDING_EFFECTS.elcilikSpySuccess + g.buildings.siginak * BUILDING_EFFECTS.siginakSpySuccess +
    (g.research.includes('casusluk') ? 0.1 : 0)
}
/** Şehre sızan yabancı casusları yakalama gücü (0..0.9). */
export function counterSpy(g: Game) { return Math.min(0.9, g.buildings.siginak * 0.06 + (govIs(g, 'kanun') ? 0.2 : 0)) }

/** Eğitim yapısının yükseltmesiyle gelen hız: her yükseltme %3, en fazla %45. */
export function drillBonus(g: Game, home: BuildingId) {
  return Math.min(BUILDING_EFFECTS.drillSpeedCap, Math.max(0, g.buildings[home] - 1) * BUILDING_EFFECTS.drillSpeed)
}

/**
 * Egitim emri verilebilir mi?
 *
 * Nufus kosulu BOSTAKI halka bakar, toplam nufusa degil: calisan bir isci
 * asla sessizce askere alinmaz. Oyuncu once Halk panelinden adam bosaltir.
 * Boylece "ordumu kurdum ama uretimim nicin dustu" sorusu hic dogmaz -
 * dusuren hareketi kendisi yapmis olur.
 */
export function recruitReason(g: Game, id: UnitId, count: number): string | null {
  const unit = UNITS[id]
  if (!Number.isInteger(count) || count <= 0) return 'Geçersiz sayı.'
  if (id === 'nakliye') return "Ticaret gemileri eğitilmez; Ticaret Limanı'ndan satın alınır ve bütün şehirlerin ortak filosuna katılır."
  if (g.buildings[unit.home] < unit.level) return `${BUILDINGS[unit.home].name} ${unit.level}. seviye gerekli.`
  if (unit.tech && !g.research.includes(unit.tech)) return `${RESEARCH[unit.tech].name} araştırması gerekli.`
  if (drillsAt(g, unit.home).length >= DRILL_QUEUE_LIMIT) return `${BUILDINGS[unit.home].name} sırası dolu (en fazla ${DRILL_QUEUE_LIMIT} emir).`
  if (id === 'casus' && g.army.casus + count > spyCapacity(g)) return `Elçilik ${spyCapacity(g)} casus barındırır. Elçiliği yükselt.`
  const need = unit.pop * count
  if (inGarrison(id) && garrisonUsed(g, unit.branch) + need > garrisonLimit(g, unit.branch)) {
    return `Garnizon sınırı dolu (${garrisonUsed(g, unit.branch)}/${garrisonLimit(g, unit.branch)}). ${unit.branch === 'kara' ? "Divanhane'yi ya da Surları" : "Tersane'yi"} yükselt.`
  }
  if (idleWorkers(g) < need) return `${need} boşta vatandaş gerekli. Halk panelinden işçi çek.`
  const c = unitCost(id, count, g)
  if (RESOURCE_IDS.some(r => g.resources[r] < c[r])) return 'Yeterli kaynak yok.'
  const lux = unitLuxuryCost(id, count, g)
  const short = LUXURY_IDS.find(l => g.luxury[l] < (lux[l] ?? 0))
  if (short) return `${lux[short]} ${LUXURY_NAMES[short].toLocaleLowerCase('tr')} gerekli${short === 'kukurt' ? ' (barut)' : ''}.`
  return null
}

export function researchReason(g: Game, id: ResearchId): string | null {
  if (g.research.includes(id)) return 'Araştırma tamamlandı.'
  if (g.study) return 'Önce devam eden araştırmayı tamamla.'
  const needs = RESEARCH[id].needs
  if (needs && !g.research.includes(needs)) return `Önce ${RESEARCH[needs].name} araştırılmalı.`
  if (g.buildings.medrese < RESEARCH[id].required) return `Medrese ${RESEARCH[id].required}. seviye gerekli.`
  if (g.resources.knowledge < RESEARCH[id].cost) return 'Yeterli ilim puanı yok.'
  return null
}
export function objectiveDone(g: Game, id: string) { return OBJECTIVES.find(o => o.id === id)?.done(g) ?? false }
