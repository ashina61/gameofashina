# Şehir kamerası ve zeminsiz bina kataloğu — 0.114.0 / SW139

Kullanıcının 18 Ekim “kalan işleri hallet” talebi: 0.113.0 sonrası kamera ve kalan bina türlerinin ana şehre aktarımı. Bina türleri ve sahnedeki kimlikleri değişmez; ortak boyalı şehir zemini, sabit belediye, 24 normal kara arsası, mevcut kıyı/ada noktaları ve oyun kayıtları korunur.

## Kamera

`ParcelCityScene` kamerası artık tuvalin tamamını şehir alanı saymaz. Gerçek `.ika-top` altı ile `.ika-nav` üstü arasında bir viewport kullanır. Minimum yakınlık da bu görünür alandan hesaplanır. Belediye arsa merkezi çevresiyle beraber ortalanır; sprite'ın saydam tuval merkezi odak kabul edilmez. HUD ölçüleri ve ekran yönü değişince yeniden hesaplanır. Pan, pinch ve görünüm düğmeleri aynı kamerayı kullanır. HUD dosyaları değişmez.

## Binalar

`public/images/game/buildings/parcel-v2/`: 34 ayrı tür + liman/tersanenin 2 düz yön varyantı. Her biri 960 px tam ve 480 px telefon WebP; kaynak alfa korunur. Bina katmanı avlu toprağı, arazi veya dış döşeme taşımaz. Yeni bir runtime zemin yaması yoktur. `cityBuildingImage` ana şehir ve mevcut inşa seçicisinde bu seti kullanır. Belediye `painted-town-v1`, kışla onaylı `parcel-v1` olarak kalır. Sur görseli değişmez.

Tiplerin görsel ayrımı: konutun ahşap çıkmaları, hamamın kubbe kümeleri, çarşının renkli açık tenteleri, ambarın siloları, medresenin derslikleri, kahvehanenin divanları, caminin minaresi, müzenin sütunlu cephesi, optik atölyesinin teleskobu, barutanenin tuğla depoları, arşivin harita salonu, tiyatronun sahnesi, korsan kalesinin sur kütlesi. Üretim atölyelerinde ilk L-planı tekrarları ayrıca revize edildi.

Yeni katalogda tür başına bir mimari çizim vardır; bu iş üç/beş farklı büyüme çiziminin tamamlandığı anlamına gelmez. Seviye, yükseltme, maliyet, arsa açılışı, kıyı yönü, taşıma ve kayıt biçimi değişmez. Mevcut seviye anahtarları aynı türün yeni mimarisini yükler.

Üretim: built-in imagegen. İstem setleri `parcel-v2-prompts.json` ve son seçilen altı mimari için `parcel-v2-revised-prompts.json`, kaynak SHA256 ve çıktı adları `parcel-v2-provenance.json`. Paketleme yalnız boyut/WebP dönüşümüdür; mimari kırpılmaz, esnetilmez, alfa yeniden boyanmaz. Gerçek çıktılardan `prepare-parcel-city.cjs` ile konturlar tekrar ölçülür. Bütün kontur tek oranla arsanın içine yerleştirilir.

## Doğrulama

- Kamera sözleşmesi: üç telefon ve yatay görünümde belediye/arsa HUD bandının içinde, komşu arsalar görülebilir.
- Katalog: tam/telefon, yön/ayna ve uygun bütün arsalarda gerçek alfa piksel kenarları taşmaz; saydam arka plan ve dosya ayrılığı denetlenir.
- `tools/parcel-v2-review.cjs`: gerçek runtime görselleriyle katalog ve iki şehir kompozisyonu. Bunlar **native asset birleşimleridir**, tarayıcı/oynanış ekran görüntüsü değildir.
- `pnpm check`: 365/365 test, TypeScript, ESLint ve CSS denetimi geçti.
- GitHub Pages taban yoluyla statik `pnpm build` geçti.
- `node tools/v2-criteria.cjs` ve `python tools/art/half-size.py --check` geçti.
- 72 WebP: tam boy toplam 3.42 MB, telefon toplam 1.10 MB; en büyük dosya 146,806 bayt. Ortak telefon görsel bütçesi yeni klasörleri de sayar: 12.3 / 15 MiB.
- Yayın sonrası Actions sonucu ve HTTP içerik kontrolü ayrıca izlenir.
- CUA test tarayıcısı yerel sunucuya bağlanamadı; bu nedenle `layout-qa.cjs` ve canlı etkileşim kontrolleri geçmiş gibi gösterilmez.
