# Ferman defteri ve saray düğmeleri — 8 Ekim 2026

Sürüm: 0.65.0. Profil için ana görsel dil `PROFILE-DESIGN-MEMORY.md` içinde; görevler için bu belge onun devamıdır. Üst ve alt HUD kabul edilmiştir, değiştirilmez. Görev koşulları, ödülleri, kayıtları ve yönlendirmeleri görsel çalışma kapsamı dışındadır.

## Başlık düğmeleri

`app/styles/47-court-controls.css`, profil, ayarlar, sürüm arşivi, ittifak ve görev başlıklarında eski esnetilmiş başlık atlasının yerine geçer. Önceki bellekteki başlık resminin içinde düğme kullanımı bu beş sayfada geçerli değildir. Ceviz başlık ve altın çerçeve ayrı; geri/çarpı ayrı `approved-court/back.webp` ve `close.webp` görselleridir. Düğme alanı kare, 48–64 px; görsel `cover` ile kendi oranını korur. Başlık düğmeden 8 px daha yüksek, metnin iki yanında düğme genişliği +12 px boşluk bulunur. Mevcut tıklama, erişilebilir ad ve odak davranışı korunur.

## Görevler

`app/styles/48-mandates-register.css` yalnız `.bp-objectives` alanına uygulanır. Sıcak parşömen, koyu ceviz, eskitilmiş altın, seçili sekmede koyu kırmızı; başlıklarda paketli Tinos, içerikte Georgia. Avrupa kral tacı kullanılmaz: başarımlar için mevcut altın defne sanatı kullanılır.

- Şehir hedefi: divan sahnesi, ceviz Fermanlar ve görevler bandı, üç sekme, yuvarlak bölüm mühürleri, resimli ferman ve altın eylem düğmesi.
- Günlük: giriş hediyesi, telefonda 4+3 gün mührü, resimli görev kartları ve saltanat mevsimi. Geniş ekranda yedi gün yan yana.
- Başarımlar: telefonda iki, geniş ekranda üç sütun; ayrı ad plakası, açıklama, alt alta ilerleme etiketi/değeri ve ödül. Sayılar resme ya da başlığa bindirilmez.

Metinler normal akışta tutulur. Ödül sayıları ve sekme bildirimleri gerçek veridir. Düğmeler en az 48 px yüksekliğinde, bölüm mühürleri 48×48 px. İkinci kaynak araç çubuğu görevlerde gizlenir; kabul edilen HUD kaynağı korunur. Alt sayfa maskesi, sabit navigasyon arkasındaki haritayı kapatır.

## Kontrol ve örnekler

`MANDATES-VALIDATION.md` kontrol kapsamını içerir. `docs/mockups/mandates-{city,daily,achievements}-{top,bottom}.webp` gerçek mobil oyun görüntüleridir. Yeni görev düzeni için eski uygulama kartlarına dönülmez. Bir sonraki sayfa da bu malzeme ve metin akışı kurallarını kullanır.
