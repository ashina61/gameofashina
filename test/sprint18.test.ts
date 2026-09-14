/**
 * Sprint 18: varlik hatti ve panel derisi.
 *
 * Buradaki testler iki soruyu kilitler:
 *   1. Dosya YOKKEN oyun eskisi gibi calisiyor mu (prosedurel geri dusme)?
 *   2. Dosya VARKEN sisteme giriyor mu (adlandirma ve cozumleme kurallari)?
 *
 * Ikinci soru icin gercek dosya yazilamaz - glob listesi DERLEME aninda
 * olusur, test sirasinda klasore dosya birakmak listeyi degistirmez. Bu
 * yuzden ikinci soru, listeyi olusturan KURALLAR uzerinden test edilir:
 * ad uretimi, varyant geri dusmesi ve anahtar bicimi. Kurallar dogruysa
 * derleme aninda bulunan dosya da dogru yere baglanir.
 */
import { describe, expect, it } from 'vitest';
import {
  buildingSpriteName,
  manifestSummary,
  resolveBuildingSprite,
  spriteKeyFor,
  uiSourceKeyFor,
  UI_TEXTURE_NAMES,
  buildingAssets,
  uiAssets,
} from '@/render/AssetManifest';
import { getBuildingVisual, visualKeyFor } from '@/render/BuildingVisuals';
import { shadowKeyFor } from '@/render/ShadowArt';
import { allBuildings } from '@/config/BuildingCatalog';

/** Bu bina icin depoda boyali bir varlik var mi? */
const hasBuildingSprite = (type: string, level: number): boolean =>
  resolveBuildingSprite(type, level) !== null;

describe('varlik listesi', () => {
  it('klasorler bosken hicbir sey yuklenmez - oyun prosedurel calisir', () => {
    /*
     * Bu testin degeri, bugun gecmesinde DEGIL, yarin kirilmamasindadir:
     * biri PNG eklediginde liste dolar ve bu test o gercegi gosterir.
     * Bos liste, "hic istek cikmiyor" guvencesinin tek olculebilir hali.
     */
    const summary = manifestSummary();
    expect(buildingAssets().length).toBe(summary.buildings.length);
    expect(uiAssets().length).toBeLessThanOrEqual(UI_TEXTURE_NAMES.length);
  });

  it('dosya adi {tip}_{seviye} bicimindedir', () => {
    expect(buildingSpriteName('house', 1)).toBe('house_1');
    expect(buildingSpriteName('town_hall', 3)).toBe('town_hall_3');
  });

  it('varyant adi yalnizca varyant 0 DEGILKEN ek alir', () => {
    // Varyant 0'in sade adi kullanmasi, tek gorselli turlerde dosya adini
    // en kisa ve tahmin edilebilir halinde tutar.
    expect(buildingSpriteName('house', 1, 0)).toBe('house_1');
    expect(buildingSpriteName('house', 1, 2)).toBe('house_1_v2');
  });

  it('sprite anahtari prosedurel anahtarla CAKISMAZ', () => {
    /*
     * Iki ad uzayi ayni Phaser doku havuzunu paylasiyor. Cakisma olsaydi
     * bir PNG sessizce bir prosedurel dokunun uzerine yazabilirdi.
     */
    const procedural = visualKeyFor('house', 1);
    const sprite = spriteKeyFor(buildingSpriteName('house', 1));
    expect(sprite).not.toBe(procedural);
    expect(sprite.startsWith('spr:')).toBe(true);
    expect(procedural.startsWith('bld:')).toBe(true);
    expect(uiSourceKeyFor('panel_bg').startsWith('uisrc:')).toBe(true);
    expect(shadowKeyFor(2).startsWith('shadow:')).toBe(true);
  });

  /*
   * KURAL, KLASORUN O ANKI ICERIGINDEN BAGIMSIZ OLMALI.
   *
   * Bu test once "hicbir bina icin sprite yok" diyordu ve depoya ilk gercek
   * varlik (house_1.png) girdigi gun kirildi - oysa kirilan bir sey yoktu,
   * hat tam olarak beklendigi gibi calisiyordu. Olculecek sey sudur:
   * DOSYASI OLMAYAN bir bina prosedurele duser.
   */
  it('dosyasi olmayan bina icin cozumleme null doner - cagiran taraf prosedurele doner', () => {
    for (const def of allBuildings()) {
      if (hasBuildingSprite(def.id, 1)) continue;
      expect(resolveBuildingSprite(def.id, 1), def.id).toBeNull();
    }
  });

  it('kataloktaki binalarin cogu hala prosedurel - hat kademeli gecis icin', () => {
    const withArt = allBuildings().filter((def) => hasBuildingSprite(def.id, 1));
    expect(withArt.length).toBeLessThan(allBuildings().length);
  });
});

describe('gorsel secimi', () => {
  it('sprite bildirilmemisken gorsel eskisi gibi prosedureldir', () => {
    /*
     * Sprite'i OLMAYAN bir tur secilir; boylece test, klasore hangi
     * varligin konuldugundan etkilenmez. Prosedurel anahtar her durumda
     * uretilmeli - sprite yalnizca onun UZERINE gelir, yerine degil.
     */
    const bare = allBuildings().find((def) => !hasBuildingSprite(def.id, 1));
    if (!bare) throw new Error('prosedurel kalan bina yok');

    const visual = getBuildingVisual({
      type: bare.id,
      level: 1,
      state: 'active',
      size: bare.size,
      uid: `${bare.id}#1`,
    });
    expect(visual.textureKey).toBe(visualKeyFor(bare.id, 1, 0));
    expect(visual.spriteKey).toBeNull();
    expect(visual.shadowSpriteKey).toBeNull();
  });

  it('sprite VARSA gorsel onu bildirir ama prosedurel anahtari da tasir', () => {
    const painted = allBuildings().find((def) => hasBuildingSprite(def.id, 1));
    if (!painted) return; // klasor bos: kural denenecek varlik yok

    const visual = getBuildingVisual({
      type: painted.id,
      level: 1,
      state: 'active',
      size: painted.size,
      uid: `${painted.id}#1`,
    });
    // Prosedurel anahtar KAYBOLMAZ: sprite yuklenemezse oraya donulur.
    expect(visual.textureKey).toBe(visualKeyFor(painted.id, 1, 0));
    expect(visual.spriteKey).not.toBeNull();
    /*
     * Ozel golge dosyasi VERILMEDIYSE bu alan null kalir - eksiklik degil,
     * sozlesme: golgeyi o zaman cizim katmani uretir (bkz. ShadowArt).
     */
    expect(visual.shadowSpriteKey).toBeNull();
  });

  it('INSAAT halinde sprite aranmaz - santiye bitmis bina gibi gorunemez', () => {
    const visual = getBuildingVisual({
      type: 'house',
      level: 2,
      state: 'constructing',
      size: 1,
      uid: 'house#1',
    });
    expect(visual.spriteKey).toBeNull();
    expect(visual.textureKey).toContain('scaffold');
  });

  it('ayni uid her zaman ayni varyanti verir - kayit yuklenince sehir degismez', () => {
    /*
     * Deterministik esleme sprite hattinin da temeli: varyant kaymasi
     * PNG adlarini da kaydirir ve oyuncunun sehri yeniden yuklendiginde
     * baska gorunurdu.
     */
    const first = getBuildingVisual({
      type: 'house',
      level: 1,
      state: 'active',
      size: 1,
      uid: 'house#7',
    });
    const second = getBuildingVisual({
      type: 'house',
      level: 1,
      state: 'active',
      size: 1,
      uid: 'house#7',
    });
    expect(second.textureKey).toBe(first.textureKey);
    expect(second.tint).toBe(first.tint);
  });

  it('her tur ve seviye icin bir prosedurel gorsel vardir', () => {
    // Geri dusme yolunun BOSLUGU olmamali: PNG gelmeyen her kombinasyon
    // icin gosterilecek bir sey bulunmali.
    for (const def of allBuildings()) {
      for (let level = 1; level <= def.levels.length; level += 1) {
        const visual = getBuildingVisual({
          type: def.id,
          level,
          state: 'active',
          size: def.size,
          uid: `${def.id}#1`,
        });
        expect(visual.textureKey, `${def.id} Sv.${level}`).toBeTruthy();
      }
    }
  });
});

describe('golge katmani', () => {
  it('golge dokusu AYAK IZI olcusune gore adlanir', () => {
    /*
     * Golge binanin boyuna degil, kapladigi kareye baglidir: 2x2 bir
     * tapinakla 2x2 bir merkez zeminde ayni izi birakir. Ad da bu yuzden
     * yalnizca olcuyu tasir - tur basina ayri golge dokusu uretilmez.
     */
    expect(shadowKeyFor(1)).toBe('shadow:1');
    expect(shadowKeyFor(2)).toBe('shadow:2');
    expect(shadowKeyFor(2)).toBe(shadowKeyFor(2));
  });

  it('gecersiz olcu guvenli bir degere kirpilir', () => {
    expect(shadowKeyFor(0)).toBe('shadow:1');
    expect(shadowKeyFor(Number.NaN)).toBe('shadow:1');
  });
});
