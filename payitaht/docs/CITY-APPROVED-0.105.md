# Onaylı şehir — 0.105.0

13 Ekim 2026. Kullanıcı Topkapı esintili belediye ve geniş merkezli haritayı onayladı; bütün binaların belediye ölçeğinde, arsayı tamamen kapatarak şehirle uyumlu olmasını istedi. Doğrudan yayın yetkisi verdi.

## Yerleşim ve mimari

Mevcut 25 kara, üç kıyı ve bir korsan adası arsa kimliği korunur. Onaylı konseptteki 21 kara alanına karşılık motorun 25 alanını göstermek için kıyı öncesine dört alanlık bir sıra eklenir. Yeni motor arsası, kayıt taşıma veya ekonomi değişikliği yoktur. Merkez promenade geniş kalır; belediye sabit 0. arsadadır.

Her tamamlanmış yapı, çatı/duvar/işlevsel avlusu dahil opak dikdörtgen bir modüldür. Görsel iki eksende arsanın tam genişliğine ve yüksekliğine oturur. Dışarı taşma kırpma veya maskeyle saklanmaz; ayrıca düz dolgu plakası kullanılmaz. Dokunma animasyonu renk değiştirir, modülü küçültüp zemini açığa çıkarmaz. İlk inşaat şantiyesi tamamlanmış bina değildir.

36 bina türünün işlevleri ayrı mimariyle tanımlıdır. Tek belediye resmi kopyalanmaz. Üst-sol gün ışığı, krem kireçtaşı, kiremit/kurşun çatı ve yüksek cepheden kamera ortaklaşır. Her seviyede tam arsa kaplama korunur; bu sürüm beş ayrı seviye çizimi sunmaz. Kıyı yapıları taş iskele modülü, korsan kalesi surlu modüldür.

Yeni zemin tek 1536×1024 boyalı görüntüdür; dünyada 3 kat ölçekte gösterilir. Önceki dört detay parçası yeni zemin üzerine bindirilmez. Gerçek harita yüksekliği 3072 dünya pikselidir; 12000 piksellik boş deniz uzantısı kaldırılır. Gerçek oyun içi kuzey/güney pan sınırları ayrıca ölçülür.

## Doğrulama

`tools/art/approved-parcels.cjs` kaynak ve WebP çıktılarında bütün alfa piksellerini kontrol eder. `docs/PARCEL-COVERAGE-0.105.json` üretim kaydıdır. Bu kontrol çizim içindeki beyaz/boş marjı kanıtlamaz; her modül ayrıca görsel incelenir.

`master-projection.test.ts` 29 kimlik, tam modül boyutu, arsa çakışması ve yol koridorlarını denetler. `tools/approved-city-qa.cjs` 36 türü iki kayıt grubu halinde gerçek Phaser görüntü sınırlarıyla sınar; mobil üç genişlik ve masaüstü, yakınlaştırma ve kuzey/güney kaydırma dahil. Test kayıtlarındaki ordu sıfırlanır; ev olmayan gruba geçersiz ordu yerleştirilmez. Kullanıcı kayıtlarına dokunulmaz.

Yayın yalnız bütün dosyalar, uygulama kontrolleri ve gerçek ekran incelemesi tamamlandıktan sonra yapılır. Üretim sırasında kurtarma dalına sık aralıklarla kaydedilen sürümler canlı değildir.
