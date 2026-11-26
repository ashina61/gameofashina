# Mobil karar ekranları — 26 Kasım 2026

Bu çalışma 0.137 üzerine hazırlanmış, henüz yayımlanmamış taslak değişikliktir. Sürüm ve servis çalışanı önbelleği yayın kabulünden önce artırılmalıdır.

## Uygulanan değişiklikler

- İlk oturum rehberi Divanhane 5 olduğunda erken kapanmaz. Rehber adımları ödülleri alınana kadar görünür; tüm adımlar alındığında kapanır. İki regresyon testi eklendi.
- Araştırma defterinde açık/aktif konular önce gelir. Kilitli ve keşfedilmiş konular ayrı açılır bölümde, mevcut koşullarıyla erişilebilir. Dal değişince ana kart başa döner.
- Kışla ve tersane açık birlikle başlar. Kilitli birlikler ayrı bölümde koşullarıyla listelenir. Kilitli birliği seçmek eğitim kartını görünür yere getirir ve klavye odağını karta taşır. Eğitime ilişkin motor kontrolleri aynen çalışır.
- Elçi sayfasında defterler dekoratif sahneden önce gelir. Sahne ve hükümdarlar altındaki ittifak üyelik listesi açılır ayrıntıya taşındı.
- Play yayın belgesinin eski sabit sürüm örneği kaldırıldı.

## Doğrulama ve kabul kapısı

399 birim testi geçti (iki yeni rehber testi dahil). TypeScript, ESLint, CSS ve V2 kontrolleri ile statik derleme uygulanır. Son sonuçlar PR açıklamasına kaydedilir.

Bu ortamda telefon tarayıcı denetimi tamamlanamadı: `/usr/bin/chromium` hedefi `/opt/codex/browsers/chromium` bulunmuyor. Playwright'ın resmi Chromium indirmesi HTTP 403 ile engellendi. Dolayısıyla yeni ekran görüntüsü, kaydırma azalması yüzdesi veya fiziksel Android kabulü iddia edilmez. Bu yüzden değişiklik yayın için hazır sayılmaz.

Yayın öncesi gerekli kabul:

1. `node tools/layout-qa.cjs`: küçük telefon ve büyük yazı durumlarında taşma/dokunma hedefleri.
2. `DESIGN_PHASE=decision-pass node tools/mobile-design-audit.cjs`: Araştırma, Kışla, Tersane ve Elçi gerçek ekranları.
3. Araştırmada kilitli/tamamlanmış konu açma, dal değiştirme; orduda kilitli birlik seçimi ve açık birliğe dönüş; Elçi sekmelerinde ana eylemlerin erişilebilirliği.
4. Kayıtlı oyunda ve yeni oyunda rehber; gerçek Android geri tuşu ve ekran altı güvenli alan.

## Sonraki kapsam

Bütün oyunun sanat yenilemesi bu değişiklik değildir. Şehir/bina uyumu, savaş sonucu açıklaması, ilk 15 dakika hedefleri ve uzun vadeli ekonomi ayrı kabul gerektirir. Ana ekranı yalnız küçültmek yerine her ekran için özet, ana karar ve isteğe bağlı ayrıntı sırası kullanılmalıdır.
