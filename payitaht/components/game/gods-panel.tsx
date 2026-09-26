'use client'

/**
 * ONGUN MABEDİ PANELİ: lütuf, sunu, hami tanrı ve kudret.
 * Tanrı amblemleri kadim Türk sanatının yalın çizgisiyle: güneş, kuş, yıldız,
 * sarmal, boynuz, kılıç, dalga, rüzgâr.
 */
import { useState } from 'react'
import { Clock3, Flame, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Hint } from './hint'
import { LUXURY_IDS, LUXURY_NAMES, type Command, type Game } from '@/lib/game/engine'
import { GODS, GOD_IDS, OFFER_RATE, blessing, patronChangeMs, godBuff, lutufCap, lutufRate, type GodId } from '@/lib/game/gods'

const num = (n: number) => Math.floor(n).toLocaleString('tr-TR')
const clock = (ms: number) => { const s = Math.max(0, Math.ceil(ms / 1000)), h = Math.floor(s / 3600); return h ? `${h} sa ${Math.floor(s / 60) % 60} dk` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }
const INK = '#2a1a10', GOLD = '#e2bd78', PAPER = '#f6ecd6'
const COLORS: Record<GodId, [string, string]> = {
  tengri: ['#bfe0f2', '#2f6f9a'], umay: ['#f6e3a8', '#b8872e'], ulgen: ['#fbf6e6', '#b9a67e'], kayra: ['#e3d3f0', '#6a4a8a'],
  erlik: ['#b8a39a', '#2a1a1a'], kizagan: ['#f0c4b4', '#9a2a1e'], su: ['#cfe8ee', '#2f7a92'], yel: ['#e8eef0', '#7d8f99'],
}
const S = { stroke: INK, strokeWidth: 1.4, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const }
const SIGIL: Record<GodId, () => React.ReactNode> = {
  tengri: () => <g {...S}><circle cx="32" cy="30" r="9" fill={GOLD} />{Array.from({ length: 8 }, (_, i) => <path key={i} d="M32 16 V12" transform={`rotate(${i * 45} 32 30)`} stroke={GOLD} strokeWidth="2" />)}<path d="M18 46 h4 M26 44 h3 M38 46 h4 M44 43 h3" stroke={PAPER} /></g>,
  umay: () => <g {...S}><path d="M32 24 Q20 12 12 20 Q20 22 22 28 Q14 28 16 34 Q26 30 32 36 Q38 30 48 34 Q50 28 42 28 Q44 22 52 20 Q44 12 32 24 Z" fill={PAPER} /><circle cx="32" cy="26" r="3" fill={GOLD} /><path d="M28 42 Q32 48 36 42" fill="none" stroke={GOLD} strokeWidth="2" /></g>,
  ulgen: () => <g {...S}><path d="M32 12 L35 28 L50 32 L35 36 L32 52 L29 36 L14 32 L29 28 Z" fill={GOLD} /><circle cx="32" cy="32" r="4" fill={PAPER} /></g>,
  kayra: () => <g {...S} fill="none"><path d="M32 32 m0 -3 a3 3 0 1 1 -3 3 a6 6 0 1 1 6 6 a9 9 0 1 1 -9 -9 a12 12 0 1 1 12 12" stroke={PAPER} strokeWidth="2.2" /></g>,
  erlik: () => <g {...S}><path d="M20 20 Q18 34 28 38 M44 20 Q46 34 36 38" stroke={PAPER} strokeWidth="3" fill="none" /><circle cx="32" cy="40" r="7" fill="#1a1010" stroke={PAPER} /><circle cx="29.5" cy="39" r="1.3" fill="#e0492f" stroke="none" /><circle cx="34.5" cy="39" r="1.3" fill="#e0492f" stroke="none" /></g>,
  kizagan: () => <g {...S}><path d="M20 46 L42 18 M44 46 L22 18" stroke={PAPER} strokeWidth="3" /><path d="M32 14 Q38 22 32 28 Q26 22 32 14 Z" fill="#f2a53a" /></g>,
  su: () => <g {...S}><path d="M14 30 q6 -5 12 0 t12 0 t12 0 M14 38 q6 -5 12 0 t12 0 t12 0" stroke={PAPER} strokeWidth="2.2" fill="none" /><path d="M26 22 Q32 16 38 22 Q32 26 26 22 Z M38 22 l4 -3 v6 Z" fill={GOLD} /></g>,
  yel: () => <g {...S} fill="none" stroke={INK}><path d="M14 26 H38 a5 5 0 1 0 -5 -5 M14 34 H44 a5 5 0 1 1 -5 5 M18 42 H30" strokeWidth="2.2" /></g>,
}

export function GodEmblem({ id, size = 56, on = false }: { id: GodId; size?: number; on?: boolean }) {
  const [light, dark] = COLORS[id]
  const Sigil = SIGIL[id]
  return <svg viewBox="0 0 64 64" width={size} height={size} role="img" aria-label={GODS[id].name} className={on ? 'god-emblem is-on' : 'god-emblem'}>
    <defs><radialGradient id={`ge-${id}`} cx="50%" cy="38%" r="65%"><stop offset="0" stopColor={light} /><stop offset="1" stopColor={dark} /></radialGradient></defs>
    <circle cx="32" cy="32" r="30" fill="#6a4a1a" />
    <circle cx="32" cy="32" r="27.5" fill={`url(#ge-${id})`} stroke={GOLD} strokeWidth="1.6" />
    {Array.from({ length: 12 }, (_, i) => <circle key={i} cx={32 + 29 * Math.cos((i * Math.PI) / 6)} cy={32 + 29 * Math.sin((i * Math.PI) / 6)} r="1.2" fill={GOLD} />)}
    <Sigil />
  </svg>
}

type Good = 'gold' | 'wood' | 'stone' | (typeof LUXURY_IDS)[number]
const GOOD_NAMES: Record<string, string> = { gold: 'Akçe', wood: 'Kereste', stone: 'Taş', ...LUXURY_NAMES }

export function GodsPanel({ game, now, onCommand }: { game: Game; now: number; onCommand: (c: Command) => void }) {
  const t = game.gods
  const cap = lutufCap(game)
  const [good, setGood] = useState<Good>('gold')
  const [amount, setAmount] = useState(1000)
  const rate = (LUXURY_IDS as readonly string[]).includes(good) ? OFFER_RATE.luxury : OFFER_RATE[good as 'gold' | 'wood' | 'stone']
  const have = (LUXURY_IDS as readonly string[]).includes(good) ? game.luxury[good as (typeof LUXURY_IDS)[number]] : game.resources[good as 'gold' | 'wood' | 'stone']
  const changeWait = t.patron ? t.changedAt + patronChangeMs(game) - now : 0
  const patron = t.patron
  return <section className="empire-section gods-panel">
    <h3><Sparkles className="size-4" /> Kadim tanrılar</h3>
    <div className="people-row-top"><span>Lütuf</span><span className="people-count">{num(t.lutuf)} / {num(cap)} · +{lutufRate(game).toFixed(1)}/dk</span></div>
    <span className="people-meter"><span style={{ width: `${Math.min(100, (t.lutuf / cap) * 100)}%` }} /></span>

    <div className="offering">
      <span className="profile-label"><Flame className="size-3" /> Sunu</span>
      <div className="batch-row" role="group" aria-label="Sunulacak mal">
        {(['gold', 'wood', 'stone', ...LUXURY_IDS] as Good[]).map(g => <Button key={g} size="sm" variant={good === g ? 'default' : 'outline'} onClick={() => setGood(g)}>{GOOD_NAMES[g]}</Button>)}
      </div>
      <div className="batch-row">
        {[rate * 10, rate * 50, rate * 200].map(n => <Button key={n} size="sm" variant={amount === n ? 'default' : 'outline'} onClick={() => setAmount(n)}>{num(n)}</Button>)}
        <Button size="sm" disabled={have < rate} onClick={() => onCommand({ type: 'offering', good, amount })}><Flame data-icon="inline-start" />Sun (+{num(Math.min(amount, have) / rate)} lütuf)</Button>
      </div>
      <p className="fine-print">{rate} {GOOD_NAMES[good].toLocaleLowerCase('tr')} = 1 lütuf · elinde {num(have)}.</p>
    </div>

    {patron && <article className="god-patron">
      <GodEmblem id={patron} size={72} on />
      <span><span className="eyebrow">HAMİ TANRI</span><strong>{GODS[patron].name}</strong><small>{GODS[patron].passive(blessing(game, patron))} (mabet {game.buildings.mabet}. seviye)</small>
        {godBuff(game, patron, now) && t.buff && <small className="god-active"><Sparkles className="size-3" /> {GODS[patron].power} etkin · {clock(t.buff.until - now)}</small>}
        {now < (t.rest[patron] ?? 0) && <small><Clock3 className="size-3" /> Dinleniyor · {clock((t.rest[patron] ?? 0) - now)}</small>}</span>
      <Button size="sm" disabled={now < (t.rest[patron] ?? 0) || t.lutuf < GODS[patron].cost} onClick={() => onCommand({ type: 'invoke' })}>
        <Sparkles data-icon="inline-start" />{GODS[patron].power} ({num(GODS[patron].cost)})</Button>
    </article>}

    <div className="god-list">{GOD_IDS.map(id => {
      const g = GODS[id]
      const on = patron === id
      return <article key={id} className={on ? 'god-card is-patron' : 'god-card'}>
        <GodEmblem id={id} size={52} on={on} />
        <span><strong>{g.name}</strong><small className="god-title">{g.title} · {g.domain}</small></span>
        {on ? <em>Hamin</em> : <Button size="sm" variant="outline" disabled={changeWait > 0} onClick={() => onCommand({ type: 'god', god: id })}>Hami seç</Button>}
        <dl className="god-card-body">
          <dt>Lütuf</dt><dd>{g.passive(Math.min(20, Math.max(1, game.buildings.mabet)))}</dd>
          <dt>{g.power}</dt><dd>{g.powerText} <b>{num(g.cost)} lütuf</b></dd>
        </dl>
      </article>
    })}</div>
    {changeWait > 0 && <p className="fine-print"><Clock3 className="size-3" /> Hamini değiştirmek için {clock(changeWait)} bekle.</p>}
    <Hint>Hami tanrının lütfü mabet seviyesiyle büyür (en fazla 20. derece). Kudretten sonra tanrı 4 saat dinlenir. Kadim Türk mitolojisinin tanrıları; Ikariam'daki tanrılar sisteminin karşılığı.</Hint>
  </section>
}
