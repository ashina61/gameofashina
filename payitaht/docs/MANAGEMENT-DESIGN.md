# Divanhane ve Elçilik — 0.59.0 / SW56

Kullanıcının 6 Ekim ‘devam et’ talebiyle yönetim yapılarına geçildi. Referans: onaylı Profil/Ayarlar, Sancaktar, Vezir ve Elçi/İttifak dili. Tam genişlik, açık parşömen, ceviz, pirinç ve resimli Osmanlı–Ege sahneleri. Bir defter bir iş; fazla iç çerçeve ve tekrarlanan bilgiler kaldırılır.

## Divanhane

Şehir meydanı, gerçek şehir adı ve seviye. Şehir: boş barınma, iki garnizon, kullanılabilir sefer hakkı, büyüme, net akçe, meslek üretimleri ve nişan seçimi; artık iki sütunlu okunur satırlar. Halk: nüfus ve huzur katkıları, işgücüne geçiş. İdare: hazine muhasebesi, ad değiştirme, yönetim biçimleri. Gelişim: mevcut/sonraki etkiler, seviye fiyat ve süreleri, üç gerçek yapı görünümü, yön çevirme.

## Elçilik

Ortak gerçek hariciye sahnesi. Hariciye: okunmamış mektup sayısı, Elçi ve birlik defterlerine geçiş, mevcut şehir casus kapasitesi, başarı bonusu ve yakalama oranı. Casuslar: gerçek casus portresi, parti seçimi, maliyet, eğitim sırası ve yabancı casus kontrolü; Gizli Sığınak geçişi. Gelişim: gerçek seviye etkileri ve fiyatlar, üç yapı görünümü, çevir/taşı/yık; yıkım onayı korunur.

İki yapıda da yükseltme doku sabit kalır; büyük küçük-resim ve gereksiz etiket çıkarılır. Fiyat, eksik mal, süre, engel, kuyruk, ilerleme ve en yüksek seviye aynı motor değerlerini kullanır. Açıklamalar bilgi düğmesinden açılır. Alt menü küçük ekranda %130 yazıya sığar. Diğer bina sayfalarının düzeni değişmez. Oyun motoru, kurallar, ekonomi ve kayıt biçimi değiştirilmedi.

## Sanat ve üretim

Yerleşik imagegen kullanıldı. Yeni dosya: `public/images/game/ui/divan/civic-square.webp` (1200×400). Referans 1 gerçek `divan-painted-2-sm.webp` yapı kimliği; referans 2 `vizier-scene.webp` ressam, renk, malzeme ve ışık dili. Elçilik, mevcut `envoy-scene.webp` sahnesini kullanır. Çıktı görsel olarak incelenip WebP'ye dönüştürüldü; kaynak sahneye yazı veya UI gömülmedi.

Son üretim istemi:

“Use case: historical-scene. Asset type: wide header painting for an Ottoman Aegean mobile strategy game's Divanhane city hall. Reference image 1: preserve the actual building identity, ivory limestone portico, blue lead central dome, red terracotta side wings, square stone clockless tower with pyramidal lead roof and gold finial. Reference image 2: match this exact warm painterly realism, daylight, brass and walnut Ottoman coastal game art. Paint a new 3:1 landscape establishing scene of that city hall in a lived-in civic square, building prominent in centre and left, broad pale stone steps leading to columned entrance, a clerk with blank parchment at a small walnut table lower left, two townspeople and a guard, cypress trees at sides, blue Aegean harbour softly behind right. Cohesive premium painterly strategy game art, soft upper-left light, realistic proportions, ivory stone, subdued terracotta, lead blue, olive green, turquoise. Keep main architecture fully visible and recognisable in central 70% mobile crop. No text, no UI, no border, no modern objects, no cartoon.”

## Kontrol

328 motor/kayıt testinin tamamı geçti. TypeScript, ESLint, CSS renk/kullanılmayan sınıf denetimi ve V2 kriterleri geçti. Pages taban yoluyla üretim derlemesi. Tam oyun sayfa/bina taraması 360×740 ve %130 yazıda; ayrıca iki yapının yedi defteri 390×844 ve 360×740/%130'da tarayıcıda kontrol edildi. Şehir adı, nişan, yönetim, casus eğitimi, Elçi/İttifak geçişi ve yükseltme gerçek UI işlemleriyle doğrulanır. Gerçek ekranlar `visual-review/Management/`. Test kaydı mevcut geç dönem örneğinden türetilir; işlev testleri için stok ve ambar yükseltilir, dünya olay saati bugüne alınır. Bu yalnız test verisidir.

Ortamın tsx CLI soket sınırlaması nedeniyle aynı testler `node --import tsx --test` ile çalıştırıldı. Ortamda tarayıcı olmadığından resmi Google Chrome for Testing Headless Shell kurulup Playwright testlerine bağlandı. Uygulama, QA kuralları ve fontlar bu amaçla değiştirilmedi.

Bu bölüm yayın ve gerçek ekranlarla kullanıcı değerlendirmesinde durur. Sonraki bölüm: Saray ve Valilik.
