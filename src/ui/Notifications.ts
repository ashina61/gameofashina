import Phaser from 'phaser';
import { TextureKeys } from '@/config/Constants';
import { iconKeyFor } from '@/render/IconArt';
import { UIColors, UISpacing, UIText, labelStyle } from './UIStyle';
import type { IconKind } from '@/render/IconArt';

/** Bildirim turu; ikon ve kenar rengini belirler. */
export type NoticeTone = 'success' | 'warn' | 'info' | 'error';

const TONE: Record<NoticeTone, { icon: IconKind; color: number; text: string }> = {
  success: { icon: 'ok', color: UIColors.success, text: UIText.success },
  warn: { icon: 'warn', color: UIColors.warn, text: UIText.accent },
  info: { icon: 'info', color: UIColors.info, text: UIText.primary },
  error: { icon: 'error', color: UIColors.danger, text: UIText.danger },
};

/** Ayni anda ekranda durabilecek bildirim sayisi. */
const MAX_VISIBLE = 2;

/**
 * Durum bildirimleri.
 *
 * Sprint 13'e kadar tek satirlik TEK bir bildirim vardi ve yenisi eskisini
 * siliyordu: art arda iki sey olunca (bina bitti + depo doldu) oyuncu
 * birincisini hic gormuyordu. Artik bildirimler YIGILIR, en yenisi ustte
 * durur, her biri turune gore ikonlu ve kapatilabilir.
 *
 * Bildirim iki satirlidir: BASLIK ne oldugunu, ALT SATIR hangi binaya/
 * kaynaga dair oldugunu soyler. Tek satirlik metinlerde alt satir bos kalir
 * ve kart kisalir.
 */
export class NotificationStack {
  private readonly scene: Phaser.Scene;
  private readonly cards: NoticeCard[] = [];
  /** En yeniden en eskiye dogru ekranda duran bildirimler. */
  private readonly live: NoticeCard[] = [];

  private screenWidth: number;
  private topY: number;
  /**
   * Sagda yardimci dugmelere birakilan pay.
   *
   * Bildirimler tam genislikte cizildiginde sag kenardaki yuvarlak
   * dugmelerin (ayarlar/mesaj/basari) TAM UZERINE biniyordu (ekran
   * goruntusuyle dogrulandi). Kart o sutunun solunda biter.
   */
  private rightGutter = 0;

  constructor(scene: Phaser.Scene, width: number, topY: number, rightGutter = 0) {
    this.scene = scene;
    this.screenWidth = width;
    this.topY = topY;
    this.rightGutter = rightGutter;
  }

  /** Kartin kullanabilecegi genislik. */
  private cardWidth(): number {
    return Math.max(180, this.screenWidth - UISpacing.edge * 2 - this.rightGutter);
  }

  /** Yeni bir bildirim gosterir. */
  show(title: string, detail: string, tone: NoticeTone = 'info', durationMs = 3200): void {
    const card = this.take();
    card.fill(title, detail, tone);
    card.resize(this.cardWidth());

    this.live.unshift(card);
    // Kapasite asilirsa en eskisi hemen kapanir; yigin buyumez.
    while (this.live.length > MAX_VISIBLE) this.live.pop()?.dismiss();

    this.reflow();
    card.appear(durationMs, () => this.remove(card));
  }

  /** Ekran olculeri degistiginde yeniden dizer. */
  layout(width: number, topY: number, rightGutter = this.rightGutter): void {
    this.screenWidth = width;
    this.topY = topY;
    this.rightGutter = rightGutter;
    for (const card of this.live) card.resize(this.cardWidth());
    this.reflow();
  }

  /** Havuzdan bos bir kart alir; yoksa uretir. */
  private take(): NoticeCard {
    const free = this.cards.find((c) => !this.live.includes(c));
    if (free) return free;
    const created = new NoticeCard(this.scene, () => this.remove(created));
    this.cards.push(created);
    return created;
  }

  private remove(card: NoticeCard): void {
    const index = this.live.indexOf(card);
    if (index === -1) return;
    this.live.splice(index, 1);
    card.dismiss();
    this.reflow();
  }

  /** Kartlari ust ust dizer; en yeni en ustte. */
  private reflow(): void {
    let y = this.topY;
    for (const card of this.live) {
      card.placeAt(UISpacing.edge, y);
      y += NoticeCard.cardHeight + 8;
    }
  }
}

/** Tek bir bildirim karti. */
class NoticeCard extends Phaser.GameObjects.Container {
  private static readonly HEIGHT = 48;

  private readonly frame: Phaser.GameObjects.NineSlice;
  private readonly accent: Phaser.GameObjects.Image;
  private readonly icon: Phaser.GameObjects.Image;
  private readonly titleText: Phaser.GameObjects.Text;
  private readonly detailText: Phaser.GameObjects.Text;
  private readonly closeZone: Phaser.GameObjects.Zone;
  private readonly closeMark: Phaser.GameObjects.Text;

  private timer?: Phaser.Time.TimerEvent;
  private cardWidth = 300;

  constructor(scene: Phaser.Scene, onClose: () => void) {
    super(scene, 0, 0);

    this.frame = scene.add
      .nineslice(0, 0, TextureKeys.Panel, undefined, 300, NoticeCard.HEIGHT, 16, 16, 16, 16)
      .setOrigin(0, 0);
    /*
     * Sol kenardaki renk seridi.
     *
     * Ikon tek basina turu anlatiyor ama gunes altinda kucuk bir ikonun
     * rengi secilmiyor; kenar seridi karti uzaktan da siniflandirir.
     */
    this.accent = scene.add
      .image(0, 0, TextureKeys.Pixel)
      .setOrigin(0, 0)
      .setDisplaySize(4, NoticeCard.HEIGHT - 12);
    this.icon = scene.add.image(0, 0, iconKeyFor('info')).setOrigin(0.5, 0.5).setDisplaySize(22, 22);
    this.titleText = scene.add
      .text(0, 0, '', labelStyle(12, UIText.primary, true))
      .setOrigin(0, 0.5);
    this.detailText = scene.add.text(0, 0, '', labelStyle(10, UIText.muted)).setOrigin(0, 0.5);
    this.closeMark = scene.add.text(0, 0, 'x', labelStyle(14, UIText.muted, true)).setOrigin(0.5, 0.5);

    this.closeZone = scene.add.zone(0, 0, 40, NoticeCard.HEIGHT).setOrigin(0.5, 0.5).setInteractive();
    this.closeZone.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, onClose);

    this.add([this.frame, this.accent, this.icon, this.titleText, this.detailText, this.closeMark, this.closeZone]);
    this.setAlpha(0).setVisible(false);
    this.setDepth(50);
    scene.add.existing(this);
  }

  /** Kartin yuksekligi - yigin dizilimi bunu kullanir. */
  static get cardHeight(): number {
    return NoticeCard.HEIGHT;
  }

  fill(title: string, detail: string, tone: NoticeTone): void {
    const spec = TONE[tone];
    this.icon.setTexture(iconKeyFor(spec.icon));
    this.accent.setTint(spec.color);
    this.titleText.setText(title).setColor(spec.text);
    this.detailText.setText(detail).setVisible(detail.length > 0);
    // Tek satirlik bildirimde baslik dikeyde ortalanir.
    this.titleText.setY(detail ? 19 : NoticeCard.HEIGHT / 2);
  }

  resize(width: number): void {
    this.cardWidth = width;
    this.frame.setSize(width, NoticeCard.HEIGHT);
    this.accent.setPosition(6, 6);
    this.icon.setPosition(30, NoticeCard.HEIGHT / 2);
    this.titleText.setX(50);
    this.detailText.setPosition(50, 35);
    this.closeMark.setPosition(width - 20, NoticeCard.HEIGHT / 2);
    this.closeZone.setPosition(width - 20, NoticeCard.HEIGHT / 2);
    // Metin kapatma dugmesinin altina girmesin.
    const textWidth = width - 50 - 34;
    this.titleText.setWordWrapWidth(textWidth);
    this.detailText.setWordWrapWidth(textWidth);
  }

  /** Kartin ekrandaki yerini yumusak gecisle degistirir. */
  placeAt(x: number, y: number): void {
    this.setX(x);
    if (!this.visible) {
      this.setY(y);
      return;
    }
    this.scene.tweens.add({ targets: this, y, duration: 140, ease: 'Cubic.easeOut' });
  }

  appear(durationMs: number, onExpire: () => void): void {
    this.setVisible(true);
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({ targets: this, alpha: 1, duration: 160, ease: 'Sine.easeOut' });
    this.timer?.remove();
    this.timer = this.scene.time.delayedCall(durationMs, onExpire);
  }

  dismiss(): void {
    this.timer?.remove();
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 180,
      ease: 'Sine.easeIn',
      onComplete: () => this.setVisible(false),
    });
  }

  /** Kartin genisligi - yerlesim olcumleri icin. */
  measuredWidth(): number {
    return this.cardWidth;
  }
}
