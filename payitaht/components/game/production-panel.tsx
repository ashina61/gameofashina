import { BUILDING_EFFECTS, LUXURY_NAMES, capacity, formatRate, forestProduction, idleWorkers, luxuryProduction, luxuryRates, mineCapacity, rates, workerCapacity, type BuildingId, type Command, type Game, type Luxury } from '@/lib/game/engine'
import { Box } from './building-page'
import { GameButton } from './game-button'
import { luxuryIcons, resourceIcons } from './game-widgets'
import { WorkforceSlider } from './workforce'

export const PRODUCTION = {
  kereste: { scene: 'lumber', alt: 'Osmanlı kereste ocağında oduncular ve istiflenen kütükler', resource: 'wood' },
  ormanci: { scene: 'ormanci', alt: 'Ormancı evinin fidanlığı ve bakımlı orman', resource: 'wood' },
  bagci: { scene: 'bagci', alt: 'Kahve fidanlığında bitki bakımı', resource: 'kahve' },
  tasci: { scene: 'tasci', alt: 'Taşçı ustalarının mermer işlediği avlu', resource: 'mermer' },
  camci: { scene: 'camci', alt: 'Osmanlı camcı atölyesinde kristal işleyen ustalar', resource: 'kristal' },
  simyahane: { scene: 'simyahane', alt: 'Osmanlı simyahanesinde kükürt arıtma avlusu', resource: 'kukurt' },
} as const
export type ProductionId = keyof typeof PRODUCTION
export const isProduction = (id: BuildingId): id is ProductionId => id in PRODUCTION
const num = (n: number) => Math.floor(n).toLocaleString('tr-TR')

export function ProductionPanel({ game, id, onCommand, onForest, onIsland, onStorage, onCoffeehouse }: {
  game: Game; id: ProductionId; onCommand: (command: Command) => void
  onForest: () => void; onIsland: () => void; onStorage: () => void; onCoffeehouse: () => void
}) {
  const resource = PRODUCTION[id].resource
  const wood = resource === 'wood'
  const Icon = wood ? resourceIcons.wood : luxuryIcons[resource as Luxury]
  const label = wood ? 'Kereste' : LUXURY_NAMES[resource as Luxury]
  const amount = wood ? game.resources.wood : game.luxury[resource as Luxury]
  const gross = wood ? rates(game).wood : luxuryProduction(game)[resource as Luxury]
  const net = wood ? gross : luxuryRates(game)[resource as Luxury]
  const consumption = Math.max(0, gross - net)
  const cap = capacity(game)
  const matchingIsland = wood || game.mine.specialty === resource
  const boost = id === 'kereste' ? 0 : game.buildings[id] * ({ ormanci: BUILDING_EFFECTS.ormanciWood, bagci: BUILDING_EFFECTS.bagciWine, tasci: BUILDING_EFFECTS.tasciMarble, camci: BUILDING_EFFECTS.camciCrystal, simyahane: BUILDING_EFFECTS.simyaSulfur }[id])
  return <>
    {id === 'kereste' && <Box title="Oduncular">
      <WorkforceSlider label="Oduncu" figure="oduncu" value={game.workers.kereste} cap={workerCapacity(game, 'kereste')} idle={idleWorkers(game)}
        preview={n => { const value = rates({ ...game, workers: { ...game.workers, kereste: n } }).wood; return { amount: value, icon: <Icon className="workforce-icon" />, text: <><b>{formatRate(value)}</b> kereste/dk</> } }}
        onCommit={value => onCommand({ type: 'workers', id: 'kereste', value })}
        note="Barı ayarlayıp Onayla’ya basın. Gösterilen hız, ada ormanı ve bütün üretim katkıları dâhil şehrin toplamıdır." />
    </Box>}
    <Box title={`${label} üretimi`} className="production-ledger">
      <div className="production-output"><Icon width={56} height={56} aria-hidden="true" /><div><small>Şehrin toplam üretimi</small><strong>{formatRate(gross)} <span>/dk</span></strong></div></div>
      {!matchingIsland && <p className="production-alert">Bu ada {LUXURY_NAMES[game.mine.specialty].toLocaleLowerCase('tr')} üretir. {label} üretim katkısı yalnız {label.toLocaleLowerCase('tr')} adasında işler; burada bu malın üretimi yoktur.</p>}
      <dl className="production-facts">
        {id !== 'kereste' && <div><dt>Bu yapının katkısı</dt><dd>+%{formatRate(boost * 100)}{!matchingIsland && <small>Bu adada uygulanmaz</small>}</dd></div>}
        {wood ? <>
          <div><dt>Ocaktaki oduncular</dt><dd>{num(game.workers.kereste)} / {num(workerCapacity(game, 'kereste'))}</dd></div>
          <div><dt>Ada ormanı oduncuları</dt><dd>{num(game.forest?.workers ?? 0)}</dd></div>
          <div><dt>Ormanın temel katkısı</dt><dd>{formatRate(forestProduction(game))} /dk<small>Üretim çarpanlarından önce</small></dd></div>
        </> : <div><dt>{matchingIsland ? 'Ada kaynağında çalışan' : 'Adanın kendi kaynağında çalışan'}</dt><dd>{num(game.mine.miners)} / {num(mineCapacity(game))}</dd></div>}
        {resource === 'kahve' && <><div><dt>Kahvehane tüketimi</dt><dd>{formatRate(consumption)} /dk</dd></div><div><dt>Stok değişimi</dt><dd>{net > 0 ? '+' : ''}{formatRate(net)} /dk</dd></div></>}
        <div><dt>Mevcut stok</dt><dd>{num(amount)} / {num(cap)}</dd></div>
        <div><dt>Boş yer</dt><dd>{num(Math.max(0, cap - amount))}{amount >= cap && <small>Stok dolu</small>}</dd></div>
      </dl>
      {amount >= cap && net > 0 && <p className="production-alert">Stok dolu; yeni {label.toLocaleLowerCase('tr')} üretimi depolanamıyor. Ambar veya Depo’yu yükseltin.</p>}
      <div className="production-actions"><GameButton onClick={wood ? onForest : onIsland}>{wood ? 'Ada ormanını yönet' : 'Ada kaynağını yönet'}</GameButton><GameButton variant="outline" onClick={onStorage}>Ambarı aç</GameButton>{resource === 'kahve' && <GameButton variant="outline" onClick={onCoffeehouse}>Kahve ikramını düzenle</GameButton>}</div>
      <details className="production-explanation"><summary>Üretim nasıl işler?</summary><p>{wood ? 'Kereste Ocağı’nın oduncuları ile ada ormanı birlikte kereste üretir. Ormancı Evi bu toplamı artırır. Ormanın temel katkısı yukarıda çarpanlar uygulanmadan gösterilir; toplam hızda araştırmalar, yönetim ve diğer etkin katkılar hesaplanmıştır.' : 'Bu yapı işçi atama yeri değildir; adanın ilgili kaynağında çalışan işçilerin üretimini artırır. İşçileri ada ekranından yönetebilirsiniz. Yapının yüzdesi ile şehrin toplam üretimi ayrı gösterilir.'}</p><p>{resource === 'kahve' ? 'Üretim brüt hızdır. Kahvehanenin gerçek tüketimi çıkarılınca stok değişimi bulunur; eksi değer stoktaki kahvenin azaldığını gösterir.' : 'Gösterilen hız üretim potansiyelidir. Stok kapasitesine ulaşıldığında yeni mal depolanamaz.'}</p></details>
    </Box>
  </>
}
