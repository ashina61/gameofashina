# Arsa ve bina ölçüsü — 0.115.0 / SW140

19 Ekim kullanıcının “binalar ile boş karoları oturttur, ölçüsü düzeni” isteği. Boyalı şehirdeki boş alanlar önceki 256×128 elmasların dışına taşıyordu. Bunun sonucunda gerçek alfa konturu elmasa sığdırılan binalar boşlukta küçük kalıyordu.

24 normal kara arsası artık aynı 320×160 ölçülü, sekiz köşeli 2:1 sınırı kullanır. Bu sınır boyalı açıklıkların yuvarlatılmış omuzlarını izler. Mevcut kimlik sırası hesaplandıktan sonra yol/dere kenarındaki 1, 2, 7, 17, 20 ve 21 numaralı arsaların görsel merkezi 4–12 dünya pikseli düzeltilir. Kimlik, açılma sırası veya kayıtlı yerleşim taşınmaz. Belediye ile kıyı/ada arsalarının önceki ölçüsü korunur.

Bina görünür alfa kutusunun merkezi arsa merkezine oturur; her çokgen kenarındaki alfa desteğine göre tek uniform ölçek hesaplanır. Mimari, çatı ve gölge ile sınır arasında en az 3.2 dünya pikseli bırakılır. Görsel kırpılmaz, esnetilmez veya projektif bükülmez. Altına zemin dolgusu eklenmez. Boş arsa bayrağı, bina, inşa/taşıma çerçevesi, iskele ve dokunma alanı aynı `CityParcel` verisini kullanır.

## Kanıt ve kontroller

`tools/parcel-fit-review.cjs` ortak gerçek terrain ve runtime WebP'lerle aynı konumda boş/önce/yeni karşılaştırması, 24 kara arsa kataloğu ve tam şehir kompozisyonu üretir. Bunlar native görsel birleşimidir; tarayıcı veya oynanış ekranı değildir. `docs/mockups/parcel-fit/` altında saklanır. Önce sütunu SW139'un 256×128 elmas/tek ölçek formülünü yeniden üretir; yeni sütunu gerçek runtime fonksiyonunu çağırır.

- Çokgenler arasında ayrık eksen testiyle çakışma yoktur.
- Bütün bina türleri, seviyeler, tam/telefon boyları, ayna ve kıyı yönlerinde alfa sınır içinde kalır; oran korunur.
- Yürüyüş rotalarından bağımsız, boyalı yol/köprü üzerinden ölçülen dokuz noktada 12 dünya pikseli koridor yarıçapı arsa dışında kalır.
- Yeni dokunma alanı arsanın omuzlarını kapsar, sınır dışındaki dikdörtgen köşelerini kapsamaz.
- Kamera, HUD, ekonomi ve kayıt biçimi değişmez.

Genel görsel QA'nın önceki sürümde görülen ada ormanı boyutu ve profil/HUD hataları bu ölçü değişikliğinin kapsamında çözülmüş sayılmaz.

Yerel doğrulama: `pnpm check` 367/367 test, TypeScript, ESLint ve CSS kontrolleri; `node tools/v2-criteria.cjs`; `python tools/art/half-size.py --check`; GitHub Pages taban yoluyla statik üretim derlemesi başarılı. Gerçek sahnede alfa/poligon kontrolü üç telefon için mevcut görsel CI akışına eklendi.
