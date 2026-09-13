# Ikariam Donusumu - Tasarim ve Esleme Belgesi

Bu depo bir Ikariam klonudur. Asagidaki tablo, Ikariam'daki HER mekanigin
bu kodda nerede yasandigini gosterir. Bir mekanik burada yoksa, oyunda da
yoktur; eklenirken bu tabloya satir eklenir.

Cok oyunculu bilincli olarak kapsam disidir: ayni adada gercek oyuncular
yerine NPC sehirleri ve barbar koyleri vardir. Oyun mantigi ile sunum
katmani ayrilmistir; ileride bir sunucu otoritesi eklendiginde `systems/`
ve `core/` degismez, yalnizca komut katmani eklenir.

## Zaman

Ikariam gercek zamanli bir oyundur: her sey "saat basina" olculur ve
insaatlar saatler surer. Bu surumde Ikariam'in TUM sayilari aynen korunur,
yalnizca saat hizlandirilir.

```
gercek saniye  ->  TICKS_PER_SECOND tik  ->  TIME_SCALE oyun saniyesi
```

| TIME_SCALE | 1 oyun saati | Aciklama |
| --- | --- | --- |
| 1 | 1 gercek saat | Ikariam'in gercek hizi |
| 10 | 6 gercek dakika | |
| 60 | 1 gercek dakika | VARSAYILAN - mobilde oynanabilir |
| 300 | 12 gercek saniye | Hizli deneme |

Arayuzdeki hiz dugmesi bu degeri degistirir. Uretim, insaat, arastirma,
birlik egitimi ve gemi yolculugu hepsi OYUN zamaninda tanimlidir; bu yuzden
hiz degistirmek dengeyi DEGISTIRMEZ, yalnizca beklemeyi kisaltir.

## Ikariam -> Kod eslemesi

| Ikariam | Bu kodda | Dosya |
| --- | --- | --- |
| Odun/Mermer/Sarap/Kukurt/Kristal/Altin | `MaterialKey` + `gold` | `types/index.ts` |
| Depo tavanı (Town Hall 2500 + Warehouse) | `WarehouseSystem` | `systems/WarehouseSystem.ts` |
| Hizar (ada, ortak seviye) | `IslandState.woodLevel` | `core/IslandState.ts` |
| Luks kaynak (adada tek tur) | `IslandState.luxury` + `luxuryLevel` | `core/IslandState.ts` |
| Tanri tapinagi + ada inanci | `IslandState.god` + `faith` | `config/IslandCatalog.ts` |
| Harika (5 seviye, inanca bagli) | `wonderLevel = floor(faith/20)` | `systems/WonderSystem.ts` |
| 16 sehr alani (ada etrafinda) | `IslandState.plots[]` | `core/IslandState.ts` |
| Valilik (sehir merkezi) | `townHallLevel` | `core/CityState.ts` |
| Sabit yapilar: Liman/Tersane/Sur | `CityState.harbor`, `CityState.wall` | `core/CityState.ts` |
| Yapi alanlari (ground) | `CityState.grounds[]` | `core/CityState.ts` |
| Vatandas rolleri: bos/odun/luks/bilim | `CitizenAssignment` | `systems/CitizenSystem.ts` |
| Maks nufus `floor(10*sqrt(L^3))*2+40` | `maxPopulation()` | `systems/CitizenSystem.ts` |
| Mutluluk (taverna/muze/inanc/yolsuzluk) | `HappinessSystem` | `systems/HappinessSystem.ts` |
| Nufus artisi = mutluluk fazlasi | `growthPerHour()` | `systems/CitizenSystem.ts` |
| Bos vatandas +3 altin/sa | `GOLD_PER_IDLE_CITIZEN` | `config/Constants.ts` |
| Bilim adami -9 altin/sa, +1 AP/sa | `GOLD_PER_SCIENTIST` | `config/Constants.ts` |
| Arastirma puani (AP) | `research` kaynagi | `systems/ResearchSystem.ts` |
| 4 arastirma dali: Deniz/Ekonomi/Bilim/Askeri | `ResearchBranch` | `config/ResearchCatalog.ts` |
| Atolye -> birlik/gemi gelistirme (Bronz/Gumus/Altin) | `UpgradeTier` | `systems/UpgradeSystem.ts` |
| Kisla -> kara birlikleri | `UnitCatalog` | `config/UnitCatalog.ts` |
| Tersane -> savas gemileri | `ShipCatalog` | `config/ShipCatalog.ts` |
| Ticaret Limani -> yuk gemileri + yukleme hizi | `TradeSystem` | `systems/TradeSystem.ts` |
| Kara savasi (tur sirali, cephane, moral) | `CombatSystem.landBattle` | `systems/CombatSystem.ts` |
| Deniz savasi | `CombatSystem.seaBattle` | `systems/CombatSystem.ts` |
| Sur -> savunma bonusu | `wallDefenseBonus()` | `systems/CombatSystem.ts` |
| Ganimet / yagma | `CombatSystem.resolveLoot` | `systems/CombatSystem.ts` |
| Yolsuzluk (Palace/GR seviyesi) | `corruptionOf()` | `systems/HappinessSystem.ts` |
| Saray -> koloni sayisi | `PalaceSystem` | `systems/ColonySystem.ts` |
| Muze -> kultur mallari anlasmalari | `MuseumSystem` | `systems/MuseumSystem.ts` |
| Meyhane -> sarap servisi | `TavernSystem` | `systems/HappinessSystem.ts` |
| Toptanci (Dump) -> kaynak -> altin | `DumpSystem` | `systems/DumpSystem.ts` |
| Uretim binalari (Ormanci/Tas Ustasi/...) | `productionBonus` | `systems/ProductionSystem.ts` |
| Indirim binalari (Marangoz/Mimar/...) | `reductionBonus` | `systems/ConstructionSystem.ts` |
| Dunya haritasi (adalar) | `WorldState` | `core/WorldState.ts` |
| NPC sehirleri + barbar koyleri | `NpcSystem` | `systems/NpcSystem.ts` |

## Ikariam formulleri (birebir alindi)

Insaa suresi ve kaynak maliyeti ayni bicimde hesaplanir:

```
deger(seviye) = A / B * C^seviye - D
```

Katsayilar Ikariam wiki'sinin "Buildings/Construction Time" ve
"Building resources formula" sayfalarindan alinmistir ve
`config/BuildingCatalog.ts` icinde ham haliyle durur. Dogrulama:

| Bina | Seviye | Formulle | Ikariam'da |
| --- | --- | --- | --- |
| Depo (Warehouse) odun | 1 | 1600/3 * 1.2 - 480 = **160** | 160 |
| Depo (Warehouse) odun | 2 | 1600/3 * 1.44 - 480 = **288** | 288 |
| Hizar insa suresi | 1 | 7200/1 * 1.1 - 7200 = **720 s** | 12 dk |
| Valilik insa suresi | 2 | 1800 * 1.17^2 + 1080 = **3544 s** | ~59 dk |

Bazi kaynaklar yalnizca belli bir seviyeden sonra istenir (`n0`).
Ornegin Depo 3. seviyeden itibaren kristal ister; 2. seviyede istemez.

## Savas

Ikariam savasi turlu oynanir. Tur sirasi (kara):

1. Hava savunmasi (Gyrocopter)
2. Bombardi (Balloon-Bombardier)
3. Topcu (Mortar -> Catapult -> Ram)
4. Menzilli (Carabineer -> Archer)
5. On cephe (Sur -> Hoplite -> Steam Giant)
6. Kanatlar (Swordsman -> Spearman)

Her birlik: can (HP), hasar (DMG), zirh (ARM), isabet (ACC), cephane
(ammo), hiz (SPD), yer (size). Cephane biten menzilli birlik on cepheye
duser. Bu siralama ve istatistikler `config/UnitCatalog.ts` icindedir.

Deniz savasi ayni kurallarla gemi siniflari uzerinden yurur.

## Bilincli farklar

- Cok oyunculu yok; ittifak/casusluk/ticaret anlasmasi NPC'lerle yapilir.
- Ambrosia (gercek parali para) yoktur; tek para altindir.
- Harika inanci oyuncunun tapinak bagisiyla yukselir; diger oyuncularin
  bagisi yoktur.
- "Kolos" harikasi Helios'a baglanmistir (Rodos Kolosu). Ikariam'in diger
  yedi tanrisi (Poseidon, Demeter, Athena, Hermes, Ares, Hades, Hephaistos)
  kendi harikalarini korur.

## Sunum katmani mimarisi

Oyun uc katmandan olusur ve hepsi TEK bir `GameWorld` ornegini paylasir:

1. **Simulasyon** (`core/`, `systems/`) - Phaser'dan tamamen bagimsiz.
   Birim testler burada calisir; tarayici gerekmez.
2. **Cizim** (`scenes/`, `render/`, `input/`) - Phaser sahneleri. Yalnizca
   durumu OKUR ve EventBus olaylarini yayar; kendi durum kopyasi tutmaz.
3. **Arayuz** (`ui/`) - HTML/CSS. Phaser tuvalinin uzerinde ayri bir katman.
   Ikariam'in arayuzu yogun metin ve kaydirilabilir listelerden olustugu
   icin HTML secildi: kaydirma, erisilebilirlik ve dokunma hedefleri
   tarayicinin kendi mekanizmasiyla bedavaya gelir.

Sahneler (`CityScene`, `IslandScene`, `WorldScene`) ortak `IsoScene`
tabanindan turur. Secim olaylari (`select:city-slot`, `select:island-slot`,
`select:world-island`) arayuzu acar; arayuz eylemleri `GameWorld` metodlarini
cagirir ve EventBus olaylari sahneleri yeniler. Bu tek yonlu akis, arayuzun
gosterdigi ile simulasyonun isledigi degerlerin asla ayrismamasini garantiler.

Gorseller: zemin/parsumen/hero gibi buyuk yuzeyler AI uretimi dokulardir;
binalar, birlikler ve harikalar `SpriteFactory` tarafindan katalog
`tint`'inden prosedural izometrik objeler olarak uretilir.

## Ticaret rotalari

Ikariam'da ticaret rotasi tek seferlik bir sevkiyat degil, iki sehir
arasinda kurulan KALICI bir hattir. Rota kendine ayrilan yuk gemileriyle
calisir; o gemiler baska sevkiyatta kullanilamaz. Her devir su adimlarla
ilerler: kalkis -> giden malin teslimi -> donen malin yuklenmesi -> donus ->
yukleme beklemesi -> yeniden kalkis. Gidecek mal kalmadiginda rota SILINMEZ,
mal birikene kadar bekler (Ikariam'daki gibi).

## Bilincli uygulama farklari (Ikariam'a gore)

- **Nufus entegrasyonu analitiktir.** Ikariam tik basina sabit adim atar;
  biz `dP/dh = k(H-P) + D` denklemini kapali cozumle entegre ederiz. Cunku
  300x hizda tek Euler adimi salinim yapiyordu. Sonuc ayni denge noktasina
  oturur, yalnizca yol daha yumusak.
- **Depo tavaninda kaynak KIRPILIR.** Ikariam'da tasar; biz kaybederiz ve
  kaybedilen miktari arayuzde kirmizi gosteririz. Mobilde oyuncu her an
  oyunda olmadigi icin tasma cezasi yerine uyari tercih edildi.
- **Iptalde maliyet iade edilir.** Ikariam'da iptal edilen insaanin kaynagi
  yanar. Biz oran bazli iade ederiz; cunku mobilde yanlis dokunma sik ve
  kalici kayip kotu deneyimdir.
- **Arastirma puani birikmez.** Ikariam'daki gibi RP, AKTIF arastirmanin
  ilerlemesidir; aktif arastirma yoksa uretilen puan kaybolur. Bu bilincli
  olarak korunmustur (oyuncuyu surekli bir hedef secmeye zorlar).
- **Harika inanci yalnizca oyuncu bagisiyla yukselir.** Cok oyunculu
  olmadigi icin diger oyuncularin bagisi yoktur.
- **Zaman hizi 1x-300x secilebilir ve duraklatilabilir.** Ikariam'da
  duraklatma yoktur; mobilde arka plana gecis ve pil tasarrufu icin
  eklendi. Cevrimdisi ilerleme `savedAt` damgasindan hesaplanir.
