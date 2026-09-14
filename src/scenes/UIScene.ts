import Phaser from 'phaser';
import { RESOURCE_META, RESOURCE_ORDER, SceneKeys } from '@/config/Constants';
import { getBuilding } from '@/config/BuildingCatalog';
import { allResearch, getResearch } from '@/config/ResearchCatalog';
import { RESEARCH_BADGES } from '@/systems/ResearchSystem';
import type { ResearchError } from '@/systems/ResearchSystem';
import { resolveBuildPreview, ticksToSeconds } from '@/systems/BuildingResolver';
import { PLACEMENT_MESSAGES } from '@/systems/BuildingSystem';
import { BottomNav } from '@/ui/BottomNav';
import type { NavTab } from '@/ui/BottomNav';
import type { IconKind } from '@/render/IconArt';
import { BuildMenu } from '@/ui/BuildMenu';
import { CityPanel } from '@/ui/CityPanel';
import { ResearchPanel } from '@/ui/ResearchPanel';
import { InfoPanel } from '@/ui/InfoPanel';
import type { WorkerPanelInfo } from '@/ui/InfoPanel';
import type { CityHeaderInfo } from '@/ui/ResourceBar';
import { NotificationStack } from '@/ui/Notifications';
import { RoundButton } from '@/ui/RoundButton';
import {
  AllyStrip,
  IconRail,
  PlayerCard,
  QuestCard,
  ResourcePill,
  WideButton,
} from '@/ui/HudParts';
import { MiniMap } from '@/ui/MiniMap';
import { TouchButton } from '@/ui/TouchButton';
import { UISpacing, UIText } from '@/ui/UIStyle';
import { formatAmount, formatDuration, formatElapsed } from '@/utils/Format';
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
  TerrainType,
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
/**
 * Ustte kapsul olarak gosterilen kaynaklar.
 *
 * BESI DEGIL UCU. Referansta ustte uc kapsul var ve bu bir yer sorunu
 * degil bir dikkat sorunu: bes sayi yan yana konunca hicbiri one cikmaz.
 * Gerisi (yiyecek, bilgi) "DAHA > Sehir Ozeti" sayfasinda tam degerleriyle
 * duruyor - ust serit yalnizca oyuncunun harcarken bakmasi gereken uc
 * kaynagi tasir.
 */
const PILL_ORDER = ['gold', 'wood', 'stone'] as const;
type PillKey = (typeof PILL_ORDER)[number];

/** Sag raydaki "sehir ozeti" dugmesinin sirasi - bosta isci rozeti oraya duser. */
const RIGHT_RAIL_SUMMARY_INDEX = 2;

const PILL_ICON: Record<PillKey, IconKind> = {
  gold: 'gold',
  wood: 'wood',
  stone: 'stone',
};

export class UIScene extends Phaser.Scene {
  /** Cozunurluk yoneticisi; yoksa mantiksal olcu Phaser'dan okunur (dpr 1). */
  private resolution: ResolutionManager | null = null;
  private stopResolutionWatch: (() => void) | null = null;

  private world!: GameWorld;

  private buildMenu!: BuildMenu;
  private infoPanel!: InfoPanel;
  private notices!: NotificationStack;
  private playerCard!: PlayerCard;
  private pills!: Map<PillKey, ResourcePill>;
  private gearButton!: RoundButton;
  private questCard!: QuestCard;
  private leftRail!: IconRail;
  private rightRail!: IconRail;
  private allyStrip!: AllyStrip;
  private miniMap!: MiniMap;
  private buildButton!: WideButton;
  private cancelButton!: TouchButton;
  private nav!: BottomNav;
  private cityPanel!: CityPanel;
  private researchPanel!: ResearchPanel;

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

    /*
     * REFERANS DUZENI.
     *
     * Tam genislikteki ust cubuk kaldirildi. Yerine referanstaki dagilim
     * geldi: sol ustte oyuncu karti, onun sagindaki bosluga kaynak
     * kapsulleri, sol kenarda gorev karti ve ikon rayi, sag kenarda ikinci
     * ray, alt solda genis insa dugmesi, alt sagda mini harita.
     *
     * Bunun bir okunabilirlik gerekcesi var: tek bir genis cubuk sehrin
     * ustunden 112 piksel kesiyordu. Parcalara ayrilmis HUD ayni bilgiyi
     * tasiyor ama ARALARINDAN sehir gorunuyor - oyuncunun asil baktigi
     * sey sehir.
     */
    this.playerCard = new PlayerCard(this, 0, 0);

    this.pills = new Map();
    for (const key of PILL_ORDER) {
      this.pills.set(
        key,
        new ResourcePill(this, 0, 0, PILL_ICON[key], 100, () => this.explainResource(key)),
      );
    }

    this.gearButton = new RoundButton(this, 0, 0, {
      icon: 'settings',
      size: 38,
      onPress: () => this.showSettings(),
    });

    /*
     * Kart acilip kapandiginda yuksekligi degisir; altindaki ray ve
     * bildirimler yeniden yerlesmeli. Gorev LISTESINE erisim bu karttan
     * degil alt gezinme cubugundaki GOREVLER sekmesinden saglanir.
     */
    this.questCard = new QuestCard(this, 0, 0, 2, () => this.relayout());

    this.leftRail = new IconRail(this, 0, 0, [
      { icon: 'mail', onPress: () => this.comingSoon('Mesajlar') },
      { icon: 'buildingsNav', onPress: () => this.selectTab('quests') },
      { icon: 'friends', onPress: () => this.comingSoon('Arkadaslar') },
      { icon: 'settings', onPress: () => this.showSettings() },
      { icon: 'calendar', onPress: () => this.comingSoon('Gunluk odul') },
    ]);
    this.rightRail = new IconRail(this, 0, 0, [
      { icon: 'zoomIn', onPress: () => this.selectTab('city') },
      { icon: 'knowledge', onPress: () => this.openResearch() },
      { icon: 'chart', onPress: () => this.showMorePanel() },
      { icon: 'trophy', onPress: () => this.comingSoon('Basarilar') },
      { icon: 'star', onPress: () => this.comingSoon('One cikanlar') },
    ]);

    this.allyStrip = new AllyStrip(this, 0, 0, 150, () => this.comingSoon('Muttefikler'));
    this.miniMap = new MiniMap(this, 0, 0, () => this.selectTab('city'));

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
      onShowWorkers: () => this.showWorkersPanel(),
      onShowResearch: () => this.openResearch(),
    });
    this.cityPanel = new CityPanel(this, width, height, () => this.closePanels());
    this.researchPanel = new ResearchPanel(this, width, height, {
      stateOf: (id) => this.researchRowState(id),
      activeInfo: () => this.activeResearchInfo(),
      onStart: (id) => this.world.bus.emit('ui:start-research', id),
      onClose: () => this.closePanels(),
    });
    this.nav = new BottomNav(this, width, (tab) => this.selectTab(tab));
    this.notices = new NotificationStack(this, width, PlayerCard.HEIGHT + 22, 62);

    /*
     * ANA EYLEM: alt solda GENIS dugme.
     *
     * Referansta yuvarlak bir rozet degil, ikonu ve yazisi yan yana duran
     * genis bir parsomen dugme. Genis bicim hem yaziya yer acar hem de
     * alt sagdaki mini haritayla simetrik bir taban olusturur.
     */
    this.buildButton = new WideButton(this, 0, 0, 160, 'ship', 'Insa Et', () =>
      this.toggleBuildMenu(),
    );

    this.cancelButton = new TouchButton(this, 0, 0, 'Vazgec', {
      width: 110,
      height: 46,
      color: UIText.danger,
      onPress: () => this.cancelPlacement(),
    });
    this.cancelButton.setVisible(false);

    /*
     * Gorev karti YERLESIMDEN ONCE doldurulur.
     *
     * Kartin yuksekligi satir sayisindan turer; bos kartla yerlesim
     * yapilinca yukseklik kucuk cikiyor ve hem kartin ikinci satiri hem
     * de altindaki her sey yanlis yere oturuyordu (ekran goruntusunde
     * ikinci gorev satiri bildirim kartinin altinda kaliyordu).
     */
    this.questCard.setRows(this.questRows());

    this.insets = readSafeAreaInsets();
    this.layout(width, height);
    this.bindEvents();
    this.pushInitialState();

    // Insaat geri sayimi panel acikken de ilerlesin.
    this.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => {
        this.infoPanel.tick(this.world.tick);
        // Arastirma arka planda ilerliyor; panel acikken kalan sure canli kalmali.
        if (this.researchPanel.isOpen) this.researchPanel.refresh();
      },
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

    /*
     * ESKI KURAL KALDIRILDI: "ekranin ust N pikseli her zaman bloklu".
     *
     * O kural tam genislikteki ust cubuk icin dogruydu. Artik ustte
     * yalnizca kart ve kapsuller var; aralarindan sehir gorunuyor ve
     * oyuncunun oraya dokunabilmesi gerekiyor. Bloklama artik parca
     * parca, asagida.
     */
    if (this.buildMenu.isOpen && Phaser.Geom.Rectangle.Contains(this.buildMenu.bounds(), screenX, screenY)) {
      return true;
    }
    if (this.infoPanel.isOpen && Phaser.Geom.Rectangle.Contains(this.infoPanel.bounds(), screenX, screenY)) {
      return true;
    }
    if (this.cityPanel.isOpen && Phaser.Geom.Rectangle.Contains(this.cityPanel.bounds(), screenX, screenY)) {
      return true;
    }
    if (
      this.researchPanel.isOpen &&
      Phaser.Geom.Rectangle.Contains(this.researchPanel.bounds(), screenX, screenY)
    ) {
      return true;
    }
    // Alt gezinme cubugu her zaman girdiyi yakalar; arkasindaki haritaya
    // dokunmak sehri yanlislikla degistirirdi.
    if (Phaser.Geom.Rectangle.Contains(this.nav.bounds(), screenX, screenY)) return true;
    /*
     * HUD PARCALARININ TAMAMI girdiyi yakalar.
     *
     * Ust cubuk tek parcayken "ekranin ust 112 pikseli" demek yetiyordu.
     * Dagitilmis duzende her parca kendi dikdortgenini bildirmek zorunda:
     * biri unutulursa o parcanin uzerine dokunmak arkadaki sehre gecer ve
     * oyuncu farkinda olmadan bina kurar. Bu, harita cercevesinde bir kez
     * yasandi ve buradaki listenin eksiksiz olmasi o yuzden onemli.
     */
    for (const part of [
      this.playerCard,
      this.questCard,
      this.leftRail,
      this.rightRail,
      this.miniMap,
      this.allyStrip,
      this.buildButton,
    ]) {
      if (part.visible && Phaser.Geom.Rectangle.Contains(part.bounds(), screenX, screenY)) {
        return true;
      }
    }
    for (const pill of this.pills.values()) {
      if (pill.visible && Phaser.Geom.Rectangle.Contains(pill.bounds(), screenX, screenY)) {
        return true;
      }
    }
    if (this.gearButton.visible && this.hitsRound(this.gearButton, screenX, screenY)) return true;
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
    bus.on('research:completed', this.onResearchCompleted, this);
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

  /** Isci durumu degisti: rozet ve acik panel tazelenir. */
  private onWorkforce(snapshot: WorkforceSnapshot): void {
    this.showIdleWorkers(snapshot.idle);
    this.infoPanel.refresh(this.world.tick);
  }

  /**
   * BOSTA ISCI ROZETI.
   *
   * Eski tam genislikteki cubukta bosta isci sayisi surekli goruntudeydi.
   * Referans duzende oyle bir alan yok ve bu bilgiyi tamamen kaybetmek
   * gercek bir gerileme olurdu: Sprint 15'in 60 dakikalik olcumu bosta
   * isci birikmesinin gec oyunun iki temel sorunundan biri oldugunu
   * gostermisti. Bilgi, sag raydaki ozet dugmesinin uzerinde kirmizi bir
   * sayaca tasindi - goz ucuyla gorunur, dokununca sayfayi acar.
   */
  private showIdleWorkers(idle: number): void {
    this.rightRail.setBadge(RIGHT_RAIL_SUMMARY_INDEX, idle);
  }

  /** Acilista mevcut durumu arayuze yansitir ve cevrimdisi kazanci bildirir. */
  private pushInitialState(): void {
    this.world.resources.emitChange();
    this.onEconomy(this.world.economy.snapshot);

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
    this.refreshPills(resources, capacity);
    this.questCard.setRows(this.questRows());
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
    /*
     * Isci sayaci her tikte de tazelenir.
     *
     * workforce:changed yalnizca ATAMA degistiginde yayinlanir; nufus
     * buyuyup yeni bir isci bosta dogdugunda degil. O olay olmadan rozet
     * bir sonraki atamaya kadar bayat kalirdi.
     */
    this.showIdleWorkers(this.world.workforce.snapshot.idle);
    void snapshot;

    const header = this.cityHeader();
    this.playerCard.setInfo(
      'ANCIENT CITY',
      header.hallLevel,
      header.progress,
      header.progressLabel,
    );
    this.refreshMiniMap();
    /*
     * Isci sayaci her tikte de tazelenir.
     *
     * workforce:changed yalnizca ATAMA degistiginde yayinlanir; nufus buyuyup
     * yeni bir isci bosta dogdugunda degil. O olay olmadan ust cubuktaki
     * "Bosta N isci" bir sonraki atamaya kadar bayat kalirdi.
     */
  }

  /**
   * Ust kapsulleri tazeler.
   *
   * Depo tavanina yaklasan kaynak "x/y" olarak yazilir ve rengi doner -
   * ayni kural eski kaynak kartlarindaydi ve orada ise yaramisti:
   * "neden birikmiyor?" sorusunun cevabi kapasitenin kendisi.
   */
  private refreshPills(resources: ResourcePool, capacity: number): void {
    for (const key of PILL_ORDER) {
      const pill = this.pills.get(key);
      if (!pill) continue;
      const value = resources[key] ?? 0;
      const ratio = capacity > 0 ? value / capacity : 0;
      const near = ratio >= 0.85;
      pill.setValue(
        near ? `${formatAmount(value)}/${formatAmount(capacity)}` : formatAmount(value),
        value >= capacity ? UIText.danger : near ? UIText.accent : UIText.primary,
      );
    }
  }

  /**
   * Mini haritayi besler.
   *
   * Izgara fotografi her cagrida uretilir ama MiniMap onu yalnizca
   * gercekten degistiyse yeniden cizer; kamera hareketi tek bir pikseli
   * bile yeniden cizdirmez.
   */
  private refreshMiniMap(): void {
    const grid = this.world.state.grid;
    const size = grid.size;
    const terrain: TerrainType[][] = [];
    const occupied: boolean[][] = [];
    for (let gy = 0; gy < size; gy += 1) {
      const terrainRow: TerrainType[] = [];
      const occupiedRow: boolean[] = [];
      for (let gx = 0; gx < size; gx += 1) {
        const tile = grid.getTile(gx, gy);
        terrainRow.push(tile?.terrain ?? 'grass');
        occupiedRow.push(Boolean(tile?.occupantUid));
      }
      terrain.push(terrainRow);
      occupied.push(occupiedRow);
    }
    this.miniMap.updateGrid({ size, terrain, occupied });

    const city = this.scene.get(SceneKeys.City) as CityScene | undefined;
    const view = city?.cameraGridRatio?.();
    if (view) this.miniMap.setViewport(view.x, view.y);
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
    this.researchPanel.hide();
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

  /** Arastirma bitti: bildir ve acik paneli tazele. */
  private onResearchCompleted(active: { id: string }): void {
    const def = getResearch(active.id);
    this.notices.show(
      'Arastirma tamamlandi!',
      def?.description ?? def?.name ?? active.id,
      'success',
      3600,
    );
    if (this.researchPanel.isOpen) this.researchPanel.refresh();
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
      this.researchPanel.hide();
      this.buildMenu.show();
      this.nav.setActiveTab(null);
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

    /*
     * UST BLOK: sol ustte oyuncu karti, sagindaki bosluga kaynak
     * kapsulleri ve en sagda ayar dugmesi.
     *
     * Kapsuller kartin SAGINDAN baslar ve kalan genisligi esit boler; dar
     * telefonda (360) kart 186, ayar 38, paylar ve bosluklar cikinca
     * kapsullere ~110 kalir - uc kapsul bu genislige sigmaz, bu yuzden
     * kapsuller kartin ALTINA iner. Kararin olcusu ekranda: esikten
     * dar ekranda iki satir, genisinde tek satir.
     */
    const edge = UISpacing.edge;
    const contentLeft = left + edge;
    const contentRight = width - right - edge;

    this.playerCard.setPosition(contentLeft, top + edge);

    const gearSize = 34;
    this.gearButton.setPosition(contentRight - gearSize / 2, top + edge + gearSize / 2);

    const pillGap = 5;
    const pillsRight = contentRight - gearSize - 8;
    const inlineLeft = contentLeft + PlayerCard.WIDTH + 6;
    const inlineSpace = pillsRight - inlineLeft;
    /*
     * Kapsuller kartin YANINA sigiyorsa oraya, sigmiyorsa altina.
     *
     * Esik 92'den 74'e indi: kapsuller kucululdu ve "12.450 +" artik 74
     * piksele sigiyor. Fark buyuk - yan yana dizilince ust blok bir satir
     * kisaliyor ve o satir dogrudan SEHRE kaliyor.
     */
    const stacked = inlineSpace < PILL_ORDER.length * 74;

    const pillLeft = stacked ? contentLeft : inlineLeft;
    const pillSpace = (stacked ? contentRight - contentLeft : inlineSpace);
    const pillWidth = (pillSpace - pillGap * (PILL_ORDER.length - 1)) / PILL_ORDER.length;
    const pillY = stacked
      ? top + edge + PlayerCard.HEIGHT + 5
      : top + edge + (PlayerCard.HEIGHT - ResourcePill.HEIGHT) / 2;

    PILL_ORDER.forEach((key, i) => {
      const pill = this.pills.get(key);
      if (!pill) return;
      pill.setWidth(pillWidth);
      pill.setPosition(pillLeft + (pillWidth + pillGap) * i, pillY);
    });

    /** Ust blogun bittigi yer; altindaki her sey buradan baslar. */
    const topBlockBottom = stacked
      ? pillY + ResourcePill.HEIGHT
      : top + edge + PlayerCard.HEIGHT;

    // Gorev karti ust blogun hemen altinda, sol kenarda; muttefik seridi
    // onun karsisinda, sag kenarda.
    this.questCard.setPosition(contentLeft, topBlockBottom + 8);

    /*
     * Muttefik seridi gorev kartindan ARTAN yere sigar.
     *
     * 360 pikselik ekranda sabit 150 piksel sigmiyordu ve iki panel ust
     * uste biniyordu (mobil olcum yakaladi). Artan yer seridin asgari
     * olcusunun altindaysa serit hic gosterilmez - sikismis, okunmaz bir
     * serit, olmayan seritten daha kotudur.
     */
    const allySpace = contentRight - (contentLeft + QuestCard.WIDTH + 10);
    const showAllies = allySpace >= AllyStrip.minWidth;
    this.allyStrip.setVisible(showAllies);
    if (showAllies) {
      this.allyStrip.resize(allySpace);
      this.allyStrip.setPosition(contentRight - allySpace, topBlockBottom + 8);
    }

    /*
     * Alt gezinme cubugu en altta, sistem gezinme alaninin USTUNDE durur.
     * Butun alt sayfalar (insa menusu, bilgi paneli, sehir ozeti) onun da
     * ustunde acilir; bu yuzden panellere verilen "alt pay" cubugun
     * yuksekligini icerir.
     */
    this.nav.setPosition(0, height - bottomInset - BottomNav.height);
    this.nav.layout(width, sideInset);

    const panelInset = bottomInset + BottomNav.height;
    /** Alt siranin oturdugu taban; acik panel varsa yukari cikar. */
    const bottomBase = height - panelInset - this.openPanelHeight() - edge;
    this.buildMenu.layout(width, height, panelInset);
    this.infoPanel.layout(width, height, panelInset);
    this.cityPanel.layout(width, height, panelInset);
    this.researchPanel.layout(width, height, panelInset);
    /*
     * Bildirimler GOREV KARTININ ALTINDAN baslar.
     *
     * Ilk denemede ust blogun hemen altindan basliyorlardi ve gorev
     * kartini tamamen ortuyorlardi (ekran goruntusuyle goruldu: karttan
     * yalnizca tek bir satir gorunuyordu). Bildirim gecici, gorev karti
     * kalici - gecici olan kalicinin ustune binemez.
     */
    /*
     * BILDIRIMLER ARTIK ALT SIRANIN USTUNDE, SEHRIN ORTASINDA DEGIL.
     *
     * Ust bolgede duruyorlardi ve ekranin en degerli yerini - sehrin
     * gorundugu orta alani - gecici kartlarla dolduruyorlardi. Referansta
     * o alan tamamen sehre ait. Kartlar alt sira ile gezinme cubugu
     * arasindaki seride tasindi: gorunurler, ama sehri ortmuyorlar.
     */
    /*
     * Kartlar alt siranin TAMAMEN USTUNDE durur.
     *
     * Once insa dugmesinin ustune hizalanmislardi; ama alt siranin en
     * YUKSEK ogesi mini harita (98'e karsi 46) ve alttaki kart onun
     * uzerine biniyordu. Yan paylarla daraltmak da cozum degildi: kart
     * o kadar daraldi ki "Insaat tamamlandi!" basligi "Insaat tama..."
     * diye kisaldi - cakismayi cozerken mesaji kaybettik.
     *
     * Dogru cozum yukari tasimak: en yuksek komsunun ustunde hicbir pay
     * gerekmiyor ve kart tam genisligini koruyor.
     */
    const noticeHeight = 44 * 2 + 8;
    this.notices.layout(
      width,
      Math.max(topBlockBottom + 8, bottomBase - MiniMap.SIZE - 8 - noticeHeight),
      0,
      0,
    );

    /*
     * ALT SIRA: solda genis insa dugmesi, sagda mini harita.
     *
     * Ikisi ayni taban cizgisine oturur ve ekranin iki ucunu tutar;
     * aralarindaki bosluktan sehir gorunur. Acik bir panel varsa ikisi de
     * onun ustune cikar.
     */
    this.miniMap.setPosition(contentRight - MiniMap.SIZE, bottomBase - MiniMap.SIZE);
    this.buildButton.setPosition(contentLeft, bottomBase - WideButton.HEIGHT);
    this.cancelButton.setPosition(
      contentLeft + 55,
      bottomBase - WideButton.HEIGHT - 34,
    );

    /*
     * IKON RAYLARI ekranin dikey ortasinda, iki kenarda.
     *
     * Dikeyde ortalanmalari bilincli: ust blok ve alt sira zaten kenarlari
     * tutuyor: raylar da onlara yapissaydi kenarlar tikanir, sehir dar bir
     * pencereye sikisirdi.
     */
    /*
     * Her ray, KENDI TARAFINDAKI ustteki panelin altindan baslar.
     *
     * Solda gorev karti, sagda muttefik seridi. Ilk surumde yalnizca sol
     * ray kisitlanmisti ve 360 pikselik ekranda sag ray muttefik seridine
     * biniyordu (mobil olcum yakaladi: "muttefikler | sag ray"). Iki taraf
     * simetrik kisitlanmali - yoksa ayni hata her yeni ust panelde
     * tekrarlar.
     */
    /*
     * ALT SAYFA ACIKKEN RAYLAR GIZLENIR.
     *
     * Olcum sunu gosterdi: 360x800'de bilgi paneli acikken insa dugmesi
     * yukari cikiyor ve bes dugmelik rayla ust uste biniyor - o yukseklikte
     * ikisi birden GERCEKTEN sigmiyor (kanal 222 piksel, ray 226).
     *
     * Sikistirmak yanlis cozum olurdu: dokunma hedefleri asgarinin altina
     * inerdi. Dogru cozum, acik bir sayfanin arkasindaki raylarin zaten
     * erisilemez olmasi - gizlemek hem cakismayi bitirir hem de oyuncunun
     * dikkatini acik sayfada tutar.
     */
    const panelOpen = this.openPanelHeight() > 0;
    /*
     * Alt sayfa acilinca gorev karti kapanir: acik kart, sayfanin ustunde
     * kalan dar seridi de yiyordu. Kapanma gercekten olduysa yerlesim bir
     * kez daha kosar, cunku kartin yuksekligi degisti.
     */
    if (panelOpen && this.questCard.collapse()) {
      this.relayout();
      return;
    }
    this.leftRail.setVisible(!panelOpen);
    this.rightRail.setVisible(!panelOpen);

    const railsBase = (top + bottomBase) / 2;
    const leftTop = topBlockBottom + 8 + this.questCard.heightPx + 12;
    const rightTop =
      topBlockBottom + 8 + (this.allyStrip.visible ? AllyStrip.HEIGHT + 12 : 0);

    this.leftRail.setPosition(
      contentLeft,
      Math.max(leftTop, railsBase - this.leftRail.heightPx / 2),
    );
    this.rightRail.setPosition(
      contentRight - IconRail.WIDTH,
      Math.max(rightTop, railsBase - this.rightRail.heightPx / 2),
    );
  }

  /** Acik olan butun alt sayfalari kapatir ve sekme isaretini temizler. */
  private closePanels(): void {
    if (this.buildMenu.isOpen) {
      this.buildMenu.hide();
    }
    this.infoPanel.hide();
    this.cityPanel.hide();
    this.researchPanel.hide();
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

    this.nav.setActiveTab(tab);
    /*
     * SEKME -> SAYFA ESLEMESI.
     *
     * Referanstaki bes sekmenin hepsinin oyunda bir karsiligi yok.
     * Olmayanlari SESSIZCE bos birakmak yerine, en yakin gercek sayfaya
     * baglandilar: "Harita" kadraji sehre dondurur, "Envanter" kaynak
     * ozetini acar, "Profil" nufus sayfasini. Boylece hicbir sekme
     * oyuncuya hicbir sey yapmadan geri donmez.
     */
    if (tab === 'map') {
      const city = this.scene.get(SceneKeys.City) as CityScene | undefined;
      city?.focusCity?.();
      this.nav.setActiveTab(null);
      return;
    }
    if (tab === 'quests') this.showQuestPanel();
    else if (tab === 'inventory') this.showMorePanel();
    else this.showPopulationPanel();
    this.relayout();
  }

  /** Gorev sayfasi: gunun gorevleri tam listeyle. */
  private showQuestPanel(): void {
    const quests = this.questRows();
    this.cityPanel.show(
      'GOREVLER',
      quests.map((q) => ({ label: q.label, value: `${q.done}/${q.total}` })),
      'Gorevler sehrin durumundan turer; tamamlandiginda kendiliginden isaretlenir.',
    );
  }

  /**
   * Gunun gorevleri.
   *
   * OYUN KURALI EKLEMEZ: her gorev, sehrin ZATEN olcttugu bir degeri
   * okur. Yeni bir ilerleme sistemi kurmak Sprint 18'in "oyun mantigina
   * dokunma" sinirini asardi; bunlar yalnizca mevcut durumun okunusu.
   */
  private questRows(): Array<{ icon: IconKind; label: string; done: number; total: number }> {
    const buildings = this.world.state.buildings.size;
    const markets = this.world.state.countOf('market');
    return [
      { icon: 'cart', label: 'Pazar kur', done: Math.min(markets, 1), total: 1 },
      { icon: 'questHouse', label: '5 yeni bina insa et', done: Math.min(buildings, 5), total: 5 },
    ];
  }

  /** Henuz sistemi olmayan bolumler icin acik cevap. */
  private comingSoon(title: string): void {
    this.notices.show(title, 'Bu bolum yakinda acilacak.', 'info', 2400);
  }

  /** Kapsuldeki "+" - kaynagin nereden geldigini soyler. */
  private explainResource(key: PillKey): void {
    const meta = RESOURCE_META[key];
    const rate = this.world.economy.snapshot.netPerMinute[key] ?? 0;
    this.notices.show(
      meta.label,
      `Dakikada ${rate.toFixed(1)}. Uretimi artirmak icin ilgili binayi kur ya da yukselt.`,
      'info',
      2600,
    );
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

  /** Akademi panelinden gelen istek: arastirma sayfasini acar. */
  private openResearch(): void {
    this.closePanels();
    this.researchPanel.show();
    this.relayout();
  }

  /** Bir arastirmanin oyuncuya gorunen durumu. */
  private researchRowState(id: string): {
    done: boolean;
    active: boolean;
    startable: boolean;
    blocked: string;
  } {
    const research = this.world.research;
    const done = research.completed.has(id as never);
    const active = research.active?.id === id;
    if (done || active) return { done, active, startable: false, blocked: '' };

    const check = research.canStart(id);
    if (check.ok) return { done: false, active: false, startable: true, blocked: '' };

    /*
     * Satirda ROZET metni kullanilir, bildirim cumlesi degil: satir dar ve
     * uzun metin teknoloji adinin uzerine biniyordu. Akademi seviyesi
     * sarti tanimdan okunur, boylece rozet gercek gereksinimi soyler.
     */
    const reason = (check as { reason: ResearchError }).reason;
    const needed = getResearch(id)?.requiredAcademyLevel ?? 2;
    return {
      done: false,
      active: false,
      startable: false,
      blocked: reason === 'academy_level' ? `AKADEMI Sv.${needed}` : RESEARCH_BADGES[reason],
    };
  }

  /** Devam eden arastirmanin adi, kalan suresi ve ilerlemesi. */
  private activeResearchInfo(): { name: string; remaining: string; progress: number } | null {
    const active = this.world.research.active;
    if (!active) return null;
    const def = getResearch(active.id);
    return {
      name: def?.name ?? active.id,
      remaining: `${formatDuration(ticksToSeconds(this.world.research.remainingTicks))} kaldi`,
      progress: this.world.research.progress,
    };
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
        {
          label: 'Arastirma',
          value: this.world.research.active
            ? 'suruyor'
            : `${this.world.research.completed.size}/${allResearch().length}`,
          highlight: this.world.research.active !== null,
        },
      ],
      full > 0 ? 'Depo doldu: Ambar kur ya da harca.' : 'Uretim depoya sigiyor.',
    );
  }

  /** Acik olan alt panelin yuksekligi; hicbiri acik degilse 0. */
  private openPanelHeight(): number {
    if (this.buildMenu.isOpen) return BuildMenu.height;
    if (this.infoPanel.isOpen) return InfoPanel.height;
    if (this.cityPanel.isOpen) return CityPanel.height;
    if (this.researchPanel.isOpen) return ResearchPanel.height;
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
    bus.off('research:completed', this.onResearchCompleted, this);
    this.stopResolutionWatch?.();
    this.stopResolutionWatch = null;
    this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize, this);
    this.stopSafeAreaWatch?.();
    this.stopSafeAreaWatch = null;
  }
}
