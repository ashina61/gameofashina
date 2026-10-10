# Serasker/hedef doğrulaması — 0.87.0 / SW99

- 345 motor testi başarılı. TypeScript, sıfır uyarılı ESLint, CSS/unused sınıf denetimleri, V2 ölçütleri, half-size denetimi ve temiz statik derleme başarılı.
- `campaign-qa-report.json`: 73 ölçüm; 360/390/430×740, 360×740 %130 yazı; hazır/boş/görevli casus durumları. Sayfa hatası ve bütün altı yerleşim ölçütü sıfır.
- Son boyalı sekme simgeleriyle gerçek üretim çıktısı: `campaign-final-qa-report.json`, 52 temiz ölçüm. Stil enjeksiyonu kullanılmadı.
- Gerçek komutlar: Yeniçeri seçimi 5'er, 5 askerle sefer; 1 casus gönderme; hedefte Hazineyi gözetle görevi; rapor arşivleme/silme; toplu silmede arşivin korunması. Son turda savaş tekrarının ileri/geri tur düğmeleri doğrulandı.
- Üç bağımsız hedef türü, yapay rakip ilişkileri ve deniz aşırı eskort alanı açıldı. Serasker Raporlar/Seferler/Savunma ve dört rapor filtresi gezildi.
- Genel `tools/layout-qa.cjs`: taşma/kesik/isimsiz/sayfa hatası 0. Eski HUD/diğer ekranlarda küçük 322, minik 669, çakışma 70 uyarısı sürer; bütün oyun için sıfır uyarı iddiası yoktur. Özet `campaign-global-qa-summary.json`.
- Gerçek mobil ekranlar `mockups/campaign-*-ready.webp`. Çizim/promptlar `campaign-art.json`.
- Ekonomi, kayıt biçimi, motor dosyaları, HUD, ada koordinatları ve dört boş yerleşim açıklığı değiştirilmedi.
