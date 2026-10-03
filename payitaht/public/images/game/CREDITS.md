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
