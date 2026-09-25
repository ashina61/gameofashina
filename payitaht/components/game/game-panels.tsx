'use client'

import { useState } from 'react'
import { ArrowUp, Hammer, Clock3, LockKeyhole, Check, BookOpen, ChevronRight, TreePine, Warehouse, Ruler, Users, UserRound, Minus, Plus as PlusIcon, House, HeartHandshake, TriangleAlert, Landmark, Swords, Ship, ShieldCheck, Handshake, Coins, FlaskConical, Compass, FlipHorizontal2, Move } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CostDisplay, JobProgress } from './game-widgets'
import { BUILDINGS, BUILDING_IDS, MAX_LEVEL, RESEARCH, RESEARCH_IDS, RESEARCH_BRANCHES, RESOURCE_IDS, RESOURCE_NAMES, UNITS, UNIT_IDS, WORKER_IDS, WORKERS_PER_LEVEL, activeJob, cargoCapacity, cityDefense, cost, duration, buildReason, power, rates, recruitReason, researchReason, scientistCount, scientistUpkeepPerMinute, idleWorkers, population, housing, contentment, soldiers, takesPlot, tradeCapacity, unhousedByUnrest, unitCost, unitDuration, wallDefense, workerCapacity, type BuildingId, type ResearchId, type ResearchBranch, type UnitId, type WorkerId, type Game } from '@/lib/game/engine'
import { buildingImage } from '@/lib/asset'
import { activeCity, colonyPalaceLevel, CARGO_IDS, CARGO_NAMES, COLONY_COST, ISLANDS, type Cargo, type Empire, type IslandId } from '@/lib/game/empire'
import { LUXURY_IDS, LUXURY_NAMES, MERCHANT_BUY, MERCHANT_SELL, MINE_MAX_LEVEL, luxuryCost, luxuryProduction, merchantLimit, mineCapacity, mineUpgradeCost, unitLuxuryCost, wineServed, type Luxury } from '@/lib/game/engine'
import { luxuryIcons } from './game-widgets'
import { effectLines } from '@/lib/game/building-info'
import { actionPoints, armyUpkeep, merchantBuyPrice, merchantSellPrice, type UnitRole } from '@/lib/game/engine'
import { Eye } from 'lucide-react'
import { garrisonLimit, garrisonUsed, spyCapacity, growthRate, maxPopulation, PLOTS, zoneOf } from '@/lib/game/engine'
import { BATTLE_STATS, SLOT_SIZE, fieldSize } from '@/lib/game/battle'
import { UnitFigure } from './unit-art'

export function BuildingDetails({ game, id, onBuild, onFlip, onMove }: { game: Game; id: BuildingId; onBuild: (id: BuildingId) => void; onFlip: (id: BuildingId) => void; onMove: (id: BuildingId) => void }) {
  const b = BUILDINGS[id], level = game.buildings[id], reason = buildReason(game, id)
  const active = activeJob(game)?.id === id ? activeJob(game) : null
  const queued = game.queue.findIndex(job => job.id === id)
  const max = MAX_LEVEL[id]
  const forecast = Array.from({ length: Math.min(4, max - level) }, (_, step) => {
    const at = level + step
    const projected: Game = { ...game, buildings: { ...game.buildings, [id]: at } }
    return { level: at + 1, price: cost(projected, id), seconds: duration(projected, id) }
  })
  return <div className="building-details"><div className="building-preview"><div className="preview-halo" />{b.art ? <img src={buildingImage(id, level)} alt={`${b.name} mimari görünümü`} width={360} height={360} /> : <span className="preview-pending"><Hammer aria-hidden="true" /><small>Görsel hazırlanıyor</small></span>}<span>{level ? `SEVİYE ${level}` : 'YENİ YAPI'}</span></div><span className="eyebrow">{b.category}</span><p>{b.description}</p><BuildingEffects game={game} id={id} level={level} max={max} /><div className="building-upgrade"><span>{level ? `Seviye ${level}` : 'Boş arsa'}</span><ArrowUp className="size-4" /><strong>{level >= max ? 'En yüksek seviye' : `Seviye ${level + 1}`}</strong></div>{active ? <JobProgress job={active} now={game.updatedAt} /> : level < max && <><div className="upgrade-cost"><span>Gerekli kaynaklar</span><CostDisplay value={cost(game, id)} lux={luxuryCost(game, id)} /></div><div className="duration-row"><Clock3 className="size-4" /> {duration(game, id)} saniye <span>Prototip süresi</span></div></>}{forecast.length > 0 && <section className="building-cost-forecast">
    <strong>Sonraki seviyelerin maliyeti</strong>
    <p className="fine-print">Fiyatlar mevcut araştırma indirimlerini içerir. Sonraki yükseltmelerin ücreti, o günkü teknolojine göre yeniden hesaplanır.</p>
    {forecast.map(item => <div key={item.level} className="building-forecast-row">
      <strong>Sv. {item.level}</strong>
      <span>{item.price.gold.toLocaleString('tr-TR')} akçe · {item.price.wood.toLocaleString('tr-TR')} kereste · {item.price.stone.toLocaleString('tr-TR')} taş</span>
      <small>{Math.ceil(item.seconds / 60)} dk</small>
    </div>)}
  </section>}{queued > 0 && <p className="requirement"><Clock3 className="size-4" />İnşaat sırasında {queued + 1}. sırada bekliyor.</p>}{reason && !active && queued < 0 && <p className="requirement"><LockKeyhole className="size-4" />{reason}</p>}{level > 0 && takesPlot(id) && <div className="building-tools">{b.art && <Button variant="outline" size="sm" onClick={() => onFlip(id)}><FlipHorizontal2 data-icon="inline-start" />{game.flips.includes(id) ? 'Yönü geri çevir' : 'Çevir'}</Button>}{id !== 'divan' && <Button variant="outline" size="sm" onClick={() => onMove(id)}><Move data-icon="inline-start" />Taşı</Button>}</div>}<Button size="lg" className="w-full" disabled={!!reason} onClick={() => onBuild(id)}><Hammer data-icon="inline-start" />{active ? 'İnşaat devam ediyor' : level >= max ? 'Tamamen geliştirildi' : level ? 'Binayı yükselt' : 'İnşaata başla'}</Button></div>
}
export function BuildingList({ game, onSelect }: { game: Game; onSelect: (id: BuildingId) => void }) {
  return <div className="building-list">{BUILDING_IDS.map(id => <button key={id} className="building-list-item" onClick={() => onSelect(id)}>{BUILDINGS[id].art ? <img src={buildingImage(id, game.buildings[id])} alt="" width={88} height={88} /> : <span className="list-pending"><Hammer aria-hidden="true" /></span>}<span><span className="eyebrow">{BUILDINGS[id].category}</span><strong>{BUILDINGS[id].name}</strong><span>{game.buildings[id] ? `Seviye ${game.buildings[id]}${game.buildings[id] >= MAX_LEVEL[id] ? ' · Tamamlandı' : ' · Geliştirilebilir'}` : 'Boş arsa · Yeni yapı'}</span></span><ChevronRight className="size-4" /></button>)}</div>
}
const researchIcons: Partial<Record<ResearchId, typeof TreePine>> = {
  tools: TreePine, storage: Warehouse, ticaret: Coins, architecture: Ruler,
  alimler: FlaskConical, celik: Swords, istihkam: ShieldCheck, pusula: Compass, yelken: Ship,
}
export function ResearchPanel({ game, onResearch }: { game: Game; onResearch: (id: ResearchId) => void }) {
  const [focus, setFocus] = useState<ResearchBranch | 'all'>('all')
  const scientists = scientistCount(game)
  const production = rates(game).knowledge
  return <div className="research-panel">
    <div className="research-intro"><BookOpen className="size-5" /><span>
      <strong>Medrese / Akademi</strong>
      <p>{scientists}/{game.buildings.medrese * WORKERS_PER_LEVEL} âlim ·
        +{production.toFixed(1)} ilim/dk · {(scientistUpkeepPerMinute(game) * 60).toFixed(0)} akçe/saat bakım.</p>
      <p>Âlim sayısını Halk panelinden ayarlayabilirsin. Dört araştırma kolu yeni yapı, ekonomi ve askerî bonuslar açar.</p>
    </span></div>
    {game.study && <JobProgress job={game.study} now={game.updatedAt} />}
    <div className="research-branch-tabs" role="group" aria-label="Araştırma dalları">
      <button type="button" aria-pressed={focus === 'all'} onClick={() => setFocus('all')}>Tümü</button>
      {RESEARCH_BRANCHES.map(branch => <button type="button" key={branch.key}
        aria-pressed={focus === branch.key} onClick={() => setFocus(branch.key)}>{branch.title}</button>)}
    </div>
    {RESEARCH_BRANCHES.filter(branch => focus === 'all' || focus === branch.key).map(branch => {
    const ids = RESEARCH_IDS.filter(id => RESEARCH[id].branch === branch.key)
    const doneCount = ids.filter(id => game.research.includes(id)).length
    return <section className="research-branch" key={branch.key}>
      <div className="research-branch-top"><h3>{branch.title}</h3><span>{doneCount}/{ids.length}</span></div>
      {ids.map(id => {
        const r = RESEARCH[id], reason = researchReason(game, id), done = game.research.includes(id), Icon = researchIcons[id] ?? BookOpen
        return <article className="research-card" key={id}><div className="research-card-top"><span className="research-icon"><Icon /></span><span><h3>{r.name}</h3></span>{done && <Check className="size-5" />}</div><p>{r.description}</p><div className="research-bottom"><CostDisplay value={{ knowledge: r.cost }} /><span><Clock3 className="size-3" /> {r.duration} sn</span><Button size="sm" variant={done ? 'secondary' : 'default'} disabled={!!reason} onClick={() => onResearch(id)}>{done ? 'Keşfedildi' : game.study?.id === id ? 'Sürüyor' : 'Araştır'}</Button></div>{reason && !done && <p className="fine-print">{reason}</p>}</article>
      })}
    </section>
  })}</div>
}
export function JournalPanel({ game }: { game: Game }) {
  return <div className="journal-panel"><span className="eyebrow">ŞEHRİNİN HİKÂYESİ</span>{game.log.map((entry, index) => <div className="journal-entry" key={`${entry.time}-${index}`}><span className="journal-dot" /><div><p>{entry.text}</p><time>{new Date(entry.time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} · {new Date(entry.time).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</time></div></div>)}<p className="fine-print">Tek oyunculu prototip. Buradaki tüm gelişmeler kendi şehrine aittir; gerçek oyuncu etkinliği gösterilmez.</p></div>
}

/**
 * Bos bir arsaya kurulabilecek yapilar.
 *
 * Ikariam'da arsa once secilir, yapi sonra. Burada da oyle: oyuncu haritada
 * bos bir arsaya dokunur ve o arsaya ne kuracagini buradan secer.
 */
export function PlotPicker({ game, plot, onBuild }: { game: Game; plot: number; onBuild: (id: BuildingId, plot: number) => void }) {
  /*
   * Arsa kaplamayan yapi (Surlar) burada GORUNMEZ.
   *
   * Yerlesimi hep null oldugu icin listeye giriyordu ve oyuncuya "bu arsaya
   * sur kurabilirsin" diyordu - oysa surlar sehrin cevresine orulur, arsa
   * tutmaz. Kurmak isteyen Inşa listesinden kurar.
   */
  // Deniz arsasında yalnızca liman yapıları, karada yalnızca kara yapıları listelenir.
  const zone = PLOTS[plot]?.zone ?? 'sehir'
  const candidates = BUILDING_IDS.filter(id => takesPlot(id) && game.placement[id] === null && zoneOf(id) === zone)
  return <div className="building-list">
    <p className="fine-print">{zone === 'liman' ? 'Deniz arsası: liman, tersane ve korsan kalesi buraya kurulur.' : 'Kara arsası. Kurulduktan sonra binaya dokunup yükseltirsin.'}</p>
    {candidates.length === 0 && <p className="requirement"><LockKeyhole className="size-4" />Kurulabilecek yeni yapı kalmadı. Mevcut yapılarını yükselt.</p>}
    {candidates.map(id => {
      const reason = buildReason(game, id)
      return <button key={id} className="building-list-item" disabled={!!reason} onClick={() => onBuild(id, plot)}>
        {BUILDINGS[id].art ? <img src={buildingImage(id)} alt="" width={88} height={88} /> : <span className="list-pending"><Hammer aria-hidden="true" /></span>}
        <span>
          <span className="eyebrow">{BUILDINGS[id].category}</span>
          <strong>{BUILDINGS[id].name}</strong>
          <span>{reason ?? 'Bu arsaya kurulabilir'}</span>
        </span>
        <ChevronRight className="size-4" />
      </button>
    })}
  </div>
}

/**
 * HALK: uretim yapilarina isci dagitimi.
 *
 * Oyunun eksik olan karar katmani buydu - uretim yalnizca bina seviyesinden
 * geliyordu, yani oyuncunun yapacagi bir sey yoktu. Artik her uretim yapisi
 * kapasitesi kadar isci alir ve sehrin nufusu bu kapasitelerin toplamindan
 * KUCUK oldugunda oyuncu secim yapmak zorunda kalir.
 */
export function PeoplePanel({ game, onAssign }: { game: Game; onAssign: (id: WorkerId, value: number) => void }) {
  const idle = idleWorkers(game)
  const unhoused = unhousedByUnrest(game)
  return <div className="people-panel">
    <div className="people-summary">
      <span className="eyebrow">ŞEHRİN HALKI</span>
      <div><Users className="size-5" /><span>Nüfus</span><strong>{population(game)}<small className="people-cap"> / {maxPopulation(game)}</small></strong></div>
      <div><UserRound className="size-5" /><span>Boşta</span><strong className={idle === 0 ? 'people-none' : undefined}>{idle}</strong></div>
      <div><House className="size-5" /><span>Barınma</span><strong>{housing(game)}</strong></div>
      <div><HeartHandshake className="size-5" /><span>Huzur</span><strong>{contentment(game)}</strong></div>
    </div>
    {/*
      * Barinma huzurdan buyukse konaklar bos kalir. Bu, oyuncunun kendi
      * kesfetmesi zor bir tavan: sayilar ayni ekranda dursa bile aradaki
      * ILISKI soylenmezse "neden nufusum artmiyor" sorusu cevapsiz kalir.
      */}
    {growthRate(game) > 0 && <p className="fine-print" role="status"><Users className="size-3" /> Halk büyüyor: dakikada +{growthRate(game).toFixed(1)} kişi. Huzur fazlası büyümeyi hızlandırır.</p>}
    {unhoused > 0 && <p className="storage-alert" role="status"><TriangleAlert className="size-4" />Huzursuzluk yüzünden {unhoused} kişilik konak boş duruyor. Hamam kur ya da yükselt.</p>}
    {WORKER_IDS.map(id => {
      const capacity = workerCapacity(game, id)
      const value = game.workers[id]
      if (capacity === 0) {
        return <article className="people-row" key={id}>
          <strong>{BUILDINGS[id].name}</strong>
          <p className="fine-print">Önce bu yapıyı inşa et.</p>
        </article>
      }
      return <article className="people-row" key={id}>
        <div className="people-row-top">
          <strong>{BUILDINGS[id].name}</strong>
          <span className="people-count">{value} / {capacity}</span>
        </div>
        <span className="people-meter"><span style={{ width: `${(value / capacity) * 100}%` }} /></span>
        <div className="people-controls">
          <Button size="sm" variant="outline" aria-label={`${BUILDINGS[id].name} işçi azalt`} disabled={value <= 0} onClick={() => onAssign(id, value - 10)}><Minus /></Button>
          <input
            type="range" min={0} max={capacity} step={1} value={value}
            aria-label={`${BUILDINGS[id].name} işçi sayısı`}
            onChange={event => onAssign(id, Number(event.target.value))}
          />
          <Button size="sm" variant="outline" aria-label={`${BUILDINGS[id].name} işçi artır`} disabled={value >= capacity || idle <= 0} onClick={() => onAssign(id, value + 10)}><PlusIcon /></Button>
        </div>
      </article>
    })}
    <p className="fine-print">Her yapı seviyesi {WORKERS_PER_LEVEL} işçi alır. Nüfus, barınma ve huzurdan hangisi küçükse o tavana zamanla büyür. Boşta kalan halk üretim yapmaz; akçe ise halkın kendisinden gelir ve işçi istemez.</p>
  </div>
}

/**
 * ŞEHİRLER danismani.
 *
 * Ikariam'da bu ekran butun sehirlerin listesidir. Bizde sehir henuz tek, ama
 * ekrani simdiden acmak iki ise yariyor: sehrin ozetini tek yerde toplar ve
 * Saray'in NE ISE YARADIGINI - ikinci sehir - bos bir kart olarak gosterir.
 * Kilidi acilmamis bir ozelligi gizlemek yerine gostermek, oyuncuya hedef verir.
 */
export function CitiesPanel({
  game, empire, onBuilding, onSelectCity, onColonize, onCargo, onViewIsland,
}: {
  game: Game
  empire: Empire
  onBuilding: (id: BuildingId) => void
  onSelectCity: (cityId: string) => void
  onColonize: (islandId: IslandId) => void
  onCargo: (cityId: string, resource: Cargo, amount: number) => void
  onViewIsland: (islandId: IslandId) => void
}) {
  const current = activeCity(empire)
  const [targetCity, setTargetCity] = useState('')
  const [cargoResource, setCargoResource] = useState<Cargo>('wood')
  const [cargoAmount, setCargoAmount] = useState('100')
  const activeShipment = empire.shipments.find(shipment => shipment.from === current.id)
  const capital = empire.cities[0].game
  const built = BUILDING_IDS.filter(id => game.buildings[id] > 0)
  const production = rates(game)
  return <div className="advisor-panel">
    <article className="city-card">
      <div className="city-card-top">
        <span className="city-emblem"><Landmark aria-hidden="true" /></span>
        <span><span className="eyebrow">{current.id === 'city-1' ? 'BAŞKENT' : 'YENİ ŞEHİR'}</span>
          <strong>{current.name}</strong><span>Seviye {game.buildings.divan} · {built.length} yapı · {ISLANDS.find(i => i.id === current.islandId)?.name}</span></span>
      </div>
      <div className="city-stats">
        <div><span>Nüfus</span><strong>{population(game)}</strong></div>
        <div><span>Boşta</span><strong>{idleWorkers(game)}</strong></div>
        <div><span>Asker</span><strong>{soldiers(game)}</strong></div>
        <div><span>Savunma</span><strong>{cityDefense(game)}</strong></div>
      </div>
      <div className="city-rates">{RESOURCE_IDS.filter(id => production[id] > 0).map(id =>
        <span key={id}>{RESOURCE_NAMES[id]} <strong>+{Math.round(production[id])}/dk</strong></span>)}</div>
      <Button size="sm" variant="outline" onClick={() => onBuilding('divan')}>Divanhaneye git<ChevronRight data-icon="inline-end" /></Button>
    </article>

    <section className="empire-section">
      <h3>Şehirlerin · {empire.cities.length}/{ISLANDS.length}</h3>
      <div className="empire-city-list">
        {empire.cities.map(city => <button key={city.id} className="empire-city-button"
          aria-current={city.id === current.id ? 'true' : undefined}
          onClick={() => onSelectCity(city.id)}>
          <span><strong>{city.name}</strong><small>{ISLANDS.find(i => i.id === city.islandId)?.name} · Divanhane {city.game.buildings.divan}</small></span>
          <span>{city.id === current.id ? 'Şu an' : 'Git ›'}</span>
        </button>)}
      </div>
    </section>

    <section className="empire-section">
      <h3>Adalar haritası</h3>
      <p className="fine-print">Her adada tek bir lüks kaynak yatağı bulunur: şehir yalnızca kendi adasının kaynağını madenden çıkarır. Diğerlerini koloni kurarak, nakliyeyle ya da Çarşı'daki tüccardan edinirsin.</p>
      <div className="island-atlas">
        {ISLANDS.map(island => {
          const city = empire.cities.find(c => c.islandId === island.id)
          const missing = capital.buildings.saray < colonyPalaceLevel(empire)
            ? `Saray ${colonyPalaceLevel(empire)}. seviye gerekli`
            : capital.buildings.liman < 1 || capital.army.nakliye < 3
              ? 'Başkentte liman ve 3 nakliye gemisi gerekli'
              : null
          return <article key={island.id} className="island-atlas-card">
            <span className="eyebrow">{island.specialty} yatağı</span>
            <strong>{island.name}</strong>
            <span>{city ? city.name : 'Boş ada'}</span>
            {city
              ? <Button size="sm" variant="outline" onClick={() => onSelectCity(city.id)}>
                {city.id === current.id ? 'Bu şehir' : 'Şehre git'}
              </Button>
              : <Button size="sm" disabled={!!missing} onClick={() => onColonize(island.id)}>Koloni kur</Button>}
            <Button size="sm" variant="ghost" onClick={() => onViewIsland(island.id)}>Adayı gör</Button>
            {!city && missing && <small>{missing}</small>}
          </article>
        })}
      </div>
      <p className="fine-print">Yeni koloni: {COLONY_COST.gold} akçe, {COLONY_COST.wood} kereste, {COLONY_COST.stone} taş. Saray seviyesi toplam koloni sayısını sınırlar; her şehir ayrı bina, üretim ve orduya sahiptir.</p>
    </section>

    <section className="empire-section">
      <h3>Şehirler arası nakliye</h3>
      {activeShipment
        ? <p className="requirement">Gemiler seferde: {empire.cities.find(c => c.id === activeShipment.to)?.name} yönüne {activeShipment.amount} {CARGO_NAMES[activeShipment.resource]}. {Date.now() >= activeShipment.eta ? 'Varış limanında ambarın boşalmasını bekliyor.' : 'Varış bekleniyor.'}</p>
        : <div className="empire-shipment-form">
            <label>Hedef şehir
              <select value={targetCity} onChange={event => setTargetCity(event.target.value)}>
                <option value="">Şehir seç</option>
                {empire.cities.filter(city => city.id !== current.id).map(city =>
                  <option key={city.id} value={city.id}>{city.name}</option>)}
              </select>
            </label>
            <label>Kaynak
              <select value={cargoResource} onChange={event => setCargoResource(event.target.value as Cargo)}>
                {CARGO_IDS.map(id => <option value={id} key={id}>{CARGO_NAMES[id]}</option>)}
              </select>
            </label>
            <label>Miktar
              <input type="number" min={1} step={1} inputMode="numeric" value={cargoAmount}
                onChange={event => setCargoAmount(event.target.value)} />
            </label>
            <Button size="sm" disabled={!targetCity || !Number.isSafeInteger(Number(cargoAmount)) || Number(cargoAmount) <= 0}
              onClick={() => onCargo(targetCity, cargoResource, Number(cargoAmount))}>Gemileri gönder</Button>
          </div>}
      <p className="fine-print">Nakliye için gönderici şehirde Ticaret Limanı ve nakliye gemisi gerekir. Yük yolculuk sırasında çıkar, varışta hedef şehrin ambarına iner; ambar doluysa gemi yükü bekletir.</p>
    </section>
  </div>
}

/** Savaş alanındaki yerler (Ikariam'ın savaş sırası). */
const ROLE_ORDER: UnitRole[] = ['front', 'flank', 'range', 'artillery', 'support', 'spy', 'transport']
const ROLE_NAMES: Record<UnitRole, string> = { front: 'ön cephe', flank: 'kanat', range: 'uzak menzil', artillery: 'kuşatma', support: 'destek', spy: 'casus', transport: 'nakliye' }

/** Bir emirde eğitilebilecek parti büyüklükleri. */
const BATCHES = [1, 5, 10]

/**
 * ORDU danismani.
 *
 * Ekranin en ustunde nufus muhasebesi durur - cunku bu oyunda asker almanin
 * bedeli akce degil, VATANDAS. Oyuncu bir birligi egitmeden once kac kisinin
 * bosta oldugunu gormezse, uretiminin nicin dustugunu anlamaz.
 */
export function ArmyPanel({ game, onRecruit, onBuild, home }: { game: Game; onRecruit: (id: UnitId, count: number) => void; onBuild: (id: BuildingId) => void; home?: BuildingId }) {
  const [batch, setBatch] = useState(1)
  const land = power(game, 'kara')
  const sea = power(game, 'deniz')
  const branches: { key: 'kara' | 'deniz'; title: string; home: BuildingId }[] = [
    { key: 'kara', title: 'Kara ordusu', home: 'kisla' },
    { key: 'deniz', title: 'Donanma', home: 'tersane' },
  ]
  return <div className="advisor-panel">
    <div className="army-summary">
      <span className="eyebrow">SANCAĞIN ALTINDA</span>
      <div><Users className="size-5" /><span>Asker</span><strong>{soldiers(game)}</strong></div>
      <div><UserRound className="size-5" /><span>Boşta halk</span><strong className={idleWorkers(game) === 0 ? 'people-none' : undefined}>{idleWorkers(game)}</strong></div>
      <div><ShieldCheck className="size-5" /><span>Savunma</span><strong>{cityDefense(game)}</strong></div>
      <div><Swords className="size-5" /><span>Saldırı</span><strong>{land.attack}</strong></div>
    </div>
    <p className="army-note"><Coins className="size-4" />Ordunun bakımı dakikada {Math.round(armyUpkeep(game) * 10) / 10} akçe · aynı anda {actionPoints(game)} görev (hamle puanı).</p>
    <p className="army-note"><TriangleAlert className="size-4" />Asker halktan çıkar. Eğitilen her vatandaş üretimden düşer; surlar ise asker istemez, taş ister ({wallDefense(game)} savunma).</p>
    <BattlefieldCard game={game} />
    {game.drill && <JobProgress job={game.drill} now={game.updatedAt} />}
    <div className="batch-row"><span>Parti</span>{BATCHES.map(n => <Button key={n} size="sm" variant={batch === n ? 'default' : 'outline'} onClick={() => setBatch(n)}>{n}</Button>)}</div>
    {branches.map(branch => {
      const units = UNIT_IDS.filter(id => UNITS[id].branch === branch.key && (!home || UNITS[id].home === home)).sort((a, b) => ROLE_ORDER.indexOf(UNITS[a].role) - ROLE_ORDER.indexOf(UNITS[b].role))
      if (!units.length) return null
      const ready = units.some(id => game.buildings[UNITS[id].home] > 0)
      return <section className="army-branch" key={branch.key}>
        <div className="army-branch-top"><h3>{branch.title}</h3><span>{branch.key === 'deniz' ? `Deniz gücü ${sea.attack} / ${sea.defense}` : `Savunma ${land.defense}`}</span></div>
        {!ready && <button className="army-locked" onClick={() => onBuild(branch.home)}><LockKeyhole className="size-4" /><span><strong>{BUILDINGS[branch.home].name} gerekli</strong><small>{BUILDINGS[branch.home].description}</small></span><ChevronRight className="size-4" /></button>}
        {units.map(id => {
          const unit = UNITS[id]
          const reason = recruitReason(game, id, batch)
          return <article className="unit-card" key={id}>
            <div className="unit-top">
              <span className="unit-portrait"><UnitFigure id={id} size={60} /></span>
              <span><strong>{unit.name} <em className="unit-role">{ROLE_NAMES[unit.role]}</em></strong><small>{unit.description}</small></span>
              <span className="unit-have">{game.army[id]}<small>elde</small></span>
            </div>
            {BATTLE_STATS[id] && ROLE_ROW_SET.has(unit.role) && <div className="unit-battle" aria-label="Savaş değerleri">
              <span title="Yakın dövüş saldırısı">⚔ {BATTLE_STATS[id]!.melee}</span>
              {BATTLE_STATS[id]!.ranged > 0 && <span title={`Uzak saldırı · ${BATTLE_STATS[id]!.ammo} tur cephane`}>🏹 {BATTLE_STATS[id]!.ranged} ×{BATTLE_STATS[id]!.ammo}</span>}
              <span title="Zırh: her vuruştan düşer">🛡 {BATTLE_STATS[id]!.armor}</span>
              <span title={`Büyüklük: bir yuvaya ${Math.floor(SLOT_SIZE / BATTLE_STATS[id]!.size)} adet sığar`}>▣ {BATTLE_STATS[id]!.size}</span>
              {BATTLE_STATS[id]!.vsWall && <span title="Sura karşı çarpan">🧱 ×{BATTLE_STATS[id]!.vsWall}</span>}
            </div>}
            <div className="unit-stats">
              <span title="Saldırı"><Swords className="size-3" />{unit.attack}</span>
              <span title="Savunma"><ShieldCheck className="size-3" />{unit.defense}</span>
              <span title="Aldığı vatandaş"><Users className="size-3" />{unit.pop}</span>
              <span title="Can puanı">❤ {unit.hp}</span>
              <span title="Bakım gideri (akçe/dk)"><Coins className="size-3" />{unit.upkeep}/dk</span>
              {unit.cargo > 0 && <span title="Taşıma"><Warehouse className="size-3" />{unit.cargo}</span>}
            </div>
            <div className="unit-bottom">
              <CostDisplay value={unitCost(id, batch, game)} lux={unitLuxuryCost(id, batch, game)} />
              <span><Clock3 className="size-3" /> {unitDuration(game, id, batch)} sn</span>
              <Button size="sm" disabled={!!reason} onClick={() => onRecruit(id, batch)}>{batch} eğit</Button>
            </div>
            {reason && <p className="fine-print">{reason}</p>}
          </article>
        })}
      </section>
    })}
    <p className="fine-print">Taşıma kapasitesi {cargoCapacity(game)} mal · Ticaret limanı {tradeCapacity(game)} mal. Seferler ve casusluk Ada görünümünden (soldaki Ada danışmanı) adadaki bağımsız yerleşimlere düzenlenir.</p>
  </div>
}

const ROLE_ROW_SET = new Set<UnitRole>(['front', 'flank', 'range', 'artillery', 'support'])
/** Şehrin savaş meydanı: Divanhane seviyesiyle büyür (Ikariam). */
function BattlefieldCard({ game }: { game: Game }) {
  const level = game.buildings.divan
  const f = fieldSize(level)
  const next = level < 5 ? 5 : level < 10 ? 10 : level < 17 ? 17 : null
  const rows: Array<[string, number]> = [['Ön cephe', f.front], ['Kanatlar', f.flank], ['Uzak menzil', f.range], ['Kuşatma', f.artillery]]
  const garrison = (['kara', 'deniz'] as const).map(b => ({ b, used: garrisonUsed(game, b), max: garrisonLimit(game, b) }))
  return <article className="bf-card">
    <span className="eyebrow">SAVAŞ MEYDANI · {f.name.toUpperCase()}</span>
    <div className="bf-card-rows">{rows.map(([n, k]) => <span key={n}><strong>{k}</strong><small>{n}</small></span>)}</div>
    <p className="fine-print">Her yuvaya bir tür birlik ve {SLOT_SIZE} büyüklük sığar; fazlası yedekte bekler ve düşenlerin yerini alır. Ön cephe boşalırsa kanat ve nişancılar öne çıkar. Nişancıların cephanesi tükenir; kanatlar düşmanın arkasına dalar; kuşatma sura vurur. Savaş dakikada bir tur sürer: turlar arasında takviye katılır, saldıran geri çekilebilir.{next ? ` Divanhane ${next}. seviyede meydan büyür.` : ''}</p>
    <div className="bf-garrison">{garrison.map(({ b, used, max }) => <div key={b} className={used >= max && max > 0 ? 'is-full' : ''}>
      <span>{b === 'kara' ? 'Kara garnizonu' : 'Deniz garnizonu'}</span>
      <span className="bf-garrison-bar"><i style={{ width: `${max ? Math.min(100, (100 * used) / max) : 0}%` }} /></span>
      <strong>{used} / {max}</strong>
    </div>)}</div>
    <p className="fine-print">Garnizon sınırı birliklerin halk karşılığıdır (seferdekiler dahil; casus ve nakliye hariç). Kara sınırını Divanhane ve Surlar, deniz sınırını Tersane yükseltir.</p>
  </article>
}

/**
 * DIPLOMASI danismani.
 *
 * Tek oyunculu bir prototipte muttefik yok - o yuzden burada UYDURMA bir
 * oyuncu listesi gostermiyorum. Ekran, Elcilik'in ne actigini anlatir ve
 * neyin heniz olmadigini acikca soyler.
 */
export function DiplomacyPanel({ game, onBuild }: { game: Game; onBuild: (id: BuildingId) => void }) {
  const level = game.buildings.elcilik
  return <div className="advisor-panel">
    {level === 0
      ? <button className="army-locked" onClick={() => onBuild('elcilik')}><LockKeyhole className="size-4" /><span><strong>Elçilik gerekli</strong><small>{BUILDINGS.elcilik.description}</small></span><ChevronRight className="size-4" /></button>
      : <article className="city-card"><div className="city-card-top"><span className="city-emblem"><Handshake aria-hidden="true" /></span><span><span className="eyebrow">ELÇİLİK · SEVİYE {level}</span><strong>Kapın açık</strong><span>İttifak defteri hazır</span></span></div><p className="fine-print">Elçiliğin kuruldu. İttifak ve anlaşmalar, oyun çok oyunculuya açıldığında buraya gelecek.</p></article>}
    {level > 0 && <article className="city-card">
      <div className="city-card-top"><span className="city-emblem"><Eye aria-hidden="true" /></span><span><span className="eyebrow">CASUSLUK</span><strong>{game.army.casus} / {spyCapacity(game)} casus</strong><span>Casuslar Kışla panelinden (Ordu) yetişir; Ada görünümünde bir yerleşime dokunup gönderilir.</span></span></div>
    </article>}
    <article className="city-card">
      <div className="city-card-top"><span className="city-emblem"><Ship aria-hidden="true" /></span><span><span className="eyebrow">TİCARET</span><strong>{tradeCapacity(game)} mal kapasite</strong><span>{game.army.nakliye} nakliye gemisi · {cargoCapacity(game)} taşıma</span></span></div>
      <p className="fine-print">Ticaret Limanı kapasiteyi, nakliye gemileri taşımayı verir. Karşı taraf — başka oyuncular — bu prototipte yok; sayılar hazır, ticaret yolu açıldığında bağlanacak.</p>
    </article>
    <p className="fine-print">Burada gerçek oyuncu, ittifak ya da mesaj gösterilmez. Uydurma bir liste koymaktansa boş bırakmak dürüst olanı.</p>
  </div>
}

/**
 * ADA danışmanı: adanın lüks kaynak madeni (Ikariam'daki ada görünümü).
 *
 * Maden işçileri boştaki halktan gelir; madenin seviyesi kereste bağışıyla
 * yükselir ve daha çok işçi alır. Adada olmayan kaynaklar Çarşı'daki
 * tüccardan (bir NPC; gerçek oyuncu pazarı DEĞİL) alınabilir.
 */
export function IslandPanel({ game, islandName, onMiners, onDonate, onTrade }: {
  game: Game; islandName: string
  onMiners: (value: number) => void
  onDonate: (amount: number) => void
  onTrade: (id: Luxury, side: 'buy' | 'sell', amount: number) => void
}) {
  const [lot, setLot] = useState(50)
  const spec = game.mine.specialty
  const SpecIcon = luxuryIcons[spec]
  const cap = mineCapacity(game)
  const perMin = Math.round(luxuryProduction(game)[spec] * 10) / 10
  const next = mineUpgradeCost(game.mine.level)
  const free = idleWorkers(game) + game.mine.miners
  return <div className="advisor-panel island-panel">
    <article className="city-card">
      <div className="city-card-top">
        <span className="city-emblem"><SpecIcon aria-hidden="true" /></span>
        <span><span className="eyebrow">{islandName.toLocaleUpperCase('tr')}</span>
          <strong>{LUXURY_NAMES[spec]} madeni · seviye {game.mine.level}</strong>
          <span>{game.mine.miners}/{cap} işçi · dakikada {perMin} {LUXURY_NAMES[spec].toLocaleLowerCase('tr')}</span></span>
      </div>
      <article className="people-row">
        <div className="people-row-top"><strong>Maden işçileri</strong><span>{game.mine.miners} / {cap}</span></div>
        <input type="range" min={0} max={cap} step={1} value={game.mine.miners} aria-label="Maden işçileri"
          onChange={event => onMiners(Number(event.target.value))} />
        <p className="fine-print">Boştaki halk: {idleWorkers(game)}. İşçi başına dakikada 3 {LUXURY_NAMES[spec].toLocaleLowerCase('tr')}; üretim yapılarındaki işçiler buraya kendiliğinden geçmez.</p>
        <div className="batch-row">
          <Button size="sm" variant="outline" onClick={() => onMiners(0)}>Boşalt</Button>
          <Button size="sm" variant="outline" onClick={() => onMiners(Math.min(cap, free))}>Doldur</Button>
        </div>
      </article>
    </article>

    <section className="empire-section">
      <h3>Madeni genişlet</h3>
      {game.mine.level >= MINE_MAX_LEVEL
        ? <p className="fine-print">Maden en yüksek seviyede.</p>
        : <>
          <p className="fine-print">Ada halkı kereste bağışıyla madeni büyütür. Seviye {game.mine.level + 1} için {game.mine.wood} / {next} kereste toplandı; her seviye {`+`}12 işçi yeri açar.</p>
          <span className="storage-meter"><span style={{ width: `${Math.min(100, (game.mine.wood / next) * 100)}%` }} /></span>
          <div className="batch-row">{[100, 500, 2000].map(n =>
            <Button key={n} size="sm" variant="outline" disabled={game.resources.wood < n} onClick={() => onDonate(n)}>{n} kereste</Button>)}</div>
        </>}
    </section>

    <section className="empire-section">
      <h3>Lüks ambarı</h3>
      <div className="luxury-grid">{LUXURY_IDS.map(id => {
        const Icon = luxuryIcons[id]
        return <div key={id} className={id === spec ? 'luxury-cell luxury-home' : 'luxury-cell'}>
          <Icon aria-hidden="true" /><span>{LUXURY_NAMES[id]}</span><strong>{Math.floor(game.luxury[id])}</strong>
        </div>
      })}</div>
      <p className="fine-print">Üzüm Kahvehane'de ikram edilir (huzur{game.buildings.kahvehane > 0 ? (wineServed(game) ? ' · şu an ikram ediliyor' : ' · üzüm yok, ikram durdu') : ''}); mermer gelişmiş binalarda, kristal ilim ve kültür yapılarında, kükürt top ve gemilerde kullanılır.</p>
    </section>

    <section className="empire-section">
      <h3>Çarşı tüccarı</h3>
      {game.buildings.carsi < 1
        ? <p className="fine-print">Tüccar Çarşı kurulunca gelir.</p>
        : <>
          <p className="fine-print">Alış {merchantBuyPrice(game)} akçe, satış {merchantSellPrice(game)} akçe (Ticaret Merkezi iyileştirir). Tek seferde en fazla {merchantLimit(game)} birim (Çarşı seviyesiyle artar).</p>
          <div className="batch-row"><span>Parti</span>{[10, 50, 150].filter(n => n <= merchantLimit(game)).map(n =>
            <Button key={n} size="sm" variant={lot === n ? 'default' : 'outline'} onClick={() => setLot(n)}>{n}</Button>)}</div>
          <div className="merchant-list">{LUXURY_IDS.map(id => <div key={id} className="merchant-row">
            <span>{LUXURY_NAMES[id]}</span>
            <Button size="sm" variant="outline" disabled={game.resources.gold < Math.ceil(lot * merchantBuyPrice(game))} onClick={() => onTrade(id, 'buy', lot)}>Al · {Math.ceil(lot * merchantBuyPrice(game))}</Button>
            <Button size="sm" variant="outline" disabled={game.luxury[id] < lot} onClick={() => onTrade(id, 'sell', lot)}>Sat</Button>
          </div>)}</div>
        </>}
    </section>
  </div>
}

/** Seviye etkisi: şu anki seviye ve bir sonraki seviyede ne değişir. */
export function BuildingEffects({ game, id, level, max }: { game: Game; id: BuildingId; level: number; max: number }) {
  const now = level > 0 ? effectLines(game, id, level) : []
  const next = level < max ? effectLines(game, id, level + 1) : []
  const rows = (next.length ? next : now).map((line, i) => ({ label: line.label, now: now[i]?.value ?? '—', next: next[i]?.value }))
  return <section className="building-effects" aria-label="Seviye etkisi">
    <div className="building-effects-head"><span>Etki</span><span>{level > 0 ? `Sv. ${level}` : 'Kurulmadı'}</span>{next.length > 0 && <span>Sv. {level + 1}</span>}</div>
    {rows.map(row => <div key={row.label} className="building-effects-row">
      <span>{row.label}</span><strong>{row.now}</strong>{row.next !== undefined && <em>{row.next}</em>}
    </div>)}
  </section>
}
