# G8 — 16 boyalı ada ve dünya haritası

16 farklı ada arazisi, aynı çizimlerden 16 şeffaf küçük harita simgesi ve
boyalı açık deniz dokusu. Dünya haritası G1 boyalı çerçevesini kullanır;
haritadaki nakliye gemileri G7 görseline bağlandı. Ada koordinatları,
tıklama merkezleri, zoom/pan davranışı ve oyun kuralları korunur.

Telefon için her ada ≤100 KB, küçük simge ≤9 KB. SW v37 yeni dosyaları
önbelleğe alır. Üretim tarifleri `tools/art/prompts/g8.md`; ekran ve kontrol
kanıtları bu klasördedir.

Son kontrol: Akçam ve Lodos'taki gömülü binalar kaldırıldı. 16 ada,
128 arazi çapası, dünya haritasında klavye seçimi, 360 px / %130 yazı
yerleşim taraması ve 390×844 sahne kontrolleri geçti. Eksik görsel ve
sayfa hatası yok. Telefon görsel paketi 14.564.714 bayt (15 MB sınırı).
TypeScript, 319 test, ESLint, CSS, kullanılmayan görseller, küçük bina
kopyaları, V2 ölçütleri, statik derleme ve ilk sekiz rehber hedefi geçti.
Bu ortamda `pnpm check` test adımı tsx IPC soketi izni nedeniyle
başlayamadı; aynı testler `node --import tsx --test` ile çalıştırıldı.
