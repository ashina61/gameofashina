# Kereste ve kaynak üretim yapıları — 0.76.0 / SW88

Geçerli standart `MASTER-UI-STANDARD.md`: onaylı Kışla/Medrese atlaslarının gerçek işlemeli çerçeveleri, ceviz başlık, altın süsler, sıcak parşömen ve kırmızı ipek aktif sekme. HUD ve şehirdeki bina resimleri korunur.

Altı sayfa: Kereste Ocağı, Ormancı Evi, Kahve Fidanlığı, Taşçı Ustası, Camcı Atölyesi, Simyahane. Her biri ayrı yazısız 80px ortam bandı ve Üretim/Gelişim sekmelerini kullanır. Yükseltme Gelişim’in ilk bloğudur; yapı açıklaması ve yön/taşı/yık işlemleri altında. Bilgi düğmesi ve yapı görünümü galerisi yok.

Kereste Ocağı gerçek `workers` komutuyla oduncu atar. Onaylı sürgü, +/− ve uç düğmeleri; değişiklik önce taslaktır, Onayla uygular, Geri al mevcut sayıya döner. Ortak tam boy halk ile yeni şeffaf tam boy oduncu kullanılır. Gösterilen hız `rates(game).wood` toplamıdır, yalnız ocak üretimi diye etiketlenmez.

Ormancı Evi’nde maden işçisi gösterilmez; ocak ve ada ormanının oduncuları ayrıdır. Ada ormanının temel katkısı `forestProduction` ile çarpanlardan önce etiketlenir. Ormancı yüzdesi yapı katkısıdır, toplam üretim ayrı okunur.

Dört lüks kaynak sayfasında yapı yüzdesi, gerçek ada kaynağında çalışanlar, brüt üretim ve stok ayrı okunur. Kaynak adanın türüyle uyuşmuyorsa bu yapının katkısının burada uygulanmadığı açıkça belirtilir. Üretim bu yapılara bağımsız işçi atayarak yapılmaz; ada ekranına yönlendirilir.

Kahvede `luxuryProduction` brüt hızı, `luxuryRates` stok değişimini sağlar. Kahvehane tüketimi bu ikisinin farkıdır; motorun mevcut sıfır stok davranışı korunur. Mevcut stok/ayrı mal kapasitesi ve boş yer; stok dolu ve net üretim pozitifse depolanamayan üretim uyarısı gösterilir. Ambar ve kahve ikramına gerçek bağlantılar vardır.

Uygulama: `components/game/production-panel.tsx`, `54-production-register.css`; ortak 47/50 stil kapsamına yalnız `.bp-production` eklenir. Atlas/ekonomi/komut/kayıt biçimi değiştirilmez. Görsel üretim kayıtları `production-art.json`; gerçek mobil ekranlar `mockups/production-*`.

Bu bölüm yayınlanınca kullanıcı değerlendirmesinde dur. Sonraki önerilen bölüm: Marangozhane, Mimarbaşı, Kahve Kileri, Gözlükçü ve Barut Deneme Alanı (maliyet azaltma).
