# Payitaht Adaları

Osmanlı/Akdeniz esintili, mobil için tasarlanmış tek oyunculu bir şehir kurma
oyunu. Sahilhisar şehrini kur, kaynaklarını yönet, halkını memnun et ve ilimle
geliş. İzometrik harita Phaser ile çizilir; oyun mantığı (ekonomi, inşaat
sırası, işçiler, ordu, araştırma, kayıt/göç) saf TypeScript ile ayrık tutulur.

Oyunun tamamı **`payitaht/`** dizinindedir (Next.js).

## Geliştirme

```bash
cd payitaht
pnpm install
pnpm dev            # http://localhost:3000
```

- `pnpm exec tsc --noEmit` — tip kontrolü
- `pnpm exec tsx --test $(find lib -name '*.test.ts')` — testler
- `node tools/tiled/validate-map.mjs` — Tiled harita + slot doğrulaması
- `/map-debug` — canlı oyundan bağımsız slot/terrain doğrulama ekranı

## Şehir haritası

Şehir slotları Tiled uyumlu bir haritadan (`payitaht/maps/payitaht/`) türetilir
ve oyunun okuduğu `city-slots.json` ile senkron tutulur (CI doğrular). Belediye
(city_hall) merkezde çakılıdır; 24 taşınabilir kara slotu, 6 kıyı ve savunma
temeli aynı geometriyi paylaşır. Ayrıntı: `payitaht/maps/payitaht/README.md`.

## Yayın

`main`'e her giriş, oyunu GitHub Pages'e otomatik yayınlar
(`.github/workflows/deploy.yml`): statik export, Pages kökünde
`https://ashina61.github.io/gameofashina/`.
