# 0.122.0 / SW147 — taş surlar ve parçalı şehir zemini

2 Kasım 2026. Ana Phaser sahnesinde düz renkli sur yüzlerinin yerine mevcut `master-span-v2.webp` taş dokusu bağlandı. Doku gerçek sur hattına kesme dönüşümüyle yansıtılır; taş derzleri dik kalır. Küçük mazgallar ve üst yürüyüş bandı aynı taban çizgisini izler. Düz şekillerden çizilen kuleler yerine mevcut `master-tower-v2.webp` saydam mimarisi kullanılır. Bütün kademeler aynı boyalı mimariyi kendi yüksekliğinde gösterir; yeni seviye çizimleri üretilmedi. Kuleye gerçek tuval dokunuşu sur müfettişini açar. Geçici yüz dokuları yeniden çizimde ve sahne kapanışında temizlenir.

Şehir zemini aynı 1586×992 kaynak çizimden önce kaynak ölçeğinde, sonra 3172×1984 dünya ölçeğinde işlenir. Bu mevcut kaynak üzerinde keskinlik işlemidir; kayıp ayrıntıların yeniden çizildiği veya yeni yüksek çözünürlüklü kaynak üretildiği iddia edilmez. Tam bitmiş dünya önce bir kere çözülür; dört kayıpsız WebP ondan çıkarılır. Parçaların iki piksellik örtüşmesi, filtreleme sırasında kenarlarda boşluk ve farklı renk oluşmasını önler. Her parça 2048 piksel sınırının altındadır; yükleme toplamı yaklaşık 8 MB'dır. Tam dünya dosyası native inceleme için üretilmeye devam eder; ana sahne dört parçayı doğal dünya boyutlarında yükler.

Bina ve arsa koordinatları, yollar, sur çevresi ve açık liman hattı değişmez. 0.121.0'ın altı yeni yapısı ve temas yerleşimi zaten ana daldadır. Yeni arazi üretimi, diğer yapıların yeniden çizimi, HUD ve mekanik değişikliği bu sürüme dahil değildir.

## Doğrulama

- `pnpm check`: tip denetimi, 374 test, ESLint ve CSS kontrolleri geçti.
- Son iki aşamalı keskinlik değişiminden sonra `node --import tsx --test` ile arazi, sur hattı ve arsa testleri yeniden çalıştırıldı: 11/11 geçti. Arazi testi her parçanın çözülen piksellerini ana dünyanın aynı bölgesiyle birebir karşılaştırır; dünya ölçüleri ve indirme bütçesi de sınanır.
- Pages taban yoluyla statik üretim derlemesi, V2 ölçütleri ve telefon görsel boyutu denetimi geçti.
- Derlenmiş aynı oyun CUA tarayıcısında 360/390/430×844 iframe telefon alanlarında açıldı: 28 yapı, arsa dışı taban noktası 0, yatay taşma 0. Sur 1, 5 ve 12 seviyeleri 390×844 alanında ayrıca açılıp incelendi. 12. seviye kuleye tuval üzerinden gerçek dokunuş sur müfettişini açtı; kapatma da çalıştı.
- Genel `layout-qa.cjs` bu yönetilen ortamda CUA dışı tarayıcı kontrolü gerektirdiği için çalıştırılmadı. Bütün alt ekranların yeniden tarandığı iddia edilmez. Büyük ekran HUD ölçeklendirmesi bu görsel işin kapsamında değildir.

Görsel kanıt: `docs/mockups/terrain-walls-0122-mobile.jpg`, gerçek 390×844 oyun ekranıdır; native kompozisyon değildir. Kaynak varlıklar mevcut depodan kullanıldı, bu sürümde imagegen çağrısı yapılmadı.
