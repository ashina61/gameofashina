# Şehir çizim yaşam döngüsü — 11 Ekim 2026

0.100.0 / SW113. Değişiklik `city-canvas.tsx` kurulum/uyku köprüsü ve `phaser-city.ts` sahne temizliğindedir. Ekonomi, süreler, oyun saati, kayıt biçimi, HUD, ada koordinatları ve dört açıklık aynı kalır.

## Bulunan dört hata

1. Şehir asenkron yüklenirken tam ekran sayfa açılınca duraklatma effect’i henüz hazır olmayan sahneyi atlıyordu. Sahne sonradan hazır olunca güncel sayfa durumu yeniden uygulanmıyordu. Eski üretim sürümünde bina görselleri geciktirilip Hazine açıldığında, kapalı şehrin arkasında 1,5 saniyede 15 çizim ölçüldü. Yeni sürüm ilk gerçek `POST_RENDER` sonrasında güncel `paused`, boşta/hafif mod sınırını uygular. İlk çizimden önce uyutulmaz; yükleme sırasında sayfayı kapatıp şehre dönmek de güncel durumu kullanır.
2. Phaser 3.90’ın `Game.destroy(true)` metodu yalnız silme bayrağını koyar; asıl kaynak temizliği sonraki karede gerçekleşir. Uyuyan döngüde bu kare gelmediğinden şehir değişiminde eski oyun silinemiyordu. Temizleme şimdi silme isteğinden sonra yalnız başlatılmış ve uyuyan döngüyü bir kare için uyandırır; Phaser kendi normal temizliğini yapar. Özel Phaser yöntemlerine erişilmez.

3. Phaser oyun yok edilirken sahneye `destroy` verir; `shutdown` olayı zorunlu değildir. Hafif modun global dinleyicisi yalnız `shutdown` içinde kaldırıldığı için yok edilmiş sahneler global Set içinde kalıyordu. İlk tarayıcı ölçümünde üç geçişte heap yaklaşık 36,4 MB → 43,4 MB, dinleyiciler 791 → 900 oldu. Bu ölçümdeki toplam artışın dördüncü hata ile birlikte değerlendirildiği unutulmamalıdır. Dinleyici artık iki kapanış yolunda da kaldırılır; sahne hazır durumu ve kuşatma temizliği de iki yolu karşılar. Şehir geçişlerinden sonra hafif modu gerçek Ayarlar kontrollerinden açma/kapama eski sahne çağrısı olmadığını sınar.

4. Bellek dökümünde global `Phaser.GameObjects.Graphics.TargetCamera` → `renderList` → eski çizimlerin `defaultPipeline.game` yolu önceki şehir oyunlarını tutuyordu. `Graphics.generateTexture` bulut/ışık/duman dokuları üretirken bu paylaşılan kamerayı kullanır ve eski çizim listesini biriktirir. Kapanan sahne bu geçici kameranın sahibiyse kamera kamuya açık `destroy` ile temizlenir ve aynı `BaseCamera` türüyle yenilenir. Bir başka sahnenin kamerası temizlenmez; geometri veya görsel üretim değişmez.

## Tekrarlanabilir tarayıcı ölçümü

`tools/render-soak.cjs` üretim çıktısında gerçek Phaser’ı çalıştırır. Varsayılan süre 30 dakikadır. `RENDER_SOAK_MS=0` yalnız kısa işlev kontrolüdür. Oyun saati hızlandırılmaz. Test iki şehirli izole fixture kullanır; oyuncunun gerçek kaydı kullanılmaz.

390×844, DPR1, headless Chromium ve yazılım WebGL. Başlangıç yarışı için bina indirmesi geciktirilir; sayfa açık kalma ve şehre dönme ayrı kontrol edilir. Oturumda Hazine, Araştırma, Raporlar, Profil, Ayarlar, Harita, Günlük, ada/şehir ve iki şehir arasında tekrar geçilir. Eski canvas’ın kaldırılması beklenir; JavaScript hataları, canvas sayısı, çöp toplama sonrası JS heap, belge/DOM/dinleyici sayıları kaydedilir. Her geçişte ölçüm için çöp toplama zorlanır; bu doğal kullanıcı oturumundaki GC zamanlaması değildir. JS heap tüm süreç RAM’i veya GPU belleği değildir. Fiziksel cihaz sıcaklığı, pil ve gerçek Android performansı burada ölçülmez.

Ham sonuç: `render-soak-report.json`. Genel arayüz taraması: `render-layout-qa-summary.json`.

## Kod ve ekran kontrolleri

345/345 oyun testi; tip, ESLint, CSS, V2 ölçütleri, yarım boyut asset kontrolü ve statik üretim derlemesi geçti. Son kamera temizliği de tip/ESLint/derlemeyle ve gerçek Phaser şehir geçişleriyle sınandı. Genel 194 ekran taraması + 2 kural öz-denetiminde taşma, kesilme, çakışma, isimsiz kontrol ve sayfa hatası 0. Onaylı HUD kaynaklı 312 küçük hedef ve 663 minik yazı uyarısı önceki sürümle aynı; denetim çıkış kodu 1 ve bu sonuç tamamen temiz diye sunulmaz.

## 30 dakikalık sonuç

Gerçek geçen süre 1800038 ms (30 dakika); 259 sayfa/şehir/ayar işlemi. 32 eski tuvalin kaldırılması gözlendi; her bellek örneğinde bir aktif şehir tuvali ve bir belge kaldı. JavaScript hatası ve gözlenen çökme 0. Ön yükleme yarışında kapalı şehir 1,5 saniyede 0 çizim, yükleme sırasında şehre dönülen durumda 15 çizim yaptı. Oturum sonunda kapalı şehir yine 0, geri dönülen şehir 23 çizim yaptı.

| Ölçüm | JS heap, ondalık MB |
|---|---:|
| Isınmış başlangıç | 32.95 |
| Oturumdaki en düşük | 32.95 |
| Oturumdaki en yüksek | 35.76 |
| Son | 35.01 |

İlk üç geçişte görülen yaklaşık 36,4 → 43,4 MB sürekli eski şehir birikmesi tekrarlanmadı. Sonuç bütün olası bellek sızıntılarının yokluğunu kanıtlamaz: zorlanan GC, iki test şehri, değişen DOM/dinleyici sayıları ve yazılım WebGL ile sınırlıdır. Fiziksel Android ısınma, pil ve 30 dakika cihaz oturumu hâlâ ölçülmemiştir. `cityReady` süreleri bu sanal ortam içindir; gerçek cihaz açılış hızı olarak yorumlanmaz.
