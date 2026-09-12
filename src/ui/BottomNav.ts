import Phaser from 'phaser';
import { TextureKeys } from '@/config/Constants';
import { TOUCH_TARGET, labelStyle, UIColors, UIText } from './UIStyle';

/** Alt gezinme cubugundaki sekmeler. */
export type NavTab = 'city' | 'buildings' | 'population' | 'workers' | 'more';

interface TabSpec {
  id: NavTab;
  label: string;
}

const TABS: TabSpec[] = [
  { id: 'city', label: 'SEHIR' },
  { id: 'buildings', label: 'BINALAR' },
  { id: 'population', label: 'NUFUS' },
  { id: 'workers', label: 'ISCILER' },
  { id: 'more', label: 'DAHA' },
];

/**
 * Ekranin altindaki gezinme cubugu.
 *
 * Mobil oyunlarin alt cubugu basparmagin dogal yeridir; sehirle ilgili her
 * sey tek dokunus uzagindadir. Sekmeler ekranin tamamini esit boler, yani
 * her hedef en dar telefonda bile dokunulabilir genisliktedir (360/5 = 72
 * mantiksal piksel, dokunma hedefi asgarisi 48).
 *
 * Cubuk sistem gezinme alaninin USTUNDE durur: konumu UIScene, guvenli alan
 * paylarini okuyarak verir. Boylece Android'in kendi kaydirma seridi
 * sekmelerin uzerine binmez.
 */
export class BottomNav extends Phaser.GameObjects.Container {
  private static readonly HEIGHT = 62;

  private readonly background: Phaser.GameObjects.NineSlice;
  private readonly labels = new Map<NavTab, Phaser.GameObjects.Text>();
  private readonly markers = new Map<NavTab, Phaser.GameObjects.Image>();
  private readonly zones = new Map<NavTab, Phaser.GameObjects.Zone>();

  private activeTab: NavTab | null = null;
  private screenWidth: number;

  constructor(scene: Phaser.Scene, width: number, private readonly onSelect: (tab: NavTab) => void) {
    super(scene, 0, 0);
    this.screenWidth = width;

    this.background = scene.add
      .nineslice(0, 0, TextureKeys.Panel, undefined, width, BottomNav.HEIGHT, 16, 16, 16, 16)
      .setOrigin(0, 0);
    this.add(this.background);

    for (const tab of TABS) {
      /*
       * Etkin sekmenin USTUNDE ince bir vurgu cizgisi.
       *
       * Yalnizca renk degistirmek yeterli degildi: dar ekranda 10 piksellik
       * yazinin rengi, gunes altindaki telefonda ayirt edilemiyor. Cizgi
       * sekmeyi bicimle de isaretler.
       */
      const marker = scene.add
        .image(0, 0, TextureKeys.Pixel)
        .setOrigin(0.5, 0.5)
        .setDisplaySize(34, 3)
        .setTint(UIColors.accent)
        .setVisible(false);
      this.markers.set(tab.id, marker);

      const label = scene.add
        .text(0, 0, tab.label, labelStyle(10, UIText.muted, true))
        .setOrigin(0.5, 0.5);
      this.labels.set(tab.id, label);

      // Dokunma hedefi yazidan GENIS: sekmenin tamami basilabilir olmali.
      const zone = scene.add
        .zone(0, 0, width / TABS.length, BottomNav.HEIGHT)
        .setOrigin(0.5, 0.5)
        .setInteractive({ useHandCursor: true });
      zone.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => this.onSelect(tab.id));
      this.zones.set(tab.id, zone);

      this.add([marker, label, zone]);
    }

    this.layout(width);
    scene.add.existing(this as Phaser.GameObjects.Container);
  }

  static get height(): number {
    return BottomNav.HEIGHT;
  }

  /** Ekranda kapladigi dikdortgen (girdi engelleme icin). */
  bounds(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(0, this.y, this.screenWidth, BottomNav.HEIGHT);
  }

  /** Etkin sekmeyi isaretler; null hicbirini secmez. */
  setActiveTab(tab: NavTab | null): void {
    if (this.activeTab === tab) return;
    this.activeTab = tab;
    for (const spec of TABS) {
      const on = spec.id === tab;
      this.labels.get(spec.id)?.setColor(on ? UIText.accent : UIText.muted);
      this.markers.get(spec.id)?.setVisible(on);
    }
  }

  layout(width: number, sideInset = 0): void {
    this.screenWidth = width;
    this.background.setSize(width, BottomNav.HEIGHT);

    const usable = width - sideInset * 2;
    const step = usable / TABS.length;
    TABS.forEach((tab, index) => {
      const cx = sideInset + step * (index + 0.5);
      this.labels.get(tab.id)?.setPosition(cx, BottomNav.HEIGHT / 2 + 4);
      this.markers.get(tab.id)?.setPosition(cx, 7);
      const zone = this.zones.get(tab.id);
      // Zone'un dokunma alani da yeniden boyutlanmali; aksi halde ekran
      // genisleyince sekmelerin arasinda olu bosluk kalir.
      zone?.setPosition(cx, BottomNav.HEIGHT / 2).setSize(step, BottomNav.HEIGHT);
      if (zone?.input) {
        zone.input.hitArea.setSize(step, BottomNav.HEIGHT);
      }
    });
  }

  /** Dokunma hedefinin asgari genisligi saglaniyor mu? (mobil QA icin) */
  tabWidth(): number {
    return this.screenWidth / TABS.length;
  }

  /** Asgari dokunma hedefi - testlerin ve olcumlerin okudugu deger. */
  static get minTouchTarget(): number {
    return TOUCH_TARGET;
  }
}
