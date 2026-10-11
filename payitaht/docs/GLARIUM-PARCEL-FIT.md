# Arka plan ve gerçek boş arazi esaslı bina düzeltmesi

> Sonraki gerçek oyun yerleşimi düzeltmesi `GLARIUM-PARCEL-RUNTIME.md` içindedir. Aşağıdaki metin önceki bağlam tasarımının kaydıdır.

11 Ekim kullanıcı düzeltmesi: önceki bağımsız avlulu Kışla ailesi çevreye uymadığı için reddedildi. `GLARIUM-FIVE-STAGE-BUILDINGS.md` içindeki önceki ailenin tasarım standardı olduğu ifadesi geçerli değildir. Çalışma yalnız `prototype/glarium-ottoman-city` dalındadır.

## Doğru referans

Referans doğrudan oyunun `public/images/prototype/glarium-growth/hall-20.webp` tabanıdır. Stil benzerliği tek başına yeterli değildir. Binanın zemin izi gerçek açıklığın içinde kalmalı; kapı sınırdaki yola bakmalı; çatı doğrultusu, kamera yüksekliği, ışık, malzeme ve kat yüksekliği yanındaki evlerden alınmalıdır.

İlk bağlam çalışması merkez çeşmenin güneydoğusundaki boş alanı kullanır. Yaklaşık arsa köşeleri 1469×1070 tabanda (770,380), (830,364), (903,396), (825,430). Bunlar görsel inceleme koordinatlarıdır; motor koordinatı veya kayıt kimliği değildir. Çevredeki evler/yollar/bitkiler değişmez.

## Beş aşama için biçim

Yeni aile tek kompakt koğuş yapısını geliştirir. 1: tek katlı küçük karakol. 5: aynı yönde genişlemiş tek katlı koğuş. 10: iki kat ve küçük arka eğitim alanı. 15: aynı tabanda üçüncü kat ve giriş ayrıntıları. 20: aynı tabanda gelişmiş çatı, galeriler ve askerî ayrıntılar. Her aşama 1/5/10/15/20 eşikleriyle binanın kendi seviyesine göre seçilir. Büyük U biçimli saray/avlu çizip küçültme yaklaşımı terk edilir.

## Yerleşimde açık sorun

Mevcut sunum haritası 12 geniş açıklığı otomatik olarak ikişer küçük arsa sayıyor. Dikdörtgen hit-area testlerinin geçmesi, bu alanların boyalı arazinin içinde olduğunu veya iki yapının sığdığını kanıtlamaz. Yeni bağlam çizimi tek gerçek açıklıkta sanat kontrolüdür; iki kayıtlı arsayı birleştirme yetkisi veya oyun entegrasyonu değildir.

Sonraki çalışma şeffaf asset üretiminden önce her kayıtlı arsanın gerçek zemin poligonunu ve iki komşu binanın birlikte sığmasını doğrulamalıdır. Mevcut motor kimlikleri, ekonomi, HUD ve kayıt değişmez. Yeni görseller gerçek oyun ekranında sınanmadıkça entegrasyon tamamlandı denmez.

## Üretim

Beş bağlam önizlemesi `docs/glarium-parcel-fit/kisla-01/05/10/15/20-context.webp` olarak saklandı. Bunlar üretim asseti veya oyundan ekran görüntüsü değildir. Seviye 10 şehir tabanından üretilen yakın görünüm; diğer aşamalar bu yakın görünümde yalnız Kışla değişecek şekilde düzenlendi. Üretim çevreyi yeniden örnekleyebilir; piksel düzeyinde korunma doğrulanmış değildir. Görsel incelemede ana yol bağlantıları ve çevre ölçeği korunur; 1 küçük tek kat, 5 geniş tek kat, 10 iki kat, 15 üç kat, 20 üç kat üstünde küçük çatı köşkü olarak ayrılır.

| Seviye | Bağlam önizlemesi |
|---|---|
| 1 | [kisla-01-context.webp](glarium-parcel-fit/kisla-01-context.webp) |
| 5 | [kisla-05-context.webp](glarium-parcel-fit/kisla-05-context.webp) |
| 10 | [kisla-10-context.webp](glarium-parcel-fit/kisla-10-context.webp) |
| 15 | [kisla-15-context.webp](glarium-parcel-fit/kisla-15-context.webp) |
| 20 | [kisla-20-context.webp](glarium-parcel-fit/kisla-20-context.webp) |

Yerleşik imagegen ile gerçek taban düzenlenerek bağlam tasarımı üretildi. İstem: merkez çeşmenin güneydoğusundaki gerçek boş alanın yakın görünümü; sadece bu arsanın içine, çevredeki iki ev ölçeğinde kompakt iki katlı Kışla; küçük arka eğitim alanı; alt-sol yola açılan giriş; aynı yükseltilmiş üç çeyrek kamera, kiremit çatı ve açık sıva; komşu ev, yol ve bitkiler korunur. Bu belge bağlam tasarımını kaydeder; şeffaf asset ve çalışma zamanı değişikliği henüz yapılmamıştır.
