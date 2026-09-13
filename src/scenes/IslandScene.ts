import Phaser from 'phaser';
import { ISLAND_GRID_SIZE, ISLAND_PLOT_COUNT } from '@/config/Constants';
import { generateIslandLayout, tileAt, type IslandLayout, type IslandTile } from '@/core/IslandLayout';
import { getGod, wonderLevelFor } from '@/config/IslandCatalog';
import {
  arcSeedOf,
  fleetProgress,
  missionColor,
  missionGlyph,
  pointOnArc,
} from '@/render/FleetVisual';
import { buildingTexture, shipTexture, wonderTexture } from '@/render/SpriteFactory';
import { getShip } from '@/config/ShipCatalog';
import { getBuilding } from '@/config/BuildingCatalog';
import { PLAYER_ID } from '@/core/WorldFactory';
import { hashString } from '@/utils/Rng';
import { IsoScene } from './IsoScene';
import type { Fleet, IslandSlotSelection, IslandState } from '@/types';

/**
 * Ada gorunumu.
 *
 * Ikariam'in en onemli sosyal ekrani: ayni adadaki TUM oyuncular (burada
 * oyuncu + NPC'ler) bu 16 alani paylasir. Ortak hizar ve luks yatagi,
 * tanri tapinagi ve herkesin sehri burada yan yana durur.
 *
 * Bu gorunumun islevi yalnizca estetik degildir; uc karar buradan
 * verilir:
 *   1. Hangi bos alana koloni kurulur
 *   2. Hangi NPC'ye saldirilir veya onunla ticaret yapilir
 *   3. Ortak yataga kim para yatirir
 */

/** Karo turu basina renk tonu (AI dokusu ustune uygulanir). */
const TILE_TINT: Record<IslandTile, number> = {
  water: 0x8fd4e8,
  sand: 0xf2e0b6,
  grass: 0xa8cf7a,
  rock: 0xbfae94,
  plot: 0xe0cfa4,
  deposit: 0xd8c39a,
};

interface PlotView {
  container: Phaser.GameObjects.Container;
  plot: number;
}

/**
 * Ada cevresinde yol alan filo isareti.
 *
 * Ikariam'in ada gorunumunde gemiler adanin cevresindeki suda gorunur:
 * gelen filo kiyiya yaklasir, giden filo aciga uzaklasir. Bizde konum,
 * simulasyonun kalan suresinden her karede yeniden uretilir.
 */
interface FleetMarker {
  fleetId: string;
  container: Phaser.GameObjects.Container;
  eta: Phaser.GameObjects.Text;
}

export class IslandScene extends IsoScene {
  protected readonly tileWidth = 64;
  protected readonly tileHeight = 32;
  protected readonly backgroundKey = 'tex-water';

  private layout: IslandLayout | null = null;
  private island: IslandState | null = null;
  private readonly plotViews: PlotView[] = [];
  private selection: Phaser.GameObjects.Image | null = null;
  private selected: IslandSlotSelection | null = null;
  private readonly fleetMarkers = new Map<string, FleetMarker>();
  private unsubscribe: Array<() => void> = [];

  constructor() {
    super('IslandScene');
  }

  create(data: { islandId?: string } = {}): void {
    this.setupIso();

    const requested = data.islandId;
    const active = this.world.activeCity?.islandId;
    const islandId = requested ?? active ?? this.world.islands[0]?.id;
    this.island = islandId ? this.world.state.islandOf(islandId) : null;

    this.build();

    const bus = this.world.bus;
    const refresh = (): void => this.build();
    bus.on('island:deposit-upgraded', refresh);
    bus.on('colony:founded', refresh);
    bus.on('wonder:activated', refresh);
    bus.on('island:faith-changed', refresh);
    bus.on('battle:resolved', refresh);
    this.unsubscribe = [
      () => bus.off('island:deposit-upgraded', refresh),
      () => bus.off('colony:founded', refresh),
      () => bus.off('wonder:activated', refresh),
      () => bus.off('island:faith-changed', refresh),
      () => bus.off('battle:resolved', refresh),
    ];

    bus.on('fleet:dispatched', this.syncFleets, this);
    bus.on('fleet:returned', this.syncFleets, this);
    this.syncFleets();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      bus.off('fleet:dispatched', this.syncFleets, this);
      bus.off('fleet:returned', this.syncFleets, this);
      this.teardown();
    }, this);
  }

  /** Her kare: filolar suda ilerler. */
  override update(time: number, delta: number): void {
    super.update(time, delta);
    this.moveFleets();
  }

  /** Sahne kapanirken dinleyicileri birak. */
  private teardown(): void {
    for (const off of this.unsubscribe) off();
    this.unsubscribe = [];
  }

  /** Ada verisini degistirir (dunya haritasindan gecis). */
  showIsland(islandId: string): void {
    const island = this.world.state.islandOf(islandId);
    if (!island) return;
    this.island = island;
    this.build();
  }

  private build(): void {
    const island = this.island;
    this.clearViews();
    if (!island) return;

    this.layout = generateIslandLayout(hashString(island.id) ^ this.world.state.seed);
    this.drawTerrain(this.layout);
    this.drawDeposits(island);
    this.drawWonder(island);
    this.drawPlots(island);

    const center = this.toScreen(this.layout.center.gx, this.layout.center.gy);
    this.camera2d.centerOn(center.x, center.y, false);
  }

  /** Ada zemini. */
  private drawTerrain(layout: IslandLayout): void {
    for (let gy = 0; gy < ISLAND_GRID_SIZE; gy += 1) {
      for (let gx = 0; gx < ISLAND_GRID_SIZE; gx += 1) {
        const tile = tileAt(layout, gx, gy);
        if (tile === 'water') continue; // arka plan dokusu zaten su

        const { x, y } = this.toScreen(gx, gy);
        const key = this.textures.exists('tex-island') ? 'tex-island' : 'tile-ground';
        const image = this.add.image(x, y, key);
        image.setDisplaySize(this.tileWidth, this.tileHeight);
        image.setTint(TILE_TINT[tile]);
        image.setDepth(gx + gy - 100);
        this.art.add(image);
      }
    }
  }

  /** Ortak hizar ve luks yatagi. */
  private drawDeposits(island: IslandState): void {
    for (const deposit of [island.wood, island.luxuryDeposit]) {
      const def = getBuilding(deposit.buildingId);
      const { x, y } = this.toScreen(deposit.gx, deposit.gy);
      const container = this.add.container(x, y);
      container.setDepth(deposit.gx + deposit.gy + 10);

      const key = def ? buildingTexture(this, def, deposit.level) : 'deposit-wood';
      const sprite = this.add.image(0, -8, key);
      const scale = this.tileWidth / Math.max(1, sprite.width);
      sprite.setScale(scale * 1.15);
      container.add(sprite);

      const label = this.add
        .text(0, 16, `${def?.name ?? deposit.resource} Sv ${deposit.level}`, {
          fontSize: '11px',
          color: '#fff6e0',
          stroke: '#2b2011',
          strokeThickness: 3,
        })
        .setOrigin(0.5);
      container.add(label);

      if (deposit.construction) {
        sprite.setAlpha(0.55);
        const timer = this.add
          .text(0, 30, 'yükseltiliyor', {
            fontSize: '10px',
            color: '#ffd977',
            stroke: '#2b2011',
            strokeThickness: 3,
          })
          .setOrigin(0.5);
        container.add(timer);
      }

      this.art.add(container);
    }
  }

  /** Tanri tapinagi / harika. */
  private drawWonder(island: IslandState): void {
    if (!this.layout) return;
    const god = getGod(island.god);
    const level = wonderLevelFor(island.faith);
    const { x, y } = this.toScreen(this.layout.wonder.gx, this.layout.wonder.gy);

    const container = this.add.container(x, y);
    container.setDepth(this.layout.wonder.gx + this.layout.wonder.gy + 20);

    const sprite = this.add.image(0, -20, wonderTexture(this, island.god, god.tint));
    sprite.setScale((this.tileWidth * 1.6) / sprite.width);
    // Inanc seviyesi dusukse tapinak soluk durur: gorsel olarak
    // "bagis yap, guclensin" mesaji verir.
    sprite.setAlpha(level <= 0 ? 0.45 : 0.6 + level * 0.08);
    container.add(sprite);

    const label = this.add
      .text(0, 22, `${god.wonderName}  •  İnanç %${Math.round(island.faith)}`, {
        fontSize: '12px',
        color: '#ffe9b0',
        stroke: '#2b2011',
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    container.add(label);

    if (this.world.systems.wonders.isActive(island.id)) {
      const aura = this.add.image(0, 6, 'ring');
      aura.setScale(1.6);
      aura.setAlpha(0.8);
      container.add(aura);
    }

    this.art.add(container);
  }

  /** 16 sehr alani. */
  private drawPlots(island: IslandState): void {
    for (let index = 0; index < ISLAND_PLOT_COUNT; index += 1) {
      const plot = island.plots[index];
      const point = this.layout?.plots[index] ?? { gx: 0, gy: 0 };
      const { x, y } = this.toScreen(point.gx, point.gy);

      const container = this.add.container(x, y);
      container.setDepth(point.gx + point.gy + 5);

      const marker = this.add.image(0, 0, 'tile-plot-free');
      marker.setDisplaySize(this.tileWidth * 0.9, this.tileHeight * 0.9);
      marker.setAlpha(0.55);
      container.add(marker);

      if (plot.ownerId === PLAYER_ID && plot.cityId) {
        const city = this.world.state.cityOf(plot.cityId);
        if (city) {
          const def = getBuilding('town_hall');
          const key = def ? buildingTexture(this, def, city.townHall.level) : 'tile-plot';
          const sprite = this.add.image(0, -10, key);
          sprite.setScale((this.tileWidth * 1.2) / sprite.width);
          container.add(sprite);

          const name = this.add
            .text(0, 14, city.name, {
              fontSize: '12px',
              color: '#c9f5c0',
              stroke: '#1c2a16',
              strokeThickness: 3,
            })
            .setOrigin(0.5);
          container.add(name);
          this.addHarborRow(container, city.warfleet.map((u) => ({ id: u.id, count: u.count })), city.cargoShips, 26);
        }
      } else if (plot.ownerId) {
        const npc = this.world.state.npcOf(plot.ownerId);
        if (npc) {
          const sprite = this.add.image(0, -8, 'building:town_hall:1');
          sprite.setScale((this.tileWidth * 1.05) / sprite.width);
          sprite.setTint(npc.kind === 'barbarian' ? 0xb06a4a : 0xc98a8a);
          container.add(sprite);

          const name = this.add
            .text(0, 14, `${npc.name} (${npc.powerLevel})`, {
              fontSize: '11px',
              color: '#ffd7c2',
              stroke: '#2b1411',
              strokeThickness: 3,
            })
            .setOrigin(0.5);
          container.add(name);
          // NPC limani: Ikariam'da rakibin donanmasi adada gorulur; bu
          // gorunurluk "kimin suyu tutdugu" sorusunu haritadan okutur.
          this.addHarborRow(container, npc.warfleet.map((u) => ({ id: u.id, count: u.count })), 0, 26);
        }
      } else {
        const caption = this.add
          .text(0, 0, `${index + 1}`, {
            fontSize: '13px',
            color: '#fff2cf',
            stroke: '#2b2011',
            strokeThickness: 3,
          })
          .setOrigin(0.5);
        container.add(caption);
      }

      this.art.add(container);
      this.plotViews.push({ container, plot: index });
    }
  }

  /**
   * Liman rozet satiri: savas gemileri sprite, yuk gemileri sayi.
   *
   * Ikariam'da sehrin limaninda demirli gemiler gorulur. Ada olceginde
   * tam sprite sirasi kalabalik yapacagi icin en buyuk iki savas gemisi
   * sprite, kalani ve yuk gemileri kisa bir rozet olarak gosterilir.
   */
  private addHarborRow(
    container: Phaser.GameObjects.Container,
    warfleet: { id: string; count: number }[],
    cargoShips: number,
    offsetY: number,
  ): void {
    const stacks = warfleet.filter((w) => w.count > 0).sort((a, b) => b.count - a.count);
    if (stacks.length === 0 && cargoShips <= 0) return;

    const row = this.add.container(0, offsetY);
    let cursor = -Math.min(stacks.length, 2) * 11;

    for (const stack of stacks.slice(0, 2)) {
      const def = getShip(stack.id);
      if (!def) continue;
      const sprite = this.add.image(cursor, 0, shipTexture(this, def));
      sprite.setScale(22 / sprite.width);
      row.add(sprite);
      if (stack.count > 1) {
        const count = this.add
          .text(cursor + 10, 4, `${stack.count}`, { fontSize: '9px', color: '#fff6e0', stroke: '#2b2011', strokeThickness: 2 })
          .setOrigin(0.5);
        row.add(count);
      }
      cursor += 24;
    }
    if (stacks.length > 2) {
      const more = this.add
        .text(cursor, 0, `+${stacks.length - 2}`, { fontSize: '9px', color: '#fff6e0', stroke: '#2b2011', strokeThickness: 2 })
        .setOrigin(0.5);
      row.add(more);
      cursor += 18;
    }
    if (cargoShips > 0) {
      const cargo = this.add
        .text(cursor + 4, 0, `📦${cargoShips}`, { fontSize: '9px', color: '#ffe9a8', stroke: '#2b2011', strokeThickness: 2 })
        .setOrigin(0, 0.5);
      row.add(cargo);
    }
    container.add(row);
  }

  private clearViews(): void {
    this.plotViews.length = 0;
    this.art.removeAll(true);
    for (const marker of this.fleetMarkers.values()) marker.container.destroy();
    this.fleetMarkers.clear();
    this.selection?.destroy();
    this.selection = null;
  }

  // --- Filolar -------------------------------------------------------------

  /**
   * Filonun bu adadaki kiyi noktası ve acik deniz capasi.
   *
   * Kiyi noktasi, filonun isinin oldugu alandir: gelen saldiri/nakliye
   * hedef alana, eve donen filo kendi sehrinin alanina yaklasir. Acik
   * deniz capasi ada merkezinden deterministic bir acida durur ki ayni
   * adaya gelen filolar tek bir noktadan yigilmasin.
   */
  private fleetShorePoints(fleet: Fleet): { shore: { x: number; y: number }; sea: { x: number; y: number } } | null {
    const island = this.island;
    if (!island || !this.layout) return null;

    const incoming = fleet.toIslandId === island.id && !fleet.returning;
    const incomingHome = fleet.fromIslandId === island.id && fleet.returning;
    const leaving = fleet.fromIslandId === island.id && !fleet.returning;
    const leavingBack = fleet.toIslandId === island.id && fleet.returning;
    if (!incoming && !incomingHome && !leaving && !leavingBack) return null;

    let plotIndex = -1;
    if (incoming || leavingBack) plotIndex = this.world.systems.fleet.plotOf(fleet);
    else {
      const home = this.world.state.cityOf(fleet.fromCityId);
      plotIndex = home ? home.plot : -1;
    }
    const point = this.layout.plots[plotIndex] ?? this.layout.center;
    const shore = this.toScreen(point.gx, point.gy);

    // Acik deniz: ada merkezine gore deterministik aci, yarıcap sabit.
    const angle = (arcSeedOf(fleet.id) % 360) * (Math.PI / 180);
    const center = this.toScreen(this.layout.center.gx, this.layout.center.gy);
    const radius = this.tileWidth * ISLAND_GRID_SIZE * 0.62;
    const sea = { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius * 0.5 };

    // Gelen/evine donen filo aciktan kiyiya; giden filo kiyidan aciga.
    const from = incoming || incomingHome ? sea : shore;
    const to = incoming || incomingHome ? shore : sea;
    return { shore: from, sea: to };
  }

  /** Yeni filolari ekler, adadan ayrilanlari siler. */
  private syncFleets(): void {
    const island = this.island;
    if (!island) return;

    const alive = new Set<string>();
    for (const fleet of this.world.state.fleets) {
      const points = this.fleetShorePoints(fleet);
      if (!points) continue;
      alive.add(fleet.id);
      if (!this.fleetMarkers.has(fleet.id)) {
        this.fleetMarkers.set(fleet.id, this.makeFleetMarker(fleet));
      }
    }
    for (const [id, marker] of [...this.fleetMarkers]) {
      if (alive.has(id)) continue;
      marker.container.destroy();
      this.fleetMarkers.delete(id);
    }
    this.moveFleets();
  }

  private makeFleetMarker(fleet: Fleet): FleetMarker {
    const color = missionColor(fleet.mission);
    const container = this.add.container(0, 0);
    container.setDepth(960);

    const wake = this.add.ellipse(0, 4, 34, 12, 0xffffff, 0.25);
    container.add(wake);
    const hull = this.add.circle(0, 0, 11, color, 0.9);
    hull.setStrokeStyle(2, 0xfff6e0, 0.9);
    container.add(hull);
    const glyph = this.add.text(0, 0, missionGlyph(fleet.mission), { fontSize: '12px' }).setOrigin(0.5);
    container.add(glyph);
    const eta = this.add
      .text(0, 17, '', { fontSize: '9px', color: '#fff6e0', stroke: '#2b2011', strokeThickness: 3 })
      .setOrigin(0.5);
    container.add(eta);

    this.art.add(container);
    return { fleetId: fleet.id, container, eta };
  }

  private moveFleets(): void {
    for (const fleet of this.world.state.fleets) {
      const marker = this.fleetMarkers.get(fleet.id);
      if (!marker) continue;
      const points = this.fleetShorePoints(fleet);
      if (!points) continue;
      const pos = pointOnArc(points.shore, points.sea, fleetProgress(fleet), arcSeedOf(fleet.id));
      marker.container.setPosition(pos.x, pos.y);
      const seconds = Math.ceil(fleet.remainingGameSeconds / Math.max(1, this.world.timeScale));
      if (marker.eta.getData('s') !== seconds) {
        marker.eta.setData('s', seconds);
        marker.eta.setText(seconds <= 0 ? 'varıyor' : `≈${seconds} sn`);
      }
    }
  }

  /** Dokunus: en yakin alani sec. */
  protected handleTap(worldX: number, worldY: number): void {
    const island = this.island;
    if (!island || !this.layout) return;

    // Suda duran filo, altindaki alandan ONCE secilir.
    for (const marker of this.fleetMarkers.values()) {
      if (Math.hypot(marker.container.x - worldX, marker.container.y - worldY) < 26) {
        this.world.bus.emit('select:fleet', marker.fleetId);
        return;
      }
    }

    let best: PlotView | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const view of this.plotViews) {
      const dx = view.container.x - worldX;
      const dy = view.container.y - worldY;
      const distance = Math.hypot(dx / (this.tileWidth * 0.55), dy / (this.tileHeight * 1.5));
      if (distance < bestDistance) {
        bestDistance = distance;
        best = view;
      }
    }

    if (!best || bestDistance > 1.2) {
      this.selected = null;
      this.selection?.setVisible(false);
      return;
    }

    this.selected = { islandId: island.id, plot: best.plot, kind: 'plot' };
    if (!this.selection) {
      this.selection = this.add.image(0, 0, 'ring');
      this.selection.setDepth(1000);
      this.art.add(this.selection);
    }
    this.selection.setPosition(best.container.x, best.container.y);
    this.selection.setVisible(true);
    this.world.bus.emit('select:island-slot', this.selected);
  }

  get currentSelection(): IslandSlotSelection | null {
    return this.selected;
  }

  /** Gosterilen ada. */
  get shownIsland(): IslandState | null {
    return this.island;
  }

}
