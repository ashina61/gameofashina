import type {
  ActiveResearch,
  BuildingInstance,
  ConstructionTask,
  EconomySnapshot,
  PopulationSnapshot,
  ResourcePool,
  TileData,
  WorkforceSnapshot,
} from '@/types';

/**
 * Sahneler arasi iletisim icin tip guvenli olay sozlesmesi.
 * Anahtar = olay adi, deger = dinleyicinin alacagi argumanlar.
 */
export interface GameEvents {
  'resources:changed': [resources: ResourcePool, capacity: number];
  'economy:updated': [snapshot: EconomySnapshot];
  'population:updated': [snapshot: PopulationSnapshot];
  /** Isci atamasi degisti (atama, geri alma, varis). */
  'workforce:changed': [snapshot: WorkforceSnapshot];
  'building:placed': [building: BuildingInstance];
  'building:completed': [building: BuildingInstance];
  'building:removed': [building: BuildingInstance];
  /**
   * Insaat veya yukseltme gorevi basladi.
   * Her tikte YAYINLANMAZ - yalnizca gorev baslarken ve biterken. Ilerleme,
   * render katmaninda aktif gorevler uzerinden okunur; bu sayede olay
   * yagmuru olusmaz.
   */
  'construction:started': [task: ConstructionTask];
  /** Insaat veya yukseltme gorevi tamamlandi. */
  'construction:completed': [task: ConstructionTask];
  /** Insaat veya yukseltme gorevi iptal edildi. */
  'construction:cancelled': [task: ConstructionTask];
  /** Arastirma basladi. */
  'research:started': [active: ActiveResearch];
  /** Arastirma tamamlandi; sehir carpanlari degisti. */
  'research:completed': [active: ActiveResearch];
  'tile:selected': [tile: TileData | null];
  'placement:start': [defId: string];
  'placement:cancel': [];
  'placement:changed': [valid: boolean];
  'notify': [message: string, tone: 'info' | 'success' | 'error'];
  'game:saved': [savedAt: number];
  'ui:request-demolish': [uid: string];
  'ui:request-upgrade': [uid: string];
  'ui:cancel-upgrade': [uid: string];
  /** Oyuncu bu binaya bosta bir isci yollamak istiyor. */
  'ui:assign-worker': [uid: string];
  /** Oyuncu bu binadan bir isciyi geri cekmek istiyor. */
  'ui:release-worker': [uid: string];
  /** Oyuncu bu arastirmayi baslatmak istiyor. */
  'ui:start-research': [id: string];
}

type EventName = keyof GameEvents;

/** Kayitli tek bir dinleyici. */
interface Listener {
  /** Tip guvenligi genel API'de saglanir; depoda gevsek imza tutulur. */
  fn: AnyListener;
  context: unknown;
  once: boolean;
}

type AnyListener = (...args: never[]) => void;

/**
 * Uygulama capinda tek bir olay yayinlayicisi.
 *
 * Kucuk bir yayinlayici bilerek yerel olarak yazildi: core/ ve systems/
 * katmanlarinin Phaser'a bagimli olmamasi bu projenin temel mimari kurali.
 * Daha once burada Phaser.Events.EventEmitter kullaniliyordu ve bu, tum oyun
 * cekirdegini bir tarayici ortamina bagliyordu.
 *
 * Sozlesme (on/once/off/emit + context baglama) eskisiyle ayni tutuldu.
 */
export class EventBus {
  private readonly listeners = new Map<string, Listener[]>();

  on<K extends EventName>(event: K, fn: (...args: GameEvents[K]) => void, context?: unknown): this {
    return this.addListener(event, fn as AnyListener, context, false);
  }

  once<K extends EventName>(event: K, fn: (...args: GameEvents[K]) => void, context?: unknown): this {
    return this.addListener(event, fn as AnyListener, context, true);
  }

  /**
   * Dinleyiciyi kaldirir.
   * fn verilmezse olayin tum dinleyicileri, context verilirse yalnizca o
   * baglamdaki esleşmeler kaldirilir.
   */
  off<K extends EventName>(event: K, fn?: (...args: GameEvents[K]) => void, context?: unknown): this {
    if (!fn) {
      this.listeners.delete(event);
      return this;
    }

    const list = this.listeners.get(event);
    if (!list) return this;

    const remaining = list.filter(
      (entry) => entry.fn !== fn || (context !== undefined && entry.context !== context),
    );

    if (remaining.length > 0) {
      this.listeners.set(event, remaining);
    } else {
      this.listeners.delete(event);
    }
    return this;
  }

  emit<K extends EventName>(event: K, ...args: GameEvents[K]): boolean {
    const list = this.listeners.get(event);
    if (!list || list.length === 0) return false;

    // Dinleyici icinde on/off cagrilabilecegi icin kopya uzerinde geziyoruz.
    for (const entry of [...list]) {
      if (entry.once) {
        this.off(event, entry.fn as (...args: GameEvents[K]) => void, entry.context);
      }
      (entry.fn as (...args: unknown[]) => void).apply(entry.context, args);
    }
    return true;
  }

  /** Belirli bir olayin tum dinleyicilerini kaldirir. */
  removeAll<K extends EventName>(event: K): this {
    this.listeners.delete(event);
    return this;
  }

  /** Test ve tani amacli: bir olayin dinleyici sayisi. */
  listenerCount<K extends EventName>(event: K): number {
    return this.listeners.get(event)?.length ?? 0;
  }

  destroy(): void {
    this.listeners.clear();
  }

  private addListener(
    event: string,
    fn: AnyListener,
    context: unknown,
    once: boolean,
  ): this {
    const list = this.listeners.get(event);
    const entry: Listener = { fn, context, once };
    if (list) {
      list.push(entry);
    } else {
      this.listeners.set(event, [entry]);
    }
    return this;
  }
}
