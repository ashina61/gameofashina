import type { ResearchDefinition } from '@/types';

/**
 * Ikariam arastirma agaci.
 *
 * Dort dal: Deniz (Seafaring), Ekonomi (Economy), Bilim (Science), Askeri
 * (Military). Arastirmalar bilim adamlarinin urettigi ARASTIRMA PUANI (AP)
 * ile alinir; altinla degil. Ayni anda TEK arastirma yurur.
 *
 * KAYNAK GOSTERGESI
 *   [wiki]    - AP maliyeti Ikariam wiki'sinden aynen alindi
 *   [uretim]  - wiki'de bulunamadi; agacin komsu dugumlerinin egri
 *               buyumesiyle (yaklasik x2.5 / kademe) tutarli secildi
 *
 * Agac kurali: `requires` icindeki her kimlik bu listede TANIMLI olmali ve
 * kendi sutunu daha kucuk olmali. test/research.test.ts bu iki kurali
 * kilitler - dongu veya eksik on kosul derlemede degil oyunda patlar.
 */

/** Dallar icin gelecekte tekrarlanabilir arastirmalarin seviye maliyeti. */
const FUTURE_COST = 532_800;
const SCIENTIFIC_FUTURE_COST = 610_560;

export const RESEARCHES: ResearchDefinition[] = [
  // =========================================================================
  // DENIZ (Seafaring)
  // =========================================================================
  {
    id: 'carpentry',
    name: 'Marangozluk',
    description: 'Ticaret Limanı ve yük gemilerinin önünü açar.',
    branch: 'seafaring',
    cost: 12, // [wiki]
    maxLevel: 1,
    requires: [],
    requiredAcademyLevel: 1,
    effect: { unlocksUnits: ['transport_ship'] },
    column: 0,
    row: 0,
  },
  {
    id: 'draft',
    name: 'Su Çekimi',
    description: 'Yük gemileri daha hızlı yüklenir.',
    branch: 'seafaring',
    cost: 48, // [uretim]
    maxLevel: 1,
    requires: ['carpentry'],
    requiredAcademyLevel: 1,
    effect: { loadingSpeedMultiplier: 1.15 },
    column: 1,
    row: 0,
  },
  {
    id: 'deck_weapons',
    name: 'Güverte Silahları',
    description: 'Tersanede Ballista Gemisi inşasının önünü açar.',
    branch: 'seafaring',
    cost: 12, // [wiki]
    maxLevel: 1,
    requires: ['carpentry', 'dry_dock'],
    requiredAcademyLevel: 2,
    effect: { unlocksUnits: ['ballista_ship'] },
    column: 2,
    row: 0,
  },
  {
    id: 'expansion',
    name: 'Genişleme',
    description: 'Saray ve Vali Konağı inşasının önünü açar; yeni koloni kurabilirsin.',
    branch: 'seafaring',
    cost: 336, // [wiki]
    maxLevel: 1,
    requires: ['draft', 'wealth'],
    requiredAcademyLevel: 3,
    effect: { unlocksBuildings: ['palace', 'governors_residence'] },
    column: 4,
    row: 0,
  },
  {
    id: 'foreign_cultures',
    name: 'Yabancı Kültürler',
    description: 'Gemi hızı %5 artar.',
    branch: 'seafaring',
    cost: 900, // [uretim]
    maxLevel: 1,
    requires: ['draft'],
    requiredAcademyLevel: 4,
    effect: { shipSpeedMultiplier: 1.05 },
    column: 5,
    row: 0,
  },
  {
    id: 'pitch',
    name: 'Zift',
    description: 'Gemi bakım ücretleri %4 azalır.',
    branch: 'seafaring',
    cost: 2_236, // [wiki]
    maxLevel: 1,
    requires: ['foreign_cultures'],
    requiredAcademyLevel: 5,
    effect: { upkeepReduction: 0.04 },
    column: 6,
    row: 0,
  },
  {
    id: 'market',
    name: 'Pazar',
    description: 'Ticaret anlaşmalarının önünü açar.',
    branch: 'seafaring',
    cost: 3_264, // [wiki]
    maxLevel: 1,
    requires: ['pitch', 'improved_resource_gathering'],
    requiredAcademyLevel: 6,
    effect: { unlocksFeature: 'trade_treaty' },
    column: 7,
    row: 0,
  },
  {
    id: 'diplomacy',
    name: 'Diplomasi',
    description: 'Büyükelçilik inşasının önünü açar.',
    branch: 'seafaring',
    cost: 8_000, // [uretim]
    maxLevel: 1,
    requires: ['market'],
    requiredAcademyLevel: 8,
    effect: { unlocksBuildings: ['embassy'] },
    column: 8,
    row: 0,
  },
  {
    id: 'sea_charts',
    name: 'Deniz Haritaları',
    description: 'Gemi bakım ücretleri %8 azalır; Deniz Haritası Arşivi açılır.',
    branch: 'seafaring',
    cost: 25_632, // [wiki]
    maxLevel: 1,
    requires: ['diplomacy'],
    requiredAcademyLevel: 10,
    effect: {
      upkeepReduction: 0.08,
      unlocksBuildings: ['sea_chart_archive'],
    },
    column: 9,
    row: 0,
  },
  {
    id: 'counterweight',
    name: 'Karşı Ağırlık',
    description: 'Liman yükleme hızı %20 artar.',
    branch: 'seafaring',
    cost: 60_000, // [uretim]
    maxLevel: 1,
    requires: ['sea_charts'],
    requiredAcademyLevel: 12,
    effect: { loadingSpeedMultiplier: 1.2 },
    column: 10,
    row: 1,
  },
  {
    id: 'greek_fire',
    name: 'Rum Ateşi',
    description: 'Ateş Gemisi inşasının önünü açar.',
    branch: 'seafaring',
    cost: 40_000, // [uretim]
    maxLevel: 1,
    requires: ['polytheism', 'pitch'],
    requiredAcademyLevel: 10,
    effect: { unlocksUnits: ['fire_ship'] },
    column: 10,
    row: 0,
  },
  {
    id: 'offshore_base',
    name: 'Açık Deniz Üssü',
    description: 'Uzak adalarda üs kurmanın önünü açar. Tüm "Gelecek" araştırmalarının ön koşuludur.',
    branch: 'seafaring',
    cost: 120_000, // [uretim]
    maxLevel: 1,
    requires: ['sea_charts'],
    requiredAcademyLevel: 14,
    effect: { unlocksFeature: 'offshore_base' },
    column: 11,
    row: 0,
  },
  {
    id: 'seafaring_future',
    name: 'Denizcilik Geleceği',
    description: 'Seviye başına gemi bakım ücretleri %2 azalır.',
    branch: 'seafaring',
    cost: FUTURE_COST, // [wiki] seviye basina
    maxLevel: 43,
    requires: ['offshore_base', 'utopia', 'archimedean_principle', 'cannon_casting'],
    requiredAcademyLevel: 20,
    effect: { upkeepReduction: 0.02 },
    column: 12,
    row: 0,
  },

  // =========================================================================
  // EKONOMI (Economy)
  // =========================================================================
  {
    id: 'conservation',
    name: 'Koruma',
    description: 'Depo inşasının önünü açar.',
    branch: 'economy',
    cost: 12, // [wiki]
    maxLevel: 1,
    requires: [],
    requiredAcademyLevel: 1,
    effect: { unlocksBuildings: ['warehouse'] },
    column: 0,
    row: 1,
  },
  {
    id: 'pulley',
    name: 'Kasnak',
    description: 'İnşaat maliyetleri %2 azalır.',
    branch: 'economy',
    cost: 48, // [uretim]
    maxLevel: 1,
    requires: ['conservation'],
    requiredAcademyLevel: 1,
    effect: { buildCostReduction: 0.02 },
    column: 1,
    row: 1,
  },
  {
    id: 'wealth',
    name: 'Zenginlik',
    description:
      'Lüks kaynak üretiminin, Ticaret Karakolunun ve Toptancının önünü açar. Başlarken 130 lüks kaynak verir.',
    branch: 'economy',
    cost: 112, // [wiki]
    maxLevel: 1,
    requires: ['pulley'],
    requiredAcademyLevel: 2,
    effect: {
      unlocksBuildings: ['trading_post', 'dump'],
      unlocksFeature: 'luxury',
    },
    column: 2,
    row: 1,
  },
  {
    id: 'wine_culture',
    name: 'Şarap Kültürü',
    description: 'Meyhane inşasının önünü açar.',
    branch: 'economy',
    cost: 336, // [wiki]
    maxLevel: 1,
    requires: ['wealth', 'well_digging'],
    requiredAcademyLevel: 3,
    effect: { unlocksBuildings: ['tavern'] },
    column: 3,
    row: 1,
  },
  {
    id: 'improved_resource_gathering',
    name: 'Gelişmiş Kaynak Toplama',
    description: 'Üretim binalarının (Ormancı Evi, Taş Ustası, Bağcı, Simyacı Kulesi, Cam Ustası) önünü açar.',
    branch: 'economy',
    cost: 1_204, // [wiki]
    maxLevel: 1,
    requires: ['wine_culture', 'expansion'],
    requiredAcademyLevel: 4,
    effect: {
      unlocksBuildings: [
        'foresters_house',
        'stonemason',
        'winegrower',
        'alchemists_tower',
        'glassblower',
      ],
    },
    column: 5,
    row: 1,
  },
  {
    id: 'geometry',
    name: 'Geometri',
    description: 'İnşaat maliyetleri %4 azalır.',
    branch: 'economy',
    cost: 2_236, // [wiki]
    maxLevel: 1,
    requires: ['improved_resource_gathering'],
    requiredAcademyLevel: 5,
    effect: { buildCostReduction: 0.04 },
    column: 6,
    row: 1,
  },
  {
    id: 'holiday',
    name: 'Tatil',
    description: 'Tüm şehirlerde +25 mutluluk ve +50 maksimum nüfus.',
    branch: 'economy',
    cost: 7_200, // [wiki]
    maxLevel: 1,
    requires: ['geometry'],
    requiredAcademyLevel: 7,
    effect: { happinessFlat: 25, populationFlat: 50 },
    column: 7,
    row: 1,
  },
  {
    id: 'law',
    name: 'Yasa',
    description: 'Şehir düzenini kurar; Yardımcı Eller ve Mutfak Uzmanlıklarının önünü açar.',
    branch: 'economy',
    cost: 4_000, // [uretim]
    maxLevel: 1,
    requires: ['holiday'],
    requiredAcademyLevel: 6,
    effect: { unlocksFeature: 'law' },
    column: 7,
    row: 2,
  },
  {
    id: 'helping_hands',
    name: 'Yardımcı Eller',
    description:
      'Yatagın kapasitesi üstünde işçi çalıştırılabilir; her 4 fazla işçi saatte +1 odun verir.',
    branch: 'economy',
    cost: 20_000, // [uretim]
    maxLevel: 1,
    requires: ['law'],
    requiredAcademyLevel: 9,
    effect: { unlocksFeature: 'helping_hands' },
    column: 8,
    row: 2,
  },
  {
    id: 'culinary_specialities',
    name: 'Mutfak Uzmanlıkları',
    description: 'Kışlada Aşçı eğitiminin önünü açar.',
    branch: 'economy',
    cost: 10_764, // [wiki]
    maxLevel: 1,
    requires: ['law', 'market'],
    requiredAcademyLevel: 8,
    effect: { unlocksUnits: ['cook'] },
    column: 9,
    row: 2,
  },
  {
    id: 'soldier_exchange',
    name: 'Asker Değişimi',
    description: 'Bürokrasinin önünü açar.',
    branch: 'economy',
    cost: 40_000, // [uretim]
    maxLevel: 1,
    requires: ['helping_hands'],
    requiredAcademyLevel: 10,
    effect: { unlocksFeature: 'soldier_exchange' },
    column: 10,
    row: 2,
  },
  {
    id: 'spirit_level',
    name: 'Su Terazisi',
    description: 'İnşaat maliyetleri %8 azalır.',
    branch: 'economy',
    cost: 25_632, // [wiki]
    maxLevel: 1,
    requires: ['geometry'],
    requiredAcademyLevel: 8,
    effect: { buildCostReduction: 0.08 },
    column: 9,
    row: 3,
  },
  {
    id: 'wine_cellars',
    name: 'Şarap Mahzenleri',
    description: 'Şarap Presi inşasının önünü açar.',
    branch: 'economy',
    cost: 48_000, // [wiki]
    maxLevel: 1,
    requires: ['spirit_level'],
    requiredAcademyLevel: 10,
    effect: { unlocksBuildings: ['wine_press'] },
    column: 10,
    row: 3,
  },
  {
    id: 'bureaucracy',
    name: 'Bürokrasi',
    description: 'Her şehirde bir ek yapı alanı açılır.',
    branch: 'economy',
    cost: 106_560, // [wiki]
    maxLevel: 1,
    requires: ['soldier_exchange'],
    requiredAcademyLevel: 12,
    effect: { extraGround: 1 },
    column: 11,
    row: 2,
  },
  {
    id: 'utopia',
    name: 'Ütopya',
    description: 'Yalnızca başkentte +200 mutluluk ve +200 maksimum nüfus.',
    branch: 'economy',
    cost: 241_200, // [wiki]
    maxLevel: 1,
    requires: ['bureaucracy'],
    requiredAcademyLevel: 16,
    effect: { happinessFlat: 200, populationFlat: 200 },
    column: 12,
    row: 2,
  },
  {
    id: 'economic_future',
    name: 'Ekonomik Gelecek',
    description: 'Seviye başına tüm şehirlerde +10 mutluluk.',
    branch: 'economy',
    cost: FUTURE_COST, // [wiki] seviye basina
    maxLevel: 25,
    requires: ['offshore_base', 'utopia', 'archimedean_principle', 'cannon_casting'],
    requiredAcademyLevel: 20,
    effect: { happinessFlat: 10 },
    column: 13,
    row: 2,
  },

  // =========================================================================
  // BILIM (Science)
  // =========================================================================
  {
    id: 'well_digging',
    name: 'Kuyu Kazma',
    description: 'Yalnızca başkentte +50 mutluluk ve +50 maksimum nüfus.',
    branch: 'science',
    cost: 60, // [uretim]
    maxLevel: 1,
    requires: [],
    requiredAcademyLevel: 1,
    effect: { happinessFlat: 50, populationFlat: 50 },
    column: 0,
    row: 2,
  },
  {
    id: 'espionage',
    name: 'Casusluk',
    description: 'Casus Yuvası inşasının önünü açar.',
    branch: 'science',
    cost: 200, // [uretim]
    maxLevel: 1,
    requires: ['well_digging'],
    requiredAcademyLevel: 2,
    effect: { unlocksBuildings: ['hideout'] },
    column: 1,
    row: 3,
  },
  {
    id: 'ink',
    name: 'Mürekkep',
    description: 'Hükümet Kuruluşunun önünü açar.',
    branch: 'science',
    cost: 800, // [uretim]
    maxLevel: 1,
    requires: ['espionage'],
    requiredAcademyLevel: 3,
    effect: { unlocksFeature: 'ink' },
    column: 2,
    row: 3,
  },
  {
    id: 'government_formation',
    name: 'Hükümet Kuruluşu',
    description: 'Hükümet biçimini değiştirmenin ve Atölyenin önünü açar.',
    branch: 'science',
    cost: 2_836, // [wiki]
    maxLevel: 1,
    requires: ['ink'],
    requiredAcademyLevel: 4,
    effect: { unlocksFeature: 'government' },
    column: 3,
    row: 3,
  },
  {
    id: 'cultural_exchange',
    name: 'Kültür Değişimi',
    description: 'Müze inşasının ve kültür anlaşmalarının önünü açar.',
    branch: 'science',
    cost: 3_000, // [uretim]
    maxLevel: 1,
    requires: ['government_formation'],
    requiredAcademyLevel: 5,
    effect: { unlocksBuildings: ['museum'] },
    column: 4,
    row: 4,
  },
  {
    id: 'invention',
    name: 'İcat',
    description: 'Atölye inşasının önünü açar; birlik ve gemiler geliştirilebilir.',
    branch: 'science',
    cost: 4_320, // [wiki]
    maxLevel: 1,
    requires: ['government_formation', 'improved_resource_gathering'],
    requiredAcademyLevel: 5,
    effect: { unlocksBuildings: ['workshop'], unlocksFeature: 'unit_upgrade' },
    column: 4,
    row: 3,
  },
  {
    id: 'polytheism',
    name: 'Çoktanrıcılık',
    description: 'Tapınak inşasının önünü açar; adanın tanrısına bağış yapabilirsin.',
    branch: 'science',
    cost: 1_428, // [wiki]
    maxLevel: 1,
    requires: ['espionage', 'expansion', 'professional_army'],
    requiredAcademyLevel: 5,
    effect: { unlocksBuildings: ['temple'] },
    column: 5,
    row: 5,
  },
  {
    id: 'optics',
    name: 'Optik',
    description: 'Optikçi inşasının önünü açar.',
    branch: 'science',
    cost: 9_000, // [uretim]
    maxLevel: 1,
    requires: ['invention'],
    requiredAcademyLevel: 7,
    effect: { unlocksBuildings: ['optician'] },
    column: 6,
    row: 3,
  },
  {
    id: 'experiments',
    name: 'Deneyler',
    description: 'Kristal araştırma puanına çevrilebilir.',
    branch: 'science',
    cost: 21_360, // [wiki]
    maxLevel: 1,
    requires: ['optics'],
    requiredAcademyLevel: 8,
    effect: { unlocksFeature: 'crystal_to_rp' },
    column: 7,
    row: 3,
  },
  {
    id: 'archiving',
    name: 'Arşivleme',
    description: 'Bilim adamı başına araştırma puanı %5 artar.',
    branch: 'science',
    cost: 50_000, // [uretim]
    maxLevel: 1,
    requires: ['experiments'],
    requiredAcademyLevel: 10,
    effect: { researchMultiplier: 0.05 },
    column: 8,
    row: 4,
  },
  {
    id: 'letter_chute',
    name: 'Mektup Oluğu',
    description: 'Bilim adamı başına altın gideri 3 azalır ve araştırma hızı %5 artar.',
    branch: 'science',
    cost: 144_720, // [wiki]
    maxLevel: 1,
    requires: ['archiving', 'counterweight', 'helping_hands', 'pyrotechnics'],
    requiredAcademyLevel: 12,
    effect: { researchMultiplier: 0.05, upkeepReduction: 0.02 },
    column: 11,
    row: 4,
  },
  {
    id: 'paper',
    name: 'Kâğıt',
    description: 'Bilim adamı başına araştırma puanı %8 artar.',
    branch: 'science',
    cost: 200_000, // [uretim]
    maxLevel: 1,
    requires: ['archiving'],
    requiredAcademyLevel: 13,
    effect: { researchMultiplier: 0.08 },
    column: 10,
    row: 5,
  },
  {
    id: 'archimedean_principle',
    name: 'Arşimet Prensibi',
    description: 'Buhar Devi ve Havan gibi ağır makinelerin önünü açar.',
    branch: 'science',
    cost: 300_000, // [uretim]
    maxLevel: 1,
    requires: ['paper'],
    requiredAcademyLevel: 16,
    effect: { unlocksFeature: 'archimedean' },
    column: 11,
    row: 5,
  },
  {
    id: 'scientific_future',
    name: 'Bilimsel Gelecek',
    description: 'Seviye başına bilim adamı başına araştırma puanı %2 artar.',
    branch: 'science',
    cost: SCIENTIFIC_FUTURE_COST, // [wiki] seviye basina
    maxLevel: 32,
    requires: ['offshore_base', 'utopia', 'archimedean_principle', 'cannon_casting'],
    requiredAcademyLevel: 20,
    effect: { researchMultiplier: 0.02 },
    column: 13,
    row: 4,
  },

  // =========================================================================
  // ASKERI (Military)
  // =========================================================================
  {
    id: 'dry_dock',
    name: 'Kuru Havuz',
    description: 'Tersane inşasının önünü açar.',
    branch: 'military',
    cost: 8, // [uretim]
    maxLevel: 1,
    requires: [],
    requiredAcademyLevel: 1,
    effect: { unlocksBuildings: ['shipyard'] },
    column: 0,
    row: 3,
  },
  {
    id: 'maps',
    name: 'Haritalar',
    description: 'Askeri bakım ücretleri %2 azalır.',
    branch: 'military',
    cost: 24, // [wiki]
    maxLevel: 1,
    requires: ['dry_dock'],
    requiredAcademyLevel: 1,
    effect: { upkeepReduction: 0.02 },
    column: 1,
    row: 4,
  },
  {
    id: 'professional_army',
    name: 'Profesyonel Ordu',
    description: 'Sapancı eğitiminin önünü açar.',
    branch: 'military',
    cost: 100, // [uretim]
    maxLevel: 1,
    requires: ['maps'],
    requiredAcademyLevel: 2,
    effect: { unlocksUnits: ['slinger'] },
    column: 2,
    row: 4,
  },
  {
    id: 'phalanx',
    name: 'Falanks',
    description: 'Hoplite eğitiminin önünü açar; ağır piyade hattı kurulur.',
    branch: 'military',
    cost: 400, // [uretim]
    maxLevel: 1,
    requires: ['professional_army'],
    requiredAcademyLevel: 3,
    effect: { unlocksUnits: ['hoplite'] },
    column: 3,
    row: 4,
  },
  {
    id: 'swordsmanship',
    name: 'Kılıç Ustalığı',
    description: 'Mızraklı ve Kılıçlı eğitiminin önünü açar; kanat birlikleri.',
    branch: 'military',
    cost: 900, // [uretim]
    maxLevel: 1,
    requires: ['phalanx'],
    requiredAcademyLevel: 4,
    effect: { unlocksUnits: ['spearman', 'swordsman'] },
    column: 4,
    row: 6,
  },
  {
    id: 'archery',
    name: 'Okçuluk',
    description: 'Okçu eğitiminin önünü açar.',
    branch: 'military',
    cost: 1_500, // [uretim]
    maxLevel: 1,
    requires: ['swordsmanship'],
    requiredAcademyLevel: 5,
    effect: { unlocksUnits: ['archer'] },
    column: 5,
    row: 6,
  },
  {
    id: 'siege_engines',
    name: 'Kuşatma Makineleri',
    description: 'Mancınık ve Koçbaşı eğitiminin önünü açar.',
    branch: 'military',
    cost: 3_000, // [uretim]
    maxLevel: 1,
    requires: ['archery'],
    requiredAcademyLevel: 6,
    effect: { unlocksUnits: ['catapult', 'battering_ram'] },
    column: 6,
    row: 6,
  },
  {
    id: 'gunpowder',
    name: 'Barut',
    description: 'Kükürt Karabiniyercisi ve Havai Fişek Test Alanının önünü açar.',
    branch: 'military',
    cost: 8_000, // [uretim]
    maxLevel: 1,
    requires: ['siege_engines'],
    requiredAcademyLevel: 8,
    effect: {
      unlocksUnits: ['sulphur_carabineer'],
      unlocksBuildings: ['firework_test_area'],
    },
    column: 7,
    row: 6,
  },
  {
    id: 'pyrotechnics',
    name: 'Piroteknik',
    description: 'Havan eğitiminin önünü açar.',
    branch: 'military',
    cost: 15_000, // [uretim]
    maxLevel: 1,
    requires: ['gunpowder'],
    requiredAcademyLevel: 9,
    effect: { unlocksUnits: ['mortar'] },
    column: 8,
    row: 6,
  },
  {
    id: 'naval_artillery',
    name: 'Deniz Topçusu',
    description: 'Mancınık Gemisi ve Havan Gemisi inşasının önünü açar.',
    branch: 'military',
    cost: 20_000, // [uretim]
    maxLevel: 1,
    requires: ['gunpowder'],
    requiredAcademyLevel: 10,
    effect: { unlocksUnits: ['catapult_ship', 'mortar_ship'] },
    column: 9,
    row: 7,
  },
  {
    id: 'cannon_casting',
    name: 'Top Dökümü',
    description: 'Ram Gemisi geliştirmesi ve tüm "Gelecek" araştırmalarının önünü açar.',
    branch: 'military',
    cost: 60_000, // [uretim]
    maxLevel: 1,
    requires: ['pyrotechnics'],
    requiredAcademyLevel: 11,
    effect: { unlocksUnits: ['ram_ship', 'paddle_wheel_ram'] },
    column: 10,
    row: 6,
  },
  {
    id: 'robotics',
    name: 'Robotik',
    description: 'Buhar Devi eğitiminin önünü açar.',
    branch: 'military',
    cost: 150_000, // [uretim]
    maxLevel: 1,
    requires: ['cannon_casting', 'archimedean_principle'],
    requiredAcademyLevel: 14,
    effect: { unlocksUnits: ['steam_giant'] },
    column: 12,
    row: 6,
  },
  {
    id: 'submarine_tech',
    name: 'Denizaltı Teknolojisi',
    description: 'Dalış Gemisi inşasının önünü açar.',
    branch: 'military',
    cost: 250_000, // [uretim]
    maxLevel: 1,
    requires: ['naval_artillery'],
    requiredAcademyLevel: 15,
    effect: { unlocksUnits: ['diving_boat'] },
    column: 12,
    row: 7,
  },
  {
    id: 'aviation',
    name: 'Havacılık',
    description: 'Gyrocopter ve Balon Bombardımanının önünü açar.',
    branch: 'military',
    cost: 400_000, // [uretim]
    maxLevel: 1,
    requires: ['robotics'],
    requiredAcademyLevel: 18,
    effect: { unlocksUnits: ['gyrocopter', 'bombardier'] },
    column: 13,
    row: 6,
  },
  {
    id: 'militaristic_future',
    name: 'Askeri Gelecek',
    description: 'Seviye başına asker bakım ücretleri %2 azalır.',
    branch: 'military',
    cost: FUTURE_COST, // [wiki] seviye basina
    maxLevel: 25,
    requires: ['offshore_base', 'utopia', 'archimedean_principle', 'cannon_casting'],
    requiredAcademyLevel: 20,
    effect: { upkeepReduction: 0.02 },
    column: 14,
    row: 6,
  },

  // =========================================================================
  // DESTEK BIRLIKLERI
  // =========================================================================
  {
    id: 'medicine',
    name: 'Tıp',
    description: 'Doktor eğitiminin önünü açar; yaralı birlikleri iyileştirir.',
    branch: 'military',
    cost: 5_000, // [uretim]
    maxLevel: 1,
    requires: ['phalanx'],
    requiredAcademyLevel: 6,
    effect: { unlocksUnits: ['doctor'] },
    column: 6,
    row: 7,
  },
  {
    id: 'spartan_training',
    name: 'Sparta Eğitimi',
    description: 'Spartalı eğitiminin önünü açar; en güçlü ağır piyade.',
    branch: 'military',
    cost: 90_000, // [uretim]
    maxLevel: 1,
    requires: ['robotics'],
    requiredAcademyLevel: 15,
    effect: { unlocksUnits: ['spartan'] },
    column: 13,
    row: 7,
  },
];

// =========================================================================
// ERISIM
// =========================================================================

const BY_ID = new Map<string, ResearchDefinition>(RESEARCHES.map((r) => [r.id, r]));

/** Arastirma tanimini dondurur. */
export function getResearch(id: string): ResearchDefinition | undefined {
  return BY_ID.get(id);
}

/** Arastirma tanimini dondurur; yoksa hata firlatir. */
export function requireResearch(id: string): ResearchDefinition {
  const def = BY_ID.get(id);
  if (!def) throw new Error(`Bilinmeyen arastirma: ${id}`);
  return def;
}

/** Arastirma kimligi tanimli mi? */
export function isKnownResearchId(id: string): boolean {
  return BY_ID.has(id);
}

/** Dala gore arastirmalar, sutun sirasiyla. */
export function researchesByBranch(branch: ResearchDefinition['branch']): ResearchDefinition[] {
  return RESEARCHES.filter((r) => r.branch === branch).sort(
    (a, b) => a.column - b.column || a.row - b.row,
  );
}

/**
 * Oyuncunun oyunun basinda HAZIR sahip oldugu arastirmalar.
 *
 * Ikariam'in ogreticisi oyuncuyu bu dort arastirmayla baslatir: Depo,
 * Ticaret Limani, Tersane ve Kuyu. Bunlar olmadan oyun "hicbir sey
 * kurulamiyor" durumuna duser, cunku ilk arastirma puani Akademi ister,
 * Akademi icin de oyuncunun ekonomiyi gormesi gerekir.
 */
export const STARTING_RESEARCHES: string[] = ['conservation', 'carpentry', 'dry_dock', 'well_digging'];

/** Agacin en buyuk sutun numarasi (arayuz genisligi icin). */
export const MAX_RESEARCH_COLUMN = RESEARCHES.reduce((max, r) => Math.max(max, r.column), 0);
