# G6 — boyalı birlikler (onay durağı)

29 birlik için özgün, şeffaf, 512×512 WebP figür. `UnitFigure` aynı
`id/size/bare/title` imzasını korur; eski SVG çizimi yerine `<img>` kullanır.
Kara/deniz madalyon zemini ve savaş yuvasındaki `bare` davranışı korunur.
Alt metin birlik adı veya verilen başlıktır. Oyun verileri ve kuralları,
ekonomi, kayıt biçimi ve slot koordinatları değiştirilmedi.

Üretim: yerleşik OpenAI ImageGen; G0 onaylı stil referansı.
Tarifler: `tools/art/prompts/g6.md`, kaynak kayıtları:
`public/images/game/CREDITS.md`. İzole olmayan ilk denemeler reddedildi;
son figürlerde deniz/gökyüzü/parşömen fonu yok. Tuval nefes payı korunarak
alfa ile WebP küçültme; büyük PNG dosyaları depoya eklenmedi.

## Önce / sonra

390×844, aynı geç oyun kaydı ve panel konumu; WebP ≤200 KB.

| Ekran | Önce | Sonra |
|---|---|---|
| Ordu | [WebP](before/army-390x844.webp) | [WebP](after/army-390x844.webp) |
| Kışla | [WebP](before/barracks-390x844.webp) | [WebP](after/barracks-390x844.webp) |
| Tersane | [WebP](before/shipyard-390x844.webp) | [WebP](after/shipyard-390x844.webp) |

[56 px / 80 px, parşömen ve koyu zemin](after/units-56px.webp).
Temas sayfasında her yarıda soldan sağa, üstten alta dosya adına göre
alfabetik sıra. Silah, başlık, gövde ve gemi donanımıyla roller ayrışır.

## Kontroller

29 dosya gerçek oyun kataloğuyla birebir eşleşir; tümü 512×512, alfa kanallı ve ≤60 KB. Boyut/toplam/şeffaf köşe/opak fon kontrolleri gerçek çözülmüş piksellerde yapılır. Birlik toplamı 861,880 bayt; G5 telefon envanteri + G6 = 14,947,294 bayt (14.947 MB / 14.255 MiB), bütçe 15,000,000 bayt. Kodlama ayarları `encoding.json`, bütçe ve alfa ölçümü `asset-report.json`.

TypeScript, 319 test, ESLint sıfır uyarı, CSS/unused CSS strict, unused assets strict (419 dosya, kullanılmayan 0), half-size ve V2 geçti. Statik export derlendi. Layout: 360×740 ve %130 yazıda altı ihlal kategorisi ve sayfa hatası sıfır. 390×844 görsel QA: eksik görsel/sayfa hatası sıfır. İlk sekiz rehber hedefi 4,7 oyun dakikasında tamam. Ordu/kışla/tersane figür yüklenmesi ve erişilebilir ad kontrolü geçti. SW cache v34 ve testi birlikte güncellendi.

Ortam: G5 ile aynı izole Chromium 138/SwiftShader ayarı. Testler tsx IPC kısıtlaması nedeniyle aynı dosyalarda `node --import tsx --test` ile çalıştırıldı. Önceki cihaz ortamıyla doğrudan açılış süresi karşılaştırması yapılmaz. Yerel tarayıcı çalıştırma ayarı depoya eklenmedi.

Yeniden kontrol: `node tools/art/unit-assets.cjs`; seçilmiş ImageGen kaynak manifestini dönüştürme: `node tools/art/unit-normalize.cjs <manifest.json>`. Her kayıt `id` ve kaynak `path` içerir. `node tools/art/unit-review.cjs before|after` ordu/kışla/tersanede ilk birlik figürüne kaydırıp aynı kadrajı alır; son durumda gerçek `<img>` yüklenmesini, 512 px kaynağı, alt metni ve eksik dosya/sayfa hatası olmadığını doğrular.

G6 ayrı commit/push sonrası burada durulur; G7'ye geçmek için kullanıcı
onayı beklenir.

Son toplam bütçe ondalık MB ile de denetlendi: 14.947.294 ≤15.000.000 bayt. Kara figürleri ≤25 KB, gemiler ≤40 KB; son kodlama sonrası alfa/piksel/bütçe kontrolü ve panel kanıtları yenilendi.
