/**
 * SÜRÜM NOTLARI — oyunun ilk satırından bugüne. En yeni sürüm başta.
 * Yeni bir sürüm çıkınca VERSION ve listenin başı birlikte güncellenir.
 */
export type Release = { version: string; date: string; title: string; notes: string[] }

export const CHANGELOG: Release[] = [
  { version: '0.60.2', date: '7 Ekim 2026', title: 'Sancak ve canlı oyun çerçevesi', notes: ['Üst çubukta seçili kumaş sancak ve tek seviye halkası gösterilir. Danışman rozetleri ile kaynak sayaçlarının arka planları temizlendi.', 'Alt menüde basılma animasyonu, kısa altın ışık ve seçili sekme vurgusu eklendi.'] },
  { version: '0.60.0', date: '6 Ekim 2026', title: 'Şehir üzerinde yapı yönetimi', notes: ['Binaya dokununca şehir görünür ve canlı kalır; kısa yapı panelinde seviye etkileri, maliyetler ve yükseltme eylemi bir arada gösterilir.', 'Yapıyı yönet düğmesi ayrıntılı bina sayfasını açar. Şehirde üst çubuk sadeleştirildi; oyun kuralları, inşaat sırası ve kayıt biçimi korunur.'] },
  { version: '0.59.0', date: '6 Ekim 2026', title: 'Divanhane ve Elçilik defterleri', notes: ['Divanhane yeniden düzenlendi: resimli şehir meydanı, Şehir, Halk, İdare ve Gelişim defterleri. Üretim, garnizon, nişan ve yönetim bilgileri geniş parşömende okunur.', 'Elçilikte Hariciye, Casuslar ve Gelişim ayrı defterler oldu. Elçi ve birlik geçişleri, casus eğitimi, yabancı casuslar ve bütün yapı işlemleri korunur.'] },
  { version: '0.58.0', date: '6 Ekim 2026', title: 'Elçi ve birlik divanı', notes: ['Elçi ve İttifak ortak saray diliyle yenilendi: resimli hariciye odası, geniş parşömen defterleri, gerçek mektup/teklif sayıları ve okunaklı hükümdar sicili.', 'Kuruluş ve katılım ayrı defterler; birlik yönetimi, üyeler, görevler, genelgeler ve diplomasi korunur. İttifak sancağı 10 gerçek kumaş ve 12 sırma arma ile düzenlenir.'] },
  { version: '0.57.0', date: '5 Ekim 2026', title: 'Vezirin divan defteri', notes: ['Vezir sayfası ortak resimli saray diliyle yeniden kuruldu: denize bakan divan odası, Gündem, Şehirler ve Haberler.', 'Gerçek şehir öncelikleri, net üretim, nüfus, inşaat süreleri ve gruplu haberler geniş parşömen üzerinde gösterilir. Şehir ve yönetim geçişleri korunur.'] },
  { version: '0.56.0', date: '5 Ekim 2026', title: 'Sancaktarın ipekleri', notes: ['Sancaktar odası yeniden tasarlandı: 10 ayrı bordürlü ipek sancak ve 12 altın sırma arma gerçek görsellerle seçilir.', 'Büyük canlı sancak önizlemesi, geniş kumaş seçimi, arma vitrini ve renk seçenekleri; profil önizlemesindeki SVG arma da boyalı görselle değiştirildi. Kaydet ve vazgeç işlemleri korunur.'] },
  { version: '0.55.0', date: '5 Ekim 2026', title: 'Sarayın bütün defterleri', notes: ['Profilin Şehirler, Nişanlar ve Sancak sekmeleri aynı resimli saray diliyle yeniden düzenlendi: mülk defteri, nişan vitrini ve canlı kumaş seçimleri.', 'Ayarların Cihaz, Kayıt ve Bilgi sekmeleri boyalı nesneler, pirinç düğmeler ve geniş parşömenle tamamlandı. Bildirim, yedekleme, geri yükleme ve kayıt kontrolü işlemleri korunur.'] },
  { version: '0.54.0', date: '5 Ekim 2026', title: 'Onaylanan hükümdar ve ayarlar tasarımı', notes: ['Profil ve Ayarlar onaylanan resimli tasarımla yeniden kuruldu: kıyı sarayı, kişisel sancak, ahşap sekmeler ve geniş parşömen.', 'Profilin şehir, nişan ve kimlik işlemleri ile gerçek ses, görünüm, tempo ve kayıt ayarları korunur.'] },
  {
    version: '0.53.0', date: '5 Ekim 2026', title: 'Şehir yaşamı ve açık denizler',
    notes: [
      'Sayfalarda büyük üst barın yerine kısa kaynak şeridi, daha küçük alt menü ve geniş içerik alanı. İç içe kalın çerçeveler azaltıldı.',
      'Halk yeniden tasarlandı: çarşı meydanı, meslek seçimi, gerçek üretim önizlemesiyle görev dağılımı ve şehir yaşamı.',
      'Şehirler yeniden tasarlandı: ada limanı, yerleşimler, nakliye ve idare. Yük sınırı ve stoklar gerçek değerlere göre gösterilir.',
    ],
  },
  {
    version: '0.52.0', date: '5 Ekim 2026', title: 'Hazinedarın defteri',
    notes: [
      'Hazine ve üretim yeniden kurgulandı: akçe hesabı, her kaynağın üretim defteri ve ambar yoklaması ayrı bölümlerde.',
      'Net kazanç, ordu ve âlim giderleri, çalışanlar, maden üretimi ve kahve tüketimi gerçek şehir değerleriyle gösterilir. İlgili bina veya işçi ekranına doğrudan geçilir.',
      'Dolan ambarlar ve azalan kahve için hazinedarın notu; şu anki hıza göre yaklaşık dolma veya tükenme süresi. Oyun kapalıyken üretim sınırı mevcut ambar seviyesine göre okunur.',
    ],
  },
  {
    version: '0.51.0', date: '5 Ekim 2026', title: 'Hükümdarın sarayı ve idare defteri',
    notes: [
      'Hükümdar profili sarayda: canlı sancak, unvan yolu, hükümdarlar defteri, şehirler ve nişan hazinesi ayrı bölümlerde.',
      'Sancaktar odasında adını, düsturunu, sancak biçimini, armayı ve rengi seç; seçimlerini kaydetmeden önce canlı sancakta gör.',
      'Ayarlar bir idare defteri oldu: oyun tercihleri, cihaz seçenekleri, kayıt yedeği ve divan bilgileri ayrı sayfalarda.',
    ],
  },
  {
    version: '0.50.0', date: '5 Ekim 2026', title: 'Divanın yeni defterleri',
    notes: [
      'Şehir günlüğü bir vakayinameye dönüştü: olay türlerine göre gezilir, kayıt içinde arama yapılır; günler, saatler ve tekrar eden olaylar birlikte okunur.',
      'Sürüm notları divan arşivinde: son yenilikler açık, önceki sürümler ayrı fermanlarda. Sürüm numarası veya sözcükle arama yapılır.',
      'Görevler yeniden kurgulandı: seçilebilir şehir fermanları, resimli günlük görevler, giriş hediyeleri ve imparatorluk nişanları.',
      'Ortak ceviz ve altın üst/alt menü, parşömen defterler ve boyalı Osmanlı–Ege sahneleri aynı tasarım dilinde bir araya geldi.',
    ],
  },
  {
    version: '0.49.0', date: '4 Ekim 2026', title: 'Korsan adası ve yeni kışla',
    notes: [
      'Liman ağzında, deniz kapısının hemen dışında küçük kayalık bir ada var. Korsan Kalesi artık oraya kurulabilir; yeni kurulan Korsan Kalesi önce adaya yerleşir, kıyı iskelesi de hâlâ olur.',
      'Böylece üç kıyı iskelesi liman ve tersaneye boş kalır. Kıyıdaki Korsan Kalesi yerinde durur; istersen taşıyıp adaya alabilirsin.',
      'Kışla sayfası yenilendi: sancaklı Osmanlı eğitim avlusu, kırmızı başlık şeridi, parşömen birlik kartları.',
    ],
  },
  {
    version: '0.48.0', date: '4 Ekim 2026', title: 'Yeni giriş manzarası ve tek tek boyanmış adalar',
    notes: [
      'Giriş ekranının arka planı yeniden boyandı: gün batımında Payitaht, kubbeler, minareler, koyda kalyonlar ve önde çiçekli taş balkon.',
      'Dünya haritasındaki on altı adanın her biri artık kendine özgü bir biçimde: volkanlı, kızıl kayalı, palmiyeli koylu, çam ormanlı burunlu, iki tepeli, uzun ince adalar.',
    ],
  },
  {
    version: '0.47.0', date: '4 Ekim 2026', title: 'Sahne gibi sayfalar: bina, savaş raporu, araştırma ağacı',
    notes: [
      'Bina sayfasında yapı artık bir manzarada duruyor: gökyüzü, uzak tepeler, çimen (liman yapılarında deniz) ve iki yanda ağaçlar.',
      'Kışla, Tersane ve Elçilik açılınca birlikler büyük boyalı portrelerle yana kayan bir şeritte; dokunduğun birliğin eğitim kartı hemen altında açılır. Ordu özeti katlanır bölüme taşındı.',
      'Yükseltme şeridinde binanın bir sonraki görünümü ve "Yükseltme gereksinimleri" yazısı var; Yükselt düğmesi altın renkte.',
      'Savaş raporu yeniden tasarlandı: savaş meydanı resmi üstünde Zafer!/Yenilgi şeridi, karşı karşıya iki komutan (yapay rakipte kendi portresi), iki ordunun güç çubuğu ve birlik birlik gelen/düşen satırları.',
      'Araştırmalar parşömen tomarında bir ağaç olarak dizildi: her araştırma ön koşulunun altında, çizgilerle bağlı. Dal sekmeleri dal renginde sancaklar.',
    ],
  },
  {
    version: '0.46.0', date: '4 Ekim 2026', title: 'Boyalı yüz tamam: derin sayfalar, kahve binaları, yeni giriş',
    notes: [
      'Araştırma amblemleri, kültür ve inanç sayfaları, yapay rakip hükümdar portreleri, başarım madalyaları ve kara/deniz savaş meydanları boyandı.',
      'Bina setinin hepsi aynı resim diline göre denetlendi. Kahve Fidanlığı ve Kahve Kileri artık kahve temalı: fidan sıraları, çuvallar, kavurma ocağı.',
      'Giriş ekranı yenilendi: Payitaht manzarası, boyalı logo plakası.',
      'Uygulama simgesi ve açılış ekranı yeni: altın çerçeveli cami simgesi (web ve Android).',
    ],
  },
  {
    version: '0.45.0', date: '4 Ekim 2026', title: 'Boyalı adalar ve dünya haritası',
    notes: [
      'On altı adanın her biri ayrı boyandı: kızıl kayalıklar, çam ormanları, kumsallar, koylar ve dağ tepeleri.',
      'Dünya haritasında açık deniz boyalı, adalar kendi küçük resimleriyle görünür; harita boyalı çerçeve içinde.',
      'Haritadaki nakliye gemileri yeni gemi çizimini kullanır.',
    ],
  },
  {
    version: '0.44.0', date: '4 Ekim 2026', title: 'Boyalı surlar, ada yapıları ve gemiler',
    notes: [
      'Surlar üç kademede boyalı: önce kazıklı moloz duvar, sonra kesme taş, en sonda tuğla kuşaklı taş. Kuleler ve kapılar da seviyeyle büyür; sancaklar senin renginde.',
      'Adadaki kahve bahçesi, mermer ocağı, kristal ve kükürt madeni, orman, köy, korsan ini ve kale yeniden çizildi. İnşaat iskelesi, temel, pazar ve iskele de boyalı.',
      'Ticaret, savaş, ablukacı ve balıkçı gemileri ayrı gövde ve yelkenle görünür; sefer ve saldırı gemileri de boyalı.',
      'Telefona inen bina kopyaları biraz daha küçültüldü; toplam indirme bütçenin altında kaldı.',
    ],
  },
  {
    version: '0.43.0', date: '4 Ekim 2026', title: 'Boyalı yüz: yeni arayüz, ikonlar, danışmanlar, şehir ve ordu',
    notes: [
      'Bütün arayüz tek elden boyandı: ceviz ve pirinç plakalar, parşömen düğmeler, kırmızı şerit başlıklar.',
      'Kaynak ve menü ikonları yeniden çizildi (akçe, kereste, ilim, kahve, mermer, kristal, kükürt, nüfus, sefer hakkı). Alt bar ve harita düğmeleri boyalı madalyonlarda.',
      'Dört danışman (Vezir, Serasker, Âlim, Elçi) boyalı portre oldu.',
      'Şehir zemini ve dekoru yeni: taze çim, boyalı deniz ve kumsal, uzak tepeler; incir, nar, portakal, lavanta, kahve bahçesi, çeşme, kovan ve değirmen kümeleri. Yol kenarı servi, bank ve küpler yolun iki yanında.',
      'Üst bar yenilendi: kaynak kutusuna dokununca üretim defteri açılır, dakikalık üretim kutunun altında görünür. Süren işler tek çipte toplanır, dokununca kartlar açılır. Harita araçları tek madalyonda.',
      'Yirmi dokuz birlik boyalı figür oldu; yedi destek gemisi küçük boyda da ayırt edilir (sandık, varil, havan, mancınık, arbalet, alevli pruva).',
      'Telefonda dekor küçük kopyalardan yüklenir; hafif modda dekor yarıya iner.',
    ],
  },
  {
    version: '0.42.0', date: '3 Ekim 2026', title: 'Kahve, ortak ilim, taşsız şehir',
    notes: [
      'Yeni şehir kurunca hiçbir şey baştan başlamaz: araştırmalar, gelecek araştırmaları, yönetim biçimi ve Tophane yükseltmeleri bütün şehirlerinde ortaktır. Bir şehirde biten araştırma hepsinde geçerli; aynı araştırma iki şehirde birden yürütülemez.',
      'İlim artık gemiyle taşınmaz (kitabı kim nakleder?). Eski kayıtta yolda olan ilim çıktığı şehre geri döner.',
      'Üzüm yerine kahve: Osmanlı kahvehanesi kahveyle döner. Bağcı Evi → Kahve Fidanlığı, Şıra Mahzeni → Kahve Kileri, Bağcılık → Kahvecilik. Eski üzüm stoğun aynen kahve olarak gelir.',
      'Taş oyundan çıktı: binalar akçe, kereste ve (ileri seviyede) mermerle yapılır. Taş Ocağı kaldırıldı; seviyesi başına 200 akçe ve 150 kereste iade edilir, eldeki taş 1:1 akçeye çevrilir. Yoldaki taş sevkiyatları ve pazardaki taş teklifleri de akçe olarak döner.',
      'Taşçı Atölyesi artık adanın mermerini artırır (seviye başına %2), Mimarbaşı mermer bedelini düşürür. Mermer İşçiliği araştırması (eski adıyla Taş İşçiliği) mermer verimini %15 artırır.',
      'Üst barda bir kaynak eksildi; yağma, ganimet ve haraç akçe ile kereste üzerinden yürür.',
    ],
  },
  {
    version: '0.41.0', date: '3 Ekim 2026', title: 'Rehber yolda bırakmaz',
    notes: [
      'İlk on dakika rehberi artık hiçbir adımda oyuncuyu ortada bırakmıyor: hedef bitince açık sayfanın geri düğmesi parlar, aşağıda kalan "eğit" düğmesine sayfa kendiliğinden kayar, inşaat sürerken ok sabırla bekler.',
      'İlk sefer adımında "Git" artık adayı açıyor (eskiden madeni açıp köyü örtüyordu); seferden sonra "Şehre dön" parlar.',
      'Rehber beş asker tamamlanınca "1 eğit"i parlatmayı bırakır (eskiden fazladan asker bastırıyordu).',
      'Eski kayıtlarda (Divanhane 5 ve üstü) sonradan eklenen rehber hedefleri ok çıkarmaz.',
      'İmparatorluk özetinde ordu, her şehir için birlik figürlü bir kart oldu (tablo yerine).',
      'Arka planda: ilk on dakika her derlemede gerçek arayüzde baştan sona oynanıyor; büyük dosyalar bölündü; V2 ölçütleri her derlemede ölçülüyor.',
    ],
  },
  {
    version: '0.40.0', date: '3 Ekim 2026', title: 'Sağlam temel: eski kayıtlar, düzenli kod',
    notes: [
      'Kayıtların korunuyor: 0.20\'den bu yana çıkan her sürümün kaydı her derlemede yeniden açılıp ilerletilerek denetleniyor.',
      'Daha yeni bir sürümün kaydı eski uygulamaya yüklenirse oyun açık bir mesajla durur ve kaydı yedekle ezmez; güncelleyince kaldığın yerden sürer.',
      'Kayıt artık hangi sürümün yazdığını da taşıyor; hata raporları buna göre okunur.',
      'Arka planda: oyun motoru, şehir sahnesi ve stiller küçük dosyalara bölündü (görünüm ve oyun aynı). Kullanılmayan 250 stil kuralı silindi; stil dosyası %9 küçüldü.',
      'Arka planda: kod denetimi (ESLint) ve kullanılmayan stil denetimi her derlemede çalışıyor.',
    ],
  },
  {
    version: '0.39.0', date: '3 Ekim 2026', title: 'Herkes için: büyük yazı, renk körlüğü ve ekran okuyucu',
    notes: [
      'Telefonun yazı boyutu %130\'a büyütülünce de bütün ekranlar düzgün kalır. Ordu özetindeki taşan satırlar düzeltildi.',
      'Renk körlüğü: dolu ambar ve dolu konut yalnız renkle değil, kaynak çubuğunda köşedeki ünlem rozetiyle de görünür. Sancak renk seçicide her rengin adı var ve seçili renk ✓ ile işaretlenir.',
      'Ekran okuyucu: şehir haritası için "Şehri liste olarak gör" listesi geldi. Binalar seviyeleriyle sıralanır, seçince bina sayfası açılır. Klavyeyle odak gelince liste ekranda da açılır.',
      'Adı olmayan düğme kalmadı; her sürümde otomatik denetleniyor.',
      'Arka planda: ortak arayüz metinleri tek dosyada (lib/i18n/tr.ts). İleride başka bir dil eklemenin yolu açık.',
    ],
  },
  {
    version: '0.38.0', date: '3 Ekim 2026', title: 'Hafif ve tutumlu: küçük görseller, boşta yavaşlayan şehir, hafif mod',
    notes: [
      'Bina görsellerinin telefon boyu kopyası var: arayüz ve Android uygulaması yarı boyu kullanır. Uygulama yaklaşık 34 MB küçüldü; görüntü aynı.',
      'Beş saniye dokunulmayan şehir saniyede 20 kareyle çizer; dokununca hemen tam hıza döner. Pil ve ısı için.',
      'Hafif mod (Ayarlar > Görünüm): daha az yürüyen halk, yarı parçacık, sade gölge, en çok 30 kare/sn. Zayıf cihazda kendiliğinden açılır; elle de seçilir.',
      'Liste ve sayfalardaki bina resimleri ekrana gelince yüklenir.',
      'Arka planda: kullanılmayan görsel raporu ve telefon boyu kopya denetimi her derlemede çalışır.',
    ],
  },
  {
    version: '0.37.0', date: '3 Ekim 2026', title: 'İlk on dakika, yaşayan rakipler, madalyalar ve bildirimler',
    notes: [
      'İlk on dakika rehberi: ilk sekiz hedef Divanhane, Medrese, ilk âlim, ilk araştırma, Kışla, sur temeli, ilk bölük ve ilk sefer oldu. Her adımda basacağın tek düğme parlar, üstünde ok durur.',
      'Yapay rakiplerin artık dostu ve düşmanı var: savaşı düşmanına açar, dostu yardıma koşar. Birini yağmalarsan dostu kin tutar, düşmanı minnet duyar. Mektuplarında geçmişi anarlar ("Hazinemizi 2 kez yağmaladınız…", "Uzattığınız yardım eli hâlâ dilimizde…"). Rakip sayfasında dostu ve düşmanı yazar.',
      'Dünya haberlerinde birkaç bölüm süren hikâyeler: kan davası, düğün, kıtlık ve korsan avı. Kıtlıktaki şehir senden yardım isteyebilir; kan davası savaşa dönebilir.',
      'Başarımlar 30 madalyaya çıktı (tunç, gümüş, altın). Profilde madalya vitrini kazanılanları ve sıradaki hedefi gösterir.',
      'Terimler sözlüğü: bina etkilerindeki, savaş meydanındaki ve hazinedeki her terimin yanında ⓘ var; dokununca tek cümlelik açıklama açılır.',
      'Android: oyun kapalıyken telefon bildirimi gelir: inşaat bitti, sefer döndü, baskın 10 dakika sonra, ambar doldu. Her biri Ayarlar\'dan ayrı kapatılır.',
      'Türkçe ekler düzeltildi: "Fenerbahçe\'de", "Bağbaşı\'nda", "Kartalkaya\'ya" gibi.',
    ],
  },
  {
    version: '0.36.0', date: '3 Ekim 2026', title: 'Haftalık olaylar, adil saat ve uzun yokluk',
    notes: [
      'Haftalık olaylar: Kervan haftası (ticaret ×1,5), Korsan sezonu (baskınlar sıklaşır, ganimet ×1,5), Hasat (kereste ×1,25), Ramazan (huzur +100). Başlarken ve biterken şehir günlüğüne ve dünya haberlerine yazılır; Görevler sayfasında "Bu hafta" kartı kalan günü gösterir.',
      'Oyun kapalıyken kaynaklar artık Ambar seviyesine göre birikir: 8 saat + Ambar\'ın her seviyesi için 1 saat (en çok 24). Ambar sayfası bu süreyi gösterir; dönüşteki özet üretimin ne zaman durduğunu söyler.',
      'Cihaz saati geri alınırsa oyun son görülen andan gerçek zamanla sürer; saati geri almak kazanç getirmez ve oyun bunu bildirir.',
      'Dalgıç Gemisi güçlendirildi (savunma 30 → 40, can 280 → 380): maliyetine göre rolünün en zayıfıydı.',
      'Arka planda: birim denge raporu (tools/balance-report.ts) ve 30 günlük tempo simülasyonu (tools/pace-sim.ts).',
    ],
  },
  {
    version: '0.35.0', date: '2 Ekim 2026', title: 'Şehir sanatı: sancak direkleri, mahalle, fenerler ve boyalı deniz',
    notes: [
      'Divanhane, saray, valilik, kışla, elçilik, tophane, korsan kalesi ve kara pazarın yanında senin sancağını taşıyan direk; sancağını değiştirince hepsi değişir.',
      'Şehir büyüdükçe çayır doluyor: çeşme başları, mahalle pazarı tezgâhları, bostanlar, servili mezarlık ve yel değirmenleri Divanhane 3\'ten 14\'e kadar sırayla açılır.',
      'Gece meydanın çevresinde ve kapı yollarında sokak fenerleri yanar; zemine sıcak ışık halkası düşer.',
      'Dünya haritasında boyalı deniz dokusu, adaların çevresinde sığlık ve kıyı köpüğü, şehirlerin arasında kavisli, akan deniz yolları.',
      'Bina boyları dengelendi: kışla, elçilik ve taş ocağı fazla büyüktü, mabet, korsan kalesi, medrese ve Karagöz perdesi fazla küçüktü.',
      'Görsel kaynakları belgesi düzeltildi: hangi görsellerin kodla çizildiği ve boyalı bina setinin kaynağının henüz yazılmadığı açıkça belirtildi.',
    ],
  },
  {
    version: '0.34.0', date: '2 Ekim 2026', title: 'Oyun hissi: uçan altınlar, toz, ışık ve davul',
    notes: [
      'Ödül alınca altın ve mal jetonları karttan üst bardaki sayaca uçar; sayaç sayarak artar. Üst bardaki bütün sayılar artık atlamadan, sayarak değişir.',
      'Yükselt\'e basınca harcanan mallar sayaçtan düğmeye uçar; şehirde binanın dibinde toz bulutu kabarır, tahta tokmak sesi gelir.',
      'Bina seviye atlayınca üstünde ışık sütunu ve altın halka belirir, seviye madalyonu büyüyüp küçülür, kısa bir ud ve davul fanfarı çalar.',
      'Araştırma bitince Medrese\'de mavi ışık yanar, parşömen hışırtısı ve ud teli duyulur.',
      'Sefere çıkınca limandan bir yelkenli açığa açılır (nefir sesi); ordu dönünce deniz kapısından meydana asker kolu yürür (davul).',
      'Baskın yaklaşırken mendireğin dışında al yelkenli düşman gemileri bekler, meydanda nöbetçiler belirir.',
      'Binaya dokununca kısa tahta tık sesi. Her ana eylemin artık kendi sesi var.',
      'Ayarlar > Görünüm > "Az hareket": bütün bu efektleri kapatır, sonuç hemen görünür. Cihazda "hareketi azalt" açıksa zaten kapalı; zayıf cihazda parçacıklar yarıya iner.',
      'Kuşatma şeridi parmak boyuna büyüdü.',
    ],
  },
  {
    version: '0.33.0', date: '2 Ekim 2026', title: 'Bütün sayfalar sahne: harita, teklifler, savaş, ittifak',
    notes: [
      'Dünya haritası bütün ekranı kaplıyor; bir adaya dokununca bilgisi alttan açılır, harita arkada kaydırılmaya devam eder. Şehirler sayfasında "Dünya haritasını aç" düğmesi var.',
      'Teklif kartlarında yapay rakibin arması, büyük "Verir ⇄ İster" mal jetonları ve kalan süre çubuğu; süre azalınca çubuk kızarır.',
      'Sıralamada ilk üç hükümdar armalarıyla kürsüde duruyor, kalanlar altta liste.',
      'Savaş özeti açılınca canlanıyor: ordular karşılaşır, kayıplar sırayla düşer, sonda ZAFER ya da YENİLGİ mührü basılır. "Geç" ile hemen biter.',
      'Araştırmada dallar şerit oldu; yolu sağa sola kaydırarak dal değiştirirsin, seçili konu büyür.',
      'İttifak: sancağın dibinde itibar madalyonu, üyeler armalı kartlarda, duyuru rulo parşömende.',
      'Günlük görev, büyük hedef ve ittifak görevleri aynı kartta: görsel, kalın ilerleme çubuğu, ödül sandığı ve jetonlar. Büyük hedeflerde ilgili binanın resmi var.',
      'Vezir\'in şehir listesi kart oldu; şehir günlüğü ve olaylar gün gün, simgeli zaman çizelgesinde.',
      'Şehir, üstünde tam ekran bir sayfa açıkken çizilmiyor: pil daha az gidiyor ve sayfa animasyonları takılmıyor.',
      'Düzeltme: dar ekranda bina sayfasındaki "eksik" yazısı ekrandan taşıyordu.',
    ],
  },
  {
    version: '0.32.0', date: '2 Ekim 2026', title: 'Bina sayfası sahne oldu, rozetler sakinleşti',
    notes: [
      'Bina sayfasında Yükselt düğmesi artık altta sabit: maliyet jetonları ve süre hep görünür, sayfayı kaydırmak gerekmez.',
      'Binanın büyük görselinin ortasında seviye plakası; açıklama tek satır, ⓘ düğmesi açıklamanın tamamını ve "Nasıl işler?" notlarını açar.',
      'Binanın kendi işi (eğitim, işçiler, depo…) ve gelişim bilgisi (seviye etkisi, sonraki seviyeler) iki sekmede.',
      'Rozetler: aynı anda en çok iki sayılı rozet (önce baskın ve görev ödülü), diğer haberler küçük nokta.',
      'Üst bar koyu ahşap plaka; pirinç kenar ve perçinler.',
    ],
  },
  {
    version: '0.31.0', date: '2 Ekim 2026', title: 'Tek görsel dil: boyalı ikonlar, altın düğmeler, kurdeleli kutular',
    notes: [
      'Oyundaki 88 ikonun hepsi kaynak simgeleriyle aynı boyalı dilde: mürekkep kontur, malzemesine göre renk (pirinç, çelik, ahşap, al, yeşil, deniz, parşömen), parlama ve gölge. Çizgi ikon kalmadı.',
      'Bütün düğmeler tek tip oyun düğmesi: bombeli yüz, alt kenar gölgesi, basınca çöker. Asıl eylem altın, ikincil parşömen, tehlikeli eylem al. Ada ekranındaki düğmeler de artık aynı.',
      'Sayfa kutuları ahşap kenarlı parşömen; başlıklar BÜYÜK HARF şerit yerine uçları kesik al kurdele.',
      'Bina maliyetleri yuvarlak jetonlarda; seviye etkileri tablo yerine "şimdi ➜ sonraki seviye" satırları. Vezir\'in üretim tablosu simgeli satırlara döndü.',
      'Adada bir köye ya da rakibe dokununca bilgisi alttan açılan çekmecede gelir; harita arkada görünür kalır, aşağı çekince kapanır.',
      'Danışman portreleri boyalı: mürekkep kontur, ışık ve gölge.',
    ],
  },
  {
    version: '0.30.0', date: '2 Ekim 2026', title: 'Parmağa göre düğmeler, okunur yazılar, hata raporu',
    notes: [
      'Bütün düğmeler ve seçim alanları en az parmak boyunda (44 px): rapor arşivle/sil, geri, işçi adımları, harita yakınlaştırma, renk seçimi, sekmeler ve bağlantılar artık ıskalanmıyor.',
      '11 px altındaki bütün yazılar büyüdü (110 yazı kuralı); yalnız rozet ve madalyon içi rakamlar küçük kaldı.',
      'Dar telefonda işçi kaydırıcısı figürleri üstte, düğmeleri altta tam genişlikte gösterir; rapor başlığında saat artık düğmelerin altında kalmaz.',
      'Surların her yeri dokunmaya yanıt verir (0.29.1\'de duvar parçalarının bir kısmı yanıt vermiyordu).',
      'Ayarlar > Hata raporu: oyunda bir hata olursa son 20 kayıt yalnızca bu cihazda tutulur; "Hata raporunu kopyala" ile istersen paylaşabilirsin. Hiçbir şey otomatik gönderilmez.',
      'Arka planda: her sürümde bütün sayfaları ve 38 bina sayfasını telefon ekranında açıp taşma, kesik yazı, küçük düğme, minik yazı ve üst üste binme arayan otomatik denetim.',
    ],
  },
  {
    version: '0.29.1', date: '2 Ekim 2026', title: 'Telefona uygun üst bar, dokunulan surlar, hazine defteri',
    notes: [
      'Surlara dokununca Surlar sayfası açılır (duvar, burç ve kapı). Sur seviyesi ana kapının üstünde madalyonda yazar; etiketler açıkken diğer binalar gibi ad + seviye.',
      'Üst kaynak çubuğu telefonda yeniden: daha yüksek plakalar, sayılar kesilmez (9.876 · 33,2B · 1,2M; B = bin, M = milyon). Konut dolunca nüfus sarıya döner.',
      'Hazine ve üretim sayfası defter oldu: her mal madalyonlu, kalın doluluk çubuğunda stok / ambar, sağda dakikalık oran; dolu ambar kızarır, üretimi olmayan mal "Üretim yok" der.',
      'Bütün oranlar yuvarlanır ve Türkçe yazılır (825.6628319999999 yerine 826; 12.5 yerine 12,5); "-0" ve "+0" yazmaz.',
      'Bina maliyetinde eksik miktar sayının altına iner, kutudan taşmaz; sayfalardaki düğme sıraları dar ekranda alta kayar; günlükte art arda aynı olay tek satırda "×5" diye toplanır.',
    ],
  },
  {
    version: '0.29.0', date: '2 Ekim 2026', title: 'Boyalı şehir, ittifak görevleri ve resimli raporlar',
    notes: [
      'Bütün binalar üç aşamada boyalı çizimlerle yenilendi; liman ve tersane kıyıya oturdu, kuşatmada işgalci ordular ve abluka filoları şehirde görünür.',
      'Savaş raporları resimli: başta ZAFER / YENİLGİ şeridi, iki ordunun birlikleri figürleriyle (gelen / düşen), moral ve sur; tur tabloları ayrıntıda. Araştırma listesi çizimli bir yol, dünya haritasında adalar kendi boyalı görselleriyle.',
      'İttifak Ikariam gibi: dış sayfa (tanıtım), üyelere iç duyuru, rütbelerin görev ve yetkileri, rütbelere özel adlar (Serdar, Kethüda…) ve her hafta üç ittifak görevi (akçe, ilişki ve sıralamaya eklenen itibar).',
      'Surlar seviyesine göre değişir: 1-3 moloz duvar ve ahşap kazık, 4-7 kesme taş, 8+ tuğla kuşaklı yüksek sur ve sancak renginde asılı flamalar. Sur örülürken iskele ve kapıda süre sayacı.',
      'Şehrin çevresinde lale bahçeleri ve çayırda lale öbekleri; adada orman çizimi görünür.',
      'Yeni oyuncuya dört adımlık rehber; oyuna dönünce "yokluğunda olanlar" özeti; Görevler\'de on iki ödüllü Büyük hedef (Divanhane 10/15/20, koloniler, ordu, sefer, sur, nüfus).',
      'Tempo: ilk beş seviye yine dakikalar sürer, sonrası her seviye biraz daha uzun (Divanhane 15 ≈ 35 dk, 20 ≈ 2 saat); en uzun yükseltme 12 saat.',
      'Gece şehri karartmıyor (yumuşak alacakaranlık; Ayarlar > Görünüm\'den kapatılabilir); kaynak çubuğu tek sıra, baskın uyarısı küçük, rozetler en çok 9+.',
      'Düzeltmeler: aynı turda ölen askerin tekrar ölmesi (15 mızrakçının 27 kaybı) giderildi; raporları toplu silmek onay ister; görev sayacı tamamlanan adımları doğru sayar; Cami\'de rahip yerine imam. "Hamle puanı" artık "Sefer hakkı".',
    ],
  },
  {
    version: '0.28.0', date: '26 Eylül 2026', title: 'İttifak, sancaklı şehir ve kaldırımlı sokaklar',
    notes: [
      'İttifak (alt menü): kendi ittifakını kur (ad + kısaltma), yapay rakipleri davet et, Başkomutan / Hariciye / Dahiliye rütbeleri ver, genelge yaz, üyeler cevaplasın; Doğu ve Batı Birliği ile barış, saldırmazlık ya da savaş; ittifak sıralaması. Üyeler sana saldırmaz, baskında yardıma gelir, şehirlerine destek birliği gönderebilirsin.',
      'Şehirdeki bütün bayraklar artık senin sancağın: binaların, meydanın ve surların üstünde senin rengin, biçimin ve armanla dalgalanır; sancağı değiştirince hepsi değişir. Bina sayfalarında, görevlerde ve giriş ekranında da.',
      'Yollar baştan yapıldı: geniş toprak yollarda tekerlek izi ve çakıl; taş yollarda tek tek dizilmiş arnavut kaldırımı ve bordür taşları; kesme taş caddede su oluğu; kavşaklar yuvarlak birleşir, kenarlar çimenle kaynaşır, ana caddelerde fenerler.',
      'Bina sayfasının başında görünüm aşamaları: Sv. 1–3, 4–7 ve 8+ görünümüne dokunup yükseltince binanın nasıl görüneceğini gör.',
      'Medresede süren araştırma çizimiyle görünür. Kum saati ve âlim simgeleri boyalı çizimlerle değişti.',
      'Alttaki OLAY şeridi kaldırıldı (olaylar Vezir\'de).',
    ],
  },
  {
    version: '0.27.0', date: '26 Eylül 2026', title: 'Fasıl müziği, sancak ve resimli görevler',
    notes: [
      'Arka plan müziği: Hicaz makamında ud, ney, dem ve Düyek usulünde darbuka; oyunun içinde çalınan yaklaşık iki dakikalık bir fasıl. Giriş ekranında da çalar.',
      'Sesler yenilendi: her dokunuştaki tık kaldırıldı. Yalnızca önemli anlarda yumuşak ud teli (onay, ödül), tahta tokmak (inşaat) ve davul (savaş). Ayarlar\'da Müzik, Efekt, Ortam sesi ve Titreşim ayrı ayrı açılır.',
      'Adada maden ile orman ayrıldı: Ada ormanı artık kendi sayfasında (oduncular, bağış, orman resmi); Kereste Ocağı\'ndaki düğme de oraya gider.',
      'Görevlere çizimler: her hedef kendi binasını, âlimini, askerini ya da madenini gösterir; günlük görevler de resimli.',
      'Hükümdar profilinin başında boş bina yerine rüzgârda dalgalanan sancağın: dört biçim (kırlangıç kuyruk, çifte dil, üçgen flama, dört köşe), arma ve renk senin seçimin.',
    ],
  },
  {
    version: '0.26.0', date: '26 Eylül 2026', title: 'Canlı şehir, ses ve Play Store cilası',
    notes: [
      'Şehrin arka planı canlandı: çayırda ot tutamları, yonca lekeleri ve kır çiçekleri; fıstık çamı, çınar, kavak ve meyve ağaçları; dere boyunca kavak sırası.',
      'Boş çimenlere küçük sahneler: çınar gölgesi, meyve bahçesi, kuyu başı, lale tarhı; tarla kenarlarında saman yığını, arı kovanı ve odun. Arsaya bina kurulunca sahne kendiliğinden kalkar.',
      'Ses: dokunuş, onay, hata, inşaat çekici, ödül şıngırtısı ve savaş davulu; şehirde dalga ve kuş sesi. Android\'de kısa titreşim. Ayarlar\'dan ayrı ayrı kapatılır.',
      'Android geri tuşu artık uygulamayı kapatmıyor: açık sayfayı, ada görünümünü ya da taşıma kipini kapatır.',
      'Şehir ekranında sıradaki hedef şeridi: hedefe tek dokunuşla git, bitince ödülü oradan al.',
      'Telefon dikey yönde kilitli; ayarlarda Hakkında bölümü (çevrimdışı, veri toplamaz, reklamsız).',
    ],
  },
  {
    version: '0.25.0', date: '26 Eylül 2026', title: 'Yaşayan dünya: yapay rakipler savaşıyor ve ticaret yapıyor',
    notes: [
      'Yapay rakipler artık kendi aralarında savaşıyor: savaşçı ve denizci hükümdarlar öbür ittifaka savaş açar, her saat çarpışır; kazanan güçlenir, kaybeden zayıflar (seviye ve sıralama değişir).',
      'Rakipler sana teklif getiriyor: eksik malını satar, fazla malını almak ister, anlaşma önerir, güçlü savaşçılar haraç ister, dostlar hediye yollar, savaştaki müttefikin yardım ister. Kabul et ya da geri çevir; teklifler birkaç saat sonra düşer.',
      'Elçi sayfasında yeni Teklifler ve Haberler sekmeleri: süren savaşlar, dünya haberleri, kervanlar ve büyüyen şehirler. Haritada rakip savaşları ve yoldaki gemiler görünür.',
      'Yapay rakip temposu (Ayarlar ve Diplomasi): Sakin, Normal ya da oyunu denemek için Hareketli.',
      'Şehir sahnesi: sürüklenen bulut gölgeleri; cihaz saatine göre akşam kızıllığı ve gece karanlığı, gece pencerelerde kandil ışıkları. Teklif gelince şehir ekranında elçi mektubu belirir.',
      'Yeni alt menü: Şehir, Ada, ortada Harita madalyonu, Dünya ve Görevler; sayfalar açıkken de görünür.',
      'Android: başlıklar ve bildirimler artık durum çubuğunun altına girmiyor; bildirimler küçük ve üst üste yığılmıyor.',
      'Düzeltmeler: aynı anda 8\'den fazla düşman ordusu gelince kaydın açılmaması, sonuçlanmamış günlük görevde "Ödülü al" yazısı, Pages sürümünde eksik simge (404).',
    ],
  },
  {
    version: '0.24.0', date: '26 Eylül 2026', title: 'Android deneme sürümü ve giriş ekranı',
    notes: [
      'Oyun artık Android uygulaması (APK) olarak da kurulabiliyor: tamamen çevrimdışı, kayıt telefonda durur; yeni sürüm eskisinin üstüne kurulur.',
      'Giriş ekranı: kayıt varsa hükümdar, arma, başkent ve son oynama zamanıyla "Devam et"; ilk açılışta hükümdar adı, başkent adı, arma ve renk seçilerek yeni oyun.',
      'Giriş ekranında "Nasıl oynanır" ve sürüm notları; ayarlardan giriş ekranına dönülebilir.',
    ],
  },
  {
    version: '0.23.0', date: '26 Eylül 2026', title: 'Karagöz Perdesi ve Ikariam ekranları',
    notes: [
      'Karagöz Perdesi: Ikariam\'daki tiyatronun karşılığı gölge oyunu. Dram kereste ve taşı, Komedi lüks malı %10 artırır; Kültür gösterisi huzur, Tanrısal gösterim lütuf verir. Işıklı perdesi, sedirleri ve kandil dizileriyle yeni bina.',
      'Beşinci araştırma dalı Mitoloji: Ongun Töresi, Balbal Taşları, Destanlar, Kam Ayinleri, Töre ve Gök Kutu; Mitolojinin Geleceği lütfü hızlandırır.',
      'Araştırma danışmanı Ikariam düzeninde: numaralı liste ve kandil işaretleri, seçili araştırmanın etkisi, gerekenleri, masrafı ve ilmin ne zaman yeteceği.',
      'Kışla ve Tersane\'de her birlik için kaydırıcı, adet kutusu ve en fazla düğmesi.',
      'Divanhane özeti: boş konut, garnizon sınırları, hamle puanı, büyüme, net akçe, yolsuzluk ve halkın yüzü; meslek şeridi; adada dalgalanan şehir nişanı.',
      'Ticaret Merkezi sekmeleri: ucuz mal tarayıcısı (al/sat, mal, menzil), paralı asker ticareti, ticaret anlaşmaları ve kendi tekliflerin.',
      'Marangozhane, Mimarbaşı, Şıra Mahzeni, Gözlükçü ve Barut Deneme Alanı\'nda maliyet dökümü çubukları.',
    ],
  },
  {
    version: '0.22.0', date: '26 Eylül 2026', title: 'Savaş ilanı, kuşatma ve ortak filo',
    notes: [
      'Düşman ya da savaşçı hükümdarlar artık kendiliğinden savaş ilan eder: iki saat önceden mektup gelir; şehri yağmalamaya, işgal etmeye ya da limanı abluka etmeye gelirler.',
      'İşgal edilen şehirden ordu, casus ve nakliye çıkamaz; ablukada deniz yolu kapanır. Her saat haraç alınır; Ordu panelinden şehri kurtarır ya da ablukayı kırarsın, barış kuşatmayı kaldırır.',
      'Yakalanmayan düşman casusları şehirde kalır ve saldırıyı kolaylaştırır; Gizli Sığınak onları gösterir ve kovar. Yeni casus görevi: hükümdarın araştırmalarını incele.',
      'Ticaret gemileri Ikariam gibi Ticaret Limanı\'ndan satın alınır, fiyatı her gemiyle artar; bütün şehirler ortak filoyu kullanır.',
      'Birliklerin lüks bedeli: barutlu ve ağır birlikler kükürt, Aşçı üzüm, Hekim kristal ister.',
      'Koloniyi terk edebilir, Sarayı başka şehre taşıyıp başkenti değiştirebilirsin.',
      'İmparatorluk özeti: bütün şehirlerin kaynakları, binaları ve ordusu tek tabloda (Vezir sayfası).',
      'Raporlar silinebilir ve arşivlenebilir; uzun savaşların kaydı artık okunamaz hâle gelmez.',
    ],
  },
  {
    version: '0.21.0', date: '26 Eylül 2026', title: 'Daha oyunsu arayüz',
    notes: [
      'Kaynaklar resimlendi: akçe sikkeleri, kereste kütükleri, kesme taş, ilim kandili, üzüm salkımı, mermer, kristal ve kükürt her yerde kendi resmiyle görünür.',
      'İşçi ataması Ikariam gibi: solda boştaki halk, sağda oduncu, taşçı, âlim, esnaf, madenci ya da imam resmi; kaydırıcıyı çektikçe üretimin nasıl değişeceği görünür, Onayla ile uygulanır.',
      'Bina resminin köşesinde Çevir, Taşı ve Yık düğmeleri; yıkarken bir seviye ya da tamamen yıkma seçilir.',
      'Sur kurulmadan önce şehrin çevresinde kazılmış temel hendeği ve "Sur temeli" tabelası görünür; hendeğe dokununca Surlar açılır.',
      'Alt menüdeki İnşa kaldırıldı: boş arsaya dokunarak kurarsın, bütün yapılar listesi Vezir sayfasında.',
      'Ticaret Limanı ve Tersane yeniden çizildi: taş rıhtımlı liman havuzu, revaklı gümrük hanı, fener kulesi, demirli kalyonlar; kemerli gemi gözleri, kızakta kadırga ve kaptan paşa köşkü.',
      'Savaş raporları tur tur tabloda: iki tarafın kaybı, sur ve moral çubukları; uzun savaşlar kısaltılmış gösterilir.',
      'Kabartmalı oyun düğmeleri, alttan kayarak açılan sayfalar; uzun açıklamalar "Nasıl işler?" düğmesinin arkasında.',
    ],
  },
  {
    version: '0.20.0', date: '26 Eylül 2026', title: 'Arayüz cilası',
    notes: [
      'Alt menüdeki Harita artık doğrudan dünya haritasını açar; şehir listesi ve nakliye haritanın altında.',
      'Elçi sayfasının sekmeleri dar ekrana sığan dört dilimli bir şeride dönüştü; okunmamış mektuplar rozetle görünür.',
      'Tanrı kartları yeniden düzenlendi: lütuf ve kudret ayrı satırlarda, tam genişlikte okunur.',
      'Lonca adak düğmesi "Adak sun" oldu; kışla ve tersane artık uzun birlik listesi yerine tür sayısını ve o seviyede açılan birlikleri gösterir.',
      'Şehir sınırı doğru gösterilir (1/12); sayılar her yerde düz rakamla yazılır.',
      'Dönüş mesajı sadeleşti ve yalnızca beş dakikadan uzun aralarda yazılır; hükümdarın varsayılan adı Ertuğrul oldu.',
    ],
  },
  {
    version: '0.19.0', date: '26 Eylül 2026', title: 'Kadim tanrılar',
    notes: [
      'Ongun Mabedi: balbal taşları, ongun direği, kutsal ateş ve keçe otağlarla açık hava mabedi. Lütuf biriktirir; akçe, kereste, taş ya da lüks mal sunarak lütfü artırırsın.',
      'Sekiz kadim Türk tanrısı: Tengri, Umay Ana, Ülgen, Kayra Han, Erlik Han, Kızagan, Su İyesi, Yel Ana. Şehir birini hami seçer; hami tanrının lütfü mabet seviyesiyle büyür.',
      'Her tanrının kudreti: Kut (bir saatlik üretim), Bereket Yağmuru, Aydınlanma, Yaratış, Karanlık Korku (baskıncıların üçte biri kaçar), Savaş Narası, Dalga Kalkanı, Poyraz.',
      'Başlangıç eğitimine mabet adımı eklendi (19 adım).',
    ],
  },
  {
    version: '0.18.0', date: '26 Eylül 2026', title: 'Loncalar, geniş dünya ve deniz meydanı',
    notes: [
      'Ahi Tekkesi: himmet biriktirir; himmeti altı esnaf loncasına adayıp himayene aldığın loncaların bereketinden yararlanırsın (Ikariam\'daki tanrıların karşılığı).',
      'Savaşlar artık bir taraf dağılana ya da kaçana kadar sürer; cephanesi biten nişancı yakın dövüşe geçer, ilerlemeyen savaş tıkanıp biter.',
      'Deniz savaşlarının kendi meydanı var: kanat yok, ön hat ve atış hattı Liman ve Tersane ile genişler.',
      'Dünya iki katına çıktı: 16 ada, dört yeni yapay rakip hükümdar, 12 şehre kadar koloni ve koordinatlı dünya haritası.',
      'Başlangıç eğitimi 18 adıma çıktı; tamamlanan adımların ödülü tek dokunuşla alınır.',
      'Sıralamaya inşaatçı, saldırı, savunma ve ticaret kolları eklendi; profilde sekiz kolda yerin görünür.',
      'Bildirimler: oyun açıkken baskın, savaş sonucu ve biten inşaat için sistem bildirimi (Ayarlar).',
      'Müttefik şehre gönderilen filo, başka adadan gelen düşman donanmasını limanda karşılar.',
      'Birlik seçici ve görev listesi yenilendi.',
    ],
  },
  {
    version: '0.17.0', date: '26 Eylül 2026', title: 'Amblemler, profil ve yeni binalar',
    notes: [
      'Her araştırmanın kendi amblemi var: dalın renginde sekiz köşeli yıldız, ortada o araştırmanın motifi.',
      'Birbirine benzeyen 12 bina yeniden çizildi: zahire ambarı ve serender, bağ evi, cam fırını, rasathane, açık köşk kahvehane, toprağa gömülü şıra mahzeni, su çarklı marangozhane, maket kubbeli mimar atölyesi, kütük ormancı evi, barut deneme alanı, simya kulesi, koyu taş kara pazar.',
      'Hükümdar profili: ad, unvan, arma, düstur, puanlar ve sıralamadaki yerin, şehirlerin, istatistikler ve başarımlar.',
      'Oyun ayarlarına profilden ulaşılır; sürüm notları da burada.',
    ],
  },
  {
    version: '0.16.0', date: '25 Eylül 2026', title: 'Hava savaşı ve casus görevleri',
    notes: [
      'Savaş meydanına hava ve hava savunması sıraları geldi: Lagari Roketçisi ile Balon Gemisi surun üstünden vurur, onlara yalnızca Hezarfen ve Karamürsel yetişir.',
      'Yeni birimler: Hezarfen, Lagari Roketçisi, Zenberek Gemisi, Dalgıç Gemisi, Buharlı Koç, Balon Gemisi; beş yeni araştırma.',
      'Casuslar hedefe sızar ve kalır: hazine, garnizon, sur, liman ve asker hareketleri görevleri.',
      'Kışla ve Tersane aynı anda eğitir, her birine beş emire kadar sıra verilir.',
      'Müttefik hükümdarın şehrine destek birliği konuşlandırılabilir.',
    ],
  },
  {
    version: '0.15.0', date: '25 Eylül 2026', title: 'Ikariam savaş meydanı',
    notes: [
      '23 birimin hepsi çizildi.',
      'Savaş, Divanhane seviyesiyle büyüyen yuvalı meydanda geçer: ön cephe, kanat, menzil, kuşatma; yedek, cephane, zırh, moral, sur.',
      'Savaşlar dakikada bir tur, canlı sürer: takviye katılır, saldıran geri çekilebilir; raporlar tur tur izlenir.',
      'Garnizon sınırı; köylerin ve rakiplerin meydanı casus raporunda görünür.',
    ],
  },
  {
    version: '0.14.0', date: '25 Eylül 2026', title: 'Yaşayan şehir',
    notes: [
      'Bayraklar dalgalanır, kışlada talim yapılır, bacalardan duman tüter, sokaklarda halk ve yeniçeriler dolaşır.',
      'Su kemeri ve surda su kapısı; iskele pazarı binaların arasından çıkarıldı.',
      'Şehir Divanhane ile kademeli gelişir: bahçeler, çeşmeler, bayraklar seviyeyle açılır.',
    ],
  },
  {
    version: '0.13.0', date: '25 Eylül 2026', title: 'Osmanlı şehri',
    notes: [
      'Şehir meydan, çevre yolu ve ana cadde etrafında yeniden planlandı; surlar genişledi, liman surun içine alındı.',
      'Divanhane Topkapı Sarayı, cami Ayasofya olarak çizildi; diğer binalar Osmanlı mimarisiyle yenilendi.',
      'Bahçe duvarları, bağlar, çeşmeler ve şehirden akan dere.',
      'Tarayıcıdaki donma giderildi: sabit çizimler dokuya pişirilir.',
    ],
  },
  {
    version: '0.12.0', date: '24 Eylül 2026', title: 'Yapay rakipler ve devlet',
    notes: [
      'Tam araştırma ağacı, yönetim biçimleri, ada ormanı, günlük görevler ve birlik aktarma.',
      'On yapay rakip hükümdar: savaş, işgal, abluka, diplomasi, pazar, ittifak, mektuplar ve sıralama.',
      'Ikariam tarzı bina sayfaları, parşömen paneller ve dört danışman (Vezir, Serasker, Âlim, Elçi).',
      'Ikariam gibi sokak ızgaralı şehir ve üç liman arsası.',
    ],
  },
  {
    version: '0.11.0', date: '24 Eylül 2026', title: 'Ikariam paritesi',
    notes: [
      'On yeni bina, on iki birlik, turlu savaş, birlik bakımı, yolsuzluk ve hamle puanı.',
      'Deniz savaşı, korsan baskınları, harikalar ve mucizeler.',
    ],
  },
  {
    version: '0.10.0', date: '24 Eylül 2026', title: 'Kendi çizimimiz ve lüks ekonomi',
    notes: [
      'Bütün binalar kendi izometrik çizim motorumuzla, üç seviye aşamasında çizildi.',
      'Ada madeni: üzüm, mermer, kristal, kükürt; tüccar ve nakliye.',
      'Bina bonusları, ada görünümü, casusluk ve seferler.',
    ],
  },
  {
    version: '0.9.0', date: '23 Eylül 2026', title: 'Adalar ve Osmanlı arayüzü',
    notes: [
      'Ada atlası, bağımsız şehirler ve deniz nakliyesi.',
      'Medrese araştırmaları ve bina ekonomisi genişledi.',
      'Altın-mürekkep Osmanlı arayüzü ve altı düğmeli menü.',
    ],
  },
  {
    version: '0.8.0', date: '23 Eylül 2026', title: 'Sanat geçişleri',
    notes: [
      'On altı sanat geçişi: yollar, kıyı, su, zemin dokusu, renk paleti ve bitki örtüsü.',
      'Mobil görsel denetim ekran görüntüleri.',
    ],
  },
  {
    version: '0.7.0', date: '22 Eylül 2026', title: 'Payitaht tek oyun',
    notes: [
      'Şehir arsa sistemi, organik şehir geometrisi ve katmanlı arazi.',
      'Antik Şehir kaldırıldı; Payitaht tek oyun olarak yayına alındı.',
    ],
  },
  {
    version: '0.6.0', date: '18 Eylül 2026', title: 'Ikariam seviyeleri',
    notes: [
      'Ikariam gibi 32 bina seviyesi ve dört dallı araştırma.',
      'Elmas ağaç düzeninde arsalar, oyuncunun döşediği yollar, bina taşıma.',
    ],
  },
  {
    version: '0.5.0', date: '17 Eylül 2026', title: 'İzometrik şehir',
    notes: [
      'İzometrik bina görselleri, arazi, yol ve süs karoları.',
      'Belediye merkezli şehir, yollar ve sur.',
    ],
  },
  {
    version: '0.4.0', date: '16 Eylül 2026', title: 'Payitaht doğuyor',
    notes: [
      'İşçi atama, ticaret, depo uyarıları, inşaat sırası ve halkın huzuru.',
      'Danışmanlar, halktan çıkan ordu ve altı yeni bina.',
      'Şehir tuvale taşındı: kaydırılıp gezilebilir.',
    ],
  },
  {
    version: '0.3.0', date: '12 Eylül 2026', title: 'Mobil şehir kurma',
    notes: [
      'Üçüncü seviye, akademi araştırması ve arayüz kaplamaları.',
      'Sprite dokuları çizildikleri boyutta pişirilir.',
    ],
  },
  {
    version: '0.2.0', date: '11 Eylül 2026', title: 'Ekonomi çekirdeği',
    notes: [
      'Nüfus gerçek bir kaynak oldu; işçiler iş yerlerine yürür.',
      'Dokunmatik kontroller ve mobil ekran düzeltmeleri.',
    ],
  },
  {
    version: '0.1.0', date: '10 Eylül 2026', title: 'İlk taş',
    notes: [
      'Phaser ve TypeScript ile mobil strateji oyununun iskeleti.',
      'Tik tabanlı simülasyon, inşaat ve yükseltme sistemleri.',
    ],
  },
]

export const VERSION = CHANGELOG[0].version
