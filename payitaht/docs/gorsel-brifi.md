# Görsel Yenileme Brifi — Payitaht Adaları

> **Kime:** görsel üretebilen kodlama ajanı (Codex vb.).
> **Ne:** oyunun bütün görsellerini **tek elden, tek dilden** yeniden kurmak ve
> arayüzü "normal bir mobil online strateji oyunu" görünümüne getirmek.
> **Hazırlayan:** 0.41.0 itibarıyla depodaki durumun envanteri ve kararlar.

---

## 0. Ajana verilecek kısa görev

```
payitaht/docs/gorsel-brifi.md dosyasını baştan sona oku ve oradaki fazları
SIRAYLA uygula. claude/ancient-city-phaser-game-r9e0qu dalından codex/gorsel
adlı yeni bir dal aç; bütün işi orada yap, o dala push et.

Her fazın sonunda: görselleri üret, koda bağla, kontrolleri çalıştır
(bölüm 6), önce/sonra ekran görüntülerini visual-review/ altına koy, ayrı bir
commit at.

ONAY DURAKLARI: aşağıdaki fazlardan sonra işi bitir, ne yaptığını ve ekran
görüntülerini özetle, benden onay gelmeden sonraki faza geçme:
  - G0 (stil sayfası)
  - G2 (arayüz kiti + ikonlar)
  - G4 (şehir zemini + dekor)
  - G6 (birlikler)
Duraklar dışındaki fazlar arasında durma, sıradakine geç.

Oyun kuralına, ekonomiye, kayıt biçimine, slot koordinatlarına dokunma.
Üretilen her görseli public/images/game/CREDITS.md'ye yaz.
```

Onay verirken yazılacak: `"G0 onaylandı, devam et"` ya da neyin değişmesi
gerektiği (ör. `"kubbeler daha koyu, kontur ince; G0'ı yeniden üret"`).

---

## 1. Neden

Bugün oyunda iki ayrı çizim dili yan yana duruyor:

| Boyalı (iyi, korunacak dil) | Kodla çizilmiş SVG / prosedürel (dil dışı) |
|---|---|
| 38 bina × 3 aşama (`buildings/*-painted-*.webp`) | 29 birlik figürü (`unit-art.tsx`) |
| Giriş ekranı kolajı | 4 danışman portresi (`advisor-portraits.tsx`) |
| | Kaynak ikonları (`resource-art.tsx`), 84 arayüz ikonu (`ui-icon-data.ts`) |
| | 76 araştırma amblemi (`research-art.tsx`), görev çizimleri (`quest-art.tsx`) |
| | Şehir zemini (düz çim/toprak dokusu), 21 dekor PNG'si, gemiler |
| | 16 ada (birbirinin aynısı yeşil lekeler), dünya haritası denizi |
| | Surlar, maden, köy/korsan/kale yerleşimleri, inşaat iskelesi |

Sonuç: binalar "oyun", çevresi "uygulama" gibi görünüyor. Şehir haritası da
büyük boş yeşil alanlar ve küçük binalar yüzünden ıssız duruyor.

---

## 2. Sanat kılavuzu (bütün görseller buna uyar)

**Dil:** boyalı, sıcak, hafif stilize izometrik Osmanlı/Akdeniz. Referans
hissi: Ikariam'ın şehir görünümü, Forge of Empires'ın bina çizimleri, Rise of
Kingdoms'ın arayüz kalitesi. **Mevcut boyalı bina seti ölçüdür:** yeni
üretilen her şey onların yanında aynı elden çıkmış gibi durmalı.

| Kural | Değer |
|---|---|
| Kamera | 2:1 izometri (yaklaşık 30°), bina ve dekor için aynı açı. Portreler 3/4 yüz, birlikler 3/4 boy, sağa bakar. |
| Işık | Sol üstten sıcak gün ışığı; gölge sağ alta, yumuşak. |
| Palet | Kiremit kırmızısı, kurşun mavisi kubbe, kireç beyazı taş, zeytin ve çam yeşili, Akdeniz turkuazı deniz; arayüz için koyu ceviz ahşap + pirinç altın + parşömen (bkz. `app/tokens.css`, `--c-*`). |
| Kontur | İnce, koyu kahve kenar çizgisi (siyah değil); boyalı doku, düz vektör dolgu yok. |
| Metin | **Görselin içinde hiç yazı yok** (harf, rakam, logo). Yazılar kodda. |
| Arka plan | Nesneler şeffaf (alfa). Düz renk zeminde üretilip kesilecekse kenarda hale kalmasın. |
| Kültür | Osmanlı unsurları doğru: hilal-yıldızlı sancak, kubbe ve minare oranları, sarık/börk/fes, yeniçeri keçesi. Karikatür, abartı ya da kalıp yargı yok. Gerçek kişi, marka, başka oyunun karakteri yok. |
| Tutarlılık | Önce **G0 stil sayfası**; sonraki her üretimde aynı ana tarif (prompt kökü) + o sayfa referans olarak verilir. |

**Biçim ve adlar**

- Dosya: `webp` (kalite ~82), şeffaflık gerekiyorsa alfa ile. İkonlar 256 px kare
  kaynak; birlik ve portre 512 px; bina 1774 px genişlik (mevcut ölçek).
- Bina görsellerinde telefon kopyası **elle üretilmez**: `python3 tools/art/half-size.py`
  `*-sm.webp` kopyalarını üretir, `--check` CI'da denetler.
- Ad kalıpları: `units/<unitId>.webp`, `portraits/advisor-<id>.webp`,
  `portraits/god-<godId>.webp`, `portraits/rival-<rivalId>.webp`,
  `icons/res-<id>.webp`, `icons/ui-<ad>.webp`, `research/<researchId>.webp`,
  `ui/<parça>.webp`, `terrain/<ad>.webp`, `decor/<ad>.webp`,
  `islands/<islandId>.webp`, `islands/map-<islandId>.webp`.
- Kaynak (yüksek çözünürlük, PSD/PNG) depoya girmez; yalnız oyunda kullanılan
  boyut girer. Üretim tarifleri (prompt'lar) `tools/art/prompts/<grup>.md`
  dosyalarına yazılır, böylece set yeniden üretilebilir.

---

## 3. Envanter ve kararlar

Öncelik: **A** = ilk görünen / en çok göze batan, **B** = sık görülen,
**C** = derin sayfalar.

| # | Grup | Bugün | Adet | Karar | Öncelik |
|---|---|---|---|---|---|
| 1 | Arayüz kiti: üst bar plakası, alt bar, sayfa çerçevesi (9-dilim), şerit başlık, düğme (altın/parşömen/kırmızı), sekme, çip, rozet, ilerleme çubuğu | CSS gradyan | ~15 parça | **Yeni boyalı kit** | A |
| 2 | Kaynak ikonları: akçe, kereste, ilim, kahve, mermer, kristal, kükürt, nüfus, sefer hakkı, huzur, yolsuzluk (0.42: taş oyundan çıktı, üzüm → kahve) | SVG | 11 | **Yeniden çiz** | A |
| 3 | Alt bar ikonları (Şehir, Ada, Harita, İttifak, Görevler) + sağ sütun (bayrak, liman, belediye, teklif) | SVG çizgi | 9 | **Yeniden çiz** (boyalı madalyon içinde) | A |
| 4 | Danışman portreleri (şehir, ordu, ilim, diplomasi) | SVG çizgi film | 4 | **Yeniden çiz** | A |
| 5 | Şehir zemini: çim, toprak yol, meydan taşı, kıyı, deniz, uzak dağ/tepe | düz prosedürel doku | ~10 doku + 1 arka plan | **Yeni boyalı zemin kiti** | A |
| 6 | Şehir dekoru (servi, çınar, zeytin, çalı, çiçek, lale, kaya, kuyu, çeşme, tezgâh, değirmen, bostan, mezarlık, kovan, saman, odun) | prosedürel PNG | 21 | **Yeniden çiz** + 10 yeni çeşit (bkz. 5.3) | A |
| 7 | Birlikler | SVG figür | 29 | **Yeniden çiz** (aynı poz, 3/4 boy) | B |
| 8 | Surlar: duvar parçası, kule, kapı × 3 kademe | prosedürel | 9 | **Yeni çiz** (eksik) | B |
| 9 | Ada maden/orman, köy/korsan ini/kale, inşaat alanı, iskele, pazar | prosedürel | 11 | **Yeniden çiz** | B |
| 10 | Adalar (ada sahnesi + harita küçük resmi) | aynı tip yeşil leke | 16 × 2 | **Yeniden çiz**, her ada kendine özgü (koy, tepe, orman, kayalık) | B |
| 11 | Dünya haritası denizi ve çerçevesi | düz mavi + ızgara | 1 doku + çerçeve | **Yeniden çiz** | B |
| 12 | Gemiler (ticaret, savaş, ablukacı) | prosedürel | 4 | **Yeniden çiz** | B |
| 13 | Tanrı portreleri, lonca amblemleri, mucizeler, yönetim biçimleri, Karagöz oyunları | SVG/emoji benzeri | 8+6+8+8+4 | **Yeniden çiz** | C |
| 14 | Araştırma amblemleri | SVG madalyon | 76 | 5 dal çerçevesi + 76 boyalı simge | C |
| 15 | Başarım madalyaları | SVG | 30 | 30 simge + 3 kademe çerçevesi (tunç/gümüş/altın) | C |
| 16 | Yapay rakip hükümdar portreleri | yok (arma) | ~14 | **Yeni çiz** (eksik) | C |
| 17 | Savaş meydanı arka planı (kara/deniz) | yok | 2 | **Yeni çiz** (eksik) | C |
| 18 | Giriş ekranı: arka plan + "Payitaht Adaları" logo plakası (yazısız süs çerçevesi) | kolaj iyi | 2 | Kolaj **korunur**; arka plan ve logo süsü yenilenir | C |
| 19 | Uygulama ikonu, açılış ekranı | basit SVG | 2 | **Yeniden çiz** | C |
| 20 | Boyalı bina seti | iyi | 37 × 3 | **Korunur.** Yalnız stil sayfasıyla uyuşmayanlar yeniden (G10'da liste çıkar). 0.42 değişikliği: Taş Ocağı (`tas`) kaldırıldı, çizilmez; `bagci` artık **Kahve Fidanlığı**, `mahzen` **Kahve Kileri** — ikisi kahve temasıyla (fidan sıraları, çuval, kavurma ocağı / serin kiler, çuval yığını) yeniden çizilir; ada madeni `mine-kahve.webp` kahve bahçesi olur | C |
| 21 | Armalar ve sancaklar (12 simge, renk seçilir) | SVG | — | **SVG kalır** (renk çalışma anında boyanıyor); yalnız boyalı kalkan çerçevesi eklenir | C |
| 22 | 16 px altı küçük glifler (ok, artı, kapat, onay) | SVG | — | **SVG kalır** (küçük boyda boyalı ikon okunmaz) | — |

---

## 4. "Normal online oyun" görünümü — ekran ekran

Değişiklik iki türlü: **görsel** (yeni çizim) ve **yerleşim** (kod). Yerleşim
değişikliği oyunun davranışını değiştirmez; yalnız aynı bilgiyi oyun gibi sunar.

### 4.1 Üst bar
- Sol üst: hükümdar arması büyük, altında **seviye rozeti** (Divanhane), yanında
  **güç sayısı** (`might`) küçük kılıç ikonuyla.
- Kaynak kapsülleri: boyalı ikon solda, sayı, sağda küçük **+** (Çarşı/tüccara
  götürür). Üretim hızı kalıcı yazmaz; kapsüle dokununca açılan defterde görünür.
- Dolu ambar: kapsül kırmızı + köşede "!" (0.39'da var, boyalı hale gelecek).
- Danışmanlar dairesel boyalı portre, haber varsa pirinç çerçeve parlar.

### 4.2 Sağ ve sol sütun (şehir ekranı)
- **Sağ sütun** (yuvarlak boyalı düğmeler, üstten alta): Günlük görev/ödül,
  Haftalık olay (geri sayımlı), Elçi mektubu (yapay rakip teklifi), Raporlar.
  Bugünkü bayrak/çapa/belediye düğmeleri haritanın sol altına küçük "harita
  araçları" olarak iner.
- **Sol sütun:** inşaat sırası kartları (bina küçük resmi + kalan süre çubuğu),
  eğitim sırası, süren sefer. Mobil strateji oyunlarının hepsinde böyle;
  oyuncu ne beklediğini haritadan görür.

### 4.3 Alt bar
- Beş sekme boyalı ikon + etiket; ortadaki büyük yuvarlak **Harita** düğmesi
  kalır (pusula madalyonu boyalı olur). Seçili sekme altın yarım ay ile.

### 4.4 Şehir haritası
- Yeni boyalı zemin kiti (çim tonları, taş döşeli meydan, tozlu yol, kıyı köpüğü).
- Boş çayırlar dolu görünmeli: dekor yoğunluğu yaklaşık 2 katı, kümeler hâlinde
  (koruluk, bostan, bağ, kayalık). Arsalar ve yollar boş kalır (kod zaten
  denetliyor: `clearForDecor`).
- Binalar ekranda biraz büyük dursun: başlangıç yakınlaştırması gözden
  geçirilir (`cityZoom`), bina ölçeği değişmez.
- Ufukta boyalı tepe/dağ silueti ve denizde gemiler (var, yeniden çizilecek).

### 4.5 Sayfalar
- Bütün sayfalar boyalı **sayfa çerçevesi** (9-dilim) + **şerit başlık** kullanır.
- Araştırma: pastel dal sekmeleri yerine dal renginde boyalı sekmeler; amblem
  madalyonları yeni setten.
- Birlik kartları: yeni boyalı birlik figürleri, rol rozeti (ön cephe, menzil…).

### 4.6 Ada ve dünya haritası
- Her ada kendine özgü siluet ve karakter (ad ile uyumlu: Kartal Adası kayalık,
  Zeytin Adası zeytinlik, Fener Adası deniz feneri…).
- Deniz boyalı doku, ızgara çizgisi çok silik ya da yok; harita kenarına
  pirinç süslü çerçeve.

---

## 5. Fazlar (sırayla; her biri ayrı commit)

| Faz | İş | Çıktı | Kodda bağlanacak yer |
|---|---|---|---|
| **G0** | Stil sayfası: bir sayfada 1 bina (mevcut divan), 1 birlik (yeniçeri), 1 portre (şehir danışmanı), 3 kaynak ikonu, 1 düğme, 1 ağaç. Prompt kökü `tools/art/prompts/_kok.md`. | `docs/stil-sayfasi.webp` | — **Onay durağı.** |
| **G1** | Arayüz kiti (envanter #1) | `ui/*.webp` | `app/styles/*` (CSS `border-image` / arka plan), `game-button.tsx`, `ika-hud.tsx`, alt bar |
| **G2** | Kaynak + alt bar + sütun ikonları (#2, #3) · **onay durağı** | `icons/*.webp` | `resource-art.tsx`, `ui-art.tsx` (ikon bileşeni aynı adla `<img>` döndürür; küçük glifler SVG kalır) |
| **G3** | Danışman portreleri (#4) | `portraits/advisor-*.webp` | `advisor-portraits.tsx` |
| **G4** | Şehir zemini + dekor (#5, #6) ve yerleşim 4.4 · **onay durağı** | `terrain/*`, `decor/*` | `lib/game/city-map/terrain-builder.ts` ve `terrain/*.ts` (`TERRAIN_TILES`, `DECOR_TILES`, `preloadTerrain`) |
| **G5** | Üst bar ve sütun yerleşimi (4.1–4.3) | — | `ika-hud.tsx`, `city-scene.tsx`, `game-shell.tsx` |
| **G6** | Birlikler (#7) · **onay durağı** | `units/*.webp` | `unit-art.tsx` (`UnitFigure` aynı imza, `<img>`) |
| **G7** | Surlar, maden, yerleşimler, iskele, gemiler (#8, #9, #12) | `buildings/*`, `walls/*`, `ships/*` | `components/game/city/walls.ts`, `phaser-city.ts` |
| **G8** | Adalar ve dünya haritası (#10, #11) | `islands/*` | `island-view.tsx`, `world-map.tsx` |
| **G9** | Derin sayfalar (#13–#17) | `portraits/*`, `research/*`, `medals/*` | `gods-panel.tsx`, `research-art.tsx`, `profile-panel.tsx`, `battle-view.tsx` |
| **G10** | Bina seti denetimi (#20): 38×3 binanın stil sayfasıyla temas sayfası; uymayanlar yeniden | liste + yeni webp'ler | `half-size.py` ile `-sm` |
| **G11** | Giriş ekranı, uygulama ikonu, açılış (#18, #19) | `public/icon-*`, giriş arka planı | `title-screen.tsx`, `capacitor.config.ts` ikon seti |

---

## 6. Her fazın kontrolü (hepsi geçmeden commit yok)

Komutlar `payitaht/` içinde:

```bash
npx tsc --noEmit
npx tsx --test $(find lib -name '*.test.ts')
pnpm lint                      # ESLint, sıfır uyarı
node tools/css-lint.cjs && node tools/unused-css.cjs --strict
node tools/unused-assets.cjs   # eski görsel kaldıysa sil
python3 tools/art/half-size.py --check
node tools/v2-criteria.cjs     # telefonda bina görselleri ≤ 15 MB vb.
# derleme + yerel sunucu (bkz. .github/workflows/visual-qa.yml)
node tools/layout-qa.cjs       # 360×740 ve %130 yazı: taşma/isimsiz 0
VISUAL_QA_VIEWPORTS=390x844 node tools/visual-qa.cjs
node tools/first-ten-qa.cjs    # rehber hâlâ baştan sona çalışıyor
```

Ek kurallar:

- **Boyut bütçesi:** ikon ≤ 12 KB, portre/birlik ≤ 60 KB, zemin dokusu ≤ 150 KB.
  Toplam indirilen görsel telefonda 15 MB'ı geçmez.
- Yeni görsel `public/sw.js` önbellek listesine girer; sürüm artar
  (`payitaht-shell-vNN`) ve `lib/pwa-cache.test.ts` güncellenir.
- Erişilebilirlik bozulmaz: ikon `<img>` olunca `alt=""` + düğmede `aria-label`
  kalır (layout-qa "isimsiz" kuralı yakalar).
- Renk körlüğü işaretleri (dolu ambar "!", seçili renk ✓) korunur.
- Hafif mod (`liteMode`) ve Android'de yalnız küçük kopyalar yüklenir.

---

## 7. Dokunulmayacaklar

- Oyun kuralları, sayılar, ekonomi, savaş (`lib/game/core/*`, `missions/*`, `rivals/*`).
- Kayıt biçimi ve göç zinciri (`core/save.ts`); eski kayıt örnekleri açılmaya devam etmeli.
- Slot koordinatları, 2×2 ayak izi, bina çapası (`lib/game/city-map/*` geometri dosyaları).
- Metinler (`lib/i18n/tr.ts` ve veri dosyaları).
- Rakiplerin adı "yapay rakip"tir; arayüzde "oyuncu" diye gösterilmez.

---

## 8. Haklar

- `public/images/game/CREDITS.md`'ye her grup için: üreten araç (ör. "Codex görsel
  üretimi, <tarih>"), prompt dosyasının yolu, lisans notu.
- Boyalı bina setinin kaynağı hâlâ yazılı değil (bkz. CREDITS.md bölüm 2); depo
  sahibi doldurmadan mağazaya çıkılmaz.
- Başka oyunlardan (Ikariam, Forge of Empires vb.) görsel, kesit ya da birebir
  kompozisyon kopyalanmaz; yalnız kalite ve his referansıdır.

## 9. Son aşamalar — 2026-10-04

G9 derin sayfalar, G10 bina denetimi/kahve teması ve G11 açılış/uygulama
kimliği tamamlandı. Üretim tarifleri `tools/art/prompts/g9.md`, `g10.md`,
`g11.md`; öncesi/sonrası ve kontroller `visual-review/G9`, `G10`, `G11`.

- G9: 76 araştırma, 8 tanrı, 14 yapay rakip, 30 başarım, kültür seti, kara/deniz arka planı.
- G10: 114 bina tuvali denetlendi, altı kahve aşaması düzeltildi; geometri korundu.
- G11: açılış kıyısı, yazısız plaket, web/native ikon ve splash kimliği.
- Son telefon görsel bütçesi 14.791.003 bayt / 15 MB; SW v40.
- Oyun kuralları, kayıt biçimi ve slot geometrisi korundu.
