# Profil tasarımı doğrulama — 0.61.2 / SW66

Onaylı görsel: `mockups/approved-profile-v2.webp`.
Gerçek uygulama görünümü: `mockups/profile-v2-actual-390.webp`.

- TypeScript, tüm ESLint, CSS renk/kullanım denetimleri ve V2 ölçütleri geçti.
- 328 oyun testi geçti. Engine, ekonomi, unvan/puan hesabı ve kayıt şeması değiştirilmedi.
- Mobil 360/390/430 px: yatay taşma yok. Profil 360 px normal ve %130 yazı boyunda yeniden açıldı: taşma, kesilme, yazı/düğme çakışması ve isimsiz eylem yok. Unvan levhası, başlık süsleri, nişan etiketleri ve alt eylem ikonları ayrıca gerçek resimle karşılaştırıldı. Levha/etiket metinleri kendi kutularında; unvan sahnenin %27 konumunda, başlık %29–71 aralığında. Küçük atlas etiketlerinde 11 px eşiğinin altında yazı uyarıları sürer; uyarılar testten gizlenmedi. Normal oranlarda sekme ve son eylem düğmeleri 31 px yüksekliği nedeniyle 44 px dokunma denetiminde uyarı verir; görselin boyu bu denetimi geçmek için esnetilmez.
- Dört sekme, sekiz sıralama, on dört kayıt, otuz nişan ve kazanılan filtresi kontrol edildi.
- İsim değiştirip vazgeçince eski isim korunuyor; açık kaydet işlemi gerçek profili güncelliyor. Arşiv düğmesi çalışıyor.
- Profil açılışında HUD kutu geometrisi aynı. `ika-hud.tsx` ve `41-exact-reference-hud.css` öncesi/sonrası SHA-256 aynı. HUD dosyaları ve assetleri bu değişikliğe dahil edilmedi.
- Genel layout-qa hâlâ korunmuş HUD'un küçük yazı/dokunma alanı ve diğer sayfalardaki önceden bulunan uyarılarla kod 1 verir. Bütün uygulamanın layout kontrolü geçti diye raporlanmaz.

Görsel değerler gerçek kayıttan gelir: örnek mockup'taki 24 gün, üç şehir ve 12.480 puan sabitlenmez. Sancak, oyuncunun kaydedilmiş kumaş biçimi, rengi ve armasıdır. Bütün resimli şerit ve defterler referansın kanonik oranlarında ölçeklenir. Ek görünmez vuruş alanları çizimi esnetmez; son eylem şeridinin altı sabit HUD katmanı tarafından kırpılır. Metin ve nişan durumları canlı veriye bağlıdır. Kullanıcının onaylı üst/alt barı aynen korunur.

8 Ekim telefon geri bildirimi: Android yazı büyütmesi profil kapsamında sabitlendi. Unvan, isim ve motto bağımsız mutlak kutulara alındı; başlık yalnız ortadaki süssüz alana kondu. Alt eylemlerde atlas zaten ikon içerdiği için ikinci React ikonları kaldırıldı. Üç nişan etiketi ve iki alt eylemin gerçek glyph kutusu taşma denetimi geçti. Bu denetim resimdeki ikonları göremeyen genel tarayıcı denetiminin yerine geçmez; ona ek kontroldür.
