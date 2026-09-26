'use client'

/**
 * İMPARATORLUK ÖZETİ: bütün şehirlerin kaynakları, üretimi, binaları ve
 * ordusu tek tabloda (Ikariam'daki genel bakış ekranı). Satıra dokununca o
 * şehre geçilir.
 */
import { useState } from 'react'
import { BUILDINGS, BUILDING_IDS, LUXURY_IDS, LUXURY_NAMES, RESOURCE_IDS, RESOURCE_NAMES, UNITS, UNIT_IDS, activeJob, population, maxPopulation, rates, luxuryRates, capacity, type BuildingId } from '@/lib/game/engine'
import { capitalId, islandOf, type Empire } from '@/lib/game/empire'
import { siegeAt, totalMerchants, idleMerchants } from '@/lib/game/expeditions'
import { luxuryIcons, resourceIcons } from './game-widgets'

type Tab = 'res' | 'build' | 'army'
const n = (x: number) => Math.floor(x).toLocaleString('tr-TR')

export function EmpireOverview({ empire, onCity }: { empire: Empire; onCity: (id: string) => void }) {
  const [tab, setTab] = useState<Tab>('res')
  const cities = empire.cities
  const cap = capitalId(empire)
  const cityCell = (id: string, name: string) => <th scope="row"><button type="button" className="ika-link" onClick={() => onCity(id)}>{name}</button>{id === cap && <small> · başkent</small>}</th>
  const builtIds = BUILDING_IDS.filter(b => cities.some(c => c.game.buildings[b] > 0))
  const unitIds = UNIT_IDS.filter(u => cities.some(c => c.game.army[u] > 0))
  return <div className="advisor-panel overview">
    <div className="world-tabs" role="group" aria-label="Özet">
      {([['res', 'Kaynaklar'], ['build', 'Binalar'], ['army', 'Ordu']] as const).map(([k, l]) =>
        <button key={k} type="button" aria-pressed={tab === k} onClick={() => setTab(k)}><span>{l}</span></button>)}
    </div>
    <p className="fine-print">{cities.length} şehir · ticaret filosu {totalMerchants(empire)} gemi ({idleMerchants(empire)} limanda) · satıra dokun, o şehre geç.</p>
    <div className="overview-scroll">
      {tab === 'res' && <table className="overview-table">
        <thead><tr><th>Şehir</th>{RESOURCE_IDS.map(r => { const I = resourceIcons[r]; return <th key={r} title={RESOURCE_NAMES[r]}><I className="ov-icon" /></th> })}
          {LUXURY_IDS.map(l => { const I = luxuryIcons[l]; return <th key={l} title={LUXURY_NAMES[l]}><I className="ov-icon" /></th> })}<th>Nüfus</th><th>İnşaat</th></tr></thead>
        <tbody>{cities.map(c => {
          const g = c.game, r = rates(g), lr = luxuryRates(g), job = activeJob(g), full = capacity(g)
          const siege = siegeAt(empire, c.id)
          return <tr key={c.id} className={siege ? 'is-sieged' : undefined}>
            {cityCell(c.id, c.name)}
            {RESOURCE_IDS.map(k => <td key={k} className={g.resources[k] >= full ? 'is-full' : undefined}>{n(g.resources[k])}<small>{r[k] >= 0 ? '+' : ''}{k === 'knowledge' ? r[k].toFixed(1) : n(r[k])}</small></td>)}
            {LUXURY_IDS.map(k => <td key={k}>{n(g.luxury[k])}<small>{lr[k] > 0 ? `+${lr[k].toFixed(1)}` : ''}</small></td>)}
            <td>{n(population(g))}<small>/{n(maxPopulation(g))}</small></td>
            <td>{siege ? <em className="ov-warn">{siege.kind === 'occupy' ? 'işgal' : 'abluka'}</em> : job ? BUILDINGS[job.id as BuildingId].name : <span className="ika-warn-text">boş</span>}</td>
          </tr>
        })}</tbody>
      </table>}
      {tab === 'build' && <table className="overview-table">
        <thead><tr><th>Yapı</th>{cities.map(c => <th key={c.id}><button type="button" className="ika-link" onClick={() => onCity(c.id)}>{c.name}</button></th>)}</tr></thead>
        <tbody>{builtIds.map(b => <tr key={b}><th scope="row">{BUILDINGS[b].name}</th>
          {cities.map(c => { const lv = c.game.buildings[b], up = activeJob(c.game)?.id === b
            return <td key={c.id} className={up ? 'is-up' : undefined}>{lv || '—'}{up ? ' ↑' : ''}</td> })}</tr>)}</tbody>
      </table>}
      {tab === 'army' && (unitIds.length ? <table className="overview-table">
        <thead><tr><th>Birlik</th>{cities.map(c => <th key={c.id}><button type="button" className="ika-link" onClick={() => onCity(c.id)}>{c.name}</button></th>)}<th>Toplam</th></tr></thead>
        <tbody>{unitIds.map(u => <tr key={u}><th scope="row">{UNITS[u].name}</th>
          {cities.map(c => <td key={c.id}>{c.game.army[u] || '—'}</td>)}<td><b>{n(cities.reduce((s, c) => s + c.game.army[u], 0))}</b></td></tr>)}</tbody>
      </table> : <p className="fine-print">Henüz birlik yok.</p>)}
    </div>
    <p className="fine-print">Adalar: {cities.map(c => `${c.name} (${islandOf(c).name})`).join(' · ')}</p>
  </div>
}
