/**
 * Sprint 12 - mobil yerlesim denetimi.
 *
 * Kullanim:  node bench/mobile.mjs [url] [dpr]
 *
 * Arayuzun DAR ekranlarda tasmadigini, butonlarin ust uste binmedigini ve
 * metinlerin kirpilmadigini olcer. Olcum ekran goruntusune degil, Phaser
 * nesnelerinin gercek sinir dikdortgenlerine dayanir.
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
    put('town_hall'); put('house'); put('house');
    const camp = put('lumber_camp');
    for (let i = 0; i < 900; i += 1) w.simulation.advance(1);
    while (w.workforce.assign(camp.uid).ok) { /* kadro */ }
    for (let i = 0; i < 60 && w.workforce.snapshot.moving > 0; i += 1) w.simulation.advance(1);
    cs.selectTile(w.state.grid.getTile(camp.gx, camp.gy));
  });
  await page.waitForTimeout(500);

  const probe = await page.evaluate(() => {
    const ui = window.game.scene.getScene('UIScene');
    const logical = { w: ui.logicalWidth ? ui.logicalWidth() : window.innerWidth, h: window.innerHeight };
    const rect = (obj) => ({
      left: obj.x - (obj.width ?? 0) / 2,
      right: obj.x + (obj.width ?? 0) / 2,
      top: obj.y - (obj.height ?? 0) / 2,
      bottom: obj.y + (obj.height ?? 0) / 2,
    });
    const overlaps = (a, b) =>
      a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

    const build = rect(ui.buildButton);
    const panel = ui.infoPanel;
    const panelRect = { left: 0, right: logical.w, top: panel.y, bottom: panel.y + 178 };

    // Panel icindeki metin ve butonlar
    const inPanel = (obj) => ({
      left: panel.x + obj.x - (obj.width ?? 0) * (obj.originX ?? 0.5),
      right: panel.x + obj.x + (obj.width ?? 0) * (1 - (obj.originX ?? 0.5)),
    });
    const body = inPanel(panel.bodyText);
    const worker = inPanel(panel.workerText);
    const assign = rect(panel.assignButton);
    const upgrade = rect(panel.upgradeButton);

    const bar = window.game.scene.getScene('UIScene').resourceBar;
    const barTexts = bar.list
      .filter((o) => o.type === 'Text')
      .map((o) => ({
        left: o.x - (o.width ?? 0) * (o.originX ?? 0),
        right: o.x + (o.width ?? 0) * (1 - (o.originX ?? 0)),
        top: o.y - (o.height ?? 0) * (o.originY ?? 0),
        bottom: o.y + (o.height ?? 0) * (1 - (o.originY ?? 0)),
        text: o.text,
      }));
    /*
     * Ust cubuktaki metinler birbirine biniyor mu?
     *
     * Yalnizca YATAY araligi karsilastirmak yaniltici: cubuk her kaynak icin
     * miktari ve dakikalik akisi, sagda da nufusu ve bostaki isciyi BILEREK
     * alt alta iki satira koyar. Bu ciftler ayni sutunu paylasir, cakismaz.
     * Bu yuzden cakisma ancak iki metin hem yatayda hem DIKEYDE ortusuyorsa
     * sayilir.
     */
    let barOverlap = 0;
    const barPairs = [];
    for (let i = 0; i < barTexts.length; i += 1) {
      for (let j = i + 1; j < barTexts.length; j += 1) {
        const a = barTexts[i];
        const b = barTexts[j];
        if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) {
          barOverlap += 1;
          barPairs.push(`${a.text} | ${b.text}`);
        }
      }
    }

    return {
      logical,
      buildVisible: ui.buildButton.visible,
      buildInside: build.left >= 0 && build.right <= logical.w && build.bottom <= logical.h,
      buildOverPanel: overlaps(build, {
        left: panelRect.left, right: panelRect.right, top: panelRect.top, bottom: panelRect.bottom,
      }),
      panelInside: panelRect.right <= logical.w && panelRect.bottom <= logical.h + 1,
      bodyInside: body.right <= logical.w,
      workerInside: worker.right <= logical.w,
      // Isci satiri sag sutundaki butonlarla cakisiyor mu?
      workerOverButtons: worker.right > Math.min(assign.left, upgrade.left) &&
        worker.right > upgrade.left,
      barOverlap,
      barPairs,
      barInside: barTexts.every((t) => t.left >= 0 && t.right <= logical.w),
      barTexts: barTexts.length,
    };
  });

  rows.push({
    ekran: `${viewport.width}x${viewport.height}`,
    'insa butonu': probe.buildVisible && probe.buildInside ? 'OK' : 'TASTI',
    'buton/panel cakismasi': probe.buildOverPanel ? 'VAR' : 'yok',
    'panel ekranda': probe.panelInside ? 'OK' : 'TASTI',
    'panel metni': probe.bodyInside && probe.workerInside ? 'OK' : 'KIRPIK',
    'isci satiri': probe.workerOverButtons ? 'CAKISIYOR' : 'OK',
    'ust cubuk': probe.barInside ? 'OK' : 'TASTI',
    'ust cubuk cakismasi': probe.barOverlap === 0 ? 'yok' : probe.barPairs.join(' / '),
  });

  await ctx.close();
}

console.table(rows);
const ok = rows.every(
  (r) =>
    r['insa butonu'] === 'OK' &&
    r['buton/panel cakismasi'] === 'yok' &&
    r['panel ekranda'] === 'OK' &&
    r['panel metni'] === 'OK' &&
    r['isci satiri'] === 'OK' &&
    r['ust cubuk'] === 'OK' &&
    r['ust cubuk cakismasi'] === 'yok',
);
console.log(`DPR=${DPR}  ${ok ? 'PASS' : 'FAIL'}  konsol/sayfa hatasi: ${errors.length === 0 ? 'YOK' : errors.slice(0, 3)}`);
await browser.close();
if (!ok || errors.length) process.exitCode = 1;
