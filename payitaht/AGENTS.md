<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Payitaht Adaları — ajanlar için

**9 Ekim maliyet yapıları — 0.77.0 / SW89:** docs/COST-DESIGN-MEMORY.md; beş atölyede ortak Tasarruf/Gelişim. Örnekler gerçek motor bedelleri, Mimar araştırması ve Mutfak/Top Dökümü çarpanları doğru gösterilir. Sonraki bölüm Çarşı/Ticaret Merkezi; yayın sonrası kullanıcı değerlendirmesinde dur.

**9 Ekim üretim yapıları — 0.76.0 / SW88:** `docs/PRODUCTION-DESIGN-MEMORY.md`; Kereste Ocağı, Ormancı Evi, Kahve Fidanlığı, Taşçı, Camcı ve Simyahane ortak Üretim/Gelişim defterlerinde. Kereste ataması mevcut workers komutuyla; yapı yüzdesi/toplam üretim ayrı, ada kaynağı uyuşmazlığı açık. Sonraki bölüm maliyet azaltma yapıları; bu bölüm yayınından sonra kullanıcı değerlendirmesinde dur.

**9 Ekim Ambar/Depo — 0.75.0 / SW87:** `docs/STORAGE-DESIGN-MEMORY.md`; ortak Stoklar/Gelişim, yedi mal dikey defterde, her malın ayrı kapasitesi ve koruması. İlim yağmalanmaz. Yükseltme ilk Gelişim bloğu; motor/HUD aynı. Sonraki Kereste ve kaynak üretim yapıları.

**9 Ekim Kahvehane — 0.74.1 / SW86:** `docs/COFFEEHOUSE-DESIGN-MEMORY.md`; İkram/Gelişim aynı ortak atlaslar. İkram barı +/−/Maks. ile mevcut anlık tavern komutunu kullanır. Kahve stoğu/tüketim/huzur birlikte, tam boy ortak halk. Sonraki Ambar/Depo.

**9 Ekim Hamam — 0.73.0 / SW84:** `docs/BATHHOUSE-DESIGN-MEMORY.md`; aynı ortak atlaslar, tam boy halk, Halkın huzuru/Gelişim. Hamam katkısı ile toplam huzur ayrı, barınma sınırı görünür. Yükseltme ilk Gelişim bloğu. Sonraki bina Kahvehane.

**9 Ekim Konut — 0.72.0 / SW83:** `docs/HOUSING-DESIGN-MEMORY.md` geçerlidir; ortak kışla/Medrese atlasları, tam boy halk, Mahalle/Gelişim. Yükseltme önce. Sonraki bölüm Hamam; her bina bitince canlı yayın ve kullanıcı değerlendirmesinde dur.

**Son kullanıcı düzeltmesi — 0.71.1 / SW82:** Halk ve âlim rol alanlarında portre kullanılmaz. Ortak `citizen-figure.webp` ve `scholar-figure.webp` şeffaf, tam boy insan figürleridir; baştan ayağa görünür, portre çerçevesi yoktur. HUD danışman rozetleri ayrı navigasyon görselleridir, asker portre standardı korunur.

**9 Ekim 0.71.0 / SW81 düzeltmesi:** Halk ve âlim ortak `ui/people/` portreleri; ilim/süre ortak yeni WebP. Bina detaylarında yapı/seviye önizlemeleri ve üst bilgi düğmeleri kaldırıldı; yön/taşı/yık Gelişim'de. Yükseltme başlığı ortalı, Onayla/Geri al eşit. Kristal deneyleri gerçek harcama/kazanımı, Âlimin önerisi güncel duruma göre uygun araştırmayı anlatır. `docs/MEDRESE-DESIGN-MEMORY.md` başındaki son kurallar eski avlu tariflerini değiştirir.

**8 Ekim son genel onay:** Kullanıcı kışlanın 0.69.0 son halini oyunun tasarım standardı kabul etti. Yeni sayfalarda önce `docs/MASTER-UI-STANDARD.md`; Medrese/araştırma için `docs/MEDRESE-DESIGN-MEMORY.md` okunur. Mekanik/HUD korunur, Gelişim’de eylem önce gelir.

- **Güncel sıra:** Kullanıcının 5 Ekim ‘oyunun geneline sırayla başla’ talebiyle ortak onaylı dil kalan ekranlara uygulanır. İlk bölüm Vezir, 0.57.0 / SW54; Gündem, Şehirler, Haberler. Kullanıcının sonraki ‘devam’ talebiyle Elçi/İttifak 0.58.0 / SW55. Kullanıcının 6 Ekim devam talebiyle Divanhane/Elçilik 0.59.0 / SW56: yönetim ve casusluk ayrı defterler, resimli şehir meydanı. Sonraki bölüm Saray/Valilik, ardından üretim ve askerî yapılar. Bir bölüm tamamlanınca yayın ve gerçek ekran görüntüleriyle kullanıcı değerlendirmesinde dur.

- **En son onaylanan Profil/Ayarlar dili:** `docs/PROFILE-SETTINGS-DESIGN.md`, `docs/mockups/approved-profile.webp` ve `docs/mockups/approved-settings.webp`. Kullanıcının 5 Ekim talebiyle bütün alt sekmeler 0.55.0 / v52 olarak bu dile geçirildi. Kullanıcının SVG temizleme talebiyle Sancaktar odası 0.56.0 / v53: gerçek kumaş ve sırma arma görselleri, docs/SANCAKTAR-ART.md. Bu bölümün yayınından sonra kullanıcı değerlendirmesinde dur.

- **Önceki tasarım hafızası:** `docs/tasarim-dili.md`. Kullanıcının 4 Ekim 23:15 talebiyle yeni sayfa yenilemeleri bu dil ve basitten zora bölüm sırasıyla ilerler. Bir bölüm bitince canlıya al, kullanıcı değerlendirmesinde dur. Görevler v46 sonrasında kullanıcı 5 Ekim «tamam geç sıradakine» dedi. Günlük/sürüm arşivi v47 sonrasında kullanıcı «geç; cilalama değil düşün ve tasarla» dedi. Üçüncü bölüm saray/profil ve idare/ayarlar v48 olarak yeniden kurgulandı. Kullanıcı üçüncü bölümden sonra «uzman oyun tasarımcısı gibi düşünerek devam et» dedi. Dördüncü bölüm Hazinedarın defteri v49 / 0.52.0: Hazine, Üretim ve Ambar. Kullanıcı oyunu dar buldu ve bütün UI/UX/assetleri değiştirme yetkisiyle devam istedi. Beşinci bölüm Halk/Şehirler ve geniş ortak düzen v50 / 0.53.0: kısa kaynak şeridi, 64px alt menü, 960px içerik; İşgücü/Yaşam ve Yerleşimler/Nakliye/İdare. Yayın sonrası kullanıcı değerlendirmesinde dur; sonraki bölüm Vezir/Elçi/ittifak.

- Görsel yenileme işi: `docs/gorsel-brifi.md` (fazlar, sanat kılavuzu, kontroller). Oradaki sırayla ilerle; G0, G2, G4 ve G6'dan sonra onay bekle.
- Görsel brif 2 (mockup moduna geçiş): `docs/gorsel-brifi-2.md` — H1, H2 tamam; H3 (5 aşamalı şehir tabanı, alt-resimler `docs/mockups/taban/`) sonrası onay bekle. Hedef mockup'lar `docs/mockups/`.
- Genel plan ve durum: `docs/v2-plani.md`.
- Commit öncesi kontroller: `pnpm check` + `node tools/layout-qa.cjs` (yerel sunucu gerekir) + `node tools/v2-criteria.cjs`.
- Oyun kuralı, ekonomi, kayıt biçimi ve slot koordinatları izinsiz değişmez.

- **8 Ekim profil referansı:** `docs/PROFILE-DESIGN-MEMORY.md`, `docs/mockups/approved-profile-v2.webp` ve `docs/profile-v2-atlas.json`. Sarık/kavuklu tasarım eski profil onayını değiştirir. Üst/alt HUD tamamlandı; `ika-hud.tsx`, `41-exact-reference-hud.css` ve HUD assetlerini değiştirme. Yalnız mevcut profil mekaniğine görsel giydir.

- **8 Ekim Ayarlar referansı:** `docs/SETTINGS-DESIGN-MEMORY.md` ve `44-settings-chambers.css`. Tercihler, Cihaz, Kayıt ve Bilgi 0.63.0 / SW71 olarak onaylı profil malzemelerine geçirildi. Eski ayar mockup/yuvarlak cam paneller yerine bu bellek ve gerçek ekran kanıtları kullanılır. Ayar mekanikleri ve HUD değişmez.

- **8 Ekim arşiv/ittifak:** `docs/ARCHIVE-ALLIANCE-DESIGN-MEMORY.md`, 0.64.0 / SW72. Sürüm arşivi ile ittifakın bütün durum/alt sekmeleri aynı profil malzemelerindedir. Sonraki görsel işlerde bu bellek geçerlidir; mekanik ve HUD korunur.

## Görev tasarımının güncel belleği (8 Ekim 2026)

Görev sayfası ve saray başlık düğmeleri için `docs/MANDATES-DESIGN-MEMORY.md` ve `docs/MANDATES-VALIDATION.md` okunur. 47 numaralı stil beş saray sayfasında atlasın içine gömülü geri/çarpı yerine ayrı ve oranı korunan düğmeler kullanır. 48 numaralı stil görevlerin üç sekmesine ortak Osmanlı saray dilini uygular. HUD ve oyun mekanikleri değiştirilmez.

## Kışla detay (8 Ekim 2026)

0.66.1 / SW75 için `docs/BARRACKS-DESIGN-MEMORY.md` ve `docs/BARRACKS-VALIDATION.md` güncel referanstır. 49 numaralı stil yalnız kışla detayına uygulanır; yuvarlak 47 numaralı başlık kontrolü kışlaya genişletildi. Asker eğitimi, sıra, maliyet, süre, garnizon, bina ve HUD mekanikleri korunur.

Kullanıcı 0.66.0 kışla düzenini dar buldu: eğitim ekranında sabit yükseltme ve otomatik büyük avlu kullanma. Gelişim/yardım altındaki destek bilgileriyle ana oyun eylemine alan aç. HUD korunur.

## Kışla için en son onay (8 Ekim, 0.67.0 / SW76)

`docs/BARRACKS-DESIGN-MEMORY.md` başındaki yeni onay ve `docs/mockups/approved-barracks-vertical-slider.webp` geçerlidir. Birlikler alt alta, seçili satırda eğitim; yalnız adet barı yatay sürüklenir. Yuvarlak ceviz/pirinç kontroller, işlemeli ortak çerçeveler, kırmızı askerî eğitim düğmesi ve yeniçeri/börk sekme simgesi. Eski yatay galeri tarifine dönme. Gelişim ve HUD korunur.

## Kışlanın görsel düzeltmesi — 0.68.0 / SW77

Kullanıcı 0.67.0 ekranını çizime benzemediği için reddetti. `docs/BARRACKS-DESIGN-MEMORY.md` başındaki 0.68.0 düzeltmesi geçerlidir: gerçek portreler ve atlas çerçeveleri, bütün alt bölümler, mevcut alt HUD. Sadece renk benzerliğine dayanarak tasarıma uygunluk iddia etme.

## Kışlada eksiksiz referans ayrıntıları — 0.69.0 / SW79

`docs/BARRACKS-DESIGN-MEMORY.md` başındaki 0.69.0 kuralları geçerli: 16 portrede ortak işlemeli köşeler, gerçek +/−/Maks./sürgü malzemesi, Gelişim ikonu, süslü başlıklar ve ortak Üretim kuyruğu. Kışlada eski UnitFigure fallback'i kullanma; yükseltme Gelişim'de ilk sırada kalır.


## Çarşı ve Ticaret Merkezi — 0.78.0

docs/COMMERCE-DESIGN-MEMORY.md geçerlidir. İki ana sekme ve ortak atlaslar; anlık tüccar ile yolculuklu pazar ayrıdır. Net gelir, gerçek satış akçesi ve teklif stokları doğru açıklanır. Ekonomi ve HUD korunur. Sonraki bölüm Kara Pazar.


## Kara Pazar — 0.79.0

docs/EXCHANGE-DESIGN-MEMORY.md geçerlidir. Ortak atlaslar, ayrı sahne, Mal takası/Gelişim. Gerçek kayıplı miktar ve engeller işlemden önce okunur. Maks. resmini form alanına uygulama. Motor ve HUD korunur. Sonraki bölüm Liman/Tersane.


## Liman ve Tersane — 0.80.0

docs/MARITIME-DESIGN-MEMORY.md geçerlidir. Ortak filo ve gerçek yük sınırı, dikey gemiler/inşa kuyruğu; ortak atlaslar ve Gelişim başında yükseltme. Motor ve HUD korunur. Sonraki bölüm Harita Arşivi ve savunma yapıları; yayın sonrası kullanıcı değerlendirmesinde dur.


## Harita Arşivi ve savunma — 0.81.0

docs/DEFENSE-DESIGN-MEMORY.md geçerlidir. Yol çarpanı ve nakliye araştırması; başlangıç sur canı/şehir savunması ve garnizon; ek casusluk katkısı ile gerçek kovma şansı ayrıdır. Ortak atlaslar, üç sahne, Gelişim önce yükseltme. Motor ve HUD korunur. Sonraki bölüm Tophane/Korsan Kalesi; yayın sonrası kullanıcı değerlendirmesinde dur.
