'use client'

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
import type { ReactNode } from 'react'
import { ArrowLeft, Clock3, LockKeyhole, FlipHorizontal2, Move, Hammer, Users, BookOpen, ChevronRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { asset, buildingImage } from '@/lib/asset'
import {
  BUILDINGS, BUILDING_EFFECTS, LUXURY_IDS, LUXURY_NAMES, MAX_LEVEL, RESEARCH, RESOURCE_IDS, RESOURCE_NAMES, WORKERS_PER_LEVEL,
  actionPoints, activeJob, armyUpkeep, buildReason, capacity, cargoCapacity, contentment, corruption, cost, counterSpy, duration,
  forestProduction, growthRate, housing, idleWorkers, loadingSpeed, luxuryCost, luxuryProduction, maxPopulation, population, rates,
  scientistUpkeepPerMinute, soldiers, spyBonus, spyCapacity, takesPlot, tavernLevel, tradeCapacity, travelFactor, wallDefense,
  wineConsumption, wineServed, workerCapacity, type BuildingId, type Command, type Game, type Luxury, type Resource, type UnitId, type WorkerId,
} from '@/lib/game/engine'
import { activeCity, type Empire } from '@/lib/game/empire'
import { cityGuards, cityWallHp, safeStock } from '@/lib/game/expeditions'
import { culturalTreaties } from '@/lib/game/rivals'
import { luxuryIcons, JobProgress } from './game-widgets'
import { ArmyPanel, BuildingEffects } from './game-panels'
import { DemolishRow } from './world-panels'

const num = (n: number) => Math.floor(n).toLocaleString('tr-TR')
const RES_ICON: Record<Resource, string> = { gold: 'res-gold', wood: 'res-wood', stone: 'res-stone', knowledge: 'res-knowledge' }
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
  return <img className="bp-res-icon" src={asset(`/images/ui/${RES_ICON[id as Resource]}.webp`)} alt="" />
}
const stock = (g: Game, id: Resource | Luxury) => (LUXURY_IDS as readonly string[]).includes(id) ? g.luxury[id as Luxury] : g.resources[id as Resource]
const name = (id: Resource | Luxury) => (LUXURY_IDS as readonly string[]).includes(id) ? LUXURY_NAMES[id as Luxury] : RESOURCE_NAMES[id as Resource]

/** "Genişlet" kutusu: gereken kaynaklar (eksik olan kırmızı), süre, yükselt. */
function UpgradeBox({ game, id, onBuild }: { game: Game; id: BuildingId; onBuild: () => void }) {
  const level = game.buildings[id], max = MAX_LEVEL[id]
  const active = activeJob(game)?.id === id ? activeJob(game) : null
  const queued = game.queue.findIndex(job => job.id === id)
  const reason = buildReason(game, id)
  if (level >= max) return <Box title="Genişlet"><p className="bp-note">En yüksek seviyeye ulaşıldı.</p></Box>
  const c = cost(game, id), lux = luxuryCost(game, id)
  const needs: [Resource | Luxury, number][] = [
    ...RESOURCE_IDS.filter(r => c[r] > 0).map(r => [r, c[r]] as [Resource, number]),
    ...LUXURY_IDS.filter(r => (lux[r] ?? 0) > 0).map(r => [r, lux[r]!] as [Luxury, number]),
  ]
  return <Box title={level ? `Genişlet · Sv. ${level} → ${level + 1}` : 'İnşa et'} className="bp-upgrade">
    {active ? <JobProgress job={active} now={game.updatedAt} /> : <>
      <ul className="bp-costs">{needs.map(([r, n]) => {
        const short = stock(game, r) < n
        return <li key={r} className={short ? 'bp-short' : undefined} title={name(r)}>
          <ResIcon id={r} /><span className="sr-only">{name(r)}</span><strong>{num(n)}</strong>
          {short && <small>-{num(n - stock(game, r))}</small>}
        </li>
      })}
        <li className="bp-time"><Clock3 aria-hidden="true" /><strong>{time(duration(game, id))}</strong></li>
      </ul>
      {queued > 0 && <p className="bp-note"><Clock3 className="size-4" /> İnşaat sırasında {queued + 1}. sırada.</p>}
      {reason && queued < 0 && <p className="bp-warn"><LockKeyhole className="size-4" /> {reason}</p>}
      <button type="button" className="bp-upgrade-button" disabled={!!reason} onClick={onBuild}>
        <img src={asset('/images/ui/icon-up.webp')} alt="" />{level ? 'Yükselt' : 'İnşa et'}
      </button>
    </>}
  </Box>
}

/** Bir üretim yapısının işçi kaydırıcısı (Ikariam'daki "işçi" kutusu). */
function Workers({ game, id, unit, perWorker, onCommand }: { game: Game; id: WorkerId; unit: string; perWorker: string; onCommand: (c: Command) => void }) {
  const cap = workerCapacity(game, id), value = game.workers[id], idle = idleWorkers(game)
  return <div className="bp-workers">
    <div className="bp-workers-top"><Users className="size-4" /><span>{unit}</span><strong>{value} / {cap}</strong></div>
    <input type="range" min={0} max={cap} value={value} aria-label={`${unit} sayısı`} onChange={e => onCommand({ type: 'workers', id, value: Number(e.target.value) })} />
    <div className="bp-workers-foot">
      <Button size="sm" variant="outline" disabled={value <= 0} onClick={() => onCommand({ type: 'workers', id, value: 0 })}>Hepsini çek</Button>
      <span>Boşta {idle} kişi · {perWorker}</span>
      <Button size="sm" variant="outline" disabled={idle <= 0 || value >= cap} onClick={() => onCommand({ type: 'workers', id, value: value + idle })}>Doldur</Button>
    </div>
  </div>
}

/** Binaya özel kutular. */
function BuildingView({ game, empire, id, onCommand, onRecruit, onNav, onBuildingNav }: {
  game: Game; empire: Empire | undefined; id: BuildingId; onCommand: (c: Command) => void
  onRecruit: (id: UnitId, count: number) => void; onNav: (panel: 'research' | 'diplomacy' | 'island' | 'people' | 'cities') => void
  onBuildingNav: (id: BuildingId) => void
}) {
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
        <Box title="Şehrin halkı">
          <Table rows={[
            ['Nüfus', <strong key="p">{num(population(game))} / {num(maxPopulation(game))}</strong>],
            ['Büyüme', growthRate(game) > 0 ? `+${growthRate(game).toFixed(1)} kişi/dk` : 'Tavanda'],
            ['Barınma (Konaklar)', num(housing(game))],
            ['Boşta halk', num(idleWorkers(game))],
            ['Asker', num(soldiers(game))],
          ]} />
        </Box>
        <Box title={`Huzur · ${num(content)}`}>
          <Table rows={[...parts.filter(([, n]) => n).map(([l, n]) => [l, `+${num(n)}`]), ...(other ? [['Araştırma, mucize, yönetim', `${other > 0 ? '+' : ''}${num(other)}`]] : [])]} />
          <p className="bp-note">Nüfus, barınma ile huzurdan küçük olanına doğru büyür.</p>
        </Box>
        <Box title="Hazine">
          <Table rows={[
            ['Vergi ve esnaf', `+${num(gross)} akçe/dk`],
            ['Âlim maaşları', `-${(scientistUpkeepPerMinute(game)).toFixed(1)} akçe/dk`],
            ['Ordu bakımı', `-${armyUpkeep(game).toFixed(1)} akçe/dk`],
            [<strong key="n">Net gelir</strong>, <strong key="v">{num(r.gold)} akçe/dk</strong>],
            ['Yolsuzluk', `%${Math.round(corruption(game) * 100)}`],
            ['Hamle puanı', `${actionPoints(game)} görev`],
          ]} />
        </Box>
      </>
    }
    case 'medrese': {
      const study = game.study
      return <>
        <Box title="Âlimler">
          <Workers game={game} id="medrese" unit="Âlim" perWorker={`âlim başı ${(9).toFixed(0)} akçe/saat`} onCommand={onCommand} />
          <Table rows={[
            ['İlim üretimi', <strong key="k">{r.knowledge.toFixed(1)} /dk</strong>],
            ['Âlim maaşı', `${num(scientistUpkeepPerMinute(game) * 60)} akçe/saat`],
            ['Tamamlanan araştırma', `${game.research.length}`],
          ]} />
        </Box>
        <Box title="Araştırma">
          {study ? <><p className="bp-note"><BookOpen className="size-4" /> {RESEARCH[study.id as keyof typeof RESEARCH].name}</p><JobProgress job={study} now={game.updatedAt} /></>
            : <p className="bp-note">Şu an araştırma yok.</p>}
          <Button size="sm" onClick={() => onNav('research')}>Araştırmalara git<ChevronRight data-icon="inline-end" /></Button>
        </Box>
      </>
    }
    case 'kereste': return <Box title="Oduncular"><Workers game={game} id="kereste" unit="Oduncu" perWorker={`${num(r.wood)} kereste/dk`} onCommand={onCommand} />
      <p className="bp-note">Adanın ormanında da oduncu çalıştırabilirsin (ada ormanı: {num(forestProduction(game))} kereste/dk).</p>
      <Button size="sm" variant="outline" onClick={() => onNav('island')}>Ada ormanına git<ChevronRight data-icon="inline-end" /></Button></Box>
    case 'tas': return <Box title="Taşçılar"><Workers game={game} id="tas" unit="Taşçı" perWorker={`${num(r.stone)} taş/dk`} onCommand={onCommand} /></Box>
    case 'carsi': return <Box title="Esnaf"><Workers game={game} id="carsi" unit="Esnaf" perWorker={`${num(r.gold)} akçe/dk net`} onCommand={onCommand} />
      <p className="bp-note">Çarşı'daki tüccarla lüks mal alıp satmak için Ada paneline git.</p>
      <Button size="sm" variant="outline" onClick={() => onNav('island')}>Tüccara git<ChevronRight data-icon="inline-end" /></Button></Box>
    case 'surlar': return <Box title="Şehir savunması">
      <Table rows={[
        ['Sur seviyesi', `${game.buildings.surlar}`],
        ['Sur canı (savaşta)', <strong key="h">{num(cityWallHp(game))}</strong>],
        ['Asker gerektirmeyen savunma', num(wallDefense(game))],
        ['Sur muhafızı', `${cityGuards(game)} mızrakçı`],
        ['Yağmadan korunan mal', `${num(safeStock(game))} / tür`],
      ]} />
      <p className="bp-note">Saldırıda önce sur hasar emer: kuşatma birlikleri sura üç kat, diğerleri yarım vurur. Sur yıkılınca savunanın morali sarsılır. Sur her seviyede savunmaya 4 muhafız ekler.</p>
    </Box>
    case 'ambar': case 'depo': {
      const cap = capacity(game), safe = safeStock(game)
      const goods: (Resource | Luxury)[] = [...RESOURCE_IDS, ...LUXURY_IDS]
      return <Box title={`Depolama · kapasite ${num(cap)}`}>
        <Table head={['Mal', 'Stok', 'Korunan']} rows={goods.map(g => [
          <span key="n" className="bp-good"><ResIcon id={g} />{name(g)}</span>,
          <span key="s" className="bp-fill"><span style={{ width: `${Math.min(100, stock(game, g) / cap * 100)}%` }} /><em>{num(stock(game, g))}</em></span>,
          num(Math.min(safe, stock(game, g))),
        ])} />
        <p className="bp-note">Ambar ve Depo her malın tavanını belirler; dolu ambarda üretim boşa gider. Baskında her malın {num(safe)} birimi korunur.</p>
      </Box>
    }
    case 'kisla': case 'tersane': case 'liman': case 'elcilik':
      return <>
        {id === 'liman' && <Box title="Liman">
          <Table rows={[
            ['Ticaret kapasitesi', num(tradeCapacity(game))],
            ['Yükleme hızı', `${num(loadingSpeed(game))} mal/dk`],
            ['Nakliye gemisi', `${game.army.nakliye} (${num(cargoCapacity(game))} mal taşır)`],
            ['Yolculuk süresi', `%${Math.round(travelFactor(game) * 100)}`],
          ]} />
          <Button size="sm" variant="outline" onClick={() => onNav('cities')}>Nakliye gönder<ChevronRight data-icon="inline-end" /></Button>
        </Box>}
        {id === 'elcilik' && <Box title="Casusluk ve diplomasi">
          <Table rows={[
            ['Casus', `${game.army.casus} / ${spyCapacity(game)}`],
            ['Casusluk başarısı', `+%${Math.round(spyBonus(game) * 100)}`],
            ['Yabancı casus yakalama', `%${Math.round(counterSpy(game) * 100)}`],
          ]} />
          <Button size="sm" variant="outline" onClick={() => onNav('diplomacy')}>Dünya ve diplomasi<ChevronRight data-icon="inline-end" /></Button>
        </Box>}
        <Box title={id === 'tersane' ? 'Gemi yapımı' : id === 'liman' ? 'Nakliye gemileri' : id === 'elcilik' ? 'Casus eğitimi' : 'Asker eğitimi'} className="bp-army">
          <ArmyPanel game={game} onRecruit={onRecruit} onBuild={onBuildingNav} home={id} />
        </Box>
      </>
    case 'konut': case 'hamam': return <Box title="Halk">
      <Table rows={[['Nüfus', `${num(population(game))} / ${num(maxPopulation(game))}`], ['Barınma', num(housing(game))], ['Huzur', num(contentment(game))],
        ['Büyüme', growthRate(game) > 0 ? `+${growthRate(game).toFixed(1)} kişi/dk` : 'Tavanda']]} />
      <Button size="sm" variant="outline" onClick={() => onNav('people')}>Halk paneli<ChevronRight data-icon="inline-end" /></Button>
    </Box>
    case 'kahvehane': return <Box title="Üzüm ikramı">
      <Table rows={[['İkram seviyesi', `${tavernLevel(game)} / ${game.buildings.kahvehane}`], ['Üzüm tüketimi', `${wineConsumption(game).toFixed(1)} /dk`],
        ['Ambardaki üzüm', num(game.luxury.uzum)], ['İkram ediliyor mu', wineServed(game) ? 'Evet' : 'Hayır (üzüm yok)']]} />
    </Box>
    case 'muze': return <Box title="Kültür">
      <Table rows={[['Müze huzuru', `+${num(game.buildings.muze * BUILDING_EFFECTS.muzeContentment * (game.research.includes('kultur') ? 1.5 : 1))}`],
        ['Kültür anlaşması (bu şehirde)', `${game.culture ?? 0} / ${game.buildings.muze}`], ['İmparatorluktaki anlaşma', `${empire ? culturalTreaties(empire) : 0}`]]} />
      <p className="bp-note">Her kültür anlaşması Müze seviyesi kadar şehirde +50 huzur verir. Anlaşmalar Dünya panelinden yapılır.</p>
      <Button size="sm" variant="outline" onClick={() => onNav('diplomacy')}>Anlaşma yap<ChevronRight data-icon="inline-end" /></Button>
    </Box>
    case 'saray': case 'valilik': return empire ? <Box title="İmparatorluk">
      <Table head={['Şehir', 'Divanhane', 'Yolsuzluk']} rows={empire.cities.map(c => [c.name, `${c.game.buildings.divan}`, `%${Math.round(corruption(c.game) * 100)}`])} />
      <p className="bp-note">Saray seviyesi kurabileceğin koloni sayısını belirler; kolonide Valilik yolsuzluğu siler.</p>
      <Button size="sm" variant="outline" onClick={() => onNav('cities')}>Şehirler ve atlas<ChevronRight data-icon="inline-end" /></Button>
    </Box> : null
    case 'bagci': case 'simyahane': case 'camci': case 'tasci': case 'ormanci': {
      const lux = luxuryProduction(game)
      const out: Record<string, string> = {
        bagci: `${lux.uzum.toFixed(1)} üzüm/dk`, simyahane: `${lux.kukurt.toFixed(1)} kükürt/dk`, camci: `${lux.kristal.toFixed(1)} kristal/dk`,
        tasci: `${num(r.stone)} taş/dk · ${lux.mermer.toFixed(1)} mermer/dk`, ormanci: `${num(r.wood)} kereste/dk`,
      }
      return <Box title="Üretim"><Table rows={[['Şehrin üretimi', out[id]], ['Maden işçisi', `${game.mine.miners}`]]} />
        <Button size="sm" variant="outline" onClick={() => onNav('island')}>Ada madenine git<ChevronRight data-icon="inline-end" /></Button></Box>
    }
    default: return null
  }
}

export function BuildingPage({ game, empire, id, onClose, onBuild, onFlip, onMove, onCommand, onRecruit, onNav, onBuildingNav, children }: {
  game: Game; empire: Empire | undefined; id: BuildingId
  onClose: () => void; onBuild: () => void; onFlip: () => void; onMove: () => void
  onCommand: (c: Command) => void; onRecruit: (id: UnitId, count: number) => void
  onNav: (panel: 'research' | 'diplomacy' | 'island' | 'people' | 'cities') => void; onBuildingNav: (id: BuildingId) => void
  children?: ReactNode
}) {
  const b = BUILDINGS[id], level = game.buildings[id], max = MAX_LEVEL[id]
  const forecast = Array.from({ length: Math.min(4, max - level) }, (_, step) => {
    const projected: Game = { ...game, buildings: { ...game.buildings, [id]: level + step } }
    return { level: level + step + 1, price: cost(projected, id), seconds: duration(projected, id) }
  })
  const city = empire ? activeCity(empire).name : ''
  return <div className="bp" role="dialog" aria-modal="true" aria-label={`${b.name} sayfası`}>
    <header className="bp-bar">
      <button type="button" className="bp-back" onClick={onClose} aria-label="Şehre dön"><ArrowLeft /></button>
      <div className="bp-title"><h1>{b.name}</h1><small>{city} · {b.category.toLocaleLowerCase('tr')}</small></div>
      <span className="bp-level" aria-label={`Seviye ${level}`}><img src={asset('/images/ui/level-circle.webp')} alt="" /><b>{level}</b></span>
      <button type="button" className="bp-back bp-close" onClick={onClose} aria-label="Kapat"><X /></button>
    </header>
    <div className="bp-scroll">
      <section className="bp-hero">
        {b.art ? <img src={buildingImage(id, Math.max(1, level))} alt={`${b.name} görünümü`} /> : <span className="bp-pending"><Hammer /></span>}
      </section>
      <p className="bp-desc">{b.description}</p>
      <UpgradeBox game={game} id={id} onBuild={onBuild} />
      <Box title="Seviye etkisi"><BuildingEffects game={game} id={id} level={level} max={max} /></Box>
      <BuildingView game={game} empire={empire} id={id} onCommand={onCommand} onRecruit={onRecruit} onNav={onNav} onBuildingNav={onBuildingNav} />
      {children}
      {forecast.length > 0 && <Box title="Sonraki seviyeler">
        <Table head={['Sv.', 'Maliyet', 'Süre']} rows={forecast.map(f => [
          `${f.level}`,
          <span key="c" className="bp-mini-costs">{RESOURCE_IDS.filter(r => f.price[r] > 0).map(r => <span key={r}><ResIcon id={r} />{num(f.price[r])}</span>)}</span>,
          time(f.seconds),
        ])} />
      </Box>}
      {level > 0 && <Box title="Yapı">
        {takesPlot(id) && <div className="bp-tools">
          {b.art && <Button size="sm" variant="outline" onClick={onFlip}><FlipHorizontal2 data-icon="inline-start" />{game.flips.includes(id) ? 'Yönü geri çevir' : 'Çevir'}</Button>}
          {id !== 'divan' && <Button size="sm" variant="outline" onClick={onMove}><Move data-icon="inline-start" />Taşı</Button>}
        </div>}
        <DemolishRow game={game} id={id} onCommand={onCommand} />
      </Box>}
    </div>
  </div>
}
