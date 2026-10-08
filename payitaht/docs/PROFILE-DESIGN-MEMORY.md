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

Koyu ceviz başlık/sekme/alt eylem şeridi; eskitilmiş pirinç ve altın işlemeli ince kenarlar; sıcak fildişi parşömen; koyu kırmızı ipek aktif durum. Boyanmış gerçekçi oyun nesneleri, sıcak sol üst ışık. Georgia/serif yazı; mürekkep siyahı metin ve altın ahşap başlıklar. Rozetler resimdir; çizgi ikon taklidi değildir.

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
