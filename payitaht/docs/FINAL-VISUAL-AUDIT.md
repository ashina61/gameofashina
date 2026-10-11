# Son görsel denetim ve kalan işler — 11 Ekim 2026

0.99.1 / SW112. Önceki bölümde ana sayfalar, yapı grupları, giriş ve yardımcı pencerelerin ortak boyalı tasarıma geçişi tamamlandı. Son takipte ada araçlarının iki ikon düğmesinde doğrudan metin `font-size: 0` ile gizleniyordu; genel denetim bunu iki minik yazı olarak sayıyordu. İkonlar dekoratif olarak işaretlenip adlar mevcut `sr-only` sınıfına taşındı. Ekran okuyucu ve otomasyon için şehre dönüş, raporlar ve okunmamış sayı korunur; görünüm ve komutlar aynıdır. Genel denetim kuralları gevşetilmedi.

| Alan | Durum | Kalan iş |
|---|---|---|
| Ana sayfalar ve yapı detayları | Ortak atlas geçişleri tamam | Yeni kullanıcı değerlendirmesinde bulunan somut sorunlar |
| Rehber, dönüş özeti, bina önizlemesi | 0.99.0: 72 tarama ve 15 işlem temiz | Bilinen yeni hata yok |
| Ada araçları | 0.99.1: ikon adları erişilebilir | Bilinen yeni hata yok |
| Onaylı HUD | Referans yerleşimi korunuyor | Dar ekranda küçük danışman hedefleri ve kompakt metinler gerçek sınırlardır; çözüm HUD tasarımını büyütmeyi gerektirir |
| Android APK üretimi | 0.99.0 GitHub işi başarıyla tamamlandı | Gerçek orta segment Android'de 30 dakika performans/ısınma/çökme kontrolü |
| Mağaza yayını | Önceden kullanıcı tarafından ertelendi | Yayın hazırlığı ve hesap üzerinden yayımlama ayrı çalışma |
| Uzun vadeli oyun temposu | Görsel kapsam dışında | Mevcut 30 günlük eğriyle hedeflerin karşılaştırılması; mekanik değişikliği yapılmaz |

Motor, ekonomi, kayıt, ada koordinatları ve dört ek açıklık değiştirilmez. HUD dosyaları ve atlasları değiştirilmez. Genel uyarı sayıları, aynı küçük HUD öğelerinin farklı ekranlarda tekrar sayımıdır; yüzlerce farklı yeni hata anlamına gelmez. Görsel yenileme için yeni bölüm sırası yoktur. Yayın sonrası kullanıcı değerlendirmesinde dur.

Doğrulama sonuçları: `island-labels-qa-report.json`, `final-visual-qa-summary.json`. Önceki sürümün kanıtları `SUPPORT-DESIGN-MEMORY.md` ve `consistency-qa-summary.json` içinde tarihsel olarak korunur.

## Mevcut tempo simülasyonu

`node --import tsx tools/pace-sim.ts` çalıştırıldı; motor değiştirilmedi. Simülasyon hedefleriyle günde üç giriş profili: Divanhane 10 için hedef 2 gün / sonuç 3 gün; seviye 15 için hedef 7 / sonuç 8; seviye 20 için hedef 30 / sonuç 13. Günde bir giriş profili 30 günde seviye 18; aktif profil 2. günde seviye 20. Bu otomatik model sonucudur; gerçek oyuncu davranışı veya cihaz performansı ölçümü değildir. Özellikle son hedef eğrisi tasarım kararı gerektirir; mevcut yalnız görsel kapsamda ekonomi/süreler değiştirilmez.

## Son doğrulama

345/345 test; tip, ESLint, CSS, V2 ölçütleri, yarım boyut asset kontrolü ve statik derleme geçti. Ada araçları 360/390/430 px ve %130 yazıda 6 temiz tarama; gerçek rapor/ada/şehir geçişlerinde 9 işlem temiz. Genel 196 taramada taşma, kesilme, çakışma ve isimsiz kontrol 0. Kalan 312 küçük hedef ve 663 minik yazı uyarısının tamamı onaylı HUD içindedir; önceki sürümden iki yanlış ada uyarısı çıkarıldı. Genel denetim çıkış 1 verir; bu sonuç tamamen temiz diye sunulmaz.
