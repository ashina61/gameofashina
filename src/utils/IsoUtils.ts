import { TILE_HEIGHT, TILE_WIDTH } from '@/config/Constants';
import type { GridPoint, WorldPoint } from '@/types';

/**
 * Izometrik (2:1 diamond) koordinat donusumleri.
 * Dunya orijini (0,0) izgaranin (0,0) hucresinin ust kosesidir.
 */

const HALF_W = TILE_WIDTH / 2;
const HALF_H = TILE_HEIGHT / 2;

/** Izgara koordinatini karo merkezinin dunya koordinatina cevirir. */
export function gridToWorld(gx: number, gy: number): WorldPoint {
  return {
    x: (gx - gy) * HALF_W,
    y: (gx + gy) * HALF_H,
  };
}

/**
 * Dunya koordinatini izgara koordinatina cevirir.
 * Ekrandaki dokunusu hucreye eslemek icin kullanilir.
 *
 * EN YAKINA yuvarlanir, asagi DEGIL. gridToWorld() karonun MERKEZINI
 * dondurur, yani tam sayi izgara koordinati karonun merkezine oturur -
 * kosesine degil. Math.floor kullanmak, tam sayinin kosede oldugunu
 * varsaymak demekti ve secim bolgesini yarim karo kaydiriyordu: karo
 * merkezinin 4px yukarisina dokunmak CAPRAZ iki karo otesini seciyordu,
 * her karonun kabaca dortte ucu komsusunu veriyordu. Bina "kafasina gore"
 * yerlesiyor gibi gorunmesinin sebebi buydu.
 *
 * En yakina yuvarlamak, secim bolgesini karonun kendi elmas alaniyla
 * ortustuyor: hangi karo merkezine daha yakinsan o karo secilir.
 */
export function worldToGrid(x: number, y: number): GridPoint {
  const gx = (x / HALF_W + y / HALF_H) / 2;
  const gy = (y / HALF_H - x / HALF_W) / 2;
  // "+ 0" negatif sifiri normale cevirir: Math.round(-0.06) === -0 doner ve
  // bu deger bina koordinatina yazilirsa kayitta sessizce degisir
  // (JSON.stringify(-0) === "0"), yani kayit gidis-donusu asimetrik olur.
  return { gx: Math.round(gx) + 0, gy: Math.round(gy) + 0 };
}

/**
 * Cizim sirasi icin derinlik degeri.
 * Arkadaki karolar once cizilir; buyuk binalarda kaplama alaninin en on
 * kosesi baz alinir.
 */
export function depthFor(gx: number, gy: number, size = 1): number {
  return (gx + gy + (size - 1) * 2) * 10;
}

/** Tum izgaranin dunya koordinatindaki sinir dikdortgeni. */
export function gridBounds(size: number): { x: number; y: number; width: number; height: number } {
  const width = size * TILE_WIDTH;
  const height = size * TILE_HEIGHT;
  return { x: -width / 2, y: 0, width, height };
}
