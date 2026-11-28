# Web nakliye — 0.140.0

Nakliye formu kuşatma ve sefer hakkı kontrolünü atlıyordu; gönderimden sonra hata veriyordu. Hedef değişmişse eski seçim de etkin görünebiliyordu. Form ve komut artık salt okunur shipmentReason kullanır. Geçerli yükte gereken gemi sayısı ve komutla ortak yolculuk süresi görünür. Liman açıklamaları açılır ayrıntıya taşındı.

405 test ve statik web derlemesi geçti. 360/390/430×740 tarayıcı denemesinde gönderim düğmesi ilk görünümde ve en az 44px; fazla yük reddedildi; gerçek gönderim kayıtlı nakliye oluşturdu. Sayfa hatası yok. Görsel ve rapor docs/qa/cargo-0140 içinde. Kayıt şeması, taşıma fiyatları ve ekonomi kuralları değişmedi. Android kapsam dışı.
