import Phaser from 'phaser';
import { RESOURCE_META, RESOURCE_ORDER, TOP_UI_BAND, TextureKeys } from '@/config/Constants';
import { iconKeyFor } from '@/render/IconArt';
import { formatAmount, formatRate } from '@/utils/Format';
import { UIColors, UISpacing, labelStyle, titleStyle, UIText } from './UIStyle';
import type { EconomySnapshot, ResourcePool, WorkforceSnapshot } from '@/types';
import { PANEL_SLICE } from '@/render/PanelSkin';
import { CAPSULE_SLICE } from '@/render/UiShapes';

/** Ust cubugun sehir kimligi satirina koydugu degerler. */
export interface CityHeaderInfo {
  /** Sehir merkezinin seviyesi; henuz kurulmadiysa null. */
  hallLevel: number | null;
  /**
   * Bir sonraki merkez seviyesine ilerleme (0..1).
   * Yukseltme surerken insaat ilerlemesi, aksi halde maliyetin ne kadarinin
   * karsilandigi. Son seviyede 1.
   */
  progress: number;
  /** Ilerleme cubugunun altinda gosterilecek kisa aciklama. */
  progressLabel: string;
}

/**
 * Ekranin ustundeki SEHIR CUBUGU.
 *
 * Iki satir tasir ve ikisinin isi farklidir (bilgi hiyerarsisi):
 *
 *   1. KIMLIK satiri  - arma, sehrin adi, merkez seviyesi, seviye ilerleme
 *                       cubugu, nufus ve isci sayaci. "Sehrim ne durumda?"
 *   2. KAYNAK satiri  - dort kaynak KARTI: ikon, miktar, dakikalik akis ve
 *                       depo dolulugu cubugu. "Neyi karsilayabilirim?"
 *
 * Depo tavani yaklasirken miktarin yanina kapasite yazilir ve renk degisir;
 * cubuk sessizce kirmizilasmak yerine SAYIYI gosterir, cunku "neden
 * birikmiyor?" sorusunun cevabi kapasitenin kendisidir.
 */
export class ResourceBar extends Phaser.GameObjects.Container {
  private static readonly HEIGHT = TOP_UI_BAND;

  /** Kapasitenin bu oranindan sonra "x/y" gosterimi acilir. */
  private static readonly SHOW_CAPACITY_AT = 0.85;

  private readonly background: Phaser.GameObjects.NineSlice;

  /** Kimlik satiri. */
  private readonly avatar: Phaser.GameObjects.Image;
  private readonly avatarRing: Phaser.GameObjects.Image;
  private readonly levelBadge: Phaser.GameObjects.Image;
  private readonly levelBadgeText: Phaser.GameObjects.Text;
  private readonly cityText: Phaser.GameObjects.Text;
  private readonly levelText: Phaser.GameObjects.Text;
  private readonly progressTrack: Phaser.GameObjects.Image;
  private readonly progressFill: Phaser.GameObjects.Image;
  private readonly populationIcon: Phaser.GameObjects.Image;
  private readonly populationText: Phaser.GameObjects.Text;
  private readonly workerIcon: Phaser.GameObjects.Image;
  private readonly workerText: Phaser.GameObjects.Text;

  /** Kaynak kartlari. */
  private readonly cards = new Map<string, ResourceCard>();

  /** Sayaclarin hizalandigi sag kenar; metin degisince yeniden dizilir. */
  private chipRight = 0;

  constructor(scene: Phaser.Scene, width: number) {
    super(scene, 0, 0);

    this.background = scene.add
      .nineslice(0, 0, TextureKeys.Panel, undefined, width, ResourceBar.HEIGHT, PANEL_SLICE, PANEL_SLICE, PANEL_SLICE, PANEL_SLICE)
      .setOrigin(0, 0);
    this.add(this.background);

    /*
     * ARMA CERCEVESI: arma + altin halka + seviye rozeti.
     *
     * Uc ayri parca cunku ucu de ayri hizda degisir: arma sabittir, halka
     * sabittir, rozetin SAYISI her yukseltmede degisir. Tek gorsele
     * pisirilseydi her seviye icin yeni bir doku uretmek gerekirdi.
     */
    this.avatar = scene.add
      .image(0, 0, iconKeyFor('avatar'))
      .setOrigin(0.5, 0.5)
      .setDisplaySize(34, 34);
    this.avatarRing = scene.add
      .image(0, 0, TextureKeys.Ring)
      .setOrigin(0.5, 0.5)
      .setDisplaySize(44, 44);
    this.levelBadge = scene.add
      .image(0, 0, TextureKeys.Disc)
      .setOrigin(0.5, 0.5)
      .setDisplaySize(18, 18)
      .setVisible(false);
    this.levelBadgeText = scene.add
      .text(0, 0, '', labelStyle(10, '#2a2419', true))
      .setOrigin(0.5, 0.5)
      .setVisible(false);
    this.cityText = scene.add
      .text(0, 0, 'ANCIENT CITY', titleStyle(15, UIText.accent))
      .setOrigin(0, 0.5);
    this.levelText = scene.add
      .text(0, 0, 'Merkez yok', labelStyle(11, UIText.muted))
      .setOrigin(0, 0.5);

    this.progressTrack = scene.add
      .image(0, 0, TextureKeys.Pixel)
      .setOrigin(0, 0.5)
      .setTint(0x000000)
      .setAlpha(0.4);
    this.progressFill = scene.add
      .image(0, 0, TextureKeys.Pixel)
      .setOrigin(0, 0.5)
      .setTint(UIColors.accent);

    this.populationIcon = scene.add
      .image(0, 0, iconKeyFor('people'))
      .setOrigin(0.5, 0.5)
      .setDisplaySize(18, 18);
    this.populationText = scene.add
      .text(0, 0, '0/0', labelStyle(12, UIText.primary, true))
      .setOrigin(1, 0.5);
    this.workerIcon = scene.add
      .image(0, 0, iconKeyFor('worker'))
      .setOrigin(0.5, 0.5)
      .setDisplaySize(18, 18);
    this.workerText = scene.add
      .text(0, 0, '0', labelStyle(12, UIText.primary, true))
      .setOrigin(1, 0.5);

    this.add([
      this.avatar,
      this.avatarRing,
      this.levelBadge,
      this.levelBadgeText,
      this.cityText,
      this.levelText,
      this.progressTrack,
      this.progressFill,
      this.populationIcon,
      this.populationText,
      this.workerIcon,
      this.workerText,
    ]);

    for (const key of RESOURCE_ORDER) {
      const card = new ResourceCard(scene, key);
      this.cards.set(key, card);
      this.add(card);
    }

    this.layout(width);
    scene.add.existing(this);
  }

  /** Cubugun kapladigi yukseklik - alt panellerin hizalanmasinda kullanilir. */
  static get height(): number {
    return ResourceBar.HEIGHT;
  }

  /**
   * Ekran genisligi degistiginde ogeleri yeniden dizer.
   * sideInset, sistem cubuklarinin sol/sag payi kadar ek bosluk birakir.
   */
  layout(width: number, sideInset = 0): void {
    this.background.setSize(width, ResourceBar.HEIGHT);

    const left = UISpacing.panelPadding + sideInset;
    const right = width - UISpacing.panelPadding - sideInset;

    // 1. Kimlik satiri
    const avatarX = left + 22;
    this.avatar.setPosition(avatarX, 26);
    this.avatarRing.setPosition(avatarX, 26);
    // Rozet halkanin SAG ALT yayina oturur: armanin yuzunu kapatmaz.
    this.levelBadge.setPosition(avatarX + 15, 37);
    this.levelBadgeText.setPosition(avatarX + 15, 37);
    const textLeft = left + 50;
    this.cityText.setPosition(textLeft, 17);
    this.levelText.setPosition(textLeft + this.cityText.width + 8, 18);

    /*
     * Ilerleme cubugu sehir adinin ALTINDA ve nufus sayacinin SOLUNDA biter.
     * Sabit genislik vermek dar telefonda sayaclarin altina giriyordu.
     */
    const barWidth = Math.max(60, right - 90 - textLeft);
    this.progressTrack.setPosition(textLeft, 36).setDisplaySize(barWidth, 6);
    this.progressFill.setPosition(textLeft, 36).setDisplaySize(1, 6);

    this.chipRight = right;
    this.layoutChips();

    // 2. Kaynak kartlari
    const gap = 6;
    const usable = right - left;
    const cardWidth = (usable - gap * (RESOURCE_ORDER.length - 1)) / RESOURCE_ORDER.length;
    RESOURCE_ORDER.forEach((key, index) => {
      const card = this.cards.get(key);
      card?.setPosition(left + (cardWidth + gap) * index, 54);
      card?.resize(cardWidth, 48);
    });
  }

  /**
   * Nufus ve isci sayaclarini sagdan sola dizer.
   *
   * Metin GENISLIGINE bagli oldugu icin her deger degisiminde yeniden
   * cagrilmali: yalnizca yerlesimde hesaplamak, "0/0" genisligiyle
   * konumlanmis ikonlarin "29/60" yazilinca metnin altinda kalmasina yol
   * aciyordu (ekran goruntusuyle dogrulandi).
   */
  private layoutChips(): void {
    const y = 26;
    this.workerText.setPosition(this.chipRight, y);
    this.workerIcon.setPosition(this.chipRight - this.workerText.width - 12, y);
    const popRight = this.workerIcon.x - 14;
    this.populationText.setPosition(popRight, y);
    this.populationIcon.setPosition(popRight - this.populationText.width - 12, y);
  }

  /** Sehir kimligi satirini gunceller. */
  updateCity(info: CityHeaderInfo): void {
    this.levelText.setText(info.hallLevel === null ? 'Merkez yok' : `Seviye ${info.hallLevel}`);
    this.levelText.setColor(info.hallLevel === null ? UIText.accent : UIText.muted);

    // Rozet yalnizca gosterecek bir seviye varken gorunur; merkez yokken
    // bos bir altin daire "bir sey eksik" hissi verirdi.
    const hasLevel = info.hallLevel !== null;
    this.levelBadge.setVisible(hasLevel);
    this.levelBadgeText.setVisible(hasLevel).setText(hasLevel ? `${info.hallLevel}` : '');
    this.levelText.setPosition(
      this.cityText.x + this.cityText.width + 8,
      this.levelText.y,
    );

    const ratio = Phaser.Math.Clamp(info.progress, 0, 1);
    this.progressFill.setDisplaySize(
      Math.max(2, this.progressTrack.displayWidth * ratio),
      6,
    );
    this.progressFill.setTint(ratio >= 1 ? UIColors.success : UIColors.accent);
  }

  /** Kaynak miktarlarini gunceller; depo dolmaya yaklastiysa kapasiteyi de yazar. */
  updateResources(resources: ResourcePool, capacity: number): void {
    for (const key of RESOURCE_ORDER) {
      this.cards.get(key)?.updateAmount(resources[key], capacity, ResourceBar.SHOW_CAPACITY_AT);
    }
  }

  /** Dakikalik uretim oranlarini ve nufusu gunceller. */
  updateEconomy(snapshot: EconomySnapshot): void {
    for (const key of RESOURCE_ORDER) {
      this.cards.get(key)?.updateRate(snapshot.netPerMinute[key] ?? 0);
    }
    this.populationText.setText(`${snapshot.population}/${snapshot.populationCapacity}`);
    this.populationText.setColor(
      snapshot.population >= snapshot.populationCapacity ? UIText.accent : UIText.primary,
    );
    this.layoutChips();
  }

  /** Bostaki isci sayisini gosterir; atama yapilabilecegini hatirlatir. */
  updateWorkforce(snapshot: WorkforceSnapshot): void {
    this.workerText.setText(`${snapshot.idle}`);
    this.workerText.setColor(snapshot.idle > 0 ? UIText.accent : UIText.primary);
    this.layoutChips();
  }
}

/**
 * Tek bir kaynagin karti.
 *
 * Dort satirlik bilgiyi 87 piksele sigdirmak mumkun degildi (360 pikselik
 * ekranda kart genisligi bu kadar); bu yuzden kapasite SAYI olarak degil
 * CUBUK olarak gosterilir ve yalnizca tavana yaklasinca sayiya doner.
 * Tam sayilar "DAHA > Sehir Ozeti" sayfasinda durur.
 */
class ResourceCard extends Phaser.GameObjects.Container {
  private readonly frame: Phaser.GameObjects.NineSlice;
  private readonly icon: Phaser.GameObjects.Image;
  private readonly amountText: Phaser.GameObjects.Text;
  private readonly rateText: Phaser.GameObjects.Text;
  private readonly barTrack: Phaser.GameObjects.Image;
  private readonly barFill: Phaser.GameObjects.Image;

  private cardWidth = 80;

  constructor(scene: Phaser.Scene, private readonly resourceKey: string) {
    super(scene, 0, 0);

    /*
     * KAPSUL BICIM.
     *
     * Kart onceden koseli bir dugme derisiydi ve ust cubuktaki bes kart
     * bir dugme sirasi gibi duruyordu - oysa bunlar basilmaz, yalnizca
     * OKUNUR. Kapsul bicim "bu bir deger, bir eylem degil" der; ayni
     * ayrimi mobil oyunlarin kaynak cubuklari da bu sekilde kurar.
     *
     * Yukseklik kaynak dokunun yuksekligiyle ayni tutulur (48): boylece
     * dikey germe olmaz ve yuvarlak uclar bozulmadan kalir, yalnizca
     * genislik gerilir.
     */
    this.frame = scene.add
      .nineslice(0, 0, TextureKeys.Capsule, undefined, 80, 48, CAPSULE_SLICE, CAPSULE_SLICE, CAPSULE_SLICE, CAPSULE_SLICE)
      .setOrigin(0, 0);
    this.icon = scene.add
      .image(0, 0, iconKeyFor(resourceKey as 'food'))
      .setOrigin(0.5, 0.5)
      .setDisplaySize(18, 18);
    this.amountText = scene.add
      .text(0, 0, '0', labelStyle(13, UIText.primary, true))
      .setOrigin(0, 0.5);
    this.rateText = scene.add.text(0, 0, '0/dk', labelStyle(9, UIText.muted)).setOrigin(0, 0.5);

    this.barTrack = scene.add
      .image(0, 0, TextureKeys.Pixel)
      .setOrigin(0, 0.5)
      .setTint(0x000000)
      .setAlpha(0.4);
    this.barFill = scene.add
      .image(0, 0, TextureKeys.Pixel)
      .setOrigin(0, 0.5)
      .setTint(RESOURCE_META[resourceKey as 'food'].color);

    this.add([this.frame, this.icon, this.amountText, this.rateText, this.barTrack, this.barFill]);
  }

  resize(width: number, height: number): void {
    this.cardWidth = width;
    this.frame.setSize(width, height);
    // Yuvarlak uc, koseli dugmeye gore daha az duz kenar birakir; ikon ve
    // yazi bu yuzden bir piksel daha ice alinir.
    this.icon.setPosition(14, 17);
    this.amountText.setPosition(26, 15);
    this.rateText.setPosition(26, 29);
    this.barTrack.setPosition(11, height - 9).setDisplaySize(width - 22, 3);
    this.barFill.setPosition(11, height - 9).setDisplaySize(1, 3);
  }

  updateAmount(value: number, capacity: number, showCapacityAt: number): void {
    const ratio = capacity > 0 ? value / capacity : 0;
    const near = ratio >= showCapacityAt;
    this.amountText.setText(
      near ? `${formatAmount(value)}/${formatAmount(capacity)}` : formatAmount(value),
    );
    this.amountText.setFontSize(near ? 11 : 13);
    if (value >= capacity) this.amountText.setColor(UIText.danger);
    else if (near) this.amountText.setColor(UIText.accent);
    else this.amountText.setColor(UIText.primary);

    const width = Math.max(1, (this.cardWidth - 22) * Phaser.Math.Clamp(ratio, 0, 1));
    this.barFill.setDisplaySize(width, 3);
    this.barFill.setTint(
      value >= capacity ? UIColors.danger : RESOURCE_META[this.resourceKey as 'food'].color,
    );
  }

  updateRate(rate: number): void {
    this.rateText.setText(`${formatRate(rate)}/dk`);
    this.rateText.setColor(rate > 0 ? UIText.success : rate < 0 ? UIText.danger : UIText.muted);
  }
}
