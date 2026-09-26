'use client'

/**
 * ADA GÖRÜNÜMÜ — Ikariam'daki ada ekranının karşılığı.
 *
 * Boyalı ada haritasının (tools/art/islands.py) üstünde oyuncunun şehri,
 * adanın lüks madeni ve üç bağımsız yerleşim durur. Yerleşimlere casus ve
 * ordu gönderilir; yoldaki görevler hedefin üstünde geri sayımla görünür.
 * Şehir sahnesi arkada açık kalır: ada görünümü onun üstüne biner.
 */
import { Hint } from './hint'
import { useState } from 'react'
import { ArrowLeft, ScrollText, Eye, Swords, Clock3, ShieldCheck, Users, Minus, Plus, Ship, Anchor, Skull, Flag, Bookmark, BookmarkCheck, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import layout from '@/lib/game/island-layout.json'
import { asset, buildingImage } from '@/lib/asset'
import { LUXURY_NAMES, MIRACLES, UNITS, type UnitId } from '@/lib/game/engine'
import { activeCity, ISLANDS, type Empire, type IslandId } from '@/lib/game/empire'
import {
  NPC_KINDS, NPC_SETTLEMENTS, RAID_UNITS, npcById, TROOPS_PER_SHIP, WARSHIPS, availableUnits, lootPool, npcState, spyChance,
  strikeForce, targetTravelMs, transportsNeeded, recallMission, spyMission, spyTaskChance, SPY_TYPES, SPY_TYPE_IDS, type Mission,
} from '@/lib/game/expeditions'
import { UnitPicker } from './ikariam-panels'
import { RivalDiplomacy, RivalSupport, RivalWar, type Run } from './world-panels'
import { FACTIONS, RIVALS, STYLE_NAMES, rivalById, rivalLevel } from '@/lib/game/rivals'
import { clearReports, deleteReport, keepReport, targetInfo, type Report } from '@/lib/game/expeditions'
import { BattleView } from './battle-view'
import { RETREAT_MORALE, fieldSize } from '@/lib/game/battle'

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
  const STATION: Record<string, string> = { occupy: 'işgal', blockade: 'abluka', spy: 'casus', support: 'destek' }
  const missionTag = (m: Mission) => m.battle
    ? <span className="island-mission island-fight"><Swords aria-hidden="true" />tur {m.battle.state.round}</span>
    : m.stationed ? <span className="island-mission island-station">{m.kind === 'spy' ? <Eye aria-hidden="true" /> : <Anchor aria-hidden="true" />}{STATION[m.kind] ?? ''}</span>
    : m.resolved ? <span className="island-mission island-return"><ArrowLeft aria-hidden="true" />{clock(m.returnAt - now)}</span>
    : <span className="island-mission">{m.kind === 'spy' ? <Eye aria-hidden="true" /> : m.kind === 'support' ? <ShieldCheck aria-hidden="true" /> : m.units.nakliye ? <Ship aria-hidden="true" /> : <Swords aria-hidden="true" />}{clock(m.arriveAt - now)}</span>
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
          {tags.map(m => <span key={m.id}>{missionTag(m)}</span>)}
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
  const spyReports = (empire.reports ?? []).filter(r => r.npcId === npcId && r.cityId === city.id && r.kind === 'spy' && r.success)
  // Her görev türünün en son raporu (eski kayıtlardaki genel rapor da gösterilir).
  const intelByType = SPY_TYPE_IDS.map(t => spyReports.find(r => r.intel === t)).filter(r => !!r)
  const legacy = spyReports.find(r => !r.intel && r.lines.some(l => l.startsWith('Garnizon')))
  const intel = [...intelByType, ...(legacy && !intelByType.length ? [legacy] : [])]
  const inside = (empire.missions ?? []).find(m => m.kind === 'spy' && m.stationed && m.cityId === city.id && m.npcId === npcId)
  const lastRaid = (empire.reports ?? []).find(r => r.npcId === npcId && r.cityId === city.id && r.kind === 'raid')
  const busy = (kind: Mission['kind']) => (empire.missions ?? []).some(m => m.cityId === city.id && m.npcId === npcId && m.kind === kind && !m.resolved && !m.battle)
  const fighting = (empire.missions ?? []).find(m => m.npcId === npcId && m.battle)
  const field = fieldSize(npc.field)
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
      {intel.length
        ? intel.map(r => <div key={r.id} className="intel-block">
          <span className="eyebrow">{r.intel ? SPY_TYPES[r.intel].name.toUpperCase() : 'GENEL RAPOR'} · {new Date(r.time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
          <ReportLines lines={r.lines} />
        </div>)
        : <Hint>Bu yerleşim hakkında bilgi yok. Casus sızdır, sonra görev ver: garnizonu, suru, limanı ve hazineyi öğrenirsin.</Hint>}
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
          <p className="fine-print">Sızma şansı %{Math.round(spyChance(g, spies, state.level) * 100)} · yol {clock(targetTravelMs(city, npcId, 'spy', state.level))}. Casuslar şehirde kalır ve görev bekler; sızamayan yakalanır.</p>
          <Button size="sm" disabled={busy('spy') || free.casus < spies} onClick={() => onSpy(spies)}><Eye data-icon="inline-start" />{inside ? 'Ağa casus ekle' : 'Casusları gönder'}</Button>
          {inside && <div className="spy-desk">
            <div className="spy-desk-top"><strong>İçeride {inside.units.casus ?? 0} casus</strong>
              <Button size="sm" variant="outline" onClick={() => run((e, t) => recallMission(e, inside.id, t), 'Casuslar geri çağrıldı.')}>Geri çağır</Button></div>
            {inside.spyTask && <p className="requirement"><Clock3 className="size-4" />{SPY_TYPES[inside.spyTask.type].name} · {clock(inside.spyTask.at - now)}</p>}
            {SPY_TYPE_IDS.filter(t => t !== 'arastirma' || !!rival).map(t => <button key={t} type="button" className="spy-task" disabled={!!inside.spyTask}
              onClick={() => run((e, x) => spyMission(e, inside.id, t, x), `Görev verildi: ${SPY_TYPES[t].name}.`)}>
              <strong>{SPY_TYPES[t].name}</strong><small>{SPY_TYPES[t].description}</small>
              <small>Şans %{Math.round(spyTaskChance(g, inside.units.casus ?? 0, state.level, t) * 100)} · {clock(SPY_TYPES[t].minutes * 60_000)}</small>
            </button>)}
            <Hint>Başarısız görevde bir casus yakalanır. Casuslar geri çağrılana kadar şehirde kalır ve hamle puanı harcamaz.</Hint>
          </div>}
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
        <span><ShieldCheck className="size-4" />Savunma {intel.flatMap(r => r.lines).find(l => l.includes('Toplam savunma'))?.match(/Toplam savunma (\d+)/)?.[1] ?? '?'}</span>
        <span title={`Ön cephe ${field.front}, kanat ${field.flank}, menzil ${field.range}, kuşatma ${field.artillery} yuva`}><Flag className="size-4" />{field.name}</span>
        <span title="Ordu en yavaş birliği kadar hızlıdır"><Clock3 className="size-4" />Yol {clock(targetTravelMs(city, npcId, 'raid', state.level, pick))}</span>
        <span><Users className="size-4" />Taşıma {overseas ? Math.max(ships * UNITS.nakliye.cargo, RAID_UNITS.reduce((s, id) => s + UNITS[id].pop * (pick[id] ?? 0) * 30, 0))
          : RAID_UNITS.reduce((s, id) => s + UNITS[id].pop * (pick[id] ?? 0) * 30, 0)}</span>
      </div>
      <Hint>Savaş {field.name.toLocaleLowerCase('tr')}da (Divanhane {npc.field} karşılığı) dakikada bir tur, bir taraf dağılana ya da kaçana kadar sürer; zar yoktur. Ön cephe hasarın çoğunu karşılar, kuşatma birlikleri (koçbaşı, mancınık, topçu) suru yıkar. Morali {RETREAT_MORALE}'in altına düşen taraf çekilir. Turlar arasında aynı şehirden gelen ordu takviye olarak katılır; Seferler panelinden geri çekilebilirsin. Ganimeti hayatta kalanlar taşır.</Hint>
      {fighting && <p className="requirement"><Swords className="size-4" />Burada savaş sürüyor (tur {fighting.battle!.state.round}). {fighting.cityId === city.id ? 'Göndereceğin ordu takviye olarak katılır.' : 'Yeni ordu savaş bitene kadar önünde bekler.'}</p>}
      <Button size="sm" disabled={busy('raid') || !RAID_UNITS.some(id => (pick[id] ?? 0) > 0) || (overseas && ships > free.nakliye)} onClick={() => { onRaid(pick); setPick({}) }}><Swords data-icon="inline-start" />{fighting?.cityId === city.id ? 'Takviye gönder' : 'Sefere çık'}</Button>
      {busy('raid') && <p className="requirement"><Clock3 className="size-4" />Bu hedefe giden bir ordu yolda.</p>}
    </section>

    {rival && (empire.world?.alliance === rival.faction
      ? <RivalSupport empire={empire} rivalId={npcId} now={now} run={run} />
      : <RivalWar empire={empire} rivalId={npcId} onOccupy={onOccupy} onBlockade={onBlockade} />)}
    {rival && <RivalDiplomacy empire={empire} rivalId={npcId} now={now} run={run} />}
    {lastRaid && <section className="empire-section">
      <h3>Son sefer</h3>
      <p className={lastRaid.success ? 'report-win' : 'report-loss'}>{lastRaid.title}</p>
      <ReportLines lines={lastRaid.lines} />
    </section>}
  </div>
}

/**
 * RAPOR SATIRLARI: "Tur 3: kaybımız … · düşman kaybı … · moral 80/60." gibi
 * ardışık tur satırları okunaklı bir tur tablosuna dönüşür; diğer satırlar
 * düz yazı kalır. Eski kayıtlardaki raporlar da aynı biçimde okunur.
 */
type RoundRow = { round: number; a: string; b: string; wall: string | null; moraleA: number; moraleD: number; labels: [string, string] }
const splitLoss = (part: string) => { const m = part.match(/^(.*?) ((?:\d|yok).*)$/); return m ? [m[1], m[2]] : [part, ''] }
function parseRound(line: string): RoundRow | null {
  const m = line.match(/^Tur (\d+): (.+)$/)
  if (!m) return null
  const parts = m[2].replace(/\.$/, '').split(' · ')
  const moral = parts.pop()?.match(/moral (\d+)\/(\d+)/)
  if (!moral || parts.length < 2) return null
  const wall = parts.length > 2 ? parts[2].replace(/^sur /, '') : null
  const [la, a] = splitLoss(parts[0]), [lb, b] = splitLoss(parts[1])
  return { round: +m[1], a, b, wall, moraleA: +moral[1], moraleD: +moral[2], labels: [la, lb] }
}
const cap = (t: string) => t.charAt(0).toLocaleUpperCase('tr') + t.slice(1)
function RoundTable({ rows, title }: { rows: RoundRow[]; title?: string }) {
  const [all, setAll] = useState(false)
  const long = rows.length > 6
  const shown = long && !all ? [...rows.slice(0, 3), ...rows.slice(-2)] : rows
  const hasWall = rows.some(r => r.wall)
  const loss = (t: string) => t === 'yok' || !t ? <span className="rt-none">—</span> : t
  return <div className="round-table">
    {title && <p className="round-table-title"><Swords className="size-3" />{title.replace(/:$/, '')}</p>}
    <table>
      <thead><tr><th>Tur</th><th className="rt-a">{cap(rows[0].labels[0])}</th><th className="rt-b">{cap(rows[0].labels[1])}</th>{hasWall && <th>Sur</th>}<th>Moral</th></tr></thead>
      <tbody>{shown.flatMap((r, i) => [...(long && !all && i === 3 ? [<tr key="gap" className="rt-gap"><td colSpan={hasWall ? 5 : 4}>⋯ {rows.length - 5} tur ⋯</td></tr>] : []), <tr key={r.round}>
        <td className="rt-round">{r.round}</td><td>{loss(r.a)}</td><td>{loss(r.b)}</td>{hasWall && <td>{r.wall ?? '—'}</td>}
        <td className="rt-morale"><span className="rt-bar"><i style={{ width: `${Math.min(100, r.moraleA)}%` }} /></span><span className="rt-bar is-foe"><i style={{ width: `${Math.min(100, r.moraleD)}%` }} /></span></td>
      </tr>])}</tbody>
    </table>
    {long && <button type="button" className="round-table-more" onClick={() => setAll(v => !v)}>{all ? 'Kısalt' : `Bütün turlar (${rows.length})`}</button>}
  </div>
}
export function ReportLines({ lines }: { lines: string[] }) {
  const blocks: Array<{ kind: 'text'; text: string } | { kind: 'rounds'; rows: RoundRow[]; title?: string }> = []
  for (const l of lines) {
    const row = parseRound(l)
    const last = blocks[blocks.length - 1]
    if (row) {
      if (last?.kind === 'rounds') last.rows.push(row)
      else if (last?.kind === 'text' && /:$/.test(last.text)) { blocks.pop(); blocks.push({ kind: 'rounds', rows: [row], title: last.text }) }
      else blocks.push({ kind: 'rounds', rows: [row] })
    } else blocks.push({ kind: 'text', text: l })
  }
  return <div className="report-body">{blocks.map((b, i) => b.kind === 'rounds'
    ? <RoundTable key={i} rows={b.rows} title={b.title} />
    : <p key={i} className="report-line">{b.text}</p>)}</div>
}

/** Savaş ve casusluk raporları. */
export function ReportsPanel({ empire, run }: { empire: Empire; run?: Run }) {
  const city = activeCity(empire)
  const reports = (empire.reports ?? []).filter(r => r.cityId === city.id)
  if (!reports.length) return <p className="fine-print">Henüz rapor yok. Ada görünümünden bir yerleşime casus ya da ordu gönder.</p>
  const loose = reports.filter(r => !r.kept).length
  return <div className="advisor-panel">
    {run && loose > 1 && <div className="report-tools">
      <span>{reports.length} rapor · {reports.length - loose} arşivde</span>
      <Button size="sm" variant="outline" onClick={() => run((e, t) => clearReports(e, city.id, t), 'Raporlar temizlendi.')}><Trash2 data-icon="inline-start" />Arşivlenmemişleri sil</Button>
    </div>}
    {reports.map(r => <article key={r.id} className={r.kept ? 'report-card is-kept' : 'report-card'}>
      <div className="report-head">{r.kind === 'spy' ? <Eye className="size-4" /> : r.kind === 'piracy' ? <Skull className="size-4" /> : r.kind === 'defense' ? <ShieldCheck className="size-4" /> : <Swords className="size-4" />}
        <strong className={r.success ? 'report-win' : 'report-loss'}>{r.title}</strong>
        <time>{new Date(r.time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</time>
        {run && <span className="report-actions">
          <button type="button" aria-pressed={!!r.kept} aria-label={r.kept ? 'Arşivden çıkar' : 'Arşivle'} title={r.kept ? 'Arşivden çıkar' : 'Arşivle (silinmez)'}
            onClick={() => run((e, t) => keepReport(e, r.id, t))}>{r.kept ? <BookmarkCheck /> : <Bookmark />}</button>
          <button type="button" aria-label="Raporu sil" title="Sil" onClick={() => run((e, t) => deleteReport(e, r.id, t))}><Trash2 /></button>
        </span>}</div>
      {r.battles?.length ? <ReportBattles report={r} /> : null}
      <ReportLines lines={r.lines} />
    </article>)}</div>
}

/** Rapordaki savaşların savaş alanı görünümü (açılır). */
function ReportBattles({ report }: { report: Report }) {
  const [open, setOpen] = useState<number | null>(null)
  return <div className="report-battles">
    <div className="report-battle-tabs">{report.battles!.map((b, i) =>
      <Button key={i} size="sm" variant={open === i ? 'default' : 'outline'} onClick={() => setOpen(open === i ? null : i)}>
        <Swords data-icon="inline-start" />{b.title}
      </Button>)}</div>
    {open !== null && report.battles![open] && <BattleView stored={report.battles![open]} />}
  </div>
}
