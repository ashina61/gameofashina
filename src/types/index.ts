/**
 * Oyun genelinde paylasilan tip tanimlari (Ikariam veri modeli).
 *
 * Bu dosya sadece tip icerir; calisma zamani kodu barindirmaz. Sistemler
 * ve sahneler yalnizca buradaki sozlesme uzerinden konusur.
 */

// =========================================================================
// KOORDINATLAR
// =========================================================================

/** Izometrik izgara koordinati. */
export interface GridPoint {
  gx: number;
  gy: number;
}

/** Ekran (dunya) koordinati. */
export interface WorldPoint {
  x: number;
  y: number;
}

// =========================================================================
// KAYNAKLAR
// =========================================================================

/**
 * Luks kaynaklar.
 *
 * Ikariam'da her ADADA yalnizca BIR luks kaynak bulunur; digerlerini
 * ticaretle veya savasla almak zorundasin. Bu kisit oyunun ekonomisinin
 * temelidir ve `IslandState.luxury` ile tasinar.
 */
export type LuxuryKind = 'marble' | 'wine' | 'sulfur' | 'crystal';

/** Depolanabilen maddesel kaynaklar (depo tavanina tabidir). */
export type MaterialKey = 'wood' | LuxuryKind;

/**
 * Tum harcanabilir kaynaklar.
 *
 * Altin depolanmaz ve tavana tabi DEGILDIR: Ikariam'da depo yalnizca odun
 * ve luks kaynaklari sinirlar (Valilik 2500 + Depo binalari). Altin
 * ayri bir siniftir cunku uretimi nufustan, gideri ise asker/bilim
 * adamindan gelir - yani bir "stok" degil bir "akis"tir.
 */
export type ResourceKey = MaterialKey | 'gold';

/** Kaynak miktarlarinin kismi haritasi (maliyet, uretim vb.). */
export type ResourceAmounts = Partial<Record<ResourceKey, number>>;

/** Maddesel kaynaklarin kismi haritasi (depo tavanina tabi olanlar). */
export type MaterialAmounts = Partial<Record<MaterialKey, number>>;

/**
 * Tum maddesel kaynaklarin zorunlu haritasi.
 *
 * SEHIR DEPOSU bu tipi tasir. Ikariam'da maddesel kaynaklar sehir basina
 * depolanir; altin ise oyuncu genelinde tek havuzdur ve depo tavanina
 * tabi DEGILDIR. Bu yuzden iki ayri havuz tipi vardir.
 */
export type MaterialPool = Record<MaterialKey, number>;

/** Tum kaynaklarin zorunlu haritasi (madde + altin). */
export type ResourcePool = Record<ResourceKey, number>;

/**
 * Arastirma puani (AP).
 *
 * Ayri bir kaynak sinifi DEGILDIR: depo tavani yoktur, ticareti yoktur ve
 * yalnizca bilim adamlari uretir. Kaynak havuzuna sokmak "depo tavani her
 * kaynak icin gecerlidir" kuralini bozardi; bu yuzden kendi sayacini tasir.
 */
export type ResearchPoints = number;

// =========================================================================
// VATANDASLAR
// =========================================================================

/**
 * Vatandas rolu.
 *
 * Ikariam'da bir vatandas ayni anda TEK bir iste olabilir. Rollerin
 * ekonomi karsiligi:
 *
 *   idle      +3 altin/saat (bos duran vatandas para kazanir)
 *   wood      +1 odun/saat, 0 altin
 *   luxury    +1 luks kaynak/saat, 0 altin
 *   scientist +1 arastirma puani/saat, -9 altin/saat
 *               (-3 firsat maliyeti, -6 bilim adami ucreti)
 *
 * Askerler vatandas DEGILDIR: Ikariam'da birlikler kaynak + saatlik altin
 * bakim ucretiyle egitilir, nufustan dusmez. Bu yuzden 'soldier' rolu yok.
 */
export type CitizenRole = 'idle' | 'wood' | 'luxury' | 'scientist';

/** Sehrin vatandas dagilimi. Toplami nufusa esittir. */
export type CitizenAssignment = Record<CitizenRole, number>;

// =========================================================================
// ARASTIRMA
// =========================================================================

/** Ikariam'in dort arastirma dali. */
export type ResearchBranch = 'seafaring' | 'economy' | 'science' | 'military';

/** Arastirma kimligi (serbest dizgi: katalog tek kaynaktir). */
export type ResearchId = string;

/**
 * Bir arastirmanin oyuna etkisi.
 *
 * TEK MEKANIK ILKESI: arastirma yeni bir kural getirmez, var olan
 * sayilari olcekler veya bir binayi/birligi ACAR. Boylece etki her yerde
 * ayni yoldan uygulanir ve arayuz daima dogru sayiyi gosterir.
 */
export interface ResearchEffect {
  /** Insa maliyetlerini azaltan oran (0.04 = -%4). Toplanarak uygulanir. */
  buildCostReduction?: number;
  /** Gemi/birlik altin bakim ucretini azaltan oran. */
  upkeepReduction?: number;
  /** Bilim adami basina ek arastirma puani orani. */
  researchMultiplier?: number;
  /** Sehir basina sabit mutluluk ekler. */
  happinessFlat?: number;
  /** Maks nufusa sabit ek. */
  populationFlat?: number;
  /** Odun veya luks kaynak uretimine carpan (1.1 = +%10). */
  productionMultiplier?: Partial<Record<MaterialKey, number>>;
  /** Ticaret limani yukleme hizina carpan. */
  loadingSpeedMultiplier?: number;
  /** Gemi yolculuk suresini kisaltan oran. */
  shipSpeedMultiplier?: number;
  /** Her seviyede ek yapi alani acar. */
  extraGround?: number;
  /** Kilidini actigi bina kimlikleri. */
  unlocksBuildings?: string[];
  /** Kilidini actigi birlik/gemi kimlikleri. */
  unlocksUnits?: string[];
  /** Kilidini actigi harika/mekanik. */
  unlocksFeature?: string;
}

/** Arastirma tanimi (statik veri). */
export interface ResearchDefinition {
  id: ResearchId;
  name: string;
  description: string;
  branch: ResearchBranch;
  /** Arastirma puani maliyeti. Seviyeli arastirmalarda seviye basina. */
  cost: number;
  /** Azami seviye (tek seferlik arastirmalarda 1). */
  maxLevel: number;
  /** Baslayabilmek icin tamamlanmis olmasi gereken arastirmalar. */
  requires: ResearchId[];
  /** Gereken minimum Akademi seviyesi. */
  requiredAcademyLevel: number;
  effect: ResearchEffect;
  /** Arayuzdeki agac ciziminde kullanilan sutun. */
  column: number;
  row: number;
}

/** Tamamlanmis arastirma kaydi. */
export interface CompletedResearch {
  id: ResearchId;
  level: number;
  completedAtTick: number;
}

/** Devam eden arastirma. Ikariam'da ayni anda TEK arastirma yurur. */
export interface ActiveResearch {
  id: ResearchId;
  /** Bu arastirmanin hangi seviyesi calisiliyor. */
  level: number;
  /** Toplam gereken arastirma puani. */
  totalPoints: number;
  /** Birikmis arastirma puani. */
  progress: number;
  startedAtTick: number;
}

// =========================================================================
// BINALAR
// =========================================================================

/**
 * Binanin Ikariam sinifi.
 *
 * town     - sehir icindeki sabit olmayan standart bina
 * fixed    - yeri sabit: Valilik, Liman, Tersane, Sur
 * ground   - yapi alanina kurulan bina
 * island   - ADADA kurulur: Hizar ve luks kaynak binasi
 */
export type BuildingSlotKind = 'townhall' | 'port' | 'shipyard' | 'wall' | 'ground' | 'island';

/** Bina kategorileri; insa menusunde gruplama icin. */
export type BuildingCategory =
  | 'infrastructure'
  | 'military'
  | 'naval'
  | 'science'
  | 'culture'
  | 'economy'
  | 'production'
  | 'reduction'
  | 'island';

/** Bina tanimi (statik veri). Seviye tablosu YOKTUR - formul vardir. */
export interface BuildingDefinition {
  id: string;
  name: string;
  description: string;
  category: BuildingCategory;
  slot: BuildingSlotKind;
  /** Insaa suresi katsayilari (A, B, C, D). */
  time: import('@/config/Formulas').CostCoefficients;
  /**
   * Kaynak basina maliyet katsayilari.
   * Yalnizca gercekten maliyeti olan kaynaklar bulunur; Ikariam'da bazi
   * binalar yalnizca odun ister (Depo), bazilari dort kaynak birden
   * (Saray).
   */
  cost: Partial<Record<MaterialKey, import('@/config/Formulas').CostCoefficients>>;
  /** Azami seviye. Ikariam'da cogu bina depo tavanina takilir. */
  maxLevel: number;
  /** Ayni sehrin kurabilecegi azami adet (Depo icin 5, Saray icin 1). */
  maxCount?: number;
  /** Gereken arastirma; yoksa en bastan kurulabilir. */
  requiresResearch?: ResearchId;
  /** Gereken minimum Valilik seviyesi. */
  requiredTownHallLevel?: number;
  /** Yalnizca baskentte kurulabilir (Saray). */
  capitalOnly?: boolean;
  /** Yalnizca kolonide kurulabilir (Vali Konagi). */
  colonyOnly?: boolean;
  /** Bu bina hangi luks kaynagi isler (uretim binalari). */
  produces?: MaterialKey;
  /** Prosedurel doku/sprite icin ana renk. */
  tint: number;
  /** Ada uzerindeki ayak izi (karo). */
  size: number;
}

/** Bir binanin sehrin icindeki durumu. */
export interface PlacedBuilding {
  /** Bina turu. */
  type: string;
  /** 1'den baslayan seviye. */
  level: number;
  /** Yapi alanindaki yerlesim indeksi (sabit yapilar icin -1). */
  ground: number;
  /** Devam eden insa/yukseltme gorevi. */
  construction?: ConstructionTask;
}

/** Insaat gorevinin turu. */
export type ConstructionKind = 'build' | 'upgrade';

/**
 * Devam eden insaat/yukseltme gorevi.
 *
 * Zaman OYUN SANIYESI cinsinden tutulur, tik cinsinden degil: TIME_SCALE
 * degistiginde (oyuncu hiz dugmesine bastiginda) kalan surenin anlami
 * degismemeli. Tik tabanli tutmak, hizi 60x'ten 1x'e dusuren oyuncunun
 * insaatini 60 kat uzatina veya tersine bedava bitirirdi.
 */
export interface ConstructionTask {
  kind: ConstructionKind;
  /** Gorevin hedefledigi seviye. */
  toLevel: number;
  /** Toplam oyun saniyesi. */
  durationGameSeconds: number;
  /** Kalan oyun saniyesi. */
  remainingGameSeconds: number;
  /** Gorev olusturuldugunda GERCEKTEN odenen maliyet (iade bundan). */
  paidCost: ResourceAmounts;
  /** Kuyruk sirasi; ayni anda baslayan gorevleri kesin siralar. */
  sequence: number;
  startedAtTick: number;
}

// =========================================================================
// ADA
// =========================================================================

/** Ikariam'in sekiz tanrisi ve harikalari. */
export type GodId =
  | 'poseidon'
  | 'demeter'
  | 'athena'
  | 'hermes'
  | 'ares'
  | 'hades'
  | 'hephaistos'
  | 'helios';

/** Harika kimligi; tanriyla birebir eslesir. */
export type WonderId = GodId;

/** Tanri/harika tanimi. */
export interface GodDefinition {
  id: GodId;
  name: string;
  wonderName: string;
  /** Inanclarin ne yaptigi; arayuzde gosterilir. */
  wonderEffect: string;
  tint: number;
}

/**
 * Aktif bir harika (miracle).
 *
 * Ikariam'da harika PASIF degildir: adanin tanrisina bagisla inanç
 * biriktirilir, inanç harika seviyesini acar ve oyuncu harikayi
 * AKTIFLESTIRIR. Etki sureli bir pencere boyunca gecerlidir, sonra
 * bekleme suresine girer.
 *
 * Zaman OYUN SANIYESI ile tutulur: hiz degistirmek harikanin gercek
 * dunyada ne kadar surdugunu degistirir ama oyun icindeki anlamini
 * degistirmez. Bu, insaat sureleriyle ayni ilkedir.
 */
export interface WonderActivation {
  islandId: string;
  god: GodId;
  /** 1..5; inanca baglidir. */
  level: number;
  startedGameSeconds: number;
  /** 0 ise etkisi sureli degildir (Kolos savunmada aninda calisir). */
  endsGameSeconds: number;
  cooldownEndsGameSeconds: number;
}

/** Ada uzerindeki kaynak yatagi. */
export interface ResourceDeposit {
  resource: MaterialKey;
  /** Yatagin binasi (Hizar / Tas Ocagi / Bag / Kukurt Cukuru / Kristal Madeni). */
  buildingId: string;
  /** ORTAK seviye: adadaki TUM sehirler ayni seviyeyi kullanir. */
  level: number;
  /** Ada koordinati (izometrik karo). */
  gx: number;
  gy: number;
  /**
   * Devam eden yukseltme gorevi.
   *
   * Yatagin seviyesi ORTAK oldugu icin gorev de ortaktir: adadaki bir sehir
   * yukseltmeyi baslatir, baska bir sehir ayni gorevi iptal edemez. Ikariam'da
   * yatagi yukselten oyuncu maliyeti kendisi oder ama seviyeden adadaki
   * herkes faydalanir.
   */
  construction?: ConstructionTask;
}

/** Ada etrafindaki bir sehr alani (plot). */
export interface IslandPlot {
  index: number;
  gx: number;
  gy: number;
  /** Sahibi: 'player', bir NPC kimligi veya null (bos). */
  ownerId: string | null;
  /** Bu alandaki sehrin kimligi; bos alanlarda null. */
  cityId: string | null;
}

/** Bir adanin tam durumu. */
export interface IslandState {
  id: string;
  name: string;
  /** Dunya haritasindaki konum. */
  wx: number;
  wy: number;
  /** Luks kaynak turu; adada yalnizca bir tane olur. */
  luxury: LuxuryKind;
  god: GodId;
  /**
   * Ada inanci (0..100).
   *
   * Harikanin seviyesini belirler: her 20 inanç bir seviye acar
   * (20 -> 1, 40 -> 2, ..., 100 -> 5). Inanç, adadaki sehirlerin
   * tapinak bagisindan gelir.
   */
  faith: number;
  wood: ResourceDeposit;
  luxuryDeposit: ResourceDeposit;
  plots: IslandPlot[];
}

// =========================================================================
// SEHIR
// =========================================================================

/** Sehrin liman yapilari (yerleri sabittir). */
export interface HarborState {
  port: PlacedBuilding;
  shipyard: PlacedBuilding;
}

/** Bir sehrin tam durumu. */
export interface CityState {
  id: string;
  name: string;
  /** 'player' veya bir NPC kimligi. */
  ownerId: string;
  islandId: string;
  plot: number;
  /** Baskent mi? Saray yalnizca baskentte, Vali Konagi yalnizca kolonide. */
  isCapital: boolean;
  /**
   * Sehrin KENDI kaynak deposu.
   *
   * Ikariam'da kaynaklar SEHIR BASINADIR: her sehrin kendi depo tavani
   * vardir ve bir insaat yalnizca o sehrin kaynagiyla odenebilir. Kendi
   * sehirlerin arasinda bile kaynak tasimak icin yuk gemisi gerekir. Bu,
   * Ikariam ekonomisinin temel kisitidir; ortak bir havuz tutmak oyunu
   * Ikariam olmaktan cikarirdi.
   *
   * Altin burada DEGILDIR: altin oyuncu genelinde tek havuzdur.
   */
  resources: MaterialPool;
  townHall: PlacedBuilding;
  wall: PlacedBuilding;
  harbor: HarborState;
  /** Yapi alanlarina kurulmus binalar. */
  grounds: PlacedBuilding[];
  /** Toplam vatandas (nufus). */
  citizens: number;
  /** Nufus buyumesinin kesirli birikimi; kayda yazilmaz. */
  growthProgress: number;
  /** Vatandas dagilimi. */
  assignment: CitizenAssignment;
  /** Meyhanede servis edilen sarap (saat basina). */
  tavernWine: number;
  /** Muzedeki kultur mallari anlasmalari. */
  museumGoods: MuseumTreaty[];
  /** Sehre bagli kara birlikleri. */
  garrison: UnitStack[];
  /** Sehre bagli savas gemileri. */
  warfleet: ShipStack[];
  /** Bu sehre ait yuk gemileri. */
  cargoShips: number;
  /** Egitim kuyrugu (kisla). */
  unitQueue: TrainingTask[];
  /** Gemi insa kuyrugu (tersane). */
  shipQueue: TrainingTask[];
}

/** Muze kultur mallari anlasmasi. */
export interface MuseumTreaty {
  /** Anlasmanin yapildigi sehrin kimligi. */
  cityId: string;
  cityName: string;
  /** Anlasma bir kez yapilir ve kalir. */
  goods: number;
}

// =========================================================================
// BIRLIKLER VE GEMILER
// =========================================================================

/** Birlik sinifi; savas alanindaki yerini ve ates sirasini belirler. */
export type UnitClass =
  | 'light_infantry'
  | 'heavy_infantry'
  | 'long_range'
  | 'artillery'
  | 'air_fighter'
  | 'air_bomber'
  | 'support';

/** Gemi sinifi. */
export type ShipClass =
  | 'heavy_battleship'
  | 'light_battleship'
  | 'long_range'
  | 'first_strike'
  | 'carrier'
  | 'carrier_evasion'
  | 'support'
  | 'transport';

/** Atolye gelistirme kademeleri. */
export type UpgradeTier = 'base' | 'bronze' | 'silver' | 'gold';

/** Bir birlik turunun savas istatistikleri. */
export interface CombatStats {
  hp: number;
  damage: number;
  /** Zirh: gelen hasardan sabit dusulur. */
  armor: number;
  /** Isabet orani (0..1). */
  accuracy: number;
  /** Cephane; Infinity yerine -1 yazilir (serilestirilebilir olsun diye). */
  ammo: number;
  /** Savas alanindaki hiz; tur sirasini etkilemez, kacma/kovma etkiler. */
  speed: number;
  /** Savas alaninda kapladigi yer. */
  size: number;
  /** Ikincil hasar (cephane bitince) ve isabeti. */
  secondaryDamage?: number;
  secondaryAccuracy?: number;
  /** Surlara karsi ozel hasar (Kocbasi). */
  wallDamage?: number;
  /** Tur basina iyilestirme (Doktor). */
  healPerRound?: number;
  /** Tur basina moral (Asci). */
  moralePerRound?: number;
}

/** Kara birlik tanimi. */
export interface UnitDefinition {
  id: string;
  name: string;
  description: string;
  unitClass: UnitClass;
  /** Gereken minimum Kisla seviyesi. */
  requiredBarracksLevel: number;
  /** Gereken arastirma. */
  requiresResearch?: ResearchId;
  /** Egitim maliyeti (kaynak). */
  cost: ResourceAmounts;
  /** Egitim suresi, oyun saniyesi. */
  trainTime: number;
  /** Saat basina altin bakim ucreti. */
  upkeepGold: number;
  /** Kademe basina istatistikler. */
  stats: Record<UpgradeTier, CombatStats>;
  /** Atolye gelistirmesi icin gereken kademe maliyeti. */
  upgradeCost?: Partial<Record<UpgradeTier, ResourceAmounts>>;
  tint: number;
}

/** Gemi tanimi (savas gemileri + yuk gemisi). */
export interface ShipDefinition {
  id: string;
  name: string;
  description: string;
  shipClass: ShipClass;
  requiredShipyardLevel: number;
  requiresResearch?: ResearchId;
  cost: ResourceAmounts;
  buildTime: number;
  upkeepGold: number;
  /** Yuk gemisi icin tasima kapasitesi. */
  cargo?: number;
  stats: Record<UpgradeTier, CombatStats>;
  upgradeCost?: Partial<Record<UpgradeTier, ResourceAmounts>>;
  tint: number;
}

/** Bir birlik yigini (adet + kademe + cephane). */
export interface UnitStack {
  id: string;
  count: number;
  tier: UpgradeTier;
}

/** Gemi yigini. */
export interface ShipStack {
  id: string;
  count: number;
  tier: UpgradeTier;
}

/** Egitim/insa gorevi (kisla veya tersane kuyrugu). */
export interface TrainingTask {
  id: string;
  count: number;
  /** Kalan oyun saniyesi (tumu icin). */
  remainingGameSeconds: number;
  /** Bir adet icin oyun saniyesi. */
  perUnitGameSeconds: number;
  tier: UpgradeTier;
  startedAtTick: number;
}

// =========================================================================
// FILO VE GOREVLER
// =========================================================================

/** Filonun gorev turu. */
export type MissionKind =
  | 'attack'
  | 'transport'
  | 'trade'
  | 'plunder'
  | 'garrison'
  | 'return';

/** Yolda olan bir filo. */
export interface Fleet {
  id: string;
  ownerId: string;
  mission: MissionKind;
  /** Bu filo bir ticaret rotasinin devrini mi yurütüyor? */
  routeId?: string;
  /** Nereden cikti (ada kimligi + plot). */
  fromIslandId: string;
  fromCityId: string;
  toIslandId: string;
  toCityId: string | null;
  /** Tasinan birlikler/gemiler. */
  units: UnitStack[];
  ships: ShipStack[];
  /** Ticaret/transport icin yuk. */
  cargo: ResourceAmounts;
  /** Ticarette alinacak kaynak ve adet. */
  tradeBuy?: { resource: MaterialKey; amount: number };
  /** Kullanilan yuk gemisi sayisi. */
  cargoShips: number;
  /** Toplam yolculuk suresi (oyun saniyesi). */
  durationGameSeconds: number;
  /** Kalan yolculuk suresi. */
  remainingGameSeconds: number;
  /** Geri donus mu? */
  returning: boolean;
  startedAtTick: number;
}

// =========================================================================
// NPC / DUNYA
// =========================================================================

/** NPC sehrin turu. */
export type NpcKind = 'city' | 'barbarian';

/** Oyuncu olmayan bir sehrin ozeti. */
export interface NpcCity {
  id: string;
  name: string;
  kind: NpcKind;
  ownerId: string;
  islandId: string;
  plot: number;
  /** Savas gucunu belirleyen seviye (1..40). */
  powerLevel: number;
  /** Depodaki kaynaklar; yagmalanabilir. Altin NPC'de tutulmaz. */
  resources: MaterialPool;
  /** Savunma birlikleri. */
  garrison: UnitStack[];
  warfleet: ShipStack[];
  wallLevel: number;
  /** Oyuncuya karsi tutum; ticaret ve anlasmalarda kullanilir. */
  relation: number;
  /** Yagmalandi mi, ne zaman toparlanir. */
  lootedAtTick: number | null;
}

/** Dunya haritasindaki tum adalar. */
export interface WorldState {
  islands: IslandState[];
  npcs: NpcCity[];
}

// =========================================================================
// SAVAS SONUCU
// =========================================================================

/** Bir savasin tur bazli kayip dokumu. */
export interface BattleLosses {
  attacker: UnitStack[];
  defender: UnitStack[];
  attackerShips: ShipStack[];
  defenderShips: ShipStack[];
}

/** Savas raporu. */
/**
 * Savas raporunun tek tur luk goruntusu.
 *
 * Ikariam'in savas raporu tur tur okunur: her turda hangi birlikten kac
 * tane kaldigi, surun ne kadar canı oldugu ve savunanin morali gorulur.
 * Bu kayit o goruntunun anlik fotografidir; kayiplar ardisik iki kaydin
 * farkindan cikarilir.
 */
/**
 * Kalici ticaret rotasi (Ikariam'in trade route mekanigi).
 *
 * Ikariam'da ticaret rotasi TEK SEFERLIK bir sevkiyat degildir: iki
 * sehir arasinda kurulan ve her devirde otomatik olarak mal tasiyan
 * bir hatdir. Rota kendine ayrilmis yuk gemisi sayisiyla calisir; o
 * gemiler baska sevkiyatta kullanilamaz.
 */
export interface TradeRoute {
  id: string;
  fromCityId: string;
  toCityId: string;
  /** Giden mal. */
  send: MaterialKey;
  /** Donuste getirilen mal; null ise bos doner. */
  bring: MaterialKey | null;
  /** Rotaya ayrilmis yuk gemisi sayisi. */
  cargoShips: number;
  /** Sonraki kalkisa kalan oyun saniyesi; filo yoldayken beklemede. */
  nextDepartureIn: number;
  /** Tamamlanan devir sayisi. */
  cycles: number;
  /** Son devirde tasinan toplam miktar. */
  lastHaul: number;
}

export interface BattleRoundEntry {
  phase: 'sea' | 'land';
  round: number;
  /** Saldiranin tur sonundaki kalan gruplari. */
  attacker: { id: string; count: number }[];
  /** Savunanin tur sonundaki kalan gruplari. */
  defender: { id: string; count: number }[];
  /** Surun kalan cani (yalnizca kara asamasi anlamli). */
  wallHp: number;
  /** Savunanin morali; sifirlaninca kacar. */
  defenderMorale: number;
}

export interface BattleReport {
  id: string;
  atTick: number;
  attackerName: string;
  defenderName: string;
  islandName: string;
  cityName: string;
  won: boolean;
  /** Oyuncunun tarafindan bakiliyor mu (savunan oyuncuysa false). */
  playerIsAttacker: boolean;
  rounds: number;
  losses: BattleLosses;
  loot: ResourceAmounts;
  wallDamage: number;
  /** Tur tur savas dökümü; Ikariam raporunun asil gövdesi. */
  roundLog: BattleRoundEntry[];
}

// =========================================================================
// SEHIR OZETI (arayuz icin)
// =========================================================================

/** Arayuzun her tikte okudugu sehir ozeti. */
export interface CitySnapshot {
  cityId: string;
  citizens: number;
  maxPopulation: number;
  happiness: number;
  /** Mutluluk - nufus; pozitifse sehir buyur. */
  surplus: number;
  growthPerHour: number;
  assignment: CitizenAssignment;
  /** Bu sehrin oyun saati basina NET madde akisi (odun + luks). */
  perHour: MaterialPool;
  researchPointsPerHour: number;
  storageCapacity: number;
  /** Depoda guvende olan (yagmalanamayan) miktar. */
  safeStorage: number;
  /** 0..1 arasi; uretim ve mutlulugu kirpar. */
  corruption: number;
  goldPerHour: number;
  upkeepPerHour: number;
  /** Bilim adami kapasitesi (Akademi seviyesi x 4). */
  scientistCapacity: number;
}

/** Bildirim onceligi. */
export type NoticeTone = 'info' | 'success' | 'warn' | 'error';

/** Oyun ici posta/bildirim kaydi. */
export interface NoticeRecord {
  id: string;
  atTick: number;
  title: string;
  body: string;
  tone: NoticeTone;
  read: boolean;
}

// =========================================================================
// KAYIT
// =========================================================================

/** localStorage'a yazilan kayit yapisi. */
export interface SaveData {
  version: number;
  /** Gercek dunya zaman damgasi; cevrimdisi sureyi olcmek icin. */
  savedAt: number;
  /** Oyun ici toplam gecen oyun saniyesi. */
  gameSeconds: number;
  tick: number;
  timeScale: number;
  /**
   * Altin OYUNCU GENELINDE tek havuzdur.
   *
   * Ikariam'da maddesel kaynaklar sehir basina, altin ise oyuncu
   * basinadir. Bu yuzden kaynaklar `cities[].resources` icinde, altin
   * burada durur.
   */
  gold: number;
  researchPoints: number;
  completedResearch: CompletedResearch[];
  activeResearch: ActiveResearch | null;
  /** Oyuncunun sehirleri (her biri kendi deposunu tasir). */
  cities: CityState[];
  /** Oyuncunun tum filolari (yolda olanlar). */
  fleets: Fleet[];
  /** Aktif/beklemedeki harikalar. */
  wonders: WonderActivation[];
  /** Dunya: adalar ve NPC'ler. */
  world: WorldState;
  /** Oyuncunun aktif olarak baktigi sehir. */
  activeCityId: string;
  notices: NoticeRecord[];
  /** Savas raporlari (en yenisi once); kayitla tasinir. */
  reports: BattleReport[];
  /** Kalici ticaret rotalari. */
  tradeRoutes: TradeRoute[];
  /** Birlik/gemi kademe gelistirmeleri. */
  tiers: { units: Record<string, UpgradeTier>; ships: Record<string, UpgradeTier> };
  /** Ada/npc uretiminde kullanilan tohum; kayitla tasinir ki dunya degismesin. */
  seed: number;
}

// =========================================================================
// SECIM (sahne -> arayuz)
// =========================================================================

/**
 * Sehrin izometrik gorunumunde secilen kare.
 *
 * Sahne yalnizca "neye dokunuldugunu" bildirir; panelin icerigini arayuz
 * kurar. Boylece sahne, hangi binanin hangi eylemleri oldugunu bilmez ve
 * oyun mantigi ile cizim katmani ayri kalir.
 */
export interface CitySlotSelection {
  cityId: string;
  /** Karo tipi: sabit binalar mi, bos/kurulmus yapi alani mi? */
  kind: 'town_hall' | 'wall' | 'port' | 'shipyard' | 'ground' | 'empty';
  /** Kurulu binanin kimligi; bos alanda bos dize. */
  buildingId: string;
  /** Yapi alani indeksi; sabit binalarda -1. */
  ground: number;
}

/** Ada gorunumunde secilen kare. */
export interface IslandSlotSelection {
  islandId: string;
  /** Sehr alani indeksi; -1 ise alan degil (yatag/harika/bos arazi). */
  plot: number;
  kind: 'plot' | 'wood' | 'luxury' | 'wonder' | 'terrain';
}

/** Dunya haritasinda secilen ada. */
export interface WorldSlotSelection {
  islandId: string;
}
