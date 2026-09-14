import type Phaser from 'phaser';

/**
 * Yuklenen PNG'leri EKRANDA CIZILDIKLERI olcude yeniden pisirir.
 *
 * NEDEN VAR
 * Elle uretilen varliklar buyuk gelir - satin alinan izometrik paketler
 * genellikle 512 ya da 1024 piksel. Oyun onlari ayak izine gore kucultur
 * (1x1 bina 128 mantiksal piksel). Kucultme her karede yapilir ve pahalidir:
 *
 *   olculdu (120 bina, bos sehir, ayni oturum):
 *     512 px kaynak ->  7 FPS
 *     256 px kaynak -> 16 FPS
 *     128 px kaynak -> 21 FPS  (prosedurel taban cizgisi 25)
 *
 * Yani sorun varligin KENDISI degil, her karede yeniden orneklenmesiydi.
 * Doku BIR KEZ hedef olcude pisirilince maliyet kayboluyor ve dosya yuksek
 * cozunurlukte kalabiliyor - ayni dosya hem yuksek DPR'li telefonu hem de
 * DPR 1 tarayiciyi dogru olcude besler.
 *
 * DOSYAYI KUCULTMEK COZUM DEGILDI: o zaman yuksek yogunluklu ekranlarda
 * varlik bulaniklasirdi. Karar cihaza gore, calisma aninda verilmeli.
 */

/**
 * Kaynak bu orandan genisse yeniden pisirilir.
 *
 * Tam esitlik aranmaz: %25'e kadar fazlalik, pisirmenin bellek maliyetine
 * degmez ve gorunur bir fark yaratmaz. Ustelik hedef genislik cihaz
 * yogunluguna gore degisir; dar bir tolerans, 256 piksellik bir varligi
 * DPR 2'de gereksiz yere yeniden uretirdi.
 */
const TOLERANCE = 1.25;

/**
 * Bu kaynak, bu hedef icin yeniden pisirilmeli mi?
 *
 * Karar KURALI burada, Phaser'dan bagimsiz durur ki test edilebilsin.
 */
export function needsRebake(sourceWidth: number, targetWidth: number): boolean {
  if (!Number.isFinite(sourceWidth) || !Number.isFinite(targetWidth)) return false;
  if (sourceWidth <= 0 || targetWidth <= 0) return false;
  return sourceWidth > targetWidth * TOLERANCE;
}

/** Yeniden pisirilmis dokunun anahtari. */
function scaledKey(key: string, width: number): string {
  return `${key}@${Math.round(width)}`;
}

/**
 * Verilen doku icin, hedef genislige uygun bir doku anahtari dondurur.
 *
 * Kaynak zaten yeterince kucukse AYNI anahtar doner - gereksiz kopya
 * olusmaz. Pisirme yalnizca ilk cagrida yapilir; sonraki cagrilar hazir
 * dokuyu bulur.
 */
export function rightSizedKey(scene: Phaser.Scene, key: string, targetWidth: number): string {
  if (!Number.isFinite(targetWidth) || targetWidth <= 0) return key;
  if (!scene.textures.exists(key)) return key;

  const source = scene.textures.get(key).getSourceImage() as
    | HTMLImageElement
    | HTMLCanvasElement;
  const sourceWidth = source.width ?? 0;
  if (!needsRebake(sourceWidth, targetWidth)) return key;

  const width = Math.max(1, Math.round(targetWidth));
  const height = Math.max(1, Math.round((source.height * width) / sourceWidth));
  const baked = scaledKey(key, width);
  if (scene.textures.exists(baked)) return baked;

  const canvas = scene.textures.createCanvas(baked, width, height);
  if (!canvas) return key;
  /*
   * Yuksek kaliteli kucultme: tek adimda buyuk bir olcek dususu tarayicinin
   * varsayilan orneklemesiyle tirtikli cikar. Kalite bayragi bir kez
   * odenir, her kare degil.
   */
  const ctx = canvas.context;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(source, 0, 0, width, height);
  canvas.refresh();
  return baked;
}
