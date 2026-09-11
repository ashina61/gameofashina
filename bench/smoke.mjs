/**
 * Uctan uca tarayici duman testi.
 *
 * Kullanim:  node bench/smoke.mjs [url]
 * Varsayilan url: http://127.0.0.1:5173/
 *
 * Oyunun gercekten oynanabilir oldugunu dogrular: acilis, render, secim,
 * insa, insaat gorunumu, tamamlanma, yukseltme, yukseltmenin tamamlanmasi,
 * reload sonrasi kayit butunlugu, kamera kaydirma, pinch zoom ve arayuz.
 *
 * NOT: Pinch icin CDP (Input.dispatchTouchEvent) kullanilir. Sentetik
 * TouchEvent dispatch'i Phaser'in girdi katmanina ULASMIYOR ve pinch'i
 * bozuk gosteriyordu - var olmayan bir hatayi bildirmemek icin gercek
 * coklu dokunma noktasi uretilmeli.
 */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const URL = process.argv[2] ?? 'http://127.0.0.1:5173/';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

const W = (fn, arg) => page.evaluate(fn, arg);
const results = [];
const check = (n, label, ok, detail = '') => { results.push({ '#': n, kontrol: label, sonuc: ok ? 'PASS' : 'FAIL', not: detail }); };

await page.goto(URL, { waitUntil: 'load' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'load' });
await page.waitForTimeout(2500);

// 1. oyun aciliyor
const booted = await W(() => !!window.game && window.game.isBooted);
check(1, 'oyun aciliyor', booted);

// 2. sehir render oluyor
const rendered = await W(() => {
  const cs = window.game.scene.getScene('CityScene');
  return { tiles: cs.children.list.length, canvas: !!document.querySelector('canvas') };
});
check(2, 'sehir render oluyor', rendered.canvas && rendered.tiles > 50, `${rendered.tiles} nesne`);

// 3. bina seciliyor (once bir bina kur, sonra sec)
const built = await W(() => {
  const w = window.game.scene.getScene('CityScene').registry.get('world');
  w.state.setResource('wood', 9999); w.state.setResource('stone', 9999); w.state.setResource('food', 999);
  for (const t of w.state.grid.allTiles()) {
    const r = w.buildings.place('house', t.gx, t.gy);
    if (r.ok) return { uid: r.building.uid, gx: t.gx, gy: t.gy, state: r.building.state };
  }
  return null;
});
check(4, 'bina insa ediliyor', !!built && built.state === 'constructing', built ? `${built.gx},${built.gy} -> ${built.state}` : 'kurulamadi');

await page.waitForTimeout(300);
const selected = await W((uid) => {
  const cs = window.game.scene.getScene('CityScene');
  const w = cs.registry.get('world');
  const bl = w.state.buildings.get(uid);
  w.bus.emit('tile:selected', { gx: bl.gx, gy: bl.gy, terrain: 'grass', occupantUid: uid });
  return true;
}, built.uid);
await page.waitForTimeout(400);
const panelOpen = await W(() => window.game.scene.getScene('UIScene').infoPanel?.isOpen === true);
check(3, 'bina seciliyor', selected && panelOpen, panelOpen ? 'InfoPanel acildi' : 'panel acilmadi');

// 5. construction gorunumu calisiyor
const cview = await W((uid) => {
  const cs = window.game.scene.getScene('CityScene');
  const view = cs.activeConstructionViews.get(uid);
  return { takipEdiliyor: !!view, aktifSayi: cs.activeConstructionViews.size };
}, built.uid);
check(5, 'construction gorunumu calisiyor', cview.takipEdiliyor, `aktif gorunum: ${cview.aktifSayi}`);

// 6. construction tamamlaniyor
await W(() => window.game.scene.getScene('CityScene').registry.get('world').simulation.advance(60));
await page.waitForTimeout(500);
const done = await W((uid) => {
  const cs = window.game.scene.getScene('CityScene');
  const w = cs.registry.get('world');
  const bl = w.state.buildings.get(uid);
  return { state: bl.state, task: !!bl.construction, gorunum: cs.activeConstructionViews.size };
}, built.uid);
check(6, 'construction tamamlaniyor', done.state === 'active' && !done.task && done.gorunum === 0,
      `state=${done.state}, gorev=${done.task}, aktif gorunum=${done.gorunum}`);

// 7. bina upgrade ediliyor
const up = await W((uid) => {
  const w = window.game.scene.getScene('CityScene').registry.get('world');
  w.state.setResource('wood', 9999); w.state.setResource('stone', 9999);
  const before = w.state.buildings.get(uid).level;
  const res = w.upgrades.requestUpgrade(uid);
  const bl = w.state.buildings.get(uid);
  return { ok: res.ok, reason: res.reason, oncekiSeviye: before, simdikiSeviye: bl.level,
           gorevTuru: bl.construction?.kind, state: bl.state };
}, built.uid);
check(7, 'bina upgrade ediliyor', up.ok && up.gorevTuru === 'upgrade' && up.simdikiSeviye === up.oncekiSeviye,
      `gorev=${up.gorevTuru}, seviye upgrade sirasinda ${up.simdikiSeviye} (degismedi)`);

// 8. upgrade tamamlaniyor
await W(() => window.game.scene.getScene('CityScene').registry.get('world').simulation.advance(120));
await page.waitForTimeout(400);
const upDone = await W((uid) => {
  const w = window.game.scene.getScene('CityScene').registry.get('world');
  const bl = w.state.buildings.get(uid);
  return { level: bl.level, task: !!bl.construction, state: bl.state };
}, built.uid);
check(8, 'upgrade tamamlaniyor', upDone.level === 2 && !upDone.task, `seviye=${upDone.level}`);

// 9. reload sonrasi state korunuyor (insaat SURERKEN kaydet)
const beforeReload = await W(() => {
  const w = window.game.scene.getScene('CityScene').registry.get('world');
  for (const t of w.state.grid.allTiles()) {
    const r = w.buildings.place('farm', t.gx, t.gy);
    if (r.ok) {
      w.save();
      return { uid: r.building.uid, tick: w.state.tick, completesAtTick: r.building.construction.completesAtTick,
               binaSayisi: w.state.buildings.size, pop: w.state.population };
    }
  }
  return null;
});
await page.reload({ waitUntil: 'load' });
await page.waitForTimeout(2500);
const afterReload = await W((uid) => {
  const w = window.game.scene.getScene('CityScene').registry.get('world');
  const bl = w.state.buildings.get(uid);
  return { binaSayisi: w.state.buildings.size, gorevVar: !!bl?.construction,
           completesAtTick: bl?.construction?.completesAtTick, kind: bl?.construction?.kind, pop: w.state.population };
}, beforeReload.uid);
check(9, 'reload sonrasi state korunuyor',
      afterReload.binaSayisi === beforeReload.binaSayisi && afterReload.gorevVar &&
      afterReload.completesAtTick === beforeReload.completesAtTick,
      `${afterReload.binaSayisi} bina, gorev korundu (completesAtTick ${afterReload.completesAtTick})`);

// 10. camera drag
const cam0 = await W(() => { const c = window.game.scene.getScene('CityScene').cameras.main; return { x: c.scrollX, y: c.scrollY }; });
await page.mouse.move(195, 400); await page.mouse.down();
for (let i = 1; i <= 8; i++) { await page.mouse.move(195 - i * 12, 400 - i * 5); await page.waitForTimeout(16); }
await page.mouse.up(); await page.waitForTimeout(300);
const cam1 = await W(() => { const c = window.game.scene.getScene('CityScene').cameras.main; return { x: c.scrollX, y: c.scrollY }; });
check(10, 'camera drag calisiyor', Math.abs(cam1.x - cam0.x) > 20, `kayma ${(cam1.x - cam0.x).toFixed(0)}px`);

// 11. pinch zoom - GERCEK coklu dokunus (CDP).
// Sentetik TouchEvent dispatch'i Phaser'in girdi katmanina ulasmiyor ve
// var olmayan bir hatayi bildiriyordu; CDP gercek dokunma noktasi uretir.
const z0 = await W(() => window.game.scene.getScene('CityScene').cameras.main.zoom);
const touch = (type, points) =>
  cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map(([x, y], i) => ({ x, y, id: i + 1 })) });
await touch('touchStart', [[150, 420], [240, 420]]);
await page.waitForTimeout(50);
for (const d of [20, 40, 60, 80, 100]) {
  await touch('touchMove', [[150 - d, 420], [240 + d, 420]]);
  await page.waitForTimeout(40);
}
await touch('touchEnd', []);
await page.waitForTimeout(300);
const z2 = await W(() => window.game.scene.getScene('CityScene').cameras.main.zoom);
check(11, 'pinch zoom calisiyor', z2 > z0 + 0.05, `zoom ${z0.toFixed(3)} -> ${z2.toFixed(3)}`);

// 12. UI calisiyor (buton -> menu)
const btn = await W(() => {
  const ui = window.game.scene.getScene('UIScene');
  let found = null;
  const walk = (o) => { const l = o.list?.find((c) => c.type === 'Text')?.text;
    if (o.constructor?.name === 'TouchButton' && l?.includes('INSA')) { const r = o.getBounds(); found = { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }
    if (o.list) o.list.forEach(walk); };
  ui.children.each(walk); return found;
});
await page.mouse.click(btn.x, btn.y); await page.waitForTimeout(500);
const menuOpen = await W(() => window.game.scene.getScene('UIScene').buildMenu?.isOpen === true);
check(12, 'UI calisiyor', menuOpen, 'INSA ET -> menu acildi');

await b.close();

console.table(results);
console.log('\nConsole/page hatalari:', errors.length === 0 ? 'YOK' : errors.slice(0, 8));
const failed = results.filter((r) => r.sonuc === 'FAIL');
if (failed.length === 0 && errors.length === 0) {
  console.log('\nBROWSER: PASS');
} else {
  console.error(`\nBROWSER: FAIL (${failed.length} kontrol, ${errors.length} hata)`);
  process.exit(1);
}
