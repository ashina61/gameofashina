/**
 * Sprint 8 - isci atama senaryolari (A-I).
 *
 * Kullanim:  node bench/workers.mjs [url] [dpr]
 *
 * Her senaryo GERCEK tarayicida kosar. Atama komutlari oyuncunun bastigi
 * yoldan gider: arayuz olayi -> CityScene -> WorkforceSystem. Son iki
 * senaryo (H, I) dokunmatik girdiyi ve kayit gidis-donusunu dogrular.
 */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const URL = process.argv[2] ?? 'http://127.0.0.1:5191/';
const DPR = Number(process.argv[3] ?? 1);

const b = await chromium.launch();
const ctx = await b.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: DPR,
  isMobile: true,
  hasTouch: true,
});
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

const W = (fn, arg) => page.evaluate(fn, arg);
const results = [];
const check = (id, label, ok, detail = '') =>
  results.push({ senaryo: id, kontrol: label, sonuc: ok ? 'PASS' : 'FAIL', not: detail });

await page.goto(URL, { waitUntil: 'load' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'load' });
await page.waitForTimeout(2500);

/** Sehri kurar: kaynak, nufus ve iki uretim binasi (tamamlanmis). */
const setup = await W(() => {
  const w = window.game.scene.getScene('CityScene').registry.get('world');
  for (const k of ['wood', 'stone', 'food', 'gold']) w.state.setResource(k, 9999);

  const place = (type) => {
    for (const t of w.state.grid.allTiles()) {
      const r = w.buildings.place(type, t.gx, t.gy);
      if (r.ok) return r.building.uid;
    }
    return null;
  };
  const lumber = place('lumber_camp');
  const quarry = place('quarry');
  const house = place('house');

  // Insaat kuyrugunu bosalt.
  for (let i = 0; i < 400; i += 1) w.simulation.advance(1);

  const states = [lumber, quarry, house].map((u) => w.state.buildings.get(u)?.state);
  return { lumber, quarry, house, states, pop: w.state.population, workers: w.state.workers.length };
});
check('setup', 'binalar tamamlandi ve nufus olustu',
  setup.states.every((s) => s === 'active') && setup.workers > 0,
  `durumlar=${setup.states} nufus=${setup.pop} isci=${setup.workers}`);

/** Oyuncunun bastigi yol: arayuz olayi uzerinden atama. */
const assignVia = (uid) => W((u) => {
  const w = window.game.scene.getScene('CityScene').registry.get('world');
  w.bus.emit('ui:assign-worker', u);
  const b = w.state.buildings.get(u);
  const claimed = w.workforce.claimedBy(u);
  const moving = w.state.workers.filter((x) => x.buildingUid === u && x.state === 'moving').length;
  return { assigned: b.assignedWorkers, claimed, moving, idle: w.workforce.idleCount };
}, uid);

/** Yoldaki herkes varana kadar ilerletir; sure artik MESAFEDEN turer. */
const settle = () => W(() => {
  const w = window.game.scene.getScene('CityScene').registry.get('world');
  for (let i = 0; i < 60 && w.workforce.snapshot.moving > 0; i += 1) w.simulation.advance(1);
  return w.workforce.snapshot;
});

const snap = (uid) => W((u) => {
  const w = window.game.scene.getScene('CityScene').registry.get('world');
  const b = w.state.buildings.get(u);
  const res = w.buildings.resolve(b);
  return {
    assigned: b.assignedWorkers,
    claimed: w.workforce.claimedBy(u),
    idle: w.workforce.idleCount,
    effective: res.effectiveProduction,
    potential: res.production,
    snapshot: w.workforce.snapshot,
  };
}, uid);

// --- A: bosta isci Lumber Camp'e atanir, YOLA cikar --------------------------
const a = await assignVia(setup.lumber);
check('A', 'atama kabul edildi, isci yola cikti',
  a.moving === 1 && a.claimed === 1 && a.assigned === 0,
  `yolda=${a.moving} bagli=${a.claimed} calisan=${a.assigned}`);

// --- B: yolculuk bitince isci gercekten calisiyor ---------------------------
await settle();
const bSnap = await snap(setup.lumber);
check('B', 'isci vardi ve uretime katildi',
  bSnap.assigned === 1 && (bSnap.effective.wood ?? 0) > 0,
  `calisan=${bSnap.assigned} uretim=${JSON.stringify(bSnap.effective)}`);

// --- C: ayni akis Quarry icin -----------------------------------------------
const c1 = await assignVia(setup.quarry);
await settle();
const cSnap = await snap(setup.quarry);
check('C', 'Quarry de isci alabiliyor',
  c1.moving === 1 && cSnap.assigned === 1 && (cSnap.effective.stone ?? 0) > 0,
  `calisan=${cSnap.assigned} uretim=${JSON.stringify(cSnap.effective)}`);

// --- D: geri alma ------------------------------------------------------------
const d = await W((u) => {
  const w = window.game.scene.getScene('CityScene').registry.get('world');
  const before = w.state.buildings.get(u).assignedWorkers;
  const idleBefore = w.workforce.idleCount;
  w.bus.emit('ui:release-worker', u);
  // Sprint 9: yer ANINDA bosalir, isci meydana YURUYEREK doner.
  const straightAfter = {
    assigned: w.state.buildings.get(u).assignedWorkers,
    idle: w.workforce.idleCount,
    moving: w.workforce.snapshot.moving,
  };
  for (let i = 0; i < 60 && w.workforce.snapshot.moving > 0; i += 1) w.simulation.advance(1);
  return { before, idleBefore, straightAfter, idleArrived: w.workforce.idleCount };
}, setup.quarry);
check('D', 'isci geri alinir: uretim aninda biter, meydana YURUR',
  d.straightAfter.assigned === d.before - 1 &&
  d.straightAfter.idle === d.idleBefore &&
  d.straightAfter.moving > 0 &&
  d.idleArrived === d.idleBefore + 1,
  `calisan ${d.before}->${d.straightAfter.assigned}, yolda=${d.straightAfter.moving}, ` +
  `bosta ${d.idleBefore}->${d.straightAfter.idle}->${d.idleArrived}`);

// --- E: ayni binaya ikinci isci ---------------------------------------------
await assignVia(setup.lumber);
await settle();
const eSnap = await snap(setup.lumber);
check('E', 'ayni binaya ikinci isci atanabiliyor',
  eSnap.assigned === 2,
  `calisan=${eSnap.assigned}/3`);

// --- F: kapasite siniri -------------------------------------------------------
const f = await W((u) => {
  const w = window.game.scene.getScene('CityScene').registry.get('world');
  // Kapasiteyi doldur.
  const cap = w.workforce.capacityOf(u);
  while (w.workforce.claimedBy(u) < cap) {
    if (!w.workforce.assign(u).ok) break;
  }
  const overflow = w.workforce.assign(u);
  return { cap, claimed: w.workforce.claimedBy(u), reason: overflow.ok ? 'kabul' : overflow.reason };
}, setup.lumber);
check('F', 'kapasite dolunca atama reddediliyor',
  f.claimed === f.cap && f.reason === 'no_slots',
  `bagli=${f.claimed}/${f.cap} fazlalik=${f.reason}`);

// --- G: yikim iscileri serbest birakiyor -------------------------------------
const g = await W((u) => {
  const w = window.game.scene.getScene('CityScene').registry.get('world');
  const claimed = w.workforce.claimedBy(u);
  const idleBefore = w.workforce.idleCount;
  w.bus.emit('ui:request-demolish', u);
  const orphan = w.state.workers.filter((x) => x.buildingUid === u).length;
  for (let i = 0; i < 60 && w.workforce.snapshot.moving > 0; i += 1) w.simulation.advance(1);
  return { claimed, idleBefore, orphan, idleArrived: w.workforce.idleCount };
}, setup.lumber);
check('G', 'yikilan binanin iscileri meydana donuyor',
  g.orphan === 0 && g.idleArrived === g.idleBefore + g.claimed,
  `serbest=${g.claimed} bosta ${g.idleBefore}->${g.idleArrived} sahipsiz=${g.orphan}`);

// --- H: kayit / yeniden yukleme ------------------------------------------------
const beforeReload = await W(() => {
  const w = window.game.scene.getScene('CityScene').registry.get('world');
  // Quarry'ye iki isci daha yolla ve varmalarini bekle.
  w.workforce.assign(w.state.buildings.values().next().value.uid);
  for (const b of w.state.buildings.values()) {
    if (b.type === 'quarry') { w.workforce.assign(b.uid); w.workforce.assign(b.uid); }
  }
  for (let i = 0; i < 60 && w.workforce.snapshot.moving > 0; i += 1) w.simulation.advance(1);
  w.save();
  const rows = [...w.state.workers].map((x) => `${x.buildingUid ?? '-'}:${x.state}`).sort();
  return { rows, quarry: [...w.state.buildings.values()].find((b) => b.type === 'quarry')?.uid };
});
await page.reload({ waitUntil: 'load' });
await page.waitForTimeout(2200);
const afterReload = await W(() => {
  const w = window.game.scene.getScene('CityScene').registry.get('world');
  return {
    rows: [...w.state.workers].map((x) => `${x.buildingUid ?? '-'}:${x.state}`).sort(),
    quarryAssigned: [...w.state.buildings.values()].find((b) => b.type === 'quarry')?.assignedWorkers,
  };
});
check('H', 'atamalar kayittan aynen geri geliyor',
  JSON.stringify(beforeReload.rows) === JSON.stringify(afterReload.rows),
  `once=${beforeReload.rows.length} sonra=${afterReload.rows.length} quarry=${afterReload.quarryAssigned}`);

// --- I: gercek dokunusla atama (arayuz butonu) ---------------------------------
const panel = await W(() => {
  const w = window.game.scene.getScene('CityScene').registry.get('world');
  const cs = window.game.scene.getScene('CityScene');
  const quarry = [...w.state.buildings.values()].find((b) => b.type === 'quarry');
  // Binayi sec: panel acilsin.
  const tile = w.state.grid.getTile(quarry.gx, quarry.gy);
  if (cs.selectTile) cs.selectTile(tile);
  else w.bus.emit('tile:selected', tile);
  return {
    uid: quarry.uid,
    claimed: w.workforce.claimedBy(quarry.uid),
    idle: w.workforce.idleCount,
  };
});
await page.waitForTimeout(400);

/** Panelin "+" butonunun ekran (CSS piksel) konumu. */
const plus = await W(() => {
  const ui = window.game.scene.getScene('UIScene');
  const p = ui.infoPanel;
  const btn = p.assignButton;
  return { x: p.x + btn.x, y: p.y + btn.y, visible: btn.visible, enabled: btn.input?.enabled !== false };
});
if (plus.visible) {
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: plus.x, y: plus.y, id: 1 }],
  });
  await page.waitForTimeout(60);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(200);
}
const iRes = await W((u) => {
  const w = window.game.scene.getScene('CityScene').registry.get('world');
  return { claimed: w.workforce.claimedBy(u), idle: w.workforce.idleCount };
}, panel.uid);
check('I', 'panel "+" butonu gercek dokunusla isci atiyor',
  plus.visible && iRes.claimed === panel.claimed + 1 && iRes.idle === panel.idle - 1,
  `buton gorunur=${plus.visible} konum=${Math.round(plus.x)},${Math.round(plus.y)} ` +
  `bagli ${panel.claimed}->${iRes.claimed} bosta ${panel.idle}->${iRes.idle}`);

check('hata', 'konsol/sayfa hatasi yok', errors.length === 0, errors.slice(0, 3).join(' | '));

console.table(results);
console.log(`DPR=${DPR}  PASS=${results.filter((r) => r.sonuc === 'PASS').length}/${results.length}`);
await b.close();
