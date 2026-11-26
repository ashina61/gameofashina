# Mobil karar ekranları — 26 Kasım 2026

0.138.0 / SW163 yayın adayı. Yayın durumu PR #101 ve Deploy çalıştırması üzerinden izlenir.

## Uygulanan değişiklikler

- İlk oturum rehberi Divanhane 5 olduğunda erken kapanmaz. Rehber adımları ödülleri alınana kadar görünür; tüm adımlar alındığında kapanır. İki regresyon testi eklendi.
- Araştırma defterinde açık/aktif konular önce gelir. Kilitli ve keşfedilmiş konular ayrı açılır bölümde, mevcut koşullarıyla erişilebilir. Dal değişince ana kart başa döner.
- Kışla ve tersane açık birlikle başlar. Kilitli birlikler ayrı bölümde koşullarıyla listelenir. Kilitli birliği seçmek eğitim kartını görünür yere getirir ve klavye odağını karta taşır. Eğitime ilişkin motor kontrolleri aynen çalışır.
- Elçi sayfasında defterler dekoratif sahneden önce gelir. Sahne ve hükümdarlar altındaki ittifak üyelik listesi açılır ayrıntıya taşındı.
- Play yayın belgesinin eski sabit sürüm örneği kaldırıldı.

## Doğrulama

0.138.0 / SW163. Eksik Chromium, npm üzerinden kurulan izole test tarayıcısıyla çözüldü; oyun bağımlılıklarına eklenmedi. Fontconfig sistem yazı tiplerine bağlandı. Her ekran boyutu ayrı tarayıcı süreciyle sınanır.

- 399 birim testi geçti. TypeScript, ESLint, CSS lint/unused strict ve V2 ölçütleri geçti.
- 360/390/430 × 740 ekranlarda araştırma ve eğitim düğmeleri ilk görünümde, en az 44px hedefle doğrulandı.
- Kilitli araştırma/birlik seçimi, karta odak, dal değişiminde başa dönüş, gerçek asker eğitimi ve kuyruk oluşumu, Donanma sekmesi ve hükümdar açma geçti.
- 360×740 normal ve %130 yazıyla sayfa/bina/önizleme düzen taraması uygulanır. Nihai rapor `docs/qa/mobile-0138/layout-report.json` içinde.
- 29 durumluk mobil taramada HTTP kaynak hatası ve JavaScript sayfa hatası yok. Sabit görsel yollarında eksik dosya yok. Dinamik kaynaklar açılan ekranlarda tarandı; bu bütün oyun durumlarında tüm görsellerin kabulü anlamına gelmez.
- Gerçek ekran kanıtları `docs/qa/mobile-0138/`; yeni çizim veya model değildir.

## Son düzen düzeltmeleri

Araştırma önerisi kartın altına, gelecek araştırmaları açılır bölüme taşındı. Boş eğitim kuyruğu ve tekrar eden Birlikler başlığı ana eğitim kararından önce yer kaplamaz. Garnizon özeti korunur, ayrıntılı hesap eğitimden sonra gelir. Elçide hükümdar satırları portre, şehir/hükümdar ve adı açık ilişki puanı olarak hizalanır; boş anlaşma satırı kalkar.

Yayın dalı 32 geliştirme commit'i geride bulundu; PR #101 biriken 0.127–0.138 değişikliklerini yayın dalına taşımak üzere hedeflendi. Yerel testler fiziksel Xiaomi/Android GPU ve mağaza kabulü yerine geçmez.

## Sonraki kapsam

Bütün oyunun sanat yenilemesi bu değişiklik değildir. Şehir/bina uyumu, savaş sonucu açıklaması, ilk 15 dakika hedefleri ve uzun vadeli ekonomi ayrı kabul gerektirir. Ana ekranı yalnız küçültmek yerine her ekran için özet, ana karar ve isteğe bağlı ayrıntı sırası kullanılmalıdır.
