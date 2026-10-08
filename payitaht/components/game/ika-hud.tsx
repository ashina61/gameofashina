'use client'

/**
 * OYUN ÇERÇEVESİ — Ikariam dilinde, tek görünüm.
 *
 * Üstte şehir kimliği ve dört danışman, hemen altında altı canlı kaynak;
 * altta Şehir, Ada, Harita, İttifak, Görevler ana menüsü.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Shield, ChevronDown, Swords, Gift } from './ui-art'
import { cn } from '@/lib/utils'
import {
  LUXURY_NAMES, might, BUILDINGS, UNITS, actionPoints, capacity, fullResources, maxPopulation, population, rates, researchReason, RESEARCH_IDS, type Game, formatRate, formatShort, luxuryRates, growthRate,
} from '@/lib/game/engine'
import { activeCity, islandOf, type Empire } from '@/lib/game/empire'
import { actionsInUse } from '@/lib/game/expeditions'
import { luxuryIcons } from './game-widgets'
import { AkceArt, HamleArt, IlimArt, KeresteArt, NufusArt } from './resource-art'
import { AdvisorPortrait, type AdvisorId } from './advisor-portraits'
import { ApprovedArt, RoyalCrest } from './approved-court-art'
import { CountUp } from './count-up'
import { profileOf } from '@/lib/game/profile'
import type { BadgeMode } from '@/lib/game/badges'
import { asset, buildingImage } from '@/lib/asset'
import { SEASONS, seasonWeek } from '@/lib/game/events'
import { t } from '@/lib/i18n/tr'

/** Üst bar sayacı: en fazla 5 karakter (bkz. formatShort). */
export const compact = formatShort

export const ADVISORS: Record<AdvisorId, { name: string; title: string }> = {
  city: { name: 'Vezir', title: 'Şehir danışmanı' },
  army: { name: 'Serasker', title: 'Ordu danışmanı' },
  research: { name: 'Âlim', title: 'Araştırma danışmanı' },
  diplo: { name: 'Elçi', title: 'Diplomasi danışmanı' },
}
export type AdvisorSeen = Record<AdvisorId, number>

/** Her danışmanın haber sayısı (0 = sessiz). */
export function advisorNews(game: Game, empire: Empire | undefined, seen: AdvisorSeen): Record<AdvisorId, number> {
  const cityId = empire?.activeCityId
  const reports = (empire?.reports ?? []).filter(r => r.cityId === cityId && r.time > seen.army).length
  const threats = (empire?.threats ?? []).filter(t => t.cityId === cityId).length
  const idleResearch = game.buildings.medrese > 0 && !game.study && RESEARCH_IDS.some(id => !researchReason(game, id)) ? 1 : 0
  return {
    city: Math.min(99, game.log.filter(l => l.time > seen.city).length),
    army: Math.min(99, reports + threats),
    research: idleResearch,
    diplo: Math.min(99, (empire?.world?.messages ?? []).filter(m => !m.read).length + (empire?.world?.proposals ?? []).filter(p => p.until > game.updatedAt).length),
  }
}

type StockFxKey = 'gold' | 'wood' | 'knowledge'
type StockFx = { value: number; stamp: number }

export function IkaTopBar({ game, empire, news, modes, activeAdvisor, onCity, onSelectCity, onEconomy, onAdvisor, onProfile }: {
  game: Game; empire: Empire | undefined; news: Record<AdvisorId, number>; activeAdvisor?: AdvisorId | null
  modes?: Partial<Record<AdvisorId, BadgeMode>>
  onCity: () => void; onSelectCity: (id: string) => void; onEconomy: () => void; onAdvisor: (id: AdvisorId) => void; onProfile: () => void
}) {
  const [citiesOpen, setCitiesOpen] = useState(false)
  const cityToggle = useRef<HTMLButtonElement>(null)
  const cityMenu = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!citiesOpen) return
    cityMenu.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus()
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !cityMenu.current?.contains(event.target) && !cityToggle.current?.contains(event.target)) setCitiesOpen(false)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setCitiesOpen(false); cityToggle.current?.focus() }
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape) }
  }, [citiesOpen])
  const prof = empire ? profileOf(empire) : null
  const city = empire ? activeCity(empire) : null
  const island = city ? islandOf(city) : null
  const r = rates(game)
  const luxRate = luxuryRates(game)[game.mine.specialty]
  const resourceBar = useRef<HTMLDivElement>(null)
  const [largeText, setLargeText] = useState(false)
  useEffect(() => {
    const bar = resourceBar.current
    if (!bar) return
    const update = () => {
      const stock = bar.querySelector('.ika-chip b')
      setLargeText(!!stock && parseFloat(getComputedStyle(stock).fontSize) >= 14)
    }
    const resize = new ResizeObserver(update)
    resize.observe(bar)
    const mutation = new MutationObserver(update)
    mutation.observe(bar, { subtree: true, attributes: true, attributeFilter: ['style'] })
    update()
    return () => { resize.disconnect(); mutation.disconnect() }
  }, [])
  const full = fullResources(game)

  const [stockFx, setStockFx] = useState<Partial<Record<StockFxKey, StockFx>>>({})
  const fxStamp = useRef(0)
  const previousStocks = useRef<{
    time: number
    values: Record<StockFxKey, number>
    rates: Record<StockFxKey, number>
  } | null>(null)
  useEffect(() => {
    const values: Record<StockFxKey, number> = {
      gold: game.resources.gold,
      wood: game.resources.wood,
      knowledge: game.resources.knowledge,
    }
    const nowRates: Record<StockFxKey, number> = {
      gold: r.gold, wood: r.wood, knowledge: r.knowledge,
    }
    const prev = previousStocks.current
    previousStocks.current = { time: game.updatedAt, values, rates: nowRates }
    if (!prev) return
    const dtMin = Math.max(0, Math.min(1, (game.updatedAt - prev.time) / 60_000))
    const next: Partial<Record<StockFxKey, StockFx>> = {}
    ;(['gold', 'wood', 'knowledge'] as StockFxKey[]).forEach(key => {
      const delta = values[key] - prev.values[key]
      const passive = Math.max(0, prev.rates[key]) * dtMin
      if (delta < -0.49 || delta > Math.max(5, passive * 2.4 + 1)) {
        next[key] = { value: delta, stamp: ++fxStamp.current }
      }
    })
    if (!Object.keys(next).length) return
    setStockFx(next)
    const timer = window.setTimeout(() => setStockFx({}), 760)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game])
  const lux = game.mine.specialty
  const LuxIcon = luxuryIcons[lux]
  const chips: { key: string; icon: ReactNode; value: string; num?: number; sub?: string; label: string; full?: boolean; cap?: boolean; negative?: boolean }[] = [
    { key: 'gold', icon: <AkceArt />, value: compact(game.resources.gold), num: game.resources.gold, sub: `${formatRate(r.gold, true)}/dk`, negative: r.gold < 0, label: full.includes('gold') ? t.hud.storageFull('Altın') : 'Altın', full: full.includes('gold') },
    { key: 'wood', icon: <KeresteArt />, value: compact(game.resources.wood), num: game.resources.wood, sub: `${formatRate(r.wood, true)}/dk`, negative: r.wood < 0, label: full.includes('wood') ? t.hud.storageFull('Kereste') : 'Kereste', full: full.includes('wood') },
    { key: 'knowledge', icon: <IlimArt />, value: compact(game.resources.knowledge), num: game.resources.knowledge, sub: `${formatRate(r.knowledge, true)}/dk`, negative: r.knowledge < 0, label: full.includes('knowledge') ? t.hud.storageFull('İlim') : 'İlim', full: full.includes('knowledge') },
    { key: 'lux', icon: <LuxIcon />, value: compact(game.luxury[lux]), num: game.luxury[lux], sub: `${formatRate(luxRate, true)}/dk`, negative: luxRate < 0, label: LUXURY_NAMES[lux] },
    { key: 'pop', icon: <NufusArt />, value: `${compact(population(game))}`, sub: `${formatRate(growthRate(game), true)}/dk`, label: population(game) >= maxPopulation(game) ? t.hud.housingFull : t.hud.population, cap: population(game) >= maxPopulation(game) },
    { key: 'ap', icon: <HamleArt />, value: `${empire && city ? actionPoints(game) - actionsInUse(empire, city.id) : actionPoints(game)}`, sub: `/${actionPoints(game)}`, label: 'Sefer hakkı' },
  ]
  return <header className="ika-top exact-hud" style={{
    '--exact-top': `url("${asset('/images/game/ui/exact-hud/top-clean-v2.webp')}")`,
    '--exact-wood': `url("${asset('/images/game/ui/exact-hud/wood.webp')}")`,
    '--exact-paper': `url("${asset('/images/game/ui/exact-hud/paper.webp')}")`,
    '--bar-wood': `url("${asset('/images/game/ui/reference-bars/wood.webp')}")`,
    '--bar-crest': `url("${asset('/images/game/ui/reference-bars/crest.webp')}")`,
    '--bar-card': `url("${asset('/images/game/ui/reference-bars/card.webp')}")`,
  } as React.CSSProperties}>
    <div className="ika-ribbon">
      {prof && <button type="button" className="ika-crest" onClick={onProfile} aria-label={`Hükümdar profili: ${prof.ruler}`}>
        <span className="ika-ruler-crest-art" aria-hidden="true"><RoyalCrest crest={prof.crest} /></span>
        <span className="ika-crest-level" title="Divanhane seviyesi">{game.buildings.divan}</span>
      </button>}
      <button ref={cityToggle} type="button" className="ika-city" onClick={() => setCitiesOpen(open => !open)} aria-haspopup="menu" aria-expanded={citiesOpen} aria-controls="hud-city-menu" aria-label={`Şehir: ${city?.name ?? ''}. Şehir seç`}>
        <span className="ika-city-name"><strong>{city?.name ?? 'Sahilhisar'}</strong><small>{island ? `Ada (${island.x}:${island.y})` : ''}</small></span>
        <ChevronDown aria-hidden="true" />
      </button>
      {citiesOpen && <div ref={cityMenu} id="hud-city-menu" className="ika-city-menu" role="menu" aria-label="Şehir seç" onKeyDown={event => {
        if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
        event.preventDefault()
        const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button')]
        const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length
        buttons[next]?.focus()
      }}>
        <p>Şehirlerin</p>
        {(empire?.cities ?? []).map(item => { const location = islandOf(item); return <button type="button" key={item.id} role="menuitemradio" aria-checked={item.id === city?.id} onClick={() => { setCitiesOpen(false); onSelectCity(item.id); cityToggle.current?.focus() }}>
          <span><strong>{item.name}</strong><small>Ada ({location.x}:{location.y})</small></span><span aria-hidden="true">{item.id === city?.id ? '✓' : '›'}</span>
        </button> })}
        <button type="button" className="ika-city-manage" role="menuitem" onClick={() => { setCitiesOpen(false); onCity() }}>Şehir yönetimi</button>
      </div>}
      <span className="ika-might"><Swords size={12} /><b>Kudret</b><span>{compact(might(game))}</span></span>
      <nav className="ika-advisors" aria-label="Danışmanlar">
        {(Object.keys(ADVISORS) as AdvisorId[]).map(id => <button key={id} type="button"
          data-advisor={id} data-news={news[id]} className={cn('ika-advisor', news[id] > 0 && 'ika-advisor-news', activeAdvisor === id && 'ika-advisor-active')}
          onClick={() => onAdvisor(id)} aria-pressed={activeAdvisor === id}
          aria-label={`${ADVISORS[id].title} (${ADVISORS[id].name})${news[id] ? `: ${news[id]} haber` : ''}`}>
          <span className="ika-advisor-ring" aria-hidden="true" style={{ backgroundImage: `url("${asset(id === 'research' ? '/images/game/ui/people/scholar.webp' : `/images/game/ui/reference-bars/${id}.webp`)}")` }} />
          <small className="ika-advisor-name" aria-hidden="true">{ADVISORS[id].name}</small>
          {news[id] > 0 && <Badge n={news[id]} mode={modes?.[id] ?? 'count'} />}
        </button>)}
      </nav>
    </div>
    <div ref={resourceBar} className={cn('ika-res', largeText && 'ika-res-large')} role="group" aria-label={`Kaynaklar, ambar ${compact(capacity(game))}`}>
      {chips.map((c, index) => {
        const fx = stockFx[c.key as StockFxKey]
        return <span key={c.key} className={cn('ika-chip', index < 4 ? 'ika-stock' : 'ika-status', c.full && 'ika-chip-full', c.cap && 'ika-chip-cap', c.negative && 'ika-chip-negative')} data-lux={c.key === 'lux' ? lux : undefined} data-k={c.key} title={c.label}>
          <button className="ika-stock-open" type="button" onClick={onEconomy} aria-label={`${c.label}: ${c.value}. Üretim defterini aç`}>
            <i aria-hidden="true">{c.icon}</i>
            <span className="ika-resource-label" aria-hidden="true">{c.label}</span>
            <span className="ika-chip-num">{c.num !== undefined ? <CountUp value={Math.floor(c.num)} format={compact} /> : <b>{c.value}</b>}{c.sub && <small>{c.sub}</small>}</span>
          </button>
          {fx && <em key={fx.stamp} className={cn('ika-chip-delta', fx.value > 0 ? 'is-plus' : 'is-minus')} aria-hidden="true">
            {fx.value > 0 ? '+' : '−'}{compact(Math.abs(fx.value))}
          </em>}
          {(c.full || c.cap) && <span className="ika-chip-flag" aria-hidden="true">!</span>}
          <span className="sr-only ika-resource-name">{c.label}</span>
        </span>
      })}
    </div>
  </header>
}

/** Kırmızı rozet: bütçe içindeyse sayı (en çok 9+), değilse küçük nokta. */
export function Badge({ n, mode }: { n: number; mode: BadgeMode }) {
  if (!mode) return null
  return mode === 'dot' ? <span className="ika-badge is-dot" aria-hidden="true" /> : <span className="ika-badge" data-tiny aria-hidden="true">{n > 9 ? '9+' : n}</span>
}

export type IkaNavKey = 'city' | 'island' | 'map' | 'alliance' | 'objectives'

/** ALT MENÜ: Şehir, Ada, Harita, İttifak, Görevler. Onaylı boyalı oyun sanatı kullanır. */
export function IkaNav({ active, badges, modes, onSelect }: { active: IkaNavKey | null; badges: Partial<Record<IkaNavKey, number>>; modes?: Partial<Record<IkaNavKey, BadgeMode>>; onSelect: (k: IkaNavKey) => void }) {
  const [tap, setTap] = useState<{ key: IkaNavKey; stamp: number } | null>(null)
  const items: { key: IkaNavKey; label: string; art: string }[] = [
    { key: 'city', label: 'Şehir', art: 'nav-city.webp' },
    { key: 'island', label: 'Ada', art: 'nav-island.webp' },
    { key: 'map', label: 'Harita', art: 'nav-map.webp' },
    { key: 'alliance', label: 'İttifak', art: 'nav-alliance.webp' },
    { key: 'objectives', label: 'Görevler', art: 'nav-quests.webp' },
  ]
  return <nav className="ika-nav exact-nav" aria-label="Oyun menüsü" style={{ '--exact-bottom': `url("${asset('/images/game/ui/exact-hud/bottom.webp')}")`, '--exact-wood': `url("${asset('/images/game/ui/exact-hud/wood.webp')}")` } as React.CSSProperties}>{items.map((i, index) => <button key={i.key} type="button"
    className={cn('ika-nav-item', i.key === 'map' && 'ika-nav-center', active === i.key && 'ika-nav-active')} data-nav={i.key} data-news={badges[i.key] ?? 0} aria-current={active === i.key ? 'page' : undefined}
    aria-label={(badges[i.key] ?? 0) > 0 ? `${i.label}: ${badges[i.key]} yeni` : i.label} onClick={() => { setTap(previous => ({ key: i.key, stamp: (previous?.stamp ?? 0) + 1 })); onSelect(i.key) }}>
    <span className="ika-nav-paint" aria-hidden="true" style={{ backgroundPosition: `${index * 25}% center` }}>{i.key === 'objectives' && <span className="ika-nav-clear-seal" />}</span>
    {tap?.key === i.key && <span key={tap.stamp} className="ika-nav-tap-flash" aria-hidden="true" />}
    <span className="ika-nav-icon" aria-hidden="true"><ApprovedArt src={i.art} alt="" className="ika-nav-approved-art" /></span><span className="ika-nav-label">{i.label}</span>
    {(badges[i.key] ?? 0) > 0 && <Badge n={badges[i.key]!} mode={modes?.[i.key] ?? 'count'} />}
  </button>)}</nav>
}

/** Danışman sayfalarının başındaki konuşma: portre + parşömen balon. */
export function AdvisorSpeech({ id, children }: { id: AdvisorId; children: ReactNode }) {
  return <section className="ika-speech">
    <AdvisorPortrait id={id} size={84} />
    <div className="ika-bubble"><strong>{ADVISORS[id].name}</strong><p>{children}</p></div>
  </section>
}

/** Read-only city activity and shortcuts; commands stay in the existing pages. */
export function CityActivity({ game, empire, onBuilding, onArmy, onResearch }: { game: Game; empire?: Empire; onBuilding: (id: keyof typeof BUILDINGS) => void; onArmy: () => void; onResearch: () => void }) {
  const [expanded, setExpanded] = useState(false)
  useEffect(() => {
    const close = (event: PointerEvent) => {
      const target = event.target as Element | null
      if (target?.closest('.city-scene') && !target.closest('.city-activity')) setExpanded(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [])
  const builds = game.queue.filter(j => j.kind === 'build')
  const drill = game.drills[0]
  const cityId = empire?.activeCityId
  const mission = empire?.missions?.find(m => m.cityId === cityId && !m.stationed)
  const rows: { id: string; label: string; start: number; end: number; image: string; click: () => void }[] = builds.map(j => ({ id: j.id, label: BUILDINGS[j.id as keyof typeof BUILDINGS].name, start: j.start, end: j.end, image: buildingImage(j.id, Math.max(1, game.buildings[j.id as keyof typeof BUILDINGS])), click: () => onBuilding(j.id as keyof typeof BUILDINGS) }))
  if (drill) rows.push({ id: 'training', label: `Eğitim · ${UNITS[drill.id as keyof typeof UNITS].name}`, start: drill.start, end: drill.end, image: buildingImage('kisla', game.buildings.kisla || 1), click: onArmy })
  if (game.study) rows.push({ id: 'study', label: 'Araştırma', start: game.study.start, end: game.study.end, image: buildingImage('medrese', game.buildings.medrese || 1), click: onResearch })
  if (mission) rows.push({ id: 'mission', label: mission.resolved ? 'Sefer · Dönüş' : 'Süren sefer', start: mission.departAt, end: mission.resolved ? mission.returnAt : mission.arriveAt, image: buildingImage('liman', game.buildings.liman || 1), click: onArmy })
  if (!rows.length) return null
  const nearest = Math.max(0, Math.ceil((Math.min(...rows.map(row => row.end)) - game.updatedAt) / 1000))
  const summaryTime = `${Math.floor(nearest / 60)}:${String(nearest % 60).padStart(2, '0')}`
  return <aside className="city-activity" aria-label="Şehirde süren işler">
    <button type="button" className="city-activity-chip" aria-expanded={expanded} aria-label={`${rows.length} faaliyet, en yakın ${summaryTime}. Faaliyetleri ${expanded ? 'kapat' : 'aç'}`} onClick={() => setExpanded(v => !v)}><span aria-hidden="true">⚒ {rows.length} · {summaryTime}</span></button>
    {expanded && rows.slice(0, 4).map(row => {
      const remaining = Math.max(0, Math.ceil((row.end - game.updatedAt) / 1000))
      const progress = Math.max(0, Math.min(100, (game.updatedAt - row.start) / Math.max(1, row.end - row.start) * 100))
      const time = remaining < 3600 ? `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}` : `${Math.floor(remaining / 3600)} sa`
      return <button type="button" key={row.id} onClick={row.click} aria-label={`${row.label}: ${time} kaldı`}><img src={row.image} alt="" /><span><strong>{row.label}</strong><time>{time}</time><i className="city-activity-meter" aria-hidden="true"><i style={{ width: `${progress}%` }} /></i></span></button>
    })}</aside>
}

export function CityShortcuts({ now, offers, reports, daily, onObjectives, onOffers, onReports }: { now: number; offers: number; reports: number; daily: number; onObjectives: () => void; onOffers: () => void; onReports: () => void }) {
  const week = seasonWeek(now)
  const days = Math.max(0, Math.ceil((week.end - now) / 86400000))
  const items = [
    { key: 'daily', label: 'Günlük görevler ve ödül', icon: <Gift painted />, click: onObjectives, badge: daily > 0 },
    { key: 'week', label: `Haftalık olay: ${week.id ? SEASONS[week.id].name : 'Sakin hafta'}. ${days} gün kaldı`, icon: <img className="painted-icon" src={asset('/images/game/icons/ui-week.webp')} alt="" />, click: onObjectives, text: `${days}g` },
    { key: 'mail', label: `Elçi mektubu: ${offers} yapay rakip teklifi`, icon: <img className="painted-icon" src={asset('/images/game/icons/ui-mail.webp')} alt="" />, click: onOffers, badge: offers > 0 },
    { key: 'reports', label: `Raporlar: ${reports} haber`, icon: <Shield painted />, click: onReports, badge: reports > 0 },
  ]
  return <aside className="city-shortcuts" aria-label="Şehir kısayolları">{items.map(item => <button type="button" key={item.key} onClick={item.click} aria-label={item.label} title={item.label}>{item.icon}{item.badge && <span className="ika-badge is-dot" aria-hidden="true" />}{item.text && <small aria-hidden="true">{item.text}</small>}</button>)}</aside>
}