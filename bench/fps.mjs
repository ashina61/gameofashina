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
    return { made, activeTasks: world.construction.activeCount };
  }, count);

  await page.waitForTimeout(250);
  const building = await measureFps(page, SAMPLE_MS);

  // Tum gorevleri bitir, bosta olc.
  await page.evaluate(() =>
    window.game.scene.getScene('CityScene').registry.get('world').simulation.advance(200),
  );
  await page.waitForTimeout(250);
  const idle = await measureFps(page, SAMPLE_MS);

  const after = await page.evaluate(
    () => window.game.scene.getScene('CityScene').registry.get('world').construction.activeCount,
  );

  rows.push({
    bina: count,
    kurulan: placed.made,
    aktifGorev: placed.activeTasks,
    fpsInsaatta: building,
    fpsBosta: idle,
    kalanGorev: after,
  });
  await ctx.close();
}

await browser.close();
console.table(rows);
