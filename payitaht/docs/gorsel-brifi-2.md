# Görsel brif 2 — "Mockup moduna" geçiş (Codex için)

Bu brif `docs/gorsel-brifi.md` (G0–G11, tamamlandı) üstüne kurulur. Oradaki
sanat kılavuzu, kontrol listesi (Bölüm 6), dosya/sıkıştırma kuralları ve
"oyun kuralı, ekonomi, kayıt biçimi ve slot koordinatları izinsiz değişmez"
kuralı aynen geçerlidir.

## Hedef

Kullanıcı ChatGPT ile oyunun nasıl görünmesini istediğini gösteren tam ekran
mockup'lar üretti: `docs/mockups/*.webp`. Bunlar **hedef görünüm**dür; yazıları,
sayıları ve bazı ayrıntıları uydurmadır.

Mockup'lardan ALINMAYACAKLAR: rakip sancağındaki zambak (fleur-de-lis) — rakipler
kendi armalarını kullanır; tarih yazıları (ör. "1526"); "Çamkoru/Ege Adası" gibi
oyunda olmayan adlar; "5/5" araştırma seviyeleri (bizde yok); uydurma sayılar.

## İş bölümü

Claude aynı anda şu sayfaların **yerleşimini kodda** yeniden yapıyor; bu
dosyalara DOKUNMA (çakışma olur):
`building-page.tsx`, `battle-view.tsx` ve savaş raporu bileşenleri,
araştırma sayfası (`research-*`, `ikariam-panels.tsx` içindeki araştırma bölümü),
bunların stil dosyaları. Bu sayfalar için yeni çizim gerekirse Claude ister.

Senin fazların (sırayla; her fazın başında `claude/ancient-city-phaser-game-r9e0qu`
dalını `codex/gorsel`e MERGE et, changelog/sürüm/kayıt örneklerine dokunma, SW'yi
bir artır):

### H1 — Giriş ekranı arka planı (mockup: `giris.webp`)
- Mockup'taki manzarayı (gün batımında Payitaht, kubbeler, minareler, koyda
  kalyonlar, önde çiçekli taş balkon) **yazısız ve düğmesiz** üret. Logo plakası
  ve düğmeler koddan gelir (`title-screen.tsx`, `ui/title-plaque.webp`).
- Dikey; üst %35 gökyüzü/logo için sakin, alt %30 düğmeler için sade kalsın.
- `terrain/title-background.webp` yerini alır; telefon için ≤250 KB.

### H2 — 16 adanın küçük harita resimleri (mockup: `dunya-haritasi.webp`)
- G8'deki `islands/map-*.webp` adalarının hepsi aynı oval silüetten çıkıyor.
  Her adaya **kendine özgü silüet** ver (volkan, kızıl kaya, palmiyeli koy,
  çam ormanlı burun, iki tepeli, uzun ince ada…), kıyı köpüğü ve sığ su halesiyle.
- Adanın görsel merkezi ve tıklama merkezi değişmez (`world-map.tsx`'teki
  konumlar aynı kalır); yalnız resim değişir. Sancak ve isim plakası koddan gelir,
  resme gömme.
- Her biri ≤12 KB. Kanıt: 16 adanın temas sayfası + dünya haritası 390×844.

### H3 — Şehir taban resmi: 5 gelişme aşaması (mockup: `sehir-erken.webp`)
İlk iki deneme reddedildi: (1) karolardan yapıştırma; (2) 384×355 kaynaktan 6×
büyütülmüş, üstte erimiş bölgesi olan ve kendi yerleşimini uyduran resim.
Kullanıcı notu: arsalar sıkışık ve dar olmasın, binalar iç içe girmesin.

**Girdiler (hepsi aynı bölge, aynı geometri):**
- `docs/mockups/sehir-taban-sablon.png` (2256×2630): gerçek yerleşim şeması.
  Üreten `tools/art/city-base-template.py`; bölge ve ölçek
  `tools/art/city-base-region.json` (dünya x −3536…976, y 1640…6900, ölçek 0,5).
- `docs/mockups/taban/alt-resim-1…5.webp` (1128×1315, yarım ölçek): oyunun
  KENDİ zemini, binasız; arsalar taş kenarlı toprak, kıyı arsaları rıhtım taşı,
  açık çizgi = sur temeli. Üreten `tools/art/city-underlay.cjs`.
- 24 kara arsası + Divanhane meydanı + 3 kıyı arsası + **korsan adası** (liman
  ağzında küçük kayalık ada; yalnız Korsan Kalesi kurulur — yeni).

**Yöntem (zorunlu):** her aşamayı ImageGen ile alt-resmin ÜSTÜNE resimden
resme düzenleme olarak boya: arsalar, yollar, meydan, kıyı çizgisi, rıhtım ve
ada yerinde kalır; yalnız yüzey mockup diline boyanır. Kendi yerleşimini
uydurma. Beş aşamayı birbirinden değil, hep kendi alt-resminden türet ki
arsalar beşinde de aynı yerde dursun.

**Aşamalar (Divanhane seviyesi → ortam):**
1. Sv 1–2 · köy: toprak yollar, çimenli toprak meydan, ahşap iskele, dağınık
   çalı/kaya, dış arsalar otla yarı kaplı (ama yerleri belli).
2. Sv 3–4 · kasaba: sıkıştırılmış toprak + çakıl yollar, meydanda ilk taşlar,
   taş kenarlı arsalar, küçük bostanlar.
3. Sv 5–6 · şehir: kaldırım yollar, taş döşeli meydan, çeşme, servi sıraları,
   taş rıhtım.
4. Sv 7–9 · zengin şehir: geniş kaldırım caddeler, mermer kenarlı meydan,
   lale tarhları, fenerler, bahçeler.
5. Sv 10+ · payitaht: mermer meydan ve havuz, çınar ve servi bulvarları,
   süslü rıhtım ve deniz feneri, adada iskele.

**Kurallar:**
- **Hiç bina ve sur çizme** (sur, kule, kapı koddan gelir; temel çizgisi boş
  kalsın). Arsaların üstü boş: taş kenarlı düz zemin + küçük kırmızı flama.
- Arsa zemini şablondaki elmas kadar (en çok 1,15 katı); komşu iki arsa
  arasında en az bir arsa genişliği çim/ağaç/yol kalsın. Ağaçlar arsaya ve
  yola girmesin.
- Arsa merkezleri şablondaki elmas merkezleriyle ±%1 içinde örtüşmeli.
  Kendi kontrolünü yap: şablonu yarı saydam bindirip her aşama için tek kare.
- Çözünürlük: son resim **2256×2630** (ölçek 0,5). ImageGen tek seferde bu
  boyutu vermiyorsa resmi dört çeyrek halinde (kenarlarda ~%10 bindirmeyle)
  kendi doğal çözünürlüğünde boya ve birleştir. **Büyütme en çok 2×**;
  bulanık/lapa görünen resim reddedilir. Kaynak boyutlarını ve her adımı
  `visual-review/H3/source-info.json`a yaz.
- Telefon kopyası her aşama için ≤700 KB WebP.
- CI/GitHub Actions ile resim üretme veya commit atma YOK; geçici
  üreteç/parça dosyası depoya girmesin.
- Oyuna BAĞLAMA. Dosyalar: `public/images/game/terrain/city-base-1…5.webp`.
  Kanıt `visual-review/H3/`: beş aşama yan yana, her aşamanın şablon
  bindirmesi, aşama 3 üstüne beş boyalı binanın elle yerleştirildiği önizleme
  (Divanhane meydanda, konak/kereste/ambar/kışla kendi arsalarında, Korsan
  Kalesi adada) ve arsa merkezleri JSON'u.
- Bu fazdan sonra **dur ve onay bekle.**

### H4 — (H3 onaylanırsa) Claude bağlar: aşama resmi Divanhane seviyesine göre
yüklenir, prosedürel zemin onun altında yedek kalır.

## Kanıt ve kontroller
Her faz `visual-review/H<n>/` altına önce/sonra 390×844 ekranları ve README koyar;
Bölüm 6 kontrollerinin tamamı geçmeli.
