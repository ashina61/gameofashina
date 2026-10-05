# Halk, Şehirler ve geniş ortak düzen — 0.53.0 / SW50

5 Ekim 2026. Kullanıcı oyunu dar buldu ve eski tema, assetler, UI/UX için tam değişim yetkisi verdi. Ortak Osmanlı–Ege sanat dili devam eder.

- Tam sayfada büyük HUD yerine 44px kaynak şeridi; 64px alt menü. İçerik sınırı 560px yerine 960px, kalın dış/iç defter çerçeveleri kaldırıldı.
- 390×844 telefonda sayfa içeriği 100–780px arasında, 680px yükseklik. 360×740 ve %130 yazıda 100–676px, 576px. Güvenli alanlar ayrıca eklenir.
- Halk: boyalı çarşı sahnesi, İşgücü/Yaşam, üç meslek seçimi, motorun üretim önizlemesi, taslak/onay/geri al, barınma-huzur ilişkisi ve bina/ada işi bağlantıları.
- Şehirler: boyalı ada limanı, Yerleşimler/Nakliye/İdare, şehir değiştirme, ortak gemilerin gerçek yük sınırı ve stok sınırı, denizdeki yükler, başkent/terk etme işlemleri ve açık onay.
- İki şehirli, mevcut motorla ayrıştırılmış kayıt: işçi değişikliği ve 100 kereste nakliyesi kayda işlendi; koloni işlem onayları iptal edilerek şehir korundu. Kaynak şeridi Hazineyi açar; sayfa kapanınca şehir HUD'u geri gelir.
- Normal 390×844 ve %130 yazıyla 360×740: bütün yeni sekmeler ve işlem onayları, taşma/kesik/küçük hedef/çakışma/isimsiz kontrolünden geçti. `qa-checks.json` ayrıntıları.
- Ortak düzen ayrıca bütün sayfa ve bina ekranlarında normal/%130 mobil turuyla denetlenir. 328 oyun testi, tip/lint/CSS ve V2 ölçütleri.

Görsellerde yazı ve arayüz yok. Üretim tarifleri `tools/art/prompts/town-square.md` ve `island-harbour.md`; görseller ImageGen, önceki hazine resmi sanat dili referansı. Tüm değerler ve işlemler koddan gelir.

Yayın sonrası kullanıcı değerlendirmesinde durulur. Sonraki bölüm Vezir/Elçi/ittifak.
