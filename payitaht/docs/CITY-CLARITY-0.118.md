# Şehir zeminini netleştirme — Payitaht 0.118.0 / SW143

## Gerçek oyunda yapılan işlem
Şehir sahnesi `ParcelCityScene`, `PARCEL_WORLD = 3172×1984` ile çalışır.
Önceki 0.117 işlemi `1586×992` kaynak resmini `2304×1441`
boyutuna büyütüyordu; Phaser bu dosyayı sahnede yeniden büyütüyordu.
Aradaki ikinci büyütme yol, kıyı, kaya, ağaç ve arsa sınırlarını
bulanıklaştırıyordu.

`tools/art/enhance-city-terrain.mjs` artık onaylı ana resimden
**doğrudan 3172×1984** boyutlu WebP üretir. Ölçüler `PARCEL_WORLD` ile
eşleşmezse üretim hata verir. Lanczos3 büyütme, kontrollü kenar
keskinleştirmesi, hafif kontrast ve yüksek kaliteli WebP uygulanır.
Oyun zaten `city-crisp.webp` dosyasını yüklemektedir; isim değişmedi.
`SW143` eski WebP önbelleğini yeniler.

## Değişmeyen kurallar
- Merkez binası, 24 eşit arsa, liman, tersane, korsan adası ve bütün
  bina kayıt kimlikleri/koordinatları aynı kalır.
- Zemin resmi kırpılmaz, yeniden çizilmez, döndürülmez veya kaydırılmaz.
  Bina görselleri ve şeffaflıkları olduğu gibi korunur.
- Kaynaktaki gerçek piksel ayrıntısı yapay olarak oluşturulmaz;
  bu **keskinlik ve ölçekleme** iyileştirmesidir, yeni 4K boyama değildir.

## Test
`city-terrain-enhance.test.ts` gerçek kaynak resmi işler,
çıkış boyutunun Phaser dünyasıyla birebir eşleştiğini ve aynı ölçüdeki
basit büyütmeye göre örneklenmiş kenar kontrastının yükseldiğini sınar.
CI sonucundan önce canlıya kabul edilmiş sayılmaz.
