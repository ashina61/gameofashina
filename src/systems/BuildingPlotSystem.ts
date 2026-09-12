import { STREET_EVERY } from '@/config/Constants';
import { getBuilding } from '@/config/BuildingCatalog';
import type { GridMap } from '@/core/GridMap';
import type { BuildingId, BuildingPlot, GridPoint, PlotZone } from '@/types';

/**
 * Sehrin yapi alanlari (plot) sistemi.
 *
 * NEDEN VAR
 * Sprint 11'e kadar oyuncu binayi uygun HERHANGI bir karoya birakabiliyordu.
 * Sonuc, yonetilen bir sehir degil dagilmis bina yiginiydi. Artik sehrin
 * belirlenmis yapi alanlari var ve her alanin ne kabul ettigi bellidir.
 *
 * IKINCI BIR DOLULUK SISTEMI YOK
 * Bir plotun dolu olup olmadigi GridMap'ten CANLI okunur (occupantUid).
 * Plot kendi icinde bina referansi TUTMAZ; tutsaydi bina yikildiginda
 * senkron tutulmasi gereken ikinci bir gercek olurdu. Ayni sebeple
 * NavigationSystem de degismedi: engel hala ayak izidir, plot degil.
 *
 * KAYITTA YER KAPLAMAZ
 * Yerlesim tamamen zeminden TURETILIR ve zemin seed'den uretilir. Ayni
 * seed her zaman ayni sehri verir, dolayisiyla plotlari kaydetmeye gerek
 * yoktur ve eski kayitlar bozulmaz.
 *
 * SOKAKLAR
 * gx veya gy'si 3'un kati olan karolar ASLA plot olmaz. Geriye 2x2'lik
 * yapi adalari ve aralarinda dik acili sokaklar kalir. Bu hem Ikariam'in
 * duzenli sehir hissini verir hem de Sprint 10'un dort yonlu BFS'i icin
 * her zaman baglantili bir gezinti agi garanti eder.
 */

/**
 * Bolgelerin kabul ettigi bina turleri (zemin suzgecinden ONCE).
 *
 * Merkeze yakinlik arttikca sivil/ticari, uzaklastikca uretim agirlikli.
 * Tas ocagi her bolgede aday olarak durur ama zemin suzgeci onu yalnizca
 * KAYA karolarda birakir - katalogdaki terrain kurali degismedi.
 */
const ZONE_TYPES: Record<PlotZone, BuildingId[]> = {
  civic: ['town_hall'],
  // Merkezin cevresi: ticaret, depo, sehrin aniti ve arada birkac konut.
  commerce: ['market', 'warehouse', 'house', 'temple', 'academy'],
  // Konut kusagi: sehrin govdesi, kenarinda gida uretimi ve kiyi varsa liman.
  residential: ['house', 'farm', 'quarry', 'harbor'],
  /*
   * Disarisi: tarla, orman, depolama - ve isci konutu.
   *
   * Konut hem konut kusaginda hem uretim kusaginda bulunur; tarlanin
   * kenarinda ev olmasi hem gercekci hem de oyuncuya uretim bolgesini
   * buyutme secenegi verir.
   */
  production: ['farm', 'lumber_camp', 'house', 'warehouse', 'quarry', 'harbor'],
};

/**
 * Bolge halkalarinin merkeze KARO cinsinden uzakligi.
 *
 * Ilk denemede halkalar yapi ADASI uzakligindan turetiliyordu; 14x14
 * izgarada en buyuk ada uzakligi 2 oldugu icin uretim bolgesi hic
 * olusmadi ve oduncu kampina tek bir plot bile dusmedi (olculdu: 75
 * plotun 0'i). Karo uzakligi halkalari gercekten ayirir.
 */
/*
 * Yaricaplar izgara BOYUTUNDAN turer.
 *
 * Sprint 12'de sabit 3 ve 5'ti; Sprint 14 haritayi 18x18'e buyutunce sabit
 * degerler butun disariyi tek bir dev uretim kusagina cevirdi. Oran, eski
 * 14x14 haritada ayni sayilari verir (3 ve 5), yani eski sehirlerin
 * yerlesimi degismez.
 */
function commerceRadius(size: number): number {
  return Math.round(size * 0.22);
}

function residentialRadius(size: number): number {
  return Math.round(size * 0.36);
}

export class BuildingPlotSystem {
  private readonly grid: GridMap;
  private readonly plotList: BuildingPlot[] = [];
  /** Karo -> plot indeksi; cok karolu plotun her karosu ayni plota bakar. */
  private readonly byTile = new Map<string, BuildingPlot>();
  private readonly byId = new Map<string, BuildingPlot>();

  constructor(grid: GridMap) {
    this.grid = grid;
    this.layout();
  }

  /** Sehirdeki tum yapi alanlari, kurulus sirasiyla (deterministik). */
  get plots(): readonly BuildingPlot[] {
    return this.plotList;
  }

  /** Verilen karoyu iceren plot; yoksa null (sokak, su, harita disi). */
  plotAt(gx: number, gy: number): BuildingPlot | null {
    return this.byTile.get(key(gx, gy)) ?? null;
  }

  plotById(id: string): BuildingPlot | null {
    return this.byId.get(id) ?? null;
  }

  /**
   * Plotu dolduran binanin uid'i; GridMap'ten okunur.
   * Plot kendi doluluk kaydini TUTMAZ - tek gercek izgaradir.
   */
  occupantOf(plot: BuildingPlot): string | null {
    return this.grid.getTile(plot.gx, plot.gy)?.occupantUid ?? null;
  }

  /** Plot bos mu? Cok karolu plotta karolarin hepsi bos olmali. */
  isFree(plot: BuildingPlot): boolean {
    for (let dy = 0; dy < plot.height; dy += 1) {
      for (let dx = 0; dx < plot.width; dx += 1) {
        const tile = this.grid.getTile(plot.gx + dx, plot.gy + dy);
        if (!tile || tile.occupantUid !== null) return false;
      }
    }
    return true;
  }

  /** Bu plot bu bina turunu kabul ediyor mu? Kilit ve olcu dahil. */
  accepts(plot: BuildingPlot, type: BuildingId): boolean {
    if (!plot.unlocked) return false;
    if (!plot.allowedTypes.includes(type)) return false;
    // Bina plota sigmali; sehir merkezi 2x2 plotunu, digerleri 1x1 ister.
    const size = getBuilding(type).size;
    return size <= plot.width && size <= plot.height;
  }

  /**
   * Verilen tur icin INSA EDILEBILIR plotlar.
   * Kaynak kontrolu burada YAPILMAZ - o BuildingSystem'in isidir.
   */
  availableFor(type: BuildingId): BuildingPlot[] {
    const center = this.grid.center();
    const distance = (plot: BuildingPlot) =>
      Math.max(Math.abs(plot.gx - center.gx), Math.abs(plot.gy - center.gy));

    /*
     * MERKEZDEN DISARI siralanir.
     *
     * Once yerlesim sirasiyla (satir satir) donuyordu ve listeden otomatik
     * secen her sey (olcum betikleri, onerilen alan) sehri haritanin bir
     * kosesine yigiyordu. Merkezden disari siralamak sehrin merkez etrafinda
     * buyumesini saglar. Siralama DETERMINISTIK: esitlikte kurulus sirasi
     * korunur.
     */
    return this.plotList
      .filter((plot) => this.accepts(plot, type) && this.isFree(plot))
      .sort((a, b) => distance(a) - distance(b));
  }

  /**
   * Sehir yerlesimini kurar.
   *
   * Tamamen deterministik: sokak deseni sabit, bolgeler merkez adasina olan
   * uzakliktan turer, kabul edilen turler zeminle suzulur. Rastgelelik yok.
   */
  private layout(): void {
    const center = this.grid.center();
    const centerBlock = { bx: blockOf(center.gx), by: blockOf(center.gy) };

    // 1. Sehir merkezi: merkez adasinin tamami tek bir 2x2 ozel plot.
    const hallGx = centerBlock.bx * STREET_EVERY + 1;
    const hallGy = centerBlock.by * STREET_EVERY + 1;
    if (this.fits(hallGx, hallGy, 2, 2, 'town_hall')) {
      this.add({
        id: `plot#${hallGx},${hallGy}`,
        gx: hallGx,
        gy: hallGy,
        width: 2,
        height: 2,
        zone: 'civic',
        allowedTypes: ['town_hall'],
        unlocked: true,
      });
    }

    /*
     * 2. ANIT ALANI: merkez adasinin komsu adalarindan biri tapinaga
     *    ayrilir.
     *
     * Tapinak 2x2'dir ve sehirdeki diger butun alanlar 1x1 oldugu icin
     * hicbir yere sigmiyordu (olculdu: dort ayri seed'de tapinak icin 0
     * alan). Merkezin hemen yanindaki bir adayi tek parca birakmak hem
     * sorunu cozer hem de anitin sehrin kalbinde durmasini saglar.
     *
     * Secim DETERMINISTIK: komsu adalar sabit bir sirada denenir ve
     * zemini uygun olan ilki secilir.
     */
    const monumentOrder: Array<[number, number]> = [
      [0, -1],
      [-1, 0],
      [1, 0],
      [0, 1],
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ];
    for (const [bx, by] of monumentOrder) {
      const gx = (centerBlock.bx + bx) * STREET_EVERY + 1;
      const gy = (centerBlock.by + by) * STREET_EVERY + 1;
      if (this.byTile.has(key(gx, gy))) continue;
      if (!this.fits(gx, gy, 2, 2, 'temple')) continue;
      this.add({
        id: `plot#${gx},${gy}`,
        gx,
        gy,
        width: 2,
        height: 2,
        zone: 'commerce',
        allowedTypes: ['temple'],
        unlocked: true,
      });
      break;
    }

    // 3. Kalan butun yapi karolari 1x1 plot olur.
    for (const tile of this.grid.allTiles()) {
      if (!isBuildable(tile.gx, tile.gy)) continue;
      if (this.byTile.has(key(tile.gx, tile.gy))) continue; // merkez adasi

      const zone = zoneFor(tile.gx, tile.gy, center, this.grid.size);
      const allowed = ZONE_TYPES[zone].filter((type) => {
        const def = getBuilding(type);
        if (!def.allowedTerrain.includes(tile.terrain)) return false;
        // Kiyi yapisi yalnizca suya komsu alanlarda aday olur.
        if (def.requiresWaterAdjacent && !this.touchesWater(tile.gx, tile.gy)) return false;
        return true;
      });
      if (allowed.length === 0) continue; // su, ya da bu bolgeye uymayan zemin

      this.add({
        id: `plot#${tile.gx},${tile.gy}`,
        gx: tile.gx,
        gy: tile.gy,
        width: 1,
        height: 1,
        zone,
        allowedTypes: allowed,
        unlocked: true,
      });
    }
  }

  /** Karonun dort komsusundan biri su mu? (kiyi kurali) */
  private touchesWater(gx: number, gy: number): boolean {
    for (const [dx, dy] of [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
    ]) {
      if (this.grid.getTile(gx + dx, gy + dy)?.terrain === 'water') return true;
    }
    return false;
  }

  /** Alanin tamami haritada ve verilen tur icin uygun zeminde mi? */
  private fits(gx: number, gy: number, width: number, height: number, type: BuildingId): boolean {
    const terrain = getBuilding(type).allowedTerrain;
    for (let dy = 0; dy < height; dy += 1) {
      for (let dx = 0; dx < width; dx += 1) {
        const tile = this.grid.getTile(gx + dx, gy + dy);
        if (!tile || !terrain.includes(tile.terrain)) return false;
      }
    }
    return true;
  }

  private add(plot: BuildingPlot): void {
    this.plotList.push(plot);
    this.byId.set(plot.id, plot);
    for (let dy = 0; dy < plot.height; dy += 1) {
      for (let dx = 0; dx < plot.width; dx += 1) {
        this.byTile.set(key(plot.gx + dx, plot.gy + dy), plot);
      }
    }
  }
}

/** Karo yapiya acik mi? Sokaklar (3'un katlari) kapalidir. */
export function isBuildable(gx: number, gy: number): boolean {
  return gx % STREET_EVERY !== 0 && gy % STREET_EVERY !== 0;
}

/** Karonun ait oldugu yapi adasinin indeksi. */
function blockOf(g: number): number {
  return Math.floor(g / STREET_EVERY);
}

/**
 * Karonun merkeze uzakligina gore bolgesi.
 * Halka halka disari: ticaret -> konut -> uretim.
 */
function zoneFor(gx: number, gy: number, center: GridPoint, size: number): PlotZone {
  const distance = Math.max(Math.abs(gx - center.gx), Math.abs(gy - center.gy));
  if (distance <= commerceRadius(size)) return 'commerce';
  if (distance <= residentialRadius(size)) return 'residential';
  return 'production';
}

function key(gx: number, gy: number): string {
  return `${gx},${gy}`;
}
