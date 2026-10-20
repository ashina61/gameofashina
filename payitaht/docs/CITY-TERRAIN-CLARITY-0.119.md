# Payitaht 0.119.0 — şehir zemini netlik turu

20 Ekim: kullanıcı şehir arka planının daha belirgin olmasını istedi.
Gerçek oyunun kalibre edilmiş `painted-town-v1/city.webp` dosyası korunur;
yeni bir temsili şehir fotoğrafı sahneye konmaz.

## Üretim işlemi
- 1586×992 onaylı orijinalden Phaser dünya boyutuna **tek adımda 3172×1984 Lanczos**.
- Çok sınırlı CLAHE yerel kontrast (96×96, maxSlope 1.25): yol–taş–orman
  ayrışması; yeni bina, yol, duvar veya arsa çizilmez.
- Hafif kontur keskinleştirme; WebP kalite 96 (önce 91) ile kenar sıkıştırma
  gürültüsünü sınırlama.
- `city-crisp.webp` yalnız `pnpm dev`/`pnpm build` sırasında yeniden
  oluşturulur; projede kaynaktan türetilen görsel Git'e eklenmez.
- PWA kabuğu v144; telefonlarda eski arka planın kalıcı cache'den okunmasını önler.

## Güvenlik / kalite sınırları
- `PARCEL_WORLD` ve bütün 29 arsa/yerleşim koordinatları aynıdır.
- Bina/WebP alfa sınırlarına, Topkapı ana bina işine, liman yerleşimine,
  güneyde açık sur hattına ve mevcut oyun kurallarına dokunulmaz.
- `city-terrain-enhance.test.ts` çıktı çözünürlüğünü, gerçek kaynakla farkı,
  kenar kontrastı artışını, ortalama renk kaymasını ve mobil boyut sınırını
  kontrol eder.
- Bu bir **kaynak resim yenilemesi değildir**. Kaynak resimde olmayan ayrıntı
  yapay keskinleştirmeyle oluşmaz; Topkapı Sarayı ve farklı bina resimleri ayrı
  sanat üretimi ve alpha/arsa testi gerektirir.
