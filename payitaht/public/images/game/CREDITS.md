# Görseller — kaynak

Oyundaki bütün şehir görselleri bu depodaki araçlarla **kod ile çizilir**;
dışarıdan alınmış ya da eski boyalı paketten kalan görsel yoktur.

| Klasör | Üreten araç | İçerik |
|---|---|---|
| `buildings/` | `tools/art/buildings.py` | 22 yapı × 3 seviye aşaması (1: sv. 1-3, 2: sv. 4-7, 3: sv. 8+), inşaat alanı (`site`), yükseltme iskelesi (`scaffold`) |
| `decor/` | `tools/art/decor.py` | zeytin, servi, çalı, çiçek, kaya |
| `terrain/` | `tools/art/decor.py` | çim ve toprak dokuları |
| `walls/` | `tools/art/decor.py` | yuvarlak sur kulesi |
| `ships/` | `tools/art/gen-procedural-assets.py` | koydaki gemiler |

Hepsi `tools/art/isokit.py` motorunu kullanır: oyunla aynı 2:1 izometri,
sol-üst ışık, sağa düşen gölge, malzeme dokuları (sıva, kesme taş, kiremit,
kurşun, ahşap). Görseller deterministiktir; aracı yeniden çalıştırmak aynı
dosyaları üretir.
