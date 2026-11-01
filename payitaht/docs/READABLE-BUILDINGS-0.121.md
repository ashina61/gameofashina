# 0.121.0 / SW146 — bina kimliği ve taban yerleşimi

1 Kasım 2026. İstek: bina boş arsaya oturmalı ve işlevi ilk bakışta anlaşılmalı.

Altı yeni built-in imagegen mimarisi `parcel-v5` altında: Divanhane (Topkapı kapısı, yuvarlak kuleler, Adalet Kulesi), Medrese (kubbeli derslikler, kitaplıklar, açık kitap), Çarşı (örtülü tezgâh sıraları), Depo (büyük yükleme kemerleri ve sandıklar), Elçilik (cumbalı diplomatik konak, sancaklar ve küre), Kahve Fidanlığı (kahve bitkileri ve kırmızı meyveler). Tam ve telefon WebP'leri ayrı; arsa toprağı ve açık avlular alfa ile ortak zemini gösterir. Diğer 30 tür yeniden çizilmiş sayılmaz. Ayrı seviye çizimleri üretilmedi.

36 tür ve iki düz kıyı yönü için kaynak çizim üzerinden işaretlenen temas zarfları `building-contacts.json` içindedir. Çatı değil taban zarfı arsaya tek oranla sığar. Tam silüet yol koridoruna yaklaşıyorsa önce aynı arsa içinde sınırlı konum seçenekleri denenir, sonra gerekirse tek oranda küçülür. Kırpma, esnetme, zemin plakası, yeni arsa veya kayıt değişikliği yoktur. Sabit belediye yuvasında yalnız Divanhane temas yerleşimi kullanılır. Üç deniz türü ve iki düz kıyı yönü kendi temas zarflarıyla kendi elmas biçimli kıyı/ada arsalarına oturur. İskele yaklaşımı arsa kenarına bilerek bağlanır; kara yolları için kullanılan uzaklık kuralı bu bağlantıya uygulanmaz.

Önceki yol merkez çizgileri altı kara arsasının içinden geçiyordu (3, 9, 11, 20, 21 ve güneybatı yaklaşımı). Boyalı yollar değişmeden, bu çakışan yürüyüş/koruma hatları tekrar çevre sokaklara işaretlendi. Regresyon testi her hat boyunca 4 dünya pikselinde bir hiçbir boş kara arsasına girilmediğini denetler. Üçüncü arsada elçilik tabanının arsa genişliğinin %70'inden büyük kalması ayrıca sınanır. Bu oran, bütün arsa piksellerinin mimariyle kaplandığı anlamına gelmez: açık avlular ve doğal kenar payı bulunur; yakın yollar bazı türlerin ölçeğini hâlâ sınırlayabilir.

`tools/readable-buildings-review.cjs` gerçek runtime seçicisi ve konum fonksiyonuyla 36 türün kataloğunu, iki şehir kompozisyonunu ve 1562 uygun arsa/yön ölçümünü üretir. `city-*.webp` ve `catalogue.webp` native birleşimdir, tarayıcı ekranı değildir. Gerçek mobil tarayıcı görüntüsü ayrıca saklanır.

Paketleme: `node tools/art/prepare-readable-buildings.cjs` (stdin JSON kaynak eşlemesi), ardından `node tools/prepare-parcel-city.cjs`. Yeni görseller service worker önbelleğine eklendi. Üretim SHA-256 kayıtları `readable-buildings-provenance.json` içindedir.

## Doğrulama

`pnpm check`: TypeScript, 374 test, ESLint ve CSS kontrolleri geçti. V2 ölçütleri, telefon görsel boyutu denetimi ve Pages taban yoluyla statik build geçti. Son test eklendikten sonra arsa testleri de yeşildir.

Gerçek Phaser sahnesi CUA tarayıcısında 360/390/430 × 844 iframe viewportlarında açıldı. Her birinde 28 kurulu yapı, sıfır arsa dışı taban noktası ve sıfır yatay sayfa taşması ölçüldü. 390 piksel sahnesinde merkez binaya gerçek tuval dokunuşu Divanhane müfettişini açtı ve kapatıldı. `mobile-game.jpg` gerçek tarayıcı ekranıdır; `mobile-qa.json` ölçümleri saklar. Genel `layout-qa.cjs` bu yönetilen ortamda CUA dışı tarayıcı kontrolü kullanacağı için çalıştırılmadı; bütün alt ekranlar tarandı iddiası yoktur.
