'use client'

import { useState } from 'react'
import { ArrowUp, Hammer, Clock3, LockKeyhole, Check, BookOpen, ChevronRight, TreePine, Warehouse, Ruler, Users, UserRound, Minus, Plus as PlusIcon, House, HeartHandshake, TriangleAlert, Landmark, Swords, Ship, ShieldCheck, Handshake, Coins, FlaskConical, Compass, FlipHorizontal2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CostDisplay, JobProgress } from './game-widgets'
import { BUILDINGS, BUILDING_IDS, MAX_LEVEL, RESEARCH, RESEARCH_IDS, RESEARCH_BRANCHES, RESOURCE_IDS, RESOURCE_NAMES, UNITS, UNIT_IDS, WORKER_IDS, WORKERS_PER_LEVEL, activeJob, cargoCapacity, cityDefense, cost, duration, buildReason, power, rates, recruitReason, researchReason, idleWorkers, population, housing, contentment, soldiers, takesPlot, tradeCapacity, unhousedByUnrest, unitCost, unitDuration, wallDefense, workerCapacity, type BuildingId, type ResearchId, type UnitId, type WorkerId, type Game } from '@/lib/game/engine'
import { buildingImage } from '@/lib/asset'

export function BuildingDetails({ game, id, onBuild, onFlip }: { game: Game; id: BuildingId; onBuild: (id: BuildingId) => void; onFlip: (id: BuildingId) => void }) {
  const b = BUILDINGS[id], level = game.buildings[id], reason = buildReason(game, id)
  const active = activeJob(game)?.id === id ? activeJob(game) : null
  const queued = game.queue.findIndex(job => job.id === id)
  const max = MAX_LEVEL[id]
  return <div className="building-details"><div className="building-preview"><div className="preview-halo" />{b.art ? <img src={buildingImage(id)} alt={`${b.name} mimari görünümü`} width={360} height={360} /> : <span className="preview-pending"><Hammer aria-hidden="true" /><small>Görsel hazırlanıyor</small></span>}<span>{level ? `SEVİYE ${level}` : 'YENİ YAPI'}</span></div><span className="eyebrow">{b.category}</span><p>{b.description}</p><div className="building-upgrade"><span>{level ? `Seviye ${level}` : 'Boş arsa'}</span><ArrowUp className="size-4" /><strong>{level >= max ? 'En yüksek seviye' : `Seviye ${level + 1}`}</strong></div>{active ? <JobProgress job={active} now={game.updatedAt} /> : level < max && <><div className="upgrade-cost"><span>Gerekli kaynaklar</span><CostDisplay value={cost(game, id)} /></div><div className="duration-row"><Clock3 className="size-4" /> {duration(game, id)} saniye <span>Prototip süresi</span></div></>}{queued > 0 && <p className="requirement"><Clock3 className="size-4" />İnşaat sırasında {queued + 1}. sırada bekliyor.</p>}{reason && !active && queued < 0 && <p className="requirement"><LockKeyhole className="size-4" />{reason}</p>}{level > 0 && b.art && takesPlot(id) && <Button variant="outline" size="sm" className="w-full" onClick={() => onFlip(id)}><FlipHorizontal2 data-icon="inline-start" />{game.flips.includes(id) ? 'Yönü geri çevir' : 'Binayı çevir (aynala)'}</Button>}<Button size="lg" className="w-full" disabled={!!reason} onClick={() => onBuild(id)}><Hammer data-icon="inline-start" />{active ? 'İnşaat devam ediyor' : level >= max ? 'Tamamen geliştirildi' : level ? 'Binayı yükselt' : 'İnşaata başla'}</Button></div>
}
export function BuildingList({ game, onSelect }: { game: Game; onSelect: (id: BuildingId) => void }) {
  return <div className="building-list">{BUILDING_IDS.map(id => <button key={id} className="building-list-item" onClick={() => onSelect(id)}>{BUILDINGS[id].art ? <img src={buildingImage(id)} alt="" width={88} height={88} /> : <span className="list-pending"><Hammer aria-hidden="true" /></span>}<span><span className="eyebrow">{BUILDINGS[id].category}</span><strong>{BUILDINGS[id].name}</strong><span>{game.buildings[id] ? `Seviye ${game.buildings[id]}${game.buildings[id] >= MAX_LEVEL[id] ? ' · Tamamlandı' : ' · Geliştirilebilir'}` : 'Boş arsa · Yeni yapı'}</span></span><ChevronRight className="size-4" /></button>)}</div>
}
const researchIcons: Record<ResearchId, typeof TreePine> = {
  tools: TreePine, storage: Warehouse, ticaret: Coins, architecture: Ruler,
  alimler: FlaskConical, celik: Swords, istihkam: ShieldCheck, pusula: Compass, yelken: Ship,
}
export function ResearchPanel({ game, onResearch }: { game: Game; onResearch: (id: ResearchId) => void }) {
  return <div className="research-panel"><div className="research-intro"><BookOpen className="size-5" /><span><strong>Geleceğin ilimle şekillenir.</strong><p>Medresede keşfet. Dört dalda şehrine kalıcı güç kazandır.</p></span></div>{game.study && <JobProgress job={game.study} now={game.updatedAt} />}{RESEARCH_BRANCHES.map(branch => {
    const ids = RESEARCH_IDS.filter(id => RESEARCH[id].branch === branch.key)
    const doneCount = ids.filter(id => game.research.includes(id)).length
    return <section className="research-branch" key={branch.key}>
      <div className="research-branch-top"><h3>{branch.title}</h3><span>{doneCount}/{ids.length}</span></div>
      {ids.map(id => {
        const r = RESEARCH[id], reason = researchReason(game, id), done = game.research.includes(id), Icon = researchIcons[id]
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
  const candidates = BUILDING_IDS.filter(id => takesPlot(id) && game.placement[id] === null)
  return <div className="building-list">
    <p className="fine-print">Bu arsaya kurabileceğin yapılar. Kurulduktan sonra buradan yükseltirsin.</p>
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
      <div><Users className="size-5" /><span>Nüfus</span><strong>{population(game)}</strong></div>
      <div><UserRound className="size-5" /><span>Boşta</span><strong className={idle === 0 ? 'people-none' : undefined}>{idle}</strong></div>
      <div><House className="size-5" /><span>Barınma</span><strong>{housing(game)}</strong></div>
      <div><HeartHandshake className="size-5" /><span>Huzur</span><strong>{contentment(game)}</strong></div>
    </div>
    {/*
      * Barinma huzurdan buyukse konaklar bos kalir. Bu, oyuncunun kendi
      * kesfetmesi zor bir tavan: sayilar ayni ekranda dursa bile aradaki
      * ILISKI soylenmezse "neden nufusum artmiyor" sorusu cevapsiz kalir.
      */}
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
    <p className="fine-print">Her yapı seviyesi {WORKERS_PER_LEVEL} işçi alır. Nüfus, barınma ve huzurdan hangisi küçükse ona eşittir. Boşta kalan halk üretim yapmaz; akçe ise halkın kendisinden gelir ve işçi istemez.</p>
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
export function CitiesPanel({ game, onBuilding }: { game: Game; onBuilding: (id: BuildingId) => void }) {
  const built = BUILDING_IDS.filter(id => game.buildings[id] > 0)
  const production = rates(game)
  return <div className="advisor-panel">
    <article className="city-card">
      <div className="city-card-top">
        <span className="city-emblem"><Landmark aria-hidden="true" /></span>
        <span><span className="eyebrow">BAŞKENT</span><strong>Sahilhisar</strong><span>Seviye {game.buildings.divan} yerleşim · {built.length} yapı</span></span>
      </div>
      <div className="city-stats">
        <div><span>Nüfus</span><strong>{population(game)}</strong></div>
        <div><span>Boşta</span><strong>{idleWorkers(game)}</strong></div>
        <div><span>Asker</span><strong>{soldiers(game)}</strong></div>
        <div><span>Savunma</span><strong>{cityDefense(game)}</strong></div>
      </div>
      <div className="city-rates">{RESOURCE_IDS.filter(id => production[id] > 0).map(id => <span key={id}>{RESOURCE_NAMES[id]} <strong>+{Math.round(production[id])}/dk</strong></span>)}</div>
      <Button size="sm" variant="outline" onClick={() => onBuilding('divan')}>Divanhaneye git<ChevronRight data-icon="inline-end" /></Button>
    </article>
    <article className="city-card city-card-locked">
      <div className="city-card-top">
        <span className="city-emblem"><LockKeyhole aria-hidden="true" /></span>
        <span><span className="eyebrow">İKİNCİ ŞEHİR</span><strong>Henüz kurulmadı</strong><span>{game.buildings.saray > 0 ? 'Saray hazır. Yeni şehir kurma bu prototipte açılmadı.' : 'Saray gerekli.'}</span></span>
      </div>
      <p className="fine-print">Saray, hükmünü uzak adalara taşır. Yeni şehirler bu prototipte henüz kurulamıyor; Saray kurulduğunda bu ekran onları listeleyecek.</p>
    </article>
  </div>
}

/** Bir emirde eğitilebilecek parti büyüklükleri. */
const BATCHES = [1, 5, 10]

/**
 * ORDU danismani.
 *
 * Ekranin en ustunde nufus muhasebesi durur - cunku bu oyunda asker almanin
 * bedeli akce degil, VATANDAS. Oyuncu bir birligi egitmeden once kac kisinin
 * bosta oldugunu gormezse, uretiminin nicin dustugunu anlamaz.
 */
export function ArmyPanel({ game, onRecruit, onBuild }: { game: Game; onRecruit: (id: UnitId, count: number) => void; onBuild: (id: BuildingId) => void }) {
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
    <p className="army-note"><TriangleAlert className="size-4" />Asker halktan çıkar. Eğitilen her vatandaş üretimden düşer; surlar ise asker istemez, taş ister ({wallDefense(game)} savunma).</p>
    {game.drill && <JobProgress job={game.drill} now={game.updatedAt} />}
    <div className="batch-row"><span>Parti</span>{BATCHES.map(n => <Button key={n} size="sm" variant={batch === n ? 'default' : 'outline'} onClick={() => setBatch(n)}>{n}</Button>)}</div>
    {branches.map(branch => {
      const units = UNIT_IDS.filter(id => UNITS[id].branch === branch.key)
      const ready = units.some(id => game.buildings[UNITS[id].home] > 0)
      return <section className="army-branch" key={branch.key}>
        <div className="army-branch-top"><h3>{branch.title}</h3><span>{branch.key === 'deniz' ? `Deniz gücü ${sea.attack} / ${sea.defense}` : `Savunma ${land.defense}`}</span></div>
        {!ready && <button className="army-locked" onClick={() => onBuild(branch.home)}><LockKeyhole className="size-4" /><span><strong>{BUILDINGS[branch.home].name} gerekli</strong><small>{BUILDINGS[branch.home].description}</small></span><ChevronRight className="size-4" /></button>}
        {units.map(id => {
          const unit = UNITS[id]
          const reason = recruitReason(game, id, batch)
          return <article className="unit-card" key={id}>
            <div className="unit-top">
              <span className="unit-icon">{unit.branch === 'kara' ? <Swords aria-hidden="true" /> : <Ship aria-hidden="true" />}</span>
              <span><strong>{unit.name}</strong><small>{unit.description}</small></span>
              <span className="unit-have">{game.army[id]}<small>elde</small></span>
            </div>
            <div className="unit-stats">
              <span title="Saldırı"><Swords className="size-3" />{unit.attack}</span>
              <span title="Savunma"><ShieldCheck className="size-3" />{unit.defense}</span>
              <span title="Aldığı vatandaş"><Users className="size-3" />{unit.pop}</span>
              {unit.cargo > 0 && <span title="Taşıma"><Warehouse className="size-3" />{unit.cargo}</span>}
            </div>
            <div className="unit-bottom">
              <CostDisplay value={unitCost(id, batch)} />
              <span><Clock3 className="size-3" /> {unitDuration(game, id, batch)} sn</span>
              <Button size="sm" disabled={!!reason} onClick={() => onRecruit(id, batch)}>{batch} eğit</Button>
            </div>
            {reason && <p className="fine-print">{reason}</p>}
          </article>
        })}
      </section>
    })}
    <p className="fine-print">Taşıma kapasitesi {cargoCapacity(game)} mal · Ticaret limanı {tradeCapacity(game)} mal. Sefer ve savaş bu prototipte henüz yok; ordu şimdilik şehrin savunmasıdır.</p>
  </div>
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
    <article className="city-card">
      <div className="city-card-top"><span className="city-emblem"><Ship aria-hidden="true" /></span><span><span className="eyebrow">TİCARET</span><strong>{tradeCapacity(game)} mal kapasite</strong><span>{game.army.nakliye} nakliye gemisi · {cargoCapacity(game)} taşıma</span></span></div>
      <p className="fine-print">Ticaret Limanı kapasiteyi, nakliye gemileri taşımayı verir. Karşı taraf — başka oyuncular — bu prototipte yok; sayılar hazır, ticaret yolu açıldığında bağlanacak.</p>
    </article>
    <p className="fine-print">Burada gerçek oyuncu, ittifak ya da mesaj gösterilmez. Uydurma bir liste koymaktansa boş bırakmak dürüst olanı.</p>
  </div>
}
