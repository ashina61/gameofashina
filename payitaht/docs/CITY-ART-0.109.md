# Üstten bakış bina seti, orman ve sur — 0.109.0 / SW125

13 Ekim 2026. Kullanıcı son telefon karesinde bina görüntüsünü reddetti; yukarıya daha fazla orman ve düzeltilmiş sur istedi. Önceki doğrudan yayın yetkisi geçerlidir.

## Binalar

Önceki çalışmanın 30 üstten bakış türü kurtarıldı. Eksik Valilik, Kara Pazar, Sığınak, Tekke, Ongun Mabedi ve Karagöz yeniden üretildi. Bütün 36 türün tam/telefon dosyaları public/images/game/buildings/master-v6/ altında; masterBuildingImage ve SW125 bu sete bağlıdır. Önceki master-v4/master-v5 resimleri aktif şehir tarafından seçilmez. Divanhane Topkapı mimarisini koruyan üstten bakış çizimini kullanır; yeri ve mekanikleri değişmez.

Tüm doku (çatı, işlevsel avlu, görünen gölgeler) karonun iç poligonuna eşlenir; çatı kırpma/maskeleme yok. Kaldırım payı korunur. Her tür için bir temel görünüm vardır; bu sürüm beş ayrı seviye görseli sağladığını iddia etmez. Geceki genel avlu ışığının büyüklüğü azaltıldı; diğer sahnelerin ışık standardı değişmez.

## Kuzey ve sur

Kuzeye 120 resim pikseli yeni orman eklendi. Ağaç ölçeği şehir haritasına göre küçük; dev tekil ağaç yaklaşımı kullanılmadı. Eski altı koru sprite'ı kaldırıldı. Yeni orman zemini özgün şehir üstüne 24 pikselde yumuşak alfa ile birleşir; yol ve bina alanlarını kapsamaz. Güney denizi ve liman/korsan konumları önceki sürümdeki gibi kaldı.

Surda tüm kare sprite'ı 17 dereceyle döndürme kaldırıldı. Yeni yatay taş yüzler sırtın taban çizgisine eşlenir; düşey kenarları dik kalır. Sur seviyelerinin 1/4/8 görsel geçiş eşikleri korunur; yeni yüz yükseklikleri 12/16/19 resim pikselidir; yeni sade taş kule ve ahşap kapı kullanılır. Kontrol şehrinde 7 birleşen sur yüzü, 6 kule ve 1 kapı vardır. Binalar, kara/kıyı yuva kimlikleri, savunma sayıları, inşa maliyetleri, kayıt ve HUD değişmedi.

## Çizim kaydı

Yeni görseller yerleşik imagegen ile üretildi. Proje dosyaları: master-v6 içindeki 72 bina WebP; terrain/north-forest-v2.webp; walls/master-span-v2.webp, master-tower-v2.webp ve master-gate-v2.webp (hepsi public/images/game altında). Her biri 200 KB altında.

Üretim tarifleri: üstten bakış, roof-dominant orthographic camera, ivory limestone/terracotta/lead grey, warm upper-left daylight, opaque 2.3:1 functional parcel with complete architecture and courtyard, no external roads/UI/text. Valilik: asimetrik idare konağı; Kara Pazar: alçak dükkân/karanlık tenteler; Sığınak: iki geniş yeraltı girişi/havalandırma; Tekke: yeşil sekizgen semahane; Mabet: ahşap mabet/taş sunak/kutsal direk; Karagöz: ahşap sahne/boş ışıklı perde/seyirci sıraları. Orman: yüksek hava kamerası, panoramada yaklaşık 400 küçük zeytin/servi/çam tacı, doğal kuru toprak, şehir/yol/sur/su/yazı yok. Sur: düz yatay nötr kireçtaşı yüz, sade mazgallar, şeffaf dış alan, kırmızı şerit/dev kule yok. Kule: sekizgen sade taş gözetleme kulesi. Kapı: tek yarım daire kemer, kapalı ceviz kapı, alçak mazgallı üst geçit. Referanslar mevcut unified-detail-v3/nw.webp ve kurtarılan Topkapı üstten görünümüdür. Tam prompt seti docs/ART-PROMPTS-0.109.json dosyasındadır.

## Kontrol

355 test, tip kontrolü, ESLint/CSS, V2, telefon boyu resimler ve statik Pages derlemesi geçti. 36 tür dört genişlikte 25 Phaser senaryosuyla; uygulanan render köşelerinde taşma veya eksik kapsama yok. 14 savunma öğesi harita içinde ve arsa dışında kaldı. İlk karede kamera ölçümü çizimden önceki boş worldView yerine POST_RENDER anında alınır. Dokuz kuzey/güney sınır senaryosu 360/390/430 px ve DPR2'de geçti. Canvas ve DPR2 başlangıcı eksik dosya/sayfa hatası olmadan geçti. Gündüz/gece birleşik kontrol görüntüleri incelendi.

Genel 78 arayüz senaryosunda taşma/kesik/çakışma/isimsiz/sayfa hatası 0; eski HUD küçük hedef 312 ve minik yazı 663 uyarısı aynı kaldı. Genel denetim bütünüyle yeşil diye raporlanmaz.

Kanıt: docs/mockups/approved-city-109/qa.json, edges/qa.json ve release-390.webp. Bunlar kontrol şehridir; kullanıcının kaydını değiştirmez.
