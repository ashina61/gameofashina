/**
 * Sistem cubuklarinin (status bar, navigasyon cubugu, centik) kapladigi
 * kenar paylarini okur.
 *
 * Oyun arayuzu Phaser tuvali icine cizildigi icin CSS'teki
 * env(safe-area-inset-*) degerleri dogrudan ise yaramaz; bu degerlerin
 * sayiya cevrilip yerlesim hesabina verilmesi gerekir. Bunun icin
 * index.html'de gorunmez bir olcum ogesi bulunur: env() degerleri onun
 * padding'ine yazilir, buradan piksel olarak geri okunur.
 *
 * Tarayicida ve cihazda cubuk yoksa tum degerler 0'dir ve yerlesim
 * bugunku haliyle birebir ayni kalir.
 */

export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

const ZERO: SafeAreaInsets = { top: 0, right: 0, bottom: 0, left: 0 };

/** Olcum ogesinin kimligi; index.html ile ayni olmali. */
const PROBE_ID = 'safe-area-probe';

let probe: HTMLElement | null = null;

/** Olcum ogesini bulur (bir kez arar, sonra onbellekten verir). */
function getProbe(): HTMLElement | null {
  if (probe?.isConnected) return probe;
  probe = typeof document !== 'undefined' ? document.getElementById(PROBE_ID) : null;
  return probe;
}

/** "12px" gibi bir CSS uzunlugunu sayiya cevirir; cozulemezse 0. */
function toPixels(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 0;
}

/**
 * Gecerli kenar paylarini okur.
 *
 * Her cagrida getComputedStyle calistirir; bu yuzden yalnizca yerlesim
 * degistiginde (acilis, resize, yon degisimi) cagrilmalidir - kare basina
 * DEGIL. Olcum ogesi yoksa (ornegin testte ciplak DOM) sifir doner.
 */
export function readSafeAreaInsets(): SafeAreaInsets {
  const element = getProbe();
  if (!element || typeof window === 'undefined') return { ...ZERO };

  const style = window.getComputedStyle(element);
  return {
    top: toPixels(style.paddingTop),
    right: toPixels(style.paddingRight),
    bottom: toPixels(style.paddingBottom),
    left: toPixels(style.paddingLeft),
  };
}

/** Iki kenar payi olcumunun ayni olup olmadigini soyler. */
export function insetsEqual(a: SafeAreaInsets, b: SafeAreaInsets): boolean {
  return a.top === b.top && a.right === b.right && a.bottom === b.bottom && a.left === b.left;
}

/** Tum degerleri sifir olan kenar payi. */
export function zeroInsets(): SafeAreaInsets {
  return { ...ZERO };
}

/**
 * Kenar paylarinin degisebilecegi anlarda haber verir.
 *
 * Kenar paylari ekran BOYUTU degismeden de degisebilir (yon degisimi,
 * sistem cubugunun gizlenip gorunmesi). Bu yuzden yalnizca oyun motorunun
 * yeniden boyutlandirma olayina guvenmek yetmez; pencere olaylari dogrudan
 * dinlenir.
 *
 * Olay guduludur - kare basina olcum YAPMAZ. Aboneligi birakan bir fonksiyon
 * dondurur.
 */
export function onSafeAreaChange(callback: (insets: SafeAreaInsets) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  let last = readSafeAreaInsets();

  const check = (): void => {
    const next = readSafeAreaInsets();
    if (insetsEqual(next, last)) return;
    last = next;
    callback(next);
  };

  window.addEventListener('resize', check);
  window.addEventListener('orientationchange', check);
  // Gorsel goruntu alani (klavye, adres cubugu) degisimleri de payi etkiler.
  window.visualViewport?.addEventListener('resize', check);

  return () => {
    window.removeEventListener('resize', check);
    window.removeEventListener('orientationchange', check);
    window.visualViewport?.removeEventListener('resize', check);
  };
}
