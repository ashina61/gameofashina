import Phaser from 'phaser';
import { DRAG_THRESHOLD_PX, MAX_ZOOM, MIN_ZOOM, TAP_MAX_DURATION_MS } from '@/config/Constants';

/** Dokunma etkilesiminin sonucunu disariya bildiren geri cagirimlar. */
export interface CameraControllerCallbacks {
  /** Kaydirma olmadan yapilan tek dokunus (dunya koordinati ile). */
  onTap?: (worldX: number, worldY: number) => void;
  /** Parmak surukleme veya yakinlastirma sirasinda tetiklenir. */
  onDragStart?: () => void;
  /** Parmak hareket ederken guncel dunya koordinati (onizleme icin). */
  onHover?: (worldX: number, worldY: number) => void;
  /**
   * Verilen ekran noktasinin arayuz tarafindan kapatilip kapatilmadigi.
   * true donerse dokunus tamamen yok sayilir; arayuze basarken harita
   * kaydirilmaz ve bina kurulmaz.
   */
  isBlocked?: (screenX: number, screenY: number) => boolean;
}

/**
 * Mobil oncelikli kamera denetleyicisi.
 *
 * - Tek parmakla surukleme: haritayi kaydirir.
 * - Iki parmakla sikistirma: yakinlastirir/uzaklastirir.
 * - Kisa dokunus: tap olarak raporlanir (kaydirmadan ayirt edilir).
 * - Fare tekerlegi ve ok tuslari masaustunde test kolayligi saglar.
 *
 * Sahne mantigindan bagimsizdir; yalnizca callbacks uzerinden haber verir.
 */
export class CameraController {
  private readonly scene: Phaser.Scene;
  private readonly camera: Phaser.Cameras.Scene2D.Camera;
  private readonly callbacks: CameraControllerCallbacks;

  /** Ekranda basili olan parmaklar. */
  private readonly activePointers = new Map<number, Phaser.Math.Vector2>();

  private dragging = false;
  private pinching = false;
  private pointerDownAt = 0;
  private downScreen = new Phaser.Math.Vector2();
  private lastScreen = new Phaser.Math.Vector2();
  private pinchStartDistance = 0;
  private pinchStartZoom = 1;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private enabled = true;

  constructor(
    scene: Phaser.Scene,
    camera: Phaser.Cameras.Scene2D.Camera,
    callbacks: CameraControllerCallbacks = {},
  ) {
    this.scene = scene;
    this.camera = camera;
    this.callbacks = callbacks;

    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this);
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.handlePointerMove, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP, this.handlePointerUp, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.handlePointerUp, this);
    scene.input.on(Phaser.Input.Events.GAME_OUT, this.reset, this);
    scene.input.on(Phaser.Input.Events.POINTER_WHEEL, this.handleWheel, this);

    this.cursors = scene.input.keyboard?.createCursorKeys();
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
  }

  /** Arayuz paneli aciklken kamerayi kilitlemek icin kullanilir. */
  setEnabled(value: boolean): void {
    this.enabled = value;
    if (!value) this.reset();
  }

  /** Kamerayi verilen dunya noktasina yumusak sekilde tasir. */
  centerOn(worldX: number, worldY: number, animate = false): void {
    if (!animate) {
      this.camera.centerOn(worldX, worldY);
      return;
    }
    this.scene.tweens.add({
      targets: this.camera,
      scrollX: worldX - this.camera.width / 2 / this.camera.zoom,
      scrollY: worldY - this.camera.height / 2 / this.camera.zoom,
      duration: 350,
      ease: 'Sine.easeOut',
    });
  }

  /** Her karede klavye ile kaydirmayi isler (masaustu kolayligi). */
  update(deltaMs: number): void {
    if (!this.enabled || !this.cursors) return;
    const speed = (0.7 * deltaMs) / this.camera.zoom;
    if (this.cursors.left.isDown) this.camera.scrollX -= speed;
    if (this.cursors.right.isDown) this.camera.scrollX += speed;
    if (this.cursors.up.isDown) this.camera.scrollY -= speed;
    if (this.cursors.down.isDown) this.camera.scrollY += speed;
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (!this.enabled) return;
    // Arayuz uzerinde baslayan dokunuslari hic kaydetmiyoruz.
    if (this.callbacks.isBlocked?.(pointer.x, pointer.y)) return;

    this.activePointers.set(pointer.id, new Phaser.Math.Vector2(pointer.x, pointer.y));

    if (this.activePointers.size === 1) {
      this.dragging = false;
      this.pinching = false;
      this.pointerDownAt = this.scene.time.now;
      this.downScreen.set(pointer.x, pointer.y);
      this.lastScreen.set(pointer.x, pointer.y);
    } else if (this.activePointers.size === 2) {
      // Ikinci parmak degdiginde pinch baslar; kaydirma iptal edilir.
      this.pinching = true;
      this.dragging = false;
      this.pinchStartDistance = this.pointerDistance();
      this.pinchStartZoom = this.camera.zoom;
    }
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.enabled) return;
    if (!this.activePointers.has(pointer.id)) {
      // Basili olmayan fare hareketi: yalnizca onizleme icin bildirilir.
      if (this.activePointers.size === 0) this.reportHover(pointer);
      return;
    }

    this.activePointers.set(pointer.id, new Phaser.Math.Vector2(pointer.x, pointer.y));

    if (this.pinching && this.activePointers.size >= 2) {
      this.applyPinch();
      return;
    }

    if (this.activePointers.size !== 1) return;

    const dx = pointer.x - this.lastScreen.x;
    const dy = pointer.y - this.lastScreen.y;
    const travelled = Phaser.Math.Distance.Between(
      this.downScreen.x,
      this.downScreen.y,
      pointer.x,
      pointer.y,
    );

    if (!this.dragging && travelled > DRAG_THRESHOLD_PX) {
      this.dragging = true;
      this.callbacks.onDragStart?.();
    }

    if (this.dragging) {
      // Zoom seviyesine bolerek parmagin altindaki nokta sabit kalir.
      this.camera.scrollX -= dx / this.camera.zoom;
      this.camera.scrollY -= dy / this.camera.zoom;
    } else {
      this.reportHover(pointer);
    }

    this.lastScreen.set(pointer.x, pointer.y);
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer): void {
    const wasSingle = this.activePointers.size === 1;
    this.activePointers.delete(pointer.id);

    if (this.activePointers.size < 2) {
      this.pinching = false;
    }

    if (!this.enabled) return;

    const duration = this.scene.time.now - this.pointerDownAt;
    const isTap = wasSingle && !this.dragging && duration <= TAP_MAX_DURATION_MS;

    if (isTap) {
      const world = this.camera.getWorldPoint(pointer.x, pointer.y);
      this.callbacks.onTap?.(world.x, world.y);
    }

    if (this.activePointers.size === 0) {
      this.dragging = false;
    }
  }

  private handleWheel(
    _pointer: Phaser.Input.Pointer,
    _objects: unknown[],
    _dx: number,
    dy: number,
  ): void {
    if (!this.enabled) return;
    this.setZoom(this.camera.zoom - dy * 0.0012);
  }

  /** Iki parmak arasindaki mesafe oranina gore zoom uygular. */
  private applyPinch(): void {
    const distance = this.pointerDistance();
    if (this.pinchStartDistance <= 0 || distance <= 0) return;
    this.setZoom(this.pinchStartZoom * (distance / this.pinchStartDistance));
  }

  private pointerDistance(): number {
    const points = [...this.activePointers.values()];
    if (points.length < 2) return 0;
    return Phaser.Math.Distance.BetweenPoints(points[0], points[1]);
  }

  private setZoom(value: number): void {
    this.camera.setZoom(Phaser.Math.Clamp(value, MIN_ZOOM, MAX_ZOOM));
  }

  private reportHover(pointer: Phaser.Input.Pointer): void {
    if (!this.callbacks.onHover) return;
    if (this.callbacks.isBlocked?.(pointer.x, pointer.y)) return;
    const world = this.camera.getWorldPoint(pointer.x, pointer.y);
    this.callbacks.onHover(world.x, world.y);
  }

  private reset(): void {
    this.activePointers.clear();
    this.dragging = false;
    this.pinching = false;
  }

  destroy(): void {
    const input = this.scene.input;
    input.off(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this);
    input.off(Phaser.Input.Events.POINTER_MOVE, this.handlePointerMove, this);
    input.off(Phaser.Input.Events.POINTER_UP, this.handlePointerUp, this);
    input.off(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.handlePointerUp, this);
    input.off(Phaser.Input.Events.GAME_OUT, this.reset, this);
    input.off(Phaser.Input.Events.POINTER_WHEEL, this.handleWheel, this);
    this.reset();
  }
}
