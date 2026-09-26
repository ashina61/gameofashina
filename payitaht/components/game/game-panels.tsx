'use client'

import { Hint } from './hint'
import { useState } from 'react'
import { ArrowUp, Hammer, Clock3, LockKeyhole, Check, BookOpen, ChevronRight, TreePine, Warehouse, Ruler, Users, UserRound, Minus, Plus as PlusIcon, House, HeartHandshake, TriangleAlert, Landmark, Swords, Ship, ShieldCheck, Handshake, FlaskConical, Compass, FlipHorizontal2, Move } from 'lucide-react'
import { AkceArt, IlimArt } from './resource-art'
import { idleMerchants } from '@/lib/game/expeditions'
import { WorkforceSlider, type Figure } from './workforce'
import { Button } from '@/components/ui/button'
import { CostDisplay, JobProgress } from './game-widgets'
import { BUILDINGS, BUILDING_IDS, MAX_LEVEL, RESEARCH, RESEARCH_IDS, RESEARCH_BRANCHES, RESOURCE_IDS, RESOURCE_NAMES, UNITS, UNIT_IDS, WORKER_IDS, WORKERS_PER_LEVEL, activeJob, cargoCapacity, cityDefense, cost, duration, buildReason, power, rates, recruitReason, researchReason, scientistCount, scientistUpkeepPerMinute, idleWorkers, population, housing, contentment, soldiers, takesPlot, tradeCapacity, unhousedByUnrest, unitCost, unitDuration, wallDefense, workerCapacity, type BuildingId, type ResearchId, type ResearchBranch, type UnitId, type WorkerId, type Game } from '@/lib/game/engine'
import { buildingImage } from '@/lib/asset'
import { abandonCity, activeCity, capitalCity, capitalId, colonyPalaceLevel, MAX_CITIES, moveCapital, CARGO_IDS, CARGO_NAMES, COLONY_COST, ISLANDS, type Cargo, type Empire, type IslandId } from '@/lib/game/empire'
import { LUXURY_IDS, LUXURY_NAMES, MERCHANT_BUY, MERCHANT_SELL, MINE_MAX_LEVEL, luxuryCost, luxuryProduction, merchantLimit, mineCapacity, mineUpgradeCost, unitLuxuryCost, wineServed, type Luxury } from '@/lib/game/engine'
import { luxuryIcons, resourceIcons } from './game-widgets'
import { effectLines } from '@/lib/game/building-info'
import { actionPoints, armyUpkeep, merchantBuyPrice, merchantSellPrice, type UnitRole, type Resource } from '@/lib/game/engine'
import { ChevronsLeft, ChevronsRight, Crown, Eye, Flag } from 'lucide-react'
import type { Run } from './world-panels'
import { DRILL_QUEUE_LIMIT, garrisonLimit, garrisonUsed, spyCapacity, growthRate, maxPopulation, PLOTS, zoneOf } from '@/lib/game/engine'
import { BATTLE_STATS, SLOT_SIZE, fieldSize } from '@/lib/game/battle'
import { UnitFigure } from './unit-art'
import { ResearchEmblem } from './research-art'
import { WorldMap } from './world-map'

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
    <Hint>Fiyatlar mevcut araştırma indirimlerini içerir. Sonraki yükseltmelerin ücreti, o günkü teknolojine göre yeniden hesaplanır.</Hint>
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
/**
 * ARAŞTIRMA DANIŞMANI (Ikariam düzeni): üstte âlim sayısı, ilim ve saatlik
 * birikim; dal sekmeleri; seçili araştırmanın ayrıntısı (etki, gerekenler,
 * masraf, ne zaman yeteceği); altında dalın numaralı listesi ve kandil
 * işaretleri (yanan: tamam, kırmızı: sıradaki, sönük: kilitli).
 */
const researchState = (game: Game, id: ResearchId) => {
  const reason = researchReason(game, id)
  return game.research.includes(id) ? 'done' : game.study?.id === id ? 'active' : reason && /gerekli|Önce/.test(reason) && !/devam eden/.test(reason) ? 'locked' : 'open'
}
const clockMin = (m: number) => { const h = Math.floor(m / 60), d = Math.floor(h / 24); return d ? `${d} g ${h % 24} sa` : h ? `${h} sa ${Math.round(m % 60)} dk` : `${Math.max(1, Math.round(m))} dk` }
export function ResearchPanel({ game, onResearch }: { game: Game; onResearch: (id: ResearchId) => void }) {
  const firstOpen = (b: ResearchBranch) => RESEARCH_IDS.find(id => RESEARCH[id].branch === b && !game.research.includes(id))
  const [branch, setBranch] = useState<ResearchBranch>(() => RESEARCH_BRANCHES.find(b => firstOpen(b.key))?.key ?? 'ekonomi')
  const [picked, setPicked] = useState<ResearchId | null>(null)
  const ids = RESEARCH_IDS.filter(id => RESEARCH[id].branch === branch)
  const sel = picked && RESEARCH[picked].branch === branch ? picked : firstOpen(branch) ?? ids[0]
  const rate = rates(game).knowledge
  const r = RESEARCH[sel], reason = researchReason(game, sel), state = researchState(game, sel)
  const short = Math.max(0, r.cost - game.resources.knowledge)
  return <div className="research-panel rs">
    <div className="rs-stats">
      <span><Users className="size-4" /><b>{scientistCount(game)}</b><small>âlim</small></span>
      <span><IlimArt className="rs-lamp" /><b>{Math.floor(game.resources.knowledge).toLocaleString('tr-TR')}</b><small>ilim</small></span>
      <span><Clock3 className="size-4" /><b>+{(rate * 60).toFixed(1)}</b><small>saatlik</small></span>
      <span><AkceArt className="rs-lamp" /><b>−{(scientistUpkeepPerMinute(game) * 60).toFixed(0)}</b><small>akçe/saat</small></span>
    </div>
    {game.study && <JobProgress job={game.study} now={game.updatedAt} />}
    <div className="world-tabs rs-tabs" role="group" aria-label="Araştırma dalları">
      {RESEARCH_BRANCHES.map(b => {
        const all = RESEARCH_IDS.filter(id => RESEARCH[id].branch === b.key)
        return <button type="button" key={b.key} aria-pressed={branch === b.key} onClick={() => { setBranch(b.key); setPicked(null) }}>
          <span>{b.title}</span><small className="rs-count">{all.filter(id => game.research.includes(id)).length}/{all.length}</small></button>
      })}
    </div>
    <article className={`rs-detail is-${state}`}>
      <div className="rs-detail-top"><ResearchEmblem id={sel} size={72} state={state} />
        <span><span className="eyebrow">{RESEARCH_BRANCHES.find(b => b.key === branch)!.title.toLocaleUpperCase('tr')} · {ids.indexOf(sel) + 1}. ARAŞTIRMA</span><h3>{r.name}</h3></span></div>
      <p className="rs-effect"><b>Etkisi:</b> {r.description}</p>
      <ul className="rs-needs">
        {r.needs && <li className={game.research.includes(r.needs) ? 'is-ok' : 'is-no'}>{game.research.includes(r.needs) ? <Check className="size-3" /> : <LockKeyhole className="size-3" />}{RESEARCH[r.needs].name}</li>}
        <li className={game.buildings.medrese >= r.required ? 'is-ok' : 'is-no'}>{game.buildings.medrese >= r.required ? <Check className="size-3" /> : <LockKeyhole className="size-3" />}Medrese {r.required}. seviye</li>
      </ul>
      <div className="rs-cost">
        <span className={short > 0 && state !== 'done' ? 'is-short' : undefined}><IlimArt className="rs-lamp" />{r.cost.toLocaleString('tr-TR')} ilim</span>
        <span><Clock3 className="size-4" />{r.duration} sn</span>
        {state !== 'done' && short > 0 && <span className="rs-when">{rate > 0 ? `Yeterli ilim ~${clockMin(short / rate)} sonra` : 'İlim üretimi yok: Medrese\'ye âlim ata'}</span>}
      </div>
      {state === 'done' ? <p className="report-win"><Check className="size-4" /> Keşfedildi</p>
        : <Button disabled={!!reason} onClick={() => onResearch(sel)}><BookOpen data-icon="inline-start" />{state === 'active' ? 'Sürüyor' : 'Araştır'}</Button>}
      {reason && state !== 'done' && state !== 'active' && <p className="fine-print">{reason}</p>}
    </article>
    <ol className="rs-list">{ids.map((id, i) => {
      const st = researchState(game, id)
      return <li key={id}><button type="button" aria-pressed={id === sel} className={`is-${st}`} onClick={() => setPicked(id)}>
        <span className="rs-num">{i + 1}.</span><span className="rs-name">{RESEARCH[id].name}</span><IlimArt className={`rs-bulb is-${st}`} aria-label={st === 'done' ? 'tamam' : st === 'locked' ? 'kilitli' : st === 'active' ? 'sürüyor' : 'açık'} />
      </button></li>
    })}</ol>
  </div>
}
export function JournalPanel({ game }: { game: Game }) {
  return <div className="journal-panel"><span className="eyebrow">ŞEHRİNİN HİKÂYESİ</span>{game.log.map((entry, index) => <div className="journal-entry" key={`${entry.time}-${index}`}><span className="journal-dot" /><div><p>{entry.text}</p><time>{new Date(entry.time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} · {new Date(entry.time).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</time></div></div>)}<Hint>Tek oyunculu prototip. Buradaki tüm gelişmeler kendi şehrine aittir; gerçek oyuncu etkinliği gösterilmez.</Hint></div>
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
const PEOPLE_WORK: Record<WorkerId, { figure: Figure; res: Resource; unit: string; label: string }> = {
  kereste: { figure: 'oduncu', res: 'wood', unit: 'kereste', label: 'Oduncu' }, tas: { figure: 'tasci', res: 'stone', unit: 'taş', label: 'Taşçı' },
  medrese: { figure: 'alim', res: 'knowledge', unit: 'ilim', label: 'Âlim' }, carsi: { figure: 'esnaf', res: 'gold', unit: 'akçe', label: 'Esnaf' },
}
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
      const w = PEOPLE_WORK[id]
      const Icon = resourceIcons[w.res]
      return <article className="people-row" key={id}>
        <div className="people-row-top"><strong>{BUILDINGS[id].name}</strong></div>
        <WorkforceSlider label={w.label} figure={w.figure} value={value} cap={capacity} idle={idle}
          preview={n => { const v = rates({ ...game, workers: { ...game.workers, [id]: n } })[w.res]; return { amount: v, icon: <Icon className="workforce-icon" />, text: <><b>{w.res === 'knowledge' ? v.toFixed(1) : Math.round(v)}</b> {w.unit}/dk</> } }}
          onCommit={n => onAssign(id, n)} />
      </article>
    })}
    <Hint>Her yapı seviyesi {WORKERS_PER_LEVEL} işçi alır. Nüfus, barınma ve huzurdan hangisi küçükse o tavana zamanla büyür. Boşta kalan halk üretim yapmaz; akçe ise halkın kendisinden gelir ve işçi istemez.</Hint>
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
  game, empire, onBuilding, onSelectCity, onColonize, onCargo, onViewIsland, mapFirst = false, run,
}: {
  run?: Run
  game: Game
  empire: Empire
  onBuilding: (id: BuildingId) => void
  onSelectCity: (cityId: string) => void
  onColonize: (islandId: IslandId) => void
  onCargo: (cityId: string, resource: Cargo, amount: number) => void
  onViewIsland: (islandId: IslandId) => void
  /** Alt menüdeki Harita: dünya haritası en üstte, şehir kartı gizli. */
  mapFirst?: boolean
}) {
  const current = activeCity(empire)
  const [targetCity, setTargetCity] = useState('')
  const [cargoResource, setCargoResource] = useState<Cargo>('wood')
  const [cargoAmount, setCargoAmount] = useState('100')
  const activeShipment = empire.shipments.find(shipment => shipment.from === current.id)
  const capital = capitalCity(empire).game
  const isCapital = current.id === capitalId(empire)
  const [confirm, setConfirm] = useState<null | 'move' | 'abandon'>(null)
  const built = BUILDING_IDS.filter(id => game.buildings[id] > 0)
  const production = rates(game)
  const cityCard = <>
    <article className="city-card">
      <div className="city-card-top">
        <span className="city-emblem"><Landmark aria-hidden="true" /></span>
        <span><span className="eyebrow">{isCapital ? 'BAŞKENT' : 'KOLONİ'}</span>
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
      <div className="batch-row">
        <Button size="sm" variant="outline" onClick={() => onBuilding('divan')}>Divanhaneye git<ChevronRight data-icon="inline-end" /></Button>
        {!isCapital && run && <Button size="sm" variant="outline" onClick={() => setConfirm(confirm === 'move' ? null : 'move')}><Crown data-icon="inline-start" />Başkenti buraya taşı</Button>}
        {!isCapital && run && <Button size="sm" variant="ghost" onClick={() => setConfirm(confirm === 'abandon' ? null : 'abandon')}><Flag data-icon="inline-start" />Şehri terk et</Button>}
      </div>
      {confirm && run && <section className="demolish-sheet" role="alertdialog">
        {confirm === 'move'
          ? <><strong><Crown className="size-4" /> {current.name} başkent olsun mu?</strong>
            <p>{capitalCity(empire).name} şehrindeki Saray yıkılır; burada Valilik kalkar ve 1. seviye Saray kurulur. Başkent günde bir kez taşınabilir.</p></>
          : <><strong><Flag className="size-4" /> {current.name} terk edilsin mi?</strong>
            <p>Şehir, binaları, ambarı ve buradaki ordu kaybolur. Ticaret gemileri ortak filoda kalır. Bu geri alınamaz.</p></>}
        <div className="batch-row">
          <Button size="sm" variant="destructive" onClick={() => { const c = confirm; setConfirm(null); run(c === 'move' ? (e, t) => moveCapital(e, current.id, t) : (e, t) => abandonCity(e, current.id, t), c === 'move' ? 'Saray taşındı; yeni başkent ilan edildi.' : 'Şehir terk edildi.') }}>{confirm === 'move' ? 'Başkenti taşı' : 'Terk et'}</Button>
          <Button size="sm" variant="outline" onClick={() => setConfirm(null)}>Vazgeç</Button>
        </div>
      </section>}
    </article>
  </>
  const cityList = <>
    <section className="empire-section">
      <h3>Şehirlerin · {empire.cities.length}/{MAX_CITIES}</h3>
      <div className="empire-city-list">
        {empire.cities.map(city => <button key={city.id} className="empire-city-button"
          aria-current={city.id === current.id ? 'true' : undefined}
          onClick={() => onSelectCity(city.id)}>
          <span><strong>{city.name}</strong><small>{ISLANDS.find(i => i.id === city.islandId)?.name} · Divanhane {city.game.buildings.divan}</small></span>
          <span>{city.id === current.id ? 'Şu an' : 'Git ›'}</span>
        </button>)}
      </div>
    </section>

  </>
  const worldMap = <>
    <section className="empire-section">
      <h3>Dünya haritası · {ISLANDS.length} ada</h3>
      <Hint>Her adada tek bir lüks kaynak yatağı bulunur: şehir yalnızca kendi adasının kaynağını madenden çıkarır. Diğerlerini koloni kurarak, nakliyeyle ya da Çarşı'daki tüccardan edinirsin. Uzak adalara yolculuk uzun sürer.</Hint>
      <WorldMap empire={empire} now={game.updatedAt} onSelectCity={onSelectCity} onColonize={onColonize} onViewIsland={onViewIsland}
        missing={capital.buildings.saray < colonyPalaceLevel(empire) ? `Saray ${colonyPalaceLevel(empire)}. seviye gerekli`
          : capital.buildings.liman < 1 || idleMerchants(empire) < 3 ? 'Başkentte liman ve limanda boş 3 ticaret gemisi gerekli' : null} />
      <p className="fine-print">Yeni koloni: {COLONY_COST.gold} akçe, {COLONY_COST.wood} kereste, {COLONY_COST.stone} taş. Saray seviyesi toplam koloni sayısını sınırlar; her şehir ayrı bina, üretim ve orduya sahiptir.</p>
    </section>

  </>
  return <div className="advisor-panel">
    {mapFirst ? <>{worldMap}{cityList}</> : <>{cityCard}{cityList}{worldMap}</>}
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
      <Hint>Nakliye için gönderici şehirde Ticaret Limanı ve nakliye gemisi gerekir. Yük yolculuk sırasında çıkar, varışta hedef şehrin ambarına iner; ambar doluysa gemi yükü bekletir.</Hint>
    </section>
  </div>
}

/** Savaş alanındaki yerler (Ikariam'ın savaş sırası). */
const ROLE_ORDER: UnitRole[] = ['front', 'flank', 'range', 'artillery', 'bomber', 'fighter', 'support', 'spy', 'transport']
const ROLE_NAMES: Record<UnitRole, string> = { front: 'ön cephe', flank: 'kanat', range: 'uzak menzil', artillery: 'kuşatma', bomber: 'hava', fighter: 'hava savunması', support: 'destek', spy: 'casus', transport: 'nakliye' }

/** Bir emirde eğitilebilecek parti büyüklükleri. */
/** Şu an eğitilebilecek en fazla adet (kaynak, halk, garnizon, lüks): ikili arama. */
function maxRecruit(game: Game, id: UnitId) {
  if (recruitReason(game, id, 1)) return 0
  let lo = 1, hi = 1
  while (hi < 5000 && !recruitReason(game, id, hi * 2)) hi *= 2
  hi = Math.min(5000, hi * 2)
  while (lo < hi) { const mid = Math.ceil((lo + hi) / 2); if (recruitReason(game, id, mid)) hi = mid - 1; else lo = mid }
  return lo
}

/**
 * ORDU danismani.
 *
 * Ekranin en ustunde nufus muhasebesi durur - cunku bu oyunda asker almanin
 * bedeli akce degil, VATANDAS. Oyuncu bir birligi egitmeden once kac kisinin
 * bosta oldugunu gormezse, uretiminin nicin dustugunu anlamaz.
 */
export function ArmyPanel({ game, onRecruit, onBuild, home }: { game: Game; onRecruit: (id: UnitId, count: number) => void; onBuild: (id: BuildingId) => void; home?: BuildingId }) {
  const [counts, setCounts] = useState<Partial<Record<UnitId, number>>>({})
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
    <p className="army-note"><AkceArt className="size-4" />Ordunun bakımı dakikada {Math.round(armyUpkeep(game) * 10) / 10} akçe · aynı anda {actionPoints(game)} görev (hamle puanı).</p>
    <p className="army-note"><TriangleAlert className="size-4" />Asker halktan çıkar. Eğitilen her vatandaş üretimden düşer; surlar ise asker istemez, taş ister ({wallDefense(game)} savunma).</p>
    <BattlefieldCard game={game} />
    <DrillQueue game={game} home={home} />
    {branches.map(branch => {
      const units = UNIT_IDS.filter(id => UNITS[id].branch === branch.key && (!home || UNITS[id].home === home)).sort((a, b) => ROLE_ORDER.indexOf(UNITS[a].role) - ROLE_ORDER.indexOf(UNITS[b].role))
      if (!units.length) return null
      const ready = units.some(id => game.buildings[UNITS[id].home] > 0)
      return <section className="army-branch" key={branch.key}>
        <div className="army-branch-top"><h3>{branch.title}</h3><span>{branch.key === 'deniz' ? `Deniz gücü ${sea.attack} / ${sea.defense}` : `Savunma ${land.defense}`}</span></div>
        {!ready && <button className="army-locked" onClick={() => onBuild(branch.home)}><LockKeyhole className="size-4" /><span><strong>{BUILDINGS[branch.home].name} gerekli</strong><small>{BUILDINGS[branch.home].description}</small></span><ChevronRight className="size-4" /></button>}
        {units.map(id => {
          const unit = UNITS[id]
          const max = maxRecruit(game, id)
          const batch = Math.max(1, Math.min(counts[id] ?? 1, Math.max(1, max)))
          const set = (n: number) => setCounts(c => ({ ...c, [id]: Math.max(1, Math.min(Math.max(1, max), Math.round(n) || 1)) }))
          const reason = recruitReason(game, id, batch)
          return <article className="unit-card" key={id}>
            <div className="unit-top">
              <span className="unit-portrait"><UnitFigure id={id} size={60} /></span>
              <span><strong>{unit.name} <em className="unit-role">{ROLE_NAMES[unit.role]}</em></strong><small>{unit.description}</small></span>
              <span className="unit-have">{game.army[id]}<small>elde</small></span>
            </div>
            {BATTLE_STATS[id] && ROLE_ROW_SET.has(unit.role) && <div className="unit-battle" aria-label="Savaş değerleri">
              {(BATTLE_STATS[id]!.melee > 0 || (!BATTLE_STATS[id]!.ranged && !BATTLE_STATS[id]!.air)) && <span title="Yakın dövüş saldırısı">⚔ {BATTLE_STATS[id]!.melee}</span>}
              {BATTLE_STATS[id]!.ranged > 0 && <span title={`Uzak saldırı · ${BATTLE_STATS[id]!.ammo} tur cephane`}>🏹 {BATTLE_STATS[id]!.ranged} ×{BATTLE_STATS[id]!.ammo}</span>}
              <span title="Zırh: her vuruştan düşer">🛡 {BATTLE_STATS[id]!.armor}</span>
              <span title={`Büyüklük: bir yuvaya ${Math.floor(SLOT_SIZE / BATTLE_STATS[id]!.size)} adet sığar`}>▣ {BATTLE_STATS[id]!.size}</span>
              {BATTLE_STATS[id]!.vsWall && <span title="Sura karşı çarpan">🧱 ×{BATTLE_STATS[id]!.vsWall}</span>}
              {BATTLE_STATS[id]!.air && <span title="Hava savunması: havadaki birliklere vuruş">🪶 {BATTLE_STATS[id]!.air}</span>}
              {BATTLE_STATS[id]!.evade && <span title="Vurulması zor: aldığı hasar azalır">🌊 ×{BATTLE_STATS[id]!.evade}</span>}
            </div>}
            <div className="unit-stats">
              <span title="Saldırı"><Swords className="size-3" />{unit.attack}</span>
              <span title="Savunma"><ShieldCheck className="size-3" />{unit.defense}</span>
              <span title="Aldığı vatandaş"><Users className="size-3" />{unit.pop}</span>
              <span title="Can puanı">❤ {unit.hp}</span>
              <span title="Bakım gideri (akçe/dk)"><AkceArt className="size-3" />{unit.upkeep}/dk</span>
              {unit.cargo > 0 && <span title="Taşıma"><Warehouse className="size-3" />{unit.cargo}</span>}
            </div>
            {max > 1 && <div className="unit-slider">
              <button type="button" aria-label="Bir" onClick={() => set(1)}><ChevronsLeft /></button>
              <input type="range" min={1} max={max} value={batch} aria-label={`${unit.name} sayısı`} style={{ ['--fill' as string]: `${((batch - 1) / Math.max(1, max - 1)) * 100}%` }} onChange={e => set(Number(e.target.value))} />
              <button type="button" aria-label="En fazla" onClick={() => set(max)}><ChevronsRight /></button>
              <input type="number" inputMode="numeric" min={1} max={max} value={batch} aria-label={`${unit.name} adedi`} onChange={e => set(Number(e.target.value))} />
              <small>en fazla {max}</small>
            </div>}
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

const ROLE_ROW_SET = new Set<UnitRole>(['front', 'flank', 'range', 'artillery', 'bomber', 'fighter', 'support'])
/** Şehrin savaş meydanı: Divanhane seviyesiyle büyür (Ikariam). */
/** Eğitim sırası: her yapının emirleri, yürüyenin ilerlemesi ve bekleyenlerin başlama anı. */
function DrillQueue({ game, home }: { game: Game; home?: BuildingId }) {
  const jobs = game.drills.filter(j => !home || UNITS[j.id as UnitId].home === home)
  if (!jobs.length) return null
  const now = game.updatedAt
  const clock = (ms: number) => { const t = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}` }
  return <section className="drill-queue" aria-label="Eğitim sırası">
    <span className="eyebrow">EĞİTİM SIRASI</span>
    {jobs.map((j, i) => {
      const unit = UNITS[j.id as UnitId]
      const running = j.start <= now
      return <div key={`${j.id}-${j.start}-${i}`} className={`drill-job${running ? ' is-running' : ''}`}>
        <UnitFigure id={j.id as UnitId} size={30} bare />
        <span><strong>{j.count} {unit.name}</strong><small>{BUILDINGS[unit.home].name} · {running ? `bitiş ${clock(j.end - now)}` : `sırada · ${clock(j.start - now)} sonra başlar`}</small></span>
        {running && <span className="drill-bar"><i style={{ width: `${Math.min(100, (100 * (now - j.start)) / (j.end - j.start))}%` }} /></span>}
      </div>
    })}
    <Hint>Kışla ve Tersane aynı anda eğitir; her birine en fazla {DRILL_QUEUE_LIMIT} emir sıralanır. Emir verildiği anda vatandaşlar sıraya ayrılır.</Hint>
  </section>
}

function BattlefieldCard({ game }: { game: Game }) {
  const level = game.buildings.divan
  const f = fieldSize(level)
  const next = level < 5 ? 5 : level < 10 ? 10 : level < 17 ? 17 : null
  const rows: Array<[string, number]> = [['Ön cephe', f.front], ['Kanatlar', f.flank], ['Uzak menzil', f.range], ['Kuşatma', f.artillery], ['Hava', f.air], ['Hava savunması', f.fighter]]
  const garrison = (['kara', 'deniz'] as const).map(b => ({ b, used: garrisonUsed(game, b), max: garrisonLimit(game, b) }))
  return <article className="bf-card">
    <span className="eyebrow">SAVAŞ MEYDANI · {f.name.toUpperCase()}</span>
    <div className="bf-card-rows">{rows.map(([n, k]) => <span key={n}><strong>{k}</strong><small>{n}</small></span>)}</div>
    <Hint>Her yuvaya bir tür birlik ve {SLOT_SIZE} büyüklük sığar; fazlası yedekte bekler ve düşenlerin yerini alır. Ön cephe boşalırsa kanat ve nişancılar öne çıkar. Nişancıların cephanesi tükenir; kanatlar düşmanın arkasına dalar; kuşatma sura vurur; bombardıman surun üstünden vurur ve ona yalnızca hava savunması yetişir. Savaş dakikada bir tur, bir taraf dağılana ya da kaçana kadar sürer: turlar arasında takviye katılır, saldıran geri çekilebilir.{next ? ` Divanhane ${next}. seviyede meydan büyür.` : ''} Deniz savaşları kendi meydanında yapılır ({fieldSize(Math.max(game.buildings.liman, game.buildings.tersane), true).name}: kanat yok, ön hat {fieldSize(Math.max(game.buildings.liman, game.buildings.tersane), true).front} yuva); Liman ve Tersane büyüdükçe genişler. Garnizon sınırı birliklerin halk karşılığıdır (seferdekiler dahil; casus ve nakliye hariç). Kara sınırını Divanhane ve Surlar, deniz sınırını Tersane yükseltir.</Hint>
    <div className="bf-garrison">{garrison.map(({ b, used, max }) => <div key={b} className={used >= max && max > 0 ? 'is-full' : ''}>
      <span>{b === 'kara' ? 'Kara garnizonu' : 'Deniz garnizonu'}</span>
      <span className="bf-garrison-bar"><i style={{ width: `${max ? Math.min(100, (100 * used) / max) : 0}%` }} /></span>
      <strong>{used} / {max}</strong>
    </div>)}</div>
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
      <Hint>Ticaret Limanı kapasiteyi, nakliye gemileri taşımayı verir. Karşı taraf — başka oyuncular — bu prototipte yok; sayılar hazır, ticaret yolu açıldığında bağlanacak.</Hint>
    </article>
    <Hint>Burada gerçek oyuncu, ittifak ya da mesaj gösterilmez. Uydurma bir liste koymaktansa boş bırakmak dürüst olanı.</Hint>
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
      <WorkforceSlider label="Madenci" figure="madenci" value={game.mine.miners} cap={cap} idle={idleWorkers(game)}
        preview={n => { const v = luxuryProduction({ ...game, mine: { ...game.mine, miners: n } })[spec]; return { amount: v, icon: <SpecIcon className="workforce-icon" />, text: <><b>{v.toFixed(1)}</b> {LUXURY_NAMES[spec].toLocaleLowerCase('tr')}/dk</> } }}
        onCommit={onMiners} note={`İşçi başına dakikada 3 ${LUXURY_NAMES[spec].toLocaleLowerCase('tr')}. Üretim yapılarındaki işçiler buraya kendiliğinden geçmez.`} />
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
