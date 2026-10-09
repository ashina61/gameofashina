# Konut — 0.72.0 / SW83

- 335 test geçti; TypeScript, ESLint, strict CSS, V2 ölçütleri başarılı.
- Gerçek Chromium 360/390/430×844: Mahallede taşma, kesik, küçük/minik yazı, çakışma ve isimsiz kontrol kaydı yok.
- 390px açılır açıklama, Gelişim ve yapı işlemleri aynı altı tarama kategorisinde temiz. İlk Gelişim bloğu yükseltme gereksinimleri olarak doğrulandı.
- Halk ve iş gücü geçişi, Hamamın mevcut şehir incelemesini açma ve Konut yükseltmesini başlatma başarılı. Aktif yükseltme ekranı kaydedildi.
- Tam boy halk ortak citizen-figure.webp; sahne yazısız, HTML başlık/sayılar ayrı; HUD ve ekonomi motoru değişmedi.
- Görüntüler: docs/mockups/housing-{360,390,430}.webp, housing-development.webp ve housing-active.webp.

- Tam genel layout-qa 360×740 ve %130: exit 1; eski HUD küçük/minik kontrolleri ve diğer binaların alt menüyle dock çakışma kayıtları sürüyor. Konut ve Medrese için ana sekmede gizli Gelişim dock’unu zorla ölçen eski kontrol canvas çakışması sayıyor; açık Gelişim sekmesinin odaklı kontrolü sıfır çakışma. Konutun odaklı Mahalle/Gelişim/işlemler taraması temiz; genel kontrol tamamen yeşil diye raporlanmaz.
