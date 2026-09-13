import Phaser from 'phaser';
import { TextureKeys } from '@/config/Constants';
import { iconKeyFor } from '@/render/IconArt';
import { portraitKeyOr } from '@/render/AssetManifest';
import { PANEL_SLICE } from '@/render/PanelSkin';
import { CAPSULE_SLICE } from '@/render/UiShapes';
import { TOUCH_TARGET, UIText, fitText, labelStyle, titleStyle } from './UIStyle';
import type { IconKind } from '@/render/IconArt';

/**
 * Referans duzenin HUD parcalari.
 *
 * NEDEN TEK DOSYA
 * Bunlarin hepsi ayni gorsel dilin parcalari (parsomen zemin, altin
 * kenar, koyu kahve yazi) ve hepsi sehrin UZERINDE duran kucuk
 * bilgilendirme yuzeyleri. Ayri dosyalara bolmek ayni dokuz satirlik
 * kurucuyu dokuz kez tekrarlatirdi; bir arada durduklarinda aralarindaki
 * olcu ve bosluk tutarliligi gozle denetlenebiliyor.
 *
 * HICBIRI OYUN KURALI BILMEZ. Hepsi disaridan hazir deger alir; ne
 * hesaplar ne de olay yollar (dokunma geri cagirmalari disinda).
 */

// ------------------------------------------------------------ OYUNCU KARTI

/** Ust soldaki oyuncu karti: portre, seviye rozeti, ad ve deneyim cubugu. */
export class PlayerCard extends Phaser.GameObjects.Container {
  /*
   * OLCULER REFERANSTAN TURETILDI.
   *
   * Referans 1024 piksel genisliginde bir mockup; oradaki oyuncu karti
   * genisligin %36'si. 390 piksellik telefonda bu 140 piksel eder.
   * Ilk surumde 186 (yani %48) idi ve ustteki her seyi sikistiriyordu.
   */
  static readonly WIDTH = 152;
  static readonly HEIGHT = 54;

  private readonly nameText: Phaser.GameObjects.Text;
  private readonly levelText: Phaser.GameObjects.Text;
  private readonly progressFill: Phaser.GameObjects.Image;
  private readonly progressText: Phaser.GameObjects.Text;
  private readonly progressWidth: number;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    const frame = scene.add
      .nineslice(
        0,
        0,
        TextureKeys.Panel,
        undefined,
        PlayerCard.WIDTH,
        PlayerCard.HEIGHT,
        PANEL_SLICE,
        PANEL_SLICE,
        PANEL_SLICE,
        PANEL_SLICE,
      )
      .setOrigin(0, 0);

    /*
     * Portre kartin SOL KENARINDAN TASAR.
     *
     * Referansta madalyon panelin icine hapsedilmemis, kenarina oturmus.
     * Tasan bir oge kartin dikdortgenligini kirar ve gozu once oraya
     * ceker - oyuncunun kendi kimligi, yaninda duran sayilardan once
     * okunmali.
     */
    const cx = 25;
    const cy = PlayerCard.HEIGHT / 2;
    const portrait = scene.add
      // Elle cizilmis portre varsa o, yoksa prosedurel arma.
      .image(cx, cy, portraitKeyOr(iconKeyFor('avatar')))
      .setOrigin(0.5, 0.5)
      .setDisplaySize(32, 32);
    const ring = scene.add
      .image(cx, cy, TextureKeys.Ring)
      .setOrigin(0.5, 0.5)
      .setDisplaySize(42, 42);

    const badge = scene.add
      .image(cx, cy + 17, TextureKeys.Disc)
      .setOrigin(0.5, 0.5)
      .setDisplaySize(19, 19);
    this.levelText = scene.add
      .text(cx, cy + 17, '1', labelStyle(10, '#3a2a12', true))
      .setOrigin(0.5, 0.5);

    const textLeft = 50;
    this.nameText = scene.add
      .text(textLeft, 18, 'ANCIENT CITY', titleStyle(12, UIText.primary))
      .setOrigin(0, 0.5);

    this.progressWidth = PlayerCard.WIDTH - textLeft - 9;
    const barY = 36;
    const track = scene.add
      .image(textLeft, barY, TextureKeys.Pixel)
      .setOrigin(0, 0.5)
      .setDisplaySize(this.progressWidth, 10)
      .setTint(0x6b5230);
    this.progressFill = scene.add
      .image(textLeft + 1, barY, TextureKeys.Pixel)
      .setOrigin(0, 0.5)
      .setDisplaySize(1, 8)
      .setTint(0xc9a227);
    /*
     * Altyazi cubugun ICINDE ortalanir ve cubuga SIGMAK ZORUNDADIR.
     * Ilk denemede "Sv. 2 icin kaynak" gibi uzun bir metin cubugu iki
     * yandan tasiyordu; artik metin sigmiyorsa kisaltilir - kart hicbir
     * metin uzunlugunda bozulmaz.
     */
    this.progressText = scene.add
      .text(textLeft + this.progressWidth / 2, barY, '', labelStyle(8, '#f7ebd2', true))
      .setOrigin(0.5, 0.5);

    this.add([
      frame,
      track,
      this.progressFill,
      this.progressText,
      portrait,
      ring,
      badge,
      this.levelText,
      this.nameText,
    ]);
    scene.add.existing(this);
  }

  /**
   * Sehir adi, seviye ve ilerleme.
   *
   * Adi `update` DEGIL: Phaser.Container'in kendi `update` uyesi var ve
   * onu gizlemek her kare cagrilan bir yasam dongusu kancasini sessizce
   * ele gecirirdi.
   */
  setInfo(name: string, level: number | null, ratio: number, caption: string): void {
    this.nameText.setText(name);
    this.levelText.setText(level === null ? '-' : `${level}`);
    const clamped = Phaser.Math.Clamp(ratio, 0, 1);
    this.progressFill.setDisplaySize(Math.max(1, (this.progressWidth - 2) * clamped), 8);

    // Cubuga sigmayan altyaziyi kisalt; uzunluk bir varsayim degil kural.
    fitText(this.progressText, caption, this.progressWidth - 8);
  }

  bounds(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(this.x, this.y, PlayerCard.WIDTH, PlayerCard.HEIGHT);
  }
}

// ----------------------------------------------------------- KAYNAK KAPSULU

/** Ustteki tek bir kaynak kapsulu: ikon, deger ve "+" dugmesi. */
export class ResourcePill extends Phaser.GameObjects.Container {
  /** Referansta kapsul yuksekligi ekranin %3.3'u; 844'te ~28. */
  static readonly HEIGHT = 28;

  private readonly valueText: Phaser.GameObjects.Text;
  private readonly frame: Phaser.GameObjects.NineSlice;
  private readonly plus: Phaser.GameObjects.Image;
  private readonly plusZone: Phaser.GameObjects.Zone;
  private pillWidth: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    icon: IconKind,
    width: number,
    onPlus: () => void,
  ) {
    super(scene, x, y);
    this.pillWidth = width;

    this.frame = scene.add
      .nineslice(
        0,
        0,
        TextureKeys.Capsule,
        undefined,
        width,
        ResourcePill.HEIGHT,
        CAPSULE_SLICE,
        CAPSULE_SLICE,
        CAPSULE_SLICE,
        CAPSULE_SLICE,
      )
      .setOrigin(0, 0);

    const iconImage = scene.add
      .image(13, ResourcePill.HEIGHT / 2, iconKeyFor(icon))
      .setOrigin(0.5, 0.5)
      .setDisplaySize(17, 17);

    this.valueText = scene.add
      .text(25, ResourcePill.HEIGHT / 2, '0', labelStyle(11, UIText.primary, true))
      .setOrigin(0, 0.5);

    // "+" kendi altin diskinde durur: kapsulun geri kalani okunur,
    // yalnizca bu daire basilabilir - ayrimi bicim yapar, renk degil.
    const plusX = width - 14;
    const plusDisc = scene.add
      .image(plusX, ResourcePill.HEIGHT / 2, TextureKeys.Disc)
      .setOrigin(0.5, 0.5)
      .setDisplaySize(19, 19);
    this.plus = scene.add
      .image(plusX, ResourcePill.HEIGHT / 2, iconKeyFor('plus'))
      .setOrigin(0.5, 0.5)
      .setDisplaySize(11, 11);

    /*
     * Dokunma hedefi GORSELDEN BUYUK: 22 piksellik bir daire parmakla
     * isabet edilemez. Zone asgari dokunma hedefi kadar genistir ve
     * gorselin uzerine ortalanir.
     */
    this.plusZone = scene.add
      .zone(plusX, ResourcePill.HEIGHT / 2, TOUCH_TARGET, TOUCH_TARGET)
      .setOrigin(0.5, 0.5)
      .setInteractive({ useHandCursor: true });
    this.plusZone.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, onPlus);

    this.add([this.frame, iconImage, this.valueText, plusDisc, this.plus, this.plusZone]);
    scene.add.existing(this);
  }

  get widthPx(): number {
    return this.pillWidth;
  }

  setWidth(width: number): void {
    this.pillWidth = width;
    this.frame.setSize(width, ResourcePill.HEIGHT);
    const plusX = width - 14;
    this.plus.setPosition(plusX, ResourcePill.HEIGHT / 2);
    this.plusZone.setPosition(plusX, ResourcePill.HEIGHT / 2);
    // Disk plus ile ayni yerde duran kardes; listedeki sirasiyla bulunur.
    const disc = this.list[3] as Phaser.GameObjects.Image;
    disc.setPosition(plusX, ResourcePill.HEIGHT / 2);
  }

  setValue(text: string, color: string = UIText.primary): void {
    this.valueText.setText(text).setColor(color);
  }

  bounds(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(this.x, this.y, this.pillWidth, ResourcePill.HEIGHT);
  }
}

// ------------------------------------------------------------- GOREV KARTI

/** Gorev satirinin disaridan gelen hali. */
export interface QuestRow {
  icon: IconKind;
  label: string;
  /** Saglanan / gereken. */
  done: number;
  total: number;
}

/** Sol ustteki "Bugunun Gorevleri" karti. */
export class QuestCard extends Phaser.GameObjects.Container {
  /** Referansta gorev karti genisligin %37'si; 390'da ~145. */
  static readonly WIDTH = 168;
  private static readonly HEADER = 30;
  private static readonly ROW = 26;

  private readonly frame: Phaser.GameObjects.NineSlice;
  private readonly rows: Array<{
    icon: Phaser.GameObjects.Image;
    label: Phaser.GameObjects.Text;
    count: Phaser.GameObjects.Text;
    rule: Phaser.GameObjects.Image;
  }> = [];

  private visibleRows = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, maxRows: number, onOpen: () => void) {
    super(scene, x, y);

    const height = QuestCard.HEADER + QuestCard.ROW * maxRows + 6;
    this.frame = scene.add
      .nineslice(
        0,
        0,
        TextureKeys.Panel,
        undefined,
        QuestCard.WIDTH,
        height,
        PANEL_SLICE,
        PANEL_SLICE,
        PANEL_SLICE,
        PANEL_SLICE,
      )
      .setOrigin(0, 0);

    const headerIcon = scene.add
      .image(19, 16, iconKeyFor('buildingsNav'))
      .setOrigin(0.5, 0.5)
      .setDisplaySize(15, 15);
    const headerText = scene.add
      .text(32, 16, 'Bugunun Gorevleri', titleStyle(11, UIText.primary))
      .setOrigin(0, 0.5);
    const chevron = scene.add
      .text(QuestCard.WIDTH - 13, 16, '>', titleStyle(12, UIText.accent))
      .setOrigin(0.5, 0.5);

    this.add([this.frame, headerIcon, headerText, chevron]);

    for (let i = 0; i < maxRows; i += 1) {
      const rowY = QuestCard.HEADER + QuestCard.ROW * i + QuestCard.ROW / 2;
      const rule = scene.add
        .image(10, QuestCard.HEADER + QuestCard.ROW * i, TextureKeys.Pixel)
        .setOrigin(0, 0.5)
        .setDisplaySize(QuestCard.WIDTH - 20, 1)
        .setTint(0xc9a227)
        .setAlpha(0.5);
      const icon = scene.add
        .image(21, rowY, iconKeyFor('cart'))
        .setOrigin(0.5, 0.5)
        .setDisplaySize(14, 14);
      const label = scene.add
        .text(34, rowY, '', labelStyle(10, UIText.primary))
        .setOrigin(0, 0.5);
      const count = scene.add
        .text(QuestCard.WIDTH - 12, rowY, '', labelStyle(10, UIText.accent, true))
        .setOrigin(1, 0.5);
      this.rows.push({ icon, label, count, rule });
      this.add([rule, icon, label, count]);
    }

    // Kartin tamami basilabilir: referansta baslik satirindaki ">" tek
    // basina cok kucuk bir hedef.
    const zone = scene.add
      .zone(0, 0, QuestCard.WIDTH, height)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });
    zone.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, onOpen);
    this.add(zone);

    scene.add.existing(this);
  }

  /** Gorev satirlarini yazar; fazlalik satirlar gizlenir. */
  setRows(rows: QuestRow[]): void {
    this.visibleRows = Math.min(rows.length, this.rows.length);
    this.rows.forEach((row, i) => {
      const data = rows[i];
      const on = data !== undefined;
      row.icon.setVisible(on);
      row.label.setVisible(on);
      row.count.setVisible(on);
      row.rule.setVisible(on);
      if (!data) return;
      row.icon.setTexture(iconKeyFor(data.icon));
      row.label.setText(data.label);
      row.count.setText(`${data.done}/${data.total}`);
      // Tamamlanan gorev yesile doner: oyuncu listeye bakinca neyin
      // bittigini okumadan gorur.
      row.count.setColor(data.done >= data.total ? UIText.success : UIText.accent);
    });
    this.frame.setSize(QuestCard.WIDTH, this.heightPx);
  }

  get heightPx(): number {
    return QuestCard.HEADER + QuestCard.ROW * Math.max(1, this.visibleRows) + 6;
  }

  bounds(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(this.x, this.y, QuestCard.WIDTH, this.heightPx);
  }
}

// -------------------------------------------------------------- IKON RAYI

/** Rayda duran tek bir dugmenin tanimi. */
export interface RailButton {
  icon: IconKind;
  onPress: () => void;
  /** Sag ustte kirmizi sayac; 0 ise gosterilmez. */
  badge?: number;
}

/**
 * Ekranin kenarinda duran dikey ikon sutunu.
 *
 * Referansta sol ve sag kenarlarda birer tane var. Tek bir parsomen
 * sutun; dugmeler onun uzerinde esit aralikli durur.
 */
export class IconRail extends Phaser.GameObjects.Container {
  /*
   * Referansin rayi genisligin %6'si (65/1024). 390'da bu 25 piksel
   * ederdi ve PARMAKLA ISABET EDILEMEZDI - referans 1024 piksellik bir
   * illustrasyon, dokunma asgarisi olcekle kucuLmez. Ray bu yuzden
   * referanstan orantisal olarak genis kalir; asgari hedefin altina
   * inmek gorunusu degil KULLANILABILIRLIGI bozardi.
   */
  static readonly WIDTH = 38;
  private static readonly STEP = 38;
  private static readonly PAD = 5;

  private readonly badges: Array<{ disc: Phaser.GameObjects.Image; text: Phaser.GameObjects.Text }> =
    [];

  private readonly railHeight: number;

  constructor(scene: Phaser.Scene, x: number, y: number, buttons: RailButton[]) {
    super(scene, x, y);
    this.railHeight = IconRail.PAD * 2 + IconRail.STEP * buttons.length;

    const frame = scene.add
      .nineslice(
        0,
        0,
        TextureKeys.Frame,
        undefined,
        IconRail.WIDTH,
        this.railHeight,
        PANEL_SLICE,
        PANEL_SLICE,
        PANEL_SLICE,
        PANEL_SLICE,
      )
      .setOrigin(0, 0);
    this.add(frame);

    buttons.forEach((button, i) => {
      const cy = IconRail.PAD + IconRail.STEP * i + IconRail.STEP / 2;
      const icon = scene.add
        .image(IconRail.WIDTH / 2, cy, iconKeyFor(button.icon))
        .setOrigin(0.5, 0.5)
        .setDisplaySize(19, 19);

      /*
       * Hedef, 42 piksellik adimdan genis tutulur (asgari dokunma
       * hedefi 48). Sutun dar oldugu icin genisligi sutunla ayni,
       * yuksekligi adim kadar - komsu dugmelerle cakismaz ama parmak
       * icin yeterince buyuktur.
       */
      const zone = scene.add
        .zone(IconRail.WIDTH / 2, cy, IconRail.WIDTH, IconRail.STEP)
        .setOrigin(0.5, 0.5)
        .setInteractive({ useHandCursor: true });
      zone.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, button.onPress);

      const disc = scene.add
        .image(IconRail.WIDTH - 9, cy - 10, TextureKeys.Pixel)
        .setOrigin(0.5, 0.5)
        .setDisplaySize(14, 14)
        .setTint(0xb03a2e)
        .setVisible(false);
      const text = scene.add
        .text(IconRail.WIDTH - 9, cy - 10, '', labelStyle(8, '#ffffff', true))
        .setOrigin(0.5, 0.5)
        .setVisible(false);
      this.badges.push({ disc, text });

      this.add([icon, zone, disc, text]);
    });

    scene.add.existing(this);
  }

  /** Bir dugmenin sayacini gunceller; 0 sayaci gizler. */
  setBadge(index: number, value: number): void {
    const badge = this.badges[index];
    if (!badge) return;
    const on = value > 0;
    badge.disc.setVisible(on);
    badge.text.setVisible(on).setText(on ? `${Math.min(99, value)}` : '');
  }

  get heightPx(): number {
    return this.railHeight;
  }

  bounds(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(this.x, this.y, IconRail.WIDTH, this.railHeight);
  }
}

// ------------------------------------------------------------- MUTTEFIKLER

/**
 * Ust sagdaki muttefik seridi.
 *
 * Referansta dort portre var. Oyunda HENUZ bir muttefik/karakter sistemi
 * yok; serit referanstaki yerini tutar ve dokununca durumu acikca soyler.
 * Sessizce hicbir sey yapmayan bir sus degil - bos oldugunu kendisi
 * anlatir (portreler soluk ve kilitli cizilir).
 */
export class AllyStrip extends Phaser.GameObjects.Container {
  static readonly HEIGHT = 40;

  private stripWidth: number;
  private readonly frame: Phaser.GameObjects.NineSlice;
  private readonly slots: Array<{ portrait: Phaser.GameObjects.Image; ring: Phaser.GameObjects.Image }> =
    [];
  private readonly zone: Phaser.GameObjects.Zone;

  constructor(scene: Phaser.Scene, x: number, y: number, width: number, onPress: () => void) {
    super(scene, x, y);
    this.stripWidth = width;

    const frame = scene.add
      .nineslice(
        0,
        0,
        TextureKeys.Frame,
        undefined,
        width,
        AllyStrip.HEIGHT,
        PANEL_SLICE,
        PANEL_SLICE,
        PANEL_SLICE,
        PANEL_SLICE,
      )
      .setOrigin(0, 0);
    this.frame = frame;
    this.add(frame);

    for (let i = 0; i < AllyStrip.SLOTS; i += 1) {
      const cy = AllyStrip.HEIGHT / 2;
      const portrait = scene.add
        .image(0, cy, portraitKeyOr(iconKeyFor('avatar')))
        .setOrigin(0.5, 0.5)
        .setDisplaySize(18, 18)
        .setAlpha(0.35);
      const ring = scene.add
        .image(0, cy, TextureKeys.Ring)
        .setOrigin(0.5, 0.5)
        .setDisplaySize(26, 26)
        .setAlpha(0.55);
      this.slots.push({ portrait, ring });
      this.add([portrait, ring]);
    }

    this.zone = scene.add
      .zone(0, 0, width, AllyStrip.HEIGHT)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });
    this.zone.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, onPress);
    this.add(this.zone);

    this.resize(width);
    scene.add.existing(this);
  }

  /** Portre sayisi sabit; genislik degisince yalnizca aralari degisir. */
  private static readonly SLOTS = 4;

  /** Serit icin gereken en dar genislik; altinda gosterilmemeli. */
  static get minWidth(): number {
    return 92;
  }

  /**
   * Seridi verilen genislige yeniden dizer.
   *
   * Sabit 150 pikselle basladi ve 360 pikselik ekranda gorev kartiyla
   * cakisti (mobil olcum yakaladi: "gorev karti | muttefikler"). Genislik
   * artik yerlesimden gelir - serit kendi olcusunu dayatmaz, kalan yere
   * uyar.
   */
  resize(width: number): void {
    this.stripWidth = width;
    this.frame.setSize(width, AllyStrip.HEIGHT);
    this.zone.setSize(width, AllyStrip.HEIGHT);
    if (this.zone.input) this.zone.input.hitArea.setSize(width, AllyStrip.HEIGHT);

    const step = (width - 12) / AllyStrip.SLOTS;
    this.slots.forEach((slot, i) => {
      const cx = 6 + step * (i + 0.5);
      slot.portrait.setX(cx);
      slot.ring.setX(cx);
    });
  }

  get widthPx(): number {
    return this.stripWidth;
  }

  bounds(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(this.x, this.y, this.stripWidth, AllyStrip.HEIGHT);
  }
}

// ----------------------------------------------------------- GENIS DUGME

/** Alt soldaki genis eylem dugmesi ("Insa Et"). */
export class WideButton extends Phaser.GameObjects.Container {
  /** Referansta %5.5 yukseklik; 844'te ~46. */
  static readonly HEIGHT = 46;

  private readonly frame: Phaser.GameObjects.NineSlice;
  private readonly zone: Phaser.GameObjects.Zone;
  private pressed = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    icon: IconKind,
    label: string,
    onPress: () => void,
  ) {
    super(scene, x, y);

    this.frame = scene.add
      .nineslice(
        0,
        0,
        TextureKeys.Panel,
        undefined,
        width,
        WideButton.HEIGHT,
        PANEL_SLICE,
        PANEL_SLICE,
        PANEL_SLICE,
        PANEL_SLICE,
      )
      .setOrigin(0, 0);

    const iconImage = scene.add
      .image(28, WideButton.HEIGHT / 2, iconKeyFor(icon))
      .setOrigin(0.5, 0.5)
      .setDisplaySize(22, 22);
    const text = scene.add
      .text(48, WideButton.HEIGHT / 2, label, titleStyle(14, UIText.primary))
      .setOrigin(0, 0.5);

    this.zone = scene.add
      .zone(0, 0, width, WideButton.HEIGHT)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });
    this.zone.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => this.setPressed(true));
    this.zone.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () => this.setPressed(false));
    this.zone.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
      const was = this.pressed;
      this.setPressed(false);
      if (was) onPress();
    });

    this.add([this.frame, iconImage, text, this.zone]);
    this.widthPx = width;
    scene.add.existing(this);
  }

  widthPx: number;

  bounds(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(this.x, this.y, this.widthPx, WideButton.HEIGHT);
  }

  private setPressed(value: boolean): void {
    if (this.pressed === value) return;
    this.pressed = value;
    this.frame.setTint(value ? 0xd8c08a : 0xffffff);
  }
}
