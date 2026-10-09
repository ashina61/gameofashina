'use client'
import { IlimArt, YolsuzlukArt, KumSaatiArt } from './resource-art'
import { StoragePanel } from './storage-panel'
import { CostPanel } from './cost-panel'
import { COST_WORKSHOPS, isCostWorkshop } from '@/lib/game/cost-register'
import { ProductionPanel, PRODUCTION, isProduction } from './production-panel'
import { Term } from './term'
import { flyGoods } from '@/lib/fx'

/**
 * BİNA SAYFASI — Ikariam'daki bina görünümünün mobil karşılığı.
 *
 * Ikariam'da bir binaya basınca ekranın ortasını o binanın sayfası kaplar:
 * üstte adı, solda görseli ve "Genişlet" kutusu (gereken kaynaklar, süre,
 * yeşil yükseltme oku), ortada binanın kendi işini yapan kutular (Akademi'de
 * bilim adamı kaydırıcısı, Surda savunma tablosu, Ambarda korunan mal
 * tablosu...). Mobilde aynı sıra alt alta dizilir; kutular parşömen gövdeli,
 * kahverengi başlık şeritlidir.
 */
import { Hint } from './hint'
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowLeft, ArrowUp, LockKeyhole, FlipHorizontal2, RotateCw, Move, ChevronRight, Plus, Trash2, X } from './ui-art'
import { GameButton } from './game-button'
import { CostTokens } from './stat-kit'
import { BottomSheet } from './bottom-sheet'
import { asset, buildingImage } from '@/lib/asset'
import {
  BUILDINGS, BUILDING_EFFECTS, LUXURY_IDS, LUXURY_NAMES, MAX_LEVEL, RESEARCH, RESOURCE_IDS, RESOURCE_NAMES,
  actionPoints, activeJob, armyUpkeep, buildReason, contentment, corruption, cost, duration,
  growthRate, housing, idleWorkers, loadingSpeed, luxuryCost, maxPopulation, population, rates,
  scientistUpkeepPerMinute, soldiers, takesPlot, tavernLevel, tradeCapacity, travelFactor, wallDefense,
  wineServed, workerCapacity, type BuildingId, type Command, type Game, type Luxury, type Resource, type UnitId, type WorkerId, formatRate,
} from '@/lib/game/engine'
import { activeCity, type Empire } from '@/lib/game/empire'
import { cityGuards, cityWallHp, safeStock } from '@/lib/game/expeditions'
import { culturalTreaties } from '@/lib/game/rivals'
import { luxuryIcons, resourceIcons, JobProgress } from './game-widgets'
import { ResearchEmblem } from './research-art'
import { PersonArt } from './workforce'
import type { ResearchId } from '@/lib/game/engine'
import { ArmyPanel, BuildingEffects } from './game-panels'
import { DemolishConfirm, type Run } from './world-panels'
import { UnitFigure } from './unit-art'
import { DivanOverview } from './divan-overview'
import { buyMerchantShip } from '@/lib/game/empire'
import { idleMerchants, merchantShipPrice, shipCargo, totalMerchants } from '@/lib/game/expeditions'
import { WorkforceSlider, type Figure } from './workforce'
import { t } from '@/lib/i18n/tr'
import { RoyalManagement } from './royal-management'
import { HousingPanel } from './housing-panel'
import { BathhousePanel } from './bathhouse-panel'
import { HuzurArt, KahveArt, NufusArt } from './resource-art'

const num = (n: number) => Math.floor(n).toLocaleString('tr-TR')
const RES_ICON = resourceIcons
const time = (s: number) => s >= 3600 ? `${Math.floor(s / 3600)} sa ${Math.floor(s / 60) % 60} dk` : s >= 60 ? `${Math.floor(s / 60)} dk ${s % 60} sn` : `${s} sn`

/** Ikariam'ın içerik kutusu: kahverengi başlık şeridi + parşömen gövde. */
export function Box({ title, children, className }: { title: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`bp-box${className ? ` ${className}` : ''}`}><h2 className="bp-box-title">{title}</h2><div className="bp-box-body">{children}</div></section>
}
/** İki ya da üç sütunlu, satırları çizgili tablo (Ikariam table01). */
function Table({ head, rows }: { head?: ReactNode[]; rows: ReactNode[][] }) {
  return <table className="bp-table">
    {head && <thead><tr>{head.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>}
    <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
  </table>
}
function ResIcon({ id }: { id: Resource | Luxury }) {
  if ((LUXURY_IDS as readonly string[]).includes(id)) { const Icon = luxuryIcons[id as Luxury]; return <Icon className="bp-res-icon bp-lux" aria-hidden="true" /> }
  const Icon = RES_ICON[id as Resource]
  return <Icon className={`bp-res-icon bp-res-${id}`} aria-hidden="true" />
}
const stock = (g: Game, id: Resource | Luxury) => (LUXURY_IDS as readonly string[]).includes(id) ? g.luxury[id as Luxury] : g.resources[id as Resource]
const name = (id: Resource | Luxury) => (LUXURY_IDS as readonly string[]).includes(id) ? LUXURY_NAMES[id as Luxury] : RESOURCE_NAMES[id as Resource]

/**
 * YÜKSELTME DOKU (V2 Faz 2.1): sayfanın altında sabit, başparmak bölgesinde.
 * Üstte maliyet jetonları (eksik olan kırmızı) ve süre, altında Yükselt.
 * İnşaat sürüyorsa ilerleme çubuğu; en yüksek seviyede kısa not.
 */
export function UpgradeDock({ game, id, onBuild }: { game: Game; id: BuildingId; onBuild: () => void }) {
  const level = game.buildings[id], max = MAX_LEVEL[id]
  const active = activeJob(game)?.id === id ? activeJob(game) : null
  const queued = game.queue.findIndex(job => job.id === id)
  const reason = buildReason(game, id)
  if (level >= max) return <div className="bp-dock is-max"><p className="bp-note">En yüksek seviyeye ulaşıldı.</p></div>
  if (active) return <div className="bp-dock"><JobProgress job={active} now={game.updatedAt} /></div>
  const c = cost(game, id), lux = luxuryCost(game, id)
  const needs: [Resource | Luxury, number][] = [
    ...RESOURCE_IDS.filter(r => c[r] > 0).map(r => [r, c[r]] as [Resource, number]),
    ...LUXURY_IDS.filter(r => (lux[r] ?? 0) > 0).map(r => [r, lux[r]!] as [Luxury, number]),
  ]
  const art = BUILDINGS[id].art
  return <div className={`bp-dock${art ? ' has-thumb' : ''}`} aria-label={level ? `Genişlet · Sv. ${level} → ${level + 1}` : 'İnşa et'}>
    {art && <img className="bp-dock-thumb" src={buildingImage(id, level + 1)} alt="" loading="lazy" decoding="async" />}
    {art && <span className="bp-dock-label">{level ? 'Yükseltme gereksinimleri' : 'İnşa gereksinimleri'}</span>}
    <CostTokens items={needs.map(([r, n]) => ({ key: r, icon: <ResIcon id={r} />, name: name(r), need: n, have: stock(game, r) }))} />
    {queued > 0 && <p className="bp-note"><KumSaatiArt className="size-4" /> İnşaat sırasında {queued + 1}. sırada.</p>}
    {reason && queued < 0 && <p className="bp-warn"><LockKeyhole className="size-4" /> {reason}</p>}
    <button type="button" className="bp-upgrade-button" disabled={!!reason}
      onClick={e => { flyGoods(e.currentTarget, Object.fromEntries(needs), true); onBuild() }}>
      <span className="bp-up-arrow"><ArrowUp aria-hidden="true" /></span>{level ? `Yükselt · Sv. ${level + 1}` : 'İnşa et'}
      <span className="bp-up-time"><KumSaatiArt aria-hidden="true" />{time(duration(game, id))}</span>
    </button>
  </div>
}

/** Bir üretim yapısının işçi kaydırıcısı (Ikariam'daki "işçi" kutusu). */
const WORK: Record<WorkerId, { figure: Figure; res: Resource; unit: string }> = {
  kereste: { figure: 'oduncu', res: 'wood', unit: 'kereste' },
  medrese: { figure: 'alim', res: 'knowledge', unit: 'ilim' }, carsi: { figure: 'esnaf', res: 'gold', unit: 'akçe (net)' },
}
function Workers({ game, id, unit, perWorker, onCommand }: { game: Game; id: WorkerId; unit: string; perWorker: string; onCommand: (c: Command) => void }) {
  const w = WORK[id]
  const Icon = RES_ICON[w.res]
  const at = (n: number) => rates({ ...game, workers: { ...game.workers, [id]: n } })[w.res]
  return <WorkforceSlider label={unit} figure={w.figure} value={game.workers[id]} cap={workerCapacity(game, id)} idle={idleWorkers(game)}
    preview={n => { const v = at(n); return { amount: v, icon: <Icon className="workforce-icon" />, text: <><b>{w.res === 'knowledge' ? formatRate(v) : num(v)}</b> {w.unit}/dk</> } }}
    onCommit={n => onCommand({ type: 'workers', id, value: n })} note={perWorker} />
}

/** TİCARET FİLOSU (Ikariam gibi): gemiler satın alınır, bütün şehirler ortak kullanır. */
function MerchantFleet({ empire, game, run }: { empire: Empire; game: Game; run: Run }) {
  const total = totalMerchants(empire), idle = idleMerchants(empire), price = merchantShipPrice(total)
  return <Box title={`Ticaret filosu · ${total} gemi`}>
    <div className="fleet-row">
      <span className="fleet-ship"><UnitFigure id="nakliye" size={64} /></span>
      <Table rows={[
        ['Limanda boş', `${idle} gemi`],
        ['Seferde ya da yükte', `${total - idle} gemi`],
        ['Gemi başına yük', `${num(shipCargo(game))} mal`],
      ]} />
    </div>
    <button type="button" className="bp-upgrade-button" disabled={game.resources.gold < price}
      onClick={() => run((e, t) => buyMerchantShip(e, t), 'Yeni ticaret gemisi limana katıldı.')}>
      <span className="bp-up-arrow"><Plus aria-hidden="true" /></span>Gemi satın al · {num(price)} akçe
    </button>
    <p className="bp-note">Gemiler bütün şehirlerin ortak filosudur: nakliye, deniz aşırı sefer ve koloni için limanda boş olan gemiler kullanılır. Her yeni gemi bir öncekinden pahalıdır.</p>
  </Box>
}

/** Binaya özel kutular. */
function BuildingView({ game, empire, id, onCommand, onRecruit, onNav, onBuildingNav, run, section }: {
  section?: 'overview' | 'people' | 'treasury'
  game: Game; empire: Empire | undefined; id: BuildingId; onCommand: (c: Command) => void; run?: Run
  onRecruit: (id: UnitId, count: number) => void; onNav: (panel: 'research' | 'diplomacy' | 'alliance' | 'island' | 'forest' | 'people' | 'cities') => void
  onBuildingNav: (id: BuildingId) => void
}) {
  if (isCostWorkshop(id)) return <CostPanel game={game} id={id} onBuilding={onBuildingNav} />
  if (isProduction(id)) return <ProductionPanel game={game} id={id} onCommand={onCommand} onForest={() => onNav('forest')} onIsland={() => onNav('island')} onStorage={() => onBuildingNav('ambar')} onCoffeehouse={() => onBuildingNav('kahvehane')} />
  const r = rates(game)
  switch (id) {
    case 'divan': {
      const content = contentment(game)
      const parts: [string, number][] = [
        ['Taban huzur', 120], ['Hamam', game.buildings.hamam * 60],
        ['Kahvehane', game.buildings.kahvehane * BUILDING_EFFECTS.kahvehaneContentment + (wineServed(game) ? tavernLevel(game) * BUILDING_EFFECTS.kahvehaneWineBonus * (game.research.includes('mutfak') ? 1.2 : 1) : 0)],
        ['Cami', game.buildings.cami * BUILDING_EFFECTS.camiContentment],
        ['Müze ve kültür', game.buildings.muze * BUILDING_EFFECTS.muzeContentment * (game.research.includes('kultur') ? 1.5 : 1) + (game.culture ?? 0) * 50],
      ]
      const other = content - parts.reduce((s, [, n]) => s + n, 0)
      const gross = r.gold + scientistUpkeepPerMinute(game) + armyUpkeep(game)
      return <>
        {(!section || section === 'overview') && <DivanOverview game={game} empire={empire} run={run} />}
        {(!section || section === 'people') && <>
        <Box title="Şehrin halkı">
          <Table rows={[
            ['Nüfus', <strong key="p">{num(population(game))} / {num(maxPopulation(game))}</strong>],
            ['Büyüme', growthRate(game) > 0 ? `+${formatRate(growthRate(game))} kişi/dk` : 'Tavanda'],
            ['Barınma (Konaklar)', num(housing(game))],
            ['Boşta halk', num(idleWorkers(game))],
            ['Asker', num(soldiers(game))],
          ]} />
        </Box>
        <Box title={`Huzur · ${num(content)}`}>
          <Table rows={[...parts.filter(([, n]) => n).map(([l, n]) => [l, `+${num(n)}`]), ...(other ? [['Araştırma, mucize, yönetim', `${other > 0 ? '+' : ''}${num(other)}`]] : [])]} />
          <p className="bp-note">Nüfus, barınma ile huzurdan küçük olanına doğru büyür.</p>
        </Box>
        </>}
        {(!section || section === 'treasury') && <Box title="Hazine">
          <Table rows={[
            [<Term key="t" label="Vergi ve esnaf" />, `+${num(gross)} akçe/dk`],
            [<Term key="t" label="Âlim maaşları" />, `${formatRate(-scientistUpkeepPerMinute(game))} akçe/dk`],
            [<Term key="t" label="Ordu bakımı" />, `${formatRate(-armyUpkeep(game))} akçe/dk`],
            [<strong key="n"><Term label="Net gelir" /></strong>, <strong key="v">{num(r.gold)} akçe/dk</strong>],
            [<span key="t" className="painted-term"><YolsuzlukArt width={20} height={20} /><Term label="Yolsuzluk" /></span>, `%${Math.round(corruption(game) * 100)}`],
            [<Term key="t" label="Sefer hakkı" />, `aynı anda ${actionPoints(game)} sefer`],
          ]} />
        </Box>}
      </>
    }
    case 'medrese': {
      const study = game.study
      return <>
        <Box title="Âlimler">
          <div className="academy-research-link"><GameButton size="sm" onClick={() => onNav('research')}>Araştırmalara git<ChevronRight data-icon="inline-end" /></GameButton></div>
          <Workers game={game} id="medrese" unit="Âlim" perWorker="Her âlim saatte 9 akçe maaş alır." onCommand={onCommand} />
          <details className="academy-ledger"><summary>İlim üretimi ve maaşlar</summary><Table rows={[
            ['İlim üretimi', <strong key="k">{formatRate(r.knowledge)} /dk</strong>],
            ['Âlim maaşı', `${num(scientistUpkeepPerMinute(game) * 60)} akçe/saat`],
            ['Tamamlanan araştırma', `${game.research.length}`],
          ]} /></details>
        </Box>
        <Box title="Araştırma">
          {study ? <div className="bp-study">
            <ResearchEmblem id={study.id as ResearchId} size={76} state="active" />
            <div><span className="eyebrow">ŞU AN ARAŞTIRILIYOR</span><strong>{RESEARCH[study.id as ResearchId].name}</strong>
              <JobProgress job={study} now={game.updatedAt} /></div>
          </div>
            : <div className="bp-study is-idle"><PersonArt kind="alim" size={52} /><p className="bp-note">Şu an araştırma yok. Âlimler yeni bir konu bekliyor.</p></div>}
        </Box>
      </>
    }
    case 'carsi': return <Box title="Esnaf"><Workers game={game} id="carsi" unit="Esnaf" perWorker="Esnaf çarşıda akçe kazandırır." onCommand={onCommand} />
      <p className="bp-note">Çarşı'daki tüccarla lüks mal alıp satmak için Ada paneline git.</p>
      <GameButton size="sm" variant="outline" onClick={() => onNav('island')}>Tüccara git<ChevronRight data-icon="inline-end" /></GameButton></Box>
    case 'surlar': return <Box title="Şehir savunması">
      <Table rows={[
        ['Sur seviyesi', `${game.buildings.surlar}`],
        ['Sur canı (savaşta)', <strong key="h">{num(cityWallHp(game))}</strong>],
        ['Asker gerektirmeyen savunma', num(wallDefense(game))],
        ['Sur muhafızı', `${cityGuards(game)} mızrakçı`],
        ['Yağmadan korunan mal', `${num(safeStock(game))} / tür`],
      ]} />
      <Hint>Saldırıda önce sur hasar emer: kuşatma birlikleri sura üç kat, diğerleri yarım vurur. Sur yıkılınca savunanın morali sarsılır. Sur her seviyede savunmaya 4 muhafız ekler.</Hint>
    </Box>
    case 'ambar': case 'depo': return <StoragePanel game={game} />
    case 'kisla': case 'tersane': case 'liman':
      return <>
        {id === 'liman' && <Box title="Liman">
          <Table rows={[
            ['Ticaret kapasitesi', num(tradeCapacity(game))],
            ['Yükleme hızı', `${num(loadingSpeed(game))} mal/dk`],
            ['Yolculuk süresi', `%${Math.round(travelFactor(game) * 100)}`],
          ]} />
          <GameButton size="sm" variant="outline" onClick={() => onNav('cities')}>Nakliye gönder<ChevronRight data-icon="inline-end" /></GameButton>
        </Box>}
        {id === 'liman' && empire && run && <MerchantFleet empire={empire} game={game} run={run} />}
        {id !== 'liman' && <Box title={id === 'tersane' ? 'Gemi yapımı' : 'Asker eğitimi'} className="bp-army">
          <ArmyPanel game={game} onRecruit={onRecruit} onBuild={onBuildingNav} home={id} />
        </Box>}
      </>
    case 'konut': return <HousingPanel game={game} onPeople={() => onNav('people')} onHamam={() => onBuildingNav('hamam')} />
    case 'hamam': return <BathhousePanel game={game} onPeople={() => onNav('people')} onHousing={() => onBuildingNav('konut')} />
    case 'kahvehane': return null // The live ikram controls arrive through TavernPanel children.
    case 'muze': return <Box title="Kültür">
      <Table rows={[['Müze huzuru', `+${num(game.buildings.muze * BUILDING_EFFECTS.muzeContentment * (game.research.includes('kultur') ? 1.5 : 1))}`],
        ['Kültür anlaşması (bu şehirde)', `${game.culture ?? 0} / ${game.buildings.muze}`], ['İmparatorluktaki anlaşma', `${empire ? culturalTreaties(empire) : 0}`]]} />
      <Hint>Her kültür anlaşması Müze seviyesi kadar şehirde +50 huzur verir. Anlaşmalar Dünya panelinden yapılır.</Hint>
      <GameButton size="sm" variant="outline" onClick={() => onNav('diplomacy')}>Anlaşma yap<ChevronRight data-icon="inline-end" /></GameButton>
    </Box>
    case 'saray': case 'valilik': return empire ? <Box title="İmparatorluk">
      <Table head={['Şehir', 'Divanhane', 'Yolsuzluk']} rows={empire.cities.map(c => [c.name, `${c.game.buildings.divan}`, `%${Math.round(corruption(c.game) * 100)}`])} />
      <p className="bp-note">Saray seviyesi kurabileceğin koloni sayısını belirler; kolonide Valilik yolsuzluğu siler.</p>
      <GameButton size="sm" variant="outline" onClick={() => onNav('cities')}>Şehirler ve atlas<ChevronRight data-icon="inline-end" /></GameButton>
    </Box> : null
    default: return null
  }
}

/**
 * Ikariam sayfa çerçevesi: üst şerit (geri, başlık, rozet), isteğe bağlı sahne
 * görseli ve parşömen kaydırma alanı. Bina sayfaları ve bütün danışman
 * panelleri (Kışla, Araştırma, Dünya...) bu çerçeveyi kullanır.
 */
export function IkaPage({ title, subtitle, badge, hero, onClose, children, label, sheet, footer, className, toolbar }: {
  title: string; subtitle?: string; badge?: ReactNode; hero?: string | null; onClose: () => void; children: ReactNode; label?: string
  /** Sayfanın altında sabit kalan alan (bina sayfasında Yükselt doku). */
  footer?: ReactNode
  toolbar?: ReactNode
  className?: string
  /** Haritada seçilen şey: tam sayfa yerine alt çekmece (harita arkada görünür). */
  sheet?: boolean
}) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [onClose])
  if (sheet) return <BottomSheet label={label ?? title} onClose={onClose}>
    <header className="bp-bar">
      <div className="bp-title"><h1>{title}</h1>{subtitle && <small>{subtitle}</small>}</div>
      {badge}
      <button type="button" className="bp-back" onClick={onClose} aria-label={t.action.close}><X /></button>
    </header>
    <div className="bp-scroll">{children}</div>
  </BottomSheet>
  return <div className={className ? `bp ${className}` : 'bp'} role="dialog" aria-modal="true" aria-label={label ?? title}>
    <header className="bp-bar">
      <button type="button" className="bp-back" onClick={onClose} aria-label={t.action.back}><ArrowLeft /></button>
      <div className="bp-title"><h1>{title}</h1>{subtitle && <small>{subtitle}</small>}</div>
      {badge}
      <button type="button" className="bp-back bp-close" onClick={onClose} aria-label={t.action.close}><X /></button>
    </header>
    {toolbar}
    <div className="bp-scroll">
      {hero !== undefined && <section className="bp-hero bp-hero-small">{hero ? <img src={hero} alt="" /> : null}</section>}
      {children}
    </div>
    {footer}
  </div>
}

export function BuildingPage({ game, empire, id, onClose, onBuild, onFlip, onMove, onCommand, onRecruit, onNav, onBuildingNav, run, children, toolbar }: {
  game: Game; empire: Empire | undefined; id: BuildingId; run?: Run
  onClose: () => void; onBuild: () => void; onFlip: () => void; onMove: () => void
  onCommand: (c: Command) => void; onRecruit: (id: UnitId, count: number) => void
  onNav: (panel: 'research' | 'diplomacy' | 'alliance' | 'island' | 'forest' | 'people' | 'cities') => void; onBuildingNav: (id: BuildingId) => void
  children?: ReactNode; toolbar?: ReactNode
}) {
  const b = BUILDINGS[id], level = game.buildings[id], max = MAX_LEVEL[id]
  const forecast = Array.from({ length: Math.min(4, max - level) }, (_, step) => {
    const projected: Game = { ...game, buildings: { ...game.buildings, [id]: level + step } }
    return { level: level + step + 1, price: cost(projected, id), seconds: duration(projected, id) }
  })
  const city = empire ? activeCity(empire).name : ''
  const [razing, setRazing] = useState(false)
  // ⓘ: açıklamanın tamamı ve "Nasıl işler?" kutuları yalnız istenince görünür.
  const help = false
  // Sekmeler: binanın kendi işi (Yapı) ve gelişim bilgisi (Gelişim).
  const [tab, setTab] = useState<'yapi' | 'gelisim'>('yapi')
  const workRef = useRef<HTMLDivElement>(null)
  const [hasWork, setHasWork] = useState(true)
  useLayoutEffect(() => { setHasWork(!!workRef.current?.childElementCount) }, [id, level, children])
  // Başka binaya geçince sayfa baştan: binanın kendi işi, açıklama kapalı.
  useEffect(() => { setTab('yapi'); setRazing(false) }, [id])
  const movable = level > 0 && takesPlot(id)
  const coastId = id === 'liman' || id === 'tersane' ? id : null
  const coast = coastId !== null
  const facing = coastId ? game.coastFacing[coastId] : undefined
  const facingLabel = facing === 'left' ? 'Sol' : facing === 'right' ? 'Sağ' : 'Düz'
  const nextFacing = facing === 'straight' ? 'right' : facing === 'right' ? 'left' : 'straight'
  const showTab = hasWork ? tab : 'gelisim'
  const production = isProduction(id) ? PRODUCTION[id] : null
  const workshop = isCostWorkshop(id) ? COST_WORKSHOPS[id] : null
  const royalWork = workshop || production || id === 'kisla' || id === 'medrese' || id === 'konut' || id === 'hamam' || id === 'kahvehane' || id === 'ambar' || id === 'depo'
  if (id === 'divan' || id === 'elcilik') return <IkaPage title={b.name} label={`${b.name} sayfası`} onClose={onClose}
    className={`bp-building bp-of-${id} bp-court bp-royal bp-management${help ? ' show-help' : ''}`}
    footer={<UpgradeDock game={game} id={id} onBuild={onBuild} />}>
    <RoyalManagement key={id} game={game} empire={empire} id={id} city={city} help={help} onNav={onNav}
      overview={<BuildingView game={game} empire={empire} id={id} section="overview" onCommand={onCommand} onRecruit={onRecruit} onNav={onNav} onBuildingNav={onBuildingNav} run={run} />}
      people={<BuildingView game={game} empire={empire} id={id} section="people" onCommand={onCommand} onRecruit={onRecruit} onNav={onNav} onBuildingNav={onBuildingNav} run={run} />}
      administration={<><BuildingView game={game} empire={empire} id="divan" section="treasury" onCommand={onCommand} onRecruit={onRecruit} onNav={onNav} onBuildingNav={onBuildingNav} run={run} />{children}</>}
      spies={<><ArmyPanel game={game} onRecruit={onRecruit} onBuild={onBuildingNav} home="elcilik" />{children}<GameButton variant="outline" onClick={() => onBuildingNav('siginak')}>Gizli Sığınak</GameButton></>}
      development={<><Box title="Seviye etkisi"><BuildingEffects game={game} id={id} level={level} max={max} /></Box>
        {forecast.length > 0 && <Box title="Sonraki seviyeler"><Table head={['Sv.', 'Maliyet', 'Süre']} rows={forecast.map(f => [`${f.level}`, <span key="c" className="bp-mini-costs">{RESOURCE_IDS.filter(r => f.price[r] > 0).map(r => <span key={r}><ResIcon id={r} />{num(f.price[r])}</span>)}</span>, time(f.seconds)])} /></Box>}
        {level > 0 && <div className="management-tools"><GameButton variant="outline" onClick={onFlip}>Yönünü çevir</GameButton>{id !== 'divan' && <><GameButton variant="outline" onClick={onMove}>Başka arsaya taşı</GameButton><GameButton variant="destructive" onClick={() => setRazing(v => !v)}>Yapıyı yık</GameButton></>}</div>}
        {razing && <DemolishConfirm game={game} id={id} onCommand={onCommand} onClose={() => setRazing(false)} />}</>} />
  </IkaPage>
  return <IkaPage toolbar={royalWork ? undefined : toolbar} title={b.name} subtitle={`${city} · ${b.category.toLocaleLowerCase('tr')}`} label={`${b.name} sayfası`} onClose={onClose}
    className={`bp-building bp-of-${id}${royalWork ? ' bp-royal' : ''}${production ? ' bp-production' : ''}${workshop ? ' bp-cost' : ''}${help ? ' show-help' : ''}`}
    footer={royalWork ? undefined : <UpgradeDock game={game} id={id} onBuild={onBuild} />}>
      {workshop && <figure className="academy-banner"><img src={asset(`/images/game/ui/cost/${id}.webp`)} alt={workshop.alt} /><figcaption>Seviye {level}</figcaption></figure>}
      {isProduction(id) && <figure className="academy-banner"><img src={asset(`/images/game/ui/production/${PRODUCTION[id].scene}.webp`)} alt={PRODUCTION[id].alt} /><figcaption>Seviye {level}</figcaption></figure>}
      {id === 'kisla' && <figure className="barracks-banner">
        <img src={asset('/images/game/ui/barracks/courtyard.webp')} alt="Osmanlı kışlasının sancaklı eğitim avlusu" />
        <figcaption>Seviye {level}</figcaption>
      </figure>}
      {(id === 'ambar' || id === 'depo') && <figure className="academy-banner"><img src={asset(`/images/game/ui/storage/${id === 'ambar' ? 'warehouse' : 'depot'}.webp`)} alt={id === 'ambar' ? 'Osmanlı ambarında sandıklar ve erzak' : 'Osmanlı deposunun yükleme avlusu'} /><figcaption>Seviye {level}</figcaption></figure>}
      {id === 'kahvehane' && <figure className="academy-banner"><img src={asset('/images/game/ui/coffeehouse/terrace.webp')} alt="Osmanlı kahvehanesinin Ege’ye bakan sohbet terası" /><figcaption>Seviye {level}</figcaption></figure>}
      {id === 'hamam' && <figure className="academy-banner"><img src={asset('/images/game/ui/bathhouse/court.webp')} alt="Osmanlı hamamının şadırvanlı dinlenme avlusu" /><figcaption>Seviye {level}</figcaption></figure>}
      {id === 'konut' && <figure className="academy-banner"><img src={asset('/images/game/ui/housing/neighborhood.webp')} alt="Osmanlı mahallesinde günlük yaşam" /><figcaption>Seviye {level}</figcaption></figure>}
      {id === 'medrese' && <figure className="academy-banner"><img src={asset('/images/game/ui/medrese/library.webp')} alt="Osmanlı medresesinde ilim meclisi" /><figcaption>Seviye {level}</figcaption></figure>}
      {razing && <DemolishConfirm game={game} id={id} onCommand={onCommand} onClose={() => setRazing(false)} />}

      {hasWork && <div className="bp-tabs" role="tablist" aria-label={`${b.name} bölümleri`}>
        <button type="button" role="tab" aria-selected={showTab === 'yapi'} onClick={() => setTab('yapi')}>{workshop && <img src={asset(`/images/game/icons/res-${workshop.resource === 'wood' ? 'kereste' : workshop.resource}.webp`)} alt="" width={32} height={32} />}{production && <img src={asset(`/images/game/icons/res-${production.resource === 'wood' ? 'kereste' : production.resource}.webp`)} alt="" width={32} height={32} />}{id === 'kisla' && <img className="barracks-tab-emblem" src={asset('/images/game/ui/barracks/army-medallion.webp')} alt="Yeniçeri börkü" width={32} height={32} />}{id === 'medrese' && <IlimArt className="size-6" />}{id === 'konut' && <NufusArt width={32} height={32} />}{id === 'hamam' && <HuzurArt width={32} height={32} />}{id === 'kahvehane' && <KahveArt width={32} height={32} />}{(id === 'ambar' || id === 'depo') && <img src={asset('/images/game/ui/storage/storage-icon.webp')} alt="" width={32} height={32} />}{workshop ? 'Tasarruf' : production ? 'Üretim' : id === 'ambar' || id === 'depo' ? 'Stoklar' : id === 'kisla' ? 'Kara ordusu' : id === 'medrese' ? 'İlim meclisi' : id === 'konut' ? 'Mahalle' : id === 'hamam' ? 'Halkın huzuru' : id === 'kahvehane' ? 'İkram' : b.name}</button>
        <button type="button" role="tab" aria-selected={showTab === 'gelisim'} onClick={() => setTab('gelisim')}>{royalWork && <img className="barracks-development-icon" src={asset('/images/game/ui/barracks/development-icon.webp')} alt="" width={32} height={32} />}Gelişim</button>
      </div>}
      <div ref={workRef} className="bp-tabpanel" hidden={showTab !== 'yapi'}>
        <BuildingView game={game} empire={empire} id={id} onCommand={onCommand} onRecruit={onRecruit} onNav={onNav} onBuildingNav={onBuildingNav} run={run} />
        {children}
      </div>
      <div className="bp-tabpanel" hidden={showTab !== 'gelisim'}>
      {royalWork && <UpgradeDock game={game} id={id} onBuild={onBuild} />}
      <Box title="Seviye etkisi"><BuildingEffects game={game} id={id} level={level} max={max} /></Box>
      {forecast.length > 0 && <Box title="Sonraki seviyeler">
        <Table head={['Sv.', 'Maliyet', 'Süre']} rows={forecast.map(f => [
          `${f.level}`,
          <span key="c" className="bp-mini-costs">{RESOURCE_IDS.filter(r => f.price[r] > 0).map(r => <span key={r}><ResIcon id={r} />{num(f.price[r])}</span>)}</span>,
          time(f.seconds),
        ])} />
      </Box>}
      <details className="building-description"><summary>{b.name} hakkında</summary><p>{b.description}</p></details>
      {level > 0 && <details className="building-operations"><summary>Yapı işlemleri</summary><div>
        {movable && b.art && coast && <GameButton variant="outline" onClick={() => coastId && onCommand({ type: 'face', id: coastId, facing: nextFacing })}><RotateCw />Yön: {facingLabel}</GameButton>}
        {movable && b.art && !coast && <GameButton variant="outline" onClick={onFlip}><FlipHorizontal2 />Yönünü çevir</GameButton>}
        {movable && <GameButton variant="outline" onClick={onMove}><Move />Başka arsaya taşı</GameButton>}
        <GameButton variant="destructive" onClick={() => setRazing(v => !v)}><Trash2 />Yapıyı yık</GameButton>
      </div></details>}
      </div>
  </IkaPage>
}
