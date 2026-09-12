/**
 * Sprint 10 - sehir navigasyonu senaryolari (1-12).
 *
 * Kullanim:  node bench/navigation.mjs [url] [dpr]
 *
 * Olcum "gorunuyor gibi"ye degil, KARE KARE OKUNAN KARO'ya dayanir: iscinin
 * her tikteki konumu izgaraya cevrilir ve o karonun gezilebilir oldugu
 * dogrulanir. Binanin icinden ya da sudan gecen tek bir kare bile testi
 * dusurur.
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

/*
 * Sayfa icinde calisan ortak yardimci: bir isciyi varana kadar tik tik
 * ilerletir ve her adimda bastigi karoyu kaydeder. Gezilemez bir karoya
 * basildigi an isaretlenir.
 */
const HELPERS = `
  /** Merkezden disari dogru tarayarak yer bulur; kose karolarina takilmaz. */
  function placeNear(w, type, cx, cy, maxRadius) {
    for (let r = 0; r <= maxRadius; r += 1) {
      for (let dy = -r; dy <= r; dy += 1) {
        for (let dx = -r; dx <= r; dx += 1) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const res = w.buildings.place(type, cx + dx, cy + dy);
          if (res.ok) return res.building;
        }
      }
    }
    return null;
  }

  /** Iki dunya noktasi arasindaki DUZ cizgi kapali bir karodan geciyor mu? */
  function straightLineBlocked(w, a, b) {
    const HW = 64, HH = 32;
    const toGrid = (x, y) => ({
      gx: Math.round((x / HW + y / HH) / 2) + 0,
      gy: Math.round((y / HH - x / HW) / 2) + 0,
    });
    let hits = 0;
    const steps = 120;
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      const cell = toGrid(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
      const tile = w.state.grid.getTile(cell.gx, cell.gy);
      if (!tile || tile.terrain === 'water' || tile.occupantUid !== null) hits += 1;
    }
    return hits;
  }
`;

const TRACE = `
  function trace(w, id, limit) {
    const HW = 64, HH = 32;
    const toGrid = (x, y) => ({
      gx: Math.round((x / HW + y / HH) / 2) + 0,
      gy: Math.round((y / HH - x / HW) / 2) + 0,
    });
    const pos = (k) => {
      const total = k.travelTicks;
      const done = k.state === 'moving' && total > 0 ? (total - k.travelLeft) / total : 1;
      return { x: k.fromX + (k.toX - k.fromX) * done, y: k.fromY + (k.toY - k.fromY) * done };
    };
    const cells = [];
    const bad = [];
    let origin = null;
    let exiting = 0;
    for (let i = 0; i < limit; i += 1) {
      const k = w.state.workers.find((x) => x.id === id);
      if (!k) break;
      const at = pos(k);
      const cell = toGrid(at.x, at.y);
      const key = cell.gx + ',' + cell.gy;
      if (origin === null) origin = key;
      cells.push(key);
      const tile = w.state.grid.getTile(cell.gx, cell.gy);
      const blocked = !tile || tile.terrain === 'water' || tile.occupantUid !== null;
      if (blocked) {
        /*
         * Iscinin BASLADIGI karo kapali olabilir: isciler engel sayilmadigi
         * icin uzerinde durdugu yere bina kurulabilir. O evden cikmasi
         * birkac tik surer ve bu bir rota hatasi DEGILDIR. Yalnizca kendi
         * cikis karosu disindaki kapali karolar hata sayilir.
         */
        if (key === origin) exiting += 1;
        else bad.push({ cell, terrain: tile ? tile.terrain : 'harita-disi', occupant: tile ? tile.occupantUid : null });
      }
      if (k.state !== 'moving') break;
      w.simulation.advance(1);
    }
    const last = w.state.workers.find((x) => x.id === id);
    return {
      cells, bad, exiting,
      ended: last ? last.state : 'yok',
      finish: last ? pos(last) : null,
    };
  }
`;

// --- Senaryo 1: acik arazi ----------------------------------------------------
const s1 = await W(`(() => { ${HELPERS} ${TRACE}
  const w = window.game.scene.getScene('CityScene').registry.get('world');
  for (const k of ['wood','stone','food','gold']) w.state.setResource(k, 99999);
  const put = (t) => { for (const x of w.state.grid.allTiles()) { const r = w.buildings.place(t, x.gx, x.gy); if (r.ok) return r.building; } return null; };
  const house1 = put('house'), house2 = put('house');
  const camp = put('lumber_camp');
  for (let i = 0; i < 700; i += 1) w.simulation.advance(1);

  const res = w.workforce.assign(camp.uid);
  if (!res.ok) return { error: res.reason };
  const t = trace(w, res.worker.id, 200);
  return {
    campUid: camp.uid, houses: [house1.uid, house2.uid],
    steps: t.cells.length, bad: t.bad, ended: t.ended,
    assigned: w.state.buildings.get(camp.uid).assignedWorkers,
    wood: w.buildings.resolve(w.state.buildings.get(camp.uid)).effectiveProduction.wood || 0,
  };
})()`);
check(1, 'acik arazi: isci yuruyor, variyor, calisiyor',
  !s1.error && s1.bad.length === 0 && s1.ended === 'working' && s1.assigned === 1 && s1.wood > 0,
  `${s1.steps} adim, gecersiz karo=${(s1.bad || []).length}, son=${s1.ended}, odun=${(s1.wood || 0).toFixed(2)}/dk`);

// --- Senaryo 2: bina engeli ---------------------------------------------------
const s2 = await W(`(() => { ${HELPERS} ${TRACE}
  const w = window.game.scene.getScene('CityScene').registry.get('world');
  for (const k of ['wood','stone','food','gold']) w.state.setResource(k, 1e7);
  const c = w.state.grid.center();

  /*
   * ENGEL: yogun bir sehir.
   *
   * Once tek sira bina duvari denedim; Sprint 12'nin yerlesiminde bir
   * satirda en fazla 8 alan var ve 14 karolik haritada duz cizgi duvari
   * hic kesmeden yanindan siyirabiliyordu (olculdu: 8 binalik duvar, 0
   * kesisim). Ciftlige uygun alanlar HARIC tum konut alanlarini doldurmak
   * gercek bir engel dokusu yaratir ve olcumu kesin kilar.
   */
  let walled = 0;
  for (const plot of w.buildings.availablePlots('house')) {
    if (plot.allowedTypes.includes('farm')) continue;
    if (w.buildings.place('house', plot.gx, plot.gy).ok) walled += 1;
  }

  // Duz cizgisi en cok binadan gecen ciftlik alani secilir.
  const HW = 64, HH = 32;
  const plaza = { x: (c.gx - c.gy) * HW, y: (c.gx + c.gy) * HH };
  let bestPlot = null;
  let best = 0;
  for (const plot of w.buildings.availablePlots('farm')) {
    const at = { x: (plot.gx - plot.gy) * HW, y: (plot.gx + plot.gy) * HH };
    const hits = straightLineBlocked(w, plaza, at);
    if (hits > best) { best = hits; bestPlot = plot; }
  }
  if (!bestPlot) return { error: 'olculebilir ciftlik yeri yok', walled };

  const placed = w.buildings.place('farm', bestPlot.gx, bestPlot.gy);
  if (!placed.ok) return { error: 'ciftlik kurulamadi', walled };
  const farm = placed.building;

  for (let i = 0; i < 1200; i += 1) w.simulation.advance(1);
  if (farm.state !== 'active') return { error: 'ciftlik tamamlanmadi', walled };

  const res = w.workforce.assign(farm.uid);
  if (!res.ok) return { error: res.reason, walled };

  const k0 = w.state.workers.find((x) => x.id === res.worker.id);
  const origin = { x: k0.fromX, y: k0.fromY };
  const t = trace(w, res.worker.id, 400);
  const crossings = t.finish ? straightLineBlocked(w, origin, t.finish) : 0;

  return { walled, crossings, steps: t.cells.length, bad: t.bad, exiting: t.exiting,
           ended: t.ended, uniq: new Set(t.cells).size };
})()`);
check(2, 'bina engeli: duz cizgi binadan gecerdi, isci gecmiyor',
  !s2.error && s2.bad.length === 0 && s2.ended === 'working' && s2.crossings > 0,
  s2.error
    ? `kurulum basarisiz: ${s2.error}`
    : `${s2.walled} bina engel, duz cizgi ${s2.crossings} kapali ornek noktasindan gecerdi; ` +
      `yurunen ${s2.uniq} karonun hepsi acik, son=${s2.ended}`);

// --- Senaryo 3: su ------------------------------------------------------------
const s3 = await W(`(() => { ${HELPERS} ${TRACE}
  const w = window.game.scene.getScene('CityScene').registry.get('world');
  for (const k of ['wood','stone','food','gold']) w.state.setResource(k, 99999);
  const c = w.state.grid.center();

  /*
   * Meydan ile hedef arasina su seridi acilir.
   *
   * Su, YAPI ALANI OLMAYAN karolara konur: alani suya cevirmek o alani
   * yok etmez ama hedefi ulasilamaz kilabilirdi. Sonra seridin ardindaki
   * bir alana ciftlik kurulur.
   */
  /*
   * Serit haritanin TAMAMINI kesmemeli.
   *
   * Sprint 14'te izgara 18x18 oldu ve c.gx-3 tam bir SOKAK sutununa denk
   * geliyor; o sutunun tamamini suya cevirmek sehri ikiye boluyor ve
   * hicbir rota kalmiyordu (olculdu: bu senaryodan sonraki butun
   * senaryolar da coktu, cunku dunya senaryolar arasinda sifirlanmiyor).
   * Alt uctan uc karo acik birakilir: isci suyun etrafindan DOLASMAK
   * zorunda kalir, ki olculmek istenen de budur.
   */
  let made = 0;
  const band = c.gx - 3;
  const passage = w.state.grid.size - 3;
  for (let gy = 0; gy < passage; gy += 1) {
    const tile = w.state.grid.getTile(band, gy);
    if (!tile || tile.occupantUid !== null) continue;
    if (w.buildings.plotAt(band, gy)) continue;
    tile.terrain = 'water';
    made += 1;
  }

  let farm = null;
  for (const plot of w.buildings.availablePlots('farm')) {
    if (plot.gx >= band) continue;
    const r = w.buildings.place('farm', plot.gx, plot.gy);
    if (r.ok) { farm = r.building; break; }
  }
  if (!farm) return { error: 'su ardinda ciftlik yeri yok', made };
  for (let i = 0; i < 900; i += 1) w.simulation.advance(1);
  if (farm.state !== 'active') return { error: 'ciftlik tamamlanmadi', made };

  const res = w.workforce.assign(farm.uid);
  if (!res.ok) return { error: res.reason, made };
  const t = trace(w, res.worker.id, 300);
  const water = t.bad.filter((x) => x.terrain === 'water').length;
  return { made, steps: t.cells.length, bad: t.bad, water, ended: t.ended };
})()`);
check(3, 'su: isci suyun uzerinden gecmiyor',
  !s3.error && s3.made > 0 && s3.bad.length === 0 && s3.water === 0,
  `${s3.made} su karosu, gecersiz=${(s3.bad || []).length} (su=${s3.water}), son=${s3.ended}`);

// --- Senaryo 4: coklu isci ----------------------------------------------------
const s4 = await W(`(() => { ${HELPERS} ${TRACE}
  const w = window.game.scene.getScene('CityScene').registry.get('world');
  for (const k of ['wood','stone','food','gold']) w.state.setResource(k, 99999);
  w.state.setPopulation(Math.max(w.state.population, 12), 0);
  w.workforce.reconcile();

  let quarry = null;
  for (const x of w.state.grid.allTiles()) { if (!quarry) { const r = w.buildings.place('quarry', x.gx, x.gy); if (r.ok) quarry = r.building; } }
  if (!quarry) return { error: 'ocak kurulamadi' };
  for (let i = 0; i < 400; i += 1) w.simulation.advance(1);

  const ids = [];
  while (true) { const r = w.workforce.assign(quarry.uid); if (!r.ok) break; ids.push(r.worker.id); }
  const bad = [];
  for (const id of ids) { const t = trace(w, id, 200); bad.push(...t.bad); }
  for (let i = 0; i < 80 && w.workforce.snapshot.moving > 0; i += 1) w.simulation.advance(1);

  const crew = w.state.workers.filter((k) => k.buildingUid === quarry.uid);
  const spots = new Set(crew.map((k) => k.toX.toFixed(2) + ',' + k.toY.toFixed(2)));
  const slots = new Set(crew.map((k) => k.slot));
  return { assigned: ids.length, crew: crew.length, spots: spots.size, slots: [...slots].sort(), bad,
           working: crew.filter((k) => k.state === 'working').length };
})()`);
check(4, 'coklu isci: hepsi variyor, yerleri ayri, kimse binaya girmiyor',
  !s4.error && s4.bad.length === 0 && s4.crew > 1 && s4.spots === s4.crew && s4.working === s4.crew,
  `kadro=${s4.crew} calisan=${s4.working} farkli nokta=${s4.spots} yerler=${s4.slots} gecersiz=${(s4.bad || []).length}`);

// --- Senaryo 5: geri alma -----------------------------------------------------
const s5 = await W(`(() => { ${HELPERS} ${TRACE}
  const w = window.game.scene.getScene('CityScene').registry.get('world');
  const quarry = [...w.state.buildings.values()].find((k) => k.type === 'quarry');
  const before = w.state.buildings.get(quarry.uid).assignedWorkers;
  const res = w.workforce.release(quarry.uid);
  if (!res.ok) return { error: res.reason };
  const t = trace(w, res.worker.id, 200);
  return { before, after: w.state.buildings.get(quarry.uid).assignedWorkers,
           steps: t.cells.length, bad: t.bad, ended: t.ended };
})()`);
check(5, 'geri alma: isci gecerli rotadan meydana donuyor',
  !s5.error && s5.bad.length === 0 && s5.ended === 'idle' && s5.after === s5.before - 1,
  `calisan ${s5.before}->${s5.after}, ${s5.steps} adim, gecersiz=${(s5.bad || []).length}, son=${s5.ended}`);

// --- Senaryo 6: yolda geri alma (isinlanma yok) -------------------------------
const s6 = await W(`(() => { ${HELPERS} ${TRACE}
  const w = window.game.scene.getScene('CityScene').registry.get('world');
  const quarry = [...w.state.buildings.values()].find((k) => k.type === 'quarry');
  const res = w.workforce.assign(quarry.uid);
  if (!res.ok) return { error: res.reason };
  w.simulation.advance(1);

  const k = w.state.workers.find((x) => x.id === res.worker.id);
  const total = k.travelTicks;
  const done = total > 0 ? (total - k.travelLeft) / total : 1;
  const at = { x: k.fromX + (k.toX - k.fromX) * done, y: k.fromY + (k.toY - k.fromY) * done };

  w.workforce.release(quarry.uid);
  const restart = { x: k.fromX, y: k.fromY, uid: k.buildingUid };
  const t = trace(w, res.worker.id, 200);
  return { at, restart, bad: t.bad, ended: t.ended,
           jump: Math.hypot(restart.x - at.x, restart.y - at.y) };
})()`);
check(6, 'yolda geri alma: rota BULUNDUGU yerden yeniden kuruluyor',
  !s6.error && s6.jump < 0.001 && s6.restart.uid === null && s6.bad.length === 0 && s6.ended === 'idle',
  `sicrama=${(s6.jump || 0).toFixed(4)}px, gecersiz=${(s6.bad || []).length}, son=${s6.ended}`);

// --- Senaryo 7: yikim ---------------------------------------------------------
const s7 = await W(`(() => { ${HELPERS} ${TRACE}
  const w = window.game.scene.getScene('CityScene').registry.get('world');
  const quarry = [...w.state.buildings.values()].find((k) => k.type === 'quarry');
  while (w.workforce.assign(quarry.uid).ok) { /* doldur */ }
  for (let i = 0; i < 80 && w.workforce.snapshot.moving > 0; i += 1) w.simulation.advance(1);

  const before = w.state.buildings.get(quarry.uid).assignedWorkers;
  const stone = w.buildings.resolve(w.state.buildings.get(quarry.uid)).effectiveProduction.stone || 0;
  const claimed = w.workforce.claimedBy(quarry.uid);
  /*
   * YALNIZCA yikilan binanin iscileri izlenir. Sehirdeki toplam "bosta"
   * sayisini karsilastirmak yaniltiyordu: onceki senaryolardan kalan
   * isciler de bu pencerede eve variyor ve sayiyi sisiriyordu.
   */
  const crew = w.state.workers.filter((k) => k.buildingUid === quarry.uid).map((k) => k.id);
  const stoneAfterDemolish = [];

  w.bus.emit('ui:request-demolish', quarry.uid);
  const orphan = w.state.workers.filter((k) => k.buildingUid === quarry.uid).length;
  stoneAfterDemolish.push(w.state.buildings.get(quarry.uid) ? 'bina duruyor' : 'bina yok');

  const bad = [];
  for (const id of crew) { const t = trace(w, id, 200); bad.push(...t.bad); }
  for (let i = 0; i < 80 && w.workforce.snapshot.moving > 0; i += 1) w.simulation.advance(1);

  const ended = crew.map((id) => (w.state.workers.find((k) => k.id === id) || {}).state);
  return { before, stone, claimed, orphan, bad, ended,
           allIdle: ended.every((x) => x === 'idle'), after: stoneAfterDemolish[0] };
})()`);
check(7, 'yikim: uretim aninda duruyor, isciler guvenle ayriliyor',
  s7.orphan === 0 && s7.bad.length === 0 && s7.allIdle && s7.claimed > 0,
  `calisan=${s7.before} tas=${(s7.stone || 0).toFixed(1)}/dk, ${s7.after}, serbest=${s7.claimed}, ` +
  `sahipsiz=${s7.orphan}, ekibin son durumu=${(s7.ended || []).join('/')}, gecersiz=${(s7.bad || []).length}`);

// --- Senaryo 8: kayit / yukleme -----------------------------------------------
const before8 = await W(() => {
  const w = window.game.scene.getScene('CityScene').registry.get('world');
  const camp = [...w.state.buildings.values()].find((k) => k.type === 'lumber_camp');
  while (w.workforce.assign(camp.uid).ok) { /* doldur */ }
  w.simulation.advance(1); // bazilari yolda kalsin
  w.save();
  return {
    moving: w.workforce.snapshot.moving,
    rows: w.state.workers.filter((k) => k.buildingUid)
      .map((k) => `${k.id}:${k.slot}:${k.state}`).sort(),
  };
});
await page.reload({ waitUntil: 'load' });
await page.waitForTimeout(2200);
const after8 = await W(`(() => { ${HELPERS} ${TRACE}
  const w = window.game.scene.getScene('CityScene').registry.get('world');
  const rows = w.state.workers.filter((k) => k.buildingUid).map((k) => k.id + ':' + k.slot + ':' + k.state).sort();
  const ids = w.state.workers.filter((k) => k.state === 'moving').map((k) => k.id);
  const bad = [];
  for (const id of ids) { const t = trace(w, id, 200); bad.push(...t.bad); }
  for (let i = 0; i < 80 && w.workforce.snapshot.moving > 0; i += 1) w.simulation.advance(1);
  const stuck = w.state.workers.filter((k) => k.state === 'moving').length;
  const dangling = w.state.workers.filter((k) => k.buildingUid && !w.state.buildings.get(k.buildingUid)).length;
  return { rows, bad, stuck, dangling };
})()`);
check(8, 'kayit/yukleme: atamalar korunuyor, rota yeniden uretiliyor',
  JSON.stringify(before8.rows) === JSON.stringify(after8.rows) &&
  after8.bad.length === 0 && after8.stuck === 0 && after8.dangling === 0,
  `${after8.rows.length} kayitli isci (yuklemede ${before8.moving} yolda), gecersiz=${after8.bad.length}, takilan=${after8.stuck}`);

// --- Senaryo 9: yogun sehir ---------------------------------------------------
const s9 = await W(`(() => { ${HELPERS} ${TRACE}
  const w = window.game.scene.getScene('CityScene').registry.get('world');
  for (const k of ['wood','stone','food','gold']) w.state.setResource(k, 1e7);
  const c = w.state.grid.center();

  /*
   * Haritayi binayla doldur; her ucuncu SUTUNU koridor olarak birak.
   *
   * Koridorlar DIKEY secildi. Ilk denemede kosegen bir desen (gx+gy)%3
   * kullanmistim: dort yonlu harekette kosegen bir bos karo dizisi
   * birbirine BAGLANMAZ, dolayisiyla her bina ulasilamaz cikiyordu.
   * Bu, senaryonun hatasiydi - ama 4 yonlu hareketin gercek bir sonucu
   * oldugu icin raporda da belirtiliyor.
   */
  let built = 0;
  // Sprint 12: sehir zaten sokaklara bolunmus yapi adalarindan olusuyor;
  // "her ucuncu sutun koridor" deseni artik yerlesimin kendisinde var.
  /*
   * Ciftlige uygun alanlar BOS birakilir; aksi halde yogun sehirde
   * hedef bina kurulacak yer kalmiyor (olculdu: 47 bina, ciftlik yeri 0).
   */
  for (const plot of w.buildings.availablePlots('house')) {
    if (plot.allowedTypes.includes('farm')) continue;
    if (w.buildings.place('house', plot.gx, plot.gy).ok) built += 1;
  }
  for (let i = 0; i < 1500; i += 1) w.simulation.advance(1);

  // Koridora bir ciftlik kur ve GERCEKTEN isci alabilen bir hedef bul.
  const farm = placeNear(w, 'farm', c.gx, c.gy, 6);
  if (!farm) return { built, error: 'yogun sehirde ciftlik yeri yok' };
  for (let i = 0; i < 500; i += 1) w.simulation.advance(1);
  if (farm.state !== 'active') return { built, error: 'ciftlik tamamlanmadi' };

  const queriesBefore = w.workforce.pathQueryCount;
  const t0 = performance.now();
  const ids = [];
  while (true) { const r = w.workforce.assign(farm.uid); if (!r.ok) { var why = r.reason; break; } ids.push(r.worker.id); }
  const assignMs = performance.now() - t0;
  if (ids.length === 0) return { built, error: 'atama yapilamadi: ' + why };

  const bad = [];
  let longest = 0;
  let exiting = 0;
  for (const id of ids) {
    longest = Math.max(longest, w.workforce.remainingWaypoints(id));
    const tr = trace(w, id, 400);
    bad.push(...tr.bad);
    exiting += tr.exiting;
  }
  for (let i = 0; i < 150 && w.workforce.snapshot.moving > 0; i += 1) w.simulation.advance(1);
  return { built, assigned: ids.length, bad, exiting, longest, assignMs,
           queries: w.workforce.pathQueryCount - queriesBefore,
           working: w.state.buildings.get(farm.uid).assignedWorkers,
           stuck: w.state.workers.filter((k) => k.state === 'moving').length,
           total: w.state.workers.length };
})()`);
check(9, 'yogun sehir: rota patlamasi yok, kimse binadan gecmiyor',
  !s9.error && s9.assigned > 0 && s9.bad.length === 0 && s9.stuck === 0 && s9.assignMs < 200,
  s9.error
    ? `${s9.built} bina; kurulum basarisiz: ${s9.error}`
    : `${s9.built} bina, ${s9.total} isci, ${s9.assigned} atama ${(s9.assignMs || 0).toFixed(1)}ms, ` +
      `${s9.queries} rota hesabi, en uzun rota=${s9.longest} bacak, calisan=${s9.working}, ` +
      `gecersiz=${s9.bad.length} (uzerine bina kurulan isci cikisi: ${s9.exiting} tik)`);

// --- Senaryo 10: ilerletme rota HESAPLAMIYOR ----------------------------------
const s10 = await W(() => {
  const w = window.game.scene.getScene('CityScene').registry.get('world');
  const before = w.workforce.pathQueryCount;
  for (let i = 0; i < 60; i += 1) w.simulation.advance(1);
  return { before, after: w.workforce.pathQueryCount, workers: w.state.workers.length };
});
check(10, 'ilerletme kare/tik basina rota HESAPLAMIYOR',
  s10.after === s10.before,
  `${s10.workers} isci, 60 tik -> rota hesabi ${s10.before} (degismedi)`);

/*
 * Senaryo 11 TEMIZ bir sayfada kosar.
 *
 * Ayni sayfada devam etmek yaniltiyordu: onceki senaryolarin sehri otomatik
 * kayda dusuyor, localStorage.clear() ile reload arasinda oyun dongusu
 * calismaya devam edip yeniden kaydediyordu. Sonucta "temiz" sayfa 88
 * binalik yogun sehirle aciliyor ve dokunmatik olcumu anlamsizlasiyordu.
 */
await page.close();
/*
 * Yeni bir SEKME yetmiyor: localStorage baglam genelinde paylasiliyor ve
 * oyun dongusu clear() ile reload() arasinda yogun sehri yeniden
 * kaydediyordu (olculdu: "temiz" sayfa 106 isciyle aciliyordu). Bu yuzden
 * sifirdan bir tarayici baglami acilir.
 */
const ctx2 = await b.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: DPR,
  isMobile: true,
  hasTouch: true,
});
const page2 = await ctx2.newPage();
page2.on('pageerror', (e) => errors.push('pageerror: ' + e));
page2.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
const cdp2 = await ctx2.newCDPSession(page2);
await page2.goto(URL, { waitUntil: 'load' });
await page2.waitForTimeout(2500);

const P = (fn, arg) => page2.evaluate(fn, arg);
const panel = await P(() => {
  const cs = window.game.scene.getScene('CityScene');
  const w = cs.registry.get('world');
  for (const k of ['wood','stone','food','gold']) w.state.setResource(k, 99999);
  const c = w.state.grid.center();
  /*
   * Merkeze en yakin uygun YAPI ALANI.
   *
   * Yaricap siniri kaldirildi: Sprint 12'de oduncu kampinin alanlari
   * uretim kusaginda, yani merkezden uzakta. Sabit yaricap hicbir kamp
   * yeri bulamiyordu.
   */
  const near = (type) => {
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
  };
  near('house'); near('house');
  const camp = near('lumber_camp');
  for (let i = 0; i < 700; i += 1) w.simulation.advance(1);
  cs.selectTile(w.state.grid.getTile(camp.gx, camp.gy));
  return { uid: camp.uid, claimed: w.workforce.claimedBy(camp.uid), idle: w.workforce.idleCount };
});
await page2.waitForTimeout(400);

const tap = async (which) => {
  const at = await P((k) => {
    const ui = window.game.scene.getScene('UIScene');
    const p = ui.infoPanel;
    const btn = k === 'plus' ? p.assignButton : p.releaseButton;
    return { x: p.x + btn.x, y: p.y + btn.y, visible: btn.visible };
  }, which);
  if (!at.visible) return at;
  await cdp2.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: at.x, y: at.y, id: 1 }] });
  await page2.waitForTimeout(60);
  await cdp2.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page2.waitForTimeout(220);
  return at;
};
const claimed = (u) => P((k) => {
  const w = window.game.scene.getScene('CityScene').registry.get('world');
  return w.workforce.claimedBy(k);
}, u);

const plusAt = await tap('plus');
const afterPlus = await claimed(panel.uid);
const minusAt = await tap('minus');
const afterMinus = await claimed(panel.uid);
check(11, 'dokunmatik: "+" ve "-" gercek dokunusla calisiyor',
  plusAt.visible && minusAt.visible && afterPlus === panel.claimed + 1 && afterMinus === afterPlus - 1,
  `bosta=${panel.idle}, bagli ${panel.claimed} -> ${afterPlus} -> ${afterMinus}`);

check(12, 'konsol/sayfa hatasi yok', errors.length === 0, errors.slice(0, 3).join(' | '));

console.table(results);
const passed = results.filter((r) => r.sonuc === 'PASS').length;
console.log(`DPR=${DPR}  PASS=${passed}/${results.length}`);
await b.close();
if (passed !== results.length) process.exitCode = 1;
