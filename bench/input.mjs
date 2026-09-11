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
 *  4. KARO ISABETI - worldToGrid en yakina degil ASAGI yuvarliyordu.
 *     gridToWorld karonun MERKEZINI dondurdugu icin tam sayi izgara
 *     koordinati merkeze oturur; asagi yuvarlamak secim bolgesini yarim
 *     karo kaydiriyordu ve bina dokunulan karonun caprazina kuruluyordu.
 *
 * Bu dosya bir birim testi degil cunku ucu de Phaser'in girdi katmanina
 * baglidir ve yalnizca gercek bir tarayicida gozlemlenebilir.
 */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const URL = process.argv[2] ?? 'http://127.0.0.1:5173/';
/**
 * Cizim piksel yogunlugu. Girdi ve yerlesim davranisi DPR'den ETKILENMEMELI;
 * ayni betigi farkli yogunluklarda kosturmak bunu dogrular.
 */
const DPR = Number(process.argv[3] ?? 1);
const VIEWPORT = { width: 390, height: 844 };

const browser = await chromium.launch();
const results = [];

/** Her olcum temiz bir baglamda yapilir; onceki dokunus durumu tasinmaz. */
async function fresh() {
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: DPR, isMobile: true, hasTouch: true });
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


/**
 * Bos bir KONUT ALANININ ekran (CSS piksel) noktasi.
 *
 * Sprint 12'de sehir yapi alanlarina bolundu ve izgara merkezi sehir
 * merkezine ayrildi. Ekranin ortasina dokunup "ev kuruldu mu?" diye
 * olcmek artik yerlestirme KURALINI sinar, dokunma tepkiselligini degil.
 *
 * Kamerayi alana ODAKLAMAK ise ise yaramiyor: harita kamera goruntusunden
 * kucuk oldugu icin kaydirma sinirlara kilitli (olculdu: centerOn sonrasi
 * ekran merkezi hala 8,8 karosunu gosteriyordu). Bu yuzden alanin ekrandaki
 * yeri dogrudan hesaplanir.
 */
async function housePlotPoint(page) {
  return page.evaluate(() => {
    const cs = window.game.scene.getScene('CityScene');
    const w = cs.registry.get('world');
    const plot = w.buildings.availablePlots('house')[0];
    if (!plot) return null;
    const cam = cs.cameras.main;
    const view = cam.worldView;
    const worldX = (plot.gx - plot.gy) * 64;
    const worldY = (plot.gx + plot.gy) * 32;
    // Cihaz pikseli -> CSS pikseli (fare CSS pikseliyle calisir).
    const dpr = window.devicePixelRatio || 1;
    return {
      x: ((worldX - view.x) / view.width) * (cam.width / dpr),
      y: ((worldY - view.y) / view.height) * (cam.height / dpr),
      gx: plot.gx,
      gy: plot.gy,
    };
  });
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
  const target = await housePlotPoint(page);
  await page.waitForTimeout(300);
  const count = () =>
    page.evaluate(
      () => window.game.scene.getScene('CityScene').registry.get('world').state.buildings.size,
    );
  const before = await count();
  await page.mouse.move(target.x, target.y);
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
  const target = await housePlotPoint(page);
  await page.waitForTimeout(300);
  const count = () =>
    page.evaluate(
      () => window.game.scene.getScene('CityScene').registry.get('world').state.buildings.size,
    );
  const before = await count();
  await page.mouse.move(target.x, target.y);
  await page.mouse.down();
  await page.waitForTimeout(60);
  await page.mouse.move(target.x + jitter, target.y);
  await page.waitForTimeout(60);
  await page.mouse.up();
  await page.waitForTimeout(400);
  record('parmak kaymasi', `${jitter}px`, (await count()) > before, expected);
  await ctx.close();
}

// 4. Bina, DOKUNULAN karoya kurulmali.
//
// Hedef karo, dokunulacak sayfanin KENDI izgarasindan secilir. Zemin her
// yeni oyunda prosedurel uretildigi icin bir sayfada dogrulayip digerinde
// dokunmak kararsiz olcum verir: karo orada su veya kaya cikinca
// yerlestirme hakli olarak reddedilir ve olcum var olmayan bir hatayi
// bildirir. Izgara kenarindaki karolar da atlanir; merkezin biraz
// yukarisina dokunmak orada izgaranin disina dusebilir.
for (const index of [0, 1, 2, 3, 4]) {
  const { ctx, page } = await fresh();

  /*
   * Hedef karo hem KURULABILIR hem de EKRANDA olmali.
   *
   * Izgara gorunen alandan cok daha genistir (14 karo x 128 piksel).
   * Yalnizca kurulabilirlige bakmak, kameranin disinda kalan bir karoyu
   * secebiliyordu; oraya dokunmak hicbir sey yapmaz ve olcum var olmayan
   * bir hatayi bildirirdi. Ekran suzgeci ayrica arayuzun kapladigi ust ve
   * alt seritleri de disarida birakir.
   */
  const target = await page.evaluate((index) => {
    const scene = window.game.scene.getScene('CityScene');
    const world = scene.registry.get('world');
    const cam = scene.cameras.main;
    const dpr = window.game.registry.get('resolution')?.dpr ?? 1;
    const viewW = window.innerWidth;
    const viewH = window.innerHeight;

    world.state.setResource('wood', 9999);
    world.state.setResource('stone', 9999);

    const origin = cam.getWorldPoint(0, 0);
    const alongX = cam.getWorldPoint(100, 0);
    const alongY = cam.getWorldPoint(0, 100);
    const scaleX = (alongX.x - origin.x) / 100;
    const scaleY = (alongY.y - origin.y) / 100;

    const cells = [];
    for (const tile of world.state.grid.allTiles()) {
      if (!world.buildings.validate('house', tile.gx, tile.gy).ok) continue;
      const w = { x: (tile.gx - tile.gy) * 64, y: (tile.gx + tile.gy) * 32 };
      const sx = (w.x - origin.x) / scaleX / dpr;
      const sy = (w.y - origin.y) / scaleY / dpr;
      // Arayuz seritlerinden uzak, ekran icinde kalan karolar.
      if (sx < 40 || sx > viewW - 40) continue;
      if (sy < 90 || sy > viewH - 130) continue;
      cells.push({ gx: tile.gx, gy: tile.gy, sx, sy });
    }
    if (cells.length === 0) return null;
    return cells[Math.floor((cells.length - 1) * (index / 4))];
  }, index);

  if (!target) {
    await ctx.close();
    continue;
  }

  await page.evaluate(() => {
    const world = window.game.scene.getScene('CityScene').registry.get('world');
    world.bus.emit('placement:start', 'house');
  });
  await page.waitForTimeout(300);

  // Merkezin biraz YUKARISI: asagi yuvarlama hatasinin en belirgin oldugu yer.
  await page.mouse.move(target.sx, target.sy - 6);
  await page.mouse.down();
  await page.waitForTimeout(150);
  await page.mouse.up();
  await page.waitForTimeout(500);

  const placed = await page.evaluate(() => {
    const world = window.game.scene.getScene('CityScene').registry.get('world');
    const building = [...world.state.buildings.values()][0];
    return building ? `${building.gx},${building.gy}` : 'kurulmadi';
  });
  record('karo isabeti', `${target.gx},${target.gy}`, placed, `${target.gx},${target.gy}`);
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
