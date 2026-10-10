# İnşa/arsa doğrulaması — 0.85.0

- 345 motor testi geçti (node --import tsx --test; tsx CLI ortamın Unix socket kısıtı nedeniyle kullanılamadı).
- TypeScript, sıfır uyarılı ESLint, CSS lint/kullanılmayan sınıf kontrolü, V2 ölçütleri ve küçük bina/dekor görsel kontrolü geçti. Temiz statik üretim derlemesi başarılı.
- 360/390/430 px ve 360 px %130 yazı: katalog, Türkçe arama, Tümü/Kurulu/Yeni, boş arama, açılır ayrıntılar, kara/deniz/korsan arsaları. Eksik kaynak/araştırma/yapı, dolu ve mevcut kuyruk, en yüksek seviye, dolu şehir ve koloni durumu denendi.
- Gerçek Saray inşa emri seçilen 6 numaralı arsaya yerleşti. Gösterilen 320 akçe/330 kereste düştü; iş sırasındaki süre 15 saniye. Ayrıntıyı açmak emir vermez; inşa ayrı düğmedir. Surlar arsa listesinde yok; kayalık yalnız Korsan Kalesi. Kolonide Saray engellenir.
- Ana tur 128 ölçüm; görünür kontrollerde sorun yok. Base UI Progress'in 1×1 px, clip-path inset(50%) ile bilerek gizlediği role=presentation “x” ölçüm işareti ilk taramada metin kesilmesi sayıldı; kaynak kodu doğrulandı ve yalnız bu görünmez işaretler raporda açıkça hariç tutuldu. Diğer sonuçlar aynen korunur.
- Temiz derleme sonrası 35 ilave ölçüm (sıfır sorun) construction-qa-report.json finalChecks bölümünde. Üretimde yüklenen gerçek recruit-button atlası ve 18 px eylem başlığı tarayıcıda doğrulandı; %130 turunda 23,4 px. Son ekran resimleri docs/mockups/construction-*.webp.
- Genel tools/layout-qa.cjs taraması: taşma 0, kesik 0, küçük 322, minik 667, çakışma 70, isimsiz 0, sayfa hatası 0. İnşa kataloğu iki turda sıfır; kalan uyarılar mevcut HUD/diğer sayfalardadır. Genel tarama bu nedenle çıkış 1; oyunun tamamı kusursuz diye raporlanmaz.

Motor, bedeller, süreler, kayıt şeması, arsa koordinatları ve HUD değiştirilmedi. Katalog/arsa sunumu, yeni kısa sahne ve ortak kontrol görselleri yenilendi.
