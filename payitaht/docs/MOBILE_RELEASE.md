# Payitaht mobil geliştirme ve yayın durumu

Bu dal görsel yenileme ve yerel mobil proje temeli içerir; App Store'a
imzalanmış veya gönderilmiş bir sürüm değildir. Oyun hâlâ tek oyunculudur.
Gerçek oyuncular arası ticaret, savaş, ittifaklar, hesap/bulut kaydı ve
çoklu şehir sunucusu bu çalışmayla eklenmedi. Mevcut ekonomi/ilerleme
süreleri kısa test değerlerini kullanır; uzun vadeli denge testi gerekir.

## Çalıştırma

Node 22 veya üzeri ve npm kullanılır. Bu uygulamanın bağımsız kilit dosyası
`payitaht/package-lock.json` dosyasıdır; kökteki Phaser uygulaması değişmez.

```sh
cd payitaht
npm ci
npm run dev
npm test
npm run build:mobile
npx playwright install chromium
npm run test:mobile
npm run mobile:sync
npm run mobile:ios
npm run mobile:android
```

`mobile:sync` web çıktısını `out/` içine derler ve iki yerel projeye kopyalar.
Xcode projesi `ios/App/App.xcodeproj`, Android projesi `android/` altındadır.
Yerel paket uzak bir site yüklemez; web kodu ve görseller pakete dahildir.
Capacitor entegrasyonu: https://capacitorjs.com/docs/getting-started

## Doğrulama kapsamı

- Ekonomi, zaman ilerlemesi, inşaat, araştırma, kayıt göçü ve arsa testleri.
- Üretim web derlemesi ve iki native projeye başarılı Capacitor sync.
- Mobil tarayıcı testi: 320, 390, 430 ve 768 px; dokunma boyutları,
  paneller, bina seçimi, yükseltme, kayıt sonrası devam, çevrimdışı açılış.
- Native Xcode/Gradle derlemesi, fiziksel iPhone/Android performansı ve
  mağaza incelemesi bu Linux çalışma ortamında doğrulanmadı.

## Yayından önce tamamlanacaklar

1. Paket kimliği `com.ashina.payitaht` geliştirici hesabında doğrulanmalı;
   Apple takım/imza/provisioning ve Android release keystore ayarlanmalı.
2. Xcode ve Android Studio ile gerçek cihaz kurulumu: çentik/güvenli alan,
   yaşam döngüsü, düşük bellek, 30 dakika pil/ısınma ve FPS ölçümü.
3. Yedek dosyası indirme/yükleme mobil tarayıcı içindir. Native WebView'de
   dosya paylaşımı cihazda test edilmeli; gerekirse Filesystem/Share adaptörü
   eklenmeli. Cihazda kayıt vardır; uygulama silinirse kayıp riski sürer.
4. Destek adresi, gizlilik politikası, yaş derecelendirmesi, veri beyanları
   ve gerçek cihaz ekran görüntüleri tamamlanmalı. Bunlar uydurulmadı.
5. Ekonomi ve ilerleme dengesi oyuncu testinden geçirilmeli; henüz olmayan
   çok oyunculu özellikler mağaza açıklamasında vaat edilmemeli.

Bu adımlar tamamlanmadan “App Store'a hazır” veya “üretim kalitesi
onaylandı” denmemeli. Otomatik workflow yalnızca test ve artifact üretir;
mağazaya veya canlı siteye dağıtım yapmaz.
