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
| Hiyerarşi | Şehirde büyük HUD; sayfa açıkken ceviz başlık → kısa kaynak şeridi → işlevsel boyalı sahne → sekmeler → geniş parşömen içerik/eylem → 64px ortak alt menü. |
| Çerçeve | İnce ayraçlar; iç içe kalın çerçeve yok. Süsten önce alan ve okunurluk. Köşeler keskin veya hafif yumuşak. |
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
| 2 | Şehir günlüğü ve sürüm notları | v47 / 0.50.0: vakayiname ve divan neşriyatı; tarihe ayrılmış kayıt, tür seçimi, arama ve açılabilir sürüm fermanları. Kullanıcı sonraki bölüme geçişi onayladı. |
| 3 | Ayarlar ve hükümdar profili | v48 / 0.51.0: saray, sancaktar odası, nişan hazinesi ve idare defteri. Kullanıcı devamı onayladı. |
| 4 | Hazine ve üretim | v49 / 0.52.0: akçe hesabı, yedi üretim defteri, ambar yoklaması ve gerçek işlemlere bağlantılar. Kullanıcı geniş düzen ve sonraki bölüme devam istedi. |
| 5 | Halk ve şehir listesi | v50 / 0.53.0: geniş ortak sayfa düzeni, yaşayan çarşı, meslek/yaşam, yerleşim/nakliye/idare. Yayın sonrası kullanıcı değerlendirmesinde dur. |
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

## Hükümdarın sarayı ve idare defteri — v48

Kullanıcı ikinci bölümden sonra «geç; cilalama değil düşün ve tasarla» dedi. Üçüncü bölüm tam içerik/gezinti yeniden kurgulamasıdır.
- `sovereign-page.tsx`: canlı sancak ve hükümdar kimliği saray sahnesinde. Saltanat beratı/unvan yolu/sıralama, resimli şehir gezintisi ve gerçek sicil, nişan hazinesi ve kazanılmış filtresi, önizlemeli sancaktar odası ayrı bölümler.
- Düzenlemede biçim/arma/renk ayrı seçimler; isim/düstur gerçek profile kaydedilir, vazgeçme kaydı değiştirmez. Şehir düğmeleri gerçek şehre gider.
- `settings-panel.tsx`: idare masası, Tercihler/Cihaz/Kayıt/Divan. Ses, tempo, atmosfer, cihaz, yedek, yeniden başlatma ve hata raporu mevcut işlevlere bağlıdır.
- `court-kit.tsx`, `16-court.css`: ceviz bölüm plakaları, parşömen beratlar, kırmızı kurdele, pirinç anahtarlar. Eski profil/ayar kartları kaldırıldı; ittifakta kullanılan ortak sancak bileşenleri korundu.
- `terrain/royal-court.webp`, `terrain/admin-desk.webp`: metinsiz saray ve idare sahneleri. Bütün adlar/sayılar/ayarlar çalışma anındaki oyun verisidir.
- Sürüm 0.51.0. Motor, ekonomi, kayıt biçimi ve yuvalar değişmedi.
- Bu bölüm canlıya yayımlanıp kullanıcı değerlendirmesinde durulur. Sıradaki bölüm hazine ve üretimdir.

## Hazinedarın defteri — v49

Kullanıcı 5 Ekim «uzman oyun tasarımcısı gibi düşün; sayfaları istediğin gibi değiştir, tek kural ortak dil» diyerek üçüncü bölümden sonra devamı onayladı.
- `components/game/treasury-page.tsx`, `app/styles/17-treasury.css`: hazine odası, kırmızı kurdele, canlı akçe plakası. Hazine / Üretim / Ambar defterleri.
- Akçe hesabında motorun net kazancı, gerçek ordu ve âlim bakım giderleri ayrı okunur. Giderler ikinci kez netten düşülmez; sıfıra sınırlanan net kazanç negatif bakiye gibi sunulmaz.
- Hazinedarın notu gerçek dolu/yakın stok, kahve tüketimi ve koloni yolsuzluğuna göre değişir. İlgili işlemlere ulaşır.
- Yedi kaynak ayrı üretim defterinde: kullanım amacı, mevcut stok, ayrı kaynak kapasitesi, motorun net hızı, çalışan/oduncu/madenci sayısı, kahve üretim-tüketim ayrımı ve gerçek bina/işçi/orman/maden/çarşı bağlantıları.
- Üretim ve Ambar bölümlerinde giriş sahnesi kapanır; çalışan oyuncu kendi defterine doğrudan odaklanır. Kaynağın boyalı sahnesi içerikte görünür. Hazine girişinde mekân güçlü kalır.
- Ambar yoklaması: yedi stok, dokununca o kaynağa geçiş, Ambar/Depo bağlantıları. Oyun kapalıyken üretim sınırı `offlineCapHours(game)` ile gerçek seviyeden gösterilir.
- Yaklaşık dolma/tükenme süreleri mevcut sabit net hız varsayımıdır; bu varsayım oyuncuya açıkça gösterilir. Motor, ekonomi, kayıt biçimi ve yuvalar değişmez.
- `terrain/treasury-room.webp`: ayrı ImageGen hazine sahnesi; mevcut royal-court sanatı stil referansı. Önceki kaliteli görev sahneleri içerikte yeniden kullanılır. Metin ve veriler koddan gelir.
- Sürüm 0.52.0. Canlı yayın sonrası kullanıcı değerlendirmesinde durulur. Sıradaki bölüm Halk ve Şehirlerdir.

## Geniş düzen — kullanıcının 5 Ekim düzeltmesi

Kullanıcı oyunu dar buldu; eski tema, bütün assetler, UI ve UX değişebilir. Bağlayıcı olan ortak sanat dilidir; eski bar boyutları ve çerçeveler korunmak zorunda değildir. Tam sayfada büyük şehir HUD'u gizlenir, 44px gerçek kaynak şeridi sunulur. Alt menü 64px + güvenli alan; boyalı simge ve okunur etiket. İçerik en fazla 960px, yeni sayfalarda kenardan kenara sahne; kalın iç defter çerçeveleri kaldırılır. Bina, ada ve diğer sayfa etkileşimleri korunur.

Halk (`civic-pages.tsx`): İşgücü/Yaşam; meslek seçimi, motorun gerçek üretim önizlemesi, taslak/onay/geri al; barınma/huzur büyüme ilişkisi ve bina bağlantıları. Şehirler: Yerleşimler/Nakliye/İdare; gerçek şehir seçimi, taşıma kapasitesi ve stok sınırı, denizdeki yükler; başkent ve terk etme işlemleri mevcut kurallarla ve açık onayla. Tek şehirde geçersiz boş nakliye formu yerine kolonileşme yolu.


### 5 Ekim: ortak dili oyunun geneline taşıma
Kullanıcı genel yenilemeye sırayla başlama yetkisi verdi. İlk bölüm Vezir (0.57.0 / SW54): ayrı resimli divan sahnesi, tam genişlikte ahşap/pirinç başlık ve parşömen, Gündem/Şehirler/Haberler. Öncelikler, üretim, şehir nüfusu ve inşaatlar, haberler gerçek kayıttan gelir. Oyun kuralları ve kayıt biçimi değişmez. Sonraki bölüm Elçi/İttifak; her biten bölüm yayınlanıp gerçek ekranlarla sunulur.
