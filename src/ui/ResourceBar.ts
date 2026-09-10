import Phaser from 'phaser';
import { RESOURCE_META, RESOURCE_ORDER, TextureKeys } from '@/config/Constants';
import { formatAmount, formatRate } from '@/utils/Format';
import { UISpacing, labelStyle, UIText } from './UIStyle';
import type { EconomySnapshot, ResourcePool } from '@/types';

/**
 * Ekranin ustunde duran kaynak gostergesi.
 * Kaynak miktari, dakikalik net uretim ve nufus doluluğunu gosterir.
 * Genislik degistiginde layout() cagrilarak yeniden dizilir.
 */
export class ResourceBar extends Phaser.GameObjects.Container {
  private readonly background: Phaser.GameObjects.NineSlice;
  private readonly amountTexts = new Map<string, Phaser.GameObjects.Text>();
  private readonly rateTexts = new Map<string, Phaser.GameObjects.Text>();
  private readonly icons: Phaser.GameObjects.Graphics[] = [];
  private readonly populationText: Phaser.GameObjects.Text;

  private static readonly HEIGHT = 60;
  /** Nufus gostergesine ayrilan sabit genislik. */
  /**
   * Nufus sutununun genisligi. Sprint 3'te metin "5/9" yerine "10/10 +"
   * gibi daha uzun bir hale geldi (gidisat isareti eklendi), bu yuzden
   * sutun buyutuldu; aksi halde dar telefonda son kaynagin orani ile
   * ust uste binerdi.
   */
  private static readonly POPULATION_WIDTH = 104;

  constructor(scene: Phaser.Scene, width: number) {
    super(scene, 0, 0);

    this.background = scene.add
      .nineslice(0, 0, TextureKeys.Panel, undefined, width, ResourceBar.HEIGHT, 16, 16, 16, 16)
      .setOrigin(0, 0);
    this.add(this.background);

    for (const key of RESOURCE_ORDER) {
      const meta = RESOURCE_META[key];

      const icon = scene.add.graphics();
      icon.fillStyle(meta.color, 1);
      icon.fillCircle(0, 0, 7);
      icon.lineStyle(2, 0x000000, 0.25);
      icon.strokeCircle(0, 0, 7);
      this.icons.push(icon);
      this.add(icon);

      const amount = scene.add.text(0, 0, '0', labelStyle(15, UIText.primary, true)).setOrigin(0, 0.5);
      const rate = scene.add.text(0, 0, '0', labelStyle(11, UIText.muted)).setOrigin(0, 0.5);
      this.amountTexts.set(key, amount);
      this.rateTexts.set(key, rate);
      this.add([amount, rate]);
    }

    this.populationText = scene.add
      .text(0, 0, 'Nufus 0/0', labelStyle(12, UIText.muted))
      .setOrigin(1, 0.5);
    this.add(this.populationText);

    this.layout(width);
    scene.add.existing(this);
  }

  /** Cubugun kapladigi yukseklik - alt panellerin hizalanmasinda kullanilir. */
  static get height(): number {
    return ResourceBar.HEIGHT;
  }

  /**
   * Ekran genisligi degistiginde ogeleri yeniden dizer.
   * sideInset, sistem cubuklarinin sol/sag payi kadar ek bosluk birakir;
   * 0 verildiginde yerlesim degismez.
   */
  layout(width: number, sideInset = 0): void {
    this.background.setSize(width, ResourceBar.HEIGHT);

    // Sag tarafta nufus gostergesine sabit bir sutun ayrilir; aksi halde dar
    // ekranlarda son kaynagin orani ile ust uste biner.
    const usable = width - UISpacing.panelPadding * 2 - sideInset * 2 - ResourceBar.POPULATION_WIDTH;
    const columnWidth = usable / RESOURCE_ORDER.length;
    const centerY = ResourceBar.HEIGHT / 2;

    RESOURCE_ORDER.forEach((key, index) => {
      const x = UISpacing.panelPadding + sideInset + columnWidth * index;
      this.icons[index].setPosition(x + 8, centerY);
      this.amountTexts.get(key)?.setPosition(x + 20, centerY - 6);
      this.rateTexts.get(key)?.setPosition(x + 20, centerY + 10);
    });

    this.populationText.setPosition(width - UISpacing.panelPadding - sideInset, centerY);
  }

  /** Kaynak miktarlarini gunceller; depo dolduysa rengi degistirir. */
  updateResources(resources: ResourcePool, capacity: number): void {
    for (const key of RESOURCE_ORDER) {
      const text = this.amountTexts.get(key);
      if (!text) continue;
      const value = resources[key];
      text.setText(formatAmount(value));
      // Depo doluysa oyuncunun dikkatini cek.
      text.setColor(value >= capacity ? UIText.danger : UIText.primary);
    }
  }

  /** Dakikalik uretim oranlarini ve nufusu gunceller. */
  updateEconomy(snapshot: EconomySnapshot): void {
    for (const key of RESOURCE_ORDER) {
      const text = this.rateTexts.get(key);
      if (!text) continue;
      const rate = snapshot.netPerMinute[key];
      text.setText(`${formatRate(rate)}/dk`);
      text.setColor(rate < 0 ? UIText.danger : UIText.muted);
    }

    // Nufus artik gercek bir sayidir: YASAYAN / KAPASITE gosterilir.
    // Isaret nufusun yonunu, renk aciliyeti anlatir:
    //   kirmizi  - nufus eriyor (aclik); en acil durum
    //   sari     - isci acigi var, binalar tam kapasite calismiyor
    //   yesil    - sehir buyuyor
    const marker =
      snapshot.growth === 'growing' ? ' +' : snapshot.growth === 'declining' ? ' -' : '';
    const understaffed = snapshot.efficiency < 1;

    const color =
      snapshot.growth === 'declining'
        ? UIText.danger
        : understaffed
          ? UIText.accent
          : snapshot.growth === 'growing'
            ? UIText.success
            : UIText.muted;

    this.populationText
      .setText(`Nufus ${snapshot.population}/${snapshot.populationCapacity}${marker}`)
      .setColor(color);
  }
}
