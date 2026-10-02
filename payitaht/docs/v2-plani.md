# Payitaht Adaları — Sürüm 2 düzeltme planı

Başlangıç noktası: **0.29.1** (2 Ekim 2026). Bu plan şu belgelerdeki bütün açık
maddeleri tek sıraya koyar:

- 0.29.0 öncesindeki "acımasız inceleme",
- [oyun-mu-uygulama-mi.md](./oyun-mu-uygulama-mi.md),
- [mobil-uyum-plani.md](./mobil-uyum-plani.md).

## V2 ne demek

V2, **telefonda baştan sona oyun gibi hissettiren, mağazaya konabilecek** sürümdür.
Bir maddenin "yapıldı" sayılması için ölçülebilir olması gerekir. V2 çıkışı şu
ölçütlerin **hepsi** sağlanınca olur:

| Ölçüt | Bugün (0.29.1) | V2 hedefi |
|---|---|---|
| Sayfa ve rapor görseli (10 üzerinden, inceleme notu) | 4,5 | **7+** |
| Oyun hissi | 4 | **7+** |
| Uzun vadeli tutunma | 3 | **6+** |
| UI kodu | 4 | **7+** |
| 360×740'ta taşan / kesilen öğe (otomatik test) | test yok | **0, CI'da zorunlu** |
| 44px altı dokunma hedefi | ölçülmüyor | **0** |
| Oyun ekranlarında Lucide çizgi ikon kullanan dosya | 25 | **≤ 5** (yalnız ayarlar ve "meta" ekranlar) |
| Oyun klasöründe shadcn `<Button>` | 136 | **0** (tek `GameButton`) |
| Oyun ekranlarındaki `<table>` | 22 | **≤ 4** (yalnız ayrıntı/ayrıntılı rapor) |
| Bina görselleri (indirilen) | ~34 MB | **≤ 15 MB** telefonda |
| İlk açılıştan şehre kadar süre (orta Android) | ölçülmüyor | **≤ 4 sn**, ölçülüp CI'da izlenir |
| Mobile Visual QA süresi | 19,5 dk (sınır 30) | **≤ 10 dk** |
| En büyük kaynak dosyası | phaser-city.ts 2.497 satır | **≤ 800 satır** |
| Testler | 243 | korunur, yeni her sistem testli |

## Kurallar (bütün fazlar için)

1. **Motor davranışı izinsiz değişmez.** Ekonomi ve savaş değişikliği yalnız Faz 5'te,
   testle birlikte yapılır.
2. **Kayıtlar bozulmaz.** Her kayıt alanı değişikliğinde ayrıştırıcı ve göç testi
   eklenir. Eski kayıt yeni sürümde açılır.
3. **Her ekran değişikliği 360×740 ve 390×844'te ekran görüntüsüyle bakılır.**
   Faz 0'dan sonra bunu taşma testi de denetler.
4. **Tek çizim dili.** Yeni görsel ya boyalı stilde olur ya da hiç eklenmez.
5. **Her sürüm** şunlarla çıkar:
   - sürüm notu,
   - service worker sürümü,
   - Android `versionCode` / `versionName`,
   - bütün CI işleri yeşil.

Boyut etiketleri: **S** = bir oturumda biter · **M** = iki-üç oturum · **L** = bir haftalık iş.

---

## Faz 0 — Güvenlik ağı (0.30)

Önce hataları kendiliğinden yakalayan araçlar. Sonraki her faz bunlara dayanır.

| # | İş | Boyut | Bitti sayılır |
|---|---|---|---|
| 0.1 | **Taşma testi CI'da.** `tools/layout-qa.cjs`: 360×740'ta bütün sayfalar ve bütün bina sayfaları açılır. Ekran dışına taşan öğe ya da ellipsis'siz kesilen metin varsa iş kırmızı olur. (Bu turda kullandığım tarayıcı betiği temel alınır.) | M | Bilerek eklenen bir taşma CI'ı düşürüyor. |
| 0.2 | **Dokunma hedefi kuralı** aynı teste eklenir: 44×44px altındaki her `button`/`[role=button]` raporlanır. | S | Liste boş, kural CI'da. |
| 0.3 | **Yazı boyu kuralı:** 11px altı metin raporlanır. Madalyon rakamları istisnadır (`data-tiny` ile işaretlenir). | S | Rapor boş. |
| 0.4 | **QA işini hızlandır:** visual-qa 3 paralel işe bölünür (şehir/harita, sayfalar, sancak). Sabit `waitForTimeout(6500)` yerine "Phaser ilk kareyi çizdi" sinyali beklenir (`window.__cityReady`). | M | Toplam ≤ 10 dk. |
| 0.5 | **Görsel fark testi:** 10 ana ekranın referans görüntüsü tutulur, %2'den fazla değişen piksel uyarı üretir (hata değil, PR'da gösterilir). | M | Değişiklikler ekran görüntüsüyle görünür. |
| 0.6 | **Açılış süresi ve bellek ölçümü:** QA'da "Devam et" ile şehrin ilk karesi arası süre ve JS heap ölçülüp `diagnostics.json`'a yazılır. Sınırı aşan uyarı verir. | S | Sayılar her koşuda görünüyor. |
| 0.7 | **Yerel hata kaydı:** yakalanmayan hatalar son 20 kayıtla cihazda tutulur. Ayarlar > Hakkında'da "Hata raporunu kopyala" düğmesi olur. (Sunucu yok, veri toplanmaz.) | S | Kasıtlı hata kaydı kopyalanabiliyor. |

**Durum: ✅ 0.30.0'da tamamlandı.** Uygulamada plandan sapmalar:

- **0.1–0.3:** `tools/layout-qa.cjs` 360×740'ta başlık ekranı, şehir, ada, 19 sayfa ve 38 bina sayfasını açar.
  - **Ek kural:** "çakışma" (yazının yanındaki düğmenin altında kalması).
  - **Öz-denetim:** Her koşuda bilerek bozuk öğeler enjekte edilir; test bunları yakalamazsa kendisi düşer.
  - **İlk ölçüm:** 95 taşma, 817 küçük dokunma alanı ve 2.211 minik yazı çıktı. Hepsi sıfıra indi.
    - CSS'te 11 px altındaki 110 yazı kuralı 11 px oldu.
    - Bütün düğme ve alanlar 44 px oldu; işçi kaydırıcısı ve rapor başlığı dar ekranda yeniden dizildi.
- **0.4:** Sinyal `window.__cityReady` yerine `<html data-city-ready>`. QA tek iş yerine 5 paralel takım oldu: düzen, sancak ve üç şehir genişliği.
- **0.5:** Depoya referans görüntü konmadı. Her koşu, aynı daldaki **önceki yeşil koşunun** görüntüleriyle karşılaştırılır. Fark tablosu iş özetine yazılır.
- **Bulunan gerçek hata:** 0.29.1'de sur parçalarına eklenen dokunma alanı, sahne dokuya pişirilirken kayboluyordu; yalnız burç ve kapılar dokunmaya yanıt veriyordu. Dokunma alanı ayrı, görünmez bir bölgeye taşındı.

## Faz 1 — Tek görsel dil: oyun arayüz kiti (0.31)

"Uygulama hissinin" kökü burada. Ekranları yeniden yapmadan önce yapı taşları hazırlanır.

| # | İş | Boyut | Bitti sayılır |
|---|---|---|---|
| 1.1 | **Tasarım belirteçleri:** renk, gölge, kenar, yazı ölçeği (13/12/11 + başlık 16/20/24) tek dosyada (`app/tokens.css`). 2.634 satırlık `globals.css` bunları kullanır. | M | Renk sabitleri CSS'te tekrar etmiyor (lint ile denetlenir). |
| 1.2 | **`GameButton`:** bombeli yüz, alt gölge, basınca 2px çöker, ses + titreşim. Türler: birincil (altın), ikincil (parşömen), tehlike (al), simge düğmesi (madalyon). 136 `<Button>` buna geçer. | M | Oyun klasöründe shadcn Button yok. |
| 1.3 | **Boyalı arayüz ikon seti** (`tools/art/ui-icons.py` → `components/game/ui-art.tsx`), kaynak ikonlarıyla aynı stilde ~30 ikon: alt menü (Şehir, Ada, Harita, İttifak, Görevler), danışman sekmeleri, Yükselt, Araştır, Eğit, Gönder, Sil, Arşiv, Bilgi, Geri, Kapat, Ayarlar, kilit, onay, süre, mesaj, teklif, sıralama. | L | Lucide kullanan oyun dosyası ≤ 5. |
| 1.4 | **Panel çerçevesi:** `bp-box`'ın yerine ahşap/parşömen çerçeve (köşe süsü, iç gölge). Kutu başlığı BÜYÜK HARF şerit yerine boyalı kurdele. | M | Bütün sayfalar aynı çerçevede. |
| 1.5 | **Değer satırı bileşenleri:** `StatRow` (simge + ad + sayı + değişim oku), `Meter` (hazine defterindeki kalın çubuk), `CostTokens` (boyalı maliyet jetonları, eksikse altında "eksik N"), `NowNext` (şimdi → sonraki seviye). Tabloların yerini bunlar alır. | M | Hazine, bina etkisi ve Vezir üretimi bu bileşenleri kullanıyor. |
| 1.6 | **Alt çekmece (bottom sheet):** harita, ada ve şehirde seçilen şeyin bilgisi tam sayfa yerine alttan açılan çekmecede gösterilir (sürükleyip kapatılır). | M | Ada ve dünya haritasında kullanılıyor. |
| 1.7 | **Danışman portreleri** boyalı stile çekilir (doku + ışık). Gerekirse yeniden çizilir. | M | Portre ile bina yan yana uyumsuz görünmüyor. |

## Faz 2 — Ekranlar: belge değil, sahne (0.32–0.33)

Faz 1'deki kit ile her ekran yeniden düzenlenir. Sıra, oyuncunun en çok gördüğü ekrandan başlar.

| # | Ekran | Değişiklik | Boyut | Bitti sayılır |
|---|---|---|---|---|
| 2.1 | **Bina sayfası** (40 bina) | Üst %40 kahraman görseli; ad ve seviye madalyonu görselin üstünde. **Yükselt düğmesi altta sabit**, üstünde maliyet jetonları. Açıklama tek satır, "Nasıl işler?" başlıktaki ⓘ düğmesinde. Etkiler `NowNext`. Bina türüne özel bölümler (işçi, eğitim, ticaret) sekmeli. | L | 390×844'te her binada Yükselt kaydırmadan görünüyor. |
| 2.2 | **Vezir / Serasker / Âlim / Elçi** | Konuşma balonu kalır. Altta tablo yerine `StatRow` ızgarası. "Olaylar" ikonlu zaman çizelgesi (çekiç, kılıç, gemi, para) ve günlere göre gruplu. | M | Danışman sayfalarında `<table>` yok. |
| 2.3 | **Diplomasi ve pazar** | Teklif kartı: rakibin arması ve portresi, büyük "VERİR ⇄ İSTER" mal jetonları, süre çubuğu, iki büyük düğme. Alıntı cümlesi küçük. Sıralama kürsü (ilk üç) + liste. | M | Kart metinsiz okunabiliyor. |
| 2.4 | **Dünya haritası** | Tam ekran, kıstırarak yakınlaşma, deniz dokusu, rotalarda ilerleyen gemiler. Ada bilgisi alt çekmecede. "Nasıl işler?" kutusu kalkar. | L | Görünür harita ekranın en az %75'i. |
| 2.5 | **Savaş raporu** | Özet kartı canlanır: iki ordu karşı karşıya, kayıplar sırayla düşer, ZAFER/YENİLGİ damgası. Tur tablosu "ayrıntı"da kalır. | M | Rapor açılışında 2-3 sn'lik animasyon (kapatılabilir). |
| 2.6 | **Araştırma** | Yol dallar halinde çizilir (5 dal yan yana kaydırılır), seçili düğüm büyür. Sekme ızgarası yerine dal adlarıyla şerit. | M | Dal geçişi tek kaydırma. |
| 2.7 | **İttifak** | Üst kısım sancak + ad + itibar madalyonu. Üyeler portre kartı. Görevler ilerleme çubuklu ödül kartı. Duyuru parşömen. | M | Liste görünümü yok. |
| 2.8 | **Görevler ve büyük hedefler** | Hedef kartında bina görseli, ödül sandığı. Ödül alınca altınlar üst bara uçar (Faz 3.2). | S | — |
| 2.9 | **Ayarlar ve Hakkında** | "Meta" ekran; Lucide kalabilir ama `GameButton` ve çerçeve kullanılır. | S | — |
| 2.10 | **Üst bar ve alt menü** | Üst bar boyalı çerçeveli plaka. Alt menü ikonları boyalı. Rozet kuralı: aynı anda en çok 2 kırmızı rozet, gerisi nokta. | M | Ekran görüntüsünde en çok 2 sayılı rozet. |

## Faz 3 — Oyun hissi: hareket, ses, geri bildirim (0.34)

| # | An | Ne olur | Boyut |
|---|---|---|---|
| 3.1 | İnşaat başlar | Binada toz bulutu ve iskele kurulur, tahta tokmak sesi. Harcanan kaynaklar üst bardan binaya uçar. | M |
| 3.2 | Ödül / görev | Altın ve kaynak jetonları karttan üst bardaki sayaca uçar, sayaç sayarak artar. | M |
| 3.3 | Seviye atlar | Binanın üstünde ışık halkası, madalyon büyüyüp küçülür, kısa fanfar. | S |
| 3.4 | Binaya dokunma | Bina hafif zıplar (var). Ek olarak zemin halkası ve dokunma sesi. | S |
| 3.5 | Sefer çıkar / döner | Limandan gemi kalkar, şehre asker kolu girer. | M |
| 3.6 | Baskın gelir | Ufukta kırmızı sancak, davul. Surda nöbetçiler belirir. | M |
| 3.7 | Araştırma biter | Medresede ışık, parşömen açılır. | S |
| 3.8 | Sayı değişimleri | Her yerde sayılar atlamaz, kısa sürede sayarak değişir. | S |
| 3.9 | Ses haritası | Her ana eylemin kendi sesi olur. Müzik, efekt, ortam ve titreşim Ayarlar'da ayrı ayrı açılıp kapanıyor (var). | S |

Hepsi `prefers-reduced-motion` ve Ayarlar > "Az hareket" ile kapanır. Düşük cihazda
parçacık sayısı yarıya iner.

## Faz 4 — Şehir ve harita sanatı (0.34–0.35)

| # | İş | Boyut | Bitti sayılır |
|---|---|---|---|
| 4.1 | **Boyalı binalarda sancak:** bayrakların resme gömülü olup olmadığı doğrulanır. Gömülüyse bayrak bölgesi görselden silinir ve canlı bayrak çapası (`building-flags.json`) eklenir. | M | Sancak değişince bütün binalardaki bayrak değişiyor. |
| 4.2 | **Boyalı sur seti:** 3 kademe × düz duvar, köşe, kapı, burç (vektör sur yerine). Seviye madalyonu ve dokunma alanı korunur. | L | Şehirde vektör çizim kalmıyor. |
| 4.3 | **Bina ölçek tutarlılığı:** bütün binalar tek ölçek tablosuna oturtulur (bulanık ve aşırı büyük olanlar düzeltilir). | M | Yan yana ekran görüntüsünde ölçek tutarlı. |
| 4.4 | **Boş çimen:** mahalle dekoru (çeşme, pazar tezgâhı, bostan, mezarlık, değirmen), Divanhane seviyesine göre artan yoğunluk. | M | Divanhane 10+ şehirde boş alan %30'un altında. |
| 4.5 | **Gece:** pencerelerde ışık, fener halkaları; yumuşak alacakaranlık korunur. | S | — |
| 4.6 | **Ada ve dünya:** dünya haritası için boyalı deniz, kıyı köpüğü, rota çizgileri. | M | — |
| 4.7 | **Görsel kaynağı:** `public/images/game/CREDITS.md` hâlâ "bütün görseller kodla çizilir" diyor. Bu yanlış: boyalı binalar ayrı bir kaynaktan geldi. Kaynak ve kullanım hakkı yazılır. | S | Belge gerçeği söylüyor. |

## Faz 5 — Oyun tasarımı ve tutunma (0.35–0.36)

| # | İş | Boyut | Bitti sayılır |
|---|---|---|---|
| 5.1 | **İlk 10 dakika senaryosu:** 4 adımlık rehber, oklarla gösterilen ilk 8 görev olur (sur temeli, ilk işçi, ilk araştırma, ilk sefer). Her adımda tek düğme parlar. | M | Yeni oyuncu 10 dakikada ilk seferi yapmış oluyor (otomatik tur testi). |
| 5.2 | **Tempo simülasyonu:** `tools/pace-sim.ts` 30 günlük oyunu 3 oyuncu profiliyle (aktif, günde 3 giriş, günde 1 giriş) oynatır; Divanhane seviyesi / gün eğrisini çıkarır. Hedef: Divanhane 10 → 2. gün, 15 → 7. gün, 20 → 30. gün. | M | Eğri hedefe ±%20. |
| 5.3 | **Çevrimdışı ilerleme:** üretim bugün 8 saatte kesiliyor (`engine.ts`, `cutoff`). Bu ya korunup oyuncuya açıkça söylenir ("8 saat sonra ambar kapanır"), ya da Ambar seviyesiyle uzatılır. Yapay rakiplerin çevrimdışı hamleleri (savaş, haber, teklif) dönüşte özette görünür. | M | 30 gün ileri sarılan kayıtta özet olay içeriyor (test). |
| 5.4 | **Saat hilesi:** cihaz saati geri alınırsa üretim durur; ileri atlama son görülen zamana göre sınırlanır (`lastSeen` monoton saklanır). | S | Test: saat ileri/geri senaryoları. |
| 5.5 | **Yerel bildirimler** (Capacitor Local Notifications): inşaat bitti, sefer döndü, baskın 10 dk sonra, ambar doldu. Hepsi Ayarlar'dan ayrı ayrı kapatılabilir. | M | Android'de bildirim geliyor. |
| 5.6 | **Haftalık olaylar:** dönen etkinlikler (Kervan haftası: ticaret ×1,5; Korsan sezonu: baskın ve ganimet artar; Ramazan: huzur artar; Hasat: kereste artar). Başlangıç ve bitişte haber. | M | Takvim kodda, testli. |
| 5.7 | **Başarımlar:** büyük hedeflerin yanında 30 küçük madalya (ilk zafer, 10 casus, 5 ada...). Profil sayfasında vitrin. | M | — |
| 5.8 | **Yapay rakiplere kişilik:** her hükümdarın düşmanı ve dostu olsun, mektuplarında geçmiş olaylara atıf (intikam, minnet), haberlerde süren hikâyeler. | M | 7 günlük simülasyonda en az 3 süren "hikâye" haberi. |
| 5.9 | **Denge turu:** birim maliyet/güç, araştırma süreleri, baskın sıklığı. `tools/balance-report.ts` tablo üretir. | M | Hiçbir birim maliyet başına %30'dan fazla üstün değil. |
| 5.10 | **Anlaşılmaz terimler taraması:** bütün etiketler bir listeye çıkarılır, her terimin ⓘ açıklaması olur ("İdari barınma", "Hava savunması"...). | S | Açıklamasız terim kalmıyor. |

## Faz 6 — Performans ve boyut (0.36)

| # | İş | Boyut | Bitti sayılır |
|---|---|---|---|
| 6.1 | **İki boy bina görseli:** 1774px kaynağın yanında 887px telefon kopyası üretilir (`tools/art/`). Ölçek `PAINTED_SOURCE_WIDTH` sabiti yerine dosyanın gerçek genişliğinden okunur. `canvasDpr() < 2` ise küçük kopya yüklenir. | M | Telefonda indirilen bina görseli ≤ 15 MB. |
| 6.2 | **Tembel yükleme:** yalnız şehirde var olan binaların aşamaları yüklenir; sayfalardaki kahraman görselleri `loading="lazy"`. | S | İlk açılışta yalnız gerekenler iniyor. |
| 6.3 | **Boşta kare hızı:** dokunma ve animasyon yokken Phaser 20 fps'e iner, arka plandayken durur. | S | Pil ölçümünde belirgin düşüş. |
| 6.4 | **Düşük cihaz modu:** halk sayısı, parçacık ve gölge azalır (otomatik algı + Ayarlar). | S | — |
| 6.5 | **APK boyutu:** kullanılmayan görseller CI'da raporlanır (dosya hiçbir yerde anılmıyorsa uyarı). | S | — |

## Faz 7 — Kod sağlığı (fazlara yayılır, V2'den önce biter)

| # | İş | Boyut | Bitti sayılır |
|---|---|---|---|
| 7.1 | `phaser-city.ts` (2.497 satır) bölünür: `city/walls.ts`, `city/labels.ts` (etiket, sayaç, madalyon), `city/terrain.ts`, `city/citizens.ts`, `city/buildings.ts`, `city/effects.ts`. | L | Dosyalar ≤ 800 satır. |
| 7.2 | `engine.ts` (2.003 satır) bölünür: `economy.ts`, `buildings.ts`, `units.ts`, `research.ts`, `population.ts`, `format.ts`; dışa aktarılanlar değişmez. | L | Testler değişmeden geçiyor. |
| 7.3 | `globals.css` (2.634 satır) katmanlara ayrılır: `tokens`, `hud`, `pages`, `components/*`. Ölü CSS temizlenir. | M | Kullanılmayan seçici raporu boş. |
| 7.4 | **ESLint + Prettier** betikleri ve CI adımı. | S | `pnpm lint` CI'da. |
| 7.5 | **Kayıt şeması sürümü:** `Empire.version` ile göç fonksiyonları zinciri; her eski sürümün örnek kaydı test klasöründe açılır. | M | 0.20'den bu yana bütün kayıt örnekleri açılıyor. |
| 7.6 | **Ölçüm araçları** (`tools/*.cjs`) tek klasörde, ortak yardımcıyla (kayıt tohumlama, rehberi atlama, sunucu). | S | — |

## Faz 8 — Erişilebilirlik ve dil (0.37)

| # | İş | Boyut |
|---|---|---|
| 8.1 | Sistem yazı boyutu büyütülünce düzen bozulmaz (%130'a kadar test). | M |
| 8.2 | Renk körlüğü: sancak renkleri ve kırmızı/yeşil oranlar şekille de ayrılır (ok, işaret). | S |
| 8.3 | Ekran okuyucu: bütün düğmelerde Türkçe etiket (çoğu var), Phaser sahnesi için "şehri liste olarak gör" seçeneği. | M |
| 8.4 | Metinler tek dosyada toplanır (`lib/i18n/tr.ts`). İngilizce V2'ye zorunlu değil, ama yolu açılır. | M |

## Faz 9 — Mağaza kapısı (senin işin, ertelendi)

Daha önce "Play Store işlerini atla" dedin. V2'yi yayınlamak için yine de gerekenler:

- **İmza:** keystore secret'ları GitHub'a eklenir (iş akışı hazır). Debug imzalı APK Play'e gönderilemez.
- **Yasal metinler:** gizlilik politikası linki ve Veri güvenliği formu.
- **Görsel hakları:** Faz 4.7 ile görsel kaynağı belgelenir.
- **Kapalı test:** yeni kişisel hesaplarda 12 test kullanıcısıyla 14 gün kapalı test.
- **Mağaza sayfası:** ekran görüntüleri (ada ve giriş ekranı hazır kalitede), kısa video, açıklama.

## V2'ye bilerek girmeyenler

- **Gerçek çok oyunculu:** sunucu, hesap ve eşleşme gerektirir. Ayrı bir proje (V3).
  V2'de yapay rakipler (Faz 5.8) bu boşluğu kapatır. Kayıt şeması (7.5) ileride
  sunucuya taşınabilecek biçimde tutulur.
- **Uygulama içi satın alma ve reklam:** yok. Oyun çevrimdışı ve veri toplamıyor;
  bu, mağaza açıklamasında öne çıkarılacak bir artı.

## Sürüm takvimi

| Sürüm | İçerik | Ana sonuç |
|---|---|---|
| 0.30 | Faz 0 | QA güvenlik ağı, QA ≤ 10 dk |
| 0.31 | Faz 1 | Oyun arayüz kiti, boyalı ikonlar |
| 0.32 | Faz 2.1, 2.10 | Bina sayfası sahne, üst bar/alt menü |
| 0.33 | Faz 2.2–2.9 | Bütün sayfalar yeni kitle |
| 0.34 | Faz 3 + 4.1–4.3 | Hareket, ses, sancaklı binalar, boyalı sur |
| 0.35 | Faz 4.4–4.7 + 5.1–5.5 | Canlı şehir, ilk 10 dakika, bildirimler |
| 0.36 | Faz 5.6–5.10 + 6 | Olaylar, başarımlar, denge, performans |
| 0.37 | Faz 8 + kalan 7 | Erişilebilirlik, kod temizliği biter |
| **2.0.0** | Ölçüt tablosu tam yeşil | V2 çıkışı (Faz 9 tamamlanınca mağazada) |

Faz 7 ayrı bir sürüm değildir; dokunulan dosya o sürümde bölünür.

## Riskler

| Risk | Etki | Önlem |
|---|---|---|
| Boyalı ikon ve sur çizimi kodla istenen kalitede çıkmaz | Faz 1.3 ve 4.2 gecikir | Önce 3 ikonluk deneme. Tutmazsa dışarıdan çizim, hakları 4.7'ye yazılır. |
| Büyük dosya bölünürken davranış değişir | Gizli hata | Bölmeden önce o dosyanın ekran görüntüsü referansı (0.5) alınır, bölme ayrı commit. |
| Tempo yavaşlatılınca oyuncu sıkılır | Tutunma düşer | 5.2 simülasyonu ve haftalık olaylar aynı sürümde çıkar. |
| QA süresi yine sınırı zorlar | CI kırmızı | 0.4 ilk iş; her yeni ekran turu ayrı işe eklenir. |
| Eski kayıtlar yeni alanlarla açılmaz | Oyuncu ilerlemesini kaybeder | 7.5 kayıt göç zinciri Faz 2'den önce biter. |

## V2 "bitti" listesi

- [ ] Ölçüt tablosundaki her satır hedefte.
- [ ] 360×740, 390×844 ve 430×932'de bütün ekranların ekran görüntüsü elden geçti.
- [ ] Yeni oyuncu turu (ilk 10 dakika) otomatik testte geçiyor.
- [ ] 30 günlük tempo simülasyonu hedef eğride.
- [ ] Orta segment gerçek Android cihazda 30 dakikalık oyun: çökme yok, ısınma kabul edilebilir.
- [ ] 0.20'den bu yana kayıt örnekleri 2.0.0'da açılıyor.
- [ ] Bütün CI işleri yeşil, APK yayında.
