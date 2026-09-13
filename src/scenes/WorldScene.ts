import Phaser from 'phaser';
import { WORLD_GRID } from '@/config/Constants';
import { getGod } from '@/config/IslandCatalog';
import {
  arcSeedOf,
  fleetProgress,
  missionColor,
  missionGlyph,
  pointOnArc,
} from '@/render/FleetVisual';
import { wonderTexture } from '@/render/SpriteFactory';
import { PLAYER_ID } from '@/core/WorldFactory';
import { IsoScene } from './IsoScene';
import type { Fleet, IslandState, WorldSlotSelection } from '@/types';

/**
 * Dunya haritasi.
 *
 * Ikariam'da dunya, koordinatlar üzerine dizilmis adalardan olusur. Bu
 * gorunumun islevi uc seydir:
 *   1. Koloni kurulacak yeni ada bulmak
 *   2. Ticaret/saldiri icin hedef secmek
 *   3. Hangi adada hangi tanrinin oldugunu gormek (harika etkisi ada
 *      bazlidir, bu yuzden "Poseidon adasi nerede" stratejik bir sorudur)
 *
 * Adalar (wx, wy) koordinatlarina yerlestirilir ve Izgara buyuklugu
 * WORLD_GRID'dir. Mesafe Chebyshev oldugu icin yolculuk suresi de bu
 * yerlesimden dogrudan okunur.
 */

/** Ada dugumu gorunumu. */
interface IslandNode {
  container: Phaser.GameObjects.Container;
  island: IslandState;
}

/**
 * Haritada yol alan tek bir filonun gorunumu.
 *
 * Ikariam'in dunya haritasinda gemiler iki ada arasinda GERCEKTEN yol
 * alır; bizde konum her karede simulasyonun `remainingGameSeconds`
 * degerinden turetilir. Rota cizgisi (noktali) yalnızca filo var
 * oldugu surede yasayan statik bir objedir; hareket eden kisim
 * `container`'dir.
 */
interface FleetMarker {
  fleetId: string;
  container: Phaser.GameObjects.Container;
  route: Phaser.GameObjects.Graphics;
  glyph: Phaser.GameObjects.Text;
  eta: Phaser.GameObjects.Text;
}

/** Bir dunya karosunun ekran olcusu. */
const NODE_SPACING_X = 220;
const NODE_SPACING_Y = 130;

export class WorldScene extends IsoScene {
  protected readonly tileWidth = NODE_SPACING_X;
  protected readonly tileHeight = NODE_SPACING_Y;
  protected readonly backgroundKey = 'tex-water';

  private readonly nodes: IslandNode[] = [];
  private readonly fleetMarkers = new Map<string, FleetMarker>();
  private selection: Phaser.GameObjects.Image | null = null;
  private selected: WorldSlotSelection | null = null;

  constructor() {
    super('WorldScene');
  }

  create(): void {
    this.setupIso();
    this.build();

    const bus = this.world.bus;
    // Filo listesi degistiginde isaretler yeniden esitlenir; kare kare
    // hareket icin ayrica update() icinde konumlar tazelenir.
    bus.on('fleet:dispatched', this.syncFleets, this);
    bus.on('fleet:returned', this.syncFleets, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      bus.off('fleet:dispatched', this.syncFleets, this);
      bus.off('fleet:returned', this.syncFleets, this);
    });
  }

  /** Her kare: filolar yoluna devam eder. */
  override update(time: number, delta: number): void {
    super.update(time, delta);
    this.moveFleets();
  }

  private build(): void {
    this.nodes.length = 0;
    this.art.removeAll(true);
    for (const marker of this.fleetMarkers.values()) {
      marker.route.destroy();
      marker.container.destroy();
    }
    this.fleetMarkers.clear();
    this.selection?.destroy();
    this.selection = null;

    for (const island of this.world.islands) {
      this.nodes.push(this.drawIsland(island));
    }

    const active = this.world.activeCity;
    const home = active ? this.world.state.islandOf(active.islandId) : this.world.islands[0];
    if (home) {
      const { x, y } = this.nodePosition(home);
      this.camera2d.centerOn(x, y, false);
    }

    this.syncFleets();
  }

  // --- Filolar -------------------------------------------------------------

  /**
   * Filonun gidis/ donus bacagina gore uc ve varis ada konumlari.
   *
   * Donus bacaginda yon tersine cevirilir: filo hedef adadan evine
   * dogru yol alır. Bu, Ikariam'daki "gemiler geri donuyor" goruntusudur.
   */
  private fleetEndpoints(fleet: Fleet): { from: { x: number; y: number }; to: { x: number; y: number } } | null {
    const a = this.world.state.islandOf(fleet.returning ? fleet.toIslandId : fleet.fromIslandId);
    const b = this.world.state.islandOf(fleet.returning ? fleet.fromIslandId : fleet.toIslandId);
    if (!a || !b) return null;
    return { from: this.nodePosition(a), to: this.nodePosition(b) };
  }

  /** Yeni filolari ekler, varanlari siler. */
  private syncFleets(): void {
    const alive = new Set<string>();

    for (const fleet of this.world.state.fleets) {
      alive.add(fleet.id);
      const endpoints = this.fleetEndpoints(fleet);
      if (!endpoints) continue;

      let marker = this.fleetMarkers.get(fleet.id);
      if (!marker) {
        marker = this.makeFleetMarker(fleet, endpoints);
        this.fleetMarkers.set(fleet.id, marker);
      }
    }

    for (const [id, marker] of [...this.fleetMarkers]) {
      if (alive.has(id)) continue;
      marker.route.destroy();
      marker.container.destroy();
      this.fleetMarkers.delete(id);
    }

    this.moveFleets();
  }

  /** Tek filo isareti uretir: noktali rota + gemi simgesi + ETA. */
  private makeFleetMarker(
    fleet: Fleet,
    endpoints: { from: { x: number; y: number }; to: { x: number; y: number } },
  ): FleetMarker {
    const color = missionColor(fleet.mission);

    const route = this.add.graphics();
    route.lineStyle(2, color, 0.4);
    // Noktali rota: kisa cizgi parcalari. Phaser'da dogrudan dash yok;
    // hat boyunca küçük adimlarla cizmek ayni goruntuyu verir.
    const steps = 26;
    for (let i = 0; i < steps; i += 1) {
      const t0 = i / steps;
      const t1 = t0 + 0.45 / steps;
      const p0 = pointOnArc(endpoints.from, endpoints.to, t0, arcSeedOf(fleet.id));
      const p1 = pointOnArc(endpoints.from, endpoints.to, t1, arcSeedOf(fleet.id));
      route.lineBetween(p0.x, p0.y, p1.x, p1.y);
    }
    route.setDepth(940);
    this.art.add(route);

    const container = this.add.container(0, 0);
    container.setDepth(950);

    const halo = this.add.circle(0, 0, 15, color, 0.85);
    halo.setStrokeStyle(2, 0xfff6e0, 0.9);
    container.add(halo);

    const glyph = this.add.text(0, 0, missionGlyph(fleet.mission), { fontSize: '15px' }).setOrigin(0.5);
    container.add(glyph);

    const eta = this.add
      .text(0, 22, '', {
        fontSize: '10px',
        color: '#fff6e0',
        stroke: '#2b2011',
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    container.add(eta);

    this.art.add(container);
    return { fleetId: fleet.id, container, route, glyph, eta };
  }

  /** Her kare cagirilir: isaretleri simulasyonun verdigi konuma tasir. */
  private moveFleets(): void {
    for (const fleet of this.world.state.fleets) {
      const marker = this.fleetMarkers.get(fleet.id);
      if (!marker) continue;
      const endpoints = this.fleetEndpoints(fleet);
      if (!endpoints) continue;

      const progress = fleetProgress(fleet);
      const pos = pointOnArc(endpoints.from, endpoints.to, progress, arcSeedOf(fleet.id));
      marker.container.setPosition(pos.x, pos.y);

      // ETA metnini her kare yazmak gereksiz; saniyede bir tazele.
      const seconds = Math.ceil(fleet.remainingGameSeconds / Math.max(1, this.world.timeScale));
      if (marker.eta.getData('s') !== seconds) {
        marker.eta.setData('s', seconds);
        marker.eta.setText(seconds <= 0 ? 'varıyor' : `≈${seconds} sn`);
      }
    }
  }

  /** Adanin haritadaki konumu. */
  private nodePosition(island: IslandState): { x: number; y: number } {
    // Izgara merkezlenir; negatif koordinatlar ekran disina cikmasin.
    const offset = Math.floor(WORLD_GRID / 2);
    const gx = island.wx + offset;
    const gy = island.wy + offset;
    return {
      x: gx * NODE_SPACING_X,
      y: gy * NODE_SPACING_Y,
    };
  }

  /** Tek bir ada dugumu cizer. */
  private drawIsland(island: IslandState): IslandNode {
    const { x, y } = this.nodePosition(island);
    const container = this.add.container(x, y);
    container.setDepth(island.wx + island.wy);

    const god = getGod(island.god);

    // Ada govdesi
    const body = this.add.image(0, 0, this.textures.exists('tex-island') ? 'tex-island' : 'tile-ground');
    body.setDisplaySize(150, 92);
    body.setTint(0xd9c79c);
    container.add(body);

    const outline = this.add.graphics();
    outline.lineStyle(2, 0x6b563a, 0.7);
    outline.strokeEllipse(0, 0, 150, 92);
    container.add(outline);

    // Oyuncu sehri varsa yesil isaret, NPC varsa kirmizi.
    const playerCities = this.world.state.playerCitiesOnIsland(island.id);
    const npcs = this.world.state.npcsOnIsland(island.id);

    const sprite = this.add.image(0, -14, wonderTexture(this, island.god, god.tint));
    sprite.setScale(64 / sprite.width);
    sprite.setAlpha(this.world.systems.wonders.levelOf(island.id) > 0 ? 1 : 0.5);
    container.add(sprite);

    const name = this.add
      .text(0, 34, island.name, {
        fontSize: '13px',
        color: '#fff6e0',
        stroke: '#2b2011',
        strokeThickness: 4,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    container.add(name);

    const badges: string[] = [];
    if (playerCities.length > 0) badges.push(`${playerCities.length} koloni`);
    if (npcs.length > 0) badges.push(`${npcs.length} yerleşim`);
    badges.push(`${god.name} %${Math.round(island.faith)}`);

    const badge = this.add
      .text(0, 50, badges.join('  •  '), {
        fontSize: '10px',
        color: playerCities.length > 0 ? '#c9f5c0' : '#e8d9b8',
        stroke: '#2b2011',
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    container.add(badge);

    // Oyuncunun adasi vurgulanir. Halka EN SON eklenir ki ada govdesinin
    // ve etiketlerin ustunde dursun.
    if (playerCities.some((c) => c.ownerId === PLAYER_ID)) {
      const ring = this.add.image(0, 0, 'ring');
      ring.setScale(2.1);
      ring.setAlpha(0.55);
      container.add(ring);
    }

    this.art.add(container);
    return { container, island };
  }

  /** Dokunus: en yakin ada dugumu. */
  protected handleTap(worldX: number, worldY: number): void {
    // Hareket eden filolar adalardan ONCE denenir: uzerlerinden gecen
    // bir dokunus ada secmemeli, filonun kendi sayfasini acmali.
    for (const marker of this.fleetMarkers.values()) {
      const dx = marker.container.x - worldX;
      const dy = marker.container.y - worldY;
      if (Math.hypot(dx, dy) < 30) {
        this.world.bus.emit('select:fleet', marker.fleetId);
        return;
      }
    }

    let best: IslandNode | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const node of this.nodes) {
      const dx = node.container.x - worldX;
      const dy = node.container.y - worldY;
      const distance = Math.hypot(dx / 80, dy / 52);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = node;
      }
    }

    if (!best || bestDistance > 1) {
      this.selected = null;
      this.selection?.setVisible(false);
      return;
    }

    this.selected = { islandId: best.island.id };
    if (!this.selection) {
      this.selection = this.add.image(0, 0, 'ring');
      this.selection.setScale(2.3);
      this.selection.setDepth(1000);
      this.art.add(this.selection);
    }
    this.selection.setPosition(best.container.x, best.container.y);
    this.selection.setVisible(true);
    this.world.bus.emit('select:world-island', this.selected);
  }

  get currentSelection(): WorldSlotSelection | null {
    return this.selected;
  }
}
