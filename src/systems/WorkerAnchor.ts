import { TILE_HEIGHT, WORKER_SPEED } from '@/config/Constants';
import { getBuilding } from '@/config/BuildingCatalog';
import { gridToWorld } from '@/utils/IsoUtils';
import type { BuildingInstance, GridPoint, WorkerRecord, WorldPoint } from '@/types';

/**
 * Iscilerin NEREDE duracagini hesaplayan saf geometri.
 *
 * NEDEN AYRI BIR DOSYA
 * Bu bilgi iki tarafin da isine yarar: simulasyon hedefi bilmeli (yuruyus
 * suresi mesafeden turer), render katmani ise yalnizca cizer. Ikisinin
 * ortasinda duran, Phaser bilmeyen, durum tutmayan bir modul olarak
 * durmasi hem test edilebilir kiliyor hem de cizim koduna (BuildingArt)
 * hic dokunmadan bina onune yerlesim yapmayi mumkun kiliyor.
 *
 * KURAL
 * Isci binanin ICINDE veya dokunun merkezinde durmaz. Ayak izinin ON
 * kenarinin bir tutam disinda, binaya yaslanmis gibi durur.
 */

/** Iscinin ayak izinin on kenarindan ne kadar disarida duracagi (dunya birimi). */
const STANDOFF = 10;

/** Ayni binada calisan isciler arasindaki yatay aralik. */
const SLOT_SPACING_X = 26;

/** Komsu duruş yerleri arasindaki hafif derinlik kademesi. */
const SLOT_STAGGER_Y = 7;

/** Meydandaki kalabaligin yayildigi alan. */
const PLAZA_SPREAD_X = 150;
const PLAZA_SPREAD_Y = 58;

/**
 * Sehir meydani: bosta iscilerin bekledigi nokta.
 *
 * Izgaranin tam merkezi DEGIL, yarim karo onu. Tam merkezde birakilinca
 * isciler oraya kurulan binanin ustunde duruyordu.
 */
export function plazaFor(center: GridPoint): WorldPoint {
  return gridToWorld(center.gx + 0.6, center.gy + 0.6);
}

/**
 * Bir binanin verilen duruş yerine ait isci noktasi.
 *
 * Ayak izinin merkezinden ONE dogru, binanin on kosesinin bir tutam
 * disina cikilir; sonra duruş yerine gore yana kaydirilir. Kaydirma
 * sirasi 0, +1, -1, +2, -2... seklindedir: ilk isci tam ortada durur,
 * sonrakiler iki yana dagilir.
 */
export function workAnchorFor(building: BuildingInstance, slot: number): WorldPoint {
  const size = getBuilding(building.type).size;
  const center = gridToWorld(building.gx + (size - 1) / 2, building.gy + (size - 1) / 2);

  // Ayak izinin on kosesi merkezden tam olarak bu kadar asagidadir.
  const frontEdge = (size * TILE_HEIGHT) / 2;
  const lane = laneOf(slot);

  // Genis binada isciler daha genis bir cepheye yayilabilir.
  const spread = SLOT_SPACING_X * Math.min(1.6, 0.8 + size * 0.4);

  return {
    x: center.x + lane * spread,
    y: center.y + frontEdge + STANDOFF + Math.abs(lane % 2) * SLOT_STAGGER_Y,
  };
}

/**
 * Bosta bir iscinin meydandaki yeri.
 *
 * Dagilim iscinin SAYISAL kimliginden turer, kalabaligin o anki
 * durumundan degil: biri ise gidince digerleri yerinden oynamaz. Altin
 * oran adimi kullanildigi icin ardisik kimlikler ust uste dusmez.
 */
export function idleAnchorFor(workerId: string, plaza: WorldPoint): WorldPoint {
  const n = numericIdOf(workerId);
  const a = (n * 0.6180339887498949) % 1;
  const b = (n * 0.7548776662466927) % 1;
  return {
    x: plaza.x + (a - 0.5) * PLAZA_SPREAD_X,
    y: plaza.y + (b - 0.5) * PLAZA_SPREAD_Y,
  };
}

/**
 * Iki nokta arasindaki yuruyusun kac tik surecegi.
 *
 * Duz cizgi mesafesi hiza bolunur; yol bulma, engel, yol bonusu yoktur.
 * En az 1 tik doner: sifir sureli bir yuruyus, isciyi ISINLAMAK olurdu.
 */
export function travelTicksFor(from: WorldPoint, to: WorldPoint): number {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  if (!Number.isFinite(distance) || distance <= 0) return 1;
  return Math.max(1, Math.ceil(distance / WORKER_SPEED));
}

/**
 * Iscinin o anki dunya konumu.
 *
 * Konum SAKLANMAZ, bacagin iki ucundan ve kalan tikten TURETILIR. Bu
 * sayede 10 tiki tek seferde islemekle 10 kez tek tik islemek birebir
 * ayni konumu verir - konumu her tik uzerine yazsaydik kayan nokta
 * hatalari birikirdi.
 */
export function workerPosition(worker: WorkerRecord): WorldPoint {
  const total = worker.travelTicks;
  if (worker.state !== 'moving' || total <= 0) return { x: worker.toX, y: worker.toY };

  const left = Math.min(Math.max(worker.travelLeft, 0), total);
  const done = (total - left) / total;
  return {
    x: worker.fromX + (worker.toX - worker.fromX) * done,
    y: worker.fromY + (worker.toY - worker.fromY) * done,
  };
}

/** Duruş yerinin yan kaydirma katsayisi: 0, +1, -1, +2, -2, ... */
function laneOf(slot: number): number {
  if (!Number.isFinite(slot) || slot <= 0) return 0;
  const step = Math.ceil(slot / 2);
  return slot % 2 === 1 ? step : -step;
}

/** "w#12" -> 12. Kimlik beklenmedik bicimdeyse karakterlerden bir sayi uretir. */
function numericIdOf(id: string): number {
  const parsed = Number.parseInt(id.replace(/^\D+/, ''), 10);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) % 100000;
  return hash + 1;
}
