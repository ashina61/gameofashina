# Profil tasarımı doğrulama — 0.61.0 / SW64

Onaylı görsel: `mockups/approved-profile-v2.webp`.
Gerçek uygulama görünümü: `mockups/profile-v2-actual-390.webp`.

- TypeScript, tüm ESLint, CSS renk/kullanım denetimleri ve V2 ölçütleri geçti.
- 328 oyun testi geçti. Engine, ekonomi, unvan/puan hesabı ve kayıt şeması değiştirilmedi.
- Mobil 360/390/430 px: yatay taşma yok. Profil taraması 360 px normal ve %130 yazı boyunda sıfır ihlal.
- Dört sekme, sekiz sıralama, on dört kayıt, otuz nişan ve kazanılan filtresi kontrol edildi.
- İsim değiştirip vazgeçince eski isim korunuyor; açık kaydet işlemi gerçek profili güncelliyor. Arşiv düğmesi çalışıyor.
- Profil açılışında HUD kutu geometrisi aynı. `ika-hud.tsx` ve `41-exact-reference-hud.css` öncesi/sonrası SHA-256 aynı. HUD dosyaları ve assetleri bu değişikliğe dahil edilmedi.
- Genel layout-qa hâlâ korunmuş HUD'un küçük yazı/dokunma alanı ve diğer sayfalardaki önceden bulunan uyarılarla kod 1 verir. Bütün uygulamanın layout kontrolü geçti diye raporlanmaz.

Görsel değerler gerçek kayıttan gelir: örnek mockup'taki 24 gün, üç şehir ve 12.480 puan sabitlenmez. Sancak, oyuncunun kaydedilmiş kumaş biçimi, rengi ve armasıdır. Küçük mobil ekranlarda metin okunurluğu/dokunma alanı alt sınırları bazı şerit yüksekliklerini büyütür; bu nedenle mockup ile her çözünürlükte piksel eşitliği iddia edilmez. Kullanıcının onaylı üst/alt barı aynen korunur.
