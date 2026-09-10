import Phaser from 'phaser';
import { createGameConfig } from '@/config/GameConfig';
import { BootScene } from '@/scenes/BootScene';
import { PreloadScene } from '@/scenes/PreloadScene';
import { CityScene } from '@/scenes/CityScene';
import { UIScene } from '@/scenes/UIScene';

/**
 * Uygulama giris noktasi.
 * Yalnizca Phaser ornegini kurar; oyun mantigi sahnelere ve sistemlere aittir.
 */

const parent = document.getElementById('game-root');
if (!parent) {
  throw new Error('#game-root bulunamadi - index.html degistirilmis olabilir.');
}

const game = new Phaser.Game(
  createGameConfig(parent, [BootScene, PreloadScene, CityScene, UIScene]),
);

// Mobil tarayicilarda adres cubugu gizlenince veya ekran donunce yeniden olcekle.
window.addEventListener('orientationchange', () => {
  window.setTimeout(() => game.scale.refresh(), 120);
});

// Sayfa icindeki varsayilan zoom/kaydirma jestlerini engelle.
document.addEventListener(
  'gesturestart',
  (event) => {
    event.preventDefault();
  },
  { passive: false },
);

// Gelistirme sirasinda tarayici konsolundan oyuna erisim kolayligi.
// Uretim derlemesinde bu blok tamamen elenir.
if (import.meta.env.DEV) {
  (window as unknown as { game: Phaser.Game }).game = game;
}

export default game;
