# Yeni şehir temeli — ilk çalışan bölüm, 0.110.0 / SW129

15 Ekim 2026. Kullanıcı önceki şehir/kışla yamalarını reddetti ve görsel sistemi sıfırdan, ortak kamera/arsa/kademeli katmanlar ile kurmayı istedi. İlk kapsam belediye, kışla ve medreseyi yan yana çalışan bir bölüme taşımaktır.

## Ortak temel

Yeni /city-foundation önizlemesi eski master harita resmine veya ölçülmüş yamuk koordinatlarına dayanmaz. foundation-grid tek bir tersine çevrilebilir 2:1 projeksiyondur: tile 128×64, 4×4 ortak site, 6 karo merkez aralığı, 25 aynı şekilli arsa. Belediye merkezde 0 numaralı sabit arsa; kışla ve medrese boş arsalara dokunularak taşınır. Yol şeritleri de aynı düzlemden üretilir ve hiçbir arsa ile kesişmez. Dünya 4096×3000; kuzey ağaçları ve güney su bandı ilk çevre taslağıdır.

Çizim rehberi docs/foundation/camera-guide.png: 3×3 mimari taban ve 64 piksel yükseklik rezervi, 4×4 site içinde tek kamerayla gösterilir. Belediye geniş kırma çatılı; kışla mazgallı kuleli; medrese belirgin büyük kubbelidir. Altı WebP public/images/game/foundation/v1 altında; tam dosyalar 1024×683, telefon dosyaları 512×341, her biri 200 KB altında. Mimari gerçek alfa kullanır. Ortak zemin, yol, gölge ve boş arsa dekoru sahnede ayrı katmanlardır; dekor kurulu arsalarda kaldırılır ve taşıma sonrası yeniden hesaplanır.

foundation-sprite, görünen piksel zarfına göre uniform ölçek ve konumu birlikte çözer. Bütün mimariyi elmasın tek uç noktasına zorlayarak küçültmez. Dört kenarın iç normalleri üzerinden üç bilinmeyenli doğrusal yerleşimin köşe çözümleri aranır. En-boy oranı değişmez, kırpma/maske uygulanmaz. foundation-art.json son WebP'nin gerçek alfa satır kenarlarından üretilen zarfları saklar.

Pages erişimi: `/gameofashina/city-foundation.html` (statik export dosyası).

## Etkileşim ve sınırlar

Üç yapı düğmesi yapıyı seçer ve kamerayı odaklar. Sürükleme, tekerlek ve iki parmak zoom; Merkez/Genel görünüm; arsa rehberleri; kışla/medrese taşıma ve başlangıca dönüş çalışır. Belediye sabittir. Pilotun yerleşimi sahne belleğindedir, mevcut oyun localStorage kayıtlarına yazmaz. Eski canlı şehir sahnesi değişmedi.

Bu ilk çalışan görsel bölümdür; bütün bina kataloğu, yeni kıyı/sur çizimleri, gelişmiş orman, beş seviye seti veya mevcut oyun motoruna varsayılan geçiş tamamlandı denmez. Projeksiyon/katman prototipi bitmeden eski master'a yeni bina yapıştırmaya dönülmez.

## Doğrulama

357 test kapsamında yeni temel/projeksiyon/yol boşluğu ve gerçek alfa satır sınırı testleri var. Her sprite bütün 25 arsada, kaynak en-boy oranını koruyarak yerleşir ve yola taşmaz; görünür boyutun arsanın yarısından küçük olması ayrıca başarısızlıktır. Tip, ESLint/CSS ve statik Pages export geçti.

Gerçek Phaser/WebGL önizlemesi 360/390/430 px ve DPR2'de kontrol edildi: üç yapı mevcut, seçim/odak, dokunarak başka boş arsaya taşıma, sıfırlama ve zoom düğmeleri çalıştı; ekran dışı kontrol, küçük kontrol, isimsiz kontrol, eksik dosya ve sayfa hatası 0. İlk kadraj, yakın kışla/medrese ve genel görünüm incelendi. Mevcut ana oyunun beş runtime senaryosu ve düzen taraması önceki sonuçla aynı: taşma/kesik/çakışma/isimsiz/sayfa hatası 0; eski HUD küçük hedef 312 ve minik yazı 663 uyarıları korunur.

## Çizim tarifi

Kamera ve yükseklik rehberi bütün üç türde ortak referanstır. Sıcak krem kireçtaşı, muted terracotta, kurşun mavisi kubbe, bordo askerî/turkuaz bilim/yeşil idari kumaşlar; üst sol ışık, gerçek alfa dış alan ve avlu zemini. Belediye: geniş kırma çatı ve küçük fener kubbesi; kışla: dört bodur mazgallı kule, tek uzun koğuş çatısı, büyük kalkan/kılıç kapısı; medrese: tek büyük kubbe, L derslik kanatları, açık kitap kabartması. Yazı, insan, çevre yolları ve opak toprak plakası yok. Zemin dokuları ile ağaçlar önceki ortak terrain/decor varlıklarından alınan ilk çevre taslağıdır.
