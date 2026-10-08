<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Payitaht Adaları — ajanlar için

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
