# Boyalı giriş defteri — 0.98.0 / SW110

10 Ekim 2026. `MASTER-UI-STANDARD.md` güncel referanstır.

- Giriş `title-screen title-painted` kapsamındadır. Mevcut yazısız Osmanlı–Ege açılış resmi ve logo plakası korunur. Ana menü ceviz, parşömen, işlemeli altın köşeler ve kırmızı ana eylem atlasları kullanır; yeşil/cam görünümü kaldırılır.
- `75-title-register.css` yalnız giriş ekranını kaplar. Tinos Bold başlıklar, Georgia gövde; destek metni 14px, form 16px, eylemler 52px ve üzeri. Uzun hükümdar/başkent adları satıra bölünür. Çevrimdışı kayıt ve yapay rakip açıklaması okunur.
- Kayıt sicili ortak eğitim kağıdı/çerçevesidir. Yeni oyun formu, Nasıl oynanır ve açılıştaki sürüm notları aynı atlaslarda; yardımcı sayfalarda büyük logo tekrar gösterilmez. Uzun içerik tek dış kaydırma içinde akar.
- Girişte eski SVG arma yerine ortak `RoyalCrest` işlemeli WebP kullanılır. Arma ve renk seçimi dört sütun; 12 arma/12 renk, tek seçili durum, çerçeve ve kırmızı ipek. Seçili renk canlı arma zeminidir; mevcut profil kaydına aynı değerler yazılır.
- Yeni oyun formunda hükümdar/başkent adı, ad doğrulaması ve eski kaydı silme onayı mevcut `begin`, `setProfile`, `renameCity`, `startNewGame` akışlarıyla çalışır. Devam et mevcut kaydı açar. Yardım, sürüm araması ve açma/kapama aynıdır.
- Kayıt okuma, bozuk kayıt koruması ve silme/onay kuralları değişmez. Motor, ekonomi, kayıt biçimi, oyun içi HUD ve ada koordinatları korunur. Yardımcı ekrandan vazgeçmek kayıt yazmaz.

## Doğrulama

345 oyun testi; TypeScript, statik derleme, ESLint, CSS/kullanılmayan sınıf, V2 ve telefon boyu görsel kontrolleri. `tools/title-qa.cjs`: 360×740, 390×844 ve 430×932, normal ve %130 yazı; boş, mevcut, okunamayan kayıt ve eski kaydı değiştirme durumları. Yardım, sürüm arama, aç/kapat, sonuçsuz arama ve temizleme; 12 arma/12 renk, ad hatası, silme onayı/vazgeçme, devam ve yeni oyun kontrol edilir. Her işlem yalıtılmış deneme kaydıyla yürür. Rapor `docs/title-qa-report.json`; gerçek ekranlar `docs/mockups/title-*-390.webp`.

162 mobil tarama temiz: taşma, kesik, küçük hedef/yazı, çakışma, isimsiz kontrol, sayfa hatası ve eksik görsel yok. 24 akış sonucu; yardımcı sayfalarda gerçek atlas çerçevesi ve sıfır köşe yarıçapı ayrıca doğrulandı.

Genel taramanın korunan HUD bulguları ayrıca raporlanır. Girişin temiz kontrolü bütün oyun için temiz QA iddiası değildir.

Sonraki bölüm bütün sayfalarda son tutarlılık denetimi. Yayın sonrası kullanıcı değerlendirmesinde dur.
