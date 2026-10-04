# Payitaht Master Asset Manifest

> Kaynak: 2026-10-04 canlı repo denetimi. Bu liste eski briflerdeki sayılardan değil canlı kataloglardan türetilmiştir.
> Üretim dalı: `codex/master-art-bible`.
> Kural: Bu manifestte üretilen review görselleri kullanıcı onayı gelmeden canlı oyuna bağlanmaz.

## Durum kodları
- **KEEP** — mevcut iş görür, yalnız bütün set içinde QA yapılır.
- **POLISH** — temel fikir iyi ama Master Art Bible'a göre yeniden/iyileştirme gerekir.
- **REDRAW** — yeni görsel üretilir.
- **NEW** — canlı katalog için eksik yeni görsel.
- **RUNTIME** — bağımsız raster yerine kod/runtime katmanında kalır.

---

# A. UI / HUD

## A1. Ana UI malzemeleri — 7
1. `ui/page-frame.webp` — sayfa/kart çerçevesi — POLISH
2. `ui/walnut-plate.webp` — ceviz başlık/bar — KEEP/POLISH
3. `ui/button-gold.webp` — birincil buton — KEEP/POLISH
4. `ui/button-parch.webp` — ikincil/parşömen buton — KEEP/POLISH
5. `ui/button-red.webp` — tehlike/alarm — KEEP/POLISH
6. `ui/ribbon-red.webp` — bölüm şeridi — POLISH
7. `ui/medal-frame.webp` — dairesel ikon çerçevesi — POLISH

## A2. Üst/alt bar referans parçaları — 8
- `ui/reference-bars/wood.webp`
- `ui/reference-bars/crest.webp`
- `ui/reference-bars/card.webp`
- `ui/reference-bars/nav.webp`
- `ui/reference-bars/city.webp`
- `ui/reference-bars/army.webp`
- `ui/reference-bars/research.webp`
- `ui/reference-bars/diplo.webp`

Durum: KEEP. Yeni UI bunun malzeme ve kontrast diline yaklaşır.

## A3. Kaynak / durum ikonları — 11
1. `res-akce` — Akçe
2. `res-kereste` — Kereste
3. `res-ilim` — İlim
4. `res-kahve` — Kahve
5. `res-mermer` — Mermer
6. `res-kristal` — Kristal
7. `res-kukurt` — Kükürt
8. `res-nufus` — Nüfus
9. `res-sefer` — Sefer hakkı
10. `res-huzur` — Huzur
11. `res-yolsuzluk` — Yolsuzluk

Durum: POLISH/KEEP; bütün set aynı ışık ve ölçekle yeniden QA.

## A4. Ana navigasyon / araç ikonları — 9+
- `ui-city`
- `ui-island`
- `ui-map`
- `ui-alliance`
- `ui-objectives`
- `ui-flag`
- `ui-harbour`
- `ui-divan`
- `ui-offer`

Ek küçük glifler (ok, artı, kapat, onay vb.) **RUNTIME/SVG kalır**; 16 px altında boyalı görsel zorlanmaz.

## A5. Danışman portreleri — 4
- `advisor-city`
- `advisor-army`
- `advisor-research`
- `advisor-diplo`

Durum: POLISH; 42–56 px yüz okunabilirliği zorunlu.

---

# B. Şehir zemini ve dekor

## B1. Zemin / çevre dokuları — çekirdek 11
- grass
- dirt
- grass-shade
- grass-dry
- plaza-stone
- cobble
- quay-stone
- shore-sand
- water-shallow
- water-deep
- hills

Durum: POLISH. Hedef: şehir binalarıyla aynı boyalı gerçeklik; tekrar paterni görünmemeli.

## B2. Dekor ailesi — mevcut G4 toplamı 31 civarı / G4 faz toplamı 42 dosya
Ana çekirdek:
- olive-tree
- bush
- flower
- rock
- cypress
- cypress-b
- pine
- plane-tree
- poplar

Master sette korunacak/üretilecek dekor türleri:
- zeytin ağacı varyantları ×3
- servi ×2
- çınar ×2
- çam ×2
- kavak ×2
- çalı ×3
- çiçek/lale tarhı ×3
- kaya ×3
- kuyu
- çeşme küçük
- çeşme anıtsal
- ahşap tezgâh
- pazar tentesi
- bostan
- arı kovanı
- saman demeti
- odun yığını
- amphora/küp grubu
- bank/oturma
- fener/direk
- küçük mezarlık grubu
- değirmen/dekoratif üretim prop'u

Durum: POLISH/REDRAW. Arsa ve yolları işgal etmeyecek runtime dekor olarak kalır.

## B3. Şehir taban resmi — 5 gelişim aşaması
1. Divanhane Sv 1–2 — köy
2. Sv 3–4 — kasaba
3. Sv 5–6 — şehir
4. Sv 7–9 — zengin şehir
5. Sv 10+ — payitaht

Dosya hedefi: `terrain/city-base-1.webp` … `city-base-5.webp`.
Durum: **NEW / GEOMETRY-LOCKED**. Repo içindeki `sehir-taban-sablon.png` ve `taban/alt-resim-*` üstüne img2img/edit gerekir; sıfırdan serbest kompozisyon yapılmaz.

---

# C. Bina kataloğu — canlı 37 ID

Her bina için üç seviye aşaması hedeflenir: I / II / III. Temel sayı: **37 × 3 = 111 ana bina görseli**.

## C1. Yönetim / kamusal
1. `divan` — Divanhane
2. `saray` — Saray
3. `valilik` — Valilik
4. `elcilik` — Elçilik
5. `harita_arsivi` — Harita Arşivi

## C2. Halk / ticaret / kültür
6. `konut` — Konaklar
7. `hamam` — Hamam
8. `carsi` — Çarşı
9. `ticaret_merkezi` — Ticaret Merkezi
10. `kara_pazar` — Kara Pazar
11. `kahvehane` — Kahvehane
12. `cami` — Cami
13. `muze` — Müze
14. `karagoz` — Karagöz Perdesi

## C3. Depolama / üretim / zanaat
15. `ambar` — Ambar
16. `depo` — Depo
17. `kereste` — Kereste Ocağı
18. `marangoz` — Marangozhane
19. `mimar` — Mimarbaşı Odası
20. `ormanci` — Ormancı Evi
21. `tasci` — Taşçı Ustası
22. `bagci` — Kahve Fidanlığı
23. `mahzen` — Kahve Kileri
24. `camci` — Camcı Atölyesi
25. `simyahane` — Simyahane
26. `gozlukcu` — Gözlükçü
27. `barutane` — Barut Deneme Alanı

## C4. Bilim / din / sosyal
28. `medrese` — Medrese
29. `tekke` — Ahi Tekkesi
30. `mabet` — Ongun Mabedi

## C5. Askerî
31. `kisla` — Kışla
32. `tophane` — Tophane
33. `siginak` — Gizli Sığınak
34. `surlar` — Surlar (panel art; şehir halkası runtime)
35. `korsan_kalesi` — Korsan Kalesi

## C6. Kıyı
36. `liman` — Ticaret Limanı
37. `tersane` — Tersane

### C7. Kıyı yön varyantları
`liman` ve `tersane` için canlı sistem `left / straight / right` yönünü destekler. Aynalama ile çözülemeyen kompozisyonlar için düz yön varyantları ayrı tutulur. Hedef denetim: 3 aşama × normal/düz = bina başına 6 dosya gerekip gerekmediğini gerçek oyunda kontrol et.

### C8. Bina kalite kararı
Mevcut boyalı set körlemesine atılmayacak. Her bina Master Art Bible temas sayfasında üç aşamasıyla karşılaştırılır:
- ölçek/ground contact yanlışsa REDRAW,
- kamera/ışık farklıysa REDRAW,
- mimari aile okunmuyorsa REDRAW,
- sadece renk/kontrast sapıyorsa POLISH,
- uyuyorsa KEEP.

Özel notlar:
- Kışla: son `barracks-courtyard` pilotunun kalite dili referans.
- Medrese: teleskop/astronomi karakteri güçlü olmalı; bina yolu işgal edecek kadar yayılmamalı.
- Kahve Fidanlığı ve Kahve Kileri eski üzüm/mahzen çağrışımından tamamen temizlenmeli.
- Ticaret Limanı/Tersane kara binası gibi durmamalı; rıhtım/kızak işlevi okunmalı.
- Korsan Kalesi hem kıyı slotunda hem korsan adasında okunabilir taban temasına sahip olmalı.

---

# D. İnşaat / ada / NPC yardımcı yapıları

## D1. İnşaat
- `buildings/site.webp`
- `buildings/scaffold.webp`
Durum: REDRAW/POLISH.

## D2. Ada ortak kaynak yapıları
- `forest-hero`
- `mine-kahve`
- `mine-mermer`
- `mine-kristal`
- `mine-kukurt`
Durum: POLISH/REDRAW.

## D3. NPC yerleşim görselleri
- köy
- korsan ini / korsan yerleşimi
- kale
- pazar / ticaret noktası
- iskele
Durum: REDRAW. Aynı dünya ölçeği ve ada paletine uyar.

---

# E. Surlar / savunma

Şehirde gerçek sur raster olarak gerilmez; runtime halka kullanılır.

Hedef boyalı modüler set:
1. duvar segmenti kademe 1
2. duvar segmenti kademe 2
3. duvar segmenti kademe 3
4. yuvarlak kule kademe 1
5. yuvarlak kule kademe 2
6. yuvarlak kule kademe 3
7. kapı kademe 1
8. kapı kademe 2
9. kapı kademe 3

Ek runtime efektleri: temel/hendek, işgal hasarı, kuşatma dumanı — RUNTIME.

---

# F. Birlikler — canlı 29

Her biri 512×512 şeffaf kaynak, 3/4 gövde/obje, sağa dönük; gerçek kullanım 56 px QA.

## F1. Kara — 17
1. yeniceri
2. okcu
3. sipahi
4. topcu
5. casus
6. mizrakci
7. azap
8. sapanci
9. tufekci
10. kocbasi
11. mancinik
12. asci
13. hekim
14. deli
15. humbaraci
16. hezarfen
17. lagari

## F2. Deniz — 12
18. kadirga
19. kalyon
20. nakliye
21. ates_gemisi
22. mancinik_gemisi
23. karamursel
24. humbara_gemisi
25. ikmal_gemisi
26. zenberek_gemisi
27. dalgic_gemisi
28. buharli_koc
29. balon_gemisi

Durum: mevcut G6 boyalı set var; tümü Master Art Bible ile toplu QA, sorunlu figür REDRAW.

---

# G. Şehir/ada atmosfer gemileri

`public/images/game/ships/` mevcut sahne sprite'ları:
- blockade
- fishing
- ship-a
- ship-b
- dosyadaki diğer güncel sahne varyantları, `ships/` klasörü üzerinden denetlenir.

Bunlar UnitFigure savaş gemilerinden ayrıdır: limanda/dünya sahnesinde atmosfer ve sefer görünümü için kullanılır. Hedef: tamamı aynı gövde/yelken/perspektif diline çekilir; PNG artıkları kaldırılmadan önce kullanım referansları kontrol edilir.

---

# H. Adalar ve dünya haritası — 16 ada

Canlı ada ID’leri:
1. sahil
2. zeytin
3. akcam
4. kizil
5. akdeniz
6. yalcin
7. baglik
8. atessiz
9. mercan
10. sakiz
11. lodos
12. kartal
13. poyraz
14. fener
15. hisarada
16. lalezar

Her ada için iki ölçek ailesi hedeflenir:
- ada ekranı ana görseli
- dünya haritası küçük silüeti

Toplam: **32 ada görseli**.

Her ada benzersiz kıyı/silüet karakterine sahip olur: volkanik/kızıl kaya, çam burnu, çift tepe, uzun ince ada, palmiyeli koy, sarp kaya, mercan sığlığı, fener burnu vb. Aynı oval ada yalnız renk değiştirerek tekrar edilmez.

Dünya haritası ekleri:
- world sea/background texture
- world ornamental frame / map edge
- rota çizgisi/işaretler RUNTIME

---

# I. Araştırma sanatı — 76 canlı araştırma

Beş dal aynı çerçeve ailesi içinde farklı iç vurguya sahiptir:
- Ekonomi
- Bilim
- Askerî
- Denizcilik
- Mitoloji

Canlı ID listesi:
`tools, storage, ticaret, architecture, alimler, celik, istihkam, pusula, yelken, makara, geometri, su_terazisi, ormancilik, tascilik, kent_planlama, ambar_teknigi, kagit, murekkep, mekanik_kalem, talim, zirh, barut, askeri_lojistik, haritacilik, yukleme, gemi_govdesi, bagcilik, simya, camcilik, optik, tip, muhendislik, kusatma, rum_atesi, deniz_topculugu, koruma, zenginlik, tatil, mutfak, yardim_eli, yasama, burokrasi, utopya, kuyu, casusluk, devlet, kultur, anatomi, deney, din, kus_ucusu, matbaa, kuru_havuz, meslek_ordusu, seref, balistik, top_dokum, guverte, korsanlik, genisleme, zift, yabanci_kultur, hafif_tekne, ikmal, havan, kanat, roket, zenberek, dalgic, buhar, ongun_toresi, balbal, destan, kam_ayini, tore, gok_kutu`.

Üretim mantığı:
- 1 dış çerçeve ailesi × 5 dal varyantı
- 76 ayrı ana simge
- oyunda atlaslanabilir; review kaynağında tek tek görünür.

---

# J. Derin oyun kültür assetleri

## J1. Kadim tanrı/ongun — 8
- tengri
- umay
- ulgen
- kayra
- erlik
- kizagan
- su
- yel

## J2. Mucizeler / ada harikası simgeleri — 8
- kalkan
- bereket
- ilim
- savas
- ruzgar
- huzur
- bolluk
- demirci

## J3. Yönetim biçimleri — 8
- saltanat
- ayan
- sipahi
- meclis
- kanun
- loncalar
- ilmiye
- mesihat

## J4. Loncalar — 6
- demirci
- gemici
- tuccar
- dulger
- katip
- kahveci

## J5. Karagöz gösterileri — 4
- dram
- komedi
- kultur
- tanrisal

Toplam ana kültür kavramı: **34**.
Durum: mevcut atlaslar var; Master Art Bible altında ikon/miniature dili toplu QA ve gerekirse REDRAW.

---

# K. Hükümdar / rakip portreleri — canlı 14

1. r-kemer — Kara Murad Bey
2. r-lale — Nilüfer Hatun
3. r-ilim — Molla Sadreddin
4. r-ates — Demirci Oruç Reis
5. r-mavi — Kaptan Hızır
6. r-kule — Sultan Hatun
7. r-bag — Hacı Bekir Ağa
8. r-kor — Turgut Reis
9. r-cinar — Gülbahar Sultan
10. r-sarp — Deli Ali Paşa
11. r-mercan — Piyale Reis
12. r-sakiz — Mihrimah Hatun
13. r-kartal — Koca Yusuf Ağa
14. r-fener — Ali Kuşçu Efendi

Kural: Her yüz ayrı karakter tasarımıdır; aynı yüzün sakal/başlık varyasyonu yapılmaz. Stil türleri (tüccar/savaşçı/âlim/denizci) kostüm ve duruşa yansır fakat stereotipe dönüşmez.

---

# L. Profil / arma / başarı

## L1. Oyuncu arma sembolleri — 12
- hilal
- lale
- kilic
- gemi
- kule
- kitap
- gunes
- kartal
- kurt
- okyay
- cinar
- cark

İç sembol renklenebilir SVG/RUNTIME kalabilir; hedef yeni boyalı kalkan/metal dış çerçeve.

## L2. Başarı madalyaları — 30
Mevcut atlas: 6 × 5 = 30 hücre.
- 30 ayrı achievement simgesi
- 3 metal kademe çerçevesi: tunç / gümüş / altın

Kaynak review’da simgeler tek tek görülür, üretimde atlaslanabilir.

---

# M. Savaş ve rapor sahneleri

1. `terrain/battle-land.webp` — kara savaş alanı
2. `terrain/battle-sea.webp` — deniz savaş alanı
3. savaş raporu parşömen/başlık süsü — UI kit üzerinden
4. galibiyet/mağlubiyet görsel vurgusu — ayrı yazısız süs/efekt gerekirse NEW
5. kuşatma/işgal dumanı, alev, abluka işaretleri — RUNTIME/FX

Durum: kara/deniz arka planı POLISH; birlikleri boğmadan atmosfer yaratır.

---

# N. Giriş / marka / uygulama

1. `terrain/title-background.webp` — giriş manzarası — KEEP/POLISH
2. `ui/title-plaque.webp` — yazısız logo plakası — KEEP/POLISH
3. App icon ana kaynak — POLISH
4. Android/iOS adaptif icon katmanları — üretim türevi
5. Splash / launch art — POLISH

Logo yazısı kod/UI katmanında; manzaraya gömülmez.

---

# O. Bina sayfası atmosfer sahneleri

Mevcut pilot:
- `terrain/barracks-courtyard.webp` — Kışla

Master hedef: yalnız gerçekten fayda sağlayan ana bina ailelerine hero sahnesi üretmek; 37 binanın her biri için ağır full-scene zorunlu değildir. Öncelik:
1. Kışla — mevcut pilot
2. Medrese — avlu + astronomi/teleskop
3. Divanhane — devlet avlusu
4. Ticaret Limanı — hareketli rıhtım
5. Tersane — kızak/gemi yapımı
6. Saray — bahçe/revak
7. Çarşı/Ticaret Merkezi — han/arasta
8. Tophane — döküm/atölye
9. Ongun Mabedi — açık hava kutsal alanı
10. Kahvehane — sosyal avlu

Bu sahnelerde seviye, isim, buton ve sayı baked edilmez.

---

# P. Review üretim sırası

Kullanıcının “hepsine bakacağım, sonra yerleştiririz” isteği için üretim canlı entegrasyondan ayrılır.

## Wave 0 — Stil kilidi
- Master style board
- UI malzeme board
- dünya/bina malzeme board

## Wave 1 — İlk görünenler
- UI kit
- kaynak/menu ikonları
- 4 danışman
- şehir terrain/dekor

## Wave 2 — Oyun dünyası
- 37 bina temas sayfaları (3 aşama)
- sur modülleri
- ada kaynak/NPC yapıları
- atmosfer gemileri
- 16 ada

## Wave 3 — Ordu
- 17 kara birlik
- 12 deniz birlik/gemi
- battle land/sea

## Wave 4 — Derin sistemler
- 76 araştırma
- 8 tanrı
- 8 mucize
- 8 hükümet
- 6 lonca
- 4 gösteri
- 14 rakip portre
- 30 başarı

## Wave 5 — Marka ve ekran sahneleri
- giriş
- app icon / splash
- ana bina hero sahneleri
- savaş raporu atmosferi

## Wave 6 — Geometri kilitli şehir tabanı
- city-base-1…5 yalnız repo alt-resimleri üstüne kontrollü edit ile.

---

# Q. Yaklaşık üretim hacmi

Tekil konseptleri ve seviye varyantlarını birlikte sayınca çalışma evreni yaklaşık:
- UI + ikon + danışman: ~31
- terrain/dekor: ~42
- bina ana aşamaları: 111 (+ kıyı yön türevleri)
- sur: 9
- birlik: 29
- ada: 32
- ada/NPC/maden/inşaat/atmosfer gemisi: ~15–20
- araştırma: 76
- kültür: 34
- rakip portre: 14
- başarı: 30 + 3 çerçeve
- savaş/marka/hero sahneleri: ~15+

**Toplam review edilecek görsel kavram/varyant: yaklaşık 400.**

Bu nedenle kaliteyi korumak için üretim “aynı promptu 400 kere” şeklinde değil, aile başına ortak kök + bireysel brief + gerçek boyut QA ile yapılır.

---

# R. Yerleştirme öncesi kural

Bu manifestteki yeni görseller **kullanıcı tüm review setini görüp onaylayana kadar** mevcut canlı assetlerin üstüne yazılmaz. Üretim çıktıları review/staging alanında tutulur; entegrasyon ayrı adımda yapılır.