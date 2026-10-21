# Osmanlı binaları ve arsa merkezleri — 21 Ekim 2026

Kullanıcının isteği: binaları mevcut boş karoların tam merkezine oturtmak ve Osmanlı havasında yeniden çizmek. Çalışma `codex/ottoman-parcel-centering-20261021` inceleme dalındadır. Ana dal ve canlı yayın değiştirilmemiştir; görsel kabul kullanıcı değerlendirmesindedir.

## Uygulanan değişiklik

36 bina türü için 38 yeni gerçek alfa görseli üretildi; liman ve tersanenin düz yönleri ayrıdır. Tam/küçük boyutlarla 76 WebP dosyası `public/images/game/buildings/ottoman-v3/` altındadır. Belediye Topkapı Sarayı'nın çift kuleli girişinden ve Divan mimarisinden esinlenir. Kışla, medrese, hamam, çarşı, depo, konut ve üretim yapıları ortak krem taş, kiremit, ahşap ve kurşun kubbe malzemeleriyle çizildi. Avlu ve eşya araları şehir zeminini gösterir; ayrı arsa dolgusu eklenmez.

`ottoman-art.json` her görselin zemine ilişkin referans merkezini tutar. Yerleşim, resmin şeffaf tuvaline veya çatı dahil dış kutusuna göre değil bu noktaya göre hesaplanır. Aynalama sırasında referans noktası da aynalanır. Gerçek alfa konturunun tamamı, aynı tek oranla, değişmeyen arsa poligonu içinde 3,2 dünya pikseli açıklıkla tutulur. Belediye/kıyı elmaslarında eski tek tarafa dayalı yerleşimin yerine de merkezli çözüm kullanılır. Kırpma, eksenleri ayrı ölçekleme veya zemin yaması yapılmaz.

Arsa merkezleri, sıraları, kimlikleri, poligonları, yollar, arazi, surlar, HUD, ekonomi ve kayıt biçimi değişmez. Bir türün mevcut seviyeleri bu yeni ortak çizimi kullanır; beş ayrı seviye büyüme görseli üretilmiş değildir.

## Üretim ve kanıtlar

- Üretici: yerleşik imagegen. İstemlerin tamamı ve kaynak SHA-256 kayıtları: `ottoman-v3-generation.json`.
- Native birleşimler: `mockups/ottoman-centering/empty-before-after.webp`, `catalogue-native.webp`, `city-native-1.webp`, `city-native-2.webp`. Bunlar gerçek varlıklarla üretilmiş birleşimlerdir; tarayıcı ekranı değildir.
- Gerçek ana oyun ekranları ve ölçümleri: `mockups/ottoman-centering/browser/`. Statik yayın derlemesi üzerinde 360/390/430/1536 px, iki katalog grubu, farklı aynalama ve üç kıyı yönü sınanır. 36 türün tamamı sahneye yüklenir ve ölçülür; 8 durumda sınır dışına çıkma 0, tanımlanan zemin merkezinin arsa merkezinden sapması 0, sayfa hatası 0, eksik istek 0.
- 38 küçük görselin toplamı 1.351.426 bayt; tam boyutların toplamı 4.676.284 bayt. Her tam görsel 200 KiB altındadır. Bu, kurulu şehirde hepsinin birden indirileceği anlamına gelmez; mevcut tembel yükleme korunur.

## Doğrulama sınırı

375/375 birim testi, tip, ESLint, CSS, statik yayın derlemesi ve V2 ölçütleri geçti. Genel `layout-qa.cjs` de çalıştırılmıştır; değişmeyen onaylı HUD'un küçük hedef/yazı bulguları nedeniyle genel çıkışı 1'dir. Bu sınırlama daha önce `FINAL-VISUAL-AUDIT.md` ve `MASTER-MAP-ADAPTATION.md` içinde kayıtlıdır. HUD dosyaları bu çalışmada değiştirilmemiştir; sonuç bütünüyle temiz genel arayüz onayı olarak sunulmaz. Yeni bina geometrisinin kabulü ile arayüzün bu eski sınırlaması ayrı değerlendirilir.

Görsel inceleme, her türün tanınabilirliği ve şehirdeki arsa doluluğu için kullanıcı değerlendirmesi gerekir. Henüz canlı sürüm veya yeni büyüme kademeleri olarak adlandırılmaz.
