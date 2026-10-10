# İnşa menüsü ve arsa seçimi — 0.85.0 / SW97

Onaylı Kışla/Medrese boyalı atlasları: ceviz, fildişi parşömen, eskitilmiş pirinç; Tinos başlıklar ve Georgia gövde. Yeni yazısız ustalar sahnesi 80 px banner; prompt ve kaynak `construction-art.json`. Eski yuvarlak/modern yapı kartları kaldırılır. Mevcut bina çizimleri korunur; harita, slot koordinatları ve HUD değişmez.

Katalog Tümü/Kurulu/Yeni ve Türkçe büyük/küçük harfe duyarlı arama ile aynı yapı listesini sunar. Dikey açılır yapı satırında kategori, seviye, gerçek motor durumu. Kilitli satır da açılabilir: açıklama, tam sayılı kaynak ve lüks mal bedeli, gerçek saniye, motorun kilit nedeni okunur. Kurulu yapıya/incelemeye gitmek katalogdan erişilebilir kalır. En yüksek seviyede yeni bedel gösterilmez. Sıradaki yapı mevcut JobProgress ile okunur.

Arsa önce seçilir. Açılır satırı açmak inşa emri vermez; açık ayrıntıdaki ayrı kırmızı düğme mevcut build komutunu seçilen plot ile gönderir. takesPlot, placement ve plotFits mevcut kurallarıyla: karada kara yapıları, denizde üç deniz yapısı, korsan kayalığında yalnız Korsan Kalesi. Surlar katalogdadır; arsada görünmez. Kilitler buildReason'dan; kapalı/dolu arsa ayrıca UI'da engellenir, motorun koruması da aynıdır. Yeni ekonomi, yerleşim, kayıt alanı veya komut eklenmez.

Üst defter açık ve boş kara/deniz arsa sayıları, gerçek 3 işlik sıra doluluğu ve bir sonraki Divanhane arsa açılışı. İş sırası açılır destek bilgisidir. Kısa dekorasyon ve tam genişlikte eylem korunur. CostDisplay'in exact seçeneği yalnız bu defterde kullanılır; diğer ekranların varsayılan sayı biçimi aynıdır.

Sonraki bölüm Ada ormanı ve ada madeni. Bu bölüm yayınından sonra kullanıcı değerlendirmesinde dur.
