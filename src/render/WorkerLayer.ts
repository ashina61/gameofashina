import Phaser from 'phaser';
import { TILE_HEIGHT } from '@/config/Constants';
import { getBuilding } from '@/config/BuildingCatalog';
import { gridToWorld } from '@/utils/IsoUtils';
import { IDLE_ALPHA, WORKER_ORIGIN_Y } from './WorkerArt';
import { WORKER_TEXTURE_KEYS } from './TextureFactory';
import type { GameState } from '@/core/GameState';
import type { WorkerRecord, WorkerState } from '@/types';

/**
 * Iscileri ekranda gosteren katman.
 *
 * SORUMLULUK SINIRI
 * Burada hicbir oyun karari verilmez. Isci nerede duruyor sorusunun cevabi
 * tamamen state'ten TURETILIR: bosta olan meydanda bekler, yolda olan
 * meydan ile binasi arasinda `travel` oranina gore ilerler, calisan
 * binasinin ayak izinde durur. Core katmaninda piksel yoktur - orasi
 * Phaser'i hic bilmez.
 *
 * NEDEN HER KARE TARANIR
 * Isci kayitlari her tikte degisebilir (nufus artar, isci varir). Olay
 * dinlemek yerine kare basina dizi uzerinde gezmek, 120 isci icin bile
 * olculebilir bir maliyet degil ve senkron kalmayi garantiler. Buna karsilik
 * HICBIR yeni nesne uretilmez: sprite'lar havuzlanir, konumlar mevcut
 * kayitlarin uzerine yazilir.
 *
 * YUMUSAK HAREKET
 * Simulasyon saniyede bir tik isler, yani `travel` dort kademede artar.
 * Ham degeri dogrudan cizmek isciyi ziplatirdi; burada gorunen konum hedefe
 * dogru kare basina yumusatilir. Bu yalnizca GORUNTUdur, state'e yazilmaz.
 */
export class WorkerLayer {
  /** Yumusatma hizi: hedefe yaklasma yari omru (ms). */
  private static readonly SMOOTH_MS = 90;

  private readonly scene: Phaser.Scene;
  private readonly state: GameState;
  private readonly artScale: number;

  /** Isci id -> ekrandaki karsiligi. */
  private readonly entries = new Map<string, WorkerEntry>();

  /** Sehir meydani: bosta iscilerin bekledigi ve yola ciktigi nokta. */
  private readonly plaza: { x: number; y: number };

  /** Mark-and-sweep sayaci; artik var olmayan isciler bu sayede temizlenir. */
  private generation = 0;

  constructor(scene: Phaser.Scene, state: GameState, artScale: number) {
    this.scene = scene;
    this.state = state;
    this.artScale = artScale;
    const center = state.grid.center();
    // Meydan, merkez karonun bir tik ONUNDE. Tam merkezde birakilinca bosta
    // isciler oraya kurulan binanin USTUNDE duruyordu (ekran goruntusuyle
    // gorulduu); yarim karo one almak onlari binanin onune indiriyor.
    this.plaza = gridToWorld(center.gx + 0.6, center.gy + 0.6);
  }

  /** Ekrandaki isci sayisi; olcum ve test icin. */
  get count(): number {
    return this.entries.size;
  }

  /**
   * Katmani gecerli duruma esitler ve hareketi bir kare ilerletir.
   * CityScene.update icinden cagrilir.
   */
  update(time: number, delta: number): void {
    const workers = this.state.workers;
    this.generation += 1;

    // Hedefe yaklasma orani kare suresinden turer; kare hizi degisince
    // hareketin HIZI degismez.
    const blend = 1 - Math.exp(-delta / WorkerLayer.SMOOTH_MS);

    for (let i = 0; i < workers.length; i += 1) {
      const worker = workers[i];
      let entry = this.entries.get(worker.id);
      if (!entry) {
        entry = this.spawn(worker);
        this.entries.set(worker.id, entry);
      }
      entry.generation = this.generation;
      this.follow(entry, worker, blend, time);
    }

    // Kayit sayisi tutuyorsa sahipsiz sprite yok demektir; tarama atlanir.
    if (this.entries.size !== workers.length) this.sweep();
  }

  /** Tum sprite'lari birakir. */
  destroy(): void {
    for (const entry of this.entries.values()) entry.sprite.destroy();
    this.entries.clear();
  }

  /** Yeni bir isci icin sprite olusturur ve hedefine ISINLAR. */
  private spawn(worker: WorkerRecord): WorkerEntry {
    const sprite = this.scene.add
      .image(0, 0, WORKER_TEXTURE_KEYS.get(worker.state) ?? '')
      .setOrigin(0.5, WORKER_ORIGIN_Y)
      .setScale(1 / this.artScale);

    const entry: WorkerEntry = {
      sprite,
      generation: this.generation,
      x: 0,
      y: 0,
      state: worker.state,
      // Ayni noktada duran isciler ust uste binmesin diye her isciye sabit
      // bir sapma ve sallanma fazi verilir; id'den turedigi icin yeniden
      // yuklemede ayni kalir.
      phase: hashOf(worker.id),
    };

    const target = this.targetFor(worker, entry.phase);
    entry.x = target.x;
    entry.y = target.y;
    return entry;
  }

  /** Sprite'i hedefine dogru bir kare yaklastirir ve durumunu yansitir. */
  private follow(entry: WorkerEntry, worker: WorkerRecord, blend: number, time: number): void {
    const target = this.targetFor(worker, entry.phase);
    entry.x += (target.x - entry.x) * blend;
    entry.y += (target.y - entry.y) * blend;

    if (entry.state !== worker.state) {
      entry.state = worker.state;
      const key = WORKER_TEXTURE_KEYS.get(worker.state);
      if (key) entry.sprite.setTexture(key);
      entry.sprite.setAlpha(worker.state === 'idle' ? IDLE_ALPHA : 1);
    }

    // Calisan isci hafifce sallanir; durgun bir sehirde isin surdugu
    // uzaktan da anlasilir. Yalnizca CALISAN isciler icin hesaplanir.
    const bob = worker.state === 'working' ? Math.sin(time * 0.006 + entry.phase * 6.283) * 1.6 : 0;

    entry.sprite.setPosition(entry.x, entry.y + bob);
    // Derinlik dunya Y'sinden turer; boylece isci onunde durdugu binanin
    // onunde, arkasindakinin arkasinda cizilir.
    entry.sprite.setDepth((entry.y * 2) / TILE_HEIGHT * 10 + 1);
  }

  /**
   * Iscinin durmasi gereken dunya noktasi.
   *
   * Bosta   : meydanda, id'sine gore sabit bir yerde
   * Yolda   : meydan ile is yeri arasinda `travel` oraninda
   * Calisan : binanin ayak izinde, id'sine gore sabit bir yerde
   */
  private targetFor(worker: WorkerRecord, phase: number): { x: number; y: number } {
    const idleX = this.plaza.x + spreadX(phase, 150);
    const idleY = this.plaza.y + spreadY(phase, 58);

    const uid = worker.buildingUid;
    if (!uid) return { x: idleX, y: idleY };

    const building = this.state.buildings.get(uid);
    if (!building) return { x: idleX, y: idleY };

    const size = getBuilding(building.type).size;
    const center = gridToWorld(
      building.gx + (size - 1) / 2,
      building.gy + (size - 1) / 2,
    );
    // Isciler binanin ONUNDE durur; ustune binmeleri siluetini bozardi.
    const workX = center.x + spreadX(phase, 30 * size);
    const workY = center.y + TILE_HEIGHT * 0.42 * size + spreadY(phase, 10);

    if (worker.state !== 'moving') return { x: workX, y: workY };

    const t = Phaser.Math.Clamp(worker.travel, 0, 1);
    return {
      x: idleX + (workX - idleX) * t,
      y: idleY + (workY - idleY) * t,
    };
  }

  /** Artik var olmayan iscilerin sprite'larini birakir. */
  private sweep(): void {
    for (const [id, entry] of this.entries) {
      if (entry.generation === this.generation) continue;
      entry.sprite.destroy();
      this.entries.delete(id);
    }
  }
}

/** Ekrandaki tek bir isci. */
interface WorkerEntry {
  sprite: Phaser.GameObjects.Image;
  generation: number;
  /** Yumusatilmis gorunen konum; state'e yazilmaz. */
  x: number;
  y: number;
  state: WorkerState;
  /** id'den turetilmis 0..1 sabiti: dagilim ve sallanma fazi. */
  phase: number;
}

/** Faza gore yatay sapma. */
function spreadX(phase: number, span: number): number {
  return (phase - 0.5) * span;
}

/** Faza gore dikey sapma; izometrik oranda yatayin yarisi kadar. */
function spreadY(phase: number, span: number): number {
  return (((phase * 7.3) % 1) - 0.5) * span;
}

/** id -> 0..1 arasi kararli sayi. Ayni isci her acilista ayni yerde durur. */
function hashOf(id: string): number {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 1000) / 1000;
}
