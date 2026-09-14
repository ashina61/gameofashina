import type Phaser from 'phaser';
import { TILE_HEIGHT, TILE_WIDTH, TextureKeys } from '@/config/Constants';
import { depthFor, gridToWorld } from '@/utils/IsoUtils';
import { getBuildingVisual } from './BuildingVisuals';
import { ensureShadowTexture } from './ShadowArt';
import { rightSizedKey } from './SpriteScale';
import type { BuildingVisual } from './BuildingVisuals';
import type {
  BuildingDefinition,
  BuildingInstance,
  ConstructionKind,
  ResolvedBuilding,
} from '@/types';

/** Golgenin ayak izi disina tastigi pay - ShadowArt ile ayni deger. */
const SHADOW_OVERHANG = 20;

/**
 * Bir gorseli ayak izi genisligine oturtur, en-boy oranini korur.
 *
 * Cozunurlukten bagimsizlik burada saglanir: dosyanin kac piksel oldugu
 * degil, kac KARO kapladigi belirleyicidir.
 */
function fitToFootprint(image: Phaser.GameObjects.Image, size: number, overhang = 0): void {
  const target = TILE_WIDTH * size + overhang;
  const source = image.width || target;
  image.setScale(target / source);
}

/** Sirada bekleyen gorevin soluk tonu - is henuz baslamadi. */
const QUEUED_TINT = 0x9aa0a6;

/** Secili binanin vurgu rengi. */
const SELECTED_TINT = 0xffe9a8;

/** Ilerleme cubugu dolgusunun gorev turune gore rengi. */
const BAR_TINT = {
  buildActive: 0x6ee27a,
  buildQueued: 0x6b7178,
  upgradeActive: 0xe8c86a,
  upgradeQueued: 0x7a7059,
} as const;

/**
 * Tek bir binanin gorsel temsili.
 *
 * View YALNIZCA cizer: oyun kurali hesaplamaz, kaynak dusmez, seviye
 * degistirmez, insaat baslatmaz. Ne gosterecegini disaridan hazir olarak alir.
 *
 * ILERLEME CUBUGU
 * Cubuk bir kez olusturulan iki Image'dan olusur; ilerleme yalnizca dolgu
 * parcasinin scaleX degeri degistirilerek gosterilir. Onceki surumde her
 * karede Graphics geometrisi yeniden kuruluyordu ve olculen FPS dususunun
 * ana kaynagi buydu.
 */
export class BuildingView {
  readonly uid: string;

  private readonly sprite: Phaser.GameObjects.Image;
  /**
   * PNG kullanan binalarin altindaki yumusak golge; prosedurelde null.
   *
   * GEC OLUSTURULUR. Ilk surumde kurucuda karar veriliyordu ve hicbir
   * zaman olusmuyordu: bina kuruldugu anda daima 'constructing'
   * durumundadir, o durumda ise sprite aranmaz (santiye bitmis bina gibi
   * gorunmemeli). Insaat bitip gorsel tazelendiginde artik gec kalinmis
   * oluyordu. Golge artik dokuyla BIRLIKTE, her tazelemede karar edilir.
   */
  private shadow: Phaser.GameObjects.Image | null = null;
  private readonly barBackground: Phaser.GameObjects.Image;
  private readonly barFill: Phaser.GameObjects.Image;
  private readonly barWidth: number;
  private readonly def: BuildingDefinition;
  /** Golgenin ve sprite'in dunya konumu; gec olusturma icin saklanir. */
  private readonly anchorX: number;
  private readonly anchorY: number;
  private readonly depth: number;
  /** Dolgunun tam genislikteki olcegi; ilerleme bunun kesridir. */
  private readonly fullScaleX: number;

  private selected = false;
  /** Durum gorselinden gelen opaklik (devre disi bina soluktur). */
  private stateAlpha = 1;
  /** Durum gorselinden gelen renk carpani. */
  private stateTint = 0xffffff;
  /** Devam eden gorevin turu; gorev yoksa null. */
  private taskKind: ConstructionKind | null = null;
  /** Devam eden gorev sirada mi bekliyor? */
  private taskQueued = false;

  /**
   * Dokular DPR olceginde uretilir; sprite bunun tersiyle olceklenir ki
   * dunyadaki boyut degismesin. Tum olcek islemleri bu degeri taban alir.
   */
  /** Cihaz piksel yogunlugu; dokular bu olcekte uretilir. */
  private readonly artScale: number;
  private readonly baseScale: number;

  constructor(
    scene: Phaser.Scene,
    building: BuildingInstance,
    def: BuildingDefinition,
    resolved: ResolvedBuilding,
    artScale = 1,
  ) {
    this.uid = building.uid;
    this.artScale = artScale > 0 ? artScale : 1;
    this.baseScale = 1 / this.artScale;

    // Binanin taban eskenar dortgeninin en on kosesi
    const anchor = gridToWorld(building.gx + def.size - 1, building.gy + def.size - 1);
    const y = anchor.y + TILE_HEIGHT / 2;
    const depth = depthFor(building.gx, building.gy, def.size);

    const visual = getBuildingVisual({
      type: building.type,
      level: building.level,
      state: building.state,
      size: def.size,
      uid: building.uid,
    });
    this.stateTint = visual.tint;
    this.stateAlpha = visual.alpha;

    this.anchorX = anchor.x;
    this.anchorY = y;
    this.depth = depth;
    this.def = def;

    this.sprite = scene.add.image(anchor.x, y, visual.textureKey).setOrigin(0.5, 1).setDepth(depth);
    this.applyTexture(visual);

    this.barWidth = Math.max(36, def.size * 46);
    const barY = y - 6;

    this.barBackground = scene.add
      .image(anchor.x, barY, TextureKeys.Pixel)
      .setOrigin(0.5, 0.5)
      .setDisplaySize(this.barWidth + 4, 11)
      .setTint(0x14110c)
      .setAlpha(0.9)
      .setDepth(depth + 1)
      .setVisible(false);

    // Dolgu sol kenardan buyur; ilerleme scaleX ile verilir.
    this.barFill = scene.add
      .image(anchor.x - this.barWidth / 2, barY, TextureKeys.Pixel)
      .setOrigin(0, 0.5)
      .setDisplaySize(this.barWidth, 7)
      .setTint(BAR_TINT.buildActive)
      .setDepth(depth + 2)
      .setVisible(false);

    // setDisplaySize scaleX'i degistirdigi icin tam genislikteki olcegi
    // referans alip ilerlemeyi bunun uzerinden hesapliyoruz.
    this.fullScaleX = this.barFill.scaleX;

    this.applyResolved(resolved);
  }

  /** Devam eden bir gorevi gosteriyor mu? */
  get hasTask(): boolean {
    return this.taskKind !== null;
  }

  /**
   * Bina orneginin GORSELINI type/level/state'e gore tazeler.
   *
   * View burada "bu bina soyle cizilir" bilgisi tutmaz; kimligi
   * BuildingVisuals'a sorar. Yukseltme bitince veya durum degisince
   * cagrilir; doku bir kez degistirilir, her karede degil.
   */
  syncVisual(building: BuildingInstance): void {
    const visual = getBuildingVisual({
      type: building.type,
      level: building.level,
      state: building.state,
      size: this.def.size,
      uid: building.uid,
    });
    this.applyTexture(visual);
    this.stateAlpha = visual.alpha;
    this.stateTint = visual.tint;
    this.applyTint();
    if (this.taskKind === null) this.sprite.setAlpha(this.stateAlpha);
  }

  /** Hesaplanmis duruma gore gorunumu ayarlar (olusturma aninda). */
  applyResolved(resolved: ResolvedBuilding): void {
    if (resolved.construction) {
      this.beginTask(
        resolved.construction.kind,
        resolved.construction.ratio,
        resolved.construction.status === 'queued',
      );
    } else {
      this.endTask();
    }
  }

  /**
   * Gorev gorunumune gecer.
   *
   * build   - bina henuz calismiyor: solgun cizilir, ilerleme cubugu gosterilir.
   * upgrade - bina mevcut seviyesinde calismaya devam ediyor: normal cizilir,
   *           yalnizca ilerleme cubugu gosterilir.
   */
  beginTask(kind: ConstructionKind, ratio = 0, queued = false): void {
    this.taskKind = kind;
    this.taskQueued = queued;

    /*
     * Insaat halindeki bina artik AYRI bir iskele gorseliyle cizilir.
     * Eskiden bitmis bina solgunlastirilarak "yapim asamasinda" hissi
     * veriliyordu; o solgunlastirma simdi iskelenin uzerine binince santiye
     * hayalet gibi gorunuyordu. Aktif santiye tam opak cizilir, yalnizca
     * KUYRUKTA bekleyen is soluk kalir - oyuncu hangi santiyenin gercekten
     * calistigini bakar bakmaz ayirt eder.
     */
    if (kind === 'build') {
      this.sprite.setAlpha(queued ? 0.5 : 1);
    } else {
      this.sprite.setAlpha((queued ? 0.8 : 1) * this.stateAlpha);
    }
    this.applyTint();

    this.barFill.setTint(
      kind === 'build'
        ? queued
          ? BAR_TINT.buildQueued
          : BAR_TINT.buildActive
        : queued
          ? BAR_TINT.upgradeQueued
          : BAR_TINT.upgradeActive,
    );
    this.barBackground.setVisible(true).setAlpha(queued ? 0.6 : 0.9);
    this.barFill.setVisible(true);
    this.setProgress(ratio);
  }

  /**
   * Gorev bitti: normal gorunume doner.
   * celebrate=true ise kisa bir olcek geri bildirimi oynatilir; bu tek seferlik
   * bir tween'dir, kare basina maliyet eklemez.
   */
  endTask(celebrate = false): void {
    const hadTask = this.taskKind !== null;
    this.taskKind = null;
    this.taskQueued = false;
    this.sprite.setAlpha(this.stateAlpha);
    this.barBackground.setVisible(false);
    this.barFill.setVisible(false);
    this.applyTint();

    if (celebrate && hadTask) this.playCompletionPulse();
  }

  /** Tamamlanmada kisa bir "oturma" hareketi. */
  private playCompletionPulse(): void {
    const scene = this.sprite.scene;
    scene.tweens.killTweensOf(this.sprite);

    /*
     * Hedef olcek, sprite'in O ANKI olcegidir - sabit baseScale DEGIL.
     * PNG kullanan bina ayak izine gore olceklendigi icin baseScale'e
     * donmek onu aniden yanlis boyuta oturtur ve "oturma" hareketi
     * kalici bir bozulmaya donusurdu.
     */
    const restX = this.sprite.scaleX;
    const restY = this.sprite.scaleY;
    this.sprite.setScale(restX * 1.12, restY * 0.88);
    scene.tweens.add({
      targets: this.sprite,
      scaleX: restX,
      scaleY: restY,
      duration: 260,
      ease: 'Back.easeOut',
    });
  }

  /**
   * Ilerleme oranini uygular.
   * Tek islem: dolgunun yatay olcegi. Geometri yeniden kurulmaz.
   */
  setProgress(ratio: number): void {
    const clamped = ratio < 0 ? 0 : ratio > 1 ? 1 : ratio;
    this.barFill.scaleX = this.fullScaleX * clamped;
  }

  /** Secili binanin cevresine vurgu uygular. */
  setSelected(value: boolean): void {
    if (this.selected === value) return;
    this.selected = value;
    this.applyTint();
  }

  destroy(): void {
    this.shadow?.destroy();
    this.sprite.destroy();
    this.barBackground.destroy();
    this.barFill.destroy();
  }

  /**
   * PNG mi prosedurel cizim mi?
   *
   * Listede bir dosya BILDIRILMIS olmasi yetmez; dokunun gercekten
   * yuklenmis olmasi da gerekir. Bozuk ya da yuklenememis bir dosya
   * yuzunden binanin gorunmez olmasi kabul edilemez - boyle bir durumda
   * sessizce bilinen dogru cizime donulur.
   */
  private chooseTexture(
    scene: Phaser.Scene,
    visual: BuildingVisual,
  ): { key: string; usesSprite: boolean } {
    if (visual.spriteKey && scene.textures.exists(visual.spriteKey)) {
      /*
       * Doku, EKRANDA CIZILDIGI olcude yeniden pisirilir.
       *
       * Ayak izi genisligi x cihaz yogunlugu, sprite'in gercek piksel
       * olcusudur. Buyuk bir kaynagi her karede kucultmek olculdu ve
       * pahali cikti (120 binada 7 FPS'e kadar); bir kez pisirmek ayni
       * gorunusu prosedurel taban cizgisinin hizinda verir.
       */
      const target = TILE_WIDTH * this.def.size * this.artScale;
      return { key: rightSizedKey(scene, visual.spriteKey, target), usesSprite: true };
    }
    return { key: visual.textureKey, usesSprite: false };
  }

  /**
   * Dokuyu, olcegi ve golgeyi birlikte uygular.
   *
   * UCU BIR ARADA cunku ucu de ayni karara baglidir: PNG mi kullaniliyor,
   * prosedurel cizim mi. Ayri ayri uygulandiklarinda birbirinden kopma
   * riski var - nitekim ilk surumde tam olarak bu oldu.
   */
  private applyTexture(visual: BuildingVisual): void {
    const scene = this.sprite.scene;
    const chosen = this.chooseTexture(scene, visual);

    if (this.sprite.texture.key !== chosen.key) this.sprite.setTexture(chosen.key);

    /*
     * OLCEKLEME: PNG ile prosedurel doku AYNI KURALA TABI DEGILDIR.
     *
     * Prosedurel dokular DPR olceginde uretilir, bu yuzden 1/artScale ile
     * kucultulurler. Elle uretilen bir PNG'nin ise DPR'den haberi yoktur;
     * ayni kurali uygulamak onu DPR 2 telefonda YARI BOYUTTA gosterirdi -
     * ve hedef platform tam olarak o telefon.
     *
     * Bunun yerine PNG, AYAK IZINE oturtulur: genisligi karo genisligi x
     * olcu kadardir, yuksekligi orani korunarak turer. Boylece 128 piksel
     * de 512 piksel de ayni dunya boyutunu verir - yuksek cozunurluklu
     * dosya yalnizca daha net gorunur.
     */
    if (chosen.usesSprite) fitToFootprint(this.sprite, this.def.size);
    else this.sprite.setScale(this.baseScale);

    this.syncShadow(scene, visual, chosen.usesSprite);
  }

  /**
   * Golgeyi duruma gore olusturur, tazeler ya da gizler.
   *
   * Prosedurel bina dokularinin golgesi kendi icine pisirilmis durumda
   * (bkz. ArtStyle.SHADOW_ALPHA); onlarin altina bir golge daha koymak
   * golgeyi iki kez cizerdi. Elle uretilen PNG ise yalnizca binayi
   * icerir ve zemine oturmasi icin bu katmani ister.
   *
   * Klasorler bosken tek bir golge nesnesi bile olusturulmaz: katmanin
   * bugunku sahneye maliyeti sifirdir.
   */
  private syncShadow(scene: Phaser.Scene, visual: BuildingVisual, usesSprite: boolean): void {
    if (!usesSprite) {
      this.shadow?.setVisible(false);
      return;
    }

    const key = visual.shadowSpriteKey ?? ensureShadowTexture(scene, this.def.size);
    if (!this.shadow) {
      this.shadow = scene.add
        .image(this.anchorX, this.anchorY - TILE_HEIGHT / 2, key)
        .setOrigin(0.5, 0.5)
        .setDepth(this.depth - 1);
    } else if (this.shadow.texture.key !== key) {
      this.shadow.setTexture(key);
    }

    this.shadow.setVisible(true);
    fitToFootprint(this.shadow, this.def.size, SHADOW_OVERHANG);
  }

  /**
   * Secim, insaat ve durum vurgularini tek yerden uygular.
   *
   * Oncelik: kuyrukta bekleyen is > secim > durum (devre disi) > normal.
   * Insaat halindeki bina artik solgun bir BINA degil, ayri bir ISKELE
   * gorseliyle cizildigi icin ayrica renklendirilmesine gerek yok.
   */
  private applyTint(): void {
    if (this.taskKind === 'build' && this.taskQueued) {
      this.sprite.setTint(QUEUED_TINT);
    } else if (this.selected) {
      this.sprite.setTint(SELECTED_TINT);
    } else if (this.stateTint !== 0xffffff) {
      this.sprite.setTint(this.stateTint);
    } else {
      this.sprite.clearTint();
    }
  }
}
