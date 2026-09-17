# ASSET PAKETİ SPEC — Isometric City Sprint 1

Bu belge, göndereceğin asset paketinin **birebir** oyuna oturması için gereken
teknik kuralları tanımlar. Amaç: bir turda doğru paket → tek seferde premium
izometrik şehir.

> Kod tarafı (grid→ekran çevrimi, metrikler) `lib/game/render/iso-metrics.ts`
> içinde hazır. Paket bu spec'e uyduğunda render sistemi üstüne kurulacak.

---

## 0. GENEL KURALLAR (hepsi için geçerli)

- **Format:** PNG-32, gerçek şeffaf alfa (arka plan YOK, beyaz/checker YOK).
- **Projeksiyon:** 2:1 izometrik elmas, sabit kamera ~30–35°. TÜM asset'ler
  aynı açıdan.
- **Işık:** TEK yön — **sol-üst**. Gölge yumuşak, sağ-alta düşer. Her asset'te
  aynı.
- **Renk dili:** warm limestone / terracotta / muted green / olive / natural
  wood / dark brown / parchment / deep Mediterranean blue / muted gold.
  Neon/pastel/candy YOK, kalın siyah dış çizgi YOK, oyuncak/cartoon YOK.
- **Stil:** realistic-stylized / painterly 3D. Tek bir MASTER ART DIRECTION
  prompt'undan türetilmiş, tutarlı ölçek ve detay.
- **Çözünürlük:** aşağıdaki ölçüler @1x. Mümkünse **@2x** gönder (retina için),
  ben @1x'i türetirim. 4x gerekmez.
- **İsimlendirme:** dosya adları AYNEN aşağıdaki gibi olmalı (küçük harf,
  tire). Klasör yapısı korunmalı.

Klasör yapısı:
```
assets/
  terrain/   grass.png dirt.png stone.png water.png rock.png farm.png
             shore-*.png (kıyı geçişleri)
  roads/     (bkz. §3 tam liste)
  buildings/ (bkz. §4 — oyun id'leriyle)
  water/     dock.png pier.png boat.png fishing.png
  decor/     (bkz. §6 tam liste)
```

---

## 1. TILE TEMEL ÖLÇÜSÜ

- Karo üst yüzü (diamond): **96 × 48 px** (@1x). Bu, `iso-metrics.ts`'teki
  `tileWidth/tileHeight` ile birebir.
- Terrain/road tile PNG'si karonun **yükseklik dudağını** da içerebilir:
  toplam tuval örn. **96 × 64** (üstte 48 elmas + 16 px yan/kalınlık).
- **Anchor:** elmasın alt-orta noktası. (Yani PNG'nin altı, karonun ön köşesi.)

---

## 2. TERRAIN (§4 brief)

Her biri 96×48 (dudakla 96×64) izometrik karo, seamless döşenebilir:

| Dosya | Ne |
|---|---|
| `terrain/grass.png` | çim |
| `terrain/dirt.png` | toprak |
| `terrain/stone.png` | taş zemin |
| `terrain/water.png` | su (istersen 2–4 kare animasyon: `water-0..3.png`) |
| `terrain/rock.png` | kayalık |
| `terrain/farm.png` | tarla toprağı |

**Kıyı geçişleri (önemli, "excel grid" hissini kırar):** çim→su kenarları.
İdeal set (yoksa ben harmanlarım): `shore-n/e/s/w.png`, `shore-ne/nw/se/sw.png`.
Grid çizgisi GÖRÜNMEMELİ; karolar bitişince tek doğal zemin gibi durmalı.

---

## 3. ROADS — otomatik döşeme seti (§5 brief)

Komşuluğa göre otomatik seçilecek. Hepsi 96×48 iso karo tabanında, taş yol:

```
roads/straight-ns.png     (kuzey-güney düz)
roads/straight-ew.png     (doğu-batı düz)
roads/corner-ne.png       roads/corner-nw.png
roads/corner-se.png       roads/corner-sw.png
roads/t-n.png roads/t-e.png roads/t-s.png roads/t-w.png   (T kavşak)
roads/cross.png           (4 yönlü kavşak)
roads/end-n.png roads/end-e.png roads/end-s.png roads/end-w.png  (çıkmaz)
roads/plaza.png           (meydan)
roads/bridge-ns.png roads/bridge-ew.png   (su üstü köprü)
```

---

## 4. BUILDINGS — oyunun 14 yapısı (footprint AUTHORITATIVE)

**Önemli:** binalar bu 14 oyun id'siyle isimlenmeli. Footprint = kaç tile
kaplar. Bina PNG'si footprint tabanına oturur; taban alt-orta anchor, çatı
yukarı taşar. Genişlik ≈ (footprint genişliği × 96 px).

| Oyun id | Yapı | Referans karşılığı | Footprint | Not |
|---|---|---|---|---|
| `divan` | Divanhane | Town Hall | **3×3** | ana LANDMARK, en belirgin |
| `saray` | Saray | Palace | **3×3** | ikinci landmark, kubbe/avlu |
| `medrese` | Medrese | Academy | 2×2 | avlulu, revaklı |
| `hamam` | Hamam | Bath house | 2×2 | **kubbeli** (Osmanlı) |
| `elcilik` | Elçilik | Embassy | 2×2 | |
| `konut` | Konaklar | Housing | 2×2 | 2–3 varyant istersen: `konut-a/b/c.png` |
| `carsi` | Çarşı | Bazaar/Market | 2×2 | tenteli, mal dolu |
| `ambar` | Ambar | Granary/Warehouse | 2×2 | |
| `kereste` | Kereste Ocağı | Lumber camp | 2×2 | ahşap, kütükler |
| `tas` | Taş Ocağı | Quarry | 2×2 | taş ocağı/vagon |
| `kisla` | Kışla | Barracks | **3×3** | askeri |
| `liman` | Ticaret Limanı | Dock/Trade port | 2×2 | **su kenarı**, iskele bitişik |
| `tersane` | Tersane | Shipyard | **3×2** | **su kenarı**, gemi iskeleti |
| `surlar` | Surlar | Walls | özel | §5'e bak |

İsteğe bağlı ama iyi olur: her bina için **seviye varyantı** (level 1/2/3
görsel farkı) — `divan-l1.png` gibi. Vermezsen tek görsel + seviye rozeti
kullanılır (mevcut davranış).

Her bina PNG'sinde öneri anchor: **(x=0.5, y=~0.85)** — tabanın çakıştığı yer.
Farklıysa dosyaya not düş, ben `BuildingVisualConfig`'e işlerim.

---

## 5. SURLAR (duvarlar) — özel

Duvar tek bina değil, şehir kenarına örülür. Otomatik döşeme için:
`wall-ns.png wall-ew.png wall-corner-*.png wall-gate.png wall-tower.png`.
Hepsi 96×48 iso tabanında, taş sur, sol-üst ışık.

---

## 6. WATER / HARBOR (§11) ve DECOR (§12)

Harbor: `water/dock.png` `water/pier.png` `water/boat.png` `water/fishing.png`.

Dekor (hepsi transparent PNG, taban alt-orta anchor, ~1 tile veya küçük):
```
decor/cypress.png decor/olive-tree.png decor/broadleaf-tree.png
decor/bush.png decor/flower.png decor/rock.png
decor/barrel.png decor/crate.png decor/amphora.png
decor/bench.png decor/lamp.png decor/fountain.png
decor/market-stall.png decor/cart.png decor/sign.png decor/statue.png
```

---

## 7. TESLİM

- Yukarıdaki klasör yapısında bir zip, veya tek tek dosyalar.
- Eksik olan olursa sorun değil — gelenler kurulur, eksikler `TODO_ASSET`
  işaretlenir (brief §24: renkli dikdörtgen/emoji placeholder KULLANILMAZ).
- **Ayrıca MASTER VISUAL REFERENCE görselini tekrar gönder** — kompozisyon,
  ışık ve renk hedefini ona göre kilitleyeceğim.
