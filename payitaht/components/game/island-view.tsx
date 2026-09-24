'use client'

/**
 * ADA GÖRÜNÜMÜ — Ikariam'daki ada ekranının karşılığı.
 *
 * Boyalı ada haritasının (tools/art/islands.py) üstünde oyuncunun şehri,
 * adanın lüks madeni ve üç bağımsız yerleşim durur. Yerleşimlere casus ve
 * ordu gönderilir; yoldaki görevler hedefin üstünde geri sayımla görünür.
 * Şehir sahnesi arkada açık kalır: ada görünümü onun üstüne biner.
 */
import { useState } from 'react'
import { ArrowLeft, ScrollText, Eye, Swords, Clock3, ShieldCheck, Users, Minus, Plus, Ship, Anchor, Skull } from 'lucide-react'
import { Button } from '@/components/ui/button'
import layout from '@/lib/game/island-layout.json'
import { asset, buildingImage } from '@/lib/asset'
import { LUXURY_NAMES, MIRACLES, UNITS, type UnitId } from '@/lib/game/engine'
import { activeCity, ISLANDS, type Empire, type IslandId } from '@/lib/game/empire'
import {
  NPC_KINDS, NPC_SETTLEMENTS, RAID_UNITS, npcById, TROOPS_PER_SHIP, WARSHIPS, availableUnits, lootPool, npcState, spyChance,
  strikeForce, targetTravelMs, transportsNeeded, type Mission,
} from '@/lib/game/expeditions'
import { UnitPicker } from './ikariam-panels'
import { RivalDiplomacy, RivalWar, type Run } from './world-panels'
import { FACTIONS, RIVALS, STYLE_NAMES, rivalById, rivalLevel } from '@/lib/game/rivals'
import { targetInfo } from '@/lib/game/expeditions'

const clock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function IslandView({ empire, islandId, now, onCity, onIsland, onMine, onNpc, onReports }: {
  empire: Empire; islandId: IslandId; now: number
  onCity: () => void; onIsland: (id: IslandId) => void; onMine: () => void; onNpc: (id: string) => void; onReports: () => void
}) {
  const active = activeCity(empire)
  const island = ISLANDS.find(i => i.id === islandId)!
  const home = island.id === active.islandId
  // Bu adadaki kendi şehrin (varsa); yoksa ada yalnızca hedeflerle görünür.
  const city = empire.cities.find(c => c.islandId === island.id)
  const spots = layout.spots as Record<string, number[]>
  const npcs = NPC_SETTLEMENTS.filter(n => n.islandId === island.id)
  const missions = (empire.missions ?? []).filter(m => m.cityId === active.id)
  const unread = (empire.reports ?? []).filter(r => r.cityId === active.id).length
  const place = (key: string) => ({ left: `${spots[key][0] * 100}%`, top: `${spots[key][1] * 100}%` })
  const missionTag = (m: Mission) => m.resolved
    ? <span className="island-mission island-return"><ArrowLeft aria-hidden="true" />{clock(m.returnAt - now)}</span>
    : <span className="island-mission">{m.kind === 'spy' ? <Eye aria-hidden="true" /> : m.units.nakliye ? <Ship aria-hidden="true" /> : <Swords aria-hidden="true" />}{clock(m.arriveAt - now)}</span>
  return <section className="island-view" aria-label={`${island.name} ada görünümü`}>
    <div className="island-toolbar">
      <Button size="sm" variant="outline" onClick={onCity}><ArrowLeft data-icon="inline-start" />Şehre dön</Button>
      <label className="island-title"><select className="island-select" value={island.id} aria-label="Ada seç" onChange={e => onIsland(e.target.value as IslandId)}>
        {ISLANDS.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</select>
        <small>{LUXURY_NAMES[island.luxury]} yatağı · {MIRACLES[island.wonder].wonder}{home ? '' : ' · deniz aşırı'}</small></label>
      <Button size="sm" variant="outline" onClick={onReports}><ScrollText data-icon="inline-start" />Raporlar{unread > 0 ? ` · ${unread}` : ''}</Button>
    </div>
    <div className="island-map">
      <img className="island-bg" src={asset(`/images/game/islands/${island.id}.webp`)} alt="" width={layout.size[0]} height={layout.size[1]} />
      {city && <button className="island-spot island-city" style={place('city')} onClick={home ? onCity : undefined} disabled={!home} aria-label={`${city.name} şehri`}>
        <img src={buildingImage('divan', city.game.buildings.divan)} alt="" />
        <span className="island-label"><strong>{city.name}</strong><small>{home ? `Divanhane ${city.game.buildings.divan}` : 'Senin şehrin · Şehirler panelinden geç'}</small></span>
      </button>}
      <button className="island-spot island-mine" style={place('mine')} onClick={home ? onMine : undefined} disabled={!home} aria-label={`${LUXURY_NAMES[island.luxury]} madeni`}>
        <img src={asset(`/images/game/buildings/mine-${island.luxury}.webp`)} alt="" />
        <span className="island-label"><strong>{LUXURY_NAMES[island.luxury]} madeni</strong><small>{city ? `Seviye ${city.game.mine.level} · ${city.game.mine.miners} işçi` : 'Koloni kurulursa işlenir'}</small></span>
      </button>
      {npcs.map(npc => {
        const state = npcState(empire, npc.id)
        const active = missions.filter(m => m.npcId === npc.id)
        return <button key={npc.id} className="island-spot island-npc" style={place(npc.kind)} onClick={() => onNpc(npc.id)}
          aria-label={`${npc.name}, ${NPC_KINDS[npc.kind].name}, seviye ${state.level}`}>
          <img src={asset(`/images/game/buildings/npc-${npc.kind}.webp`)} alt="" />
          <span className="island-label"><strong>{npc.name}</strong><small>{NPC_KINDS[npc.kind].name} · Sv. {state.level}</small></span>
          {active.map(m => <span key={m.id}>{missionTag(m)}</span>)}
        </button>
      })}
      {home && <button className="island-spot island-forest" style={place('forest')} onClick={onMine} aria-label={`Ada ormanı, seviye ${active.game.forest.level}`}>
        <span className="island-label"><strong>Ada ormanı</strong><small>Sv. {active.game.forest.level} · {active.game.forest.workers} oduncu</small></span>
      </button>}
      {RIVALS.filter(r => r.islandId === island.id).map((r, i) => {
        const level = rivalLevel(empire, r, now)
        const rel = empire.world?.rivals[r.id]?.relation ?? 0
        const tags = missions.filter(m => m.npcId === r.id)
        return <button key={r.id} className="island-spot island-rival" style={place(i === 0 ? 'rakip1' : 'rakip2')} onClick={() => onNpc(r.id)}
          aria-label={`${r.city}, ${r.ruler}, yapay rakip, seviye ${level}`}>
          <img src={buildingImage('divan', Math.min(30, level * 2))} alt="" />
          <span className={`island-label rival-label ${rel >= 0 ? 'rival-friend' : 'rival-foe'}`}><strong>{r.city}</strong><small>{r.ruler} · YZ · Sv. {level}</small></span>
          {tags.map(m => <span key={m.id}>{m.stationed ? <span className="island-mission island-station"><Anchor aria-hidden="true" />{m.kind === 'occupy' ? 'işgal' : 'abluka'}</span> : missionTag(m)}</span>)}
        </button>
      })}
    </div>
  </section>
}

/** Bağımsız yerleşimin ya da yapay rakip şehrinin paneli: bilgi, casus, sefer (ve rakipte diplomasi, işgal, abluka). */
export function NpcPanel({ empire, npcId, now, onSpy, onRaid, onOccupy, onBlockade, run }: {
  empire: Empire; npcId: string; now: number
  onSpy: (count: number) => void
  onRaid: (units: Partial<Record<UnitId, number>>) => void
  onOccupy: (units: Partial<Record<UnitId, number>>) => void
  onBlockade: (units: Partial<Record<UnitId, number>>) => void
  run: Run
}) {
  const npc = targetInfo(empire, npcId, now)!
  const rival = rivalById(npcId)
  const city = activeCity(empire)
  const g = city.game
  const state = { level: npc.level }
  const free = availableUnits(empire, city.id)
  const [spies, setSpies] = useState(1)
  const [pick, setPick] = useState<Partial<Record<UnitId, number>>>({})
  const overseas = npc.islandId !== city.islandId
  const ships = transportsNeeded(pick)
  const intel = (empire.reports ?? []).find(r => r.npcId === npcId && r.cityId === city.id && r.kind === 'spy' && r.success)
  const lastRaid = (empire.reports ?? []).find(r => r.npcId === npcId && r.cityId === city.id && r.kind === 'raid')
  const busy = (kind: Mission['kind']) => (empire.missions ?? []).some(m => m.cityId === city.id && m.npcId === npcId && m.kind === kind && !m.resolved)
  const force = Math.round(strikeForce(g, pick))
  const pool = npc.loot
  return <div className="advisor-panel npc-panel">
    <article className="city-card">
      <div className="city-card-top">
        <span className="city-emblem npc-emblem"><img src={rival ? buildingImage('divan', Math.min(30, npc.level * 2)) : asset(`/images/game/buildings/npc-${npcById(npcId)!.kind}.webp`)} alt="" /></span>
        <span><span className="eyebrow">{npc.kindName.toLocaleUpperCase('tr')} · SEVİYE {state.level}</span>
          <strong>{npc.name}</strong><span>{rival ? `${rival.ruler} · ${STYLE_NAMES[rival.style]} · ${FACTIONS[rival.faction].name}` : NPC_KINDS[npcById(npcId)!.kind].description}</span></span>
      </div>
      <p className="fine-print">{rival
        ? `Yapay rakip hükümdar (gerçek oyuncu değil). Gücü dünya yaşıyla büyür; yağmalanan hazinesi 2 saatte dolar${pool.gold > 0 ? '' : ' — şu an boş'}.`
        : `Bağımsız bir yerleşim (gerçek oyuncu değil). Yağmalanınca toparlanır ve bir seviye güçlenir; hazinesi 45 dakikada dolar${pool.gold > 0 ? '' : ' — şu an boş'}.`}</p>
    </article>

    <section className="empire-section">
      <h3>Son istihbarat</h3>
      {intel
        ? <ul className="report-lines">{intel.lines.map(l => <li key={l}>{l}</li>)}</ul>
        : <p className="fine-print">Bu yerleşim hakkında bilgi yok. Casus gönder: garnizonu, suru ve hazineyi öğrenirsin.</p>}
    </section>

    <section className="empire-section">
      <h3><Eye className="size-4" /> Casus gönder</h3>
      {g.buildings.elcilik < 1
        ? <p className="fine-print">Casuslar Elçilik'te yetişir. Önce Elçilik kur.</p>
        : <>
          <div className="batch-row"><span>Casus</span>
            <Button size="sm" variant="outline" onClick={() => setSpies(n => Math.max(1, n - 1))} aria-label="Azalt"><Minus /></Button>
            <strong className="stepper-value">{spies}</strong>
            <Button size="sm" variant="outline" onClick={() => setSpies(n => Math.min(Math.max(1, free.casus), n + 1))} aria-label="Artır"><Plus /></Button>
            <small>{free.casus} boşta</small></div>
          <p className="fine-print">Başarı şansı %{Math.round(spyChance(g, spies, state.level) * 100)} · yol {clock(targetTravelMs(city, npcId, 'spy', state.level))}. Başarısız casus yakalanır.</p>
          <Button size="sm" disabled={busy('spy') || free.casus < spies} onClick={() => onSpy(spies)}><Eye data-icon="inline-start" />Casusları gönder</Button>
        </>}
    </section>

    <section className="empire-section">
      <h3><Swords className="size-4" /> Sefere çık</h3>
      {RAID_UNITS.every(id => free[id] <= 0) && <p className="fine-print">Boşta kara birliği yok. Kışla'da asker yetiştir.</p>}
      <UnitPicker ids={RAID_UNITS} free={free} pick={pick} onPick={setPick} step={5} />
      {overseas && <>
        <h4 className="picker-heading"><Anchor className="size-4" /> Eskort gemileri</h4>
        {WARSHIPS.every(id => free[id] <= 0)
          ? <p className="fine-print">Boşta savaş gemisi yok. Donanması olan hedefe eskortsuz çıkarma yapılamaz.</p>
          : <UnitPicker ids={WARSHIPS} free={free} pick={pick} onPick={setPick} />}
        <p className={ships > free.nakliye ? 'requirement' : 'fine-print'}><Ship className="size-4" /> Deniz aşırı sefer: {ships} nakliye gemisi gerekli (her gemi {TROOPS_PER_SHIP} asker taşır) · boşta {free.nakliye}. Önce deniz savaşı, sonra çıkarma.</p>
      </>}
      <div className="raid-summary">
        <span><Swords className="size-4" />Saldırı {force}</span>
        <span><ShieldCheck className="size-4" />Savunma {intel ? intel.lines.find(l => l.includes('Toplam savunma'))?.match(/Toplam savunma (\d+)/)?.[1] ?? '?' : '?'}</span>
        <span><Clock3 className="size-4" />Yol {clock(targetTravelMs(city, npcId, 'raid', state.level))}</span>
        <span><Users className="size-4" />Taşıma {overseas ? Math.max(ships * UNITS.nakliye.cargo, RAID_UNITS.reduce((s, id) => s + UNITS[id].pop * (pick[id] ?? 0) * 30, 0))
          : RAID_UNITS.reduce((s, id) => s + UNITS[id].pop * (pick[id] ?? 0) * 30, 0)}</span>
      </div>
      <p className="fine-print">Savaş en fazla 6 tur sürer ve zar yoktur. Ön cephe hasarın çoğunu karşılar, kuşatma birlikleri (koçbaşı, mancınık, topçu) suru hızla yıkar. Morali 30'un altına düşen taraf geri çekilir. Aşçı morali korur, hekim yaralıları kurtarır. Ganimeti hayatta kalanlar taşır.</p>
      <Button size="sm" disabled={busy('raid') || !RAID_UNITS.some(id => (pick[id] ?? 0) > 0) || (overseas && ships > free.nakliye)} onClick={() => { onRaid(pick); setPick({}) }}><Swords data-icon="inline-start" />Sefere çık</Button>
      {busy('raid') && <p className="requirement"><Clock3 className="size-4" />Bu hedefe giden bir ordu yolda.</p>}
    </section>

    {rival && <RivalWar empire={empire} rivalId={npcId} onOccupy={onOccupy} onBlockade={onBlockade} />}
    {rival && <RivalDiplomacy empire={empire} rivalId={npcId} now={now} run={run} />}
    {lastRaid && <section className="empire-section">
      <h3>Son sefer</h3>
      <p className={lastRaid.success ? 'report-win' : 'report-loss'}>{lastRaid.title}</p>
      <ul className="report-lines">{lastRaid.lines.map(l => <li key={l}>{l}</li>)}</ul>
    </section>}
  </div>
}

/** Savaş ve casusluk raporları. */
export function ReportsPanel({ empire }: { empire: Empire }) {
  const city = activeCity(empire)
  const reports = (empire.reports ?? []).filter(r => r.cityId === city.id)
  if (!reports.length) return <p className="fine-print">Henüz rapor yok. Ada görünümünden bir yerleşime casus ya da ordu gönder.</p>
  return <div className="advisor-panel">{reports.map(r => <article key={r.id} className="report-card">
    <div className="report-head">{r.kind === 'spy' ? <Eye className="size-4" /> : r.kind === 'piracy' ? <Skull className="size-4" /> : r.kind === 'defense' ? <ShieldCheck className="size-4" /> : <Swords className="size-4" />}
      <strong className={r.success ? 'report-win' : 'report-loss'}>{r.title}</strong>
      <time>{new Date(r.time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</time></div>
    <ul className="report-lines">{r.lines.map(l => <li key={l}>{l}</li>)}</ul>
  </article>)}</div>
}
