import Phaser from 'phaser';
import {
  CITY_GROUNDS,
  CITY_PORT,
  CITY_SHIPYARD,
  CITY_SIZE,
  CITY_TOWN_HALL,
  groundCountFor,
} from '@/core/CityLayout';
import { buildingTexture } from '@/render/SpriteFactory';
import { aggregateEffects } from '@/systems/ResearchEffects';
import { IsoScene } from './IsoScene';
import { BUILDINGS, getBuilding } from '@/config/BuildingCatalog';
import type { CityState, CitySlotSelection, PlacedBuilding } from '@/types';

/**
 * Sehrin izometrik gorunumu.
 *
 * Ikariam'in sehir ekrani: merkezde Valilik, sag altta Liman ve Tersane,
 * cevresinde yapi alanlari. Valilik seviyesi arttikca YENI alanlar acilir;
 * kapali alanlar soluk ve kilitli gorunur ki oyuncu "buyudukce yer
 * aciliyor" ilerlemesini gorsun.
 *
 * CIZIM YENIDEN KURULUR, KARE KARE GUNCELLENMEZ
 * Bina sprite'lari yalnizca durum DEGISTIGINDE yeniden cizilir (bir
 * insaat bittiginde, aktif sehir degistiginde). Her karede tum listeyi
 * yeniden kurmak mobilde kare hizini dusururdu; bunun yerine kare
 * dongusu yalnizca sure bazli etiketleri (insaatin kalan suresi) gunceller.
 */

/** Sahnedeki tek bir bina nesnesi ve onun etiketleri. */
interface SlotView {
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  timer: Phaser.GameObjects.Text;
  ground: number;
  buildingId: string;
  kind: CitySlotSelection['kind'];
}

export class CityScene extends IsoScene {
  protected readonly tileWidth = 64;
  protected readonly tileHeight = 32;
  protected readonly backgroundKey = 'tex-water';

  private readonly slots: SlotView[] = [];
  private selection: Phaser.GameObjects.Image | null = null;
  private selected: CitySlotSelection | null = null;
  private city: CityState | null = null;
  private unsubscribe: Array<() => void> = [];

  constructor() {
    super('CityScene');
  }

  create(): void {
    this.setupIso();
    this.city = this.world.activeCity;
    this.build();

    // Durum degisince gorunumu tazele.
    const bus = this.world.bus;
    const refresh = (): void => {
      this.city = this.world.activeCity;
      this.build();
    };
    this.unsubscribe = [
      () => bus.off('construction:completed', refresh),
      () => bus.off('construction:started', refresh),
      () => bus.off('construction:cancelled', refresh),
      () => bus.off('active-city:changed', refresh),
    ];
    bus.on('construction:completed', refresh);
    bus.on('construction:started', refresh);
    bus.on('construction:cancelled', refresh);
    bus.on('active-city:changed', refresh);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.teardown, this);
  }

  /** Sahne kapanirken dinleyicileri birak. */
  private teardown(): void {
    for (const off of this.unsubscribe) off();
    this.unsubscribe = [];
  }

  /** Tum sehri yeniden cizer. */
  private build(): void {
    this.clearSlotViews();
    const city = this.city;
    if (!city) return;

    this.drawGround(city);
    this.drawWall(city);
    this.drawFixed(city);
    this.drawGrounds(city);

    // Kamerayi sehrin merkezine al.
    const center = this.toScreen(CITY_SIZE / 2, CITY_SIZE / 2);
    this.camera2d.centerOn(center.x, center.y, false);
  }

  /** Zemin karolari. */
  private drawGround(city: CityState): void {
    void city;
    const key = this.textures.exists('tex-island') ? 'tex-island' : 'tile-ground';
    for (let gy = 0; gy < CITY_SIZE; gy += 1) {
      for (let gx = 0; gx < CITY_SIZE; gx += 1) {
        const { x, y } = this.toScreen(gx, gy);
        const tile = this.add.image(x, y, key);
        tile.setDisplaySize(this.tileWidth, this.tileHeight);
        tile.setDepth(-100);
        this.art.add(tile);
      }
    }
  }

  /** Sehir surlari: cevreyi izometrik bir cerceve olarak cizer. */
  private drawWall(city: CityState): void {
    if (city.wall.level <= 0) return;
    const strength = Math.min(1, city.wall.level / 20);
    const color = 0xb9a37a;

    const g = this.add.graphics();
    g.lineStyle(6 + strength * 10, color, 0.95);
    const corners: Array<[number, number]> = [
      [-0.5, -0.5],
      [CITY_SIZE - 0.5, -0.5],
      [CITY_SIZE - 0.5, CITY_SIZE - 0.5],
      [-0.5, CITY_SIZE - 0.5],
    ];
    g.beginPath();
    corners.forEach(([gx, gy], index) => {
      const { x, y } = this.toScreen(gx, gy);
      if (index === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    });
    g.closePath();
    g.strokePath();
    g.setDepth(-50);
    this.art.add(g);

    // Sur seviyesi etiketi: Ikariam'da sur gorunur bir savunma bilgisidir.
    const top = this.toScreen(CITY_SIZE / 2, -0.5);
    const label = this.add
      .text(top.x, top.y - 22, `Surlar Sv ${city.wall.level}`, {
        fontSize: '13px',
        color: '#f4e6c4',
        stroke: '#3a2c17',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(900);
    this.art.add(label);
  }

  /** Sabit binalar: Valilik, Liman, Tersane. */
  private drawFixed(city: CityState): void {
    this.addSlot(city.townHall, CITY_TOWN_HALL, 'town_hall', -1);
    this.addSlot(city.harbor.port, CITY_PORT, 'port', -1);
    this.addSlot(city.harbor.shipyard, CITY_SHIPYARD, 'shipyard', -1);
  }

  /** Yapi alanlari: acik, kapali ve kurulmus. */
  private drawGrounds(city: CityState): void {
    const effects = aggregateEffects(this.world.state.completedResearch);
    const open = groundCountFor(city.townHall.level, effects.extraGround);

    CITY_GROUNDS.forEach((point, index) => {
      const placed = city.grounds.find((b) => b.ground === index);
      if (placed) {
        this.addSlot(placed, point, 'ground', index);
        return;
      }
      if (index < open) {
        this.addEmptyPlot(point, index, false);
      } else {
        this.addEmptyPlot(point, index, true);
      }
    });
  }

  /** Bir binayi sahneler. */
  private addSlot(
    building: PlacedBuilding,
    point: { gx: number; gy: number },
    kind: CitySlotSelection['kind'],
    ground: number,
  ): void {
    const def = getBuilding(building.type);
    const level = Math.max(1, building.level);
    const { x, y } = this.toScreen(point.gx, point.gy);

    const container = this.add.container(x, y);
    container.setDepth(point.gx + point.gy);

    const textureKey = def
      ? buildingTexture(this, def, level)
      : 'tile-ground';
    const sprite = this.add.image(0, -6, textureKey);
    sprite.setDisplaySize(this.tileWidth * (def?.size ?? 1), sprite.height * (this.tileWidth / sprite.width) * (def?.size ?? 1));
    container.add(sprite);

    const label = this.add
      .text(0, 12, def ? `${def.name} ${building.level}` : building.type, {
        fontSize: '11px',
        color: '#fff6e0',
        stroke: '#2b2011',
        strokeThickness: 3,
        align: 'center',
      })
      .setOrigin(0.5);
    container.add(label);

    const timer = this.add
      .text(0, 26, '', {
        fontSize: '11px',
        color: '#ffd977',
        stroke: '#2b2011',
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    container.add(timer);

    this.art.add(container);
    this.slots.push({ container, sprite, label, timer, ground, buildingId: building.type, kind });

    // Insaat halindeyse yari saydam gorunur; Ikariam'da da bina insaat
    // boyunca iskelet halinde durur.
    if (building.construction) sprite.setAlpha(0.55);
  }

  /** Bos veya kilitli yapi alani. */
  private addEmptyPlot(point: { gx: number; gy: number }, index: number, locked: boolean): void {
    const { x, y } = this.toScreen(point.gx, point.gy);
    const container = this.add.container(x, y);
    container.setDepth(point.gx + point.gy);

    const marker = this.add.image(0, 0, locked ? 'tile-plot' : 'tile-plot-free');
    marker.setDisplaySize(this.tileWidth * 0.86, this.tileHeight * 0.86);
    marker.setAlpha(locked ? 0.35 : 0.8);
    container.add(marker);

    const caption = this.add
      .text(0, 0, locked ? '🔒' : '+', {
        fontSize: locked ? '13px' : '20px',
        color: locked ? '#8b7c60' : '#fff2cf',
        stroke: '#2b2011',
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    container.add(caption);

    this.art.add(container);
    this.slots.push({
      container,
      sprite: marker,
      label: caption,
      timer: caption,
      ground: index,
      buildingId: '',
      kind: locked ? 'empty' : 'ground',
    });
  }

  /** Onceki gorunumu temizler. */
  private clearSlotViews(): void {
    for (const slot of this.slots) slot.container.destroy();
    this.slots.length = 0;
    this.art.removeAll(true);
    this.selection?.destroy();
    this.selection = null;
  }

  /** Dokunus: hangi karoya denk geldigini bul. */
  protected handleTap(worldX: number, worldY: number): void {
    const city = this.city;
    if (!city) return;

    // En yakin slot'u sec: izometrik karolar ust uste binebildigi icin
    // "dokunulan noktanin tam icinde" testi yerine mesafe testi kullanilir.
    let best: SlotView | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const slot of this.slots) {
      const dx = slot.container.x - worldX;
      const dy = slot.container.y - worldY;
      // Yatay ve dusey eksende farkli olcek: karo genis, alçak.
      const distance = Math.hypot(dx / (this.tileWidth * 0.6), dy / (this.tileHeight * 1.6));
      if (distance < bestDistance) {
        bestDistance = distance;
        best = slot;
      }
    }

    if (!best || bestDistance > 1.15) {
      this.clearSelection();
      return;
    }

    const selection: CitySlotSelection = {
      cityId: city.id,
      kind: best.kind,
      buildingId: best.buildingId,
      ground: best.ground,
    };
    this.selected = selection;
    this.showSelection(best);
    this.world.bus.emit('select:city-slot', selection);
  }

  /** Secim halkasini tasir. */
  private showSelection(slot: SlotView): void {
    if (!this.selection) {
      this.selection = this.add.image(0, 0, 'ring');
      this.selection.setDepth(1000);
      this.art.add(this.selection);
    }
    this.selection.setPosition(slot.container.x, slot.container.y);
    this.selection.setVisible(true);
  }

  private clearSelection(): void {
    this.selected = null;
    this.selection?.setVisible(false);
  }

  /** Gecerli secim (arayuz okur). */
  get currentSelection(): CitySlotSelection | null {
    return this.selected;
  }

  /**
   * Kare basina yalnizca insaat sayaclari guncellenir.
   *
   * Tum sahneyi yeniden cizmek yerine degisen metinleri tazelemek,
   * mobilde kare hizini korumanin en ucuz yoludur.
   */
  override update(time: number, deltaMs: number): void {
    super.update(time, deltaMs);
    const city = this.city;
    if (!city) return;

    for (const slot of this.slots) {
      if (slot.ground < 0 && slot.kind === 'town_hall') {
        this.updateTimer(slot, city.townHall.construction);
      } else if (slot.kind === 'port') {
        this.updateTimer(slot, city.harbor.port.construction);
      } else if (slot.kind === 'shipyard') {
        this.updateTimer(slot, city.harbor.shipyard.construction);
      } else if (slot.ground >= 0) {
        const placed = city.grounds.find((b) => b.ground === slot.ground);
        this.updateTimer(slot, placed?.construction);
      }
    }
  }

  /** Insaat sayaci metnini yazar. */
  private updateTimer(slot: SlotView, task: PlacedBuilding['construction']): void {
    if (!task) {
      if (slot.timer.text !== '') slot.timer.setText('');
      slot.sprite.setAlpha(1);
      return;
    }
    slot.sprite.setAlpha(0.55);
    const minutes = Math.max(0, Math.ceil(task.remainingGameSeconds / 60));
    const text = minutes >= 60
      ? `${Math.floor(minutes / 60)}s ${minutes % 60}dk`
      : `${minutes} dk`;
    if (slot.timer.text !== text) slot.timer.setText(text);
  }

  /** Kurulabilecek binalar (arayuzdeki "yeni bina" listesi icin). */
  static buildableCatalog(): typeof BUILDINGS {
    return BUILDINGS;
  }
}
