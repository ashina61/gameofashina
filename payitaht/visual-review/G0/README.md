# G0 — stil onayı

Kaynak: `claude/ancient-city-phaser-game-r9e0qu`,
`83e650248685e27e90c74b957e1eaff41c6f5b26`. Çalışma dalı: `codex/gorsel`.
Tarih: 2026-10-03. **G0 onayı bekleniyor; G1 başlamadı.**

## Önce / sonra

| Önce | Sonra |
|---|---|
| [Mevcut bileşenler](before/style-sheet.webp) | [Üretilen stil sayfası](after/style-sheet.webp) |

Önce görüntüsü `UnitFigure`, `AdvisorPortrait`, `AkceArt`, `KeresteArt`,
`TasArt` ve `GameButton` bileşenlerinin gerçek React çıktısı ile mevcut
Divanhane/zeytin ağacı dosyalarını kullanır. Bileşenler karşılaştırma için
büyütülmüştür. Oyun ekranı değildir. Sonra görüntüsü yeni stil belgesinin
tarayıcıda 1536×1024 yakalamasıdır; oyun ekranına uygulanmış gibi sunulmaz.

Gerçek telefon başlangıç görüntüleri: [şehir](before/city-390x844.webp),
[ordu](before/army-390x844.webp). G0 yalnız sanat onayıdır: brifteki kod
bağlantısı `—`; oyun görüntüsü bu fazda değişmez.

Yeniden yakalama: statik derlemeden sonra Playwright erişilebilirken
`node tools/art/style-review.cjs`. Araç `out/` CSS'ini ve güncel React
bileşenlerini kullanır. Onaylı önce görüntüsünü yeniden üretmek için kaynak
commit'inin bileşenleri kullanılmalıdır.

## Çıktılar

- `docs/stil-sayfasi.webp`: mevcut boyalı Divanhane referansı, yeniçeri,
  şehir danışmanı, akçe/kereste/taş, yazısız ceviz-pirinç düğme ve zeytin ağacı.
- `tools/art/prompts/_kok.md`: sonraki üretimler için ortak sanat tarifi.
- `tools/art/prompts/g0.md`: kullanılan tam üretim tarifi.
- `public/images/game/CREDITS.md`: stil belgesinin üretim ve kullanım kaydı.

Stil belgesi WebP kalite 82, 1536×1024, yaklaşık 186 KB. `docs/` içindedir,
oyun tarafından indirilmez. SW cache ve testi bu fazda değişmez: yeni public
oyun asset'i veya runtime bağlantısı yoktur. G1'den itibaren her yeni oyun
asset'iyle birlikte cache listesi/sürümü/testi güncellenecektir.

Oyun kuralları, ekonomi, kayıt biçimi, slot koordinatları, ayak izi,
bina çapaları ve mevcut bina dosyaları değiştirilmedi.

## Bölüm 6 kontrolleri

| Kontrol | Sonuç |
|---|---|
| `npx tsc --noEmit` | Geçti |
| `lib/**/*.test.ts` | 309/309 geçti |
| `pnpm lint` | Sıfır uyarı/hata |
| CSS lint + unused CSS `--strict` | Geçti, 0 kullanılmayan sınıf |
| `unused-assets.cjs` | Geçti, 0 kullanılmayan görsel |
| `half-size.py --check` | Geçti |
| `v2-criteria.cjs` | Tüm ölçütler geçti, telefon bina seti 9.9 MB |
| Statik derleme, gerçek `/gameofashina/` tabanı | Geçti |
| `layout-qa.cjs`, 360×740 ve %130 yazı | Tüm kategoriler 0; sayfa hatası 0 |
| `visual-qa.cjs`, 390×844 | Geçti; eksik oyun asset'i ve sayfa hatası 0 |
| `first-ten-qa.cjs` | 8 rehber hedefi 3.6 oyun dakikasında tamamlandı |

Ortam notu: `npx tsx --test` / `pnpm test` çalıştırıcısı bu ortamda Unix
soketi açarken `EPERM` aldı. Aynı 309 test dosyası, oyun veya test kodu
değişmeden `node --import tsx --test $(find lib -name '*.test.ts')` ile
çalıştırıldı ve geçti. Tarayıcı kontrolleri kendi yerel sunucusuyla aynı
işlem ağında çalıştırıldı. Rehber logundaki iki geçici Geri tıklama timeout'u
kontrolün tekrar denemesiyle aşıldı; tüm hedefler tamamlandı.

Ham kanıtlar: `layout-report.json`, `diagnostics.json`, `first-ten.log`.
`diagnostics.json` tüm visual QA yakalamalarının adlarını listeler; G0
klasöründe yalnız bu onay için seçilen yakalamalar tutulur.
