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
| Mekân | Osmanlı–Ege: kireçtaşı, kırmızı kiremit, kurşuni kubbe, servi/zeytin, turkuaz deniz. Her sayfanın işlevini anlatan ana sahne ve eylemlere ait resimli içerikler. |
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
| 1 | Görevler | İlk sayfa pilotu: divan görev dairesi, ferman kurdelesi, şehir/günlük/başarım defterleri. İlk v45 düzeni kullanıcı tarafından yetersiz bulundu. v46: bütün içerik ve etkileşim düzeni yeniden kuruldu. Kullanıcı 5 Ekim «tamam geç sıradakine» diyerek sonraki bölüme geçişi onayladı. |
| 2 | Şehir günlüğü ve sürüm notları | v47 / 0.50.0: vakayiname ve divan neşriyatı; tarihe ayrılmış kayıt, tür seçimi, arama ve açılabilir sürüm fermanları. Yayın sonrası kullanıcı değerlendirmesi beklenir. |
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

## Görevler: kullanıcı düzeltmesinden sonraki tasarım

Kullanıcı 4 Ekim son mesajında yalnız bir resim eklenmesini reddetti ve bütün sayfayı yeniden kurgulama yetkisi verdi. Bir hero resmi ekleyip eski uygulama kartlarını bırakmak kabul ölçütünü karşılamaz. Her sayfanın içerik hiyerarşisi, gezinmesi, resim kullanımı ve eylem düzeni işlevine göre yeniden tasarlanır; ortak olan malzeme, ışık, renk ve tipografidir.

Görevler (`components/game/objectives-page.tsx`, `app/styles/14-mandates.css`):
- Şehir hedefleri: 21 seçilebilir ferman madalyonu, seçilen göreve ait büyük sahne, gerçek açıklama/ödül, o göreve git eylemi ve hazır ödülleri toplama.
- Günlük: resimli hazine armağanı, yedi günlük ödül dizisi, üç sahneli görev kartı, gerçek ilerleme ve haftalık divan notu.
- Başarımlar: resimli nişan koleksiyonu, hazır ödül filtresi, gerçek ilerleme/ödül ve alınmış durumları.
- Altı sahne: başkent, inşaat, âlim, ordu, liman, hazine (`quests/`). Yazılar ve sayılar resimden değil koddan gelir.

Eski ObjectiveCard/DailyPanel/MilestonesPanel bu sayfada kullanılmaz. Ödüller mevcut motor callback'lerinden gelir. Sonraki bölüme kullanıcı bu sonucu değerlendirdikten sonra geçilir.

## Şehir günlüğü ve sürüm arşivi

`components/game/chronicle-pages.tsx`, `app/styles/15-annals.css`.
- Vezir sayfasının başındaki «Şehir günlüğünü aç» düğmesi yeni deftere götürür.
- Vakayiname: aktif şehrin gerçek olayları; mevcut `groupLog`, `logKind`, `dayGroups` kuralları. Son olay resimli; tür seçimi, Türkçe arama, gün ve saat ayrımı, tekrar sayısı, eski kayıtları açma.
- Divan neşriyatı: en yeni sürüm açık parşömen ferman, geçmiş sürümler açılabilir mühürlü kayıtlar; sürüm/açıklama içinde arama, toplu aç/kapat. Aynı bileşen girişte de kullanılır.
- Ortak arşiv kâtibi sahnesi: `terrain/archive-hall.webp`; eski generic günlük ve release kartları yerine sayfaya özel defter yapısı.
- Kayıt formatı, motor kuralları, ekonomi ve olay metinleri değişmez. `CHANGELOG` ve paket sürümü 0.50.0 olarak bu yayını kaydeder.
- Sıradaki bölüm ayarlar ve hükümdar profilidir; bu bölümün değerlendirmesi alınmadan başlanmaz.
