import { AUTOSAVE_INTERVAL_MS, SAVE_KEY, SAVE_VERSION } from '@/config/Constants';
import type { SaveData } from '@/types';

/**
 * Kayit yoneticisi.
 *
 * Ikariam ilerlemeyi sunucuda tutar; bu surumde ayni is localStorage ile
 * gorulur. Uc sorumluluk:
 *
 *   1. Kaydi yazmak (otomatik + istege bagli)
 *   2. Kaydi okumak ve SURUM UYUSMADIĞINDA temiz baslamak
 *   3. Cevrimdisi gecen OYUN saniyesini hesaplamak
 *
 * SURUM KONTROLU NEDEN SART
 * Oyun dengesi degistiginde (bina maliyet formulunu degistirmek, yeni bir
 * kaynak eklemek) eski kayitlar tutarsiz hale gelir. Eski bir kaydi
 * yuklemeye calismak SESLI bir hata vermez; bunun yerine oyuncu binalarin
 * maliyetinin yanlis, kaynaklarinin sifir oldugu bozuk bir dunyada
 * oynar. Bu yuzden uyumsuz kayit atilir ve oyuncuya SOYLENIR.
 *
 * CEVRIMDISI SURE
 * Kayittaki `savedAt` gercek zaman damgasidir, `timeScale` ise o kaydin
 * hiz ayaridir. Ikisi birlikte gercek gecen sureyi OYUN saniyesine cevirir:
 * 60x hizda 10 gercek dakika = 10 oyun saati. Bu carpimi yanlis yapmak
 * (ornegin hiz carpanini unutmak) oyuncunun yoklugunda hicbir sey
 * uretilmemesi demek olur.
 */

export interface LoadResult {
  data: SaveData | null;
  /** Kayit bulundu ama kullanilamadi. */
  discarded: 'version' | 'corrupt' | null;
  /** Cevrimdisi gecen OYUN saniyesi. */
  offlineGameSeconds: number;
}

export class SaveManager {
  private readonly key: string;
  private autoSaveTimer: ReturnType<typeof setInterval> | null = null;

  constructor(key: string = SAVE_KEY) {
    this.key = key;
  }

  /** Kayit var mi? */
  hasSave(): boolean {
    try {
      return typeof window !== 'undefined' && window.localStorage.getItem(this.key) !== null;
    } catch {
      // localStorage erisimi yok (gizli mod, kapali depolama): oyun
      // kayitsiz da calismaya devam etmeli.
      return false;
    }
  }

  /** Kaydi yazar. */
  save(data: SaveData): boolean {
    try {
      if (typeof window === 'undefined') return false;
      const stamped: SaveData = { ...data, savedAt: Date.now() };
      window.localStorage.setItem(this.key, JSON.stringify(stamped));
      return true;
    } catch {
      // Kota dolu veya erisim yok. Oyunun kendisi calismayi surdurmeli;
      // bu yuzden hata yutulur ve false doner (cagiran taraf bildirir).
      return false;
    }
  }

  /** Kaydi okur ve cevrimdisi sureyi hesaplar. */
  load(nowMs: number = Date.now()): LoadResult {
    const empty: LoadResult = { data: null, discarded: null, offlineGameSeconds: 0 };
    try {
      if (typeof window === 'undefined') return empty;
      const raw = window.localStorage.getItem(this.key);
      if (!raw) return empty;

      const data = JSON.parse(raw) as SaveData;
      if (!data || typeof data !== 'object') return { ...empty, discarded: 'corrupt' };
      if (data.version !== SAVE_VERSION) return { ...empty, discarded: 'version' };

      const elapsedMs = Math.max(0, nowMs - (Number.isFinite(data.savedAt) ? data.savedAt : nowMs));
      const scale = Number.isFinite(data.timeScale) ? Math.max(1, data.timeScale) : 1;
      const offlineGameSeconds = (elapsedMs / 1000) * scale;

      return { data, discarded: null, offlineGameSeconds };
    } catch {
      return { ...empty, discarded: 'corrupt' };
    }
  }

  /** Kaydi siler. */
  clear(): void {
    try {
      if (typeof window !== 'undefined') window.localStorage.removeItem(this.key);
    } catch {
      /* yutulur */
    }
  }

  /** Otomatik kaydi baslatir. */
  startAutoSave(onSave: () => void, intervalMs: number = AUTOSAVE_INTERVAL_MS): void {
    this.stopAutoSave();
    if (typeof window === 'undefined') return;
    this.autoSaveTimer = setInterval(onSave, intervalMs);
  }

  /** Otomatik kaydi durdurur. */
  stopAutoSave(): void {
    if (this.autoSaveTimer !== null) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  get isAutoSaving(): boolean {
    return this.autoSaveTimer !== null;
  }
}
