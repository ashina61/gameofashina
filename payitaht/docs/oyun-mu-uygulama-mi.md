# Oyun mu, uygulama mı? — Görsel, asset ve sayfa denetimi

Sürüm 0.29.1 · telefon ekranı (390×844 ve 360×740) üzerinden, gerçek bir
Divanhane 15 kaydıyla yapılan tur. Not 1–10 arası "oyun hissi"dir:
10 = mağazadaki iyi bir şehir kurma oyunu gibi, 1 = form/ayar ekranı gibi.

## Kısa hüküm

**Haritalar oyun, sayfalar uygulama.** Şehir ve ada ekranı boyalı binaları,
yürüyen halkı, bayrakları ve gece-gündüzüyle gerçekten oyun gibi duruyor.
Ama oyuncunun zamanının yarısını geçirdiği sayfalar (bina, danışman,
diplomasi, ittifak, hazine) hâlâ **parşömen renginde bir web uygulaması**:
alt alta kutular, BÜYÜK HARFLİ kutu başlıkları, tablolar, çizgi ikonlar,
"Nasıl işler?" açıklama kutuları ve uzun metinler. Oyun, haritadan sayfaya
geçince türünü değiştiriyor.

| Alan | Not | Neden |
|---|---|---|
| Şehir ekranı | **8** | Boyalı binalar, sur kademeleri, lale bahçeleri, halk, gece. Eksik: dokunma geri bildirimi zayıf, binalar zoom'da küçük. |
| Ada ekranı | **8** | En iyi ekran: tek bakışta okunuyor, tabelalar oyun dili. |
| Üst bar | 5 → **7** | Bu sürümde kesilen sayılar ve basık görünüş düzeldi (aşağıda). Hâlâ düz plaka; boyalı çerçeve yok. |
| Alt menü | **6** | Biçim iyi (ortada madalyon) ama ikonlar Lucide çizgi ikon: uygulama dili. |
| Bina sayfaları | **5** | Üstteki kahraman görseli ve kademe resimleri oyun; altı kutu-kutu form. |
| Danışman sayfaları | **4** | Portre + konuşma balonu güzel; altı tablo ("Üretim: Akçe 547 /dk") ve günlük listesi. |
| Araştırma | **6** | Yol (rs-path) ve amblemler iyi; dal sekmeleri buton ızgarası. |
| Savaş raporu | **7** | ZAFER/YENİLGİ şeridi ve birlik figürleri oyun gibi; tur tablosu gizli. |
| Diplomasi / pazar | **3** | Tamamen metin kartı: "Ambarlarımızda üzüm fazlası var…" + iki düğme. |
| İttifak | **4** | Görevler ve rütbeler var ama hepsi liste ve metin kutusu. |
| Dünya haritası | **5** | Adalar artık resimli; ama harita sayfanın içinde küçük bir kart, tam ekran değil. |
| Hazine ve üretim | 2 → **7** | Ham ondalıklar ("+825.6628319999999/dk") vardı; bu sürümde defter görünümüne geçti. |

## Neden "uygulama" hissi veriyor — ölçülebilir sebepler

1. **Üç ayrı çizim dili yan yana.** Binalar yağlı boya raster (117 dosya),
   danışman portreleri ve kaynak ikonları düz vektör, menü/sekme/düğme
   ikonları Lucide çizgi ikon (25 bileşen dosyası). Göz bunları aynı dünyaya
   ait saymıyor. Çizgi ikon = uygulama.
2. **Standart bileşenler.** Oyun klasöründe 136 adet `<Button>` (shadcn),
   22 tablo, 31 "Nasıl işler?" kutusu var. Hepsi işini yapıyor ama hepsi web
   formu gibi görünüyor: düz kenarlı, gölgesiz, dokununca sadece renk değişiyor.
3. **Bilgi metinle anlatılıyor, resimle değil.** Teklifler, ittifak görevleri,
   olay günlüğü, bina etkileri hep cümle. Oyunlar aynı bilgiyi ikon + sayı +
   ilerleme çubuğu ile verir. Örnek: Vezir'in "Olaylar" listesinde aynı satır
   ("İşgalciler 3600 akçe haraç topladı") alt alta 5 kez yazıyordu (bu sürümde
   tek satıra toplandı; sorun "cümleyle anlatmak" olarak duruyor).
4. **Geri bildirim yazı.** Bir şey olunca çoğunlukla toast/metin çıkıyor.
   Oyunlarda inşaat başlayınca çekiç sesi ve toz, ödül alınca altınlar üst
   bardaki sayaca uçar. Bizde bu yalnız kaynak sayacında (`stockFx`) var.
5. **Sayfa = belge.** Her sayfa dikey kaydırılan bir belge; önemli düğme
   (Yükselt, Araştır, Eğit) sayfanın ortasında, başparmak bölgesinde değil.
6. **Küçük yazı.** CSS'te 9–11px yazı boyutu 142 yerde geçiyor. Telefonda
   bu, "ayrıntılı uygulama ekranı" hissi verir ve okunmaz.

## Asset denetimi

| Asset | Durum | Hüküm |
|---|---|---|
| Boyalı binalar (`*-painted-{1..3}.webp`, 117 dosya, ~34 MB) | Kaliteli, 3 kademe | **Oyunun en güçlü yanı.** Ama 1774px kaynak telefon için büyük; ilk açılış ve RAM yükü yüksek. |
| Sur (Phaser vektör) | 3 kademe, sancak renginde flamalar | Boyalı binaların yanında daha "çizim" duruyor; kabul edilebilir. |
| Kaynak ikonları (akçe, kereste, taş, ilim, lüks) | Boyalı, tutarlı | İyi. Üst barda ve hazinede doğru kullanılıyor. |
| Danışman portreleri | Düz vektör, karikatür | Sevimli ama binalarla stil uyuşmuyor. |
| Birlik figürleri | Vektör | Savaş özetinde iş görüyor. |
| Araştırma amblemleri | Prosedürel vektör | Tutarlı, okunur. |
| Ada küçük resimleri (`map-*.webp`) | Ada resminden kırpılmış | Dünya haritasını canlandırdı. |
| Lucide ikonları (menü, sekme, düğme) | Çizgi ikon | **Uygulama hissinin baş sebebi.** Değişmeli. |
| Lale, dekor, orman | Boyalı / prosedürel | Şehri canlandırıyor. |

## Bu sürümde düzeltilenler (0.29.1)

- **Surlara dokunulmuyordu.** Örülmüş sur parçaları, burçlar ve kapı artık
  dokununca Surlar sayfasını açıyor (parmak için geniş dokunma alanı).
- **Sur seviyesi belli değildi.** Ana kapının üstünde, uzak görünümde de
  okunan sabit boyda seviye madalyonu var; etiketler açıkken ya da yükseltme
  sürerken diğer binalar gibi "seviye + Surlar" etiketi çıkıyor.
- **Üst bar basık ve sayılar kesikti ("33.21ℓ").** Sayılar en fazla 5
  karakter (`9.876 · 33,2B · 332B · 1,2M`), sayaçlar 38px yüksek plakalar;
  stoklarda simge solda, değer büyük, oran altta. Konut dolunca nüfus sarı.
- **Hazine sayfasında ham ondalıklar.** `formatRate` ile bütün oranlar
  yuvarlanıyor (100 altı tek ondalık, üstü tam sayı, Türkçe yazım). Sayfa
  madalyonlu, kalın doluluk çubuklu bir deftere dönüştü; dolu ambar kırmızı,
  üretimi olmayan mal "Üretim yok" diyor.
- **Ondalık nokta/virgül karışıklığı.** Oyundaki bütün `toFixed` oranları
  (lütuf, himmet, inanç, büyüme, üzüm tüketimi, maden…) Türkçe yazıma geçti.
- **"-0 akçe/saat" / "+0".** Sıfır artık işaretsiz yazıyor.
- **Bina maliyetinde eksik miktar kutudan taşıyordu.** "eksik 2.794" sayının
  altına iniyor.
- **Vezir sayfasında düğme sırası sağdan kesiliyordu.** Sayfalardaki düğme
  sıraları artık alta kayıyor.
- **"Yokluğunda olanlar" kartında aynı haber iki kez** yazıyordu; tekilleşti.
- **Günlükte aynı satır alt alta** yazıyordu; art arda tekrarlar tek satırda
  "×5" rozetiyle toplanıyor (Vezir "Olaylar" ve şehir günlüğü).

360px genişlikte şehir, hazine, dört danışman, ittifak, görevler, yapı listesi
ve Surlar sayfası taşma taramasından sıfır hatayla geçti.

Geri kalan iş için: [mobil-uyum-plani.md](./mobil-uyum-plani.md).
