# Vezirin defterleri — 0.95.0 / SW107

10 Ekim 2026. MASTER-UI-STANDARD.md günceldir.

- Gündem/Şehirler/Haberler aynı ceviz, parşömen, altın işlemeli köşeler, kırmızı ipek ve ortak eğitim eylem atlaslarını kullanır. Başlık Tinos Bold, gövde Georgia. Geri/çarpı ayrı oranı korunan yuvarlak kontrol.
- Mevcut denize bakan Vezir sahnesi 80px kısa şerittir; şehir adı canlıdır. Büyük dekor ve eylem önündeki özet kaldırılır. Devlet yoklaması üretimin altına taşınır.
- Gündem önce Vezirin arzı ve mevcut emri gösterir. Boş inşaat, dolu ambar, huzur ihtiyacı, boşta halk ve hazır şehir önerilerinin mevcut sırası aynıdır. Ustaların işi gerçek kalan süredir. Üç kaynak net üretimi dikey, okunur sayı sicilidir; ilim ortak v2 simgesidir.
- Şehir sicili uzun şehir adları, Divanhane seviyesi, gerçek nüfus/tavan, mevcut inşaat ve aktif şehir işaretiyle dikey akar. Şehir geçişi mevcut visitCity komutudur.
- Haberler son 20 gruplanmış kaydı günlere göre sunar; tekrar adedi ve saat korunur. Uzun haberler kırılır. Boş defter açıkça anlatılır; Şehir günlüğü bağlantısı korunur.
- 27-vizier.css kaldırılır; 72-vizier-register.css yalnız bp-vizier kapsamındadır. 47/50 ortak atlaslarında bu kapsam kullanılır. Diğer danışmanlar ayrı kalır.
- Ekonomi, danışman hesapları/öncelikleri, kayıt, motor, HUD, ada koordinatları ve dört ek ada açıklığı değişmez.

## Doğrulama

345 oyun testi, TypeScript, statik derleme, ESLint, CSS/kullanılmayan sınıf, V2 ve yarım boyut görsel kontrolleri. tools/vizier-qa.cjs ile 360/390/430px ve %130 yazı; beş öneri durumu, boş haberler, gruplu/uzun haberler, uzun adlı koloni ve üç sekme. Öncelikli emirlerin bina/inşa bağlantıları, koloniye geçişin kayda işlenmesi, imparatorluk özeti ve şehir günlüğü gerçek tıklamalarla doğrulanır. 108 hedefli mobil tarama temiz: taşma, kesilme, küçük hedef, minik yazı, çakışma, isimsiz kontrol, tarayıcı hatası ve eksik görsel yok. Rapor docs/vizier-qa-report.json; gerçek ekranlar docs/mockups/vizier-*.webp.

Genel düzen taramasının mevcut HUD küçük yazı/hedef bulguları ayrıca raporlanır; bu bölümün kontrolü bütün oyun için temiz QA iddiası değildir.
