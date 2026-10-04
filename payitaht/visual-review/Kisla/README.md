# Kışla referans pilotu

Kullanıcının 4 Ekim 2026 isteğiyle kışla ekranı, sağladığı Imagen mockup'ına
uygun tek parça Osmanlı–Ege eğitim avlusu ile yenilendi. Bu yeni istek,
eski H1–H3 brifinin bina sayfasına dokunmama kısıtının yerine geçer.

- Sahne: yerleşik ImageGen, 900×600 WebP, 149.250 bayt.
- Kışlaya özel kırmızı şerit, parşömen kartlar, büyük birlik portreleri.
- Seviye önizlemeleri, Gelişim sekmesi, birlik seçimi ve eğitim bölümü korundu.
- Yapı araçlarına bilgi düğmesiyle ulaşılır; yükseltme doku sabit kalır.
- Gerçek seviye, maliyet, araştırma kilidi ve sayıların tamamı oyun verisinden gelir.
- Şehir slotları, ekonomi, kayıt biçimi ve diğer ekranların stilleri değiştirilmedi.
- Önbellek v43; yeni sahne çevrimdışı listesinde.

Kontroller: TypeScript ve 325 test başarılı; ESLint ve CSS denetimleri başarılı;
V2 ölçütleri ve telefon görsel denetimi başarılı; üretim derlemesi başarılı.
360×740 ve %130 yazı boyunda 0 taşma/kesilme/küçük hedef/çakışma/isimsiz öğe,
0 sayfa hatası (layout-report.json). Kışla seviye önizlemeleri, bilgi/araçlar,
Gelişim, birlik seçimi ve eğitim kartına erişim tarayıcıda doğrulandı.

Ekran görüntüleri test kayıtlarından alınmıştır; sayılar tasarımın parçası değildir.

Genel 390×844 şehir/ada/kuşatma görsel turu: 0 JavaScript hatası ve 0 eksik
görsel (`diagnostics.json`). İlk sekiz rehber hedefi 4,1 oyun dakikasında
tamamlandı (`first-ten.txt`). Yerel tarayıcı yazılımsal WebGL ile çalıştırıldı.
