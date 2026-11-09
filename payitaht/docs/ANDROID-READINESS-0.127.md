# Android öncelikli mağaza hazırlığı — 0.127.0

Kaynak: Payitaht_Magaza_Analizi_2026-11-08.md. Kullanıcı Android'i ilk hedef olarak belirledi. Tarih: 9 Kasım 2026.

## Bu dilimde yapılanlar

- P0: Orman/maden defteri açıkken alttaki ada görünmez; kâğıt görseli yüklenmese de opak zemin okunabilir kalır. Görünüm kapanınca ada geri gelir; kamera korunur.
- HUD: Kaynaklar 3 sütun × 2 sıra; miktarlar 15 px, üretim 11 px; kaynak ve danışman hedefleri en az 44 px. Mevcut ahşap, portre, arma ve alt menü sanatı kullanılır. %130 yazıda başlık yüksekliği büyür.
- Gezinme: Orman → ada → şehir geri zincirinde ara katman kapanınca geçmiş kaydı yeniden kurulur.
- Bildirim: Capacitor Proxy'sini async dönüş değeri olarak kullanmak, olmayan bir then çağrısı üretiyordu. Artık modül döndürülür; desteklenmeyen tarayıcı ortamı güvenle atlanır.
- Yedek: Android sistem dosya kaydetme ekranı (ACTION_CREATE_DOCUMENT) açılır. İptal sessizdir; başarı yalnız yazma tamamlanınca bildirilir. Web paylaşma/indirme yolu sürer. Geniş depolama izni yoktur.
- Paket: APK ve AAB build:android kullanır. Tam boy boyalı binalar yalnız Android dışa aktarımından çıkarılır; tüm -sm karşılıkları silmeden önce doğrulanır. Kaynak sanat ve parcel-v7 korunur.
- Sürüm: Android versionName package.json'dan gelir; farklı override reddedilir. Varsayılan versionCode major×1000000 + minor×1000 + patch, Play için daha yüksek açık override mümkündür.
- Gizlilik: Yerel kayıt, bildirim, hata günlüğü, dışa aktarma, Android cihaz yedeği ve silme davranışı public/privacy.html'de açıklanır; ayarlardan bağlantı vardır.

- İlk 10 dakika rehberi bina seçiliyken de çalışır. İlk inşaat/yükseltme doğrudan doğru binanın önizlemesine, ilk âlim ataması Medrese'nin yönetimine yönelir. İnşaat sürerken bekler; ödül için önizlemeyi kapatmayı gösterir.
- Ada ormanının harita çizimi 44 px yüksekliğe çıkarıldı. Profil QA sabit bir varsayılan ad yerine kayıttaki hükümdarı ve kalıcı HUD'u doğrular.

## Doğrulama ve sınırları

Yerel ortam kesilmeden önce: 383 test/0 hata, TypeScript/ESLint/CSS kontrolleri ve V2 bütçeleri geçti. Native statik dışa aktarım üretildi. 114 tam boy görsel çıktıdan kaldırıldı: 30.68 MiB. Bu çıktı farkıdır; APK boyutu veya RAM ölçümü değildir.

360×740, 390×844, 430×932 ve 390×844/%130 yazı ile ilk Android web arayüzü regresyonu geçti. Gerçek ekran görüntüleri incelendi. Daha sonra eklenen ikinci geri tuşu regresyonu ve son değişiklikler PR CI'da yeniden çalıştırılır. Çalışma ortamının kapanması nedeniyle yerel tam layout taramasının son sonucu yakalanamadı.

PR Android Release Check: pnpm check, V2 bütçeleri, native export, dört telefon/yazı senaryosu, tam layout taraması, Capacitor sync, Java 21/SDK36, R8 release AAB ve debug APK. Sonuç için ilgili PR çalışmasını esas al; yalnız başarılı bir iş derleme kanıtıdır. Üretilen AAB imzasızdır; Play yükleme dosyası değildir. Tarayıcı testleri Android WebView/fiziksel cihaz testinin yerine geçmez.

### İlk uzak Android derleme kanıtı

2689e2410ca813645dc78e3bf7becb1bbe11e3b5 için [Android Release Check #114](https://github.com/ashina61/gameofashina/actions/runs/42710164626) başarıyla tamamlandı: 383/383 test; tip/ESLint/CSS/V2 kontrolleri; gerçek %130 HUD büyütmesi dahil dört native export senaryosu; iki tur tam layout taramasında tüm ihlaller 0; Java/R8 release AAB ve debug APK. Sonradan eklenen rehber/orman/QA düzeltmelerini ilgili yeni PR çalışması tekrar doğrular.

## Açık işler — Android yayını için sıradaki kapılar

1. Gerçek Android cihaz: yedeği dosyaya yaz/iptal/aynı dosyayı geri yükle; uygulamayı tamamen kapatıp aç; orman → ada → şehir geri zinciri; bildirim izin ver/reddet; uzun kullanım ve arka plandan dönüş.
2. Şehir görselleri: zemin netliği, bina karakteri/arsa uyumu, kıyı ve surların bütünlüğü. Bu dilimde sanat onayı verilmedi.
3. İlk 10 dakika: yeni oyuncunun yardım almadan ilk yapı, işçi, kaynak ve hedef akışını tamamlamasını ölç. D1/D7 geri dönüşü ve ekonomi dengesini gerçek oynanışla doğrula.
4. Performans: düşük/orta Android cihazda açılış, FPS, bellek/ısı ve oturum sürekliliği; AAB indirme boyutunu Play Console'da ölç.
5. Yayın: geliştirici kimliği/destek bilgisi, HTTPS gizlilik adresi, Data safety ve yaş/hedef kitle beyanı, tüm sanat/müzik lisans kaydı, imzalı AAB, internal test. İmzalama anahtarına dokunulmadı.
6. iOS bu dilimin dışında. Android kabulünden sonra ele alınır.

Tüm rapor bitmiş, mağaza onayı alınmış veya canlı yayın yapılmış değildir.
