# 0.123.0 — gerçek zemin ayrıntısı

Kullanıcının yakın plandaki bulanıklık bildirimi üzerine küçük haritayı büyütüp keskinleştiren 0.122 hazırlama akışı değiştirildi. Dokuz örtüşen kaynak bölgesi imagegen ile ayrı yeniden boyandı; taş ekleri, çim, yaprak ve toprak ayrıntıları yeni çizimlerden gelir. Kaynak/girdi boyutları, bölge geometrisi ve SHA256 değerleri `native-terrain-provenance.json`, ortak çizim talimatı `native-terrain-prompts.txt` içindedir.

`prepare-native-terrain.mjs` çizimleri eski dünya koordinatlarına kaydeder, örtüşmeleri yumuşak ağırlıklarla birleştirir ve 4758×2976 atlası dokuz 1590×996 WebP olarak paketler. Görsel çıktılar yaklaşık 1,5 MP bölgesel çizimlerdir; tek seferde üretilmiş bir 4K resim iddiası değildir. Toplam aktarım 7.623.376 bayt; her doku 2048 GPU sınırının altındadır. Dünya 3172×1984 kalır: bir dünya pikseline 1,5 kaynak pikseli. Dört dünya piksellik ortak kenar payları vardır.

Ana sahne bu dokuları doğrudan yükler ve dünya ölçülerinde gösterir. `verify-native-terrain.mjs` build/dev sırasında boyut, hash ve bütçeyi doğrular. Yalnız eski yerel inceleme araçları için üretilen world-size `city-crisp.webp` ana sahneye yüklenmez. Eski enhance komutu da yeni doğrulayıcıya yönlendirilir. SW148 yeni dokuları önbelleğe alır.

Oyun mekaniği, kayıt biçimi, arsa kimlikleri/merkezleri, bina yerleşimi, sur hattı ve HUD değişmedi. Zemin çiziminde küçük bitki/taş ayrıntıları yenilendi; geniş yol, kıyı ve açıklık yerleşimi korunarak kayıtlı geometri kullanıldı.

## Doğrulama

- `pnpm check`: 375 test, TypeScript, ESLint ve CSS kontrolleri başarılı.
- Pages static export build, V2 kriterleri ve half-size kontrolü başarılı.
- Regresyon testi bütün dokuların gerçek boyut/hash değerini, dünya kapsamını, aktarım bütçesini ve ortak kenar renk farkını doğrular. Kara bölgelerinin tek piksel ayrıntı enerjisi eski büyütülmüş kaynaktan en az 1,6 kat yüksek olmalıdır.
- Gerçek derlenmiş oyun CUA ile 360, 390 ve 430 CSS piksel genişlikte; sentetik 28 yapı ve sur seviyesi 12 ile incelendi. Yatay taşma ve arsa dışı zemin ölçümü sıfırdı. 2,2 en yüksek zoom ve dört parçanın ortak birleşimi görsel olarak incelendi.
- `mockups/native-terrain-0123-close.jpg` gerçek oyunun 390 piksel yakın plan ekranıdır; native atlas montajı değildir. Fiziksel telefon/GPU performans ölçümü yapılmadı.
- Genel Mobile Visual QA içindeki eski orman büyüklüğü ve “Hükümdar” başlığı beklentileri 0.121 tabanında da başarısızdı; bu değişiklikte beklentiler bastırılmadı.
