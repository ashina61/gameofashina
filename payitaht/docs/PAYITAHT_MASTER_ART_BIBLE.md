# Payitaht Master Art Bible — “Ceviz & Kireçtaşı”

> Durum: 2026-10-04 görsel denetimi sonrası ana sanat sözleşmesi.
> Amaç: oyunun tamamını tek bir art director / tek bir ressam elinden çıkmış gibi göstermek.
> Kapsam: şehir, ada, dünya haritası, binalar, birlikler, gemiler, portreler, araştırmalar, savaş, derin sayfalar ve UI.
> Bu belge **görsel sözleşmedir**. Ekonomi, save, slot, araştırma ve oynanış kurallarını değiştirmez.

## 1. Ana tasarım dili

**Ad:** Ceviz & Kireçtaşı

Payitaht; sıcak, premium, painterly-realistic / realistic-stylized bir Osmanlı–Ege mobil strateji oyunudur. Görsel dil gerçekçi malzemelere, okunaklı silüetlere ve kontrollü el boyaması dokuya dayanır. Çocuk oyuncağı, çizgi-film, plastik 3D, neon-fantasy veya düz uygulama arayüzü görünümü yasaktır.

### Dünya / şehir
- Kamera: gerçek 2:1 ortografik izometri; perspektif kaçışı yok.
- Ana ışık: sol üstten sıcak gün ışığı.
- Gölge: sağ alta, yumuşak ve kısa-orta uzunlukta.
- Mimari malzemeler: krem/kırık beyaz kireçtaşı, açık sıva, yaşlanmış ahşap, kurşun mavisi kubbe, kiremit çatılar, az miktarda bakır/pirinç.
- Doğa: zeytin, servi, çınar, çam; kuru Akdeniz otları; kontrollü lale/çiçek vurguları.
- Deniz: doygunluğu bastırılmış Ege turkuazı; sığlıkta açık camgöbeği, derinde petrol-maviye yakın ton.
- Bina konturu: ince koyu kahve; siyah kalın outline yok.
- Bina gövdelerinde tek tip “kutu + çatı” reçetesi yok; aileler kendi mimari karakterini korur.

### UI / HUD
- Ana malzeme: koyu ceviz.
- İkincil malzeme: yaşlandırılmış sıcak parşömen.
- Metal: eskitilmiş pirinç / altın; sarı neon altın yok.
- Alarm / savaş: koyu oksit kırmızısı.
- Vurgu: kurşun mavi veya Ege turkuazı yalnız gerektiğinde.
- Süsleme: Osmanlı geometrik/bitkisel motifleri sadece çerçeve, köşe, ayraç ve başlıklarda; içerik alanını boğmaz.
- Ana merkez alanlar sade kalır; okunaklılık süslemeden önce gelir.
- Butonlar taşınabilir 9-slice mantığına uygun görünür; kenar/köşe süsleri sabit, orta alan uzatılabilir.

## 2. Okunabilirlik ilkesi

Mobil ekranda her şey önce **silüetten** anlaşılmalıdır.

- Menü/ kaynak ikonları 24–44 px aralığında ayırt edilebilir olmalı.
- Danışman ve hükümdar portrelerinde yüz 42–56 px daire içinde seçilebilir olmalı.
- Birliklerde ana silah + başlık + beden pozu ilk bakışta rolü anlatmalı.
- Gemilerde gövde/sail/silah profili 56 px’de birbirinden ayrılmalı.
- Araştırma ve başarı ikonlarında tek ana fikir kullanılır; küçük detay kalabalığı yok.
- Görselde yazı, rakam, seviye, tarih, isim, logo veya watermark bulunmaz; metin koddan gelir.

## 3. Bina sanat sözleşmesi

Canlı katalogdaki normal kara binaları ortak modüler slot mantığına uyar.

- Normal kara binalarının zemin-temas ölçeği ortaktır.
- Asset içine özel yol, kaldırım ağı, arsa şekli veya çevre dekorasyonu bake edilmez.
- Ortak bina gölgesi, slot clearing, yol bağlantısı, sancak, vatandaşlar, duman ve ortak mikro-prop runtime katmanındadır.
- Bina asset’i esas olarak ana mimari kütleyi ve yapıya özgü kalıcı öğeyi taşır.
- Divanhane merkezde sabittir ama aynı ışık/malzeme dilindedir.
- Liman ve Tersane kıyı yapılarıdır; sahil geometrisine uyan ayrı sanat ailesidir.
- Surlar tek büyük PNG olarak şehre gerilmez; duvar, kapı ve kule dili runtime savunma halkasına uyar.

### Seviye aşamaları
Her bina üç okunaklı gelişme aşamasına sahip olur:
1. **I — Mütevazı:** küçük kütle, az süs, daha çok ahşap/sıva.
2. **II — Yerleşik:** taş kütle büyür, revak/kanat/işlevsel ekler belirginleşir.
3. **III — İhtişamlı:** ölçeği patlatmadan daha zengin çatı/kubbe, işçilik ve işlevsel detay.

Seviye ilerledikçe yalnız “daha büyük bina” değil, daha gelişmiş ve zengin bir kurum hissi oluşmalıdır.

## 4. Mimari aileler

### Yönetim / anıtsal
Divanhane, Saray, Valilik, Elçilik, Harita Arşivi.
- Dengeli aks, avlu/revak, taş işçiliği, kontrollü kubbe ve sancak noktaları.

### Konut / halk
Konaklar, Hamam, Kahvehane, Cami, Müze, Karagöz Perdesi.
- Daha sıcak ve yaşayan sahneler; sundurma, gölgelik, avlu, baca, gündelik detay.

### Ticaret
Çarşı, Ticaret Merkezi, Kara Pazar.
- Han/arasta hissi, tente ve yük hareketini çağrıştıran mimari; ama ortak runtime yol/dekoru asset’e gömülmez.

### Üretim / zanaat
Kereste Ocağı, Marangozhane, Mimarbaşı Odası, Ormancı Evi, Taşçı Ustası, Kahve Fidanlığı, Simyahane, Camcı Atölyesi, Kahve Kileri, Gözlükçü, Barut Deneme Alanı, Ambar, Depo.
- İşlevi silüetten okunur: sundurma, atölye açıklığı, depo çatısı, ocak, baca, malzeme tipi.

### Bilim / kültür
Medrese, Ahi Tekkesi, Ongun Mabedi.
- Medrese: güçlü avlu/revak dili ve belirgin teleskop/astronomi ayrıntısı.
- Tekke: ağır anıtsallık yerine topluluk/avlu dili.
- Mabet: açık hava, balbal/ongun/kutsal ateş; Osmanlı camisi gibi görünmez.

### Askerî
Kışla, Tophane, Gizli Sığınak, Korsan Kalesi.
- Ağır taş, belirgin giriş aksı, savunma ve eğitim işlevi.
- Kışla sayfa sahnesindeki son onaylı avlu dili tüm askerî içerik için kalite çıpasıdır.

### Kıyı
Ticaret Limanı, Tersane, Korsan Kalesi kıyı kullanımı.
- Islak taş, ahşap iskele/kızak, halat, vinç ve denizcilik malzemesi; su asset’e gereksiz bake edilmez.

## 5. Karakter ve portre dili

- Hafif stilize gerçekçilik.
- 3/4 yüz, bakış sağa; boyun/omuz dahil büst.
- Doğal insan anatomisi; karikatür veya kostüm partisi hissi yok.
- Tarihsel Osmanlı/Akdeniz kıyafeti, kumaş ve başlık detayları araştırılmış görünmeli.
- Her karakter farklı yüz geometrisi, yaş, ifade ve sosyal role sahip olmalı.
- Arka plan gerçek alfa; yalnız hafif temas/ayırma gölgesi kullanılabilir.

## 6. Birlik ve gemi dili

### Kara birlikleri
- 3/4 beden, sağa dönük.
- Tek ana hareket; gereksiz sinematik poz yok.
- Rolü ana ekipman belirler: mızrak, yay, tüfek, top, koçbaşı, tıbbi/lojistik araç vb.
- Tarihsel esin korunur; aşırı fantasy zırh, dev silah veya steampunk kalabalığı yok.

### Deniz birlikleri
- 3/4 izometrik/profil karması, pruvası sağa.
- Gövde tipi ve silah sistemi 56 px’de farklı görünür.
- Yelken/kürek/ram/top/havan/ikmal/balon işlevleri birbirine karışmaz.
- Asset arka planı şeffaftır; deniz savaş alanından gelir.

## 7. İkon dili

UI ikonları düz çizgi SVG gibi görünmemeli; minyatür boyalı obje/arma gibi görünmelidir.

- 1 ana obje + en fazla 1 yardımcı öğe.
- Kontur ince koyu kahve.
- Parlaklık merkezde değil, sol üstte.
- 256 px kaynak; gerçek kullanım 24–44 px.
- Kaynak ikonunda kaynak gerçek malzeme gibi görünür: akçe metal, kereste lifli, ilim kitap/elyazması, kahve çekirdeği/cezve, mermer açık taş, kristal şeffaf-kırıklı, kükürt soluk sarı mineral.

## 8. Araştırma, başarı ve kültür ikonları

- Aynı dış çerçeve ailesi; içeride her konu için tek güçlü simge.
- Araştırma dalları küçük renk/malzeme farkıyla ayrılabilir; çerçeve geometri dili aynı kalır.
- Başarım çerçevesi üç kademe: tunç, gümüş, altın. Simge değişmez; metal katman değişir.
- Hükümet/lonca/mucize/tanrı içerikleri emoji veya düz ikon değil, boyalı minyatür arma niteliğindedir.

## 9. Sahne arka planları

Tam ekran/sayfa hero görsellerinde aynı dünya gerçekliği korunur:
- Giriş: altın saat Ege kıyısında Payitaht; metin ve düğme görsele gömülmez.
- Bina sayfaları: binanın işlevini anlatan atmosfer sahnesi; canlı seviye bilgisi koddan gelir.
- Kara savaş: kale/ova/toz ve mesafeli silüetler; birlik kartlarını boğmaz.
- Deniz savaş: açık deniz/kıyı puslu ufuk; gemi slotlarını boğmaz.
- Ada/dünya haritası: aynı deniz paleti ve kıyı köpüğü dili.

## 10. Yasaklar

- Paint/clip-art görünümü.
- Çocukça oyuncak maket estetiği.
- Kalın siyah outline.
- Flat vector / emoji hissi.
- Neon fantasy renkleri.
- Her binaya aynı avlu duvarını çizmek.
- Binanın altına farklı boyutlarda özel parsel bake etmek.
- Asset içine yazı/rakam/logo koymak.
- Aynı yüzü farklı sakal/şapkayla tekrar kullanmak.
- Aynı ada silüetini 16 kere döndürmek.
- Harita/UI referansını bire bir başka oyundan kopyalamak.

## 11. Teknik kalite kapıları

Her asset şu kontrollerden geçer:
1. Gerçek kullanım boyutunda okunuyor mu?
2. G0 stil sayfası + bu belgeyle aynı ressam hissi veriyor mu?
3. Işık sol üst / gölge sağ alt mı?
4. Gereksiz yazı veya baked UI var mı?
5. Alfa kenarında halo var mı?
6. Dosya bütçesine uyuyor mu?
7. Mobil 390×844 sahnede komşu varlıklarla ölçek uyumu var mı?
8. Eski/yeniden çizilecek asset ise önce-sonra görsel QA kanıtı var mı?

## 12. Teknik teslim standardı

- Oyun formatı: WebP.
- Şeffaf nesneler: gerçek alfa.
- İkon kaynak: 256×256; hedef ≤12 KB.
- Portre/birlik kaynak: 512×512; hedef ≤60 KB.
- Zemin dokuları: mümkünse ≤150 KB.
- Boyalı bina: mevcut yüksek çözünürlüklü sözleşme + otomatik `-sm` telefon kopyası.
- Telefon görsel toplam bütçesi: mevcut 0.49 hattındaki güncel üst sınır 15.5 MB; yeni set bunu aşarsa önce tekrar/kullanılmayan asset temizlenir ve uygun WebP kodlama uygulanır.
- Üretim promptları `tools/art/prompts/` altında yeniden üretilebilir biçimde tutulur.
- Oyun metni koddan gelir.

## 13. Kalite çıpaları

Yeni üretimlerde şu mevcut parçalar yön gösterir:
- `docs/stil-sayfasi.webp` — G0 ana stil referansı.
- Son ceviz/pirinç üst-alt HUD — UI malzeme ve kontrast referansı.
- `terrain/barracks-courtyard.webp` — bina sayfası atmosfer kalitesi için pilot.
- Güncel boyalı Divanhane — izometrik bina dili için ölçü.
- `docs/mockups/*.webp` — ekran kompozisyonu hedefleri; mockup içindeki uydurma yazı/rakamlar asset’e alınmaz.

Bu belge, sonraki tüm Payitaht görsel üretimlerinde varsayılan sanat sözleşmesidir.