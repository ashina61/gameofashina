# Kışla — ana şehir bağlantısı, 0.110.1 / SW130

15 Ekim 2026. Kullanıcının tek binayı mevcut oyun zemini üzerinde düzeltme isteği.

Önceki building-fit sayfasının sonuçları ana oyunu doğrulamıyordu. Bu sürüm doğrudan `MasterCityScene` tarafından kullanılan `masterBuildingImage` seçicisini değiştirir. Kışla master-v7 altında; diğer bina türleri bu işte yenilenmedi.

Yeni kışlanın dışı ve avlusu gerçek alfadır. Ayrı toprak plakası yoktur. Gerçek arsanın kaldırımdan içeri alınmış dörtgenine görünen alfa konturu sığdırılır; tek ölçek ve mevcut yön çevirme korunur. Mimari mesh'e çevrilmez, kırpılmaz. Eski `drawMasterApproach` yol örnekleme yaması kaldırıldı; çizime ait bayrakların üzerine ikinci runtime bayrağı eklenmez.

Dosyalar: `public/images/game/buildings/master-v7/kisla.webp` (1280×584), `kisla-sm.webp` (640×292). Ana sahnenin yükleme, sonradan inşa ve inşa defteri aynı seçiciyi kullanır. SW130 iki yeni dosyayı da önbelleğe alır. Kayıt/ekonomi/inşa süresi/arsa kimlikleri/HUD değişmez.

Yerel doğrulama: `master-parcels.test.ts` iki çözünürlük, bütün 29 ölçülü poligon, her iki yönde görünen her satırın uç piksellerini denetler. Bunun görsel onay olmadığı özellikle korunur. Standart layout-qa çalıştırma girişimi eksik Playwright Chromium yürütülebiliri nedeniyle başlayamadı. Canlı tarayıcı kontrolü ayrıca yapılır.

## Çizim kaydı

Yerleşik imagegen kullanıldı. Üretim istemi: Tek şeffaf Osmanlı-Ege askerî kışlası; yüksek ortografik üstten bakış, yatay ön/arka kenarlar, geniş ve alçak silüet; arkada uzun kiremit çatılı koğuş ve iki kısa yan kanat; alçak krem taş ön duvar ve açık orta kapı; küçük nöbetçi kulübeleri, mızrak rafları, iki kırmızı ok hedefi, sade bordo sancak. Avlu ve dış alan tamamen şeffaf; zemin plakası, yol, bahçe, insan, yazı ve logo yok. Sol üstten sıcak ışık, kısa temas gölgeleri; cepheden görünüm ve elmas izometriden kaçın. Bütün mimari ve gölge tuvalin içinde tam kalır.

Doğrulama sonucu: `pnpm check` 357/357, TypeScript, ESLint ve CSS denetimleri geçti. Pages taban yoluyla üretim derlemesi başarılı. Yerel Chromium ile layout-qa ikinci girişimi tarayıcı başlatma aşamasında kapandı; telefon düzeni için başarılı sonuç yok.

CI denetim notu (43793a2): Deploy derlemesi ve 357 test başarılı. Ayrı Mobile Visual QA layout işi: taşma 0, kesik 0, küçük hedef 312, minik yazı 663, çakışma 0, isimsiz 0, sayfa hatası 0; bu yüzden genel mobil düzen yeşil değildir. city-390 akışı eski `liman-duz-painted-1.webp` beklentisinde durdu (yüklenen `liman-painted-3.webp`); kışla sınır testiyle karıştırılmaz. Ayrı Android APK işi `next/font` için göreli `assetPrefix` hatasında durdu. Bu değişiklikte HUD, liman seçicisi ve APK yapılandırması düzenlenmedi; yayın hedefi Pages web sürümüdür.

## Canlı ana oyun kontrolü

Pages Deploy 38770380740 ikinci denemede başarılı oldu (ilk yayın adımı Pages zaman aşımı). 0.110.1 canlı menüde görüldü. Tek tarayıcı sekmesinde normal arayüzden Divanhane 2'ye yükseltildi, ardından Kışla 20 saniyelik inşaatla tamamlandı; şehir listesi Kışla, 1. seviye gösterdi. Ana Phaser haritası sürükleme/yakınlaştırma ile incelendi: yeni uzun arka koğuş ve kısa yan kanatlar görünüyor; avluda mevcut şehir toprağı, çevrede kesintisiz kaldırımlar ve yollar korunuyor.

Gerçek tarayıcı ekranı: `mockups/barracks-main-live.jpg` (1363×936). Bu bir kompozit veya building-fit demosu değildir. Masaüstü ekranındaki kontrol telefon cihazında görsel onay yerine geçmez. Önceki sürümün ana oyun kaydı `mockups/barracks-main-before.jpg`; farklı kamera konumları nedeniyle piksel karşılaştırması değildir.
