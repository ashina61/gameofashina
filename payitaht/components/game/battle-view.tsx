'use client'

/**
 * SAVAŞ ALANI GÖRÜNÜMÜ (Ikariam savaş raporu): rapordaki savaş, saklanan
 * girdilerle deterministik motorda yeniden kurulur; her tur için iki ordunun
 * yuvalardaki dizilişi, sur, moral ve kayıplar gösterilir.
 */
import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { FIELD_ROW_NAMES } from '@/lib/game/glossary'
import { ChevronLeft, ChevronRight, Swords } from './ui-art'
import { GameButton } from './game-button'
import { FIELD_ROWS, replayBattle, troopList, type FieldRow, type Lineup, type Troops } from '@/lib/game/battle'
import type { StoredBattle } from '@/lib/game/expeditions'
import { UNITS } from '@/lib/game/engine'
import { UnitFigure } from './unit-art'
import { asset } from '@/lib/asset'

const ROW_NAMES: Record<FieldRow, string> = FIELD_ROW_NAMES

function Row({ row, line, slots, loss }: { row: FieldRow; line: Lineup; slots: number; loss: Troops }) {
  if (!slots) return null
  const filled = line[row]
  return <div className="bf-row">
    <span className="bf-row-name">{ROW_NAMES[row]}</span>
    <div className="bf-slots">{Array.from({ length: slots }, (_, i) => {
      const s = filled[i]
      if (!s) return <span key={i} className="bf-slot bf-empty" />
      const dead = Math.min(s.n, loss[s.id] ?? 0)
      return <span key={i} className="bf-slot" title={`${s.n} ${UNITS[s.id].name}`}>
        <UnitFigure id={s.id} size={30} bare />
        <b>{s.n}</b>{dead > 0 && <em>-{dead}</em>}
      </span>
    })}</div>
  </div>
}

function Side({ name, line, field, loss, morale, top }: {
  name: string; line: Lineup; field: Record<FieldRow, number>; loss: Troops; morale: number; top: boolean
}) {
  // Ön cepheler birbirine bakar: üstteki ordu ters, alttaki düz dizilir.
  const rows = top ? [...FIELD_ROWS].reverse() : FIELD_ROWS
  return <div className="bf-side">
    <div className="bf-side-head"><strong>{name}</strong><span className="bf-morale" title="Moral"><i style={{ width: `${morale}%` }} /></span><small>moral {morale} · yedek {line.reserve}</small></div>
    {rows.map(r => <Row key={r} row={r} line={line} slots={field[r]} loss={loss} />)}
  </div>
}

/** Süren savaş: kaçıncı turda olduğu ve sıradakinin zamanı. */
export type LiveInfo = { round: number; nextAt: number; now: number }

export function BattleView({ stored, live }: { stored: StoredBattle; live?: LiveInfo }) {
  const result = useMemo(() => replayBattle(stored.a, stored.d, stored.joins, stored.retreat), [stored])
  const rounds = live ? result.rounds.slice(0, live.round) : result.rounds
  // Canlı savaşta son tur izlenir; oyuncu geri gidince o turda kalır.
  const [pick, setPick] = useState<number | null>(null)
  if (!rounds.length) return <p className="fine-print">{live ? 'Ordular meydana diziliyor…' : result.reason}</p>
  const i = Math.min(pick ?? (live ? rounds.length - 1 : 0), rounds.length - 1)
  const r = rounds[i]
  const wallMax = stored.d.wall ?? 0
  const joined = (stored.joins ?? []).filter(j => j.round === r.round && Object.values(j.troops).some(n => (n ?? 0) > 0))
  const secs = live ? Math.max(0, Math.ceil((live.nextAt - live.now) / 1000)) : 0
  return <section className="bf" style={{ backgroundImage: `url(${asset(`/images/game/terrain/battle-${stored.d.naval ? 'sea' : 'land'}.webp`)})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
    <div className="bf-head">
      <span className="eyebrow">{stored.title.toUpperCase()} · {result.field.name.toUpperCase()}{live ? ' · SÜRÜYOR' : ''}</span>
      <div className="bf-nav">
        <GameButton size="sm" variant="outline" disabled={i === 0} onClick={() => setPick(i - 1)} aria-label="Önceki tur"><ChevronLeft /></GameButton>
        <strong>Tur {r.round} / {rounds.length}</strong>
        <GameButton size="sm" variant="outline" disabled={i >= rounds.length - 1} onClick={() => setPick(i + 1 >= rounds.length - 1 && live ? null : i + 1)} aria-label="Sonraki tur"><ChevronRight /></GameButton>
      </div>
      {live && <small className="bf-next">Sıradaki tur {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}</small>}
    </div>
    <Side name={stored.defender} line={r.lineupD} field={result.field} loss={r.defenderLoss} morale={r.moraleD} top />
    {wallMax > 0 && <div className="bf-wall" title="Sur">
      <span>Sur</span>
      <span className="bf-wall-bar"><i style={{ width: `${Math.round(100 * r.wall / wallMax)}%` }} /></span>
      <small>{r.wall > 0 ? `${r.wall} / ${wallMax}` : 'yıkıldı'}</small>
    </div>}
    <div className="bf-clash" aria-hidden="true" />
    <Side name={stored.attacker} line={r.lineupA} field={result.field} loss={r.attackerLoss} morale={r.moraleA} top={false} />
    {joined.map((j, k) => <p key={k} className="bf-join">Takviye · {j.side === 'a' ? stored.attacker : stored.defender}: {troopList(j.troops)}</p>)}
    <p className="bf-sum">Bu tur: {stored.attacker} kaybı {troopList(r.attackerLoss)} · {stored.defender} kaybı {troopList(r.defenderLoss)}.</p>
    {!live && i === rounds.length - 1 && <p className={result.winner === 'attacker' ? 'report-win' : 'report-loss'}>
      {result.winner === 'attacker' ? `${stored.attacker} kazandı.` : `${stored.defender} kazandı.`} {result.reason}
    </p>}
  </section>
}

/**
 * SAVAŞ RAPORU KARTI (raporun başında; görsel brif 2, mockup: savas-raporu.webp).
 * Savaş meydanı resmi üstünde ZAFER / YENİLGİ şeridi, karşı karşıya iki
 * komutan, iki ordunun güç çubuğu ve birlik birlik "gelen / düşen" satırları.
 * Tur tur ayrıntı BattleView'da. Açılışta ~2,5 sn canlanır (ordular gelir,
 * kayıplar düşer, sonda şerit basılır); "Geç" ya da azaltılmış hareket
 * doğrudan son hâli gösterir.
 */
export function BattleSummary({ stored, us, foe }: { stored: StoredBattle; us: 'a' | 'd'; foe?: ReactNode }) {
  const result = useMemo(() => replayBattle(stored.a, stored.d, stored.joins, stored.retreat), [stored])
  const won = (result.winner === 'attacker') === (us === 'a')
  const last = result.rounds[result.rounds.length - 1]
  const side = (who: 'a' | 'd') => {
    const start = { ...(who === 'a' ? stored.a.troops : stored.d.troops) } as Troops
    for (const j of stored.joins ?? []) if (j.side === who) for (const [id, n] of Object.entries(j.troops)) start[id as keyof Troops] = (start[id as keyof Troops] ?? 0) + (n ?? 0)
    const lost = who === 'a' ? result.attackerLost : result.defenderLost
    const units = (Object.entries(start) as [keyof Troops, number][]).filter(([, n]) => n > 0).sort((x, y) => y[1] - x[1])
    const total = units.reduce((s, [, n]) => s + n, 0)
    const dead = Object.values(lost).reduce((s, n) => s + (n ?? 0), 0)
    const morale = last ? (who === 'a' ? last.moraleA : last.moraleD) : 100
    return { who, name: who === 'a' ? stored.attacker : stored.defender, units, lost, total, dead, morale, mine: who === us }
  }
  const mine = side(us), them = side(us === 'a' ? 'd' : 'a')
  const wallMax = stored.d.wall ?? 0
  const [done, setDone] = useState(false)
  const field = asset(`/images/game/terrain/battle-${stored.d.naval ? 'sea' : 'land'}.webp`)
  const share = mine.total + them.total ? Math.round(100 * mine.total / (mine.total + them.total)) : 50
  const commander = (s: typeof mine) => <div className={`bs2-cmd${s.mine ? ' is-mine' : ''}`}>
    <span className="bs2-flag" aria-hidden="true" />
    <span className="bs2-face">{s.mine
      ? <img src={asset('/images/game/portraits/advisor-army.webp')} alt="" />
      : foe ?? (s.units[0] ? <UnitFigure id={s.units[0][0]} size={64} bare /> : null)}</span>
    <strong>{s.name}</strong>
    <small>{s.who === 'a' ? 'Saldıran' : 'Savunan'}</small>
  </div>
  const column = (s: typeof mine, k: number) => <ul className={`bs2-col${s.mine ? ' is-mine' : ''}`} aria-label={`${s.name} birlikleri`}>
    {s.units.map(([id, n], i) => {
      const lost = Math.min(n, s.lost[id] ?? 0)
      return <li key={id} className={lost >= n ? 'bs2-row is-wiped' : 'bs2-row'} style={{ '--d': `${700 + i * 120 + k * 60}ms` } as CSSProperties}>
        <UnitFigure id={id} size={40} bare />
        <span><b>{UNITS[id].name}</b><small><Swords aria-hidden="true" /> {n}</small></span>
        {lost > 0 ? <em>−{lost}</em> : <i>0</i>}
      </li>
    })}
  </ul>
  return <section className={`bs bs2 ${won ? 'is-won' : 'is-lost'}${done ? ' is-done' : ''}`} aria-label={`${stored.title} özeti: ${won ? 'zafer' : 'yenilgi'}`}
    onAnimationEnd={e => { if (e.animationName === 'bs-stamp') setDone(true) }}>
    <div className="bs2-hero" style={{ backgroundImage: `url(${field})` }}>
      <div className="bs2-ribbon"><strong className="bs-stamp">{won ? 'Zafer!' : 'Yenilgi'}</strong></div>
      <small>{stored.attacker}, {stored.defender} üzerine saldırdı · {result.rounds.length} tur · {result.field.name}</small>
      {!done && <button type="button" className="bs-skip" onClick={() => setDone(true)}>Geç</button>}
    </div>
    <div className="bs2-cmds">
      {commander(mine)}
      <span className="bs2-vs" aria-hidden="true"><Swords /></span>
      {commander(them)}
    </div>
    <div className="bs2-strength" aria-label={`Güç: ${mine.total} karşı ${them.total}`}>
      <b>{mine.total.toLocaleString('tr-TR')}</b>
      <span className="bs2-split"><i style={{ width: `${share}%` }} /></span>
      <b>{them.total.toLocaleString('tr-TR')}</b>
    </div>
    <div className="bs2-cols">{column(mine, 0)}{column(them, 1)}</div>
    <div className="bs2-morale">
      <small>Moral {mine.morale}</small>
      {wallMax > 0 && <small>Sur {result.wallLeft > 0 ? `${result.wallLeft} / ${wallMax}` : 'yıkıldı'}</small>}
      <small>Moral {them.morale}</small>
    </div>
    <p className="bs-reason">{result.reason}</p>
  </section>
}
