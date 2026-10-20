# Payitaht 0.117.0 — Liman dışarıda, arka plan daha okunur

## İstek ve gerçek uygulama

20 Ekim: Topkapı Sarayı karakterinde merkez yapı; tüm binaların aynı
perspektif ve üslupla yeniden çizilmesi; limanın sur altında kalmaması;
surların şehir tabanıyla bütünleşmesi; şehrin daha net görünmesi.

Bu dal **ilk uygulanabilir entegrasyon turudur**, yeni boyanmış bina seti değildir.
Eski bir mockup'ı oyuna eklemek veya arsaları yeniden dizmek yerine gerçek oyun
haritasındaki iki bozukluğu düzeltir:

1. 0.116.0 önceki sur planı 25 kara + 3 kıyı arsasını tek halka içine
   alıyordu. Artık sur dış hattı **yalnızca sabit belediye + 24 kara arsası**
   ile hesaplanır. Güney kıyı cephesindeki eğimi sığ iki büyük bölüm
   yığma duvar ve burç olmadan açık bırakılır. Liman, tersane ve korsan adası
   sur dışında kalır. Yalnız **üç kara yolu kapısı** bulunur.
2. 1586×992 asıl şehir resmi korunur; üretim ve geliştirme başlamadan
   aynı görüntü Lanczos yeniden örnekleme + hafif keskinleştirme + düşük
   kontrast ayarıyla 2304 px genişlikte tekrar WebP'ye işlenir.
   Bu işlem çizime yeni mimari detay eklemez, mevcut kenarları belirginleştirir.

## Uyum ve test

- Dünya koordinatları 3172×1984 ve bütün parsel kayıt kimlikleri aynıdır.
- Bina alfa konturlarını ve tap hit bölgelerini değiştirmedik.
- Yeni test, güneyde 1500 dünya pikselinden geniş sursuz geçiş,
  3 gerçek kara kapısı, kıyı parsellerinden mesafe ve arsaların
  çakışmamasını denetler.
- Üretilen görsel `city-crisp.webp`, `pnpm dev` ve `pnpm build` sırasında
  `tools/art/enhance-city-terrain.mjs` tarafından yazılır. Asıl
  `city.webp` değişmez. Service Worker v142 bu yeni görseli önbellekler.

## Henüz bitmeyen sanat çalışmaları

- Belediye binasının **Topkapı Sarayı'na özgü yeni şeffaf WebP çizimi**
  henüz tamamlanmadı; eski divan sprite'ı kalır.
- Kışla, medrese ve diğer bina resimleri yeni bir ayrı boya turu geçirmedi;
  eski resimler arsa uyumunu korumak için aynı kaldı.
- Vektör çizilmiş sur gövdelerinin boyanmış arka planla malzeme uyumu
  gerçek cihaz ekran görüntüsünde değerlendirilmelidir.
- Bu dal temel oyun mekaniğine veya kayıt biçimine dokunmaz; yayın ancak
  tarayıcı ve build kontrolleriyle yapılmalıdır.
