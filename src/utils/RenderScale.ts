/**
 * Cizim cozunurlugu politikasi.
 *
 * SORUN
 * Phaser 3.90'da tuvalin arka tamponu (backing store) her zaman oyun
 * boyutuna esittir; bagimsiz bir "resolution" ayari YOKTUR (eski surumlerde
 * vardi, kaldirildi) ve ScaleManager.baseSize'i elle degistirmek tuvali
 * degistirmez - olculdu. Bu yuzden RESIZE kipinde tuval her zaman CSS
 * pikseli kadar cizilir: DPR 3 bir telefonda 390x844 cizilip donanimda
 * 1170x2532'ye gerilir ve goruntu bulaniklasir.
 *
 * COZUM
 * Oyun boyutu CIHAZ pikselinde tutulur, tuvalin CSS olcusu ise mantiksal
 * (CSS) piksel olarak sabitlenir. Boylece arka tampon gercek ekran
 * cozunurlugunde olur. Koordinat sistemini bozmamak icin kameralarin
 * yakinlastirmasi ayni oranda telafi edilir; oyun mantigi ve arayuz
 * olculeri MANTIKSAL pikselde kalir.
 *
 * Bu modul Phaser'dan bagimsizdir ve saf fonksiyonlardan olusur; politika
 * boylece tarayici olmadan test edilebilir.
 */

/**
 * Cizimde izin verilen en yuksek piksel yogunlugu.
 *
 * 2 secildi. DPR 3'e cikmak piksel sayisini DPR 2'ye gore 2.25 kat artirir;
 * kazanci ise cok daha kucuktur, cunku 2x ile 3x arasindaki fark cogu
 * telefonda ciplak gozle zor secilir. Mobil web oyunlarinda yaygin sinir
 * da budur.
 *
 * ONEMLI: Bu deger GERCEK CIHAZDA dogrulanmadi. Bu depo GPU'suz bir
 * ortamda (SwiftShader, yazilim rasterizasyonu) olculuyor; oradaki dolgu
 * maliyeti gercek bir mobil GPU'yu temsil etmez, dolayisiyla sinir
 * olcumden DEGIL, yaygin pratikten secildi. Gercek cihaz olcumu icin
 * README'ye bakiniz.
 */
export const MAX_RENDER_DPR = 2;

/** Tuvalin mantiksal ve cihaz piksel olculeri. */
export interface RenderTargets {
  /** Oyun mantigi ve arayuzun kullandigi olcu (CSS pikseli). */
  logicalWidth: number;
  logicalHeight: number;
  /** Tuvalin arka tamponu; gercekte cizilen piksel sayisi. */
  deviceWidth: number;
  deviceHeight: number;
  /** Uygulanan piksel yogunlugu. */
  dpr: number;
}

/**
 * Ham devicePixelRatio degerini guvenli bir araliga ceker.
 *
 * 1'in altina inilmez (kucultmek bulanikligi artirirdi) ve tanimsiz,
 * NaN veya sonsuz degerler 1 sayilir; bazi tarayicilar ve gomulu
 * WebView'lar bu alani doldurmaz.
 */
export function effectiveDpr(rawDpr: number, max: number = MAX_RENDER_DPR): number {
  if (!Number.isFinite(rawDpr) || rawDpr <= 0) return 1;
  // Infinity gecerli bir "sinir yok" istegidir; yalnizca NaN veya 1'in
  // altindaki bir tavan anlamsizdir ve guvenli tarafa (1) dusurulur.
  const ceiling = max >= 1 ? max : 1;
  return Math.min(Math.max(1, rawDpr), ceiling);
}

/**
 * Mantiksal olcuden cihaz piksel olcusunu hesaplar.
 *
 * Cihaz olculeri TAM SAYIYA yuvarlanir: kesirli bir arka tampon olcusu
 * tarayicida yeniden orneklemeye yol acar ve tam da onlemeye calistigimiz
 * bulanikligi geri getirir (Android'de 2.625 gibi kesirli DPR yaygindir).
 */
export function renderTargets(
  logicalWidth: number,
  logicalHeight: number,
  rawDpr: number,
  max: number = MAX_RENDER_DPR,
): RenderTargets {
  const width = Math.max(1, Math.floor(logicalWidth));
  const height = Math.max(1, Math.floor(logicalHeight));
  const dpr = effectiveDpr(rawDpr, max);

  return {
    logicalWidth: width,
    logicalHeight: height,
    deviceWidth: Math.round(width * dpr),
    deviceHeight: Math.round(height * dpr),
    dpr,
  };
}

/**
 * Cihaz pikselindeki bir olcuyu mantiksal piksele cevirir.
 * Girdi olaylari oyun boyutunda (cihaz pikseli) gelir; esikler ve arayuz
 * karsilastirmalari mantiksal pikselde yapilir.
 */
export function toLogical(deviceValue: number, dpr: number): number {
  return dpr > 0 ? deviceValue / dpr : deviceValue;
}
