# Varlik klasoru

Bu klasore birakilan PNG'ler oyuna **otomatik** girer. Ayar dosyasi,
kayit, kod degisikligi yoktur: dosya varsa kullanilir, yoksa mevcut
prosedurel cizim aynen devam eder.

Liste derleme aninda olusur (`import.meta.glob`), yani var olmayan bir
dosya icin ag istegi **cikmaz** ve konsol kirlenmez.

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
