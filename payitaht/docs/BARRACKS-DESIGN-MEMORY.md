## Son kullanıcı düzeltmesi — 0.68.0 / SW77

0.67.0 kullanıcı tarafından çizime benzemediği için reddedildi. Renklerin benzemesi yeterli değildir: yakın plan portre, işlemeli çerçeve, temiz açık parşömen ve kırmızı kumaş eylem doğrudan görsel malzemeyle uygulanır. Onaylı çizim hâlâ `mockups/approved-barracks-vertical-slider.webp`.

`mockups/barracks-clean-skin.webp` bunun metinsiz uygulama atlasıdır; koordinatlar `barracks-skin-atlas.json`. Çerçevenin üst/sol kenarları portre içermeyen alt/sağ kenarlardan yansıtılır; içi doldurulmaz. Yeniçeri, okçu ve sipahi yakın plan portreleri ayrı assettir. Diğer birliklerin mevcut figürleri korunur. Tüm yazı, maliyet, süre, limit ve eğitim ilerlemesi gerçek HTML/oyun verisidir.

Birlikler alt alta; sadece üretim adedi barı sağa sola sürüklenir. Gelişim, seviye etkisi/maliyet tablosu, yükseltme, birlik bilgisi, eğitim sırası, ordu durumu ve savaş meydanı aynı malzemeleri kullanır. Ana alt menünün Şehir/ Ada/Harita/İttifak/Görevler sekmeleri korunur; kabul edilmiş HUD dosyaları değiştirilmez. Bu görsel giydirme oyun kurallarını değiştirmez.

# Güncel onay — dikey birlikler ve yatay adet barı, 8 Ekim 2026

**0.67.0 / SW76.** Adem bu görseli onayladı ve uygulamaya geçirme/kalıcı kaydetme talimatı verdi: `mockups/approved-barracks-vertical-slider.webp`. Görseli açmadan sonraki değişikliği yapma. Aşağıdaki eski 0.66.1 galeri ve altın eğitim butonu tarifleri bu onayla değiştirilmiştir.

- Birlikler **alt alta**. Birliğe dokununca eğitim alanı aynı satırın altında açılır. Birlik seçimi için yatay galeri veya yana kayan portreler kullanılmaz.
- Sağa/sola sürüklenen öğe **üretim adedi barıdır**. Yuvarlak pirinç tutamak, ahşap kanal ve altın dolgu; sayı girişi, yuvarlak −/+ ve Maks. eşlik eder. Mevcut en fazla hesabı/koşullar kullanılır.
- Kara ordusu/Gelişim korunur. Kara ordusu simgesi yeniçeri/börk; Sparta/Roma miğferi ve Avrupa tacı yok.
- Aynı saray ailesi: fildişi parşömen, koyu ceviz, eskitilmiş pirinç işlemeli köşeler; ayrı yuvarlak geri/çarpı, yuvarlak adet kontrolleri, kırmızı askerî eğitim eylemi. Başlıklarda paketli Tinos Bold, gövdede Georgia.
- **Gelişim mevcut işlev ve düzeniyle kalır.** Üst/alt HUD onaylıdır; mockup'ın HUD'u kopyalanmaz veya yeniden çizilmez. Ortak sayfa çerçevesi, parşömen, ahşap ve düğme kenarları mevcut `approved-court` assetlerinden gelir.
- Ana eğitim ekranında kısa 64px avlu bandı vardır; büyük seviye önizlemesi hâlâ Gelişim'de isteğe bağlıdır. Tekrar eden portre/isim ve savaş değerleri seçili satırda bilgi detayına açılır. Hiçbir özellik kaybolmaz.
- Bütün birlikler, kilit/araştırma koşulları, maliyet, süre, asker sayısı ve sıra canlı veridir. Görseldeki 120/20/50/1.200 gibi sayılar uygulamada sabitlenmez. Sıra iptali gibi mockup'ta çizilmiş fakat oyunda olmayan mekanik eklenmez.
- Birlik satırları ve üretim tek dikey sayfa akışındadır. İşlem düğmesi seçili birliğin kendi eğitim alanında kalır; alttaki başka bir birliğin düğmesiymiş gibi görünmez. Uzun birlik listesi normal dikey kaydırılır.

Kalıcı uygulama: `components/game/game-panels.tsx` (yalnız Kışla için roster ve compact eğitim), `components/game/building-page.tsx` (kısa avlu/yeniçeri sekme simgesi), `app/styles/49-barracks-register.css`. Tersane/Elçilik galerileri ve ekonomi/kayıt kuralları korunur.

---

# Kışla detay tasarım belleği — 8 Ekim 2026

Sürüm 0.66.1 / SW75. `PROFILE-DESIGN-MEMORY.md` ana malzemeleri ve `MANDATES-DESIGN-MEMORY.md` yuvarlak saray düğmelerini tanımlar. Bu belge kışlanın aynı dilde devamıdır. Üst/alt HUD, asker ve bina çizimleri, eğitim/araştırma koşulları, maliyetler, süreler, garnizon ve kayıt mekanikleri değiştirilmez.

## Kaplama

`app/styles/49-barracks-register.css` yalnız `.bp-of-kisla` alanına uygulanır. Sayfa `bp-royal` ailesindedir; ikinci kaynak araç çubuğu gösterilmez. Kabul edilmiş HUD kaynakları kalır. 47 numaralı yuvarlak başlık kontrolü bu sayfaya da uygulanır. Yardım düğmesi başlıkta ayrı 48×48 alana sahiptir, başlık metni ve çarpı ona ayrılan boşluğu kullanmaz.

- Avlu: Gelişim sekmesinde isteğe bağlı açılan yapı görünümüdür. İlk eğitim ekranında yer kaplamaz. Mevcut gerçek kışla resmi, telefonda 210 px ve geniş ekranda 260 px; üç seviye görünümü altta yatay sırada, gerçek mevcut seviye sağ üstte. Yardım açıldığında mevcut yapı araçları görünür.
- Kışla doğrudan Kara ordusu ile açılır. Yinelenen Kışla bandı kaldırılmıştır. Genel yapı ve birlik açıklamaları yardım açıldığında görünür. Kara ordusu/Gelişim iki eşit ceviz sekme; aktif alan koyu kırmızı. Sekmeler kaydırırken üstte erişilebilir kalır.
- Birlik galerisi: yatay kaydırılan 108 px resimli ceviz plakalar, geniş ekranda 124 px. Seçili plaka kırmızı; araştırma/seviye kilidi gerçek veridir. İsimler sarılabilir, kırpılmaz. Galeride tekrar eden savaş değerleri gizlidir; seçili birliğin canlı eğitim kartında bütün değerler korunur. Birlik resmi kendi oranıyla korunur.
- Eğitim defteri: altın çerçeveli parşömen, ayrı portre/isim/elde sayısı; rol ve açıklama normal akışta. Savaş değerleri ve bakım görünür. Adet alanı, ilk/en fazla düğmeleri ve eğit eylemi en az 48 px dokunma alanı taşır. Maliyet ve süre ayrı satırda, altın eğitim düğmesi tam genişlikte.
- Eğitim sırası ve açılan ordu sicili aynı parşömen çerçevesindedir. Mevcut sıra, ilerleme ve savaş meydanı bilgisi canlı veridir.
- Gelişim: ceviz bölüm başlığı, parşömen seviye etkisi ve maliyet/süre tablosu. Mevcut tablolardaki hesaplar ve satırlar aynıdır.
- Yükseltme: yalnız Gelişim sekmesinin normal akışında; gereksinimler, tam uyarı ve altın yükseltme düğmesi. Kara ordusu ekranında sabit alt kutu yoktur. Uzun içerik tek sayfa kaydırıcısındadır. Sayfa açıkken alt barın arkasındaki şehir parşömen maskesiyle örtülür; HUD değişmez.

Başlıklarda paketli Tinos Bold, gövdede Georgia; sıcak parşömen, koyu ceviz, eskitilmiş altın ve sınırlı kırmızı. Yeni Avrupa tacı, cam kart, neon ya da çizgi ikon eklenmez. Diğer bina sayfalarına bu kurallar kendiliğinden uygulanmaz; sırayla değerlendirilir.

## Kanıt

Gerçek mobil görüntüler `docs/mockups/barracks-*.webp` içinde; doğrulama `BARRACKS-VALIDATION.md` içindedir. Sonraki askeri sayfa bu belleği temel almalı; mantık bileşenleri yeniden yazılmamalıdır.

## Alan kullanımını koruma — kullanıcının 8 Ekim düzeltmesi

0.66.0 düzeni, sabit 180 px yükseltme ve ilk ekrandaki büyük avlu nedeniyle kullanıcı tarafından dar bulundu. Gelecek sayfalarda bu düzen tekrarlanmaz. Oyun eylemi önce gelir; dekorasyon ve bina gelişimi ana eylemin yerini kaplamaz. 390×844 ekranda kışlanın ana kaydırma alanı 584 px; yaklaşık 180 px ek alan kazanıldı. Eğitim kartının metinleri ve kontrolleri küçültülerek alan kazanılmadı: tekrarlar kaldırıldı ve destek bilgileri yardım/gelişim altında toplandı. Üst ve alt HUD kabul edildiği ölçüde korunur.
