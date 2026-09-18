import { test } from 'node:test'
import assert from 'node:assert/strict'
import { advance, assignedWorkers, capacity, cost, execute, freePlots, idleWorkers, initialGame, parseSave, population, PLOTS, rates, researchReason, duration, workerCapacity, WORKERS_PER_LEVEL, fullResources, nearlyFullResources, activeJob, QUEUE_LIMIT, housing, contentment, unhousedByUnrest, soldiers, recruitReason, buildReason, unitCost, wallDefense, cityDefense, power, UNITS, BUILDINGS, BUILDING_IDS, zoneOf } from './engine'
import { TILE_W, TILE_H, USES_MEASURED, CENTER_PLOT } from './layout'
import { WORLD, CITY, CITY_SPAN, TILE_WORLD, toWorldX, toWorldY, px, groundShapes, buildingPlacement, visualSignature } from './city-render'

const now = 1_000_000

test('production uses elapsed time and never exceeds storage capacity', () => {
  const g = initialGame(now)
  const result = advance(g, now + 60_000)
  assert.equal(result.resources.wood, g.resources.wood + 120)
  assert.equal(advance(g, now + 24 * 3600_000).resources.wood, capacity(g))
  assert.deepEqual(advance(g, now - 100), g)
})
test('insufficient resources and prerequisites prevent construction', () => {
  const g = initialGame(now)
  assert.match(execute(g, { type: 'build', id: 'medrese' }, now).error!, /Divanhane/)
  g.resources = { gold: 0, wood: 0, stone: 0, knowledge: 0 }
  const result = execute(g, { type: 'build', id: 'divan' }, now)
  assert.match(result.error!, /kaynak/)
  assert.equal(result.game.queue.length, 0)
})
test('double action charges only once and completion applies once', () => {
  const g = initialGame(now), price = cost(g, 'divan')
  const first = execute(g, { type: 'build', id: 'divan' }, now).game
  const second = execute(first, { type: 'build', id: 'divan' }, now)
  assert.ok(second.error)
  assert.equal(second.game.resources.gold, g.resources.gold - price.gold)
  const end = first.queue[0]!.end
  const completed = advance(second.game, end)
  assert.equal(completed.buildings.divan, 2)
  assert.equal(completed.queue.length, 0)
  assert.equal(advance(completed, end + 1000).buildings.divan, 2)
})
test('offline upgrade uses old production before completion and new rate after', () => {
  const g = initialGame(now)
  const started = execute(g, { type: 'build', id: 'kereste' }, now).game
  const result = advance(started, now + 60_000)
  assert.equal(result.resources.wood, started.resources.wood + 60 + 120)
})
test('research requires academy and applies production bonus once', () => {
  const g = initialGame(now)
  assert.match(researchReason(g, 'tools')!, /Medrese/)
  g.buildings.medrese = 1
  const started = execute(g, { type: 'research', id: 'tools' }, now).game
  const completed = advance(started, now + 60_000)
  assert.equal(completed.resources.wood, g.resources.wood + 60 + 72)
  assert.equal(rates(completed).wood, 144)
  assert.deepEqual(completed.research, ['tools'])
  assert.ok(execute(completed, { type: 'research', id: 'tools' }, now + 60_000).error)
})
test('independent queues process events chronologically', () => {
  const g = initialGame(now)
  g.buildings.medrese = 1
  const build = execute(g, { type: 'build', id: 'kereste' }, now).game
  const research = execute(build, { type: 'research', id: 'tools' }, now + 5000).game
  const completed = advance(research, now + 60_000)
  assert.equal(completed.buildings.kereste, 2)
  assert.ok(completed.research.includes('tools'))
  assert.equal(completed.queue.length, 0)
  assert.equal(completed.study, null)
})
test('storage and architecture research change real mechanics', () => {
  const g = initialGame(now), cap = capacity(g), original = duration(g, 'divan')
  g.research = ['storage', 'architecture']
  assert.equal(capacity(g), cap * 1.25)
  assert.equal(duration(g, 'divan'), Math.round(original * .75))
})
test('objective rewards cannot be claimed early or twice', () => {
  const g = initialGame(now)
  assert.ok(execute(g, { type: 'claim', id: 'first-upgrade' }, now).error)
  g.buildings.divan = 2
  const claimed = execute(g, { type: 'claim', id: 'first-upgrade' }, now).game
  assert.equal(claimed.resources.gold, g.resources.gold + 150)
  const second = execute(claimed, { type: 'claim', id: 'first-upgrade' }, now)
  assert.ok(second.error)
  assert.equal(second.game.resources.gold, claimed.resources.gold)
})
test('offline production stops at 8 hours even for non-full resources', () => {
  const g = initialGame(now)
  g.buildings.medrese = 1
  /*
   * Medrese KADROLANIR.
   *
   * v2'de uretim isci sayisina baglidir; iscisiz bir yapi uretmez. Testin
   * konusu 8 saatlik cevrimdisi siniri oldugu icin yapi tam kapasiteyle
   * calistirilir - boylece beklenen sayi eski dengeyle ayni kalir.
   */
  g.workers.medrese = WORKERS_PER_LEVEL
  g.resources.knowledge = 0
  assert.equal(advance(g, now + 24 * 3600_000).resources.knowledge, 8 * 60 * 8)
})
test('save validation rejects malformed saves without silently losing data', () => {
  const g = initialGame(now)
  assert.deepEqual(parseSave(JSON.stringify(g)), g)
  assert.throws(() => parseSave('{'))
  assert.throws(() => parseSave(JSON.stringify({ ...g, version: 99 })))
  assert.throws(() => parseSave(JSON.stringify({ ...g, queue: [{ kind: 'build', id: 'invalid', start: now, end: now + 1 }] })))
  assert.throws(() => parseSave(JSON.stringify({ ...g, resources: { ...g.resources, gold: -1 } })))
})

/* ---------------------------------------------------------------------------
 * v2: ISCI DAGITIMI VE ARSALAR
 * ------------------------------------------------------------------------ */

test('uretim isci sayisiyla orantilidir', () => {
  const full = initialGame(now)
  const half = { ...full, workers: { ...full.workers, kereste: WORKERS_PER_LEVEL / 2 } }
  assert.equal(rates(full).wood, 120)
  assert.equal(rates(half).wood, 60)
  // Akce halkin vergisidir; isci istemez.
  assert.equal(rates(half).gold, rates(full).gold)
})

test('isci atamasi kapasite ve nufusla sinirlidir', () => {
  const g = initialGame(now)
  // Kapasite: seviye 1 x 20 isci.
  const over = execute(g, { type: 'workers', id: 'kereste', value: 999 }, now).game
  assert.equal(over.workers.kereste, WORKERS_PER_LEVEL)
  // Nufus 120; tas ocagi da kapasitesine kadar alabilir.
  const both = execute(over, { type: 'workers', id: 'tas', value: 999 }, now).game
  assert.equal(both.workers.tas, WORKERS_PER_LEVEL)
  assert.equal(idleWorkers(both), population(both) - 2 * WORKERS_PER_LEVEL)
})

test('nufus dolunca yeni atama bostaki halkla sinirlanir', () => {
  const g = initialGame(now)
  // Nufusu yapay olarak dusur: konutu sifirlamak yerine dogrudan kalabalik kur.
  const crowded: typeof g = { ...g, buildings: { ...g.buildings, kereste: 5, tas: 5 } }
  const all = execute(crowded, { type: 'workers', id: 'kereste', value: 999 }, now).game
  assert.equal(all.workers.kereste, 5 * WORKERS_PER_LEVEL)
  const rest = execute(all, { type: 'workers', id: 'tas', value: 999 }, now).game
  // Nufus 120, keresteye 100 gitti; tasa yalnizca 20 kalir.
  assert.equal(rest.workers.tas, population(rest) - all.workers.kereste)
  assert.equal(idleWorkers(rest), 0)
})

test('yukseltme biten uretim yapisina bosta halk KENDILIGINDEN gider', () => {
  let g = initialGame(now)
  g = execute(g, { type: 'build', id: 'kereste' }, now).game
  const before = g.workers.kereste
  const after = advance(g, g.queue[0]!.end + 1)
  assert.equal(after.buildings.kereste, 2)
  assert.equal(after.workers.kereste, before + WORKERS_PER_LEVEL)
})

test('yeni yapi BOS bir arsaya oturur, ayni arsaya iki yapi girmez', () => {
  const g = initialGame(now)
  assert.equal(g.placement.medrese, null)
  const free = freePlots(g)
  assert.equal(free.length, PLOTS.length - 5)

  const rich = { ...g, buildings: { ...g.buildings, divan: 2 }, resources: { gold: 9e4, wood: 9e4, stone: 9e4, knowledge: 9e4 } }
  const built = execute(rich, { type: 'build', id: 'medrese', plot: free[1] }, now)
  assert.equal(built.error, undefined)
  assert.equal(built.game.placement.medrese, free[1])
  // Dolu bir arsa reddedilir.
  const clash = execute(rich, { type: 'build', id: 'medrese', plot: rich.placement.divan! }, now)
  assert.equal(clash.game.placement.medrese, null)
  assert.match(clash.error ?? '', /arsa/i)
})

/*
 * Arsalar artik RESIMDEN OLCULMUYOR, izgaradan hesaplaniyor. Bu testler o
 * sozu tutuyor: koordinat yok, bolge var, ve yeni bina eklemek yerlesim
 * dosyalarina dokunmayi gerektirmiyor.
 */
test('arsalar gecerli ve tekil; bolgeler tanimli', () => {
  // Arsalar ya resimden OLCULUR ya da izgaradan turer; bu testler iki kipte
  // de gecerli olan kurallari sinar - sayilari resimle birlikte degisir.
  assert.ok(PLOTS.length >= 5)
  assert.ok(PLOTS.every((slot, i) => slot.index === i))
  // Konumlar bir KOORDINAT UZAYI (0-100 degil): halka dizilimde dis arsalar
  // 100'u asabilir, dunyaya CITY olcegiyle tasinir. Sonlu ve tekil olmalari yeter.
  assert.ok(PLOTS.every(s => Number.isFinite(s.x) && Number.isFinite(s.y)))
  const keys = PLOTS.map(s => `${s.x.toFixed(2)},${s.y.toFixed(2)}`)
  assert.equal(new Set(keys).size, keys.length)
  // Hepsi dunya sinirlari icinde: kamera sinirindan tasan arsa erisilemez olurdu.
  assert.ok(PLOTS.every(s => toWorldX(s.x) > 0 && toWorldX(s.x) < WORLD && toWorldY(s.y) > 0 && toWorldY(s.y) < WORLD))
  const g = initialGame(now)
  assert.equal(freePlots(g).length, PLOTS.length - 5)
  assert.equal(freePlots(g, 'sehir').length + freePlots(g, 'liman').length, freePlots(g).length)
})

test('surlar arsa kaplamaz', () => {
  const g = initialGame(now)
  g.buildings.divan = 3; g.buildings.kisla = 1
  g.placement.kisla = freePlots(g)[0]
  g.resources = { gold: 99_000, wood: 99_000, stone: 99_000, knowledge: 0 }
  const before = freePlots(g).length
  const walls = execute(g, { type: 'build', id: 'surlar' }, now).game
  assert.equal(walls.placement.surlar, null)
  assert.equal(freePlots(walls).length, before)
  assert.equal(parseSave(JSON.stringify(advance(walls, walls.queue[0].end))).buildings.surlar, 1)
})

test('yapi kendi bolgesine kurulur', () => {
  const quay = PLOTS.find(s => s.zone === 'liman')
  if (!quay) return   // Bu arkaplanda iskele yok; kural zaten uygulanamaz.
  const g = initialGame(now)
  g.buildings.divan = 3; g.buildings.liman = 1
  g.placement.liman = quay.index
  g.resources = { gold: 99_000, wood: 99_000, stone: 99_000, knowledge: 0 }
  const yamac = freePlots(g, 'sehir')[0]
  assert.match(execute(g, { type: 'build', id: 'tersane', plot: yamac }, now).error!, /iskele/)
  const built = execute(g, { type: 'build', id: 'tersane' }, now).game
  assert.equal(PLOTS[built.placement.tersane!].zone, 'liman')
})

test('yeni bina eklemek yalnizca katalog satiri ister', () => {
  const g = initialGame(now)
  // Her katalog satiri kendi kendine yeter: seviye, arsa ve isci turetilir.
  for (const id of BUILDING_IDS) {
    assert.equal(typeof BUILDINGS[id].name, 'string')
    assert.equal(g.buildings[id], BUILDINGS[id].name && ['divan', 'konut', 'kereste', 'tas', 'ambar'].includes(id) ? 1 : 0)
    assert.ok(g.placement[id] === null || PLOTS[g.placement[id]!].zone === zoneOf(id))
  }
  // Yerlesimi olan her yapinin seviyesi de vardir ve tersi.
  const placed = BUILDING_IDS.filter(id => g.placement[id] !== null)
  assert.deepEqual(placed.sort(), ['ambar', 'divan', 'kereste', 'konut', 'tas'])
})

test('v1 kaydi guncel surume tasinir: yerlesim, isciler ve sira turetilir', () => {
  const legacy = {
    version: 1, updatedAt: now,
    resources: { gold: 100, wood: 100, stone: 100, knowledge: 10 },
    buildings: { divan: 2, konut: 1, kereste: 3, tas: 1, ambar: 1, medrese: 0 },
    research: [], construction: null, study: null, claimed: [],
    log: [{ text: 'eski sehir', time: now }],
  }
  const g = parseSave(JSON.stringify(legacy))
  // Goc ZINCIRLENIR: v1 -> v2 (yerlesim, isciler) -> v3 (insaat sirasi).
  assert.equal(g.version, 3)
  assert.deepEqual(g.queue, [])
  assert.equal(g.placement.divan, 0)
  // Kurulmamis yapi arsa tutmaz.
  assert.equal(g.placement.medrese, null)
  // Isciler kapasiteye kadar doldurulur; boylece uretim eski degeriyle ayni kalir.
  assert.equal(g.workers.kereste, Math.min(3 * WORKERS_PER_LEVEL, population(g)))
  assert.equal(rates(g).stone, 90)
})

/*
 * Yerlesim artik REDDEDILMIYOR, ONARILIYOR.
 *
 * Iki yapinin ayni arsada olmasi ya da izgara degistigi icin indeksin
 * bosluga dusmesi, sehri silmeyi gerektiren bir sey degil: bilgi kayipsiz
 * tasinabilir. Onarim ayni zamanda kurali UYGULAR - reddetmek yalnizca
 * kontrol ederdi.
 */
test('cakisan yerlesim onarilir, sehir silinmez', () => {
  const g = initialGame(now)
  const broken = { ...g, placement: { ...g.placement, konut: g.placement.divan } }
  const fixed = parseSave(JSON.stringify(broken))
  assert.notEqual(fixed.placement.konut, fixed.placement.divan)
  assert.equal(fixed.buildings.konut, g.buildings.konut)
  const spots = BUILDING_IDS.map(id => fixed.placement[id]).filter(p => p !== null)
  assert.equal(new Set(spots).size, spots.length)
})

test('arsa listesi disina dusen yapi bos bir arsaya tasinir', () => {
  const g = initialGame(now)
  g.buildings.divan = 2; g.buildings.medrese = 1
  g.placement.medrese = freePlots(g)[0]
  // Arsa sayisi arkaplanla birlikte kuculmus gibi: indeks bosluga dusuyor.
  const stale = { ...g, placement: { ...g.placement, medrese: PLOTS.length + 5 } }
  const fixed = parseSave(JSON.stringify(stale))
  assert.ok(fixed.placement.medrese !== null && fixed.placement.medrese < PLOTS.length)
  assert.equal(fixed.buildings.medrese, 1)
})

test('gercekten okunamayan kayit yine reddedilir', () => {
  const g = initialGame(now)
  assert.throws(() => parseSave(JSON.stringify({ ...g, buildings: { ...g.buildings, divan: 99 } })))
  assert.throws(() => parseSave(JSON.stringify({ ...g, resources: { ...g.resources, gold: -5 } })))
  assert.throws(() => parseSave(JSON.stringify({ ...g, version: 1, buildings: null })))
})

test('kayittaki asiri isci sayisi budanir', () => {
  const g = initialGame(now)
  const greedy = { ...g, workers: { kereste: 9999, tas: 9999, medrese: 0 } }
  const parsed = parseSave(JSON.stringify(greedy))
  assert.ok(assignedWorkers(parsed) <= population(parsed))
  assert.ok(parsed.workers.kereste <= workerCapacity(parsed, 'kereste'))
})

test('carsi akceyi ISCIYLE uretir; iscisizken hazineye katki vermez', () => {
  const g = initialGame(now)
  const base = rates(g).gold
  const built = { ...g, buildings: { ...g.buildings, carsi: 1 } }
  // Kurulu ama kadrosuz carsi hicbir sey eklemez.
  assert.equal(rates(built).gold, base)
  const staffed = { ...built, workers: { ...built.workers, carsi: WORKERS_PER_LEVEL } }
  assert.equal(rates(staffed).gold, base + 100)
  // Yarim kadro yarim gelir.
  const half = { ...built, workers: { ...built.workers, carsi: WORKERS_PER_LEVEL / 2 } }
  assert.equal(rates(half).gold, base + 50)
})

test('katalogda YENI yapi olan eski kayit bozulmadan yuklenir', () => {
  const g = initialGame(now)
  // Carsi'dan once kaydedilmis bir sehir: alanlarin hicbirinde carsi yok.
  const older = JSON.parse(JSON.stringify(g)) as Record<string, Record<string, unknown>>
  delete older.buildings.carsi
  delete older.placement.carsi
  delete older.workers.carsi
  const parsed = parseSave(JSON.stringify(older))
  assert.equal(parsed.buildings.carsi, 0)
  assert.equal(parsed.placement.carsi, null)
  assert.equal(parsed.workers.carsi, 0)
  // Sehrin geri kalani aynen korunur.
  assert.equal(parsed.buildings.kereste, g.buildings.kereste)
  assert.equal(rates(parsed).wood, rates(g).wood)
})

test('dolu ambar bildirilir; dolmaya yakin olan ayri sayilir', () => {
  const g = initialGame(now)
  const limit = capacity(g)
  const full = { ...g, resources: { ...g.resources, wood: limit } }
  assert.deepEqual(fullResources(full), ['wood'])
  assert.deepEqual(nearlyFullResources(full), [])

  const nearly = { ...g, resources: { ...g.resources, stone: limit * 0.95 } }
  assert.deepEqual(fullResources(nearly), [])
  assert.deepEqual(nearlyFullResources(nearly), ['stone'])
})

test('dolu ambarda uretim GERCEKTEN bosa gider - uyarinin sebebi budur', () => {
  const g = initialGame(now)
  const limit = capacity(g)
  const full = { ...g, resources: { ...g.resources, wood: limit } }
  const later = advance(full, now + 60_000)
  assert.equal(later.resources.wood, limit)
  assert.ok(fullResources(later).includes('wood'))
})

/* ---------------------------------------------------------------------------
 * v3: INSAAT SIRASI
 * ------------------------------------------------------------------------ */

test('sirada bekleyen isin sayaci oncekinin bitisinde baslar', () => {
  const rich = { ...initialGame(now), resources: { gold: 9e5, wood: 9e5, stone: 9e5, knowledge: 9e5 } }
  const first = execute(rich, { type: 'build', id: 'kereste' }, now).game
  const second = execute(first, { type: 'build', id: 'tas' }, now).game
  assert.equal(second.queue.length, 2)
  // Ikinci is, birincinin bittigi anda baslar - ayni anda bitmezler.
  assert.equal(second.queue[1].start, second.queue[0].end)
  assert.ok(second.queue[1].end > second.queue[0].end)
})

test('sira sinirlidir ve ayni yapi iki kez giremez', () => {
  let g = { ...initialGame(now), resources: { gold: 9e5, wood: 9e5, stone: 9e5, knowledge: 9e5 } }
  g = execute(g, { type: 'build', id: 'kereste' }, now).game
  // Ayni yapi ikinci kez reddedilir: fiyat o anki seviyeden hesaplandigi icin
  // iki seviye tek seviyenin fiyatina alinmis olurdu.
  assert.match(execute(g, { type: 'build', id: 'kereste' }, now).error ?? '', /sırasında/)
  g = execute(g, { type: 'build', id: 'tas' }, now).game
  g = execute(g, { type: 'build', id: 'konut' }, now).game
  assert.equal(g.queue.length, QUEUE_LIMIT)
  assert.match(execute(g, { type: 'build', id: 'ambar' }, now).error ?? '', /sıras[ıi] dolu/)
})

test('sira SIRAYLA tamamlanir; arada kalan is bekler', () => {
  let g = { ...initialGame(now), resources: { gold: 9e5, wood: 9e5, stone: 9e5, knowledge: 9e5 } }
  g = execute(g, { type: 'build', id: 'kereste' }, now).game
  g = execute(g, { type: 'build', id: 'tas' }, now).game
  const firstEnd = g.queue[0].end

  // Birincinin bitisinde yalnizca o tamamlanir.
  const mid = advance(g, firstEnd)
  assert.equal(mid.buildings.kereste, 2)
  assert.equal(mid.buildings.tas, 1)
  assert.equal(mid.queue.length, 1)
  assert.equal(activeJob(mid)?.id, 'tas')

  const done = advance(mid, mid.queue[0].end)
  assert.equal(done.buildings.tas, 2)
  assert.equal(done.queue.length, 0)
})

test('v2 kaydindaki devam eden insaat siraya donusur', () => {
  const g = initialGame(now)
  const legacy = { ...JSON.parse(JSON.stringify(g)), version: 2, construction: { id: 'kereste', kind: 'build', start: now, end: now + 30_000 } }
  delete (legacy as Record<string, unknown>).queue
  const parsed = parseSave(JSON.stringify(legacy))
  assert.equal(parsed.version, 3)
  assert.equal(parsed.queue.length, 1)
  assert.equal(parsed.queue[0].id, 'kereste')
  assert.equal(parsed.queue[0].end, now + 30_000)
})

/* ---------------------------------------------------------------------------
 * HALKIN HUZURU
 * ------------------------------------------------------------------------ */

test('oyunun basinda huzur nufusu KISITLAMAZ', () => {
  const g = initialGame(now)
  // Taban huzur, baslangic barinmasina esit secildi: eski denge korunur.
  assert.equal(housing(g), 120)
  assert.equal(contentment(g), 120)
  assert.equal(population(g), 120)
  assert.equal(unhousedByUnrest(g), 0)
})

test('Konaklar yukselince huzur tavan olur; Hamam tavani kaldirir', () => {
  const g = initialGame(now)
  const grown = { ...g, buildings: { ...g.buildings, konut: 2 } }
  assert.equal(housing(grown), 160)
  assert.equal(contentment(grown), 120)
  // Nufus barinmayi DEGIL huzuru takip eder.
  assert.equal(population(grown), 120)
  assert.equal(unhousedByUnrest(grown), 40)

  const bathed = { ...grown, buildings: { ...grown.buildings, hamam: 1 } }
  assert.equal(contentment(bathed), 180)
  assert.equal(population(bathed), 160)
  assert.equal(unhousedByUnrest(bathed), 0)
})

test('isci tavanini belirleyen sey barinma degil HUZURDUR', () => {
  const g = initialGame(now)
  // Konaklar 3: barinma 200. Huzur hala 120, cunku Hamam yok.
  const grown = {
    ...g,
    buildings: { ...g.buildings, konut: 3, kereste: 5, tas: 5 },
    workers: { ...g.workers, kereste: 0, tas: 0 },
  }
  assert.equal(housing(grown), 200)
  assert.equal(contentment(grown), 120)

  // Iki ocagin toplam kapasitesi 200; ama sehirde yalnizca 120 kisi var.
  let city = execute(grown, { type: 'workers', id: 'kereste', value: 999 }, now).game
  city = execute(city, { type: 'workers', id: 'tas', value: 999 }, now).game
  assert.equal(city.workers.kereste, 100)
  assert.equal(city.workers.tas, 20)
  assert.equal(assignedWorkers(city), 120)
  assert.equal(idleWorkers(city), 0)

  // Hamam kurulunca huzur 180'e cikar ve bekleyen kapasite dolabilir.
  const bathed = { ...city, buildings: { ...city.buildings, hamam: 1 } }
  const more = execute(bathed, { type: 'workers', id: 'tas', value: 999 }, now).game
  assert.equal(more.workers.tas, 80)
  assert.equal(rates(more).stone, 5 * 90 * (80 / 100))
})

test('INSAAT HALINDEKI yeni yapi kaydi bozmaz', () => {
  /*
   * Gerileme testi: yeni bir yapinin arsasi is siraya girer girmez ayrilir
   * ama seviyesi 0 kalir. Dogrulama bunu gecersiz sayarsa oyuncu ilk yeni
   * yapisini kurdugu anda sayfayi yenilediginde SEHRINI KAYBEDER.
   */
  const g = { ...initialGame(now), buildings: { ...initialGame(now).buildings, divan: 2 }, resources: { gold: 9e5, wood: 9e5, stone: 9e5, knowledge: 9e5 } }
  const started = execute(g, { type: 'build', id: 'medrese' }, now).game
  assert.equal(started.buildings.medrese, 0)
  assert.notEqual(started.placement.medrese, null)

  const reloaded = parseSave(JSON.stringify(started))
  assert.equal(reloaded.placement.medrese, started.placement.medrese)
  assert.equal(reloaded.queue.length, 1)

  // Is bitince seviye gelir, arsa ayni kalir.
  const done = advance(reloaded, reloaded.queue[0].end)
  assert.equal(done.buildings.medrese, 1)
  assert.equal(done.placement.medrese, started.placement.medrese)
  assert.deepEqual(parseSave(JSON.stringify(done)).placement, done.placement)
})

test('arsasi olan ama ne kurulu ne sirada olan yapi reddedilir', () => {
  const g = initialGame(now)
  const ghost = { ...g, placement: { ...g.placement, medrese: 6 } }
  assert.throws(() => parseSave(JSON.stringify(ghost)))
})

/*
 * ORDU.
 *
 * Tasarimin tek onemli kurali burada sinanir: asker halktan cikar. Testler
 * once bedelin GERCEKTEN odendigini (bosta halk azalir), sonra bedelin iki
 * kez odenmedigini (egitim bitince nufus yeniden dusmez) gosterir.
 */
function withBarracks(base = initialGame(now)) {
  const g = structuredClone(base)
  g.buildings.divan = 3
  g.buildings.kisla = 3
  // Kurulu her yapinin bir arsasi olmali; kayit dogrulamasi bunu arar.
  g.placement.kisla = 5
  g.resources = { gold: 20_000, wood: 20_000, stone: 20_000, knowledge: 0 }
  return g
}

test('asker egitimi kisla ve bosta halk ister', () => {
  const fresh = initialGame(now)
  assert.match(execute(fresh, { type: 'recruit', id: 'yeniceri', count: 1 }, now).error!, /Kışla/)
  const g = withBarracks()
  // Butun halk uretimde: once isci cekilmeden asker alinamaz.
  g.workers = { kereste: 20, tas: 20, medrese: 0, carsi: 0 }
  const full = structuredClone(g)
  full.buildings.konut = 1
  full.workers = { kereste: 20, tas: 20, medrese: 0, carsi: 0 }
  const need = population(full) - assignedWorkers(full) + 1
  assert.match(execute(full, { type: 'recruit', id: 'yeniceri', count: need }, now).error!, /boşta vatandaş/)
})

test('egitim emri vatandasi ANINDA ayirir, bitince ikinci kez ayirmaz', () => {
  const g = withBarracks()
  const idleBefore = idleWorkers(g)
  const ordered = execute(g, { type: 'recruit', id: 'sipahi', count: 5 }, now).game
  // Sipahi 2 vatandas: 5 sipahi = 10 kisi, emir verilir verilmez dusmeli.
  assert.equal(soldiers(ordered), 10)
  assert.equal(idleWorkers(ordered), idleBefore - 10)
  assert.equal(ordered.army.sipahi, 0)
  // Ayni bos halkla ikinci emir verilemez.
  assert.ok(execute(ordered, { type: 'recruit', id: 'sipahi', count: 1 }, now).error)
  const done = advance(ordered, ordered.drill!.end)
  assert.equal(done.army.sipahi, 5)
  assert.equal(done.drill, null)
  assert.equal(soldiers(done), 10)
  assert.equal(idleWorkers(done), idleBefore - 10)
})

test('asker isci kapasitesini daraltir', () => {
  const g = withBarracks()
  const before = execute(g, { type: 'workers', id: 'kereste', value: 20 }, now).game
  assert.equal(before.workers.kereste, 20)
  // Halkin tamami askere gidince uretime kimse kalmaz.
  const drafted = structuredClone(g)
  drafted.army.yeniceri = population(g)
  assert.equal(idleWorkers(drafted), 0)
  assert.equal(execute(drafted, { type: 'workers', id: 'kereste', value: 20 }, now).game.workers.kereste, 0)
  assert.equal(rates(drafted).wood, 0)
})

test('egitim maliyeti bir kez alinir ve ayni anda tek emir yurur', () => {
  const g = withBarracks()
  const price = unitCost('yeniceri', 4)
  const first = execute(g, { type: 'recruit', id: 'yeniceri', count: 4 }, now)
  assert.equal(first.game.resources.gold, g.resources.gold - price.gold)
  const second = execute(first.game, { type: 'recruit', id: 'okcu', count: 1 }, now)
  assert.match(second.error!, /Eğitim sürüyor/)
  assert.equal(second.game.resources.gold, first.game.resources.gold)
})

test('birlik ve bina on kosullari', () => {
  const g = withBarracks()
  g.buildings.kisla = 1
  assert.match(recruitReason(g, 'sipahi', 1)!, /Kışla 2/)
  assert.match(recruitReason(g, 'kadirga', 1)!, /Tersane/)
  assert.match(recruitReason(g, 'nakliye', 1)!, /Ticaret Limanı/)
  assert.equal(recruitReason(g, 'yeniceri', 1), null)
  const city = initialGame(now)
  city.resources = { gold: 99_000, wood: 99_000, stone: 99_000, knowledge: 0 }
  assert.match(buildReason(city, 'saray')!, /Divanhane 3/)
  assert.match(buildReason(city, 'tersane')!, /Ticaret Limanı 1/)
  assert.match(buildReason(city, 'surlar')!, /Kışla 1/)
})

test('savunma surlardan ve kara birliklerinden gelir', () => {
  const g = withBarracks()
  g.buildings.surlar = 2
  g.army.yeniceri = 10
  g.army.kadirga = 3
  assert.equal(wallDefense(g), 300)
  // Gemiler sehrin kara savunmasina sayilmaz.
  assert.equal(cityDefense(g), 300 + 10 * UNITS.yeniceri.defense)
  assert.equal(power(g, 'deniz').attack, 3 * UNITS.kadirga.attack)
})

test('ordu kaydedilir; ordusuz eski kayit da okunur', () => {
  const g = withBarracks()
  const ordered = execute(g, { type: 'recruit', id: 'okcu', count: 3 }, now).game
  const parsed = parseSave(JSON.stringify(ordered))
  assert.equal(parsed.drill!.count, 3)
  assert.deepEqual(parsed.army, ordered.army)
  // Askerler eklenmeden once kaydedilmis bir sehir alanlarsiz gelir.
  const legacy = JSON.parse(JSON.stringify(initialGame(now))) as Record<string, unknown>
  delete legacy.army
  delete legacy.drill
  const migrated = parseSave(JSON.stringify(legacy))
  assert.equal(migrated.drill, null)
  assert.equal(soldiers(migrated), 0)
})

test('nufusun besleyemedigi ordu kaydi reddedilir', () => {
  const g = withBarracks()
  g.army.kalyon = 99
  assert.throws(() => parseSave(JSON.stringify(g)), /Ordu kaydı geçersiz/)
})

/*
 * ÇİZİM VERİSİ.
 *
 * Render motoru degisebilir - SVG'den Phaser'a gectik - ama geometri
 * degismemeli. Bu testler tarayici acmadan o sozu tutuyor.
 */
test('yuzde -> dunya cevrimi tek yerden ve tutarli', () => {
  assert.equal(CITY_SPAN, 100 * CITY.scale)
  assert.equal(toWorldX(0), CITY.x)
  assert.equal(toWorldY(0), CITY.y)
  assert.equal(toWorldX(100), CITY.x + CITY_SPAN)
  // Butun arsalar dunyanin icinde kalmali, yoksa kamera siniri disina tasar.
  assert.ok(PLOTS.every(s => toWorldX(s.x) > 0 && toWorldX(s.x) < WORLD))
  assert.ok(PLOTS.every(s => toWorldY(s.y) > 0 && toWorldY(s.y) < WORLD))
  // Olcu ile konum ayri: olcuye kaydirma eklenmez.
  assert.equal(px(100), CITY_SPAN)
  assert.equal(TILE_WORLD, px(TILE_W))
})

test('zemin geometrisi: arsalar dolulugu bilir, sur yalnizca izgarada cizilir', () => {
  const g = initialGame(now)
  const bare = groundShapes(g)
  assert.equal(bare.pads.length, PLOTS.length)
  assert.equal(bare.pads.filter(p => p.occupied).length, 5)
  assert.equal(bare.walls, null)

  const thick = groundShapes({ ...g, buildings: { ...g.buildings, surlar: 5 } })
  if (USES_MEASURED) {
    /*
     * Olculmus arsalarda sur CIZILMEZ: boyali ada kendi surlarini tasiyor ve
     * arsalarin sinirlarindan turetilmis bir sekizgen manzaranin uzerine
     * bant gibi otururdu.
     */
    assert.equal(thick.walls, null)
    assert.deepEqual(thick.roads, [])
  } else {
    const thin = groundShapes({ ...g, buildings: { ...g.buildings, surlar: 1 } })
    const width = (s: typeof thin) => {
      const xs = s.walls!.outer.map(p => p.x)
      return Math.max(...xs) - Math.min(...xs)
    }
    // Seviye arttikca sur DISARI acilir: oyuncu savunmasini siluetten gorur.
    assert.ok(width(thick) > width(thin))
    assert.ok(Math.min(...thick.walls!.outer.map(p => p.x)) > 0)
  }
})

test('bina karonun uzerine oturur', () => {
  const slot = PLOTS[0]
  const p = buildingPlacement('konut', slot)
  assert.equal(p.x, toWorldX(slot.x))
  assert.equal(p.y, toWorldY(slot.y))
  // Kare gorselin tabani, karo merkezinin yarim karo ALTINDA biter.
  const bottom = p.y + p.size * (1 - p.originY)
  assert.ok(Math.abs(bottom - (p.y + px(TILE_H / 2))) < 0.001)
  // Divanhane daha buyuktur ama yine ayni noktada durur.
  assert.ok(buildingPlacement('divan', slot).size > p.size)
})

test('gorsel imza yalnizca GORUNEN degisiklikte degisir', () => {
  const g = initialGame(now)
  const tick = advance(g, now + 30_000)
  // Kaynaklar arttı ama sahnede degisen bir sey yok: sahne yeniden cizilmez.
  assert.ok(tick.resources.wood > g.resources.wood)
  assert.equal(visualSignature(tick), visualSignature(g))
  const built = execute({ ...g, resources: { gold: 9e4, wood: 9e4, stone: 9e4, knowledge: 0 } },
    { type: 'build', id: 'divan' }, now).game
  assert.notEqual(visualSignature(built), visualSignature(g))
})

/*
 * BELEDIYE MERKEZDE + YOLLAR.
 *
 * Belediye (divan) her zaman merkez arsada, cakili durur; her bina ona bir
 * yolla baglanir ve belediye seviye atladikca yol agi bir sonraki halkaya uzar.
 */
test('belediye merkez arsada cakili baslar; yollari oyuncu doser', () => {
  const g = initialGame(now)
  assert.equal(g.placement.divan, CENTER_PLOT)
  // Yollar ARTIK otomatik degil: sehir yolsuz baslar, geometri uretilmez.
  assert.deepEqual(g.roads, [])
  assert.equal(groundShapes(g).roads.length, 0)
  // 'road' komutu bir yol hucresini acar; tekrari kaldirir (ac/kapat).
  const laid = execute(g, { type: 'road', cell: '2,-1' }, now).game
  assert.deepEqual(laid.roads, ['2,-1'])
  const erased = execute(laid, { type: 'road', cell: '2,-1' }, now).game
  assert.deepEqual(erased.roads, [])
  // Gecersiz bicimli hucre yok sayilir.
  assert.deepEqual(execute(g, { type: 'road', cell: 'x' }, now).game.roads, [])
  // Dosenen yollar kayittan aynen geri okunur.
  assert.deepEqual(parseSave(JSON.stringify(execute(g, { type: 'road', cell: '0,0' }, now).game)).roads, ['0,0'])
})

test('bina yatayda aynalanir (flip); kayitta korunur', () => {
  const g = initialGame(now)
  assert.deepEqual(g.flips, [])
  const flipped = execute(g, { type: 'flip', id: 'konut' }, now).game
  assert.deepEqual(flipped.flips, ['konut'])
  // Tekrar cagirinca eski haline doner.
  assert.deepEqual(execute(flipped, { type: 'flip', id: 'konut' }, now).game.flips, [])
  assert.deepEqual(parseSave(JSON.stringify(flipped)).flips, ['konut'])
})

test('liman ve tersane denizin kenarindaki iskeleye kurulur', () => {
  const g = initialGame(now)
  g.buildings.divan = 3
  g.resources = { gold: 9e4, wood: 9e4, stone: 9e4, knowledge: 0 }
  // Denizin kenarinda tam iki iskele var (iki koy).
  const quays = PLOTS.filter(s => s.zone === 'liman')
  assert.equal(quays.length, 2)
  // Ticaret Limani bir iskeleye oturur, sehir arsasina degil.
  const withHarbour = execute(g, { type: 'build', id: 'liman' }, now).game
  assert.notEqual(withHarbour.placement.liman, null)
  assert.equal(PLOTS[withHarbour.placement.liman!].zone, 'liman')
  // Tersane de digerine; ikisi de denizde.
  withHarbour.buildings.liman = 1
  const withYard = execute(withHarbour, { type: 'build', id: 'tersane' }, now).game
  assert.notEqual(withYard.placement.tersane, null)
  assert.equal(PLOTS[withYard.placement.tersane!].zone, 'liman')
  // Iskeleler sehrin ALTINDA, denize dogru: kara arsalarindan daha asagida.
  const cityBottom = Math.max(...PLOTS.filter(s => s.zone === 'sehir').map(s => s.y))
  assert.ok(quays.every(q => q.y > cityBottom))
})
