# Ayarların dört defteri — 0.63.0 / SW71

Profilin onaylı malzemeleri `PROFILE-DESIGN-MEMORY.md` içindedir. Ayarlar aynı ceviz, yaşlanmış altın, al aktif sekme ve sıcak parşömeni kullanır. Avrupa tacı, modern cam panel ve yuvarlak uygulama kartı kullanılmaz.

## Uygulama

`app/styles/44-settings-chambers.css` yalnız `.bp-settings` kapsamındadır. Shell bu sınıfı yalnız Ayarlar açıkken ekler. Mevcut sahne ve `--royal-*` / `--profile-*` boyalı assetleri yeniden kullanılır; canlı metin resme gömülmez. Başlıkta atlas zaten geri/kapat ikonları içerir; ikinci ikon eklenmez. Üst ve alt HUD dosyaları, resimleri ve ölçüleri korunur. Alt HUD arkasındaki şehir yalnız bu sayfa açıkken parşömenle örtülür.

Başlıklar gömülü Tinos Bold (`Payitaht Profile Roman`), açıklamalar Georgia. Sekmeler en az 48 px, ayar satırları 68 px; anahtarlar 86×44 px. Açıklamalar 13–15 px ve 1.4–1.5 satır yüksekliğiyle akışta kalır. Bölüm araları 18–20 px. Defter genişliği %100, kenar boşluğu %3. Başlıklar ceviz ve altın; içerikte iç içe kart yerine ince satır çizgileri kullanılır.

Tercihler: ses ve görünüm grupları; hafif modun üç seçeneği tam genişlikte ayrı satır. Cihaz: bildirimler, kurulum ve çevrimdışı durumu; iki kolonlu okunaklı durum sicili. Kayıt: dışarı/içeri aktar için 84 px eylemler, ayrı yeni oyun onayı. Bilgi: mühürlü sürüm levhası, iki kolonlu oyun bilgileri ve mevcut arşiv/rapor düğmeleri.

## Mekanik sınırı

`settings-panel.tsx` yalnız sekme resimlerinin kapatılması ve sürüm görselinin mühür yapılmasıyla değişti. RoyalPreferences, kayıt formatı, durum, callbacks, doğrulama ve silme/yedekleme akışları aynı kalır. Klavye sekme gezinmesi korunur. Yeni oyun onayı atlanmaz; bildirim izinleri tasarım uğruna değiştirilmez.

## Kontrol

Gerçek ekranlar `mockups/settings-chambers-*.webp`. 360/390/430 px genişlik ve normal/%130 yazıda taşma, kesilme, küçük kontrol ve çakışma kontrolü yap. Alt bar arkasından şehir görünmemeli. Altı anahtar, hafif mod, tempo, yedek indirme, geri yükleme girdisi, yeni oyun onayı/vazgeç ve arşiv test edilir. HUD öncesi/sonrası geometrisi aynı kalmalıdır.
