import type { BuildingDefinition, BuildingId, BuildingLevel } from '@/types';

/**
 * Bina katalogu: tum bina turlerinin statik tanimlari.
 *
 * Seviyeye gore degisen her sey levels[] icindedir. Seviye 1, sifirdan insa
 * maliyetini ve suresini tasir; sonraki seviyeler yukseltme maliyetini ve
 * suresini tasir.
 *
 * SPRINT 12 DENGE TEMELI
 * Sprint 11 denetimi dort yapisal sorun olctu ve burasi hepsinin cozuldugu
 * yerdir:
 *   1. Oduncu kampi odun istiyordu, yani odun bitince odun uretimi geri
 *      getirilemiyordu. Artik odun maliyeti YOK.
 *   2. Altinin tek gideri sehir merkezi Sv.2'ydi. Artik her yukseltmede
 *      altin var: Pazar -> altin -> yukseltme zinciri kuruldu.
 *   3. Tas ocagi en pahali kadroyu (4 isci) en dusuk uretim icin istiyordu
 *      ve hic kurulmuyordu. Kadro yariya indi.
 *   4. Yukseltme hicbir zaman yeni kopya kurmaktan iyi degildi. Maliyetler
 *      dusuruldu, Sv.2 uretimi artirildi; asil fark ise PLOT sistemiyle
 *      geldi - arsa artik sinirli.
 *
 * SPRINT 15 - SEVIYE 3
 * Ucuncu seviye, ikinciyi ureten egrinin AYNISINI bir basamak uzatir:
 *   malzeme  x1.7      altin x2.4      sure x2.2
 *   uretim   x1.85     nufus/depo x1.8 isci +1
 * Yeni bir kural yok; yalnizca mevcut ustel egrinin bir adim devami.
 * Seviye 3 maliyetleri bilerek TAS agirliklidir - tasin alicisi yoktu.
 */
const DEFINITIONS: BuildingDefinition[] = [
  {
    id: 'town_hall',
    name: 'Sehir Merkezi',
    description: 'Sehrin kalbi. Az miktarda altin ve depo alani saglar.',
    category: 'special',
    size: 2,
    maxCount: 1,
    allowedTerrain: ['grass', 'soil'],
    tint: 0xd8c79a,
    levels: [
      {
        level: 1,
        buildCost: { wood: 120, stone: 80 },
        buildTime: 30,
        production: { gold: 2 },
        populationCapacity: 4,
        storageCapacity: 150,
      },
      /*
       * SEHIR MERKEZI YUKSELTMESI ALTIN ISTEMEZ.
       *
       * Sprint 15'in 60 dakikalik olcumu Sprint 12'de odunda gorulen
       * tuzagin AYNISININ altinda tekrarladigini gosterdi: sehrin altin
       * kaynagi sehir merkeziydi ve buyumesi icin altin istiyordu. Gelir
       * dakikada 2'de sabit kaldigi icin oyuncu kendi gelir kaynagini
       * acmak icin yarim saat biriktirmek zorundaydi; 39 binalik aktif
       * sehir 60. dakikada 1 altinla kaldi.
       *
       * Cozum de Sprint 12'nin cozumuyle ayni: kaynagin kendisi o kaynagi
       * istemez. Yerine TAS konuldu - hem olcumun bol buldugu kaynak, hem
       * de aranan talep.
       */
      {
        level: 2,
        upgradeCost: { wood: 180, stone: 200 },
        upgradeTime: 90,
        production: { gold: 6 },
        populationCapacity: 8,
        storageCapacity: 300,
      },
      {
        level: 3,
        upgradeCost: { wood: 310, stone: 380 },
        upgradeTime: 200,
        production: { gold: 11 },
        populationCapacity: 14,
        storageCapacity: 540,
      },
    ],
  },
  {
    id: 'house',
    name: 'Ev',
    description: 'Isci barindirir. Uretim binalari icin nufus saglar.',
    category: 'housing',
    size: 1,
    allowedTerrain: ['grass', 'soil'],
    tint: 0xc98f5a,
    levels: [
      /*
       * EV TASA DAYANIR, ODUNA DEGIL.
       *
       * Sprint 15 olcumundeki "arastirmaci" senaryosu oyunun KILITLENEBILIR
       * oldugunu gosterdi: sehrin odunu 20'ye dustu, odun geliri sifirdi,
       * odun ureten tek bina (oduncu kampi) 3 isci istiyordu, sehirde bos
       * isci yoktu ve isci veren tek bina (ev) 40 ODUN istiyordu. Sehir 282
       * tas ve 177 altinla 60 dakika boyunca uc binada cakili kaldi.
       *
       * Kurtulus yolu, kurtardigi kaynaga bagli olamaz. Evin agirligi
       * tasa kaydirildi: tas her zaman uretilebilir (ocak odun ister ama
       * kamp istemez) ve bol. Boylece nufus - yani her seyin cikis yolu -
       * hicbir zaman tamamen kapanmaz.
       */
      {
        level: 1,
        buildCost: { wood: 20, stone: 30 },
        buildTime: 12,
        populationCapacity: 5,
      },
      {
        level: 2,
        upgradeCost: { wood: 40, stone: 45, gold: 10 },
        upgradeTime: 40,
        populationCapacity: 11,
      },
      {
        level: 3,
        upgradeCost: { wood: 70, stone: 80, gold: 25 },
        upgradeTime: 90,
        populationCapacity: 20,
      },
    ],
  },
  {
    id: 'farm',
    name: 'Ciftlik',
    description: 'Yiyecek uretir. Verimli topraga kurulmasi gerekir.',
    category: 'production',
    size: 1,
    allowedTerrain: ['soil', 'grass'],
    tint: 0x9fbf62,
    levels: [
      {
        level: 1,
        buildCost: { wood: 30 },
        buildTime: 15,
        production: { food: 6 },
        workerRequirement: 2,
      },
      {
        level: 2,
        upgradeCost: { wood: 45, stone: 20, gold: 10 },
        upgradeTime: 45,
        production: { food: 13 },
        workerRequirement: 3,
      },
      {
        level: 3,
        upgradeCost: { wood: 78, stone: 35, gold: 25 },
        upgradeTime: 100,
        production: { food: 24 },
        workerRequirement: 4,
      },
    ],
  },
  {
    id: 'lumber_camp',
    name: 'Oduncu Kampi',
    description: 'Odun uretir. Insaatin temel kaynagi.',
    category: 'production',
    size: 1,
    allowedTerrain: ['grass'],
    tint: 0x6f8f4a,
    levels: [
      {
        level: 1,
        /*
         * ODUN MALIYETI YOK - bilincli.
         *
         * Sprint 11'de olculdu: odun yedi binanin yedisinde de gerekliydi
         * ve odun ureten TEK bina da odun istiyordu. Oyuncu odununu
         * bitirince uretimi geri getiremiyordu; tek cikis bina yikmakti.
         * Tas maliyeti duruyor, yani kamp hala bedava degil.
         */
        buildCost: { stone: 15 },
        buildTime: 15,
        production: { wood: 5 },
        /*
         * Sv.1 kadrosu 3'ten 2'ye indi. Kamp, odun bittiginde sehrin TEK
         * cikis yoludur; o cikisin yalnizca sehir merkezinin verdigi
         * nufusla (4) calistirilabilmesi gerekir. Ucte kalsaydi kurtulus
         * yine baska bir binaya bagli olurdu.
         */
        workerRequirement: 2,
      },
      {
        level: 2,
        upgradeCost: { wood: 40, stone: 30, gold: 10 },
        upgradeTime: 45,
        production: { wood: 11 },
        workerRequirement: 4,
      },
      {
        level: 3,
        upgradeCost: { wood: 70, stone: 50, gold: 25 },
        upgradeTime: 100,
        production: { wood: 20 },
        workerRequirement: 5,
      },
    ],
  },
  {
    id: 'quarry',
    name: 'Tas Ocagi',
    description: 'Tas uretir. Sadece kayalik zemine kurulabilir.',
    category: 'production',
    size: 1,
    allowedTerrain: ['rock'],
    tint: 0x8d949c,
    levels: [
      {
        level: 1,
        buildCost: { wood: 50 },
        buildTime: 20,
        /*
         * KADRO 4'TEN 2'YE INDI.
         *
         * Sprint 11'de ocak uc senaryonun ucunde de hic kurulmadi: en
         * pahali kadroyu en dusuk uretim icin istiyordu. Uretim degeri
         * korundu, bedeli dusuruldu - tas artik erisilebilir bir kaynak.
         */
        production: { stone: 4 },
        workerRequirement: 2,
      },
      {
        level: 2,
        upgradeCost: { wood: 60, stone: 35, gold: 15 },
        upgradeTime: 60,
        production: { stone: 9 },
        workerRequirement: 3,
      },
      {
        level: 3,
        upgradeCost: { wood: 100, stone: 60, gold: 35 },
        upgradeTime: 130,
        production: { stone: 17 },
        workerRequirement: 4,
      },
    ],
  },
  {
    id: 'market',
    name: 'Pazar',
    description: 'Ticaretten altin kazandirir.',
    category: 'commerce',
    size: 1,
    allowedTerrain: ['grass', 'soil'],
    tint: 0xc06a5a,
    levels: [
      /*
       * PAZAR, SPRINT 12'DEKI TAS OCAGININ YERINDEYDI.
       *
       * 60 dakikalik olcum sunu gosterdi: pazar 3 isciye 4 altin
       * veriyordu, tas ocagi ise 2 isciye 4 tas. Yani oyunun EN KOTU
       * binasiydi ve makul bir oyuncu onu ancak elinde bosta isci
       * kalinca kuruyordu. Altinin tek olcekli kaynagi bu oldugu icin
       * sehrin altin geliri 93 nufusta bile dakikada 2'de kaliyordu.
       *
       * Sprint 12 ayni sorunu tas ocaginda kadroyu yariya indirerek
       * cozmustu; burada uretim yukseltildi ve Sv.1 kadrosu ocakla
       * esitlendi. Pazar artik altin icin gercek bir secim.
       */
      {
        level: 1,
        buildCost: { wood: 80, stone: 40 },
        buildTime: 25,
        production: { gold: 7 },
        workerRequirement: 2,
      },
      {
        level: 2,
        upgradeCost: { wood: 90, stone: 60, gold: 20 },
        upgradeTime: 70,
        production: { gold: 15 },
        workerRequirement: 3,
      },
      {
        level: 3,
        upgradeCost: { wood: 150, stone: 100, gold: 50 },
        upgradeTime: 150,
        production: { gold: 28 },
        workerRequirement: 4,
      },
    ],
  },
  {
    id: 'warehouse',
    name: 'Ambar',
    description: 'Tum kaynaklarin depo kapasitesini artirir.',
    category: 'commerce',
    size: 1,
    allowedTerrain: ['grass', 'soil', 'rock'],
    tint: 0x7d6b52,
    levels: [
      {
        level: 1,
        buildCost: { wood: 60, stone: 60 },
        buildTime: 20,
        storageCapacity: 350,
      },
      {
        level: 2,
        upgradeCost: { wood: 80, stone: 80, gold: 15 },
        upgradeTime: 55,
        storageCapacity: 800,
      },
      {
        level: 3,
        upgradeCost: { wood: 135, stone: 135, gold: 35 },
        upgradeTime: 120,
        storageCapacity: 1500,
      },
    ],
  },
  {
    id: 'temple',
    name: 'Tapinak',
    description: 'Sehrin aniti. Altin getirir ve sehre vatandas ceker.',
    category: 'special',
    size: 2,
    maxCount: 1,
    allowedTerrain: ['grass', 'soil'],
    tint: 0xe4d8bd,
    levels: [
      {
        level: 1,
        /*
         * Tapinak SEHRIN ANITIDIR: pahali, tek ve gec oyunda kurulur.
         *
         * Maliyeti bilerek sehir merkezinin uzerinde tutuldu; oyuncunun
         * onu kurabilmesi icin once uretimi ayakta olmali. Altin da ister,
         * yani Pazar zincirini tamamlamadan erisilemez.
         */
        buildCost: { wood: 90, stone: 170, gold: 50 },
        buildTime: 60,
        production: { gold: 5 },
        populationCapacity: 6,
        workerRequirement: 2,
      },
      {
        level: 2,
        upgradeCost: { wood: 120, stone: 240, gold: 140 },
        upgradeTime: 120,
        production: { gold: 9 },
        populationCapacity: 12,
        workerRequirement: 3,
      },
      {
        level: 3,
        upgradeCost: { wood: 200, stone: 400, gold: 340 },
        upgradeTime: 260,
        production: { gold: 16 },
        populationCapacity: 22,
        workerRequirement: 4,
      },
    ],
  },
  {
    id: 'harbor',
    name: 'Liman',
    description: 'Kiyiya kurulur. Balikcilik ve deniz ticareti getirir.',
    category: 'special',
    size: 1,
    maxCount: 2,
    allowedTerrain: ['grass', 'soil'],
    /*
     * Limanin yeri ZEMINLE degil, KOMSULUKLA belirlenir: kara karosunda
     * durur ama dort komsusundan biri su olmalidir. Bu, haritanin kiyi
     * seridine gercek bir deger kazandirir - eskiden su yalnizca dekordu.
     */
    requiresWaterAdjacent: true,
    tint: 0x9c7046,
    levels: [
      {
        level: 1,
        buildCost: { wood: 110, stone: 60 },
        buildTime: 35,
        production: { food: 6, gold: 2 },
        workerRequirement: 2,
      },
      {
        level: 2,
        upgradeCost: { wood: 150, stone: 90, gold: 45 },
        upgradeTime: 80,
        production: { food: 10, gold: 4 },
        workerRequirement: 3,
      },
      {
        level: 3,
        upgradeCost: { wood: 250, stone: 150, gold: 110 },
        upgradeTime: 175,
        production: { food: 18, gold: 7 },
        workerRequirement: 4,
      },
    ],
  },
  {
    id: 'academy',
    name: 'Akademi',
    description: 'Bilgi uretir. Arastirma yapabilmek icin gereklidir.',
    category: 'special',
    size: 1,
    maxCount: 1,
    allowedTerrain: ['grass', 'soil'],
    tint: 0xcfe0ef,
    levels: [
      {
        level: 1,
        /*
         * Akademi TAS agirlikli ve altin ister.
         *
         * Sprint 11'den beri tasin gercek bir alicisi yoktu (olculdu: uc
         * oyuncu profilinde de tas/dk 0 kaliyordu). Akademi ve seviye 3
         * yukseltmeleri tasin talebini birlikte yaratiyor.
         */
        /*
         * MALIYET, BIR DUVAR DEGIL BIR KARAR OLMALI.
         *
         * Ilk denemede Akademi wood 100 / stone 210 / gold 60 idi ve 60
         * dakikalik olcumde UC senaryonun ucunde de hic kurulamadi:
         * oyunun Sv.1'deki EN PAHALI binasiydi. Arastirmayi isteyen
         * oyuncu bile bir saatte ulasamiyorsa o katman oyunda yok demektir.
         *
         * Yeni degerler onu sehir merkezi hizasina ceker: ciddi bir
         * yatirim, ama orta oyunda erisilebilir. Agirlik yine TASTA -
         * tasin alicisi olmasi Sprint 15'in hedefiydi.
         */
        buildCost: { wood: 90, stone: 120, gold: 30 },
        buildTime: 45,
        production: { knowledge: 3 },
        workerRequirement: 2,
      },
      {
        level: 2,
        upgradeCost: { wood: 150, stone: 210, gold: 140 },
        upgradeTime: 100,
        production: { knowledge: 6 },
        workerRequirement: 3,
      },
      {
        level: 3,
        upgradeCost: { wood: 250, stone: 350, gold: 340 },
        upgradeTime: 220,
        production: { knowledge: 11 },
        workerRequirement: 4,
      },
    ],
  },
];

const BY_ID = new Map<BuildingId, BuildingDefinition>(DEFINITIONS.map((d) => [d.id, d]));

/** Katalogtaki tum bina tanimlari (menu sirasi ile). */
export function allBuildings(): readonly BuildingDefinition[] {
  return DEFINITIONS;
}

/**
 * Verilen kimlige ait bina tanimini dondurur.
 * Katalogda olmayan bir kimlik programlama hatasidir; hata firlatir.
 */
export function getBuilding(id: BuildingId): BuildingDefinition {
  const def = BY_ID.get(id);
  if (!def) {
    throw new Error(`Bilinmeyen bina kimligi: ${id}`);
  }
  return def;
}

/** Kimligin katalogda tanimli olup olmadigini kontrol eder. */
export function isKnownBuildingId(id: string): id is BuildingId {
  return BY_ID.has(id as BuildingId);
}

/**
 * Bir binanin verilen seviyedeki tanimini dondurur.
 * Seviye tabloda yoksa undefined doner; cagiran taraf sinirlamalidir.
 */
export function levelOf(def: BuildingDefinition, level: number): BuildingLevel | undefined {
  return def.levels.find((entry) => entry.level === level);
}

/** Katalogda tanimli en yuksek seviye. */
export function maxLevelOf(def: BuildingDefinition): number {
  return def.levels.reduce((max, entry) => Math.max(max, entry.level), 1);
}

/** Seviyeyi katalogun tanimli araligina sikistirir. */
export function clampLevel(def: BuildingDefinition, level: number): number {
  if (!Number.isFinite(level)) return 1;
  return Math.min(Math.max(1, Math.trunc(level)), maxLevelOf(def));
}
