# Tek Osmanlı kışlası — 21 Ekim 2026

Kullanıcı kuleli, revaklı yeniçeri kışlası konsepti için “bu olabilir” dedi. Bu değişiklik yalnız kışlanın şehir sprite'ını o yönde yeniler. Bütün katalog tamamlanmış veya yeni oyun yerleşimi ayrıca kabul edilmiş sayılmaz.

İlk şeffaf kesit iki katlı ve yüksek kuleliydi. Sabit arsa sınırına tek oranla sığdırıldığında küçük kaldı. Bu nedenle aynı kemerli koğuş, kurşun çatılı iki köşe pavyonu, kiremit çatı, kırmızı sancaklı kapı ve talim eşyaları daha alçak, tek katlı ve geniş mimariyle yeniden çizildi. Son varlık ilk konseptin piksel piksel kesiti değildir; üretim için yapılan bu oran değişikliği oyun görüntülerinde ayrıca incelenmelidir.

`public/images/game/buildings/parcel-v3/kisla.webp` ve `kisla-sm.webp` gerçek alfa içerir. Avlu toprağı, yollar ve çevre sprite'a gömülü değildir. Tam sürüm 960×480 / 120.850 bayt, telefon sürümü 480×240 / 38.828 bayttır. Üretici built-in imagegen; kaynak özeti `approved-barracks-provenance.json`, tekrar paketleme `tools/art/prepare-approved-barracks.cjs`.

Yerleşim mevcut `parcelArtFrame` ile tek oranla ölçeklenir; görünen alfa sınır kutusunun merkezi arsa merkezindedir. Bu ölçüm, binanın ayrıca ölçülmüş fiziksel taban merkezinin doğrulanması anlamına gelmez. Arsa 1'de tuvalin dünya boyutu yaklaşık 293,88×146,94; sabit arsa 320×160'tır. Çatı, dekor ve temas gölgelerinin alfa konturu ortak arsa poligonunun içinde tutulur. Arsa/yol/zemin koordinatları, belediye, diğer türler, bina seviyesi mekaniği, HUD ve kayıt biçimi değişmez. Tek çizim bütün kışla seviyelerinde kullanılır; yeni büyüme aşamaları bu işte üretilmedi.

Kanıtlar `docs/mockups/approved-barracks/` altında. `native-plot.webp` gerçek terrain + runtime sprite ile hesaplanan birleşimdir; tarayıcı ekranı değildir. `game-*.webp` gerçek statik ana oyun/Phaser ekranlarıdır. `tools/approved-barracks-review.cjs` yeni asset isteği, alfa konturunun arsa sınırı ve kışla dokunma hedefini ölçer; görsel uyumun son kararı ekran incelemesidir.

Doğrulama sonucu bu kaydın sonunda tutulur. İnceleme dalı ana dala birleştirilmeden canlı sürüm 0.119.0 / SW144'tür.

## Doğrulama

- `pnpm check`: typecheck, 372 test, ESLint ve CSS kontrolleri geçti. Son merkez assertions değişikliğinden sonra `parcel-city.test.ts` içindeki 6 test ayrıca geçti; son QA aracı ESLint kontrolü de geçti.
- `STATIC_EXPORT=1 pnpm build` geçti. Export edilen telefon WebP özeti kaynakla aynı.
- V2 ölçütleri geçti; toplam telefon bina görselleri 12,4 MiB, sınır 15 MiB.
- Statik ana oyunda 360/390/430 telefon genişlikleri: seviye 1/8/20, ortadaki aynalı; yeni varlık yüklendi, alfa konturunun arsa dışındaki noktası 0, binaya dokunma kışla panelini açtı. 1536 masaüstünde çizim/yükleme ve kontur ölçümü geçti. Masaüstü koordinatla dokunma otomasyonu paneli açamadı; bu kontrol tamamlanmış sayılmadı ve masaüstü kayıt alanı `tapOpenedBarracks: null` tutuldu.
- Tarayıcı sayfa hatası ve eksik istek 0. Ekran kanıtları telefonda CSS genişliğine, masaüstünde 1200 piksele indirilerek saklandı; DOM/Phaser ölçümleri bundan önce gerçek DPR ile yapıldı.
- Zorunlu genel `layout-qa`: çıkış 1. Taşma/kesik/çakışma/isimsiz/sayfa hatası 0; küçük dokunma alanı 312 ve küçük yazı 663. Bunlar önceki incelemede de aynı sayıda kayıtlı HUD taban uyarılarıdır; bu tek bina işiyle düzeltilmedi. `layout-summary.json` sonucu saklar.
- Üretim promptu `approved-barracks-prompt.txt`. Alpha sınır dosyasında yalnız `kisla` kaydı değişti.
