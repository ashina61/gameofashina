import type Phaser from 'phaser';

/** Arayuzun ortak renk, yazi ve olcu degerleri. Tek kaynaktan tema yonetimi. */

export const UIColors = {
  panel: 0xeddcb8,
  panelBorder: 0xc9a227,
  accent: 0xc9a227,
  danger: 0xb03a2e,
  success: 0x3f7d3a,
  info: 0x2f6a8c,
  warn: 0xc9821f,
} as const;

/**
 * PANEL UZERINDEKI yazi renkleri.
 *
 * Zemin acik parsomen oldugu icin yazi KOYU KAHVE'dir. Onceki koyu deri
 * arayuzunde krem yaziydi; renkleri cevirmeden zemini cevirmek butun
 * metni okunmaz birakirdi.
 */
export const UIText = {
  primary: '#4a3520',
  muted: '#7d6446',
  accent: '#8a5f1c',
  danger: '#a8342a',
  success: '#3f7d3a',
} as const;

/** KOYU zemin (alt gezinme cubugu, ahsap plaka) uzerindeki yazi renkleri. */
export const UITextOnDark = {
  primary: '#f2e3c4',
  muted: '#b9a077',
  accent: '#f0d98c',
} as const;

/** Dokunma hedeflerinin asgari boyutu - mobilde parmakla isabet icin. */
export const TOUCH_TARGET = 48;

/** Panel ve kenar bosluklari. */
export const UISpacing = {
  edge: 12,
  gap: 8,
  panelPadding: 14,
} as const;

/**
 * Basliklar icin SERIF yazi.
 *
 * Referans tasarim basliklarda Cinzel istiyor; yazi tipi oyunun HTML
 * kabugunda zaten yukleniyor (Google Fonts). Yuklenmemis olma ihtimaline
 * karsi yedek zinciri klasik serif yuzlerle devam eder, yani en kotu
 * durumda bile baslik govde yazisindan AYRISIR - tek bir yazi tipine
 * bagimli kalmaz.
 */
export function titleStyle(
  size: number,
  color: string = UIText.primary,
): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: '"Cinzel", "Palatino Linotype", Palatino, Georgia, serif',
    fontSize: `${size}px`,
    color,
    fontStyle: 'bold',
  };
}

/** Ortak yazi stili uretici. */
export function labelStyle(
  size: number,
  color: string = UIText.primary,
  bold = false,
): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
    fontSize: `${size}px`,
    color,
    fontStyle: bold ? 'bold' : 'normal',
  };
}

/**
 * Bir yaziyi verilen genislige SIGDIRIR; sigmiyorsa kisaltir.
 *
 * NEDEN SARMA DEGIL KISALTMA
 * Arayuzdeki yuzeylerin cogu SABIT yukseklikte: bildirim karti iki
 * satirlik, oyuncu kartinin cubugu tek satirlik, arastirma satiri tek
 * satirlik. Boyle bir yuzeyde sarma, metni komsu satirin uzerine
 * bindirir - bildirim kartinda tam olarak bu oldu: "Insaat tamamlandi!"
 * iki satira bolununce alt satirdaki bina adinin uzerine bindi.
 *
 * Kisaltma ise en kotu durumda BILGI KAYBEDER ama duzeni hic bozmaz.
 * Sabit yukseklikli bir kutuda dogru takas budur.
 *
 * Ayni mantik uc ayri yerde tekrar yazilmisti; kural tek yerde durmali.
 */
export function fitText(target: Phaser.GameObjects.Text, full: string, budget: number): void {
  target.setText(full);
  if (budget <= 0 || target.width <= budget) return;

  for (let cut = full.length - 1; cut > 0; cut -= 1) {
    target.setText(`${full.slice(0, cut)}...`);
    if (target.width <= budget) return;
  }
  target.setText('');
}
