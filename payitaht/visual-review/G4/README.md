# G4 — şehir zemini ve dekor (onay durağı)

11 zemin/tepe + 31 dekor üretildi: mevcut 21 dekor yenilendi, 10 yeni çeşit
(incir, portakal, nar, saz, kuru ot, lavanta, saksı, tahıl çuvalı, taş bank,
kahve bahçesi) eklendi. Her üretim G0 stil referansıyla yapıldı; promptlar
`tools/art/prompts/g4.md`, dosya kayıtları `public/images/game/CREDITS.md`.
Zemin 512 px, uzak tepe 1024 px genişlik; dekor oranı korunarak en fazla 512 px.
42 WebP gerçek oyunda yükleniyor, 23 eski PNG kaldırıldı. SW v31.

Çim tonları yumuşak kenarlarla karışır. Boyalı taş/toprak aynı yol eğrileri,
aynı meydan ve rıhtım üstünde; kum/köpük ve iki su dokusu aynı kıyıyı izler.
Boyalı uzak sırt, mezarlık ve çeşme eski prosedürel çizimlerin yerini aldı.
Kümeler/sık koruluklar yaklaşık iki kat yoğunlaştırıldı; `clearForDecor`
arsa/yol/dere korumaları aynen duruyor. Başlangıç yakınlaştırması +%8;
bina ölçekleri, slotlar, 2×2 ayak izi, ekonomi, oyun kuralları ve kayıt değişmedi.
Gemi, sur ve ada madeni çizimleri faz sırasıyla G7’de yenilenecek.

## Kanıt

`before/` ve `after/` aynı 390×844 şehir/kıyı/ada kayıtlarını karşılaştırır:
şehir merkezi, büyümüş şehir, el sanatları yükseltmesi, liman, ada görünümü,
kuzeye kaydırılmış şehir. `after/terrain-decor-sheet.webp` bütün 42 asset’i
bir arada gösterir. Kanıtların tamamı WebP ≤200 KB; PNG commit edilmedi.

## Kontrol

Bölüm 6’nın tamamı geçti: TypeScript, 316 test, ESLint sıfır uyarı,
CSS/unused CSS strict, unused assets strict (0), half-size, V2, statik Pages
derlemesi, layout 360×740 ve %130 metin (bütün kategoriler/sayfa hataları 0),
visual 390×844 (eksik asset/sayfa hatası 0), rehber 8 hedef / 3.8 oyun dakikası.
Ortamın tsx IPC EPERM kısıtlaması nedeniyle aynı testler
`node --import tsx --test` ile çalıştırıldı. Görsel QA açılışı 3787 ms / heap 61 MB.

Zemin başına ≤150 KB, dekor başına ≤60 KB. `asset-budget.json`: telefona
uygun tüm bina aşamaları ve kalan bütün oyun görsellerini içeren muhafazakâr
envanter 14.716 MiB ≤15 MiB (V2 ölçütüyle aynı 1048576 byte birimi).
Yalnız bu fazda yüklenmiş görseller 42 adet; `terrain-report.json` hatasız.

G4 onayı gelmeden G5’e geçilmeyecek.
