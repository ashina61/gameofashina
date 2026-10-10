# Ada, orman ve maden — 0.86.0 / SW98

Adem'in 10 Ekim düzeltmesi: dört ek boşluk ormanda değil, **adanın genel yerleşiminde**. Ada tasarımını orman/maden sayfalarından ayrı bir kapsam olarak yeniden kur. Şehir içindeki 23 arsa ve deniz yuvaları bu talep değildir.

Yeni `settlement-map-v2.webp`: geniş doğal teraslar, kıvrımlı kireçtaşı yollar, zeytin/servi, kayalık yükselti ve turkuaz kıyı. Mevcut şehir/maden/orman/NPC/rakip yerleri `island-layout.json` içinde yeni araziye yerleşir. `reserved` tam dört boş açıklıktır; buralara bina/NPC konmaz. Küçük canlı sancak/numara işaretleri resme gömülmez. Yeni kolonileşme, çok oyunculu kapasite veya kayıt şeması eklenmez.

16 ada, aynı okunabilir oyun arazisini kullanır; ad/kaynak/harika/NPC/rakip verileri seçilen adadan gelir. Dünya haritasındaki 16 ayrı silüet korunur. Harita ilk açılışta iki eksende alana sığar (fitContain); dört açıklık küçük telefonda da görünür. Harita kamerası yalnız ada alanını büyütür; üst/alt HUD aynı kalır. Harita üstünde kısa isimler, tam erişilebilir düğme isimleri ve mevcut hedef panelleri vardır.

Orman ve maden `island-register.tsx`: onaylı gerçek ceviz/parşömen/pirinç atlasları, kırmızı ipek sekme/ana eylem, ayrı 80 px orman, taş ocağı, kahve hasadı, kristal ve kükürt sahneleri, yuvarlak geri/çarpı ve işçi kontrolleri. Üretim: görevli/kapasite, gerçek şehir çarpanlı üretim, stok/kapasite, ambar dolu uyarısı ve mevcut Onayla/Geri al ataması. Gelişim: bağış ilk blok; toplanan ve eksik gerçek kereste, araştırmayı içeren sonraki kapasite, bağış miktarı/engeli ve en yüksek seviye. Eşik üstü bağış bir sonraki seviyeye gider, son seviyede fazla kereste döner.

Madende Lüks ambarı, Çarşı tüccarı ve Adanın harikası açılır defterlerdir; önceki eylemler erişilebilir. Tüccar gerçek işlem limiti ve akçe bedelini gösterir. Harika önceki TemplePanel komutlarını kullanır. Kapasite/bağış ekonomisi ve komutlar değiştirilmez.

Çizim/prompt kaydı: `island-art.json`. Gerçek ekranlar `mockups/island-*.webp`; doğrulama `ISLAND-VALIDATION.md` ve `island-qa-report.json`. Bu bölüm yayınlandıktan sonra Adem'in değerlendirmesinde dur.
