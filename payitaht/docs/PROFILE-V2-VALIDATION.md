# Profil tasarımı doğrulama — 0.61.1 / SW65

Onaylı görsel: `mockups/approved-profile-v2.webp`.
Gerçek uygulama görünümü: `mockups/profile-v2-actual-390.webp`.

- TypeScript, tüm ESLint, CSS renk/kullanım denetimleri ve V2 ölçütleri geçti.
- 328 oyun testi geçti. Engine, ekonomi, unvan/puan hesabı ve kayıt şeması değiştirilmedi.
- Mobil 360/390/430 px: yatay taşma yok. Profilin referans oranları 360 px normal yazı boyunda kontrol edildi. %130 yazı boyunda özet satırındaki çakışma için iç boşluk düzeltildi; son düzeltmenin yerel tarayıcı tekrar kontrolü, tarayıcı çalıştırıcısı başlatılamadığı için tamamlanamadı. Normal oranlarda sekme ve son eylem düğmeleri 31 px yüksekliği nedeniyle 44 px dokunma denetiminde uyarı verir; görselin boyu bu denetimi geçmek için esnetilmez.
- Dört sekme, sekiz sıralama, on dört kayıt, otuz nişan ve kazanılan filtresi kontrol edildi.
- İsim değiştirip vazgeçince eski isim korunuyor; açık kaydet işlemi gerçek profili güncelliyor. Arşiv düğmesi çalışıyor.
- Profil açılışında HUD kutu geometrisi aynı. `ika-hud.tsx` ve `41-exact-reference-hud.css` öncesi/sonrası SHA-256 aynı. HUD dosyaları ve assetleri bu değişikliğe dahil edilmedi.
- Genel layout-qa hâlâ korunmuş HUD'un küçük yazı/dokunma alanı ve diğer sayfalardaki önceden bulunan uyarılarla kod 1 verir. Bütün uygulamanın layout kontrolü geçti diye raporlanmaz.

Görsel değerler gerçek kayıttan gelir: örnek mockup'taki 24 gün, üç şehir ve 12.480 puan sabitlenmez. Sancak, oyuncunun kaydedilmiş kumaş biçimi, rengi ve armasıdır. Bütün resimli şerit ve defterler referansın kanonik oranlarında ölçeklenir. Ek görünmez vuruş alanları çizimi esnetmez; son eylem şeridinin altı sabit HUD katmanı tarafından kırpılır. Metin ve nişan durumları canlı veriye bağlıdır. Kullanıcının onaylı üst/alt barı aynen korunur.
