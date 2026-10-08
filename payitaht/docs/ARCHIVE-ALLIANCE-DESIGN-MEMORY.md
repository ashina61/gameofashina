# Divan arşivi ve birlik defterleri — 0.64.0 / SW72

Öncelik: `PROFILE-DESIGN-MEMORY.md` ve `SETTINGS-DESIGN-MEMORY.md`. Aynı koyu ceviz, yaşlanmış altın, sıcak parşömen ve al aktif sekmeler; gömülü Tinos Bold başlık, Georgia açıklama. Eski yuvarlak/cam uygulama teması kullanılmaz; Avrupa tacı yerine mühür/defne kullanılır.

## Kapsam

`45-release-register.css`: yalnız sürüm arşivi ve iki yeni sayfanın ortak başlığı/alt bar arkası. `.bp-archive` eski genel sayfa kaplamasından ayrılır; ikinci stok araç çubuğu gizlidir, kaynakların üst HUD kontrolleri korunur. Yazısız arşiv sahnesi, ceviz başlık şeridi, geniş parşömen defter ve ceviz sürüm satırları kullanılır. Arama, tekil aç/kapat, hepsini aç/kapat, sonuçsuz arama ve bütün sürüm notları aynı kalır. Açılış ekranındaki paylaşılan arşiv de aynı parşömen ve ceviz değişkenlerini kendi kökünde alır.

`46-alliance-register.css`: yalnız `.bp-alliance`. Kuruluş/katılma, oyuncu birliği ve yapay ittifak üyeliği aynı dildedir. Beş sekme mobilde 3+2 düzeniyle 48 px hedefleri korur. İç defterler tam genişlikte ve %3 kenar boşlukludur; 60 px ceviz başlıklar, ince satır çizgileri, 15 px açıklamalar, 50 px girişler. Üyeler, rütbe araçları ve diplomasi satırları normal akıştadır. Yalnız kaplama; ortak Elçi sayfası değiştirilmez.

## Sancak

Sahne ve seçicilerde gerçek 3:5 sprite kutusu. Normal kumaşın arma merkezi %60/%40; dar flama %58/%40,5. Önizleme 180 px, kumaş vitrini 124 px, renk vitrini 84 px, bağımsız arma 64×64. Uzun birlik adı ve düstur HTML akışındadır. İttifak lider profiliyle aynı arma/sancak kaydını kullanmaya devam eder.

## Mekanik sınırı

Oyun motoru, pact/rivals/profile kuralları ve kayıt şeması değişmedi. `alliance-panel.tsx` yalnız üç taç ikonunu defneyle değiştirir. Kuruluş validasyonu, davet, rütbe, görev ödülü, genelge okunması/gönderimi, diplomasi, dağıtma/ayrılma ve sancak kaydet/vazgeç mevcut handlers ile çalışır. HUD dosyaları ve assetleri değişmez.

## Kabul

360/390/430 px gerçek oyun; normal ve %130 yazı. Arşiv, kuruluş/katılma, bütün yönetim sekmeleri, sancak editörü ve yapay birlik üyeliğini kontrol et. Taşma/çakışma varsa tamamlandı diye raporlama. Gerçek kanıtlar `mockups/register-*.webp` içindedir; validation raporu `ARCHIVE-ALLIANCE-VALIDATION.md`.
