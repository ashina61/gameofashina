'use client'

import { ArrowUp, Hammer, Clock3, LockKeyhole, Check, BookOpen, ChevronRight, TreePine, Warehouse, Ruler, Users, UserRound, Minus, Plus as PlusIcon, House, HeartHandshake, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CostDisplay, JobProgress } from './game-widgets'
import { BUILDINGS, BUILDING_IDS, RESEARCH, RESEARCH_IDS, WORKER_IDS, WORKERS_PER_LEVEL, activeJob, cost, duration, buildReason, researchReason, idleWorkers, population, housing, contentment, unhousedByUnrest, workerCapacity, type BuildingId, type ResearchId, type WorkerId, type Game } from '@/lib/game/engine'
import { buildingImage } from '@/lib/asset'

export function BuildingDetails({ game, id, onBuild }: { game: Game; id: BuildingId; onBuild: (id: BuildingId) => void }) {
  const b = BUILDINGS[id], level = game.buildings[id], reason = buildReason(game, id)
  const active = activeJob(game)?.id === id ? activeJob(game) : null
  const queued = game.queue.findIndex(job => job.id === id)
  return <div className="building-details"><div className="building-preview"><div className="preview-halo" />{b.art ? <img src={buildingImage(id)} alt={`${b.name} mimari görünümü`} width={360} height={360} /> : <span className="preview-pending"><Hammer aria-hidden="true" /><small>Görsel hazırlanıyor</small></span>}<span>{level ? `SEVİYE ${level}` : 'YENİ YAPI'}</span></div><span className="eyebrow">{b.category}</span><p>{b.description}</p><div className="building-upgrade"><span>{level ? `Seviye ${level}` : 'Boş arsa'}</span><ArrowUp className="size-4" /><strong>{level >= 5 ? 'En yüksek seviye' : `Seviye ${level + 1}`}</strong></div>{active ? <JobProgress job={active} now={game.updatedAt} /> : level < 5 && <><div className="upgrade-cost"><span>Gerekli kaynaklar</span><CostDisplay value={cost(game, id)} /></div><div className="duration-row"><Clock3 className="size-4" /> {duration(game, id)} saniye <span>Prototip süresi</span></div></>}{queued > 0 && <p className="requirement"><Clock3 className="size-4" />İnşaat sırasında {queued + 1}. sırada bekliyor.</p>}{reason && !active && queued < 0 && <p className="requirement"><LockKeyhole className="size-4" />{reason}</p>}<Button size="lg" className="w-full" disabled={!!reason} onClick={() => onBuild(id)}><Hammer data-icon="inline-start" />{active ? 'İnşaat devam ediyor' : level >= 5 ? 'Tamamen geliştirildi' : level ? 'Binayı yükselt' : 'İnşaata başla'}</Button></div>
}
export function BuildingList({ game, onSelect }: { game: Game; onSelect: (id: BuildingId) => void }) {
  return <div className="building-list">{BUILDING_IDS.map(id => <button key={id} className="building-list-item" onClick={() => onSelect(id)}>{BUILDINGS[id].art ? <img src={buildingImage(id)} alt="" width={88} height={88} /> : <span className="list-pending"><Hammer aria-hidden="true" /></span>}<span><span className="eyebrow">{BUILDINGS[id].category}</span><strong>{BUILDINGS[id].name}</strong><span>{game.buildings[id] ? `Seviye ${game.buildings[id]}${game.buildings[id] >= 5 ? ' · Tamamlandı' : ' · Geliştirilebilir'}` : 'Boş arsa · Yeni yapı'}</span></span><ChevronRight className="size-4" /></button>)}</div>
}
const researchIcons = { tools: TreePine, storage: Warehouse, architecture: Ruler }
export function ResearchPanel({ game, onResearch }: { game: Game; onResearch: (id: ResearchId) => void }) {
  return <div className="research-panel"><div className="research-intro"><BookOpen className="size-5" /><span><strong>Geleceğin ilimle şekillenir.</strong><p>Medresede keşfet. Şehrine kalıcı bir güç kazandır.</p></span></div>{game.study && <JobProgress job={game.study} now={game.updatedAt} />}{RESEARCH_IDS.map(id => {
    const r = RESEARCH[id], reason = researchReason(game, id), done = game.research.includes(id), Icon = researchIcons[id]
    return <article className="research-card" key={id}><div className="research-card-top"><span className="research-icon"><Icon /></span><span><span className="eyebrow">{id === 'tools' ? 'ÜRETİM' : id === 'storage' ? 'EKONOMİ' : 'MİMARİ'}</span><h3>{r.name}</h3></span>{done && <Check className="size-5" />}</div><p>{r.description}</p><div className="research-bottom"><CostDisplay value={{ knowledge: r.cost }} /><span><Clock3 className="size-3" /> {r.duration} sn</span><Button size="sm" variant={done ? 'secondary' : 'default'} disabled={!!reason} onClick={() => onResearch(id)}>{done ? 'Keşfedildi' : game.study?.id === id ? 'Sürüyor' : 'Araştır'}</Button></div>{reason && !done && <p className="fine-print">{reason}</p>}</article>
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
  const candidates = BUILDING_IDS.filter(id => game.placement[id] === null)
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
