# Görseller — kaynak ve kullanım hakkı

Bu dosya oyundaki görsellerin nereden geldiğini anlatır. Eski sürüm "bütün
görseller kodla çizilir" diyordu; bu doğru değildi. Görseller iki kaynaktan
gelir (V2 planı, Faz 4.7).

## 1. Depodaki araçlarla kod ile üretilenler

Bunlar bu depodaki betiklerle üretilir. Kaynağı kodun kendisidir; betiği yeniden
çalıştırmak aynı dosyaları üretir. Oyunla aynı lisansı taşır.

| Dosyalar | Üreten araç |
|---|---|
| `buildings/site.webp`, `buildings/scaffold.webp`, `buildings/surlar-{1,2,3}.webp` | `tools/art/buildings.py` (`tools/art/isokit.py` izometri motoru) |
| `buildings/mine-*.webp`, `buildings/npc-*.webp`, `buildings/pazar.webp` | `tools/art/buildings.py` |
| `buildings/forest-hero.webp` | Kodla üretildi (commit `903ff63`), ama üreten betik depoya konmamış. Yeniden üretilemez; değiştirilecekse betiği yazılmalı. |
| Eski `decor/*.png` (G4’te kaldırıldı) | `tools/art/decor.py`, `tools/art/tulips.py` |
| Eski `terrain/*.png` (G4’te kaldırıldı) | `tools/art/decor.py` |
| `walls/tower-round.*` | `tools/art/wall-tower.mjs` |
| `ships/*.png` | `tools/art/gen-procedural-assets.py` |
| `islands/*.webp` | `tools/art/islands.py`, `tools/art/island-thumbs.py` |
| `siege/*.svg` | elle yazılmış SVG |
| Arayüz ikonları (`components/game/ui-icon-data.ts`) | `tools/art/ui-icons.mjs` |
| Sur, şehir halkı, bayraklar, gemi ve efektler | Phaser içinde çalışma anında çizilir (`components/game/phaser-city.ts`, `city-life.ts`) |

## 2. Boyalı bina seti — kaynağı yazılı değil

`buildings/*-painted-{1,2,3}.webp` dosyaları kodla üretilmedi.

- **Kim ekledi:** depo sahibi (ashina61). Commit'ler:
  - PR #56–#64: Divanhane, cami, saray, konut, kışla, medrese, çarşı, başlangıç ekonomisi, Elçilik, Hamam, Kahvehane, müze, lonca ve atölyeler, mahzen, gözlükçü, barutane.
  - `8eb6cec`: kalan yapılar.
  - `00c3572`: liman ve tersane.
  - `0473668`: medrese yeniden çizimi.
- **Kapsam:** 39 dosya grubu × 3 aşama, yaklaşık 117 görsel.
- **Kaynak, araç ve lisans:** depoda kayıtlı değil.

> **Yapılacak (depo sahibi):** Bu görsellerin nasıl üretildiğini ve hangi koşulla
> kullanılabileceğini buraya yaz. Gerekli bilgiler:
> - kendi çizimin mi, bir yapay zekâ görsel aracıyla mı üretildi (hangisi), yoksa satın alınmış bir paket mi;
> - ticari yayında (Play Store) kullanım hakkı var mı.
>
> Play Store'a çıkmadan önce bu satır doldurulmalı.

Boyalı görsellerde gömülü sancak yok. Faz 4.1'de bütün görseller tarandı;
bulunan kırmızı bölgeler kiremit, alem ve tente çıktı. Oyuncunun sancağı devlet
yapılarının yanındaki direklerde çalışma anında çizilir.

## 3. Görsel yenileme — G0 stil belgesi

| Dosya | Üreten araç / tarih | Tarif ve referans | Kullanım notu |
|---|---|---|---|
| `docs/stil-sayfasi.webp` (public klasörünün dışındaki belge) | Codex görsel üretimi, OpenAI ImageGen, 2026-10-03 | `tools/art/prompts/g0.md`, ortak kök `tools/art/prompts/_kok.md`; mevcut `buildings/divan-painted-1.webp` stil referansı | Yeniçeri, şehir danışmanı, akçe/kereste/taş, boş düğme ve zeytin ağacı için üretilmiş özgün stil örnekleri. OpenAI hizmet koşulları kapsamında çıktı kullanımına tabidir; üçüncü taraf oyun görseli kullanılmamıştır. Mevcut bina setinin bölüm 2'deki kaynak belirsizliği bu üretimle giderilmiş sayılmaz. |

G0 belgesi onay içindir, `public/` altında sunulmaz ve telefonda indirilmez.
Bina referansının asıl dosyası korunmuştur. Stil örnekleri henüz oyun asset'i
olarak bağlanmamıştır; brifte G0 için kod bağlantısı yoktur. Ayrı oyun dosyaları
onaydan sonra ilgili fazda üretilir ve ayrıca kaydedilir.

## 4. Görsel yenileme — G1 arayüz kiti

Her dosya: Codex görsel üretimi / OpenAI ImageGen, 2026-10-03.
Tarif: `tools/art/prompts/g1.md`, ortak kök `_kok.md`; G0 onaylı
`docs/stil-sayfasi.webp` referansı. OpenAI hizmet koşulları kapsamında çıktı
kullanımı; üçüncü taraf oyun asset'i yok. Alfa dış boşluğu kırpılıp telefon
boyunda WebP kalite 82 kodlandı; yüksek çözünürlüklü PNG'ler depoya eklenmedi.

| Dosya (`ui/`) | Kullanım |
|---|---|
| `page-frame.webp` | 9-dilim sayfa / içerik kartı çerçevesi |
| `walnut-plate.webp` | 9-dilim üst bar, alt bar, sayfa başlığı, ilerleme yatağı |
| `button-gold.webp` | Birincil düğme, seçili sekme, ilerleme dolumu |
| `button-parch.webp` | İkincil düğme, kaynak kapsülü, sekme |
| `button-red.webp` | Tehlike düğmesi, dolu ambar kapsülü, haber rozeti |
| `ribbon-red.webp` | 9-dilim bölüm başlığı |
| `medal-frame.webp` | Dairesel ikon düğmesi / değer madalyonu; oranlı ölçek |

G0 onayı 2026-10-03'te verildi. Ek onay notları: ikonlar 24 px'te
`#2a1a0e` ve `#f3e2b9` fonda test edilecek (G2); taşın kenar/gölgesi koyulaşacak.
G3 portreleri 42 px dairede yüz ortalı ve seçilebilir, omuzlar daire içinde
kırpılacak. Düğme/plaka süsleri sabit köşe dilimlerinde; orta alan uzatılabilir.
Onay kanıtları WebP ≤200 KB; önceki G0 PNG kanıtlarının çalışma kopyaları silindi.

## 5. G2 — kaynak ve menü ikonları

OpenAI ImageGen, 2026-10-03. Onaylı G0 stil sayfası referansıyla üretim. Tam promptlar: `tools/art/prompts/g2.md`; ortak kök: `tools/art/prompts/_kok.md`. OpenAI kullanım koşulları geçerlidir; başka oyunlardan görsel alınmadı. Şeffaf 256 px WebP, ikon başına ≤12 KB.

| Dosya | Üretim |
|---|---|
| `icons/res-akce.webp` | OpenAI ImageGen, 2026-10-03 |
| `icons/res-kereste.webp` | OpenAI ImageGen, 2026-10-03 |
| `icons/res-tas.webp` | OpenAI ImageGen, 2026-10-03 |
| `icons/res-ilim.webp` | OpenAI ImageGen, 2026-10-03 |
| `icons/res-uzum.webp` | OpenAI ImageGen, 2026-10-03 |
| `icons/res-mermer.webp` | OpenAI ImageGen, 2026-10-03 |
| `icons/res-kristal.webp` | OpenAI ImageGen, 2026-10-03 |
| `icons/res-kukurt.webp` | OpenAI ImageGen, 2026-10-03 |
| `icons/res-nufus.webp` | OpenAI ImageGen, 2026-10-03 |
| `icons/res-sefer.webp` | OpenAI ImageGen, 2026-10-03 |
| `icons/res-huzur.webp` | OpenAI ImageGen, 2026-10-03 |
| `icons/res-yolsuzluk.webp` | OpenAI ImageGen, 2026-10-03 |
| `icons/ui-city.webp` | OpenAI ImageGen, 2026-10-03 |
| `icons/ui-island.webp` | OpenAI ImageGen, 2026-10-03 |
| `icons/ui-map.webp` | OpenAI ImageGen, 2026-10-03 |
| `icons/ui-alliance.webp` | OpenAI ImageGen, 2026-10-03 |
| `icons/ui-objectives.webp` | OpenAI ImageGen, 2026-10-03 |
| `icons/ui-flag.webp` | OpenAI ImageGen, 2026-10-03 |
| `icons/ui-harbour.webp` | OpenAI ImageGen, 2026-10-03 |
| `icons/ui-divan.webp` | OpenAI ImageGen, 2026-10-03 |
| `icons/ui-offer.webp` | OpenAI ImageGen, 2026-10-03 |

## 6. G2 onay düzeltmeleri, 0.42.0

OpenAI ImageGen, 2026-10-03. Onaylı G0 stil sayfası; `tools/art/prompts/g2-revision.md`. OpenAI kullanım koşulları geçerlidir, başka oyunlardan alınmadı. Şeffaf 256 px, dosya başına ≤12 KB.

| Dosya | Konu |
|---|---|
| `icons/res-kahve.webp` | Bakır cezve ve kavrulmuş çekirdekler; res-uzum yerine |
| `icons/ui-city.webp` | Surlu kapı, kuleler ve çatılar; ui-divan kubbeli kalır |
| `icons/res-sefer.webp` | Bayraksız, ileri pruvalı kadırga |
| `icons/res-kukurt.webp` | Toprak kâsede soluk limon kristalleri ve ince duman |

`res-tas.webp` ve `res-uzum.webp` 0.42.0 ile kaldırıldı. Yukarıdaki G2 ilk üretim listesi tarihsel kayıttır; eski şehir/sefer/kükürt üretimleri bu düzeltmelerle değiştirildi.

Diğer sekiz menü ikonu aynı G2 üretim kaynağından daha sıkı alfa sınırıyla 256 px tuvale yeniden sığdırıldı (alfa kalitesi 50, ≤12 KB). Menü/sütun img kutusu 44 px; çizim için 40 px iç alan ve G1 madalyonuyla koyu zeminde kontrast sağlanır.

## 7. G3 — danışman portreleri

OpenAI ImageGen, 2026-10-03. Onaylı G0 stil sayfasıyla ayrı üretim; promptlar `tools/art/prompts/g3.md`, ortak kök `_kok.md`. OpenAI kullanım koşulları; gerçek kişi, başka oyun karakteri veya dış görsel kullanılmadı. 512×512 şeffaf WebP, portre başına ≤60 KB. 42 px dairede CSS çerçeve ve omuz kırpımı; yüz okunaklılığı `visual-review/G3` altında incelendi.

| Dosya | Danışman |
|---|---|
| `portraits/advisor-city.webp` | city |
| `portraits/advisor-army.webp` | army |
| `portraits/advisor-research.webp` | research |
| `portraits/advisor-diplo.webp` | diplo |

## 8. G4 — şehir zemini ve dekor

Her dosya OpenAI ImageGen / Codex görsel üretimi, 2026-10-03. G0 stil sayfası referansı; tarifler `tools/art/prompts/g4.md`, ortak kök `_kok.md`. OpenAI hizmet koşulları kapsamında çıktı kullanımı; üçüncü taraf oyun görseli kullanılmadı. Kodlama: WebP kalite 82’den bütçeye göre azalır, şeffaf nesnelerde alfa kalite 70.

| Dosya | Araç / tarih |
|---|---|
| `terrain/grass.webp` | OpenAI ImageGen, 2026-10-03 |
| `terrain/dirt.webp` | OpenAI ImageGen, 2026-10-03 |
| `terrain/grass-shade.webp` | OpenAI ImageGen, 2026-10-03 |
| `terrain/grass-dry.webp` | OpenAI ImageGen, 2026-10-03 |
| `terrain/plaza-stone.webp` | OpenAI ImageGen, 2026-10-03 |
| `terrain/cobble.webp` | OpenAI ImageGen, 2026-10-03 |
| `terrain/quay-stone.webp` | OpenAI ImageGen, 2026-10-03 |
| `terrain/shore-sand.webp` | OpenAI ImageGen, 2026-10-03 |
| `terrain/water-shallow.webp` | OpenAI ImageGen, 2026-10-03 |
| `terrain/water-deep.webp` | OpenAI ImageGen, 2026-10-03 |
| `terrain/hills.webp` | OpenAI ImageGen, 2026-10-03 |
| `decor/olive-tree.webp` | OpenAI ImageGen, 2026-10-03 |
| `decor/bush.webp` | OpenAI ImageGen, 2026-10-03 |
| `decor/flower.webp` | OpenAI ImageGen, 2026-10-03 |
| `decor/rock.webp` | OpenAI ImageGen, 2026-10-03 |
| `decor/cypress.webp` | OpenAI ImageGen, 2026-10-03 |
| `decor/cypress-b.webp` | OpenAI ImageGen, 2026-10-03 |
| `decor/pine.webp` | OpenAI ImageGen, 2026-10-03 |
| `decor/plane-tree.webp` | OpenAI ImageGen, 2026-10-03 |
| `decor/poplar.webp` | OpenAI ImageGen, 2026-10-03 |
| `decor/fruit-tree.webp` | OpenAI ImageGen, 2026-10-03 |
| `decor/haystack.webp` | OpenAI ImageGen, 2026-10-03 |
| `decor/well.webp` | OpenAI ImageGen, 2026-10-03 |
| `decor/woodpile.webp` | OpenAI ImageGen, 2026-10-03 |
| `decor/beehives.webp` | OpenAI ImageGen, 2026-10-03 |
| `decor/tulip-bed.webp` | OpenAI ImageGen, 2026-10-03 |
| `decor/tulip-clump.webp` | OpenAI ImageGen, 2026-10-03 |
| `decor/cesme.webp` | OpenAI ImageGen, 2026-10-03 |
| `decor/tezgah.webp` | OpenAI ImageGen, 2026-10-03 |
| `decor/bostan.webp` | OpenAI ImageGen, 2026-10-03 |
| `decor/mezarlik.webp` | OpenAI ImageGen, 2026-10-03 |
| `decor/degirmen.webp` | OpenAI ImageGen, 2026-10-03 |
| `decor/fig-tree.webp` | OpenAI ImageGen, 2026-10-03 |
| `decor/orange-tree.webp` | OpenAI ImageGen, 2026-10-03 |
| `decor/pomegranate-tree.webp` | OpenAI ImageGen, 2026-10-03 |
| `decor/reed-clump.webp` | OpenAI ImageGen, 2026-10-03 |
| `decor/dry-grass.webp` | OpenAI ImageGen, 2026-10-03 |
| `decor/lavender.webp` | OpenAI ImageGen, 2026-10-03 |
| `decor/terracotta-pots.webp` | OpenAI ImageGen, 2026-10-03 |
| `decor/grain-sacks.webp` | OpenAI ImageGen, 2026-10-03 |
| `decor/stone-bench.webp` | OpenAI ImageGen, 2026-10-03 |
| `decor/coffee-garden.webp` | OpenAI ImageGen, 2026-10-03 |

G4 kuru otun ilk denemesi (`exec-c1d90ed1-016b-442e-a5f1-526428d6039e.png`, OpenAI ImageGen, 2026-10-03) bina çıktığı için reddedildi; oyuna/depoya alınmadı. Tarif kaydı `tools/art/prompts/g4.md` sonunda.

G4 revizyon: yukarıdaki 31 dekorun her biri için `decor/<ad>-sm.webp` türevi `tools/art/half-size.py` ile üretildi (2026-10-03). Kaynak/üretim hakkı aynı; ağaçlar 192 px, diğerleri 128 px uzun kenar, Lanczos/WebP kalite 82. Ana çim onaylı dokuyu korur; yeşil ton render katmanında uygulanır. Yeni AI çizimi üretilmedi.

## G6 — boyalı birlik figürleri

OpenAI ImageGen (yerleşik araç), 2026-10-03; özgün Osmanlı–Akdeniz figürleri. G0 stil sayfası yalnız görsel aile referansı. Tarif kökü ve her konu: `tools/art/prompts/g6.md`. Alfa korunarak 512×512 WebP; kullanım: `components/game/unit-art.tsx`. Gerçek kişi ya da başka oyun karakteri kullanılmadı.

| Dosya | Üretim tarifi / konu |
|---|---|
| `units/yeniceri.webp` | Janissary red kaftan cream trousers white tall keche bork, musket and belt yatagan |
| `units/okcu.webp` | archer olive robe cream turban, prominent curved bow and quiver |
| `units/sipahi.webp` | mounted cavalry chestnut horse red rider steel Ottoman helmet and lance |
| `units/topcu.webp` | bronze long cannon wooden wheeled carriage with one small Ottoman artillery crewman |
| `units/kadirga.webp` | slender Ottoman rowing war galley one cream lateen sail, visible oars crescent pennant |
| `units/kalyon.webp` | large three-mast Ottoman galleon square cream sails and broadside cannon ports |
| `units/nakliye.webp` | two-mast merchant transport ship blue flag sacks and cargo barrels |
| `units/casus.webp` | Ottoman spy dark hooded cloak, concealed dagger and rolled map |
| `units/mizrakci.webp` | spearman rust brown robe cream turban long spear and round brass shield |
| `units/azap.webp` | light infantry green robe red cap curved sabre and small buckler |
| `units/sapanci.webp` | slinger tan robe cloth cap sling raised and stone pouch |
| `units/tufekci.webp` | musketeer burgundy coat red cap long wooden-stock musket |
| `units/kocbasi.webp` | siege battering ram roofed timber frame wheels heavy iron-tipped log |
| `units/mancinik.webp` | wooden siege catapult large throwing arm stone sling and counterweight |
| `units/asci.webp` | Ottoman cook cream robe white cloth headwear copper cauldron and large wood spoon |
| `units/hekim.webp` | Ottoman healer green robe cream turban leather medical satchel herbs bandages no modern red cross |
| `units/ates_gemisi.webp` | low Ottoman fire galley lateen sail bronze fire-projector at forward bow small contained flame ship not burning |
| `units/mancinik_gemisi.webp` | two-mast Ottoman galley distinct wooden catapult installed prominently on deck |
| `units/deli.webp` | Ottoman heavy infantry fur shoulder trim feather-adorned helmet mace round shield natural proportion no horns |
| `units/humbaraci.webp` | Ottoman grenadier brown coat metal helmet red belt spherical grenade and grenade pouch |
| `units/karamursel.webp` | compact Ottoman coastal war vessel short round hull single large lateen cream sail |
| `units/humbara_gemisi.webp` | two-mast dark-hulled Ottoman bomb ship prominent short mortar on deck |
| `units/ikmal_gemisi.webp` | two-mast supply ship green pennant barrels crates and provisioning sacks |
| `units/hezarfen.webp` | fictional Ottoman wing engineer blue robe white turban large wood and feather glider wings spread no real person |
| `units/lagari.webp` | fictional Ottoman rocket pilot burgundy robe mounted wood brass rocket red tip tilted upwards right with small contained flame no real person |
| `units/zenberek_gemisi.webp` | Ottoman lateen galley heavy crossbow ballista installed on forward bow |
| `units/dalgic_gemisi.webp` | fictional early Ottoman wood and bronze submarine pointed bow towards right short periscope tiny bubbles no solid water background |
| `units/buharli_koc.webp` | Ottoman fantasy early iron steam ram ship pointed steel ram bow forward right brass rivets paddle wheel small smokestack steam |
| `units/balon_gemisi.webp` | Ottoman observation vessel tethered large red cream striped balloon above deck ropes visibly join ship and balloon no modern airship |

G6 seçilen kaynak çıktılarının birlik kimliği, kaynak PNG adı ve son WebP kodlama ayarları `visual-review/G6/encoding.json` içinde. Kaynak PNG dosyaları depoya alınmaz.

G6 reddedilen/ara üretimler (OpenAI ImageGen, 2026-10-03): aşağıdaki çıktılar tekil şeffaf figür şartını sağlamadığı veya düzenleme öncesi ara kaynak olduğu için oyuna alınmadı. İlk toplu denemede ortak kök aktarımı eksikti; referansın kompozisyonunu da üreten denemeler durduruldu ve tekil tariflerle yeniden üretildi. Kalyon deniz/sky fonu kaldırılarak yeniden düzenlendi.

- `exec-03c14412-8480-422d-bdc8-af17f0fa9490.png`
- `exec-63f9050e-2a48-41f6-9da3-ddb0cc87e6be.png`
- `exec-760eb4fa-c8b8-4a22-96c0-efaa893e1d39.png`
- `exec-824d9d84-83ae-4b44-9db8-5aed567e0b3a.png`
- `exec-c6b77505-284e-4d49-b991-e5b21e18defc.png`

G6 son kodlama: telefon toplamı ondalık 15.000.000 bayt sınırında; kara figürü ≤25.000, deniz figürü ≤40.000 bayt (birlik başına 60 KB üst sınırından daha sıkı). Alfa ve RGB kalite ayarları `visual-review/G6/encoding.json`; poz/ölçek korunur.

## G6 revision — 2026-10-04

Built-in Codex imagegen, original generated artwork with approved G0 style reference.
Prompt set: `tools/art/prompts/g6-revision.md`. Project use permitted under the
image generation service terms; no third-party game assets copied.
Replaced: `units/nakliye.webp`, `units/ikmal_gemisi.webp`,
`units/karamursel.webp`, `units/humbara_gemisi.webp`,
`units/mancinik_gemisi.webp`, `units/zenberek_gemisi.webp`,
`units/ates_gemisi.webp`. New: `icons/ui-mail.webp`, `icons/ui-week.webp`.

## G7 — Painted scene assets (2026-10-04)

Original built-in Codex ImageGen artwork, one generation per asset. References: approved G0 style sheet and existing painted Divanhane. Subject/style recovery record: `tools/art/prompts/g7.md`. Project use under image generation service terms; no third-party game assets copied.

- `walls/segment-1.webp`
- `walls/segment-2.webp`
- `walls/segment-3.webp`
- `walls/tower-1.webp`
- `walls/tower-2.webp`
- `walls/tower-3.webp`
- `walls/gate-1.webp`
- `walls/gate-2.webp`
- `walls/gate-3.webp`
- `buildings/mine-kahve.webp`
- `buildings/mine-mermer.webp`
- `buildings/mine-kristal.webp`
- `buildings/mine-kukurt.webp`
- `buildings/forest-hero.webp`
- `buildings/npc-koy.webp`
- `buildings/npc-korsan.webp`
- `buildings/npc-kale.webp`
- `buildings/scaffold.webp`
- `buildings/site.webp`
- `buildings/pazar.webp`
- `buildings/pier.webp`
- `buildings/surlar-1.webp`
- `buildings/surlar-2.webp`
- `buildings/surlar-3.webp`
- `ships/ship-a.webp`
- `ships/ship-b.webp`
- `ships/blockade.webp`
- `ships/fishing.webp`
- `siege/checkpoint.webp`

Existing phone building derivatives recompressed from their original full sources at WebP quality 78, with dimensions and original credits retained.

## G8 — Boyalı adalar ve dünya haritası (2026-10-04)

OpenAI imagegen ile G0 stil referansından üretilmiş 16 özgün ada arazisi ve
boyalı açık deniz. Küçük harita simgeleri aynı kaynakların yeniden boyutlanmış
kopyalarıdır. Tarif: `tools/art/prompts/g8.md`. Başka oyun görseli kullanılmadı;
proje sahibinin oyununda kullanım için üretilmiştir. Harita çerçevesi G1 setinden.

## G9 — Derin sayfalar (2026-10-04)

Codex yerleşik imagegen ile üretilen özgün raster sprite atlasları: 76 araştırma motifi, 8 kadim tanrı portresi, 14 kurgusal yapay rakip portresi, 8 yönetim, 6 lonca, 4 Karagöz oyunu, 8 harika, 30 başarım ve tunç/gümüş madalya çerçevesi. Altın çerçeve G1 kitinden. Kara/deniz savaş zemini iki ayrı üretim. Tarif: `tools/art/prompts/g9.md`; paketleme: `tools/art/g9-assets.cjs`. Başka oyun görseli kullanılmadı; kullanım ilgili üretim hizmeti koşullarına tabidir. Oyun metni ve dinamik arma SVG'leri koddan gelir.

## G10 — Kahve bina aşamaları (2026-10-04)

114 tuval denetlendi; Kahve Fidanlığı ve Kahve Kileri altı aşama imagegen ile hedef görseller üzerinde düzenlendi. Diğer bina seti korundu. Tuval, alfa sınırları ve opak alan ölçeği doğrulandı; telefon kopyaları aynı yarı boyda WebP. Tarif: `tools/art/prompts/g10.md`.

## G11 — Açılış ve uygulama kimliği (2026-10-04)

Özgün boyalı kıyı arka planı, yazısız logo plaketi ve uygulama ikonu OpenAI imagegen ile G0 referansından üretildi. Logo metni koddan gelir. Web ve Android ikon/splash platform kopyaları aynı kaynaklardan boyutlandırıldı. Tarif: `tools/art/prompts/g11.md`.

G9–G11 görselleri bu özgün proje için üretildi; başka oyunlardan görsel kullanılmadı. Proje sahibinin oyununda kullanım amacı taşır. G10 düzenlemelerinin temel aldığı mevcut bina setinin kaynak notu bölüm 2’de korunur.


## 14. H1–H3 — görsel brif 2

2026-10-04. H1 hedef mockup sahnesinden UI temizleme/yeniden boyama; H2 mevcut özgün ada resimlerinden yeni silüet maskeleri; H3 OpenAI ImageGen ile tek parça boyandı; şablona zorlanmadığı için görsel arsa merkezleri visual-review/H3/city-base-centers.json içinde ayrıca kaydedildi. Tarif: tools/art/prompts/h1-h3.md. Üçüncü taraf oyun görseli kullanılmadı. H3 Phaser’a bağlanmamıştır.

### H1 düzeltmesi — 2026-10-04

Yazısız giriş arka planı yerleşik OpenAI imagegen ile yeniden boyandı. Tarif: `tools/art/prompts/h1.md`; özgün proje mockupı ve onaylı stil sayfası referans alındı. Üçüncü taraf oyun görseli kullanılmadı. Kullanım: Payitaht projesi; dış kaynak lisansı eklenmedi.

### H2 düzeltmesi — 2026-10-04

16 dünya haritası küçük resmi, her ada için ayrı yerleşik OpenAI imagegen üretimi. Tarif: `tools/art/prompts/h2.md`. Şeffaf kıyı, köpük ve sığ su kaynaktan korunmuştur; isim/sancak içermez. `h2-normalize.py` yalnız boyutlandırır, merkezi hizalar ve WebP kodlar. Özgün proje sanatı; üçüncü taraf oyun görseli kullanılmadı.


### H3 ImageGen yeniden boyama — 2026-10-04

`visual-review/H3/city-base-test.webp`: OpenAI ImageGen tabanlı tek-parça H3 denemesi (oyuna alınmadı, yalnız kanıt klasöründe); hafif kırpma/temizlik ve WebP kodlama uygulandı. Görsel oyun slotlarına bağlı değildir. Arsa merkezleri `visual-review/H3/city-base-centers.json` içindedir. Üçüncü taraf oyun görseli kullanılmadı.

## Kışla referans pilotu — 2026-10-04
- `terrain/barracks-courtyard.webp`: OpenAI ImageGen ile üretildi.
- Kullanıcının kendisine ait olduğunu belirttiği Imagen kışla tasarımı stil ve
  mimari referansı olarak kullanıldı. Başka bir oyundan görsel alınmadı.
- Üretim tarifi: `tools/art/prompts/kisla-reference.md`.
- Mevcut G6 birlikleri ve G1 arayüz dokuları aynı kaynak haklarıyla korunur.

## Ortak tasarım dili / görev defteri — 2026-10-04
- `ui/reference-bars/*.webp`: OpenAI ImageGen, kullanıcının şehir ekranı stil referansı. Bar yazıları ve kaynakları koddan gelir.
- `terrain/mandates-office.webp`: OpenAI ImageGen, kullanıcının araştırma ve kışla sayfaları stil referansı. Yalnız divan görev dairesi sahnesi; metin veya oyun verisi içermez.
- Tarif: `tools/art/prompts/mandates-office.md`; tasarım hafızası: `docs/tasarim-dili.md`.
- G1 malzemeleri, G6 figürleri ve görev resimleri mevcut özgün kaynaklarıyla korunur. Üçüncü taraf oyun resmi alınmadı.

### Görev dairesi içerik sahneleri (v46)
`quests/{capital,builders,scholar,army,harbour,treasury}.webp`: OpenAI ImageGen ile, kullanıcının kışla/araştırma referanslarını sanat dili olarak kullanarak üretildi. 3×2 atlasın altı paneli ayrı oyun varlıklarına dönüştürüldü. Arayüz, yazı ve ödül sayıları görsele gömülü değildir. Tarif: `tools/art/prompts/quest-scenes.md`.

### Şehir vakayinamesi ve divan neşriyatı (v47)
`terrain/archive-hall.webp`: OpenAI ImageGen yerleşik aracıyla, kullanıcının araştırma referansı ve oyunun mevcut görev dairesi sanatına bakılarak üretildi. Osmanlı arşiv kâtibi, ceviz kayıt defterleri ve Ege şehri. Yazı, tarih ve rakamlar arayüzde koddan gelir. Tarif: `tools/art/prompts/archive-hall.md`.

### Hükümdarın sarayı ve idare defteri (v48)
`terrain/royal-court.webp`, `terrain/admin-desk.webp`: yerleşik OpenAI ImageGen ile ayrı sahneler olarak üretildi. Kullanıcının araştırma ekranı ve mevcut arşiv sahnesi sanat referansıdır. Sahnelere UI, isim veya oyun verisi gömülmedi. Tarifler: `tools/art/prompts/royal-court.md`, `tools/art/prompts/admin-desk.md`.

### Hazinedarın defteri (v49)
`terrain/treasury-room.webp`: yerleşik OpenAI ImageGen ile üretildi. Mevcut `royal-court.webp` yalnız sanat dili referansıdır; hazinedar, ceviz sayım masası, akçe ve Ege revakı yeni kompozisyondur. Arayüz/metin/oyun verisi görsele gömülmedi. Tam prompt: `tools/art/prompts/treasury-room.md`. İçerikteki görev sahneleri özgün mevcut varlıklardır.

## Halk ve şehirler — 5 Ekim 2026

`terrain/town-square.webp` ve `terrain/island-harbour.webp`: OpenAI ImageGen ile bu oyun için üretildi; önceki `terrain/treasury-room.webp` yalnız sanat dili referansı. Osmanlı–Ege, sıcak ışık, kireçtaşı ve turkuaz deniz. Görselde arayüz veya metin yok; bütün oyun değerleri ve işlemler koddan gelir. 960×480 WebP, kalite 82. Tam tarifler `tools/art/prompts/town-square.md` ve `tools/art/prompts/island-harbour.md`.

## Approved Profile and Settings (5 October 2026)

`ui/approved-court/`: artwork extracted from the two user-approved generated mockups, plus loggia and neutral standard layers derived with the built-in image generator. See `docs/PROFILE-SETTINGS-DESIGN.md` for provenance, prompts and functional UI rules. No downloaded third-party artwork.


### 9 Ekim 2026 — kaynak üretim sayfaları

`ui/production/{lumber,ormanci,bagci,tasci,camci,simyahane}.webp` yeni yazısız Osmanlı–Ege ortam bantlarıdır; `ui/production/lumberjack.webp` şeffaf tam boy oduncudur. ChatGPT yerleşik ImageGen ile bu çalışma için üretildi; brief ve çıktı kayıtları `docs/production-art.json`. Sahne görselleri 960×360, figür en fazla 240×360 WebP’ye küçültüldü. Ortak Kışla atlasları aynen yeniden kullanılır; şehir bina görselleri değiştirilmedi.


## Tasarruf atölyeleri (0.77.0)

ui/cost/ altındaki beş yazısız Osmanlı atölye sahnesi built-in ImageGen ile bu proje için üretildi; 960×320 WebP. Prompt ve konu kaydı docs/cost-art.json. Ortak arayüz atlasları Kışla/Medrese referansından korunur.


## Commerce — 0.78.0

ui/commerce/bazaar.webp, caravanserai.webp ve shopkeeper.webp: OpenAI image generation, 9 Ekim 2026. Ayrı metinsiz Osmanlı sahneleri ve şeffaf tam boy esnaf; istem kayıtları docs/commerce-art.json.


## Kara Pazar — 0.79.0

ui/exchange/market.webp: OpenAI built-in image generation, 9 Ekim 2026. Yazısız Osmanlı–Ege mal takası sahnesi; istem docs/exchange-art.json.

Liman ve Tersane sahneleri: OpenAI Imagegen, 9 Ekim 2026; docs/maritime-art.json.

Harita Arşivi, Surlar ve Gizli Sığınak sahneleri: OpenAI Imagegen, 9 Ekim 2026; docs/defense-art.json.
# 9 Ekim 2026 — Tophane ve Korsan Kalesi

`ui/armament/tophane.webp` ve `ui/armament/korsan_kalesi.webp`: yerleşik Imagegen ile üretilen yazısız Osmanlı–Ege sahneleri; özgün promptlar `docs/armament-art.json`. RGB 960×320 WebP. Çerçeve/düğme/portre ve gemiler mevcut ortak atlaslardan.

## İbadet, loncalar ve kutsama — 0.83.0

`ui/devotion/cami.webp`, `tekke.webp`, `mabet.webp`: üç özgün yazısız Osmanlı–Ege sahnesi, yerleşik Imagegen; 960×320 RGB WebP. `ui/devotion/imam.webp`: şeffaf tam boy imam, 320×480 RGBA WebP. Promptlar `docs/devotion-art.json` içinde. Ortak Kışla/Medrese boyalı atlasları ve mevcut kültür/tanrı/harika resimleri korunur.

## Kültür ve Karagöz — 0.84.0

`ui/culture/muze.webp` ve `ui/culture/karagoz.webp`: yerleşik Imagegen ile özgün yazısız Osmanlı–Ege müze galerisi ve gölge oyunu avlusu; RGB 960×320 WebP. Promptlar `docs/culture-art.json` içinde. Ortak Kışla/Medrese çerçeveleri ve mevcut boyalı kültür atlası korunur.


## İnşa defteri — 0.85.0

`ui/construction/ustalar.webp`: yerleşik Imagegen ile özgün yazısız Osmanlı–Ege ustalar avlusu; RGB 960×320 WebP. Prompt `docs/construction-art.json` içinde. Ortak Kışla/Medrese boyalı çerçeveleri ve mevcut bina resimleri korunur.

## Ada, orman ve maden — 0.86.0

Built-in image_gen.imagegen; three original text-free Ottoman–Aegean paintings. Prompt/source record: docs/island-art.json. RGB WebP quality 88: islands/settlement-map-v2.webp (900×1200), ui/island/forest.webp and mine.webp (960×320). Shared playable island terrain; distinct world-map silhouettes retained. Reserved site flags and names are runtime UI; approved barracks and court atlas controls reused.

Three further original 960×320 RGB WebP banners: mine-kahve.webp (harvest), mine-kristal.webp (quartz extraction), mine-kukurt.webp (sulfur extraction). Built-in image_gen, prompt record in docs/island-art.json.

0.87.0: `ui/campaign/command.webp` ve `records.webp`, yerleşik image_gen ile özgün Osmanlı–Ege sefer/rapor sahneleri; promptlar `docs/campaign-art.json`.

## Dünya atlası ve imparatorluk defteri — 0.88.0

`ui/atlas/register.webp`: OpenAI imagegen built-in, 10 Ekim 2026. Osmanlı haritacısı ve şehir sicili; özgün yazısız 960×320 sahne. Prompt/source record: `docs/atlas-art.json`.
