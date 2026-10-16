# Tek arsada kışla kamera düzeltmesi — 0.111.2 / SW133

16 Ekim 2026. Kullanıcı karo, arka plan ve bina çizimi arasındaki uyumsuzluğu tekrar bildirdi. Önceki 0.110.1 kontrolü taşmama durumunu görsel uyumla karıştırmıştı. Güncel 0.111.1 zeminsiz beş yapı değişikliği korunur; bu revizyonda sadece kışlanın çizimi yenilenir.

`master-v10/kisla.webp` ve `kisla-sm.webp` ana sahnenin ve inşa kataloğunun ortak seçicisine bağlıdır. Arka planın `unified-detail-v3/ne.webp` parçası doğrudan kamera/renk referansı olarak verildi. Yeni çizimde geniş çatı yüzeyleri, daha derin görünen eğitim avlusu ve alçak ön duvar var. Büyük kuleler kaldırıldı. Giriş, örnek arsanın orta dekor taşının önüne gelmemesi için sola alındı. Bu bir genel arsalarda kapı erişimi algoritması değildir; diğer arsalarda dekor ilişkisi ayrıca görsel değerlendirme gerektirir.

Zemin ve kaldırım yeniden boyanmaz. Bina içinde toprak/düz döşeme yoktur; mevcut harita alfa aralıklarından görünür. Mimari esnetilmez, kaynak oranıyla yerleştirilir. Kayıt, mekanik, HUD, arsa kimlikleri ve diğer dört master-v9 yapı değiştirilmez. Tüm şehir için ortak kamera sorununun çözüldüğü iddia edilmez; bu tek bina değerlendirmesidir.

## Kaynak ve yöntem

Yerleşik imagegen becerisi kullanıldı. İlk üretimde ön cephe fazla görünüyordu ve seçilmedi. Kamera düzeltme istemi: gerçek şehir zeminini referans al; 75 derece yüksek bakış iste; ön duvarın ekran yüksekliğini azalt; çatı yüzeyleri baskın olsun, arkadaki kenar ön kenara yakın genişlikte kalsın; kısa yan koğuşlar, askerî bordo sancak, hedef ve mızrak rafları; avlu, dış alan ve eşya aralarında gerçek alfa; zemin, yol, kaide, yazı, insan yok. Son düzenleme: yalnız açık ön kapıyı sola kaydır, eski açıklığı alçak duvarla kapat; kamera, mimari ve şeffaflık korunsun. Açı bir üretim istemidir, ölçülmüş fiziksel kamera verisi değildir.

Paketleme: `tools/art/prepare-master-v8.cjs` ile 1024/512 genişlik, gerçek alfa korunarak WebP; son dosyaların alfa konturları ölçülür. Tam assetler `public/images/game/buildings/master-v10/` altında. Eski master-v9 piksel konturu yalnız karşılaştırma için `docs/barracks-v9-outline.json` içinde saklanır.

## Karşılaştırma

`tools/barracks-camera-proof.cjs`, gerçek `masterCutoutFrame` yerleşimini kullanır. `docs/mockups/barracks-camera/empty.webp`, `master-v9.webp`, `master-v10.webp` aynı arsa ve aynı kamera kesitidir. Bu dosyalar native Canvas render'ıdır, tarayıcı ekranı değildir. Taşma testi iki çözünürlükte bütün ölçülü arsalar ve aynalama için çalışır; kendi başına estetik onay sayılmaz.

Kontroller: `pnpm check` 358/358 test, TypeScript, ESLint ve CSS kontrolleri geçti. Pages taban yoluyla statik üretim derlemesi başarılı. `v2-criteria`, telefon boyu asset kontrolü ve `git diff --check` geçti. Native karşılaştırmada hem eski hem yeni çizim için arsa dışında değişen piksel sıfır. Genel mobil layout kontrolü bu tur yeniden çalıştırılmadı; önceki küçük hedef/yazı uyarılarının çözüldüğü iddia edilmez.

## Canlı ana oyun doğrulaması

Deploy 38859059443 başarılı. Canlı giriş ekranında 0.111.2 görüldü. Normal UI ile kurulmuş 1. seviye kışla aynı kayıtla güncellemeden sonra açıldı; yeni üstten bakış master-v10 çizimi göründü. Haritadaki binaya dokununca Kışla paneli açıldı ve kapatıldı. Eski/yeni gerçek oyun ekranları `mockups/barracks-camera/main-before.jpg` ve `main-after.jpg`; yeni gerçek ekranın yolları içeren yakın kesiti `main-detail.jpg`. Gerçek ekranlar farklı pan konumlarındadır; sabit koordinat karşılaştırması native üç dosyadadır.

Bu turdaki canlı manuel kontrol 1363×936 masaüstü tarayıcıdadır; telefon donanımı veya bütün katalog için görsel onay değildir. 0.111.1'de eklenen diğer dört zeminsiz yapı korunur.
