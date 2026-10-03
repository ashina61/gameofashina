'use client'

/**
 * OYUN ÇERÇEVESİ — Ikariam dilinde, tek görünüm.
 *
 * Üstte koyu kahverengi şerit: şehir seçici ve dört danışman (Vezir, Serasker,
 * Âlim, Elçi). Haber olan danışman parlar ve sayı gösterir. Altında parşömen
 * kaynak şeridi. En altta kahverengi menü: Şehir, Ada, Harita, İttifak, Görevler.
 * G1 kit malzemeleri ve G2 boyalı ikonlar; danışman portreleri G3’te yenilenir.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Castle, TreePalm, Compass, Shield, ScrollText, ChevronDown } from './ui-art'
import { cn } from '@/lib/utils'
import {
  LUXURY_NAMES, actionPoints, capacity, fullResources, maxPopulation, population, rates, researchReason, RESEARCH_IDS, type Game, formatRate, formatShort,
} from '@/lib/game/engine'
import { activeCity, islandOf, type Empire } from '@/lib/game/empire'
import { actionsInUse } from '@/lib/game/expeditions'
import { luxuryIcons } from './game-widgets'
import { AkceArt, HamleArt, IlimArt, KeresteArt, NufusArt } from './resource-art'
import { AdvisorPortrait, type AdvisorId } from './advisor-portraits'
import { RulerCrest } from './profile-panel'
import { CountUp } from './count-up'
import { profileOf } from '@/lib/game/profile'
import type { BadgeMode } from '@/lib/game/badges'
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

export function IkaTopBar({ game, empire, news, modes, activeAdvisor, onCity, onEconomy, onAdvisor, onProfile }: {
  game: Game; empire: Empire | undefined; news: Record<AdvisorId, number>; activeAdvisor?: AdvisorId | null
  /** Rozet bütçesi (lib/game/badges): sayı mı nokta mı. Verilmezse hepsi sayı. */
  modes?: Partial<Record<AdvisorId, BadgeMode>>
  onCity: () => void; onEconomy: () => void; onAdvisor: (id: AdvisorId) => void; onProfile: () => void
}) {
  const prof = empire ? profileOf(empire) : null
  const city = empire ? activeCity(empire) : null
  const island = city ? islandOf(city) : null
  const r = rates(game)
  const full = fullResources(game)

  // Kaynak barı sürekli üretim yaptığı için her saniye popup çıkarmıyoruz.
  // Yalnızca harcama veya beklenen pasif üretimin belirgin üstündeki toplu kazanç
  // kısa bir +/- geri bildirimi üretir.
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
      // Eksi her zaman oyuncu aksiyonudur; artıda pasif üretim + küçük yuvarlama payını aş.
      if (delta < -0.49 || delta > Math.max(5, passive * 2.4 + 1)) {
        next[key] = { value: delta, stamp: ++fxStamp.current }
      }
    })
    if (!Object.keys(next).length) return
    setStockFx(next)
    const timer = window.setTimeout(() => setStockFx({}), 760)
    return () => window.clearTimeout(timer)
    // Oranlar (`r`) her çizimde `game`'den yeniden hesaplanır; tetikleyici yalnız `game`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game])
  const lux = game.mine.specialty
  const LuxIcon = luxuryIcons[lux]
  const chips: { key: string; icon: ReactNode; value: string; num?: number; sub?: string; label: string; full?: boolean; cap?: boolean }[] = [
    { key: 'gold', icon: <AkceArt />, value: compact(game.resources.gold), num: game.resources.gold, sub: `${r.gold >= 0 ? '+' : ''}${compact(r.gold)}`, label: full.includes('gold') ? t.hud.storageFull('Akçe') : 'Akçe', full: full.includes('gold') },
    { key: 'wood', icon: <KeresteArt />, value: compact(game.resources.wood), num: game.resources.wood, sub: `+${compact(r.wood)}`, label: full.includes('wood') ? t.hud.storageFull('Kereste') : 'Kereste', full: full.includes('wood') },
    { key: 'knowledge', icon: <IlimArt />, value: compact(game.resources.knowledge), num: game.resources.knowledge, sub: formatRate(r.knowledge, true), label: full.includes('knowledge') ? t.hud.storageFull('İlim') : 'İlim', full: full.includes('knowledge') },
    { key: 'lux', icon: <LuxIcon />, value: compact(game.luxury[lux]), num: game.luxury[lux], label: LUXURY_NAMES[lux] },
    { key: 'pop', icon: <NufusArt />, value: `${compact(population(game))}`, sub: `/${compact(maxPopulation(game))}`, label: population(game) >= maxPopulation(game) ? t.hud.housingFull : t.hud.population, cap: population(game) >= maxPopulation(game) },
    { key: 'ap', icon: <HamleArt />, value: `${empire && city ? actionPoints(game) - actionsInUse(empire, city.id) : actionPoints(game)}`, sub: `/${actionPoints(game)}`, label: 'Sefer hakkı (aynı anda yapılabilecek sefer)' },
  ]
  return <header className="ika-top">
    <div className="ika-ribbon">
      {prof && <button type="button" className="ika-crest" onClick={onProfile} aria-label={`Hükümdar profili: ${prof.ruler}`}>
        <RulerCrest crest={prof.crest} color={prof.color} size={40} />
        <span className="ika-crest-level" title="Divanhane seviyesi">{game.buildings.divan}</span>
      </button>}
      <button type="button" className="ika-city" onClick={onCity} aria-label={`Şehir: ${city?.name ?? ''}. Şehirlerini aç`}>
        <span className="ika-city-level">{game.buildings.divan}</span>
        <span className="ika-city-name"><strong>{city?.name ?? 'Sahilhisar'}</strong><small>{island?.name}</small></span>
        <ChevronDown aria-hidden="true" />
      </button>
      <nav className="ika-advisors" aria-label="Danışmanlar">
        {(Object.keys(ADVISORS) as AdvisorId[]).map(id => <button key={id} type="button"
          className={cn('ika-advisor', news[id] > 0 && 'ika-advisor-news', activeAdvisor === id && 'ika-advisor-active')}
          onClick={() => onAdvisor(id)} aria-pressed={activeAdvisor === id}
          aria-label={`${ADVISORS[id].title} (${ADVISORS[id].name})${news[id] ? `: ${news[id]} haber` : ''}`}>
          <span className="ika-advisor-ring" aria-hidden="true"><AdvisorPortrait id={id} size={42} /></span>
          {news[id] > 0 && <Badge n={news[id]} mode={modes?.[id] ?? 'count'} />}
        </button>)}
      </nav>
    </div>
    <button type="button" className="ika-res" onClick={onEconomy} aria-label={`Kaynaklar, ambar ${compact(capacity(game))}`}>
      {chips.map((c, index) => {
        const fx = stockFx[c.key as StockFxKey]
        return <span key={c.key} className={cn('ika-chip', index < 4 ? 'ika-stock' : 'ika-status', c.full && 'ika-chip-full', c.cap && 'ika-chip-cap')} data-k={c.key} title={c.label}>
          <i aria-hidden="true">{c.icon}</i>
          <span className="ika-chip-num">{c.num !== undefined ? <CountUp value={Math.floor(c.num)} format={compact} /> : <b>{c.value}</b>}{c.sub && <small className={c.key === 'gold' && r.gold < 0 ? 'ika-rate-negative' : undefined}>{c.sub}</small>}</span>
          {fx && <em key={fx.stamp} className={cn('ika-chip-delta', fx.value > 0 ? 'is-plus' : 'is-minus')} aria-hidden="true">
            {fx.value > 0 ? '+' : '−'}{compact(Math.abs(fx.value))}
          </em>}
          {(c.full || c.cap) && <span className="ika-chip-flag" aria-hidden="true">!</span>}
          <span className="sr-only ika-resource-name">{c.label}</span>
        </span>
      })}
    </button>
  </header>
}

/** Kırmızı rozet: bütçe içindeyse sayı (en çok 9+), değilse küçük nokta. */
export function Badge({ n, mode }: { n: number; mode: BadgeMode }) {
  if (!mode) return null
  return mode === 'dot' ? <span className="ika-badge is-dot" aria-hidden="true" /> : <span className="ika-badge" data-tiny aria-hidden="true">{n > 9 ? '9+' : n}</span>
}

export type IkaNavKey = 'city' | 'island' | 'map' | 'alliance' | 'objectives'
/**
 * ALT MENÜ: beş düğme; ortadaki Harita yükseltilmiş madalyon. Sayfalar
 * açıkken de görünür kalır, böylece her ekrandan tek dokunuşla geçilir.
 */
export function IkaNav({ active, badges, modes, onSelect }: { active: IkaNavKey | null; badges: Partial<Record<IkaNavKey, number>>; modes?: Partial<Record<IkaNavKey, BadgeMode>>; onSelect: (k: IkaNavKey) => void }) {
  const items: { key: IkaNavKey; label: string; icon: ReactNode }[] = [
    { key: 'city', label: 'Şehir', icon: <Castle painted /> }, { key: 'island', label: 'Ada', icon: <TreePalm painted /> },
    { key: 'map', label: 'Harita', icon: <Compass painted /> },
    { key: 'alliance', label: 'İttifak', icon: <Shield painted /> },
    { key: 'objectives', label: 'Görevler', icon: <ScrollText painted /> },
  ]
  return <nav className="ika-nav" aria-label="Oyun menüsü">{items.map(i => <button key={i.key} type="button"
    className={cn('ika-nav-item', i.key === 'map' && 'ika-nav-center', active === i.key && 'ika-nav-active')} aria-current={active === i.key ? 'page' : undefined}
    aria-label={(badges[i.key] ?? 0) > 0 ? `${i.label}: ${badges[i.key]} yeni` : i.label} onClick={() => onSelect(i.key)}>
    <span className="ika-nav-icon" aria-hidden="true">{i.icon}</span><span className="ika-nav-label">{i.label}</span>
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
