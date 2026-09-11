/**
 * Cizim cozunurlugu politikasi.
 *
 * Buradaki fonksiyonlar saftir ve tarayicisiz calisir. Gercek DPR
 * davranisi (tuval arka tamponu, kamera telafisi, dokunma isabeti) bu
 * ortamda SIMULE EDILEMEZ - jsdom'un gercek bir devicePixelRatio'su veya
 * WebGL baglami yoktur. O katman `npm run bench:input` ve
 * `npm run bench:smoke` betikleriyle DPR 1/2/3'te gercek tarayicida
 * olculur; burada yalnizca politika kilitlenir.
 */
import { describe, expect, it } from 'vitest';
import { MAX_RENDER_DPR, effectiveDpr, renderTargets, toLogical } from '@/utils/RenderScale';

describe('effectiveDpr', () => {
  it('1 ve tavan arasindaki degerleri oldugu gibi birakir', () => {
    expect(effectiveDpr(1, 2)).toBe(1);
    expect(effectiveDpr(1.5, 2)).toBe(1.5);
    expect(effectiveDpr(2, 2)).toBe(2);
  });

  it('tavanin ustunu kirpar', () => {
    expect(effectiveDpr(3, 2)).toBe(2);
    expect(effectiveDpr(4, 2)).toBe(2);
    expect(effectiveDpr(2.625, 2)).toBe(2);
  });

  it('1in altina inmez - kucultmek bulanikligi artirirdi', () => {
    expect(effectiveDpr(0.5, 2)).toBe(1);
    expect(effectiveDpr(0.75, 2)).toBe(1);
  });

  it('gecersiz girdi guvenli tarafa duser', () => {
    expect(effectiveDpr(Number.NaN, 2)).toBe(1);
    expect(effectiveDpr(0, 2)).toBe(1);
    expect(effectiveDpr(-2, 2)).toBe(1);
    expect(effectiveDpr(Number.POSITIVE_INFINITY, 2)).toBe(1);
  });

  it('anlamsiz tavan 1 kabul edilir, Infinity ise "sinir yok" demektir', () => {
    // Bu ayrim bir hatayi kapatti: tavan Infinity iken yogunluk yanlislikla
    // 1'e kirpiliyordu ve DPR hic devreye girmiyordu.
    expect(effectiveDpr(3, Number.POSITIVE_INFINITY)).toBe(3);
    expect(effectiveDpr(3, Number.NaN)).toBe(1);
    expect(effectiveDpr(3, 0)).toBe(1);
  });

  it('varsayilan tavan MAX_RENDER_DPR', () => {
    expect(effectiveDpr(5)).toBe(MAX_RENDER_DPR);
  });
});

describe('renderTargets', () => {
  it('DPR 1: cihaz olcusu mantiksal olcuye esittir', () => {
    const t = renderTargets(390, 844, 1);
    expect(t).toEqual({
      logicalWidth: 390,
      logicalHeight: 844,
      deviceWidth: 390,
      deviceHeight: 844,
      dpr: 1,
    });
  });

  it('DPR 2: cihaz olcusu iki kati, mantiksal olcu ayni kalir', () => {
    const t = renderTargets(390, 844, 2);
    expect(t.logicalWidth).toBe(390);
    expect(t.logicalHeight).toBe(844);
    expect(t.deviceWidth).toBe(780);
    expect(t.deviceHeight).toBe(1688);
    expect(t.dpr).toBe(2);
  });

  it('DPR 3: tavana kirpilir, mantiksal olcu yine degismez', () => {
    const t = renderTargets(390, 844, 3);
    expect(t.logicalWidth).toBe(390);
    expect(t.logicalHeight).toBe(844);
    expect(t.dpr).toBe(MAX_RENDER_DPR);
    expect(t.deviceWidth).toBe(390 * MAX_RENDER_DPR);
  });

  it('tavan acikca verilirse DPR 3 uygulanabilir', () => {
    const t = renderTargets(390, 844, 3, 3);
    expect(t.deviceWidth).toBe(1170);
    expect(t.deviceHeight).toBe(2532);
    expect(t.dpr).toBe(3);
  });

  it('MANTIKSAL olcu piksel yogunlugundan ETKILENMEZ', () => {
    const sizes = [1, 1.5, 2, 2.625, 3, 4].map((d) => renderTargets(390, 844, d, 3));
    for (const t of sizes) {
      expect(t.logicalWidth).toBe(390);
      expect(t.logicalHeight).toBe(844);
    }
  });

  it('kesirli yogunlukta cihaz olcusu TAM SAYIYA yuvarlanir', () => {
    // Kesirli arka tampon olcusu tarayicida yeniden ornekleme yaratir ve
    // tam da onlemeye calistigimiz bulanikligi geri getirir.
    const t = renderTargets(390, 844, 1.5, 3);
    expect(Number.isInteger(t.deviceWidth)).toBe(true);
    expect(Number.isInteger(t.deviceHeight)).toBe(true);
    expect(t.deviceWidth).toBe(585);
    expect(t.deviceHeight).toBe(1266);
  });

  it('yon degisimi mantiksal olcuye yansir, yogunluga karismaz', () => {
    const portrait = renderTargets(390, 844, 2);
    const landscape = renderTargets(844, 390, 2);
    expect(portrait.dpr).toBe(landscape.dpr);
    expect(landscape.logicalWidth).toBe(844);
    expect(landscape.deviceWidth).toBe(1688);
  });

  it('sifir veya negatif olcu en az 1 piksele cekilir', () => {
    const t = renderTargets(0, -5, 2);
    expect(t.logicalWidth).toBe(1);
    expect(t.logicalHeight).toBe(1);
    expect(t.deviceWidth).toBeGreaterThan(0);
  });
});

describe('toLogical', () => {
  it('cihaz pikselini mantiksal piksele cevirir', () => {
    expect(toLogical(780, 2)).toBe(390);
    expect(toLogical(390, 1)).toBe(390);
    expect(toLogical(1170, 3)).toBe(390);
  });

  it('gecersiz yogunlukta degeri oldugu gibi birakir', () => {
    expect(toLogical(390, 0)).toBe(390);
    expect(toLogical(390, -1)).toBe(390);
  });

  it('dokunma esigi yogunluktan bagimsiz kalir', () => {
    // 20 mantiksal piksellik kayma, her yogunlukta ayni fiziksel mesafedir.
    const threshold = 20;
    for (const dpr of [1, 2, 3]) {
      expect(toLogical(threshold * dpr, dpr)).toBe(threshold);
    }
  });
});
