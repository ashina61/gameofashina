'use client'
import { KumSaatiArt } from './resource-art'

/**
 * ONGUN MABEDİ PANELİ: lütuf, sunu, hami tanrı ve kudret.
 * G9 portreleri aynı boyalı atlas ailesinden gelir.
 */
import { useState } from 'react'
import { AtlasArt } from './deep-art'
import { Flame, Sparkles } from './ui-art'
import { GameButton } from './game-button'
import { Hint } from './hint'
import { LUXURY_IDS, LUXURY_NAMES, type Command, type Game, formatRate } from '@/lib/game/engine'
import { GODS, GOD_IDS, OFFER_RATE, blessing, patronChangeMs, godBuff, lutufCap, lutufRate, type GodId } from '@/lib/game/gods'

const num = (n: number) => Math.floor(n).toLocaleString('tr-TR')
const clock = (ms: number) => { const s = Math.max(0, Math.ceil(ms / 1000)), h = Math.floor(s / 3600); return h ? `${h} sa ${Math.floor(s / 60) % 60} dk` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }
export function GodEmblem({ id, size = 56, on = false }: { id: GodId; size?: number; on?: boolean }) {
  return <AtlasArt atlas="gods" index={GOD_IDS.indexOf(id)} size={size} label={GODS[id].name} className={on ? 'god-emblem is-on' : 'god-emblem'} />
}

type Good = 'gold' | 'wood' | (typeof LUXURY_IDS)[number]
const GOOD_NAMES: Record<string, string> = { gold: 'Akçe', wood: 'Kereste', ...LUXURY_NAMES }

export function GodsPanel({ game, now, onCommand }: { game: Game; now: number; onCommand: (c: Command) => void }) {
  const t = game.gods
  const cap = lutufCap(game)
  const [good, setGood] = useState<Good>('gold')
  const [amount, setAmount] = useState(1000)
  const rate = (LUXURY_IDS as readonly string[]).includes(good) ? OFFER_RATE.luxury : OFFER_RATE[good as 'gold' | 'wood']
  const have = (LUXURY_IDS as readonly string[]).includes(good) ? game.luxury[good as (typeof LUXURY_IDS)[number]] : game.resources[good as 'gold' | 'wood']
  const changeWait = t.patron ? t.changedAt + patronChangeMs(game) - now : 0
  const patron = t.patron
  return <section className="empire-section gods-panel">
    <h3><Sparkles className="size-4" /> Kadim tanrılar</h3>
    <div className="people-row-top"><span>Lütuf</span><span className="people-count">{num(t.lutuf)} / {num(cap)} · +{formatRate(lutufRate(game))}/dk</span></div>
    <span className="people-meter"><span style={{ width: `${Math.min(100, (t.lutuf / cap) * 100)}%` }} /></span>

    <div className="offering">
      <span className="profile-label"><Flame className="size-3" /> Sunu</span>
      <div className="batch-row" role="group" aria-label="Sunulacak mal">
        {(['gold', 'wood', ...LUXURY_IDS] as Good[]).map(g => <GameButton key={g} size="sm" variant={good === g ? 'default' : 'outline'} onClick={() => setGood(g)}>{GOOD_NAMES[g]}</GameButton>)}
      </div>
      <div className="batch-row">
        {[rate * 10, rate * 50, rate * 200].map(n => <GameButton key={n} size="sm" variant={amount === n ? 'default' : 'outline'} onClick={() => setAmount(n)}>{num(n)}</GameButton>)}
        <GameButton size="sm" disabled={have < rate} onClick={() => onCommand({ type: 'offering', good, amount })}><Flame data-icon="inline-start" />Sun (+{num(Math.min(amount, have) / rate)} lütuf)</GameButton>
      </div>
      <p className="fine-print">{rate} {GOOD_NAMES[good].toLocaleLowerCase('tr')} = 1 lütuf · elinde {num(have)}.</p>
    </div>

    {patron && <article className="god-patron">
      <GodEmblem id={patron} size={72} on />
      <span><span className="eyebrow">HAMİ TANRI</span><strong>{GODS[patron].name}</strong><small>{GODS[patron].passive(blessing(game, patron))} (mabet {game.buildings.mabet}. seviye)</small>
        {godBuff(game, patron, now) && t.buff && <small className="god-active"><Sparkles className="size-3" /> {GODS[patron].power} etkin · {clock(t.buff.until - now)}</small>}
        {now < (t.rest[patron] ?? 0) && <small><KumSaatiArt className="size-3" /> Dinleniyor · {clock((t.rest[patron] ?? 0) - now)}</small>}</span>
      <GameButton size="sm" disabled={now < (t.rest[patron] ?? 0) || t.lutuf < GODS[patron].cost} onClick={() => onCommand({ type: 'invoke' })}>
        <Sparkles data-icon="inline-start" />{GODS[patron].power} ({num(GODS[patron].cost)})</GameButton>
    </article>}

    <div className="god-list">{GOD_IDS.map(id => {
      const g = GODS[id]
      const on = patron === id
      return <article key={id} className={on ? 'god-card is-patron' : 'god-card'}>
        <GodEmblem id={id} size={52} on={on} />
        <span><strong>{g.name}</strong><small className="god-title">{g.title} · {g.domain}</small></span>
        {on ? <em>Hamin</em> : <GameButton size="sm" variant="outline" disabled={changeWait > 0} onClick={() => onCommand({ type: 'god', god: id })}>Hami seç</GameButton>}
        <dl className="god-card-body">
          <dt>Lütuf</dt><dd>{g.passive(Math.min(20, Math.max(1, game.buildings.mabet)))}</dd>
          <dt>{g.power}</dt><dd>{g.powerText} <b>{num(g.cost)} lütuf</b></dd>
        </dl>
      </article>
    })}</div>
    {changeWait > 0 && <p className="fine-print"><KumSaatiArt className="size-3" /> Hamini değiştirmek için {clock(changeWait)} bekle.</p>}
    <Hint>Hami tanrının lütfü mabet seviyesiyle büyür (en fazla 20. derece). Kudretten sonra tanrı 4 saat dinlenir. Kadim Türk mitolojisinin tanrıları; Ikariam'daki tanrılar sisteminin karşılığı.</Hint>
  </section>
}
