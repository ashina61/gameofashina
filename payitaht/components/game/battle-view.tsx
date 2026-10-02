'use client'

/**
 * SAVAŞ ALANI GÖRÜNÜMÜ (Ikariam savaş raporu): rapordaki savaş, saklanan
 * girdilerle deterministik motorda yeniden kurulur; her tur için iki ordunun
 * yuvalardaki dizilişi, sur, moral ve kayıplar gösterilir.
 */
import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from './ui-art'
import { GameButton } from './game-button'
import { FIELD_ROWS, replayBattle, troopList, type FieldRow, type Lineup, type Troops } from '@/lib/game/battle'
import type { StoredBattle } from '@/lib/game/expeditions'
import { UNITS } from '@/lib/game/engine'
import { UnitFigure } from './unit-art'

const ROW_NAMES: Record<FieldRow, string> = { front: 'Ön cephe', flank: 'Kanatlar', range: 'Uzak menzil', artillery: 'Kuşatma', air: 'Hava', fighter: 'Hava savunması' }

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
  return <section className="bf">
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
 * SAVAŞ ÖZETİ (raporun başında): kazanan şeridi, iki ordunun birlikleri
 * figürleriyle "getirilen / kaybedilen", son moral ve sur. Tur tur ayrıntı
 * BattleView'da; düz yazı satırları bunun altında kalır.
 */
export function BattleSummary({ stored, us }: { stored: StoredBattle; us: 'a' | 'd' }) {
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
    return { name: who === 'a' ? stored.attacker : stored.defender, units, lost, total, dead, morale, mine: who === us }
  }
  const sides = [side(us), side(us === 'a' ? 'd' : 'a')]
  const wallMax = stored.d.wall ?? 0
  return <section className={won ? 'bs is-won' : 'bs is-lost'} aria-label={`${stored.title} özeti`}>
    <div className="bs-banner"><strong>{won ? 'ZAFER' : 'YENİLGİ'}</strong><small>{stored.title} · {result.rounds.length} tur · {result.field.name}</small></div>
    <div className="bs-sides">{sides.map(s => <div key={s.name} className={s.mine ? 'bs-side is-mine' : 'bs-side'}>
      <div className="bs-side-head"><strong>{s.name}</strong><small>{s.total - s.dead} / {s.total} ayakta</small></div>
      <span className="bs-bar" title={`${s.total - s.dead} / ${s.total}`}><i style={{ width: `${s.total ? Math.round(100 * (s.total - s.dead) / s.total) : 0}%` }} /></span>
      <div className="bs-units">{s.units.slice(0, 8).map(([id, n]) => {
        const lost = Math.min(n, s.lost[id] ?? 0)
        return <span key={id} className={lost >= n ? 'bs-unit is-wiped' : 'bs-unit'} title={`${UNITS[id].name}: ${n} geldi, ${lost} düştü`}>
          <UnitFigure id={id} size={34} bare /><b>{n}</b>{lost > 0 && <em data-tiny>−{lost}</em>}
        </span>
      })}{s.units.length > 8 && <span className="bs-more">+{s.units.length - 8}</span>}</div>
      <small className="bs-morale">Moral <span className="bs-bar is-morale"><i style={{ width: `${s.morale}%` }} /></span> {s.morale}</small>
    </div>)}</div>
    {wallMax > 0 && <p className="bs-wall">Sur {result.wallLeft > 0 ? `${result.wallLeft} / ${wallMax} ayakta` : 'yıkıldı'}</p>}
    <p className="bs-reason">{result.reason}</p>
  </section>
}
