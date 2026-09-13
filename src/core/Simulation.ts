import { TICKS_PER_SECOND, GAME_SECONDS_PER_HOUR, MAX_OFFLINE_SECONDS } from '@/config/Constants';
import type { EventBus } from '@/core/EventBus';
import type { GameState } from '@/core/GameState';
import type { CitizenSystem } from '@/systems/CitizenSystem';
import type { CombatSystem } from '@/systems/CombatSystem';
import type { ConstructionSystem } from '@/systems/ConstructionSystem';
import type { EconomySystem } from '@/systems/EconomySystem';
import type { FleetSystem } from '@/systems/FleetSystem';
import type { HappinessSystem } from '@/systems/HappinessSystem';
import type { IslandSystem } from '@/systems/IslandSystem';
import type { MilitarySystem } from '@/systems/MilitarySystem';
import type { NpcSystem } from '@/systems/NpcSystem';
import type { ResearchSystem } from '@/systems/ResearchSystem';
import type { ResourceSystem } from '@/systems/ResourceSystem';
import type { WonderSystem } from '@/systems/WonderSystem';

/**
 * Tik orkestrasyonu.
 *
 * SIRANIN ONEMLI OLMASININ SEBEBI
 * Ikariam'in saatlik dongusu belirli bir sirayla isler ve bu sira
 * gorunur sonuclar uretir. Ornegin:
 *
 *   - Insaat ONCE biter, uretim SONRA hesaplanir: ayni saat icinde hem
 *     "bina bitti" hem de "yeni seviyeden uretim" gorunsun. Tersi sirada
 *     oyuncu bina bittigi halde bir saat boyunca eski uretimi gorur.
 *   - Nufus atamasi uretimden ONCE: yeni gelen vatandas ayni saatte
 *     isci olabilsin. Ikariam'da da nufus artisi aninda isgucune katilir.
 *   - Bakim ODEMESI uretimden SONRA: ayni saat icinde once kazanc girer,
 *     sonra gider cikar. Tersi sirada oyuncu, tam da altini yetecekken
 *     birliklerinin dagildigini gorur ki bu yanlis bir cezalandirmadir.
 *   - Arastirmanin TAMAMLANMA kontrolu, puani ureten ekonomiden SONRA:
 *     aksi halde buyuk bir adimda (cevrimdisi ilerleme) hedefine ulasan
 *     arastirma hic tamamlanmaz, cunku "sonraki tik" gelmez.
 *   - Filolar savastan SONRA ilerler degil, kendi adiminda ilerler:
 *     savas yalnizca VARIS aninda cozulur.
 *
 * Bu sirayi bozmak hata mesaji uretmez; sadece rakamlar yanlis gorunur.
 * O yuzden sira burada tek yerde sabitlenir ve yorumla gerekcelendirilir.
 */

export interface Systems {
  resources: ResourceSystem;
  wonders: WonderSystem;
  happiness: HappinessSystem;
  citizens: CitizenSystem;
  economy: EconomySystem;
  research: ResearchSystem;
  construction: ConstructionSystem;
  island: IslandSystem;
  military: MilitarySystem;
  fleet: FleetSystem;
  combat: CombatSystem;
  npc: NpcSystem;
}

export class Simulation {
  /**
   * Kesirli tik biriktirici.
   *
   * `GameState.advanceTick` yalnizca TAM tik kabul eder; 60 fps'de her
   * kare 0.016 saniyedir. Kalan kisim burada biriktirilir, aksi halde her
   * karede sifirlanir ve oyun hic ilerlemez.
   */
  private tickBuffer = 0;

  constructor(
    private readonly state: GameState,
    private readonly systems: Systems,
    private readonly bus: EventBus,
  ) {}

  /**
   * Bir gercek saniyelik adim.
   *
   * @param deltaRealSeconds gercek gecen sure (Phaser kare delta'si)
   */
  step(deltaRealSeconds: number): void {
    if (!Number.isFinite(deltaRealSeconds) || deltaRealSeconds <= 0) return;

    this.tickBuffer += deltaRealSeconds * TICKS_PER_SECOND;
    const ticks = Math.floor(this.tickBuffer);
    if (ticks <= 0) return;
    this.tickBuffer -= ticks;

    const before = this.state.tick;
    this.state.advanceTick(ticks);
    const gameSeconds = ticks * this.state.gameSecondsPerTick;
    this.runSystems(gameSeconds);

    if (this.state.tick !== before) this.bus.emit('tick', this.state.tick);
  }

  /**
   * Dogrudan OYUN SANIYESI ile ilerletir.
   *
   * Cevrimdisi ilerleme ve testler icin kullanilir: burada gercek zaman
   * kavrami yoktur, dogrudan oyun zamani verilir.
   */
  stepGameSeconds(gameSeconds: number): void {
    if (!Number.isFinite(gameSeconds) || gameSeconds <= 0) return;
    const ticks = Math.max(1, Math.round(gameSeconds / this.state.gameSecondsPerTick));
    this.state.advanceTick(ticks);
    this.runSystems(gameSeconds);
  }

  /** Sistemleri Ikariam sirasiyla calistirir. */
  private runSystems(gameSeconds: number): void {
    // 1. Insaat: bu saatte bitecek binalar once bitsin ki uretim ve
    //    kapasite hesaplarinda yeni seviye kullanilsin.
    this.systems.construction.advance(gameSeconds);

    // 2. Ada yatagi: ortak hizar/luks yatagi yukselirse uretim yeni
    //    kapasiteden hesaplansin.
    this.systems.island.advance(gameSeconds);

    // 3. Nufus: atama ve buyume.
    this.systems.citizens.advance(gameSeconds);

    // 4. Ekonomi: uretim, tuketim, bakim, odenemeyen bakimda dagilma.
    //    Bilim adamlarinin urettigi arastirma puani BURADA birikir.
    this.systems.economy.advance(gameSeconds);

    // 5. Arastirma TAMAMLAMA kontrolu.
    //
    // Bu adim BILEREK ekonomiden SONRADIR: puani ekonomi uretir,
    // tamamlanma kararini arastirma sistemi verir. Tersi sirada hedefine
    // bu saatte ulasan bir arastirma bir sonraki saati beklerdi. 1
    // saniyelik tiklerde bu gecikme gorunmez, ancak cevrimdisi ilerleme
    // veya buyuk bir adim ATILDIGINDA "sonraki saat" hic gelmez ve
    // arastirma puan biriktigi halde sonsuza dek yarim kalir.
    //
    // Genel kural: bir adimi BESLEYEN uretim adimi, o cozumleme
    // adimindan ONCE calismalidir.
    this.systems.research.advance();

    // 6. Askeri kuyruklar.
    this.systems.military.advance(gameSeconds);

    // 7. Filolar; varista savas burada cozulur.
    this.systems.fleet.advance(gameSeconds);

    // 8. Harikalar ve NPC'ler.
    this.systems.wonders.advance();
    this.systems.npc.advance(gameSeconds);
  }

  /**
   * Cevrimdisi ilerleme.
   *
   * Uygulama kapaliyken gecen sure tek seferde islenir. Ikariam gercek
   * zamanli bir oyundur; kapaliyken de uretim, insaat ve arastirma devam
   * eder. Ancak:
   *
   *   - UST SINIR: MAX_OFFLINE_SECONDS. Ikariam'da da depo doldugu icin
   *     sonsuz birikim olmaz; burada ayrica bir tavan konur ki bir ay
   *     kapali kalan oyuncu dunyayi tek tikte bitirmesin.
   *   - DILIMLEME: sure saatlik parcalara bolunur. Tek dev adimda islemek
   *     depo tavanini, mutluluk esiklerini ve insaat sirasini yanlis
   *     hesaplatir: ornegin 100 saatlik tek adimda nufus tavana bir kez
   *     carpilir, oysa gercekte her saat artarak yaklasir.
   */
  applyOfflineProgress(gameSeconds: number): void {
    if (!Number.isFinite(gameSeconds) || gameSeconds <= 0) return;
    const capped = Math.min(gameSeconds, MAX_OFFLINE_SECONDS);

    const chunk = GAME_SECONDS_PER_HOUR;
    let remaining = capped;
    while (remaining > 0) {
      const step = Math.min(chunk, remaining);
      remaining -= step;
      this.stepGameSeconds(step);
    }
  }
}
