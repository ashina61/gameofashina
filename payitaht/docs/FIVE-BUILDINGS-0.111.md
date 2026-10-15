# Beş ayırt edici bina — 0.111.0 / SW131

16 Ekim 2026. Kullanıcı son beş binalı şehir çizimini oyuna aktarmayı istedi. Bu sürüm ana `MasterCityScene`, inşa sonrası doku yükleyicisi ve bina önizleme seçicisini günceller. Kışla, medrese, depo, çarşı ve hamam `master-v8` varlıklarını kullanır. Diğer 31 bina yenilenmedi.

| Tür | Ayırt edici biçim |
| --- | --- |
| Kışla | Mazgallı iki kule, bordo askerî sancaklar, talim avlusu |
| Medrese | Mavi köşe kütüphanesi, revaklı derslikler, ağaçlı okuma avlusu |
| Depo | Tek uzun yük ambarı, büyük ahşap kapı, yük vinci |
| Çarşı | Çizgili açık tenteler, ahşap tezgâhlar |
| Hamam | Alçak kubbe kümesi, çatı ışıklıkları, kısa ocak bacası |

Onaylanan kompozisyon tek boyalı görüntüydü. Beş bağımsız varlık yerleşik imagegen ile aynı referanstan üretildi; nihai görseller tam ve telefon çözünürlüklerinde `public/images/game/buildings/master-v8/` altında. Her dosya 200 KB altında; gerçek alfa korunur. Referans: `mockups/five-buildings/reference.webp`.

Üretim istemleri ortak olarak yüksekten görülen kamera, yatay ön/arka yön, sıcak krem taş ve kiremit, sol üst ışık ve kısa gölge, tek yapı ve işlevsel avlu, şeffaf dış alan, dış yol/zemin plakası/yazı/insan olmaması koşullarını kullandı. Tür başına yukarıdaki farklı mimari tarif edildi. Bu nedenle bağımsız görseller, ilk kompozisyondaki bina piksellerinin birebir kesilmiş kopyaları değildir.

## Yerleşim

Mimari, görünen alfa konturuna göre tek uniform ölçekte tam arsa poligonuna sığar. Mimarinin en-boy oranı değişmez; çatı veya kubbe kırpılmaz. Şeffaf tuval, bina sınırı olarak kabul edilmez. Üretim alfa kanalındaki 8/255 altındaki görünmez uzak toz pikselleri paketlemeden önce temizlenir; gerçek son WebP konturları yeniden ölçülür. Aksi halde bu pikseller görünür yapıyı gereksiz küçültüyordu.

Avlu düzlemi aynı arsanın dört köşesini doldurur. Önceki açık taş avlu kullanılmaz. `parcel-earth-v1.webp` mevcut `unified-detail-v3/ne.webp` toprağından x260,y650,w200,h80 bölgesidir; bina şekli değiştiğinde köşelerde eski boş arsa bordürü kalmaz. Sadece bu düz zemin dört köşeye eşlenir. Canvas üçgen birleşiminde yarı saydam dikiş oluşmaması için aynı poligon içinde opak alt boya vardır. WebGL ve Canvas aynı dış sınırı kullanır.

Yeni inşaatın dokusu ilk sahne yüklemesinde yoktur. Runtime yükleyici artık tek dosyanın `filecomplete` olayında değil yükleme grubunun `COMPLETE` olayında sahneyi yeniden çizer. Böylece hazır/ölçüm verisi eski inşaat iskelesinde kalmaz; inşaatın bitişi ana oyun tarayıcı testinde ayrıca doğrulanır.

Kayıt, ekonomi, arsa kimlikleri, açılma kuralları, HUD ve kamera kontrolü değişmez. Oyuncunun kaydına beş bina hediye edilmez; mevcut kurulu yapılar ve normal inşa akışı yeni çizimleri kullanır. `depo` ile `ambar` ayrı türlerdir; bu sürüm `depo` çizimini değiştirir.

## Doğrulama

- `pnpm check`: 358 test, tip, ESLint ve CSS denetimleri.
- Son WebP'lerin görünen satır uçları: 5 tür × 29 ölçülü arsa × 2 yön × 2 çözünürlük; oran korunumu ve parsel içi kontur kontrolü.
- `five-building-canvas-qa.cjs`: ana sahnenin gerçek Canvas zemin eşlemesiyle 25 kara arsası; opak iç alan ve 1 piksel raster kenar toleransı dışında taşma kontrolü. `city-native.webp` bir native çizim önizlemesidir, tarayıcı ekranı değildir.
- `five-building-browser-qa.cjs`: gerçek statik ana oyunda 360/390/430 genişlikleri, beş yeni doku ve tam avlu dolgusu, çevrilmiş görseller, kışlaya dokunma ve sıfır seviyeden inşaat tamamlanınca yeni dokunun yüklenmesi. Ayrı demo sayfası kullanılmaz. Kanıtlar `mockups/five-buildings/browser/`.
- Pages taban yoluyla üretim derlemesi; V2 ölçütleri ve telefon görselleri denetimi.

Tarayıcı kontrolleri otomasyon ortamındaki Chromium ile yapılır; fiziksel telefonun performans/pil ölçümü değildir. Genel HUD düzen denetiminin sonuçları ayrıca kayıt edilir; bu beş bina işi HUD düzeltmesi sayılmaz.

Son genel `layout-qa` sonucu önceki tabanla aynıdır: taşma 0, kesik 0, küçük hedef 312, minik yazı 663, çakışma 0, isimsiz 0, sayfa hatası 0. Küçük hedef/yazı uyarıları nedeniyle genel düzen denetimi çıkış kodu 1 verir; bütün mobil arayüz yeşil ilan edilmez. Yeni beş bina için ayrı tarayıcı denetiminin 4 durumu geçti; dosya ve sayfa hatası yoktur.
