import Phaser from 'phaser';
import {
  BOTTOM_UI_BAND,
  GRID_SIZE,
  INITIAL_VISIBLE_TILES,
  MIN_ZOOM,
  TOP_UI_BAND,
  SceneKeys,
  TILE_HEIGHT,
  TILE_WIDTH,
  TextureKeys,
} from '@/config/Constants';
import { allBuildings, getBuilding } from '@/config/BuildingCatalog';
import { CameraController } from '@/input/CameraController';
import { BuildingView } from '@/render/BuildingView';
import { PlacementPreview } from '@/render/PlacementPreview';
import { PlotLayer } from '@/render/PlotLayer';
import { CityDecorLayer } from '@/render/CityDecorLayer';
import { IslandBackdrop } from '@/render/IslandBackdrop';
import { WorkerLayer } from '@/render/WorkerLayer';
import { PAVED_TERRAIN, TERRAIN_TEXTURE, TILE_ORIGIN_Y, pavedKey } from '@/render/TextureFactory';
import { isBuildable } from '@/systems/BuildingPlotSystem';
import { PLACEMENT_MESSAGES } from '@/systems/BuildingSystem';
import { UPGRADE_MESSAGES } from '@/systems/UpgradeSystem';
import { WORKFORCE_MESSAGES } from '@/systems/WorkforceSystem';
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
  private workers!: WorkerLayer;
  private plotLayer!: PlotLayer;
  private decorLayer!: CityDecorLayer;
  private backdrop!: IslandBackdrop;

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

    this.backdrop = new IslandBackdrop(this);
    this.drawTerrain();
    this.createSelectionMarker();
    this.preview = new PlacementPreview(this, this.artScale());
    this.workers = new WorkerLayer(this, this.world.state, this.artScale());
    this.plotLayer = new PlotLayer(this, this.world.plots);
    this.decorLayer = new CityDecorLayer(this, this.world.decor, this.artScale());
    this.setupCamera();
    this.spawnExistingBuildings();
    this.bindWorldEvents();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.teardown, this);
  }

  override update(time: number, delta: number): void {
    this.world.update(delta);
    this.camControl.update(delta);
    this.updateActiveConstructionBars();
    this.workers.update(time, delta);
  }

  // --- Kurulum -------------------------------------------------------------

  /** Zemin karolarini tek seferde cizer; karolar statik oldugu icin yeniden cizilmez. */
  private drawTerrain(): void {
    const plaza = this.plazaTiles();

    for (const tile of this.world.state.grid.allTiles()) {
      const world = gridToWorld(tile.gx, tile.gy);
      this.add
        .image(world.x, world.y, this.groundTextureFor(tile, plaza))
        .setOrigin(0.5, TILE_ORIGIN_Y)
        .setDepth(depthFor(tile.gx, tile.gy) - 5);
    }
  }

  /**
   * Karonun zemin dokusu - gerekiyorsa yol doseli olani.
   *
   * Doseme AYRI bir sprite degil, zeminle birlikte pisirilmis tek dokudur:
   * 115 sokak karosu icin ikinci bir sprite katmani kare hizini 34'ten
   * 26'ya dusuruyordu (GPU'suz olcum, 390x844). Su karosuna doseme konmaz;
   * sehir denize dogru acik kalir.
   */
  private groundTextureFor(tile: TileData, plaza: Set<string>): string {
    if (isBuildable(tile.gx, tile.gy)) return TERRAIN_TEXTURE[tile.terrain];
    if (!PAVED_TERRAIN.includes(tile.terrain)) return TERRAIN_TEXTURE[tile.terrain];
    const base = plaza.has(`${tile.gx},${tile.gy}`) ? TextureKeys.TilePlaza : TextureKeys.TileStreet;
    return pavedKey(base, tile.terrain);
  }

  /**
   * Sehir merkezinin cevresindeki MEYDAN karolari.
   *
   * Sehir merkezi 2x2 kamusal alanda durur ve cevresi bastan beri sokaktir;
   * o halkayi meydan dosemesiyle kaplamak sehre bir odak noktasi verir
   * (Sprint 13 §12). Yeni bir kural degil, var olan yerlesimin okunmasi.
   */
  private plazaTiles(): Set<string> {
    const tiles = new Set<string>();
    const civic = this.world.plots.plots.find((plot) => plot.zone === 'civic');
    if (!civic) return tiles;

    for (let dy = -1; dy <= civic.height; dy += 1) {
      for (let dx = -1; dx <= civic.width; dx += 1) {
        const inside = dx >= 0 && dy >= 0 && dx < civic.width && dy < civic.height;
        if (inside) continue;
        tiles.add(`${civic.gx + dx},${civic.gy + dy}`);
      }
    }
    return tiles;
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
    /*
     * Kaydirma payi adadan GENIS tutulur.
     *
     * Sprint 12'ye kadar pay bir karoydu; kamera goruntusu adadan buyuk
     * oldugu icin Phaser kadraji sinirlarin ortasina KILITLIYORDU ve sehri
     * dikeyde kaydirmak imkansizdi (olculdu: centerOn sonrasi ekran merkezi
     * hep ayni karoyu gosteriyordu). Genis pay hem kilidi acar hem de
     * kenara kaydirildiginda deniz gorunur - eskiden orasi siyahti.
     */
    const padX = TILE_WIDTH * 2;
    const padY = TILE_HEIGHT * 6;

    this.cameras.main.setBounds(
      -halfWidth - padX,
      -TILE_HEIGHT - padY,
      GRID_SIZE * TILE_WIDTH + padX * 2,
      height + padY * 2,
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

    // Mantiksal zoom, cihaz olcusune ResolutionManager tarafindan tasinir.
    this.camControl.setLogicalZoom(this.fitZoom());
    this.focusCity();
  }

  /**
   * Kadraji SEHIR MERKEZINE oturtur.
   *
   * Iki duzeltme yapar:
   *   1. Odak noktasi izgara merkezi degil, sehir merkezinin 2x2 ALANIDIR;
   *      alanin kosesi degil ortasi hedeflenir.
   *   2. Kadraj, arayuzun artakalan bandinda ortalanir. Ust cubuk ile alt
   *      gezinme cubugu esit degildir; ekranin tam ortasina odaklamak sehri
   *      alt cubugun arkasina itiyordu.
   *
   * Alt gezinme cubugundaki SEHIR dugmesi de bunu cagirir; oyuncu nereye
   * kaydirirsa kaydirsin tek dokunusla merkeze doner.
   */
  focusCity(): void {
    const civic = this.world.plots.plots.find((plot) => plot.zone === 'civic');
    const center = this.world.state.grid.center();
    const gx = civic ? civic.gx + (civic.width - 1) / 2 : center.gx;
    const gy = civic ? civic.gy + (civic.height - 1) / 2 : center.gy;
    const focus = gridToWorld(gx, gy);

    // Arayuz bandi farki kadar asagi bakarsak sehir yukari kayar.
    const zoom = this.cameras.main.zoom / (this.resolution?.dpr ?? 1);
    const shift = ((BOTTOM_UI_BAND - TOP_UI_BAND) / 2) / Math.max(zoom, 0.01);
    this.camControl.centerOn(focus.x, focus.y + shift);
  }

  /**
   * Ekran genisligine gore acilis zoom'unu hesaplar.
   * Ust sinir 1'dir; genis ekranlarda gereksiz yere buyutmez.
   */
  private fitZoom(): number {
    const target = this.logicalWidth() / (INITIAL_VISIBLE_TILES * TILE_WIDTH);
    return Phaser.Math.Clamp(target, MIN_ZOOM, 1);
  }

  /** Dokularin uretildigi cizim olcegi; sprite'lar bunun tersiyle olceklenir. */
  private artScale(): number {
    return this.resolution?.dpr ?? 1;
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
    bus.on('ui:assign-worker', this.assignWorker, this);
    bus.on('ui:release-worker', this.releaseWorker, this);
  }

  // --- Girdi ---------------------------------------------------------------

  /** Kaydirma olmadan yapilan dokunusu yorumlar. */
  private handleTap(worldX: number, worldY: number): void {
    const { gx, gy } = worldToGrid(worldX, worldY);
    const tile = this.world.state.grid.getTile(gx, gy);

    if (this.placingId) {
      /*
       * Dokunus plotun BASLANGIC karosuna cekilir.
       *
       * 2x2 sehir merkezi alaninin sag alt karosuna dokunmak, binayi bir
       * karo kaydirip yerlesimi bozardi. Alanin neresine dokunulursa
       * dokunulsun bina alanin koseline oturur.
       */
      const plot = this.world.buildings.plotAt(gx, gy);
      if (plot) this.tryPlace(plot.gx, plot.gy);
      else this.tryPlace(gx, gy);
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

    const touched = worldToGrid(worldX, worldY);
    // Onizleme de plotun baslangicina oturur ki oyuncu binanin GERCEKTEN
    // nereye kurulacagini gorsun.
    const plot = this.world.buildings.plotAt(touched.gx, touched.gy);
    const gx = plot ? plot.gx : touched.gx;
    const gy = plot ? plot.gy : touched.gy;
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
    // Uygun yapi alanlari vurgulanir; hesap PlotLayer'da degil sistemde.
    this.plotLayer.setPlacing(this.placingId);
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
    this.plotLayer.setPlacing(null);
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

  /**
   * Oyuncunun atama istegini WorkforceSystem'e iletir.
   *
   * Karar sistemindir; sahne yalnizca sonucu bildirir ve paneli tazeler.
   * Basarili atamada isci HEMEN uretime katilmaz - once yola cikar.
   */
  private assignWorker(uid: string): void {
    const result = this.world.workforce.assign(uid);
    if (!result.ok) {
      this.world.bus.emit('notify', WORKFORCE_MESSAGES[result.reason], 'error');
      return;
    }
    this.refreshSelection(uid);
    this.world.save();
  }

  /** Oyuncunun isciyi geri cekme istegini iletir. */
  private releaseWorker(uid: string): void {
    const result = this.world.workforce.release(uid);
    if (!result.ok) {
      this.world.bus.emit('notify', WORKFORCE_MESSAGES[result.reason], 'error');
      return;
    }
    this.refreshSelection(uid);
    this.world.save();
  }

  /** Secili bina buysa bilgi panelini yeniden cizdirir. */
  private refreshSelection(uid: string): void {
    if (this.selectedTile?.occupantUid === uid) {
      this.world.bus.emit('tile:selected', this.selectedTile);
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
    // Alan doldu: bos alan isareti gizlenmeli.
    this.plotLayer?.refresh();
    if (this.views.has(building.uid)) return;
    const def = getBuilding(building.type);
    const resolved = this.world.buildings.resolve(building);
    const view = new BuildingView(this, building, def, resolved, this.artScale());
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
    // Alan bosaldi: isaret yeniden gorunur.
    this.plotLayer?.refresh();
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
    const view = this.views.get(task.targetUid);
    view?.endTask(true);

    // Gorsel burada tazelenir: insaat bitince iskele yerini binaya birakir,
    // yukseltme bitince seviye 2 gorseline gecilir. Tek seferlik bir doku
    // degisimidir, kare basina maliyet eklemez.
    const building = this.world.state.buildings.get(task.targetUid);
    if (building && view) view.syncVisual(building);

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
    bus.off('ui:assign-worker', this.assignWorker, this);
    bus.off('ui:release-worker', this.releaseWorker, this);
    this.preview.destroy();
    this.workers.destroy();
    this.plotLayer.destroy();
    this.decorLayer.destroy();
    this.backdrop.destroy();
  }
}
