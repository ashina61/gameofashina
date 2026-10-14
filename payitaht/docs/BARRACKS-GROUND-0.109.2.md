# Kışla zemin birleşimi — 0.109.2 / SW127

15 Ekim 2026. Kullanıcı canlı 0.109.1 karesinde ayrı toprak plakası ve basık mimariyi reddetti, düzeltme istedi.

Kışla artık opak bir tam-parsel modülü değildir. master-v6/kisla tam/telefon WebP dosyaları gerçek alfa içerir: dış zemin, çiçek bordürü ve avlu toprağı kaldırıldı. Mevcut şehir zemini, avlu dahil çizimin boşluklarından görünür. Mimari, dört kule ve kalkan/kılıç kimliğini korur.

MASTER_BUILDING_CUTOUTS kışlayı tam-parsel mesh yolundan ayırır. masterArtFrame'in oranı koruyan dikdörtgeni, kaldırım iç poligonunun dört kenarıyla sınanır. Görselin tamamı uniform ölçekte yerleşir; çatı kırpılmaz ve doku karoya esnetilmez. Hazır çizime ek yapay gölge konmaz. Diğer 35 yapı bu değişiklikte dönüştürülmedi; bunların farklı mimari ve zemin sorunları ayrı iş olarak sürer. Kayıt, yerleşim indeksleri, seviyeler, ekonomi, HUD ve yollar değişmez.

355 test, tip kontrolü, ESLint/CSS, V2 ve telefon görselleri kontrolleri ile statik export geçti. Güncellenen varlık/geometri testi her karoda gerçek alfa, görünür mimari, kaynakla eşit en-boy oranı ve kaldırım iç sınırlarında yerleşimi doğrular. 390×844 DPR2 gerçek oyun görüntüsünde toprak dikdörtgeninin kalktığı ve özgün avlu zemininin göründüğü incelendi. Bu kontrol yalnız kışla düzeltmesini değerlendirir; bütün şehir görsel uyumu tamamlandı denmez.
