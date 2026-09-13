import {
  NPC_GROWTH_COST,
  NPC_GROWTH_INTERVAL_HOURS,
  NPC_PRODUCTION_PER_POWER_HOUR,
  NPC_STORAGE_PER_POWER,
  NPC_TRADE_GOLD_PER_UNIT,
  NPC_TRADE_MARGIN,
  GAME_SECONDS_PER_HOUR,
  NPC_RECOVERY_GAME_SECONDS,
} from '@/config/Constants';
import { getShip } from '@/config/ShipCatalog';
import { getUnit } from '@/config/UnitCatalog';
import type { EventBus } from '@/core/EventBus';
import type { GameState } from '@/core/GameState';
import type { IslandState, MaterialKey, NpcCity, UpgradeTier } from '@/types';

/**
 * NPC yapay zekasi.
 *
 * Ikariam'in AI'i oyuncuya SALDIRMAZ; kendi sehrini gelistirir ve
 * saldiriya ugradiginda savunur. Bu surumde de ayni davranis korunur,
 * cunku saldirgan bir AI tek oyunculu bir oyunda oyuncunun oturmadigi
 * zamanlarda sehirlerini kaybetmesi demektir - Ikariam'da boyle bir sey
 * yoktur, savunmadaki birlikler siz cevrimdisiyken de yerinde durur.
 *
 * UC IS YAPAR:
 *   1. Uretim  - saat basina guc seviyesiyle orantili kaynak biriktirir
 *   2. Buyume  - biriken kaynakla bina/garnizon seviyesini artirir
 *   3. Ticaret - oyuncuya mal satar ve ondan mal alir
 *
 * Yagmalanan NPC `lootedAtTick` damgasi alir ve NPC_RECOVERY_GAME_SECONDS
 * boyunca tekrar yagmalanamaz. Bu, tek bir zayif NPC'nin sonsuz bir altin
 * makinesine donusmesini engeller.
 */

/** NPC'nin kaynak basina depo tavani. */
export function npcStorageCapacity(npc: NpcCity): number {
  return Math.round(NPC_STORAGE_PER_POWER * Math.max(1, npc.powerLevel) ** 2);
}

export class NpcSystem {
  /** Saat sayaci; her tam oyunda saatte bir uretim islenir. */
  private hourAccumulator = 0;

  constructor(private readonly state: GameState, private readonly bus: EventBus) {}

  /** NPC'leri ilerletir. */
  advance(gameSeconds: number): void {
    if (gameSeconds <= 0) return;

    this.hourAccumulator += gameSeconds / GAME_SECONDS_PER_HOUR;
    const hours = Math.floor(this.hourAccumulator);
    if (hours <= 0) return;
    this.hourAccumulator -= hours;

    for (let i = 0; i < hours; i += 1) this.hourlyTick();
  }

  /** Bir oyun saatlik NPC gelismesi. */
  private hourlyTick(): void {
    for (const npc of this.state.world.npcs) {
      this.produce(npc, 1);
      if (this.state.gameSeconds % (NPC_GROWTH_INTERVAL_HOURS * GAME_SECONDS_PER_HOUR) < GAME_SECONDS_PER_HOUR) {
        this.tryGrow(npc);
      }
    }
  }

  /**
   * NPC uretimi.
   *
   * Her NPC kendi adasinin odununu ve luks kaynagini uretir; diger luks
   * kaynaklari yalnizca ticaretle elde eder. Depo tavanina takilir:
   * yagmalanamayan bir NPC'nin kaynagi sonsuz birikmemelidir.
   */
  private produce(npc: NpcCity, hours: number): void {
    const island = this.state.islandOf(npc.islandId);
    if (!island) return;

    const cap = npcStorageCapacity(npc);
    const rate = NPC_PRODUCTION_PER_POWER_HOUR * Math.max(1, npc.powerLevel) * hours;

    npc.resources.wood = Math.min(cap, npc.resources.wood + rate);
    const luxury = island.luxury;
    npc.resources[luxury] = Math.min(cap, npc.resources[luxury] + rate * 0.65);
  }

  /** NPC'nin kaynak birikimiyle kendini gelistirmesi. */
  private tryGrow(npc: NpcCity): void {
    const wealth = this.wealth(npc);
    if (wealth < NPC_GROWTH_COST * npc.powerLevel) return;

    // Guc artisi Ikariam'daki bina seviyesi karsiligidir: sehrin
    // "town hall" seviyesi gibi dusunulur ve garnizon/sur buyumesini surer.
    this.spend(npc, NPC_GROWTH_COST * npc.powerLevel);
    npc.powerLevel += 1;
    npc.wallLevel = Math.max(npc.wallLevel, Math.round(npc.powerLevel * 1.4));
    this.reinforce(npc);
    this.bus.emit('notice:added', 'NPC gelişti', `${npc.name} seviye ${npc.powerLevel} oldu.`, 'warn');
  }

  /** NPC deposundaki toplam kaynak. */
  wealth(npc: NpcCity): number {
    return (['wood', 'marble', 'wine', 'sulfur', 'crystal'] as MaterialKey[]).reduce(
      (sum, key) => sum + (npc.resources[key] ?? 0),
      0,
    );
  }

  /** NPC deposundan kaynak dusurur. */
  private spend(npc: NpcCity, amount: number): void {
    let remaining = amount;
    for (const key of ['wood', 'marble', 'wine', 'sulfur', 'crystal'] as MaterialKey[]) {
      if (remaining <= 0) break;
      const take = Math.min(npc.resources[key] ?? 0, remaining);
      npc.resources[key] = Math.max(0, (npc.resources[key] ?? 0) - take);
      remaining -= take;
    }
  }

  /**
   * Guclenen NPC'nin garnizonunu ve filosunu takviye eder.
   *
   * Ikariam'da NPC sehirleri oyuncu saldirmadikca da buyur; burada ayni
   * his, her seviye artisinda kucuk bir takviye ekleyerek verilir.
   */
  private reinforce(npc: NpcCity): void {
    const tier = this.tierFor(npc);
    const pick = (options: string[], powerWeight: number): string | null => {
      const eligible = options.filter((id) => {
        const def = getUnit(id) ?? getShip(id);
        return def !== undefined;
      });
      if (eligible.length === 0) return null;
      // Guclendikce daha ileri birimler secilir.
      const index = Math.min(eligible.length - 1, Math.floor(powerWeight));
      return eligible[index] ?? null;
    };

    const landId = pick(
      ['slinger', 'spearman', 'hoplite', 'swordsman', 'archer', 'catapult', 'sulphur_carabineer', 'mortar', 'steam_giant'],
      npc.powerLevel / 3,
    );
    if (landId) {
      const existing = npc.garrison.find((g) => g.id === landId);
      if (existing) existing.count += 2;
      else npc.garrison.push({ id: landId, count: 2, tier });
    }

    if (npc.kind === 'city') {
      const seaId = pick(
        ['ram_ship', 'ballista_ship', 'fire_ship', 'catapult_ship', 'mortar_ship', 'paddle_wheel_ram'],
        npc.powerLevel / 5,
      );
      if (seaId) {
        const existing = npc.warfleet.find((g) => g.id === seaId);
        if (existing) existing.count += 1;
        else npc.warfleet.push({ id: seaId, count: 1, tier });
      }
    }
  }

  /** NPC birliklerinin kademesi; guc seviyesi arttikca yukselir. */
  tierFor(npc: NpcCity): UpgradeTier {
    if (npc.powerLevel >= 9) return 'gold';
    if (npc.powerLevel >= 6) return 'silver';
    if (npc.powerLevel >= 3) return 'bronze';
    return 'base';
  }

  // --- Ticaret -------------------------------------------------------------

  /**
   * NPC'nin bir kaynak icin birim fiyati.
   *
   * Ikariam'da tuccar fiyat arz/talebe gore degisir. Burada basit ama
   * ayni yonde davranan bir model kullanilir: NPC'nin deposu doluysa
   * o kaynagi UCUZ satar (elinden cikarmak ister), bos ise PAHALI satar.
   * Bu, oyuncuyu "hangi adada ne fazla" sorusunu sormaya iter - Ikariam
   * ticaretinin ozu budur.
   */
  priceOf(npc: NpcCity, resource: MaterialKey): number {
    const cap = Math.max(1, npcStorageCapacity(npc));
    const stock = (npc.resources[resource] ?? 0) / cap; // 0..1 doluluk
    // Doluluk arttikca fiyat duser.
    const factor = 1.6 - stock * 0.9; // 1.6 (bos) .. 0.7 (dolu)
    return Math.max(1, Math.round(NPC_TRADE_GOLD_PER_UNIT * factor));
  }

  /** Oyuncunun NPC'ye SATISINDA alacagi altin (marj uygulanmis). */
  sellPrice(npc: NpcCity, resource: MaterialKey): number {
    return Math.max(1, Math.round(this.priceOf(npc, resource) / NPC_TRADE_MARGIN));
  }

  /** Oyuncunun NPC'den ALISINDA odeyecegi altin (marj uygulanmis). */
  buyPrice(npc: NpcCity, resource: MaterialKey): number {
    return Math.max(1, Math.round(this.priceOf(npc, resource) * NPC_TRADE_MARGIN));
  }

  /** NPC'de satin alinabilir stok. */
  stockOf(npc: NpcCity, resource: MaterialKey): number {
    return Math.max(0, Math.floor(npc.resources[resource] ?? 0));
  }

  // --- Yaglama sonrasi -----------------------------------------------------

  /** NPC tekrar yagmalanabilir mi? */
  canLoot(npc: NpcCity): boolean {
    if (npc.lootedAtTick === null) return true;
    const elapsed = (this.state.tick - npc.lootedAtTick) * this.state.gameSecondsPerTick;
    return elapsed >= NPC_RECOVERY_GAME_SECONDS;
  }

  /** Yagmalama damgasi koyar. */
  markLooted(npc: NpcCity): void {
    npc.lootedAtTick = this.state.tick;
    npc.relation = Math.max(0, npc.relation - 15);
  }

  /** NPC'nin askeri gucu (arayuzde yildiz gostergesi icin). */
  strengthOf(npc: NpcCity): number {
    const land = npc.garrison.reduce((sum, g) => {
      const stats = getUnit(g.id)?.stats[g.tier];
      return sum + (stats ? stats.hp + stats.damage * 4 : 0) * g.count;
    }, 0);
    const sea = npc.warfleet.reduce((sum, g) => {
      const stats = getShip(g.id)?.stats[g.tier];
      return sum + (stats ? stats.hp + stats.damage * 4 : 0) * g.count;
    }, 0);
    return Math.round(land + sea * 0.8);
  }

  /** Bir adadaki NPC'ler. */
  onIsland(island: IslandState): NpcCity[] {
    return this.state.npcsOnIsland(island.id);
  }

  /** NPC kisa ozeti. */
  summary(npc: NpcCity): {
    powerLevel: number;
    wallLevel: number;
    garrison: number;
    ships: number;
    strength: number;
    wealth: number;
    lootable: boolean;
  } {
    return {
      powerLevel: npc.powerLevel,
      wallLevel: npc.wallLevel,
      garrison: npc.garrison.reduce((s, g) => s + g.count, 0),
      ships: npc.warfleet.reduce((s, g) => s + g.count, 0),
      strength: this.strengthOf(npc),
      wealth: Math.round(this.wealth(npc)),
      lootable: this.canLoot(npc),
    };
  }
}
