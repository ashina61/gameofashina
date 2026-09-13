import type Phaser from 'phaser';
import { TIME_SCALE_OPTIONS } from '@/config/Constants';
import { BUILDINGS, getBuilding } from '@/config/BuildingCatalog';
import { getGod, wonderLevelFor } from '@/config/IslandCatalog';
import { RESEARCHES, getResearch } from '@/config/ResearchCatalog';
import { getShip, SHIPS, transportShip } from '@/config/ShipCatalog';
import { getUnit, UNITS } from '@/config/UnitCatalog';
import { TIER_NAMES, nextTier } from '@/config/Tiers';
import { PLAYER_ID } from '@/core/WorldFactory';
import { formatAmount, formatDuration, formatRate } from '@/utils/Format';
import { fleetProgress, missionGlyph, missionLabel } from '@/render/FleetVisual';
import type { GameWorld } from '@/core/GameWorld';
import type {
  CitySlotSelection,
  CityState,
  IslandSlotSelection,
  IslandState,
  MaterialKey,
  NpcCity,
  ShipStack,
  UnitStack,
  WorldSlotSelection,
} from '@/types';

/**
 * HTML arayuz katmani.
 *
 * SORUMLULUK SINIRI
 * Bu katman YALNIZCA iki sey yapar: durumu OKUR ve GameWorld'e EYLEM
 * gonderir. Oyun kurali burada yoktur; "yeterli kaynak var mi" sorusunu
 * bile sistemlere sorar ve aldigi gerekce metnini gosterir. Bu sinir
 * olmasa ayni kural hem sistemde hem arayuzde yasardi ve biri
 * degistiginde digeri sessizce yanlis mesaj verirdi.
 *
 * GUNCELLEME MODELİ
 * Ust cubuk her karede okunur (ucuz: birkac sayi). Paneller yalnizca
 * ACIKKEN ve durum degistiginde yeniden cizilir; kapali paneli her kare
 * yeniden kurmak bosuna is olurdu.
 */

/** Kaynak gorunum bilgisi. */
const RESOURCE_META: Record<MaterialKey | 'gold' | 'rp', { glyph: string; color: string; label: string }> = {
  wood: { glyph: '🪵', color: '#8a5a2b', label: 'Odun' },
  marble: { glyph: '🪨', color: '#dcd6c6', label: 'Mermer' },
  wine: { glyph: '🍷', color: '#7c2d4a', label: 'Şarap' },
  sulfur: { glyph: '🧨', color: '#c9a92c', label: 'Kükürt' },
  crystal: { glyph: '💎', color: '#6fc4d8', label: 'Kristal' },
  gold: { glyph: '🪙', color: '#e8b53f', label: 'Altın' },
  rp: { glyph: '🔬', color: '#7f9fd6', label: 'Araştırma' },
};

/** Acilir sayfa. */
type PageId =
  | 'city'
  | 'island'
  | 'world'
  | 'research'
  | 'military'
  | 'notices'
  | 'fleet'
  | 'report'
  | null;

/** Secili bina detayi icin bekleyen istek. */
interface SlotRequest {
  selection: CitySlotSelection;
}

export class Ui {
  private readonly root: HTMLElement;
  private readonly topbar: HTMLElement;
  private readonly nav: HTMLElement;
  private readonly backdrop: HTMLElement;
  private readonly sheet: HTMLElement;
  private readonly sheetHead: HTMLElement;
  private readonly sheetBody: HTMLElement;
  private readonly toasts: HTMLElement;

  private page: PageId = null;
  private slotRequest: SlotRequest | null = null;
  private islandSelection: IslandSlotSelection | null = null;
  private worldSelection: WorldSlotSelection | null = null;
  private researchBranch = 'economy';
  private militaryTab: 'units' | 'ships' | 'tiers' | 'fleets' = 'units';
  /** Acik filo sayfasinin filosu; sefer bitince sayfa bos durum gosterir. */
  private fleetId: string | null = null;
  /** Acik savas raporu sayfasinin raporu. */
  private reportId: string | null = null;
  /** Rota kurma formunun gecici durumu (sayfa yeniden cizilince korunur). */
  private routeForm: { toCityId: string; send: MaterialKey; bring: MaterialKey | 'none'; ships: number } | null = null;
  private quantity = 1;
  private rafId = 0;
  private readonly detach: Array<() => void> = [];

  constructor(
    private readonly world: GameWorld,
    private readonly game: Phaser.Game,
  ) {
    const host = document.getElementById('ui-root');
    if (!host) throw new Error('#ui-root bulunamadi - index.html degistirilmis olabilir.');
    this.root = host;
    this.root.innerHTML = '';

    this.topbar = this.el('div', 'topbar ui-hit');
    this.nav = this.el('div', 'bottomnav ui-hit');
    this.backdrop = this.el('div', 'backdrop');
    this.sheet = this.el('div', 'sheet ui-hit');
    this.sheetHead = this.el('div', 'sheet-head');
    this.sheetBody = this.el('div', 'sheet-body');
    this.toasts = this.el('div', 'toasts');

    this.sheet.append(this.sheetHead, this.sheetBody);
    this.root.append(this.topbar, this.toasts, this.backdrop, this.sheet, this.nav);

    this.backdrop.addEventListener('click', () => this.closePage());

    // Kamera, arayuzun ustune dokunuldugunda haritayi kaydirmamali.
    this.game.registry.set('uiHitTest', (x: number, y: number) => this.hitTest(x, y));

    this.buildNav();
    this.bind();
    // Olay isleyicileri kurulumda baglanir: ust cubuk ve sayfa govdesi
    // sayfa ACIK OLMADAN da tiklanabilir (hiz, duraklat, sehir degistirme).
    // wireSheet yalnizca renderPage'den cagrilirsa, hic sayfa acmayan bir
    // oyuncu ust cubugu hic kullanamazdi.
    this.wireSheet();
    this.loop();
  }

  // --- Yardimcilar ---------------------------------------------------------

  private el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    if (className) node.className = className;
    return node;
  }

  /** Ekran noktasi arayuz tarafindan kapatiliyor mu? */
  private hitTest(x: number, y: number): boolean {
    const element = document.elementFromPoint(x, y);
    if (!element) return false;
    if (!this.root.contains(element)) return false;
    // Yalnizca GERCEKTEN tiklanabilen ogeler dokunusu yutar; arka plan
    // kaplamalari haritaya gecirir.
    const interactive = element.closest('.ui-hit');
    if (!interactive) return false;
    return getComputedStyle(interactive).pointerEvents !== 'none';
  }

  private bind(): void {
    const bus = this.world.bus;
    const handlers = {
      'select:city-slot': (selection: CitySlotSelection) => this.onCitySlot(selection),
      'select:island-slot': (selection: IslandSlotSelection) => this.onIslandSlot(selection),
      'select:world-island': (selection: WorldSlotSelection) => this.onWorldIsland(selection),
      'notice:added': (title: string, body: string, tone: string) => this.toast(title, body, tone),
    } as const;

    bus.on('select:city-slot', handlers['select:city-slot']);
    bus.on('select:island-slot', handlers['select:island-slot']);
    bus.on('select:world-island', handlers['select:world-island']);
    bus.on('notice:added', handlers['notice:added']);
    bus.on('active-city:changed', () => this.refresh());
    bus.on('research:completed', () => this.refresh());
    // Haritada bir filoya dokunulunca sayfa buradan acilir: sahne ile
    // arayuz arasindaki tek bag EventBus'tir.
    const onFleet = (fleetId: string): void => this.openFleet(fleetId);
    bus.on('select:fleet', onFleet);
    bus.on('battle:resolved', () => {
      if (this.page === 'fleet' || this.page === 'military') this.renderPage();
    });
    bus.on('fleet:returned', () => {
      if (this.page === 'fleet' || this.page === 'military') this.renderPage();
    });

    this.detach.push(() => {
      bus.off('select:city-slot', handlers['select:city-slot']);
      bus.off('select:island-slot', handlers['select:island-slot']);
      bus.off('select:world-island', handlers['select:world-island']);
      bus.off('notice:added', handlers['notice:added']);
      bus.off('select:fleet', onFleet);
    });
  }

  /** Her karede ust cubugu tazele; sayfa aciksa onu da. */
  private loop = (): void => {
    this.rafId = requestAnimationFrame(this.loop);
    this.renderTopbar();
    if (this.page !== null) this.renderPage();
  };

  private toast(title: string, body: string, tone: string): void {
    const node = this.el('div', `toast ${tone}`);
    node.innerHTML = `<b></b><span></span>`;
    node.querySelector('b')!.textContent = title;
    node.querySelector('span')!.textContent = body;
    this.toasts.append(node);
    window.setTimeout(() => node.remove(), 4200);
    // Ayni anda en fazla uc bildirim: fazlasi ekrani kapatir.
    while (this.toasts.children.length > 3) this.toasts.firstElementChild?.remove();
  }

  /** Bir eylemi dener; basarisizsa gerekceyi gosterir. */
  private attempt(action: () => string | null, successMessage?: string): void {
    const reason = action();
    if (reason) {
      this.toast('Yapılamadı', reason, 'error');
      return;
    }
    if (successMessage) this.toast('Tamam', successMessage, 'success');
    this.refresh();
  }

  private refresh(): void {
    this.renderTopbar();
    this.renderPage();
  }

  // --- Ust cubuk -----------------------------------------------------------

  private renderTopbar(): void {
    const city = this.world.activeCity;
    if (!city) return;

    const snapshot = this.world.snapshot();
    if (!snapshot) return;

    const island = this.world.state.islandOf(city.islandId);
    const capacity = snapshot.storageCapacity;

    const chips: Array<{ key: MaterialKey | 'gold' | 'rp'; amount: number; rate: number; full: boolean }> = [
      { key: 'wood', amount: city.resources.wood, rate: snapshot.perHour.wood, full: city.resources.wood >= capacity },
      { key: island?.luxury ?? 'wine', amount: city.resources[island?.luxury ?? 'wine'], rate: snapshot.perHour[island?.luxury ?? 'wine'], full: city.resources[island?.luxury ?? 'wine'] >= capacity },
      { key: 'gold', amount: this.world.gold, rate: snapshot.goldPerHour, full: false },
      { key: 'rp', amount: this.world.researchPoints, rate: snapshot.researchPointsPerHour, full: false },
    ];

    const resourceHtml = chips
      .map((chip) => {
        const meta = RESOURCE_META[chip.key];
        const negative = chip.rate < 0;
        return `<div class="resource-chip ${negative ? 'negative' : ''} ${chip.full ? 'full' : ''}">
          <span class="dot" style="background:${meta.color}"></span>
          <span>
            <span class="amount">${formatAmount(Math.floor(chip.amount))}</span>
            <span class="rate">${formatRate(chip.rate)}/sa</span>
          </span>
        </div>`;
      })
      .join('');

    const unread = this.world.state.unreadNotices;
    const scale = this.world.timeScale;

    this.topbar.innerHTML = `
      <div class="resource-row">${resourceHtml}</div>
      <div class="topbar-controls">
        <button class="city-pill ui-hit" data-action="city-overview">
          <span class="name">${escapeHtml(city.name)}</span>
          <span class="meta">${snapshot.citizens}/${snapshot.maxPopulation} 👤  •  ${Math.round(snapshot.happiness)} 😊</span>
        </button>
        <div class="speed-pill">
          ${TIME_SCALE_OPTIONS.map((option) => `<button data-speed="${option}" class="${option === scale ? 'on' : ''}">${option}×</button>`).join('')}
          <button data-action="toggle-pause" title="Duraklat">${this.world.running ? '⏸' : '▶'}</button>
        </div>
        <button class="icon-button" data-action="island-overview" title="Ada">🏝️</button>
        <button class="icon-button" data-page="notices">📜${unread > 0 ? `<span class="badge">${unread}</span>` : ''}</button>
      </div>`;
  }

  // --- Alt gezinme ---------------------------------------------------------

  private buildNav(): void {
    const items: Array<{ id: PageId; glyph: string; label: string }> = [
      { id: 'city', glyph: '🏛️', label: 'Şehir' },
      { id: 'island', glyph: '🏝️', label: 'Ada' },
      { id: 'world', glyph: '🗺️', label: 'Dünya' },
      { id: 'research', glyph: '🔬', label: 'Bilim' },
      { id: 'military', glyph: '⚔️', label: 'Ordu' },
    ];

    this.nav.innerHTML = items
      .map((item) => `<button data-page="${item.id}" class="${this.page === item.id ? 'on' : ''}">
        <span class="glyph">${item.glyph}</span><span>${item.label}</span>
      </button>`)
      .join('');

    this.nav.addEventListener('click', (event) => {
      const button = (event.target as HTMLElement).closest('button[data-page]') as HTMLElement | null;
      if (!button) return;
      const id = button.dataset.page as Exclude<PageId, null>;
      this.openPage(id);
    });
  }

  private markNav(): void {
    for (const button of Array.from(this.nav.querySelectorAll('button[data-page]'))) {
      const htmlButton = button as HTMLButtonElement;
      htmlButton.classList.toggle('on', htmlButton.dataset.page === this.viewPage());
    }
  }

  /** Hangi gezinme sekmesi vurgulanmali (sayfa ile sahne ayni olmayabilir). */
  private viewPage(): string | null {
    if (this.page === 'city' || this.page === null) return this.activeSceneKey();
    return this.page;
  }

  private activeSceneKey(): string | null {
    const scenes = this.game.scene.getScenes(true);
    for (const scene of scenes) {
      if (scene.scene.key === 'CityScene') return 'city';
      if (scene.scene.key === 'IslandScene') return 'island';
      if (scene.scene.key === 'WorldScene') return 'world';
    }
    return null;
  }

  // --- Sayfa yonetimi ------------------------------------------------------

  private openPage(page: Exclude<PageId, null>): void {
    // Gorunum sayfalari ayni zamanda Phaser sahnesini de degistirir.
    if (page === 'city' || page === 'island' || page === 'world') {
      this.showScene(page === 'city' ? 'CityScene' : page === 'island' ? 'IslandScene' : 'WorldScene');
      this.closePage();
      this.world.bus.emit('view:changed', page);
      this.markNav();
      return;
    }
    this.page = page;
    this.backdrop.classList.add('on');
    this.backdrop.style.pointerEvents = 'auto';
    this.sheet.classList.add('on');
    this.markNav();
    this.renderPage();
  }

  private closePage(): void {
    this.page = null;
    this.slotRequest = null;
    this.islandSelection = null;
    this.worldSelection = null;
    this.sheet.classList.remove('on');
    this.backdrop.classList.remove('on');
    this.backdrop.style.pointerEvents = 'none';
    this.markNav();
  }

  /** Phaser sahnesini degistirir. */
  private showScene(key: string): void {
    const manager = this.game.scene;
    for (const scene of manager.getScenes(true)) {
      if (scene.scene.key !== key) manager.stop(scene.scene.key);
    }
    if (!manager.isActive(key)) manager.start(key);
  }

  /** Olay: sehir gorunumunde bir karoya dokunuldu. */
  private onCitySlot(selection: CitySlotSelection): void {
    this.slotRequest = { selection };
    this.page = 'city';
    this.backdrop.classList.add('on');
    this.backdrop.style.pointerEvents = 'auto';
    this.sheet.classList.add('on');
    this.renderPage();
  }

  private onIslandSlot(selection: IslandSlotSelection): void {
    this.islandSelection = selection;
    this.page = 'island';
    this.backdrop.classList.add('on');
    this.backdrop.style.pointerEvents = 'auto';
    this.sheet.classList.add('on');
    this.renderPage();
  }

  private onWorldIsland(selection: WorldSlotSelection): void {
    this.worldSelection = selection;
    this.page = 'world';
    this.backdrop.classList.add('on');
    this.backdrop.style.pointerEvents = 'auto';
    this.sheet.classList.add('on');
    this.renderPage();
  }

  /** Acik sayfayi cizer. */
  private renderPage(): void {
    if (this.page === null) return;

    switch (this.page) {
      case 'city': this.renderCityPage(); break;
      case 'island': this.renderIslandPage(); break;
      case 'world': this.renderWorldPage(); break;
      case 'research': this.renderResearchPage(); break;
      case 'military': this.renderMilitaryPage(); break;
      case 'notices': this.renderNoticesPage(); break;
      case 'fleet': this.renderFleetPage(); break;
      case 'report': this.renderReportPage(); break;
    }
    this.wireSheet();
  }

  /** Sayfa basligi ve govdesini kurar. */
  private setSheet(title: string, subtitle: string, bodyHtml: string): void {
    this.sheetHead.innerHTML = `
      <h2>${escapeHtml(title)}</h2>
      <span class="sub">${escapeHtml(subtitle)}</span>
      <button class="close-button" data-action="close">✕</button>`;
    this.sheetBody.innerHTML = bodyHtml;
    this.sheetBody.scrollTop = 0;
  }

  // --- Sehir sayfasi -------------------------------------------------------

  private renderCityPage(): void {
    const city = this.world.activeCity;
    if (!city) return;

    const selection = this.slotRequest?.selection ?? null;
    if (!selection) {
      this.setSheet(city.name, 'Bir binaya dokun', this.cityOverviewHtml(city));
      return;
    }

    if (selection.kind === 'empty') {
      this.setSheet('Kilitli alan', 'Valilik yükseltilince açılır', this.lockedGroundHtml(city));
      return;
    }

    if (selection.buildingId === '') {
      this.setSheet('Boş yapı alanı', `${city.name} • alan ${selection.ground + 1}`, this.buildPickerHtml(city, selection.ground));
      return;
    }

    const def = getBuilding(selection.buildingId);
    if (!def) {
      this.setSheet('Bina', '', '<div class="empty">Bina bulunamadı.</div>');
      return;
    }
    this.setSheet(def.name, `${city.name}`, this.buildingHtml(city, def.id, selection.ground));
  }

  private cityOverviewHtml(city: CityState): string {
    const snapshot = this.world.snapshot();
    if (!snapshot) return '';
    const happiness = this.world.systems.happiness.breakdown(city);
    const active = this.world.systems.construction.activeTasks(city);

    const constructions = active.length === 0
      ? '<div class="empty">Süren inşaat yok.</div>'
      : active
          .map(({ building, task }) => {
            const def = getBuilding(building.type);
            const progress = 1 - task.remainingGameSeconds / Math.max(1, task.durationGameSeconds);
            return `<div class="card">
              <h3>${escapeHtml(def?.name ?? building.type)} → Sv ${task.toLevel}</h3>
              <div class="bar"><i style="width:${Math.round(progress * 100)}%"></i></div>
              <div class="row">
                <span class="hint">${Math.max(1, Math.ceil(task.remainingGameSeconds / 60))} dakika kaldı</span>
                <button class="mini-btn ghost" data-action="cancel" data-building="${building.type}" data-ground="${building.ground}">İptal</button>
              </div>
            </div>`;
          })
          .join('');

    return `
      <div class="stat-grid">
        ${stat('Nüfus', `${snapshot.citizens}/${snapshot.maxPopulation}`)}
        ${stat('Mutluluk', `${Math.round(snapshot.happiness)}`)}
        ${stat('Fazla/Açık', `${snapshot.surplus >= 0 ? '+' : ''}${snapshot.surplus}`)}
        ${stat('Büyüme', `${formatRate(snapshot.growthPerHour)}/sa`)}
        ${stat('Depo', formatAmount(snapshot.storageCapacity))}
        ${stat('Yolsuzluk', `%${Math.round(snapshot.corruption * 100)}`)}
      </div>
      <div class="section-title">Vatandaş dağılımı</div>
      ${roleRow(city, 'wood', '🪵 Odun işçisi')}
      ${roleRow(city, 'luxury', `💎 ${RESOURCE_META[luxuryOf(this.world, city)].label} işçisi`)}
      ${roleRow(city, 'scientist', '🔬 Bilim adamı')}
      <div class="hint">Boşta ${snapshot.assignment.idle} vatandaş var; her biri saatte +3 altın getirir.</div>
      <div class="section-title">Mutluluk kaynakları</div>
      <div class="card">
        <div class="row">
          ${stat('Meyhane', Math.round(happiness.tavern).toString())}
          ${stat('Müze', Math.round(happiness.museum).toString())}
          ${stat('Araştırma', Math.round(happiness.researchAll + happiness.researchCapital).toString())}
        </div>
        <div class="row" style="margin-top:8px">
          <span class="hint">Dağıtılan şarap: ${city.tavernWine}</span>
          <button class="mini-btn" data-action="wine-minus">−</button>
          <button class="mini-btn" data-action="wine-plus">+</button>
        </div>
      </div>
      ${this.world.cities.length > 1
        ? `<div class="actions"><button class="btn secondary" data-action="city-list">Şehir değiştir</button></div>`
        : ''}
      <div class="section-title">Ticaret rotaları</div>
      ${this.routesHtml(city)}
      <div class="section-title">Süren inşaatlar</div>
      ${constructions}`;
  }

  private lockedGroundHtml(city: CityState): string {
    return `<div class="empty">Bu yapı alanı kapalı.<br>Valilik seviyesini yükselttikçe yeni alanlar açılır.</div>
      <div class="actions"><button class="btn" data-action="goto-townhall">Valiliği aç</button></div>
      ${stat('Valilik', `Sv ${city.townHall.level}`)}`;
  }

  private buildPickerHtml(city: CityState, ground: number): string {
    const rows = BUILDINGS.filter((def) => def.slot === 'ground')
      .map((def) => {
        const reason = this.world.systems.construction.canBuild(city, def.id, ground);
        const cost = this.world.systems.construction.costFor(city, def.id, 1);
        const unlocked = this.world.systems.research.buildingUnlocked(def.id);
        return `<div class="list-row ${reason ? 'locked' : ''}">
          <span class="glyph" style="background:#${def.tint.toString(16).padStart(6, '0')}">${def.name.slice(0, 1)}</span>
          <span class="body">
            <span class="t">${escapeHtml(def.name)}</span>
            <span class="d">${escapeHtml(def.description)}</span>
            ${costRow(cost, city, this.world)}
          </span>
          <span class="side">
            <button class="mini-btn" data-action="build" data-building="${def.id}" data-ground="${ground}" ${reason || !unlocked ? 'disabled' : ''}>Kur</button>
          </span>
        </div>`;
      })
      .join('');
    return `<div class="hint">${ground + 1}. yapı alanı. Kurmak istediğin binayı seç.</div>${rows}`;
  }

  private buildingHtml(city: CityState, buildingId: string, ground: number): string {
    const def = getBuilding(buildingId);
    if (!def) return '';
    const level = buildingLevelOf(city, buildingId, ground);
    const nextLevel = level + 1;
    const canUpgrade = level > 0;
    const reason = canUpgrade ? this.world.systems.construction.canUpgrade(city, buildingId, ground) : 'Bina henüz kurulmadı.';
    const cost = canUpgrade ? this.world.systems.construction.costFor(city, buildingId, nextLevel) : {};
    const time = this.world.systems.construction.timeFor(buildingId, nextLevel);
    const building = findPlaced(city, buildingId, ground);
    const task = building?.construction;

    const progressHtml = task
      ? `<div class="section-title">İnşaat sürüyor</div>
         <div class="bar"><i style="width:${Math.round((1 - task.remainingGameSeconds / Math.max(1, task.durationGameSeconds)) * 100)}%"></i></div>
         <div class="row">
           <span class="hint">${Math.max(1, Math.ceil(task.remainingGameSeconds / 60))} dakika kaldı</span>
           <button class="mini-btn ghost" data-action="cancel" data-building="${buildingId}" data-ground="${ground}">İptal et</button>
         </div>`
      : '';

    return `
      <div class="card">
        <h3>Seviye ${level}${level >= def.maxLevel ? ' (azami)' : ''}</h3>
        <p>${escapeHtml(def.description)}</p>
        ${buildingEffects(this.world, city, def.id, level)}
      </div>
      ${progressHtml}
      ${task ? '' : `
      <div class="section-title">Yükselt → Seviye ${nextLevel}</div>
      ${costRow(cost, city, this.world)}
      <div class="hint">Süre: ${Math.max(1, Math.round(time / 60))} dakika</div>
      <div class="actions">
        <button class="btn" data-action="upgrade" data-building="${buildingId}" data-ground="${ground}" ${reason ? 'disabled' : ''}>
          Yükselt
          ${reason ? `<span class="why">${escapeHtml(reason)}</span>` : ''}
        </button>
      </div>`}`;
  }

  // --- Ada sayfasi ---------------------------------------------------------

  private renderIslandPage(): void {
    const island = this.world.activeIsland();
    if (!island) return;

    if (!this.islandSelection) {
      this.setSheet(island.name, 'Bir alana dokun', this.islandOverviewHtml(island));
      return;
    }

    const plot = island.plots[this.islandSelection.plot];
    if (!plot) return;

    if (plot.ownerId === null) {
      this.setSheet(`Boş alan ${plot.index + 1}`, island.name, this.emptyPlotHtml(island, plot.index));
      return;
    }

    const npc = this.world.state.npcOf(plot.ownerId);
    if (npc) {
      this.setSheet(npc.name, `${npc.kind === 'barbarian' ? 'Barbar köyü' : 'Yerleşim'} • güç ${npc.powerLevel}`, this.npcHtml(island, npc));
      return;
    }

    const city = this.world.state.cities.find((c) => c.islandId === island.id && c.plot === plot.index);
    if (city) {
      this.setSheet(city.name, 'Kendi kolonin', this.ownCityHtml(city));
      return;
    }
    this.setSheet('Alan', '', '<div class="empty">Bilinmeyen yerleşim.</div>');
  }

  private islandOverviewHtml(island: IslandState): string {
    const god = getGod(island.god);
    const level = wonderLevelFor(island.faith);
    const wonders = this.world.systems.wonders;
    const activation = wonders.activationOf(island.id);
    const canActivate = wonders.canActivate(island.id);

    return `
      <div class="card">
        <h3>${escapeHtml(god.wonderName)} — Sv ${level}</h3>
        <p>${escapeHtml(god.wonderEffect)}</p>
        <div class="bar ok"><i style="width:${Math.round(island.faith)}%"></i></div>
        <div class="hint">İnanç %${Math.round(island.faith)}  •  her seviye %20 inanç ister</div>
        ${activation
          ? `<div class="hint"><b>Etkin:</b> ${Math.max(0, Math.ceil((activation.endsGameSeconds - this.world.state.gameSeconds) / 60))} dakika kaldı</div>`
          : `<div class="actions">
              <button class="btn" data-action="activate-wonder" ${canActivate ? 'disabled' : ''}>
                Harikayı etkinleştir
                ${canActivate ? `<span class="why">${escapeHtml(canActivate)}</span>` : ''}
              </button>
            </div>`}
        <div class="row" style="margin-top:8px">
          <span class="hint">Odun bağışla: 200 odun = 1 inanç</span>
          <button class="mini-btn" data-action="donate" data-amount="200">+200</button>
          <button class="mini-btn" data-action="donate" data-amount="2000">+2000</button>
        </div>
      </div>
      <div class="section-title">Ortak kaynak yatakları</div>
      ${this.depositRow(this.world, island, 'wood')}
      ${this.depositRow(this.world, island, island.luxury)}
      <div class="section-title">Adadaki yerleşimler</div>
      ${this.islandPlotsHtml(island)}`;
  }

  private islandPlotsHtml(island: IslandState): string {
    const rows = island.plots
      .map((plot) => {
        if (plot.ownerId === null) {
          return `<div class="list-row"><span class="glyph" style="background:#6c8f4a">＋</span>
            <span class="body"><span class="t">Alan ${plot.index + 1}</span><span class="d">Boş — koloni kurulabilir</span></span>
            <span class="side"><button class="mini-btn" data-action="pick-plot" data-plot="${plot.index}">Seç</button></span></div>`;
        }
        const npc = this.world.state.npcOf(plot.ownerId);
        if (npc) {
          return `<div class="list-row"><span class="glyph" style="background:${npc.kind === 'barbarian' ? '#8a5a3a' : '#8a3a3a'}">${npc.kind === 'barbarian' ? '⛺' : '🏘'}</span>
            <span class="body"><span class="t">${escapeHtml(npc.name)} <span class="lvl">güç ${npc.powerLevel}</span></span>
            <span class="d">Surlar ${npc.wallLevel} • ${this.world.systems.npc.summary(npc).garrison} birlik</span></span>
            <span class="side"><button class="mini-btn" data-action="pick-plot" data-plot="${plot.index}">Seç</button></span></div>`;
        }
        const city = this.world.state.cities.find((c) => c.islandId === island.id && c.plot === plot.index);
        if (city) {
          return `<div class="list-row"><span class="glyph" style="background:#4f8f3f">🏛</span>
            <span class="body"><span class="t">${escapeHtml(city.name)}</span><span class="d">Kendi kolonin</span></span>
            <span class="side"><button class="mini-btn" data-action="goto-city" data-city="${city.id}">Git</button></span></div>`;
        }
        return '';
      })
      .join('');
    return rows || '<div class="empty">Adada yerleşim yok.</div>';
  }

  private emptyPlotHtml(island: IslandState, plot: number): string {
    const city = this.world.activeCity;
    if (!city) return '';
    const reason = this.world.systems.island.canFoundColony(island.id, plot, city);
    const cost = this.world.systems.island.colonyCost(this.world.state.capital ?? city);
    const name = `Kolon ${island.name} ${plot + 1}`;

    return `<div class="card">
        <h3>Yeni koloni kur</h3>
        <p>Bu alana bir şehir kurarsın. Koloniler yolsuzluk üretir; her koloni için başkentteki Saray seviyesi yeterli olmalı ve buraya bir Vali Konağı kurulmalıdır.</p>
        ${costRow(cost, city, this.world)}
      </div>
      <div class="actions">
        <button class="btn ok" data-action="found-colony" data-island="${island.id}" data-plot="${plot}" data-name="${escapeHtml(name)}" ${reason ? 'disabled' : ''}>
          Koloni kur
          ${reason ? `<span class="why">${escapeHtml(reason)}</span>` : ''}
        </button>
      </div>`;
  }

  private npcHtml(island: IslandState, npc: NpcCity): string {
    const city = this.world.activeCity;
    if (!city) return '';
    const summary = this.world.systems.npc.summary(npc);
    const fleet = this.world.systems.fleet;
    const garrison = fleet.availableUnits(city);
    const ships = fleet.availableShips(city);
    const total = garrison.reduce((s, u) => s + u.count, 0);
    const volume = fleet.unitsVolume(garrison);
    const capacity = fleet.freeCargoShips(city) * 500;

    const canLoot = this.world.systems.npc.canLoot(npc);
    const tradeRows = (['wood', 'marble', 'wine', 'sulfur', 'crystal'] as MaterialKey[])
      .map((key) => {
        const stock = this.world.systems.npc.stockOf(npc, key);
        const buy = this.world.systems.npc.buyPrice(npc, key);
        const sell = this.world.systems.npc.sellPrice(npc, key);
        const meta = RESOURCE_META[key];
        return `<div class="list-row">
          <span class="glyph" style="background:${meta.color}">${meta.glyph}</span>
          <span class="body"><span class="t">${meta.label}</span>
            <span class="d">Stok ${formatAmount(stock)} • alış ${buy}🪙 • satış ${sell}🪙</span></span>
          <span class="side">
            <button class="mini-btn" data-action="buy" data-npc="${npc.id}" data-resource="${key}" data-amount="100" ${stock < 100 || this.world.gold < buy * 100 ? 'disabled' : ''}>100 al</button>
          </span>
        </div>`;
      })
      .join('');

    return `
      <div class="stat-grid">
        ${stat('Güç', String(npc.powerLevel))}
        ${stat('Surlar', String(npc.wallLevel))}
        ${stat('Garnizon', String(summary.garrison))}
        ${stat('Donanma', String(summary.ships))}
        ${stat('Depo', formatAmount(summary.wealth))}
        ${stat('Yağma', canLoot ? 'hazır' : 'bekliyor')}
      </div>
      <div class="section-title">Saldırı</div>
      <div class="card">
        <p>Şehrinde ${total} birlik var; ${volume} alan kaplıyorlar. Boş nakliye kapasiten ${capacity}.
        ${volume > capacity ? '<b>Birliklerin tamamı gemilere sığmıyor.</b>' : ''}</p>
        <div class="actions">
          <button class="btn danger" data-action="attack" data-island="${island.id}" data-plot="${npc.plot}" ${total <= 0 || volume > capacity ? 'disabled' : ''}>
            Tüm orduyla saldır
            ${total <= 0 ? '<span class="why">Önce birlik eğit</span>' : volume > capacity ? '<span class="why">Yeterli yük gemisi yok</span>' : ''}
          </button>
        </div>
        <div class="hint">Deniz üstünlüğü yoksa çıkarma engellenir: savunmanın savaş gemisi varken yalnızca kara birliği göndermek tüm orduyu kaybettirir.</div>
        ${summary.ships > 0 ? `<div class="hint"><b>Uyarı:</b> bu yerleşimin ${summary.ships} savaş gemisi var. Önce donanma göndermelisin.</div>` : ''}
      </div>
      <div class="section-title">Ticaret</div>
      ${tradeRows}
      <div class="hint">Seçili birlikler: ${garrison.map((u) => `${getUnit(u.id)?.name ?? u.id} ${u.count}`).join(', ') || 'yok'}
      • gemiler: ${ships.map((s) => `${getShip(s.id)?.name ?? s.id} ${s.count}`).join(', ') || 'yok'}</div>`;
  }

  private ownCityHtml(city: CityState): string {
    return `<div class="card"><h3>${escapeHtml(city.name)}</h3>
      <p>Nüfus ${city.citizens} • Valilik Sv ${city.townHall.level} • ${city.cargoShips} yük gemisi</p></div>
      <div class="actions"><button class="btn" data-action="goto-city" data-city="${city.id}">Şehri aç</button></div>`;
  }

  /** Ortak yatag satiri: seviye, maliyet ve yukseltme durumu. */
  private depositRow(world: GameWorld, island: IslandState, resource: MaterialKey): string {
    const deposit = resource === 'wood' ? island.wood : island.luxuryDeposit;
    const def = getBuilding(deposit.buildingId);
    const city = world.activeCity;
    if (!city) return '';
    const reason = world.systems.island.canUpgradeDeposit(island, resource, city);
    const cost = world.systems.island.depositCost(island, resource, city);
    const meta = RESOURCE_META[resource];

    return `<div class="list-row">
      <span class="glyph" style="background:${meta.color}">${meta.glyph}</span>
      <span class="body">
        <span class="t">${escapeHtml(def?.name ?? resource)} <span class="lvl">Sv ${deposit.level}</span></span>
        <span class="d">Adadaki tüm şehirler bu seviyeden faydalanır. ${deposit.construction ? 'Yükseltme sürüyor.' : ''}</span>
        ${costRow(cost, city, world)}
      </span>
      <span class="side">
        <button class="mini-btn" data-action="upgrade-deposit" data-resource="${resource}" ${reason || deposit.construction ? 'disabled' : ''}>Yükselt</button>
      </span>
    </div>`;
  }

  // --- Dunya sayfasi -------------------------------------------------------

  private renderWorldPage(): void {
    if (!this.worldSelection) {
      this.setSheet('Dünya', `${this.world.islands.length} ada`, this.worldListHtml());
      return;
    }
    const island = this.world.state.islandOf(this.worldSelection.islandId);
    if (!island) return;
    this.setSheet(island.name, `(${island.wx}, ${island.wy})`, this.worldIslandHtml(island));
  }

  private worldListHtml(): string {
    return this.world.islands
      .map((island) => {
        const god = getGod(island.god);
        const mine = this.world.state.playerCitiesOnIsland(island.id).length;
        const npcs = this.world.state.npcsOnIsland(island.id).length;
        const free = island.plots.filter((p) => p.ownerId === null).length;
        return `<div class="list-row">
          <span class="glyph" style="background:#${god.tint.toString(16).padStart(6, '0')}">${god.name.slice(0, 1)}</span>
          <span class="body"><span class="t">${escapeHtml(island.name)}</span>
            <span class="d">${god.name} • ${mine} kolonin • ${npcs} yerleşim • ${free} boş alan</span></span>
          <span class="side"><button class="mini-btn" data-action="pick-island" data-island="${island.id}">Git</button></span>
        </div>`;
      })
      .join('');
  }

  private worldIslandHtml(island: IslandState): string {
    const god = getGod(island.god);
    const mine = this.world.state.playerCitiesOnIsland(island.id);
    const free = island.plots.filter((p) => p.ownerId === null).length;
    return `<div class="card">
        <h3>${escapeHtml(god.wonderName)}</h3>
        <p>${escapeHtml(god.wonderEffect)}</p>
        <div class="stat-grid">
          ${stat('İnanç', `%${Math.round(island.faith)}`)}
          ${stat('Harika Sv', String(wonderLevelFor(island.faith)))}
          ${stat('Kolonin', String(mine.length))}
          ${stat('Boş alan', String(free))}
        </div>
      </div>
      <div class="actions">
        <button class="btn" data-action="goto-island" data-island="${island.id}">Ada görünümüne git</button>
      </div>`;
  }

  // --- Arastirma sayfasi ---------------------------------------------------

  private renderResearchPage(): void {
    const branches: Array<{ id: string; label: string }> = [
      { id: 'economy', label: 'Ekonomi' },
      { id: 'seafaring', label: 'Denizcilik' },
      { id: 'science', label: 'Bilim' },
      { id: 'military', label: 'Askeri' },
    ];

    const tabs = `<div class="tabs">${branches
      .map((b) => `<button data-branch="${b.id}" class="${this.researchBranch === b.id ? 'on' : ''}">${b.label}</button>`)
      .join('')}</div>`;

    const active = this.world.state.activeResearch;
    const activeHtml = active
      ? (() => {
          const def = getResearch(active.id);
          const progress = Math.min(1, active.progress / Math.max(1, active.totalPoints));
          return `<div class="card">
            <h3>${escapeHtml(def?.name ?? active.id)} — Sv ${active.level}</h3>
            <div class="bar"><i style="width:${Math.round(progress * 100)}%"></i></div>
            <div class="row">
              <span class="hint">${formatAmount(active.progress)} / ${formatAmount(active.totalPoints)} AP</span>
              <button class="mini-btn ghost" data-action="cancel-research">İptal</button>
            </div>
            <div class="hint">İptal edilirse biriken araştırma puanı GERİ VERİLMEZ.</div>
          </div>`;
        })()
      : '<div class="card"><p>Yürüyen araştırma yok. Bilim adamlarının ürettiği puan boşa gidiyor.</p></div>';

    const rows = RESEARCHES.filter((def) => def.branch === this.researchBranch)
      .map((def) => {
        const level = this.world.systems.research.levelOf(def.id);
        const nextLevel = this.world.systems.research.nextLevelOf(def.id);
        const reason = this.world.systems.research.canStart(def.id);
        const cost = this.world.systems.research.costOf(def.id);
        const done = nextLevel === null;
        return `<div class="list-row ${reason && !done ? 'locked' : ''}">
          <span class="glyph" style="background:#5a6f9a">🔬</span>
          <span class="body">
            <span class="t">${escapeHtml(def.name)} <span class="lvl">${done ? 'tamam' : `Sv ${level}`}</span></span>
            <span class="d">${escapeHtml(def.description)}</span>
            ${done ? '' : `<span class="d">Maliyet: ${formatAmount(cost)} AP • Akademi Sv ${def.requiredAcademyLevel}</span>`}
          </span>
          <span class="side">
            ${done ? '' : `<button class="mini-btn" data-action="research" data-id="${def.id}" ${reason ? 'disabled' : ''}>Başlat</button>`}
          </span>
        </div>
        ${reason && !done ? `<div class="hint" style="margin:-2px 0 8px">${escapeHtml(reason)}</div>` : ''}`;
      })
      .join('');

    const crystalHtml = `<div class="card">
        <h3>Kristal → Araştırma puanı</h3>
        <p>100 kristal 1 araştırma puanına çevrilir. Oran bilerek kötüdür: kristal bina maliyetlerinde en dar kaynaktır.</p>
        <div class="actions"><button class="btn secondary" data-action="convert-crystal" data-amount="100">100 kristal çevir</button></div>
      </div>`;

    this.setSheet('Araştırma', `${formatAmount(this.world.researchPoints)} AP`, tabs + activeHtml + crystalHtml + rows);
  }

  // --- Ordu sayfasi --------------------------------------------------------

  private renderMilitaryPage(): void {
    const city = this.world.activeCity;
    if (!city) return;

    const tabs = `<div class="tabs">
      <button data-mtab="units" class="${this.militaryTab === 'units' ? 'on' : ''}">Kışla</button>
      <button data-mtab="ships" class="${this.militaryTab === 'ships' ? 'on' : ''}">Tersane</button>
      <button data-mtab="tiers" class="${this.militaryTab === 'tiers' ? 'on' : ''}">Atölye</button>
      <button data-mtab="fleets" class="${this.militaryTab === 'fleets' ? 'on' : ''}">Filolar</button>
    </div>`;

    const queueHtml = this.queueHtml(city);
    const upkeep = this.world.systems.economy.upkeepPerHour();

    if (this.militaryTab === 'fleets') {
      const fleets = this.world.state.fleets;
      this.setSheet('Filolar', `${fleets.length} seferde`, tabs + this.fleetsHtml());
      return;
    }

    if (this.militaryTab === 'tiers') {
      this.setSheet('Atölye', `Bakım ${formatAmount(upkeep)}🪙/sa`, tabs + this.tiersHtml(city));
      return;
    }

    if (this.militaryTab === 'ships') {
      this.setSheet('Tersane', `${city.cargoShips} yük gemisi • bakım ${formatAmount(upkeep)}🪙/sa`, tabs + queueHtml + this.shipyardHtml(city));
      return;
    }

    this.setSheet('Kışla', `${this.world.systems.fleet.garrisonCount(city)} birlik • bakım ${formatAmount(upkeep)}🪙/sa`, tabs + queueHtml + this.barracksHtml(city));
  }

  private queueHtml(city: CityState): string {
    const render = (label: string, queue: typeof city.unitQueue) => {
      if (queue.length === 0) return '';
      return `<div class="section-title">${label}</div>` + queue
        .map((task, index) => {
          const def = getUnit(task.id) ?? getShip(task.id);
          const progress = 1 - task.remainingGameSeconds / Math.max(1, task.count * task.perUnitGameSeconds);
          return `<div class="list-row">
            <span class="glyph" style="background:#7a6a4a">⏳</span>
            <span class="body"><span class="t">${escapeHtml(def?.name ?? task.id)} × ${task.count}</span>
            <div class="bar"><i style="width:${Math.round(progress * 100)}%"></i></div>
            <span class="d">${Math.max(1, Math.ceil(task.remainingGameSeconds / 60))} dakika kaldı</span></span>
            <span class="side"><button class="mini-btn ghost" data-action="cancel-queue" data-kind="${label === 'Kışla kuyruğu' ? 'unit' : 'ship'}" data-index="${index}">İptal</button></span>
          </div>`;
        })
        .join('');
    };
    return render('Kışla kuyruğu', city.unitQueue) + render('Tersane kuyruğu', city.shipQueue);
  }

  private barracksHtml(city: CityState): string {
    const trainable = this.world.systems.military.trainableUnits(city);
    const locked = UNITS.filter((def) => !trainable.some((u) => u.id === def.id));

    const rows = (list: typeof UNITS, showLock: boolean) => list
      .map((def) => {
        const owned = city.garrison.filter((g) => g.id === def.id).reduce((s, g) => s + g.count, 0);
        const cost = this.world.systems.military.unitCost(city, def.id, this.quantity);
        const reason = showLock ? this.world.systems.military.unitLock(city, def.id) : null;
        const tier = this.world.state.unitTier(def.id);
        return `<div class="list-row ${reason ? 'locked' : ''}">
          <span class="glyph" style="background:#${def.tint.toString(16).padStart(6, '0')}">⚔</span>
          <span class="body">
            <span class="t">${escapeHtml(def.name)} <span class="lvl">${owned > 0 ? `×${owned} • ${TIER_NAMES[tier]}` : ''}</span></span>
            <span class="d">${escapeHtml(def.description)}</span>
            ${costRow(cost, city, this.world)}
            <span class="d">Bakım ${def.upkeepGold}🪙/sa • Kışla Sv ${def.requiredBarracksLevel}</span>
          </span>
          <span class="side">
            <button class="mini-btn" data-action="train" data-id="${def.id}" ${reason ? 'disabled' : ''}>${this.quantity} eğit</button>
            ${reason ? `<div class="hint" style="max-width:120px">${escapeHtml(reason)}</div>` : ''}
          </span>
        </div>`;
      })
      .join('');

    return `${stepper(this.quantity)}
      ${rows(trainable.map((u) => getUnit(u.id)!).filter(Boolean), false)}
      ${locked.length > 0 ? `<div class="section-title">Kilitli</div>${rows(locked, true)}` : ''}`;
  }

  private shipyardHtml(city: CityState): string {
    const buildable = this.world.systems.military.buildableShips(city);
    const locked = SHIPS.filter((def) => !buildable.some((s) => s.id === def.id));

    const rows = (list: typeof SHIPS, showLock: boolean) => list
      .map((def) => {
        const owned = city.warfleet.filter((g) => g.id === def.id).reduce((s, g) => s + g.count, 0);
        const cost = this.world.systems.military.shipCost(city, def.id, this.quantity);
        const reason = showLock ? this.world.systems.military.shipLock(city, def.id) : null;
        return `<div class="list-row ${reason ? 'locked' : ''}">
          <span class="glyph" style="background:#${def.tint.toString(16).padStart(6, '0')}">🚢</span>
          <span class="body">
            <span class="t">${escapeHtml(def.name)} <span class="lvl">${owned > 0 ? `×${owned}` : ''}</span></span>
            <span class="d">${escapeHtml(def.description)}</span>
            ${costRow(cost, city, this.world)}
            <span class="d">Bakım ${def.upkeepGold}🪙/sa • Tersane Sv ${def.requiredShipyardLevel}${def.cargo ? ` • ${def.cargo} ambar` : ''}</span>
          </span>
          <span class="side"><button class="mini-btn" data-action="build-ship" data-id="${def.id}" ${reason ? 'disabled' : ''}>${this.quantity} yap</button></span>
        </div>`;
      })
      .join('');

    const transport = transportShip();
    return `<div class="card">
        <h3>Yük gemileri: ${city.cargoShips}</h3>
        <p>Her yük gemisi 500 kaynak veya asker taşır. Yük gemisi olmadan ne ticaret ne çıkarma yapılabilir.</p>
        <div class="actions"><button class="btn" data-action="build-ship" data-id="${transport.id}">+${this.quantity} yük gemisi</button></div>
      </div>
      ${stepper(this.quantity)}
      ${rows(buildable.map((s) => getShip(s.id)!).filter(Boolean), false)}
      ${locked.length > 0 ? `<div class="section-title">Kilitli</div>${rows(locked, true)}` : ''}`;
  }

  private tiersHtml(city: CityState): string {
    const kinds: Array<{ kind: 'unit' | 'ship'; label: string }> = [
      { kind: 'unit', label: 'Birlikler' },
      { kind: 'ship', label: 'Gemiler' },
    ];

    return kinds
      .map(({ kind, label }) => {
        const owned = kind === 'unit' ? city.garrison : city.warfleet;
        const ids = Array.from(new Set(owned.map((s) => s.id)));
        const rows = ids
          .map((id) => {
            const tier = kind === 'unit' ? this.world.state.unitTier(id) : this.world.state.shipTier(id);
            const next = nextTier(tier);
            const def = kind === 'unit' ? getUnit(id) : getShip(id);
            const reason = this.world.systems.military.canUpgradeTier(city, kind, id);
            const cost = next ? this.world.systems.military.tierCost(city, kind, id) : {};
            return `<div class="list-row">
              <span class="glyph" style="background:#${(def?.tint ?? 0x888888).toString(16).padStart(6, '0')}">🛠</span>
              <span class="body"><span class="t">${escapeHtml(def?.name ?? id)} <span class="lvl">${TIER_NAMES[tier]}</span></span>
              ${next ? `<span class="d">→ ${TIER_NAMES[next]}</span>${costRow(cost, city, this.world)}` : '<span class="d">Azami kademe</span>'}
              ${reason && next ? `<span class="d">${escapeHtml(reason)}</span>` : ''}</span>
              <span class="side">${next ? `<button class="mini-btn" data-action="tier" data-kind="${kind}" data-id="${id}" ${reason ? 'disabled' : ''}>Yükselt</button>` : ''}</span>
            </div>`;
          })
          .join('');
        return `<div class="section-title">${label}</div>${rows || '<div class="empty">Bu türde birimin yok.</div>'}`;
      })
      .join('');
  }

  // --- Posta ---------------------------------------------------------------

  private renderNoticesPage(): void {
    const notices = [...this.world.state.notices].reverse();
    const rows = notices.length === 0
      ? '<div class="empty">Henüz bildirim yok.</div>'
      : notices
          .map((notice) => `<div class="card">
            <h3>${escapeHtml(notice.title)}</h3>
            <p>${escapeHtml(notice.body)}</p>
            <div class="hint">Saat ${Math.floor(notice.atTick)}</div>
          </div>`)
          .join('');

    // Ikariam'da savas raporlari posta kutusunun kalici bir bolumudur:
    // bildirim akar gider ama rapor sonra tekrar okunabilir.
    const reports = this.world.state.reports;
    const reportRows = reports.length === 0
      ? ''
      : `<div class="section-title">Savaş raporları</div>` +
        reports
          .map(
            (report) => `<div class="list-row">
              <span class="glyph" style="background:${report.won ? 'var(--ok)' : 'var(--bad)'}">${report.won ? '🏆' : '💀'}</span>
              <div class="body">
                <div class="t">${escapeHtml(report.defenderName)} <span class="lvl">${report.won ? 'zafer' : 'yenilgi'}</span></div>
                <div class="d">${escapeHtml(report.islandName)} • ${report.rounds} tur • saat ${Math.floor(report.atTick)}</div>
              </div>
              <button class="mini-btn ghost" data-action="open-report" data-id="${report.id}">Rapor</button>
            </div>`,
          )
          .join('');

    this.setSheet('Posta', `${this.world.state.unreadNotices} okunmamış`, reportRows + rows);
    this.world.markNoticesRead();
  }

  // --- Filo ve savas raporu sayfalari -------------------------------------

  /** Haritada filoya dokunulunca cagrilir. */
  private openFleet(fleetId: string): void {
    this.fleetId = fleetId;
    this.showSheetPage('fleet');
  }

  /** Yoldaki tum filolarin listesi (askeri sayfanin sekmesi). */
  private fleetsHtml(): string {
    const fleets = this.world.state.fleets;
    if (fleets.length === 0) {
      return '<div class="empty">Yolda filo yok.<br>Kışla veya tersaneden birlik gönder.</div>';
    }
    return fleets
      .map((fleet) => {
        const from = this.world.state.cityOf(fleet.fromCityId)?.name ?? '?';
        const toIsland = this.world.state.islandOf(fleet.toIslandId)?.name ?? '?';
        const target = fleet.toCityId
          ? this.world.state.cityOf(fleet.toCityId)?.name ?? this.world.state.npcOf(fleet.toCityId)?.name ?? ''
          : '';
        const route = fleet.returning ? `${toIsland} → ${from}` : `${from} → ${toIsland}${target ? ` / ${target}` : ''}`;
        return `<div class="list-row" data-action="open-fleet" data-id="${fleet.id}" style="cursor:pointer">
          <span class="glyph" style="background:#5c6b7f">${missionGlyph(fleet.mission)}</span>
          <div class="body">
            <div class="t">${missionLabel(fleet.mission)}${fleet.returning ? ' (dönüş)' : ''}</div>
            <div class="d">${escapeHtml(route)} • kalan ${formatDuration(fleet.remainingGameSeconds)}</div>
          </div>
          <span class="mini-btn ghost">Detay</span>
        </div>`;
      })
      .join('');
  }

  /** Tek filonun detay sayfası: yuk, birlikler, ETA ve geri cagirma. */
  private renderFleetPage(): void {
    const fleet = this.world.state.fleets.find((f) => f.id === this.fleetId);
    if (!fleet) {
      this.setSheet('Filo', '', '<div class="empty">Bu filo seferini tamamladı.<br>Birlikler şehre döndü.</div>');
      return;
    }

    const from = this.world.state.cityOf(fleet.fromCityId)?.name ?? '?';
    const toIsland = this.world.state.islandOf(fleet.toIslandId)?.name ?? '?';
    const target = fleet.toCityId
      ? this.world.state.cityOf(fleet.toCityId)?.name ?? this.world.state.npcOf(fleet.toCityId)?.name ?? ''
      : '';
    const route = fleet.returning ? `${toIsland} → ${from}` : `${from} → ${toIsland}${target ? ` / ${target}` : ''}`;

    const progress = Math.round(fleetProgress(fleet) * 100);
    const realSeconds = Math.ceil(fleet.remainingGameSeconds / Math.max(1, this.world.timeScale));

    const unitRows = fleet.units.length === 0
      ? ''
      : fleet.units
          .map((u) => `<span class="cost">${formatAmount(u.count)}× ${escapeHtml(getUnit(u.id)?.name ?? u.id)}</span>`)
          .join('');
    const shipRows = fleet.ships.length === 0
      ? ''
      : fleet.ships
          .map((u) => `<span class="cost">${formatAmount(u.count)}× ${escapeHtml(getShip(u.id)?.name ?? u.id)}</span>`)
          .join('');
    const cargoEntries = Object.entries(fleet.cargo).filter(([, v]) => (v ?? 0) > 0);
    const cargoRows = cargoEntries.length === 0
      ? ''
      : cargoEntries.map(([k, v]) => `<span class="cost">${formatAmount(v ?? 0)}× ${escapeHtml(k)}</span>`).join('');

    this.setSheet(
      `${missionGlyph(fleet.mission)} ${missionLabel(fleet.mission)}${fleet.returning ? ' (dönüş)' : ''}`,
      route,
      `<div class="card">
        <div class="bar ${progress >= 100 ? 'ok' : ''}"><i style="width:${progress}%"></i></div>
        <div class="hint">Kalan oyun süresi ${formatDuration(fleet.remainingGameSeconds)} • mevcut hızda ≈${realSeconds} sn</div>
        <div class="row costs">${unitRows}${shipRows}</div>
        ${cargoRows ? `<div class="section-title">Ambar</div><div class="row costs">${cargoRows}</div>` : ''}
        <div class="hint">${fleet.cargoShips} yük gemisi eşlik ediyor.</div>
        ${
          fleet.returning
            ? ''
            : `<div class="actions"><button class="btn secondary" data-action="recall-fleet">Geri çağır</button></div>`
        }
      </div>`,
    );
  }

  /**
   * Savas raporu: Ikariam'in tur tur dokumu.
   *
   * Raporun govdesi `roundLog`'dur: her tur icin iki tarafin kalan
   * birlikleri, surun cani ve savunanin morali. Kayiplar ardisik iki
   * turun farkindan okunur; tipki Ikariam'da oldugu gibi.
   */
  private renderReportPage(): void {
    const report = this.world.state.reports.find((r) => r.id === this.reportId);
    if (!report) {
      this.setSheet('Savaş raporu', '', '<div class="empty">Rapor bulunamadı.</div>');
      return;
    }

    const stackName = (id: string): string => getUnit(id)?.name ?? getShip(id)?.name ?? id;
    const lossRow = (label: string, units: { id: string; count: number }[], ships: { id: string; count: number }[]): string => {
      const parts = [
        ...units.map((u) => `${formatAmount(u.count)}× ${escapeHtml(stackName(u.id))}`),
        ...ships.map((u) => `${formatAmount(u.count)}× ${escapeHtml(stackName(u.id))} (gemi)`),
      ];
      return `<div class="card"><h3>${label}</h3><p>${parts.length === 0 ? 'Kayıp yok.' : parts.join(', ')}</p></div>`;
    };

    const phases: Array<'sea' | 'land'> = ['sea', 'land'];
    const roundHtml = phases
      .map((phase) => {
        const entries = report.roundLog.filter((e) => e.phase === phase);
        if (entries.length === 0) return '';
        const title = phase === 'sea' ? 'Deniz savaşı' : 'Kara savaşı';
        const rows = entries
          .map((entry) => {
            const left = entry.attacker.filter((g) => g.count > 0);
            const right = entry.defender.filter((g) => g.count > 0);
            const leftText = left.length === 0 ? '—' : left.map((g) => `${g.count}× ${escapeHtml(stackName(g.id))}`).join(', ');
            const rightText = right.length === 0 ? '—' : right.map((g) => `${g.count}× ${escapeHtml(stackName(g.id))}`).join(', ');
            return `<div class="list-row">
              <div class="body">
                <div class="t">Tur ${entry.round}</div>
                <div class="d">️ ${leftText}<br>🛡️ ${rightText}</div>
                <div class="d">Sur ${formatAmount(entry.wallHp)} can • moral ${entry.defenderMorale}</div>
              </div>
            </div>`;
          })
          .join('');
        return `<div class="section-title">${title}</div>${rows}`;
      })
      .join('');

    const lootEntries = Object.entries(report.loot).filter(([, v]) => (v ?? 0) > 0);
    const lootHtml = lootEntries.length === 0
      ? '<p>Yağma yok.</p>'
      : `<p>${lootEntries.map(([k, v]) => `${formatAmount(v ?? 0)}× ${escapeHtml(k)}`).join(', ')}</p>`;

    this.setSheet(
      report.won ? '🏆 Zafer' : '💀 Yenilgi',
      `${report.attackerName} → ${report.defenderName}`,
      `<div class="card">
        <h3>${escapeHtml(report.islandName)}</h3>
        <p>${report.rounds} tur sürdü${report.wallDamage > 0 ? `, surlara ${formatAmount(report.wallDamage)} hasar` : ''}.</p>
        ${lootHtml}
      </div>
      ${lossRow('Bizim kayıplar', report.losses.attacker, report.losses.attackerShips)}
      ${lossRow('Düşman kayıpları', report.losses.defender, report.losses.defenderShips)}
      ${roundHtml || '<div class="empty">Çarpışma tur kaydı yok.</div>'}`,
    );
  }

  /**
   * Ticaret rotalari bolumu: aktif rotalar + kurma formu.
   *
   * Ikariam'da rota iki sehir arasinda KALICIDIR ve her devirde otomatik
   * mal tasir. Form, oyuncuya giden/donen mali ve rotaya ayrilacak yuk
   * gemisi sayisini sectirir; ayrilan gemiler baska sevkiyatta
   * kullanilamaz (FleetSystem bunu kapasitede dusuyor).
   */
  private routesHtml(city: CityState): string {
    const routes = this.world.state.tradeRoutes.filter((r) => r.fromCityId === city.id);
    const list = routes.length === 0
      ? '<div class="hint">Bu şehirden kalkan rota yok.</div>'
      : routes
          .map((route) => {
            const to = this.world.state.cityOf(route.toCityId);
            const inTransit = this.world.state.fleets.some((f) => f.routeId === route.id);
            return `<div class="list-row">
              <span class="glyph" style="background:var(--gold-deep)">🔁</span>
              <div class="body">
                <div class="t">${escapeHtml(to?.name ?? '?')} <span class="lvl">${route.cargoShips} gemi</span></div>
                <div class="d">${route.send} → ${route.bring ?? 'boş dönüş'} • ${route.cycles} devir • ${
                  inTransit ? 'yolda' : `kalkış ${formatDuration(Math.max(0, route.nextDepartureIn))}`
                }</div>
              </div>
              <button class="mini-btn ghost" data-action="cancel-route" data-id="${route.id}">Kaldır</button>
            </div>`;
          })
          .join('');

    const others = this.world.cities.filter((c) => c.id !== city.id);
    if (others.length === 0) {
      return `${list}<div class="hint">Rota kurmak için ikinci bir şehrin olmalı: bir NPC yerleşimini ele geçir veya boş bir alana koloni kur.</div>`;
    }

    if (!this.routeForm || !others.some((c) => c.id === this.routeForm?.toCityId)) {
      this.routeForm = { toCityId: others[0].id, send: 'wood', bring: 'none', ships: 1 };
    }
    const form = this.routeForm;
    const materials: MaterialKey[] = ['wood', 'marble', 'wine', 'sulfur', 'crystal'];
    const option = (key: MaterialKey | 'none', current: string): string =>
      `<option value="${key}" ${current === key ? 'selected' : ''}>${key === 'none' ? 'Boş dönüş' : RESOURCE_META[key].label}</option>`;

    return `${list}
      <div class="card">
        <h3>Yeni rota</h3>
        <div class="row" style="gap:6px">
          <select class="field" name="route-to">${others.map((c) => `<option value="${c.id}" ${form.toCityId === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}</select>
        </div>
        <div class="row" style="margin-top:6px;gap:6px">
          <select class="field" name="route-send">${materials.map((m) => option(m, form.send)).join('')}</select>
          <select class="field" name="route-bring">${materials.map((m) => option(m, form.bring)).join('')}${option('none', form.bring)}</select>
        </div>
        <div class="row" style="margin-top:6px">
          <span class="hint">Yük gemisi</span>
          <button class="mini-btn ghost" data-action="route-ships-minus">−</button>
          <span class="value">${form.ships}</span>
          <button class="mini-btn ghost" data-action="route-ships-plus">+</button>
          <span class="hint">boş: ${this.world.systems.fleet.freeCargoShips(city)}</span>
        </div>
        <div class="actions"><button class="btn" data-action="create-route">Rotayı kur</button></div>
      </div>`;
  }

  // --- Olay baglama --------------------------------------------------------

  private wireSheet(): void {
    const body = this.sheetBody;
    body.onclick = (event) => {
      const element = event.target as HTMLElement;
      // Sekme butonlari eylem degil sekme tasir; once onlar denenir.
      const tab = element.closest('[data-mtab]') as HTMLElement | null;
      if (tab) {
        this.militaryTab = (tab.dataset.mtab ?? 'units') as typeof this.militaryTab;
        this.renderPage();
        return;
      }
      const target = element.closest('[data-action]') as HTMLElement | null;
      if (!target) return;
      this.dispatch(target.dataset.action ?? '', target.dataset);
    };

    // Select degisiklikleri eylem degildir; form durumuna yazilir ve
    // sayfa yeniden cizilir ki secili degerler korunmus gorunsun.
    body.onchange = (event) => {
      const select = event.target as HTMLSelectElement;
      if (select.tagName !== 'SELECT' || !this.routeForm) return;
      const name = select.getAttribute('name');
      if (name === 'route-to') this.routeForm.toCityId = select.value;
      else if (name === 'route-send') this.routeForm.send = select.value as MaterialKey;
      else if (name === 'route-bring') this.routeForm.bring = select.value as MaterialKey | 'none';
      else return;
      this.renderPage();
    };

    const head = this.sheetHead;
    head.onclick = (event) => {
      const target = (event.target as HTMLElement).closest('[data-action]') as HTMLElement | null;
      if (target?.dataset.action === 'close') this.closePage();
    };

    // Ust cubuk olaylari
    this.topbar.onclick = (event) => {
      const speedButton = (event.target as HTMLElement).closest('button[data-speed]') as HTMLElement | null;
      if (speedButton) {
        this.world.setScale(Number(speedButton.dataset.speed));
        this.renderTopbar();
        return;
      }
      // Ust cubuktaki sayfa ikonlari (posta vb.) data-page tasir.
      const pageButton = (event.target as HTMLElement).closest('[data-page]') as HTMLElement | null;
      if (pageButton && !pageButton.hasAttribute('data-action') && !pageButton.hasAttribute('data-speed')) {
        this.openPage(pageButton.dataset.page as Exclude<PageId, null>);
        return;
      }
      const actionButton = (event.target as HTMLElement).closest('[data-action]') as HTMLElement | null;
      if (!actionButton) return;
      const action = actionButton.dataset.action;
      if (action === 'toggle-pause') {
        this.world.togglePause();
        this.renderTopbar();
      } else if (action === 'city-overview') {
        this.openCityOverview();
      } else if (action === 'island-overview') {
        this.openIslandOverview();
      } else if (action === 'notices') {
        this.openPage('notices');
      }
    };
  }

  /** Sehir ozet sayfasini acar (vatandas, sarap, insaatlar). */
  private openCityOverview(): void {
    this.slotRequest = null;
    this.showSheetPage('city');
  }

  /** Ada ozet sayfasini acar (harika, bagis, ortak yataklar). */
  private openIslandOverview(): void {
    this.islandSelection = null;
    this.showSheetPage('island');
  }

  /** Bir sayfayi ozet gorunumuyle acar. */
  private showSheetPage(page: Exclude<PageId, null>): void {
    this.page = page;
    this.backdrop.classList.add('on');
    this.backdrop.style.pointerEvents = 'auto';
    this.sheet.classList.add('on');
    this.markNav();
    this.renderPage();
  }

  /** Sehir degistirme listesi. */
  private openCityList(): void {
    if (this.world.cities.length <= 1) {
      this.toast('Tek şehir', 'Henüz bir kolonin yok. Ada görünümünden boş bir alan seçip koloni kur.', 'info');
      return;
    }
    this.showSheetPage('city');
    const rows = this.world.cities
      .map((city) => `<div class="list-row">
        <span class="glyph" style="background:#4f8f3f">🏛</span>
        <span class="body"><span class="t">${escapeHtml(city.name)}</span>
        <span class="d">Nüfus ${city.citizens} • Valilik Sv ${city.townHall.level} • ${city.cargoShips} yük gemisi</span></span>
        <span class="side"><button class="mini-btn" data-action="switch-city" data-city="${city.id}">Aç</button></span>
      </div>`)
      .join('');
    this.setSheet('Şehirlerin', `${this.world.cities.length} koloni`, rows);
    this.wireSheet();
  }

  /** Eylemleri GameWorld'e iletir. */
  private dispatch(action: string, data: DOMStringMap): void {
    const city = this.world.activeCity;

    switch (action) {
      case 'close':
        this.closePage();
        return;
      case 'qty-minus':
        this.quantity = Math.max(1, this.quantity - 1);
        this.refresh();
        return;
      case 'qty-plus':
        this.quantity = Math.min(500, this.quantity + 1);
        this.refresh();
        return;
      case 'qty-max':
        this.quantity = 100;
        this.refresh();
        return;
      case 'toggle-pause':
        this.world.togglePause();
        this.refresh();
        return;
      case 'city-list':
        this.openCityList();
        return;
      case 'open-fleet':
        this.openFleet(data.id ?? '');
        return;
      case 'open-report':
        this.reportId = data.id ?? null;
        this.showSheetPage('report');
        return;
      case 'route-ships-minus':
      case 'route-ships-plus': {
        if (!this.routeForm) return;
        const delta = action === 'route-ships-plus' ? 1 : -1;
        this.routeForm.ships = Math.min(99, Math.max(1, this.routeForm.ships + delta));
        this.renderPage();
        return;
      }
      case 'create-route': {
        const city = this.world.activeCity;
        const form = this.routeForm;
        if (!city || !form) return;
        const error = this.world.createTradeRoute(
          city.id,
          form.toCityId,
          form.send,
          form.bring === 'none' ? null : form.bring,
          form.ships,
        );
        this.toast(
          error ? 'Rota kurulamadı' : 'Rota kuruldu',
          error ?? 'İlk devir birazdan yola çıkacak.',
          error ? 'error' : 'success',
        );
        this.renderPage();
        return;
      }
      case 'cancel-route':
        this.world.cancelTradeRoute(data.id ?? '');
        this.toast('Rota kaldırıldı', 'Ayrılan yük gemileri serbest kaldı.', 'info');
        this.renderPage();
        return;
      case 'recall-fleet': {
        const ok = this.world.systems.fleet.recall(this.fleetId ?? '');
        this.toast(
          ok ? 'Filo geri çağrıldı' : 'Geri çağrılamadı',
          ok ? 'Filo eve dönüş yoluna geçti.' : 'Filo zaten dönüş yolunda.',
          ok ? 'success' : 'warn',
        );
        this.renderPage();
        return;
      }
      case 'switch-city':
      case 'goto-city':
        this.world.setActiveCity(data.city ?? '');
        this.closePage();
        this.showScene('CityScene');
        return;
      case 'goto-townhall':
        this.slotRequest = { selection: { cityId: city?.id ?? '', kind: 'town_hall', buildingId: 'town_hall', ground: -1 } };
        this.renderPage();
        return;
      case 'build':
        this.attempt(() => this.world.build(data.building ?? '', Number(data.ground)), 'İnşaat başladı.');
        return;
      case 'upgrade':
        this.attempt(() => this.world.upgrade(data.building ?? '', Number(data.ground)), 'Yükseltme başladı.');
        return;
      case 'cancel':
        this.world.cancelConstruction(data.building ?? '', Number(data.ground));
        this.refresh();
        return;
      case 'upgrade-deposit':
        this.attempt(() => this.world.upgradeDeposit((data.resource ?? 'wood') as MaterialKey), 'Yatak yükseltiliyor.');
        return;
      case 'role-minus':
      case 'role-plus': {
        const role = (data.role ?? 'wood') as 'wood' | 'luxury' | 'scientist';
        const delta = action === 'role-plus' ? 1 : -1;
        // Atama kapasiteye takilirsa sistem uyguladigi kadarini dondurur;
        // arayuz ayrica sinir kontrolu YAPMAZ, cunku kapasite kurallari
        // (arastirma, bina seviyesi, Helping Hands) sistemde yasar.
        const applied = this.world.assign(role, delta);
        if (applied === 0 && delta > 0) {
          this.toast('Atanamadı', 'Bu rol için kapasite dolu. İlgili binayı yükselt.', 'warn');
        }
        this.refresh();
        return;
      }
      case 'wine-plus':
        if (city) this.world.serveWine(city.tavernWine + 1);
        this.refresh();
        return;
      case 'wine-minus':
        if (city) this.world.serveWine(city.tavernWine - 1);
        this.refresh();
        return;
      case 'research':
        this.attempt(() => this.world.startResearch(data.id ?? ''), 'Araştırma başladı.');
        return;
      case 'cancel-research':
        this.world.cancelResearch();
        this.refresh();
        return;
      case 'convert-crystal':
        this.attempt(() => this.world.convertCrystal(Number(data.amount ?? 100)));
        return;
      case 'train':
        this.attempt(() => this.world.train(data.id ?? '', this.quantity), 'Eğitim kuyruğa alındı.');
        return;
      case 'build-ship':
        this.attempt(() => this.world.buildShip(data.id ?? '', this.quantity), 'İnşaat kuyruğa alındı.');
        return;
      case 'cancel-queue':
        if (city) {
          this.world.systems.military.cancel(city, data.kind === 'ship' ? 'ship' : 'unit', Number(data.index));
        }
        this.refresh();
        return;
      case 'tier':
        this.attempt(() => this.world.upgradeTier(data.kind === 'ship' ? 'ship' : 'unit', data.id ?? ''), 'Kademe yükseltildi.');
        return;
      case 'pick-plot':
        if (this.islandSelection) this.islandSelection = { ...this.islandSelection, plot: Number(data.plot) };
        else if (this.world.activeIsland()) {
          this.islandSelection = { islandId: this.world.activeIsland()!.id, plot: Number(data.plot), kind: 'plot' };
        }
        this.renderPage();
        return;
      case 'found-colony':
        this.attempt(() => this.world.foundColony(data.island ?? '', Number(data.plot), data.name ?? 'Koloni'), 'Koloni kuruldu!');
        if (this.page) this.closePage();
        return;
      case 'donate': {
        const island = this.world.activeIsland();
        if (!island) return;
        this.attempt(() => this.world.donateWood(Number(data.amount ?? 200)));
        return;
      }
      case 'activate-wonder':
        this.attempt(() => this.world.activateWonder(), 'Harika etkinleştirildi!');
        return;
      case 'attack': {
        if (!city) return;
        const units: UnitStack[] = this.world.systems.fleet.availableUnits(city);
        const ships: ShipStack[] = this.world.systems.fleet.availableShips(city);
        const fleet = this.world.attack(data.island ?? '', Number(data.plot), units, ships);
        if (fleet) {
          this.toast('Filo yola çıktı', `Varış: ${Math.max(1, Math.ceil(fleet.durationGameSeconds / 60))} dakika`, 'success');
          this.closePage();
        }
        return;
      }
      case 'buy': {
        if (!city) return;
        const fleet = this.world.trade(data.npc ?? '', {}, { resource: (data.resource ?? 'wood') as MaterialKey, amount: Number(data.amount ?? 100) });
        if (fleet) {
          this.toast('Ticaret filosu yola çıktı', 'Gemi dönüşte malı getirecek.', 'success');
        }
        return;
      }
      case 'pick-island':
        this.worldSelection = { islandId: data.island ?? '' };
        this.renderPage();
        return;
      case 'goto-island':
        this.closePage();
        this.showScene('IslandScene');
        return;
      default:
        return;
    }
  }

  destroy(): void {
    cancelAnimationFrame(this.rafId);
    for (const off of this.detach) off();
    this.root.innerHTML = '';
  }
}

// =========================================================================
// Kucuk gorunum yardimcilari
// =========================================================================

/** HTML kacisi: kullanici/uretici metinler dogrudan yazilir. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Tek bir istatistik kutusu. */
function stat(label: string, value: string): string {
  return `<div class="stat"><div class="k">${escapeHtml(label)}</div><div class="v">${escapeHtml(value)}</div></div>`;
}

/** Adet secici. */
function stepper(quantity: number): string {
  return `<div class="row" style="justify-content:space-between;margin-bottom:8px">
    <span class="hint" style="margin:0">Kaç adet?</span>
    <span class="stepper">
      <button data-action="qty-minus">−</button>
      <span class="value">${quantity}</span>
      <button data-action="qty-plus">+</button>
      <button class="mini-btn ghost" data-action="qty-max">100</button>
    </span>
  </div>`;
}

/** Maliyet rozetleri; karsilanamayan kirmizi gorunur. */
function costRow(cost: Partial<Record<string, number>>, city: CityState, world: GameWorld): string {
  const entries = Object.entries(cost).filter(([, value]) => (value ?? 0) > 0);
  if (entries.length === 0) return '<div class="costs"><span class="cost">ücretsiz</span></div>';

  return `<div class="costs">${entries
    .map(([key, value]) => {
      const meta = RESOURCE_META[key as MaterialKey | 'gold'];
      const have = key === 'gold' ? world.gold : (city.resources[key as MaterialKey] ?? 0);
      const short = have < (value ?? 0);
      const color = meta?.color ?? '#888';
      return `<span class="cost ${short ? 'short' : ''}">
        <span class="dot" style="background:${color}"></span>${formatAmount(Math.ceil(value ?? 0))}
      </span>`;
    })
    .join('')}</div>`;
}

/** Sehrin luks kaynagi. */
function luxuryOf(world: GameWorld, city: CityState): MaterialKey {
  return world.state.islandOf(city.islandId)?.luxury ?? 'wine';
}

/** Vatandas rolu satiri. */
function roleRow(city: CityState, role: 'wood' | 'luxury' | 'scientist', label: string): string {
  return `<div class="list-row">
    <span class="glyph" style="background:#7a6a4a">${label.slice(0, 1)}</span>
    <span class="body"><span class="t">${escapeHtml(label)}</span>
      <span class="d">Atanan ${city.assignment[role]}</span></span>
    <span class="side stepper">
      <button data-action="role-minus" data-role="${role}">−</button>
      <button data-action="role-plus" data-role="${role}">+</button>
    </span>
  </div>`;
}

/** Bir binanin seviyesini bulur. */
function buildingLevelOf(city: CityState, buildingId: string, ground: number): number {
  if (buildingId === 'town_hall') return city.townHall.level;
  if (buildingId === 'wall') return city.wall.level;
  if (buildingId === 'port') return city.harbor.port.level;
  if (buildingId === 'shipyard') return city.harbor.shipyard.level;
  const placed = findPlaced(city, buildingId, ground);
  return placed?.level ?? 0;
}

/** Yerlestirilmis binayi bulur. */
function findPlaced(city: CityState, buildingId: string, ground: number) {
  if (buildingId === 'town_hall') return city.townHall;
  if (buildingId === 'wall') return city.wall;
  if (buildingId === 'port') return city.harbor.port;
  if (buildingId === 'shipyard') return city.harbor.shipyard;
  if (ground >= 0) return city.grounds.find((b) => b.ground === ground && b.type === buildingId) ?? null;
  return city.grounds.find((b) => b.type === buildingId) ?? null;
}

/** Binanin oyun etkisini kisaca aciklar. */
function buildingEffects(world: GameWorld, city: CityState, buildingId: string, level: number): string {
  const lines: string[] = [];
  switch (buildingId) {
    case 'town_hall':
      lines.push(`Depo kapasitesi ${formatAmount(world.systems.resources.storageCapacity(city))}`);
      lines.push(`Azami nüfus ${formatAmount(world.systems.citizens.maxPopulation(city))}`);
      break;
    case 'warehouse':
      lines.push('Depo kapasitesini artırır.');
      break;
    case 'academy':
      lines.push(`Bilim adamı kapasitesi ${world.systems.citizens.scientistCapacity(city)}`);
      break;
    case 'tavern':
      lines.push(`Şarap dağıtınca mutluluk verir (en fazla ${level}).`);
      break;
    case 'barracks':
      lines.push('Daha yüksek seviye daha çok birlik türü açar ve eğitimi hızlandırır.');
      break;
    case 'shipyard':
      lines.push('Daha yüksek seviye daha çok gemi türü açar ve inşayı hızlandırır.');
      break;
    case 'port':
      lines.push('Yük gemileri ve ticaret için gereklidir.');
      break;
    case 'wall':
      lines.push('Savunmada hasarı azaltır ve surlara can verir.');
      break;
    case 'palace':
      lines.push(`Yeni koloni kurmak için Saray seviyesi koloni sayısından yüksek olmalı (${world.state.colonyCount} koloni).`);
      break;
    case 'governors_residence':
      lines.push('Yolsuzluğu azaltır; koloni şehirlerinde mutluluğu korur.');
      break;
    case 'workshop':
      lines.push('Birlik ve gemi kademelerini (Bronz/Gümüş/Altın) yükseltir.');
      break;
    case 'dump':
      lines.push('Kaynakları altına çevirmeyi sağlar.');
      break;
    default:
      break;
  }
  if (lines.length === 0) return '';
  return `<div class="hint">${lines.map(escapeHtml).join('<br>')}</div>`;
}

/** Oyuncu kimligi (arayuzde sahip kontrolu icin). */
export const UI_PLAYER_ID = PLAYER_ID;
