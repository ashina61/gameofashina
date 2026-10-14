# Kışla kamera ve görünen mimari yerleşimi — 0.109.3 / SW128

15 Ekim 2026. Kullanıcı 0.109.2 kışlasının hâlâ uyumsuz olduğunu bildirdi ve işi bitirmeyi istedi. Opak plaka kaldırmak ve şeffaf tuvali bir dikdörtgen olarak sığdırmak tek başına yeterli değildi.

## Değişiklik

Kışla gerçek şehir parseli üzerinde yeniden tasarlandı: alçak dört taş gözetleme bloğu, arkada yatay iki koğuş, üstten görünen giriş çatısında büyük askerî arma ve talim avlusu. Önceki yüksek ön cepheli kale çizimi kullanılmaz. Aynı arka plan üstündeki yeni denemeden mimari ayrı alfa sprite olarak üretildi. Dış zemin ve avlu zemini özgün şehirden gelir. WebP tam/telefon boyları 1280×751 ve 640×376, her biri 200 KB altında; alfa 80 kaliteyle kodlanır.

master-cutout-bounds.json iki son WebP'nin gerçek alfa sınırlarından çıkarılan normalize dışbükey zarfları kaydeder. masterCutoutFrame şeffaf tuvali değil görünen pikselleri sığdırır, tek uniform ölçek kullanır; en alt görünen nokta kaldırımın iç kenarından 1.5 dünya pikseli içeride tutulur. Görsel yamultulmaz veya mimari kırpılmaz. Aynalanmış görünümün sınırı da aynı dönüşümle hesaplanır. İç zemini karo doldurur; mimariye görünmez köşe boşlukları nedeniyle ilave küçültme uygulanmaz.

Şehir resmindeki sabit ön taş dekorun kapıyı tıkaması, aynı yerel sokaktan örneklenen küçük paving approach ile giderilir. Yaklaşım yalnız parsel içinde yer katmanında çizilir; dış yol ve kaldırım koordinatları değişmez. Mimari, yaklaşımın üst katmanındadır. Motor, kayıt, yerleşim indeksleri, seviyeler, maliyetler ve HUD aynı kalır. Diğer bina türlerinin çizimleri bu sürümün kapsamı değildir.

## Kontrol

pnpm check: 355 test, tip, ESLint ve CSS geçti. Yeni kontur yolu her tam/telefon dosyasında her görünür alfa satırının kenarlarını bütün 29 parsel şekli ve iki yön için ölçer: bütün görünen pikseller iç poligonda, en-boy oranı değişmiyor ve ön kenar hizası sabit. Statik Pages export üretildi. Yakın ve uzak gerçek Phaser/DPR2 şehir görüntüleri incelendi. 360/390/430 px runtime senaryoları, inşa iskelesi ve eksik dosya/sayfa hatası kontrolü uygulanır. Genel HUD denetimindeki eski küçük hedef/minik yazı uyarıları bu görsel çalışma ile çözülmüş sayılmaz.

## Üretim tarifi

Gerçek karo crop'u kamera/yerleşim referansı; yüksek hava bakışı, geniş ve sığ yamuğa göre düşük taş cepheler, büyük görünen kule döşemeleri, arkada yatay koğuş çatıları, girişin yatay çatısında bronz kalkan/kılıç, bordo askerî sancaklar. İlk aşama gerçek zemin üzerinde; ikinci aşama yalnız mimari alfa ayrımı. Özel toprak plakası, bahçe bordürü, dış kaldırım, yol ve insan eklenmez.
