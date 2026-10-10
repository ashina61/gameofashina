# Halk ve şehir defterleri — 0.94.0 / SW106

10 Ekim 2026. MASTER-UI-STANDARD.md günceldir.

- İşgücü/Yaşam ve Yerleşimler/Nakliye/İdare ortak ceviz, parşömen, işlemeli altın köşeler, kırmızı ipek ve gerçek eğitim kontrol atlaslarını kullanır. Başlık Tinos Bold, gövde Georgia; yuvarlak geri/çarpı ortak malzemedir.
- 80px şehir meydanı/liman sahnesi mevcut resimlerle korunur. İkinci kaynak şeridi kaldırılır; onaylı HUD değişmez.
- İşgücü önce meslek seçimi ve atamayı gösterir. Halk yoklaması ve ada işleri aşağıdadır. Ortak kaydırıcı, Onayla/Geri al ve şeffaf tam boy halk/âlim figürleri görünür. Meslek kilidi gerçek bina şartını gösterir.
- Yaşam gerçek nüfus, barınma, huzur, büyüme ve ilgili yapı bağlantılarını sunar. Formüller değişmez.
- Şehirler dikey sicil, gerçek Divanhane resmi ve uzun şehir adı için satır kırılması kullanır. Nakliye formu, ikinci şehir gereksinimi, Liman kilidi ve seferdeki yükler aynı defterdedir.
- Koloni idaresinin başkent taşıma/terk etme onayları okunur ayrı uyarıdır; mevcut komutlar ve sonuçları korunur.
- Eski 19-civic.css kaldırılır. 71-population-register.css yalnız bp-population kapsamındadır; 47/50 ortak kontrollerine bu kapsam eklenir.
- Motor, ekonomi, kayıt, ada koordinatları ve dört ek ada açıklığı değişmez.

## Doğrulama

345 oyun testi, TypeScript, statik derleme, ESLint, CSS/kullanılmayan sınıf, V2 ve yarım boyut görsel kontrolleri. tools/population-qa.cjs gerçek mobil tarayıcıda 360/390/430px ve %130 yazıyı denetler. Normal, kilitli meslek/Liman, tek şehir, uzun adlı koloni ve seferdeki nakliye durumları; üç meslek, yaşam, şehirler, nakliye, idare ve onaylar kapsanır. İşçi ataması ve nakliye gönderimi gerçekten kayda uygulanır; şehir terk etme ve başkent taşıma onayları açılıp iptal edilir. 230 tarama temiz: taşma, kesilme, küçük hedef, minik yazı, çakışma, isimsiz kontrol, tarayıcı hatası ve eksik görsel yok. Rapor docs/population-qa-report.json; gerçek ekranlar docs/mockups/population-*.webp.

Genel düzen taramasının mevcut HUD küçük yazı/hedef bulguları ayrıca raporlanır; bu bölümün temiz kontrolü bütün oyun için temiz QA iddiası değildir.
