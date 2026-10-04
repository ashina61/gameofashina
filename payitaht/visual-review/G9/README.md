# G9 — Derin sayfalar

76 araştırma, 8 tanrı, 14 yapay rakip, 30 başarım, 8 yönetim biçimi,
6 lonca, 8 mucize, 4 gösteri ve kara/deniz savaş alanı boyalı görsellere
bağlandı. Atlaslar 96 px hücrelerle tek doku olarak yüklenir; CSS yalnız
hücreyi seçer. Tamamlanma işareti, oyuncunun arması ve sancak özelleştirmesi
koddan gelir. Bronz/gümüş/altın madalya çerçeveleri ayrı gösterilir.

Oyun kuralları, kayıt biçimi, savaş tekrar motoru ve bina geometrisi değişmez.
Mitoloji atlasının dış zeminini dairesel CSS kırpması saklar.
Üretim tarifleri tools/art/prompts/g9.md içindedir. SW v38.

Kontroller: TypeScript, 319 test, ESLint, CSS, kullanılmayan görseller,
küçük bina kopyaları, V2 ölçütleri ve statik derleme geçti.
10 derin sayfa/savaş görünümü 390×844'te açıldı; görsel/sayfa hatası yok.
360×740 ve %130 yazı taraması: taşma, kesik yazı, küçük kontrol, minik yazı,
çakışma ve isimsiz kontrol sıfır. İlk sekiz rehber hedefi 4.8 oyun dakikasında
geçti. Telefon görsel paketi 14.959.216 bayt / 15.000.000 sınırı.
Bu ortamda tsx IPC yerine aynı testler node --import tsx --test ile çalıştırıldı.
