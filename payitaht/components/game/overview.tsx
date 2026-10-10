'use client'

/** City registers read the existing empire; navigation never issues an economic command. */
import { useState } from 'react'
import { asset } from '@/lib/asset'
import { BUILDINGS, BUILDING_IDS, LUXURY_IDS, LUXURY_NAMES, RESOURCE_IDS, RESOURCE_NAMES, UNITS, UNIT_IDS, activeJob, population, maxPopulation, rates, luxuryRates, capacity, formatRate, type BuildingId } from '@/lib/game/engine'
import { capitalId, islandOf, type Empire } from '@/lib/game/empire'
import { siegeAt, totalMerchants, idleMerchants, availableUnits } from '@/lib/game/expeditions'
import { luxuryIcons, resourceIcons } from './game-widgets'
import { CourtTabs } from './court-kit'
import { Gift, Castle, Shield } from './ui-art'
import { GameButton } from './game-button'

type Tab = 'res' | 'build' | 'army'
const TABS = [{ id: 'res', label: 'Kaynaklar', Icon: Gift }, { id: 'build', label: 'Binalar', Icon: Castle }, { id: 'army', label: 'Ordu', Icon: Shield }] as const
const n = (x: number) => Math.floor(x).toLocaleString('tr-TR')
const rate = (x: number) => `${x >= 0 ? '+' : ''}${formatRate(x)} / dk`

export function EmpireOverview({ empire, onCity }: { empire: Empire; onCity: (id: string) => void }) {
  const [tab, setTab] = useState<Tab>('res')
  const cap = capitalId(empire)
  return <div className="empire-register">
    <figure className="academy-banner"><img src={asset('/images/game/ui/atlas/register.webp')} alt="" width={960} height={320} /></figure>
    <CourtTabs items={TABS} value={tab} onChange={setTab} label="İmparatorluk özeti">
      <p className="atlas-note">{empire.cities.length} şehir · ortak ticaret filosu: {n(totalMerchants(empire))} gemi, {n(idleMerchants(empire))} boş gemi.</p>
      {tab === 'res' && <p className="atlas-note">Her şehrin stoğu ve üretimi ayrıdır. Kapasite her mal için ayrı uygulanır.</p>}
      {tab === 'army' && <p className="atlas-note">Kayıtlı asker ve kullanılabilir asker ayrı gösterilir. Ticaret gemileri ortak filodadır.</p>}
      {empire.cities.map(c => {
        const g = c.game, r = rates(g), lr = luxuryRates(g), full = capacity(g), job = activeJob(g), siege = siegeAt(empire, c.id), available = availableUnits(empire, c.id)
        const units = UNIT_IDS.filter(u => g.army[u] > 0 && u !== 'nakliye')
        const buildings = BUILDING_IDS.filter(b => g.buildings[b] > 0 || job?.id === b)
        return <details key={`${tab}-${c.id}`} className="atlas-city" open={c.id === empire.activeCityId}>
          <summary><img src={asset(`/images/game/islands/map-${c.islandId}.webp`)} alt="" width={64} height={64} /><span><strong>{c.name}</strong><small>{c.id === cap ? 'Başkent · ' : ''}{islandOf(c).name} [{islandOf(c).x}:{islandOf(c).y}]</small>{siege && <small className="atlas-warning">{siege.kind === 'occupy' ? 'İşgal altında' : 'Abluka altında'}</small>}</span></summary>
          <div className="atlas-city-body">
            <GameButton onClick={() => onCity(c.id)}>Şehre git</GameButton>
            <p className="atlas-note">Nüfus: {n(population(g))} / {n(maxPopulation(g))} · İnşaat: {job ? BUILDINGS[job.id as BuildingId].name : 'Sıra boş'}</p>
            {tab === 'res' && <ul className="atlas-lines">{RESOURCE_IDS.map(k => { const Icon = resourceIcons[k]; return <li key={k}><Icon aria-hidden="true" /><span><strong>{RESOURCE_NAMES[k]}</strong><small>{rate(r[k])}</small></span><span><b>{n(g.resources[k])}</b><small>/ {n(full)}{g.resources[k] >= full ? ' · Dolu' : ''}</small></span></li> })}{LUXURY_IDS.map(k => { const Icon = luxuryIcons[k]; return <li key={k}><Icon aria-hidden="true" /><span><strong>{LUXURY_NAMES[k]}</strong><small>{rate(lr[k])}</small></span><span><b>{n(g.luxury[k])}</b><small>/ {n(full)}{g.luxury[k] >= full ? ' · Dolu' : ''}</small></span></li> })}</ul>}
            {tab === 'build' && <ul className="atlas-lines atlas-buildings">{buildings.map(b => <li key={b}><span><strong>{BUILDINGS[b].name}</strong>{job?.id === b && <small>Yükseltme sürüyor</small>}</span><b>Sv. {g.buildings[b]}</b></li>)}</ul>}
            {tab === 'army' && <>{units.length ? <ul className="atlas-lines atlas-units">{units.map(u => <li key={u}><img src={asset(UNITS[u].branch === 'deniz' || u === 'casus' ? `/images/game/units/${u}.webp` : `/images/game/ui/barracks/portrait-${u}.webp`)} alt="" width={72} height={54} /><span><strong>{UNITS[u].name}</strong><small>{n(available[u])} kullanılabilir · {n(g.army[u])} kayıtlı</small></span></li>)}</ul> : <p className="atlas-note">Bu şehirde askerî birlik yok.</p>}<p className="atlas-note">Bu şehrin sicilinde {n(g.army.nakliye)} ticaret gemisi.</p></>}
          </div>
        </details>
      })}
    </CourtTabs>
  </div>
}
