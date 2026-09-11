/**
 * Isci figurunun uc durumunun GORSEL olarak ayrilabildigini kilitler.
 *
 * Cizimin guzel olup olmadigi ancak gozle degerlendirilebilir; burada
 * dogrulanan sey daha dar ama kritik: uc durum birbirinden YALNIZCA renkle
 * degil, GEOMETRIYLE de ayrilmali. Telefonda uzaklastirilmis kamerada renk
 * farki tek basina okunmuyor - Sprint 7B'de evler icin ogrenilen ders buydu.
 */
import { describe, expect, it } from 'vitest';
import { WORKER_HEIGHT, WORKER_WIDTH, drawWorker } from '@/render/WorkerArt';
import type { WorkerState } from '@/types';

/** Cizim cagrilarini kaydeden sahte Graphics. */
function recorder(): {
  colors: number[];
  shapes: string[];
  g: Record<string, (...args: number[]) => void>;
} {
  const colors: number[] = [];
  const shapes: string[] = [];
  const geom = (name: string) => (...args: number[]) => {
    shapes.push(`${name}(${args.map((n) => n.toFixed(2)).join(',')})`);
  };
  const g = {
    fillStyle: (color: number) => { colors.push(color); },
    beginPath: geom('beginPath'),
    moveTo: geom('moveTo'),
    lineTo: geom('lineTo'),
    closePath: geom('closePath'),
    fillPath: geom('fillPath'),
    fillRect: geom('fillRect'),
    fillCircle: geom('fillCircle'),
    fillEllipse: geom('fillEllipse'),
  };
  return { colors, shapes, g };
}

/** Bir durumu cizer ve kaydini dondurur. */
function draw(state: WorkerState): { colors: number[]; shapes: string[] } {
  const rec = recorder();
  // Sahte Graphics gercek arayuzun yalnizca kullanilan kismini tasir.
  drawWorker(rec.g as never, state);
  return { colors: rec.colors, shapes: rec.shapes };
}

const STATES: WorkerState[] = ['idle', 'moving', 'working'];

describe('isci figuru', () => {
  it('uc durumun da cizimi uretiliyor', () => {
    for (const state of STATES) {
      const { shapes } = draw(state);
      expect(shapes.length).toBeGreaterThan(5);
    }
  });

  it('durumlar SILUET olarak ayrilir - renk farki tek basina yeterli degil', () => {
    const geometry = STATES.map((s) => draw(s).shapes.join('|'));
    // Her ciftin geometrisi farkli olmali.
    expect(new Set(geometry).size).toBe(STATES.length);
  });

  it('calisan iscinin alet ve kusagi var; bosta iscinin yok', () => {
    const idle = draw('idle');
    const working = draw('working');
    expect(working.shapes.length).toBeGreaterThan(idle.shapes.length);
  });

  it('yolda ve calisan isci farkli bacak durusu kullanir', () => {
    // Ilk dort dikdortgen: golge sonrasi bacaklar. Ayrik adim yalnizca yolda.
    const moving = draw('moving').shapes.filter((s) => s.startsWith('fillRect'));
    const working = draw('working').shapes.filter((s) => s.startsWith('fillRect'));
    expect(moving[0]).not.toBe(working[0]);
  });

  it('cizim doku sinirlarinin disina tasmaz', () => {
    for (const state of STATES) {
      for (const shape of draw(state).shapes) {
        const nums = shape.match(/-?\d+\.\d+/g)?.map(Number) ?? [];
        for (const n of nums) {
          expect(n).toBeGreaterThanOrEqual(-1);
          expect(n).toBeLessThanOrEqual(Math.max(WORKER_WIDTH, WORKER_HEIGHT) + 1);
        }
      }
    }
  });
});
