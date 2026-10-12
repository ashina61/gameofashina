# Şehir zemini ve kahvehane — 0.104.0 / SW118

12 Ekim 2026. Kullanıcının bildirdiği sorun: bina keskin, zemin bulanık; eski kahvehane arsayı doldurmuyor. Önceki "tam oturdu" değerlendirmesi bütün bina kataloğu için geçerli değildi.

## Değişiklik

Eski 1536×1024 master dört 768×512 bölgeye ayrıldı; her bölge imagegen ile 1536×1024 olarak ayrıntılandırıldı. Phaser aynı dünya koordinatlarında toplam 3072×2048 kaynak kullanır: dört kat piksel. Yeni taş, toprak, bitki ve su ayrıntısı üretildi. Yol ve parsel projeksiyonu, indeksler, motor ve kayıt değişmez. Eksik dokuda eski master altta kalır. Deniz/orman uzantıları yeni dokulardan alınır.

`public/images/game/terrain/master-detail-v1/{nw,ne,sw,se}.webp`: toplam yaklaşık 3 MiB aktarım ve 24 MiB açılmış RGBA doku. Gerçek telefon pil/ısı ölçümü yapılmadı.

Yeni kahvehane: geniş oturma avlusu, alçak kiremit çatılar, bakır takımlar ve giriş merdiveni. `public/images/game/buildings/master-v3/kahvehane.webp` (1280px), `kahvehane-sm.webp` (640px). Şeffaf dış kenarlar trimlendi, alpha korunarak WebP kodlandı. Şehir/katalog/önizleme ortak `masterBuildingImage` kullanır. Yedi bina master modülü kullanıyor; diğer eski yapılar henüz bu aileye geçirilmedi.

## Üretim promptları

Built-in imagegen kullanıldı. Dört çeyrek için aynı şablon:

> Faithful 2x detailed redraw of exactly the supplied quadrant in 1536×1024. Keep normalized geometry and all four outer edges, every road centerline/width/junction, empty rectangular clearings, boundary stones, waterline, docks and defense trench. Resolve limestone paving, soil/gravel, tiny grasses, leaves, cliffs and water ripples. Premium realistic stylized Ottoman–Aegean environment, original upper-left light. No reframing, new roads, slots, buildings, walls, text or UI.

Kahvehane: eski `kahvehane-painted-3.webp` mimari referans; master `medrese.webp` kamera/parsel referansı:

> One transparent complete Ottoman coffeehouse and functional coffee courtyard module. Preserve tile roofs, timber/ivory walls, carved veranda, cushions and copper coffee trays. High downward orthographic camera, horizontal front/back parcel edges, complete silhouette about 2:1. Low roof wings and broad seating courtyard fill the parcel. All eaves, stairs, shrubs and small shadows inside the compact rectangle. Warm upper-left light; no detached base, surrounding roads/landscape, text or UI; no clipping or large transparent margins.

## Kontroller

350 test, TypeScript, ESLint, CSS, V2 ölçütleri, telefon görsel boyları ve Pages alt yoluyla statik derleme geçti. Gerçek Phaser 360/390/430px: yedi yapı, farklı parseller/seviyeler, yeni inşaat iskelesi. Ölçülen görsellerde taşma, JS hatası ve eksik varlık sıfır.

Zoom testi artık imleci tuvale koyar ve kamera yakınlaştırmasının gerçekten değiştiğini doğrular. Önceki betik wheel olayını doğrulamadan başarı sayıyordu. Sokak kanıtı `docs/mockups/master-detail/coffee-street-360.webp`; parça birleşimleri ayrıca tam haritada gözle incelendi. İnce doku farklılıkları matematiksel piksel eşitliği iddiası değildir.

Genel layout betiği bu ortamda öz-denetimde durdu: bilerek eklenen minik yazı ve çakışma örneklerini görmedi. Şehir/giriş taraması taşma, kesik, çakışma ve isimsiz öğe sıfır; şehir HUD'unda 4 küçük düğme/2 küçük yazı uyarısı var. Tüm sayfaların kontrolü tamamlandı veya yeşil diye kabul edilmez. Ayrıntı `docs/mockups/master-detail/layout-result.json` içinde.

Tekrar: önce statik derleme, sonra `node tools/master-release-qa.cjs`. `RUN_LAYOUT=1` bütün sayfalarda layout kontrolünü ekler. Ekonomi, kayıtlı bina yerleri, seviyeler ve HUD korunur.
