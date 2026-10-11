# Payitaht City System V3 — Ikariam yaklaşımının modern uyarlaması

> Yalnız `prototype/city-base-v1` dalı için tasarım/uygulama şartnamesi. Canlı oyun motoru, save biçimi ve ana dal değiştirilmez.

## 1. Kaynak gerçekliği

Mevcut Payitaht city-map/live-adapter sözleşmesi:

- `index 0` → `city_hall`, sabit Belediye.
- `index 1..24` → 24 taşınabilir kara şehir arsası.
- `index 25..27` → 3 kıyı arsası.
- `index 28` → korsan adası.
- Savunma noktaları motor arsası değildir; yalnız dünya/zemin katmanıdır.
- Normal footprint: 2×2 tile.
- Tile: 128×64 izometrik.

Bu sözleşme prototipte korunur. Yeni görsel sistem yalnız render/projection katmanıdır.

## 2. Ana prensip

Ikariam'daki güçlü yaklaşım modernleştirilir:

`SAVE / ENGINE POSITION` → `LOGICAL SLOT` → `INVISIBLE DISTRICT ANCHOR` → `VISUAL YARD` → `BUILDING ART`

Oyuncu slot elması, debug grid veya çıplak arsa görmez. Bir slot boşken ilgili mahalle doğal çevre/dekor olarak görünür; bina kurulunca aynı anchor üzerinde bina + avlu + temas gölgesi görünür.

## 3. Dünya katmanları

Sabit render sırası:

1. SKY / FAR COAST — uzak dağlar, sis, ada silüetleri.
2. DEEP WATER — hareketli açık deniz.
3. SHALLOW WATER — kıyı turkuazı, liman suyu.
4. COAST FOAM — kıyı köpüğü ve kırılma maskesi.
5. TERRAIN BASE — kaya kütlesi / plato / toprak / çim.
6. RIVER BED — taş, kum, kıyı bitkisi.
7. RIVER WATER — akış maskesi ve köpük parçacıkları.
8. ROADS / PLAZA / QUAY — doğal yol ağı, meydan, rıhtım.
9. DISTRICT YARDS — görünmez slotlara bağlı ortak avlu tabanları.
10. BUILDINGS — y-sort ile gerçek oyuncu yapıları.
11. LIFE — halk, kervan, asker, liman işçisi.
12. FOREGROUND DECOR — ağaç, duvar, çalı, ön plan kayaları.
13. ATMOSPHERE — duman, kuş, ışık, sis.
14. HUD — dünya kamerasından bağımsız.

## 4. Belediye gelişim fazları

Belediye seviyesi görsel dünyayı geliştirir; motor mekaniğini değiştirmez.

### Faz A — Seviye 1–4 / Yerleşim
- dar toprak yollar
- az dekor ev
- küçük iskele
- düşük halk yoğunluğu
- seyrek ağaç temizliği

### Faz B — Seviye 5–9 / Kasaba
- ana yollar belirginleşir
- merkez meydan taş döşemeye başlar
- ilk çeşme / küçük pazar dolguları
- rıhtım uzar

### Faz C — Seviye 10–14 / Şehir
- ikincil sokaklar
- daha fazla dolgu ev/avlu
- taş köprü ve düzenli kıyı
- mahalle dekoru artar

### Faz D — Seviye 15–19 / Büyük Şehir
- ana yollar tamamen taş
- meydan, bahçe, çeşme, anıt detayları
- liman yoğunluğu ve trafik artar
- sur çevresi zenginleşir

### Faz E — Seviye 20+ / Payitaht
- premium taş yol/rıhtım
- yoğun mahalle dolgusu
- büyük meydan peyzajı
- daha çok NPC, kervan, sancak ve liman faaliyeti
- uzak silüette yoğun kent dokusu

Not: Bu fazlar gerçek bina slotlarının sayısını veya koordinat kimliğini değiştirmez.

## 5. Anchor semantiği

Her logical slot aşağıdaki görsel metayı alır:

- `slotId`
- `engineIndex`
- `district` (`merkez`, `kuzey`, `dogu`, `guney`, `bati`, `liman`)
- `visualAnchor` (prototip dünya koordinatı)
- `yardRadius`
- `roadSocket`
- `preferredFacing`
- `lifePreset`
- `occlusionBand`

Anchor görsel kompozisyon için yeniden projekte edilebilir; engine index değişmez.

## 6. Kıyı özel alanları

Kara binaları ile kıyı binaları aynı davranmaz.

- `coast_01..03`: liman/tersane/donanma gibi suyla temas eden yapılara ayrılmış görsel pad.
- `islet_01`: korsan adası; kendi kıyı/deniz maskesine sahip.
- Savunma noktaları: bina slotu değil, sur/kule/kapı dünya katmanı.

Kıyı yapıları için ayrı anchor, ayrı scale ve ayrı su temas gölgesi kullanılır.

## 7. Su sistemi

### Deniz
- iki düşük frekanslı scrolling normal/noise katmanı
- kıyıda foam mask
- açık denizde glint parçacıkları
- limanda daha düşük amplitude
- kamera uzaklığında LOD azaltımı

### Nehir
- sabit taş yatak
- direction field / spline boyunca kayan akış dokusu
- daralan bölgelerde daha yüksek hız
- şelalede ayrı düşüş sprite/mesh ve köpük
- nehir ağzında deniz maskesiyle blend

Su fiziği yok; tüm sistem görsel render animasyonudur.

## 8. Yaşayan şehir

NPC rota grafiği slot grafiğinden ayrıdır.

- Halk: ana ve tali yollarda yürür.
- Kervan: uzun ana rota / kapı ↔ çarşı ↔ liman.
- Kışla: bina varsa yakınında talim preset'i.
- Medrese: öğrenci/âlim preset'i.
- Çarşı: satıcı/taşıyıcı preset'i.
- Depo: hamal ve yük preset'i.
- Liman: hamal, sandal, gemi ve vinç preset'i.

Uzak zoom'da NPC yoğunluğu düşürülür.

## 9. Kamera

- Dünya HUD'dan bağımsız pan/zoom olur.
- Telefon açılışı yakın `CITY` kadrajıdır.
- `OVERVIEW` tüm şehir + kıyıyı gösterir.
- Kamera dünya sınırlarında clamp edilir; ekranın yarısı boş deniz kalmaz.
- Pinch yalnız dünya katmanını yakınlaştırır; HUD sabit kalır.

## 10. Uygulama sırası

1. City Base final terrain art direction.
2. Hareketli deniz + nehir + şelale.
3. Invisible district anchor map.
4. Belediye seviye fazları ve dekor yoğunluğu.
5. 3 kıyı pad + korsan adası + savunma dünya katmanı.
6. 3–5 test binasının anchor'a oturtulması.
7. Contact shadow / yard / y-sort standardı.
8. NPC road graph ve yaşam preset'leri.
9. Mobil LOD / culling / pooling.
10. Görsel onaydan sonra canlı sisteme adaptasyon değerlendirmesi.

## 11. Kırmızı çizgiler

- Ana dala push/merge yok.
- `engine.ts`, save schema, ekonomi, inşaat süreleri ve bina mekanikleri değişmez.
- Slot/grid oyuncuya gösterilmez.
- Gameforge/Ikariam assetleri kopyalanmaz.
- Görsel sistem Osmanlı–Ege Payitaht sanat dilinde özgün üretilir.
