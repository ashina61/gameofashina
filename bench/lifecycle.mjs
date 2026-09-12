/**
 * Sprint 9 - isci yasam dongusu ve gercek hareket senaryolari (1-14).
 *
 * Kullanim:  node bench/lifecycle.mjs [url] [dpr]
 *
 * Sprint 8'in senaryolari atamanin DOGRU oldugunu gosteriyordu; buradakiler
 * hareketin GERCEK oldugunu gosterir: isci yola cikiyor mu, mesafeye gore
 * mi yuruyor, binanin disinda mi duruyor, geri cagrilinca yuruyerek mi
 * donuyor. Olcumler ekran goruntusune degil, kare kare okunan KONUMA
 * dayanir - "gorunuyor gibi" yeterli degil.
 */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const URL = process.argv[2] ?? 'http://127.0.0.1:5191/';
const DPR = Number(process.argv[3] ?? 1);
/** src/config/Constants.ts ile ayni deger; tik basina azami adim. */
const WORKER_SPEED = 60;

/**
 * Iki ornek arasindaki yer degistirmeyi GECEN TIKE boler.
 *
 * Betik elle advance(1) cagirirken oyunun kendi saati de arka planda
 * calisiyor: ornekler arasinda gercek zaman gectigi icin bazen iki tik
 * birden isleniyor. Ham yer degistirmeyi hiz sinirina vurmak bu yuzden
 * yanlis alarm veriyordu (olculdu: DPR 2'de 58, 58, 117, 58 - yani
 * 2x58). Tik farkina bolmek olcumu gercek hiza cevirir.
 */
function perTickSteps(track) {
  const out = [];
  for (let i = 1; i < track.length; i += 1) {
    const ticks = Math.max(1, (track[i].tick ?? 0) - (track[i - 1].tick ?? 0));
    out.push(Math.hypot(track[i].x - track[i - 1].x, track[i].y - track[i - 1].y) / ticks);
  }
  return out;
}

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
  results.push({ '#': id, kontrol: label, sonuc: ok ? 'PASS' : 'FAIL', not: detail });

await page.goto(URL, { waitUntil: 'load' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'load' });
await page.waitForTimeout(2500);

const setup = await W(() => {
  const w = window.game.scene.getScene('CityScene').registry.get('world');
  for (const k of ['wood', 'stone', 'food', 'gold']) w.state.setResource(k, 99999);
  const put = (type) => {
    for (const t of w.state.grid.allTiles()) {
      const r = w.buildings.place(type, t.gx, t.gy);
      if (r.ok) return r.building.uid;
    }
    return null;
  };
  const lumber = put('lumber_camp');
  const quarry = put('quarry');
  put('house');
  put('house');
  for (let i = 0; i < 600; i += 1) w.simulation.advance(1);
  return { lumber, quarry, pop: w.state.population, idle: w.workforce.idleCount };
});
check('0', 'sehir hazir', setup.idle > 4, `nufus=${setup.pop} bosta=${setup.idle}`);

/** Tek bir iscinin o anki konumunu ve durumunu okur. */
const readWorker = (id) => W((wid) => {
  const w = window.game.scene.getScene('CityScene').registry.get('world');
  const x = w.state.workers.find((k) => k.id === wid);
  if (!x) return null;
  const total = x.travelTicks;
  const done = x.state === 'moving' && total > 0 ? (total - x.travelLeft) / total : 1;
  return {
    tick: w.state.tick,
    state: x.state,
    uid: x.buildingUid,
    slot: x.slot,
    left: x.travelLeft,
    total,
    x: x.fromX + (x.toX - x.fromX) * done,
    y: x.fromY + (x.toY - x.fromY) * done,
    toX: x.toX,
    toY: x.toY,
  };
}, id);

const tick = (n = 1) => W((k) => {
  const w = window.game.scene.getScene('CityScene').registry.get('world');
  for (let i = 0; i < k; i += 1) w.simulation.advance(1);
}, n);

const settle = () => W(() => {
  const w = window.game.scene.getScene('CityScene').registry.get('world');
  for (let i = 0; i < 60 && w.workforce.snapshot.moving > 0; i += 1) w.simulation.advance(1);
  return w.workforce.snapshot;
});

// --- 1. Oduncu Kampi'na isci ata ---------------------------------------------
const assigned = await W((u) => {
  const w = window.game.scene.getScene('CityScene').registry.get('world');
  const before = w.workforce.claimedBy(u);
  w.bus.emit('ui:assign-worker', u);
  const x = w.state.workers.find((k) => k.buildingUid === u);
  return { id: x?.id ?? null, before, after: w.workforce.claimedBy(u) };
}, setup.lumber);
check('1', 'Oduncu Kampi\'na isci atandi',
  assigned.id !== null && assigned.after === assigned.before + 1,
  `isci=${assigned.id} bagli ${assigned.before}->${assigned.after}`);

// --- 2. Isci GERCEKTEN yuruyor (konum kare kare degisiyor) -------------------
const track = [];
let step = await readWorker(assigned.id);
track.push({ ...step });
for (let i = 0; i < 3 && step && step.state === 'moving'; i += 1) {
  await tick(1);
  step = await readWorker(assigned.id);
  if (step) track.push({ ...step });
}
const moved = track.length > 1 && track.some((p, i) =>
  i > 0 && (Math.abs(p.x - track[i - 1].x) > 0.5 || Math.abs(p.y - track[i - 1].y) > 0.5));
/*
 * ISINLANMA OLCUTU: tek bir tikte atilan adim WORKER_SPEED'i asmamali.
 *
 * Once "mevcut hedefe uzaklik hep azalmali" diye olcuyordum. Sprint 10'da
 * rota COK BACAKLI oldu: bacak degisince "mevcut hedef" bir sonraki ara
 * noktaya kayiyor ve uzaklik dogal olarak artiyor. O olcut artik dogru
 * olani (surekli hareket) degil, eski tek bacakli varsayimi sinardi.
 */
const steps = perTickSteps(track);
const bounded = steps.every((d) => d <= WORKER_SPEED + 1e-6);
check('2', 'isci gozle gorulur sekilde YURUYOR (tik basina adim sinirli)',
  moved && bounded && track[0].total >= 1,
  `ilk bacak=${track[0].total} tik, tik basina adim ${steps.map((d) => d.toFixed(0)).join(' -> ')} (sinir ${WORKER_SPEED})`);

// --- 3. Isci binanin DISINDA duruyor -----------------------------------------
await settle();
const stopped = await W((u) => {
  const w = window.game.scene.getScene('CityScene').registry.get('world');
  const b = w.state.buildings.get(u);
  const size = w.state.buildings.get(u).type === 'quarry' ? 2 : 1;
  const TILE_H = 64;
  const cy = ((b.gx + (size - 1) / 2) + (b.gy + (size - 1) / 2)) * 32;
  const frontEdge = cy + (size * TILE_H) / 2;
  const crew = w.state.workers.filter((k) => k.buildingUid === u);
  return {
    frontEdge,
    outside: crew.every((k) => k.toY > frontEdge),
    ys: crew.map((k) => Math.round(k.toY)),
    center: Math.round(cy),
  };
}, setup.lumber);
check('3', 'isci binanin ayak izinin DISINDA duruyor',
  stopped.outside,
  `merkez=${stopped.center} on kenar=${Math.round(stopped.frontEdge)} isci=${stopped.ys}`);

// --- 4. Uretim ancak VARDIKTAN sonra basliyor --------------------------------
const production = await W((u) => {
  const w = window.game.scene.getScene('CityScene').registry.get('world');
  const b = w.state.buildings.get(u);
  return { assigned: b.assignedWorkers, wood: w.buildings.resolve(b).effectiveProduction.wood ?? 0 };
}, setup.lumber);
const duringTravel = track.find((p) => p.state === 'moving');
check('4', 'uretim yalnizca VARISTAN sonra basliyor',
  duringTravel !== undefined && production.assigned === 1 && production.wood > 0,
  `yolda uretim yok -> varista calisan=${production.assigned}, odun=${production.wood.toFixed(2)}/dk`);

// --- 5-6. Ayni binaya birden cok isci; AYRI noktalarda -----------------------
const crew = await W((u) => {
  const w = window.game.scene.getScene('CityScene').registry.get('world');
  // Binayi KAPASITESINE kadar doldur. Kapasite katalogdan gelir; sabit bir
  // sayi beklemek denge ayarinda kirilir (Sprint 15'te kamp 3'ten 2'ye indi).
  const capacity = w.workforce.capacityOf(u);
  for (let i = 0; i < capacity + 2; i += 1) w.bus.emit('ui:assign-worker', u);
  for (let i = 0; i < 60 && w.workforce.snapshot.moving > 0; i += 1) w.simulation.advance(1);
  const list = w.state.workers.filter((k) => k.buildingUid === u);
  const spots = new Set(list.map((k) => `${k.toX.toFixed(2)},${k.toY.toFixed(2)}`));
  const slots = new Set(list.map((k) => k.slot));
  return {
    count: list.length, capacity,
    unique: spots.size, slots: [...slots].sort(), spots: [...spots],
  };
}, setup.lumber);
check('5', 'ayni binaya birden cok isci atanabiliyor - kadro kapasiteye kadar doluyor',
  crew.count === crew.capacity && crew.count >= 2,
  `kadro=${crew.count}/${crew.capacity}`);
check('6', 'isciler AYRI noktalarda duruyor - ust uste binmiyor',
  crew.unique === crew.count && crew.slots.length === crew.count,
  `${crew.count} isci, ${crew.unique} farkli nokta, yerler=${crew.slots}`);

// --- 7-8. Calisan isciyi geri al; meydana YURUYEREK donuyor ------------------
const released = await W((u) => {
  const w = window.game.scene.getScene('CityScene').registry.get('world');
  const before = w.state.buildings.get(u).assignedWorkers;
  w.bus.emit('ui:release-worker', u);
  const x = w.state.workers.find((k) => k.state === 'moving' && !k.buildingUid);
  return {
    id: x?.id ?? null,
    before,
    after: w.state.buildings.get(u).assignedWorkers,
    left: x?.travelLeft ?? 0,
  };
}, setup.lumber);
check('7', 'calisan isci geri alindi; uretim katkisi ANINDA bitti',
  released.id !== null && released.after === released.before - 1,
  `calisan ${released.before}->${released.after}, donus suresi=${released.left} tik`);

const homeTrack = [];
let hs = await readWorker(released.id);
homeTrack.push({ ...hs });
for (let i = 0; i < 4 && hs && hs.state === 'moving'; i += 1) {
  await tick(1);
  hs = await readWorker(released.id);
  if (hs) homeTrack.push({ ...hs });
}
await settle();
const finalHome = await readWorker(released.id);
const homeSteps = perTickSteps(homeTrack);
check('8', 'geri alinan isci meydana YURUYEREK donuyor',
  released.left > 0 &&
  homeSteps.every((d) => d <= WORKER_SPEED + 1e-6) &&
  finalHome.state === 'idle',
  `tik basina adim ${homeSteps.map((d) => d.toFixed(0)).join(' -> ')} ` +
  `(sinir ${WORKER_SPEED}), son durum=${finalHome.state}`);

// --- 9. YOLDAKI isciyi geri al: bulundugu yerden geri doner ------------------
const uturn = await W((u) => {
  const w = window.game.scene.getScene('CityScene').registry.get('world');
  w.bus.emit('ui:assign-worker', u);
  const x = w.state.workers.find((k) => k.buildingUid === u && k.state === 'moving');
  w.simulation.advance(1);
  const total = x.travelTicks;
  const done = total > 0 ? (total - x.travelLeft) / total : 1;
  const at = { x: x.fromX + (x.toX - x.fromX) * done, y: x.fromY + (x.toY - x.fromY) * done };

  w.bus.emit('ui:release-worker', u);
  const turned = { fromX: x.fromX, fromY: x.fromY, uid: x.buildingUid, state: x.state };
  for (let i = 0; i < 60 && w.workforce.snapshot.moving > 0; i += 1) w.simulation.advance(1);
  return { at, turned, ended: x.state, id: x.id };
}, setup.lumber);
check('9', 'yoldaki isci bulundugu yerden geri donuyor - basa isinlanmiyor',
  Math.abs(uturn.turned.fromX - uturn.at.x) < 0.001 &&
  Math.abs(uturn.turned.fromY - uturn.at.y) < 0.001 &&
  uturn.turned.uid === null && uturn.ended === 'idle',
  `donus baslangici=(${uturn.turned.fromX.toFixed(0)},${uturn.turned.fromY.toFixed(0)}) ` +
  `o anki konum=(${uturn.at.x.toFixed(0)},${uturn.at.y.toFixed(0)}) son=${uturn.ended}`);

// --- 10. Iscili binayi yik ----------------------------------------------------
const demolished = await W((u) => {
  const w = window.game.scene.getScene('CityScene').registry.get('world');
  w.bus.emit('ui:assign-worker', u);
  w.bus.emit('ui:assign-worker', u);
  for (let i = 0; i < 60 && w.workforce.snapshot.moving > 0; i += 1) w.simulation.advance(1);
  const claimed = w.workforce.claimedBy(u);
  const idleBefore = w.workforce.idleCount;

  w.bus.emit('ui:request-demolish', u);
  const orphan = w.state.workers.filter((k) => k.buildingUid === u).length;
  const walking = w.workforce.snapshot.moving;
  for (let i = 0; i < 60 && w.workforce.snapshot.moving > 0; i += 1) w.simulation.advance(1);
  return { claimed, idleBefore, orphan, walking, idleAfter: w.workforce.idleCount };
}, setup.quarry);
check('10', 'yikilan binanin iscileri sahipsiz kalmadan meydana donuyor',
  demolished.orphan === 0 &&
  demolished.walking >= demolished.claimed &&
  demolished.idleAfter === demolished.idleBefore + demolished.claimed,
  `serbest=${demolished.claimed} sahipsiz=${demolished.orphan} ` +
  `bosta ${demolished.idleBefore}->${demolished.idleAfter}`);

// --- 11. Kayit / yeniden yukleme ---------------------------------------------
const before = await W(() => {
  const w = window.game.scene.getScene('CityScene').registry.get('world');
  const lumber = [...w.state.buildings.values()].find((b) => b.type === 'lumber_camp');
  w.bus.emit('ui:assign-worker', lumber.uid);
  w.bus.emit('ui:assign-worker', lumber.uid);
  for (let i = 0; i < 60 && w.workforce.snapshot.moving > 0; i += 1) w.simulation.advance(1);
  w.save();
  return {
    uid: lumber.uid,
    rows: w.state.workers
      .filter((k) => k.buildingUid)
      .map((k) => `${k.id}:${k.slot}:${Math.round(k.toX)},${Math.round(k.toY)}`)
      .sort(),
  };
});
await page.reload({ waitUntil: 'load' });
await page.waitForTimeout(2200);
const after = await W(() => {
  const w = window.game.scene.getScene('CityScene').registry.get('world');
  return {
    rows: w.state.workers
      .filter((k) => k.buildingUid)
      .map((k) => `${k.id}:${k.slot}:${Math.round(k.toX)},${Math.round(k.toY)}`)
      .sort(),
    stray: w.state.workers.filter((k) => k.toX === 0 && k.toY === 0).length,
  };
});
check('11', 'kayit/yukleme atamayi, duruş yerini ve konumu koruyor',
  JSON.stringify(before.rows) === JSON.stringify(after.rows) && after.stray === 0,
  `${after.rows.length} kayitli isci, (0,0)'da asili kalan=${after.stray}`);

// --- 12. Dokunmatik denetimler -------------------------------------------------
const panel = await W(() => {
  const cs = window.game.scene.getScene('CityScene');
  const w = cs.registry.get('world');
  const lumber = [...w.state.buildings.values()].find((b) => b.type === 'lumber_camp');
  cs.selectTile(w.state.grid.getTile(lumber.gx, lumber.gy));
  return { uid: lumber.uid, claimed: w.workforce.claimedBy(lumber.uid) };
});
await page.waitForTimeout(400);

const tap = async (which) => {
  const at = await W((k) => {
    const ui = window.game.scene.getScene('UIScene');
    const p = ui.infoPanel;
    const btn = k === 'plus' ? p.assignButton : p.releaseButton;
    return { x: p.x + btn.x, y: p.y + btn.y, visible: btn.visible };
  }, which);
  if (!at.visible) return at;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: at.x, y: at.y, id: 1 }] });
  await page.waitForTimeout(60);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(220);
  return at;
};

const claimed = (u) => W((k) => {
  const w = window.game.scene.getScene('CityScene').registry.get('world');
  return w.workforce.claimedBy(k);
}, u);

/*
 * Once "-", sonra "+". Ters sira yaniltici olurdu: kadro zaten dolu bir
 * binada "+" dogru olarak hicbir sey yapmaz ve olcum basarisiz GORUNUR.
 * (Ilk denemede tam bu oldu: 3/3 kadroda "+" reddedildi.)
 */
const minusAt = await tap('minus');
const afterMinus = await claimed(panel.uid);
const plusAt = await tap('plus');
const afterPlus = await claimed(panel.uid);
check('12', 'panel "+" ve "-" gercek dokunusla calisiyor',
  plusAt.visible && minusAt.visible &&
  afterMinus === panel.claimed - 1 && afterPlus === afterMinus + 1,
  `bagli ${panel.claimed} -> ${afterMinus} -> ${afterPlus}`);

// --- 13. Isci binanin altinda kaybolmuyor / asili kalan yok -------------------
const sanity = await W(() => {
  const w = window.game.scene.getScene('CityScene').registry.get('world');
  for (let i = 0; i < 60 && w.workforce.snapshot.moving > 0; i += 1) w.simulation.advance(1);
  const stuck = w.state.workers.filter((k) => k.state === 'moving').length;
  const spots = w.state.workers
    .filter((k) => k.buildingUid)
    .map((k) => `${k.toX.toFixed(2)},${k.toY.toFixed(2)}`);
  const dangling = w.state.workers.filter(
    (k) => k.buildingUid && !w.state.buildings.get(k.buildingUid),
  ).length;
  return { stuck, dup: spots.length - new Set(spots).size, dangling, snap: w.workforce.snapshot };
});
check('13', 'takilan isci, ust uste binen isci ve sahipsiz atama yok',
  sanity.stuck === 0 && sanity.dup === 0 && sanity.dangling === 0,
  `yolda kalan=${sanity.stuck} cakisan=${sanity.dup} sahipsiz=${sanity.dangling}`);

check('14', 'konsol/sayfa hatasi yok', errors.length === 0, errors.slice(0, 3).join(' | '));

console.table(results);
const passed = results.filter((r) => r.sonuc === 'PASS').length;
console.log(`DPR=${DPR}  PASS=${passed}/${results.length}`);
await b.close();
if (passed !== results.length) process.exitCode = 1;
