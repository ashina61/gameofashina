import Phaser from 'phaser';
import type { BuildingInstance, EconomySnapshot, ResourcePool, TileData } from '@/types';

/**
 * Sahneler arasi iletisim icin tip guvenli olay sozlesmesi.
 * Anahtar = olay adi, deger = dinleyicinin alacagi argumanlar.
 */
export interface GameEvents {
  'resources:changed': [resources: ResourcePool, capacity: number];
  'economy:updated': [snapshot: EconomySnapshot];
  'building:placed': [building: BuildingInstance];
  'building:completed': [building: BuildingInstance];
  'building:removed': [building: BuildingInstance];
  'building:progress': [building: BuildingInstance, ratio: number];
  'tile:selected': [tile: TileData | null];
  'placement:start': [defId: string];
  'placement:cancel': [];
  'placement:changed': [valid: boolean];
  'notify': [message: string, tone: 'info' | 'success' | 'error'];
  'game:saved': [savedAt: number];
  'ui:request-demolish': [uid: string];
}

type EventName = keyof GameEvents;

/**
 * Uygulama capinda tek bir olay yayinlayicisi.
 * Phaser.Events.EventEmitter uzerine ince bir tip katmani ekler; boylece
 * yanlis olay adi veya yanlis argumani derleme aninda yakalanir.
 */
export class EventBus {
  private readonly emitter = new Phaser.Events.EventEmitter();

  on<K extends EventName>(event: K, fn: (...args: GameEvents[K]) => void, context?: unknown): this {
    this.emitter.on(event, fn as (...args: unknown[]) => void, context);
    return this;
  }

  once<K extends EventName>(event: K, fn: (...args: GameEvents[K]) => void, context?: unknown): this {
    this.emitter.once(event, fn as (...args: unknown[]) => void, context);
    return this;
  }

  off<K extends EventName>(event: K, fn?: (...args: GameEvents[K]) => void, context?: unknown): this {
    this.emitter.off(event, fn as ((...args: unknown[]) => void) | undefined, context);
    return this;
  }

  emit<K extends EventName>(event: K, ...args: GameEvents[K]): boolean {
    return this.emitter.emit(event, ...args);
  }

  /** Belirli bir olayin tum dinleyicilerini kaldirir. */
  removeAll<K extends EventName>(event: K): this {
    this.emitter.removeAllListeners(event);
    return this;
  }

  destroy(): void {
    this.emitter.removeAllListeners();
  }
}
