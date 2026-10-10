# Ada doğrulaması — 0.86.0

- 345 motor testi geçti. TypeScript, sıfır uyarılı ESLint, CSS lint/kullanılmayan sınıf kontrolü, V2 ölçütleri, küçük bina/dekor görsel kontrolü ve temiz statik üretim derlemesi başarılı.
- Ana tur 87 ölçüm: 360/390/430 px, 360 px %130 yazı, boş kereste/Çarşı, en yüksek seviyeler, bağış eşiği, ambar, kahve/kristal/kükürt kaynakları, Lüks ambarı/tüccar/harika açılımları. Sayfa hatası yok. İlk turdaki dört işaret kutusundan iki komşu çift fazla yakındı; yerleşim koordinatları açıldı ve sancak boyu açıkça sınırlandı.
- Temiz derleme sonrası 36 ölçüm: 360/390/430 px, 740 px yükseklik, %130 yazı. Orman/maden üretim/gelişim, üç açılır defter ve harita işaretleri sıfır görünür ihlal. Kaynak başına sahne doğrulaması island-fit-qa-report.json içinde. Bu ek tur 430 px görünümde işaret yakınlığı buldu. Son harita düzeni, isim/isim ve bina/isim çakışmasını ve dört alanın ilk açılışta görünmesini ayrıca island-map-final-report.json ile üç genişlikte doğrular.
- Gerçek Onayla komutu oduncu ve madenciyi 2’den 3’e çıkardı. Her işletmenin 500 kereste bağışında gerçek stok 500 düştü. Eşiğe 250 kala 500 bağış seviyesi 1’den 2’ye çıkardı, sonraki seviyede 250 kaldı. Tüccardan 50 kahve alımı gerçek stoğa 50 ekledi.
- Ada kamerasının büyütme/sıfırlama eylemi denendi. 16 ada seçeneğinin her birinde tam dört ayrı ek boş yerleşim işareti mevcut. Şehir içi arsa listesi ve kayıt şeması aynı.
- Genel tools/layout-qa.cjs iki tur tamamlandı: taşma 0, kesik 0, küçük 322, minik 669, çakışma 70, isimsiz 0, sayfa hatası 0. Eski HUD/diğer ekran uyarıları korunur; oyun genelinin bütünü sıfır sorun diye raporlanmaz. Ana kapsamın odaklı ölçümleri ayrı dosyalardadır.

Ekonomi, üretim/bağış komutları, süreler, kayıt ve HUD değiştirilmedi. Kullanıcının ayrıca yetkilendirdiği ada hedef koordinatları yeni araziye taşındı; dört boş açıklık görsel rezervdir, yeni kolonileşme mekaniği değildir.

Son gerçek üretim çıktısında 360/390/430×740 harita: tam dört alan ilk açılışta görünür; isim/isim ve bina/isim çakışması 0. Görsellerin çözülmesi ve ağın durulması beklenerek ekran resmi alındı. Harika, kasaba ve rakip simgeleri kompakt ortak boyutta; ayrıntı zoom ile büyür. island-map-final-report.json injected=false.
