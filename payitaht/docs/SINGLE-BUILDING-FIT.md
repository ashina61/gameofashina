# Mevcut arka planda tek kışla denemesi

15 Ekim 2026. Kullanıcı ortak çizimden sonra mevcut arka plandaki karoların zeminine tek bina ile oturma denemesi istedi.

`public/building-fit.html` mevcut unified-detail-v3 zeminini değişmeden yükler. Yalnız ölçülmüş 1. parselin içinde yeni kışla ve düz avlu bileşimi çizilir. Diğer arsalar boştur. Boş arsa/kışla, gerçek karo sınırı, yakınlaştırma, sürükleme ve şehir bütünü karşılaştırmaları vardır. Ana oyundaki kışla, kayıtlar, motor, HUD ve yerleşimler değiştirilmedi; bu tek arsa sanat denemesidir, bütün şehir tamamlanmış sayılmaz.

Önceki çapraz izometrik konsept bu arka planın yatay trapez perspektifine uymuyordu. Yeni çizim gerçek zemin crop'u üzerinde built-in imagegen ile üretildi. İkinci geçişte arka kuleler alçaltıldı. Kamera yüksekten öne bakar; ön ve arka duvarlar yataydır. Avlu ve giriş yaklaşımı aynı zemin düzleminde çizilir. Opaque kompozitin çevresindeki referans bağlamı parsel poligonuyla atılır; mimari mesh ile esnetilmez. Bu yöntem henüz diğer parsel şekillerine veya bağımsız hareketli sprite kataloğuna genellenmemiştir.

Kaynak crop: master resim koordinatları x780,y270,w325,h165. Yeni kompozit x780,y273,w325,h165 alanında, tek uniform piksel ölçeğiyle çizilir (paketlenmiş kaynak1300x660; hedef325x165). Görünen birleşik sahne 360/390/430 genişliklerinde incelendi; önce/sonra, tek bina sayısı, yakınlaştırma, taşmayan sayfa ve dosya/tarayıcı hataları kontrol edildi. `public/images/game/building-fit/v1/kisla-on-ground.webp` proje varlığıdır; üretim referansları çalışma alanında tutulur.

Tarif: mevcut parsel crop'u üzerinde tek alçak Osmanlı kışlası; yatay cephe, dört alçak burç, bordo sancaklar, arkada kiremit koğuş, açık talim avlusu, ön ortada kalkan-kılıç armalı giriş. Aynı sıcak krem taş, sol üst ışık, bütün dış yollar korunur; arka kulelerin üstü çatı hizasına indirilir. Built-in image generation kullanıldı.

Doğrulama: `pnpm check` 357 test, tip, ESLint ve CSS ile geçti; statik dışa aktarım başarılı. Üç telefon genişliğinde gerçek canvas önce/sonra piksel farkı ölçüldü: parsel dışı değişen piksel 0. `v2-criteria` hedefleri geçti. Ana oyun `layout-qa` mevcut tabanını korudu: taşma/kesik/çakışma/isimsiz/sayfa hatası 0; önceki küçük312/minik663 uyarıları sürüyor. Yeni deneme ana oyunun HUD düzeltmesi değildir.

## 15 Ekim sınır düzeltmesi

Kullanıcı çizginin boş araziyle eş ölçüde olmadığını bildirdi. Önceki poligon bahçe/bordür dış kenarını da içeriyordu. Tek deneme parselinde çıplak toprağın köşeleri detaylı gerçek zeminden yeniden ölçüldü: (868,314), (1016,314), (1026,385), (859,385). Boş/kışla/zoom durumları aynı poligonu kullanır. Kompozit tek uniform ölçekle x812.6,y289.8,w260,h132 alanına alındı. İlk açılış boş arazi+sınırdır. Ana oyunun 29 parsel koordinatı bu tek arsa denemesinde değiştirilmedi.

Bu düzeltmede gerçek sayfa JavaScript'i Node VM içinde boş/kışla/zoom durumlarında çalıştırıldı; poligon değişmezliği ve oran kontrol edildi. Aynı koordinatlarla zemin/çizim birleşimi ayrıca render edilerek görsel olarak incelendi. Yerel Chromium başlatılırken SIGSEGV verdi; bu revizyonda yeni telefon tarayıcı ekranı alındığı iddia edilmez. İlk denemenin önceki 360/390/430 tarayıcı kanıtları önceki revizyona aittir. Yeni kalibrasyon kanıtları `soil-boundary-v2.webp` ve `building-boundary-v2.webp` dosyalarıdır.

## 15 Ekim v3 — gerçek boş arsa çizimi

Kullanıcı sorunun sınır çizgisinde değil, arka plana boyanmış boş arsanın kendisinde olduğunu belirtti. Önceki iki deneme bu sorunu çözmedi. Bu revizyon o tariflerin önündedir.

Yeni `public/images/game/building-fit/v3/empty-ground.webp` gerçek arka plan crop'u referans alınarak built-in imagegen ile yeniden çizildi: düz, ince dokulu toprak; düzenli dikdörtgen kenarlar; bitkiler sınır dışında; mevcut yol ağına uygun krem taş. Ardından yalnız zemin/kenar çiziminin dört köşesi iki affine üçgenle tek ekrandaki dikdörtgene oturtulur: (850,303)-(1037,396). Çizim bağlamı yalnız tek arsa çevresinde yumuşak alfa geçişiyle birleştirilir; tam crop kenarı şehir boyunca keskin şerit yapmaz. Bina bu zemin dönüşümüne dahil edilmez. Sınır çizgisi başlangıçta kapalıdır: düzeltilmiş zemin doğrudan görünür.

`kisla-cutout.webp`, önceki kışlanın opak çevresini ve avlu zeminini çıkartan yeni gerçek alfa varlığıdır. Kışla ölçek/konumla çizilir, mimariye mesh/maske uygulanmaz. Avlu yeni ortak zemini gösterir; kapı önündeki küçük düz yaklaşım eski bollardı kaldırır. `Eski çizim` aynı konumdaki özgün arka planı, `Boş arsa` gerçek yeni zemini, `Kışla` bunun üzerindeki tek yapıyı gösterir. Bu değişiklik yalnız deneme sayfasındadır, bütün arka plan yeniden çizilmiş veya ana oyuna aktarılmış sayılmaz.

Üretim tarifleri: (1) mevcut arsa crop'unun ortasındaki boş toprağı dört dik açılı, düz ve düzenli kenarlı gerçek bir arsa olarak yeniden çiz; yol kesişimlerini, sıcak Akdeniz malzemelerini ve sol üst ışığı koru, çizgi/ızgara/bina ekleme. (2) mevcut kışladan yalnız mimariyi gerçek alfa olarak ayır; dış yollar, bahçe ve avlu döşemesi şeffaf olsun, cephe ve çatı yönünü koru. Built-in image generation kullanıldı; son dosyalar yukarıdaki proje yollarındadır.

Doğrulama: gerçek HTML JavaScript'i ve gerçek raster varlıklar @napi-rs/canvas ile 360/390/430 genişliklerinde çalıştırıldı. Çizgi kapalıyken eski/yeni zemin piksel çıktısı farklı, boş/kışla/zoom geçişleri çalışıyor, zemin ve toprak dört köşesi dikdörtgen. Bu native canvas çizim kontrolüdür; tarayıcı UI testi yerine geçirilmez. Kanıtlar `ground-v3-*.webp`, `ground-v3-qa.json`.

## 15 Ekim v4 — tek görünür sınır, yol piksellerine taşma yok

Kullanıcı v3 çiziminin yine sınırı ve yolları aştığını bildirdi. Hata gerçekti: gösterilen sınır 154×67, zemin yaması 214×109, yeniden eşlenen karo 187×93, bina kutusu 154×80 ve yaklaşım yolu ayrıca 10×16 idi. Bunların aynı sınıra bağlı olmaması v3 kontrolünde atlandı. Önceki v3'ün taşmasız veya oturmuş olduğu iddiasına dönülmez.

V4'te arsa sınırı değişmedi: (867,316)-(1021,383). Zemin, içerideki düz taş kenar, tam alfa sprite kutusu ve debug çizgisi aynı dikdörtgene bağlıdır. Çevreyi boyayan büyük yama, zemin üçgen eşlemesi ve sınır dışında kalan yaklaşım kaldırıldı. Yeni toprak yalnız referansın çıplak toprak bölümünden alınır; referans yollara/dekora ait pikselleri zemin katmanına taşımaz. Zemin ve iç taş kenarı ortak sınırda kesilir. Binanın bütün alfa tuvali2 piksel içeride uniform ölçekle sığar; mimari kırpılmaz/esnetilmez. Çizgi de içeri çizilir.

Kışla aynı Osmanlı malzeme ve askeri işaretleriyle daha alçak/geniş olarak built-in imagegen ile yeniden üretildi: `public/images/game/building-fit/v4/kisla-low.webp`. Son tarif: alçak nöbet platformları ve sur, yatay arka kiremit koğuş, bordo sancak, kalkan/kılıç kapı, şeffaf avlu; dış zemin ve yol yok. İkinci geçişte avlu derinliği artırıldı; yapı yüksekliği artırılmadı. Kamera ve mimari en-boy oranı runtime'da değiştirilmez.

Kalıcı kontrol: `NODE_PATH="$CODEX_PRIMARY_RUNTIME_NODE_MODULES" node tools/building-fit-canvas-qa.cjs`. Araç gerçek HTML JavaScript'ini ve gerçek varlıkları native Canvas ile yürütür.360/390/430 × yakın/daha yakın/genel × boş/kışla/çizgi = 27 piksel karşılaştırması yapar. Eski zemin ile yeni render aynı kamerada kıyaslanır; sınırın kesirli kenarlarının raster kapsaması dışındaki değişen piksel sayısı0 olmalıdır. Tam sprite kutusu da içeride kalmalı ve kaynak oranını korumalıdır. Bu, tarayıcı UI doğrulaması değildir.

Negatif regresyon: V3 kaynak sayfası aynı kontrolle çalıştırıldığında360 / yakın / boş durumunda arsa dışında 60.892 değişen piksel bulup başarısız olur. V4: 27 durum, 0 dış piksel. Kanıtlar `boundary-v4-*` dosyalarıdır. Tek arsa denemesidir; ana oyun veya tüm şehir taşmasız ilan edilmez.
