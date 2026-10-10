# Şehir vakayinamesi — 0.97.0 / SW109

10 Ekim 2026. `MASTER-UI-STANDARD.md` güncel referanstır.

- Günlük `bp-journal bp-royal` kapsamındadır. 47/50 ortak yuvarlak geri/çarpı, ceviz, parşömen, altın köşeler ve kırmızı eylem atlasları kullanılır. `74-journal-register.css` yalnız bu sayfayı kaplar.
- Mevcut yazısız arşiv salonu 80px kısa şerittir. Şehir adı canlı yazıdır. Eski büyük sahne, ikinci şerit başlık ve yinelenen son olay kartı yerine tek vakayiname vardır.
- Önce arama; sekiz olay filtresi dört sütun ve iki sıra. Seçim kırmızı ipek, diğerleri ceviz; boyalı ikon, olay sayısı, 48px'den büyük dokunma alanı. Yatay taşma/kaydırma yok.
- Günler ceviz başlıklarda, olaylar dikey parşömen sicilinde. Tür, gerçek saat veya tekrar aralığı, olay metni ve tekrar sayısı HTML'dir. Başlık Tinos Bold, gövde Georgia; olay metni 16px, destek yazısı en az 14px.
- `groupLog`, `logKind`, `dayGroups`, Türkçe arama, filtre, 20'şer eski kayıt açma ve son 60 olay saklama aynı kalır. Günlük gezinmesi kaydı değiştirmez. Motor, ekonomi, kayıt biçimi, üst/alt HUD ve ada koordinatları korunur.
- Sürüm arşivinin sayfa düzeni korunur. Paylaşılan arama bileşeninde işlem değişikliği yok; kullanılmayan eski son olay CSS'i kaldırılır.

## Doğrulama

345 oyun testi; TypeScript, statik derleme, ESLint, CSS/kullanılmayan sınıf, V2 ve telefon boyu görsel kontrolleri. `tools/journal-qa.cjs`: 360/390/430px, normal ve %130 yazı, boş/dolu günlük, sekiz filtre, Türkçe büyük harfle arama, temizleme, sonuçsuz arama, bütün kayıtları gösterme, 20/40/son kayıt, gün/tekrar grupları ve kaydın değişmediği kontrolü. Rapor `docs/journal-qa-report.json`; gerçek ekranlar `docs/mockups/journal-*.webp`.

156 mobil tarama temiz: taşma, kesik, küçük hedef/yazı, çakışma, isimsiz kontrol, sayfa hatası ve eksik görsel yok. Üç genişlikte arama/filtre, eski kayıt, gün/tekrar gösterimi ve değişmeyen kayıt doğrulandı.

Genel oyun taramasının korunan HUD küçük hedef/yazı bulguları ayrıca raporlanır. Bu bölümün temiz kontrolü bütün oyun için temiz QA iddiası değildir.

Sonraki bölüm giriş ekranı. Yayın sonrası kullanıcı değerlendirmesinde dur.
