'use client'

/**
 * OYUN ÇERÇEVESİ — Ikariam dilinde, tek görünüm.
 *
 * Üstte koyu kahverengi şerit: şehir seçici ve dört danışman (Vezir, Serasker,
 * Âlim, Elçi). Haber olan danışman parlar ve sayı gösterir. Altında parşömen
 * kaynak şeridi. En altta kahverengi menü: Şehir, Ada, Harita, İnşa, Görevler.
 * Eski boyalı görseller kullanılmaz; her şey CSS ve vektör çizimdir.
 */
import type { ReactNode } from 'react'
import { Coins, Trees, Mountain, BookOpen, Users, Castle, TreePalm, Map, Hammer, ScrollText, ChevronDown, Flag } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  LUXURY_NAMES, actionPoints, capacity, fullResources, maxPopulation, population, rates, researchReason, RESEARCH_IDS, type Game,
} from '@/lib/game/engine'
import { activeCity, islandOf, type Empire } from '@/lib/game/empire'
import { actionsInUse } from '@/lib/game/expeditions'
import { luxuryIcons } from './game-widgets'
import { AdvisorPortrait, type AdvisorId } from './advisor-portraits'
import { RulerCrest } from './profile-panel'
import { profileOf } from '@/lib/game/profile'

export function compact(n: number) {
  const v = Math.floor(n)
  if (v >= 1_000_000) return `${(v / 1_000_000).toLocaleString('tr-TR', { maximumFractionDigits: 1 })}M`
  if (v >= 100_000) return `${(v / 1000).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}K`
  return v.toLocaleString('tr-TR')
}

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
    diplo: Math.min(99, (empire?.world?.messages ?? []).filter(m => !m.read).length),
  }
}

export function IkaTopBar({ game, empire, news, onCity, onEconomy, onAdvisor, onProfile }: {
  game: Game; empire: Empire | undefined; news: Record<AdvisorId, number>
  onCity: () => void; onEconomy: () => void; onAdvisor: (id: AdvisorId) => void; onProfile: () => void
}) {
  const prof = empire ? profileOf(empire) : null
  const city = empire ? activeCity(empire) : null
  const island = city ? islandOf(city) : null
  const r = rates(game)
  const full = fullResources(game)
  const lux = game.mine.specialty
  const LuxIcon = luxuryIcons[lux]
  const chips: { key: string; icon: ReactNode; value: string; sub?: string; label: string; full?: boolean }[] = [
    { key: 'gold', icon: <Coins />, value: compact(game.resources.gold), sub: `${r.gold >= 0 ? '+' : ''}${compact(r.gold)}`, label: 'Akçe', full: full.includes('gold') },
    { key: 'wood', icon: <Trees />, value: compact(game.resources.wood), sub: `+${compact(r.wood)}`, label: 'Kereste', full: full.includes('wood') },
    { key: 'stone', icon: <Mountain />, value: compact(game.resources.stone), sub: `+${compact(r.stone)}`, label: 'Taş', full: full.includes('stone') },
    { key: 'knowledge', icon: <BookOpen />, value: compact(game.resources.knowledge), sub: `+${r.knowledge.toFixed(1)}`, label: 'İlim', full: full.includes('knowledge') },
    { key: 'lux', icon: <LuxIcon />, value: compact(game.luxury[lux]), label: LUXURY_NAMES[lux] },
    { key: 'pop', icon: <Users />, value: `${compact(population(game))}`, sub: `/${compact(maxPopulation(game))}`, label: 'Nüfus' },
    { key: 'ap', icon: <Flag />, value: `${empire && city ? actionPoints(game) - actionsInUse(empire, city.id) : actionPoints(game)}`, sub: `/${actionPoints(game)}`, label: 'Hamle puanı' },
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
        {(Object.keys(ADVISORS) as AdvisorId[]).map(id => <button key={id} type="button" className={cn('ika-advisor', news[id] > 0 && 'ika-advisor-news')}
          onClick={() => onAdvisor(id)} aria-label={`${ADVISORS[id].title} (${ADVISORS[id].name})${news[id] ? `: ${news[id]} haber` : ''}`}>
          <AdvisorPortrait id={id} size={42} />
          {news[id] > 0 && <span className="ika-badge">{news[id]}</span>}
        </button>)}
      </nav>
    </div>
    <button type="button" className="ika-res" onClick={onEconomy} aria-label={`Kaynaklar, ambar ${compact(capacity(game))}`}>
      {chips.map(c => <span key={c.key} className={cn('ika-chip', c.full && 'ika-chip-full')} title={c.label}>
        <i aria-hidden="true">{c.icon}</i><b>{c.value}</b>{c.sub && <small>{c.sub}</small>}<span className="sr-only">{c.label}</span>
      </span>)}
    </button>
  </header>
}

export type IkaNavKey = 'city' | 'island' | 'map' | 'build' | 'objectives'
export function IkaNav({ active, badges, onSelect }: { active: IkaNavKey | null; badges: Partial<Record<IkaNavKey, number>>; onSelect: (k: IkaNavKey) => void }) {
  const items: { key: IkaNavKey; label: string; icon: ReactNode }[] = [
    { key: 'city', label: 'Şehir', icon: <Castle /> }, { key: 'island', label: 'Ada', icon: <TreePalm /> },
    { key: 'map', label: 'Harita', icon: <Map /> }, { key: 'build', label: 'İnşa', icon: <Hammer /> },
    { key: 'objectives', label: 'Görevler', icon: <ScrollText /> },
  ]
  return <nav className="ika-nav" aria-label="Oyun menüsü">{items.map(i => <button key={i.key} type="button"
    className={cn('ika-nav-item', active === i.key && 'ika-nav-active')} aria-current={active === i.key ? 'page' : undefined} onClick={() => onSelect(i.key)}>
    {i.icon}<span>{i.label}</span>{(badges[i.key] ?? 0) > 0 && <b className="ika-badge">{badges[i.key]}</b>}
  </button>)}</nav>
}

/** Danışman sayfalarının başındaki konuşma: portre + parşömen balon. */
export function AdvisorSpeech({ id, children }: { id: AdvisorId; children: ReactNode }) {
  return <section className="ika-speech">
    <AdvisorPortrait id={id} size={84} />
    <div className="ika-bubble"><strong>{ADVISORS[id].name}</strong><p>{children}</p></div>
  </section>
}
