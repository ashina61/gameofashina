# G2 — kaynak ve menü ikonları · onay durağı

G0 onayı sonrası G1 ve G2 sırayla tamamlandı. G3'e geçmek için kullanıcı onayı beklenir.

12 kaynak/durum + 9 menü ikonu, onaylı stil sayfası referansıyla ayrı ayrı üretildi.
Şeffaf 256 px WebP; her ikon ≤12000 bayt. Ayrıntılı bütçe: `icon-budget.json`.
Her dosya CREDITS.md'de, tam üretim promptları `tools/art/prompts/g2.md` içinde.
Taş koyu kenar ve alt gölge taşır; krem fonda mermerden ayrı blok siluetiyle okunur.

`resource-art.tsx` ve `ui-art.tsx` aynı dış imzayla img döndürür; yollar asset tabanını
kullanır. Küçük arayüz glifleri SVG kalır. Menü ikonları G1 madalyonunu paylaşır.
Huzur ve yolsuzluk simgeleri mevcut Divan bilgisinin yanında gösterilir; dinamik
huzur yüzü korunur. CSS, önceki SVG ölçülerini img üzerinde de uygular.
Divan tablo açıklamalarının gerçek dokunma yüksekliği 44 px; yeni ikonların
yanında da erişilebilirlik kontrolünden geçer. Sayaçların parşömen yatağı boş ilerleme alanındaki metni okunaklı tutar.
SW v29: 21 ikon önbellek listesinde; cache testi güncellendi.

`before/` ve `after/`: gerçek bileşenlerle 24 px iki fon karşılaştırması
(#2a1a0e / #f3e2b9), aynı 390×844 şehir ve araştırma ekranları.
Önce sayfasında henüz bulunmayan iki durum ikonu — ile gösterilir.
Tüm kanıtlar WebP ve dosya başına ≤200000 bayt; büyük PNG commit edilmez.
G1 9-dilim düğme/plaka dar/geniş testleri `../G1/after/` altında.

Bölüm 6: TypeScript, 309/309 test, ESLint sıfır uyarı, CSS/unused CSS strict,
unused assets 0, half-size, V2 ölçütleri (telefon bina seti 9.9 MB), statik
Pages tabanı derlemesi, layout 360×740 ve %130, visual QA 390×844 ve ilk
10 dakika rehberi. Testler tsx IPC kısıtlaması nedeniyle aynı dosyalarla
`node --import tsx --test` üzerinden çalıştırıldı.

Oyun kuralları, ekonomi, kayıt ve slot/geometri dosyaları değişmedi.
G3 portre üretiminde kullanıcının 42 px daire, ortalı yüz, dairede kırpılan
omuzlar ve küçük boyda yüz okunaklılığı şartları uygulanacak.
