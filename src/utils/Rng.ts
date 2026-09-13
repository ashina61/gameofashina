/**
 * Tohumlu rasgele sayi ureteci (mulberry32).
 *
 * NEDEN TOHUMLU
 * Ada sekli, NPC isimleri ve kaynak dagilimi her acilista AYNI olmali.
 * Math.random() ile uretmek, kaydi yukleyen oyuncunun adasinin seklini
 * degistirirdi: sehri bir kiyi karo suyun icinde kalabilirdi. Tohum kayda
 * yazilir ve dunya ondan turetilir.
 *
 * NEDEN mulberry32
 * Kucuk, hizli, bagimliliksiz ve 32-bit tohumla iyi dagilim veriyor.
 * Kriptografik degildir - oyun ici uretim icin yeterli.
 */

/** Tohumdan ureteç kurar. */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Tohumlu uretecin yardimcilari. */
export interface Rng {
  /** 0..1 arasi. */
  next(): number;
  /** [min, max] arasi tam sayi (iki uc dahil). */
  int(min: number, max: number): number;
  /** Diziden rasgele bir oge. */
  pick<T>(items: readonly T[]): T;
  /** Olasilik testi (0..1). */
  chance(p: number): boolean;
  /** Diziyi karistirir (yerinde degil, kopya dondurur). */
  shuffle<T>(items: readonly T[]): T[];
}

/** Yardimcilariyla birlikte bir ureteç kurar. */
export function rng(seed: number): Rng {
  const next = createRng(seed);

  function int(min: number, max: number): number {
    if (max < min) return min;
    return min + Math.floor(next() * (max - min + 1));
  }

  function pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('Bos diziden secim yapilamaz');
    const index = Math.min(items.length - 1, Math.floor(next() * items.length));
    return items[index] as T;
  }

  function chance(p: number): boolean {
    return next() < p;
  }

  function shuffle<T>(items: readonly T[]): T[] {
    const copy: T[] = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(next() * (i + 1));
      const tmp = copy[i] as T;
      copy[i] = copy[j] as T;
      copy[j] = tmp;
    }
    return copy;
  }

  return { next, int, pick, chance, shuffle };
}

/**
 * Bir dizgiden kararli bir 32-bit tohum uretir.
 * Ayni dizgi her zaman ayni tohumu verir.
 */
export function hashString(text: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}
