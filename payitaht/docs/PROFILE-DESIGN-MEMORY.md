# Payitaht tasarım belleği — Profil, 8 Ekim 2026

## Tek yetkili referans

Adem'in onayladığı **sarık/kavuklu** tasarım: `mockups/approved-profile-v2.webp`.
Önceki `approved-profile.webp` profil için artık geçerli değildir. Yeni çizim ve entegrasyonda önce bu belgeyi, sonra referans görselini aç. Hafızadan yeni bir düzen uydurma. Üst ve alt barın kendi onaylı referansı `EXACT-HUD.md`; profil mockup'ının barlarını uygulamaya kopyalama.

## Değişmez kurallar

- Mevcut üst/alt HUD dosyalarını, assetlerini, boyutlarını ve davranışlarını koru.
- Oyun kuralı, ekonomi, puan/unvan hesabı, kayıt biçimi, şehir seçimi, nişan koşulları değişmez.
- İsim, unvan, motto, sancak kumaşı/şekli/arması/rengi, süre, şehir sayısı, bütün puanlar ve nişan durumları mevcut veriden gelir. Örnek görseldeki Adem/24/3/12.480 değerlerini sabitleme.
- Osmanlı–Ege kıyı stratejisi: Avrupa kral tacı, haçlı taç, fantastik krallık eşyası kullanma. Unvan simgesi beyaz sarık ve kırmızı kavuktur.
- Tam genişlik. Dar kart kolonları, yuvarlatılmış modern uygulama panelleri, cam efekti ve iç içe kutular ekleme.
- Sekmeler, şehir rotaları, sekiz sıralama, on dört kayıt alanı, otuz nişan, filtreler ve açık kaydet/vazgeç akışı korunur.

## Görsel dil

Koyu ceviz başlık/sekme/alt eylem şeridi; eskitilmiş pirinç ve altın işlemeli ince kenarlar; sıcak fildişi parşömen; koyu kırmızı ipek aktif durum. Boyanmış gerçekçi oyun nesneleri, sıcak sol üst ışık. Ana metinlerde Georgia/serif; bölüm başlıkları ve nişan etiketlerinde gömülü Tinos Bold; mürekkep siyahı metin ve altın ahşap başlıklar. Rozetler resimdir; çizgi ikon taklidi değildir.

Sıra: Hükümdarın Sarayı başlığı → kıyı sarayı, canlı kişisel sancak ve asılı kimlik parşömeni → üç özet hücresi → altın kimlik düzenleme düğmesi → Saltanat/Şehirler/Nişanlar/Sancak → kavuklu unvan ilerlemesi → ikiye iki saltanat sicili → üç nişanlı şeref rafı → Ayarları aç/Sürüm arşivi.

## Hızlı yeniden kullanım

Üretim assetleri `public/images/game/ui/profile-v2/` altında. Dokuz parça: header, scene, summary, edit, tabs, title, ledger, honours, footer. Boyutlar ve kaynak koordinatları `profile-v2-atlas.json`. Profil stilleri `app/styles/42-approved-profile.css`; yalnız `.bp-profile` kapsamı. CSS değişkenleri `--profile-*` gerçek base path üzerinden üretilir. Ekran mekaniği `sovereign-page.tsx` ve mevcut alt panellerdir.

Başka sayfa için aynı malzeme ve ışıkla ayrı yazısız sahne üret; bu ekranın düzenini kontrol etmeden değiştirme. Önce mevcut assetleri kullan. Çerçeve ve nesneleri yeniden çizmek yerine onaylı atlası dilimle. Metinler ve canlı durumlar HTML olarak kalır.

## Kaynak ve üretim istemi

Dahili imagegen ile onaylı sarık/kavuk mockup'ı düzenlendi. İstem: tüm yazı ve rakamları mevcut yüzeyle doldurarak kaldır; tüm yerleşim, resimler, çerçeveler, dividers, beyaz sarık/kırmızı kavuk ve süsleri aynı tut; yalnız sahnedeki ön sancak, arma ve direği kaldırıp arkadaki loggiayı tamamla; kimlik parşömeni ve küçük unvan levhasını boş bırak; ilerleme çubuğunun kırmızı dolgusunu boş ahşap zemine çevir. Yeni nesne, kırpma veya yeniden tasarım yok. Runtime kişisel sancak ve gerçek metinleri ekler.

Atlas dilimleme Sharp ile yapılır; AI yeniden tasarım için kullanılmaz. Onaylı görselin ve atlasın SHA-256 değerleri `profile-v2-provenance.json` içinde tutulur.

## Kabul kontrolü

390, 360 ve 430 px mobil genişliklerde gerçek ekranı aç. Başlık, sahne, kimlik, özet, sekmeler, unvan, sicil ve rafı referansla yan yana kontrol et. Uzun isim/motto ve büyük puan taşmamalı. Üst/alt HUD öncesi/sonrası piksel ve dosya hash karşılaştırması aynı olmalı. Sekmeler, nişan filtresi, şehir rotası, sancak kaydet/vazgeç ve ayar/arşiv eylemlerini dene. Görsel farkı varsa aynı diye raporlama.

## Telefonda metin ve ikon yerleşimi

Profil alanında `text-size-adjust: 100%` ve `-webkit-text-size-adjust: 100%` korunur. Masaüstü emülasyonundan geçen normal akış, Android'de aynı sonucu garanti etmez. Kimlik içindeki isim/unvan/motto ayrı, sahneye oranlı mutlak kutulardır; unvanın yeri isim satırının yüksekliğine bağlı değildir. Başlık yazısı atlasın iki süsü arasında kalır. Atlas zaten geri/kapat ve ayar/arşiv ikonlarını içerir: ikinci runtime ikon eklenmez. Nişan etiketleri her levhanın kendi sınırında merkezlenir.

## Arma ve başlık ölçüleri — 0.61.4

Profil sahnesindeki arma kutusunun merkezi, sahne genişliğinin %29'u ve yüksekliğinin %40,25'idir. Sancak kutusu: sol %7, üst -%7, genişlik %39, yükseklik %105. Yalnız profil sahnesindeki nakışa uygulanır; seçicideki sancaklar ve HUD arması ayrı kalır. Kumaş biçimi/rengi/arma seçimi canlı kayıttan alınır.

Sicil/şeref başlıkları: kanonik x=85,4 px (853 px tuvalde yaklaşık 85), bölümün üst çizgisinden y=0 CSS kutusu; font 3,3cqw, Tinos Bold. Nişan levhası yazıları: 2,15cqw Tinos Bold. Sistem Georgia'sının cihazdan cihaza değişmesine bırakma. `public/fonts/` altındaki iki orijinal Latin ve Latin Extended WOFF2, @fontsource/tinos 5.3.0 paketinden gelir; SIL OFL metni `Tinos-OFL.txt`. Türkçe harfler ayrı Latin Extended yüzüyle yüklenir. CSS bunları modül olarak paketler; Pages base path ile üretilen statik font URL'leri kullanılır.

## Şehirler, Nişanlar, Sancak — 0.62.0 / SW69

Alt sekmelerin kaplaması `app/styles/43-profile-chambers.css`. Aynı boyanmış `approved-court` parşömen, ceviz ve pirinç çerçeveler; aynı gömülü Tinos Bold. Tasarım dosyası yalnız profil alt panellerini etkiler. Saltanat atlası ve HUD korunur.

Şehirler: geniş parşömen register, resimli şehir satırı, başkent/koloni levhası, iki kolonlu sekiz sıralama ve on dört canlı sicil değeri. Nişanlar: üç metal özeti, sonraki nişan, ceviz filtre şeridi, iki kolonlu madalya rafı ve altın isim levhaları; 650 px üstünde üç kolon. Sancak: yazı masası, ipek/sırma seçim tezgâhı, seçili üründe ceviz zemin, al aktif adım, sabit kaydet/vazgeç mührü. Biçim/arma/renk seçenekleri gerçek mevcut görselleri kullanır.

Alt panel başlıkları ve nişan metreleri normal akıştadır. Saltanat atlasının mutlak başlık/ilerleme koordinatları alt panellere uygulanmaz. Canlı metinler resim içine gömülmez; sıralama, filtre, seçim, validasyon ve kayıt fonksiyonlarını değiştirme.

Gerçek ekran kanıtları: `mockups/profile-chambers-cities.webp`, `profile-chambers-medals.webp`, `profile-chambers-banner.webp`. 360/390/430 px genişlik, gerçek sekme/filtre, kumaş/arma/renk seçimi ve kaydet/vazgeç kontrolleri yapılmıştır.

## Mobil sıkılaştırma ve arma kaydı — 0.62.1 / SW70

Profil açıkken shell'in yalnız alt bar arkasındaki bölümü parşömenle örtülür (`::after`, z=59, pointer-events:none). Şeffaf HUD kenarlarından şehir görünmez; HUD z=70, asset ve ölçüler aynı kalır. Sayfa kapandığında örtü kaldırılır.

Kumaş seçici: `.royal-standard` her tezgâhta 3/5 oranında, yatay ortada, %100 yüksekliğe sahip gerçek sprite kutusudur. Kumaş ve renk maskesi aynı kutuyu kullanır. Arma normal kumaşta x=%60, y=%40 merkezlidir; 35% genişlik, 25% yükseklik. Dar flamaya x=%58, y=%40,5; 24% genişlik, 23% yükseklik. `data-banner` sadece görsel silüet ayarıdır; kayıt ve seçim kuralını değiştirmez. Bağımsız arma örnekleri 64×64 ortalanır. Bu seçici ölçülerini Saltanat sahnesine/HUD'a taşımak yasaktır.

Alt defterlerde yaklaşık %15–20 daha küçük resimler/boşluklar; şehir satırı 124 px, şehir resimleri 74 px, nişanlar 94 px, kumaş örneği 124 px, renk örneği 84 px. Giriş ve dokunma hedefleri en az 48 px korunur.
