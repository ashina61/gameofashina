'use client'
import { Box } from './building-page'
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
import { GODS, GOD_IDS, OFFER_RATE, blessing, patronChangeMs, godBuff, lutufCap, lutufRate, powerRestMs, type GodId } from '@/lib/game/gods'

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
  const offered = Math.floor(Math.min(amount, have, Math.max(0, cap - t.lutuf) * rate))
  const invokeReason = game.buildings.mabet < 1 ? 'Önce Ongun Mabedi kur.' : !patron ? 'Önce bir hami tanrı seç.' : now < (t.rest[patron] ?? 0) ? `Tanrı dinleniyor · ${clock((t.rest[patron] ?? 0) - now)}` : t.lutuf < GODS[patron].cost ? `${num(GODS[patron].cost - t.lutuf)} lütuf daha gerekli.` : patron === 'ulgen' && !game.study ? 'Süren bir araştırma yok.' : patron === 'kayra' && !game.queue.length ? 'Süren bir inşaat yok.' : null
  return <div className="devotion-register"><Box title="Haminin kudreti">
    {!patron && <p className="devotion-status">Şehrin henüz bir hamisi yok. Aşağıdaki defterden hami seç.</p>}
    <div className="people-row-top"><span>Lütuf</span><span className="people-count">{num(t.lutuf)} / {num(cap)} · +{formatRate(lutufRate(game))}/dk</span></div>
    <span className="people-meter"><span style={{ width: `${Math.min(100, (t.lutuf / cap) * 100)}%` }} /></span>

    {patron && <article className="devotion-patron">
      <GodEmblem id={patron} size={72} on />
      <span><span className="eyebrow">HAMİ TANRI</span><strong>{GODS[patron].name}</strong><small>{game.buildings.mabet > 0 ? GODS[patron].passive(blessing(game, patron)) : 'Mabet kurulana kadar etkisiz'} (mabet {game.buildings.mabet}. seviye)</small>
        {t.buff && godBuff(game, t.buff.god, now) && <small className="god-active"><Sparkles className="size-3" /> {GODS[t.buff.god].power} ({GODS[t.buff.god].name}) etkin · {clock(t.buff.until - now)}</small>}
        {now < (t.rest[patron] ?? 0) && <small><KumSaatiArt className="size-3" /> Dinleniyor · {clock((t.rest[patron] ?? 0) - now)}</small>}</span>
      <GameButton size="sm" disabled={!!invokeReason} onClick={() => onCommand({ type: 'invoke' })}>
        <Sparkles data-icon="inline-start" />{GODS[patron].power} ({num(GODS[patron].cost)})</GameButton>
    </article>}

    {invokeReason && <p className="requirement">{invokeReason}</p>}</Box><Box title="Sunu defteri">    <div className="offering">
      <span className="profile-label"><Flame className="size-3" /> Sunu</span>
      <div className="batch-row" role="group" aria-label="Sunulacak mal">
        {(['gold', 'wood', ...LUXURY_IDS] as Good[]).map(g => <GameButton key={g} size="sm" variant={good === g ? 'default' : 'outline'} aria-pressed={good === g} onClick={() => { setGood(g); setAmount(((LUXURY_IDS as readonly string[]).includes(g) ? OFFER_RATE.luxury : OFFER_RATE[g as 'gold' | 'wood']) * 50) }}>{GOOD_NAMES[g]}</GameButton>)}
      </div>
      <div className="batch-row">
        {[rate * 10, rate * 50, rate * 200].map(n => <GameButton key={n} size="sm" variant={amount === n ? 'default' : 'outline'} aria-pressed={amount === n} onClick={() => setAmount(n)}>{num(n)}</GameButton>)}
        <GameButton size="sm" disabled={game.buildings.mabet < 1 || offered < rate} onClick={() => onCommand({ type: 'offering', good, amount })}><Flame data-icon="inline-start" />Sun (+{(offered / rate).toLocaleString('tr-TR', { maximumFractionDigits: 3 })} lütuf)</GameButton>
      </div>
      {game.buildings.mabet > 0 && offered < rate && t.lutuf < cap && <p className="requirement">Sunu için yeterli mal veya lütuf yeri yok.</p>}{t.lutuf >= cap && <p className="requirement">Mabet lütufla dolu.</p>}<p className="fine-print">{rate} {GOOD_NAMES[good].toLocaleLowerCase('tr')} = 1 lütuf · elinde {num(have)}. Gerçek sunu: {num(offered)} {GOOD_NAMES[good].toLocaleLowerCase('tr')}.</p>
    </div>

</Box><Box title="Hami seç">    {changeWait > 0 && <p className="fine-print"><KumSaatiArt className="size-3" /> Hamini değiştirmek için {clock(changeWait)} bekle.</p>}<div className="devotion-list">{GOD_IDS.map(id => {
      const g = GODS[id]
      const on = patron === id
      return <details key={id} className="devotion-card"><summary><div className="devotion-heading">
        <GodEmblem id={id} size={52} on={on} />
        <span><strong>{g.name}</strong><small className="god-title">{g.title} · {g.domain}</small></span>
        {on && <em>Hamin</em>}</div></summary>
        <dl className="god-card-body">
          <dt>Lütuf</dt><dd>{game.buildings.mabet > 0 ? g.passive(blessing({ ...game, gods: { ...t, patron: id } }, id)) : 'Önce Ongun Mabedi kur.'}</dd>
          <dt>{g.power}</dt><dd>{g.powerText} <b>{num(g.cost)} lütuf</b></dd>
        </dl>{!on && <GameButton size="sm" disabled={game.buildings.mabet < 1 || changeWait > 0} onClick={() => onCommand({ type: 'god', god: id })}>{g.name} hami seç</GameButton>}
      </details>
    })}</div></Box>

    <details className="devotion-help"><summary>Kutsama nasıl işler?</summary><Hint>Hami tanrının lütfü mabet seviyesiyle büyür (Gök Kutu ile en fazla 25, diğer durumda 20. derece). Kudretten sonra tanrı {powerRestMs(game) / 3600_000} saat dinlenir. Kadim Türk mitolojisinin tanrıları.</Hint></details>
  </div>
}
