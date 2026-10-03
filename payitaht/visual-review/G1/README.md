# G1 — boyalı arayüz kiti

G0 kullanıcı tarafından 2026-10-03'te onaylandı. G1'den sonra durulmaz;
G2 sonunda arayüz kiti + ikonlar için onay beklenir.

Yedi özgün boyalı malzeme: sayfa çerçevesi, ahşap plaka, altın/parşömen/kırmızı
buton, kırmızı şerit, dairesel madalyon. 78.5 KB toplam; tamamı telefona
uygun boyda WebP kalite 82. Bu yedi malzeme yaklaşık 15 kit yüzeyinde paylaşılır:
üst/alt bar, sayfa ve kart çerçevesi, başlık, üç düğme tonu, sekme ve seçili
sekme, kaynak kapsülü, uyarı kapsülü, rozet, ilerleme yatağı/dolumu, madalyon.

`lib/painted-ui.ts` yolları uygulamanın asset tabanıyla kurar; `layout.tsx`
CSS değişkenlerini sağlar. `10-painted-kit.css` aynı düğme, HUD ve sayfa
bileşenlerinin yüzeylerini bağlar. Kaynak parşömenindeki sayılar koyu mürekkep;
dolu ambar/seçili durum işaretleri, aria adları, 44 px dokunma alanları korunur.
Yerleşim/işlev değişmedi. Köşeler 9-dilimde sabit; orta alan uzatılır.
Yuvarlak parçalarda 9-dilim kullanılmaz, bütün daire ölçeklenir.

Önce/sonra: `before/` ve `after/` altında aynı 390×844 şehir, araştırma,
ordu ve yapı listesi. `after/nine-slice-{390,1100}.webp`: gerçek GameButton
ve derlenmiş CSS ile 96/180/300 px düğmeler, dar/geniş kart çerçevesi.
Bütün teslim ekranları WebP, her dosya ≤200000 bayt. G0'ın mevcut onay
kanıtları da WebP'ye çevrildi; PNG'ler bu commit'te kaldırıldı.

Kontroller: TypeScript, 309/309 test, ESLint sıfır uyarı, CSS ve unused CSS
(strict), unused assets (0), half-size check, tüm V2 ölçütleri (telefon bina
seti 9.9 MB), statik Pages tabanı derlemesi, layout (360×740 ve %130:
tüm kategoriler 0), visual QA (390×844: sayfa hatası/eksik asset 0),
ilk 10 dakika (8 hedef, 3.7 oyun dakikası) geçti. Testler ortamın tsx IPC
kısıtlaması nedeniyle `node --import tsx --test` ile aynı dosyalardan çalıştı.

SW `payitaht-shell-v28`: yedi malzeme cache listesine eklendi, testi güncellendi.
Üretim tarifleri `tools/art/prompts/g1.md`, her dosyanın kaydı CREDITS.md'de.
Oyun kuralı, ekonomi, kayıt biçimi, slot/geometri dosyaları değişmedi.

Kullanıcının G2/G3 notları CREDITS.md'de kayıtlı: taş kenar/gölgesi koyu,
bütün ikonlar 24 px koyu/parşömen fonlarda kontrol; G3 yüzler 42 px dairede
ortalı, omuzlar kırpılmış ve yüz okunaklı.
