# G2 onay düzeltmeleri + 0.42.0 merge

`claude/ancient-city-phaser-game-r9e0qu` 8ea051f (0.42.0) merge edildi; rebase yapılmadı.
Kaynak bileşenleri boyalı kaldı: TasArt yok, KahveArt var. SW v29 korundu;
kaldırılan taş ikon/bina yolları cache listesinden çıkarıldı. Brif #2/#20 okundu:
11 kaynak, kahve; bina seti 37×3, bagci/mahzen ve mine-kahve yenilemeleri ilgili G7/G10 fazında.

Dört yeni üretim: bakır cezve + çekirdek; surlu şehir kapısı; bayraksız kadırga;
toprak kâsede soluk limon kükürt kristalleri + ince duman. Taş ve üzüm dosyaları silindi.
Diğer sekiz menü görseli aynı üretim kaynağından daha sıkı kırpımla boyutlandırıldı.
Tüm ikonlar 256×256, ≤12 KB. Promptlar g2-revision.md; her dosya CREDITS.md'de.

PAINTED_ICONS artık küresel görünüm değişikliği yapmaz: painted prop'u yalnız
alt bar ve şehir sütununda açıkça verilir. Diğer bütün kullanımlar SVG kalır;
16 px altı glifler ayrıca SVG'dir. Divan'da sefer hakkı kendi HamleArt'ını kullanır.
Menü/sütun img ölçüsü 44×44 px, 40 px iç alan + G1 madalyon. Sütun düğmeleri
52 px; alt bar 74 px, ikon ve etiket için yeterli yer. Harita/slot geometrisi değişmedi.

Kanıtlar: önce/sonra 390×844 şehir, iki fonda bütün 20 ikonun gerçek 24 px
bileşen testi. after/alliance, harbour-page, divan-page: menü dışı örnekler.
usage-report.json: 9 menü/sütun ikonu ≥34 px; üç sayfada boyalı menü ikonu 0,
SVG satır ikonları korunmuş. Bütün kanıtlar ≤200 KB WebP; PNG eklenmedi.

Bölüm 6: TypeScript, 316/316 test, ESLint sıfır uyarı, CSS/unused CSS strict,
unused assets 0, half-size, V2 (telefon bina seti 9.6 MB), statik derleme,
layout 360×740/%130 tüm kategoriler 0, visual 390×844 sayfa/asset hatası 0,
rehber 8 hedef / 3.8 oyun dakikası geçti. pnpm check tsx IPC EPERM hatasına
takıldığından aynı test dosyaları node --import tsx --test ile çalıştı.

Oyun/economy/save değişiklikleri yalnız kullanıcının istediği 0.42.0 merge'inden;
G2 düzeltmeleri ek oyun kuralı, ekonomi, kayıt veya slot değişikliği içermiyor.
G2 kullanıcı tarafından bu düzeltmeler şartıyla onaylandı; yeni onay beklemeden G3.
