**10 Ekim Vezir — 0.95.0 / SW107:** `docs/VIZIER-DESIGN-MEMORY.md`; Gündem/Şehirler/Haberler ortak boyalı defterler, emir önce, dikey üretim ve şehir sicili. Danışman öncelikleri, kayıt, motor ve HUD korunur. Sonraki Elçi/İttifak; yayın sonrası kullanıcı değerlendirmesinde dur.

**10 Ekim Halk/Şehirler — 0.94.0 / SW106:** `docs/POPULATION-DESIGN-MEMORY.md`; İşgücü/Yaşam ve Yerleşimler/Nakliye/İdare ortak boyalı defterler, tam boy halk/âlim ve okunur şehir sicili. Motor, kayıt, HUD korunur. Sonraki Vezir; yayın sonrası kullanıcı değerlendirmesinde dur.

**10 Ekim Hazine — 0.93.0 / SW105:** `docs/TREASURY-DESIGN-MEMORY.md`; Hazine/Üretim/Ambar ortak boyalı defterler, yedi kaynak dikey stok sicili ve iki sütunlu seçim. Ekonomi, kayıt, HUD korunur. Sonraki Halk/Şehirler; yayın sonrası kullanıcı değerlendirmesinde dur.

**10 Ekim Divanhane/Elçilik — 0.92.0 / SW104:** `docs/CIVIC-DESIGN-MEMORY.md`; dikey şehir/meslek/nişan sicili, Halk/İdare ve Hariciye/Casuslar; ortak eğitim atlası. Yükseltme Gelişim başında. Motor, kayıt, HUD ve dört ada açıklığı korunur. Yayın sonrası kullanıcı değerlendirmesinde dur.

**10 Ekim Saray/Valilik — 0.91.0 / SW103:** `docs/PALACE-DESIGN-MEMORY.md`; Koloniler/İdare ve Gelişim, gerçek seviye şartı/yolsuzluk ve dikey şehir sicili, iki ayrı sahne. Motor, kayıt, HUD ve dört ada açıklığı korunur. Yayın sonrası kullanıcı değerlendirmesinde dur.

**10 Ekim dar ekran kontrolü — 0.90.0 / SW102:** `docs/READABILITY-DESIGN-MEMORY.md`; başlık satırları, profil sekme/alt düğme hedefleri, nişan yazıları ve açıklama hedefleri. Onaylı HUD, motor ve kayıt korunur.

**10 Ekim Ordu/Donanma — 0.89.0 / SW101:** `docs/MUSTER-DESIGN-MEMORY.md`; Kara ordusu/Donanma/Seferler, aynı eğitim atlası, kayıtlı ve kullanılabilir sayı ayrı. Motor, kayıt, HUD ve dört ada açıklığı korunur. Yayın sonrası kullanıcı değerlendirmesinde dur.

**10 Ekim dünya/özet — 0.88.0 / SW100:** `docs/ATLAS-DESIGN-MEMORY.md`; 16 ada seçimi ve haritaya özel yakınlaştırma; şehir başına Kaynaklar/Binalar/Ordu defterleri. Motor, kayıt, HUD ve dört ada yerleşim açıklığı korunur. Yayın sonrası kullanıcı değerlendirmesinde dur.

**10 Ekim Serasker/hedef — 0.87.0 / SW99:** `docs/CAMPAIGN-DESIGN-MEMORY.md`; hedef sekmeleri, ortak portre/adet atlası; rapor/sefer/savunma defteri ve görünüm filtreleri. Motor, kayıt, HUD ve dört ada açıklığı korunur. Yayın sonrası kullanıcı değerlendirmesinde dur.

# Payitaht — onaylı arayüz standardı

**10 Ekim ada/orman/maden — 0.86.0 / SW98:** `docs/ISLAND-DESIGN-MEMORY.md` (doküman klasöründe ISLAND-DESIGN-MEMORY.md). Kullanıcı dört ek alanı adanın yerleşimi için istedi; ormanda veya şehir içi arsalarda değil. Yeni arazi ve dört boş açıklık, ortak Üretim/Gelişim defterleri. Motor/HUD korunur; yayın sonrası kullanıcı değerlendirmesinde dur.

0.84.0 Müze/Karagöz: CULTURE-DESIGN-MEMORY.md. Ortak defterler, iki ayrı sahne, kültür katkısı/sınırları ve gerçek gösteri takvimi; sonraki inşa menüsü ve arsa seçimi.

0.83.0 Cami/Tekke/Mabet: DEVOTION-DESIGN-MEMORY.md. İbadet, himaye ve kutsama; ayrı sahneler ve tam boy imam, gerçek sunu/adak ve görünür engeller. Sonraki Müze/Karagöz Perdesi.

0.82.0 Tophane/Korsan Kalesi: ARMAMENT-DESIGN-MEMORY.md. Ortak defterler, dikey açılır teçhizat, hedef/filo/sefer ve Gelişim; ana eylem önce. Sonraki Cami/Tekke/Mabet.

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


## Kara Pazar — 0.79.0

EXCHANGE-DESIGN-MEMORY.md geçerlidir. Ortak atlaslar, ayrı sahne, Mal takası/Gelişim. Gerçek kayıplı miktar ve engeller işlemden önce okunur. Maks. resmini form alanına uygulama. Motor ve HUD korunur. Sonraki bölüm Liman/Tersane.


## Liman ve Tersane — 0.80.0

MARITIME-DESIGN-MEMORY.md geçerlidir. Ortak filo ve gerçek yük sınırı, dikey gemiler/inşa kuyruğu; ortak atlaslar ve Gelişim başında yükseltme. Motor ve HUD korunur. Sonraki bölüm Harita Arşivi ve savunma yapıları; yayın sonrası kullanıcı değerlendirmesinde dur.


## Harita Arşivi ve savunma — 0.81.0

DEFENSE-DESIGN-MEMORY.md geçerlidir. Yol çarpanı ve nakliye araştırması; başlangıç sur canı/şehir savunması ve garnizon; ek casusluk katkısı ile gerçek kovma şansı ayrıdır. Ortak atlaslar, üç sahne, Gelişim önce yükseltme. Motor ve HUD korunur. Sonraki bölüm Tophane/Korsan Kalesi; yayın sonrası kullanıcı değerlendirmesinde dur.


## İnşa ve arsa seçimi — 0.85.0

CONSTRUCTION-DESIGN-MEMORY.md geçerlidir. Ortak atlaslar, özgün kısa ustalar sahnesi, dikey açılır yapılar; gerçek bedel, süre ve kilitler. İnşa ayrı eylem, Surlar yalnız katalogda. Motor, yerleşim ve HUD korunur. Sonraki Ada ormanı ve madeni.
