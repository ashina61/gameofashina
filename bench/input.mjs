/**
 * Dokunmatik girdi regresyon kontrolu.
 *
 * Kullanim:  node bench/input.mjs [url]
 * Varsayilan url: http://127.0.0.1:5173/
 *
 * Bu uc davranis bir kez bozuldu ve oyunu elle oynanmaz hale getirdi; burada
 * kilitleniyorlar:
 *
 *  1. BUTON HIT ALANI - TouchButton'a merkezlenmis bir hit dikdortgeni
 *     verilmisti. Phaser isabet testinden once display origin'i ekledigi icin
 *     kaydirma iki kez uygulaniyor, gercek dokunma alani butonun sol ustune
 *     kayiyordu: butonun sag yarisi olu bolgeydi.
 *  2. DOKUNMA SURESI - tap icin 400ms ust sinir vardi; parmagini daha uzun
 *     tutan oyuncunun dokunusu sessizce atiliyordu.
 *  3. PARMAK KAYMASI - kaydirma esigi 12px ile Android'in kendi toleransinin
 *     altindaydi; dogal titreme dokunmayi iptal ediyordu.
 *
 * Bu dosya bir birim testi degil cunku ucu de Phaser'in girdi katmanina
 * baglidir ve yalnizca gercek bir tarayicida gozlemlenebilir.
 */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const URL = process.argv[2] ?? 'http://127.0.0.1:5173/';
const VIEWPORT = { width: 390, height: 844 };

const browser = await chromium.launch();
const results = [];

/** Her olcum temiz bir baglamda yapilir; onceki dokunus durumu tasinmaz. */
async function fresh() {
  const ctx = await browser.newContext({ viewport: VIEWPORT, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'load' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(2200);
  return { ctx, page };
}

/** INSA ET butonunun EKRANDAKI gercek sinirlari. */
const buildButtonBounds = () => {
  const ui = window.game.scene.getScene('UIScene');
  let btn = null;
  const walk = (o) => {
    const label = o.list?.find((c) => c.type === 'Text')?.text;
    if (o.constructor?.name === 'TouchButton' && label?.includes('INSA')) btn = o;
    if (o.list) o.list.forEach(walk);
  };
  ui.children.each(walk);
  const r = btn.getBounds();
  return { x: r.x, y: r.y, w: r.width, h: r.height };
};

const menuOpen = (page) =>
  page.evaluate(() => window.game.scene.getScene('UIScene').buildMenu?.isOpen === true);

function record(group, label, actual, expected) {
  results.push({ grup: group, olcum: label, sonuc: actual, beklenen: expected, gecti: actual === expected });
}

// 1. Butonun HER noktasi basilabilir olmali.
for (const [fx, fy, label] of [
  [0.5, 0.5, 'merkez'],
  [0.1, 0.1, 'sol ust'],
  [0.9, 0.1, 'sag ust'],
  [0.9, 0.9, 'sag alt'],
  [0.1, 0.9, 'sol alt'],
]) {
  const { ctx, page } = await fresh();
  const r = await page.evaluate(buildButtonBounds);
  await page.mouse.move(r.x + r.w * fx, r.y + r.h * fy);
  await page.mouse.down();
  await page.waitForTimeout(120);
  await page.mouse.up();
  await page.waitForTimeout(350);
  record('buton alani', label, await menuOpen(page), true);
  await ctx.close();
}

// 2. Basili tutma suresi dokunmayi iptal ETMEMELI.
for (const hold of [80, 300, 450, 800, 1500]) {
  const { ctx, page } = await fresh();
  await page.evaluate(() => {
    const world = window.game.scene.getScene('CityScene').registry.get('world');
    world.state.setResource('wood', 9999);
    world.state.setResource('stone', 9999);
    world.bus.emit('placement:start', 'house');
  });
  await page.waitForTimeout(300);
  const count = () =>
    page.evaluate(
      () => window.game.scene.getScene('CityScene').registry.get('world').state.buildings.size,
    );
  const before = await count();
  await page.mouse.move(195, 420);
  await page.mouse.down();
  await page.waitForTimeout(hold);
  await page.mouse.up();
  await page.waitForTimeout(400);
  record('basili tutma', `${hold}ms`, (await count()) > before, true);
  await ctx.close();
}

// 3. Esigin ALTINDAKI kayma dokunma sayilmali, USTUNDEKI kaydirma.
for (const [jitter, expected] of [
  [0, true],
  [10, true],
  [18, true],
  [40, false],
]) {
  const { ctx, page } = await fresh();
  await page.evaluate(() => {
    const world = window.game.scene.getScene('CityScene').registry.get('world');
    world.state.setResource('wood', 9999);
    world.state.setResource('stone', 9999);
    world.bus.emit('placement:start', 'house');
  });
  await page.waitForTimeout(300);
  const count = () =>
    page.evaluate(
      () => window.game.scene.getScene('CityScene').registry.get('world').state.buildings.size,
    );
  const before = await count();
  await page.mouse.move(195, 420);
  await page.mouse.down();
  await page.waitForTimeout(60);
  await page.mouse.move(195 + jitter, 420);
  await page.waitForTimeout(60);
  await page.mouse.up();
  await page.waitForTimeout(400);
  record('parmak kaymasi', `${jitter}px`, (await count()) > before, expected);
  await ctx.close();
}

await browser.close();
console.table(results);

const failed = results.filter((r) => !r.gecti);
if (failed.length > 0) {
  console.error(`\n${failed.length} olcum beklenenden farkli.`);
  process.exit(1);
}
console.log('\nTum girdi olcumleri beklendigi gibi.');
