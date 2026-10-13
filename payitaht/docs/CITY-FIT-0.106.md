# Şehir zemini ve arsa uyumu — 0.106.0 / SW121

13 Ekim 2026. Kullanıcı 0.105.0 ekranında bulanık zemin, görünen yeşil arsa şeritleri, perspektif uyuşmazlığı ve fazla benzer mimariyi reddetti; düzeltme ve önceki canlı yayın izni geçerlidir.

## Son davranış

Onaylı master harita, belediye, yollar ve kayıtlı arsa kimlikleri korunur. Daha önce üretilen dört ayrıntılı kaynak 2 kat çözünürlükle çizilir: toplam 3072×2048, her dokunun dünya yerleşimi aynı 1536×1024 referansa bağlıdır. İç doku birleşimleri orijinal master üzerinde yumuşak alfa geçişiyle çizilir; bina çizimlerine maske uygulanmaz.

29 görsel arsa sınırı, yolun iç kenarı boyunca ölçülen dört köşeyle tanımlanır. Bu yalnız sahne projeksiyonudur: motor arsa kimlikleri, inşa koşulları, ekonomi ve kayıtlar değişmez. Kurulu binanın tüm dokusu iki yüzeyli Mesh ile dört köşeye eşlenir; resim kırpılmaz veya dışarı taşan çatı gizlenmez. Canvas yedeği aynı bütün dokuyu iki üçgenin afin dönüşümüyle çizer. Belediye çizimi değiştirilmez.

Hamam, medrese, müze, kahvehane, saray, tekke, gözlükçü ve ticaret merkezi built-in imagegen ile yeniden üretildi. Hamam: alçak yıldız pencereli kubbeler; medrese: büyük teleskop ve astronomi avlusu; müze: heykeller ve uzun sergi cephesi; kahvehane: bakır demleme tezgâhı ve masa terası; saray: katlı mermer konak; tekke: yeşil çatılı ahşap semahane; gözlükçü: büyük gözlük tabelası ve optik tezgâhı; ticaret merkezi: tartı, cumba ve pazar avlusu. Son WebP'ler `public/images/game/buildings/master-v5/`, zeminler `public/images/game/terrain/master-detail-v2/`. Belediye ışığı/malzeme/kamera referansıdır; mimarisi kopyalanmaz. Diğer 28 tür mevcut çizimleriyle yeni dört köşe yerleşimini kullanır. Bu sürüm beş ayrı seviye çizimi sağlamaz.

## Kontrolün sınırı

0.105.0'daki yalnız dikdörtgen boyut kontrolü görsel uyumu kanıtlamıyordu. Yeni QA gerçek çizimden sonra Mesh'in projeksiyon uygulanmış köşe koordinatlarını ölçer ve parselin dört köşesine eşleşmesini denetler. Bu geometrik sonuç ayrıca gerçek yakın/uzak oyun ekranlarıyla incelenir; salt test sayısına dayanarak sanat kalitesi onaylanmaz.

## Doğrulama

354 test, tip kontrolü, ESLint ve CSS kontrolleri geçti. V2, telefon görselleri denetimi ve Pages statik derlemesi geçti. Son Phaser, Canvas, DPR ve genel ekran taraması aşağıdaki son kayıtta tutulur.

Son kontrol: 36 tür, 360/390/430 px ve masaüstü, yakın/uzak ve kuzey/güney pan dahil 25 Phaser senaryosu geçti. Render sonrası dört köşe eşleşmesinde 0 taşma/eksik köşe, 0 eksik dosya ve 0 sayfa hatası; 24 sur parçasında 0 parsel çakışması. Canvas başlangıç ve 2x cihaz piksel oranı kontrolleri de geçti; ekranlar incelendi.

Genel tarama: 78 senaryo. Sonuçlar: {"taşma": 0, "kesik": 0, "küçük": 312, "minik": 663, "çakışma": 0, "isimsiz": 0}. Eski HUD/danışman küçük düğme ve yazı uyarıları nedeniyle genel betik çıkışı 1; şehir değişikliği bu alanlara müdahale etmez. Sayfa hatası: 0. Genel tarama bütünüyle yeşil diye raporlanmaz.
