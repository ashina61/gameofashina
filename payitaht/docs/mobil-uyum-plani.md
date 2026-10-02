# Mobil uyum ve "oyun hissi" planı

Amaç: telefonda **hiçbir sayı kesilmesin, hiçbir şey taşmasın, her önemli
şeye başparmakla dokunulsun** ve sayfalar uygulama değil oyun gibi dursun.
Teşhis için: [oyun-mu-uygulama-mi.md](./oyun-mu-uygulama-mi.md).

Öncelik: **P0** = hata, hemen. **P1** = oyun hissini en çok artıran iş.
**P2** = cila ve performans. Her maddenin sonunda "bitti sayılır" ölçütü var.

## P0 — Hatalar

| # | İş | Durum |
|---|---|---|
| 1 | Örülmüş surlar dokunmaya yanıt vermiyor | ✅ 0.29.1 |
| 2 | Sur seviyesi şehirde görünmüyor | ✅ 0.29.1 — kapıda madalyon |
| 3 | Üst barda 5 haneli sayılar kesiliyor, bar basık | ✅ 0.29.1 — `formatShort`, 38px plakalar |
| 4 | Hazine sayfasında ham ondalık oranlar | ✅ 0.29.1 — `formatRate`, defter görünümü |
| 5 | Oranlarda nokta/virgül karışık, "-0" | ✅ 0.29.1 |
| 6 | Bina maliyetinde "eksik" miktarı taşıyor | ✅ 0.29.1 |
| 7 | Sayfa düğme sıraları sağdan kesiliyor | ✅ 0.29.1 |
| 8 | **Otomatik taşma testi yok.** Bu hatalar ancak telefonda görülünce bulundu. | Açık |
| 9 | Olay günlüğünde tekrar eden satırlar ("İşgalciler 3600 akçe haraç topladı" ×5) | ✅ 0.29.1 — `groupLog` |
| 10 | **Küçük yazılar** (CSS'te 142 yerde 9–11px) | Açık |
| 11 | **Küçük dokunma hedefleri** (rapor yer imi/sil, sekme düğmeleri ~32px) | Açık |

**8 — Taşma testi.** `tools/visual-qa.cjs`'e 360×740 ekranda bir tur ekle:
şehir, hazine, dört danışman, ittifak, görevler, yapı listesi ve her bina
sayfası. Her sayfada `.bp *` ve `.ika-top *` öğelerinden ekran dışına
taşanları ve `overflow:hidden` içinde kesilen metni (ellipsis'siz) say;
sıfırdan fazlaysa CI kırmızı.
*Bitti sayılır:* bilerek eklenen bir taşma CI'ı düşürüyor.

**10 — Yazı boyu.** Taban: gövde 13px, ikincil 12px, rozet/etiket 11px. 9–10px
yalnız madalyon içi rakamlarda kalsın.
*Bitti:* `grep 'font-size: (9|10)px'` sayısı 10'un altında.

**11 — Dokunma hedefi.** Bütün dokunulabilir öğeler en az 44×44px (görsel
küçük kalabilir, `::before` ile alan büyür).
*Bitti:* taşma testine "44px altı düğme" kuralı eklendi, sıfır.

## P1 — Uygulama hissinden oyun hissine

**12 — Tek çizim dili: Lucide ikonlarını boyalı ikonlarla değiştir.**
Alt menü (Şehir, Ada, Harita, İttifak, Görevler), danışman sekmeleri,
sayfa sekmeleri ve sık düğmeler (Yükselt, Araştır, Eğit, Gönder) için
kaynak ikonlarıyla aynı stilde boyalı ikon seti çiz (`tools/art/` altında,
`resource-art.tsx` gibi bir `ui-art.tsx`). Lucide yalnız ayarlar gibi
"meta" ekranlarda kalsın.
*Bitti:* oyun ekranlarında Lucide kullanan dosya sayısı 25'ten 5'in altına.

**13 — Bina sayfası: belge değil, sahne.**
- Kahraman görseli ekranın üst %40'ı. Binanın adı ve seviyesi görselin
  üstünde, madalyonla.
- **Yükselt düğmesi altta sabit** (alt menünün hemen üstünde, başparmak
  bölgesinde). Maliyetler düğmenin üstünde boyalı jeton sırası.
- Açıklama tek satır; "Nasıl işler?" kutuları başlıktaki tek **ⓘ** düğmesine.
- Etki tablosu yerine "şimdi → sonra" iki büyük sayı ve ok.

*Bitti:* 390×844'te Yükselt düğmesi kaydırmadan görünüyor, her bina için.

**14 — Danışman sayfaları: tablo yerine ikon satırları.**
Vezir "Üretim" tablosu → hazine defteri satırları (aynı bileşen). "Olaylar"
→ ikonlu, gruplu zaman çizelgesi (inşaat çekiç, savaş kılıç, ticaret gemi).
*Bitti:* danışman sayfalarında `<table>` kalmıyor.

**15 — Diplomasi ve pazar: metin kartından oyun kartına.**
Teklif kartında hükümdarın arması ve portresi, "VERİR ⇄ İSTER" büyük boyalı
mal jetonları, süre çubuğu. Alıntı cümlesi küçük ve ikincil.

**16 — Dünya haritası tam ekran.**
Harita kartın içinde değil, şehir/ada ekranı gibi tam ekran; ada bilgisi alt
çekmece (bottom sheet). Kıstırarak yakınlaşma.
*Bitti:* haritanın görünür alanı ekranın en az %75'i.

**17 — Geri bildirim animasyonları.**
- İnşaat başlayınca: binada toz + çekiç sesi; kaynaklar üst bardan binaya uçar.
- Ödül alınca: altınlar ödül kartından üst bardaki akçe sayacına uçar
  (`stockFx` zaten var; kaynak noktası eklenecek).
- Seviye atlayınca: binanın üstünde kısa ışık halkası, madalyon büyüyüp küçülür.
- Zafer raporunda kılıç/sancak animasyonu.
*Bitti:* bu dört an sessiz/hareketsiz geçmiyor; `prefers-reduced-motion`
saygı görüyor.

**18 — Ortak "oyun düğmesi".**
136 `<Button>` için tek bir boyalı düğme bileşeni: bombeli yüz, alt gölge,
basınca 2px çöker, birincil (altın) / ikincil (parşömen) / tehlike (al).
shadcn Button oyun klasöründen çıkar.

**19 — Uyum düzeltmeleri.** Danışman portrelerine hafif doku/gölge vererek
boyalı binalara yaklaştır; ya da portreleri de boyalı yeniden çiz.

## P2 — Cila ve performans

**20 — Görsel boyutu.** Boyalı binalar ~34 MB, 1774px. Telefona 887px kopya
üret (`tools/art/`), `PAINTED_SOURCE_WIDTH` ölçeğini dosya genişliğinden oku,
`canvasDpr() < 2` cihazlarda küçük kopyayı yükle.
*Bitti:* ilk açılışta indirilen bina görseli toplamı yarıya iniyor;
düşük cihazda doku belleği ölçülüp not ediliyor.

**21 — Yatay ekran / tablet.** 600px üstünde üst bar zaten tek satır
(geniş); sayfalar 560px ortalı. Tablette iki sütun (sol: kahraman ve
düğmeler, sağ: ayrıntı).

**22 — Ses ve titreşim.** Her ana eylem için kısa ses (inşaat, ödül, savaş,
mesaj) ve Android'de hafif titreşim; ayarlardan kapatılabilir.

**23 — Sur kademesine göre boyalı sur.** Sur hâlâ vektör; boyalı bina
diliyle 3 kademe sur parçası (düz, köşe, kapı, burç) çizilirse şehirdeki son
"çizim" parçası da gider.

## Sıra önerisi

1. P0-8 (taşma testi) — önce güvenlik ağı.
2. P1-13 (bina sayfası) ve P1-18 (oyun düğmesi) — oyuncunun en çok gördüğü yer.
3. P1-12 (boyalı ikon seti) — uygulama hissinin baş sebebi.
4. P1-17 (animasyonlar), P1-14, P1-15, P1-16.
5. P0-10/11 bu işlerin arasında, aynı dosyalara dokunulurken.
6. P2.
