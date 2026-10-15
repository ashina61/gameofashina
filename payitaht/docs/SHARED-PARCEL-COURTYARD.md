# Ortak arsa kalıbı — kışla denemesi

15 Ekim 2026. Bina şekli değişebilir; tamamlanmış bina ve avlu aynı arsayı köşelerine kadar kapatmalı, boş arsa kenarı görünmemeli ve yol kapanmamalı.

Ana `MasterCityScene` içinde kışlanın mimari alfa çiziminin altına ortak opak avlu düzlemi eklendi. Düzlem mevcut ölçülü arsanın tam poligonuna dört köşeden eşlenir; içe çekilip eski boş arsa çerçevesini açıkta bırakmaz. Bina bu eşlemeye girmez; mevcut `masterBuildingPlot` iç sınırında uniform ölçeği ve alfa konturuyla yerleştirilir. Başka bir mimari cutout seçildiğinde de aynı avlu sözleşmesi geçerlidir. Eski 35 bina dönüştürülmedi. Kayıtlar, ekonomi, HUD ve arsa kimlikleri değişmez.

Bu bir görsel değerlendirme denemesidir. Poligonun dolması, arka planın boyalı bordürüyle optik birleşimin onaylandığı anlamına gelmez. Özellikle açık avlu ile eski bitkili kenarın birleşimi kullanıcı değerlendirmesine açıktır. Canlı yayın yapılmadı.

Yeni varlık: `public/images/game/terrain/parcel-courtyard-v1.webp`. Yerleşik imagegen, mevcut `unified-detail-v3/ne.webp` malzeme referansıyla kullanıldı. İstem: kenardan kenara uzanan sıcak kum/krem tonlu, küçük aşınmış kireçtaşı avlu dokusu; üstten düz görünüm; düşük kontrastlı derz; sınır, yükseltilmiş platform, bina, bitki, gölge, yazı veya saydam kenar yok. Üretim çıktısı proje için WebP olarak paketlendi.

`NODE_PATH="$CODEX_PRIMARY_RUNTIME_NODE_MODULES" node tools/master-courtyard-qa.cjs` ana sahnenin gerçek `canvasParcel` metodunu kaynak dosyadan çalıştırır. 25 kara arsasında opak iç dolgu ve dış sınır kontrolü yapar. Raster kenarlar için 1 piksel tolerans kullanılır. Canvas üçgenlerinin birleşiminde bulunan saydam dikiş aynı poligon içindeki opak alt boyayla giderildi. `mockups/shared-courtyard/native-qa.json` sonuçları ve `barracks-courtyard.webp` native Canvas birleşimi kanıttır; tarayıcı ekran görüntüsü değildir.

Yerel Chromium kurulumu indirilen arşiv geçersiz olduğu için başarısız oldu. Bu revizyonda başarılı telefon/WebGL/layout-qa testi iddia edilmez. Standart kod denetimleri 358 test, TypeScript, ESLint ve CSS ile geçti; Pages üretim derlemesi başarılı.
