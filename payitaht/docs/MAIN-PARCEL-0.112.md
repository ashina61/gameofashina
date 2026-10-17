# Ortak arsa sistemi ana oyunda — 0.112.0 / SW135

17 Ekim 2026: Kullanıcı onaylı kışlayı ana oyuna aktarmayı istedi.

Ana `CityCanvas`, `MasterCityScene` yerine `ParcelCityScene` yükler. Arazi ve yollar çalışan Ikariam inceleme prototipinin aynı yol/ağaç çiziminden üretilir. 25 eş kara arsası, üç kıyı arsası ve korsan adası sabit motor indislerini korur. Yeni görsel projeksiyon bütün kara arsalarında aynı 2:1 kameradır. Kayıt göçü veya motor koordinatı değişikliği yoktur.

Kışla `parcel-v1/kisla.webp` ve telefon eşini kullanır. Bina ve eşya aralarındaki gerçek alfa mevcut şehir çayırını gösterir. Arka plan, plaka veya avlu dolgusu eklenmez. Alfa konturu tek ölçek ve konumla karoya sığar; projektif eğme ve kırpma yoktur. Kalan türler mevcut izometrik stage görselleridir; onaylanan yeni tasarım standardına göre henüz yeniden çizilmedi. Önizleme seçicisi ana sahneyle aynı kaynağı kullanır.

Seçim, inşaat ve süre, taşıma, yön, kuşatma görünümü, liman odağı, şehir/uzak görünüm, kamera sürükleme ve yakınlaştırma mevcut React köprüsünü kullanır. HUD kaynaklarına dokunulmaz. Sur görseli yeni kamera yönlerini takip eder.

`tools/prepare-parcel-city.cjs` araziyi ve gerçek çizimlerden alfa konturlarını tekrar üretir. `NODE_PATH="$CODEX_PRIMARY_RUNTIME_NODE_MODULES" node tools/prepare-parcel-city.cjs`.

## Doğrulama

- Motor indisleri/bölgeleri korunur; yol koridorları arsa poligonlarının dışındadır.
- Gerçek tam/telefon kışlası bütün 25 kara arsasında iki yönde sınır içinde; açık avludaki beş nokta alfa sıfır.
- Mevcut bütün tür/seviye/çözünürlük konturları tek oranda uygun arsalara yerleşir.
- `docs/mockups/main-parcel/native-center.webp` gerçek varlıklardan native kompozisyondur; tarayıcı kanıtı değildir.
- Tam kontrol ve canlı tarayıcı sonuçları yayın doğrulamasından sonra aşağıya yazılır. `layout-qa.cjs` doğrudan Playwright kullandığından bu oturumdaki yalnız CUA tarayıcı kuralıyla çalıştırılamaz; mevcut HUD ve gerçek ana sahne CUA ile denetlenir.

Yayın öncesi: `pnpm check` geçti (363/363, tip, ESLint, CSS). `v2-criteria.cjs`, yarım boy varlık kontrolü ve Pages static export derlemesi geçti.
