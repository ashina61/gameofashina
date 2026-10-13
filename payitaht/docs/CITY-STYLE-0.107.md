# Şehir ve yapıların ortak görsel dili — 0.107.0 / SW122

13 Ekim 2026. Kullanıcı 0.106.0'dan sonra şehir ve binaların hâlâ uyumsuz olduğunu belirtti. Dikdörtgen/köşe ve çözünürlük düzeltmeleri sanat dili sorununu tek başına çözmüyordu.

## Son değişiklik

Onaylı Topkapı belediyesi malzeme, bitki, taş ve gün ışığı referansıdır. Şehir tabanı yeniden çizildi: daha nötr krem/kireçtaşı yollar, ince ve zemine oturan arsa bordürleri, küçültülmüş sokak bitkileri, daha doğal kaya ve yeşil tonları. Ana görüntü tek bütün kompozisyondur; yakın görünüm için aynı yeni kompozisyondan türetilmiş dört ayrıntılı doku kullanılır. 0.106.0'ın eski dokuları yeni görüntüyü örtemez. Haritanın son su sırasına uygulanan eski deniz dokusu/renk katmanı kaldırıldı.

Yeni kaynaklar: `public/images/game/terrain/city-unified-v3.webp` ve `public/images/game/terrain/unified-detail-v3/{nw,ne,sw,se}.webp`. Geometri referansı 1536×1024, ayrıntı toplamı 3072×2048. İç doku geçişleri master üzerinde yumuşar; bina resimleri kırpılmaz veya maskelenmez.

Bina çizimleri ve onaylı belediye yeniden değiştirilmedi. Mevcut dört köşe yerleşimi, dünya sınırları, yolların bağlantıları, arsa kimlikleri, taşıma/inşa, kayıtlar, ekonomi ve HUD aynı kalır. Bu sürümde yeni mekanik veya beş seviye çizimi yoktur.

## Kabul ölçütü

Salt test sayısı görsel uyumu kanıtlamaz. Gündüz 14:00 ışığıyla gerçek karma şehir kayıtları görüntülendi; nötr yolların avlu taşıyla ilişkisi, sokak bitkilerinin bina bitkilerine göre ölçeği ve yakın/uzak dokuların birbirini bozmaması incelendi. Teknik dört köşe/taşma ve kamera testleri ayrı kontrol olarak korunur. Görsel beğeni için kusursuzluk garantisi verilmez.

## Üretim

Built-in imagegen ile master zemin yeniden işlendi; ayrıntı dokuları bu master'ın tam dörtte bir referanslarından üretildi. İkinci master seçildi. Referans belediye: `public/images/game/buildings/master-v4/divan.webp`. Üretim promptları `docs/TERRAIN-PROMPTS-0.107.json` içinde.

## Doğrulama

354 test, tip kontrolü, ESLint/CSS, V2, telefon boyu varlıklar ve statik Pages derlemesi geçti. Son render/tarama sonucu ayrıca kaydedilir.

Son doğrulama: 36 türü kapsayan 25 gerçek Phaser senaryosu (360/390/430 ve 1536 px, pan/zoom, savunma), 0 parsel taşması, 0 eksik görsel, 0 sayfa hatası; 24 sur parçasında 0 parsel çakışması. Gündüz karma şehir ve yakın görünüm incelendi; 2x cihaz piksel oranı başlangıç kontrolü geçti.

Genel ekran taraması 78 senaryoda tamamlandı. Sonuç {"taşma": 0, "kesik": 0, "küçük": 312, "minik": 663, "çakışma": 0, "isimsiz": 0}. Eski HUD küçük düğme/yazı uyarıları nedeniyle betik çıkış kodu 1; bu alanlar değişmedi. Sayfa hatası 0. Teknik testler sanat kalitesinin mutlak kanıtı olarak kullanılmaz.

Yayın derlemesi: ilk GitHub koşusu Next 16.3.3 Turbopack Google-font import sorgusu çözümlemesinde başarısız oldu. Aynı yazı tipleri ve uygulama koduyla desteklenen `next build --webpack` yolu statik derlemeyi tamamladı. 2x piksel oranında gerçek oyun başlangıç kontrolü bu derleme üzerinde tekrar geçti; eksik dosya ve sayfa hatası yok. Font aileleri, font ayarları ve HUD değiştirilmedi.
