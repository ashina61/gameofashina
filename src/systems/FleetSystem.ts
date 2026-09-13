import {
  CARGO_SHIP_CAPACITY,
  FLEET_SECONDS_PER_ISLAND_DISTANCE,
  MAX_LOOT_RATIO,
} from '@/config/Constants';
import { npcStorageCapacity } from './NpcSystem';
import { getShip, transportShip } from '@/config/ShipCatalog';
import { PLAYER_ID } from '@/core/WorldFactory';
import { createPlayerCity } from '@/core/WorldFactory';
import { aggregateEffects } from '@/systems/ResearchEffects';
import { cloneStacks, mergeStacks, subtractStacks, totalStacks } from '@/utils/Stacks';
import { wallLevel as wallLevelOf } from '@/core/CityQuery';
import type {
  CombatSystem,
} from './CombatSystem';
import type { NpcSystem } from './NpcSystem';
import type { EventBus } from '@/core/EventBus';
import type { GameState } from '@/core/GameState';
import type { ResourceSystem } from './ResourceSystem';
import type { WonderSystem } from './WonderSystem';
import type {
  BattleReport,
  CityState,
  Fleet,
  IslandPlot,
  IslandState,
  MaterialKey,
  MissionKind,
  NpcCity,
  ResourceAmounts,
  ShipStack,
  TradeRoute,
  UnitStack,
} from '@/types';

/**
 * Filo, tasima, ticaret ve saldiri.
 *
 * Ikariam'da her sey DENIZDEN gecer. Ayni adadaki iki sehir arasinda bile
 * mal tasimak icin yuk gemisi gerekir; kara yolu yoktur. Bu, Liman ve
 * Tersane binalarini oyunun merkezine koyan ve donanma olmadan hicbir
 * sey yapilamamasini saglayan temel tasarim kararidir.
 *
 * UC GOREV TIPI:
 *   attack    - savas; varista CombatSystem cozulur
 *   transport - oyuncunun kendi sehirlerine kaynak tasima
 *   trade     - NPC tuccariyla alisveris
 *   return    - yukaridaki herhangi birinin donus bacagi
 *
 * YOLCULUK SURESI
 * Adalar arasindaki Chebyshev mesafesiyle orantili, Poseidon harikasi ve
 * denizcilik arastirmalariyla kisalir. Mesafe SIFIR olsa bile (ayni ada)
 * taban bir sure vardir: yukleme/bosaltma isinin kendisi zaman alir ve
 * bu Hermes harikasinin ise yaradigi yerdir.
 */

/** Iki ada arasi karo mesafesi. */
function islandDistance(a: IslandState, b: IslandState): number {
  return Math.max(Math.abs(a.wx - b.wx), Math.abs(a.wy - b.wy));
}

/** Rota devri tamamlandiktan sonraki yukleme bekleme suresi (oyun sn). */
const ROUTE_LOAD_WAIT_SECONDS = 3_600;
/** Gondecek mal olmadiginda yeniden deneme arasi (oyun sn). */
const ROUTE_RETRY_SECONDS = 1_800;

export class FleetSystem {
  constructor(
    private readonly state: GameState,
    private readonly resources: ResourceSystem,
    private readonly wonders: WonderSystem,
    private readonly combat: CombatSystem,
    private readonly npc: NpcSystem,
    private readonly bus: EventBus,
  ) {}

  // --- Kapasite ------------------------------------------------------------

  /** Sehrin toplam nakliye kapasitesi. */
  capacityOf(city: CityState): number {
    return city.cargoShips * CARGO_SHIP_CAPACITY;
  }

  /**
   * Bos kapasite.
   *
   * Yoldaki filolarin gemileri SAYILMAZ: ayni gemiyle iki ayri sevkiyat
   * gondermek, kapasiteyi iki kez harcamak olurdu ve Ikariam'in nakliye
   * darbogazi mekanigini tamamen ortadan kaldirirdi.
   */
  freeCapacity(city: CityState): number {
    const committed = this.state.fleets
      .filter((f) => f.fromCityId === city.id && !f.returning)
      .reduce((sum, f) => sum + f.cargoShips, 0);
    const total = committed + this.routeCommittedShips(city.id);
    return Math.max(0, (city.cargoShips - total) * CARGO_SHIP_CAPACITY);
  }

  /**
   * Rotaya ayrilmis ama henuz yolda olmayan gemiler.
   *
   * Ikariam'da rotaya verilen gemiler BLOKE olur: yukleme beklerken bile
   * baska sevkiyata cikamazlar. Yolda olan rotalarin gemileri zaten filo
   * kaydinda sayildigi icin burada yalnizca bekleyen rotalar eklenir;
   * aksi halde ayni gemi iki kez harcanirdi.
   */
  private routeCommittedShips(cityId: string): number {
    return this.state.tradeRoutes
      .filter(
        (r) => r.fromCityId === cityId && !this.state.fleets.some((f) => f.routeId === r.id),
      )
      .reduce((sum, r) => sum + r.cargoShips, 0);
  }

  /** Filoda kullanilabilir (yolda olmayan) yuk gemisi sayisi. */
  freeCargoShips(city: CityState): number {
    const committed = this.state.fleets
      .filter((f) => f.fromCityId === city.id && !f.returning)
      .reduce((sum, f) => sum + f.cargoShips, 0);
    return Math.max(0, city.cargoShips - committed - this.routeCommittedShips(city.id));
  }

  /** Birlik yiginlarinin kapladigi alan. */
  unitsVolume(units: readonly UnitStack[]): number {
    return units.reduce((sum, stack) => {
      const size = this.combat.unitSize(stack.id);
      return sum + size * stack.count;
    }, 0);
  }

  // --- Yolculuk suresi -----------------------------------------------------

  /**
   * Yolculuk suresi (oyun saniyesi).
   *
   * Ikariam'in gercek formulunde sure, gemi hizina ve mesafeye baglidir.
   * Burada ayni iliski daha sade kurulur: mesafe x taban sure, Poseidon ve
   * denizcilik arastirmalariyla bolunur, Hermes yukleme kismini kisaltir.
   */
  travelTime(fromIslandId: string, toIslandId: string): number {
    const from = this.state.islandOf(fromIslandId);
    const to = this.state.islandOf(toIslandId);
    if (!from || !to) return 0;

    const distance = islandDistance(from, to);
    // Ayni ada icinde bile yukleme/bosaltma vardir; Hermes bunu kisaltir.
    const loadingSeconds = 10 * 60 / (1 + this.wonders.loadingBonus(fromIslandId));
    const sailingSeconds = distance * FLEET_SECONDS_PER_ISLAND_DISTANCE;

    const speed = this.speedMultiplier(fromIslandId);
    return Math.max(1, Math.round(loadingSeconds + sailingSeconds / speed));
  }

  /** Hiz carpani: arastirma x harika. */
  speedMultiplier(islandId: string): number {
    const effects = aggregateEffects(this.state.completedResearch);
    const fromResearch = Math.max(1, effects.shipSpeedMultiplier);
    const fromWonder = 1 + this.wonders.shipSpeedBonus(islandId);
    return fromResearch * fromWonder;
  }

  // --- Sorgular ------------------------------------------------------------

  /** Sehirden gonderilebilir birlikler (yolda olmayanlar). */
  availableUnits(city: CityState): UnitStack[] {
    return cloneStacks(city.garrison).filter((s) => s.count > 0);
  }

  /** Sehirden gonderilebilir savas gemileri. */
  availableShips(city: CityState): ShipStack[] {
    return cloneStacks(city.warfleet).filter((s) => s.count > 0);
  }

  /** Sehirdeki toplam birlik. */
  garrisonCount(city: CityState): number {
    return totalStacks(city.garrison);
  }

  /** Sehirdeki toplam savas gemisi. */
  warfleetCount(city: CityState): number {
    return totalStacks(city.warfleet);
  }

  /** Nakliye gemisi tanimi. */
  get transportId(): string {
    return transportShip().id;
  }

  /** Yoldaki filolar. */
  get fleets(): readonly Fleet[] {
    return this.state.fleets;
  }

  /** Filonun ilerleme orani (0..1). */
  progressOf(fleet: Fleet): number {
    if (fleet.durationGameSeconds <= 0) return 1;
    return Math.min(1, Math.max(0, 1 - fleet.remainingGameSeconds / fleet.durationGameSeconds));
  }

  // --- Saldiri -------------------------------------------------------------

  /** Saldiri gonderme kosullari. */
  canAttack(
    city: CityState,
    targetIslandId: string,
    units: readonly UnitStack[],
    ships: readonly ShipStack[],
  ): string | null {
    const totalUnits = totalStacks(units);
    const warships = ships.filter((s) => getShip(s.id)?.shipClass !== 'transport');
    if (totalUnits <= 0 && warships.length <= 0) return 'Gönderilecek birlik veya gemi seçin.';

    const target = this.state.islandOf(targetIslandId);
    if (!target) return 'Hedef ada bulunamadı.';

    for (const stack of units) {
      if (stack.count <= 0) continue;
      const owned = city.garrison.filter((g) => g.id === stack.id).reduce((s, g) => s + g.count, 0);
      if (owned < stack.count) return 'Yeterli birlik yok.';
    }
    for (const stack of warships) {
      const owned = city.warfleet.filter((g) => g.id === stack.id).reduce((s, g) => s + g.count, 0);
      if (owned < stack.count) return 'Yeterli gemi yok.';
    }

    // Birlikler nakliye gemisi olmadan denizi gecemez.
    const volume = this.unitsVolume(units);
    const capacity = this.freeCargoShips(city) * CARGO_SHIP_CAPACITY;
    if (volume > capacity) {
      return `Birlikler ${volume} alan kaplıyor; ${this.freeCargoShips(city)} boş yük gemisi yalnızca ${capacity} taşır.`;
    }
    return null;
  }

  /** Saldiri filosu gonderir. */
  attack(
    city: CityState,
    targetIslandId: string,
    targetPlot: number,
    units: readonly UnitStack[],
    ships: readonly ShipStack[],
  ): Fleet | null {
    const reason = this.canAttack(city, targetIslandId, units, ships);
    if (reason) {
      this.bus.emit('notice:added', 'Saldırı gönderilemedi', reason, 'error');
      return null;
    }

    const warships = ships.filter((s) => getShip(s.id)?.shipClass !== 'transport' && s.count > 0);
    const sentUnits = units.filter((u) => u.count > 0);
    const volume = this.unitsVolume(sentUnits);
    const transports = Math.ceil(volume / CARGO_SHIP_CAPACITY);

    const fleet = this.makeFleet(city, targetIslandId, null, 'attack', {
      cargoShips: transports,
      units: cloneStacks(sentUnits),
      ships: cloneStacks(warships),
      toPlot: targetPlot,
    });

    // Birlikler ve gemiler sehirden CIKAR; yolda olan birlik sehirde
    // gorunmeye devam ederse ayni birlik iki kez savastirilir.
    subtractStacks(city.garrison, sentUnits);
    subtractStacks(city.warfleet, warships);

    this.state.addFleet(fleet);
    this.bus.emit('fleet:dispatched', fleet);
    return fleet;
  }

  // --- Tasima --------------------------------------------------------------

  /** Tasima kosullari. */
  canTransport(city: CityState, toCityId: string, cargo: ResourceAmounts): string | null {
    const target = this.state.cityOf(toCityId);
    if (!target) return 'Hedef şehir bulunamadı.';

    const total = this.cargoTotal(cargo);
    if (total <= 0) return 'Taşınacak kaynak seçin.';
    if (total > this.freeCapacity(city)) {
      return `Nakliye kapasitesi yetmiyor (${Math.floor(this.freeCapacity(city))} uygun).`;
    }
    for (const key of Object.keys(cargo) as MaterialKey[]) {
      const value = cargo[key] ?? 0;
      if (value <= 0) continue;
      if ((city.resources[key] ?? 0) < value) return `Yeterli ${key} yok.`;
    }
    return null;
  }

  /** Kaynak tasir. */
  transport(city: CityState, toCityId: string, cargo: ResourceAmounts): Fleet | null {
    const reason = this.canTransport(city, toCityId, cargo);
    if (reason) {
      this.bus.emit('notice:added', 'Taşıma gönderilemedi', reason, 'error');
      return null;
    }
    const target = this.state.cityOf(toCityId);
    if (!target) return null;

    // Kaynak gonderimde CIKAR, varista girer. Yol boyunca "yok" olmasi
    // Ikariam'in gercek davranisidir: yagmalanan filo malini kaybeder.
    const payload: ResourceAmounts = {};
    for (const key of Object.keys(cargo) as MaterialKey[]) {
      const value = Math.max(0, Math.floor(cargo[key] ?? 0));
      if (value <= 0) continue;
      this.state.addMaterial(city, key, -value);
      payload[key] = value;
    }

    const total = this.cargoTotal(payload);
    const fleet = this.makeFleet(city, target.islandId, target.id, 'transport', {
      cargoShips: Math.max(1, Math.ceil(total / CARGO_SHIP_CAPACITY)),
      cargo: payload,
      toPlot: target.plot,
    });
    this.state.addFleet(fleet);
    this.bus.emit('resources:changed', city.id);
    this.bus.emit('fleet:dispatched', fleet);
    return fleet;
  }

  // --- Ticaret -------------------------------------------------------------

  /** Ticaret kosullari. */
  canTrade(
    city: CityState,
    npcId: string,
    sell: ResourceAmounts,
    buy: { resource: MaterialKey; amount: number },
  ): string | null {
    const npc = this.state.npcOf(npcId);
    if (!npc) return 'Tüccar bulunamadı.';
    if (!this.state.hasResearch('market')) return 'Önce Pazar araştırmasını tamamlayın.';

    const sellTotal = this.cargoTotal(sell);
    const buyTotal = Math.max(0, Math.floor(buy.amount));
    if (sellTotal <= 0 && buyTotal <= 0) return 'Bir alışveriş seçin.';

    if (sellTotal + buyTotal > this.freeCapacity(city)) return 'Nakliye kapasitesi yetmiyor.';

    for (const key of Object.keys(sell) as MaterialKey[]) {
      const value = sell[key] ?? 0;
      if (value > 0 && (city.resources[key] ?? 0) < value) return `Yeterli ${key} yok.`;
    }
    if (buyTotal > 0) {
      const stock = this.npc.stockOf(npc, buy.resource);
      if (buyTotal > stock) return `Tüccarın deposunda yalnızca ${stock} birim var.`;
      const cost = this.npc.buyPrice(npc, buy.resource) * buyTotal;
      if (cost > this.state.gold) return `Alım için ${Math.ceil(cost)} altın gerekiyor.`;
    }
    return null;
  }

  /** Ticaret filosu gonderir. */
  trade(
    city: CityState,
    npcId: string,
    sell: ResourceAmounts,
    buy: { resource: MaterialKey; amount: number },
  ): Fleet | null {
    const reason = this.canTrade(city, npcId, sell, buy);
    if (reason) {
      this.bus.emit('notice:added', 'Ticaret yapılamadı', reason, 'error');
      return null;
    }
    const npc = this.state.npcOf(npcId);
    if (!npc) return null;

    const payload: ResourceAmounts = {};
    for (const key of Object.keys(sell) as MaterialKey[]) {
      const value = Math.max(0, Math.floor(sell[key] ?? 0));
      if (value <= 0) continue;
      this.state.addMaterial(city, key, -value);
      payload[key] = value;
    }

    const buyTotal = Math.max(0, Math.floor(buy.amount));
    if (buyTotal > 0) {
      const cost = Math.ceil(this.npc.buyPrice(npc, buy.resource) * buyTotal);
      this.state.addGold(-cost);
    }

    const total = this.cargoTotal(payload) + buyTotal;
    const fleet = this.makeFleet(city, npc.islandId, null, 'trade', {
      cargoShips: Math.max(1, Math.ceil(total / CARGO_SHIP_CAPACITY)),
      cargo: payload,
      toPlot: npc.plot,
      tradeBuy: buyTotal > 0 ? { resource: buy.resource, amount: buyTotal } : undefined,
    });
    // Hedef tuccarin kimligi toCityId alaninda tasinir: Fleet tipinde ayri
    // bir "hedef NPC" alani yoktur ve eklemek kayit surumunu gereksiz
    // yere buyuturdu. trade gorevi bu alani oyuncu sehri DEGIL, NPC olarak
    // yorumlar; deliverTrade bunu npcOf ile cozuyor.
    fleet.toCityId = npcId;

    this.state.addFleet(fleet);
    this.bus.emit('resources:changed', city.id);
    this.bus.emit('gold:changed', this.state.gold);
    this.bus.emit('fleet:dispatched', fleet);
    return fleet;
  }

  /** Filoyu geri cagirir. */
  recall(fleetId: string): boolean {
    const fleet = this.state.fleets.find((f) => f.id === fleetId) ?? null;
    if (!fleet || fleet.returning) return false;

    const home = this.state.cityOf(fleet.fromCityId);
    if (!home) return false;

    const elapsed = fleet.durationGameSeconds - fleet.remainingGameSeconds;
    fleet.fromIslandId = fleet.toIslandId;
    fleet.toIslandId = home.islandId;
    fleet.toCityId = home.id;
    fleet.mission = 'return';
    fleet.returning = true;
    fleet.durationGameSeconds = Math.max(1, this.travelTime(fleet.fromIslandId, fleet.toIslandId));
    // Gemi yolu yariya kadar gittiyse donus de o kadar surer.
    fleet.remainingGameSeconds = Math.min(fleet.durationGameSeconds, Math.round(elapsed || fleet.durationGameSeconds));
    return true;
  }

  // --- Ilerleme ------------------------------------------------------------

  /** Filolari ilerletir; varislari cozer. */
  advance(gameSeconds: number): void {
    if (gameSeconds <= 0) return;

    // Cozum sirasinda state.fleets degisir (dönen filo eklenir, varan
    // cikarilir); bu yuzden once kopya uzerinde gezilir.
    for (const fleet of [...this.state.fleets]) {
      fleet.remainingGameSeconds -= gameSeconds;
      if (fleet.remainingGameSeconds > 0) continue;
      fleet.remainingGameSeconds = 0;
      this.state.removeFleet(fleet.id);
      this.arrive(fleet);
    }

    // Kalici ticaret rotalari: filosu yolda olmayan rota sayac isletir ve
    // suresi gelince yeni bir devir firlatir. Bu, Ikariam'in "rota kendi
    // kendine calisir" davranisidir; oyuncunun her devirde tek tek
    // sevkiyat gondermesi gerekmez.
    for (const route of [...this.state.tradeRoutes]) {
      const inTransit = this.state.fleets.some((f) => f.routeId === route.id);
      if (inTransit) continue;
      route.nextDepartureIn -= gameSeconds;
      if (route.nextDepartureIn <= 0) this.departRoute(route);
    }
  }

  // --- Ticaret rotalari ----------------------------------------------------

  /**
   * Yeni kalici rota kurar.
   *
   * @returns hata sebebi; rota kurulduysa null
   */
  createRoute(
    fromCityId: string,
    toCityId: string,
    send: MaterialKey,
    bring: MaterialKey | null,
    cargoShips: number,
  ): string | null {
    const from = this.state.cityOf(fromCityId);
    const to = this.state.cityOf(toCityId);
    if (!from || !to) return 'Şehir bulunamadı.';
    if (fromCityId === toCityId) return 'Rota için iki farklı şehir gerekir.';
    const ships = Math.floor(cargoShips);
    if (ships <= 0) return 'En az bir yük gemisi ayırmalısın.';
    if (ships > this.freeCargoShips(from)) return 'Bu kadar boş yük gemisi yok.';

    const added = this.state.addTradeRoute({
      id: this.state.nextUid('route'),
      fromCityId,
      toCityId,
      send,
      bring,
      cargoShips: ships,
      nextDepartureIn: 0,
      cycles: 0,
      lastHaul: 0,
    });
    if (!added) return 'Bu hat üzerinde zaten bir rota var.';
    this.bus.emit('trade-route:changed', fromCityId);
    return null;
  }

  /** Rotayi kaldirir; yoldaki devir filosu geri cagrilir. */
  cancelRoute(routeId: string): void {
    const route = this.state.tradeRoutes.find((r) => r.id === routeId);
    if (!route) return;
    for (const fleet of this.state.fleets) {
      if (fleet.routeId === routeId && !fleet.returning) this.recall(fleet.id);
    }
    this.state.removeTradeRoute(routeId);
    this.bus.emit('trade-route:changed', route.fromCityId);
  }

  /** Rotanin bir devrini firlatir: malı yukler ve yola cikarir. */
  private departRoute(route: TradeRoute): void {
    const from = this.state.cityOf(route.fromCityId);
    const to = this.state.cityOf(route.toCityId);
    if (!from || !to) {
      // Sehir dusmusse rota anlamini yitirir.
      this.state.removeTradeRoute(route.id);
      return;
    }

    const capacity = route.cargoShips * CARGO_SHIP_CAPACITY;
    const available = Math.floor(from.resources[route.send] ?? 0);
    const amount = Math.min(capacity, available);
    if (amount <= 0) {
      // Gondecek mal yok: rota iptal olmaz, bir sure sonra yeniden dener.
      // Ikariam'da da rota kaynagi kuruyunca bekler, silinmez.
      route.nextDepartureIn = ROUTE_RETRY_SECONDS;
      return;
    }

    this.state.addMaterial(from, route.send, -amount);
    const fleet = this.makeFleet(from, to.islandId, to.id, 'transport', {
      cargoShips: route.cargoShips,
      cargo: { [route.send]: amount },
    });
    fleet.routeId = route.id;
    this.state.addFleet(fleet);
    this.bus.emit('fleet:dispatched', fleet);
    this.bus.emit('resources:changed', from.id);
  }

  /** Varisi goreve gore cozer. */
  private arrive(fleet: Fleet): void {
    switch (fleet.mission) {
      case 'attack': this.resolveAttack(fleet); break;
      case 'transport': this.deliverTransport(fleet); break;
      case 'trade': this.deliverTrade(fleet); break;
      case 'return':
      case 'plunder':
      case 'garrison':
      default: this.deliverReturn(fleet); break;
    }
  }

  /** Tasima teslimi. */
  private deliverTransport(fleet: Fleet): void {
    const target = this.state.cityOf(fleet.toCityId ?? '');
    if (!target) return;

    // Rota devri: teslimattan sonra donus bacagi icin bring mali yuklenir.
    const route = fleet.routeId ? this.state.tradeRoutes.find((r) => r.id === fleet.routeId) : null;

    const capacity = this.resources.storageCapacity(target);
    for (const key of Object.keys(fleet.cargo) as MaterialKey[]) {
      const value = fleet.cargo[key] ?? 0;
      if (value <= 0) continue;
      const room = Math.max(0, capacity - (target.resources[key] ?? 0));
      const accepted = Math.min(value, room);
      if (accepted > 0) this.state.addMaterial(target, key, accepted);
      // Sigmayan kisim DENIZE DOKULUR: Ikariam'da depo doluysa mal
      // kaybolur. Bu, depo yonetimini gercek bir karara donusturur.
      if (value - accepted > 0) this.bus.emit('storage:overflow', target.id, key);
    }
    this.bus.emit('resources:changed', target.id);

    if (route) {
      // Donus yuku: hedef sehrin deposundan, rota kapasitesiyle sinirli.
      const bringCargo: ResourceAmounts = {};
      if (route.bring) {
        const capacity = route.cargoShips * CARGO_SHIP_CAPACITY;
        const available = Math.floor(target.resources[route.bring] ?? 0);
        const taken = Math.min(capacity, available);
        if (taken > 0) {
          this.state.addMaterial(target, route.bring, -taken);
          bringCargo[route.bring] = taken;
          this.bus.emit('resources:changed', target.id);
        }
      }
      // Rota devirleri posta kutusunu doldurmamali: yalnizca tek seferlik
      // nakliyeler bildirim uretir.
      this.startReturn(fleet, bringCargo);
      return;
    }

    this.state.pushNotice({
      atTick: this.state.tick,
      title: 'Nakliye ulaştı',
      body: `${target.name} şehrine teslimat yapıldı.`,
      tone: 'success',
      read: false,
    });
  }

  /** Ticaret teslimi. */
  private deliverTrade(fleet: Fleet): void {
    const npc = this.state.npcOf(fleet.toCityId ?? '');
    if (!npc) return;

    let goldEarned = 0;
    for (const key of Object.keys(fleet.cargo) as MaterialKey[]) {
      const value = fleet.cargo[key] ?? 0;
      if (value <= 0) continue;
      const cap = npcStorageCapacity(npc);
      npc.resources[key] = Math.min(cap, (npc.resources[key] ?? 0) + value);
      goldEarned += value * this.npc.sellPrice(npc, key);
    }
    if (goldEarned > 0) this.state.addGold(Math.floor(goldEarned));

    // Satin alinan mal NPC deposundan duser ve donus bacaginda tasiniyor.
    const bought: ResourceAmounts = {};
    const buy = fleet.tradeBuy;
    if (buy && buy.amount > 0) {
      const taken = Math.min(buy.amount, this.npc.stockOf(npc, buy.resource));
      npc.resources[buy.resource] = Math.max(0, (npc.resources[buy.resource] ?? 0) - taken);
      if (taken > 0) bought[buy.resource] = taken;
    }

    this.bus.emit('gold:changed', this.state.gold);
    this.bus.emit('trade:completed', fleet.fromCityId, { ...fleet.cargo, ...bought });
    this.state.pushNotice({
      atTick: this.state.tick,
      title: 'Ticaret tamamlandı',
      body: `${npc.name} ile alışveriş: ${Math.floor(goldEarned)} altın kazanıldı.`,
      tone: 'success',
      read: false,
    });

    this.startReturn(fleet, bought);
  }

  /** Saldiri varisi: savasi cozer, yagmayi alir, alani isgal eder. */
  private resolveAttack(fleet: Fleet): void {
    const island = this.state.islandOf(fleet.toIslandId);
    const home = this.state.cityOf(fleet.fromCityId);
    if (!island || !home) {
      this.startReturn(fleet, {});
      return;
    }

    const plot = island.plots[this.plotOf(fleet)] ?? null;
    const npc = plot?.ownerId && plot.ownerId !== PLAYER_ID ? this.state.npcOf(plot.ownerId) : null;
    const defenderCity =
      plot?.ownerId === PLAYER_ID
        ? this.state.cities.find((c) => c.islandId === island.id && c.plot === plot.index) ?? null
        : null;

    const outcome = this.combat.resolve({
      attackerName: home.name,
      defenderName: npc?.name ?? defenderCity?.name ?? island.name,
      islandId: island.id,
      attackerUnits: fleet.units,
      defenderUnits: npc ? npc.garrison : (defenderCity?.garrison ?? []),
      attackerShips: fleet.ships,
      defenderShips: npc ? npc.warfleet : (defenderCity?.warfleet ?? []),
      wallLevel: npc?.wallLevel ?? (defenderCity ? wallLevelOf(defenderCity) : 0),
      seed: (this.state.seed ^ Math.round(this.state.gameSeconds) ^ (plot?.index ?? 0)) >>> 0,
      hadesIsland: island.god === 'hades',
    });

    // Savunanin kayiplarini uygula.
    if (npc) {
      subtractStacks(npc.garrison, outcome.defenderLosses);
      subtractStacks(npc.warfleet, outcome.defenderShipLosses);
      npc.wallLevel = Math.max(0, Math.min(npc.wallLevel, outcome.wallLevelLeft));
    } else if (defenderCity) {
      subtractStacks(defenderCity.garrison, outcome.defenderLosses);
      subtractStacks(defenderCity.warfleet, outcome.defenderShipLosses);
      defenderCity.wall.level = Math.max(0, Math.min(defenderCity.wall.level, outcome.wallLevelLeft));
      this.bus.emit('resources:changed', defenderCity.id);
    }

    // Yagma: yalnizca kazanilinca ve depo tavaniyla sinirli.
    const capacity = fleet.cargoShips * CARGO_SHIP_CAPACITY;
    const loot = outcome.attackerWon && npc ? this.lootNpc(npc, capacity) : {};

    // Kazanildiysa alan oyuncuya gecer ve bir koloni kurulur.
    let capturedCity: CityState | null = null;
    if (outcome.attackerWon && npc && plot) {
      capturedCity = this.occupyPlot(island, plot, npc);
    }

    // Saldiranin sag kalanlari ve yagma donus bacaginda geri gelir.
    fleet.units = outcome.attackerSurvivors;
    fleet.ships = outcome.attackerShipSurvivors;
    this.startReturn(fleet, loot);

    const report: BattleReport = {
      id: this.state.nextUid('battle'),
      atTick: this.state.tick,
      attackerName: home.name,
      defenderName: npc?.name ?? defenderCity?.name ?? island.name,
      islandName: island.name,
      cityName: capturedCity?.name ?? home.name,
      won: outcome.attackerWon,
      playerIsAttacker: true,
      rounds: outcome.rounds,
      losses: {
        attacker: outcome.attackerLosses,
        defender: outcome.defenderLosses,
        attackerShips: outcome.attackerShipLosses,
        defenderShips: outcome.defenderShipLosses,
      },
      loot,
      wallDamage: outcome.wallDamage,
      roundLog: outcome.roundLog,
    };
    // Rapor mesaj kutusunda kalici durur: Ikariam'da savas raporu
    // kaybolmaz, oyuncu sonra tekrar acip okuyabilir.
    this.state.pushReport(report);
    this.state.pushNotice({
      atTick: this.state.tick,
      title: outcome.attackerWon ? 'Zafer' : outcome.landingBlocked ? 'Çıkarma engellendi' : 'Yenilgi',
      body: outcome.attackerWon
        ? capturedCity
          ? `${npc?.name ?? 'hedef'} alındı; alan yeni bir koloni oldu.`
          : 'Savaş kazanıldı.'
        : outcome.landingBlocked
          ? 'Deniz üstünlüğü sağlanamadı; birlikler kıyıya çıkamadı.'
          : 'Savaş kaybedildi.',
      tone: outcome.attackerWon ? 'success' : 'error',
      read: false,
    });
    this.bus.emit('battle:resolved', report);
  }

  /** Isgal edilen alana oyuncu sehri kurar. */
  private occupyPlot(island: IslandState, plot: IslandPlot, npc: NpcCity): CityState | null {
    this.state.removeNpc(npc.id);

    const city = createPlayerCity(island.id, plot.index, npc.name);
    city.isCapital = false;
    // Ele gecirilen sehir harabe halinde devralinir: Ikariam'da da
    // isgal edilen koloni sifirdan insa edilir, hazir bir miras degildir.
    city.cargoShips = 0;
    this.state.addCity(city);
    this.state.linkPlot(city);
    return city;
  }

  /** NPC deposundan yagma alir. */
  private lootNpc(npc: NpcCity, capacity: number): ResourceAmounts {
    const loot: ResourceAmounts = {};
    let room = Math.max(0, Math.floor(capacity));
    if (room <= 0) return loot;

    for (const key of ['wood', 'marble', 'wine', 'sulfur', 'crystal'] as MaterialKey[]) {
      const available = Math.floor((npc.resources[key] ?? 0) * MAX_LOOT_RATIO);
      const taken = Math.min(room, available);
      if (taken <= 0) continue;
      npc.resources[key] = Math.max(0, (npc.resources[key] ?? 0) - taken);
      loot[key] = taken;
      room -= taken;
      if (room <= 0) break;
    }
    this.npc.markLooted(npc);
    return loot;
  }

  /** Donus bacagini baslatir. */
  private startReturn(fleet: Fleet, cargo: ResourceAmounts): void {
    const home = this.state.cityOf(fleet.fromCityId);
    if (!home) return;

    // Giden filonun alan kaydi artik gereksiz; birakilsaydi her savasta
    // bir entry birikir ve harita sinirsiz buyurdu.
    this.plotByFleet.delete(fleet.id);

    const returned: Fleet = {
      ...fleet,
      id: this.state.nextUid('fleet'),
      mission: 'return',
      returning: true,
      fromIslandId: fleet.toIslandId,
      toIslandId: home.islandId,
      toCityId: home.id,
      cargo: { ...cargo },
      tradeBuy: undefined,
      startedAtTick: this.state.tick,
      durationGameSeconds: Math.max(1, this.travelTime(fleet.toIslandId, home.islandId)),
    };
    returned.remainingGameSeconds = returned.durationGameSeconds;
    this.state.addFleet(returned);
    this.bus.emit('fleet:returned', returned);
  }

  /** Donus teslimi: birlikler, gemiler ve yagma sehre girer. */
  private deliverReturn(fleet: Fleet): void {
    const city = this.state.cityOf(fleet.toCityId ?? fleet.fromCityId);
    if (!city) return;

    mergeStacks(city.garrison, fleet.units);
    mergeStacks(city.warfleet, fleet.ships);

    const capacity = this.resources.storageCapacity(city);
    for (const key of Object.keys(fleet.cargo) as MaterialKey[]) {
      const value = fleet.cargo[key] ?? 0;
      if (value <= 0) continue;
      const room = Math.max(0, capacity - (city.resources[key] ?? 0));
      const accepted = Math.min(value, room);
      if (accepted > 0) this.state.addMaterial(city, key, accepted);
      if (value - accepted > 0) this.bus.emit('storage:overflow', city.id, key);
    }

    this.bus.emit('resources:changed', city.id);

    // Rota devri tamamlandi: sayac ve istatistik guncellenir, sonraki
    // kalkis icin yukleme suresi islemeye baslar.
    const route = fleet.routeId ? this.state.tradeRoutes.find((r) => r.id === fleet.routeId) : null;
    if (route) {
      route.cycles += 1;
      route.lastHaul = Math.round(this.cargoTotal(fleet.cargo));
      route.nextDepartureIn = ROUTE_LOAD_WAIT_SECONDS;
      this.bus.emit('trade-route:changed', city.id);
    }
  }

  // --- Yardimcilar ---------------------------------------------------------

  /** Toplam kargo miktari. */
  private cargoTotal(cargo: ResourceAmounts): number {
    return Object.values(cargo).reduce((sum, v) => sum + Math.max(0, v ?? 0), 0);
  }

  /** Yeni bir filo kaydi uretir. */
  private makeFleet(
    from: CityState,
    toIslandId: string,
    toCityId: string | null,
    mission: MissionKind,
    options: {
      cargoShips?: number;
      cargo?: ResourceAmounts;
      units?: UnitStack[];
      ships?: ShipStack[];
      tradeBuy?: { resource: MaterialKey; amount: number };
      toPlot?: number;
    } = {},
  ): Fleet {
    const duration = Math.max(1, this.travelTime(from.islandId, toIslandId));
    const fleet: Fleet = {
      id: this.state.nextUid('fleet'),
      ownerId: PLAYER_ID,
      mission,
      fromIslandId: from.islandId,
      fromCityId: from.id,
      toIslandId,
      toCityId,
      units: options.units ?? [],
      ships: options.ships ?? [],
      cargo: options.cargo ?? {},
      cargoShips: options.cargoShips ?? 0,
      durationGameSeconds: duration,
      remainingGameSeconds: duration,
      returning: false,
      startedAtTick: this.state.tick,
    };
    if (options.tradeBuy) fleet.tradeBuy = options.tradeBuy;
    // Hedef alan bilgisi Fleet tipinde yoktur; saldiri ve isgal icin
    // toCityId'nin yani sira ayrica tutulmasi gerekir.
    this.plotByFleet.set(fleet.id, options.toPlot ?? 0);
    return fleet;
  }

  /** Filo kimliginden hedef alan indeksi. */
  private readonly plotByFleet = new Map<string, number>();

  /** Bir filonun hedef alani. */
  plotOf(fleet: Fleet): number {
    return this.plotByFleet.get(fleet.id) ?? 0;
  }

  /** Yuk gemisi insa etme kisayolu. */
  transportShipId(): string {
    return this.transportId;
  }
}
