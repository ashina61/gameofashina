# Payitaht — ortak görsel üretim kökü (G0)

Durum: **G0 onayı bekleniyor**. G1'e geçmeden depo sahibinin onayı gerekir.

Her üretimde bu kökü, grup tarifini ve `docs/stil-sayfasi.webp` referansını
birlikte kullan. Bina üretiminde ilgili mevcut boyalı binayı da referans ver.

```text
Original Ottoman–Mediterranean mobile strategy game art. Match the attached
approved Payitaht style sheet and existing painted Divanhane building as one
coherent hand-painted asset family. Slightly stylized realism, finely controlled
brush texture, readable silhouettes, restrained thin dark-brown edges, never
thick black outlines or flat vector fills. Warm daylight from upper-left;
soft shadows toward lower-right. Terracotta roofs, lead-blue domes, cream
limestone, olive and pine greens, muted Mediterranean turquoise, aged brass
gold, dark walnut and warm parchment. Buildings, trees and objects use true
2:1 orthographic isometry, no perspective convergence. Portraits: three-quarter
face looking right. Troops: three-quarter body looking right. Historically
grounded Ottoman clothing and architecture, natural proportions, no caricature.
Isolated assets have genuine transparency and clean alpha edges, no background
halo; soft contact shadow remains within the asset bounds. No letters, numbers,
words, labels, logos, watermark, real person, borrowed game character or copied
composition. Keep the object fully inside the canvas with breathing room.
```

## Teknik teslim

- Son dosya WebP, kalite 82; nesnelerde alfa korunur.
- İkon: 256×256, ≤12 KB; portre/birlik: 512 px, ≤60 KB.
- Zemin: ≤150 KB; boyalı bina: 1774 px genişlik, `half-size.py` ile telefon kopyası.
- Telefon toplam bütçesi ≤15 MB; oyun metni koddan gelir.
- Her dosya CREDITS.md'ye araç, tarih, tarif ve kullanım notuyla kaydedilir.
- Yeni oyun asset'i bağlandığı fazda SW listesine eklenir; cache sürümü ve testi
  birlikte güncellenir. G0 stil belgesi `public/` dışında, oyunda yüklenmez.

## Referans

- Mevcut ölçü: `public/images/game/buildings/divan-painted-1.webp`.
- Stil belgesi: `docs/stil-sayfasi.webp` (1536×1024, WebP).
- G0 üretim tarifi: `tools/art/prompts/g0.md`.
- Parşömen fon yalnız onay sayfasının sunumudur; ileriki nesne asset'lerinde
  arka plan şeffaf olmalıdır. Sayfadaki örnekler kırpılıp oyun asset'i yapılmaz.
