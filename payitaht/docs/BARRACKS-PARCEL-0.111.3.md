> **16 Ekim takip:** Kullanıcı bu sonucu reddetti. Aşağıdaki sınır ve alfa testleri görsel uyum veya kullanıcı onayı değildir. Projektif esnetme onaylı çözüm sayılmaz. Yeni araştırma ve prototip: `IKARIAM-STUDY-PROTOTYPE.md`.

# Zeminsiz bina, doğrudan karo yerleşimi — 0.111.3 / SW134

16 Ekim 2026. Kullanıcı 1000147564.jpg ekranında iki şartı tekrar etti: bina kendi zeminini taşımayacak, karoya tam oturacak.

Kışlanın dışa taşan taş kaidesi ve yatay döşeme parçaları master-v11 çiziminden kaldırıldı. Ön alçak duvar bina mimarisinin parçasıdır; bağımsız taş zemin veya kapalı toprak plakası değildir. Açık avlu ve eşya araları gerçek alfadır. Ana sahne bu binanın altına arsa dolgusu çizmez; mevcut şehir toprağı görünür.

Önceki uniform küçültme dört kenarı dolduramıyordu. Yeni `master-cutout-quad.ts`, son sprite'ın görünür alfa konturunu içeren kaynak trapezi hesaplar. Bu trapezin dört kenarı doğrudan mevcut parselin dört kenarına eşlenir. Saydam tuval dikdörtgeni tekrar trapeze çevrilmez; çift perspektif uygulanmaz. 8×8 bölünmüş projektif UV ağı büyük iki üçgenden doğan çatı çizgisi kırılmasını azaltır. Canvas fallback aynı UV/konum verilerini kullanır. Kaynak zarfın bütün görünür pikselleri içerdiği test edilir; mimari dışarıda kaldığı için kırpılmaz. Bu yöntem uniform en-boy oranı koruması yerine arsanın perspektifine uyarlama yapar; kışla için önceki uniform kuralını değiştirir.

Bu revizyon kışla içindir. Diğer dört zeminsiz yapı, kalan katalog, arka plan, yol, arsa kimlikleri, HUD, ekonomi ve kayıt formatı değişmedi.

## Çizim kaydı

Yerleşik imagegen ile master-v10/kisla.webp düzenlendi. İstem: mimariyi, mevcut üstten açıyı, çatıları, alçak ön duvarı, sola alınmış kapıyı ve askerî eşyaları koru; dış taş platform/kaide, çıkıntılı alt şerit ve yatay zemin döşemelerini kaldır; duvarlar doğrudan zeminle temas etsin; avlu/dış alan/eşya araları tamamen alfa; yeni toprak, yol, kaide, sahne veya insan ekleme. Son varlıklar: `public/images/game/buildings/master-v11/kisla.webp` ve `kisla-sm.webp`. 1024×482 ve 512×241; WebP gerçek alfa korunarak paketlendi ve son dosyaların konturları yeniden ölçüldü.

## Kontroller

`pnpm check`: 360/360 test, TypeScript, ESLint ve CSS kontrolleri geçti. Geometri testleri her iki boyutta bütün ölçülü arsalarda aynalı/normal durumu, kaynak mimarinin kırpılmamasını, karonun dört köşesine eşlemeyi, düz kalan kenarları ve WebGL/Canvas koordinat uyuşmasını kontrol eder. `barracks-parcel-proof.cjs` gerçek harita üzerinde önce/sonra üretir; yollar dahil arsa dışında değişen piksel 0. Native beş bina kontrolünde kışlanın 13.710 açık zemin örneği haritayla aynı kaldı. Bu sonuçlar tarayıcı ekranı veya kullanıcı görsel onayı yerine geçmez. Native görüntüler `docs/mockups/barracks-parcel/` altındadır.

Pages taban yoluyla statik üretim derlemesi, V2 ölçütleri, telefon boyu asset kontrolü ve diff kontrolü geçti. Genel mobil layout denetimi bu tur yeniden çalıştırılmadı; önceki HUD hedef/yazı uyarıları giderilmiş sayılmaz.

## Canlı kontrol

Deploy 38866135699 başarılı. Canlı giriş ekranı 0.111.3 gösterdi. Normal UI'da kurulmuş kışla aynı kayıtla yeni sürümde açıldı; projektif çizim yüklendi. Haritadaki binaya dokununca Kışla paneli açıldı, kapatıldı. `main-live.jpg` gerçek ana oyun ekranıdır; `main-detail.jpg` bu ekranın yolları da gösteren doğrudan tarayıcı kesitidir. Manuel kontrol 1363×936 masaüstü tarayıcıda yapıldı; telefon donanımı için görsel onay sayılmaz.
