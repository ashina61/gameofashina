import Phaser from 'phaser';
import { createGameConfig } from '@/config/GameConfig';
import { GameWorld } from '@/core/GameWorld';
import { ResolutionManager } from '@/render/ResolutionManager';
import { BootScene } from '@/scenes/BootScene';
import { PreloadScene } from '@/scenes/PreloadScene';
import { CityScene } from '@/scenes/CityScene';
import { IslandScene } from '@/scenes/IslandScene';
import { WorldScene } from '@/scenes/WorldScene';
import { Ui } from '@/ui/Ui';
import '@/ui/styles.css';

/**
 * Uygulama giris noktasi.
 *
 * KURULUS SIRASI ONEMLIDIR
 *
 *   1. GameWorld     - oyun mantigi ve durum. Phaser'dan BAGIMSIZ kurulur;
 *                      boylece tum simulasyon tarayici olmadan da test
 *                      edilebilir.
 *   2. Phaser.Game   - yalnizca cizim. Sahneler GameWorld'u registry'den
 *                      okur, kendi kopyalarini tutmaz.
 *   3. ResolutionManager - sahnelerden ONCE kurulur; sahneler acilirken
 *                      mantiksal olculeri ve piksel yogunlugunu oradan alir.
 *   4. Ui            - HTML katmani. En son kurulur, cunku kamera
 *                      "dokunus arayuzde mi" sorusunu registry uzerinden
 *                      bu katmana sorar.
 *
 * Tek bir GameWorld ornegi vardir ve uc katman ayni referansi paylasir.
 * Iki kopya olsaydi arayuzun gosterdigi ile simulasyonun isledigi
 * degerler birbirinden ayrilirdi.
 */

const parent = document.getElementById('game-root');
if (!parent) {
  throw new Error('#game-root bulunamadi - index.html degistirilmis olabilir.');
}

const world = new GameWorld();

const game = new Phaser.Game(
  createGameConfig(parent, [BootScene, PreloadScene, CityScene, IslandScene, WorldScene]),
);
game.registry.set('world', world);

const resolution = new ResolutionManager(game);
game.registry.set('resolution', resolution);

const ui = new Ui(world, game);

// Kayit dosyasindan gelen "sen yokken X saat gecti" gibi mesajlar yalnizca
// bir kez gosterilir; UI hazir olduktan sonra okunur.
for (const message of world.consumeBootNotices()) {
  window.setTimeout(() => {
    world.bus.emit('notice:added', 'Dünya', message, 'info');
  }, 600);
}

// Ikariam gercek zamanlidir: oyun acilir acilmaz islemeye baslar.
world.start();

// Sayfa icindeki varsayilan zoom/kaydirma jestlerini engelle.
document.addEventListener('gesturestart', (event) => event.preventDefault(), { passive: false });

/*
 * Sekme gizlendiginde kaydet.
 *
 * Mobil tarayicilar arka plandaki sekmeyi beklemeden oldurebilir; kapanisi
 * beklemek kaybi kaydetmenin garantili bir yolu degildir. Bu yuzden
 * gorunurluk kayboldugu anda kayit alinir. Cevrimdisi sure bir sonraki
 * acilista `savedAt` damgasindan hesaplanir.
 */
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    world.save();
  }
});

window.addEventListener('pagehide', () => world.save());

// Gelistirme sirasinda tarayici konsolundan erisim kolayligi.
// Uretim derlemesinde bu blok tamamen elenir.
if (import.meta.env.DEV) {
  const debug = window as unknown as { game: Phaser.Game; world: GameWorld; ui: Ui };
  debug.game = game;
  debug.world = world;
  debug.ui = ui;
}

export { game, world, ui };
