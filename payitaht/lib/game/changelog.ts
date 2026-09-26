/**
 * SÜRÜM NOTLARI — oyunun ilk satırından bugüne. En yeni sürüm başta.
 * Yeni bir sürüm çıkınca VERSION ve listenin başı birlikte güncellenir.
 */
export type Release = { version: string; date: string; title: string; notes: string[] }

export const CHANGELOG: Release[] = [
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
