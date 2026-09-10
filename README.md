# Ancient City

Antik cag temali, **Phaser 3 + TypeScript + Vite** ile gelistirilen 2D mobil strateji
oyunu. Bu ilk asamada oyun tek bir sahneden olusur: **sehir sahnesi**. Oyuncu
izometrik bir harita uzerinde bina kurar, kaynak uretir ve nufusunu yonetir.

> Multiplayer, backend ve hesap sistemi bilincli olarak kapsam disidir. Tum durum
> tarayicidaki `localStorage` uzerinde tutulur.

## Hizli baslangic

```bash
npm install
npm run dev        # http://localhost:5173 (ag uzerinden telefondan da acilir)
```

| Komut | Aciklama |
| --- | --- |
| `npm run dev` | Gelistirme sunucusu (hot reload, LAN uzerinden erisilebilir) |
| `npm run build` | Tip kontrolu + uretim derlemesi (`dist/`) |
| `npm run preview` | Uretim derlemesini yerelde sunar |
| `npm run typecheck` | Yalnizca TypeScript tip kontrolu |
| `npm run lint` | ESLint |

Telefonda denemek icin `npm run dev` ciktisindaki `Network:` adresini ayni
Wi-Fi agindaki cihazin tarayicisinda ac.

## Kontroller

Oyun mobil oncelikli tasarlandi; masaustunde fare ve klavye ile de oynanir.

| Jest | Sonuc |
| --- | --- |
| Tek dokunus | Karo/bina secer, insa modunda binayi yerlestirir |
| Tek parmak surukleme | Haritayi kaydirir |
| Iki parmak sikistirma | Yakinlastirir / uzaklastirir |
| Fare tekerlegi | Yakinlastirir (masaustu) |
| Ok tuslari | Haritayi kaydirir (masaustu) |

Kaydirma ile dokunus birbirinden ayrilir: parmak 12 pikselden fazla hareket
ederse jest kaydirma sayilir ve bina yerlestirilmez.

## Oyun dongusu

1. **Insa et.** Alt menuden bir bina sec, haritada uygun bir karoya dokun.
   Karsilanamayan maliyetler kartta kirmizi gosterilir.
2. **Bekle.** Her binanin bir insa suresi vardir; bu sirada bina soluk gorunur
   ve altinda ilerleme cubugu bulunur.
3. **Uret.** Tamamlanan binalar dakikada kaynak uretir.
4. **Dengele.** Uretim binalari isci ister, isciler nufus kapasitesinden gelir
   (evler saglar) ve her isci yiyecek tuketir. Isci yetersizse tum uretim ayni
   oranda duser; depoda yiyecek bitmisse verim ayrica yarilanir.

Oyun kapaliyken gecen sure acilista telafi edilir (en fazla 8 saat).

## Mimari

Kod, **oyun mantigi** ile **sunum** katmanlarini ayiracak sekilde bolundu.
Sistemler Phaser'a bagimli degildir; sahneler ise kural bilmez, yalnizca
sistemleri cagirir ve sonucu cizer. Aralarindaki tek bag tip guvenli bir
olay veri yoludur (`EventBus`).

```
src/
├── main.ts                  Giris noktasi: Phaser ornegini kurar
├── config/                  Denge ve yapilandirma verisi (kod degil, veri)
│   ├── Constants.ts         Karo olculeri, tick araliklari, zoom sinirlari
│   ├── BuildingCatalog.ts   Bina tanimlari tablosu
│   └── GameConfig.ts        Phaser yapilandirmasi, baslangic kaynaklari
├── core/                    Phaser'dan bagimsiz oyun cekirdegi
│   ├── GameWorld.ts         Durum + sistemleri bir arada tutan kok nesne
│   ├── GameState.ts         Kaynaklar, binalar, izgara
│   ├── GridMap.ts           Prosedurel zemin uretimi ve isgal takibi
│   ├── SaveManager.ts       localStorage okuma/yazma ve dogrulama
│   └── EventBus.ts          Tip guvenli olay yayinlayici
├── systems/                 Oyun kurallari
│   ├── ResourceSystem.ts    Harcama, ekleme, depo siniri
│   ├── BuildingSystem.ts    Yerlestirme kurallari, yikma
│   └── EconomySystem.ts     Insaat sayaclari, isci dagilimi, uretim
├── scenes/                  Phaser sahneleri
│   ├── BootScene.ts         GameWorld'u kurar ve registry'e koyar
│   ├── PreloadScene.ts      Dokulari uretir
│   ├── CityScene.ts         Harita ve binalarin cizimi, dokunmatik girdi
│   └── UIScene.ts           Ayri kamerada calisan arayuz katmani
├── render/                  Cizim yardimcilari
│   ├── TextureFactory.ts    Tum dokulari calisma zamaninda uretir
│   ├── BuildingView.ts      Bir binanin gorsel temsili
│   └── PlacementPreview.ts  Insa modundaki hayalet bina
├── input/
│   └── CameraController.ts  Kaydirma, pinch-zoom, tap ayrimi
├── ui/                      Arayuz bilesenleri (ResourceBar, BuildMenu, ...)
├── utils/                   Izometrik donusumler ve bicimlendiriciler
└── types/                   Paylasilan tip tanimlari
```

### Neden bu ayrim?

- **Sistemler test edilebilir.** `EconomySystem.tick(60)` cagrisi tarayici
  olmadan da anlamlidir; ekrana bagli degildir.
- **Arayuz degistirilebilir.** `UIScene` tamamen yeniden yazilsa oyun kurallari
  degismez, cunku iletisim yalnizca `EventBus` uzerinden yurur.
- **Denge veriden gelir.** Bina eklemek/degistirmek icin `BuildingCatalog.ts`
  yeterlidir; menu, uretim ve gorsel bu tablodan uretilir.

### Varliklar

Projede ikili gorsel dosya yoktur. Karolar, binalar ve arayuz panelleri
`TextureFactory` icinde `Phaser.Graphics` ile cizilip dokuya cevrilir. Bir
binanin rengi katalogdaki `tint` alanindan gelir.

## Yeni bina eklemek

`src/config/BuildingCatalog.ts` icindeki listeye bir kayit eklemek yeterli:

```ts
{
  id: 'temple',                       // types/index.ts icindeki BuildingId'e de ekle
  name: 'Tapinak',
  description: 'Sehre saygınlık katar.',
  category: 'civic',
  size: 2,
  cost: { stone: 200, gold: 50 },
  buildTime: 45,
  production: { gold: 6 },
  workers: 4,
  allowedTerrain: ['grass', 'soil'],
  tint: 0xd9c7a0,
}
```

Doku, insa menusu karti, maliyet kontrolu ve uretim otomatik olarak devreye
girer.

## Kayit

Durum 15 saniyede bir, ayrica her insa/yikma isleminde ve sekme arka plana
alindiginda `ancient-city:save:v1` anahtarina yazilir. Kayit surumu
degistiginde (`SAVE_VERSION`) eski kayitlar reddedilir. Sifirdan baslamak icin
tarayici konsolunda:

```js
localStorage.removeItem('ancient-city:save:v1'); location.reload();
```

## Yol haritasi

Bu asamanin disinda birakilanlar: bina seviyeleri, arastirma agaci, birimler ve
savas, gorevler, ses. Multiplayer/backend ise ayri bir asama olarak
degerlendirilecek.
