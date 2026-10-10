# Hazinedarın defterleri — 0.93.0 / SW105

10 Ekim 2026. MASTER-UI-STANDARD.md günceldir.

- Hazine/Üretim/Ambar: aynı boyalı ceviz, parşömen, altın işlemeli köşeler ve kırmızı ipek. Sekmelerde gerçek akçe, sicil ve ambar resimleri; geri/çarpı aynı yuvarlak atlaslar. Başlık Tinos Bold, gövde Georgia.
- Kısa 80px sahne bu ekranın mevcut treasury-room.webp resmi; şehir adı canlı yazıdır. Büyük sahne/kurdele ve ikinci kaynak şeridi kaldırılır. Onaylı üst/alt HUD korunur.
- Hazine: stok ve net hız; muhasebede bakım giderleri netten tekrar düşülmez. İşgücü/yapı, dolu ambar ve azalan kahve bağlantıları korunur.
- Üretim: yedi kaynak iki sütunlu seçim, yatay şerit yok. Gerçek net hız, stok/ayrı kapasite, dolma/tükenme tahmini ve kaynaklara özel üretim açıklamaları. Destek sahneleri yerine okunur sayı sicili. Orman, maden, işgücü ve mevcut yapı bağlantıları korunur.
- Ambar: yedi kaynak dikey stok defteri, gerçek doluluk ve üretim bağlantısı. Ambar/Depo ve mevcut çevrimdışı üretim sınırı erişilebilir.
- 17 numaralı eski Hazine stili kaldırılır; 70-treasury-register.css yalnız Hazineye uygulanır. 47/50 ortak atlaslarına bp-treasury eklenir.
- Motor, komutlar, kayıt, ekonomik formüller, ada koordinatları ve dört ek ada açıklığı değişmez.

## Doğrulama

345 oyun testi, TypeScript/statik derleme, ESLint, CSS ve kullanılmayan sınıf kontrolü, V2 ölçütleri ve yarım boyut görsel kontrolü. Mobil rapor docs/treasury-qa-report.json; araç tools/treasury-qa.cjs. 360/390/430px, normal/boş/dolu stok ve %130 yazı; üç sekme ve bütün kaynak seçimleri. İşgücü, Ambar binası ve Ada ormanı bağlantıları gerçek tıklamayla sınanır. Gerçek ekran görüntüleri docs/mockups/treasury-*.webp.

Genel düzen taramasının mevcut HUD bulguları ayrı raporlanır; hedefli Hazine kontrolü bütün oyun için temiz QA iddiası değildir.
