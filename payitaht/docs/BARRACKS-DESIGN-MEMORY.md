# Kışla detay tasarım belleği — 8 Ekim 2026

Sürüm 0.66.0 / SW74. `PROFILE-DESIGN-MEMORY.md` ana malzemeleri ve `MANDATES-DESIGN-MEMORY.md` yuvarlak saray düğmelerini tanımlar. Bu belge kışlanın aynı dilde devamıdır. Üst/alt HUD, asker ve bina çizimleri, eğitim/araştırma koşulları, maliyetler, süreler, garnizon ve kayıt mekanikleri değiştirilmez.

## Kaplama

`app/styles/49-barracks-register.css` yalnız `.bp-of-kisla` alanına uygulanır. Sayfa `bp-royal` ailesindedir; ikinci kaynak araç çubuğu gösterilmez. Kabul edilmiş HUD kaynakları kalır. 47 numaralı yuvarlak başlık kontrolü bu sayfaya da uygulanır. Yardım düğmesi başlıkta ayrı 48×48 alana sahiptir, başlık metni ve çarpı ona ayrılan boşluğu kullanmaz.

- Avlu: mevcut gerçek kışla resmi, telefonda 210 px ve geniş ekranda 260 px; üç seviye görünümü altta yatay sırada, gerçek mevcut seviye sağ üstte. Yardım açıldığında mevcut yapı araçları görünür.
- Avlunun altında ceviz/altın başlık bandı ve normal akışta açıklama. Kara ordusu/Gelişim iki eşit ceviz sekme; aktif alan koyu kırmızı.
- Birlik galerisi: yatay kaydırılan 132 px resimli ceviz plakalar, geniş ekranda 156 px. Seçili plaka kırmızı; araştırma/seviye kilidi gerçek veridir. İsimler sarılabilir, kırpılmaz. Birlik resmi kendi oranıyla korunur.
- Eğitim defteri: altın çerçeveli parşömen, ayrı portre/isim/elde sayısı; rol ve açıklama normal akışta. Savaş değerleri ve bakım görünür. Adet alanı, ilk/en fazla düğmeleri ve eğit eylemi en az 48 px dokunma alanı taşır. Maliyet ve süre ayrı satırda, altın eğitim düğmesi tam genişlikte.
- Eğitim sırası ve açılan ordu sicili aynı parşömen çerçevesindedir. Mevcut sıra, ilerleme ve savaş meydanı bilgisi canlı veridir.
- Gelişim: ceviz bölüm başlığı, parşömen seviye etkisi ve maliyet/süre tablosu. Mevcut tablolardaki hesaplar ve satırlar aynıdır.
- Yükseltme: sayfanın sabit alt alanı, HUD'un üstünde; gereksinimler, tam uyarı ve altın yükseltme düğmesi. Uzun içerik kendi alanında kaydırılır. Sayfa açıkken alt barın arkasındaki şehir parşömen maskesiyle örtülür; HUD değişmez.

Başlıklarda paketli Tinos Bold, gövdede Georgia; sıcak parşömen, koyu ceviz, eskitilmiş altın ve sınırlı kırmızı. Yeni Avrupa tacı, cam kart, neon ya da çizgi ikon eklenmez. Diğer bina sayfalarına bu kurallar kendiliğinden uygulanmaz; sırayla değerlendirilir.

## Kanıt

Gerçek mobil görüntüler `docs/mockups/barracks-*.webp` içinde; doğrulama `BARRACKS-VALIDATION.md` içindedir. Sonraki askeri sayfa bu belleği temel almalı; mantık bileşenleri yeniden yazılmamalıdır.
