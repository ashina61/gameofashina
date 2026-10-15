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
