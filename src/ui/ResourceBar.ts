import Phaser from 'phaser';
import { RESOURCE_ORDER, TOP_UI_BAND, TextureKeys } from '@/config/Constants';
import { iconKeyFor } from '@/render/IconArt';
import { formatAmount, formatRate } from '@/utils/Format';
import { UISpacing, labelStyle, UIText } from './UIStyle';
import type { EconomySnapshot, ResourcePool, WorkforceSnapshot } from '@/types';

/**
 * Ekranin ustundeki SEHIR CUBUGU.
 *
 * Iki satir tasir ve ikisinin isi farklidir (bilgi hiyerarsisi, Sprint 13 §13):
 *
 *   1. KIMLIK satiri  - sehrin adi, sehir merkezinin seviyesi, nufus ve
 *                       bostaki isci. "Sehrim ne durumda?" sorusu.
 *   2. KAYNAK satiri  - dort kaynagin ikonu, miktari ve dakikalik akisi.
 *                       "Neyi karsilayabilirim?" sorusu.
 *
 * Depo tavani yaklasirken miktarin yanina kapasite yazilir (312/500) ve
 * renk degisir; cubuk sessizce kirmizilasmak yerine SAYIYI gosterir, cunku
 * "neden birikmiyor?" sorusunun cevabi kapasitenin kendisidir.
 *
 * Genislik degistiginde layout() cagrilarak yeniden dizilir.
 */
export class ResourceBar extends Phaser.GameObjects.Container {
  private static readonly HEIGHT = TOP_UI_BAND;

  /** Kapasitenin bu oranindan sonra "x/y" gosterimi acilir. */
  private static readonly SHOW_CAPACITY_AT = 0.85;
  /** Bu orandan sonra sayi uyari rengine gecer. */
  private static readonly WARN_AT = 0.85;

  private readonly background: Phaser.GameObjects.NineSlice;
  private readonly amountTexts = new Map<string, Phaser.GameObjects.Text>();
  private readonly rateTexts = new Map<string, Phaser.GameObjects.Text>();
  private readonly icons: Phaser.GameObjects.Image[] = [];

  /** Kimlik satiri. */
  private readonly cityText: Phaser.GameObjects.Text;
  private readonly hallText: Phaser.GameObjects.Text;
  private readonly populationText: Phaser.GameObjects.Text;
  private readonly idleText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, width: number) {
    super(scene, 0, 0);

    this.background = scene.add
      .nineslice(0, 0, TextureKeys.Panel, undefined, width, ResourceBar.HEIGHT, 16, 16, 16, 16)
      .setOrigin(0, 0);
    this.add(this.background);

    this.cityText = scene.add
      .text(0, 0, 'ANCIENT CITY', labelStyle(13, UIText.accent, true))
      .setOrigin(0, 0.5);
    this.hallText = scene.add
      .text(0, 0, 'Merkez yok', labelStyle(10, UIText.muted))
      .setOrigin(0, 0.5);
    this.populationText = scene.add
      .text(0, 0, 'Nufus 0/0', labelStyle(12, UIText.primary, true))
      .setOrigin(1, 0.5);
    this.idleText = scene.add
      .text(0, 0, '0 bosta', labelStyle(10, UIText.muted))
      .setOrigin(1, 0.5);
    this.add([this.cityText, this.hallText, this.populationText, this.idleText]);

    for (const key of RESOURCE_ORDER) {
      const icon = scene.add
        .image(0, 0, iconKeyFor(key))
        .setOrigin(0.5, 0.5)
        // Ikon sutunu daraltmasin: 26 piksellik tuval 22'ye kucultulur.
        .setDisplaySize(22, 22);
      this.icons.push(icon);
      this.add(icon);

      const amount = scene.add
        .text(0, 0, '0', labelStyle(14, UIText.primary, true))
        .setOrigin(0, 0.5);
      const rate = scene.add.text(0, 0, '0', labelStyle(11, UIText.muted)).setOrigin(0, 0.5);
      this.amountTexts.set(key, amount);
      this.rateTexts.set(key, rate);
      this.add([amount, rate]);
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
    const idY = 17;
    this.cityText.setPosition(left, idY);
    this.hallText.setPosition(left + this.cityText.width + 8, idY + 1);
    this.populationText.setPosition(right, idY - 1);
    this.idleText.setPosition(right, idY + 13);

    /*
     * 2. Kaynak satiri
     *
     * Miktar ve oran ALT ALTA durur; ikisi de ikonun sagindan baslar.
     * Dikey aralik 18 piksel: 15px ve 11px yazilarin kutulari 16 pikselde
     * yarim piksel ust uste biniyordu (Sprint 12'de 360x800'de olculdu).
     */
    const columnWidth = (width - left - (width - right)) / RESOURCE_ORDER.length;
    const iconY = ResourceBar.HEIGHT - 30;

    RESOURCE_ORDER.forEach((key, index) => {
      const x = left + columnWidth * index;
      this.icons[index].setPosition(x + 11, iconY);
      const textX = x + 24;
      this.amountTexts.get(key)?.setPosition(textX, iconY - 8);
      this.rateTexts.get(key)?.setPosition(textX, iconY + 10);
    });
  }

  /** Sehir merkezinin seviyesini gosterir; yoksa kurulmasi gerektigini soyler. */
  updateCity(hallLevel: number | null): void {
    this.hallText.setText(hallLevel === null ? 'Merkez yok' : `Merkez Sv. ${hallLevel}`);
    this.hallText.setColor(hallLevel === null ? UIText.accent : UIText.muted);
  }

  /** Kaynak miktarlarini gunceller; depo dolmaya yaklastiysa kapasiteyi de yazar. */
  updateResources(resources: ResourcePool, capacity: number): void {
    for (const key of RESOURCE_ORDER) {
      const text = this.amountTexts.get(key);
      if (!text) continue;
      const value = resources[key];
      const ratio = capacity > 0 ? value / capacity : 0;

      /*
       * Kapasite YALNIZCA yaklasinca yazilir.
       *
       * Hepsini her zaman "12/300" diye yazmak dar telefonda dort sutunu
       * tasiriyordu ve oyunun ilk on dakikasinda hicbir ise yaramiyordu.
       * Tavan bir sorun HALINE GELDIGINDE gorunur olmasi yeterli.
       */
      /*
       * Kapasite gorunurken yazi KUCULUR.
       *
       * "220/300" 14 piksellik kalin yazida 90 piksellik sutunu tasiyor ve
       * yandaki ikonun uzerine biniyordu (360x800'de olculdu). Iki kat
       * bilgi, bir kat yer.
       */
      const showCapacity = ratio >= ResourceBar.SHOW_CAPACITY_AT;
      text.setText(
        showCapacity ? `${formatAmount(value)}/${formatAmount(capacity)}` : formatAmount(value),
      );
      text.setFontSize(showCapacity ? 12 : 14);
      if (value >= capacity) text.setColor(UIText.danger);
      else if (ratio >= ResourceBar.WARN_AT) text.setColor(UIText.accent);
      else text.setColor(UIText.primary);
    }
  }

  /** Dakikalik uretim oranlarini ve nufusu gunceller. */
  updateEconomy(snapshot: EconomySnapshot): void {
    for (const key of RESOURCE_ORDER) {
      const rate = snapshot.netPerMinute[key] ?? 0;
      const text = this.rateTexts.get(key);
      if (!text) continue;
      text.setText(`${formatRate(rate)}/dk`);
      text.setColor(rate > 0 ? UIText.success : rate < 0 ? UIText.danger : UIText.muted);
    }

    this.populationText.setText(`Nufus ${snapshot.population}/${snapshot.populationCapacity}`);
  }

  /** Bostaki isci sayisini gosterir; atama yapilabilecegini hatirlatir. */
  updateWorkforce(snapshot: WorkforceSnapshot): void {
    const moving = snapshot.moving > 0 ? ` · ${snapshot.moving} yolda` : '';
    this.idleText.setText(`${snapshot.idle} bosta${moving}`);
    this.idleText.setColor(snapshot.idle > 0 ? UIText.accent : UIText.muted);
  }
}
