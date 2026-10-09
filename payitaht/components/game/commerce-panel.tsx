'use client'
import { useState } from 'react'
import { armyUpkeep, capacity, formatRate, idleWorkers, LUXURY_IDS, LUXURY_NAMES, merchantBuyPrice, merchantLimit, merchantSellPrice, rates, scientistUpkeepPerMinute, workerCapacity, type BuildingId, type Command, type Game } from '@/lib/game/engine'
import { merchantQuote } from '@/lib/game/commerce-preview'
import { Box } from './building-page'
import { GameButton } from './game-button'
import { WorkforceSlider } from './workforce'
import { luxuryIcons, resourceIcons } from './game-widgets'

export const isCommerce = (id: BuildingId) => id === 'carsi' || id === 'ticaret_merkezi'
const num = (n: number) => Math.floor(n).toLocaleString('tr-TR')
export function CommercePanel({ game, onCommand }: { game: Game; onCommand: (command: Command) => void }) {
  const [lot, setLot] = useState(10)
  const total = rates(game).gold, without = rates({ ...game, workers: { ...game.workers, carsi: 0 } }).gold
  const Gold = resourceIcons.gold
  return <>
    <Box title="Çarşı esnafı">
      <WorkforceSlider label="Esnaf" figure="esnaf" value={game.workers.carsi} cap={workerCapacity(game, 'carsi')} idle={idleWorkers(game)}
        preview={n => { const value = rates({ ...game, workers: { ...game.workers, carsi: n } }).gold; return { amount: value, icon: <Gold className="workforce-icon" />, text: <><b>{formatRate(value)}</b> net akçe/dk</> } }}
        onCommit={value => onCommand({ type: 'workers', id: 'carsi', value })}
        note="Onayla atamayı uygular; Geri al mevcut sayıya döner. Gösterilen hız, vergi ve esnaf dâhil şehrin toplam net geliridir." />
      <details className="commerce-details"><summary>Akçe hesabı</summary><dl className="commerce-facts">
        <div><dt>Toplam net gelir</dt><dd>{formatRate(total)} /dk</dd></div>
        <div><dt>Esnafın net gelire etkisi</dt><dd>+{formatRate(Math.max(0, total - without))} /dk</dd></div>
        <div><dt>Âlim maaşları</dt><dd>{formatRate(scientistUpkeepPerMinute(game))} /dk</dd></div>
        <div><dt>Ordu bakımı</dt><dd>{formatRate(armyUpkeep(game))} /dk</dd></div>
        <div><dt>Akçe stoğu</dt><dd>{num(game.resources.gold)} / {num(capacity(game))}</dd></div>
      </dl><p>Esnafın etkisi, mevcut gelir ile hiç esnaf atanmamış gelir arasındaki farktır. Maaş ve bakım toplam net gelir hesabına zaten dâhildir.</p></details>
    </Box>
    <Box title="Çarşı tüccarı">
      <p className="commerce-note">Tüccarla alışveriş anında yapılır. Alış: {formatRate(merchantBuyPrice(game))}, satış: {formatRate(merchantSellPrice(game))} akçe/birim. Parti sınırı: {num(merchantLimit(game))}.</p>
      <div className="commerce-lots" role="group" aria-label="Tüccar parti miktarı">{[10,50,150].filter(n => n <= merchantLimit(game)).map(n => <GameButton key={n} variant={lot === n ? 'default' : 'outline'} aria-pressed={lot === n} aria-label={`${n} birim`} onClick={() => setLot(n)}>{n}</GameButton>)}</div>
      {game.buildings.carsi < 1 && <p className="commerce-note">Tüccar Çarşı kurulunca gelir. İnşa koşulları Gelişim’de.</p>}
      <div className="commerce-goods">{LUXURY_IDS.map(id => {
        const Icon = luxuryIcons[id], q = merchantQuote(game, id, lot)
        return <article className="commerce-good" key={id}>
          <div className="commerce-good-head"><Icon width={44} height={44} aria-hidden="true" /><div><h3>{LUXURY_NAMES[id]}</h3><small>Stok {num(game.luxury[id])} · boş yer {num(q.room)}</small></div></div>
          <div className="commerce-good-actions"><GameButton disabled={!!q.buyReason} aria-label={`${lot} ${LUXURY_NAMES[id]} al · ${q.buy} akçe`} onClick={() => onCommand({ type: 'trade', id, side: 'buy', amount: lot })}>Al · {num(q.buy)} akçe</GameButton><GameButton variant="outline" disabled={!!q.sellReason} aria-label={`${lot} ${LUXURY_NAMES[id]} sat · ${q.received} akçe gelir`} onClick={() => onCommand({ type: 'trade', id, side: 'sell', amount: lot })}>Sat · {formatRate(q.received)} akçe</GameButton></div>
          {(q.buyReason || q.sellReason) && <p className="commerce-reason">{q.buyReason && <>Alış: {q.buyReason} </>}{q.sellReason && <>Satış: {q.sellReason}</>}</p>}
          {q.received < q.sell && <p className="commerce-reason">Akçe kapasitesi sınırlı: satış bedeli {num(q.sell)}, hazineye eklenebilen {formatRate(q.received)}. Kalan bedel depolanmaz.</p>}
        </article>
      })}</div>
    </Box>
  </>
}
