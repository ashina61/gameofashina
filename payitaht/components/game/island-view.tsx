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
import { ArrowLeft, ScrollText, Eye, Swords, Clock3, ShieldCheck, Users, Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import layout from '@/lib/game/island-layout.json'
import { asset, buildingImage } from '@/lib/asset'
import { LUXURY_NAMES, UNITS, type UnitId } from '@/lib/game/engine'
import { activeCity, islandOf, type Empire } from '@/lib/game/empire'
import {
  NPC_KINDS, NPC_SETTLEMENTS, RAID_UNITS, availableUnits, lootPool, npcState, raidTravelMs, spyChance,
  spyTravelMs, strikeForce, type Mission,
} from '@/lib/game/expeditions'

const clock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function IslandView({ empire, now, onCity, onMine, onNpc, onReports }: {
  empire: Empire; now: number
  onCity: () => void; onMine: () => void; onNpc: (id: string) => void; onReports: () => void
}) {
  const city = activeCity(empire)
  const island = islandOf(city)
  const spots = layout.spots as Record<string, number[]>
  const npcs = NPC_SETTLEMENTS.filter(n => n.islandId === island.id)
  const missions = (empire.missions ?? []).filter(m => m.cityId === city.id)
  const unread = (empire.reports ?? []).filter(r => r.cityId === city.id).length
  const place = (key: string) => ({ left: `${spots[key][0] * 100}%`, top: `${spots[key][1] * 100}%` })
  const missionTag = (m: Mission) => m.resolved
    ? <span className="island-mission island-return"><ArrowLeft aria-hidden="true" />{clock(m.returnAt - now)}</span>
    : <span className="island-mission">{m.kind === 'spy' ? <Eye aria-hidden="true" /> : <Swords aria-hidden="true" />}{clock(m.arriveAt - now)}</span>
  return <section className="island-view" aria-label={`${island.name} ada görünümü`}>
    <div className="island-toolbar">
      <Button size="sm" variant="outline" onClick={onCity}><ArrowLeft data-icon="inline-start" />Şehre dön</Button>
      <span className="island-title"><strong>{island.name}</strong><small>{LUXURY_NAMES[island.luxury]} yatağı</small></span>
      <Button size="sm" variant="outline" onClick={onReports}><ScrollText data-icon="inline-start" />Raporlar{unread > 0 ? ` · ${unread}` : ''}</Button>
    </div>
    <div className="island-map">
      <img className="island-bg" src={asset(`/images/game/islands/${island.id}.webp`)} alt="" width={layout.size[0]} height={layout.size[1]} />
      <button className="island-spot island-city" style={place('city')} onClick={onCity} aria-label={`${city.name} şehrine git`}>
        <img src={buildingImage('divan', city.game.buildings.divan)} alt="" />
        <span className="island-label"><strong>{city.name}</strong><small>Divanhane {city.game.buildings.divan}</small></span>
      </button>
      <button className="island-spot island-mine" style={place('mine')} onClick={onMine} aria-label={`${LUXURY_NAMES[island.luxury]} madeni`}>
        <img src={asset(`/images/game/buildings/mine-${island.luxury}.webp`)} alt="" />
        <span className="island-label"><strong>{LUXURY_NAMES[island.luxury]} madeni</strong><small>Seviye {city.game.mine.level} · {city.game.mine.miners} işçi</small></span>
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
    </div>
  </section>
}

/** Bir bağımsız yerleşimin paneli: bilgi, casus, sefer. */
export function NpcPanel({ empire, npcId, now, onSpy, onRaid }: {
  empire: Empire; npcId: string; now: number
  onSpy: (count: number) => void
  onRaid: (units: Partial<Record<UnitId, number>>) => void
}) {
  const npc = NPC_SETTLEMENTS.find(n => n.id === npcId)!
  const city = activeCity(empire)
  const g = city.game
  const state = npcState(empire, npcId)
  const free = availableUnits(empire, city.id)
  const [spies, setSpies] = useState(1)
  const [pick, setPick] = useState<Partial<Record<UnitId, number>>>({})
  const intel = (empire.reports ?? []).find(r => r.npcId === npcId && r.cityId === city.id && r.kind === 'spy' && r.success)
  const lastRaid = (empire.reports ?? []).find(r => r.npcId === npcId && r.cityId === city.id && r.kind === 'raid')
  const busy = (kind: Mission['kind']) => (empire.missions ?? []).some(m => m.cityId === city.id && m.npcId === npcId && m.kind === kind && !m.resolved)
  const force = Math.round(strikeForce(g, pick))
  const picked = Object.values(pick).some(n => (n ?? 0) > 0)
  const pool = lootPool(state, now)
  const step = (id: UnitId, delta: number) => setPick(p => ({ ...p, [id]: Math.max(0, Math.min(free[id], (p[id] ?? 0) + delta)) }))
  return <div className="advisor-panel npc-panel">
    <article className="city-card">
      <div className="city-card-top">
        <span className="city-emblem npc-emblem"><img src={asset(`/images/game/buildings/npc-${npc.kind}.webp`)} alt="" /></span>
        <span><span className="eyebrow">{NPC_KINDS[npc.kind].name.toLocaleUpperCase('tr')} · SEVİYE {state.level}</span>
          <strong>{npc.name}</strong><span>{NPC_KINDS[npc.kind].description}</span></span>
      </div>
      <p className="fine-print">Bağımsız bir yerleşim (gerçek oyuncu değil). Yağmalanınca toparlanır ve bir seviye güçlenir; hazinesi {Math.round(45)} dakikada dolar{pool.gold > 0 ? '' : ' — şu an boş'}.</p>
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
          <p className="fine-print">Başarı şansı %{Math.round(spyChance(g, spies, state.level) * 100)} · yol {clock(spyTravelMs(state.level))}. Başarısız casus yakalanır.</p>
          <Button size="sm" disabled={busy('spy') || free.casus < spies} onClick={() => onSpy(spies)}><Eye data-icon="inline-start" />Casusları gönder</Button>
        </>}
    </section>

    <section className="empire-section">
      <h3><Swords className="size-4" /> Sefere çık</h3>
      {RAID_UNITS.every(id => free[id] <= 0) && <p className="fine-print">Boşta kara birliği yok. Kışla'da asker yetiştir.</p>}
      <div className="raid-units">{RAID_UNITS.filter(id => free[id] > 0 || (pick[id] ?? 0) > 0).map(id => <div key={id} className="raid-unit">
        <span><strong>{UNITS[id].name}</strong><small>{free[id]} boşta · saldırı {UNITS[id].attack}</small></span>
        <Button size="sm" variant="outline" disabled={!(pick[id] ?? 0)} onClick={() => step(id, -5)} aria-label={`${UNITS[id].name} azalt`}><Minus /></Button>
        <strong className="stepper-value">{pick[id] ?? 0}</strong>
        <Button size="sm" variant="outline" disabled={(pick[id] ?? 0) >= free[id]} onClick={() => step(id, 5)} aria-label={`${UNITS[id].name} artır`}><Plus /></Button>
        <Button size="sm" variant="ghost" onClick={() => setPick(p => ({ ...p, [id]: free[id] }))}>Hepsi</Button>
      </div>)}</div>
      <div className="raid-summary">
        <span><Swords className="size-4" />Saldırı {force}</span>
        <span><ShieldCheck className="size-4" />Savunma {intel ? intel.lines.find(l => l.includes('Toplam savunma'))?.match(/Toplam savunma (\d+)/)?.[1] ?? '?' : '?'}</span>
        <span><Clock3 className="size-4" />Yol {clock(raidTravelMs(state.level))}</span>
        <span><Users className="size-4" />Taşıma {Object.entries(pick).reduce((s, [id, n]) => s + UNITS[id as UnitId].pop * (n ?? 0) * 30, 0)}</span>
      </div>
      <p className="fine-print">Savaş en fazla 6 tur sürer ve zar yoktur. Ön cephe hasarın çoğunu karşılar, kuşatma birlikleri (koçbaşı, mancınık, topçu) suru hızla yıkar. Morali 30'un altına düşen taraf geri çekilir. Aşçı morali korur, hekim yaralıları kurtarır. Ganimeti hayatta kalanlar taşır.</p>
      <Button size="sm" disabled={busy('raid') || !picked} onClick={() => { onRaid(pick); setPick({}) }}><Swords data-icon="inline-start" />Sefere çık</Button>
      {busy('raid') && <p className="requirement"><Clock3 className="size-4" />Bu hedefe giden bir ordu yolda.</p>}
    </section>

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
    <div className="report-head">{r.kind === 'spy' ? <Eye className="size-4" /> : <Swords className="size-4" />}
      <strong className={r.success ? 'report-win' : 'report-loss'}>{r.title}</strong>
      <time>{new Date(r.time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</time></div>
    <ul className="report-lines">{r.lines.map(l => <li key={l}>{l}</li>)}</ul>
  </article>)}</div>
}
