# Saray ve Valilik — 0.91.0 / SW103

10 Ekim 2026: ortak kışla/Medrese defter dili, MASTER-UI-STANDARD.md geçerlidir. Eski yatay kaynak araç çubuğu, İmparatorluk tablosu ve sürekli alt yükseltme bloğu kaldırıldı. HUD değişmez.

## Düzen

- Saray: Koloniler/Gelişim. Koloni fermanında başkent hariç gerçek koloni sayısı, başkentteki Saray seviyesi, colonyPalaceLevel ile sonraki koloninin gerektirdiği seviye ve MAX_CITIES sınırı ayrı görünür. Saray şartı, bütün koloni şartları yerine geçmez: kaynak/filo/ada işlemi mevcut Şehirler ekranında kalır.
- Valilik: İdare/Gelişim. corruption(game) gerçek oranı büyük yazıyla gösterir. Başkent muafiyeti, koloni sayısı, Valilik seviyesi ve araştırma/yönetim biçimi etkisi açıklanır. Valilik seviyesi tek başına sıfır yolsuzluk vaadi değildir.
- Şehir sicili: başkent/koloni, Saray/Valilik, Divanhane ve gerçek yolsuzluk dikey kayıtlarda. Şehir yönetimi mevcut ekrana yönlenir.
- Yükseltme Gelişim'in ilk bloğudur; mevcut komut, eksik kaynak, aktif sıra ve son seviye korunur. Ardından seviye etkisi, sonraki seviyeler, açıklama ve açılır yapı işlemleri gelir.
- Ortak 47/50 numaralı stillere bp-palace eklenmiştir; 68-palace-register.css yalnız bu bina çiftindeki metin akışını ve sicili düzenler.
- Motor, ekonomi, kayıt biçimi, dört ek ada yerleşim açıklığı ve üst/alt HUD korunur.

## Sahne üretimi

Yerleşik image_gen kullanıldı. Sahne kaynakları 2048×683, oyunda 1200×400 WebP:

- public/images/game/ui/palace/saray.webp
- public/images/game/ui/palace/valilik.webp

Her ikisi de yeni yazısız sahnedir; onaylı ceviz/parşömen/altın atlasları yeniden üretilmedi. Alt menü maskesi ortak parşömenle devam eder.

Saray prompt: “Use case: historical-scene. Asset type: wide landscape banner for Payitaht Ottoman Aegean mobile strategy game's palace building page. Create a premium painterly realistic game environment, 3:1 panoramic landscape. A dignified Ottoman palace administrative courtyard on an Aegean headland: ivory limestone colonnades, restrained terracotta and lead blue domes, a walnut desk with sealed scrolls and brass inkpot in foreground, two modest turbaned officials discussing distant island settlements, olive and cypress, turquoise sea with tiny Ottoman sailing ships in background. Warm upper-left daylight, soft lower-right shadows. Carefully composed for a very shallow horizontal crop, important desk and palace in middle horizontal band. One coherent fine historical game painting, muted colors, warm material textures, no fantasy European crowns, no modern elements, no text, lettering, logos, watermarks or UI. This is an illustration for the palace's expansion ledger, not a UI mockup.”

Valilik prompt: “Use case: historical-scene. Asset type: landscape banner for Payitaht Ottoman Aegean mobile strategy governor residence page. Premium painterly realistic historical game environment, wide 3:1 panoramic landscape. Ottoman governor's provincial island residence veranda, ivory limestone arch framing a small terracotta roof harbor town and turquoise Aegean bay. In the foreground central horizontal band, modest turbaned Ottoman governor and a scribe examining a bound fiscal ledger, brass scales, sealed scrolls on a walnut administration desk. A few citizens waiting peacefully in the courtyard, cypress and olive foliage. Distinct from an imperial palace: local orderly island administration and modest noble residence. Warm upper-left daylight, soft lower-right shadows, muted warm earth colors, lead-blue roof accents. Fine realistic stylized game painting with high material detail, unified Ottoman Aegean visual style. Compose essential people and desk within center horizontal band for shallow banner crop. No text, lettering, logo, watermark, UI, modern objects, European crowns, cartoon outlines or neon.”

## Kontrol

345 test, typecheck, ESLint, CSS kontrolleri, V2 ölçütleri, görsel yarım boyut kontrolü ve statik üretim geçti. 34 hedefli ekran taraması sıfır bulgu ve sıfır tarayıcı hatasıyla tamamlandı. Hedefli ölçüm raporu docs/palace-qa-report.json; gerçek görüntüler docs/mockups/palace-*.webp. Üç şehirli geçerli kayıt üzerinden başkent ve koloni, 360/390/430px, %130 yazı, boş kaynak, süren inşaat, son seviye ve kurulmamış yapı taranır. Şehirler bağlantısı ve gerçek yükseltme komutu ayrıca çalıştırılır. Genel taramada onaylı HUD'un kompakt yazı/hedef bulguları kapatılmaz.

Genel yerleşim taraması: taşma 0, kesik 0, çakışma 0, adsız hedef 0, tarayıcı hatası 0. Genel raporda 312 küçük hedef ve 665 küçük yazı uyarısı kalır; bu taramanın çıkış kodu bu nedenle sıfır değildir. Saray/Valilik ana sayfaları hem normal hem %130 yazıda temizdir.

İlerleme durumunda Base UI Progress, role=presentation ve inset(50%) kırpmasıyla 1×1px gizli “x” öğesi ekler. Tarama yalnız bu görünmez dekoratif öğeyi metin kesilmesi saymaz; görünür kırpılmış metin ve diğer denetimler korunur. Bilerek bozuk taşma/hedef/yazı/çakışma/adsız düğme öz-denetimi tekrar çalıştırılır.
