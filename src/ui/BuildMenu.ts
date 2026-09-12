import Phaser from 'phaser';
import { RESOURCE_META, RESOURCE_ORDER, TextureKeys } from '@/config/Constants';
import { allBuildings } from '@/config/BuildingCatalog';
import { resolveBuildPreview } from '@/systems/BuildingResolver';
import { iconKeyFor } from '@/render/IconArt';
import { visualKeyFor } from '@/render/BuildingVisuals';
import { TouchButton } from './TouchButton';
import { UIColors, UISpacing, UIText, labelStyle } from './UIStyle';
import type { IconKind } from '@/render/IconArt';
import type { BuildingCategory, BuildingDefinition, BuildingId, ResourcePool } from '@/types';

/** Sekme tanimi: kategori suzgeci ve gosterilen ad. */
interface CategoryTab {
  id: BuildingCategory | 'all';
  label: string;
  icon: IconKind;
}

const TABS: CategoryTab[] = [
  { id: 'all', label: 'Tumu', icon: 'all' },
  { id: 'housing', label: 'Konut', icon: 'housing' },
  { id: 'production', label: 'Uretim', icon: 'production' },
  { id: 'commerce', label: 'Ticaret', icon: 'commerce' },
  { id: 'special', label: 'Ozel', icon: 'special' },
];

/**
 * Alttan acilan insa menusu.
 *
 * SPRINT 14 YENIDEN DUZENLEMESI
 * Once yatay kaydirilan tek sirali bir kart listesiydi; dokuz bina turuyle
 * oyuncu listenin sonunu goremiyordu ve hangi binanin ne ise yaradigi
 * gruplanmamisti. Simdi referans duzenine uyuyor:
 *
 *   1. KATEGORI SEKMELERI  - Tumu / Konut / Uretim / Ticaret / Ozel
 *   2. IZGARA              - uc sutunlu kart tablosu, dikey kaydirilir
 *   3. ONIZLEME SERIDI     - secilen binanin adi, maliyeti ve YERLESTIR
 *
 * Iki asamali secim bilerek: mobilde karta dokunur dokunmaz yerlestirme
 * moduna girmek, yanlis binayla haritaya dokunma hatasini kolaylastiriyordu.
 * Artik kart SECER, YERLESTIR baslatir.
 */
export class BuildMenu extends Phaser.GameObjects.Container {
  private static readonly HEIGHT = 336;
  private static readonly COLUMNS = 3;
  private static readonly CARD_HEIGHT = 84;
  private static readonly CARD_GAP = 8;
  /** Izgaranin gorunur alani (kaydirma penceresi). */
  private static readonly GRID_TOP = 96;
  /*
   * Pencere TAM IKI SATIR: 2 * 84 + 8 bosluk.
   *
   * 168 pikselde ikinci satir ortasindan kesiliyordu ve kart bozuk
   * gorunuyordu (ekran goruntusuyle dogrulandi). Kesme, kart sinirina
   * denk gelmeli.
   */
  private static readonly GRID_HEIGHT = 176;

  private readonly background: Phaser.GameObjects.NineSlice;
  private readonly scroller: Phaser.GameObjects.Container;
  private readonly maskShape: Phaser.GameObjects.Graphics;
  /** Izgaranin dokunma alani; kart secimi buradan cozulur. */
  private readonly gridZone: Phaser.GameObjects.Zone;
  private readonly cards: BuildCard[] = [];
  private readonly tabs: CategoryChip[] = [];

  /** Onizleme seridi. */
  private readonly previewName: Phaser.GameObjects.Text;
  private readonly previewCost: Phaser.GameObjects.Text;
  private readonly placeButton: TouchButton;
  private readonly closeButton: TouchButton;

  private openState = false;
  private screenWidth: number;
  private screenHeight: number;
  private bottomInset = 0;
  private activeTab: BuildingCategory | 'all' = 'all';
  private selected: BuildingId | null = null;
  private resources: ResourcePool | null = null;

  /** Dikey kaydirma durumu. */
  private scrollY = 0;
  private dragStartY = 0;
  private dragStartScroll = 0;
  private dragging = false;
  private dragDistance = 0;

  constructor(
    scene: Phaser.Scene,
    width: number,
    height: number,
    private readonly onSelect: (defId: BuildingId) => void,
  ) {
    super(scene, 0, height);
    this.screenWidth = width;
    this.screenHeight = height;

    this.background = scene.add
      .nineslice(0, 0, TextureKeys.Panel, undefined, width, BuildMenu.HEIGHT, 18, 18, 18, 18)
      .setOrigin(0, 0);

    const titleIcon = scene.add
      .image(UISpacing.panelPadding + 11, 24, iconKeyFor('hammer'))
      .setOrigin(0.5, 0.5)
      .setDisplaySize(22, 22);
    const title = scene.add
      .text(UISpacing.panelPadding + 30, 24, 'INSA ET', labelStyle(15, UIText.accent, true))
      .setOrigin(0, 0.5);

    this.closeButton = new TouchButton(scene, 0, 0, 'Kapat', {
      width: 72,
      height: 34,
      fontSize: 12,
      onPress: () => this.hide(),
    });

    this.scroller = scene.add.container(0, BuildMenu.GRID_TOP);
    this.maskShape = scene.add.graphics().setVisible(false);

    /*
     * IZGARA DOKUNUSLARI tek bir alan uzerinden cozulur.
     *
     * Kartlar ic ice iki kapsayicinin (menu > kaydirici) icinde ve
     * kaydirici maskeli; bu durumda Phaser'in isabet testi kartlara hic
     * ulasmiyordu (olculdu: kategori sekmeleri calisirken kart dokunuslari
     * hicbir sey yapmiyordu). Tek bir dokunma alani hem sorunu ortadan
     * kaldirir hem de kaydirma ile dokunusu ayirt etmeyi kolaylastirir:
     * hangi karta denk geldigi yerel koordinattan hesaplanir.
     */
    this.gridZone = scene.add
      .zone(0, BuildMenu.GRID_TOP, width, BuildMenu.GRID_HEIGHT)
      .setOrigin(0, 0)
      .setInteractive();
    this.gridZone.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, (pointer: Phaser.Input.Pointer) => {
      if (this.dragDistance > 8) return;
      const card = this.cardAt(pointer);
      if (card) this.select(card.definition.id);
    });

    this.previewName = scene.add
      .text(0, 0, '', labelStyle(14, UIText.primary, true))
      .setOrigin(0, 0.5);
    this.previewCost = scene.add.text(0, 0, '', labelStyle(12, UIText.muted)).setOrigin(0, 0.5);
    this.placeButton = new TouchButton(scene, 0, 0, 'YERLESTIR', {
      width: 124,
      height: 44,
      fontSize: 14,
      color: UIText.accent,
      onPress: () => {
        if (this.selected) this.onSelect(this.selected);
      },
    });

    this.add([this.background, titleIcon, title, this.closeButton, this.scroller, this.gridZone]);
    this.buildTabs(scene);
    this.buildCards(scene);
    this.add([this.previewName, this.previewCost, this.placeButton]);

    this.applyFilter();
    this.applyMask();
    this.showPreview(null);

    // Izgara parmakla DIKEY kaydirilir; kartlar da interaktif oldugu icin
    // kaydirma sahne seviyesinde dinlenir.
    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onScrollStart, this);
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.onScrollMove, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP, this.onScrollEnd, this);

    this.layout(width, height);
    this.setVisible(false);
    scene.add.existing(this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.teardown, this);
  }

  /** Menunun ekranda kapladigi yukseklik. */
  static get height(): number {
    return BuildMenu.HEIGHT;
  }

  /** Menunun kapali/acik oldugunu soyler. */
  get isOpen(): boolean {
    return this.openState;
  }

  /** Ekranda kapladigi dikdortgen (girdi engelleme icin). */
  bounds(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(0, this.y, this.screenWidth, BuildMenu.HEIGHT);
  }

  show(): void {
    this.setVisible(true);
    if (this.openState) return;
    this.openState = true;
    /*
     * Maske panelle BIRLIKTE hareket etmeli.
     *
     * Maske sahne koordinatinda duruyor; panel kayarken guncellenmezse
     * izgara ekranin disinda kalan eski pencereye kirpiliyor ve kartlar
     * hic gorunmuyordu (ekran goruntusuyle dogrulandi: menu acik, kartlar
     * yok).
     */
    this.scene.tweens.add({
      targets: this,
      y: this.openY(),
      duration: 200,
      ease: 'Cubic.easeOut',
      onUpdate: () => this.applyMask(),
      onComplete: () => this.applyMask(),
    });
  }

  hide(): void {
    if (!this.openState) return;
    this.openState = false;
    this.showPreview(null);
    this.scene.tweens.add({
      targets: this,
      y: this.screenHeight,
      duration: 160,
      ease: 'Cubic.easeIn',
      onUpdate: () => this.applyMask(),
      onComplete: () => this.setVisible(false),
    });
  }

  /** Kaynak degistiginde kartlarin karsilanabilirligini tazeler. */
  refreshAffordability(resources: ResourcePool): void {
    this.resources = resources;
    for (const card of this.cards) card.refresh(resources);
    if (this.selected) this.showPreview(this.selected);
  }

  layout(width: number, height: number, bottomInset = 0): void {
    this.screenWidth = width;
    this.screenHeight = height;
    this.bottomInset = bottomInset;
    this.background.setSize(width, BuildMenu.HEIGHT);
    this.closeButton.setPosition(width - UISpacing.panelPadding - 36, 24);

    // Sekmeler ekrani esit boler.
    const tabWidth = (width - UISpacing.panelPadding * 2) / TABS.length;
    this.tabs.forEach((tab, index) => {
      tab.setPosition(UISpacing.panelPadding + tabWidth * (index + 0.5), 66);
      tab.resize(tabWidth - 4);
    });

    this.gridZone.setSize(width, BuildMenu.GRID_HEIGHT);
    if (this.gridZone.input) this.gridZone.input.hitArea.setSize(width, BuildMenu.GRID_HEIGHT);
    this.layoutCards(width);
    this.applyMask();

    // Onizleme seridi izgaranin altinda.
    const previewY = BuildMenu.GRID_TOP + BuildMenu.GRID_HEIGHT + 32;
    this.previewName.setPosition(UISpacing.panelPadding, previewY - 10);
    this.previewCost.setPosition(UISpacing.panelPadding, previewY + 10);
    this.placeButton.setPosition(width - UISpacing.panelPadding - 62, previewY);

    this.setY(this.openState ? this.openY() : height);
  }

  private openY(): number {
    return this.screenHeight - this.bottomInset - BuildMenu.HEIGHT;
  }

  private buildTabs(scene: Phaser.Scene): void {
    for (const tab of TABS) {
      const chip = new CategoryChip(scene, tab, () => this.selectTab(tab.id));
      this.tabs.push(chip);
      this.add(chip);
    }
    this.markActiveTab();
  }

  private buildCards(scene: Phaser.Scene): void {
    for (const def of allBuildings()) {
      const card = new BuildCard(scene, def);
      this.cards.push(card);
      this.scroller.add(card);
    }
  }

  /**
   * Isaretcinin altindaki kart.
   *
   * Kartlar kaydiriciyla birlikte hareket ettigi icin yerel koordinat
   * kaydirma miktarini da icerir. Gorunmeyen (suzulmus) kartlar atlanir.
   */
  private cardAt(pointer: Phaser.Input.Pointer): BuildCard | null {
    const dpr = this.pixelRatio();
    const localX = pointer.x / dpr;
    const localY = pointer.y / dpr - this.y - BuildMenu.GRID_TOP - this.scrollY;

    for (const card of this.cards) {
      if (!card.visible) continue;
      if (localX < card.x || localX > card.x + card.cardWidth) continue;
      if (localY < card.y || localY > card.y + BuildMenu.CARD_HEIGHT) continue;
      return card;
    }
    return null;
  }

  private selectTab(id: BuildingCategory | 'all'): void {
    if (this.activeTab === id) return;
    this.activeTab = id;
    this.scrollY = 0;
    this.markActiveTab();
    this.applyFilter();
    this.layoutCards(this.screenWidth);
  }

  private markActiveTab(): void {
    this.tabs.forEach((chip, index) => chip.markActive(TABS[index].id === this.activeTab));
  }

  /** Etkin sekmeye gore hangi kartlar gorunur? */
  private applyFilter(): void {
    for (const card of this.cards) {
      card.setVisible(this.activeTab === 'all' || card.definition.category === this.activeTab);
    }
  }

  private select(id: BuildingId): void {
    this.selected = id;
    for (const card of this.cards) card.setSelected(card.definition.id === id);
    this.showPreview(id);
  }

  /** Onizleme seridini doldurur; secim yoksa yonlendirme yazisi gosterir. */
  private showPreview(id: BuildingId | null): void {
    if (!id) {
      this.selected = null;
      for (const card of this.cards) card.setSelected(false);
      this.previewName.setText('Bir bina sec').setColor(UIText.muted);
      this.previewCost.setText('');
      this.placeButton.setVisible(false);
      return;
    }

    const def = allBuildings().find((d) => d.id === id);
    if (!def) return;
    const preview = resolveBuildPreview(def);
    const cost = RESOURCE_ORDER.filter((key) => preview.cost[key])
      .map((key) => `${RESOURCE_META[key].label} ${preview.cost[key]}`)
      .join('   ');

    this.previewName.setText(`${def.name}  Sv. 1`).setColor(UIText.primary);
    this.previewCost.setText(cost);
    this.placeButton.setVisible(true);
    // Karsilanamiyorsa dugme sonuk: oyuncu basmadan once anlar.
    const affordable =
      this.resources === null ||
      RESOURCE_ORDER.every((key) => (this.resources?.[key] ?? 0) >= (preview.cost[key] ?? 0));
    this.placeButton.setEnabled(affordable);
    this.previewCost.setColor(affordable ? UIText.muted : UIText.danger);
  }

  /** Gorunur kartlari uc sutunlu izgaraya dizer. */
  private layoutCards(width: number): void {
    const usable = width - UISpacing.panelPadding * 2;
    const cardWidth = (usable - BuildMenu.CARD_GAP * (BuildMenu.COLUMNS - 1)) / BuildMenu.COLUMNS;

    let index = 0;
    for (const card of this.cards) {
      if (!card.visible) continue;
      const col = index % BuildMenu.COLUMNS;
      const row = Math.floor(index / BuildMenu.COLUMNS);
      card.setPosition(
        UISpacing.panelPadding + col * (cardWidth + BuildMenu.CARD_GAP),
        row * (BuildMenu.CARD_HEIGHT + BuildMenu.CARD_GAP),
      );
      card.resize(cardWidth, BuildMenu.CARD_HEIGHT);
      index += 1;
    }
    this.applyScroll();
  }

  /** Kaydirmanin alt siniri: son satir gorunur alanin altina dusmesin. */
  private maxScroll(): number {
    const rows = Math.ceil(this.cards.filter((c) => c.visible).length / BuildMenu.COLUMNS);
    const contentHeight = rows * (BuildMenu.CARD_HEIGHT + BuildMenu.CARD_GAP) - BuildMenu.CARD_GAP;
    return Math.max(0, contentHeight - BuildMenu.GRID_HEIGHT);
  }

  private applyScroll(): void {
    this.scrollY = Phaser.Math.Clamp(this.scrollY, -this.maxScroll(), 0);
    this.scroller.setY(BuildMenu.GRID_TOP + this.scrollY);
  }

  /** Izgarayi gorunur pencereye kirpar. */
  private applyMask(): void {
    this.maskShape.clear();
    this.maskShape.fillStyle(0xffffff, 1);
    this.maskShape.fillRect(0, 0, this.screenWidth, BuildMenu.GRID_HEIGHT);
    this.maskShape.setPosition(0, this.y + BuildMenu.GRID_TOP);
    this.scroller.setMask(this.maskShape.createGeometryMask());
  }

  private onScrollStart(pointer: Phaser.Input.Pointer): void {
    if (!this.openState) return;
    const localY = pointer.y / this.pixelRatio() - this.y;
    if (localY < BuildMenu.GRID_TOP || localY > BuildMenu.GRID_TOP + BuildMenu.GRID_HEIGHT) return;
    this.dragging = true;
    this.dragDistance = 0;
    this.dragStartY = pointer.y;
    this.dragStartScroll = this.scrollY;
  }

  private onScrollMove(pointer: Phaser.Input.Pointer): void {
    if (!this.dragging) return;
    const delta = (pointer.y - this.dragStartY) / this.pixelRatio();
    this.dragDistance = Math.max(this.dragDistance, Math.abs(delta));
    this.scrollY = this.dragStartScroll + delta;
    this.applyScroll();
  }

  private onScrollEnd(): void {
    this.dragging = false;
    // Dokunus degerlendirmesi kartlarda yapiliyor; mesafe bir sonraki
    // basista sifirlanir.
    this.scene.time.delayedCall(0, () => {
      this.dragDistance = 0;
    });
  }

  /**
   * Isaretci koordinatlari CIHAZ pikselinde gelir; menu MANTIKSAL pikselde
   * dizilidir. Oran olmadan yuksek DPR'de kaydirma iki kat hizli olurdu.
   */
  private pixelRatio(): number {
    return (this.scene.game.registry.get('resolution')?.dpr as number | undefined) ?? 1;
  }

  private teardown(): void {
    this.scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.onScrollStart, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.onScrollMove, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_UP, this.onScrollEnd, this);
  }
}

/** Kategori sekmesi: ikon + ad; etkin olan altin renkte. */
class CategoryChip extends Phaser.GameObjects.Container {
  private readonly icon: Phaser.GameObjects.Image;
  private readonly label: Phaser.GameObjects.Text;
  private readonly highlight: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, tab: CategoryTab, onPress: () => void) {
    super(scene, 0, 0);

    this.highlight = scene.add
      .image(0, 0, TextureKeys.Pixel)
      .setOrigin(0.5, 0.5)
      .setDisplaySize(60, 44)
      .setTint(UIColors.accent)
      .setAlpha(0.14)
      .setVisible(false);
    this.icon = scene.add
      .image(0, -9, iconKeyFor(tab.icon))
      .setOrigin(0.5, 0.5)
      .setDisplaySize(20, 20);
    this.label = scene.add
      .text(0, 12, tab.label, labelStyle(10, UIText.muted, true))
      .setOrigin(0.5, 0.5);

    this.add([this.highlight, this.icon, this.label]);
    this.setSize(64, 44);
    this.setInteractive(new Phaser.Geom.Rectangle(0, 0, 64, 44), Phaser.Geom.Rectangle.Contains);
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, onPress);
  }

  markActive(active: boolean): this {
    this.label.setColor(active ? UIText.accent : UIText.muted);
    this.icon.setAlpha(active ? 1 : 0.6);
    this.highlight.setVisible(active);
    return this;
  }

  /** Sekme genisligi ekrana gore degisir; dokunma alani da onunla buyur. */
  resize(width: number): void {
    this.highlight.setDisplaySize(width, 44);
    this.setSize(width, 44);
    if (this.input) this.input.hitArea.setSize(width, 44);
  }
}

/** Izgaradaki tek bina karti: gorsel, ad ve maliyet. */
class BuildCard extends Phaser.GameObjects.Container {
  readonly definition: BuildingDefinition;

  private readonly frame: Phaser.GameObjects.NineSlice;
  private readonly thumb: Phaser.GameObjects.Image;
  private readonly nameText: Phaser.GameObjects.Text;
  /** Maliyet: en fazla iki kaynak icin ikon + sayi. */
  private readonly costIcons: Phaser.GameObjects.Image[] = [];
  private readonly costTexts: Phaser.GameObjects.Text[] = [];
  private readonly selectedRing: Phaser.GameObjects.NineSlice;

  private costY = 0;
  private costWidth = 104;

  constructor(scene: Phaser.Scene, def: BuildingDefinition) {
    super(scene, 0, 0);
    this.definition = def;

    this.frame = scene.add
      .nineslice(0, 0, TextureKeys.ButtonUp, undefined, 104, 84, 14, 14, 14, 14)
      .setOrigin(0, 0);
    this.selectedRing = scene.add
      .nineslice(0, 0, TextureKeys.ButtonDown, undefined, 104, 84, 14, 14, 14, 14)
      .setOrigin(0, 0)
      .setVisible(false);

    /*
     * Kucuk resim BINANIN KENDI dokusudur.
     *
     * Ayri bir ikon cizmek iki gorsel gercek yaratirdi: menudeki resim ile
     * haritadaki bina birbirinden ayrilabilirdi. Ayni dokuyu kucultmek,
     * oyuncunun menude gordugu seyi sehirde de gormesini garanti eder.
     */
    this.thumb = scene.add.image(0, 0, visualKeyFor(def.id, 1)).setOrigin(0.5, 1);

    this.nameText = scene.add
      .text(0, 0, def.name, labelStyle(11, UIText.primary, true))
      .setOrigin(0.5, 0.5);
    for (let i = 0; i < 2; i += 1) {
      this.costIcons.push(
        scene.add.image(0, 0, iconKeyFor('wood')).setOrigin(0.5, 0.5).setDisplaySize(12, 12).setVisible(false),
      );
      this.costTexts.push(
        scene.add.text(0, 0, '', labelStyle(10, UIText.muted)).setOrigin(0, 0.5).setVisible(false),
      );
    }

    this.add([
      this.frame,
      this.selectedRing,
      this.thumb,
      this.nameText,
      ...this.costIcons,
      ...this.costTexts,
    ]);
    this.resize(104, 84);
  }

  /** Kartin guncel genisligi; dokunma cozumlemesi bunu kullanir. */
  get cardWidth(): number {
    return this.frame.width;
  }

  /** Kart olcusu ekran genisligine gore degisir. */
  resize(width: number, height: number): void {
    this.frame.setSize(width, height);
    this.selectedRing.setSize(width, height);

    // Gorsel kartin ust ucte ikisine sigacak sekilde olceklenir.
    const box = { w: width - 16, h: height - 34 };
    const texture = this.scene.textures.get(this.thumb.texture.key).getSourceImage();
    const scale = Math.min(box.w / texture.width, box.h / texture.height);
    this.thumb.setScale(scale).setPosition(width / 2, height - 32);

    this.nameText.setPosition(width / 2, height - 24);
    this.costY = height - 10;
    this.costWidth = width;
    this.layoutCost();

    this.setSize(width, height);
  }

  /** Maliyet ciftlerini kartin ortasina hizalar. */
  private layoutCost(): void {
    const shown = this.costIcons.filter((icon) => icon.visible).length;
    if (shown === 0) return;
    // Ikon + sayi ciftleri TEK BLOK olarak ortalanir; sabit konum, tek
    // kaynakli binalarda blogu kenara kaydiriyordu.
    let total = 0;
    for (let i = 0; i < shown; i += 1) total += 14 + this.costTexts[i].width + (i > 0 ? 8 : 0);
    let x = this.costWidth / 2 - total / 2;
    for (let i = 0; i < shown; i += 1) {
      this.costIcons[i].setPosition(x + 6, this.costY);
      this.costTexts[i].setPosition(x + 15, this.costY);
      x += 14 + this.costTexts[i].width + 8;
    }
  }

  setSelected(selected: boolean): void {
    this.selectedRing.setVisible(selected);
    this.nameText.setColor(selected ? UIText.accent : UIText.primary);
  }

  /** Maliyet satirini ve karsilanabilirligi gunceller. */
  refresh(resources: ResourcePool): void {
    const preview = resolveBuildPreview(this.definition);
    let slot = 0;
    let affordable = true;

    for (const key of RESOURCE_ORDER) {
      const amount = preview.cost[key];
      if (!amount) continue;
      if (resources[key] < amount) affordable = false;
      if (slot >= this.costIcons.length) continue;
      this.costIcons[slot].setTexture(iconKeyFor(key)).setVisible(true);
      this.costTexts[slot]
        .setText(`${amount}`)
        .setColor(resources[key] >= amount ? UIText.muted : UIText.danger)
        .setVisible(true);
      slot += 1;
    }
    for (let i = slot; i < this.costIcons.length; i += 1) {
      this.costIcons[i].setVisible(false);
      this.costTexts[i].setVisible(false);
    }

    this.layoutCost();
    this.thumb.setAlpha(affordable ? 1 : 0.45);
    this.nameText.setAlpha(affordable ? 1 : 0.7);
  }
}
