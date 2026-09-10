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
4. **Buyu.** Evler nufus KAPASITESI acar; vatandaslar depoda yiyecek varken
   dakikada birkac kisi olarak gelir ve kapasite dolunca durur. Kapasite
   vatandas demek degildir - ev dikmek is gucunu aninda vermez.
5. **Dengele.** Vatandaslar uretim binalarina KURULUS SIRASIYLA dagitilir:
   erken kurulan bina once dolar. Kadrosu eksik bina orantili olarak az
   uretir (3/4 isci = 3/4 uretim), tum sehir birden yavaslamaz.
6. **Doyur.** Sehirde yasayan HERKES yiyecek tuketir - calissin veya
   calismasin. Yiyecek bitince vatandaslar sehri terk etmeye baslar; bina
   veya seviye kaybi olmaz ve yiyecek gelince nufus yeniden buyur.

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
│   ├── GameState.ts         Kaynaklar, binalar, nufus, izgara
│   ├── GridMap.ts           Prosedurel zemin uretimi ve isgal takibi
│   ├── Simulation.ts        Tik sayacini ilerleten TEK yer (orkestrator)
│   ├── SimulationClock.ts   Gercek zamani tam tiklere ceviren biriktirici
│   ├── SaveManager.ts       localStorage okuma/yazma ve dogrulama
│   └── EventBus.ts          Tip guvenli olay yayinlayici
├── systems/                 Oyun kurallari
│   ├── BuildingResolver.ts  Uretim/kapasite/maliyet hesabinin TEK kaynagi
│   ├── ResourceSystem.ts    Harcama, ekleme, depo siniri
│   ├── BuildingSystem.ts    Yerlestirme kurallari, yikma
│   ├── ConstructionSystem.ts Insa/yukseltme gorevleri, kuyruk, iptal
│   ├── UpgradeSystem.ts     Yukseltme kurallari ve maliyeti
│   ├── PopulationSystem.ts  Nufus buyumesi/azalmasi ve isci dagitimi
│   └── EconomySystem.ts     Uretim ve yiyecek gideri
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
alindiginda `ancient-city:save:v1` anahtarina yazilir. Eski surumler
(`MIN_SUPPORTED_SAVE_VERSION`'a kadar) goc ettirilerek yuklenir; yalnizca
taninmayan bir surum reddedilir. Kayittan turetilebilen alanlar surum
artirmadan eklenir - nufus da boyle eklendi. Sifirdan baslamak icin
tarayici konsolunda:

```js
localStorage.removeItem('ancient-city:save:v1'); location.reload();
```

## Android paketlemesi (karar kaydi)

Oyun su an saf bir web uygulamasidir; depoda Android projesi **yoktur**.
Android paketlemesi arastirildi ve asagidaki kararlar/olcumler kayda gecirildi
ki paketleme sprintinde bastan arastirilmasin.

**Karar:** `applicationId` = `com.ashina.ancientcity`
(Play Store'a yuklendikten sonra degistirilemez.)

**Onerilen yigin:** Capacitor 8.x (`engines: node >= 22`), JDK 21, Gradle 8.14+.
Mevcut Node 22.22 / JDK 21 / Gradle 8.14.3 ile uyumludur; eski surume inmeye
gerek yoktur.

**Uyumluluk avantaji:** `vite.config.ts` icinde `base: './'` oldugu icin uretilen
`dist/index.html` goreli yol kullanir - Capacitor WebView icin dogrudan uygundur.
Ayrica `public/` dizini ve Phaser yukleyicisiyle gelen varlik yoktur (tum dokular
prosedureldir), bu yuzden paketlemede en sik goruleni olan varlik yolu sorunu
olusamaz.

**Eksikler:** launcher ikonu, splash gorseli ve uygulama adi kaynaklari henuz yok.

### Cihaz pikseli (DPR) olcumu

Tuval su an CSS pikselinde acilir; 1080x2400 bir telefonda oyun 360x800
cizilip 3x buyutulur. Arka tampon cozunurlugunu artirmanin maliyeti olculdu
(ayni piksel sayisi CSS goruntu alani buyutulerek simule edildi):

| Arka tampon | Piksel | FPS (120 bina) |
| --- | --- | --- |
| 360x800 (bugunku) | 288 K | 31 / 32 |
| 720x1600 (DPR 2) | 1.15 M | 11 / 11 |
| 1080x2400 (DPR 3) | 2.59 M | 8 / 8 |

Maliyet doldurma hizina baglidir. **Ancak bu olcum GPU'suz bir ortamda
alindi** (yazilim rasterizasyonu), dolayisiyla gercek bir mobil GPU'daki
maliyeti abartir ve buradan guvenli bir ust sinir turetilemez.

Ayrica Phaser'in `RESIZE` kipinde arka tampon cozunurlugunu artirmanin tek
yolu `zoom` ile oyun boyutunu buyutmektir; bu da tum arayuz olculerinin
(yazi boyutlari, panel yukseklikleri, buton olculeri) cozunurlukten bagimsiz
hale getirilmesini gerektirir. Yapilandirilabilir bir "kanca" eklemek, guvenle
acilamayacagi icin olu yapilandirma olurdu; bu nedenle EKLENMEDI. Kendi
sprintinde, arayuz olcek calismasiyla birlikte ele alinmalidir.

## Nufus modeli

Nufus gercek bir kaynaktir; kapasitenin turevi degildir.

| Kavram | Anlami |
| --- | --- |
| Kapasite | Evlerin actigi ust sinir. Vatandas DEMEK DEGILDIR. |
| Nufus | Sehirde yasayan vatandas sayisi. Zamanla kapasiteye dogru buyur. |
| Calisan | Bir binaya atanmis vatandas. Geri kalani issizdir ama yine yer. |
| Kadro | `atanan / gereken`. Uretim dogrudan bununla carpilir. |

**Buyume** dakikada `POPULATION_GROWTH_PER_MINUTE` kisidir ve yalnizca depoda
yiyecek varken isler. **Azalma** dakikada `POPULATION_DECLINE_PER_MINUTE`
kisidir; buyumeden yavastir, boylece bir aclik kazasi sehri silmez.

Buyume kesirli oranlarla tanimli oldugu icin biriktirici **tam sayi
birimlerinde** calisir (bir vatandas = bir dakikalik tik sayisi). Kesirli
birikim denendi ve kayan noktada asindigi gorundu: 90 tik sonra 5 yerine
4.99999999999999 cikip asagi yuvarlanirken bir vatandas yok oluyordu. Birim
alaninda toplama tam sayilarla yapilir, bu yuzden **parcali ilerletme tek
seferlik ilerletmeyle birebir ortusur** - cevrimdisi telafi icin gerekli.

`BuildingInstance.assignedWorkers` **turetilmis durumdur**: kayittan gelen
degere guvenilmez, her ilerlemede ve her yuklemede nufustan yeniden
hesaplanir. Kurcalanmis bir kayit is gucu uyduramaz.

## Yol haritasi

Bu asamanin disinda birakilanlar: arastirma agaci, birimler ve savas,
gorevler, ses. Cozunurluk (DPR) ve arayuz olcekleme kendi sprintini bekliyor.
Multiplayer/backend ise ayri bir asama olarak degerlendirilecek.
