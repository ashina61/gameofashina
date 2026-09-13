# Ancient City — Ikariam tarzı strateji

Antik çağ temalı, **Phaser 3 + TypeScript + Vite** ile geliştirilen, Ikariam'ın
oynanış modelini birebir izleyen tek oyunculu bir mobil/masaüstü strateji oyunu.
Oyuncu bir adada şehir kurar, kaynak üretir, araştırma yapar, ordu ve donanma
kurar, NPC şehirleriyle savaşır veya ticaret eder ve adanın harikasını uyandırır.

> Multiplayer, backend ve hesap sistemi bilinçli olarak kapsam dışıdır. Rakip
> şehirler AI/NPC'dir ve tüm durum tarayıcıdaki `localStorage` üzerinde tutulur.
> Tasarım kararlarının gerekçeleri `docs/IKARIAM.md` dosyasındadır.

## Hızlı başlangıç

```bash
npm install
npm run dev        # http://localhost:5173 (ağ üzerinden telefondan da açılır)
```

| Komut | Açıklama |
| --- | --- |
| `npm run dev` | Geliştirme sunucusu (hot reload, LAN üzerinden erişilebilir) |
| `npm run build` | Tip kontrolü + üretim derlemesi (`dist/`) |
| `npm run preview` | Üretim derlemesini yerelde sunar |
| `npm run typecheck` | Yalnızca TypeScript tip kontrolü |
| `npm run lint` | ESLint |
| `npm test` | Birim testleri (simülasyon + arayüz, 54 test) |

Telefonda denemek için `npm run dev` çıktısındaki `Network:` adresini aynı
Wi-Fi ağındaki cihazın tarayıcısında aç.

## Oynanış (Ikariam modeli)

- **Kaynaklar şehre aittir:** odun, mermer ve adanın lüks kaynağı (şarap /
  kükürt / kristal) her şehrin kendi deposunda tutulur. **Altın ve araştırma
  puanı ise imparatorluk geneldir.**
- **Depo tavanı** valilik ve depo seviyesiyle büyür; taşan üretim kırılır ve
  arayüzde kırmızı gösterilir.
- **Vatandaşlar** boştayken altın, işçiyken kaynak, bilim insanıyken araştırma
  puanı üretir (ve altın tüketir). Nüfus, mutluluk tavanına doğru büyür.
- **Araştırma** akademide yapılır; puan birikmez, aktif araştırmanın
  ilerlemesidir. Ağaç dört dala ayrılır: Ekonomi, Denizcilik, Bilim, Askeriye.
- **Savaş** kara ve deniz birlikleriyle yapılır; birliklerin can/hasar/zırh/
  isabet/cephane/hiz/yer istatistikleri ve çarpışma sırası Ikariam'ınkiyle
  aynıdır. Yağma en fazla karşı tarafın deposunun %50'sidir.
- **Ticaret** NPC şehirleriyle yapılır; fiyatlar NPC'nin stok ve gücüne göre
  değişir. Kendi şehirlerin arasında tek seferlik nakliye veya **kalıcı
  ticaret rotaları** kurarsın: rota, ayrıldığı yük gemileriyle her devirde
  otomatik mal taşır (giden ve dönen mal ayrı seçilir).
- **Harika:** her adada bir tanrının harikası vardır. Odun bağışı inancı
  yükseltir; inanç eşiklerinde harika seviye atlar ve kalıcı ada bonusu açar.
- **Zaman** gerçek zamanlıdır ve 1x–300x hızlandırılabilir veya duraklatılabilir.
  Oyun kapalıyken geçen süre açılışta telafi edilir.

## Kontroller

Oyun mobil öncelikli tasarlandı; masaüstünde fare ve klavye ile de oynanır.

| Jest | Sonuç |
| --- | --- |
| Tek dokunuş | Karo/bina seçer, açık sayfada eylemi uygular |
| Tek parmak sürükleme | Haritayı kaydırır |
| İki parmak sıkıştırma | Yakınlaştırır / uzaklaştırır |
| Fare tekerleği | Yakınlaştırır (masaüstü) |
| Ok tuşları | Haritayı kaydırır (masaüstü) |

Kaydırma ile dokunuş birbirinden ayrılır: parmak 12 pikselden fazla hareket
ederse jest kaydırma sayılır ve seçim yapılmaz.

### Dokunma toleransı

Dokunmayı SÜRE değil HAREKET belirler: parmağını ne kadar basılı tutarsan tut,
`DRAG_THRESHOLD_PX` kadar kaymadığı sürece dokunuş sayılır. Daha önce 400ms'lik
bir üst sınır vardı ve nişan alırken geçen süreyi "dokunma değil" sayıp girdiyi
sessizce atıyordu.

Kaydırma eşiği Android'in kendi dokunma toleransı (8dp) hizasındadır; 12px
değeri bunun altındaydı ve parmağın doğal titremesiyle aşılıyordu.

Dokunulan karo ile kurulan karo aynı olmalı: `worldToGrid` EN YAKINA yuvarlar,
aşağı değil. `gridToWorld` karonun MERKEZİNİ döndürdüğü için tam sayı ızgara
koordinatı merkeze oturur; aşağı yuvarlamak tam sayının köşede olduğunu
varsaymaktı ve seçim bölgesini yarım karo kaydırıyordu.

Girdi davranışı `npm run bench:input` ile ölçülür — bu davranışlar bir kez
bozulduğunda oyun elle oynanmaz hale gelmişti, betik onları kilitler.

## Mimari

Kod üç katmandan oluşur ve hepsi **tek bir `GameWorld`** örneğini paylaşır:

1. **Simülasyon** (`core/`, `systems/`) — Phaser'dan tamamen bağımsız. Birim
   testler burada çalışır; tarayıcı gerekmez.
2. **Çizim** (`scenes/`, `render/`, `input/`) — Phaser sahneleri. Yalnızca
   durumu okur ve EventBus olayları yayar; kendi durum kopyası tutmaz.
3. **Arayüz** (`ui/`) — HTML/CSS. Phaser tuvalinin üzerinde ayrı bir katman.
   Ikariam'ın arayüzü yoğun metin ve kaydırılabilir listelerden oluştuğu için
   HTML seçildi: kaydırma, erişilebilirlik ve dokunma hedefleri tarayıcının
   kendi mekanizmasıyla bedavaya gelir.

İki katman arasındaki tek bağ tip güvenli bir olay veri yoludur (`EventBus`) ve
Phaser `registry`'sidir. Sahneler `world` nesnesini registry'den okur; arayüz
ise onu doğrudan constructor'da alır.

```
src/
├── main.ts                  Giriş: GameWorld + Phaser + Arayüzü kurar
├── config/                  Denge ve yapılandırma verisi (kod değil, veri)
│   ├── Constants.ts         Karo ölçüleri, tick aralıkları, zoom sınırları
│   ├── BuildingCatalog.ts   Bina tanımları tablosu
│   ├── UnitCatalog.ts       Kara birlikleri istatistikleri
│   ├── ShipCatalog.ts       Gemi sınıfları istatistikleri
│   ├── ResearchCatalog.ts   Araştırma ağacı (4 dal)
│   ├── IslandCatalog.ts     Lüks kaynak türleri ve 8 tanrı/harika
│   ├── Tiers.ts             Birlik/gemi teknoloji kademeleri
│   └── GameConfig.ts        Phaser yapılandırması
├── core/                    Phaser'dan bağımsız oyun çekirdeği
│   ├── GameWorld.ts         Durum + sistemleri bir arada tutan kök nesne
│   ├── GameState.ts         Kaynaklar, şehirler, filolar, bildirimler
│   ├── Simulation.ts        Tik orkestratörü (sistem sırası burada)
│   ├── SimulationClock.ts   Gerçek zamanı tam tiklere çeviren biriktirici
│   ├── CityLayout.ts        Şehir ızgarası sabit yerleşimi
│   ├── IslandLayout.ts      Tohumdan deterministik ada üretimi
│   ├── WorldFactory.ts      Başlangıç dünyası + NPC şehirleri
│   ├── SaveManager.ts       localStorage okuma/yazma ve doğrulama
│   └── EventBus.ts          Tip güvenli olay yayıncısı
├── systems/                 Oyun kuralları
│   ├── ResourceSystem.ts    Harcama, ekleme, depo sınırı
│   ├── EconomySystem.ts     Üretim, altın, bakım gideri
│   ├── CitizenSystem.ts     Nüfus büyümesi (analitik) ve işçi dağıtımı
│   ├── HappinessSystem.ts   Mutluluk dökümü ve tavanı
│   ├── ConstructionSystem.ts İnşa/yükseltme görevleri, iptal iadesi
│   ├── ResearchSystem.ts    Araştırma ilerlemesi ve ağaç kapıları
│   ├── IslandSystem.ts      Ortak yataklar, koloni kurma
│   ├── MilitarySystem.ts    Eğitim kuyrukları, teknoloji kademeleri
│   ├── FleetSystem.ts       Filo hareketi, taşıma, ticaret
│   ├── CombatSystem.ts      Kara/deniz çarpışma çözümleyici
│   ├── NpcSystem.ts         NPC ekonomisi, büyümesi, yağma kuralları
│   └── WonderSystem.ts      Harika seviyeleri ve ada bonusları
├── scenes/                  Phaser sahneleri (ortak IsoScene tabanı)
│   ├── BootScene.ts         Dokuları üretir
│   ├── PreloadScene.ts      AI dokularını yükler
│   ├── CityScene.ts         İzometrik şehir görünümü
│   ├── IslandScene.ts       Ada görünümü (NPC şehirleri, harika, yataklar)
│   └── WorldScene.ts        Dünya haritası (adalar arası geçiş)
├── render/                  Çizim yardımcıları
│   ├── SpriteFactory.ts     Katalog tint'inden izometrik obje üretimi
│   ├── ResolutionManager.ts DPR'ye duyarlı tuval ölçüsü ve kamera telafisi
│   └── ArtStyle.ts          Ortak sanat spesifikasyonu (palet, ışık, gölge)
├── input/CameraController.ts Dokunma/sürükleme/zoom jestleri
└── ui/                      HTML arayüz katmanı
    ├── Ui.ts                Üst çubuk, alt gezinme, sayfalar, toast'lar
    └── styles.css           Parşömen teması ve güvenli alan telafileri
```

## Görseller

Zemin, parşümen ve açılış görseli gibi büyük yüzeyler AI üretimi dokulardır
(`public/assets/`). Binalar, birlikler ve harikalar `SpriteFactory` tarafından
katalog `tint` değerinden prosedürel izometrik objeler olarak üretilir; böylece
her bina türü ve seviyesi için ayrı doku dosyası taşımak gerekmez.

## Testler

```bash
npm test
```

- `test/simulation.test.ts` — 39 test: ekonomi, nüfus, araştırma, inşa,
  savaş, filo, NPC, harika, kayıt/yükleme.
- `test/ui.test.ts` — 15 test: arayüzü gerçek `GameWorld` üzerinde jsdom ile
  kurar ve tüm panelleri/eylemleri sürer; şablon hatalarını yakalar.

Simülasyon testleri Phaser'a dokunmaz; bu sayede oyun mantığı tarayıcısız ve
hızlı doğrulanır.
