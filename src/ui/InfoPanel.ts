import Phaser from 'phaser';
import { RESOURCE_META, RESOURCE_ORDER, TextureKeys } from '@/config/Constants';
import { resolveBuilding, ticksToSeconds } from '@/systems/BuildingResolver';
import { getBuilding } from '@/config/BuildingCatalog';
import { formatDuration } from '@/utils/Format';
import { TouchButton } from './TouchButton';
import { UISpacing, UIText, labelStyle } from './UIStyle';
import type { BuildingInstance, ResolvedBuilding, ResourceAmounts, TileData } from '@/types';

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

/** Zemin turlerinin kullaniciya gosterilen adlari. */
const TERRAIN_LABELS: Record<string, string> = {
  grass: 'Cimen',
  soil: 'Verimli toprak',
  water: 'Su',
  rock: 'Kayalik',
};

/**
 * Secilen hucre veya bina hakkinda bilgi veren alt panel.
 * Bina seciliyse uretim/isci ozeti ve yikma butonu gosterilir.
 */
export class InfoPanel extends Phaser.GameObjects.Container {
  /**
   * Panel yuksekligi.
   *
   * Sprint 8'de 132'den buyutuldu: alta isci atama satiri eklendi. Eski
   * yukseklikte Sehir Merkezi gibi cok satirli binalarin son satiri zaten
   * panelin disina tasiyordu.
   */
  private static readonly HEIGHT = 178;

  private readonly background: Phaser.GameObjects.NineSlice;
  private readonly titleText: Phaser.GameObjects.Text;
  private readonly bodyText: Phaser.GameObjects.Text;
  private readonly demolishButton: TouchButton;
  private readonly upgradeButton: TouchButton;
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
    private readonly onDemolish: (uid: string) => void,
    private readonly onUpgrade: (uid: string) => void,
    private readonly onCancelUpgrade: (uid: string) => void,
    /** Maliyetin karsilanip karsilanamadigini soran yordam (ResourceSystem). */
    private readonly canAfford: (cost: ResourceAmounts) => boolean,
    /** Bu binaya bosta bir isci yolla. */
    private readonly onAssignWorker: (uid: string) => void,
    /** Bu binadan bir isciyi geri cek. */
    private readonly onReleaseWorker: (uid: string) => void,
    /** Binanin kadro durumu (WorkforceSystem). */
    private readonly workerInfo: (uid: string) => WorkerPanelInfo,
  ) {
    super(scene, 0, height);
    this.screenWidth = width;
    this.screenHeight = height;

    this.background = scene.add
      .nineslice(0, 0, TextureKeys.Panel, undefined, width, InfoPanel.HEIGHT, 18, 18, 18, 18)
      .setOrigin(0, 0);

    this.titleText = scene.add.text(
      UISpacing.panelPadding,
      14,
      '',
      labelStyle(17, UIText.accent, true),
    );

    this.bodyText = scene.add.text(
      UISpacing.panelPadding,
      42,
      '',
      labelStyle(13, UIText.primary),
    );
    this.bodyText.setLineSpacing(4);

    this.demolishButton = new TouchButton(scene, 0, 0, 'Yik', {
      width: 96,
      height: 42,
      fontSize: 14,
      color: UIText.danger,
      onPress: () => {
        if (this.currentUid) this.onDemolish(this.currentUid);
      },
    });

    this.upgradeButton = new TouchButton(scene, 0, 0, 'Yukselt', {
      width: 96,
      height: 42,
      fontSize: 14,
      color: UIText.accent,
      onPress: () => {
        if (!this.currentUid) return;
        // Ayni yuva iki isi gorur: gorev yokken yukseltir, yukseltme
        // surerken iptal eder. Yerlesim degismez.
        if (this.upgradeButtonMode === 'cancel') {
          this.onCancelUpgrade(this.currentUid);
        } else {
          this.onUpgrade(this.currentUid);
        }
      },
    });

    this.releaseButton = new TouchButton(scene, 0, 0, '-', {
      width: 46,
      height: 40,
      fontSize: 20,
      color: UIText.danger,
      onPress: () => {
        if (this.currentUid) this.onReleaseWorker(this.currentUid);
      },
    });

    this.assignButton = new TouchButton(scene, 0, 0, '+', {
      width: 46,
      height: 40,
      fontSize: 20,
      color: UIText.success,
      onPress: () => {
        if (this.currentUid) this.onAssignWorker(this.currentUid);
      },
    });

    this.workerText = scene.add
      .text(0, 0, '', labelStyle(12, UIText.primary, true))
      .setOrigin(0, 0.5);

    this.add([
      this.background,
      this.titleText,
      this.bodyText,
      this.upgradeButton,
      this.demolishButton,
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
    this.bodyText.setWordWrapWidth(width - UISpacing.panelPadding * 2 - 110);
    this.upgradeButton.setPosition(width - UISpacing.panelPadding - 48, InfoPanel.HEIGHT - 82);
    this.demolishButton.setPosition(width - UISpacing.panelPadding - 48, InfoPanel.HEIGHT - 34);

    /*
     * Isci satiri panelin sol altinda.
     *
     * Iki buton YAN YANA durur, sayac sagda. Ilk denemede sayac iki butonun
     * ARASINDAYDI ve "Isci 2/3  Bosta 13" metni "+" butonunun uzerine
     * biniyordu (olculdu: 390px genislikte metin 193px'e kadar uzuyor, buton
     * 175'te). Butonlari bitisik tutmak metne sabit ve genis bir alan birakir.
     */
    const workerY = InfoPanel.HEIGHT - 30;
    const left = UISpacing.panelPadding;
    this.releaseButton.setPosition(left + 23, workerY);
    this.assignButton.setPosition(left + 74, workerY);
    this.workerText.setPosition(left + 106, workerY);
    this.setY(this.visibleState ? this.openY() : height);
  }

  /** Panelin acik konumu; alt kenar payi kadar yukarida durur. */
  private openY(): number {
    return this.screenHeight - this.bottomInset - InfoPanel.HEIGHT;
  }

  /** Secilen hucreyi gosterir; hucre bossa zemin bilgisi verilir. */
  show(tile: TileData, building: BuildingInstance | null, tick: number): void {
    this.currentUid = building?.uid ?? null;
    this.currentBuilding = building;
    this.currentTick = tick;

    if (building) {
      this.showBuilding(building);
    } else {
      this.showTerrain(tile);
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

    // Seviye 1'i gostermeye gerek yok; ustu bilgi tasir.
    this.titleText.setText(
      resolved.level > 1 ? `${def.name} (Sv. ${resolved.level})` : def.name,
    );

    const lines: string[] = [];

    /*
     * DURUM SATIRI
     *
     * Oyuncunun ilk gormesi gereken sey binanin calisip calismadigidir.
     * Uc hal var ve ucu de mevcut state'ten TURETILIR; yeni bir durum
     * alani eklenmedi.
     */
    const task = resolved.construction;
    if (task) {
      const verb = task.kind === 'upgrade' ? 'Yukseltiliyor' : 'Insa ediliyor';
      if (task.status === 'queued') {
        lines.push(`${verb} - sirada bekliyor`);
      } else {
        lines.push(`${verb} - ${formatDuration(ticksToSeconds(task.remainingTicks))} kaldi`);
      }
    } else if (!resolved.operational) {
      lines.push('DURDURULDU');
    } else if (resolved.workerRequirement > 0 && !resolved.staffed) {
      lines.push(resolved.assignedWorkers === 0 ? 'ISCI YOK' : 'ISCI YETERSIZ');
    } else {
      lines.push('CALISIYOR');
    }

    // Insaat sirasinda uretim degerleri sifirdir; o seviyenin tanimini gosteririz.
    // Calisir binada ise GERCEK uretim gosterilir: kadro eksikse "+4/dk"
    // yazip 3 uretmek oyuncuyu yaniltirdi. Potansiyel, eksik kadro
    // durumunda parantez icinde ayrica belirtilir.
    const potential = def.levels.find((l) => l.level === resolved.level)?.production ?? {};
    const production = resolved.construction ? potential : resolved.effectiveProduction;

    const parts = RESOURCE_ORDER.filter((key) => production[key]).map((key) => {
      const rate = `${RESOURCE_META[key].label} +${formatRate(production[key] ?? 0)}/dk`;
      const full = potential[key] ?? 0;
      const short = !resolved.construction && !resolved.staffed && full > (production[key] ?? 0);
      return short ? `${rate} (tam kadro: ${formatRate(full)})` : rate;
    });
    if (parts.length) lines.push(parts.join('  '));

    // Kadro artik oyuncunun kararidir; sayilar metin yerine ALT SATIRDAKI
    // atama denetimlerinde gosterilir. Insaati suren binaya isci
    // yollanamadigi icin orada yalnizca ihtiyac yazilir.
    const underBuild = resolved.construction?.kind === 'build';
    if (resolved.workerRequirement && underBuild) {
      lines.push(`${resolved.workerRequirement} isci ister`);
    }
    this.showWorkerRow(building, resolved, underBuild);

    const populationCapacity =
      resolved.populationCapacity ||
      (def.levels.find((l) => l.level === resolved.level)?.populationCapacity ?? 0);
    if (populationCapacity) lines.push(`+${populationCapacity} nufus kapasitesi`);

    const storageCapacity =
      resolved.storageCapacity ||
      (def.levels.find((l) => l.level === resolved.level)?.storageCapacity ?? 0);
    if (storageCapacity) lines.push(`+${storageCapacity} depo`);

    // Yukseltme secenegi: resolver devam eden gorev varken null dondurur.
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

    // Buton yuvasi: yukseltme surerken iptal, aksi halde yukseltme.
    if (task?.kind === 'upgrade') {
      this.upgradeButtonMode = 'cancel';
      this.upgradeButton.setText('Iptal').setVisible(true).setEnabled(true);
    } else {
      this.upgradeButtonMode = 'upgrade';
      this.upgradeButton.setText('Yukselt').setVisible(upgrade !== null);
      // Karsilanamayan yukseltme butonu devre disi gorunur; oyuncu tikladiktan
      // sonra degil, tiklamadan once anlar.
      this.upgradeButton.setEnabled(upgrade !== null && this.canAfford(upgrade.cost));
    }
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

    const info = this.workerInfo(building.uid);
    const enRoute = info.claimed - info.working;

    // Yoldaki isci AYRI gosterilir: "2/3" yazip uretimin neden hala eksik
    // oldugunu soylememek oyuncuyu yanlis yonlendirirdi.
    const route = enRoute > 0 ? ` (+${enRoute} yolda)` : '';
    this.workerText.setText(`Isci ${info.working}/${need}${route}   Bosta ${info.idle}`);
    // Kadro eksikse dikkat cek; tamsa sakin dursun.
    this.workerText.setColor(info.claimed >= need ? UIText.primary : UIText.accent);

    // Yer kontrolu BAGLI isci sayisina gore; sistemin kendi kurali da budur.
    this.assignButton.setEnabled(info.claimed < info.capacity && info.idle > 0);
    this.releaseButton.setEnabled(info.claimed > 0);
  }

  private showTerrain(tile: TileData): void {
    this.upgradeButton.setVisible(false);
    this.releaseButton.setVisible(false);
    this.assignButton.setVisible(false);
    this.workerText.setVisible(false);
    this.titleText.setText(TERRAIN_LABELS[tile.terrain] ?? tile.terrain);
    this.bodyText.setText(
      `Konum ${tile.gx}, ${tile.gy}\nBu alan bos. Insa etmek icin alttaki menuyu kullan.`,
    );
  }
}

/** Kesirli uretim oranini kisa gosterir: 3 -> "3", 4.5 -> "4.5". */
function formatRate(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
