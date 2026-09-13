import Phaser from 'phaser';

/**
 * AI ile uretilmis dokulari yukler.
 *
 * DORT GORSEL, DORT IS
 *   tex-water      - deniz; ada ve dunya haritasinin arka plani
 *   tex-island     - kara; ada zeminini ve dunya dugumlerini boyar
 *   tex-parchment  - arayuz panellerinin zemini
 *   tex-hero       - yukleme ekrani ve baslangic karti
 *
 * NEDEN BU KADAR AZ
 * Binalar, birlikler ve gemiler prosedural cizilir (bkz. SpriteFactory):
 * katalogdaki `tint` ve seviye verisinden turedikleri icin her bina
 * seviyesi ayri bir dosya gerektirmez ve her DPR'de keskin kalir. AI
 * dokulari yalnizca GENIS YUZETLERE (su, kara, parcomen) uygulanir;
 * orada tek gorsel cok alan kaplar ve olcekleme sorunu yaratmaz.
 *
 * YUKLEME HATASI
 * Bir doku yuklenemezse oyun COKMEZ: sahneler `textures.exists()` ile
 * kontrol eder ve prosedural yedeklere duser. Ag erisimi olmayan bir
 * cihazda da oyun calisir.
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload(): void {
    this.load.image('tex-water', 'assets/textures/water.png');
    this.load.image('tex-island', 'assets/textures/island.png');
    this.load.image('tex-parchment', 'assets/ui/parchment.png');
    this.load.image('tex-hero', 'assets/ui/hero.png');

    // Yukleme ilerlemesini HTML acilis ekrani gosterir.
    const bar = document.querySelector<HTMLDivElement>('#boot-splash .bar');
    this.load.on(Phaser.Loader.Events.PROGRESS, (value: number) => {
      if (bar) bar.style.width = `${Math.round(value * 100)}%`;
    });
  }

  create(): void {
    // Acilis ekrani artik gereksiz; soluklastirilip kaldirilir.
    const splash = document.getElementById('boot-splash');
    splash?.classList.add('hidden');
    window.setTimeout(() => splash?.remove(), 400);

    // Varsayilan gorunum: sehir. Arayuzdeki alt gezinme diger sahneleri acar.
    this.scene.start('CityScene');
  }
}
