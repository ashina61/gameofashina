# Kahvehane — 0.74.0 / SW85

## 0.74.1 / SW86 ek kontrol

Son dal güncellemesi 2c5619d üzerine uygulandı: mevcut terrace.webp ve +/−/Maks. kontrolleri korunur. Üretim, seçilen ikram talebi farkı, yapı huzuru, barınma ve gerçek nüfus sınırı eklendi. 335 test, TypeScript, ESLint, strict CSS ve V2 ölçütleri yeniden geçti; Pages üretim derlemesi başarılı. 360/390/430×844 ve %130 yazı, açık/kahvesiz/kapalı/son seviye durumlarında iki sekme odaklı tarandı; Home ve klavye adımı mevcut tavern komutuyla doğrulandı. Son taramada altı düzen kategorisinde ihlal yok. Ekran kanıtları coffeehouse-review-{active,empty,off,development}.webp.

Bu ortamın Chromium Canvas renderer koşusunda şehir arka planında negatif arc yarıçapı hatası görüldü; genel çalışma zamanı denetimi tamamen temiz diye sunulmaz. Genel layout-qa önceki HUD/bina küçük-minik ve gizli dock uyarılarıyla exit 1 verdi. Değişiklik Kahvehane defteri ve ona ait stillerle sınırlıdır.

- 335 test, TypeScript, ESLint, strict CSS ve V2 ölçütleri başarılı.
- Chromium 360/390/430×844: İkram ekranında taşma, kesik, küçük/minik yazı, çakışma ve isimsiz kontrol yok.
- Native slider klavye adımı, +, −, Maks. ve sıfıra çekme gerçek mevcut tavern komutuyla doğrulandı: 2→3→4→5→4→0→1. Açık/kapalı metni ve gerçek değer güncellenir.
- İkram kapalı, kahve stoğu sıfır, son seviye ve henüz kurulmamış kayıtlar temiz. Boş stokta Kahve bekleniyor ve Kahveye ihtiyaç var; en yüksek seviyede max dock; kurulmamış binada eski Gelişim/İnşa ilk ekranı korunur.
- Açıklama, Gelişim ve yapı işlemleri odaklı taramada temiz. İlk Gelişim bloğu yükseltme; mevcut yükseltme başlatıldı ve aktif ilerleme görüntüsü kaydedildi.
- Tam boy ortak halk, aynı gerçek slider/düğme atlasları. HUD, şehir bina görseli, kayıt ve ekonomi motoru değişmedi. Kavramsal consumption değeri, ikram durunca Planlanan tüketim diye etiketlenir.
- Kanıtlar: docs/mockups/coffeehouse-{360,390,430}.webp, coffeehouse-off.webp, coffeehouse-empty.webp, coffeehouse-maxed.webp, coffeehouse-unbuilt.webp, coffeehouse-development.webp, coffeehouse-active.webp.

- Tam genel layout-qa 360×740 ve %130: exit 1. Eski HUD küçük/minik kayıtları ve diğer binaların dock çakışmaları sürüyor. Kahvehanede ana sekmede gizli Gelişim dock’unu ölçen eski kontrol canvas çakışması sayıyor; açık Gelişim’in odaklı taraması temiz. Genel kontrol tamamen yeşil diye raporlanmaz.

- Pages statik export başarılı. Yerel Turbopack restore cache hatası, eski .next önbelleği ayrı tutulup sıfırdan derlenerek giderildi.
