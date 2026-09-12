import Phaser from 'phaser';
import { RESOURCE_META, RESOURCE_ORDER, TextureKeys } from '@/config/Constants';
import { resolveBuilding, ticksToSeconds } from '@/systems/BuildingResolver';
import { getBuilding } from '@/config/BuildingCatalog';
import { iconKeyFor } from '@/render/IconArt';
import { visualKeyFor } from '@/render/BuildingVisuals';
import { formatDuration } from '@/utils/Format';
import { TouchButton } from './TouchButton';
import { UIColors, UISpacing, UIText, labelStyle, titleStyle } from './UIStyle';
import type {
  BuildingInstance,
  BuildingPlot,
  ResolvedBuilding,
  ResourceAmounts,
  TileData,
} from '@/types';

/**
 * Panelin isci satirini cizmek icin ihtiyac duydugu sayilar.
 *
 * Hepsi WorkforceSystem'den okunur; panel kendi hesabini yapmaz.
 * `claimed` YOLDAKILERI de sayar - yer kontrolu bu sayiya gore yapilir,
 * aksi halde ayni bos yere iki isci yollanabilir gibi gorunurdu.
 */
export interface WorkerPanelInfo {
  /** Binada fiilen calisan isci. */
  working: number;
  /** Binaya bagli isci; yoldakiler dahil. */
  claimed: number;
  /** Binanin alabilecegi azami isci. */
  capacity: number;
  /** Sehirde bosta bekleyen isci. */
  idle: number;
}

/** Panelin disaridan aldigi tum baglantilar. */
export interface InfoPanelHooks {
  onDemolish: (uid: string) => void;
  onUpgrade: (uid: string) => void;
  onCancelUpgrade: (uid: string) => void;
  /** Maliyetin karsilanip karsilanamadigini soran yordam (ResourceSystem). */
  canAfford: (cost: ResourceAmounts) => boolean;
  onAssignWorker: (uid: string) => void;
  onReleaseWorker: (uid: string) => void;
  /** Binanin kadro durumu (WorkforceSystem). */
  workerInfo: (uid: string) => WorkerPanelInfo;
  /** Karodaki yapi alani (BuildingPlotSystem); yoksa null. */
  plotAt: (gx: number, gy: number) => BuildingPlot | null;
  onClose: () => void;
  /** Sehrin isci ozetini acar. */
  onShowWorkers: () => void;
}

/** Zemin turlerinin kullaniciya gosterilen adlari. */
const TERRAIN_LABELS: Record<string, string> = {
  grass: 'Cimen',
  soil: 'Verimli toprak',
  water: 'Su',
  rock: 'Kayalik',
};

/** Bolgelerin kullaniciya gosterilen adlari. */
const ZONE_LABELS: Record<string, string> = {
  civic: 'Kamusal alan',
  commerce: 'Ticaret bolgesi',
  residential: 'Konut bolgesi',
  production: 'Uretim bolgesi',
};

/**
 * Secilen alan veya bina hakkinda bilgi veren alt sayfa.
 *
 * BILGI HIYERARSISI (Sprint 13 §7)
 *   1. Bu ne?            - ad ve seviye
 *   2. Calisiyor mu?     - durum satiri, insaatta ilerleme cubugu
 *   3. Ne uretiyor?      - ikonlu uretim satiri
 *   4. Kadro             - isci sayaci ve +/- dugmeleri
 *   5. Sonraki adim      - yukseltme maliyeti, kazanci ve ana dugme
 *
 * Panel sehri TAMAMEN kapatmaz: ekranin alt ucte birinde durur ve hem
 * "Kapat" dugmesiyle hem de haritanin bos bir yerine dokunarak kapanir.
 */
export class InfoPanel extends Phaser.GameObjects.Container {
  private static readonly HEIGHT = 212;

  private readonly background: Phaser.GameObjects.NineSlice;
  /**
   * Binanin kendi gorseli.
   *
   * Referans duzeninde panelin solunda binanin resmi var. Ayri bir ikon
   * cizmek yerine BINANIN KENDI dokusu kucultuluyor: oyuncunun panelde
   * gordugu sey haritada durani birebir ayni.
   */
  private readonly thumb: Phaser.GameObjects.Image;
  private readonly thumbFrame: Phaser.GameObjects.NineSlice;
  private readonly titleText: Phaser.GameObjects.Text;
  private readonly levelText: Phaser.GameObjects.Text;
  private readonly statusText: Phaser.GameObjects.Text;
  private readonly bodyText: Phaser.GameObjects.Text;

  /** Uretim satiri: en fazla iki kaynak ikonu ve degeri. */
  private readonly outputIcons: Phaser.GameObjects.Image[] = [];
  private readonly outputTexts: Phaser.GameObjects.Text[] = [];

  /** Insaat/yukseltme ilerleme cubugu. */
  private readonly progressTrack: Phaser.GameObjects.Image;
  private readonly progressFill: Phaser.GameObjects.Image;

  private readonly demolishButton: TouchButton;
  private readonly upgradeButton: TouchButton;
  private readonly closeButton: TouchButton;
  /** Ikincil aksiyon: isci satirina dikkat ceker. */
  private readonly workersButton: TouchButton;
  /** Isci satiri: geri al, sayac, ata. */
  private readonly releaseButton: TouchButton;
  private readonly assignButton: TouchButton;
  private readonly workerText: Phaser.GameObjects.Text;

  private screenWidth: number;
  private screenHeight: number;
  private bottomInset = 0;
  private visibleState = false;
  private currentUid: string | null = null;
  /** Panelde gosterilen bina; bos karo seciliyse null. */
  private currentBuilding: BuildingInstance | null = null;
  /** Geri sayimi hesaplamak icin son bilinen simulasyon tiki. */
  private currentTick = 0;
  /** Yukseltme yuvasindaki butonun o anki islevi. */
  private upgradeButtonMode: 'upgrade' | 'cancel' = 'upgrade';

  constructor(
    scene: Phaser.Scene,
    width: number,
    height: number,
    private readonly hooks: InfoPanelHooks,
  ) {
    super(scene, 0, height);
    this.screenWidth = width;
    this.screenHeight = height;

    this.background = scene.add
      .nineslice(0, 0, TextureKeys.Panel, undefined, width, InfoPanel.HEIGHT, 18, 18, 18, 18)
      .setOrigin(0, 0);

    this.thumbFrame = scene.add
      .nineslice(0, 0, TextureKeys.ButtonUp, undefined, 62, 62, 14, 14, 14, 14)
      .setOrigin(0, 0);
    this.thumb = scene.add.image(0, 0, visualKeyFor('house', 1)).setOrigin(0.5, 1);

    this.titleText = scene.add
      .text(UISpacing.panelPadding, 20, '', titleStyle(18, UIText.accent))
      .setOrigin(0, 0.5);
    this.levelText = scene.add
      .text(0, 21, '', labelStyle(12, UIText.muted))
      .setOrigin(0, 0.5);
    this.statusText = scene.add
      .text(UISpacing.panelPadding, 44, '', labelStyle(12, UIText.primary, true))
      .setOrigin(0, 0.5);

    for (let i = 0; i < 2; i += 1) {
      this.outputIcons.push(
        scene.add.image(0, 0, iconKeyFor('food')).setOrigin(0.5, 0.5).setScale(0.72).setVisible(false),
      );
      this.outputTexts.push(
        scene.add.text(0, 0, '', labelStyle(14, UIText.primary, true)).setOrigin(0, 0.5).setVisible(false),
      );
    }

    this.progressTrack = scene.add
      .image(0, 0, TextureKeys.Pixel)
      .setOrigin(0, 0.5)
      .setTint(0x000000)
      .setAlpha(0.45)
      .setVisible(false);
    this.progressFill = scene.add
      .image(0, 0, TextureKeys.Pixel)
      .setOrigin(0, 0.5)
      .setTint(UIColors.accent)
      .setVisible(false);

    this.bodyText = scene.add.text(
      UISpacing.panelPadding,
      112,
      '',
      labelStyle(12, UIText.muted),
    );
    this.bodyText.setLineSpacing(3);

    this.workerText = scene.add
      .text(0, 0, '', labelStyle(13, UIText.primary, true))
      .setOrigin(0, 0.5);

    this.demolishButton = new TouchButton(scene, 0, 0, 'Yik', {
      width: 76,
      height: 44,
      fontSize: 13,
      color: UIText.danger,
      onPress: () => {
        if (this.currentUid) this.hooks.onDemolish(this.currentUid);
      },
    });

    this.upgradeButton = new TouchButton(scene, 0, 0, 'YUKSELT', {
      width: 150,
      height: 44,
      fontSize: 15,
      color: UIText.accent,
      onPress: () => {
        if (!this.currentUid) return;
        // Ayni yuva iki isi gorur: gorev yokken yukseltir, yukseltme
        // surerken iptal eder. Yerlesim degismez.
        if (this.upgradeButtonMode === 'cancel') {
          this.hooks.onCancelUpgrade(this.currentUid);
        } else {
          this.hooks.onUpgrade(this.currentUid);
        }
      },
    });

    this.workersButton = new TouchButton(scene, 0, 0, 'ISCILER', {
      width: 116,
      height: 44,
      fontSize: 13,
      onPress: () => this.hooks.onShowWorkers(),
    });

    this.closeButton = new TouchButton(scene, 0, 0, 'Kapat', {
      width: 72,
      height: 36,
      fontSize: 12,
      onPress: () => this.hooks.onClose(),
    });

    this.releaseButton = new TouchButton(scene, 0, 0, '-', {
      width: 44,
      height: 40,
      fontSize: 20,
      color: UIText.danger,
      onPress: () => {
        if (this.currentUid) this.hooks.onReleaseWorker(this.currentUid);
      },
    });

    this.assignButton = new TouchButton(scene, 0, 0, '+', {
      width: 44,
      height: 40,
      fontSize: 20,
      color: UIText.success,
      onPress: () => {
        if (this.currentUid) this.hooks.onAssignWorker(this.currentUid);
      },
    });

    this.add([
      this.background,
      this.thumbFrame,
      this.thumb,
      this.titleText,
      this.levelText,
      this.statusText,
      ...this.outputIcons,
      ...this.outputTexts,
      this.progressTrack,
      this.progressFill,
      this.bodyText,
      this.upgradeButton,
      this.workersButton,
      this.demolishButton,
      this.closeButton,
      this.releaseButton,
      this.assignButton,
      this.workerText,
    ]);
    this.layout(width, height);
    this.setVisible(false);
    scene.add.existing(this);
  }

  /** Panelin ekranda kapladigi yukseklik. */
  static get height(): number {
    return InfoPanel.HEIGHT;
  }

  /** Panelin ekranda olup olmadigini soyler. */
  get isOpen(): boolean {
    return this.visibleState;
  }

  /** Ekranda kapladigi dikdortgen (girdi engelleme icin). */
  bounds(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(0, this.y, this.screenWidth, InfoPanel.HEIGHT);
  }

  layout(width: number, height: number, bottomInset = 0): void {
    this.screenWidth = width;
    this.screenHeight = height;
    this.bottomInset = bottomInset;
    this.background.setSize(width, InfoPanel.HEIGHT);

    const left = UISpacing.panelPadding;
    const right = width - UISpacing.panelPadding;
    // Metin sutunu kucuk resmin sagindan baslar.
    const textLeft = left + 74;

    this.thumbFrame.setPosition(left, 14);
    this.closeButton.setPosition(right - 36, 22);
    this.bodyText.setPosition(left, 118).setWordWrapWidth(width - left * 2);
    this.titleText.setX(textLeft);
    this.statusText.setX(textLeft);

    // Uretim satiri - kucuk resmin sagindaki sutunda
    for (let i = 0; i < this.outputIcons.length; i += 1) {
      const x = textLeft + i * 104;
      this.outputIcons[i].setPosition(x + 10, 70);
      this.outputTexts[i].setPosition(x + 24, 70);
    }

    // Ilerleme cubugu - uretim satiriyla ayni yuvada durur.
    this.progressTrack.setPosition(textLeft, 70).setDisplaySize(right - textLeft, 10);
    this.progressFill.setPosition(textLeft, 70).setDisplaySize(1, 10);

    /*
     * Isci satiri panelin ortasinda: sayac solda, iki dugme sagda.
     *
     * Dugmeleri sayacin iki yanina koymak Sprint 8'de metnin "+" uzerine
     * binmesine yol acmisti (olculdu: 390 pikselde metin 193'e uzuyor,
     * buton 175'te). Sayac sabit solda, dugmeler sabit sagda durunca metin
     * uzasa bile cakisma olmaz.
     */
    const workerY = 96;
    this.workerText.setPosition(textLeft, workerY);
    this.assignButton.setPosition(right - 24, workerY);
    this.releaseButton.setPosition(right - 74, workerY);

    /*
     * Aksiyon satiri en altta: ana dugme (YUKSELT) genis ve solda, ikincil
     * ISCILER ortada, yikim en sagda ve kucuk. Referans duzenindeki iki
     * ana dugme burada YUKSELT ve ISCILER.
     */
    const actionY = InfoPanel.HEIGHT - 32;
    this.demolishButton.setPosition(right - 38, actionY);
    this.workersButton.setPosition(right - 118, actionY);
    this.upgradeButton.setPosition(left + 72, actionY);

    this.setY(this.visibleState ? this.openY() : height);
  }

  /** Panelin acik konumu; alt kenar payi kadar yukarida durur. */
  private openY(): number {
    return this.screenHeight - this.bottomInset - InfoPanel.HEIGHT;
  }

  /** Secilen hucreyi gosterir; hucre bossa alan bilgisi verilir. */
  show(tile: TileData, building: BuildingInstance | null, tick: number): void {
    this.currentUid = building?.uid ?? null;
    this.currentBuilding = building;
    this.currentTick = tick;

    if (building) {
      this.showBuilding(building);
    } else {
      this.showPlot(tile);
    }

    this.demolishButton.setVisible(building !== null);
    this.open();
  }

  /**
   * Insaat halindeki bina icin geri sayimi tazeler.
   * UIScene tarafindan duzenli araliklarla cagrilir; panel kapaliysa veya
   * bina tamamlanmissa hicbir sey yapmaz.
   */
  tick(currentTick: number): void {
    if (!this.visibleState) return;
    const building = this.currentBuilding;
    // Yalnizca devam eden bir gorev varken tazelenir.
    if (!building?.construction) return;
    this.currentTick = currentTick;
    this.showBuilding(building);
  }

  /**
   * Paneli mevcut secim icin yeniden cizer.
   * Kaynak degistiginde cagrilir; aksi halde yukseltme butonunun etkin/devre
   * disi durumu bayat kalir.
   */
  refresh(currentTick: number): void {
    if (!this.visibleState) return;
    this.currentTick = currentTick;
    if (this.currentBuilding) this.showBuilding(this.currentBuilding);
  }

  /** Paneli kapatir. */
  hide(): void {
    if (!this.visibleState) return;
    this.visibleState = false;
    this.currentUid = null;
    this.currentBuilding = null;
    this.scene.tweens.add({
      targets: this,
      y: this.screenHeight,
      duration: 160,
      ease: 'Cubic.easeIn',
      onComplete: () => this.setVisible(false),
    });
  }

  private open(): void {
    this.setVisible(true);
    if (this.visibleState) return;
    this.visibleState = true;
    this.scene.tweens.add({
      targets: this,
      y: this.openY(),
      duration: 200,
      ease: 'Cubic.easeOut',
    });
  }

  /**
   * Bina bilgisini gosterir.
   * Tum sayilar BuildingResolver'dan gelir; panel kendi hesabini yapmaz.
   */
  private showBuilding(building: BuildingInstance): void {
    const def = getBuilding(building.type);
    const resolved: ResolvedBuilding = resolveBuilding(building, def, this.currentTick);

    this.showThumb(def.id, resolved.level);
    this.titleText.setText(def.name);
    this.levelText
      .setText(`Seviye ${resolved.level}`)
      // Konum basligin GERCEK yerinden turer; baslik artik kucuk resmin
      // sagindan basliyor ve sabit kenar payi kullanmak ikisini ust uste
      // bindiriyordu (ekran goruntusuyle dogrulandi).
      .setPosition(this.titleText.x + this.titleText.width + 10, 21)
      .setVisible(true);

    const task = resolved.construction;
    this.showStatus(resolved);
    // resolveBuilding ilerlemeyi zaten hesapladi; burada tekrar hesaplanmaz.
    this.showProgress(task?.ratio ?? null, task !== null);

    /*
     * Insaat sirasinda uretim degerleri sifirdir; o seviyenin tanimini
     * gosteririz. Calisir binada ise GERCEK uretim gosterilir: kadro
     * eksikse "+4/dk" yazip 3 uretmek oyuncuyu yaniltirdi.
     */
    const potential = def.levels.find((l) => l.level === resolved.level)?.production ?? {};
    /*
     * Kadro eksikken GERCEK uretim sifirdir ve satir bombos kalirdi.
     * O durumda binanin NE URETEBILECEGI sonuk renkte gosterilir: oyuncu
     * hem gercegi (sifir) hem de potansiyeli gorur, satir da bos kalmaz.
     */
    const effective = resolved.effectiveProduction;
    const muted = !task && !this.hasOutput(effective) && this.hasOutput(potential);
    this.showOutputs(task || muted ? potential : effective, Boolean(task) || muted);

    const underBuild = task?.kind === 'build';
    this.showWorkerRow(building, resolved, underBuild === true);
    this.workersButton.setVisible(resolved.workerRequirement > 0);
    this.showDetails(def, resolved);

    // Buton yuvasi: yukseltme surerken iptal, aksi halde yukseltme.
    const upgrade = resolved.upgrade;
    if (task?.kind === 'upgrade') {
      this.upgradeButtonMode = 'cancel';
      this.upgradeButton.setText('IPTAL').setVisible(true).setEnabled(true);
    } else {
      this.upgradeButtonMode = 'upgrade';
      this.upgradeButton.setText('YUKSELT').setVisible(upgrade !== null);
      // Karsilanamayan yukseltme butonu devre disi gorunur; oyuncu tikladiktan
      // sonra degil, tiklamadan once anlar.
      this.upgradeButton.setEnabled(upgrade !== null && this.hooks.canAfford(upgrade.cost));
    }
  }

  /** Panelin sol ustundeki kucuk resmi binanin gorseliyle doldurur. */
  private showThumb(type: string, level: number): void {
    const key = visualKeyFor(type, level);
    this.thumb.setTexture(key).setVisible(true);
    this.thumbFrame.setVisible(true);

    // Resim cercevenin icine sigacak sekilde olceklenir.
    const source = this.scene.textures.get(key).getSourceImage();
    const scale = Math.min(54 / source.width, 54 / source.height);
    this.thumb.setScale(scale).setPosition(
      this.thumbFrame.x + 31,
      this.thumbFrame.y + 58,
    );
  }

  /** Durum satiri: oyuncunun ilk gormesi gereken sey binanin calisip calismadigidir. */
  private showStatus(resolved: ResolvedBuilding): void {
    const task = resolved.construction;
    if (task) {
      const verb = task.kind === 'upgrade' ? 'YUKSELTILIYOR' : 'INSA EDILIYOR';
      const detail =
        task.status === 'queued'
          ? 'sirada bekliyor'
          : `${formatDuration(ticksToSeconds(task.remainingTicks))} kaldi`;
      this.statusText.setText(`${verb} - ${detail}`).setColor(UIText.accent);
      return;
    }
    if (!resolved.operational) {
      this.statusText.setText('DURDURULDU').setColor(UIText.danger);
      return;
    }
    if (resolved.workerRequirement > 0 && !resolved.staffed) {
      this.statusText
        .setText(resolved.assignedWorkers === 0 ? 'ISCI YOK' : 'ISCI YETERSIZ')
        .setColor(UIText.danger);
      return;
    }
    this.statusText.setText('CALISIYOR').setColor(UIText.success);
  }

  /** Ilerleme cubugunu gosterir veya gizler. */
  private showProgress(ratio: number | null, visible: boolean): void {
    this.progressTrack.setVisible(visible);
    this.progressFill.setVisible(visible);
    if (!visible) return;
    const full = this.screenWidth - UISpacing.panelPadding * 2;
    this.progressFill.setDisplaySize(Math.max(2, full * Math.min(1, Math.max(0, ratio ?? 0))), 10);
  }

  /** Uretim satiri: ikon + dakikalik deger. */
  private showOutputs(production: Record<string, number | undefined>, muted = false): void {
    const keys = RESOURCE_ORDER.filter((key) => production[key]);
    for (let i = 0; i < this.outputIcons.length; i += 1) {
      const key = keys[i];
      if (!key) {
        this.outputIcons[i].setVisible(false);
        this.outputTexts[i].setVisible(false);
        continue;
      }
      this.outputIcons[i].setTexture(iconKeyFor(key)).setVisible(true).setAlpha(muted ? 0.5 : 1);
      this.outputTexts[i]
        .setText(`+${formatRate(production[key] ?? 0)}/dk`)
        .setColor(muted ? UIText.muted : UIText.primary)
        .setVisible(true);
    }
  }

  private hasOutput(production: Record<string, number | undefined>): boolean {
    return RESOURCE_ORDER.some((key) => production[key]);
  }

  /** Maliyet, kazanc ve kapasite bilgileri - panelin en alt katmani. */
  private showDetails(def: ReturnType<typeof getBuilding>, resolved: ResolvedBuilding): void {
    const lines: string[] = [];

    const populationCapacity =
      resolved.populationCapacity ||
      (def.levels.find((l) => l.level === resolved.level)?.populationCapacity ?? 0);
    const storageCapacity =
      resolved.storageCapacity ||
      (def.levels.find((l) => l.level === resolved.level)?.storageCapacity ?? 0);
    const capacity: string[] = [];
    if (populationCapacity) capacity.push(`+${populationCapacity} nufus`);
    if (storageCapacity) capacity.push(`+${storageCapacity} depo`);
    // Uretim satiri kadro eksikken zaten SONUK potansiyeli gosteriyor;
    // ayni bilgiyi burada tekrarlamak paneli kalabaliklastiriyordu.
    if (capacity.length) lines.push(capacity.join('   '));

    const upgrade = resolved.upgrade;
    if (upgrade) {
      const cost = RESOURCE_ORDER.filter((key) => upgrade.cost[key])
        .map((key) => `${RESOURCE_META[key].label} ${upgrade.cost[key]}`)
        .join('  ');
      lines.push(`Sv. ${upgrade.toLevel} icin: ${cost}`);

      /*
       * Yukseltmenin NE KAZANDIRDIGI da yazilir.
       *
       * Maliyeti gosterip getirisini gostermemek, oyuncuyu katalogdan
       * hesap yapmaya zorluyordu. Fark katalogdan okunur; panel kendi
       * hesabini yapmaz.
       */
      const next = def.levels.find((l) => l.level === upgrade.toLevel);
      const current = def.levels.find((l) => l.level === resolved.level);
      if (next && current) {
        const gains: string[] = [];
        for (const key of RESOURCE_ORDER) {
          const delta = (next.production?.[key] ?? 0) - (current.production?.[key] ?? 0);
          if (delta) gains.push(`${RESOURCE_META[key].label} +${formatRate(delta)}/dk`);
        }
        const popDelta = (next.populationCapacity ?? 0) - (current.populationCapacity ?? 0);
        if (popDelta) gains.push(`+${popDelta} nufus`);
        const storeDelta = (next.storageCapacity ?? 0) - (current.storageCapacity ?? 0);
        if (storeDelta) gains.push(`+${storeDelta} depo`);
        const workerDelta = (next.workerRequirement ?? 0) - (current.workerRequirement ?? 0);
        if (workerDelta) gains.push(`${workerDelta > 0 ? '+' : ''}${workerDelta} isci`);
        if (gains.length) lines.push(`Kazanc: ${gains.join('  ')}`);
      }
    }

    if (!lines.length) lines.push(def.description);
    this.bodyText.setText(lines.join('\n'));
  }

  /**
   * Isci atama satirini gosterir.
   *
   * Sayilar tek kaynaktan gelir: binanin aldigi isci ile ihtiyaci
   * BuildingResolver'dan, bostaki isci WorkforceSystem'den. Panel kendi
   * hesabini yapmaz. Butonlar mumkun olmayan islem icin SONUK gorunur -
   * oyuncu basmadan once anlar.
   */
  private showWorkerRow(
    building: BuildingInstance,
    resolved: ResolvedBuilding,
    underBuild: boolean,
  ): void {
    const need = resolved.workerRequirement;
    // Isci istemeyen bina (ev, depo) ve insaati suren bina icin satir yok.
    const visible = need > 0 && !underBuild && building.state === 'active';

    this.releaseButton.setVisible(visible);
    this.assignButton.setVisible(visible);
    this.workerText.setVisible(visible);
    if (!visible) return;

    const info = this.hooks.workerInfo(building.uid);
    const enRoute = info.claimed - info.working;

    // Yoldaki isci AYRI gosterilir: "2/3" yazip uretimin neden hala eksik
    // oldugunu soylememek oyuncuyu yanlis yonlendirirdi.
    const route = enRoute > 0 ? `  (+${enRoute} yolda)` : '';
    this.workerText.setText(`Isciler ${info.working} / ${need}${route}   Bosta ${info.idle}`);
    // Kadro eksikse dikkat cek; tamsa sakin dursun.
    this.workerText.setColor(info.claimed >= need ? UIText.primary : UIText.accent);

    // Yer kontrolu BAGLI isci sayisina gore; sistemin kendi kurali da budur.
    this.assignButton.setEnabled(info.claimed < info.capacity && info.idle > 0);
    this.releaseButton.setEnabled(info.claimed > 0);
  }

  /**
   * Bos karo secildiginde YAPI ALANI bilgisi gosterir.
   *
   * Sprint 12'de burada yalnizca zemin adi ve "bu alan bos" yaziyordu;
   * oyuncu bir alana dokundugunda "buraya ne yapabilirim?" sorusunun
   * cevabini alamiyordu. Artik bolge, kabul edilen bina turleri ve - alan
   * kilitliyse - kilidin sebebi yazilir.
   */
  private showPlot(tile: TileData): void {
    this.upgradeButton.setVisible(false);
    this.workersButton.setVisible(false);
    this.releaseButton.setVisible(false);
    this.assignButton.setVisible(false);
    this.workerText.setVisible(false);
    this.levelText.setVisible(false);
    this.thumb.setVisible(false);
    this.thumbFrame.setVisible(false);
    this.titleText.setX(UISpacing.panelPadding);
    this.statusText.setX(UISpacing.panelPadding);
    this.showOutputs({}, false);
    this.showProgress(null, false);

    const plot = this.hooks.plotAt(tile.gx, tile.gy);
    if (!plot) {
      this.titleText.setText(TERRAIN_LABELS[tile.terrain] ?? tile.terrain);
      this.statusText.setText('YAPIYA KAPALI').setColor(UIText.muted);
      this.bodyText.setText(
        `Konum ${tile.gx}, ${tile.gy}\nBurasi sokak veya dogal alan; bina kurulamaz.`,
      );
      return;
    }

    this.titleText.setText(ZONE_LABELS[plot.zone] ?? plot.zone);
    if (!plot.unlocked) {
      this.statusText.setText('KILITLI').setColor(UIText.accent);
      this.bodyText.setText(
        'Bu alan henuz acilmadi.\nSehir merkezini yukselterek yeni alanlar acilir.',
      );
      return;
    }

    this.statusText.setText('BOS YAPI ALANI').setColor(UIText.success);
    const names = plot.allowedTypes.map((type) => getBuilding(type).name).join(', ');
    this.bodyText.setText(
      `Kabul edilen binalar: ${names}\nInsa etmek icin alttaki INSA ET dugmesini kullan.`,
    );
  }
}

/** Kesirli uretim oranini kisa gosterir: 3 -> "3", 4.5 -> "4.5". */
function formatRate(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
