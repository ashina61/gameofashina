# Android hazırlığı — 0.127.0

Kaynak: Payitaht_Magaza_Analizi_2026-11-08.md. Öncelik: Android. Tarih: 9 Kasım 2026.

| Analiz maddesi | Durum | Sonuç / açık kapı |
| --- | --- | --- |
| Orman/maden arkasından harita görünmesi | Düzeltildi, otomatik doğrulandı | Ada katmanı defter açıkken görünmez; kâğıt dokusu yüklenmese de opak zemin okunur. Kapanınca kamera korunarak ada geri gelir. |
| Küçük kaynak yazıları ve hedefler | Düzeltildi, otomatik doğrulandı | 3 sütun × 2 sıra, 15 px miktar / 11 px üretim, kaynak ve danışman hedefleri en az 44 px. Gerçek %130 yazıda daha yüksek kaynak alanı. |
| Şehir menüsü ve gezinme | Düzeltildi | Şehir menüsü kaynakların üstünde açılır. Orman → ada → şehir Back zinciri yeniden geçmiş kaydı oluşturur. Boyalı alt menünün basma/seçili geri bildirimi korunur. |
| İlk 10 dakika akışı | Teknik engeller düzeltildi | Rehber bina önizlemesinde çalışır; yükseltme, Medrese yönetimi, işçi onayı ve başlangıç birliği seçimini gösterir. Sabit menünün örttüğü hedefi kaydırır. İlk sekiz hedef otomatik turda 3,4 oyun dakikasında tamamlandı. Gerçek yeni oyuncu testi hâlâ gerekli. |
| Kayıt ve bildirim köprüsü | Kod ve derleme düzeltildi | Android yedeği ACTION_CREATE_DOCUMENT ile seçilen dosyaya yazılır; iptal sessizdir, başarı yazma tamamlanınca bildirilir. Geniş depolama izni eklenmez. Bildirim Proxy/then beklemesi giderildi. Gerçek Android dosya yazma/geri yükleme ve izin testi açık. |
| Paket ve sürüm | Düzeltildi, derleme doğrulandı | APK/AAB ortak build:android kullanır; silmeden önce telefon görselleri doğrulanır. Android çıktısından 114 tam boy görsel / 30,68 MiB çıkarıldı. Bu APK indirme boyutu veya RAM ölçümü değildir. versionName package.json'dan gelir. |
| Gizlilik / mağaza hazırlığı | Kısmen tamamlandı | Yerel kayıt, hata günlüğü, bildirim, dışa aktarma, Android cihaz yedeği ve silme politikası eklendi. Ayarlardaki bağlantı Android WebView içinde açılır. Kamuya açık HTTPS adresi, kimlik/destek ve Play Console beyanları yayın kapılarıdır. |
| Şehir, bina ve surların sanat uyumu | Açık | Bu sürüm sanat kataloğunu yenilemez. Zemin netliği, ayırt edici yapılar, kıyı/arsa ve sur bütünlüğü görsel inceleme ve kabul gerektirir. Ada ormanı simgesi 44 px'e çıkarıldı. |
| Ekonomi / D1–D7 / uzun oturum | Açık | Birim testleri ve otomatik ilk tur, gerçek oyuncu tutma ve denge ölçümü değildir. Düşük/orta Android cihazda açılış, FPS, bellek/ısı ve uzun oturum ölçülmeli. |
| iOS | Sonraki aşama | Android kabulünden sonra ayrı paket/cihaz/mağaza turu. |

## Teknik değişiklikler

- Motor, ekonomi değerleri, kayıt şeması ve parsel geometrisi değiştirilmedi.
- Onaylı ahşap, portre, arma ve alt menü çizimleri kullanılır; gezinme plakalarının seçili/basma hareketi ve bildirim rozeti korunur.
- Tam boy sprite temizliği yalnızca Android işaretli statik çıktı üzerinde çalışır; tüm -sm karşılıkları silmeden önce kontrol edilir. Kaynak sanat ve parcel-v7 kalır.
- Android versionName kaynak paketle eşleşmelidir; farklı override reddedilir. Varsayılan versionCode major×1000000 + minor×1000 + patch; Play için her zaman yüklenmiş en yüksek kodun üstünde açık bir sürüm kodu seçilir.
- Görsel regresyon gerçek İnşa listesi → bina önizlemesi → yönetim sayfası, Medrese üretim/gelişim, Serasker savunma sekmesi ve şehir yönetimi menüsünü tıklar. Eski ekran görüntüsü adları güncel akışla eşlendi.
- Geçici next/font derleme hatası görsel CI'da en fazla üç kez denenir; diğer derleme hataları doğrudan başarısız olur.

## Doğrulama kanıtı ve kapsamı

383 test, TypeScript, ESLint, CSS ve V2 bütçe denetimleri geçti. Android [Release Check #114](https://github.com/ashina61/gameofashina/actions/runs/42710164626) Java 21 / SDK36 / R8 AAB ve debug APK derlemesini tamamladı. Son arayüz ve rehber düzeltmelerinin doğrulaması [PR #96](https://github.com/ashina61/gameofashina/pull/96) üzerindeki güncel kontrollerle izlenir.

Native export regresyonu 360×740, 390×844, 430×932 ve 390×844/%130 yazıyı sınar. Gerçek font büyümesi ve hücre sınırları ölçülür; eksik kâğıt görseli, Back zinciri, işçi atama ve kaydın yeniden açılması, gizlilik sayfası ve eksik varlıklar denetlenir. Tam layout taraması taşma, kesik yazı, 44 px hedef, küçük metin, çakışma ve erişilebilir ad için çalışır. İlk sekiz görev turu tıklamaları yalnız rehberin gösterdiği kontrol üzerinden yapar.

Her son başarılı Android CI çalışması UI ekranlarını/raporlarını ve test APK + imzasız AAB'yi artifact olarak saklar. İmzasız AAB Play'e yüklenmez; imzalı sürüm için PLAY_RELEASE.md uygulanır. Tarayıcı otomasyonu Android WebView ve fiziksel cihaz testinin yerine geçmez.

## Android yayın kapıları

1. Mevcut kaydı koruyarak Xiaomi 14 ve bir düşük/orta Android cihazda açılış, kapat/aç, arka plandan dönüş ve güncelleme.
2. JSON yedeğini sistem dosya ekranında yazma, iptal, aynı kaydı geri yükleme; bildirim izni ver/reddet.
3. Şehir menüsü, %100/%130 yazı, geri tuşu ve telefonun sistem çubuklarıyla gerçek dokunma turu.
4. Sanat bütünlüğü ve lisans envanteri, yeni oyuncu anlaşılırlığı, uzun oturum/ekonomi ve D1–D7 ölçümü.
5. Kamuya açık gizlilik bağlantısı, doğru geliştirici/destek bilgisi, Data safety / yaş / hedef kitle beyanı, imzalı AAB ve Play internal test.

Bu kayıt bütün analiz maddelerinin veya mağaza yayınının tamamlandığı anlamına gelmez.
