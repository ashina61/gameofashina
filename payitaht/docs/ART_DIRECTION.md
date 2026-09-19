# Payitaht mobil sanat yönü

Koyu seladon arayüz, pirinç vurgular, sıcak kireç taşı ve kiremit çatılar.
Üstte 66 px şehir başlığı + 60 px kaynak çubuğu, altta 82 px beş işlemli menü.
Ölçüler CSS pikselidir; güvenli alan boşlukları bunlara ayrıca eklenir.
Dünya ayrı Phaser tuvalidir; dokunma alanları ve bina yerleri görselden çıkarılmaz.

Yeni ortam: `public/images/game/environments/sahilhisar-coast.png`.
Yerleşim: `lib/game/plots.generated.ts` (artık sabit, elle tasarlanmış plan).
23 şehir ve 2 liman arsasının eski kimlikleri korunur. Kamera ve dokunma
derinlikleri dünya koordinatlarında hesaplanır. Binaların şeffaf WebP'leri
mevcut projeden gelir. İkonlar projeye özgü `public/icon.svg` kaynağından
`scripts/prepare-icons.mjs` ile web/iOS/Android ölçülerine rasterize edilir.

Yeni kıyı görseli yerleşik image_gen ile bu çalışma için üretildi. Prompt:

> Production game asset: a square 2048x2048 background terrain painting for
> an original Ottoman Aegean mobile city builder. Orthographic isometric
> view, warm finely painted realistic strategy game art, restrained olive
> sage, limestone beige, terracotta, turquoise. The middle 75 percent width,
> y=15–78%, is empty flat buildable sandy pale olive meadow, subtle natural
> texture. No plots, grid, buildings or roads in the central area. Peripheral
> cypress and olive groves, rocks and low limestone walls only at the outer
> left/right 10% and top 12%. Nearly horizontal limestone quay and calm
> turquoise coastal sea at the bottom. No horizon, sky, text, UI or labels.
> Coastal mainland, not a floating island. Soft upper-left sun, original
> mature historic strategy-game painting.

Üretim çıktısı 1254 × 1254 px oldu; uygulamada gerçek ölçüsüyle kullanılır.
Üstteki prompt hedef ölçüsü ile çıktı ölçüsü aynı değildir. Yeni binalar
üretilirken mevcut Divanhane ışık ve materyal referansı olmalıdır.
