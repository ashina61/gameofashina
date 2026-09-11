import Phaser from 'phaser';
import { MAX_RENDER_DPR, renderTargets } from '@/utils/RenderScale';
import type { RenderTargets } from '@/utils/RenderScale';

/**
 * Tuvalin cozunurlugunu ve kameralarin telafisini yoneten tek yer.
 *
 * Oyun boyutu CIHAZ pikselindedir; sahneler ve arayuz ise MANTIKSAL
 * (CSS) pikselde calisir. Aradaki farki kamera yakinlastirmasi kapatir:
 * her kameranin zoom degeri dpr ile carpilir, boylece 132 mantiksal
 * piksel genisliginde yazilmis bir buton DPR 2'de 264 cihaz pikseli
 * cizilir - yani ekranda AYNI fiziksel boyutta ama iki kat keskin.
 *
 * Neden Phaser'in RESIZE kipi kullanilmiyor: o kipte ScaleManager oyun
 * boyutunu her karede parent'in CSS olcusune geri ceker; resize() ve
 * setZoom() cagrilar etkisiz kalir (olculdu). NONE kipinde olculer
 * burada acikca yonetilir.
 */
export class ResolutionManager {
  private readonly game: Phaser.Game;
  private readonly maxDpr: number;
  private current: RenderTargets;
  private readonly listeners = new Set<(targets: RenderTargets) => void>();

  constructor(game: Phaser.Game, maxDpr?: number) {
    this.game = game;
    this.maxDpr = maxDpr ?? MAX_RENDER_DPR;
    this.current = this.measure();

    /*
     * Olcu, Phaser BOOT'u bitirdikten SONRA uygulanir.
     *
     * Erken cagrilan scale.resize() calismiyor: boot sirasinda ScaleManager
     * olculeri yeniden hesapliyor ve yazdigimiz degeri eziyor - olculdu,
     * tuval 780 yerine 390'da kaliyordu. Ayni cagri boot sonrasi yapildiginda
     * kalici oluyor.
     */
    if (game.isBooted) {
      this.apply();
    } else {
      game.events.once(Phaser.Core.Events.READY, () => this.apply());
    }

    window.addEventListener('resize', this.onWindowChange);
    window.addEventListener('orientationchange', this.onWindowChange);
  }

  /** Gecerli mantiksal/cihaz olculeri. */
  get targets(): RenderTargets {
    return this.current;
  }

  /** Uygulanan piksel yogunlugu; girdi esikleri bunu kullanir. */
  get dpr(): number {
    return this.current.dpr;
  }

  /** Mantiksal (CSS) genislik - sahneler yerlesimde bunu kullanir. */
  get logicalWidth(): number {
    return this.current.logicalWidth;
  }

  /** Mantiksal (CSS) yukseklik. */
  get logicalHeight(): number {
    return this.current.logicalHeight;
  }

  /**
   * Olcu degisikliklerini dinler. Sahneler acilirken abone olur; boylece
   * yon degisimi ve DPR degisimi tek bir yerden yayilir.
   */
  onChange(listener: (targets: RenderTargets) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Bir kameranin yakinlastirmasini cihaz olcusune telafi eder.
   * logicalZoom 1 ise kamera tam olarak dpr kadar yakinlastirilir.
   */
  applyCameraZoom(camera: Phaser.Cameras.Scene2D.Camera, logicalZoom: number): void {
    camera.setZoom(logicalZoom * this.current.dpr);
  }

  /**
   * Arayuz kamerasini mantiksal uzaya oturtur.
   *
   * Phaser kamerayi MERKEZDEN yakinlastirir. Arayuz ise mutlak olarak
   * (0,0)'dan dizilir; merkezden yakinlastirmak DPR 2'de gorunen alani
   * 0..390 yerine 195..585 yapiyordu, yani butonlar ekranda kayiyordu
   * (olculdu: dokunma bolgesi butonun ciziminden bambaska bir yerdeydi).
   * Kamerayi sol ustten capalamak mantiksal (0,0) ile ekran (0,0)'i
   * ortustururur.
   */
  attachUiCamera(camera: Phaser.Cameras.Scene2D.Camera): void {
    camera.setOrigin(0, 0);
    this.applyCameraZoom(camera, 1);
  }

  /** Kameranin mantiksal yakinlastirmasi (dpr etkisi cikarilmis). */
  logicalZoomOf(camera: Phaser.Cameras.Scene2D.Camera): number {
    return camera.zoom / this.current.dpr;
  }

  destroy(): void {
    window.removeEventListener('resize', this.onWindowChange);
    window.removeEventListener('orientationchange', this.onWindowChange);
    this.listeners.clear();
  }

  /** Pencere olcusunu ve piksel yogunlugunu okur. */
  private measure(): RenderTargets {
    return renderTargets(window.innerWidth, window.innerHeight, window.devicePixelRatio, this.maxDpr);
  }

  /**
   * Olcu veya yogunluk degistiyse tuvali ve dinleyicileri gunceller.
   *
   * devicePixelRatio her karede DEGIL, yalnizca pencere olayinda okunur;
   * her karede DOM olcmek gereksiz maliyettir.
   */
  private readonly onWindowChange = (): void => {
    const next = this.measure();
    const changed =
      next.logicalWidth !== this.current.logicalWidth ||
      next.logicalHeight !== this.current.logicalHeight ||
      next.dpr !== this.current.dpr;
    if (!changed) return;

    this.current = next;
    this.apply();
    for (const listener of this.listeners) listener(next);
  };

  /** Oyun boyutunu cihaz pikseline, tuvalin CSS olcusunu mantiksal piksele ayarlar. */
  private apply(): void {
    const { deviceWidth, deviceHeight, logicalWidth, logicalHeight } = this.current;

    this.game.scale.resize(deviceWidth, deviceHeight);

    // Tuval CIHAZ pikseli kadar cizilir ama CSS'te mantiksal olcuyu kaplar;
    // keskinligi saglayan tam olarak bu ayrimdir.
    const canvas = this.game.canvas;
    canvas.style.width = `${logicalWidth}px`;
    canvas.style.height = `${logicalHeight}px`;
  }
}
