# Binaların kendi zemini yok — 0.111.1 / SW132

16 Ekim 2026. Kullanıcı bina görsellerinin kendi zemini olmaması gerektiğini belirtti. Bu talep önceki ortak arsa dolgusu tarifini değiştirir.

Kışla, medrese, depo, çarşı ve hamam `master-v9` görsellerinde sadece mimari, yapısal basamak/teras ve işlevsel eşyalar kalır. Avlu toprağı, düz dış döşeme, yükleme alanı ve tezgâh aralarının zemini gerçek alfadır. `MasterCityScene` bu yapıların altına ayrıca zemin çizmez; `MASTER_PARCEL_GROUND` yüklemesi, dolgu mesh'i ve opak alt boya kaldırıldı. Şeffaf yerlerde özgün şehir tabanı görünür. Arka plan resmi değiştirilmedi.

Yerleşik imagegen ile beş master-v8 sprite ayrı ayrı düzenlendi. İstem: mimariyi, kamera açısını, renkleri ve eşyaların konumunu koru; hem dış arkaplanı hem kapalı avlunun içindeki bütün toprak/düz zemin yüzeylerini ve eşya aralarını gerçek alfaya çevir; başka renk/zemin/platform ekleme. Paketleme aynı uniform ölçek ve son WebP alfa konturu yöntemini kullanır.

Diğer 31 tür bu revizyonda yeniden üretilmedi. Oyun kaydı, mekanik, HUD, mevcut arsa kimlikleri ve inşa akışı korunur.

Kontroller: `pnpm check`; son alfa piksel konturlarının arsa içinde kalması ve oran korunumu; `five-building-canvas-qa.cjs` ile iç alfa alanlarında alttaki haritanın piksellerinin değişmemesi; gerçek ana oyunda 360/390/430 genişlikleri, çevirme, kışlaya dokunma ve yeni inşaatın doku yüklemesi. Bu revizyonda ayrı avlu katmanı sayısı sıfır olmalıdır. Kanıtlar `docs/mockups/groundless-buildings/` altında; native önizleme ile gerçek tarayıcı görüntüleri ayrı adlandırılır.

Sonuç: 358 test, TypeScript, ESLint ve CSS kontrolleri geçti. Statik üretim başarılı. Native kontrolde beş türde 17.690 açık zemin örneğinde harita pikseli değişmedi. Ana oyun 360/390/430 genişlikte (390 aynalı), kışla seçimi ve yeni inşa dokusu kontrolünden geçti; ayrı zemin katmanı, arsa taşması, eksik istek ve sayfa hatası sıfır. `v2-criteria`, yarım boy asset kontrolü ve `git diff --check` geçti.
