'use client'

import { useState } from 'react'
import { GOOD_NAMES, LUXURY_IDS, TRADE_GOODS, goodAmount, type Command, type Game, type Good, type Luxury, type Resource } from '@/lib/game/engine'
import { exchangeQuote } from '@/lib/game/exchange-preview'
import { Box } from './building-page'
import { GameButton } from './game-button'
import { luxuryIcons, resourceIcons } from './game-widgets'

const num = (n: number) => Math.floor(n).toLocaleString('tr-TR')
function GoodIcon({ id }: { id: Good }) {
  const Icon = (LUXURY_IDS as readonly string[]).includes(id) ? luxuryIcons[id as Luxury] : resourceIcons[id as Resource]
  return <Icon width={44} height={44} aria-hidden="true" />
}
export function ExchangePanel({ game, onCommand }: { game: Game; onCommand: (c: Command) => void }) {
  const [from, setFrom] = useState<Good>('wood'), [to, setTo] = useState<Good>('kristal'), [amount, setAmount] = useState('400')
  const q = exchangeQuote(game, from, to, Number(amount))
  return <Box title="Mal takası">
    <p className="exchange-intro">{q.rate.toLocaleString('tr-TR')} birim ver, 1 birim al. Takas anında gerçekleşir; kayıplı oran nedeniyle aynı miktar geri gelmez.</p>
    <div className="exchange-form">
      <label>Vereceğin mal<select aria-label="Vereceğin mal" value={from} onChange={e => { const next = e.target.value as Good; if (next === to) setTo(from); setFrom(next) }}>{TRADE_GOODS.map(g => <option key={g} value={g}>{GOOD_NAMES[g]}</option>)}</select></label>
      <label>Alacağın mal<select aria-label="Alacağın mal" value={to} onChange={e => setTo(e.target.value as Good)}>{TRADE_GOODS.filter(g => g !== from).map(g => <option key={g} value={g}>{GOOD_NAMES[g]}</option>)}</select></label>
      <label>Verilecek miktar<input type="number" min={1} max={q.limit} step={1} inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value)} /></label>
      <div className="exchange-amounts" role="group" aria-label="Takas miktarı">{[100,400].map(n => <GameButton key={n} variant="outline" aria-label={`${n} birim ver`} onClick={() => setAmount(String(n))}>{n}</GameButton>)}<GameButton variant="outline" disabled={q.max < 1} onClick={() => setAmount(String(q.max))}>Maks.</GameButton></div>
    </div>
    <dl className="exchange-preview" aria-live="polite">
      <div><GoodIcon id={from} /><dt>Verilecek · {GOOD_NAMES[from]}<small>Stok {num(q.stock)}</small></dt><dd>{Number.isSafeInteger(q.amount) && q.amount > 0 ? num(q.amount) : '—'}</dd></div>
      <div><GoodIcon id={to} /><dt>Alınacak · {GOOD_NAMES[to]}<small>Boş yer {num(q.room)}</small></dt><dd>{num(q.received)}</dd></div>
    </dl>
    <GameButton className="exchange-submit" disabled={!!q.reason} onClick={() => onCommand({ type: 'exchange', from, to, amount: q.amount })}>Takas et</GameButton>
    {q.reason && <p className="exchange-reason" role="status">{q.reason}{game.buildings.kara_pazar < 1 && ' İnşa koşulları Gelişim’de.'}</p>}
    <details className="exchange-details"><summary>Oran, sınır ve stok hesabı</summary><dl className="exchange-facts"><div><dt>Takas oranı</dt><dd>{q.rate.toLocaleString('tr-TR')} : 1</dd></div><div><dt>Tek işlemde verilebilen</dt><dd>{num(q.limit)} birim</dd></div><div><dt>Hedef malın mevcut stoğu</dt><dd>{num(goodAmount(game, to))}</dd></div></dl><p>Alınan miktar aşağı yuvarlanır. Maks. mevcut stok ile parti sınırının küçüğünü seçer; hedef ambarda yer olması ayrıca gerekir. Oran seviye yükseldikçe iyileşir, en iyi 2 : 1 olur.</p></details>
  </Box>
}
