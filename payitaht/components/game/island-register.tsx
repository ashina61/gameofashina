'use client'

import { useState, type ReactNode } from 'react'
import { asset } from '@/lib/asset'
import { FOREST_MAX_LEVEL, MINE_MAX_LEVEL, LUXURY_IDS, LUXURY_NAMES, forestCapacity, forestProduction, forestUpgradeCost, mineCapacity, mineUpgradeCost, luxuryProduction, idleWorkers, capacity, formatRate, merchantBuyPrice, merchantSellPrice, merchantLimit, type Game, type Command, type Luxury } from '@/lib/game/engine'
import { Box } from './building-page'
import { CourtTabs } from './court-kit'
import { WorkforceSlider } from './workforce'
import { GameButton } from './game-button'
import { KeresteArt } from './resource-art'
import { luxuryIcons } from './game-widgets'
import { TreePine, Pickaxe, Hammer } from './ui-art'

const num = (n: number) => Math.floor(n).toLocaleString('tr-TR')

function Donation({ game, forest, onDonate }: { game: Game; forest: boolean; onDonate: (amount: number) => void }) {
  const [gift, setGift] = useState(500)
  const site = forest ? game.forest : game.mine
  const max = forest ? FOREST_MAX_LEVEL : MINE_MAX_LEVEL
  const need = forest ? forestUpgradeCost(site.level) : mineUpgradeCost(site.level)
  const projected = forest ? { ...game, forest: { ...game.forest, level: site.level + 1 } } : { ...game, mine: { ...game.mine, level: site.level + 1 } }
  const slots = forest ? forestCapacity(projected) : mineCapacity(projected)
  return <Box title={forest ? 'Ormanı büyüt' : 'Madeni genişlet'}>
    {site.level >= max ? <p>En yüksek seviye · {max}. Bağış tamamlandı.</p> : <>
      <p><b>{site.level + 1}. seviye</b> için toplanan kereste</p>
      <div className="island-donation-progress"><b>{num(site.wood)} / {num(need)}</b><span role="progressbar" aria-label="Toplanan kereste" aria-valuemin={0} aria-valuemax={need} aria-valuenow={Math.min(need, site.wood)}><i style={{ width: `${Math.min(100, site.wood / need * 100)}%` }} /></span></div>
      <p>{num(Math.max(0, need - site.wood))} kereste daha gerekli. Yeni kapasite: <b>{slots} {forest ? 'oduncu' : 'madenci'}</b>.</p>
      <div className="island-gifts" role="group" aria-label="Kereste bağış miktarı">{(forest ? [250, 500, 1000] : [100, 500, 2000]).map(n => <button key={n} type="button" aria-pressed={gift === n} onClick={() => setGift(n)}>{num(n)}</button>)}</div>
      <GameButton className="island-donate" disabled={game.resources.wood < gift} onClick={() => onDonate(gift)}><KeresteArt aria-hidden="true" />{num(gift)} kereste bağışla</GameButton>
      {game.resources.wood < gift && <p className="requirement">Bağış için {num(gift - game.resources.wood)} kereste daha gerekli.</p>}
      <p className="fine-print">Eşik tamamlanınca seviye hemen yükselir. Fazla bağış sonraki seviyeye aktarılır; son seviyede artan kereste ambarına döner.</p>
    </>}
  </Box>
}

function SiteRegister({ game, forest, onWorkers, onDonate, children }: { game: Game; forest: boolean; onWorkers: (n: number) => void; onDonate: (n: number) => void; children?: ReactNode }) {
  const [tab, setTab] = useState<'production' | 'development'>('production')
  const site = forest ? game.forest : game.mine
  const cap = forest ? forestCapacity(game) : mineCapacity(game)
  const workers = forest ? game.forest.workers : game.mine.miners
  const label = forest ? 'Oduncu' : 'Madenci'
  const name = forest ? 'Ada ormanı' : `${LUXURY_NAMES[game.mine.specialty]} madeni`
  const good = forest ? game.resources.wood : game.luxury[game.mine.specialty]
  const amount = (n: number) => forest ? forestProduction({ ...game, forest: { ...game.forest, workers: n } }) : luxuryProduction({ ...game, mine: { ...game.mine, miners: n } })[game.mine.specialty]
  const Icon = forest ? KeresteArt : luxuryIcons[game.mine.specialty]
  return <div className="island-register"><figure className="academy-banner"><img src={asset(`/images/game/ui/island/${forest ? 'forest' : game.mine.specialty === 'mermer' ? 'mine' : `mine-${game.mine.specialty}`}.webp`)} alt="" width={960} height={320} /></figure>
    <CourtTabs items={[{ id: 'production', label: 'Üretim', Icon: forest ? TreePine : Pickaxe }, { id: 'development', label: 'Gelişim', Icon: Hammer }]} value={tab} onChange={setTab} label={`${name} defteri`}>
      {tab === 'production' ? <><Box title={`${name} · Seviye ${site.level}`}>
        <dl className="island-facts"><div><dt>Görevli / kapasite</dt><dd>{workers} / {cap}</dd></div><div><dt>Şehre gelen üretim</dt><dd>{formatRate(amount(workers))} / dk</dd></div><div><dt>Ambar stoğu</dt><dd>{num(good)} / {num(capacity(game))}</dd></div></dl>
        {good >= capacity(game) && <p className="requirement">Ambar dolu. Kaynağı kullan veya depolama kapasitesini artır.</p>}
        <WorkforceSlider label={label} figure={forest ? 'oduncu' : 'madenci'} value={workers} cap={cap} idle={idleWorkers(game)} preview={n => ({ amount: amount(n), icon: <Icon className="workforce-icon" />, text: <><b>{formatRate(amount(n))}</b> {forest ? 'kereste' : LUXURY_NAMES[game.mine.specialty].toLocaleLowerCase('tr')}/dk</> })} onCommit={onWorkers} note={forest ? 'Her oduncu şehir çarpanlarından önce dakikada 4 kereste keser. Atamayı Onayla ile uygula.' : 'Her madenci çarpanlardan önce dakikada 3 birim üretir. Şehirdeki üretim işçileri buraya kendiliğinden geçmez.'} />
      </Box>{!forest && children}</> : <><Donation game={game} forest={forest} onDonate={onDonate} /><Box title="Ada emeği"><p>Şehirdeki boş halkı bu kaynağa ayırabilirsin. Kapasite ve boş halk, atayabileceğin işçi sayısını sınırlar.</p><p>{game.research.includes('yardim_eli') ? 'Yardım Eli araştırması kapasiteyi %25 artırıyor.' : 'Yardım Eli araştırması kapasiteyi %25 artırır.'}</p><p>Üretim önizlemesi mevcut şehir çarpanlarını içerir. Bağış yalnız bu şehrin kaynak işletmesini geliştirir.</p></Box></>}
    </CourtTabs>
  </div>
}

export function ForestPanel({ game, onCommand }: { game: Game; onCommand: (c: Command) => void }) {
  return <SiteRegister game={game} forest onWorkers={value => onCommand({ type: 'foresters', value })} onDonate={amount => onCommand({ type: 'forestDonate', amount })} />
}

export function IslandPanel({ game, islandName, onMiners, onDonate, onTrade, children }: { game: Game; islandName: string; onMiners: (n: number) => void; onDonate: (n: number) => void; onTrade: (id: Luxury, side: 'buy' | 'sell', n: number) => void; children?: ReactNode }) {
  const [lot, setLot] = useState(50)
  const batch = Math.min(lot, merchantLimit(game))
  return <SiteRegister game={game} forest={false} onWorkers={onMiners} onDonate={onDonate}>
    <details className="island-ledger"><summary>{islandName} · Lüks ambarı</summary><dl className="island-facts">{LUXURY_IDS.map(id => <div key={id}><dt>{LUXURY_NAMES[id]}{id === game.mine.specialty ? ' · ada kaynağı' : ''}</dt><dd>{num(game.luxury[id])}</dd></div>)}</dl><p>Kahve ikramlarda, mermer yapılarda, kristal ilim ve kültürde, kükürt top ve gemilerde kullanılır.</p></details>
    <details className="island-ledger"><summary>Çarşı tüccarı</summary>{game.buildings.carsi < 1 ? <p>Önce Çarşı kur.</p> : <><p>Alış {merchantBuyPrice(game)} akçe · satış {merchantSellPrice(game)} akçe. Tek işlem sınırı: {merchantLimit(game)} birim.</p><div className="island-gifts" role="group" aria-label="Tüccar parti miktarı">{[10, 50, 150].filter(n => n <= merchantLimit(game)).map(n => <button key={n} type="button" aria-pressed={lot === n} onClick={() => setLot(n)}>{n}</button>)}</div><p>İşlem miktarı: {batch} birim.</p>{LUXURY_IDS.map(id => <div key={id} className="island-trade"><h3>{LUXURY_NAMES[id]}</h3><div><GameButton disabled={game.resources.gold < Math.ceil(batch * merchantBuyPrice(game))} onClick={() => onTrade(id, 'buy', batch)}>Al · {num(Math.ceil(batch * merchantBuyPrice(game)))} akçe</GameButton><GameButton disabled={game.luxury[id] < batch} onClick={() => onTrade(id, 'sell', batch)}>Sat · {num(Math.floor(batch * merchantSellPrice(game)))} akçe</GameButton></div></div>)}</>}</details>
    <details className="island-ledger"><summary>Adanın harikası</summary>{children}</details>
  </SiteRegister>
}
