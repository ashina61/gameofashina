# Android açılışı — 0.138.1

API 36 emülatörü ANGLE yazılım çizicisiyle kararlı kaldı. Önceki koşunun logcat kaydı, ilk sistem kurulumu sürerken şehir görsellerinin 35 saniyelik varsayılan test süresinin sonuna kadar yüklenmeye devam ettiğini gösterdi. Hata ekranında HUD ve rehber vardı, şehir henüz çizilmemişti; WebView JavaScript hatası yoktu.

- Şehir hazırlanırken boş/siyah tuval yerine erişilebilir durum metni gösterilir. İlk POST_RENDER karesi geldiğinde kapanır.
- Async Phaser açılışı başarısız olursa yeniden deneme düğmesi sunulur.
- Test gerçek çizilmiş şehir koşulunu korur; yalnız soğuk emülatör şehir açılışına 120 saniye verir ve gerçekleşen süreyi raporlar. Genel cihaz akışı 480 saniyede sonlanır. Bu süreler fiziksel telefon performans hedefi değildir.
- Oyun ekonomisi ve kayıt biçimi değişmez.

Yerel doğrulama: 399 test, TypeScript, ESLint/CSS, native statik dışa aktarım. Geciktirilmiş arazi yüklemesinde hazırlık durumu ve ilk kareden sonra kalkması tarayıcıda sınanır. Son Android cihaz kabulü PR CI çıktısıdır; yalnız derleme başarısı cihaz testinin yerine geçmez.
