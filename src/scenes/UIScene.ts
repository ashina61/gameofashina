import Phaser from 'phaser';
import { SceneKeys } from '@/config/Constants';
import { getBuilding } from '@/config/BuildingCatalog';
import { resolveBuildPreview } from '@/systems/BuildingResolver';
import { PLACEMENT_MESSAGES } from '@/systems/BuildingSystem';
import { BuildMenu } from '@/ui/BuildMenu';
import { InfoPanel } from '@/ui/InfoPanel';
import { ResourceBar } from '@/ui/ResourceBar';
import { Toast } from '@/ui/Toast';
import { TouchButton } from '@/ui/TouchButton';
import { UISpacing, UIText } from '@/ui/UIStyle';
import { formatElapsed } from '@/utils/Format';
import { getWorld } from './BootScene';
import type { GameWorld } from '@/core/GameWorld';
import type {
  BuildingId,
  BuildingInstance,
  ConstructionTask,
  EconomySnapshot,
  ResourcePool,
  TileData,
} from '@/types';

/**
 * Arayuz sahnesi: CityScene'in uzerinde ayri bir kamera ile calisir.
 *
 * Oyun dunyasi ile arasindaki tek bag EventBus'tir; bu sayede arayuz
 * yeniden duzenlenirken oyun mantigina dokunulmaz. Ayrica hangi ekran
 * alanlarinin arayuz tarafindan kapatildigini CityScene'e bildirir.
 */
export class UIScene extends Phaser.Scene {
  private world!: GameWorld;

  private resourceBar!: ResourceBar;
  private buildMenu!: BuildMenu;
  private infoPanel!: InfoPanel;
  private toast!: Toast;
  private buildButton!: TouchButton;
  private cancelButton!: TouchButton;

  /** Insa modunda secili bina turu; mod kapaliysa null. */
  private placingId: BuildingId | null = null;

  constructor() {
    super({ key: SceneKeys.UI, active: false });
  }

  create(): void {
    this.world = getWorld(this);

    const { width, height } = this.scale;

    this.resourceBar = new ResourceBar(this, width);
    this.buildMenu = new BuildMenu(this, width, height, (defId) => this.startPlacement(defId));
    this.infoPanel = new InfoPanel(
      this,
      width,
      height,
      (uid) => this.world.bus.emit('ui:request-demolish', uid),
      (uid) => this.world.bus.emit('ui:request-upgrade', uid),
      (uid) => this.world.bus.emit('ui:cancel-upgrade', uid),
      (cost) => this.world.resources.canAfford(cost),
    );
    this.toast = new Toast(this, width / 2, ResourceBar.height + 34);

    this.buildButton = new TouchButton(this, 0, 0, 'INSA ET', {
      width: 132,
      height: 52,
      onPress: () => this.toggleBuildMenu(),
    });

    this.cancelButton = new TouchButton(this, 0, 0, 'Vazgec', {
      width: 110,
      height: 46,
      color: UIText.danger,
      onPress: () => this.cancelPlacement(),
    });
    this.cancelButton.setVisible(false);

    this.layout(width, height);
    this.bindEvents();
    this.pushInitialState();

    // Insaat geri sayimi panel acikken de ilerlesin.
    this.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => this.infoPanel.tick(this.world.tick),
    });

    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.teardown, this);
  }

  /**
   * Verilen ekran noktasinin arayuz tarafindan kapatilip kapatilmadigini soyler.
   * CityScene bu bilgiyi kullanarak arayuze yapilan dokunuslari haritaya
   * iletmez; boylece menuye basarken yanlislikla bina kurulmaz.
   */
  blocksPointer(screenX: number, screenY: number): boolean {
    if (screenY <= ResourceBar.height) return true;
    if (this.buildMenu.isOpen && Phaser.Geom.Rectangle.Contains(this.buildMenu.bounds(), screenX, screenY)) {
      return true;
    }
    if (this.infoPanel.isOpen && Phaser.Geom.Rectangle.Contains(this.infoPanel.bounds(), screenX, screenY)) {
      return true;
    }
    return this.hitsButton(this.buildButton, screenX, screenY) ||
      (this.cancelButton.visible && this.hitsButton(this.cancelButton, screenX, screenY));
  }

  // --- Olay baglantilari ---------------------------------------------------

  private bindEvents(): void {
    const bus = this.world.bus;
    bus.on('resources:changed', this.onResources, this);
    bus.on('economy:updated', this.onEconomy, this);
    bus.on('tile:selected', this.onTileSelected, this);
    bus.on('notify', this.onNotify, this);
    bus.on('building:completed', this.onBuildingCompleted, this);
    bus.on('construction:completed', this.onConstructionCompleted, this);
  }

  /** Acilista mevcut durumu arayuze yansitir ve cevrimdisi kazanci bildirir. */
  private pushInitialState(): void {
    this.world.resources.emitChange();
    this.onEconomy(this.world.economy.snapshot);

    if (this.world.offlineSeconds > 60) {
      this.toast.show(
        `${formatElapsed(this.world.offlineSeconds)} boyunca sehrin uretmeye devam etti.`,
        'success',
        3200,
      );
    } else if (!this.world.loadedFromSave) {
      this.toast.show('Sehrini kurmaya basla: once bir Sehir Merkezi dik.', 'info', 3600);
    }
  }

  private onResources(resources: ResourcePool, capacity: number): void {
    this.resourceBar.updateResources(resources, capacity);
    this.buildMenu.refreshAffordability(resources);
    // Bilgi paneli acikken yukseltme butonunun durumu bayat kalmasin.
    this.infoPanel.refresh(this.world.tick);
  }

  private onEconomy(snapshot: EconomySnapshot): void {
    this.resourceBar.updateEconomy(snapshot);
  }

  private onTileSelected(tile: TileData | null): void {
    if (!tile) {
      this.infoPanel.hide();
      this.relayout();
      return;
    }

    // Bilgi paneli ile insa menusu ayni alani kullanir; ikisi ayni anda acilmaz.
    if (this.buildMenu.isOpen) {
      this.buildMenu.hide();
      this.buildButton.setText('INSA ET');
    }

    const building = tile.occupantUid
      ? this.world.state.buildings.get(tile.occupantUid) ?? null
      : null;
    this.infoPanel.show(tile, building, this.world.tick);
    this.relayout();
  }

  private onNotify(message: string, tone: 'info' | 'success' | 'error'): void {
    this.toast.show(message, tone);
  }

  private onBuildingCompleted(building: BuildingInstance): void {
    this.toast.show(`${getBuilding(building.type).name} tamamlandi.`, 'success', 1800);
  }

  /**
   * Yukseltme tamamlandiginda bildirir.
   * Insa tamamlanmasi zaten building:completed ile duyuruluyor; burada yalnizca
   * yukseltme ele alinir, boylece ayni olay icin iki bildirim cikmaz.
   */
  private onConstructionCompleted(task: ConstructionTask): void {
    if (task.kind !== 'upgrade') return;
    const building = this.world.state.buildings.get(task.targetUid);
    if (!building) return;
    this.toast.show(
      `${getBuilding(building.type).name} seviye ${building.level} oldu.`,
      'success',
      1800,
    );
  }

  // --- Insa modu -----------------------------------------------------------

  private toggleBuildMenu(): void {
    if (this.placingId) {
      this.cancelPlacement();
      return;
    }
    if (this.buildMenu.isOpen) {
      this.buildMenu.hide();
      this.buildButton.setText('INSA ET');
    } else {
      this.infoPanel.hide();
      this.buildMenu.show();
      this.buildButton.setText('KAPAT');
    }
    this.relayout();
  }

  private startPlacement(defId: BuildingId): void {
    // Karsilanabilirlik karari kaynak sisteminindir; kart yalnizca gorsel.
    // Karsilanamiyorsa yerlestirme moduna hic girilmez ve nedeni soylenir.
    if (!this.world.resources.canAfford(resolveBuildPreview(getBuilding(defId)).cost)) {
      // Diger tum hata bildirimleri gibi olay yolundan gecer; boylece tek bir
      // bildirim kanali kalir ve test edilebilir olur.
      this.world.bus.emit('notify', PLACEMENT_MESSAGES.cost, 'error');
      return;
    }

    this.placingId = defId;
    this.buildMenu.hide();
    this.buildButton.setText('INSA ET');
    this.cancelButton.setVisible(true);
    this.relayout();
    this.world.bus.emit('placement:start', defId);
    this.toast.show(`${getBuilding(defId).name} icin bir yer sec.`, 'info', 2400);
  }

  private cancelPlacement(): void {
    if (!this.placingId) return;
    this.placingId = null;
    this.cancelButton.setVisible(false);
    this.world.bus.emit('placement:cancel');
  }

  // --- Yerlesim ------------------------------------------------------------

  private onResize(gameSize: Phaser.Structs.Size): void {
    this.layout(gameSize.width, gameSize.height);
  }

  /** Panel acilip kapandiginda gecerli ekran olculeriyle yeniden dizer. */
  private relayout(): void {
    this.layout(this.scale.width, this.scale.height);
  }

  /** Tum arayuz ogelerini gecerli ekran olculerine gore yerlestirir. */
  private layout(width: number, height: number): void {
    this.resourceBar.layout(width);
    this.buildMenu.layout(width, height);
    this.infoPanel.layout(width, height);
    this.toast.layout(width / 2, ResourceBar.height + 34);

    // Butonlar acik olan panelin ustunde durur; aksi halde kartlarin uzerine biner.
    const bottom = height - this.openPanelHeight() - UISpacing.edge - 26;
    this.buildButton.setPosition(width - UISpacing.edge - 66, bottom);
    this.cancelButton.setPosition(UISpacing.edge + 55, bottom);
  }

  /** Acik olan alt panelin yuksekligi; hicbiri acik degilse 0. */
  private openPanelHeight(): number {
    if (this.buildMenu.isOpen) return BuildMenu.height;
    if (this.infoPanel.isOpen) return InfoPanel.height;
    return 0;
  }

  /** Butonun ekran dikdortgenine dokunulup dokunulmadigini kontrol eder. */
  private hitsButton(button: TouchButton, x: number, y: number): boolean {
    const rect = new Phaser.Geom.Rectangle(
      button.x - button.width / 2,
      button.y - button.height / 2,
      button.width,
      button.height,
    );
    return Phaser.Geom.Rectangle.Contains(rect, x, y);
  }

  private teardown(): void {
    const bus = this.world.bus;
    bus.off('resources:changed', this.onResources, this);
    bus.off('economy:updated', this.onEconomy, this);
    bus.off('tile:selected', this.onTileSelected, this);
    bus.off('notify', this.onNotify, this);
    bus.off('building:completed', this.onBuildingCompleted, this);
    bus.off('construction:completed', this.onConstructionCompleted, this);
    this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize, this);
  }
}
