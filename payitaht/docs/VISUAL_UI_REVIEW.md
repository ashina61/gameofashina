# Görsel UI düzenlemesi

Temel: `6c044c2fc2165064a56c7da20a9ee4608fbb0a54` — güncel
`claude/ancient-city-phaser-game-r9e0qu` dalı. Kapsam yalnızca sunum ve gezinme.

## Görsel değişiklikler

- Mevcut boyalı ikonlarla dört ana kaynağın aynı anda görüldüğü kaynak alanı;
  nüfus, ada kaynağı ve hamle puanı ikinci satırda. Küçük ekranlarda yatay kaydırma gerektirmez.
- Koyu ahşap, eskitilmiş altın, parşömen ve yeşil eylem düğmelerinden ortak bir tema.
- Bina sayfalarında sivil, askerî, ilim ve denizcilik yapılarına uygun sahne renkleri;
  mevcut bina resimleri ve üç görsel gelişim aşaması korunur.
- Araştırma kartlarında kilitli, tamamlanmış ve süren araştırmalar için ayrı görsel durumlar.
- Bina kataloğunda iki sütunlu resimli kartlar; alt menüde seçili sayfa vurgusu;
  yuvarlak harita kontrolleri ve daha sade tablolar.
- Şehirde yalnızca mevcut kuyrukları okuyan açılır faaliyet özeti ve mevcut göreve kısayol.
  Yeni görev, kuyruk, bonus veya ödül hesabı eklenmedi.

## Kapsam kontrolü

`lib/game/`, `hooks/`, `public/` ve Phaser şehir renderer'ı temel commit ile aynıdır.
Ekonomi, maliyetler, süreler, savaş, araştırma koşulları ve kayıt biçimi değiştirilmedi.
Önceki çalışmadaki inşaat iptali, yedek yükleme ve motor değişiklikleri bu dalda yoktur.

## Doğrulama

- TypeScript ve `/gameofashina` alt yolunda statik üretim derlemesi.
- Mevcut motor testleri: 197 / 197 geçti.
- `tools/visual-ui-qa.cjs`: 320, 390, 430 ve 1280 px; DPR 2.
  Şehir, Divanhane, Kışla, Medrese, araştırma, profil, dünya ve bina kataloğu.
- Görsel kontrol yeni inşa/araştırma komutu vermeden gerçekleştirilir.
- Tarayıcı sonuçları ve gerçek ekran görüntüleri: `visual-review/`.

Tekrar üretmek için:

```sh
STATIC_EXPORT=1 NEXT_BASE_PATH=/gameofashina NEXT_PUBLIC_ASSET_BASE=/gameofashina pnpm build
node tools/visual-ui-qa.cjs
```

Playwright ve Chromium gerekir. İsteğe bağlı yerel tarayıcı yolu:
`PLAYWRIGHT_CHROMIUM_EXECUTABLE`.
