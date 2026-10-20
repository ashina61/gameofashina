# Şehri çevreleyen sur sistemi — 0.116.0 / SW141

20 Ekim kullanıcı isteği: karoların ve binaların uyumunu bozmadan surları şehrin etrafında toplamak; tek köşede kalan görüntüyü düzeltmek.

## Uygulanan değişiklik

Ana `ParcelCityScene` içinde `(570,50)` konumuna yerleştirilmiş, `760×475` boyuta zorlanan bağımsız `parcel-wall` görseli çıkarıldı. Bu görüntü şehrin çevresini hiçbir zaman sarmıyordu.

`lib/game/city-map/parcel-wall-ring.ts` 25 kara parselinin gerçek boyalı sınırlarından dışbükey çevreyi çıkarır ve 120 dünya pikseli dışarı taşır. 17 kırılma civarındaki gerçek parsel çevresi ile sur bandı arasındaki minimum açıklık 48 pikselden fazladır; hiçbir bina, boş arsa veya belediye merkezi değiştirilmez. Duvar panelleri ortak uç noktaları ve aynı harita koordinatlarını kullanır.

Gerçek boyalı yol ölçümlerinden beş kapı projekte edilir: kuzey ana yol, kuzeydoğu yokuşu, batı girişi ve iki liman inişi. Her kapıda 108 dünya piksellik fiziksel çizim boşluğu, iki ayrı burç ve yalnız üst seviyede kemer kirişi vardır; zemindeki yol kapanmaz. Uzun cephelerde burç tekrarı, üst yürüyüş yolu, taş derzleri, seviyeye bağlı sur yüksekliği vardır. Surlar inşa edilmemişse hayalet halka yerine yalnız kuzeyde inşaat izi gösterilir. Sur/kule/kapıya basılınca Surlar ekranı açılır; inşa sayacı korunur.

Sistem Phaser vektör çizimidir, yeni WebP çizimi **değildir**. Yeni kütle ve taş malzemeleri görüntü olarak ayrıca incelenmelidir; sanat yönetmenliği onayı sayılmaz.

## Korunanlar

- 24 eş kara arsası + sabit belediye, aynı çokgenler ve kayıt ID'leri.
- Orman, maden, geniş deniz, port/tersane/korsan ada noktaları.
- Zeminsiz `parcel-v1` kışla ve `parcel-v2` bina türleri; hiçbir bina kaidesi veya arazi yaması eklenmez.
- HUD, ekonomi, seviye sistemi ve şehir kamerası.

## Kontrol

`parcel-wall-ring.test.ts` arsa-poligon açıklığı, harita sınırı, kapı genişliği, kuzey yolunun kapıya denk gelişi ve surun yalnız kapılarda kesildiği durumları doğrular.

Kod GitHub dalında tutulur. Gerçek tarayıcı ekranı, mobil dokunma ve görsel kalite kontrolleri CI raporu alınıncaya kadar **onaylanmış sayılmaz**. Arka planın daha yüksek kaynak çözünürlüğü ve ayrı yeni sur illüstrasyonu bu düzenlemede üretilmedi; olduğundan farklı sunulmaz.
