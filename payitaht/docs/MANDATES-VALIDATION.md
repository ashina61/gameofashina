# 0.65.0 doğrulama

8 Ekim 2026. Yerel gerçek Next uygulaması ve Chromium; 390×844 mobil kanıt görüntüleri. Sentetik deneme kaydı kullanıldı, oyuncu kaydı değiştirilmedi.

- TypeScript ve ESLint: geçti.
- CSS lint, strict unused CSS ve v2 kriterleri: geçti.
- Oyun testleri: 328 geçti, 0 hata.
- Beş sayfanın geri/çarpı düğmeleri 360, 390, 430 ve 864 px genişlikte kare ve en az 48 px; geri/kapama işlevleri çalıştı.
- Görevlerin üç sekmesinde 360/390/430 px yatay taşma yok. Projenin layout tarayıcısıyla görev alanında normal ve %130 yazı boyunda altı hata kategorisi boş. Bu sayfa kontrolüdür, tüm uygulama için genel tarama iddiası değildir.
- Şehir ödülü, günlük giriş, günlük görev ve başarım ödülü deneme kaydında alındı; alınmış durum ve hazır ödül sayacı doğrulandı. Başarım filtresi ve sekmelerin klavye geçişi çalıştı.
- Üst/alt HUD dosyaları ve ölçüleri aynı. Oyun koşulları, ödemeler ve kayıt mekanikleri değiştirilmedi. Başarım tacı yalnız görsel defneyle değiştirildi.
- Üç sekmenin üst/alt görüntüleri görsel olarak incelendi: metinler, plakalar, ödüller ve başlık düğmeleri ayrışıyor; geçici ödül animasyonları kanıt görüntülerinden önce bitirildi.

Canlı yayın kontrolü ayrı olarak yapılır; bu belge yerel kontrolleri kaydeder.
