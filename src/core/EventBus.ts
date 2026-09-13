import type {
  ActiveResearch,
  BattleReport,
  CitySlotSelection,
  CitySnapshot,
  CityState,
  Fleet,
  IslandSlotSelection,
  MaterialKey,
  NoticeTone,
  WorldSlotSelection,
} from '@/types';

/**
 * Sahneler arasi iletisim icin tip guvenli olay sozlesmesi.
 *
 * KURAL: sistemler birbirini DOGRUDAN cagirmaz, olay yayinlar; sahneler
 * yalnizca dinler. Boylece sunum katmani tamamen yeniden yazilsa bile oyun
 * kurallari degismez.
 *
 * YAYIN SIKLIGI: ilerleme bilgisi (insaatin yuzde kaci bitti, filonun ne
 * kadar yolu kaldi) OLAY OLARAK YAYINLANMAZ. O bilgi her tikte degisir ve
 * olay yagmuru yaratirdi; render katmani onu dogrudan durumdan okur.
 * Olaylar yalnizca ANLIK gecislerde (basladi/bitti/iptal) atilir.
 */
export interface GameEvents {
  // --- Zaman ---
  /** Simulasyon tiki ilerledi (gercek saniye sayaci). */
  'tick': [tick: number];

  // --- Ekonomi ve nufus ---
  /** Sehrin kaynak depolari degisti. */
  'resources:changed': [cityId: string];
  /** Altin havuzu degisti. */
  'gold:changed': [gold: number];
  /** Sehir ozeti yeniden hesaplandi (nufus, mutluluk, akis). */
  'city:updated': [snapshot: CitySnapshot];
  /** Nufus bir vatandas kazandi veya kaybetti. */
  'population:changed': [cityId: string, citizens: number];
  /** Vatandas atamasi degisti. */
  'assignment:changed': [cityId: string];
  /** Depo tavani doldugu icin uretim kirpildi. */
  'storage:overflow': [cityId: string, resource: MaterialKey];

  // --- Insaat ---
  'construction:started': [cityId: string, buildingId: string, toLevel: number];
  'construction:completed': [cityId: string, buildingId: string, level: number];
  'construction:cancelled': [cityId: string, buildingId: string];
  /** Adadaki ortak yatagin (Hizar/luks) seviyesi yukseldi. */
  'island:deposit-upgraded': [islandId: string, resource: MaterialKey, level: number];

  // --- Arastirma ---
  'research:started': [active: ActiveResearch];
  'research:completed': [id: string, level: number];
  'research:cancelled': [id: string];
  'research:points-changed': [points: number];

  // --- Ordu ve donanma ---
  'training:started': [cityId: string, id: string, count: number];
  'training:completed': [cityId: string, id: string, count: number];
  'training:cancelled': [cityId: string, id: string];
  /** Atolyede bir birlik/gemi kademesi yukseltildi. */
  'tier:upgraded': [kind: 'unit' | 'ship', id: string, tier: string];

  // --- Filo ve savas ---
  'fleet:dispatched': [fleet: Fleet];
  'fleet:returned': [fleet: Fleet];
  'battle:resolved': [report: BattleReport];
  /** Haritada bir filoya dokunuldu (dunya veya ada gorunumu). */
  'select:fleet': [fleetId: string];
  /** Ticaret rotasi kuruldu/kaldirildi/devir tamamladi. */
  'trade-route:changed': [cityId: string];
  'trade:completed': [cityId: string, cargo: Record<string, number>];
  'colony:founded': [city: CityState];

  // --- Ada ve harika ---
  'island:faith-changed': [islandId: string, faith: number];
  'wonder:activated': [islandId: string, godId: string, level: number];

  // --- Arayuz ---
  /** Gorunum degisti: ada / sehir / dunya. */
  'view:changed': [view: 'island' | 'city' | 'world'];
  /** Oyuncunun baktigi sehir degisti. */
  'active-city:changed': [cityId: string];
  /** Zaman olcegi degisti. */
  'time:scale-changed': [scale: number];
  'notice:added': [title: string, body: string, tone: NoticeTone];
  'game:saved': [savedAt: number];
  /** Simulasyon duraklatildi veya yeniden baslatildi. */
  'game:paused': [];
  'game:resumed': [];

  // --- Sahne -> arayuz secimleri ---
  /** Sehir gorunumunde bir karoya dokunuldu. */
  'select:city-slot': [selection: CitySlotSelection];
  /** Ada gorunumunde bir karoya dokunuldu. */
  'select:island-slot': [selection: IslandSlotSelection];
  /** Dunya haritasinda bir adaya dokunuldu. */
  'select:world-island': [selection: WorldSlotSelection];

  // --- Arayuzden gelen istekler (komut katmani) ---
  'ui:build': [cityId: string, buildingId: string, ground: number];
  'ui:upgrade': [cityId: string, buildingId: string];
  'ui:cancel': [cityId: string, buildingId: string];
  'ui:assign': [cityId: string, role: string, delta: number];
  'ui:serve-wine': [cityId: string, wine: number];
  'ui:start-research': [id: string];
  'ui:train-unit': [cityId: string, id: string, count: number];
  'ui:build-ship': [cityId: string, id: string, count: number];
  'ui:upgrade-tier': [kind: 'unit' | 'ship', id: string];
  'ui:donate': [islandId: string, amount: number];
  'ui:sell': [cityId: string, resource: MaterialKey, amount: number];
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
 * Phaser.Events.EventEmitter kullanmak tum oyun cekirdegini bir tarayici
 * ortamina baglardi ve testler icin DOM taklidi gerekirdi.
 */
export class EventBus {
  private readonly listeners = new Map<string, Listener[]>();

  on<K extends EventName>(event: K, fn: (...args: GameEvents[K]) => void, context?: unknown): this {
    return this.addListener(event, fn as unknown as AnyListener, context, false);
  }

  once<K extends EventName>(event: K, fn: (...args: GameEvents[K]) => void, context?: unknown): this {
    return this.addListener(event, fn as unknown as AnyListener, context, true);
  }

  /**
   * Dinleyiciyi kaldirir.
   * fn verilmezse olayin tum dinleyicileri, context verilirse yalnizca o
   * baglamdaki eslesmeler kaldirilir.
   */
  off<K extends EventName>(event: K, fn?: (...args: GameEvents[K]) => void, context?: unknown): this {
    if (!fn) {
      this.listeners.delete(event);
      return this;
    }

    const list = this.listeners.get(event);
    if (!list) return this;

    const target = fn as unknown as AnyListener;
    const remaining = list.filter(
      (entry) => entry.fn !== target || (context !== undefined && entry.context !== context),
    );

    if (remaining.length > 0) this.listeners.set(event, remaining);
    else this.listeners.delete(event);
    return this;
  }

  emit<K extends EventName>(event: K, ...args: GameEvents[K]): boolean {
    const list = this.listeners.get(event);
    if (!list || list.length === 0) return false;

    // Dinleyici icinde on/off cagrilabilecegi icin kopya uzerinde geziyoruz.
    for (const entry of [...list]) {
      if (entry.once) {
        this.off(event, entry.fn as unknown as (...args: GameEvents[K]) => void, entry.context);
      }
      (entry.fn as unknown as (...args: unknown[]) => void).apply(entry.context, args);
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
    if (list) list.push(entry);
    else this.listeners.set(event, [entry]);
    return this;
  }
}
