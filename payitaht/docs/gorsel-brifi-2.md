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

### H3 — Şehir taban resmi DENEMESİ (mockup: `sehir-erken.webp`, şablon: `sehir-taban-sablon.png`)
Bu bir denemedir; sonucu kullanıcı ve Claude birlikte değerlendirip karar verecek.
- `docs/mockups/sehir-taban-sablon.png` (üreten: `tools/art/city-base-template.py`)
  şehrin GERÇEK yerleşimidir: 24 bina arsası, Divanhane, 3 kıyı arsası, meydan,
  halka yol ve caddeler, sur temeli, kapılar ve kıyı çizgisi.
- Bu şablonun **üstüne, aynı oran ve konumlarla** binasız bir şehir zemini boya:
  mockup'taki gibi taş döşeli meydan, kenarı taşla çevrili boş arsalar (her
  arsada küçük kırmızı flama), çam/servi kümeleri, tepeler, kıyı ve liman rıhtımı.
  **Hiç bina çizme**; sur da çizme (sur kademeleri koddan gelir).
- Arsaların merkezi şablondaki elmasların merkeziyle ±1 % içinde örtüşmeli.
  Kendi kontrolünü yap: şablonu yarı saydam üstüne bindirip tek kare ver.
- Çözünürlük: en az 2336×2160 (şablonun 2 katı). Telefon kopyası ≤1,2 MB.
- Oyuna BAĞLAMA. Yalnız `public/images/game/terrain/city-base-test.webp` olarak
  ekle ve kanıt klasörüne: taban resmi, şablon bindirmesi, mevcut boyalı
  binaların (Divanhane, konak, kereste ocağı, ambar, kışla) Photoshop-tarzı
  elle yerleştirilmiş bir önizlemesi.
- Bu fazdan sonra **dur ve onay bekle.**

### H4 — (H3 onaylanırsa yazılacak) Taban resmini Phaser'a bağlama ve ada görünümü.

## Kanıt ve kontroller
Her faz `visual-review/H<n>/` altına önce/sonra 390×844 ekranları ve README koyar;
Bölüm 6 kontrollerinin tamamı geçmeli.
