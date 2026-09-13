import type { CostCoefficients } from './Formulas';
import type { BuildingDefinition, MaterialKey } from '@/types';

/**
 * Ikariam bina katalogu.
 *
 * Her binanin seviye tablosu YOKTUR; Ikariam gibi tek bir formul ve dort
 * katsayi vardir (bkz. config/Formulas.ts). Katsayilar Ikariam wiki'sinin
 * "Buildings/Construction Time" ve "Building resources formula"
 * sayfalarindan alinmistir.
 *
 * KAYNAK GOSTERGESI
 *   [wiki]     - Ikariam wiki'sindeki katsayi aynen kullanildi
 *   [turetim]  - wiki'de "N/A" idi; ayni islevsel bicimle (A/B*C^L-D) ve
 *                komsu binalarin buyukluk sinifiyla tutarli katsayi secildi.
 *                Dogrulama icin seviye 1 ve 2 degerleri yoruma yazildi.
 *
 * Bina eklemek icin bu listeye kayit eklemek yeterlidir: maliyet, insa
 * suresi, menu karti ve depo tavani kontrolu otomatik devreye girer.
 */

/** Kisa yazim yardimcisi. */
function c(A: number, B: number, C: number, D: number, n0 = 1): CostCoefficients {
  return { A, B, C, D, n0 };
}

/**
 * Wiki'de maliyeti "N/A" olan binalar icin katsayi uretir.
 *
 * Ayni islevsel bicim korunur; yalnizca buyukluk, insa suresi
 * katsayilarindan turetilir. Boylece "hangi bina daha pahali" siralamasi
 * Ikariam'in insa suresi siralamasiyla tutarli kalir - uzun suren bina
 * ayni zamanda pahali binadir.
 */
function derived(timeA: number, timeB: number, timeC: number, n0 = 1): CostCoefficients {
  // insa suresi A/B'si odun maliyetinin ~%0.09'u olacak sekilde olceklenir.
  // Depo (1600/3=533 -> 160 odun) ile kiyaslanarak secildi.
  const A = Math.round((timeA / timeB) * 0.9);
  const D = Math.round(A * 0.8);
  return { A, B: 1, C: timeC, D, n0 };
}

/** Uretim binalarinin ortak insa suresi katsayilari. [wiki] */
const PRODUCTION_TIME = c(72_000, 11, 1.1, 6_120);
/** Indirim binalarinin ortak insa suresi katsayilari. [wiki] */
const REDUCTION_TIME = c(125_660, 37, 1.06, 2_628);

/** Uretim binalarinin ortak odun maliyeti. [wiki: 6440/13, 1.3, 370] */
const PRODUCTION_WOOD = c(6_440, 13, 1.3, 370);
/** Uretim binalarinin ortak kristal maliyeti (seviye 1'den itibaren). [wiki] */
const PRODUCTION_CRYSTAL = c(4_640, 13, 1.3, 348);

export const BUILDINGS: BuildingDefinition[] = [
  // =========================================================================
  // SABIT YAPILAR - yerleri degismez
  // =========================================================================
  {
    id: 'town_hall',
    name: 'Valilik',
    description:
      'Şehrin kalbi. Seviyesi depo kapasitesini, maksimum nüfusu ve açılan yapı alanı sayısını belirler.',
    category: 'infrastructure',
    slot: 'townhall',
    // [wiki] 1800/1 * 1.17^L + 1080
    time: c(1_800, 1, 1.17, -1_080),
    cost: {
      // [turetim] L1=720 odun, L2=1296 odun
      wood: c(2_400, 1, 1.2, 2_160),
      // [turetim] L2=432 mermer, L3=662 mermer
      marble: c(800, 1, 1.2, 720, 2),
      // [turetim] L3=346 sarap
      wine: c(720, 1, 1.2, 648, 3),
      // [turetim] L4=570 kristal
      crystal: c(1_080, 1, 1.2, 1_008, 4),
    },
    maxLevel: 40,
    maxCount: 1,
    tint: 0xd9c9a4,
    size: 2,
  },
  {
    id: 'port',
    name: 'Ticaret Limanı',
    description:
      'Yük gemileri buradan kalkar. Seviyesi yükleme hızını ve aynı anda denizde olabilecek gemi sayısını artırır.',
    category: 'naval',
    slot: 'port',
    time: c(50_400, 23, 1.15, 1_512), // [wiki]
    cost: {
      wood: derived(50_400, 23, 1.15), // [turetim]
      marble: c(1_600, 1, 1.18, 1_440, 3), // [turetim]
    },
    maxLevel: 45,
    maxCount: 1,
    tint: 0x9fb8c8,
    size: 2,
  },
  {
    id: 'shipyard',
    name: 'Tersane',
    description: 'Savaş gemileri burada inşa edilir. Seviyesi hangi gemilerin yapılabileceğini belirler.',
    category: 'naval',
    slot: 'shipyard',
    time: c(64_800, 7, 1.05, 7_128), // [wiki]
    cost: {
      wood: c(6_200, 21, 1.26, 267), // [wiki]
      crystal: c(52_700, 63, 1.26, 276, 5), // [wiki]
      sulfur: c(9_000, 21, 1.2, 700, 8), // [turetim]
    },
    maxLevel: 40,
    maxCount: 1,
    requiresResearch: 'dry_dock',
    tint: 0x8a9aa8,
    size: 2,
  },
  {
    id: 'wall',
    name: 'Şehir Surları',
    description:
      'Savunmadaki birliklerin direncini artırır. Her seviye +%10 savunma bonusu verir; mancınık ve koçbaşına karşı dayanır.',
    category: 'military',
    slot: 'wall',
    time: c(57_600, 11, 1.1, 3_240), // [wiki]
    cost: {
      wood: c(3_085, 3, 1.2, 1_120), // [wiki] L1=114 odun
      crystal: c(7_835, 6, 1.2, 1_364, 1), // [wiki]
    },
    maxLevel: 48,
    maxCount: 1,
    tint: 0xb0a894,
    size: 1,
  },

  // =========================================================================
  // YAPI ALANI BINALARI - standart
  // =========================================================================
  {
    id: 'academy',
    name: 'Akademi',
    description:
      'Bilim adamları burada çalışır ve araştırma puanı üretir. Her seviye daha fazla bilim adamı istihdam eder (seviye × 4).',
    category: 'science',
    slot: 'ground',
    time: c(1_440, 1, 1.2, 720), // [wiki] L1=1008 s
    cost: {
      wood: derived(1_440, 1, 1.2), // [turetim] L1=144 odun
      marble: c(600, 1, 1.2, 540, 4), // [turetim]
    },
    maxLevel: 40,
    maxCount: 1,
    tint: 0xc8b8d8,
    size: 2,
  },
  {
    id: 'barracks',
    name: 'Kışla',
    description: 'Kara birlikleri burada eğitilir. Seviyesi hangi birliklerin eğitilebileceğini ve eğitim hızını belirler.',
    category: 'military',
    slot: 'ground',
    time: c(25_200, 11, 1.1, 1_728), // [wiki] L1=792 s
    cost: {
      wood: c(6_800, 31, 1.24, 223), // [wiki] L1=49 odun
      crystal: c(850, 1, 1.24, 876, 8), // [wiki]
      sulfur: c(2_400, 11, 1.22, 1_600, 5), // [turetim]
    },
    maxLevel: 49,
    maxCount: 1,
    tint: 0xc07a5a,
    size: 2,
  },
  {
    id: 'warehouse',
    name: 'Depo',
    description:
      'Kaynakların depolanma tavanını yükseltir. Bir şehirde en fazla 5 depo kurulabilir. Tavanı aşan üretim kaybolur.',
    category: 'infrastructure',
    slot: 'ground',
    time: c(2_880, 1, 1.14, 2_160), // [wiki] L1=1123 s
    cost: {
      wood: c(1_600, 3, 1.2, 480), // [wiki] L1=160, L2=288
      crystal: c(480, 1, 1.2, 480, 3), // [wiki] L3=349
      marble: c(640, 1, 1.2, 576, 6), // [turetim]
    },
    maxLevel: 50,
    maxCount: 5,
    requiresResearch: 'conservation',
    tint: 0xa8926a,
    size: 2,
  },
  {
    id: 'museum',
    name: 'Müze',
    description:
      'Kültür malları sergilenir. Diğer şehirlerle kültür anlaşması yapınca mutluluk verir (mal başına +70).',
    category: 'culture',
    slot: 'ground',
    time: c(18_000, 1, 1.1, 14_040), // [wiki]
    cost: {
      wood: c(3_500, 3, 1.5, 1_190), // [wiki]
      crystal: c(21_875, 19, 1.52, 1_470), // [wiki]
      marble: c(2_400, 1, 1.3, 2_160, 2), // [turetim]
    },
    maxLevel: 40,
    maxCount: 1,
    requiresResearch: 'cultural_exchange',
    tint: 0xd8c090,
    size: 2,
  },
  {
    id: 'tavern',
    name: 'Meyhane',
    description:
      'Vatandaşlara şarap servis eder. Servis edilen her birim şarap +23.4 mutluluk verir; mutluluk nüfus artışını belirler.',
    category: 'culture',
    slot: 'ground',
    time: c(10_800, 1, 1.06, 10_440), // [wiki]
    cost: {
      wood: c(504, 1, 1.2, 504), // [wiki] L1=100 odun
      crystal: c(72, 1, 1.3, 0, 3), // [wiki]
      wine: c(360, 1, 1.25, 324, 2), // [turetim]
    },
    maxLevel: 45,
    maxCount: 1,
    requiresResearch: 'wine_culture',
    tint: 0xb06a78,
    size: 2,
  },
  {
    id: 'workshop',
    name: 'Atölye',
    description:
      'Birlikleri ve gemileri geliştirir: Bronz, Gümüş, Altın kademeleri. Her kademe hasarı ve zırhı artırır.',
    category: 'military',
    slot: 'ground',
    time: c(96_000, 7, 1.05, 11_880), // [wiki]
    cost: {
      wood: c(58_300, 57, 1.14, 946), // [wiki]
      crystal: c(11_300, 29, 1.16, 357), // [wiki]
      sulfur: c(24_000, 29, 1.2, 1_600, 4), // [turetim]
      marble: c(8_000, 29, 1.16, 700, 6), // [turetim]
    },
    maxLevel: 38,
    maxCount: 1,
    requiresResearch: 'invention',
    tint: 0x9a8a70,
    size: 2,
  },
  {
    id: 'palace',
    name: 'Saray',
    description:
      'Yalnızca başkentte kurulur. Her seviye bir yeni koloni hakkı verir. Kolonilerdeki Vali Konağı seviyesi düşükse yolsuzluk artar.',
    category: 'infrastructure',
    slot: 'ground',
    time: c(11_520, 1, 1.4, 0), // [wiki]
    cost: {
      wood: c(2_556, 1, 2, 4_400), // [wiki]
      crystal: c(1_556, 1, 2, 1_678, 1), // [wiki]
      marble: c(3_606, 1, 2, 4_123, 2), // [wiki]
      wine: c(2_200, 1, 2, 2_600, 2), // [turetim]
      sulfur: c(1_400, 1, 2, 1_600, 3), // [turetim]
    },
    maxLevel: 10,
    maxCount: 1,
    capitalOnly: true,
    requiresResearch: 'expansion',
    tint: 0xe0c878,
    size: 2,
  },
  {
    id: 'governors_residence',
    name: 'Vali Konağı',
    description:
      'Yalnızca kolonilerde kurulur. Koloni sayısıyla aynı seviyede olursa yolsuzluk sıfırlanır; değilse üretim ve mutluluk kırılır.',
    category: 'infrastructure',
    slot: 'ground',
    time: c(11_520, 1, 1.4, 0), // [wiki]
    cost: {
      wood: c(2_556, 1, 2, 4_400), // [wiki]
      crystal: c(1_556, 1, 2, 1_678, 1), // [wiki]
      marble: c(3_606, 1, 2, 4_123, 2), // [wiki]
      wine: c(2_200, 1, 2, 2_600, 2), // [turetim]
    },
    maxLevel: 10,
    maxCount: 1,
    colonyOnly: true,
    requiresResearch: 'expansion',
    tint: 0xd0b890,
    size: 2,
  },
  {
    id: 'embassy',
    name: 'Büyükelçilik',
    description: 'Diğer şehirlerle diplomasi yürütür. Seviyesi aynı anda sürdürülebilecek anlaşma sayısını artırır.',
    category: 'infrastructure',
    slot: 'ground',
    time: c(96_000, 7, 1.05, 10_080), // [wiki]
    cost: {
      wood: c(1_445, 2, 1.2, 625), // [wiki]
      crystal: c(42_600, 61, 1.22, 697), // [wiki]
      marble: c(3_000, 61, 1.2, 2_400, 4), // [turetim]
    },
    maxLevel: 32,
    maxCount: 1,
    requiresResearch: 'diplomacy',
    tint: 0xa8b8d0,
    size: 2,
  },
  {
    id: 'temple',
    name: 'Tapınak',
    description:
      'Adanın tanrısına bağış yapılır. Bağışlar ada inancını yükseltir; her 20 inanç harikanın bir seviyesini açar.',
    category: 'culture',
    slot: 'ground',
    time: c(2_160, 1, 1.1, 0), // [wiki]
    cost: {
      wood: derived(2_160, 1, 1.1), // [turetim]
      marble: c(1_200, 1, 1.15, 1_080, 2), // [turetim]
    },
    maxLevel: 36,
    maxCount: 1,
    requiresResearch: 'polytheism',
    tint: 0xe8dcc0,
    size: 2,
  },
  {
    id: 'hideout',
    name: 'Casus Yuvası',
    description: 'Casuslar burada eğitilir. Diğer şehirler hakkında bilgi toplar ve sabotaj düzenler.',
    category: 'military',
    slot: 'ground',
    time: c(96_000, 7, 1.05, 12_960), // [wiki]
    cost: {
      wood: c(16_100, 19, 1.14, 853), // [wiki]
      crystal: c(10_550, 29, 1.16, 293, 3), // [wiki]
      sulfur: c(6_000, 19, 1.2, 400, 6), // [turetim]
    },
    maxLevel: 32,
    maxCount: 1,
    requiresResearch: 'espionage',
    tint: 0x6a6a78,
    size: 1,
  },
  {
    id: 'dump',
    name: 'Toptancı',
    description:
      'Kaynakları altına çevirir. Oran piyasa fiyatından kötüdür ama anlıktır; depo tavanına takılan kaynak için cankurtarandır.',
    category: 'economy',
    slot: 'ground',
    time: c(32_000, 13, 1.17, 2_160), // [wiki]
    cost: {
      wood: c(6_400, 3, 1.2, 1_920), // [wiki]
      crystal: c(2_048, 1, 1.18, 1_920), // [wiki]
      marble: c(1_920, 1, 1.2, 1_920), // [wiki]
    },
    maxLevel: 40,
    maxCount: 5,
    requiresResearch: 'wealth',
    tint: 0xa8886a,
    size: 2,
  },
  {
    id: 'trading_post',
    name: 'Ticaret Karakolu',
    description: 'Ticaret anlaşmaları burada yapılır. Seviyesi diğer şehirlerle kurulabilecek anlaşma sayısını artırır.',
    category: 'economy',
    slot: 'ground',
    time: c(108_000, 11, 1.1, 9_360), // [wiki]
    cost: {
      wood: derived(108_000, 11, 1.1), // [turetim]
      marble: c(6_000, 11, 1.15, 5_000, 3), // [turetim]
    },
    maxLevel: 39,
    maxCount: 1,
    requiresResearch: 'wealth',
    tint: 0xb89a6a,
    size: 2,
  },
  {
    id: 'sea_chart_archive',
    name: 'Deniz Haritası Arşivi',
    description: 'Gemi bakım ücretlerini düşürür. Seviyesi donanmanın altın yükünü ciddi biçimde azaltır.',
    category: 'naval',
    slot: 'ground',
    time: c(1_472_465, 509, 1.12, 504.5), // [wiki]
    cost: {
      wood: derived(1_472_465, 509, 1.12), // [turetim]
      crystal: c(60_000, 509, 1.14, 40_000, 5), // [turetim]
    },
    maxLevel: 48,
    maxCount: 2,
    requiresResearch: 'sea_charts',
    tint: 0x7a9ab8,
    size: 2,
  },

  // =========================================================================
  // URETIM BINALARI - adadaki yatagin verimini artirir
  // =========================================================================
  {
    id: 'foresters_house',
    name: 'Ormancı Evi',
    description: 'Hızardaki odun üretimini artırır. Seviye başına +%2 odun; adadaki tüm şehirler faydalanır.',
    category: 'production',
    slot: 'ground',
    time: PRODUCTION_TIME, // [wiki]
    cost: {
      wood: c(6_000, 13, 1.3, 350), // [wiki]
      crystal: c(4_440, 13, 1.3, 340, 1), // [wiki]
    },
    maxLevel: 48,
    maxCount: 1,
    requiresResearch: 'improved_resource_gathering',
    produces: 'wood',
    tint: 0x6a9a5a,
    size: 1,
  },
  {
    id: 'stonemason',
    name: 'Taş Ustası',
    description: 'Taş Ocağındaki mermer üretimini artırır. Yalnızca mermer adasında işe yarar.',
    category: 'production',
    slot: 'ground',
    time: PRODUCTION_TIME, // [wiki]
    cost: { wood: PRODUCTION_WOOD, crystal: PRODUCTION_CRYSTAL }, // [wiki]
    maxLevel: 48,
    maxCount: 1,
    requiresResearch: 'improved_resource_gathering',
    produces: 'marble',
    tint: 0xc8c4b8,
    size: 1,
  },
  {
    id: 'winegrower',
    name: 'Bağcı',
    description: 'Bağdaki şarap üretimini artırır. Yalnızca şarap adasında işe yarar.',
    category: 'production',
    slot: 'ground',
    time: PRODUCTION_TIME, // [wiki]
    cost: { wood: PRODUCTION_WOOD, crystal: PRODUCTION_CRYSTAL }, // [wiki]
    maxLevel: 48,
    maxCount: 1,
    requiresResearch: 'improved_resource_gathering',
    produces: 'wine',
    tint: 0x9a4a5a,
    size: 1,
  },
  {
    id: 'alchemists_tower',
    name: 'Simyacı Kulesi',
    description: 'Kükürt Çukurundaki üretimi artırır. Yalnızca kükürt adasında işe yarar.',
    category: 'production',
    slot: 'ground',
    time: PRODUCTION_TIME, // [wiki]
    cost: { wood: PRODUCTION_WOOD, crystal: PRODUCTION_CRYSTAL }, // [wiki]
    maxLevel: 48,
    maxCount: 1,
    requiresResearch: 'improved_resource_gathering',
    produces: 'sulfur',
    tint: 0xc8b83a,
    size: 1,
  },
  {
    id: 'glassblower',
    name: 'Cam Ustası',
    description: 'Kristal Madenindeki üretimi artırır. Yalnızca kristal adasında işe yarar.',
    category: 'production',
    slot: 'ground',
    time: PRODUCTION_TIME, // [wiki]
    cost: { wood: PRODUCTION_WOOD, crystal: PRODUCTION_CRYSTAL }, // [wiki]
    maxLevel: 48,
    maxCount: 1,
    requiresResearch: 'improved_resource_gathering',
    produces: 'crystal',
    tint: 0x8ac8e0,
    size: 1,
  },

  // =========================================================================
  // INDIRIM BINALARI - insaat maliyetini dusurur
  // =========================================================================
  {
    id: 'carpenter',
    name: 'Marangoz',
    description: 'Odun maliyetini seviye başına %1 azaltır. Diğer indirim binaları ve araştırmalarla toplanır.',
    category: 'reduction',
    slot: 'ground',
    time: c(125_660, 37, 1.06, 2_808), // [wiki]
    cost: {
      wood: derived(125_660, 37, 1.06), // [turetim]
      crystal: c(355, 1, 1.2, 67, 7), // [wiki]
    },
    maxLevel: 32,
    maxCount: 1,
    requiresResearch: 'improved_resource_gathering',
    produces: 'wood',
    tint: 0x9a7a4a,
    size: 1,
  },
  {
    id: 'architects_office',
    name: 'Mimarlık Ofisi',
    description: 'Mermer maliyetini seviye başına %1 azaltır.',
    category: 'reduction',
    slot: 'ground',
    time: REDUCTION_TIME, // [wiki]
    cost: {
      wood: c(16_500, 29, 1.16, 475), // [wiki]
      crystal: derived(125_660, 37, 1.06, 1), // [turetim]
    },
    maxLevel: 32,
    maxCount: 1,
    requiresResearch: 'geometry',
    produces: 'marble',
    tint: 0xb8b0a0,
    size: 1,
  },
  {
    id: 'wine_press',
    name: 'Şarap Presi',
    description: 'Şarap maliyetini seviye başına %1 azaltır.',
    category: 'reduction',
    slot: 'ground',
    time: c(125_660, 37, 1.06, 2_232), // [wiki]
    cost: {
      wood: c(11_200, 23, 1.15, 221), // [wiki]
      crystal: c(11_750, 29, 1.16, 347), // [wiki]
    },
    maxLevel: 32,
    maxCount: 1,
    requiresResearch: 'wine_cellars',
    produces: 'wine',
    tint: 0x8a3a4a,
    size: 1,
  },
  {
    id: 'firework_test_area',
    name: 'Havai Fişek Test Alanı',
    description: 'Kükürt maliyetini seviye başına %1 azaltır.',
    category: 'reduction',
    slot: 'ground',
    time: REDUCTION_TIME, // [wiki]
    cost: {
      wood: c(10_680, 23, 1.15, 262), // [wiki]
      crystal: c(12_050, 29, 1.16, 347), // [wiki]
    },
    maxLevel: 32,
    maxCount: 1,
    requiresResearch: 'gunpowder',
    produces: 'sulfur',
    tint: 0xb89030,
    size: 1,
  },
  {
    id: 'optician',
    name: 'Optikçi',
    description: 'Kristal maliyetini seviye başına %1 azaltır.',
    category: 'reduction',
    slot: 'ground',
    time: c(125_660, 37, 1.06, 2_772), // [wiki]
    cost: {
      wood: c(10_850, 29, 1.16, 315), // [wiki]
      crystal: c(9_550, 29, 1.16, 347, 1), // [wiki]
    },
    maxLevel: 32,
    maxCount: 1,
    requiresResearch: 'optics',
    produces: 'crystal',
    tint: 0x7ab8d0,
    size: 1,
  },

  // =========================================================================
  // ADA BINALARI - adada kurulur, seviyeleri ORTAKTIR
  // =========================================================================
  {
    id: 'saw_mill',
    name: 'Hızar',
    description:
      'Adadaki odun yatağı. Seviyesi adadaki TÜM şehirler için ortaktır; yükseltme maliyeti paylaşılır.',
    category: 'island',
    slot: 'island',
    time: c(7_200, 1, 1.1, 7_200), // [wiki] L1=720 s
    cost: { wood: c(1_200, 1, 1.25, 1_000) }, // [turetim] L1=500 odun
    maxLevel: 60,
    maxCount: 1,
    tint: 0x7a5a3a,
    size: 2,
  },
  {
    id: 'quarry',
    name: 'Taş Ocağı',
    description: 'Adadaki mermer yatağı. Seviyesi adadaki tüm şehirler için ortaktır.',
    category: 'island',
    slot: 'island',
    time: c(14_400, 1, 1.1, 14_400), // [wiki]
    cost: { wood: c(1_800, 1, 1.25, 1_600) }, // [turetim]
    maxLevel: 60,
    maxCount: 1,
    produces: 'marble',
    tint: 0xc0bcb0,
    size: 2,
  },
  {
    id: 'vineyard',
    name: 'Bağ',
    description: 'Adadaki şarap yatağı. Seviyesi adadaki tüm şehirler için ortaktır.',
    category: 'island',
    slot: 'island',
    time: c(14_400, 1, 1.1, 14_400), // [wiki]
    cost: { wood: c(1_800, 1, 1.25, 1_600) }, // [turetim]
    maxLevel: 60,
    maxCount: 1,
    produces: 'wine',
    tint: 0x8a3a4a,
    size: 2,
  },
  {
    id: 'sulphur_pit',
    name: 'Kükürt Çukuru',
    description: 'Adadaki kükürt yatağı. Seviyesi adadaki tüm şehirler için ortaktır.',
    category: 'island',
    slot: 'island',
    time: c(14_400, 1, 1.1, 14_400), // [wiki]
    cost: { wood: c(1_800, 1, 1.25, 1_600) }, // [turetim]
    maxLevel: 60,
    maxCount: 1,
    produces: 'sulfur',
    tint: 0xb8a830,
    size: 2,
  },
  {
    id: 'crystal_mine',
    name: 'Kristal Madeni',
    description: 'Adadaki kristal yatağı. Seviyesi adadaki tüm şehirler için ortaktır.',
    category: 'island',
    slot: 'island',
    time: c(14_400, 1, 1.1, 14_400), // [wiki]
    cost: { wood: c(1_800, 1, 1.25, 1_600) }, // [turetim]
    maxLevel: 60,
    maxCount: 1,
    produces: 'crystal',
    tint: 0x78b8d0,
    size: 2,
  },
];

// =========================================================================
// ERISIM
// =========================================================================

const BY_ID = new Map<string, BuildingDefinition>(BUILDINGS.map((b) => [b.id, b]));

/** Bina tanimini dondurur; tanim yoksa undefined. */
export function getBuilding(id: string): BuildingDefinition | undefined {
  return BY_ID.get(id);
}

/** Bina tanimini dondurur; tanim yoksa hata firlatir (programci hatasi). */
export function requireBuilding(id: string): BuildingDefinition {
  const def = BY_ID.get(id);
  if (!def) throw new Error(`Bilinmeyen bina: ${id}`);
  return def;
}

/** Bina kimligi tanimli mi? */
export function isKnownBuildingId(id: string): boolean {
  return BY_ID.has(id);
}

/** Seviyeyi binanin azami seviyesine kirpilir. */
export function clampLevel(id: string, level: number): number {
  const def = BY_ID.get(id);
  const max = def?.maxLevel ?? 1;
  if (!Number.isFinite(level)) return 1;
  return Math.min(max, Math.max(1, Math.trunc(level)));
}

/** Kategoriye gore binalar (insa menusu sekmeleri). */
export function buildingsByCategory(category: BuildingDefinition['category']): BuildingDefinition[] {
  return BUILDINGS.filter((b) => b.category === category);
}

/** Yapi alanina kurulabilen binalar. */
export function groundBuildings(): BuildingDefinition[] {
  return BUILDINGS.filter((b) => b.slot === 'ground');
}

/** Ada binalari. */
export function islandBuildings(): BuildingDefinition[] {
  return BUILDINGS.filter((b) => b.slot === 'island');
}

/** Bir luks kaynagi isleyen ada binasinin kimligi. */
export function depositBuildingFor(resource: MaterialKey): string {
  switch (resource) {
    case 'wood':
      return 'saw_mill';
    case 'marble':
      return 'quarry';
    case 'wine':
      return 'vineyard';
    case 'sulfur':
      return 'sulphur_pit';
    case 'crystal':
      return 'crystal_mine';
  }
}

/** Uretim binasinin hangi kaynagi artirdigi (indirim binalari haric). */
export function isProductionBuilding(id: string): boolean {
  const def = BY_ID.get(id);
  return def?.category === 'production';
}

/** Indirim binasi mi? */
export function isReductionBuilding(id: string): boolean {
  const def = BY_ID.get(id);
  return def?.category === 'reduction';
}
