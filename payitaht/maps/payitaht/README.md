# Payitaht Şehir Haritası (Tiled)

İkariam benzeri, büyük ve dikey kaydırılabilir şehir ekranı için **Tiled Map
Editor** uyumlu, tamamen **geometrik** bir slot sistemi. Burada artwork YOKTUR;
yalnızca slotların koordinatları ve footprint standardı tanımlıdır.

## Dosyalar

| Dosya | Ne |
|---|---|
| `payitaht.tiled-project` | Tiled proje dosyası (SlotType enum'u dahil). |
| `payitaht_city.tmj` | Harita: isometric, 128×64, 100×140, 9 katman. **Editörün gerçeği.** |
| `tilesets/markers.tsj` | İleride zemin/dekor karoları için boş yer tutucu tileset. |
| `../../lib/game/city-map/city-slots.json` | Oyunun okuduğu SADE slot verisi (üretilir). |
| `../../tools/tiled/build-map.mjs` | `.tmj` + `city-slots.json`'u üreten betik (tek kaynak). |
| `../../tools/tiled/validate-map.mjs` | Yapı + parity doğrulaması (CI). |

## Ölçüler

- Orientation: **isometric**, tile **128×64**, harita **100×140**.
- Belediye: haritanın geometrik merkezinde (`gx=50, gy=70`), **çakılı** slot `city_hall`.
- Standart footprint: **2×2 karo** — bütün normal city slotları BİREBİR aynı.

## Slot tipleri (yalnızca 3)

- `city` — normal kara binaları (saray, kışla, medrese, çarşı, depo, cami,
  demirci…). Herhangi bir boş city slotuna taşınabilir. **24 taşınabilir + belediye.**
- `coast` — deniz yapıları (ticaret limanı, tersane, iskele). Alt kıyıda.
- `defense` — sur kule/kapı yuvaları. Arkaplanda hazır sur yoktur; yalnızca boş
  **savunma temel hattı** (`DEFENSE_FOUNDATION` polygon'u) çizilidir.

## Katmanlar

`GROUND` · `ROADS` (tile) — `BUILDING_SLOTS` · `COAST_SLOTS` ·
`DEFENSE_FOUNDATION` · `DECORATION` · `BUILDINGS` · `DEFENSE` · `DEBUG` (object).

## İş akışı

```bash
node tools/tiled/build-map.mjs     # .tmj + city-slots.json üret
node tools/tiled/validate-map.mjs  # doğrula (CI de bunu koşar)
```

Tiled'da elle düzenlerken her slot nesnesinin `gx/gy/fw/fh/slotType/fixed`
özellikleri korunmalı; sonra `build-map.mjs` yeniden çalıştırılıp JSON
güncellenmeli (CI, `.tmj` ↔ JSON parity'sini denetler).

## Debug / test

`/map-debug` sayfası bağımsız bir Phaser sahnesidir: slot elmaslarını, numaraları
ve footprint'i çizer, **Randomize Buildings** ile normal binaları rastgele
slotlara dağıtır (scale değişmeden). `lib/game/building-slot-system.ts` (saf TS)
`getSlots / getEmptySlots / placeBuilding / moveBuilding / removeBuilding /
swapBuildings` sağlar; testleri `lib/game/building-slot-system.test.ts`.

Bu sistem canlı oyunu (`lib/game/layout.ts`) DEĞİŞTİRMEZ; yeni ve bağımsız bir
katmandır. İleride canlı şehir buna göç edebilir.
