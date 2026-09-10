/**
 * Kenar payi (safe area) okuyucusunun saf davranisi.
 *
 * Gercek env(safe-area-inset-*) degerleri yalnizca tarayicida olustugu icin
 * burada DOM'suz davranis ve karsilastirma mantigi dogrulanir; yerlesime
 * etkisi tarayici testinde olculur.
 */
import { describe, expect, it } from 'vitest';
import { insetsEqual, readSafeAreaInsets, zeroInsets } from '@/utils/SafeArea';

describe('SafeArea', () => {
  it('DOM yokken sifir doner - oyun kenar payi olmadan da calisir', () => {
    expect(readSafeAreaInsets()).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
  });

  it('zeroInsets her cagrida yeni bir nesne verir', () => {
    const a = zeroInsets();
    const b = zeroInsets();
    expect(a).toEqual(b);
    a.top = 10;
    expect(b.top).toBe(0);
  });

  it('insetsEqual tum kenarlari karsilastirir', () => {
    const base = { top: 48, right: 0, bottom: 24, left: 0 };
    expect(insetsEqual(base, { ...base })).toBe(true);
    expect(insetsEqual(base, { ...base, top: 47 })).toBe(false);
    expect(insetsEqual(base, { ...base, right: 1 })).toBe(false);
    expect(insetsEqual(base, { ...base, bottom: 0 })).toBe(false);
    expect(insetsEqual(base, { ...base, left: 1 })).toBe(false);
  });
});
