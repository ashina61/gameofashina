# Payitaht Adaları — kalıcı tasarım dili

Kullanıcının 4 Ekim 2026 tarihli son talebi: bütün sayfalar gönderdiği
referanslarla aynı dili konuşacak. En basitten en zora doğru, **bir bölüm
tamamlanıp canlıya alınacak; kullanıcı değerlendirmesinden sonra sıradakine
geçilecek**. Bu belge sonraki oturumların da tasarım hafızasıdır. Yeni sayfa
tasarımlarında eski faz sırası yerine aşağıdaki sıra uygulanır.

## Görsel ölçü

`docs/mockups/` altındaki referans ekranları: `giris.webp`,
`bina-sayfasi.webp`, `arastirma.webp`, `savas-raporu.webp`, `ada.webp`,
`dunya-haritasi.webp`, `sehir-erken.webp`, `sehir-gelismis.webp`.
Kullanıcı aynı referansları 23:15'te yeniden gönderdi (1000144382–4389).
Amaç uygulama kartlarından oluşan bir dashboard değil, yaşayan bir Osmanlı–Ege
strateji oyununun içindeki ferman, divan, atölye ve harita ekranlarıdır.

| Öğesi | Bağlayıcı karar |
|---|---|
| Resim | Ayrıntılı, boyalı, gerçekçi oyun illüstrasyonu; çizgi film veya düz vektör görünümü yok. |
| Mekân | Osmanlı–Ege: kireçtaşı, kırmızı kiremit, kurşuni kubbe, servi/zeytin, turkuaz deniz. Her sayfanın işlevini anlatan tek bir ana sahne. |
| Işık | Sol üstten sıcak doğal ışık, yumuşak gölge; gündüz ve altın saat arasında tutarlılık. |
| Malzeme | Ceviz ahşap başlık ve sekmeler, eskitilmiş altın/pirinç süs ve çerçeve, dokulu parşömen içerik. Aynı `--c-*` ve `--art-*` malzemeleri. |
| Vurgu | Kırmızı sancak ana başlık/seçili sekme, altın birincil düğme ve hazır ödül, bronz/parşömen ikincil eylem. |
| Tipografi | Başlıklar mevcut serif `--font-heading`; metin koyu mürekkep. Bütün yazı, ad, seviye, sayı, tarih ve ödüller koddan gelir. |
| Hiyerarşi | Ortak üst HUD → ceviz sayfa başlığı → boyalı sahne → kırmızı başlık kurdelesi → parşömen içerik/eylem → ortak alt menü. |
| Çerçeve | İnce ve ayrıntılı antik süs. Köşeler keskin veya hafif yumuşak; modern büyük yuvarlak kartlar ve cam efektler yok. |
| Simgeler | Mevcut boyalı ikonlar ve madalyonlar. Kaynak, birlik ve bina resimleri aynı ışık/palet içinde. |
| Telefon | 360×740 ve 390×844; en az 44px dokunma, en az 11px okunur yazı, %130 metinde taşma yok. İçerik kaydırılır; alt menü erişilir kalır. |
| Etkileşim | Eylemler gerçek oyun işlemlerini çağırır. Görsel güncelleme yeni ekonomi, ödül, seviye, araştırma, yerleşim veya kayıt kuralı eklemez. |

Resimler boş metin alanı sağlayan dekoratif parçalardır; tüm ekranı tek
resim yapıp üzerine sahte tıklama alanları koyma. Parşömen, düğme ve kurdele
malzemelerinde mevcut G1 kiti; üst/alt HUD'da `ui/reference-bars/` kullanılır.
Yeni sahneler ImageGen ile, referanslar açıkça stil referansı olarak belirtilerek
üretilir. Kaynak tarifleri ve CREDITS güncellenir.

## Bölümler — basitten zora

| Sıra | Bölüm | Durum / kabul konusu |
|---|---|---|
| 0 | Ortak üst ve alt bar | Canlı, SW v44; kullanıcı referansı temel. |
| 1 | Görevler | İlk sayfa pilotu: divan görev dairesi, ferman kurdelesi, şehir/günlük/başarım defterleri. SW v45. Yayından sonra kullanıcı değerlendirmesi beklenir. |
| 2 | Şehir günlüğü ve sürüm notları | Yazılı defter ekranları; günlük olayların okunurluğu. |
| 3 | Ayarlar ve hükümdar profili | Oyun içi idare/sancak görünümü; ayar ve kayıt işlevleri korunur. |
| 4 | Hazine ve üretim | Kâtip/hazine sahnesi, gelir-gider parşömeni, gerçek üretim sayaçları. |
| 5 | Halk ve şehir listesi | Meslek sahneleri, bina resimleri, mevcut işçi ve şehir işlemleri. |
| 6 | Vezir, Elçi, ittifak | Divan ve diplomasi sahneleri; gerçek mesaj/üyelik içeriği. |
| 7 | Bina kataloğu ve basit bina sayfaları | Aynı sahne/kurdele/eylem düzeni, bina seviyeleri ve maliyetleri korunur. |
| 8 | Kışla, ordu ve donanma | Canlı kışla pilotunu ortak dille tamamla; kara/deniz birliklerini ayrı denetle. |
| 9 | Araştırma | Âlim sahnesi ve mevcut araştırma ilişkileri; referanstaki uydurma 5/5 seviyeleri eklenmez. |
| 10 | Savaş raporları | Boyalı savaş, gerçek kayıp/ganimet ve tur bilgisi. |
| 11 | Ada ve dünya haritası | Harita merkezi ve dokunma noktaları korunarak sahne ve isim plakaları. |
| 12 | Şehir zemini, çevre ve girişin son uyumu | En karmaşık bölüm: modüler yuvalar, yol/bina teması, liman, surlar; ortak sanat dili. |

Her bölüm sonunda: tip/test/lint, `tools/v2-criteria.cjs`, mobil düzen denetimi,
ilgili eylemlerin tarayıcı kontrolü, ekran görüntüsü ve canlı varlık doğrulaması.
Kullanıcı o bölümü değerlendirmeden sıradaki bölüme geçilmez. Yayın işlemi bu
talepte açıkça yetkilendirilmiştir; her küçük commit için yeniden izin istenmez.

## İlk sayfa pilotu

Görevler: `components/game/objectives-page.tsx`,
`app/styles/14-mandates.css`, `terrain/mandates-office.webp`.
Şehir başlangıç hedefi, günlük ödüller, haftalık olay ve büyük hedefler mevcut
panelleri ve callback'leri kullanır. Üç defter sekmesi yalnız görünümü düzenler;
hazır ödül, alındı ve sürüyor durumları oyundan gelir. Kolonide kurucu şehir
eğitimi yeniden başlatılmaz; mevcut kurucu şehre git düğmesi korunur.
