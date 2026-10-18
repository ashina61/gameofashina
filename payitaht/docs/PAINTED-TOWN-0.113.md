# Doğal kıyı şehri — 0.113.0 / SW136

Son onaylı doğal şehir resmi ana `ParcelCityScene` arka planıdır. Önceki düzenli 5×5 yol ağı kaldırıldı. 1586×992 resim tek ölçekte 3172×1984 dünyaya açılır; 24 normal kara arsası resimden ölçülmüş merkezlerde 256×128 eşit geometri kullanır. Sabit belediye merkezdeki kamusal açıklıkta 448×224 alandadır. İki ana kumsal liman noktası, kayalık kıyıda mevcut üçüncü motor noktası ve ayrı korsan adası korunur. 29 kimlik/bölge ve kayıt formatı değişmez.

Arka planın bayrakları ve belediyesi çıkarılmıştır. Boş arsa bayrakları yalnız açık ve boş noktada çizilir; arsa dolunca kaybolur. Belediye gerçek alfa sprite olarak seçim ve seviyeye bağlanır. Kışla mevcut zeminsiz çizimdir. Diğer türler eski izometrik stage çizimleridir; bu sürüm hepsini yeniden tasarlamaz. Uniform ölçekleme ve gerçek alfa konturu bütün mimariyi arsa içine sığdırır. Çarpıtma, kırpma, bina altına zemin ekleme yoktur. Normal görünümde elmas çerçeve yok; taşıma/inşa seçimi aynı gerçek hit poligonunu gösterir.

Yürüyüş yolları boyalı sokaklar ve köprülerden ölçülür. Gemiler gerçek körfezde gezer. Sur çizimi yalnız motor seviye>0 durumunda ayrı saydam görseldir. HUD dosyaları ve görselleri değişmedi.

## Doğrulama

- `pnpm check`: 363 test, tip ve lint denetimi.
- `node tools/v2-criteria.cjs`, `python tools/art/half-size.py --check`.
- Pages statik derleme.
- `native-layout.webp` gerçek assetler ve arsa konturuyla teknik birleşik kontrol; canlı oyun ekranı değildir.
- `tools/layout-qa.cjs` bağımsız Playwright çalıştırdığı için tarayıcı kullanım yönergesi uyarınca çalıştırılmaz. Eşdeğer gerçek UI kontrolleri CUA ile ana oyunda yapılır; yayın sonrası sonuç aşağıya eklenir.
