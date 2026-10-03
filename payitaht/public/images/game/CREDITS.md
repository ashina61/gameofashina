# Görseller — kaynak ve kullanım hakkı

Bu dosya oyundaki görsellerin nereden geldiğini anlatır. Eski sürüm "bütün
görseller kodla çizilir" diyordu; bu doğru değildi. Görseller iki kaynaktan
gelir (V2 planı, Faz 4.7).

## 1. Depodaki araçlarla kod ile üretilenler

Bunlar bu depodaki betiklerle üretilir. Kaynağı kodun kendisidir; betiği yeniden
çalıştırmak aynı dosyaları üretir. Oyunla aynı lisansı taşır.

| Dosyalar | Üreten araç |
|---|---|
| `buildings/site.webp`, `buildings/scaffold.webp`, `buildings/surlar-{1,2,3}.webp` | `tools/art/buildings.py` (`tools/art/isokit.py` izometri motoru) |
| `buildings/mine-*.webp`, `buildings/npc-*.webp`, `buildings/pazar.webp` | `tools/art/buildings.py` |
| `buildings/forest-hero.webp` | Kodla üretildi (commit `903ff63`), ama üreten betik depoya konmamış. Yeniden üretilemez; değiştirilecekse betiği yazılmalı. |
| `decor/*.png` (ağaçlar, çalı, çiçek, kaya, kuyu, kovan, saman, odun, lale) | `tools/art/decor.py`, `tools/art/tulips.py` |
| `terrain/*.png` | `tools/art/decor.py` |
| `walls/tower-round.*` | `tools/art/wall-tower.mjs` |
| `ships/*.png` | `tools/art/gen-procedural-assets.py` |
| `islands/*.webp` | `tools/art/islands.py`, `tools/art/island-thumbs.py` |
| `siege/*.svg` | elle yazılmış SVG |
| Arayüz ikonları (`components/game/ui-icon-data.ts`) | `tools/art/ui-icons.mjs` |
| Sur, şehir halkı, bayraklar, gemi ve efektler | Phaser içinde çalışma anında çizilir (`components/game/phaser-city.ts`, `city-life.ts`) |

## 2. Boyalı bina seti — kaynağı yazılı değil

`buildings/*-painted-{1,2,3}.webp` dosyaları kodla üretilmedi.

- **Kim ekledi:** depo sahibi (ashina61). Commit'ler:
  - PR #56–#64: Divanhane, cami, saray, konut, kışla, medrese, çarşı, başlangıç ekonomisi, Elçilik, Hamam, Kahvehane, müze, lonca ve atölyeler, mahzen, gözlükçü, barutane.
  - `8eb6cec`: kalan yapılar.
  - `00c3572`: liman ve tersane.
  - `0473668`: medrese yeniden çizimi.
- **Kapsam:** 39 dosya grubu × 3 aşama, yaklaşık 117 görsel.
- **Kaynak, araç ve lisans:** depoda kayıtlı değil.

> **Yapılacak (depo sahibi):** Bu görsellerin nasıl üretildiğini ve hangi koşulla
> kullanılabileceğini buraya yaz. Gerekli bilgiler:
> - kendi çizimin mi, bir yapay zekâ görsel aracıyla mı üretildi (hangisi), yoksa satın alınmış bir paket mi;
> - ticari yayında (Play Store) kullanım hakkı var mı.
>
> Play Store'a çıkmadan önce bu satır doldurulmalı.

Boyalı görsellerde gömülü sancak yok. Faz 4.1'de bütün görseller tarandı;
bulunan kırmızı bölgeler kiremit, alem ve tente çıktı. Oyuncunun sancağı devlet
yapılarının yanındaki direklerde çalışma anında çizilir.

## 3. Görsel yenileme — G0 stil belgesi

| Dosya | Üreten araç / tarih | Tarif ve referans | Kullanım notu |
|---|---|---|---|
| `docs/stil-sayfasi.webp` (public klasörünün dışındaki belge) | Codex görsel üretimi, OpenAI ImageGen, 2026-10-03 | `tools/art/prompts/g0.md`, ortak kök `tools/art/prompts/_kok.md`; mevcut `buildings/divan-painted-1.webp` stil referansı | Yeniçeri, şehir danışmanı, akçe/kereste/taş, boş düğme ve zeytin ağacı için üretilmiş özgün stil örnekleri. OpenAI hizmet koşulları kapsamında çıktı kullanımına tabidir; üçüncü taraf oyun görseli kullanılmamıştır. Mevcut bina setinin bölüm 2'deki kaynak belirsizliği bu üretimle giderilmiş sayılmaz. |

G0 belgesi onay içindir, `public/` altında sunulmaz ve telefonda indirilmez.
Bina referansının asıl dosyası korunmuştur. Stil örnekleri henüz oyun asset'i
olarak bağlanmamıştır; brifte G0 için kod bağlantısı yoktur. Ayrı oyun dosyaları
onaydan sonra ilgili fazda üretilir ve ayrıca kaydedilir.
