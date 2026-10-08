# Arşiv ve ittifak kontrolü — 8 Ekim 2026

0.64.0 / SW72. Yalnız görsel kaplama; üst/alt HUD ve oyun kuralları korunur.

- TypeScript, ESLint, CSS lint, kullanılmayan CSS ve v2 ölçütleri geçti. Oyun/PWA testleri: 328 geçti, 0 başarısız.
- Gerçek yerel Next ekranı, mobil Chromium: 360/390/430 px genişlikte yatay taşma yok.
- `tools/layout-qa.cjs` scanner: Arşiv, Kuruluş, Katılma, Birlik, Sancak editörü, Üyeler, Görevler, Genelge, Diplomasi ve yapay ittifak üyeliği. Her görünüm 360×740 normal/%130 yazı; sayfa kapsamındaki taşma, kesilme, küçük/minik hedef, çakışma ve isimsiz kontrol kümeleri boş. Ortak HUD dışında filtrelenmiş sonuç bütün oyun için global QA iddiası değildir.
- Arşiv sürüm arama, tekil açma, hepsini kapatma, arama temizleme ve sonuçsuz durum doğrulandı.
- Boş kuruluş formu engellendi; gerçek geçerli form birliği kurdu. Sancakta arma/renk seçimi ve kaydet çalıştı.
- Gerçek üye davetiyle üye sayısı arttı; rütbe Başkomutan olarak değişti. Görev sekmesinde mevcut hedefler görünür. Genelge yazılıp gerçek listeye eklendi. Diplomasi seçimi Saldırmazlık oldu.
- Ayrı yerel denemede yapay ittifaka katılma ve ayrılma çalıştı. Girişteki paylaşılan arşiv arama/açma ve üç mobil genişlikten geçti.
- HUD önce/sonra geometri eşitliği bütün oyun görünümlerinde kontrol edildi; `ika-hud.tsx` ve `41-exact-reference-hud.css` önce/sonra SHA-256 aynı. HUD assetleri değiştirilmedi.
- Çalışma zamanı hata ve eksik profil asseti yok. Ekran kanıtları `mockups/register-*.webp`. Canlı kullanıcı kaydı yerine yerel test fixture kullanıldı; kullanıcıya ileti gönderilmedi.
