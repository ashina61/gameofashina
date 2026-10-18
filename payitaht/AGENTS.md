**18 Ekim ana şehir — 0.113.0 / SW137:** Kullanıcının “uyarla oyuna” talebiyle son doğal kıyı resmi ana sahneye bağlanır. Güncel takip `docs/PAINTED-TOWN-0.113.md`. `painted-town-v1/city.webp` ortak zemindir; belediye ve bayraklar resme gömülü değildir. Sabit merkezi belediye + resimden ölçülen 24 eşit kara arsası, mevcut 3 kıyı ve 1 ada kimliği korunur. Eski 5×5 düzen kullanılmaz. Tüm sprite oranları/alfa korunur; HUD, motor ve kayıt biçimi değişmez. Diğer yapıların yeniden çizimi bitmiş sayılmaz.

**17 Ekim ana oyun aktarımı — 0.112.0 / SW135:** Kullanıcı “hadi oyuna aktar o zaman” diyerek onaylı boyalı arsa sistemini ana oyuna istedi. `docs/MAIN-PARCEL-0.112.md` güncel takip. `ParcelCityScene` ana sahnedir: ortak 2:1 arazi/yol/arsa kamerası, zeminsiz `parcel-v1/kisla`. Eski yatay master-v11 esnetmesi ana oyunda kullanılmaz. Görsel projeksiyon değişir; motor slotları, kimlikleri, bölgeleri, kayıt biçimi ve mekanik/HUD korunur. Diğer türler mevcut izometrik stage görselleridir; yeni tasarımları henüz yapılmadı. Önceki yalnız prototip kapsamı bu açık aktarım talebiyle genişledi.

**17 Ekim 16:37 kullanıcı tasarım standardı onayı:** “mantık böyle çalışacak her bina ayırt edici şekilde böyle çizilecek”. `docs/BUILDING-PLACEMENT-RULES.md` başındaki güncel standart bütün yeni bina türleri için geçerlidir. Referans çalışan boyalı kışla: `docs/PAINTED-PARCEL.md`, `parcel-v1/kisla.webp`. Aynı kamera/ışık/ölçek ve arsa doluluğu; gerçek alfa, binaya ait zemin yok; her türün işlevini gösteren farklı kütle/çatı/silüet. Kışlanın L planı, kulesi ve avlu şeması diğer türlere kopyalanmaz. Her yeni tür mevcut ortak arazi üzerinde doğrulanır. Bu genel yöntem onayıdır; diğer bina türleri yapılmış veya ana şehir aktarılmış sayılmaz.

**17 Ekim boyalı çalışan arsa:** Kullanıcı son arsa kompozisyonunu uygulamayı istedi. `docs/PAINTED-PARCEL.md`; `/ikariam-study.html` gerçek alfa `parcel-v1/kisla.webp` kullanır. Arazi ve bina ayrı; avlu ve eşya araları saydam, zemin plakası yok. `art.mjs` alfa konturundan uniform yerleşimi saklar. Eski geometrik kışla canlı sayfada kullanılmaz. Ana oyunun yatay trapez arka planına esnetme yapılmaz; ana şehir/kayıt/mekanik/HUD aynı. Native QA gerçek WebP ile yapılır.

**17 Ekim prototip doluluğu:** Kullanıcı kışlayı biraz daha genişletip arsayı daha çok kaplamasını istedi. `/ikariam-study.html` kışlası dünya koordinatlarında bütün mimari ve temas gölgeleriyle tek oranda %13 büyütüldü. 12×12 arsa ve kamera değişmedi; açık avlu ortak zemini gösterir. Ana oyun aktarımı bu isteğin kapsamında değildir.

**16 Ekim Ikariam incelemesi / prototip:** Kullanıcı 0.111.3 sonucunu reddetti. master-v11 ve projektif esnetme görsel olarak onaylı değildir; aşağıdaki teknik doğrulama kayıtları kullanıcı onayı sayılmaz. Yeni istek önce Ikariam şehir/arsa/bina çizimlerini incelemek, ardından prototip yapmaktır. `docs/IKARIAM-STUDY-PROTOTYPE.md` ve `/ikariam-study.html`: tek kışla, ortak 2:1 kamera, aynı koordinatlardan çizilen yol/arsa/mimari, açık avluda ortak arazi. Bu geometrik taslaktır; boyalı nihai bina veya ana oyun düzeltmesi sayılmaz. Ana oyun, HUD, kayıt ve mevcut slotlar değiştirilmez.

**16 Ekim kullanıcı ekranı — 0.111.3 / SW134:** `docs/BARRACKS-PARCEL-0.111.3.md`. Kışla master-v11 dış kaidesiz/zeminsizdir. Arsa içine uniform küçültme bu bina için bırakıldı; kaynak trapezin dört kenarı mevcut karonun dört kenarına projektif UV ile eşlenir. Saydam alanlara zemin eklenmez. Bu, önceki kışla uniform yerleşim kuralının önündedir. Diğer dört kesit ve kalan binalar bu işte yenilenmez.

**16 Ekim tek arsa/kamera düzeltmesi — 0.111.2 / SW133:** `docs/BARRACKS-CAMERA-0.111.2.md`. Kışla master-v10, gerçek zemin referansıyla daha üstten ve alçak duvarla yeniden çizildi. Boş/eski/yeni görüntüler aynı koordinatlarda karşılaştırılır. Bu görüntüler native render olarak adlandırılır; gerçek ana oyun görüntüsünden ayrıdır. Diğer dört master-v9 yapı korunur. Bina zemini, yol yaması ve yeni arsa dolgusu eklenmez.

**16 Ekim zemin düzeltmesi — 0.111.1 / SW132:** `docs/GROUNDLESS-BUILDINGS-0.111.1.md`. Kullanıcı binaların kendi zemini olmamasını istedi. Beş yeni tür master-v9 kullanır; avlu içi ve eşya aralarındaki toprak/düz döşeme gerçek alfadır. Ana sahneye ayrıca arsa dolgusu çizilmez. Bu son kural aşağıdaki ortak toprak dolgusu tarifinin önündedir. Diğer 31 tür yenilenmedi; kayıt/mekanik/HUD korunur. Önceki yayın izni geçerlidir.

**16 Ekim beş ayırt edici bina — 0.111.0 / SW131:** `docs/FIVE-BUILDINGS-0.111.md`. Kullanıcı son kompozisyondaki kışla, medrese, depo, çarşı ve hamamı oyuna aktarmayı istedi. Ana sahne ve bina seçicisi master-v8 kullanır. Mimari gerçek alfa konturuyla tek ölçekte tam arsa içine sığar; ortak avlu mevcut şehir toprağından gelir ve dört köşeyi tamamlar. Açık taş plakaya dönme. Diğer 31 tür değişmedi; depo ile ambar ayrıdır. Kayıt/ekonomi/HUD/arsa kimlikleri korunur. Önceki doğrudan yayın izni geçerlidir.

**15 Ekim ana şehir kışlası — 0.110.1 / SW130:** `docs/BARRACKS-MAIN-0.110.1.md`. Yeni gerçek alfa kışla master-v7 ile ana sahnenin görsel seçicisine bağlıdır. Ayrı demo sonucu ana oyun onayı sayılmaz. Yol örnekleme yaması ve ikinci bayrak kaldırıldı. Diğer bina türleri bu sürümde yenilenmedi.

**15 Ekim v4 yol taşması düzeltmesi:** `docs/SINGLE-BUILDING-FIT.md` son bölüm. V3 gösterilen sınırdan büyük zemin/bina/yaklaşım çiziyordu. V4 tek değişmeyen poligona bağlıdır; büyük bağlam yaması ve dış yaklaşım kaldırıldı, mimari tek uniform ölçekte bütün olarak sığar. `tools/building-fit-canvas-qa.cjs` eski V3'ü 60.892 dış piksel ile reddeder, 27 gerçek çizim durumu parsel dışında 0 piksel ister. Bu native Canvas kontrolüdür, browser UI testi değildir. Tek deneme; ana oyun aynı kalır.

**15 Ekim gerçek boş arsa v3 düzeltmesi:** `docs/SINGLE-BUILDING-FIT.md` son bölüm. Kullanıcı boş arsa çiziminin kendisini yamuk buldu. `/building-fit.html` tek arsada yeni düz zemin+dikdörtgen taş kenar ve ayrı alfa kışla kullanır; sadece çizgiyi değiştirme yaklaşımına dönülmez. İlk açılışta çizgi kapalıdır, Eski çizim karşılaştırması vardır. Bu deneme ana oyuna aktarılmış sayılmaz.

**15 Ekim mevcut zeminde tek bina testi:** `docs/SINGLE-BUILDING-FIT.md`. `/building-fit.html` gerçek unified-detail-v3 üzerinde tek kışla/boş arsa karşılaştırmasıdır. Çapraz izometrik referans yerine mevcut yatay trapez kamera kullanılır. Ana oyun ve tüm katalog değişmiş sayılmaz.

**15 Ekim sıfırdan şehir temeli — 0.110.0 / SW129:** `docs/CITY-FOUNDATION-0.110.md`. Kullanıcı eski yapıştırma/esnetme yaklaşımını reddetti. Yeni `/city-foundation` pilotu tek 2:1 kamera, 25 eş arsa ve katmanlı yollar/zemin/dekor ile belediye-kışla-medreseyi doğrular. Eski master koordinatları bu pilotta kullanılmaz. Art zarfı foundation-sprite ile uniform ölçek/konum birlikte çözülür; mimari sivri arsa ucuna zorlanmaz. Ana oyun sahnesi ve kayıtlar değişmedi. Bu ilk çalışan bölümdür, bütün şehir/katalog bitmiş sayılmaz.

**15 Ekim kışla kamera ve gerçek alfa konturu — 0.109.3 / SW128:** `docs/BARRACKS-PLACEMENT-0.109.3.md`. Eski yüksek ön cepheli kışla reddedildi. Yeni alçak kule/arka yatay koğuş çizimi, masterCutoutFrame ile görünen piksel konturuna göre uniform ölçekte ön kaldırıma hizalanır. Şeffaf tuvalin dikdörtgeni bina sınırı sayılmaz; yaklaşım taş dekorun kapıyı tıkamasını giderir. Alpha konturları son WebP dosyalarından yeniden üretilir. Diğer 35 tür henüz bu işlemden geçmedi.

**15 Ekim kışla zemin/oran düzeltmesi — 0.109.2 / SW127:** `docs/BARRACKS-GROUND-0.109.2.md`. Kullanıcı opak toprak plakalı, karoya esnetilmiş 0.109.1 kışlayı reddetti. Kışla gerçek alfa ile şehir zeminini kullanır, MASTER_BUILDING_CUTOUTS üzerinden uniform ölçekte iç poligona sığar; tam-parsel mesh ile yamultulmaz. Diğer 35 tür henüz dönüştürülmedi; bütün şehir tamamlandı iddiası yapılmaz.

**13 Ekim son bina/orman/sur düzeltmesi — 0.109.0 / SW125:** `docs/CITY-ART-0.109.md`. Aktif şehir bütün 36 türde master-v6 üstten bakış setini kullanır; master-v4/v5 şehirde aktif değildir. 30 kurtarılan çizim ve 6 yeni tür; yeni orman kuzeyi 120 piksel açar, eski yapışık koru sprite'ları kaldırılmıştır. Sur yüzleri eğimli taban çizgisinde dikey kalır; yeni kule ve kapı, kare/rotasyonlu eski parçalar kullanılmaz. Bina/karo/kayıt/HUD/mekanik korunur; önceki doğrudan yayın izni geçerlidir.

**13 Ekim son istek — 0.108.0 / SW124:** `docs/CITY-EXPANSION-0.108.md`. Bütün çizim karo kaldırımının iç sınırında kalır; gerçek poligon kenarları denetlenir, bina kırpılmaz. Yeni altı küçük kuzey korusu ve 180 piksel güney açık su uzantısı; ada/iskele çoğaltılmaz, dalgalar ezilmez. Motor/kayıt/HUD korunur; önceki yayın izni geçerlidir.

**13 Ekim karo sınırı düzeltmesi — 0.107.1 / SW123:** `docs/CITY-PARCELS-0.107.1.md`. Görsel sınırlar eski küçük resimden değil ekranda çizilen unified-detail-v3 kaldırım kenarlarından ölçülür. Kara parsel çerçeveleri ve dokunma alanları aynı poligonu kullanır. Bu geometri düzeltmesi mevcut mimarinin kamera açısını yeniden çizmez; yeni 36 üstten bakış asseti tamamlandı denmez. Motor/kayıt/HUD korunur; önceki doğrudan yayın yetkisi geçerlidir.

**13 Ekim ortak şehir dili — 0.107.0 / SW122:** `docs/CITY-STYLE-0.107.md` son takip. Kullanıcı 0.106.0 uyumunu reddetti; belediye referanslı nötr doğal zemin ve daha küçük sokak dekorları yeniden çizildi. Eski detaylar yeni master üzerine bindirilmez. Salt teknik testlerle görsel uyum tamamlandı iddiası yapılmaz; gerçek birleşik şehir incelenir. Mekanik/kayıt/arsa kimlikleri/HUD korunur. Önceki canlı yayın yetkisi geçerlidir.

**13 Ekim ekran düzeltmesi — 0.106.0 / SW121:** `docs/CITY-FIT-0.106.md` son referanstır. Dört köşeli görsel arsa projeksiyonu, 2x ayrıntılı zemin ve sekiz ayırt edici yeni mimari. Görsel uyum yalnız dikdörtgen/alpha testiyle onaylanmaz; gerçek oyun ekranı ve projeksiyon uygulanmış köşeler ölçülür. Belediye, yol, motor, kayıt ve HUD korunur. Doğrudan yayın yetkisi geçerlidir.

**13 Ekim son kullanıcı onayı — 0.105.0:** Onaylı Topkapı belediye modülü, geniş merkez ve güneye genişleyen yerleşim. Bütün kurulu binalar kendi arsasını tam kapatır; mekanik/kayıt/HUD korunur. Kullanıcı doğrudan yayına izin verdi. `docs/CITY-APPROVED-0.105.md` ve bina yerleşim kuralları geçerlidir.

**12 Ekim deniz/kuzey düzeltmesi — 0.104.1 / SW119:** `docs/CITY-EDGES-0.104.1.md`. Aynalı su/iskele ve bulanık orman uzantıları kaldırıldı; deniz tek görüntü, kuzey kamera sınırı gerçek HUD ölçüsünden hesaplanır. Mekanik, arsa, kayıt ve HUD korunur. `tools/master-edge-qa.cjs` üç telefon genişliğinde uzak zoom ve iki yönde sınır kaydırmasını denetler.

**12 Ekim zemin ayrıntısı — 0.104.0 / SW118:** `docs/CITY-DETAIL-0.104.md` güncel takip. Dört 2x doku toplam 3072×2048 zemin; yedinci master modülü kahvehane. Eski katalog henüz bütünüyle uyarlanmadı. Yol/parsel projeksiyonu, mekanik, kayıt ve HUD korunur. Gerçek zoom/taşma kontrolü `tools/master-release-qa.cjs`; kanıtlar `docs/mockups/master-detail/`.

**12 Ekim yayın izni — 0.103.0 / SW117:** Kullanıcı arka planı ve yapılan binaları canlıya alma yetkisi verdi. `docs/CITY-RELEASE-0.103.md` ve `docs/BUILDING-PLACEMENT-RULES.md` geçerlidir. Altı yeni modül master-v3 altında; eski üç prototip aktif değildir. Tüm görsel arsa içinde, yollar açık; gerçek belediye/19. arsa projeksiyonu düzeltildi. Mekanik/kayıt/HUD korunur.

**12 Ekim kesin bina kuralları:** `docs/BUILDING-PLACEMENT-RULES.md` bütün eski prototip tariflerinin önündedir. Yollar kapanmaz; bina arsayı doldurur; çatı, avlu, dekor ve gölge dahil hiçbir öğe dışarı taşmaz. İlk bağımsız üç prototip reddedildi; arsa üzerinde tasarım ve ayırt edici mimari geçerlidir. Konseptler sınır doğrulaması olmadan oyuna hazır kabul edilmez.

**11 October reference map review — 0.102.0 / SW116:** `docs/MASTER-MAP-ADAPTATION.md`; new master scene projects stable engine indices onto the supplied painting. Mechanics, Tiled geometry, saves and HUD remain unchanged. Review branch only, no deployment. Required layout QA has unchanged HUD size/font warnings recorded in the document.

**11 Ekim şehir tabanı — 0.101.1 / SW115:** `docs/CITY-FOUNDATION-DESIGN.md`; sıcak çayır/toprak, kurulu binalara avlu, belirgin yol hiyerarşisi ve geniş ortak liman promenadı. Dere kıyıları birleşir. Arsa, bina ölçeği, HUD, motor ve kayıt korunur. Yeni hareket/modelleme sonraki aşama; yayın sonrası kullanıcı değerlendirmesinde dur.

**11 Ekim çizim yaşam döngüsü — 0.100.0 / SW113:** `docs/RENDER-LIFECYCLE-VALIDATION.md`; yükleme sırasında açılan sayfanın güncel durumu ilk çizimden sonra uygulanır. Uyuyan şehir değişiminde eski Phaser oyunu ve global hafif mod dinleyicisi temizlenir. HUD, motor, kayıt ve ada koordinatları korunur. Tarayıcı oturum ölçümü gerçek cihazın ısınma/pil ölçümü yerine geçmez.

**11 Ekim son takip — 0.99.1 / SW112:** `docs/FINAL-VISUAL-AUDIT.md`; ada araçlarının ikon adları erişilebilir, görünmez metnin iki yanlış minik yazı uyarısı giderildi. Ana sayfa geçişleri tamam. Onaylı HUD, mekanik, kayıt ve ada koordinatları korunur; gerçek cihaz kontrolü ve ertelenen mağaza işleri açık. Yayın sonrası kullanıcı değerlendirmesinde dur.

**11 Ekim yardımcı defterler — 0.99.0 / SW111:** `docs/SUPPORT-DESIGN-MEMORY.md`; ilk rehber, çevrimdışı dönüş ve bina önizlemesi ortak atlaslarda. Büyük yazıda rehber kaydırması ve HUD altında kalan dönüş düğmeleri giderildi. Motor, kayıt, ada koordinatları ve HUD korunur. Ana sayfa geçişleri tamam; yayın sonrası kullanıcı değerlendirmesinde dur.

**10 Ekim giriş ekranı — 0.98.0 / SW110:** `docs/TITLE-DESIGN-MEMORY.md`; boyalı ana menü, kayıt sicili, yeni oyun, yardım ve açılış sürüm notları. Gerçek işlemeli arma, ortak atlaslar ve okunur mobil formlar. Kayıt/başlama/silme onayı, motor ve HUD korunur. Sonraki bütün sayfalarda son tutarlılık denetimi; yayın sonrası kullanıcı değerlendirmesinde dur.

**10 Ekim Şehir günlüğü — 0.97.0 / SW109:** `docs/JOURNAL-DESIGN-MEMORY.md`; arama önce, sekiz olay filtresi iki sıra, gün/saat/tekrarlarıyla dikey boyalı sicil. Olay türü, arama, gruplama, son 60 kayıt, motor ve HUD korunur. Sonraki giriş ekranı; yayın sonrası kullanıcı değerlendirmesinde dur.

**10 Ekim Elçi/İttifak — 0.96.0 / SW108:** `docs/DIPLOMATIC-DESIGN-MEMORY.md`; Elçinin altı defteri ve ittifakın kuruluş/üyelik/yönetimi ortak eğitim atlaslarında. Kısa sahne, ikonlu sekmeler, dikey sicil ve okunur formlar. Yapay rakip, ticaret, ittifak, kayıt, motor ve HUD korunur. Sonraki Şehir günlüğü; yayın sonrası kullanıcı değerlendirmesinde dur.

**10 Ekim Vezir — 0.95.0 / SW107:** `docs/VIZIER-DESIGN-MEMORY.md`; Gündem/Şehirler/Haberler ortak boyalı defterler, emir önce, dikey üretim ve şehir sicili. Danışman öncelikleri, kayıt, motor ve HUD korunur. Sonraki Elçi/İttifak; yayın sonrası kullanıcı değerlendirmesinde dur.

**10 Ekim Halk/Şehirler — 0.94.0 / SW106:** `docs/POPULATION-DESIGN-MEMORY.md`; İşgücü/Yaşam ve Yerleşimler/Nakliye/İdare ortak boyalı defterler, tam boy halk/âlim ve okunur şehir sicili. Motor, kayıt, HUD korunur. Sonraki Vezir; yayın sonrası kullanıcı değerlendirmesinde dur.

**10 Ekim Hazine — 0.93.0 / SW105:** `docs/TREASURY-DESIGN-MEMORY.md`; Hazine/Üretim/Ambar ortak boyalı defterler, yedi kaynak dikey stok sicili ve iki sütunlu seçim. Ekonomi, kayıt, HUD korunur. Sonraki Halk/Şehirler; yayın sonrası kullanıcı değerlendirmesinde dur.

**10 Ekim Divanhane/Elçilik — 0.92.0 / SW104:** `docs/CIVIC-DESIGN-MEMORY.md`; dikey şehir/meslek/nişan sicili, Halk/İdare ve Hariciye/Casuslar; ortak eğitim atlası. Yükseltme Gelişim başında. Motor, kayıt, HUD ve dört ada açıklığı korunur. Yayın sonrası kullanıcı değerlendirmesinde dur.

**10 Ekim Saray/Valilik — 0.91.0 / SW103:** `docs/PALACE-DESIGN-MEMORY.md`; Koloniler/İdare ve Gelişim, gerçek seviye şartı/yolsuzluk ve dikey şehir sicili, iki ayrı sahne. Motor, kayıt, HUD ve dört ada açıklığı korunur. Yayın sonrası kullanıcı değerlendirmesinde dur.

**10 Ekim dar ekran kontrolü — 0.90.0 / SW102:** `docs/READABILITY-DESIGN-MEMORY.md`; başlık satırları, profil sekme/alt düğme hedefleri, nişan yazıları ve açıklama hedefleri. Onaylı HUD, motor ve kayıt korunur.

**10 Ekim Ordu/Donanma — 0.89.0 / SW101:** `docs/MUSTER-DESIGN-MEMORY.md`; Kara ordusu/Donanma/Seferler, aynı eğitim atlası, kayıtlı ve kullanılabilir sayı ayrı. Motor, kayıt, HUD ve dört ada açıklığı korunur. Yayın sonrası kullanıcı değerlendirmesinde dur.

**10 Ekim dünya/özet — 0.88.0 / SW100:** `docs/ATLAS-DESIGN-MEMORY.md`; 16 ada seçimi ve haritaya özel yakınlaştırma; şehir başına Kaynaklar/Binalar/Ordu defterleri. Motor, kayıt, HUD ve dört ada yerleşim açıklığı korunur. Yayın sonrası kullanıcı değerlendirmesinde dur.

**10 Ekim Serasker/hedef — 0.87.0 / SW99:** `docs/CAMPAIGN-DESIGN-MEMORY.md`; hedef sekmeleri, ortak portre/adet atlası; rapor/sefer/savunma defteri ve görünüm filtreleri. Motor, kayıt, HUD ve dört ada açıklığı korunur. Yayın sonrası kullanıcı değerlendirmesinde dur.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Payitaht Adaları — ajanlar için

**10 Ekim ada/orman/maden — 0.86.0 / SW98:** `docs/ISLAND-DESIGN-MEMORY.md` (doküman klasöründe ISLAND-DESIGN-MEMORY.md). Kullanıcı dört ek alanı adanın yerleşimi için istedi; ormanda veya şehir içi arsalarda değil. Yeni arazi ve dört boş açıklık, ortak Üretim/Gelişim defterleri. Motor/HUD korunur; yayın sonrası kullanıcı değerlendirmesinde dur.

**10 Ekim inşa/arsa — 0.85.0 / SW97:** `docs/CONSTRUCTION-DESIGN-MEMORY.md`; ortak boyalı dikey katalog ve açılır arsa defteri, gerçek bedel/süre/kilit ve sıra. İnşa ayrı düğmede, kara/deniz/korsan kuralları aynı. Sonraki Ada ormanı ve madeni; yayın sonrası kullanıcı değerlendirmesinde dur.


**10 Ekim kültür/gölge oyunu — 0.84.0 / SW96:** docs/CULTURE-DESIGN-MEMORY.md geçerlidir. Müze ve Karagöz ortak defter ve iki sahne. Yerel/ortak kültür sınırları, gerçek 12/18 saat gösteri ve başlangıçtan yeniden açılış, kapasiteyle sınırlı lütuf ayrı. Gelişim önce yükseltme; motor/HUD korunur. Sonraki inşa menüsü ve arsa seçimi; yayın sonrası değerlendirmede dur.

**9 Ekim ibadet/himaye/kutsama — 0.83.0 / SW95:** docs/DEVOTION-DESIGN-MEMORY.md geçerlidir. Cami, Ahi Tekkesi, Ongun Mabedi ortak defter ve üç sahne; tam boy imam. Sunu/adak gerçek sınırlı miktar, kudret engelleri ve araştırma kaynaklı bekleme değişimleri görünür. Gelişim önce yükseltme; motor/HUD korunur. Sonraki Müze/Karagöz Perdesi; yayın sonrası kullanıcı değerlendirmesinde dur.

**9 Ekim teçhizat ve korsan seferleri — 0.82.0 / SW94:** docs/ARMAMENT-DESIGN-MEMORY.md geçerlidir. Kara/donanma teçhizatı ve bireysel saldırı/zırh; hedef/filo/sefer defterleri, motorla aynı ganimet ve görünür engeller. Ortak atlaslar ve iki ayrı sahne; yükseltme Gelişim başında. Motor/HUD korunur. Sonraki Cami/Tekke/Mabet; yayın sonrası kullanıcı değerlendirmesinde dur.

**9 Ekim maliyet yapıları — 0.77.0 / SW89:** docs/COST-DESIGN-MEMORY.md; beş atölyede ortak Tasarruf/Gelişim. Örnekler gerçek motor bedelleri, Mimar araştırması ve Mutfak/Top Dökümü çarpanları doğru gösterilir. Sonraki bölüm Çarşı/Ticaret Merkezi; yayın sonrası kullanıcı değerlendirmesinde dur.

**9 Ekim üretim yapıları — 0.76.0 / SW88:** `docs/PRODUCTION-DESIGN-MEMORY.md`; Kereste Ocağı, Ormancı Evi, Kahve Fidanlığı, Taşçı, Camcı ve Simyahane ortak Üretim/Gelişim defterlerinde. Kereste ataması mevcut workers komutuyla; yapı yüzdesi/toplam üretim ayrı, ada kaynağı uyuşmazlığı açık. Sonraki bölüm maliyet azaltma yapıları; bu bölüm yayınından sonra kullanıcı değerlendirmesinde dur.

**9 Ekim Ambar/Depo — 0.75.0 / SW87:** `docs/STORAGE-DESIGN-MEMORY.md`; ortak Stoklar/Gelişim, yedi mal dikey defterde, her malın ayrı kapasitesi ve koruması. İlim yağmalanmaz. Yükseltme ilk Gelişim bloğu; motor/HUD aynı. Sonraki Kereste ve kaynak üretim yapıları.

**9 Ekim Kahvehane — 0.74.1 / SW86:** `docs/COFFEEHOUSE-DESIGN-MEMORY.md`; İkram/Gelişim aynı ortak atlaslar. İkram barı +/−/Maks. ile mevcut anlık tavern komutunu kullanır. Kahve stoğu/tüketim/huzur birlikte, tam boy ortak halk. Sonraki Ambar/Depo.

**9 Ekim Hamam — 0.73.0 / SW84:** `docs/BATHHOUSE-DESIGN-MEMORY.md`; aynı ortak atlaslar, tam boy halk, Halkın huzuru/Gelişim. Hamam katkısı ile toplam huzur ayrı, barınma sınırı görünür. Yükseltme ilk Gelişim bloğu. Sonraki bina Kahvehane.

**9 Ekim Konut — 0.72.0 / SW83:** `docs/HOUSING-DESIGN-MEMORY.md` geçerlidir; ortak kışla/Medrese atlasları, tam boy halk, Mahalle/Gelişim. Yükseltme önce. Sonraki bölüm Hamam; her bina bitince canlı yayın ve kullanıcı değerlendirmesinde dur.

**Son kullanıcı düzeltmesi — 0.71.1 / SW82:** Halk ve âlim rol alanlarında portre kullanılmaz. Ortak `citizen-figure.webp` ve `scholar-figure.webp` şeffaf, tam boy insan figürleridir; baştan ayağa görünür, portre çerçevesi yoktur. HUD danışman rozetleri ayrı navigasyon görselleridir, asker portre standardı korunur.

**9 Ekim 0.71.0 / SW81 düzeltmesi:** Halk ve âlim ortak `ui/people/` portreleri; ilim/süre ortak yeni WebP. Bina detaylarında yapı/seviye önizlemeleri ve üst bilgi düğmeleri kaldırıldı; yön/taşı/yık Gelişim'de. Yükseltme başlığı ortalı, Onayla/Geri al eşit. Kristal deneyleri gerçek harcama/kazanımı, Âlimin önerisi güncel duruma göre uygun araştırmayı anlatır. `docs/MEDRESE-DESIGN-MEMORY.md` başındaki son kurallar eski avlu tariflerini değiştirir.

**8 Ekim son genel onay:** Kullanıcı kışlanın 0.69.0 son halini oyunun tasarım standardı kabul etti. Yeni sayfalarda önce `docs/MASTER-UI-STANDARD.md`; Medrese/araştırma için `docs/MEDRESE-DESIGN-MEMORY.md` okunur. Mekanik/HUD korunur, Gelişim’de eylem önce gelir.

- **Güncel sıra:** Kullanıcının 5 Ekim ‘oyunun geneline sırayla başla’ talebiyle ortak onaylı dil kalan ekranlara uygulanır. İlk bölüm Vezir, 0.57.0 / SW54; Gündem, Şehirler, Haberler. Kullanıcının sonraki ‘devam’ talebiyle Elçi/İttifak 0.58.0 / SW55. Kullanıcının 6 Ekim devam talebiyle Divanhane/Elçilik 0.59.0 / SW56: yönetim ve casusluk ayrı defterler, resimli şehir meydanı. Sonraki bölüm Saray/Valilik, ardından üretim ve askerî yapılar. Bir bölüm tamamlanınca yayın ve gerçek ekran görüntüleriyle kullanıcı değerlendirmesinde dur.

- **En son onaylanan Profil/Ayarlar dili:** `docs/PROFILE-SETTINGS-DESIGN.md`, `docs/mockups/approved-profile.webp` ve `docs/mockups/approved-settings.webp`. Kullanıcının 5 Ekim talebiyle bütün alt sekmeler 0.55.0 / v52 olarak bu dile geçirildi. Kullanıcının SVG temizleme talebiyle Sancaktar odası 0.56.0 / v53: gerçek kumaş ve sırma arma görselleri, docs/SANCAKTAR-ART.md. Bu bölümün yayınından sonra kullanıcı değerlendirmesinde dur.

- **Önceki tasarım hafızası:** `docs/tasarim-dili.md`. Kullanıcının 4 Ekim 23:15 talebiyle yeni sayfa yenilemeleri bu dil ve basitten zora bölüm sırasıyla ilerler. Bir bölüm bitince canlıya al, kullanıcı değerlendirmesinde dur. Görevler v46 sonrasında kullanıcı 5 Ekim «tamam geç sıradakine» dedi. Günlük/sürüm arşivi v47 sonrasında kullanıcı «geç; cilalama değil düşün ve tasarla» dedi. Üçüncü bölüm saray/profil ve idare/ayarlar v48 olarak yeniden kurgulandı. Kullanıcı üçüncü bölümden sonra «uzman oyun tasarımcısı gibi düşünerek devam et» dedi. Dördüncü bölüm Hazinedarın defteri v49 / 0.52.0: Hazine, Üretim ve Ambar. Kullanıcı oyunu dar buldu ve bütün UI/UX/assetleri değiştirme yetkisiyle devam istedi. Beşinci bölüm Halk/Şehirler ve geniş ortak düzen v50 / 0.53.0: kısa kaynak şeridi, 64px alt menü, 960px içerik; İşgücü/Yaşam ve Yerleşimler/Nakliye/İdare. Yayın sonrası kullanıcı değerlendirmesinde dur; sonraki bölüm Vezir/Elçi/ittifak.

- Görsel yenileme işi: `docs/gorsel-brifi.md` (fazlar, sanat kılavuzu, kontroller). Oradaki sırayla ilerle; G0, G2, G4 ve G6'dan sonra onay bekle.
- Görsel brif 2 (mockup moduna geçiş): `docs/gorsel-brifi-2.md` — H1, H2 tamam; H3 (5 aşamalı şehir tabanı, alt-resimler `docs/mockups/taban/`) sonrası onay bekle. Hedef mockup'lar `docs/mockups/`.
- Genel plan ve durum: `docs/v2-plani.md`.
- Commit öncesi kontroller: `pnpm check` + `node tools/layout-qa.cjs` (yerel sunucu gerekir) + `node tools/v2-criteria.cjs`.
- Oyun kuralı, ekonomi, kayıt biçimi ve slot koordinatları izinsiz değişmez.

- **8 Ekim profil referansı:** `docs/PROFILE-DESIGN-MEMORY.md`, `docs/mockups/approved-profile-v2.webp` ve `docs/profile-v2-atlas.json`. Sarık/kavuklu tasarım eski profil onayını değiştirir. Üst/alt HUD tamamlandı; `ika-hud.tsx`, `41-exact-reference-hud.css` ve HUD assetlerini değiştirme. Yalnız mevcut profil mekaniğine görsel giydir.

- **8 Ekim Ayarlar referansı:** `docs/SETTINGS-DESIGN-MEMORY.md` ve `44-settings-chambers.css`. Tercihler, Cihaz, Kayıt ve Bilgi 0.63.0 / SW71 olarak onaylı profil malzemelerine geçirildi. Eski ayar mockup/yuvarlak cam paneller yerine bu bellek ve gerçek ekran kanıtları kullanılır. Ayar mekanikleri ve HUD değişmez.

- **8 Ekim arşiv/ittifak:** `docs/ARCHIVE-ALLIANCE-DESIGN-MEMORY.md`, 0.64.0 / SW72. Sürüm arşivi ile ittifakın bütün durum/alt sekmeleri aynı profil malzemelerindedir. Sonraki görsel işlerde bu bellek geçerlidir; mekanik ve HUD korunur.

## Görev tasarımının güncel belleği (8 Ekim 2026)

Görev sayfası ve saray başlık düğmeleri için `docs/MANDATES-DESIGN-MEMORY.md` ve `docs/MANDATES-VALIDATION.md` okunur. 47 numaralı stil beş saray sayfasında atlasın içine gömülü geri/çarpı yerine ayrı ve oranı korunan düğmeler kullanır. 48 numaralı stil görevlerin üç sekmesine ortak Osmanlı saray dilini uygular. HUD ve oyun mekanikleri değiştirilmez.

## Kışla detay (8 Ekim 2026)

0.66.1 / SW75 için `docs/BARRACKS-DESIGN-MEMORY.md` ve `docs/BARRACKS-VALIDATION.md` güncel referanstır. 49 numaralı stil yalnız kışla detayına uygulanır; yuvarlak 47 numaralı başlık kontrolü kışlaya genişletildi. Asker eğitimi, sıra, maliyet, süre, garnizon, bina ve HUD mekanikleri korunur.

Kullanıcı 0.66.0 kışla düzenini dar buldu: eğitim ekranında sabit yükseltme ve otomatik büyük avlu kullanma. Gelişim/yardım altındaki destek bilgileriyle ana oyun eylemine alan aç. HUD korunur.

## Kışla için en son onay (8 Ekim, 0.67.0 / SW76)

`docs/BARRACKS-DESIGN-MEMORY.md` başındaki yeni onay ve `docs/mockups/approved-barracks-vertical-slider.webp` geçerlidir. Birlikler alt alta, seçili satırda eğitim; yalnız adet barı yatay sürüklenir. Yuvarlak ceviz/pirinç kontroller, işlemeli ortak çerçeveler, kırmızı askerî eğitim düğmesi ve yeniçeri/börk sekme simgesi. Eski yatay galeri tarifine dönme. Gelişim ve HUD korunur.

## Kışlanın görsel düzeltmesi — 0.68.0 / SW77

Kullanıcı 0.67.0 ekranını çizime benzemediği için reddetti. `docs/BARRACKS-DESIGN-MEMORY.md` başındaki 0.68.0 düzeltmesi geçerlidir: gerçek portreler ve atlas çerçeveleri, bütün alt bölümler, mevcut alt HUD. Sadece renk benzerliğine dayanarak tasarıma uygunluk iddia etme.

## Kışlada eksiksiz referans ayrıntıları — 0.69.0 / SW79

`docs/BARRACKS-DESIGN-MEMORY.md` başındaki 0.69.0 kuralları geçerli: 16 portrede ortak işlemeli köşeler, gerçek +/−/Maks./sürgü malzemesi, Gelişim ikonu, süslü başlıklar ve ortak Üretim kuyruğu. Kışlada eski UnitFigure fallback'i kullanma; yükseltme Gelişim'de ilk sırada kalır.


## Çarşı ve Ticaret Merkezi — 0.78.0

docs/COMMERCE-DESIGN-MEMORY.md geçerlidir. İki ana sekme ve ortak atlaslar; anlık tüccar ile yolculuklu pazar ayrıdır. Net gelir, gerçek satış akçesi ve teklif stokları doğru açıklanır. Ekonomi ve HUD korunur. Sonraki bölüm Kara Pazar.


## Kara Pazar — 0.79.0

docs/EXCHANGE-DESIGN-MEMORY.md geçerlidir. Ortak atlaslar, ayrı sahne, Mal takası/Gelişim. Gerçek kayıplı miktar ve engeller işlemden önce okunur. Maks. resmini form alanına uygulama. Motor ve HUD korunur. Sonraki bölüm Liman/Tersane.


## Liman ve Tersane — 0.80.0

docs/MARITIME-DESIGN-MEMORY.md geçerlidir. Ortak filo ve gerçek yük sınırı, dikey gemiler/inşa kuyruğu; ortak atlaslar ve Gelişim başında yükseltme. Motor ve HUD korunur. Sonraki bölüm Harita Arşivi ve savunma yapıları; yayın sonrası kullanıcı değerlendirmesinde dur.


## Harita Arşivi ve savunma — 0.81.0

docs/DEFENSE-DESIGN-MEMORY.md geçerlidir. Yol çarpanı ve nakliye araştırması; başlangıç sur canı/şehir savunması ve garnizon; ek casusluk katkısı ile gerçek kovma şansı ayrıdır. Ortak atlaslar, üç sahne, Gelişim önce yükseltme. Motor ve HUD korunur. Sonraki bölüm Tophane/Korsan Kalesi; yayın sonrası kullanıcı değerlendirmesinde dur.
