/**
 * Bina gorsel eslemesi.
 *
 * Bu katman, oyun verisi (type/level/state) ile CIZIM arasindaki koprudur.
 * Cizimin kendisi ancak gozle degerlendirilebilir; burada eslemenin dogru
 * ve GUVENLI oldugu kilitlenir - taninmayan bir tur oyunu cokertmemeli.
 */
import { describe, expect, it } from 'vitest';
import { allBuildings } from '@/config/BuildingCatalog';
import {
  DRAWN_BUILDING_TYPES,
  variantCountFor,
  variantFor,
  variationTintFor,
  GENERIC_VISUAL,
  MAX_VISUAL_LEVEL,
  getBuildingVisual,
  isDrawnType,
  scaffoldKeyFor,
  visualKeyFor,
} from '@/render/BuildingVisuals';

describe('gorsel eslemesi', () => {
  it('katalogdaki HER bina turunun kendi cizimi var', () => {
    for (const def of allBuildings()) {
      expect(isDrawnType(def.id)).toBe(true);
    }
  });

  it('cizimi olan tur listesi katalogla birebir ortusur', () => {
    const catalog = allBuildings()
      .map((d) => d.id)
      .sort();
    expect([...DRAWN_BUILDING_TYPES].sort()).toEqual(catalog);
  });

  it('seviye 1 ve seviye 2 AYRI gorsel anahtarlari uretir', () => {
    for (const def of allBuildings()) {
      const lv1 = visualKeyFor(def.id, 1);
      const lv2 = visualKeyFor(def.id, 2);
      expect(lv1).not.toBe(lv2);
      expect(lv1).toContain(def.id);
      expect(lv2).toContain(def.id);
    }
  });

  it('taninmayan tur guvenli yedege duser - oyun cokmez', () => {
    const key = visualKeyFor('teleport_pad', 1);
    expect(key).toContain(GENERIC_VISUAL);
    expect(key).not.toContain('teleport_pad');
  });

  it('gorsel seviye tavana kirpilir; katalog ilerde seviye 3 tanimlarsa cokmez', () => {
    expect(visualKeyFor('house', 5)).toBe(visualKeyFor('house', MAX_VISUAL_LEVEL));
    expect(visualKeyFor('house', 0)).toBe(visualKeyFor('house', 1));
    expect(visualKeyFor('house', Number.NaN)).toBe(visualKeyFor('house', 1));
  });

  it('iskele anahtari ayak izi olcusune gore degisir', () => {
    expect(scaffoldKeyFor(1)).not.toBe(scaffoldKeyFor(2));
    expect(scaffoldKeyFor(0)).toBe(scaffoldKeyFor(1));
  });
});

describe('durum gorselleri', () => {
  const base = { type: 'house', level: 1, size: 1 } as const;

  it('insaat halindeki bina ISKELE gorseli kullanir, bina gorseli degil', () => {
    const visual = getBuildingVisual({ ...base, state: 'constructing' });
    expect(visual.textureKey).toBe(scaffoldKeyFor(1));
    expect(visual.textureKey).not.toBe(visualKeyFor('house', 1));
  });

  it('calisir bina kendi gorselini tam opak kullanir', () => {
    const visual = getBuildingVisual({ ...base, state: 'active' });
    expect(visual.textureKey).toBe(visualKeyFor('house', 1));
    expect(visual.alpha).toBe(1);
    expect(visual.tint).toBe(0xffffff);
  });

  it('devre disi bina soluklastirilir ama gorseli degismez', () => {
    const visual = getBuildingVisual({ ...base, state: 'disabled' });
    expect(visual.textureKey).toBe(visualKeyFor('house', 1));
    expect(visual.alpha).toBeLessThan(1);
    expect(visual.tint).not.toBe(0xffffff);
  });

  it('iskele ayak izi olcusunu takip eder', () => {
    const visual = getBuildingVisual({ type: 'town_hall', level: 1, size: 2, state: 'constructing' });
    expect(visual.textureKey).toBe(scaffoldKeyFor(2));
  });

  it('seviye 2 bina seviye 2 gorseli kullanir', () => {
    const visual = getBuildingVisual({ type: 'farm', level: 2, size: 1, state: 'active' });
    expect(visual.textureKey).toBe(visualKeyFor('farm', 2));
  });
});

describe('siluet varyantlari', () => {
  it('ev birden fazla siluet varyantina sahip', () => {
    expect(variantCountFor('house')).toBeGreaterThan(1);
  });

  it('varyanti olmayan turler her zaman 0 dondurur', () => {
    for (const type of ['town_hall', 'farm', 'quarry', 'market', 'warehouse', 'lumber_camp']) {
      expect(variantCountFor(type)).toBe(1);
      expect(variantFor('anything#1', type)).toBe(0);
    }
  });

  it('ayni uid HER ZAMAN ayni varyanti verir - kayit yuklenince sehir degismez', () => {
    for (const uid of ['house#1', 'house#42', 'house#7', 'house#1234']) {
      const first = variantFor(uid, 'house');
      for (let i = 0; i < 20; i += 1) expect(variantFor(uid, 'house')).toBe(first);
    }
  });

  it('varyantlar gecerli aralikta kalir', () => {
    const count = variantCountFor('house');
    for (let i = 0; i < 200; i += 1) {
      const v = variantFor(`house#${i}`, 'house');
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(count);
    }
  });

  it('varyantlar sehre dengeli dagilir - tek bir varyant hakim olmaz', () => {
    const count = variantCountFor('house');
    const seen = new Array<number>(count).fill(0);
    for (let i = 1; i <= 240; i += 1) seen[variantFor(`house#${i}`, 'house')] += 1;

    // Her varyant en az bir kez gorunmeli ve hicbiri ezici cogunluk olmamali.
    for (const n of seen) {
      expect(n).toBeGreaterThan(0);
      expect(n).toBeLessThan(240 * 0.7);
    }
  });

  it('varyant ve renk tonu AYNI hash\'ten turemez', () => {
    // Ayni hash kullanilsaydi belirli bir varyant hep belirli bir tonla
    // eslesirdi ve cesitlilik yapay gorunurdu.
    const byVariant = new Map<number, Set<number>>();
    for (let i = 1; i <= 120; i += 1) {
      const uid = `house#${i}`;
      const v = variantFor(uid, 'house');
      if (!byVariant.has(v)) byVariant.set(v, new Set());
      byVariant.get(v)?.add(variationTintFor(uid));
    }
    for (const tints of byVariant.values()) expect(tints.size).toBeGreaterThan(1);
  });

  it('varyant anahtarlari birbirinden farkli doku uretir', () => {
    const keys = new Set<string>();
    for (let v = 0; v < variantCountFor('house'); v += 1) keys.add(visualKeyFor('house', 1, v));
    expect(keys.size).toBe(variantCountFor('house'));
  });

  it('varyant 0 eski anahtar bicimini korur', () => {
    expect(visualKeyFor('house', 1, 0)).toBe(visualKeyFor('house', 1));
    expect(visualKeyFor('farm', 2, 5)).toBe(visualKeyFor('farm', 2));
  });
});
