# G11 — Açılış ve uygulama kimliği

Yeni boyalı kıyı arka planı ve yazısız logo plaketi başlık ekranına bağlandı.
Payitaht Adaları adı plaket merkezinde erişilebilir HTML metnidir. Mevcut
Saray/Divan/Liman/gemi kolajı korunur. Üç kaynak çizimden web 192/512,
Apple 180, açık/koyu 32 px, SVG favicon ve 26 Android ikon/splash kopyası
hazırlandı. Adaptive foreground %66 merkez alanındadır; ana kapı yuvarlak
maskede kesilmez. Yerel splash tuvalleri mevcut boyutlarında kaldı.
Android 12+ açılış teması ve Capacitor zemini aynı görsel kimlikle bağlandı.
SW v40 yeni açılış dokularını ve Apple ikonunu önbelleğe alır.

Tarifler tools/art/prompts/g11.md; 360×740, 390×844 ve 1280×800 yeni/devam
başlık ekranlarının öncesi/sonrası ile ikon boyut/maske önizlemesi buradadır.

TypeScript, 319 test, ESLint, CSS, kullanılmayan görseller, yarı boy kopyalar,
V2 ölçütleri, web ve yerel statik dışa aktarım, Capacitor Android sync/doctor
ve platform PNG/XML doğrulaması geçti. 390×844 sahne taramasında sayfa ve
eksik görsel hatası yok. İlk sekiz rehber hedefi 5.3 oyun dakikasında geçti.
Telefon görsel paketi 14.791.003 / 15.000.000 bayt.
Android doğrulaması dışa aktarım, kaynaklar ve Capacitor senkronizasyonudur;
APK derleme/emülatör koşusu bu aşamanın kontrol kanıtları arasında değildir.
Son 360×740 ve %130 yazı taraması: taşma, kesik yazı, küçük kontrol,
minik yazı, çakışma ve isimsiz kontrol sıfır; sayfa hatası yok.
