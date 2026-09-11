/**
 * Isci sayisina gore render maliyeti.
 *
 * Kullanim:  node bench/workerfps.mjs [url] [dpr]
 *
 * Her olcum TEMIZ bir tarayici baglaminda alinir. Ortamda GPU yoktur
 * (SwiftShader), bu yuzden MUTLAK FPS gercek telefonu temsil ETMEZ; anlamli
 * olan ayni kosullarda alinan karsilastirmali degerlerdir: isci sayisi
 * artarken kare hizi duzgun mu kaliyor?
 */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const URL = process.argv[2] ?? 'http://127.0.0.1:5191/';
const DPR = Number(process.argv[3] ?? 1);
const COUNTS = [0, 10, 30, 60, 120];
const SAMPLE_MS = 1800;

function measureFps(page, ms) {
  return page.evaluate(
    (ms) =>
      new Promise((resolve) => {
        let frames = 0;
        const t0 = performance.now();
        const loop = () => {
          frames += 1;
          if (performance.now() - t0 < ms) requestAnimationFrame(loop);
          else resolve(Math.round(frames / ((performance.now() - t0) / 1000)));
        };
        requestAnimationFrame(loop);
      }),
    ms,
  );
}

const browser = await chromium.launch();
const rows = [];

for (const count of COUNTS) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: DPR,
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'load' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(1800);

  const setup = await page.evaluate((n) => {
    const w = window.game.scene.getScene('CityScene').registry.get('world');
    for (const k of ['wood', 'stone', 'food', 'gold']) w.state.setResource(k, 1e6);

    /*
     * Sehir her olcumde AYNIDIR; yalnizca isci sayisi degisir. Aksi halde
     * bina sayisi degiskeni olcume karisir ve "0 isci" satiri bos bir
     * haritayla karsilastirilmis olurdu.
     */
    for (const type of ['lumber_camp', 'quarry', 'farm', 'market', 'town_hall', 'house']) {
      for (const t of w.state.grid.allTiles()) {
        if (w.buildings.place(type, t.gx, t.gy).ok) break;
      }
    }
    for (let i = 0; i < 400; i += 1) w.simulation.advance(1);

    w.state.setPopulation(n, 0);
    w.workforce.reconcile();

    // Kapasiteyi doldur: bir kismi YOLDA kalir (en pahali hal - hareket +
    // yumusatma), geri kalani meydanda bosta bekler.
    for (const u of [...w.state.buildings.keys()]) {
      while (w.workforce.assign(u).ok) { /* kapasite dolana kadar */ }
    }
    return {
      workers: w.state.workers.length,
      snap: w.workforce.snapshot,
      paths: w.workforce.pathQueryCount,
    };
  }, count);

  await page.waitForTimeout(300);
  const pathsBefore = await page.evaluate(() => {
    const w = window.game.scene.getScene('CityScene').registry.get('world');
    return w.workforce.pathQueryCount;
  });
  const fps = await measureFps(page, SAMPLE_MS);
  // Olcum penceresinde KAC rota hesaplandi? Kare basina hesap yapilmadigi
  // iddiasinin olculebilir karsiligi budur.
  const pathsDuring = await page.evaluate((before) => {
    const w = window.game.scene.getScene('CityScene').registry.get('world');
    return w.workforce.pathQueryCount - before;
  }, pathsBefore);

  rows.push({
    isci: setup.workers,
    yolda: setup.snap.moving,
    calisan: setup.snap.working,
    bosta: setup.snap.idle,
    fps,
    'rota/olcum': pathsDuring,
  });
  await ctx.close();
}

console.table(rows);
console.log(`DPR=${DPR}  (GPU yok - mutlak deger degil, EGILIM okunur)`);
await browser.close();
