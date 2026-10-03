# G5 — yol kenarı düzeltmesi ve oyun HUD yerleşimi

G4 onayı sonrası ilk iş olarak yol kenarı yerleşimi düzeltildi. Önceki
`98c34e8` görüntüleri `before/`, G5 görüntüleri `after/` altında; hepsi
390×844 ve WebP ≤200 KB. Oyun kuralı, ekonomi, kayıt ve slot koordinatları
aynı kaldı. Bu faz yeni çizim üretmez; onaylı G1–G4 görsellerini kullanır.

## Yol kenarı düzeltmesi

Bank, küp ve servi yerleşimi artık düğümler arasındaki düz çizgiden değil,
ekranda çizilen gerçek Bézier yolunun teğet/normalinden hesaplanır. İki
karşılıklı noktanın uzaklığı: yol yarı omuz genişliği + dekor taban yarıçapı
+ 18 dünya birimi pay. Yolun en geniş görsel kademesi hesaba katılır;
Divanhane yükselince dekor yol üstünde kalmaz. Çiftin bir tarafı arsa,
dere, meydan ya da başka yol tarafından engellenirse çiftin tamamı atlanır.

Bank genişliği başlangıç evinin yaklaşık 1/4'ü, küp grubu 1/6'sı.
Referans dünya genişliği 471,744; bank 117,936, küp 78,624 birim.
Servi yüksekliği iki katlı başlangıç konutunun tuval oranıyla sınırlı
(278,653 birim); sırada bir istasyonda karşılıklı iki servi var. Eski sık,
düz hat boyunca rastgele tek taraflı sıra kaldırıldı; sıklık azaldı.

Bütün boyalı dekorların tabanları yol, meydan ve rıhtım dışındadır.
Bina avlusundaki küçük dekorlar da aynı korumadan geçer. Yerleşim ve QA
kontrolleri arsa geometrisini değiştirmez. `terrain-review.cjs` gerçek
sahnedeki görünür dekorları denetler; ihlalde başarısız olur. Ayrıca her
sokak kenarı grubunun iki öğeden oluştuğunu kontrol eder. Hafif modda
çiftlerin yarısı birlikte gizlenir; iki taraf simetrik kalır. Bina avlusu
dekoru da yarıya iner. Büyümüş şehir/lite sayıları ayrıca otomatik karşılaştırılır. Son ölçüm: başlangıçta 139, büyümüş şehirde 249, hafif modda 125 görünür dekor; bütününde sıfır ihlal. Üç regresyon testi:
yol dışındaki merkezi fakat yola taşan taban, kıvrım/son nokta ve meydan bordürü.

| Kadraj | Önce | Sonra |
|---|---|---|
| Başlangıç şehri | [WebP](before/city-center-390x844.webp) | [WebP](after/city-center-390x844.webp) |
| Büyümüş şehir | [WebP](before/city-grown-390x844.webp) | [WebP](after/city-grown-390x844.webp) |
| Liman | [WebP](before/harbour-390x844.webp) | [WebP](after/harbour-390x844.webp) |

## G5 yerleşimi

Hükümdar arması ve Divanhane rozeti solda, şehir adı/ada ve kılıçla güç
sayısı yanında. Danışmanlar 42 px dairede; haber varsa pirinç çerçeve parlar.
Kaynaklar tek tek dokunulabilir kapsüller: üretim hızları kaynak defterinde,
her stok kapsülündeki + Çarşı/tüccar sayfasını açar. 360 px telefonda da
iki satırlı altı kapsül okunur; kaynak ikonları 24 px. Bütün kaynak ve +
hedefleri en az 44×44 px. Dolu ambar/konut kırmızı plaka ve ! ile korunur.

Sağda günlük ödül, haftalık olay (kalan gün), elçi mektubu ve raporlar var.
Boyalı madalyonlar, 34 px ikonlar ve haber noktaları kullanılır. Küçük
mektup glifi mevcut SVG olarak korunur. Sol sütunda her inşaatın küçük
bina resmi ve kalan süre/progress çubuğu; ayrıca eğitim, araştırma ve sefer.
Kartlar mevcut sayfalarını açar, hiçbir komut/maliyet değiştirilmedi.
Sancak, liman ve ortala araçları alt sola taşındı; görev şeridinin üstünde
kalır. İşgal uyarısı faaliyet kartlarını örtmez. Alt barın beş boyalı
sekmesi ve büyük Harita madalyonu korunur; seçili işaret altın yarım ay.

[İki inşaat + eğitim + sefer](after/activity-390x844.webp).
`g5-review.cjs` dört kartı, dört sağ düğmeyi, defter/tüccar navigasyonunu,
24 px ikonları ve dokunma alanlarını gerçek tarayıcıda doğrular.
`layout-qa.cjs` yeni iki sütunu da ölçer.

## Kontroller

Bölüm 6: TypeScript, 319 test, ESLint sıfır uyarı, CSS/unused CSS strict,
unused assets strict (0), half-size (31 dekor dahil), V2 ve statik export.
Layout: 360×740 ve %130 yazı; altı ihlal kategorisi ve sayfa hataları sıfır.
390×844 görsel QA: eksik görsel/sayfa hatası sıfır. Rehber: ilk sekiz hedef
4,4 oyun dakikasında tamam. PWA cache v33 ve testi birlikte güncellendi.
Telefon görsel envanteri G4 ile aynı: 13,433 MiB ≤15 MiB.

Ortam notu: tarayıcı indirme aynası erişilemedi; izole npm tarayıcı paketi
Chromium 138 + SwiftShader kullanıldı. Yerel QA çalıştırma ayarı depoya
konmadı. Testler tsx IPC kısıtlaması için `node --import tsx --test` ile
aynı dosyalarda çalıştırıldı. Yeni tarayıcı/CPU koşullarındaki açılış
ölçümü önceki G4 ortamıyla doğrudan performans karşılaştırması değildir.

G5 ayrı commit/push sonrası G6 birliklerine geçilir; onay durağı G6 sonunda.
