# Elçi ve birlik defterleri — 0.96.0 / SW108

10 Ekim 2026. MASTER-UI-STANDARD.md günceldir. Bu güncelleme ittifakın eski 0.64 kaplamasını ortak eğitim atlaslarıyla tamamlar.

- Elçinin Mektuplar/Teklifler/Hükümdarlar/Pazar/Haberler/Sıralama defterleri aynı ceviz, parşömen, altın işlemeli köşeler, kırmızı ipek ve gerçek eylem atlaslarını kullanır. İkonlu sekmeler iki sütundur. Ortak yuvarlak geri/çarpı; Tinos Bold başlık, Georgia gövde.
- Hariciye ve birlik sahneleri mevcut resimlerle 80px kısa şerittir. Birlik sancağı 3:5 oranını korur; uzun başlık ve düstur canlı yazıdır. Büyük dekor ve yinelenen özet eylemleri aşağı itmez. Elçinin önerisi destek bilgisi olarak içerikten sonra; birlik yoklaması Birlik defterindedir.
- Sıralamada ilk üç de dikey sicildir: 1/2/3 sırası ve gerçek puanlar. Sekiz sıralama kolu, ticaretin dört alt defteri ve filtreler aynı kalır. Teklifin verir/ister miktarları dikey okunur, kabul/ret ve gerçek zaman/teslimat kuralları korunur.
- Kuruluş/katılma ve Elçilik gereksinimi; yapay birlik üyeliği; Birlik/Üyeler/Görevler/Genelge/Diplomasi aynı atlaslarda. Beş ana sekme 3+2; sancak editörü Biçim/Arma/Renk ayrı üçlü seçimdir. Kumaş ve arma hizası mevcut onaylı ortak profile dayanır.
- Üyeler, rütbe ve davet, hazır/süren/alınmış görevler, uzun genelgeler, diplomasi ve dağıtma onayı normal dikey akışta. Boş genelge defteri açıkça anlatılır. Tüm işlemler mevcut handlers ile yürür.
- 73-diplomatic-register.css yalnız bp-diplomatic kapsamına uygulanır; 47/50 ortak atlasları bu kapsama genişler. 28/46 yapısal kuralları ve sancak seçimi korunur; yeni kaplama eski aktif sekme/buton gradyanını atlaslarla değiştirir.
- Motor, ekonomi, rakip ilişkisi/ittifak kuralları, kayıt, HUD, ada koordinatları ve dört ek ada açıklığı değişmez.

## Doğrulama

345 oyun testi, TypeScript, statik derleme, ESLint, CSS/kullanılmayan sınıf, V2 ve yarım boyut görsel kontrolleri. tools/diplomatic-qa.cjs ile 360/390/430px ve %130 yazı; normal, Elçiliksiz/boş, oyuncu birliği ve yapay ittifak üyeliği. Bütün alt sekmeler; sekiz sıralama kolu, dört ticaret defteri, sancak editörünün üç sekmesi ve dağıtma onayı. Test kayıtları gerçek motorla oluşturulur ve parseEmpire ile doğrulanır. Mektup okunması, armağan kabulü, kuruluş, katılma/ayrılma, rütbe/davet, hazır görev ödülü, bot üyelere genelge ve sancak kaydı gerçek tıklamalarla kontrol edilir. Rapor docs/diplomatic-qa-report.json; gerçek ekranlar docs/mockups/diplomatic-*.webp.

Elçi/İttifak için 252 tarama temiz: taşma, kesik, küçük hedef/yazı, çakışma, isimsiz kontrol, sayfa hatası ve eksik görsel yok. Normal yazı ve %130 yazıda bütün sekmeler; 9 işlem/kayıt akışı doğrulandı. Ana ve sancak sekmelerinin gerçek sütun sayıları ayrıca kontrol edilir. Üye listesi tek sütundur; sekmeler kaydırma sırasında üst üste sabitlenmez.

Genel düzen taramasının mevcut HUD küçük yazı/hedef bulguları ayrıca raporlanır; bu bölümün kontrolü bütün oyun için temiz QA iddiası değildir.
