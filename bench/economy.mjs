/**
 * Sprint 11 - ekonomi ve ilerleyis olcumu.
 *
 * Kullanim:  node bench/economy.mjs [url] [dpr]
 *
 * YENI BIR EKONOMI SIMULASYONU YAZILMADI. Olcum, gercek oyunun kendi
 * sistemlerini (BuildingSystem, WorkforceSystem, UpgradeSystem, Simulation)
 * tarayicida surerek yapilir; buradaki kod yalnizca "makul bir oyuncu" gibi
 * karar verir ve belirli dakikalarda durumu OKUR.
 *
 * Iki senaryo:
 *   AKTIF - oyuncu her dakika karar veriyor (insa, atama, yukseltme)
 *   PASIF - acilistaki kurulum disinda hicbir karar yok
 *
 * Her senaryo SIFIRDAN bir tarayici baglaminda kosar: ayni baglamda devam
 * etmek onceki senaryonun sehrini otomatik kayittan miras aldiriyordu.
 */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const URL = process.argv[2] ?? 'http://127.0.0.1:5191/';
const DPR = Number(process.argv[3] ?? 1);
/**
 * Olcum uzunlugu (dakika).
 *
 * Sprint 15'e kadar sabit 20 dakikaydi ve gec oyunun iki sorunu (tas
 * talebinin zayifligi, bosta isci birikimi) o pencerede ancak sezilebiliyordu.
 * 60 dakika, ucuncu seviyenin ve arastirmanin devreye girdigi asamayi da
 * kapsar.
 */
const MINUTES = Number(process.argv[4] ?? 20);
/** Durumun okundugu dakikalar; olcum uzunluguna gore turer. */
const CHECKPOINTS = [1, 5, 10, 20, 30, 40, 50, 60].filter((m) => m <= MINUTES);

const browser = await chromium.launch();
const errors = [];

const HARNESS = `
  /* Olcum uzunlugu node tarafindan enjekte edilir; politika metinleri bunu okur. */
  const MINUTES = ${MINUTES};
  const CHECKPOINTS = ${JSON.stringify(CHECKPOINTS)};
  const w = window.game.scene.getScene('CityScene').registry.get('world');
  const KEYS = ['food', 'wood', 'stone', 'gold', 'knowledge'];
  const TYPES = ['town_hall', 'house', 'farm', 'lumber_camp', 'quarry', 'market', 'warehouse',
                 'temple', 'harbor', 'academy'];

  const costOf = (type) => w.buildings.definitionOf({ type }).levels[0].buildCost;

  /**
   * Sprint 12: bina artik YAPI ALANINA kurulur.
   * Merkeze en yakin bos ve uygun alan secilir - sehir disari dogru buyur.
   */
  function place(type) {
    const c = w.state.grid.center();
    const options = w.buildings.availablePlots(type);
    options.sort(
      (a, b) =>
        Math.max(Math.abs(a.gx - c.gx), Math.abs(a.gy - c.gy)) -
        Math.max(Math.abs(b.gx - c.gx), Math.abs(b.gy - c.gy)),
    );
    for (const plot of options) {
      const res = w.buildings.place(type, plot.gx, plot.gy);
      if (res.ok) return res.building;
    }
    return null;
  }

  /** Bosta isciyi kadrosu eksik uretim binalarina yollar. */
  function staffAll() {
    for (const type of ['farm', 'lumber_camp', 'quarry', 'market', 'academy', 'harbor', 'temple']) {
      for (const bld of w.state.buildings.values()) {
        if (bld.type !== type) continue;
        while (w.workforce.idleCount > 0 && w.workforce.assign(bld.uid).ok) { /* doldur */ }
      }
    }
  }

  /**
   * Bu turu kuracak bos isci var mi?
   *
   * 60 dakikalik olcumun ilk temiz kosusunda politika 18 tarla kurdu ve
   * 18'i de kadrosuz kaldi: "yiyecek acigi var" kurali her dakika
   * esliyordu ama tarlayi calistiracak kimse yoktu. Kadrosuz bina hicbir
   * sey uretmez, yalnizca arsa ve kaynak yer. Makul oyuncu calistiramayacagi
   * binayi kurmaz - olcum de oyle davranmali.
   */
  function canStaff(type) {
    const need = w.buildings.definitionOf({ type }).levels[0].workerRequirement || 0;
    return need === 0 || w.workforce.idleCount >= need;
  }

  /** O anki ekonomi fotografi; hepsi mevcut genel API'lardan okunur. */
  function snap(minute) {
    const res = w.resources.snapshot();
    const eco = w.economy.snapshot;
    const wf = w.workforce.snapshot;
    const counts = {};
    let understaffed = 0;
    const upgrades = [];
    for (const bld of w.state.buildings.values()) {
      counts[bld.type] = (counts[bld.type] || 0) + 1;
      const r = w.buildings.resolve(bld);
      if (r.operational && r.workerRequirement > 0 && !r.staffed) understaffed += 1;
      if (r.upgrade && w.resources.canAfford(r.upgrade.cost)) upgrades.push(bld.type + '->' + r.upgrade.toLevel);
    }
    const affordable = TYPES.filter((t) => w.resources.canAfford(costOf(t)));
    return {
      minute, tick: w.state.tick,
      food: Math.round(res.food), wood: Math.round(res.wood),
      stone: Math.round(res.stone), gold: Math.round(res.gold),
      knowledge: Math.round(res.knowledge),
      cap: w.resources.capacity,
      atCap: KEYS.filter((k) => res[k] >= w.resources.capacity - 0.5),
      pop: w.state.population, popCap: eco.populationCapacity,
      idle: wf.idle, working: wf.working, needed: eco.workersNeeded,
      efficiency: Number(eco.efficiency.toFixed(2)),
      net: {
        food: Number(eco.netPerMinute.food.toFixed(2)), wood: Number(eco.netPerMinute.wood.toFixed(2)),
        stone: Number(eco.netPerMinute.stone.toFixed(2)), gold: Number(eco.netPerMinute.gold.toFixed(2)),
        knowledge: Number(eco.netPerMinute.knowledge.toFixed(2)),
      },
      research: w.research.completed.size,
      researching: w.research.active ? w.research.active.id : '',
      maxLevel: Math.max(0, ...[...w.state.buildings.values()].map((b) => b.level)),
      buildings: counts, total: w.state.buildings.size,
      understaffed, upgrades, affordable,
      queued: w.construction.queuedCount, active: w.construction.activeCount,
    };
  }
`;

/*
 * AKTIF OYUNCU POLITIKASI
 *
 * Bilerek basit ve tekrar edilebilir: once sehir merkezi, sonra ihtiyaca
 * gore yiyecek/odun/tas, kapasite dolunca ev, depo dolunca ambar, artan
 * kaynakla pazar ve yukseltme. En IYI oyun degil; makul ve deterministik.
 */
const ACTIVE = `
  const shots = [];
  const log = [];
  const blocked = {};
  shots.push(snap(0));

  const tryBuild = (type, why) => {
    if (blocked[type]) return false;
    if (!w.resources.canAfford(costOf(type))) return false;
    const built = place(type);
    if (!built) { blocked[type] = true; log.push('X ' + type + ': haritada yer yok'); return false; }
    log.push(minute + 'dk: ' + type + ' (' + why + ')');
    return true;
  };

  var minute = 0;
  for (minute = 1; minute <= MINUTES; minute += 1) {
    for (let t = 0; t < 60; t += 1) {
      w.simulation.advance(1);
      if (t % 10 === 0) staffAll();
    }

    const eco = w.economy.snapshot;
    const res = w.resources.snapshot();
    const idle = w.workforce.idleCount;

    /*
     * KARAR LISTESI - ILK KARSILANABILEN KAZANIR
     *
     * Ilk surumde bu bir else-if zinciriydi ve 60 dakikalik olcum onun
     * yanlis oldugunu gosterdi: nufus dolunca "ev kur" kurali eslesiyor,
     * ev tasa yetmediginden hicbir sey kurulmuyor ve zincir orada
     * kesildigi icin oyuncu tas ocagina HIC ULASAMIYORDU. Sehir 60
     * dakika boyunca bes binada kaldi.
     *
     * Gercek oyuncu boyle davranmaz: karsilayamadigi seyi atlar ve
     * listedeki bir sonrakine bakar. Sira hala oncelik sirasidir, ama
     * artik bir dur noktasi degil.
     */
    const wishlist = [];
    if (eco.netPerMinute.wood <= 0 && res.wood < 60) wishlist.push(['lumber_camp', 'odun akisi yok']);
    if (!w.state.countOf('town_hall')) wishlist.push(['town_hall', 'sehir merkezi']);
    if (eco.netPerMinute.stone <= 0) wishlist.push(['quarry', 'tas akisi yok']);
    // Ev ancak isci KITKEN kurulur: bosta isci varken ev kurmak yigini buyutur.
    if (eco.population >= eco.populationCapacity && idle < 3) wishlist.push(['house', 'nufus kapasitesi doldu']);
    if (eco.netPerMinute.food <= 1) wishlist.push(['farm', 'yiyecek acigi']);
    if (idle >= 3 && res.wood < 120) wishlist.push(['lumber_camp', 'odun acigi + bosta isci']);
    if (idle >= 3 && res.stone < 150) wishlist.push(['quarry', 'tas acigi + bosta isci']);
    if (KEYS.some((k) => res[k] >= w.resources.capacity - 0.5)) wishlist.push(['warehouse', 'depo doldu']);
    // Altin akisi yetersizse pazar: oyuncu altini yukseltme icin ister.
    if (eco.netPerMinute.gold < 8) wishlist.push(['market', 'altin acigi']);
    // AKADEMI: sehir ayakta kalinca kurulur ve arastirma zincirini acar.
    if (!w.state.countOf('academy') && w.state.buildings.size >= 6) wishlist.push(['academy', 'arastirma icin']);
    if (idle >= 3) wishlist.push(['market', 'bosta isci fazlasi']);
    if (idle >= 5 && !w.state.countOf('temple')) wishlist.push(['temple', 'bosta isci fazlasi']);
    if (idle >= 5 && !w.state.countOf('harbor')) wishlist.push(['harbor', 'bosta isci fazlasi']);

    for (const [type, why] of wishlist) if (canStaff(type) && tryBuild(type, why)) break;

    /*
     * ARASTIRMA: uygun olan ilk teknoloji baslatilir.
     * Sirayi katalog belirler; politika secim yapmaz, yalnizca kosulu
     * saglayan ilkini alir - deterministik kalir.
     */
    if (!w.research.active) {
      for (const entry of w.research.list()) {
        if (entry.done) continue;
        if (!w.research.canStart(entry.def.id).ok) continue;
        if (w.research.start(entry.def.id).ok) log.push(minute + 'dk: ARASTIRMA ' + entry.def.name);
        break;
      }
    }

    for (const bld of [...w.state.buildings.values()]) {
      const r = w.buildings.resolve(bld);
      if (r.upgrade && w.resources.canAfford(r.upgrade.cost)) {
        if (w.upgrades.requestUpgrade(bld.uid).ok) log.push(minute + 'dk: ' + bld.type + ' Sv.' + r.upgrade.toLevel);
        break;
      }
    }
    staffAll();
    if (CHECKPOINTS.includes(minute)) shots.push(snap(minute));
  }
  return { shots, log };
`;

/*
 * ARASTIRMACI OYUNCU
 *
 * Neden bu senaryo var: AKTIF politika 60 dakikada Akademi'ye hic
 * ulasamadi ve bundan "arastirma erisilemez" sonucu cikarilamaz - o
 * politika yalnizca TEK bir oncelik siralamasini temsil eder ve ham
 * madde kurallari her dakika kazaniyordu. Sorulmasi gereken soru
 * "varsayilan siralama arastirmaya gider mi" degil, "arastirmayi
 * ISTEYEN oyuncunun onunde acik bir yol var mi".
 *
 * Bu oyuncu sehri ayakta tutar ama firsat bulur bulmaz Akademi'yi kurar
 * ve zinciri kovalar.
 */
const SCHOLAR = `
  const shots = [];
  const log = [];
  const blocked = {};
  shots.push(snap(0));

  const tryBuild = (type, why) => {
    if (blocked[type]) return false;
    if (!w.resources.canAfford(costOf(type))) return false;
    const built = place(type);
    if (!built) { blocked[type] = true; log.push('X ' + type + ': haritada yer yok'); return false; }
    log.push(minute + 'dk: ' + type + ' (' + why + ')');
    return true;
  };

  var minute = 0;
  for (minute = 1; minute <= MINUTES; minute += 1) {
    for (let t = 0; t < 60; t += 1) {
      w.simulation.advance(1);
      if (t % 10 === 0) staffAll();
    }

    const eco = w.economy.snapshot;
    const res = w.resources.snapshot();
    const idle = w.workforce.idleCount;

    /*
     * BIRIKTIRME - YALNIZCA YUKSELTMELERI ERTELER
     *
     * Akademi'yi bekleyen oyuncu YUKSELTME yapmaz, cunku yukseltme saf
     * bir harcamadir ve hedefi geciktirir. Ama yeni GELIR binasi kurmaya
     * devam eder: hedefe ancak gelirle ulasilir.
     *
     * Bu ayrim pahaliya ogrenildi. Once biriktirme yeni bina kurmayi da
     * kesiyordu ve politika kendi hedefini bogdu: oduncu kampi kesilince
     * odun geliri 5'te kaldi, odun 12'ye dustu ve Akademi'nin istedigi 90
     * odun hicbir zaman birikmedi - tas 413'e, altin 257'ye ciktigi halde.
     * Biriktirmek buyumeyi durdurmak degil, harcamayi secmektir.
     */
    const saving = !w.state.countOf('academy') && eco.netPerMinute.stone > 0;

    const wishlist = [];
    // Ayakta kalma kurallari once; acliktan olen sehir arastirma yapamaz.
    if (eco.netPerMinute.food <= 0) wishlist.push(['farm', 'yiyecek acigi']);
    if (eco.netPerMinute.wood <= 0 && res.wood < 60) wishlist.push(['lumber_camp', 'odun akisi yok']);
    if (eco.netPerMinute.stone <= 0) wishlist.push(['quarry', 'tas akisi yok']);
    if (!w.state.countOf('town_hall')) wishlist.push(['town_hall', 'sehir merkezi']);
    // Sonra ARASTIRMA yolu: akademi ve onu besleyen altin.
    if (!w.state.countOf('academy')) wishlist.push(['academy', 'arastirma yolu']);
    if (eco.netPerMinute.gold < 10) wishlist.push(['market', 'arastirma altini']);
    if (eco.population >= eco.populationCapacity && idle < 3) wishlist.push(['house', 'nufus kapasitesi doldu']);
    /*
     * Biriktirme TAS harcamasini keser, GELIRI degil. Ocak yalnizca odun
     * ister; biriktiren oyuncu onu kurmaya devam eder cunku hedefe daha
     * hizli goturur. Ilk denemede ocak da kesilmisti ve sehir 9 binada
     * donmustu - biriktirmek buyumeyi durdurmak degildir.
     */
    if (idle >= 2 && eco.netPerMinute.wood < 12) wishlist.push(['lumber_camp', 'odun geliri']);
    if (idle >= 2 && eco.netPerMinute.stone < 12) wishlist.push(['quarry', 'tas geliri']);
    if (KEYS.some((k) => res[k] >= w.resources.capacity - 0.5)) wishlist.push(['warehouse', 'depo doldu']);

    for (const [type, why] of wishlist) if (canStaff(type) && tryBuild(type, why)) break;

    if (!w.research.active) {
      for (const entry of w.research.list()) {
        if (entry.done) continue;
        if (!w.research.canStart(entry.def.id).ok) continue;
        if (w.research.start(entry.def.id).ok) log.push(minute + 'dk: ARASTIRMA ' + entry.def.name);
        break;
      }
    }

    /*
     * Yukseltmede AKADEMI oncelikli: arastirma zincirinin ikinci yarisi
     * Akademi Sv.2 ister.
     */
    const ordered = [...w.state.buildings.values()].sort(
      (a, b) => (a.type === 'academy' ? -1 : 0) - (b.type === 'academy' ? -1 : 0),
    );
    for (const bld of ordered) {
      // Biriktirirken yalnizca Akademi yukseltilir; gerisi bekler.
      if (saving && bld.type !== 'academy') continue;
      const r = w.buildings.resolve(bld);
      if (r.upgrade && w.resources.canAfford(r.upgrade.cost)) {
        if (w.upgrades.requestUpgrade(bld.uid).ok) log.push(minute + 'dk: ' + bld.type + ' Sv.' + r.upgrade.toLevel);
        break;
      }
    }
    staffAll();
    if (CHECKPOINTS.includes(minute)) shots.push(snap(minute));
  }
  return { shots, log };
`;

/*
 * PASIF OYUNCU
 * Acilista bir kez kurulum + atama, sonra HICBIR karar yok.
 */
const PASSIVE = `
  const shots = [];
  for (const type of ['town_hall', 'farm', 'lumber_camp', 'house']) place(type);
  for (let i = 0; i < 90; i += 1) { w.simulation.advance(1); if (i % 10 === 0) staffAll(); }
  staffAll();
  shots.push(snap(0));

  for (let minute = 1; minute <= MINUTES; minute += 1) {
    for (let t = 0; t < 60; t += 1) {
      w.simulation.advance(1);
      if (t % 10 === 0) staffAll();
    }
    if (CHECKPOINTS.includes(minute)) shots.push(snap(minute));
  }
  return { shots, log: [] };
`;

/*
 * BILINCLI OYUNCU
 *
 * Farki tek sey: acilis sirasi. Once NUFUS ve ODUN (ev + oduncu kampi),
 * sehir merkezi ancak odun akisi kurulunca. Erken yukseltme yok.
 * Amac, kilidin oyunun matematiginden mi yoksa yalnizca kotu bir acilistan
 * mi kaynaklandigini ayirt etmek.
 */
const INFORMED = `
  const shots = [];
  const log = [];
  const blocked = {};
  shots.push(snap(0));

  const tryBuild = (type, why) => {
    if (blocked[type]) return false;
    if (!w.resources.canAfford(costOf(type))) return false;
    const built = place(type);
    if (!built) { blocked[type] = true; log.push('X ' + type + ': haritada yer yok'); return false; }
    log.push(minute + 'dk: ' + type + ' (' + why + ')');
    return true;
  };

  var minute = 0;
  // Acilis: bir ev + bir oduncu kampi (nufus ve odun akisi).
  place('house');
  place('lumber_camp');
  log.push('0dk: ev + oduncu kampi (acilis)');

  for (minute = 1; minute <= MINUTES; minute += 1) {
    for (let t = 0; t < 60; t += 1) {
      w.simulation.advance(1);
      if (t % 10 === 0) staffAll();
    }

    const eco = w.economy.snapshot;
    const res = w.resources.snapshot();

    const idle = w.workforce.idleCount;

    /*
     * AKTIF ile AYNI kural: karsilanamayan aday atlanir, zincir kesilmez.
     * Iki senaryo arasindaki tek fark ACILIS ve SIRALAMA olsun istiyoruz;
     * karar bicimi ayni olmazsa karsilastirma bir sey olcmez.
     */
    const wishlist = [];
    if (eco.population >= eco.populationCapacity && idle < 3) wishlist.push(['house', 'nufus kapasitesi doldu']);
    if (eco.netPerMinute.food <= 1) wishlist.push(['farm', 'yiyecek acigi']);
    if (idle >= 3 && eco.netPerMinute.wood < 8) wishlist.push(['lumber_camp', 'odun']);
    if (eco.netPerMinute.stone <= 0) wishlist.push(['quarry', 'tas akisi yok']);
    if (idle >= 3 && res.stone < 150) wishlist.push(['quarry', 'tas']);
    if (!w.state.countOf('town_hall') && res.wood > 200) wishlist.push(['town_hall', 'sehir merkezi']);
    if (KEYS.some((k) => res[k] >= w.resources.capacity - 0.5)) wishlist.push(['warehouse', 'depo doldu']);
    if (eco.netPerMinute.gold < 8) wishlist.push(['market', 'altin acigi']);
    if (!w.state.countOf('academy') && w.state.buildings.size >= 6) wishlist.push(['academy', 'arastirma icin']);
    if (idle >= 3) wishlist.push(['market', 'bosta isci']);
    if (idle >= 5 && !w.state.countOf('temple')) wishlist.push(['temple', 'bosta isci fazlasi']);

    for (const [type, why] of wishlist) if (canStaff(type) && tryBuild(type, why)) break;

    if (!w.research.active) {
      for (const entry of w.research.list()) {
        if (entry.done) continue;
        if (!w.research.canStart(entry.def.id).ok) continue;
        if (w.research.start(entry.def.id).ok) log.push(minute + 'dk: ARASTIRMA ' + entry.def.name);
        break;
      }
    }

    for (const bld of [...w.state.buildings.values()]) {
      const r = w.buildings.resolve(bld);
      if (r.upgrade && w.resources.canAfford(r.upgrade.cost)) {
        if (w.upgrades.requestUpgrade(bld.uid).ok) log.push(minute + 'dk: ' + bld.type + ' Sv.' + r.upgrade.toLevel);
        break;
      }
    }
    staffAll();
    if (CHECKPOINTS.includes(minute)) shots.push(snap(minute));
  }
  return { shots, log };
`;

/** Her senaryo SIFIRDAN bir baglamda kosar. */
async function run(policy) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: DPR, isMobile: true, hasTouch: true,
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push('pageerror: ' + e));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(2400);
  const out = await page.evaluate(`(() => { ${HARNESS}
    ${policy}
  })()`);
  await ctx.close();
  return out;
}

const active = await run(ACTIVE);
const scholar = await run(SCHOLAR);
const informed = await run(INFORMED);
const passive = await run(PASSIVE);

const table = (shots) => shots.map((s) => ({
  dk: s.minute, yiyecek: s.food, odun: s.wood, tas: s.stone, altin: s.gold, bilgi: s.knowledge,
  depo: s.cap, dolan: s.atCap.join(',') || '-',
  nufus: `${s.pop}/${s.popCap}`, bosta: s.idle, calisan: s.working, 'isci gereken': s.needed,
  bina: s.total, 'en yuksek sv': s.maxLevel,
}));
const netTable = (shots) => shots.map((s) => ({
  dk: s.minute, 'yiyecek/dk': s.net.food, 'odun/dk': s.net.wood,
  'tas/dk': s.net.stone, 'altin/dk': s.net.gold, 'bilgi/dk': s.net.knowledge,
  'kadrosuz': s.understaffed, 'yapilabilir yukseltme': s.upgrades.join(',') || '-',
  'karsilanabilir bina': s.affordable.length,
  arastirma: s.research, 'suren': s.researching || '-',
}));

const scenarios = [
  ['AKTIF OYUNCU (sehir merkezi once)', active],
  ['ARASTIRMACI OYUNCU (akademi yolunu kovalar)', scholar],
  ['BILINCLI OYUNCU (ev + oduncu once)', informed],
  ['PASIF OYUNCU (acilis disinda karar yok)', passive],
];
for (const [name, run_] of scenarios) {
  console.log(`\n=== ${name} ===`);
  console.table(table(run_.shots));
  console.table(netTable(run_.shots));
  const last = run_.shots[run_.shots.length - 1];
  console.log(MINUTES + 'dk bina dagilimi:', JSON.stringify(last.buildings));
  console.log(MINUTES + 'dk karsilanabilir binalar:', last.affordable.join(', ') || 'HICBIRI');
  if (run_.log.length) { console.log('Oyuncu aksiyonlari:'); for (const l of run_.log) console.log('  ' + l); }
}

console.log('\nKonsol/sayfa hatalari:', errors.length === 0 ? 'YOK' : errors.slice(0, 5));
await browser.close();
