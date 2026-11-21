# Kayıt ve gezinme hata düzeltmeleri — 0.134.0

21 Kasım 2026 · SW159 · Android öncelikli derlenmiş oyun.

## Tekrarlanan sorunlar ve düzeltmeler

| Tetikleyici | Önce | Sonra |
| --- | --- | --- |
| Açık oturumda ileri tarihli yedek yükleme | Oturum saati kaydın gerisinde kalıyor; zaman ve işler ilerlemiyordu. | Saat yüklenen kaydın son görülen anından başlar, gerçek geçen süreyle ilerler. |
| İleri tarihli oturumdan eski yedeğe dönüş | Önceki oturumun ileri tarihi yeni yüklenen kayda taşınıyordu. | Yüklenen kaydın tarihi ve mevcut cihaz saati esas alınır. |
| Böyle bir oturumda yeni oyun | Yeni şehir eski saltanatın ileri saatini devralıyordu. | Tamamen yeni oyun mevcut cihaz saatinde kurulur. |
| Bina yönetimindeyken tarayıcı/Android geri olayı | Bina önizlemesi atlanıp şehir açılıyordu. | Önce kaynak ayrıntısı, sonra yönetim, ardından önizleme kapanır. Kalan katman için geri kaydı yeniden kurulur. |
| Uzun eğitim listesinin altından Gelişim’e geçiş | Önceki kaydırma korunuyor, yükseltme başlığının altına atlanıyordu; 390px denemede 671px konum korundu. | Bina veya sekme değişiminde içerik anında başa döner. Tersi yönde de geçerlidir. |
| Başlık ekranında desteklenmeyen yeni sürüm kaydı ve eski sağlam yedek | Açılış eski yedeği sunuyor; asıl yükleme daha yeni kaydı reddediyordu. | Açılış da güncelleme gereğini bildirir; ana kayıt ve yedek değiştirilmez. |

Saat yeniden kurulurken önceki oturumun uyarısı ve henüz tüketilmemiş yokluk özeti temizlenir. Başarısız dosya içe aktarımı mevcut kaydı ve saatini değiştirmez. Her kayıt için mevcut saat geri alma koruması sürer; oyun kuralı, ekonomi, süreler, kayıt şeması, arsa geometrisi ve sanat değiştirilmedi.

## Kanıt ve kapsam

0.133 statik çıktısındaki başlangıç denemesi altı senaryodan beşini başarısız buldu; bozuk dosya içe aktarımının kaydı koruduğu kontrol geçti. Sonuçlar [before.json](qa/session-0134/before.json). Daha yeni sürüm kaydının açılış testi de düzeltmeden önce başarısızdı.

Tarayıcı regresyon aracı `tools/session-bugs-qa.cjs`, gerçek Ayarlar → Kayıt dosya girişini, sıfırlama onayını, tarayıcı geri olayını ve bina sekmelerini kullanır. Gelecek/normal kayıtların bütün başlangıç tarihleri tutarlıdır. Son kontrolde ileri tarihli yedeğe gerçek inşa ve eğitim işleri de eklenmiştir; zamanla tamamlanmaları denetlenir. Gezinme 360/390/430×844 ekranlarda sınanır. Bu testler fiziksel telefonda sistem geri düğmesi kabulü değildir.

- 397 otomatik test, TypeScript, ESLint, CSS denetimi ve V2 bütçeleri geçti.
- Android statik dışa aktarımı ve telefon varlık hazırlığı tamamlandı. Bu, Java/R8 veya imzalı APK/AAB derlemesi değildir.
- Yeni 11 derlenmiş oyun senaryosu geçti: [after.json](qa/session-0134/after.json). İçe aktarılan ileri tarihli kayıtta inşa ve eğitim tamamlandı; iki yeni oyun yolu, geçersiz dosya ve üç genişlikte katmanlı geri/iki yönlü sekme kaydırması sınandı.
- Önceki bina yönetimi denetimi tekrar çalıştırıldı: 29 senaryo geçti; [management.json](qa/session-0134/management.json).
- Tam 360×740 arayüz taraması normal ve %130 yazıda geçti: taşma, kesik metin, küçük dokunma hedefi, minik yazı, çakışma, isimsiz kontrol ve sayfa hatası sıfır; [layout.json](qa/session-0134/layout.json).

Fiziksel Android, imzalı APK/AAB ve kullanıcı görsel kabulü açık kalır. Bu değişiklik inceleme dalındadır; üretim yayını yapılmadı.
