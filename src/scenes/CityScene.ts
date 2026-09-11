import Phaser from 'phaser';
import {
  GRID_SIZE,
  INITIAL_VISIBLE_TILES,
  MIN_ZOOM,
  SceneKeys,
  TILE_HEIGHT,
  TILE_WIDTH,
  TextureKeys,
} from '@/config/Constants';
import { allBuildings, getBuilding } from '@/config/BuildingCatalog';
import { CameraController } from '@/input/CameraController';
import { BuildingView } from '@/render/BuildingView';
import { PlacementPreview } from '@/render/PlacementPreview';
import { TERRAIN_TEXTURE, TILE_ORIGIN_Y } from '@/render/TextureFactory';
import { PLACEMENT_MESSAGES } from '@/systems/BuildingSystem';
import { UPGRADE_MESSAGES } from '@/systems/UpgradeSystem';
import { constructionProgress } from '@/systems/BuildingResolver';
import { depthFor, gridToWorld, worldToGrid } from '@/utils/IsoUtils';
import { getResolution, getWorld } from './BootScene';
import type { UIScene } from './UIScene';
import type { ResolutionManager } from '@/render/ResolutionManager';
import type { GameWorld } from '@/core/GameWorld';
import type { BuildingId, BuildingInstance, ConstructionTask, TileData } from '@/types';

/**
 * Sehir sahnesi: izgarayi ve binalari cizer, dokunmatik girdiyi yorumlar.
 *
 * Sahne bir "gorunum" katmanidir - oyun kurallarini bilmez, kararlari
 * GameWorld icindeki sistemlere birakir ve sonuclari ekrana yansitir.
 */
export class CityScene extends Phaser.Scene {
  private world!: GameWorld;
  private camControl!: CameraController;
  private preview!: PlacementPreview;

  /** Bina uid -> gorsel eslemesi. */
  private readonly views = new Map<string, BuildingView>();

  /**
   * Yalnizca insaat/yukseltme SUREN binalarin gorselleri.
   *
   * Her karede tum sehir taranmaz; bu kume genellikle bostur ve doluyken bile
   * yalnizca devam eden is sayisi kadar elemani vardir. Kume, construction
   * olaylariyla dolar ve bosalir.
   */
  private readonly activeConstructionViews = new Map<string, BuildingView>();

  /** Cozunurluk yoneticisi; yoksa mantiksal olcu Phaser'dan okunur (dpr 1). */
  private resolution: ResolutionManager | null = null;

  /**
   * Secim isaretleri. Tek karo yerine secilen binanin tum ayak izini kaplar;
   * 2x2 bir binada yalnizca dokunulan karonun isaretlenmesi kafa karistiriyordu.
   * Havuzlanir: en buyuk bina boyutu kadar isaret bir kez olusturulur.
   */
  private readonly selectionMarkers: Phaser.GameObjects.Image[] = [];
  private selectedTile: TileData | null = null;

  /** Insa modunda secili bina turu; mod kapaliysa null. */
  private placingId: BuildingId | null = null;
  private lastPreviewCell = { gx: -1, gy: -1 };

  constructor() {
    super(SceneKeys.City);
  }

  create(): void {
    this.world = getWorld(this);
    this.resolution = getResolution(this);

    this.drawTerrain();
    this.createSelectionMarker();
    this.preview = new PlacementPreview(this);
    this.setupCamera();
    this.spawnExistingBuildings();
    this.bindWorldEvents();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.teardown, this);
  }

  override update(_time: number, delta: number): void {
    this.world.update(delta);
    this.camControl.update(delta);
    this.updateActiveConstructionBars();
  }

  // --- Kurulum -------------------------------------------------------------

  /** Zemin karolarini tek seferde cizer; karolar statik oldugu icin yeniden cizilmez. */
  private drawTerrain(): void {
    for (const tile of this.world.state.grid.allTiles()) {
      const world = gridToWorld(tile.gx, tile.gy);
      this.add
        .image(world.x, world.y, TERRAIN_TEXTURE[tile.terrain])
        .setOrigin(0.5, TILE_ORIGIN_Y)
        .setDepth(depthFor(tile.gx, tile.gy) - 5);
    }
  }

  private createSelectionMarker(): void {
    const maxSize = Math.max(...allBuildings().map((def) => def.size));
    for (let i = 0; i < maxSize * maxSize; i += 1) {
      this.selectionMarkers.push(
        this.add.image(0, 0, TextureKeys.TileHighlight).setOrigin(0.5, 0.5).setVisible(false),
      );
    }
  }

  /**
   * Secim isaretlerini verilen alana yerlestirir.
   *
   * Isaretler bina sprite'inin USTUNE cizilir: zemin seviyesinde birakildiginda
   * cok karolu bir binanin isaretlerinin cogu binanin kendisi tarafindan
   * ortuluyor ve secim okunmuyordu. Dusuk alfa ile bina yine gorunur kalir.
   */
  private showSelection(gx: number, gy: number, size: number): void {
    // Ayak izinin en on karosunun uzerinde kalacak bir derinlik.
    const depth = depthFor(gx, gy, size) + 5;
    let index = 0;
    for (let dy = 0; dy < size; dy += 1) {
      for (let dx = 0; dx < size; dx += 1) {
        const marker = this.selectionMarkers[index];
        index += 1;
        if (!marker) continue;
        const world = gridToWorld(gx + dx, gy + dy);
        marker
          .setPosition(world.x, world.y)
          .setDepth(depth)
          .setAlpha(0.55)
          .setVisible(true);
      }
    }
    for (let i = index; i < this.selectionMarkers.length; i += 1) {
      this.selectionMarkers[i].setVisible(false);
    }
  }

  /** Tum secim isaretlerini gizler. */
  private hideSelection(): void {
    for (const marker of this.selectionMarkers) marker.setVisible(false);
  }

  /** Kamerayi sinirlandirir, sehir merkezine odaklar ve dokunma olaylarini baglar. */
  private setupCamera(): void {
    const halfWidth = (GRID_SIZE * TILE_WIDTH) / 2;
    const height = GRID_SIZE * TILE_HEIGHT;
    const padding = TILE_WIDTH;

    this.cameras.main.setBounds(
      -halfWidth - padding,
      -TILE_HEIGHT - padding,
      GRID_SIZE * TILE_WIDTH + padding * 2,
      height + padding * 2,
    );

    const ui = this.scene.get(SceneKeys.UI) as UIScene | undefined;

    this.camControl = new CameraController(this, this.cameras.main, {
      onTap: (x, y) => this.handleTap(x, y),
      onHover: (x, y) => this.handleHover(x, y),
      onDragStart: () => this.hideSelection(),
      // Arayuz sahnesi henuz hazir degilse tum dokunuslar haritaya gider.
      isBlocked: (x, y) => ui?.blocksPointer?.(x, y) ?? false,
      // Dokunma esikleri ve zoom sinirlari mantiksal pikselde tanimli.
      pixelRatio: () => this.resolution?.dpr ?? 1,
    });

    const center = this.world.state.grid.center();
    const focus = gridToWorld(center.gx, center.gy);
    // Mantiksal zoom, cihaz olcusune ResolutionManager tarafindan tasinir.
    this.camControl.setLogicalZoom(this.fitZoom());
    this.camControl.centerOn(focus.x, focus.y);
  }

  /**
   * Ekran genisligine gore acilis zoom'unu hesaplar.
   * Ust sinir 1'dir; genis ekranlarda gereksiz yere buyutmez.
   */
  private fitZoom(): number {
    const target = this.logicalWidth() / (INITIAL_VISIBLE_TILES * TILE_WIDTH);
    return Phaser.Math.Clamp(target, MIN_ZOOM, 1);
  }

  /** Kadraj hesaplarinda kullanilan mantiksal genislik (CSS pikseli). */
  private logicalWidth(): number {
    return this.resolution?.logicalWidth ?? this.scale.width;
  }


  /** Kayittan gelen binalar icin gorselleri olusturur. */
  private spawnExistingBuildings(): void {
    for (const building of this.world.state.buildings.values()) {
      this.createView(building);
    }
  }

  private bindWorldEvents(): void {
    const bus = this.world.bus;
    bus.on('building:placed', this.createView, this);
    bus.on('building:completed', this.onBuildingChanged, this);
    bus.on('building:removed', this.destroyView, this);
    bus.on('construction:started', this.onConstructionStarted, this);
    bus.on('construction:completed', this.onConstructionCompleted, this);
    bus.on('construction:cancelled', this.onConstructionCancelled, this);
    bus.on('placement:start', this.beginPlacement, this);
    bus.on('placement:cancel', this.cancelPlacement, this);
    bus.on('ui:request-demolish', this.demolish, this);
    bus.on('ui:request-upgrade', this.upgrade, this);
    bus.on('ui:cancel-upgrade', this.cancelUpgrade, this);
  }

  // --- Girdi ---------------------------------------------------------------

  /** Kaydirma olmadan yapilan dokunusu yorumlar. */
  private handleTap(worldX: number, worldY: number): void {
    const { gx, gy } = worldToGrid(worldX, worldY);
    const tile = this.world.state.grid.getTile(gx, gy);

    if (this.placingId) {
      this.tryPlace(gx, gy);
      return;
    }

    if (!tile) {
      this.clearSelection();
      return;
    }

    this.selectTile(tile);
  }

  /** Insa modunda parmak/imlec hareketinde hayaleti gunceller. */
  private handleHover(worldX: number, worldY: number): void {
    if (!this.placingId) return;

    const { gx, gy } = worldToGrid(worldX, worldY);
    if (gx === this.lastPreviewCell.gx && gy === this.lastPreviewCell.gy) return;
    this.lastPreviewCell = { gx, gy };

    const valid = this.world.buildings.validate(this.placingId, gx, gy).ok;
    this.preview.moveTo(gx, gy, valid);
    this.world.bus.emit('placement:changed', valid);
  }

  /** Secili hucreyi ve uzerindeki binayi arayuze bildirir. */
  private selectTile(tile: TileData): void {
    this.selectedTile = tile;

    // Bina seciliyse tum ayak izi, bos karo seciliyse yalnizca o karo isaretlenir.
    const building = tile.occupantUid ? this.world.state.buildings.get(tile.occupantUid) : null;
    if (building) {
      const def = getBuilding(building.type);
      this.showSelection(building.gx, building.gy, def.size);
    } else {
      this.showSelection(tile.gx, tile.gy, 1);
    }

    for (const view of this.views.values()) {
      view.setSelected(view.uid === tile.occupantUid);
    }

    this.world.bus.emit('tile:selected', tile);
  }

  private clearSelection(): void {
    this.selectedTile = null;
    this.hideSelection();
    for (const view of this.views.values()) view.setSelected(false);
    this.world.bus.emit('tile:selected', null);
  }

  // --- Insa modu -----------------------------------------------------------

  private beginPlacement(defId: string): void {
    this.placingId = defId as BuildingId;
    this.clearSelection();
    this.lastPreviewCell = { gx: -1, gy: -1 };
    this.preview.start(getBuilding(this.placingId));

    // Hayaleti hemen ekranin ortasinda goster; kullanici parmagini oynatmadan
    // once de bir geri bildirim gorur.
    // getWorldPoint EKRAN (cihaz pikseli) koordinati bekler; mantiksal
    // olcu degil. Oyun boyutu zaten cihaz pikselindedir.
    const center = this.cameras.main.getWorldPoint(
      this.scale.width / 2,
      this.scale.height / 2,
    );
    this.handleHover(center.x, center.y);
  }

  private cancelPlacement(): void {
    this.placingId = null;
    this.preview.stop();
  }

  /** Dokunulan hucreye binayi kurmayi dener ve sonucu bildirir. */
  private tryPlace(gx: number, gy: number): void {
    const defId = this.placingId;
    if (!defId) return;

    const result = this.world.buildings.place(defId, gx, gy);
    if (!result.ok) {
      this.world.bus.emit('notify', PLACEMENT_MESSAGES[result.reason], 'error');
      this.cameras.main.shake(120, 0.004);
      return;
    }

    const def = getBuilding(defId);
    this.world.bus.emit('notify', `${def.name} insaati basladi.`, 'success');
    this.world.save();

    // Ayni turden art arda kurmak yaygin bir istek; mod acik kalir.
    this.lastPreviewCell = { gx: -1, gy: -1 };
    const world = gridToWorld(gx, gy);
    this.handleHover(world.x, world.y);
  }

  /** Arayuzden gelen yukseltme istegini UpgradeSystem'e iletir. */
  private upgrade(uid: string): void {
    const building = this.world.state.buildings.get(uid);
    if (!building) return;
    const name = getBuilding(building.type).name;

    const result = this.world.upgrades.requestUpgrade(uid);
    if (!result.ok) {
      this.world.bus.emit('notify', UPGRADE_MESSAGES[result.reason], 'error');
      return;
    }

    this.world.bus.emit('notify', `${name} yukseltiliyor.`, 'success');
    this.world.save();
  }

  /** Arayuzden gelen yukseltme iptalini UpgradeSystem'e iletir. */
  private cancelUpgrade(uid: string): void {
    const building = this.world.state.buildings.get(uid);
    if (!building) return;
    const name = getBuilding(building.type).name;

    if (this.world.upgrades.cancelUpgrade(uid).ok) {
      this.world.bus.emit('notify', `${name} yukseltmesi iptal edildi.`, 'info');
      this.world.save();
    }
  }

  private demolish(uid: string): void {
    const building = this.world.state.buildings.get(uid);
    if (!building) return;
    const name = getBuilding(building.type).name;

    if (this.world.buildings.demolish(uid)) {
      this.world.bus.emit('notify', `${name} yikildi, kaynaklarin yarisi geri alindi.`, 'info');
      this.clearSelection();
      this.world.save();
    }
  }

  // --- Gorsel senkronizasyon -----------------------------------------------

  private createView(building: BuildingInstance): void {
    if (this.views.has(building.uid)) return;
    const def = getBuilding(building.type);
    const resolved = this.world.buildings.resolve(building);
    const view = new BuildingView(this, building, def, resolved);
    this.views.set(building.uid, view);

    // Yalnizca ilerlemesi olan (aktif) gorevler animasyon kumesine girer;
    // kuyruktaki gorevin ilerlemesi degismedigi icin her karede tazelenmez.
    if (resolved.construction?.status === 'active') {
      this.activeConstructionViews.set(building.uid, view);
    }
  }

  private onBuildingChanged(building: BuildingInstance): void {
    // Secili bina tamamlandiysa bilgi paneli guncel degerleri gostersin.
    if (this.selectedTile?.occupantUid === building.uid) {
      this.world.bus.emit('tile:selected', this.selectedTile);
    }
  }

  private destroyView(building: BuildingInstance): void {
    this.views.get(building.uid)?.destroy();
    this.views.delete(building.uid);
    this.activeConstructionViews.delete(building.uid);
  }

  /** Gorev basladi: ilgili gorsel insaat gorunumune gecer ve kumeye girer. */
  private onConstructionStarted(task: ConstructionTask): void {
    const view = this.views.get(task.targetUid);
    if (!view) return;

    // construction:started yalnizca gorev AKTIF oldugunda yayinlanir.
    view.beginTask(task.kind, 0, false);
    this.activeConstructionViews.set(task.targetUid, view);
  }

  /** Gorev iptal edildi: gorsel normale doner ve kumeden cikar. */
  private onConstructionCancelled(task: ConstructionTask): void {
    this.activeConstructionViews.delete(task.targetUid);
    this.views.get(task.targetUid)?.endTask();

    if (this.selectedTile?.occupantUid === task.targetUid) {
      this.world.bus.emit('tile:selected', this.selectedTile);
    }
  }

  /** Gorev bitti: gorsel normale doner ve kumeden cikar. */
  private onConstructionCompleted(task: ConstructionTask): void {
    this.activeConstructionViews.delete(task.targetUid);
    this.views.get(task.targetUid)?.endTask(true);

    if (this.selectedTile?.occupantUid === task.targetUid) {
      this.world.bus.emit('tile:selected', this.selectedTile);
    }
  }

  /**
   * Devam eden gorevlerin ilerleme cubuklarini tazeler.
   *
   * Sprint 1'de burasi her karede TUM bina koleksiyonunu tarayip her insaat
   * icin Graphics geometrisini yeniden kuruyordu (olculen: 120 insaat ->
   * 46'dan 9 FPS'e dusus). Artik yalnizca devam eden gorevler uzerinde
   * geziliyor ve tek islem yapiliyor: dolgu cubugunun scaleX degeri.
   * Gorev yoksa dongu hic calismaz.
   */
  private updateActiveConstructionBars(): void {
    if (this.activeConstructionViews.size === 0) return;

    const tick = this.world.tick;
    for (const [uid, view] of this.activeConstructionViews) {
      const task = this.world.construction.taskFor(uid);
      if (!task) {
        this.activeConstructionViews.delete(uid);
        continue;
      }
      view.setProgress(constructionProgress(task, tick).ratio);
    }
  }

  /** Sahne kapanirken olay dinleyicilerini birakir. */
  private teardown(): void {
    const bus = this.world.bus;
    bus.off('building:placed', this.createView, this);
    bus.off('building:completed', this.onBuildingChanged, this);
    bus.off('building:removed', this.destroyView, this);
    bus.off('construction:started', this.onConstructionStarted, this);
    bus.off('construction:completed', this.onConstructionCompleted, this);
    bus.off('construction:cancelled', this.onConstructionCancelled, this);
    bus.off('placement:start', this.beginPlacement, this);
    bus.off('placement:cancel', this.cancelPlacement, this);
    bus.off('ui:request-demolish', this.demolish, this);
    bus.off('ui:request-upgrade', this.upgrade, this);
    bus.off('ui:cancel-upgrade', this.cancelUpgrade, this);
    this.preview.destroy();
  }
}
