# Sur ve kapı yeniden çizimi

11 Ekim 2026, yayımlanmamış 0.102.0 / SW116 inceleme dalı.

Önceki sur denemesi kullanıcı tarafından reddedildi: dik kenarlar merdivene benziyor, kapı cepheden yapıştırılmış küçük bir kale gibi duruyordu. Önceki teknik testler bu görsel kusurları yakalamadı. `wall-gate-followup` görüntüleri eski, reddedilen denemedir; yeni görüntüler `mockups/wall-redesign-final` altındadır.

Sur artık eski izometrik segment resmini eğime göre sıkıştırmaz. Yeni boyalı taş materyali gerçek gövde, üst yürüyüş yolu, eğimli taş temel ve mazgal yüzeylerine uygulanır. Ara parça birleşimlerinde tam boy uç yüzü çizilmez. Mazgal aralığı halka boyunca ortak yay mesafesinden gelir; parçaya bölünmek fazladan mazgal oluşturmaz. Hafif zemin gölgesi yüksekliği belirtir. Kırmızı kuşaklar, her kısa parçada sancak ve basamak gibi tekrarlanan ayaklar kaldırıldı.

Yan kara kapıları için ayrı, dik yönde çizilmiş iki yuvarlak kuleli kapı kullanılır. Kuzey kapısının kendi cephe çizimi vardır. İkisi de doğal en-boy oranında, geçit zemin noktasına oturur. Kapının ayak derinliğine sur yüksekliği eklenerek komşu yükseltilmiş duvar yüzeylerinin kule gövdelerini örtmesi önlenir. Kuleler aynı yeni taş/kurşuni mazgal dilini kullanır. Sancaklar ayrı oyun katmanıdır. Eski sur PNG/WebP parçaları yüklenmez.

## Yeni oyun görselleri

Built-in ImageGen ile üretildi; şeffaf kapı ve kulelerin alpha kanalı korunarak görünür nesne sınırına kırpıldı ve WebP olarak sıkıştırıldı. Sanatsal biçim üretici tarafından çizildi. Ara çalışma dosyaları oyunda kullanılmaz.

| Dosya | İşlev |
| --- | --- |
| `public/images/game/walls/stone-material.webp` | Kesintisiz taş yüzeyi, 256×128 |
| `public/images/game/walls/gate-side.webp` | Dik sur kenarında yan kapı |
| `public/images/game/walls/gate-front.webp` | Kuzey kapısı |
| `public/images/game/walls/tower-round.webp` | Yuvarlak mazgallı burç |

## Üretim brifleri

**Taş materyali:** seamless square painted stone material for a premium Ottoman–Aegean city fortification; flat orthographic limestone masonry, edge-to-edge only stonework. Warm muted ivory/sandy grey dressed rectangular blocks, slender recessed mortar, staggered courses, subtle pores and wear. Uniform daylight, approximately 8 blocks across and 12 courses tall. No perspective, silhouettes, red stripes, banners, pillars, text or watermark. Opaque.

**Yan kapı:** transparent compact north-south Ottoman gate sprite, road passes left-to-right. Far tower above, near tower below, ground contact centres on the same vertical centreline. Elevated approximately 45-degree isometric view. Ivory cut limestone, two round open crenellated towers, pointed tunnel on the right side, slate-grey coping, warm upper-left light. No wall wings, road slab, ground platform, flags, red stripes, roofs, domes, text or outlines. First camera attempt revised with the same architecture as image reference.

**Cephe kapısı:** same limestone/slate architecture as side gate, low round towers flanking one wide pointed arch. Elevated 2:1 three-quarter front view; ground contacts shallow lower-left/upper-right diagonal, road enters bottom-to-top. No wall wings, ground slab, banners, roofs or domes. Background extraction follow-up preserves architecture and removes background inside open arch. Actual alpha.

**Burç:** one isolated compact round limestone watchtower, elevated 2:1 isometric camera, warm upper-left daylight. Ivory dressed stone, height about 1.6 diameters, open circular terrace, eight square crenellations with slate-grey caps, pointed arrow slits, slightly wider stone base. No roof, dome, stripes, flags, wall wings, ground, glow or text. Actual alpha.

## Korunanlar

Temel halkası, arsa koordinatları, kapı merkezleri ve açıklıkları, savunma yuvaları, seviye eşikleri, inşa, tıklama, ekonomi, kayıt ve onaylı HUD korunur. Değişiklik görseldir. Seviye kademeleri gövde ve mazgal yüksekliği/kapı ölçeğiyle ayrılır. Canvas dere yarıçapı düzeltmesi korunur. Kapı seviye madalyonunda Canvas metin çözünürlüğü 1 kullanılır; çift çözünürlük sayıyı dairenin dışına kaydırıyordu. WebGL çözünürlüğü 2 kalır. Canlı yayın yok; PR #77 inceleme dalında.

## Doğrulama

Gerçek oyun, gelişmiş şehir kaydı `tools/fixtures/late-game.json`, 390×844 telefon, yakın yan kapı ve genel sur görünümü. Sanat denetiminde kayıt zamanı sabitlenir ve yalnız test kopyasındaki baskın zamanları ertelenir ve dünya başlangıcı aynı test saatine alınır; test diplomasisi barışçıldır; işgal kampı kapıyı örtmez. WebGL ve zorlanmış Canvas ayrı kontrol edilir. Matematik testi, keyfî parça/kapı kesimlerinde mazgal kaplamasının bölünmeden öncekiyle aynı kaldığını doğrular.

Sonuç: 346 oyun testi, TypeScript, ESLint, V2 ölçütleri ve statik üretim derlemesi geçti. Her iki çizim motorunda kuzey kapısı, yan kapı ve genel sur için altı gerçek oyun karesi incelendi; sayfa hatası ve eksik ağ kaynağı yok. Bu sonuç görsel kullanıcı onayı yerine geçmez; canlı yayın yapılmadı.
