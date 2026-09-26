/**
 * SÜRÜM NOTLARI — oyunun ilk satırından bugüne. En yeni sürüm başta.
 * Yeni bir sürüm çıkınca VERSION ve listenin başı birlikte güncellenir.
 */
export type Release = { version: string; date: string; title: string; notes: string[] }

export const CHANGELOG: Release[] = [
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
