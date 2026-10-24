# 0.120.0 / SW145 — ortak şehir zemini ve iki katlı Osmanlı kışlası

24 Ekim 2026. Kullanıcı son geniş açı önizlemesini “tamam al bakayım bi canlıya canlıda görelim” diyerek yayınlamayı istedi. Reddedilmiş PR #87/#88 ve tek katlı uzun kışla bu sürümde kullanılmaz.

Son kabul edilen geniş harita, içinde bina kalmayacak şekilde imagegen ile ayrı zemin katmanına dönüştürüldü. Kaynak yine 1586×992; dünya 3172×1984, arsa kimlikleri/merkezleri, yollar, köprüler, kıyı, dere ve ada düzeni korunur. `city.webp` yeni boyalı kaynak, mevcut derleme aracı aynı dünya çözünürlüğünde `city-crisp.webp` üretir. Bina zemine gömülü değildir.

`parcel-v4/kisla` son ortak boyama dilinden ayrılan iki katlı, normal oranlı gerçek alfa mimarisidir. Açık avlu ve eşya araları mevcut zemini gösterir. Tam WebP 960×640, küçük WebP 480×320. Tek çizim tüm kışla seviyelerinde kullanılır; ayrı büyüme aşamaları üretilmedi. Diğer 35 bina türünün çizimleri bu sürümde yenilenmedi.

## Yerleşim

Kabul edilen geniş görünümde iki katlı binanın çatısı, yatay arsanın gerisine doğal yüksekliğiyle yükselir. Önceki “bütün alfa piksellerini yatay 320×160 arsa poligonuna küçült” yöntemi, bu yapıyı gereksiz küçültüyordu. Kullanıcının reddettiği tek katlı/esnetilmiş mimariye dönülmez.

Yalnız kışlada, `barracks-contact.json` içindeki çizimden ölçülen zemin temas noktaları arsa poligonuna tek oranla sığar; temas zarfının merkezi arsa merkezine hizalanır. Çatı/kule silüeti zeminin arkasına yükselebilir; tam alfa konturu yolların 24 dünya px koridorundan ayrı tutulur. Gerekirse mimari bütünüyle tek oranda küçülür. Kırpma, esnetme, zemin ekleme veya yol taşıma yoktur. Bu, son kabul edilen iki katlı geniş önizlemenin kışlaya özgü uygulamasıdır; diğer yapıların eski tüm-alfa sığdırması değişmez. Dokunma/taşıma alanı, sabit belediye ve kayıtlı arsa kimlikleri aynı kalır.

`cityBuildingArtFrame` temas poligonu ve tam silüeti ayrı döndürür. Yol koruması gerçek yol merkez hatlarını 8 dünya px aralıkla örnekler ve tam konveks alfa konturunu denetler. Bu bir render güvenlik payıdır; bitmiş görünüm ayrıca gerçek Phaser ekranında incelenir. İnşa iskeleleri mevcut yöntemle çizilir.

## Doğrulama

`pnpm check`: typecheck, 372 test, ESLint ve CSS kontrolleri geçti. Arsa testleri bütün normal arsalarda her iki boy/yönde taban merkezlemesi, taban poligonu ve tam silüetin yol açıklığını doğrular. Eski diğer türlerin bütün alfa sığdırma kontrolleri korunur. Statik Pages build, V2 ölçütleri ve telefon görsel denetimi geçti.

`tools/cohesive-city-review.cjs` gerçek Pages taban yoluyla ana Phaser oyununu açar. 360/390/430 telefon genişliklerinde yeni varlık yüklemesi, seviye 1/8/20, aynalama ve kışlaya dokunma; 1536 masaüstünde çizim/yükleme ölçüldü. Masaüstünde kışlaya dokunma bu testin kapsamı değildir. Ekranlar ve ölçümler `docs/mockups/cohesive-city/` altında. `native-plot.webp` hesaplanan birleşimdir, tarayıcı ekranı değildir.

Genel layout taraması çıkış 1: taşma/kesik/çakışma/isimsiz/sayfa hatası 0; küçük hedef 312, küçük yazı 663. Bunlar önceki sürümlerde de aynı sayıda kayıtlı HUD uyarılarıdır; bu bina/zemin işiyle düzeltilmedi. `layout-summary.json` sonucu saklar. Kullanıcı yayından sonra gerçek cihazında değerlendirecek.

Paketleme aracı `tools/art/prepare-cohesive-city.cjs`; üretici built-in imagegen, kaynak özetleri `cohesive-city-provenance.json`, üretim promptları `cohesive-city-prompts.txt`. Önbellek SW145 ve oyun sürümü 0.120.0 birlikte yükseltilir. Kayıt/ekonomi/HUD/mekanik değişmez.
