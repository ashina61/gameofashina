import Phaser from 'phaser';
import { SceneKeys } from '@/config/Constants';
import { GameWorld } from '@/core/GameWorld';

/**
 * Ilk sahne: oyun durumunu hazirlar ve registry'e koyar.
 * Registry, sahneler arasi paylasimin Phaser'daki dogal yoludur; boylece
 * CityScene ve UIScene ayni GameWorld ornegini gorur.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Boot);
  }

  create(): void {
    const world = GameWorld.bootstrap();
    this.registry.set('world', world);

    // Sekme arka plana alindiginda ilerlemeyi kaybetmemek icin kaydet.
    this.game.events.on(Phaser.Core.Events.BLUR, () => world.save());
    window.addEventListener('pagehide', () => world.save());

    this.scene.start(SceneKeys.Preload);
  }
}

/** Registry'den GameWorld'u alir; yoksa acik bir hata verir. */
export function getWorld(scene: Phaser.Scene): GameWorld {
  const world = scene.registry.get('world') as GameWorld | undefined;
  if (!world) {
    throw new Error('GameWorld hazir degil - BootScene calistirilmadan sahne acildi.');
  }
  return world;
}
