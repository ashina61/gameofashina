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

    /*
     * HUD PARCALARI.
     *
     * Sprint 18b'de tam genislikteki ust cubuk kaldirildi ve yerine
     * referans duzenin dagitilmis parcalari geldi. Olcum de o parcalari
     * okumali: eski surum `ui.resourceBar` ve `ui.sideButtons` ariyordu ve
     * artik var olmayan alanlara baktigi icin cokuyordu. Her parca kendi
     * `bounds()` dikdortgenini bildirir - ekranda blokladigi alanla AYNI
     * dikdortgen, yani olcum arayuzun kendi gercegini okur.
     */
    const parts = [
      ['oyuncu karti', ui.playerCard],
      ['gorev karti', ui.questCard],
      ['muttefikler', ui.allyStrip],
      ['sol ray', ui.leftRail],
      ['sag ray', ui.rightRail],
      ['mini harita', ui.miniMap],
      ['insa dugmesi', ui.buildButton],
    ];
    /*
     * GORUNMEYEN parca olcume girmez.
     *
     * Arayuz bazi parcalari duruma gore gizliyor (alt sayfa acikken
     * raylar, dar ekranda muttefik seridi). Gizli bir parca ekranda yer
     * kaplamaz; onu cakisma saymak gercek olmayan bir hata uretir.
     */
    const partRects = parts
      .filter(([, part]) => part.visible)
      .map(([name, part]) => {
        const b = part.bounds();
        return { name, left: b.x, right: b.x + b.width, top: b.y, bottom: b.y + b.height };
      });
    for (const [key, pill] of ui.pills) {
      if (!pill.visible) continue;
      const b = pill.bounds();
      partRects.push({
        name: `kapsul:${key}`,
        left: b.x,
        right: b.x + b.width,
        top: b.y,
        bottom: b.y + b.height,
      });
    }

    const nav = ui.nav;
    const panel = ui.infoPanel;
    const navCheck = collide(nav);
    const panelCheck = collide(panel);

    const navRect = { left: 0, right: logical.w, top: nav.y, bottom: nav.y + 66 };
    const panelRect = { left: 0, right: logical.w, top: panel.y, bottom: panel.y + 212 };

    // Her parca ekranin icinde mi?
    const outside = partRects.filter(
      (r) => r.left < -1 || r.right > logical.w + 1 || r.top < -1 || r.bottom > logical.h + 1,
    );

    // Parcalar birbirine ya da alt gezinme cubuguna biniyor mu?
    const partHits = [];
    for (let i = 0; i < partRects.length; i += 1) {
      for (let j = i + 1; j < partRects.length; j += 1) {
        if (overlaps(partRects[i], partRects[j])) {
          partHits.push(`${partRects[i].name} | ${partRects[j].name}`);
        }
      }
      if (overlaps(partRects[i], navRect)) partHits.push(`${partRects[i].name} | gezinme`);
    }

    // Parcalarin ICINDEKI yazilar kendi cercevesini asiyor mu?
    const textOverflow = [];
    for (const [name, part] of parts) {
      if (!part.visible) continue;
      const b = part.bounds();
      for (const obj of part.list) {
        if (obj.type !== 'Text' || !obj.visible || !obj.text) continue;
        const t = inside(part, obj);
        if (t.left < b.x - 1 || t.right > b.x + b.width + 1) {
          textOverflow.push(`${name}: ${obj.text}`);
        }
      }
    }

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
      partsOutside: outside.map((r) => r.name),
      partHits,
      textOverflow,
      // Alt gezinme cubugu
      navTabs: nav.list.filter((o) => o.type === 'Text').length,
      navInside: navCheck.items.every((t) => t.left >= -1 && t.right <= logical.w + 1),
      navHits: navCheck.hits,
      navBottom: navRect.bottom,
      tabWidth: nav.tabWidth(),
      // Bilgi paneli
      panelInside: panelRect.bottom <= navRect.top + 1,
      panelHits: panelCheck.hits,
      panelTextInside: panelCheck.items.every((t) => t.right <= logical.w + 1),
        // Sehir gorunurlugu
      hallOnScreen:
        hallScreen.x > 0 && hallScreen.x < logical.w && hallScreen.y > 0 && hallScreen.y < panelRect.top,
      // Yatay tasma
      overflow: document.documentElement.scrollWidth > window.innerWidth,
    };
  });

  /*
   * SEHIR PENCERESI: hicbir HUD parcasinin dokunmadigi EN BUYUK dikdortgen.
   *
   * "Arayuz ekranin yuzde kacini kapliyor" yanilticiydi: kenara yaslanmis
   * 30 piksellik bir serit ile sehrin ORTASINDA duran 30 piksellik bir kart
   * ayni yuzdeyi verir ama oyuncunun gordugu sehir cok farklidir.
   * Belirleyici olan KESINTISIZ alandir.
   *
   * Olcum PANEL KAPALIYKEN yapilir: oyuncunun zamaninin cogunu gecirdigi
   * durum budur. Acik bir alt sayfa sehri bilerek ortar ve o durumu
   * kapiya koymak, panelin kendisini hata gibi gosterirdi.
   */
  const cityWindow = await page.evaluate(() => {
    const ui = window.game.scene.getScene('UIScene');
    // Secimi olay veriyolundan kaldir: alt sayfa kapanir.
    window.game.scene.getScene('CityScene').registry.get('world').bus.emit('tile:selected', null);
    const W = Math.round(ui.logicalWidth());
    const H = Math.round(ui.logicalHeight());
    const mask = new Uint8Array(W * H);

    const block = (r) => {
      if (!r) return;
      for (let y = Math.max(0, Math.round(r.y)); y < Math.min(H, Math.round(r.y + r.height)); y += 1) {
        for (let x = Math.max(0, Math.round(r.x)); x < Math.min(W, Math.round(r.x + r.width)); x += 1) {
          mask[y * W + x] = 1;
        }
      }
    };
    for (const key of Object.keys(ui)) {
      const part = ui[key];
      if (!part || typeof part !== 'object' || part.visible === false) continue;
      if (typeof part.bounds === 'function') block(part.bounds());
    }
    for (const pill of ui.pills.values()) block(pill.bounds());
    block({ x: 0, y: ui.nav.y, width: W, height: H - ui.nav.y });

    const heights = new Int32Array(W);
    let best = 0;
    let bestW = 0;
    let bestH = 0;
    for (let y = 0; y < H; y += 1) {
      for (let x = 0; x < W; x += 1) heights[x] = mask[y * W + x] ? 0 : heights[x] + 1;
      const stack = [];
      for (let x = 0; x <= W; x += 1) {
        const cur = x === W ? 0 : heights[x];
        while (stack.length > 0 && heights[stack[stack.length - 1]] >= cur) {
          const top = stack.pop();
          const h = heights[top];
          const left = stack.length > 0 ? stack[stack.length - 1] + 1 : 0;
          const w = x - left;
          if (h * w > best) { best = h * w; bestW = w; bestH = h; }
        }
        stack.push(x);
      }
    }
    return { w: bestW, h: bestH, pct: Math.round((best / (W * H)) * 100) };
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
    'hud icerde': probe.partsOutside.length === 0 ? 'OK' : `TASTI ${probe.partsOutside[0]}`,
    'hud cakisma': probe.partHits.length === 0 ? 'OK' : `CAKISMA ${probe.partHits[0]}`,
    'hud metin': probe.textOverflow.length === 0 ? 'OK' : `TASTI ${probe.textOverflow[0]}`,
    'alt gezinme': probe.navTabs === 5 && probe.navInside && probe.navHits.length === 0 ? 'OK' : 'SORUN',
    'sekme genisligi': Math.round(probe.tabWidth),
    'gezinme alani': probe.navBottom <= probe.logical.h ? 'OK' : 'TASTI',
    'bilgi paneli':
      probe.panelInside && probe.panelTextInside && probe.panelHits.length === 0
        ? 'OK'
        : `SORUN ${probe.panelHits[0] ?? 'tasti'}`,
    'merkez gorunur': probe.hallOnScreen ? 'OK' : 'GORUNMUYOR',
    'sehir penceresi': `${cityWindow.w}x${cityWindow.h}`,
    'pencere %': cityWindow.pct,
    'insa alanlari': plotProbe,
    'yatay tasma': probe.overflow ? 'VAR' : 'yok',
  });

  await ctx.close();
}

console.table(rows);
const ok = rows.every(
  (r) =>
    r['hud icerde'] === 'OK' &&
    r['hud cakisma'] === 'OK' &&
    r['hud metin'] === 'OK' &&
    r['alt gezinme'] === 'OK' &&
    r['sekme genisligi'] >= 48 &&
    r['gezinme alani'] === 'OK' &&
    r['bilgi paneli'] === 'OK' &&
    r['merkez gorunur'] === 'OK' &&
    /*
     * Kesintisiz sehir alani ekranin en az %40'i olmali.
     *
     * Olculdu: gorev karti acikken bant %40,6, kart kapaliyken %44,8.
     * Esik, kazanimi korur ama nefes payi birakir - amac sayiyi
     * kovalamak degil, ortaya YENI bir panel konmasini engellemektir.
     */
    r['pencere %'] >= 40 &&
    r['insa alanlari'] > 0 &&
    r['yatay tasma'] === 'yok',
);
console.log(`DPR=${DPR}  ${ok ? 'PASS' : 'FAIL'}  konsol/sayfa hatasi: ${errors.length === 0 ? 'YOK' : errors.slice(0, 3)}`);
await browser.close();
if (!ok || errors.length) process.exitCode = 1;
