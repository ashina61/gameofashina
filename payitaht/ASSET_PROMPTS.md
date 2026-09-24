# Boyalı bina istemleri (prompt paketi)

Oyundaki yeni tarz, `assets/source/painted/` altındaki **konut-houses.png** ve
**surlar-gate.png** ile belirlendi: zengin detaylı, altın saat ışığında boyanmış
izometrik Osmanlı-Akdeniz yapıları. Kalan binalar AYNI tarzda üretilince oyuna
otomatik oturur.

## Nasıl kullanılır

1. Aşağıdaki **ORTAK STİL** metnini her istemin sonuna ekle (ChatGPT/gpt-image,
   Midjourney, Leonardo…). Midjourney kullanıyorsan `konut-houses.png`'yi stil
   referansı (`--sref`) olarak ver.
2. Her bina için 3 aşama üret: **1** = küçük/yeni (sv. 1-3), **2** = gelişmiş
   (sv. 4-7), **3** = görkemli (sv. 8+). Aşamaların taban karesi AYNI boyda
   kalmalı; büyüyen şey binanın kendisi.
3. Dosyaları `assets/source/painted/buildings/<id>-<aşama>.png` adıyla koy
   (ör. `cami-1.png`, `cami-2.png`, `cami-3.png`) ve çalıştır:
   `python3 tools/art/import-ui.py`. Betik tabanı oyunun 2x2 arsasına oturtur.
   Tek aşama verirsen diğer aşamalar ondan doldurulur.

**Kurallar:** saydam arka plan (PNG), kare 1254x1254 ya da daha büyük, yapı
tabanı ELMAS biçimli taş döşeli bir kare zemin üstünde ve görselin alt köşesi bu
elmasın alt ucu; kamera açısı konut görseliyle aynı (2:1 izometri, sağ-sol
simetrik elmas); yazı, arayüz, gölge dışında zemin yok.

## ORTAK STİL

```
isometric game building on a square diamond-shaped stone-paved base that fills the whole tile, true 2:1 isometric view, same camera as a mobile city-builder, richly detailed painterly 3D illustration, Ottoman-Mediterranean architecture, cream limestone blocks, terracotta tiled roofs, lead-blue domes with small gold finials, red banners with a white crescent, cypress trees, olive trees, bougainvillea and potted flowers, bronze lanterns, warm golden-hour sunlight from the left, soft shadows, vibrant but natural colors, transparent background, no text, no UI, no people, centered, high resolution
```

## Binalar

| Dosya (id) | Aşama 1 | Aşama 2 | Aşama 3 |
|---|---|---|---|
| `divan` Divanhane | two-storey stone council hall with a small columned portico and one flag | council hall with a central lead dome, four small corner domes and a wider portico | grand domed council palace with two wings, a clock tower and many banners |
| `saray` Saray | walled courtyard residence with a gate kiosk | palace with arcaded courtyard, pool and a dome | imperial palace with a tall Tower of Justice, several domes and gardens |
| `elcilik` Elçilik | stone mansion with a small portico and three foreign flags | mansion with a side wing and a row of five colorful flags | embassy palace with a small dome, two wings and a flag avenue |
| `hamam` Hamam | low stone bathhouse with one big lead dome pierced by star-shaped glass vents and a chimney | bathhouse with a big dome and two small side domes | bath complex with courtyard, three halls and fountain |
| `carsi` Çarşı | four market stalls with striped awnings, crates and amphorae | stalls plus a domed stone bedesten with two domes | covered grand bazaar with three domes and many colorful stalls |
| `ambar` Ambar | stone warehouse with big wooden doors, barrels and crates | warehouse plus a timber barn | large storehouse complex with a loading crane and stacked goods |
| `kereste` Kereste Ocağı | open timber shed with log piles and a saw bench | bigger sawmill with a second shed | lumber yard with a crane, sawn plank stacks and log piles |
| `tas` Taş Ocağı | small quarry cut into grey rock with a wooden crane and cut blocks | quarry with terraces and a workshop hut | large quarry with sled track, many blocks and two cranes |
| `medrese` Medrese | U-shaped courtyard school with arcaded cells and one dome | full square courtyard with fountain and bigger dome | madrasa with a minaret, observatory dome and garden |
| `kisla` Kışla | crenellated stone barracks with a training yard and straw dummies | barracks with one round tower and weapon racks | fortress barracks with two towers, parade ground and banners |
| `liman` Ticaret Limanı | small stone quay with a wooden pier, crane and crates (on water edge) | bigger quay with two piers and a warehouse | busy harbour with lighthouse, two cranes and moored boats |
| `tersane` Tersane | slipway with the wooden ribs of a ship under construction | covered shipyard hall over the slipway | great arsenal with two covered slips and a half-built galleon |
| `kahvehane` Kahvehane | coffee house with a vine-covered pergola terrace, low tables and lanterns | coffee house with an upper wooden oriel and side wing | lively coffee house with striped awning, fountain and garden seating |
| `cami` Cami | small white mosque with one dome and one minaret | mosque with a portico of small domes and a fountain courtyard | grand mosque with a large dome, cascading half domes and two minarets |
| `muze` Müze | small classical temple-like museum with columns and statues | museum with a wider colonnade and side wing | grand museum with pediment, columns, statues and garden |
| `marangoz` Marangozhane | timber workshop with plank stacks and a sawhorse | workshop with a second shed and tools | carpentry yard with logs, planks and a crane |
| `mimar` Mimarbaşı Odası | architect's stone house with a scaffolded model dome in the yard | house with a drafting pavilion and stone blocks | architect's office with a tower and a large model mosque under scaffolding |
| `ormanci` Ormancı Evi | wooden forester's cabin with a small sapling nursery | cabin with rows of young trees | forester's lodge with a large nursery and log stacks |
| `tasci` Taşçı Ustası | stonemason workshop with column drums and blocks | workshop with a statue being carved | stonemason yard with columns, statues and a crane |
| `tophane` Tophane | brick cannon foundry with a chimney and one cannon | foundry with lead domes, two chimneys and cannons | great cannon foundry with smoking chimneys and a row of bronze cannons |

## Adada kullanılanlar (isteğe bağlı)

| Dosya | Tarif |
|---|---|
| `mine-uzum` | terraced vineyard with a small winery house and barrels |
| `mine-mermer` | white marble quarry with cut blocks and a crane |
| `mine-kristal` | rocky cave mouth with glowing blue crystals and crates |
| `mine-kukurt` | yellow sulfur pits with a stone furnace house |
| `npc-koy` | barbarian village of thatched round huts inside a wooden palisade |
| `npc-korsan` | pirate den: wooden fort on the beach with a black flag and a pier |
| `npc-kale` | rebel stone castle with four towers and a keep |

Görseller `assets/source/painted/buildings/` klasörüne aynı adlarla konursa
betik onları da oyuna alır.
