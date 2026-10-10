# Divanhane ve Elçilik — 0.92.0 / SW104

10 Ekim 2026. MASTER-UI-STANDARD.md günceldir; eski MANAGEMENT-DESIGN.md içindeki sabit alt yükseltme, büyük kimlik alanı ve iki sütunlu meslek şeridi bu sürümle değişir.

- Divanhane: Şehir, Halk, İdare, Gelişim. Şehirde önce mevcut İşgücü ekranının bağlantısı; gerçek yoklama, alt alta altı meslek ve nişan seçimi. Halkta nüfus/barınma/huzur; İdarede hazine muhasebesi, şehir adı ve mevcut yönetim seçenekleri korunur.
- Elçilik: Hariciye, Casuslar, Gelişim. Hariciye mevcut mektup ve birlik ekranlarına gider; şehirdeki casus sayısı, kapasite, bonus ve yabancı casus yakalama oranı motor fonksiyonlarından okunur. Casuslar aynı kışla portresi/adet/eğitim ve üretim sırası atlasını kullanır. Yabancı casus defteri ve Gizli Sığınak bağlantısı erişilebilir kalır.
- İki yapıda yükseltme Gelişim'in ilk bloğu; açıklama/yön/taşıma/yıkma işlemleri açılır Yapı bilgisi ve düzenleme alanındadır. Divanhane sabit yapı olduğundan yalnız mevcut yön işlemi vardır.
- Gerçek boyalı kışla/Medrese atlasları: 47/50 numaralı stillere bp-civic-register, 49 numaralı eğitime Elçilik eklenir. 69-civic-register.css yalnız bu ikilinin akışını düzenler. Sekmeler iki sütunda; Elçilik Gelişim satırı tam genişlik. Eski 29 numaralı yönetim stilinin yükseltme başlığını gizleyen ve düğmeyi değiştiren kuralları kaldırılır.
- Sahne üretimi tekrarlanmadı: bu yapılar için daha önce üretilmiş civic-square.webp ve envoy-scene.webp aynı yapıda kullanılır. Başka bir binanın sahnesi kopyalanmaz. Mesleklerde boyalı tam boy insanlar; madenci için meslek üniforması iddiası taşımayan ortak halk figürü kullanılır. Net akçe Avrupa tacı yerine gerçek akçe simgesidir.
- Oyun motoru, hesaplar, komutlar, kayıt biçimi, HUD, ada koordinatları ve dört ek yerleşim açıklığı değiştirilmez.

## Doğrulama

345 oyun testi; TypeScript, ESLint, CSS kullanılmayan sınıf kontrolü, V2 ölçütleri, yarım boyut görsel kontrolü ve statik derleme. 58 durum/eylem ölçümü ve Elçilik başlık malzemesi düzeltmesinden sonra 17 tekrar ölçümü: toplam 75 hedefli tarama, sıfır bulgu ve sıfır tarayıcı hatası. Rapor docs/civic-qa-report.json; gerçek mobil görüntüler docs/mockups/civic-*.webp. 360/390/430px ve %130 yazı; tüm sekmeler, açılır yapı bilgisi, boş kaynak, süren inşaat/eğitim, son seviye ve kurulmamış Elçilik. Nişan seçimi, şehir adını değiştirme, İşgücü bağlantısı, gerçek yükseltme ve iki casusun eğitim sırasına girmesi ayrıca doğrulanır.

Genel taramanın onaylı HUD için mevcut küçük hedef/yazı uyarıları gizlenmez.

Genel tarama: taşma 0, kesik 0, küçük 312, minik 665, çakışma 0, isimsiz 0; tarayıcı hatası 0. Genel tarama mevcut onaylı HUD küçük hedef/yazı uyarıları nedeniyle sıfır çıkış kodu vermez. Hedefli Divanhane/Elçilik taramaları temizdir.
