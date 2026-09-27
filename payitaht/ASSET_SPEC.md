# PAYİTAHT GÖRSEL ASSET SPEC — Güncel

Bu belge canlı oyundaki şehir asset sisteminin güncel sözleşmesidir. Eski 14-bina / değişken-footprint dokümanı artık geçerli değildir.

## 1. Temel sanat standardı

- Projeksiyon: tutarlı 2:1 izometrik görünüm.
- Işık: sol-üst ana ışık, sağ-alt yumuşak gölge.
- Stil: Osmanlı–Ege, painterly-realistic / realistic-stylized; oyuncak, neon, kalın siyah outline yok.
- Bina çıktısı: şeffaf arka planlı WebP.
- Generator: `tools/art/buildings.py` + `tools/art/isokit.py`.
- Çıktı klasörü: `public/images/game/buildings/`.
- Her bina üç görsel aşamaya sahiptir:
  - `<id>-1.webp` → seviye 1–3
  - `<id>-2.webp` → seviye 4–7
  - `<id>-3.webp` → seviye 8+
- Generator 600 px genişlikte çıktı üretir.
- Bina zemin elması sanat uzayında 480 px genişlik standardını kullanır.
- Phaser tarafındaki ortak anchor / footprint matematiği değiştirilmeden asset yenilenmelidir.

## 2. Yerleşim sözleşmesi

Normal kara binalarının tamamı aynı standart şehir slot sistemine oturur. Bir normal kara binası başka bir normal kara slotuna taşınabilir; asset içine özel parsel, yol veya çevre mimarisi gömülmez.

- Divanhane (`divan`) merkezde sabittir.
- Normal kara binaları: ortak 2×2 görsel footprint sözleşmesi.
- Liman yapıları (`liman`, `tersane`) ayrı coast slotlarına aittir.
- Surlar (`surlar`) normal bina slotu kullanmaz; savunma halkası runtime'da çizilir.
- Yol, kıyı, savunma temeli ve şehir zemini bina PNG'lerine bake edilmez.
- Bina altı avlu/prop desteğinin önemli kısmı runtime render katmanında oluşturulur.

## 3. Güncel bina kataloğu

### Sabit merkez
- `divan` — Divanhane / şehir merkezi

### Yönetim ve kamusal
- `saray`
- `valilik`
- `elcilik`
- `muze`
- `harita_arsivi`

### Konut, ticaret ve kültür
- `konut`
- `carsi`
- `ticaret_merkezi`
- `kara_pazar`
- `kahvehane`
- `karagoz`

### Üretim ve uzman işlikleri
- `ambar`
- `depo`
- `kereste`
- `tas`
- `ormanci`
- `tasci`
- `marangoz`
- `mimar`
- `bagci`
- `mahzen`
- `camci`
- `simyahane`
- `gozlukcu`

### Bilim, din ve sosyal yapılar
- `medrese`
- `cami`
- `hamam`
- `tekke`
- `mabet`

### Askerî
- `kisla`
- `tophane`
- `barutane`
- `siginak`
- `korsan_kalesi`

### Kıyı
- `liman`
- `tersane`

### Özel savunma
- `surlar`

Toplam canlı bina id sayısı: **38**.

## 4. Mimari aile ilkesi

Aynı isometrik kamera ve malzeme dili korunur; fakat tüm binalar aynı `box + roof` reçetesinden çıkmış gibi görünmemelidir.

- Konut: asimetrik, gündelik, küçük avlu/yan kütle.
- Üretim: açık işlik, malzeme sahası, sundurma ve ekipman.
- Ticaret: avlu, yükleme alanı, arasta/tente veya han dili.
- Askerî: ağır taş, sert giriş aksı, kule/istihkâm.
- Bilim/kültür: avlu, revak, okuma/sosyal alan.
- Anıtsal: güçlü merkezî kütle, kubbe/portiko/kanat hiyerarşisi.
- Liman: gümrük, rıhtım, yük akışı.
- Tersane: gemi gözleri, kızak, üretim/vinç.
- Surlar: runtime halka duvar + kapı + kule sistemi.

## 5. Asset ile runtime katmanının sınırı

Bina WebP'sinde:
- ana mimari kütle,
- çatı/kubbe/kule,
- yapıya özgü kalıcı küçük öğeler bulunabilir.

Runtime katmanında:
- slot zemini ve clearing,
- yol bağlantıları,
- ortak bina gölgesi,
- bina-türü mikro prop'ları,
- sancaklar,
- vatandaşlar/askerler,
- duman ve çevresel efektler,
- sur halkası bulunur.

Bu ayrım, bina değiştirildiğinde veya başka slota taşındığında görsel sistemin bozulmamasını sağlar.

## 6. Surlar

`surlar-1/2/3.webp` yalnızca bina paneli/önizleme dilini temsil eder. Şehirde görünen gerçek sur:

- `DEFENSE_FOUNDATION` halkasını izler,
- kapı açıklıklarını `WALL_GATES` üzerinden bırakır,
- seviyeye göre yükselir,
- kuleleri ve deniz kapısını ayrı render eder,
- seviye 0'da inşa hendeği/temel olarak görünür.

Bu nedenle tek bir sur PNG'si şehir çevresine ölçeklenmez.

## 7. Görsel QA

Ana mobil QA en az şu sahneleri doğrulamalıdır:

- başlık / giriş,
- şehir merkezi,
- liman odağı,
- dünya/ada haritası.

Kontroller:
- JavaScript page error yok,
- `/images/game/` altında 4xx asset yok,
- canvas gerçek mobil viewport'ta render oluyor,
- HUD şehir/liman içeriğini kritik biçimde kapatmıyor.

## 8. Değişmez kurallar

Görsel asset çalışması sırasında aşağıdakiler değiştirilmez:

- ekonomi,
- bina maliyetleri,
- üretim değerleri,
- araştırma,
- save formatı,
- bina açılma koşulları,
- slot kapasitesi,
- normal kara bina yerleşim kuralları.

Yeni bir bina görseli eklendiğinde önce generator/asset sözleşmesi korunur, ardından Mobile Visual QA ile gerçek oyun sahnesinde doğrulanır.
