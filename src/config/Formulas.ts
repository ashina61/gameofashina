/**
 * Ikariam'in maliyet ve insa suresi formulleri.
 *
 * Ikariam'da bir binanin her seviyesi icin ayri bir tablo YOKTUR; tek bir
 * kapali formül ve bina basina dort katsayi vardir:
 *
 *     deger(seviye) = A / B * C^seviye - D
 *
 * Ayni bicim hem insa suresi (saniye) hem de kaynak maliyeti icin
 * kullanilir; yalnizca katsayilar degisir. Katsayilar Ikariam wiki'sinin
 * "Buildings/Construction Time" ve "Building resources formula"
 * sayfalarindan alinmistir.
 *
 * NEDEN FORMUL, NEDEN TABLO DEGIL
 * Tablo tutmak 30 bina x 50 seviye = 1500 satir demekti ve her satir elle
 * yazildigi icin dengeyi degistirmek imkansizlasirdi. Formulde katsayiyi
 * degistirmek yeterlidir ve sonuc Ikariam'la birebir aynidir:
 *
 *   Depo seviye 1 odun = 1600/3 * 1.2^1 - 480 = 160   (Ikariam: 160)
 *   Depo seviye 2 odun = 1600/3 * 1.44   - 480 = 288   (Ikariam: 288)
 *   Hizar seviye 1 sure = 7200/1 * 1.1^1 - 7200 = 720 s (Ikariam: 12 dk)
 *
 * n0: Bazi kaynaklar yalnizca belli bir seviyeden SONRA istenir. Depo
 * 3. seviyede kristal istemeye baslar; 2. seviyede kristal maliyeti
 * sifirdir. n0 bu esiktir ve formülün kendisi degil, uygulanip
 * uygulanmayacagina karar verir.
 */

/** Bir kaynagin seviye bazli maliyetini tanimlayan katsayilar. */
export interface CostCoefficients {
  A: number;
  B: number;
  C: number;
  D: number;
  /**
   * Bu kaynagin istenmeye baslandigi seviye.
   * Seviye n0'in altindaysa maliyet 0'dir. Varsayilan 1.
   */
  n0?: number;
}

/** Ham formül: A/B * C^level - D. Negatif sonuc sifira cekilir. */
export function ikariamValue(c: CostCoefficients, level: number): number {
  const value = (c.A / c.B) * Math.pow(c.C, level) - c.D;
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * Verilen seviyenin maliyetini/suresini tam sayiya yuvarlar.
 *
 * Ikariam arayuzu kaynaklari tam sayi gosterir ve odeme de tam sayi
 * yapilir; 159.9 odun istemek oyuncunun deponun dolu olmasina ragmen
 * "yetmiyor" gormesine yol acar. Bu yuzden ASAGI yuvarlanir: oyuncu
 * formülün istediginden fazlasini asla odemez.
 */
export function ikariamCost(c: CostCoefficients, level: number): number {
  const n0 = c.n0 ?? 1;
  if (level < n0) return 0;
  return Math.floor(ikariamValue(c, level));
}

/**
 * Bir seviyeye KADAR harcanan toplam (kumulatif) deger.
 *
 * Ikariam arayuzunde "toplam insa suresi" bu bicimde gosterilir. Seviye 1
 * dahil, verilen seviye dahil araligi toplar.
 */
export function ikariamAccumulated(c: CostCoefficients, level: number): number {
  let total = 0;
  for (let l = 1; l <= level; l += 1) total += ikariamValue(c, l);
  return total;
}

/**
 * Azalan getirili bir katsayi egrisi.
 *
 * Ikariam'in indirim binalari ve sur bonusu gibi yerlerinde seviye basina
 * sabit artis yerine azalan artis kullanilir. Ornek: sur savunma bonusu
 * seviye basina +10% ama her seviyede bir oncekinin uzerine eklenir.
 */
export function linearBonus(perLevel: number, level: number): number {
  return perLevel * Math.max(0, level);
}
