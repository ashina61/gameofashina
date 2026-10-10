# Dünya atlası / imparatorluk defteri — doğrulama

0.88.0 / SW100, 10 Ekim 2026.

- 345 motor/kayıt/PWA testi geçti: `node --import tsx --test $(find lib -name '*.test.ts')`. TypeScript, ESLint, CSS/strict-unused, V2 ölçütleri, yarı boy görsel kontrolü ve `git diff --check` geçti.
- Temiz `.next` ile statik üretim build'i geçti. Yayın yolu `/gameofashina`; yeni sahne SW100 precache'inde.
- `atlas-qa-report.json`: 84 ölçüm; 360/390/430px ve 360px %130 yazı. 16 ada, üç şehir/yedi mal, dolu ambar, inşaat, boş ordu, seferde asker, kuşatma, kapalı/aktif koloni durumu. Taşma/kesik/küçük/minik/çakışma/isimsiz 0; sayfa/asset hatası 0.
- Gerçek yerel kayıt üzerinde şehir geçişi, koloni komutu ve tam 1.100 akçe/1.500 kereste bedeli; sürükleme/tekerlek/+/−/sıfırlama sırasında aynı HUD kutusu; klavyeyle ada seçimi. Adayı gör sonrasında dört boş yerleşim rezervi.
- Son çekmece konumu düzeltmesinden sonra `atlas-drawer-qa-report.json`: 48 ek ölçüm, aynı genişlikler ve %130 yazı. Bitmiş giriş animasyonunda alt kenar alt HUD'a hizalı; modeless seçimi ve kendi/koloni/boş/engelli ada durumları. Altı ölçüt ve sayfa/asset hatası 0. Sabit HUD stilinin genel `top` kuralına yalnız bu çekmecede `top:auto` istisnası; HUD dosyası değişmedi.
- Genel `layout-qa.cjs` raporu: taşma 0, kesik 0, küçük 322, minik 669, çakışma 70, isimsiz 0, sayfa hatası 0. Bunlar 0.87 genel HUD/diğer sayfa baz çizgisiyle aynı; bütün oyun sıfır sorun diye sunulmaz. Yeni map/overview sayfalarında kayıtlı sorun yok. Özet: `atlas-global-qa-summary.json`.

Gerçek 390px ekranlar `mockups/atlas-*.webp`; özgün sahne ve prompt `atlas-art.json`. Motor, ada koordinatları, şehir arsaları, dört ada yerleşim rezervi ve kabul edilmiş HUD görselleri değişmedi. Sonraki bölüm Ordu/donanma ana ekranı; yayın sonrası kullanıcı değerlendirmesi.
