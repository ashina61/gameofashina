import { TILE_HEIGHT } from '@/config/Constants';
import { workerPosition } from '@/systems/WorkerAnchor';
import { IDLE_ALPHA, WORKER_ORIGIN_Y } from './WorkerArt';
import { WORKER_TEXTURE_KEYS } from './TextureFactory';
import type Phaser from 'phaser';
import type { GameState } from '@/core/GameState';
import type { WorkerRecord, WorkerState } from '@/types';

/**
 * Iscileri ekranda gosteren katman.
 *
 * SORUMLULUK SINIRI
 * Burada hicbir oyun karari verilmez. Isci nerede duruyor sorusunun cevabi
 * SIMULASYONUNDUR: kaydinda bacagin iki ucu ve kalan sure yazilidir, konum
 * bunlardan turer (WorkerAnchor.workerPosition). Sprint 8'de bu hesap
 * buradaydi - meydan, bina onu ve dagilim render katmaninda karar
 * veriliyordu; artik yalnizca CIZIM burada.
 *
 * NEDEN HER KARE TARANIR
 * Isci kayitlari her tikte degisebilir (nufus artar, isci varir). Olay
 * dinlemek yerine kare basina dizi uzerinde gezmek, 120 isci icin bile
 * olculebilir bir maliyet degil ve senkron kalmayi garantiler. Buna karsilik
 * HICBIR yeni nesne uretilmez: sprite'lar havuzlanir, konumlar mevcut
 * kayitlarin uzerine yazilir.
 *
 * YUMUSAK HAREKET
 * Simulasyon saniyede bir tik isler, yani konum saniyede bir siciar. Ham
 * degeri dogrudan cizmek isciyi ziplatirdi; burada gorunen konum hedefe
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

  /** Mark-and-sweep sayaci; artik var olmayan isciler bu sayede temizlenir. */
  private generation = 0;

  constructor(scene: Phaser.Scene, state: GameState, artScale: number) {
    this.scene = scene;
    this.state = state;
    this.artScale = artScale;
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
      // Calisma sallanmasinin fazi; hepsi ayni anda ziplamasin diye isciye
      // ozel ve id'den turedigi icin yeniden yuklemede ayni kalir.
      phase: hashOf(worker.id),
    };

    const at = workerPosition(worker);
    entry.x = at.x;
    entry.y = at.y;
    return entry;
  }

  /** Sprite'i hedefine dogru bir kare yaklastirir ve durumunu yansitir. */
  private follow(entry: WorkerEntry, worker: WorkerRecord, blend: number, time: number): void {
    const target = workerPosition(worker);
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
  /** id'den turetilmis 0..1 sabiti; yalnizca sallanma fazi icin. */
  phase: number;
}

/** id -> 0..1 arasi kararli sayi. */
function hashOf(id: string): number {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 1000) / 1000;
}
