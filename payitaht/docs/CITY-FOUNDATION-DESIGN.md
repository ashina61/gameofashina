# Şehir tabanı — 0.101.1 / SW115

11 Ekim 2026. Kullanıcı yaşayan bir şehir istiyor; önce arka planın kurulmasını istedi. Önceki tam sahne konsepti arsa/bina taşmaları nedeniyle reddedildi ve üretime alınmadı. Bu sürüm mevcut oyun zemininde ilk düzenlemedir; bina modelleme ve yeni hareket sahneleri sonraki aşamadır.

## Uygulanan temel

- Boyalı çim malzemesinin yapay yeşil yükseltmesi kaldırıldı. Kuru ot, gölgeli çayır ve sıcak toprak birlikte kullanılır.
- Ana cadde, mahalle sokağı ve kıyı yolu ayrı genişlikte okunur. Kurulu kara binalarının altında yumuşak toprak izi ve avlu bulunur; bina taşınır/yıkılırken aynı güncellemeyle yeniden kurulur. Boş parsellere yeni avlu basılmaz.
- Liman bölgesi açılınca üç kıyı arsası arasında ortak geniş taş promenat görünür. Dekor açıklığı aynı genişlikten hesaplanır.
- Dere suyu koyla aynı renk ailesinde; kıyıda nemli yeşil, tortu ve ıslak toprak geçişleri vardır. Dere ve köprü koordinatları aynıdır.
- Yeni PNG/WebP üretim atlası yok. Mevcut boyalı malzemeler ve pişirilen grafikler kullanılır; kare başına arazi yeniden çizilmez.

## Korunan sınırlar

Slot koordinatları, 2×2 ayak izi, bina ölçekleri/anchor, ada yerleşimleri, ekonomi, kayıt biçimi, hareket kuralları ve HUD değişmez. `ika-hud.tsx`, `41-exact-reference-hud.css` ve HUD assetleri aynıdır.

## Gerçek oyun kanıtı

`mockups/city-foundation/initial.webp`, `grown.webp`, `harbour.webp`: 390×844 tarayıcı telefon görünümü. Gelişmiş kayıt işgal altındadır; bu yüzden halk sayısı mevcut kurala göre azalır. Yeni halk/kervan/asker animasyonu yapıldı iddiası yoktur.

`CITY-FOUNDATION-REPORT.json`: başlangıç 137, gelişmiş 250, hafif mod 126 dekor; yol/meydan/rıhtım ihlali 0, eksik görsel 0, tarayıcı hatası 0. Yol kenarı çiftleri simetrik; hafif mod yoğunluğu yarıya iner.

## Sonraki yaşayan şehir işi

Mevcut vatandaşlar, kervanlar, askerler, kuşlar ve hayvanlar vardır. Vatandaş rotaları ham ROAD_GRAPH eğrilerini kullanır; çizilen yollar ise footprint çıkışları ve düzeltilmiş kıvrımlar kullanır. Yeni hareketler eklenmeden önce bu iki geometri ortak rotalara bağlanmalı; bina önleri ve kavşak geçişleri ayrıca sınanmalıdır. Ardından esnafın duraklaması, kervanın kapı–çarşı yolculuğu ve kışlada yerel talim eklenebilir. Yeni bina sanatı için tercih: ölçülü 3D modelden şeffaf 2D render; tam 3D motor dönüşümü kararlaştırılmış değildir.

## Doğrulama

345/345 oyun testi, TypeScript, ESLint, CSS denetimi, V2 ölçütleri, yarım çözünürlük denetimi ve statik üretim derlemesi geçti. Genel düzen taramasında taşma/kesik/çakışma/isimsiz/sayfa hatası 0. Korunan HUD'da önceki sürümle aynı 312 küçük hedef ve 663 minik yazı uyarısı var; genel betik bu nedenle exit 1 verir. Kurallar gevşetilmedi, HUD değiştirilmedi. Bu tarama fiziksel cihaz ölçümü değildir.
