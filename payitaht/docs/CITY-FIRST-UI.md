# Şehir üzerinde yapı yönetimi · 0.60.0 / SW57

6 Ekim 2026: Şehir → binaya dokun → yükselt akışı, şehir görünür kalacak
şekilde düzenlendi. Osmanlı–Ege sanatı ve mevcut oyun işlemleri kullanılır.

- Haritada bina seçmek modeless bir yapı paneli açar. Phaser şehri bu sırada
  durdurulmaz; harita ve ortak gezinme erişilir kalır.
- Panelde bina resmi, açıklama ve motorun mevcut/sonraki seviye etkileri
  gösterilir. İçerik gerektiğinde kayar; yönetim ve yükseltme eylemleri sabittir.
- Maliyet, eksik stok, engel, inşaat sırası ve ilerleme mevcut UpgradeDock
  bileşeninden gelir. Yeni ekonomi veya kayıt alanı eklenmedi.
- Yapıyı yönet ayrıntılı bina sayfasını açar. Sayfanın geri düğmesi panele
  döner; panelde kapat/Escape ve Android geri tuşu şehir görünümüne döner.
- Şehir HUD'u 116 yerine 100 px + güvenli alan kullanır. Kaynakların gerçek
  sayıları, üretim hızları, doluluk uyarıları ve danışman işlemleri korunur.
- Panelin building-inspector sınıfları eski bina kataloğundaki
  building-preview sınıflarından bağımsızdır.
- Giriş ekranındaki bağlantıların dokunma alanı en az 44 px, küçük yazılar
  en az 11 px olacak şekilde düzeltildi.

Kaynak: components/game/building-preview.tsx, app/styles/31-city-focus.css.
QA kancası building mevcut ayrıntı sayfasını açmayı sürdürür;
buildingPreview yeni paneli açar. tools/layout-qa.cjs her bina için iki
görünümü de normal ve %130 yazıyla tarar; her ikisinde yükseltme eyleminin
ekranda kaldığını denetler.

Kontroller: pnpm check, statik Pages derlemesi, v2-criteria ve half-size
kontrolleri; tarayıcıda panel/yükseltme/yönetim/geri/Escape/bina değiştirme.
