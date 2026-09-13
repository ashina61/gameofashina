import {
  MAX_LAND_ROUNDS,
  MAX_SEA_ROUNDS,
  WALL_DEFENSE_BONUS_PER_LEVEL,
} from '@/config/Constants';
import { getShip, SHIP_FIRE_ORDER } from '@/config/ShipCatalog';
import { getUnit, INFINITE_AMMO, UNIT_FIRE_ORDER } from '@/config/UnitCatalog';
import { createRng } from '@/utils/Rng';
import type { WonderSystem } from './WonderSystem';
import type {
  BattleRoundEntry,
  CombatStats,
  ShipStack,
  UnitStack,
  UpgradeTier,
} from '@/types';

/**
 * Ikariam savas motoru.
 *
 * Ikariam savasi TUR usulu oynanir ve iki asamalidir: once DENIZ, sonra
 * KARA. Deniz kaybedilirse kara birlikleri kiyiya cikamaz.
 *
 * TUR SIRASI (kara) - Ikariam'in kendi sirasi:
 *   1. Hava savunmasi (Gyrocopter)
 *   2. Bombardi (Balon Bombardimani)
 *   3. Topcu (Havan -> Mancinik -> Kocbasi)
 *   4. Menzilli (Karabiniyerci -> Okcu -> Sapanci)
 *   5. On cephe (Sur -> Hoplite -> Buhar Devi)
 *   6. Kanatlar (Kilicli -> Mizrakli)
 *
 * CEPHANE: menzilli birimlerin cephanesi bittiginde IKINCIL hasarla on
 * cepheye duserler. Bu, Ikariam'da "okcu bitince kilicli gibi savasir"
 * davranisidir ve uzun savaslarin neden menzilli birlikleri erittigini
 * aciklar.
 *
 * ZIRH: sabit cikarma DEGIL, azalan getirili bir oran olarak uygulanir
 * (zirh / (zirh + 100)). Ikariam'da zirh sabit cikarmadir; ancak sabit
 * cikarma yuksek zirhli birimde hasari SIFIRA kilitler ve savas
 * sonsuza kadar surerdi. Oran modeli ayni hissi verir (zirhli birim
 * dayanikli) ama savasi bitirir.
 *
 * MORAL: her turde kayip veren tarafin morali duser. Moral sifirlanan
 * taraf SAVASMAYI BIRAKIR ama birlikleri OLMEZ - kacar. Kolos harikasi
 * bunu saldirana karsi bedavaya yapar.
 */

/** Savasan tek bir grup (ayni tur birlik/gemi yigini). */
export interface BattleGroup {
  id: string;
  tier: UpgradeTier;
  /** Baslangictaki adet; kayiplar bundan dusulur. */
  initial: number;
  /** Kalan adet. */
  count: number;
  stats: CombatStats;
  /** Kalan cephane; -1 sonsuz. */
  ammo: number;
  /** Can havuzu: count * hp. */
  hpPool: number;
  /** Ates sirasi (kucuk = once). */
  order: number;
  /** Kara mi deniz mi. */
  domain: 'land' | 'sea';
}

/** Savasin bir tarafi. */
export interface BattleSide {
  name: string;
  islandId: string;
  groups: BattleGroup[];
  /** Sur seviyesi; yalnizca savunan icin anlamli. */
  wallLevel: number;
  /** Surun kalan cani. */
  wallHp: number;
  morale: number;
  fled: number;
}

/** Savasin sonucu. */
export interface BattleOutcome {
  attackerWon: boolean;
  /** Deniz savasi yapildi mi? */
  seaPhase: boolean;
  /** Deniz savasinin kazananini kaybeden taraf cikarma yapamadigi icin. */
  landingBlocked: boolean;
  rounds: number;
  attackerLosses: UnitStack[];
  defenderLosses: UnitStack[];
  attackerShipLosses: ShipStack[];
  defenderShipLosses: ShipStack[];
  attackerSurvivors: UnitStack[];
  defenderSurvivors: UnitStack[];
  attackerShipSurvivors: ShipStack[];
  defenderShipSurvivors: ShipStack[];
  attackerFled: number;
  defenderFled: number;
  /** Surun kalan cani. */
  wallHpLeft: number;
  /** Surun kalan SEVIYESI; savunan tarafa geri yazilir. */
  wallLevelLeft: number;
  /** Savasin basindaki sur seviyesi; hasar orani icin. */
  wallLevelInitial: number;
  /** Sura verilen toplam hasar. */
  wallDamage: number;
  /** Hades harikasindan donen mermer. */
  marbleRefund: number;
  /** Tur tur kalan birlik dokumu; savas raporunun govdesi. */
  roundLog: BattleRoundEntry[];
}

/** Gruplarin kalan adetlerini rapor kaydina cevirir. */
function snapshotGroups(groups: BattleGroup[]): { id: string; count: number }[] {
  return groups
    .filter((g) => g.initial > 0)
    .map((g) => ({ id: g.id, count: Math.max(0, g.count) }));
}

/** Surun can havuzu: seviye basina. */
const WALL_HP_PER_LEVEL = 4_000;

/** Moral esikleri. */
const MORALE_START = 100;
const MORALE_PER_LOSS_RATIO = 55;
const MORALE_FLIGHT = 0;

/** Zirhin hasar azaltma orani: armor / (armor + ARMOR_K). */
const ARMOR_K = 100;

/**
 * Surun bir voliden emdigi hasar payi.
 *
 * Ikariam'da sur iki is yapar: savunanin birimlerine direnç bonusu verir
 * ve gelen hasarin bir kismini uzerine alir. Kocbasi bu ikinciyi hizlandirir.
 * Sur yikildiginda ikisi de biter.
 */
const WALL_ABSORB = 0.5;

/** Bir grubun hedeflenme agirliği; on cephe once vurulur. */
const TARGET_WEIGHT: Record<number, number> = {
  5: 3, // on cephe
  6: 2.4, // kanatlar
  3: 1.4, // topcu
  4: 1.2, // menzilli
  1: 1, // hava savunma
  2: 1,
  7: 0.8, // destek
};

export class CombatSystem {
  constructor(private readonly wonders: WonderSystem) {}

  // --- Grup kurulumu -------------------------------------------------------

  /**
   * Bir birimin nakliye hacmi.
   *
   * Filo kapasitesi savas istatistiklerindeki `size` alanindan okunur;
   * bu bilgi savas motorunun zaten kullandigi veri oldugu icin ayri bir
   * tabloda tutulmaz. Iki yerde tutmak, birim dengesi degistiginde
   * nakliye hesabinin sessizce kaymasi demekti.
   */
  unitSize(unitId: string): number {
    return getUnit(unitId)?.stats.base.size ?? 1;
  }

  /** Kara birliklerinden savas gruplari uretir. */
  landGroups(stacks: readonly UnitStack[], domain: 'land'): BattleGroup[] {
    const groups: BattleGroup[] = [];
    for (const stack of stacks) {
      const def = getUnit(stack.id);
      if (!def || stack.count <= 0) continue;
      const stats = def.stats[stack.tier] ?? def.stats.base;
      groups.push(this.makeGroup(stack.id, stack.tier, stack.count, stats, UNIT_FIRE_ORDER[def.unitClass], domain));
    }
    return groups;
  }

  /** Gemi yiginlarindan savas gruplari uretir. */
  seaGroups(stacks: readonly ShipStack[]): BattleGroup[] {
    const groups: BattleGroup[] = [];
    for (const stack of stacks) {
      const def = getShip(stack.id);
      if (!def || stack.count <= 0 || def.shipClass === 'transport') continue;
      const stats = def.stats[stack.tier] ?? def.stats.base;
      groups.push(this.makeGroup(stack.id, stack.tier, stack.count, stats, SHIP_FIRE_ORDER[def.shipClass], 'sea'));
    }
    return groups;
  }

  private makeGroup(
    id: string,
    tier: UpgradeTier,
    count: number,
    stats: CombatStats,
    order: number,
    domain: 'land' | 'sea',
  ): BattleGroup {
    return {
      id,
      tier,
      initial: count,
      count,
      stats,
      ammo: stats.ammo === INFINITE_AMMO ? INFINITE_AMMO : stats.ammo * count,
      hpPool: count * stats.hp,
      order,
      domain,
    };
  }

  // --- Savas ---------------------------------------------------------------

  /**
   * Tam bir savasi cozer: once deniz, sonra kara.
   *
   * @param seed deterministiklik icin; ayni tohum ayni sonucu verir
   */
  resolve(options: {
    attackerName: string;
    defenderName: string;
    islandId: string;
    attackerUnits: readonly UnitStack[];
    defenderUnits: readonly UnitStack[];
    attackerShips: readonly ShipStack[];
    defenderShips: readonly ShipStack[];
    wallLevel: number;
    seed: number;
    /** Hades adasi: olen birlikler kismen mermer olarak geri doner. */
    hadesIsland?: boolean;
  }): BattleOutcome {
    const random = createRng(options.seed >>> 0);

    const attacker = this.makeSide(options.attackerName, options.islandId, 0);
    const defender = this.makeSide(options.defenderName, options.islandId, options.wallLevel);

    attacker.groups = [
      ...this.seaGroups(options.attackerShips),
      ...this.landGroups(options.attackerUnits, 'land'),
    ];
    defender.groups = [
      ...this.seaGroups(options.defenderShips),
      ...this.landGroups(options.defenderUnits, 'land'),
    ];

    // Harika etkileri: Hephaistos zirh+hasar, Ares moral, Kolos kacis.
    this.applyWonder(attacker, options.islandId, false);
    this.applyWonder(defender, options.islandId, true);

    const attackerShips = attacker.groups.filter((g) => g.domain === 'sea');
    const defenderShips = defender.groups.filter((g) => g.domain === 'sea');

    // --- DENIZ ASAMASI ---
    // Ikariam'da deniz ustunlugu olmadan cikarma yapilamaz. Saldiranin
    // savas gemisi yok ama savunanin varsa, nakliye gemileri batar ve
    // kara birlikleri kiyiya hic cikamaz.
    let seaPhase = false;
    let landingBlocked = false;
    let rounds = 0;
    // Tur kaydi savas boyunca tek dizide birikir; rapor buradan uretilir.
    const roundLog: BattleRoundEntry[] = [];

    if (attackerShips.length > 0 || defenderShips.length > 0) {
      seaPhase = true;
      rounds += this.fightPhase(
        attacker.groups.filter((g) => g.domain === 'sea'),
        defender.groups.filter((g) => g.domain === 'sea'),
        defender,
        MAX_SEA_ROUNDS,
        random,
        false,
        'sea',
        roundLog,
      );

      const attackerSeaAlive = attacker.groups.some((g) => g.domain === 'sea' && g.count > 0);
      const defenderSeaAlive = defender.groups.some((g) => g.domain === 'sea' && g.count > 0);
      const attackerHasLand = attacker.groups.some((g) => g.domain === 'land' && g.count > 0);

      // Savunanin gemisi sag ve saldiranin gemisi kalmadi -> cikarma engellendi.
      if (defenderSeaAlive && !attackerSeaAlive && attackerHasLand) {
        landingBlocked = true;
        for (const group of attacker.groups) {
          if (group.domain === 'land') this.killGroup(group);
        }
      }
    }

    // --- KARA ASAMASI ---
    if (!landingBlocked) {
      const landAttacker = attacker.groups.filter((g) => g.domain === 'land' && g.count > 0);
      const landDefender = defender.groups.filter((g) => g.domain === 'land');
      if (landAttacker.length > 0 || landDefender.length > 0) {
        rounds += this.fightPhase(
          landAttacker,
          landDefender,
          defender,
          MAX_LAND_ROUNDS,
          random,
          true,
          'land',
          roundLog,
        );
      }
    }

    const attackerAlive = attacker.groups.some((g) => g.count > 0);
    const defenderAlive = defender.groups.some((g) => g.count > 0 || defender.wallHp > 0);
    const attackerWon = attackerAlive && !defenderAlive;

    const marbleRefund = options.hadesIsland
      ? this.marbleRefund(attacker.groups, defender.groups, options.islandId)
      : 0;

    // Sur seviyesi: Ikariam'da sur hasar alinca seviye kaybeder. Kalan
    // can, baslangic seviyesinin can havuzuna oranlanarak geri hesaplanir;
    // boylece "sur 3 seviye yikildi" bilgisi arayuzde gosterilebilir.
    const wallHpInitial = Math.max(0, options.wallLevel) * WALL_HP_PER_LEVEL;
    const wallHpLeft = Math.max(0, defender.wallHp);
    const wallLevelLeft =
      wallHpInitial > 0
        ? Math.max(0, Math.min(options.wallLevel, Math.floor(wallHpLeft / WALL_HP_PER_LEVEL)))
        : 0;

    return {
      attackerWon,
      seaPhase,
      landingBlocked,
      rounds,
      attackerLosses: this.losses(attacker.groups, 'land'),
      defenderLosses: this.losses(defender.groups, 'land'),
      attackerShipLosses: this.shipLosses(attacker.groups),
      defenderShipLosses: this.shipLosses(defender.groups),
      attackerSurvivors: this.survivors(attacker.groups, 'land'),
      defenderSurvivors: this.survivors(defender.groups, 'land'),
      attackerShipSurvivors: this.shipSurvivors(attacker.groups),
      defenderShipSurvivors: this.shipSurvivors(defender.groups),
      attackerFled: attacker.fled,
      defenderFled: defender.fled,
      wallHpLeft: Math.round(wallHpLeft),
      wallLevelLeft,
      wallLevelInitial: Math.max(0, options.wallLevel),
      wallDamage: Math.round(wallHpInitial - wallHpLeft),
      marbleRefund,
      roundLog,
    };
  }

  /** Bir savas tarafi kurar. */
  private makeSide(name: string, islandId: string, wallLevel: number): BattleSide {
    return {
      name,
      islandId,
      groups: [],
      wallLevel: Math.max(0, wallLevel),
      wallHp: Math.max(0, wallLevel) * WALL_HP_PER_LEVEL,
      morale: MORALE_START,
      fled: 0,
    };
  }

  /** Harika etkilerini taraflara uygular. */
  private applyWonder(side: BattleSide, islandId: string, isDefender: boolean): void {
    const combat = this.wonders.combatBonus(islandId);
    for (const group of side.groups) {
      group.stats = {
        ...group.stats,
        armor: group.stats.armor + combat.armor,
        damage: Math.round(group.stats.damage * combat.damageMultiplier),
      };
      group.hpPool = group.count * group.stats.hp;
    }
    const morale = this.wonders.moraleBonus(islandId);
    if (morale > 0) side.morale += morale / 10;

    // Kolos: SAVUNAN adanin harikasi, saldiranin birliklerini kacirir.
    if (!isDefender) {
      const chance = this.wonders.flightChance(islandId);
      if (chance > 0) {
        for (const group of side.groups) {
          const fled = Math.floor(group.count * chance);
          if (fled <= 0) continue;
          group.count -= fled;
          group.hpPool = Math.max(0, group.hpPool - fled * group.stats.hp);
          side.fled += fled;
        }
      }
    }
  }

  /**
   * Tek bir asamayi (deniz veya kara) oynar ve oynanan tur sayisini dondurur.
   */
  private fightPhase(
    attackerGroups: BattleGroup[],
    defenderGroups: BattleGroup[],
    defender: BattleSide,
    maxRounds: number,
    random: () => number,
    wallActive: boolean,
    phase: 'sea' | 'land',
    roundLog: BattleRoundEntry[],
  ): number {
    let rounds = 0;

    for (let round = 0; round < maxRounds; round += 1) {
      rounds += 1;

      const attackerAlive = attackerGroups.some((g) => g.count > 0);
      const defenderAlive =
        defenderGroups.some((g) => g.count > 0) || (wallActive && defender.wallHp > 0);
      if (!attackerAlive || !defenderAlive) break;

      // Saldiran ates eder.
      this.fireVolley(attackerGroups, defenderGroups, defender, random, wallActive);
      // Savunan ates eder (sur dahil).
      this.fireVolley(defenderGroups, attackerGroups, defender, random, false, true);

      // Moral: kayip veren tarafin morali duser.
      this.updateMorale(defender);
      const fled = defender.morale <= MORALE_FLIGHT;

      // Tur fotografi: rapor icin tur sonundaki kalan adetler. Kayit
      // savasin determinizmini DEGISTIRMEZ; yalnizca gozlemdir.
      roundLog.push({
        phase,
        round,
        attacker: snapshotGroups(attackerGroups),
        defender: snapshotGroups(defenderGroups),
        wallHp: Math.max(0, Math.round(defender.wallHp)),
        defenderMorale: Math.max(0, Math.round(defender.morale)),
      });

      if (fled) {
        for (const group of defenderGroups) this.fleeGroup(group, defender);
        break;
      }
    }

    return rounds;
  }

  /**
   * Bir tarafin tum gruplari ates eder.
   *
   * Ates SIRASI sinifa gore sabittir: hava once, topcu sonra, on cephe en
   * son. Ayni sinif icinde gruplar kimlik sirasiyla islenir ki sonuc
   * dizinin o anki siralamasina bagimli kalmasin.
   */
  private fireVolley(
    shooters: BattleGroup[],
    targets: BattleGroup[],
    defender: BattleSide,
    random: () => number,
    wallActive: boolean,
    isDefenderShooting = false,
  ): void {
    const ordered = [...shooters]
      .filter((g) => g.count > 0)
      .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));

    for (const shooter of ordered) {
      const shots = this.shotsAvailable(shooter);
      if (shots <= 0) continue;

      // Isabet: her atis icin ayri zar atilmaz; buyuk sayilarda ayni
      // sonucu verir ve cok daha hizlidir. Isabet orani dogrudan carpilir
      // ve %+-15 rastgele sapma eklenir.
      const spread = 0.85 + random() * 0.3;
      const baseDamage = shooter.count * shooter.stats.damage * shooter.stats.accuracy * spread;

      // Sur, savunan tarafin onunde bir kalkan gibi durur.
      if (!isDefenderShooting && wallActive && defender.wallHp > 0) {
        const ramDamage = shooter.stats.wallDamage ? shooter.stats.wallDamage * shooter.count : 0;
        const absorbed = Math.min(defender.wallHp, baseDamage * WALL_ABSORB + ramDamage);
        defender.wallHp -= absorbed;
        // Surun emdigi hasar hedeflere gitmez.
        this.applyDamage(targets, Math.max(0, baseDamage - absorbed), random, defender, true);
        if (defender.wallHp <= 0) defender.wallLevel = 0;
      } else {
        this.applyDamage(targets, baseDamage, random, defender, false);
      }

      // Cephane tuketimi.
      if (shooter.ammo !== INFINITE_AMMO) {
        const perUnit = Math.max(1, Math.floor(shooter.stats.ammo));
        shooter.ammo = Math.max(0, shooter.ammo - perUnit * shooter.count);
      }
    }
  }

  /** Bir grubun bu tur kac atis yapabilecegi (cephane kontrolu). */
  private shotsAvailable(group: BattleGroup): number {
    if (group.ammo === INFINITE_AMMO) return group.count;
    if (group.ammo <= 0) {
      // Cephane bitti: ikincil hasarla on cepheye duser.
      return group.stats.secondaryDamage ? group.count : 0;
    }
    return Math.min(group.count, group.ammo);
  }

  /**
   * Hasari hedef gruplara dagitir.
   *
   * @param behindWall hedefler surun arkasinda mi? Yalnizca savunan taraf
   *                   icin dogrudur; sur ayakta oldugu surece gelen hasari
   *                   bolerek savunana ek direnc verir.
   */
  private applyDamage(
    targets: BattleGroup[],
    damage: number,
    random: () => number,
    defender: BattleSide,
    behindWall: boolean,
  ): void {
    const alive = targets.filter((g) => g.count > 0);
    if (alive.length <= 0 || damage <= 0) return;

    const defenseMultiplier =
      behindWall && defender.wallLevel > 0 && defender.wallHp > 0
        ? 1 + defender.wallLevel * WALL_DEFENSE_BONUS_PER_LEVEL
        : 1;

    let totalWeight = 0;
    for (const group of alive) {
      totalWeight += this.weightOf(group) * group.count;
    }
    if (totalWeight <= 0) return;

    let remaining = damage;
    for (const group of alive) {
      const share = (this.weightOf(group) * group.count) / totalWeight;
      let portion = remaining * share;
      // Son grubun payi yuvarlama kaybi olmasin diye kalanin tamami verilir.
      if (group === alive[alive.length - 1]) portion = remaining;
      remaining -= portion;

      const mitigated = portion / defenseMultiplier;
      const reduction = group.stats.armor / (group.stats.armor + ARMOR_K);
      const effective = mitigated * (1 - reduction);
      this.damageGroup(group, effective, random);
    }
  }

  /** Bir grubun hedeflenme agirligi. */
  private weightOf(group: BattleGroup): number {
    return TARGET_WEIGHT[group.order] ?? 1;
  }

  /** Gruba hasar uygular ve olenleri dusurur. */
  private damageGroup(group: BattleGroup, damage: number, random: () => number): void {
    if (damage <= 0 || group.count <= 0) return;

    // Kucuk bir rastgele yayilma: ayni hasar her zaman ayni sayida birim
    // oldurmesin, aksi halde savas tamamen deterministik bir hesap olurdu.
    const applied = damage * (0.9 + random() * 0.2);
    group.hpPool = Math.max(0, group.hpPool - applied);

    const survivors = Math.min(group.count, Math.ceil(group.hpPool / group.stats.hp));
    if (survivors < group.count) {
      group.count = survivors;
      group.hpPool = survivors * group.stats.hp;
    }
  }

  /** Grubu tamamen oldurur. */
  private killGroup(group: BattleGroup): void {
    group.count = 0;
    group.hpPool = 0;
  }

  /** Grubu savastan kacirir: birlikler OLMEZ, savasmayi birakir. */
  private fleeGroup(group: BattleGroup, side: BattleSide): void {
    if (group.count <= 0) return;
    side.fled += group.count;
    group.count = 0;
    group.hpPool = 0;
  }

  /** Kayip oranina gore morali gunceller. */
  private updateMorale(side: BattleSide): void {
    const initial = side.groups.reduce((sum, g) => sum + g.initial, 0);
    if (initial <= 0) return;
    const alive = side.groups.reduce((sum, g) => sum + g.count, 0);
    const lostRatio = 1 - alive / initial;
    side.morale = MORALE_START - lostRatio * MORALE_PER_LOSS_RATIO * 2;
    if (side.morale < MORALE_FLIGHT) side.morale = MORALE_FLIGHT;
  }

  /**
   * Hades harikasi: olen birliklerin kaynak maliyetinin bir kismi
   * mermer olarak geri doner.
   */
  private marbleRefund(attacker: BattleGroup[], defender: BattleGroup[], islandId: string): number {
    const ratio = this.wonders.marbleRefundRatio(islandId);
    if (ratio <= 0) return 0;

    let value = 0;
    for (const group of defender) {
      const lost = group.initial - group.count;
      if (lost <= 0) continue;
      const def = getUnit(group.id);
      if (!def) continue;
      const unitValue = Object.values(def.cost).reduce((sum, v) => sum + (v ?? 0), 0);
      value += lost * unitValue;
    }
    void attacker;
    return Math.round(value * ratio);
  }

  // --- Kayip/sag kalan raporlari -------------------------------------------

  private losses(groups: BattleGroup[], domain: 'land' | 'sea'): UnitStack[] {
    return groups
      .filter((g) => g.domain === domain && g.initial - g.count > 0)
      .map((g) => ({ id: g.id, count: g.initial - g.count, tier: g.tier }));
  }

  private survivors(groups: BattleGroup[], domain: 'land' | 'sea'): UnitStack[] {
    return groups
      .filter((g) => g.domain === domain && g.count > 0)
      .map((g) => ({ id: g.id, count: g.count, tier: g.tier }));
  }

  private shipLosses(groups: BattleGroup[]): ShipStack[] {
    return this.losses(groups, 'sea') as ShipStack[];
  }

  private shipSurvivors(groups: BattleGroup[]): ShipStack[] {
    return this.survivors(groups, 'sea') as ShipStack[];
  }
}

/** Sur can havuzu; arayuzde hasar gostergesi icin kullanilir. */
export function wallHitPoints(wallLevel: number): number {
  return Math.max(0, wallLevel) * WALL_HP_PER_LEVEL;
}
