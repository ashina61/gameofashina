/**
 * Sprint 13 - mobil yerlesim ve okunabilirlik denetimi.
 *
 * Kullanim:  node bench/mobile.mjs [url] [dpr]
 *
 * Arayuzun DAR ekranlarda tasmadigini, ogelerin ust uste binmedigini,
 * metinlerin kirpilmadigini ve sehrin gercekten GORUNUR oldugunu olcer.
 * Olcum ekran goruntusune degil, Phaser nesnelerinin gercek sinir
 * dikdortgenlerine dayanir.
 *
 * Cakisma testi hem YATAY hem DIKEY ortusmeye bakar: arayuz bilerek alt
 * alta satirlar diziyor (miktar/oran, nufus/bosta) ve yalnizca yatay
 * araligi karsilastirmak bunlari cakisma sayiyordu (Sprint 12'de olculdu:
 * her ekranda 5 sahte cakisma).
 */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const URL = process.argv[2] ?? 'http://127.0.0.1:5191/';
const DPR = Number(process.argv[3] ?? 1);
const VIEWPORTS = [
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
];

const browser = await chromium.launch();
const rows = [];
const errors = [];

for (const viewport of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: DPR, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${viewport.width}: pageerror ${e}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${viewport.width}: ${m.text()}`); });

  await page.goto(URL, { waitUntil: 'load' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(2400);

  // Sehri kur ki bilgi paneli dolu icerikle olculsun.
  await page.evaluate(() => {
    const cs = window.game.scene.getScene('CityScene');
    const w = cs.registry.get('world');
    for (const k of ['wood', 'stone', 'food', 'gold']) w.state.setResource(k, 99999);
    const put = (type) => {
      for (const plot of w.buildings.availablePlots(type)) {
        const r = w.buildings.place(type, plot.gx, plot.gy);
        if (r.ok) return r.building;
      }
      return null;
    };
    const hall = put('town_hall');
    put('house'); put('house');
    const camp = put('lumber_camp');
    for (let i = 0; i < 900; i += 1) w.simulation.advance(1);
    while (w.workforce.assign(camp.uid).ok) { /* kadro */ }
    for (let i = 0; i < 60 && w.workforce.snapshot.moving > 0; i += 1) w.simulation.advance(1);
    window.__hall = [hall.gx, hall.gy];
    cs.selectTile(w.state.grid.getTile(camp.gx, camp.gy));
  });
  await page.waitForTimeout(500);

  const probe = await page.evaluate(() => {
    const ui = window.game.scene.getScene('UIScene');
    const cs = window.game.scene.getScene('CityScene');
    const logical = { w: ui.logicalWidth(), h: ui.logicalHeight() };

    /** Merkezlenmis bir nesnenin mantiksal sinirlari. */
    const rect = (obj) => ({
      left: obj.x - (obj.width ?? 0) / 2,
      right: obj.x + (obj.width ?? 0) / 2,
      top: obj.y - (obj.height ?? 0) / 2,
      bottom: obj.y + (obj.height ?? 0) / 2,
    });
    const overlaps = (a, b) =>
      a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

    /** Bir kapsayicinin icindeki yazinin MUTLAK sinirlari. */
    const inside = (parent, obj) => ({
      left: parent.x + obj.x - (obj.width ?? 0) * (obj.originX ?? 0.5),
      right: parent.x + obj.x + (obj.width ?? 0) * (1 - (obj.originX ?? 0.5)),
      top: parent.y + obj.y - (obj.height ?? 0) * (obj.originY ?? 0.5),
      bottom: parent.y + obj.y + (obj.height ?? 0) * (1 - (obj.originY ?? 0.5)),
      text: obj.text,
    });

    /** Ayni kapsayicidaki gorunur yazilar birbirine biniyor mu? */
    const collide = (parent) => {
      const items = parent.list
        .filter((o) => o.type === 'Text' && o.visible && o.text)
        .map((o) => inside(parent, o));
      const hits = [];
      for (let i = 0; i < items.length; i += 1) {
        for (let j = i + 1; j < items.length; j += 1) {
          if (overlaps(items[i], items[j])) hits.push(`${items[i].text} | ${items[j].text}`);
        }
      }
      return { hits, items };
    };

    const bar = ui.resourceBar;
    const nav = ui.nav;
    const panel = ui.infoPanel;
    const build = rect(ui.buildButton);

    const barCheck = collide(bar);
    const navCheck = collide(nav);
    const panelCheck = collide(panel);

    const navRect = { left: 0, right: logical.w, top: nav.y, bottom: nav.y + 66 };
    const panelRect = { left: 0, right: logical.w, top: panel.y, bottom: panel.y + 212 };

    // Sehir gercekten gorunuyor mu? Sehir merkezinin ekran noktasi.
    const cam = cs.cameras.main;
    const dpr = window.game.registry.get('resolution')?.dpr ?? 1;
    const hallWorld = {
      x: (window.__hall[0] - window.__hall[1]) * 64,
      y: (window.__hall[0] + window.__hall[1]) * 32,
    };
    const view = cam.worldView;
    const hallScreen = {
      x: ((hallWorld.x - view.x) / view.width) * (cam.width / dpr),
      y: ((hallWorld.y - view.y) / view.height) * (cam.height / dpr),
    };

    return {
      logical,
      // 1. Ust cubuk
      barInside: barCheck.items.every((t) => t.left >= -1 && t.right <= logical.w + 1),
      barHits: barCheck.hits,
      // 2. Alt gezinme cubugu
      navTabs: nav.list.filter((o) => o.type === 'Text').length,
      navInside: navCheck.items.every((t) => t.left >= -1 && t.right <= logical.w + 1),
      navHits: navCheck.hits,
      navBottom: navRect.bottom,
      tabWidth: nav.tabWidth(),
      // 3. Ana aksiyon
      buildInside: build.left >= 0 && build.right <= logical.w && build.bottom <= logical.h,
      buildOverNav: overlaps(build, navRect),
      buildOverPanel: overlaps(build, panelRect),
      buildOverBar: build.top < bar.y + 112,
      // 4. Bilgi paneli
      panelInside: panelRect.bottom <= navRect.top + 1,
      panelHits: panelCheck.hits,
      panelTextInside: panelCheck.items.every((t) => t.right <= logical.w + 1),
      // 5. Yardimci yuvarlak dugmeler - birbirine ve panellere binmesin
      sideOverlap: (() => {
        const all = [ui.mapButton, ...ui.sideButtons].map((b) => rect(b));
        let hits = 0;
        for (let i = 0; i < all.length; i += 1) {
          for (let j = i + 1; j < all.length; j += 1) {
            if (overlaps(all[i], all[j])) hits += 1;
          }
          if (all[i].top < bar.y + 112) hits += 1;
          if (overlaps(all[i], navRect)) hits += 1;
        }
        return hits;
      })(),
      // 6. Sehir gorunurlugu
      hallOnScreen:
        hallScreen.x > 0 && hallScreen.x < logical.w && hallScreen.y > 84 && hallScreen.y < panelRect.top,
      // 7. Yatay tasma
      overflow: document.documentElement.scrollWidth > window.innerWidth,
    };
  });

  // Insa modunda alanlar gorunuyor mu?
  const plotProbe = await page.evaluate(() => {
    const cs = window.game.scene.getScene('CityScene');
    const w = cs.registry.get('world');
    w.bus.emit('tile:selected', null);
    w.bus.emit('placement:start', 'house');
    const visible = cs.plotLayer.overlays.filter((o) => o.visible).length;
    w.bus.emit('placement:cancel');
    return visible;
  });

  rows.push({
    ekran: `${viewport.width}x${viewport.height}`,
    'ust cubuk': probe.barInside && probe.barHits.length === 0 ? 'OK' : `SORUN ${probe.barHits[0] ?? 'tasti'}`,
    'alt gezinme': probe.navTabs === 5 && probe.navInside && probe.navHits.length === 0 ? 'OK' : 'SORUN',
    'sekme genisligi': Math.round(probe.tabWidth),
    'gezinme alani': probe.navBottom <= probe.logical.h ? 'OK' : 'TASTI',
    'insa butonu':
      probe.buildInside && !probe.buildOverNav && !probe.buildOverPanel && !probe.buildOverBar
        ? 'OK'
        : 'CAKISMA',
    'bilgi paneli':
      probe.panelInside && probe.panelTextInside && probe.panelHits.length === 0
        ? 'OK'
        : `SORUN ${probe.panelHits[0] ?? 'tasti'}`,
    'yan dugmeler': probe.sideOverlap === 0 ? 'OK' : `CAKISMA ${probe.sideOverlap}`,
    'merkez gorunur': probe.hallOnScreen ? 'OK' : 'GORUNMUYOR',
    'insa alanlari': plotProbe,
    'yatay tasma': probe.overflow ? 'VAR' : 'yok',
  });

  await ctx.close();
}

console.table(rows);
const ok = rows.every(
  (r) =>
    r['ust cubuk'] === 'OK' &&
    r['alt gezinme'] === 'OK' &&
    r['sekme genisligi'] >= 48 &&
    r['gezinme alani'] === 'OK' &&
    r['insa butonu'] === 'OK' &&
    r['bilgi paneli'] === 'OK' &&
    r['yan dugmeler'] === 'OK' &&
    r['merkez gorunur'] === 'OK' &&
    r['insa alanlari'] > 0 &&
    r['yatay tasma'] === 'yok',
);
console.log(`DPR=${DPR}  ${ok ? 'PASS' : 'FAIL'}  konsol/sayfa hatasi: ${errors.length === 0 ? 'YOK' : errors.slice(0, 3)}`);
await browser.close();
if (!ok || errors.length) process.exitCode = 1;
