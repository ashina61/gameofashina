/**
 * Insaat sirasindaki render maliyetini olcen izole kiyaslama.
 *
 * Kullanim:  node bench/fps.mjs [url]
 * Varsayilan url: http://127.0.0.1:5173/
 *
 * Ortamda GPU yoksa (baslik siz CI) mutlak FPS gercek cihazdan dusuk cikar;
 * anlamli olan ayni kosullarda alinan karsilastirmali degerlerdir. Bu yuzden
 * her olcum temiz bir tarayici baglaminda yapilir.
 */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const URL = process.argv[2] ?? 'http://127.0.0.1:5173/';
/** Cizim piksel yogunlugu; arka tampon maliyetini bununla karsilastiririz. */
const DPR = Number(process.argv[3] ?? 1);
const COUNTS = [0, 30, 120];
const SAMPLE_MS = 1800;

/** Verilen surede olculen ortalama kare hizi. */
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

  // Binalari kur: hepsi ayni anda insaat halinde olur.
  const placed = await page.evaluate((n) => {
    const world = window.game.scene.getScene('CityScene').registry.get('world');
    let made = 0;
    for (const tile of world.state.grid.allTiles()) {
      if (made >= n) break;
      world.state.setResource('wood', 1e6);
      world.state.setResource('stone', 1e6);
      if (world.buildings.place('house', tile.gx, tile.gy).ok) made += 1;
    }
    return {
      made,
      activeTasks: world.construction.activeCount,
      queuedTasks: world.construction.queuedCount,
    };
  }, count);

  await page.waitForTimeout(250);
  const building = await measureFps(page, SAMPLE_MS);

  // Tum gorevleri bitir. Kuyruk sinirinin varliginda tek bir advance yetmez:
  // hicbir gorev kalmayana kadar ilerletilir, aksi halde "bosta" olcumu
  // hala calisan gorevlerle alinir ve karsilastirma yaniltici olur.
  await page.evaluate(() => {
    const world = window.game.scene.getScene('CityScene').registry.get('world');
    for (let i = 0; i < 200; i += 1) {
      if (world.construction.activeCount === 0 && world.construction.queuedCount === 0) break;
      world.simulation.advance(60);
    }
  });
  await page.waitForTimeout(250);
  const idle = await measureFps(page, SAMPLE_MS);

  const after = await page.evaluate(() => {
    const world = window.game.scene.getScene('CityScene').registry.get('world');
    return { aktif: world.construction.activeCount, kuyruk: world.construction.queuedCount };
  });

  rows.push({
    bina: count,
    kurulan: placed.made,
    aktifGorev: placed.activeTasks,
    kuyruk: placed.queuedTasks,
    fpsInsaatta: building,
    fpsBosta: idle,
    kalan: `${after.aktif}+${after.kuyruk}`,
  });
  await ctx.close();
}

await browser.close();
console.table(rows);
