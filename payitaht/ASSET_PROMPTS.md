# ASSET ÜRETİM PROMPT PAKETİ — Isometric Ottoman/Mediterranean City

Tüm asset'ler **TEK bir sanat yönünden** üretilir ki birbirine otursun.
Aşağıdaki `MASTER STYLE` bloğunu **her prompt'un sonuna** ekle. Her asset'in
kendi cümlesi + MASTER STYLE = tam prompt.

> Hedef: painterly stylized 3D izometrik (Rise of Kingdoms / Ikariam ciddiyeti),
> Akdeniz/Osmanlı/Ege atmosferi. Çocuk oyunu / cartoon / toy YOK.

---

## 0. ÜRETİM KURALLARI (çok önemli — tutarlılık bundan gelir)

1. **Aynı stil referansı:** Hepsini AYNI ayarla üret. Midjourney'de bir bina
   beğen, onun `--sref <id>`'sini AL ve diğer TÜM asset'lerde kullan. (Ya da
   üreticinde "style reference / consistent style" neyse onu sabitle.)
2. **Işık yönü SABİT: sol-üst.** Gölge sağ-alta. Hepsinde aynı.
3. **Kamera SABİT:** true isometric, 2:1 dimetric, ~30° tepeden, ortografik
   (perspektif bozulması yok). Hepsinde aynı açı.
4. **Şeffaf arka plan:** Native alfa destekleyen üretici en iyisi (Recraft,
   Ideogram, Adobe Firefly, Flux "transparent"). Desteklemiyorsa **düz #00FF00
   (chroma green)** veya düz beyaz zeminde üret, sonra arka planı sil
   (remove.bg / rembg). Gölge dahil obje kalsın, zemin gitsin.
5. **Tek obje, izole, ortalanmış.** Kadrajda başka bina/karakter/yazı/UI yok.
6. **Kare kadraj**, yüksek çözünürlük (1024²+). Ben oyunda ölçekliyorum.
7. **Aynı seed ailesi:** mümkünse aynı seed veya aynı sref ile üret.

### MASTER STYLE (her prompt'un sonuna yapıştır)

```
:: true isometric 2:1 dimetric projection, 30-degree top-down orthographic
angle, no perspective distortion, single object centered and isolated on a
transparent background, soft warm afternoon sunlight from the upper-left with
gentle ambient-occlusion shadow to the lower-right, painterly stylized 3D game
art in the spirit of Rise of Kingdoms and Ikariam, warm Mediterranean palette
(sun-bleached limestone, terracotta clay tile, olive and muted green, natural
timber, plaster, muted gold, deep Aegean blue), clean readable silhouette,
subtle realistic material texture, NO black outline, NO text, NO UI, NO
characters, NO cartoon or toy look, serious premium mobile city-builder asset,
crisp edges, high detail --style raw --ar 1:1
```

(Midjourney kullanıyorsan `--sref <id>` de ekle. Başka üreticide `--style raw`
ve `--ar 1:1`'i kendi karşılığıyla değiştir.)

---

## 1. TERRAIN TILE'LARI (96×48 diamond taban, seamless)

Her biri için başa şunu ekle:
`a single isometric ground tile, 2:1 diamond top face, seamlessly tileable, a
thin soil cross-section lip on the two front edges, matte natural surface —`

| Dosya | Prompt cümlesi |
|---|---|
| `terrain/grass.png` | lush but muted Mediterranean grass with faint dry patches and tiny pebbles |
| `terrain/dirt.png` | packed earthen dirt, warm brown, faint footpaths |
| `terrain/stone.png` | fitted limestone paving slabs, weathered, light grey-beige |
| `terrain/water.png` | calm shallow Aegean sea water, deep turquoise-blue, soft ripples, subtle foam (üret: `water-0.png`..`water-3.png` hafif dalga farkıyla animasyon) |
| `terrain/rock.png` | rough grey rocky ground with cracks and small boulders |
| `terrain/farm.png` | ploughed farm soil in neat parallel furrows, rich brown, a few green sprouts |

**Kıyı geçişleri** (çim→su): aynı taban, ama bir/iki kenar suya dönüşsün.
Başa: `an isometric shoreline transition tile, grass meeting shallow water with
a sandy foam edge —` ve yön belirt: `water on the SOUTH edge` → `shore-s.png`,
benzer şekilde `n/e/w`, köşeler `ne/nw/se/sw`.

---

## 2. YOL TILE'LARI (taş döşeli, otomatik döşeme seti)

Başa: `an isometric stone-paved road tile on a 2:1 diamond base, worn
cobblestone with sandy limestone edges, blending into bare earth at the sides —`
ve şekli belirt:

| Dosya | Şekil cümlesi |
|---|---|
| `roads/straight-ns.png` | a straight road running north-south (top-left to bottom-right) |
| `roads/straight-ew.png` | a straight road running east-west (top-right to bottom-left) |
| `roads/corner-ne.png` / `-nw` / `-se` / `-sw` | an L-shaped road corner turning toward the {NE/NW/SE/SW} |
| `roads/t-n.png` / `-e` / `-s` / `-w` | a T-junction road opening toward {N/E/S/W} |
| `roads/cross.png` | a four-way crossroads intersection |
| `roads/end-n.png` / `-e`/`-s`/`-w` | a dead-end road stub facing {N/E/S/W} |
| `roads/plaza.png` | a paved open plaza / public square, decorative stone pattern |
| `roads/bridge-ns.png` / `-ew.png` | a short stone bridge over water, low arches, running {N-S / E-W} |

---

## 3. BİNALAR (14 oyun yapısı — Osmanlı/Akdeniz)

Her bina: **footprint tabanına oturur, taban alt-orta, çatı yukarı taşar.**
Başa: `a single isometric {FOOTPRINT}-tile building for a Mediterranean-Ottoman
strategy city, base sitting flat on the ground tiles —`

| Dosya | Footprint | Prompt cümlesi |
|---|---|---|
| `buildings/divan.png` | 3×3 | an Ottoman town council hall (divanhane), two storeys of warm limestone, wide terracotta clay-tiled hipped roof, arched windows, a small central lead dome and a flag, stone entrance steps — the grandest civic LANDMARK, clearly larger and taller than houses |
| `buildings/saray.png` | 3×3 | a grand Ottoman palace, white limestone with an arcaded colonnade, several lead domes and a slender ornamented tower, hint of an inner courtyard, muted gold accents — a majestic royal LANDMARK |
| `buildings/medrese.png` | 2×2 | an Ottoman medrese (theology college), square building wrapped around an arcaded courtyard of small domed cells, a modest central dome, limestone and plaster |
| `buildings/hamam.png` | 2×2 | an Ottoman hamam bathhouse, low massive stone block topped by several small lead domes pierced with star-shaped glass vents, a smoking chimney |
| `buildings/elcilik.png` | 2×2 | a dignified Mediterranean embassy residence, two storeys of stone, a small columned portico, tiled roof, a pair of flags |
| `buildings/konut.png` | 2×2 | a cluster of Ottoman-Mediterranean townhouses, whitewashed limestone walls, terracotta tiled roofs, wooden shutters and small balconies, a chimney — cozy residential (istersen `konut-a/b/c.png` varyant) |
| `buildings/carsi.png` | 2×2 | an Ottoman covered bazaar, a stone arcade with pointed arches and striped cloth awnings, market stalls piled with goods and amphorae — lively commerce |
| `buildings/ambar.png` | 2×2 | a stone-and-timber granary and warehouse, big terracotta roof, large wooden loading doors, stacked sacks and barrels outside |
| `buildings/kereste.png` | 2×2 | a timber lumber yard, an open wooden workshop under a shingle roof, stacked logs and sawn planks, a sawhorse |
| `buildings/tas.png` | 2×2 | a limestone quarry works, cut stone blocks, a wooden derrick crane and a loaded cart, an exposed rock face |
| `buildings/kisla.png` | 3×3 | an Ottoman military barracks, stone walls with crenellations around a central drill yard, watch corners and banners — solid and martial |
| `buildings/liman.png` | 2×2 | a Mediterranean trade-harbor building at the shoreline, a stone customs warehouse with a timber dock/pier reaching onto turquoise water, crates and a moored wooden trade boat |
| `buildings/tersane.png` | 3×2 | an Ottoman shipyard on the water, a large timber slipway with a wooden ship hull under construction and scaffolding, ropes and tar barrels |

**Seviye varyantı (opsiyonel, güzel olur):** her bina için biraz daha
büyük/görkemli `-l2` ve `-l3` versiyonu (ek kat, daha çok kubbe/süs). Vermezsen
tek görsel + seviye rozeti kullanılır.

---

## 4. SURLAR (şehir duvarı — otomatik döşeme)

Başa: `an isometric segment of Ottoman city wall on a 2:1 diamond base, warm
limestone ashlar blocks with crenellations (merlons), a walkway on top —`

| Dosya | Şekil |
|---|---|
| `buildings/wall-ns.png` / `wall-ew.png` | straight wall running {N-S / E-W} |
| `buildings/wall-corner-ne.png` … `-sw.png` | a corner wall turning {NE…SW} |
| `buildings/wall-gate.png` | a fortified gatehouse with a pointed stone arch and wooden doors |
| `buildings/wall-tower.png` | a round crenellated stone watchtower, slightly taller |

---

## 5. SU / LİMAN EK PARÇALARI

Başa: `an isometric harbor prop, isolated, sitting on shallow turquoise water —`

| Dosya | Prompt |
|---|---|
| `water/dock.png` | a wooden dock platform on stilts extending over water |
| `water/pier.png` | a long narrow wooden pier walkway |
| `water/boat.png` | a small Ottoman-Mediterranean wooden trade boat, furled sail |
| `water/fishing.png` | a fishing spot: nets on poles and a rowboat |

---

## 6. DEKORASYON (küçük, taban alt-orta anchor)

Başa: `a single small isometric decoration prop, isolated —`

| Dosya | Prompt |
|---|---|
| `decor/cypress.png` | a tall slender Mediterranean cypress tree, dark green |
| `decor/olive-tree.png` | a gnarled olive tree, silvery-green canopy |
| `decor/broadleaf-tree.png` | a rounded broadleaf shade tree, warm green |
| `decor/bush.png` | a low round shrub |
| `decor/flower.png` | a small patch of wildflowers |
| `decor/rock.png` | a cluster of weathered grey boulders |
| `decor/barrel.png` | a wooden barrel |
| `decor/crate.png` | a wooden cargo crate |
| `decor/amphora.png` | a terracotta amphora / clay jar |
| `decor/bench.png` | a stone or wooden bench |
| `decor/lamp.png` | an ornate iron street lamp |
| `decor/fountain.png` | an Ottoman stone fountain (çeşme) with flowing water |
| `decor/market-stall.png` | a small market stall with striped awning and goods |
| `decor/cart.png` | a wooden hand cart with sacks |
| `decor/sign.png` | a wooden signpost |
| `decor/statue.png` | a carved stone statue on a pedestal |

---

## 7. ÜRETİM AKIŞI (öneri)

1. Önce **1 bina** (mesela `divan`) üret, stilini beğen.
2. Onun **stil referansını** (Midjourney `--sref`, ya da üreticinin "use as
   style") sabitle.
3. Diğer TÜM asset'leri o referansla üret → hepsi kardeş görünür.
4. Alfa yoksa arka planı toplu sil (remove.bg / `rembg` batch).
5. `ASSET_SPEC.md`'deki klasör/isim düzeniyle zip'le, bana gönder.
6. Eksikler olursa sorun değil — gelenleri kurarım, eksiği `TODO_ASSET`
   işaretlerim.

> Not: Renk/ışık kaçarsa (bir bina diğerlerinden parlak/farklı açıda), onu
> tek başına yeniden üret — karışık ışık/açı, "farklı yerlerden gelmiş" hissi
> verir ve premium görüntüyü bozar.
