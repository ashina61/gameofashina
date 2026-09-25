'use client'

/**
 * SAVAŞ ALANI GÖRÜNÜMÜ (Ikariam savaş raporu): rapordaki savaş, saklanan
 * girdilerle deterministik motorda yeniden kurulur; her tur için iki ordunun
 * yuvalardaki dizilişi, sur, moral ve kayıplar gösterilir.
 */
import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { battle, FIELD_ROWS, troopList, type FieldRow, type Lineup, type Troops } from '@/lib/game/battle'
import type { StoredBattle } from '@/lib/game/expeditions'
import { UNITS } from '@/lib/game/engine'
import { UnitFigure } from './unit-art'

const ROW_NAMES: Record<FieldRow, string> = { front: 'Ön cephe', flank: 'Kanatlar', range: 'Uzak menzil', artillery: 'Kuşatma' }

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

export function BattleView({ stored }: { stored: StoredBattle }) {
  const result = useMemo(() => battle(stored.a, stored.d), [stored])
  const [i, setI] = useState(0)
  if (!result.rounds.length) return <p className="fine-print">{result.reason}</p>
  const r = result.rounds[Math.min(i, result.rounds.length - 1)]
  const wallMax = stored.d.wall ?? 0
  return <section className="bf">
    <div className="bf-head">
      <span className="eyebrow">{stored.title.toUpperCase()} · {result.field.name.toUpperCase()}</span>
      <div className="bf-nav">
        <Button size="sm" variant="outline" disabled={i === 0} onClick={() => setI(i - 1)} aria-label="Önceki tur"><ChevronLeft /></Button>
        <strong>Tur {r.round} / {result.rounds.length}</strong>
        <Button size="sm" variant="outline" disabled={i >= result.rounds.length - 1} onClick={() => setI(i + 1)} aria-label="Sonraki tur"><ChevronRight /></Button>
      </div>
    </div>
    <Side name={stored.defender} line={r.lineupD} field={result.field} loss={r.defenderLoss} morale={r.moraleD} top />
    {wallMax > 0 && <div className="bf-wall" title="Sur">
      <span>Sur</span>
      <span className="bf-wall-bar"><i style={{ width: `${Math.round(100 * r.wall / wallMax)}%` }} /></span>
      <small>{r.wall > 0 ? `${r.wall} / ${wallMax}` : 'yıkıldı'}</small>
    </div>}
    <div className="bf-clash" aria-hidden="true" />
    <Side name={stored.attacker} line={r.lineupA} field={result.field} loss={r.attackerLoss} morale={r.moraleA} top={false} />
    <p className="bf-sum">Bu tur: {stored.attacker} kaybı {troopList(r.attackerLoss)} · {stored.defender} kaybı {troopList(r.defenderLoss)}.</p>
    {i === result.rounds.length - 1 && <p className={result.winner === 'attacker' ? 'report-win' : 'report-loss'}>
      {result.winner === 'attacker' ? `${stored.attacker} kazandı.` : `${stored.defender} kazandı.`} {result.reason}
    </p>}
  </section>
}
