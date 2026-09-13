# Varlik klasoru

Bu klasore birakilan PNG'ler oyuna **otomatik** girer. Ayar dosyasi,
kayit, kod degisikligi yoktur: dosya varsa kullanilir, yoksa mevcut
prosedurel cizim aynen devam eder.

Liste derleme aninda olusur (`import.meta.glob`), yani var olmayan bir
dosya icin ag istegi **cikmaz** ve konsol kirlenmez.

---

## ONCELIK SIRASI — hangi dosya ne kadar fark yaratir

Olcum: sehir tamamen doldurulup (130 bina) oyunun gercek zoom'unda
bakildi.

| Sira | Dosya | Neden |
|------|-------|-------|
| **1** | `terrain/` (4 dosya) | Ekranin ~%60'i zemin. Prosedurel karolarin sert dikisleri sehri "satranc tahtasi" gosteriyordu; en buyuk tek kazanc burada. **Yapildi - su an yer tutucu karolar var.** |
| **2** | `buildings/house_1.png` | Binalar su an duz kutu: pencere yok, doku yok. Doldurulmus bir sehirde en cok tekrar eden gorsel ev. |
| **3** | `buildings/town_hall_*.png`, `temple_*`, `harbor_*` | Anitsal yapilar sehrin siluetini belirler; oyuncunun gozu once onlara gider. |
| **4** | `ui/portrait.png` | Ust soldaki tek "insan" ogesi. |
| **5** | Kalan binalar | Buraya kadar iyi gorunmuyorsa yon yanlistir; otuz dosya uretmeden once ilk dordu degerlendir. |

---

## terrain/ — zemin karolari

    {tur}.png

| Dosya         | Ne                          | Zorunlu |
|---------------|-----------------------------|---------|
| `grass.png`   | Cimen                       | evet    |
| `soil.png`    | Toprak                      | evet    |
| `rock.png`    | Kayalik                     | evet    |
| `water.png`   | Su                          | hayir (yoksa prosedurel) |
| `street.png`  | Doseli sokak                | onerilir |
| `plaza.png`   | Meydan dosemesi             | hayir (yoksa `street` gibi prosedurel) |

### Cizim kurallari

- **Genislik 128'in kati.** 256 x 148 onerilir (2x); oyun her zaman bir
  karo genisligine oturtur, yani 512 de verebilirsin - sadece daha net
  gorunur.
- **Elmas, goruntunun UST bandindadir** ve tam olarak genisligin yarisi
  kadar yuksektir: 256 genislikte elmas 256 x 128, ustten baslar.
- Altta kalan bant **yan yuz / ucurum payidir**; istedigin kadar derin
  olabilir, oyun orijini kendi hesaplar.
- Elmasin **disi saydam** olmali.
- Komsu karolar YAN YANA gelir: kenarda sert bir cerceve cizme, aksi
  halde satranc tahtasi geri gelir.
- Isik **sol ustten**.

Her tur bagimsizdir: yalnizca `grass.png` koyarsan cimen boyali, geri
kalan prosedurel kalir.

---

## buildings/ — bina gorselleri

    {tip}_{seviye}.png

| Ne                | Ornek dosya adi        |
|-------------------|------------------------|
| Zorunlu           | `house_1.png`          |
| Siluet varyanti   | `house_1_v1.png`       |
| Ozel golge        | `house_1_shadow.png`   |

**Tipler:** `town_hall` `house` `farm` `lumber_camp` `quarry` `market`
`warehouse` `temple` `harbor` `academy`

**Seviyeler:** `1` `2` `3`

### Cizim kurallari

- **Genislik = 128 x ayak izi.** 1x1 bina 128 px, 2x2 bina 256 px genis.
  Yukseklik serbesttir; bina ne kadar yuksekse o kadar uzun olur.
  Daha buyuk dosya (256, 512...) da olur - oyun onu ayni dunya boyutuna
  oturtur, yalnizca daha net gorunur.
- **Hizalama:** binanin on alt kosesi goruntunun ALT ORTASINDA olmali;
  sprite oradan sabitlenir.
- **Golge cizme.** Motor PNG'nin altina yumusak bir temas golgesi
  kendiliginden koyar. Kendi golgeni vermek istersen `_shadow.png`
  dosyasi onun yerine gecer.
- **Isik sol ustten** gelir (prosedurel binalarla tutarli olmasi icin).
- Arka plan **saydam** olmali.

### Kismi ekleme

Her bina ve seviye bagimsizdir. Yalnizca `house_1.png` koyarsan Sv.1 evler
o gorseli, Sv.2 ve Sv.3 evler ile butun diger binalar prosedurel cizimi
kullanmaya devam eder.

Seviyeler arasi geri dusme YOKTUR: `house_3.png` yoksa Sv.3 ev
`house_1.png`'i kullanmaz, prosedurel cizime doner. Aksi halde
yukseltilmis bina yukseltilmemis gibi gorunur ve oyuncu seviyeyi gozle
ayirt edemezdi.

### Varyantlar

Ev turunun uc siluet varyanti var (`variantFor` uid'den deterministik
secer). `house_1_v1.png` ve `house_1_v2.png` koyulmazsa o varyantlar sade
`house_1.png`'e duser.

---

## ui/ — arayuz derisi

Panel sistemi bu **uc** dokudan her olcude cerceve pisirir. Ucu de
istege baglidir; verilmeyeni kod gradyanla uretir.

| Dosya               | Ne             | Onerilen boyut | Notlar                                  |
|---------------------|----------------|----------------|-----------------------------------------|
| `panel_bg.png`      | Parsomen/deri  | 64 x 64        | Her yone gerilir; desen tekrar edebilir |
| `panel_border.png`  | Altin kenarlik | 64 x 8         | Yatay serit; dort kenara dondurulur     |
| `panel_corner.png`  | Kose susu      | 20 x 20        | SOL UST kose; oteki uce aynalanir       |

Bu uc dosya degistiginde butun paneller, bildirimler ve cerceveler
birlikte degisir - tek tek elden gecirmek gerekmez.

### Istege bagli

| Dosya           | Ne                | Onerilen boyut | Notlar                                  |
|-----------------|-------------------|----------------|-----------------------------------------|
| `portrait.png`  | Oyuncu portresi   | 128 x 128      | Kare; oyuncu kartinda ve muttefik seridinde kullanilir |

Panel dokularindan farki: bunun yerine gecen bir gradyan URETILMEZ.
Dosya yoksa mevcut prosedurel arma ikonu kullanilmaya devam eder.
