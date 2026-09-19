# Payitaht mobil sanat yönü

Güncel şehir, aşağıdaki “Şehir ekranı v2” bölümüdür. İlk bölüm eski
boş zemin denemesinin kaydıdır; aktif ortam olarak kullanılmaz.

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


## Şehir ekranı v2 — organik sokaklar

Yeni aktif ortam `environments/sahilhisar-town-v2.webp`. Önceki boş çim
zemini ve Phaser ile çizilen çapraz düz yollar kullanım dışı. Kıvrımlı
arnavut kaldırımları, merdivenler, avlu duvarları, bahçeler ve çevre evleri
aynı resmin parçasıdır. Çevre evleri dekor, seviye rozetli binalar oyuncu
binalarıdır. Oyuncu binaları ayrı sprite olarak çizilir ve etkileşimlidir.

Yeni resimde gerçekten bulunan 16 şehir avlusu ve 2 iskele kullanılır;
yola/duvara fazladan arsa bindirilmez. Mevcut bütün 11 kara bina türü için
yeterli yer vardır. Eski 23 kara + 2 liman düzeninden gelen kayıtların
geçersiz arsa numaraları `fillMissing` ile kendi bölgelerindeki boş yere
taşınır. Bina seviyeleri, kaynaklar, araştırmalar ve inşaatlar korunur.
Tam dolu eski şehir için regresyon testi vardır.

Yerleşik image_gen promptu:

> Original Ottoman Aegean premium isometric city-builder environment,
> 2048 square target, elevated orthographic camera, no horizon. Mature
> detailed painted 3D prerendered art. Warm terracotta, limestone, dark
> cypress, turquoise harbor. Dense small decorative Ottoman houses and
> towers on the periphery. Central empty building courtyards organically
> framed by WINDING cobblestone streets, low terrace walls, stairways,
> olive gardens, flowers, wells, amphorae, market awnings and benches.
> Larger municipal plaza around x50%, y46%; harbor and two piers at the
> bottom. No giant empty field, rigid grid, straight diagonal cross-town
> roads, UI, text, numbers or symbols. Main buildings remain separate
> interactive sprites; courtyards must be empty. Consistent scale and
> soft upper-left sunlight.

Üretim 23 avlu hedefini birebir karşılamadığı için çıktı gözle incelendi;
kod gerçek 16 avluya uyarlandı. Üretilen 1254×1254 PNG mobil yükleme için
WebP kalite 94'e çevrildi; boyutu değiştirilmedi. `drawTownStreets` ve
`drawTownGardens` kaldırıldı; boyalı sokakların üstüne ikinci yol/dekor
katmanı çizilmez. SW cache v3 yeni ortamı çevrimdışı saklar.
