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

const browser = await chromium.launch();
const errors = [];

const HARNESS = `
  const w = window.game.scene.getScene('CityScene').registry.get('world');
  const KEYS = ['food', 'wood', 'stone', 'gold'];
  const TYPES = ['town_hall', 'house', 'farm', 'lumber_camp', 'quarry', 'market', 'warehouse'];

  const costOf = (type) => w.buildings.definitionOf({ type }).levels[0].buildCost;

  /** Once merkeze yakin, bulamazsa TUM haritada yer arar (ocak kayaya kurulur). */
  function place(type) {
    const c = w.state.grid.center();
    for (let r = 0; r <= 7; r += 1) {
      for (let dy = -r; dy <= r; dy += 1) {
        for (let dx = -r; dx <= r; dx += 1) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const res = w.buildings.place(type, c.gx + dx, c.gy + dy);
          if (res.ok) return res.building;
        }
      }
    }
    for (const t of w.state.grid.allTiles()) {
      const res = w.buildings.place(type, t.gx, t.gy);
      if (res.ok) return res.building;
    }
    return null;
  }

  /** Bosta isciyi kadrosu eksik uretim binalarina yollar. */
  function staffAll() {
    for (const type of ['farm', 'lumber_camp', 'quarry', 'market']) {
      for (const bld of w.state.buildings.values()) {
        if (bld.type !== type) continue;
        while (w.workforce.idleCount > 0 && w.workforce.assign(bld.uid).ok) { /* doldur */ }
      }
    }
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
      cap: w.resources.capacity,
      atCap: KEYS.filter((k) => res[k] >= w.resources.capacity - 0.5),
      pop: w.state.population, popCap: eco.populationCapacity,
      idle: wf.idle, working: wf.working, needed: eco.workersNeeded,
      efficiency: Number(eco.efficiency.toFixed(2)),
      net: {
        food: Number(eco.netPerMinute.food.toFixed(2)), wood: Number(eco.netPerMinute.wood.toFixed(2)),
        stone: Number(eco.netPerMinute.stone.toFixed(2)), gold: Number(eco.netPerMinute.gold.toFixed(2)),
      },
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
  for (minute = 1; minute <= 20; minute += 1) {
    for (let t = 0; t < 60; t += 1) {
      w.simulation.advance(1);
      if (t % 10 === 0) staffAll();
    }

    const eco = w.economy.snapshot;
    const res = w.resources.snapshot();

    /*
     * Oncelik sirasi: NUFUS once.
     *
     * Ilk denemede odun kurali nufus kuralinin onundeydi ve politika 20
     * dakikada alti oduncu kampi kurup dordunu kadrosuz birakti - cunku
     * nufus 4'te takilmisti. Bu oyunun degil politikanin hatasiydi, ama
     * gercek tuzagi gosterdi: isci olmadan uretim binasi kurmak bos.
     */
    if (!w.state.countOf('town_hall')) tryBuild('town_hall', 'sehir merkezi');
    else if (eco.population >= eco.populationCapacity) tryBuild('house', 'nufus kapasitesi doldu');
    else if (eco.netPerMinute.food <= 1) tryBuild('farm', 'yiyecek acigi');
    else if (w.workforce.idleCount >= 3 && res.wood < 120) tryBuild('lumber_camp', 'odun acigi + bosta isci');
    else if (w.workforce.idleCount >= 4 && res.stone < 80) tryBuild('quarry', 'tas acigi + bosta isci');
    else if (KEYS.some((k) => res[k] >= w.resources.capacity - 0.5)) tryBuild('warehouse', 'depo doldu');
    else if (w.workforce.idleCount >= 3) tryBuild('market', 'bosta isci fazlasi');

    for (const bld of [...w.state.buildings.values()]) {
      const r = w.buildings.resolve(bld);
      if (r.upgrade && w.resources.canAfford(r.upgrade.cost)) {
        if (w.upgrades.requestUpgrade(bld.uid).ok) log.push(minute + 'dk: ' + bld.type + ' Sv.' + r.upgrade.toLevel);
        break;
      }
    }
    staffAll();
    if ([1, 5, 10, 15, 20].includes(minute)) shots.push(snap(minute));
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

  for (let minute = 1; minute <= 20; minute += 1) {
    for (let t = 0; t < 60; t += 1) {
      w.simulation.advance(1);
      if (t % 10 === 0) staffAll();
    }
    if ([1, 5, 10, 15, 20].includes(minute)) shots.push(snap(minute));
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

  for (minute = 1; minute <= 20; minute += 1) {
    for (let t = 0; t < 60; t += 1) {
      w.simulation.advance(1);
      if (t % 10 === 0) staffAll();
    }

    const eco = w.economy.snapshot;
    const res = w.resources.snapshot();

    if (eco.population >= eco.populationCapacity) tryBuild('house', 'nufus kapasitesi doldu');
    else if (eco.netPerMinute.food <= 1) tryBuild('farm', 'yiyecek acigi');
    else if (w.workforce.idleCount >= 3 && eco.netPerMinute.wood < 8) tryBuild('lumber_camp', 'odun');
    else if (w.workforce.idleCount >= 4 && res.stone < 100) tryBuild('quarry', 'tas');
    else if (!w.state.countOf('town_hall') && res.wood > 200) tryBuild('town_hall', 'sehir merkezi');
    else if (KEYS.some((k) => res[k] >= w.resources.capacity - 0.5)) tryBuild('warehouse', 'depo doldu');
    else if (w.workforce.idleCount >= 3) tryBuild('market', 'bosta isci');

    staffAll();
    if ([1, 5, 10, 15, 20].includes(minute)) shots.push(snap(minute));
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
const informed = await run(INFORMED);
const passive = await run(PASSIVE);

const table = (shots) => shots.map((s) => ({
  dk: s.minute, yiyecek: s.food, odun: s.wood, tas: s.stone, altin: s.gold,
  depo: s.cap, dolan: s.atCap.join(',') || '-',
  nufus: `${s.pop}/${s.popCap}`, bosta: s.idle, calisan: s.working, 'isci gereken': s.needed,
  bina: s.total,
}));
const netTable = (shots) => shots.map((s) => ({
  dk: s.minute, 'yiyecek/dk': s.net.food, 'odun/dk': s.net.wood,
  'tas/dk': s.net.stone, 'altin/dk': s.net.gold,
  'kadrosuz': s.understaffed, 'yapilabilir yukseltme': s.upgrades.join(',') || '-',
  'karsilanabilir bina': s.affordable.length,
}));

const scenarios = [
  ['AKTIF OYUNCU (sehir merkezi once)', active],
  ['BILINCLI OYUNCU (ev + oduncu once)', informed],
  ['PASIF OYUNCU (acilis disinda karar yok)', passive],
];
for (const [name, run_] of scenarios) {
  console.log(`\n=== ${name} ===`);
  console.table(table(run_.shots));
  console.table(netTable(run_.shots));
  const last = run_.shots[run_.shots.length - 1];
  console.log('20dk bina dagilimi:', JSON.stringify(last.buildings));
  console.log('20dk karsilanabilir binalar:', last.affordable.join(', ') || 'HICBIRI');
  if (run_.log.length) { console.log('Oyuncu aksiyonlari:'); for (const l of run_.log) console.log('  ' + l); }
}

console.log('\nKonsol/sayfa hatalari:', errors.length === 0 ? 'YOK' : errors.slice(0, 5));
await browser.close();
