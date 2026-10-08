# Medrese — 0.70.0 / SW80

8 Ekim 2026. Kullanıcı kışla 0.69.0 dilini genel standart kabul etti; `MASTER-UI-STANDARD.md` ve `MEDRESE-DESIGN-MEMORY.md` kalıcı kaynaklar. Üst/alt HUD, kayıt şeması, ekonomi, maliyet, süre, ön koşul ve komut hesapları değişmedi.

- Chromium, sentetik geçerli kayıt: 360/390/430×844 Medrese; 390×844 Gelişim, beş araştırma dalı, aktif araştırma, Deneyler ve Gelecek. Âlim +/Onayla 10→11, Usta Elleri araştırması başladı, 100 kristal deneyi gerçekleşti, Ekonomi Geleceği Sv. 1 oldu. Yükseltme Gelişim panelinin ilk çocuğu.
- Bu sayfalarda altı layout kategorisi boş. Aktif araştırmadaki tek `kesik: x`, Base UI Progress'in `role=presentation`, 1px ve `clip-path:inset(50%)` ölçüm öğesidir; görünür kullanıcı metni değildir. Ham rapor bu istisnayı saklamaz.
- Genel `tools/layout-qa.cjs` tekrar çalıştı, exit 1: değişmeyen HUD küçük/minik öğeleri, diğer sayfalar ve gizli Gelişim dokunu ilk ekranda görünür varsayan eski kontrol. Medrese dok/canvas uyarısı da bu gizli dok kontrolüdür. Araştırma sayfası 360×740 normal ve %130 yazıda altı kategoride temiz. Bütün uygulamaya yeşil rapor iddia edilmez.
- 328 test (PWA SW80 dahil), TypeScript, ESLint, CSS/unused CSS ve V2 kriterleri geçti. Test komutu: `node --import tsx --test $(rg --files lib -g '*.test.ts')`; tsx CLI'nin ortam IPC kısıtı nedeniyle doğrudan Node yükleyicisi kullanıldı.
- Gerçek ekranlar: `mockups/medrese-live-{360,390,430}.webp`, `medrese-development.webp`, `medrese-active.webp`, `medrese-experiments.webp`, `research-{ekonomi,bilim,askeri,denizcilik,mitoloji,future}.webp`. Aktif ekranda üstteki bildirim gerçek araştırma komutunun sonucudur.
- Yeni Osmanlı ilim meclisi resminden sahne/iki portre; onaylı kışladan aynı çerçeve, kırmızı eylem, gerçek madalyon sürgü, +/−, ahşap kontrol ve başlık süsleri. Mevcut boyalı araştırma motifleri korunur. Eski medrese SVG âlimi kullanılmaz.

Pages için `/gameofashina` taban yoluyla statik export başarılı.

## 0.71.0 / SW81 — kullanıcının son düzeltmeleri

- 335 test (7 yeni salt okunur araştırma önerisi senaryosu dahil) geçti; TypeScript, ESLint, CSS/unused CSS ve V2 kriterleri temiz.
- 360/390/430×844 Medrese ve ormandaki halk aynı `ui/people/citizens.webp`; âlim atama, boş araştırma, öneri ve üst danışman aynı `ui/people/scholar.webp`. Üstte yalnız kullanıcı tarafından istenen âlim/ilim görselleri değiştirilir; HUD ölçüleri ve dokunma eylemleri değişmez.
- Onayla/Geri al eşit iki sütunda ve aynı yüksekliğe sahip; +/Onayla yine 10→11. Yükseltme ilk blok, gereksinim başlığı ortalı, üst bilgi kontrolü yok. Detay sayfalarında eski görünüm galerileri/önizleme sınıflarının sayısı sıfır; görselsiz yapı eylemleri Gelişim'de.
- Beş dalın boyalı simgeleri ve ortak yeni ilim/süre görselleri yüklendi. Âlim önerisi düşük huzurda Kuyu Kazımı'nı gerçek etkisiyle önerdi. 7 otomatik senaryo ayrıca aktif çalışma, dolu ambar, eksik ilim, tamamlanmış ağaç ve Medrese/ön koşul durumlarını doğrular.
- Kristal deneyleri açıklama, ambarda kristal, üç seçenekte harcama/kapasiteye göre kazanım ve ortak eylemle baştan düzenlendi. 100 kristal işlemi geçti; Gelecek araştırması yine Sv. 1 oldu. Ham scoped layout raporunda tek istisna yine Base UI'nin görünmez 1px `x` ölçüm öğesidir; diğer kategoriler boş.
- Güncel gerçek görüntülere `mockups/medrese-confirmation.webp` ve `mockups/research-advice.webp` eklendi; önceki Medrese/araştırma görüntüleri güncellendi.
- Genel layout taraması tekrar çalıştırıldı ve önceki HUD küçük yazı/hedefleri ile gizli Gelişim dokunu görünür varsayan özel kontrol nedeniyle exit 1. Araştırma normal/%130 yazıda temiz; bütün uygulama için yeşil rapor iddia edilmez.

0.71.0 son kaynakla `/gameofashina` statik export geçti; son Deneyler taramasının altı kategorisi boş ve ilk eylem telefon ekranında görünür.
