# Payitaht — onaylı arayüz standardı

Adem, 8 Ekim 2026: “bu tasarımı beynine işle tasarım standardımız oturdu”. Yetkili referans kışlanın 0.69.0 son hali ve `mockups/approved-barracks-vertical-slider.webp`; üretim parçaları `public/images/game/ui/barracks/`, atlas kayıtları `barracks-controls-atlas.json` ve `barracks-skin-atlas.json`. Önceki kaba CSS/yalnız renk benzerliği standart değildir.

## Bütün yeni sayfalarda

- Aynı koyu ceviz, sıcak açık fildişi parşömen, eskitilmiş pirinç/altın işlemeler, koyu kırmızı ipek aktif sekme ve ana eylem. Gerçek boyalı atlas parçalarını kullan; yeni cam/modern kart veya basit çizgi çerçeve uydurma.
- Başlıklarda Tinos Bold (Payitaht Profile Roman), gövdede Georgia. Mürekkep koyu kahve; ahşap üstünde fildişi/altın metin. Canlı yazı ve sayılar HTML'dir.
- Çerçevelerin dört işlemeli köşesi görünür. Portreler yakın plan boyalı resimdir; tam boy eski SVG figürüne/fallback'e dönme. Her alt bölüm aynı standardı taşır.
- Geri/çarpı ayrı gerçek yuvarlak düğmeler, oranları sabit. +/−, Maks. kenarı ve sürgü madalyonu onaylı kışla atlasından; sürgü gerçek dokunmatik HTML kontrolüdür.
- Bölüm başlıkları iki yanda simetrik altın süs. Sekmelerde konuya uygun Osmanlı/boyalı simge; Gelişim'de referansın pirinç sütun ikonu.
- Önce oyun eylemi, sonra destek bilgisi. Yükseltme Gelişim'in ilk bloğudur. Ana eylemi sabit büyük dekorasyonla sıkıştırma. Uzun içerik dikey akar; yatay hareket sadece açıkça belirtilen adet barı veya dal sekmesidir.
- Sahne aynı Osmanlı–Ege ressamının ışık/malzeme dilinde; yeni bina için aynı sahneyi kopyalamak yerine yeni yazısız resim üret. 9 Ekim düzeltmesi: bina sayfalarındaki yapı görünümü ve seviye önizleme galerileri kaldırılır. Yön/taşıma/yıkım eylemleri Gelişim’de ayrı açılır alanda erişilebilir kalır.
- Halk/âlim rol alanlarında ortak `ui/people/citizen-figure.webp` ve `scholar-figure.webp`: şeffaf tam boy insan figürü, baş ve ayaklar görünür; portre veya portre çerçevesi kullanma. HUD danışman rozetleri ayrı navigasyon simgeleridir; asker portreleri bu kuralın dışındadır. Üst bina bilgi düğmesi kaldırılır, açıklama Gelişim’de okunur. Yükseltme başlığı ortalı; Onayla/Geri al eşit genişlik ve yükseklikte, çerçeve işaretleri metne değmez.
- İlim ve süre simgeleri ortak `icons/res-ilim-v2.webp` ve `res-sure.webp`; bağlama göre okunur boyut.
- Kabul edilmiş üst/alt HUD yerleşimi değişmez. Ekonomi, kaydetme, maliyetler, süreler, ön koşullar ve komutlar değiştirilmez.

## Kontrol

360/390/430 px gerçek mobil ekran. Bütün alt sekmeler, kilitli/aktif/tamamlanmış durum, boş/dolu kuyruk ve temel eylemler kontrol edilir. Çizimle aynı diye yalnız renklerden sonuç çıkarma. Bölüm bitince test ve yayın; kullanıcının değerlendirmesinde dur.

Medrese: `MEDRESE-DESIGN-MEMORY.md`. 9 Ekim genel devam talebiyle sıradaki Konut: `HOUSING-DESIGN-MEMORY.md`; ardından Hamam, Kahvehane, Ambar/Depo ve üretim yapıları.

Hamam 0.73.0: `BATHHOUSE-DESIGN-MEMORY.md`; ortak 50/51 numaralı defter stilleri. Sonraki bina Kahvehane.

Kahvehane 0.74.0: `COFFEEHOUSE-DESIGN-MEMORY.md`. İkram kontrolü aynı sürgü/düğme atlası; eski anlık uygulama korunur. Sonraki bölüm Ambar/Depo.


## Ambar ve Depo — 0.75.0

`STORAGE-DESIGN-MEMORY.md` geçerlidir. Aynı ortak atlaslar ve iki sekme; yedi mal alt alta. Toplam stok tek havuz gibi sunulmaz: kapasite her mal için ayrıdır. İlim baskında yağmalanmaz. Gelişim önce yükseltme; HUD ve ekonomi korunur.


## Kereste ve kaynak üretim yapıları — 0.76.0

`PRODUCTION-DESIGN-MEMORY.md` geçerlidir. Altı yapıda aynı atlaslar; ayrı kısa üretim sahneleri, Üretim/Gelişim. Oduncu tam boy boyalı figürdür. Yapı katkısı, toplam üretim ve ada kaynağının eşleşmesi ayrı okunur. Oyun ekonomisi ve HUD korunur.


## Maliyet azaltan yapılar — 0.77.0

COST-DESIGN-MEMORY.md geçerlidir. Beş ayrı atölye sahnesi, Tasarruf/Gelişim, aynı gerçek atlaslar. İndirim kaynakları ve gerçek bedel örnekleri ayrıdır. Kahve ve topçu çarpanları sınır sonrası uygulanır. Mekanik ve HUD korunur.


## Çarşı ve Ticaret Merkezi — 0.78.0

COMMERCE-DESIGN-MEMORY.md geçerlidir. İki ana sekme ve ortak atlaslar; anlık tüccar ile yolculuklu pazar ayrıdır. Net gelir, gerçek satış akçesi ve teklif stokları doğru açıklanır. Ekonomi ve HUD korunur. Sonraki bölüm Kara Pazar.
