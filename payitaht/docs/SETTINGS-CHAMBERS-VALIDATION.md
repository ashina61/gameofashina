# Ayarlar görsel kontrolü — 8 Ekim 2026

0.63.0 / SW71. Yalnız ayar görünümü; mevcut oyun kuralları ve kayıt biçimi korunur.

- TypeScript, ESLint, CSS lint, kullanılmayan CSS ve v2 ölçütleri geçti.
- Oyun/PWA testleri: 328 geçti, 0 başarısız.
- Gerçek yerel Next ekranı, mobil Chromium: Tercihler/Cihaz/Kayıt/Bilgi; 360/390/430 px yatay taşma yok.
- `tools/layout-qa.cjs` tarayıcısı her ayar sekmesinde 360×740, normal ve %130 yazıyla çalıştırıldı. Ayar kapsamındaki taşma, kesilme, küçük/minik hedef, çakışma ve isimsiz kontrol kümeleri boş. HUD dışında filtrelenmiş bu sonuç bütün oyun için global QA iddiası değildir.
- Altı anahtar; müzik aç/kapat ve geri dönüş; hafif mod Açık/Otomatik; dünya temposu açılımı; cihaz çevrimdışı metni doğrulandı.
- Yedek JSON indirme gerçekleşti; geri yükleme .json girdisi korundu. Yeni oyun onayı açılıp Vazgeç ile kapandı; gerçek oyun sıfırlanmadı.
- Bilgi rapor ve giriş eylemleri mevcut; sürüm arşivi açıldı. Çalışma zamanı hata ve eksik profil asseti yok.
- Profil ve Ayarlar açılırken üst/alt HUD geometrisi aynı. `ika-hud.tsx` ve `41-exact-reference-hud.css` SHA-256 önce/sonra aynı; HUD assetlerine değişiklik yok.
- Dört gerçek 390×844 ekran `docs/mockups/settings-chambers-*.webp` içinde. Bildirim izinleri cihazdan cihaza değişir; bu kontrolde gerçek kullanıcıya bildirim izni sorulmadı.
