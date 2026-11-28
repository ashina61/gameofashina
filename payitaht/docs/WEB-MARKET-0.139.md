# Sitede pazar gözlemi — 0.139.0

Kullanıcının 27 Kasım talebiyle Android işleri bu turda kapsam dışıdır.

## Gözlenen sorunlar

390×740 görünümünde ilk ekran büyük sahne, iki sıra alt sekme ve açıklamalarla doluydu; teklifler görünmüyordu. Satış teklifleri 1.5, 3.2, 3.4… şeklinde düşükten yükseğe sıralanıyordu. Para/mal/liman/gemi eksikliği tıklamadan önce açıklanmıyordu. Adil fiyatla eşit satış yanlışlıkla kötü fiyat rengi alıyordu.

## Düzeltme

- Sahne Ticaret Merkezi Gelişim bölümünde, yükseltme kontrolünden sonra görünür. Çarşı sahnesi korunur.
- Dört alt bölüm kısa, en az 44px düğmelerle aynı sıradadır. Açıklamalar tekliflerden sonra açılır.
- Teklifin malı, birim fiyatı ve toplam akçe bedelli eylemi aynı kısa karttadır.
- Satın alma ucuzdan, satış yüksek birim fiyattan sıralanır; eşitlikte kısa yol öne geçer.
- Salt okunur offerReason önizlemesi ile acceptOffer aynı koşulları kullanır. Yetersizlik nedeni görünür ve düğmeye erişilebilir açıklamayla bağlıdır.
- Kayıt şeması, ekonomi oranları, teslimat süresi ve fiyat üretimi değişmez.

## Doğrulama

402 motor/kayıt testi; 360/390/430×740 telefonlarda ilk teklif eyleminin görünmesi, her iki yönde sıralama, gerçek satın almanın kayıtlı teslimat oluşturması. Normal ve %130 metinde ortak yerleşim taraması. Kanıtlar docs/qa/market-0139 ve CI market takımındadır. İlk test verisi üretim kayıt okuyucusundan geçirilir; bozuk yapay kayıtla yanlışlıkla yeni oyunu sınamaz.
