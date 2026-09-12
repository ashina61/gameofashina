import Phaser from 'phaser';
import { RESOURCE_META, RESOURCE_ORDER, SceneKeys } from '@/config/Constants';
import { getBuilding } from '@/config/BuildingCatalog';
import { resolveBuildPreview } from '@/systems/BuildingResolver';
import { PLACEMENT_MESSAGES } from '@/systems/BuildingSystem';
import { BottomNav } from '@/ui/BottomNav';
import type { NavTab } from '@/ui/BottomNav';
import { BuildMenu } from '@/ui/BuildMenu';
import { CityPanel } from '@/ui/CityPanel';
import { InfoPanel } from '@/ui/InfoPanel';
import type { WorkerPanelInfo } from '@/ui/InfoPanel';
import { ResourceBar } from '@/ui/ResourceBar';
import type { CityHeaderInfo } from '@/ui/ResourceBar';
import { NotificationStack } from '@/ui/Notifications';
import { RoundButton } from '@/ui/RoundButton';
import { TouchButton } from '@/ui/TouchButton';
import { UISpacing, UIText } from '@/ui/UIStyle';
import { formatElapsed } from '@/utils/Format';
import { insetsEqual, onSafeAreaChange, readSafeAreaInsets, zeroInsets } from '@/utils/SafeArea';
import { toLogical } from '@/utils/RenderScale';
import { getResolution, getWorld } from './BootScene';
import type { GameWorld } from '@/core/GameWorld';
import type { ResolutionManager } from '@/render/ResolutionManager';
import type { SafeAreaInsets } from '@/utils/SafeArea';
import type { CityScene } from './CityScene';
import type {
  BuildingId,
  BuildingInstance,
  ConstructionTask,
  EconomySnapshot,
  ResourcePool,
  TileData,
  WorkforceSnapshot,
} from '@/types';

/**
 * Arayuz sahnesi: CityScene'in uzerinde ayri bir kamera ile calisir.
 *
 * Oyun dunyasi ile arasindaki tek bag EventBus'tir; bu sayede arayuz
 * yeniden duzenlenirken oyun mantigina dokunulmaz. Ayrica hangi ekran
 * alanlarinin arayuz tarafindan kapatildigini CityScene'e bildirir.
 */
export class UIScene extends Phaser.Scene {
  /** Cozunurluk yoneticisi; yoksa mantiksal olcu Phaser'dan okunur (dpr 1). */
  private resolution: ResolutionManager | null = null;
  private stopResolutionWatch: (() => void) | null = null;

  private world!: GameWorld;

  private resourceBar!: ResourceBar;
  private buildMenu!: BuildMenu;
  private infoPanel!: InfoPanel;
  private notices!: NotificationStack;
  private sideButtons: RoundButton[] = [];
  private mapButton!: RoundButton;
  private buildButton!: RoundButton;
  private cancelButton!: TouchButton;
  private nav!: BottomNav;
  private cityPanel!: CityPanel;

  /**
   * Depo uyarisinin en son verildigi kaynak kumesi.
   * Ayni uyariyi her tikte tekrarlamamak icin tutulur.
   */
  private readonly warnedFull = new Set<string>();

  /** Insa modunda secili bina turu; mod kapaliysa null. */
  private placingId: BuildingId | null = null;

  /**
   * Sistem cubuklarinin kapladigi kenar paylari.
   * Yalnizca yerlesim degistiginde okunur (acilis + resize); kare basina
   * DOM olcumu yapilmaz.
   */
  private insets: SafeAreaInsets = zeroInsets();

  /** Kenar payi aboneligini birakan fonksiyon. */
  private stopSafeAreaWatch: (() => void) | null = null;

  constructor() {
    super({ key: SceneKeys.UI, active: false });
  }

  create(): void {
    this.world = getWorld(this);
    this.resolution = getResolution(this);

    /*
     * Arayuz MANTIKSAL (CSS) pikselde yazilir; oyun boyutu ise cihaz
     * pikselindedir. Buradaki olcuyu this.scale'den almak, yuksek DPR'de
     * tum arayuzu cihaz pikseline gore dizerdi - buton ekranin disina
     * kacardi (olculdu: DPR 2'de x=246 yerine x=636).
     */
    const width = this.logicalWidth();
    const height = this.logicalHeight();

    this.resourceBar = new ResourceBar(this, width);
    this.buildMenu = new BuildMenu(this, width, height, (defId) => this.startPlacement(defId));
    this.infoPanel = new InfoPanel(this, width, height, {
      onDemolish: (uid) => this.world.bus.emit('ui:request-demolish', uid),
      onUpgrade: (uid) => this.world.bus.emit('ui:request-upgrade', uid),
      onCancelUpgrade: (uid) => this.world.bus.emit('ui:cancel-upgrade', uid),
      canAfford: (cost) => this.world.resources.canAfford(cost),
      onAssignWorker: (uid) => this.world.bus.emit('ui:assign-worker', uid),
      onReleaseWorker: (uid) => this.world.bus.emit('ui:release-worker', uid),
      workerInfo: (uid) => this.workerInfoFor(uid),
      plotAt: (gx, gy) => this.world.plots.plotAt(gx, gy),
      onClose: () => this.world.bus.emit('tile:selected', null),
      onShowWorkers: () => this.selectTab('workers'),
    });
    this.cityPanel = new CityPanel(this, width, height, () => this.closePanels());
    this.nav = new BottomNav(this, width, (tab) => this.selectTab(tab));
    this.notices = new NotificationStack(this, width, ResourceBar.height + 10, 62);

    /*
     * ANA EYLEM: yuvarlak ve ekranin ALT ORTASINDA.
     *
     * Sag kenardaki genis dugmenin yerini aldi: referans duzeninde insa
     * eylemi sehrin altinda duran tek ve merkezi bir rozet. Daire, alt
     * gezinme cubugunun dikdortgen sekmelerinden gorsel olarak ayrisir.
     */
    this.buildButton = new RoundButton(this, 0, 0, {
      icon: 'hammer',
      size: 66,
      label: 'INSA ET',
      onPress: () => this.toggleBuildMenu(),
    });

    /*
     * YARDIMCI EYLEMLER.
     *
     * Ayarlar ve Harita gercek is yapar (kayit sifirlama / kadraji sehre
     * dondurme). Mesaj ve Basari icin oyunda henuz bir sistem yok; bu iki
     * dugme referans duzenindeki yerini tutar ve basildiginda durumu acikca
     * soyler - sessizce hicbir sey yapmaz.
     */
    this.sideButtons = [
      new RoundButton(this, 0, 0, { icon: 'settings', onPress: () => this.showSettings() }),
      new RoundButton(this, 0, 0, {
        icon: 'mail',
        onPress: () => this.notices.show('Mesajlar', 'Bu bolum yakinda acilacak.', 'info', 2400),
      }),
      new RoundButton(this, 0, 0, {
        icon: 'trophy',
        onPress: () => this.notices.show('Basarilar', 'Bu bolum yakinda acilacak.', 'info', 2400),
      }),
    ];
    this.mapButton = new RoundButton(this, 0, 0, {
      icon: 'compass',
      onPress: () => this.selectTab('city'),
    });

    this.cancelButton = new TouchButton(this, 0, 0, 'Vazgec', {
      width: 110,
      height: 46,
      color: UIText.danger,
      onPress: () => this.cancelPlacement(),
    });
    this.cancelButton.setVisible(false);

    this.insets = readSafeAreaInsets();
    this.layout(width, height);
    this.bindEvents();
    this.pushInitialState();

    // Insaat geri sayimi panel acikken de ilerlesin.
    this.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => this.infoPanel.tick(this.world.tick),
    });

    // Kenar paylari ekran boyutu degismeden de degisebilir; ayrica dinlenir.
    this.stopSafeAreaWatch = onSafeAreaChange((insets) => {
      this.insets = insets;
      this.relayout();
    });

    /*
     * Arayuz MANTIKSAL pikselde yazilmistir; oyun boyutu ise cihaz
     * pikselindedir. Kamerayi dpr kadar yakinlastirmak ikisini esitler:
     * 132 mantiksal piksel genisligindeki bir buton DPR 2'de 264 cihaz
     * pikseli cizilir, yani ekranda ayni fiziksel boyutta ama iki kat
     * keskin gorunur.
     */
    if (this.resolution) {
      this.resolution.attachUiCamera(this.cameras.main);
      this.stopResolutionWatch = this.resolution.onChange(() => {
        this.resolution?.attachUiCamera(this.cameras.main);
        this.relayout();
      });
    }

    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.teardown, this);
  }

  /**
   * Verilen ekran noktasinin arayuz tarafindan kapatilip kapatilmadigini soyler.
   * CityScene bu bilgiyi kullanarak arayuze yapilan dokunuslari haritaya
   * iletmez; boylece menuye basarken yanlislikla bina kurulmaz.
   */
  blocksPointer(screenX: number, screenY: number): boolean {
    // Isaretci koordinatlari CIHAZ pikselinde gelir; arayuz olculeri
    // mantiksal pikseldedir. Karsilastirmadan once ayni birime cekilir.
    const dpr = this.resolution?.dpr ?? 1;
    screenX = toLogical(screenX, dpr);
    screenY = toLogical(screenY, dpr);

    if (screenY <= this.insets.top + ResourceBar.height) return true;
    if (this.buildMenu.isOpen && Phaser.Geom.Rectangle.Contains(this.buildMenu.bounds(), screenX, screenY)) {
      return true;
    }
    if (this.infoPanel.isOpen && Phaser.Geom.Rectangle.Contains(this.infoPanel.bounds(), screenX, screenY)) {
      return true;
    }
    if (this.cityPanel.isOpen && Phaser.Geom.Rectangle.Contains(this.cityPanel.bounds(), screenX, screenY)) {
      return true;
    }
    // Alt gezinme cubugu her zaman girdiyi yakalar; arkasindaki haritaya
    // dokunmak sehri yanlislikla degistirirdi.
    if (Phaser.Geom.Rectangle.Contains(this.nav.bounds(), screenX, screenY)) return true;
    // Yuvarlak dugmeler de girdiyi yakalar; arkalarindaki haritaya dokunmak
    // yanlislikla bina kurardi.
    for (const button of [this.buildButton, this.mapButton, ...this.sideButtons]) {
      if (button.visible && this.hitsRound(button, screenX, screenY)) return true;
    }
    return this.cancelButton.visible && this.hitsButton(this.cancelButton, screenX, screenY);
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
    bus.on('workforce:changed', this.onWorkforce, this);
  }

  /**
   * Bilgi panelinin isci satiri icin gerekli sayilari toplar.
   * Hepsi WorkforceSystem'den gelir; arayuz kendi hesabini yapmaz.
   */
  private workerInfoFor(uid: string): WorkerPanelInfo {
    return {
      working: this.world.state.buildings.get(uid)?.assignedWorkers ?? 0,
      claimed: this.world.workforce.claimedBy(uid),
      capacity: this.world.workforce.capacityOf(uid),
      idle: this.world.workforce.idleCount,
    };
  }

  /** Isci durumu degisti: ust cubuk ve acik panel tazelenir. */
  private onWorkforce(snapshot: WorkforceSnapshot): void {
    this.resourceBar.updateWorkforce(snapshot);
    this.infoPanel.refresh(this.world.tick);
  }

  /** Acilista mevcut durumu arayuze yansitir ve cevrimdisi kazanci bildirir. */
  private pushInitialState(): void {
    this.world.resources.emitChange();
    this.onEconomy(this.world.economy.snapshot);
    this.resourceBar.updateWorkforce(this.world.workforce.snapshot);

    if (this.world.offlineSeconds > 60) {
      this.notices.show(
        'Sehrin uretmeye devam etti',
        `${formatElapsed(this.world.offlineSeconds)} boyunca uretim isledi.`,
        'success',
        4000,
      );
    } else if (!this.world.loadedFromSave) {
      this.notices.show(
        'Sehrini kurmaya basla',
        'Once bir Sehir Merkezi dik.',
        'info',
        4200,
      );
    }
  }

  private onResources(resources: ResourcePool, capacity: number): void {
    this.resourceBar.updateResources(resources, capacity);
    this.buildMenu.refreshAffordability(resources);
    this.warnIfStorageFull(resources, capacity);
    // Bilgi paneli acikken yukseltme butonunun durumu bayat kalmasin.
    this.infoPanel.refresh(this.world.tick);
  }

  /**
   * Depo tavanina ulasan kaynagi bir kez bildirir.
   *
   * Cubugu kirmiziya boyamak yeterli degildi: oyuncu uretimin neden
   * durdugunu anlamiyordu (Sprint 13 §6). Uyari kaynak basina YALNIZCA bir
   * kez cikar ve depo bosalinca yeniden verilebilir hale gelir; aksi halde
   * her tikte ayni bildirim tekrarlanirdi.
   */
  private warnIfStorageFull(resources: ResourcePool, capacity: number): void {
    for (const key of RESOURCE_ORDER) {
      const full = resources[key] >= capacity;
      if (full && !this.warnedFull.has(key)) {
        this.warnedFull.add(key);
        this.notices.show(
          'Depo kapasitesi doldu!',
          `${RESOURCE_META[key].label} ${Math.floor(resources[key])}/${capacity} - Ambar kur ya da harca.`,
          'warn',
          3600,
        );
      } else if (!full && resources[key] < capacity * 0.9) {
        this.warnedFull.delete(key);
      }
    }
  }

  private onEconomy(snapshot: EconomySnapshot): void {
    this.resourceBar.updateEconomy(snapshot);
    this.resourceBar.updateCity(this.cityHeader());
    /*
     * Isci sayaci her tikte de tazelenir.
     *
     * workforce:changed yalnizca ATAMA degistiginde yayinlanir; nufus buyuyup
     * yeni bir isci bosta dogdugunda degil. O olay olmadan ust cubuktaki
     * "Bosta N isci" bir sonraki atamaya kadar bayat kalirdi.
     */
    this.resourceBar.updateWorkforce(this.world.workforce.snapshot);
  }

  /**
   * Ust cubugun kimlik satiri icin sehrin durumu.
   *
   * Seviye SEHIR MERKEZININ seviyesidir - ayri bir XP sistemi yoktur.
   * Ilerleme cubugu iki sey gosterir:
   *   - merkez yukseltiliyorsa insaatin ilerlemesi,
   *   - aksi halde bir sonraki yukseltmenin maliyetinin ne kadarini
   *     karsiladigin (en dar kaynak belirler).
   * Boylece cubuk her zaman "bir sonraki seviyeye ne kadar kaldi" sorusunu
   * cevaplar ve yeni bir oyun kurali gerektirmez.
   */
  private cityHeader(): CityHeaderInfo {
    let hall: BuildingInstance | null = null;
    for (const building of this.world.state.buildings.values()) {
      if (building.type === 'town_hall') hall = building;
    }
    if (!hall) {
      return { hallLevel: null, progress: 0, progressLabel: 'Sehir Merkezi kur' };
    }

    const resolved = this.world.buildings.resolve(hall);
    const task = resolved.construction;
    if (task) {
      return {
        hallLevel: resolved.level,
        progress: task.ratio,
        progressLabel: task.kind === 'upgrade' ? 'Yukseltiliyor' : 'Insa ediliyor',
      };
    }

    const upgrade = resolved.upgrade;
    if (!upgrade) {
      return { hallLevel: resolved.level, progress: 1, progressLabel: 'Azami seviye' };
    }

    // En DAR kaynak ilerlemeyi belirler: hepsi tamamlanmadan yukseltme olmaz.
    let ratio = 1;
    for (const key of RESOURCE_ORDER) {
      const need = upgrade.cost[key] ?? 0;
      if (need <= 0) continue;
      ratio = Math.min(ratio, this.world.state.resources[key] / need);
    }
    return {
      hallLevel: resolved.level,
      progress: ratio,
      progressLabel: `Sv. ${upgrade.toLevel} icin kaynak`,
    };
  }

  private onTileSelected(tile: TileData | null): void {
    if (!tile) {
      this.infoPanel.hide();
      this.relayout();
      return;
    }

    // Alt sayfalarin hepsi ayni alani kullanir; ikisi ayni anda acilmaz.
    if (this.buildMenu.isOpen) {
      this.buildMenu.hide();
    }
    this.cityPanel.hide();
    this.nav.setActiveTab(null);

    const building = tile.occupantUid
      ? this.world.state.buildings.get(tile.occupantUid) ?? null
      : null;
    this.infoPanel.show(tile, building, this.world.tick);
    this.relayout();
  }

  private onNotify(message: string, tone: 'info' | 'success' | 'error'): void {
    // Olay yolundan gelen bildirimler tek satirlik; baslik onlarin kendisi.
    this.notices.show(message, '', tone === 'error' ? 'error' : tone, 2600);
  }

  private onBuildingCompleted(building: BuildingInstance): void {
    this.notices.show(
      'Insaat tamamlandi!',
      `${getBuilding(building.type).name} (Seviye ${building.level})`,
      'success',
      2600,
    );
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
    this.notices.show(
      'Yukseltme tamamlandi!',
      `${getBuilding(building.type).name} (Seviye ${building.level})`,
      'success',
      2600,
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
    } else {
      this.infoPanel.hide();
      this.cityPanel.hide();
      this.buildMenu.show();
      this.nav.setActiveTab('buildings');
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
    this.nav.setActiveTab(null);
    this.cancelButton.setVisible(true);
    this.relayout();
    this.world.bus.emit('placement:start', defId);
    this.notices.show(`${getBuilding(defId).name} icin bir yer sec`, 'Yesil alanlara dokun.', 'info', 2600);
  }

  private cancelPlacement(): void {
    if (!this.placingId) return;
    this.placingId = null;
    this.cancelButton.setVisible(false);
    this.world.bus.emit('placement:cancel');
  }

  // --- Yerlesim ------------------------------------------------------------

  private onResize(): void {
    // Kenar paylari yon degisiminde degisebilir; yalnizca burada okunur.
    const next = readSafeAreaInsets();
    if (!insetsEqual(next, this.insets)) this.insets = next;
    // gameSize CIHAZ pikselindedir; yerlesim mantiksal olcuyle yapilir.
    this.layout(this.logicalWidth(), this.logicalHeight());
  }

  /**
   * Panel acilip kapandiginda gecerli ekran olculeriyle yeniden dizer.
   *
   * MANTIKSAL olcu kullanilir: oyun boyutu cihaz pikselindedir, arayuz ise
   * CSS pikselinde yazilmistir. Farki kamera yakinlastirmasi kapatir.
   */
  private relayout(): void {
    this.layout(this.logicalWidth(), this.logicalHeight());
  }

  /** Arayuzun yerlesimde kullandigi mantiksal genislik (CSS pikseli). */
  private logicalWidth(): number {
    return this.resolution?.logicalWidth ?? this.scale.width;
  }

  /** Arayuzun yerlesimde kullandigi mantiksal yukseklik (CSS pikseli). */
  private logicalHeight(): number {
    return this.resolution?.logicalHeight ?? this.scale.height;
  }

  /**
   * Tum arayuz ogelerini gecerli ekran olculerine ve sistem cubuklarina gore
   * yerlestirir. Tum kenar paylari 0 iken yerlesim onceki haliyle birebir aynidir.
   */
  private layout(width: number, height: number): void {
    const { top, right, bottom: bottomInset, left } = this.insets;
    const sideInset = Math.max(left, right);

    // Kaynak cubugu ust cubugun altina kaymaz.
    this.resourceBar.setPosition(0, top);
    this.resourceBar.layout(width, sideInset);

    /*
     * Alt gezinme cubugu en altta, sistem gezinme alaninin USTUNDE durur.
     * Butun alt sayfalar (insa menusu, bilgi paneli, sehir ozeti) onun da
     * ustunde acilir; bu yuzden panellere verilen "alt pay" cubugun
     * yuksekligini icerir.
     */
    this.nav.setPosition(0, height - bottomInset - BottomNav.height);
    this.nav.layout(width, sideInset);

    const panelInset = bottomInset + BottomNav.height;
    this.buildMenu.layout(width, height, panelInset);
    this.infoPanel.layout(width, height, panelInset);
    this.cityPanel.layout(width, height, panelInset);
    this.notices.layout(width, top + ResourceBar.height + 10, 62);

    /*
     * Ana aksiyon ekranin ALT ORTASINDA, acik panelin ve gezinme cubugunun
     * uzerinde durur. Ortada olmasi iki elle de tek elle de erisilebilir
     * kilar; sag kenardaki eski yeri sol elini kullanan oyuncuyu zorluyordu.
     */
    const bottom = height - panelInset - this.openPanelHeight() - UISpacing.edge - 42;
    this.buildButton.setPosition(width / 2, bottom);
    this.cancelButton.setPosition(left + UISpacing.edge + 55, bottom);

    /*
     * Yardimci dugmeler sehir gorunumunun sag kenarinda, ust cubugun
     * hemen altinda dikey bir sutun olusturur. Harita dugmesi sol altta,
     * ana aksiyonun karsisinda durur.
     */
    const sideX = width - right - UISpacing.edge - 24;
    let sideY = top + ResourceBar.height + 34;
    for (const button of this.sideButtons) {
      button.setPosition(sideX, sideY);
      sideY += button.diameterPx + 10;
    }
    this.mapButton.setPosition(left + UISpacing.edge + 24, bottom);
  }

  /** Acik olan butun alt sayfalari kapatir ve sekme isaretini temizler. */
  private closePanels(): void {
    if (this.buildMenu.isOpen) {
      this.buildMenu.hide();
    }
    this.infoPanel.hide();
    this.cityPanel.hide();
    this.nav.setActiveTab(null);
    this.relayout();
  }

  /**
   * Alt gezinme cubugunun sekmeleri.
   *
   * Her sekme SEHRIN gercek durumunu gosterir; sayilarin hepsi sistemlerden
   * okunur, arayuz kendi hesabini yapmaz.
   */
  private selectTab(tab: NavTab): void {
    this.closePanels();

    if (tab === 'city') {
      // Kadraji sehir merkezine dondurur; oyuncu nereye kaydirirsa kaydirsin
      // tek dokunusla merkeze doner.
      const city = this.scene.get(SceneKeys.City) as CityScene | undefined;
      city?.focusCity?.();
      this.nav.setActiveTab(null);
      return;
    }

    if (tab === 'buildings') {
      this.nav.setActiveTab('buildings');
      this.buildMenu.show();
      this.buildMenu.refreshAffordability(this.world.state.resources);
      this.relayout();
      return;
    }

    this.nav.setActiveTab(tab);
    if (tab === 'population') this.showPopulationPanel();
    else if (tab === 'workers') this.showWorkersPanel();
    else this.showMorePanel();
    this.relayout();
  }

  /**
   * Ayarlar sayfasi.
   *
   * Oyunda ses veya secenek sistemi yok; burada GERCEKTEN yapilabilen iki
   * sey gosterilir: sehrin olculeri ve kaydi sifirlama. Bos bir "ayarlar"
   * kabugu koymaktansa az ama gercek bilgi vermek yeglendi.
   */
  private showSettings(): void {
    this.closePanels();
    const res = this.resolution;
    this.cityPanel.show(
      'AYARLAR',
      [
        { label: 'Sehir olcusu', value: `${this.world.state.grid.size} x ${this.world.state.grid.size}` },
        { label: 'Yapi alani', value: `${this.world.plots.plots.length}` },
        { label: 'Ekran', value: `${Math.round(this.logicalWidth())}x${Math.round(this.logicalHeight())} @${res?.dpr ?? 1}x` },
        { label: 'Oyun suresi', value: `${Math.floor(this.world.tick / 60)} dk` },
      ],
      'Kaydi sifirlamak icin sayfayi kapatip tarayici verisini temizle.',
    );
    this.relayout();
  }

  private showPopulationPanel(): void {
    const eco = this.world.economy.snapshot;
    const food = eco.netPerMinute.food ?? 0;
    this.cityPanel.show(
      'NUFUS',
      [
        { label: 'Vatandas', value: `${eco.population} / ${eco.populationCapacity}` },
        { label: 'Calisan', value: `${eco.populationUsed}` },
        { label: 'Yiyecek akisi', value: `${food > 0 ? '+' : ''}${food.toFixed(1)}/dk`, highlight: food <= 0 },
        { label: 'Bos kapasite', value: `${Math.max(0, eco.populationCapacity - eco.population)}`, highlight: eco.population >= eco.populationCapacity },
      ],
      eco.population >= eco.populationCapacity
        ? 'Kapasite doldu: yeni vatandas icin ev kur.'
        : 'Yiyecek fazlasi oldukca sehre yeni vatandas gelir.',
    );
  }

  private showWorkersPanel(): void {
    const snapshot = this.world.workforce.snapshot;
    // Kadrosu eksik binalar - oyuncunun ilk bakmasi gereken yer.
    let understaffed = 0;
    for (const building of this.world.state.buildings.values()) {
      const resolved = this.world.buildings.resolve(building);
      if (resolved.workerRequirement > 0 && !resolved.staffed) understaffed += 1;
    }

    this.cityPanel.show(
      'ISCILER',
      [
        { label: 'Bosta', value: `${snapshot.idle}`, highlight: snapshot.idle > 0 },
        { label: 'Calisiyor', value: `${snapshot.working}` },
        { label: 'Yolda', value: `${snapshot.moving}` },
        { label: 'Kadrosu eksik bina', value: `${understaffed}`, highlight: understaffed > 0 },
      ],
      understaffed > 0
        ? 'Binaya dokunup + ile isci yolla.'
        : 'Butun binalarin kadrosu tam.',
    );
  }

  private showMorePanel(): void {
    const eco = this.world.economy.snapshot;
    const resources = this.world.state.resources;
    const capacity = this.world.resources.capacity;
    const full = RESOURCE_ORDER.filter((key) => resources[key] >= capacity).length;

    this.cityPanel.show(
      'SEHIR OZETI',
      [
        { label: 'Bina', value: `${this.world.state.buildings.size}` },
        { label: 'Depo kapasitesi', value: `${capacity}` },
        { label: 'Dolan kaynak', value: `${full}`, highlight: full > 0 },
        { label: 'Verim', value: `%${Math.round(eco.efficiency * 100)}`, highlight: eco.efficiency < 1 },
      ],
      full > 0 ? 'Depo doldu: Ambar kur ya da harca.' : 'Uretim depoya sigiyor.',
    );
  }

  /** Acik olan alt panelin yuksekligi; hicbiri acik degilse 0. */
  private openPanelHeight(): number {
    if (this.buildMenu.isOpen) return BuildMenu.height;
    if (this.infoPanel.isOpen) return InfoPanel.height;
    if (this.cityPanel.isOpen) return CityPanel.height;
    return 0;
  }

  /** Yuvarlak butona dokunulup dokunulmadigini yaricapla kontrol eder. */
  private hitsRound(button: RoundButton, x: number, y: number): boolean {
    const r = button.diameterPx / 2;
    return Phaser.Math.Distance.Between(button.x, button.y, x, y) <= r;
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
    bus.off('workforce:changed', this.onWorkforce, this);
    this.stopResolutionWatch?.();
    this.stopResolutionWatch = null;
    this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize, this);
    this.stopSafeAreaWatch?.();
    this.stopSafeAreaWatch = null;
  }
}
