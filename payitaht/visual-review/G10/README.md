# G10 — Bina denetimi ve kahve teması

114 bina aşama tuvali G0 ışık, kamera, renk, malzeme, temas ve büyüme diliyle
karşılaştırıldı. Kahve Fidanlığı ve Kahve Kileri'nin 3'er aşaması yeniden
düzenlendi: üzüm/şarap yerine fidan, kırmızı kahve meyvesi, kavurma ocağı,
çekirdek çuvalları ve kahve kasaları. Diğer 108 tuval korundu.

Tam tuval 1774×887, telefon kopyası 887×444 olarak kaldı. Alfa sınırları
%4 içinde, opak alan farkı %1–3.4 içinde; bina profil ölçekleri, arsalar,
yerleştirme, kayıt ve üretim mekanikleri değişmedi. Telefon kopyası ≤90 KB.
SW v39 ve bina görsel revizyonu yeni görsellerin yüklenmesini sağlar.
Tarifler tools/art/prompts/g10.md; tüm setin öncesi/sonrası temas sayfaları
ve altı telefon bina aşaması bu klasördedir.

TypeScript, 319 test, ESLint, CSS, kullanılmayan görseller, yarı boy kopyalar,
V2 ölçütleri, statik derleme ve 360×740 / %130 yazı taraması geçti.
Telefon görsel paketi: 14.757.308 / 15.000.000 bayt. Ölçek taramasında
normal binalar için inceleme uyarısı yok. Sayfa/görsel yükleme hatası yok.
Test betiği bu ortamın IPC sınırına uygun node --import tsx, tek işçi ve
TAP raporu kullanır; test kapsamı değiştirilmedi.
