'use client'
import { PersonArt } from './workforce'

import { Hint } from './hint'
import { t } from '@/lib/i18n/tr'
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { ArrowUp, Hammer, LockKeyhole, Check, BookOpen, ChevronRight, Warehouse, UserRound, TriangleAlert, Swords, Ship, ShieldCheck, Handshake, FlipHorizontal2, Move } from './ui-art'
import { AkceArt, IlimArt, KumSaatiArt, NufusArt } from './resource-art'
import { idleMerchants } from '@/lib/game/expeditions'
import { GameButton } from './game-button'
import { NowNext } from './stat-kit'
import { CostDisplay, JobProgress } from './game-widgets'
import { BUILDINGS, MAX_LEVEL, RESEARCH, RESEARCH_IDS, RESEARCH_BRANCHES, UNITS, UNIT_IDS, activeJob, cargoCapacity, cityDefense, cost, duration, buildReason, power, rates, recruitReason, researchReason, scientistCount, scientistUpkeepPerMinute, idleWorkers, soldiers, takesPlot, tradeCapacity, unitCost, unitDuration, wallDefense, type BuildingId, type ResearchId, type ResearchBranch, type UnitId, type Game, formatRate } from '@/lib/game/engine'
import { asset } from '@/lib/asset'
import { capitalCity, colonyPalaceLevel, COLONY_COST, type Empire } from '@/lib/game/empire'
import { luxuryCost, unitLuxuryCost } from '@/lib/game/engine'
import { effectLines } from '@/lib/game/building-info'
import { FIELD_ROW_NAMES, ROLE_NAMES } from '@/lib/game/glossary'
import { Term } from './term'
import { actionPoints, armyUpkeep, type UnitRole } from '@/lib/game/engine'
import { ChevronsLeft, ChevronsRight, Eye } from './ui-art'
import { DRILL_QUEUE_LIMIT, garrisonLimit, garrisonUsed, spyCapacity } from '@/lib/game/engine'
import { BATTLE_STATS, SLOT_SIZE, fieldSize } from '@/lib/game/battle'
import { UnitFigure } from './unit-art'
import { UnitGallery, unitLock } from './unit-gallery'
import { BRANCH, ResearchEmblem } from './research-art'

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
  return <div className="building-details"><span className="eyebrow">{b.category}</span><p>{b.description}</p><BuildingEffects game={game} id={id} level={level} max={max} /><div className="building-upgrade"><span>{level ? `Seviye ${level}` : 'Boş arsa'}</span><ArrowUp className="size-4" /><strong>{level >= max ? 'En yüksek seviye' : `Seviye ${level + 1}`}</strong></div>{active ? <JobProgress job={active} now={game.updatedAt} /> : level < max && <><div className="upgrade-cost"><span>Gerekli kaynaklar</span><CostDisplay value={cost(game, id)} lux={luxuryCost(game, id)} /></div><div className="duration-row"><KumSaatiArt className="size-4" /> {duration(game, id)} saniye <span>Prototip süresi</span></div></>}{forecast.length > 0 && <section className="building-cost-forecast">
    <strong>Sonraki seviyelerin maliyeti</strong>
    <Hint>Fiyatlar mevcut araştırma indirimlerini içerir. Sonraki yükseltmelerin ücreti, o günkü teknolojine göre yeniden hesaplanır.</Hint>
    {forecast.map(item => <div key={item.level} className="building-forecast-row">
      <strong>Sv. {item.level}</strong>
      <span>{item.price.gold.toLocaleString('tr-TR')} akçe · {item.price.wood.toLocaleString('tr-TR')} kereste</span>
      <small>{Math.ceil(item.seconds / 60)} dk</small>
    </div>)}
  </section>}{queued > 0 && <p className="requirement"><KumSaatiArt className="size-4" />İnşaat sırasında {queued + 1}. sırada bekliyor.</p>}{reason && !active && queued < 0 && <p className="requirement"><LockKeyhole className="size-4" />{reason}</p>}{level > 0 && takesPlot(id) && <div className="building-tools">{b.art && <GameButton variant="outline" size="sm" onClick={() => onFlip(id)}><FlipHorizontal2 data-icon="inline-start" />{game.flips.includes(id) ? 'Yönü geri çevir' : 'Çevir'}</GameButton>}{id !== 'divan' && <GameButton variant="outline" size="sm" onClick={() => onMove(id)}><Move data-icon="inline-start" />Taşı</GameButton>}</div>}<GameButton size="lg" className="w-full" disabled={!!reason} onClick={() => onBuild(id)}><Hammer data-icon="inline-start" />{active ? 'İnşaat devam ediyor' : level >= max ? 'Tamamen geliştirildi' : level ? 'Binayı yükselt' : 'İnşaata başla'}</GameButton></div>
}
export { BuildingList, PlotPicker } from './construction-register'
/**
 * ARAŞTIRMA DANIŞMANI (Ikariam düzeni): üstte âlim sayısı, ilim ve saatlik
 * birikim; dal sekmeleri; seçili araştırmanın ayrıntısı (etki, gerekenler,
 * masraf, ne zaman yeteceği); altında dalın numaralı listesi ve kandil
 * işaretleri (yanan: tamam, kırmızı: sıradaki, sönük: kilitli).
 */
const BRANCH_ART: Record<ResearchBranch, ResearchId> = { ekonomi: 'tools', bilim: 'alimler', askeri: 'celik', denizcilik: 'pusula', mitoloji: 'ongun_toresi' }
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
  // Dal sayfaları: şeride dokununca kaydırılır, parmakla kaydırınca dal değişir.
  const pager = useRef<HTMLDivElement>(null)
  const settle = useRef<number | undefined>(undefined)
  const go = (k: number) => {
    const el = pager.current
    setBranch(RESEARCH_BRANCHES[k].key); setPicked(null)
    el?.scrollTo({ left: k * el.clientWidth, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }
  const onPage = () => {
    window.clearTimeout(settle.current)
    settle.current = window.setTimeout(() => {
      const el = pager.current
      if (!el || !el.clientWidth) return
      const next = RESEARCH_BRANCHES[Math.round(el.scrollLeft / el.clientWidth)]?.key
      if (next && next !== branch) { setBranch(next); setPicked(null) }
    }, 120)
  }
  // Açılışta seçili dalın sayfasına anında gidilir.
  useLayoutEffect(() => {
    const el = pager.current
    if (el) el.scrollLeft = RESEARCH_BRANCHES.findIndex(b => b.key === branch) * el.clientWidth
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return <div className="research-panel rs">
    <div className="rs-stats">
      <span><PersonArt kind="alim" size={26} /><b>{scientistCount(game)}</b><small>âlim</small></span>
      <span><IlimArt className="rs-lamp" /><b>{Math.floor(game.resources.knowledge).toLocaleString('tr-TR')}</b><small>ilim</small></span>
      <span><KumSaatiArt className="size-4" /><b>{formatRate(rate * 60, true)}</b><small>ilim/saat</small></span>
      <span><AkceArt className="rs-lamp" /><b>{formatRate(-scientistUpkeepPerMinute(game) * 60)}</b><small>akçe/saat</small></span>
    </div>
    {game.study && <JobProgress job={game.study} now={game.updatedAt} />}
    {/* V2 Faz 2.6: sekme ızgarası yerine dal adlarıyla şerit; dallar yan yana kaydırılır. */}
    <div className="rs-strip" role="tablist" aria-label="Araştırma dalları">
      {RESEARCH_BRANCHES.map((b, k) => {
        const all = RESEARCH_IDS.filter(id => RESEARCH[id].branch === b.key)
        const done = all.filter(id => game.research.includes(id)).length
        return <button type="button" role="tab" key={b.key} aria-selected={branch === b.key} onClick={() => go(k)}
          style={{ '--b-light': BRANCH[b.key][0], '--b-dark': BRANCH[b.key][1] } as CSSProperties}>
          <span className="rs-branch-label"><span aria-hidden="true"><ResearchEmblem id={BRANCH_ART[b.key]} size={28} /></span><span>{b.title}</span></span>
          <span className="rs-strip-meter" aria-label={`${done} / ${all.length} keşfedildi`}><i style={{ width: `${(100 * done) / all.length}%` }} /></span>
        </button>
      })}
    </div>
    <article className={`rs-detail is-${state}`}>
      <div className="rs-detail-top"><ResearchEmblem id={sel} size={72} state={state} />
        <span><span className="eyebrow">{RESEARCH_BRANCHES.find(b => b.key === branch)!.title.toLocaleUpperCase('tr')} · {ids.indexOf(sel) + 1}. ARAŞTIRMA</span><h3>{r.name}</h3></span></div>
      <ul className="rs-needs">
        {r.needs && <li className={game.research.includes(r.needs) ? 'is-ok' : 'is-no'}>{game.research.includes(r.needs) ? <Check className="size-3" /> : <LockKeyhole className="size-3" />}{RESEARCH[r.needs].name}</li>}
        <li className={game.buildings.medrese >= r.required ? 'is-ok' : 'is-no'}>{game.buildings.medrese >= r.required ? <Check className="size-3" /> : <LockKeyhole className="size-3" />}Medrese {r.required}. seviye</li>
      </ul>
      <div className="rs-cost">
        <span className={short > 0 && state !== 'done' ? 'is-short' : undefined}><IlimArt className="rs-lamp" />{r.cost.toLocaleString('tr-TR')} ilim</span>
        <span><KumSaatiArt className="size-4" />{r.duration} sn</span>
        {state !== 'done' && short > 0 && <span className="rs-when">{rate > 0 ? `Yeterli ilim ~${clockMin(short / rate)} sonra` : 'İlim üretimi yok: Medrese\'ye âlim ata'}</span>}
      </div>
      {state === 'done' ? <p className="report-win"><Check className="size-4" /> Keşfedildi</p>
        : <GameButton disabled={!!reason} data-guide="research" onClick={() => onResearch(sel)}><BookOpen data-icon="inline-start" />{state === 'active' ? 'Sürüyor' : 'Araştır'}</GameButton>}
      {reason && state !== 'done' && state !== 'active' && <p className="fine-print">{reason}</p>}
      <p className="rs-effect"><b>Etkisi:</b> {r.description}</p>
    </article>
    {/* Her dalın araştırmaları dikey defterde; ön koşul ve kilitler mevcut kurallardan gelir. */}
    <div className="rs-branches" ref={pager} onScroll={onPage}>{RESEARCH_BRANCHES.map(b => {
      const list = RESEARCH_IDS.filter(id => RESEARCH[id].branch === b.key)
      // Dikey defter: her satır kendi ön koşulunu ve mevcut kilidini gösterir.
      const node = (id: ResearchId): ReactNode => {
        const st = researchState(game, id), why = st === 'locked' ? researchReason(game, id) : null
        const note = st === 'done' ? 'Keşfedildi' : st === 'active' ? 'Âlimler çalışıyor' : why ?? `${RESEARCH[id].cost.toLocaleString('tr-TR')} ilim · ${RESEARCH[id].duration} sn`
        return <li key={id} className={`is-${st}`}><button type="button" aria-pressed={id === sel} className={`is-${st}`} onClick={() => setPicked(id)}>
          <span className="rs-node"><ResearchEmblem id={id} size={44} state={st} /><b className="rs-num" data-tiny>{list.indexOf(id) + 1}</b></span>
          <span className="rs-copy"><span className="rs-name">{RESEARCH[id].name}</span><small>{note}</small></span>
          {st === 'done' ? <Check className="rs-tick" aria-label="tamam" /> : st === 'locked' ? <LockKeyhole className="rs-tick" aria-label="kilitli" /> : null}
        </button></li>
      }
      return <div key={b.key} className="rs-scroll" inert={b.key !== branch}>
        <ul className="rs-list rs-tree" aria-label={`${b.title} araştırma defteri`}>{list.map(node)}</ul>
      </div>
    })}</div>
  </div>
}

/** Savaş alanındaki yerler (Ikariam'ın savaş sırası). */
const ROLE_ORDER: UnitRole[] = ['front', 'flank', 'range', 'artillery', 'bomber', 'fighter', 'support', 'spy', 'transport']

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
function BarracksPortrait({ id }: { id: UnitId }) {
  return <img className="barracks-painted-portrait" src={asset(UNITS[id].branch === 'deniz' ? `/images/game/units/${id}.webp` : `/images/game/ui/barracks/portrait-${id}.webp`)} alt="" width={288} height={216} />
}

export function ArmyPanel({ game, onRecruit, onBuild, home }: { game: Game; onRecruit: (id: UnitId, count: number) => void; onBuild: (id: BuildingId) => void; home?: BuildingId }) {
  const [pick, setPick] = useState<UnitId | null>(null)
  const land = power(game, 'kara')
  const sea = power(game, 'deniz')
  const branches: { key: 'kara' | 'deniz'; title: string; home: BuildingId }[] = [
    { key: 'kara', title: 'Kara ordusu', home: 'kisla' },
    { key: 'deniz', title: 'Donanma', home: 'tersane' },
  ]
  const byRole = (a: UnitId, b: UnitId) => ROLE_ORDER.indexOf(UNITS[a].role) - ROLE_ORDER.indexOf(UNITS[b].role)
  const overview = <>
    <div className="army-summary">
      <span className="eyebrow">SANCAĞIN ALTINDA</span>
      <div><NufusArt className="size-5" /><span>Asker</span><strong>{soldiers(game)}</strong></div>
      <div><UserRound className="size-5" /><span>Boşta halk</span><strong className={idleWorkers(game) === 0 ? 'people-none' : undefined}>{idleWorkers(game)}</strong></div>
      <div><ShieldCheck className="size-5" /><span>Savunma</span><strong>{cityDefense(game)}</strong></div>
      <div><Swords className="size-5" /><span>Saldırı</span><strong>{land.attack}</strong></div>
    </div>
    <p className="army-note"><AkceArt className="size-4" />Ordunun bakımı dakikada {Math.round(armyUpkeep(game) * 10) / 10} akçe · aynı anda en fazla {actionPoints(game)} sefer (sefer hakkı).</p>
    <p className="army-note"><TriangleAlert className="size-4" />Asker halktan çıkar. Eğitilen her vatandaş üretimden düşer; surlar ise asker istemez, akçe ve kereste ister ({wallDefense(game)} savunma).</p>
    <BattlefieldCard game={game} />
  </>
  // Bina sayfası (Kışla, Tersane, Elçilik): önce birliklerin büyük portreleri,
  // altında seçilen birliğin eğitim kartı; ordu özeti katlanır bölümde.
  if (home) {
    const units = UNIT_IDS.filter(id => UNITS[id].home === home).sort(byRole)
    const chosen = pick && units.includes(pick) ? pick : units[0]
    return <div className="advisor-panel army-home">
      {home === 'kisla' || home === 'tersane' ? <section className="barracks-roster" aria-label={home === 'tersane' ? 'Gemiler' : 'Birlikler'}>
        <h2>{home === 'tersane' ? 'Gemiler' : 'Birlikler'}</h2>
        {units.map(id => {
          const selected = id === chosen, lock = unitLock(game, id)
          return <section key={id} className={`barracks-entry${selected ? ' is-selected' : ''}${lock ? ' is-locked' : ''}`}>
            <button type="button" className="barracks-unit-toggle" aria-expanded={selected}
              aria-controls={`barracks-training-${id}`} onClick={() => setPick(id)}>
              <BarracksPortrait id={id} />
              <span><strong>{UNITS[id].name}</strong><small>{home === 'tersane' ? 'Kayıtlı' : 'Mevcut'}: {game.army[id]}{lock ? ` · Kilitli: ${lock}` : ''}</small></span>
              <span className="barracks-unit-chevron" aria-hidden="true">{selected ? '⌃' : '⌄'}</span>
            </button>
            <div id={`barracks-training-${id}`} hidden={!selected}>
              {selected && <UnitCard game={game} id={id} onRecruit={onRecruit} compact />}
            </div>
          </section>
        })}
      </section> : <>
        <UnitGallery game={game} units={units} chosen={chosen} onPick={setPick} />
        {chosen && <UnitCard key={chosen} game={game} id={chosen} onRecruit={onRecruit} />}
      </>}
      <DrillQueue game={game} home={home} />
      <details className="army-more">
        <summary>{home === 'tersane' ? 'Donanma sicili ve kapasite' : 'Ordu durumu ve savaş meydanı'}</summary>
        {home === 'tersane' ? <><p className="army-note">Deniz gücü: {sea.attack} saldırı · {sea.defense} savunma. Garnizon: {garrisonUsed(game, 'deniz')} / {garrisonLimit(game, 'deniz')}.</p><p className="army-note">Kayıtlı sayılar seferdeki gemileri de içerir. Ticaret gemileri Liman’daki ortak filodan satın alınır. Toplam ordu bakımı: {Math.round(armyUpkeep(game) * 10) / 10} akçe/dk.</p></> : overview}
      </details>
    </div>
  }
  return <div className="advisor-panel">
    {overview}
    <DrillQueue game={game} home={home} />
    {branches.map(branch => {
      const units = UNIT_IDS.filter(id => UNITS[id].branch === branch.key).sort(byRole)
      if (!units.length) return null
      const ready = units.some(id => game.buildings[UNITS[id].home] > 0)
      return <section className="army-branch" key={branch.key}>
        <div className="army-branch-top"><h3>{branch.title}</h3><span>{branch.key === 'deniz' ? `Deniz gücü ${sea.attack} / ${sea.defense}` : `Savunma ${land.defense}`}</span></div>
        {!ready && <button className="army-locked" onClick={() => onBuild(branch.home)}><LockKeyhole className="size-4" /><span><strong>{BUILDINGS[branch.home].name} gerekli</strong><small>{BUILDINGS[branch.home].description}</small></span><ChevronRight className="size-4" /></button>}
        {units.map(id => <UnitCard key={id} game={game} id={id} onRecruit={onRecruit} />)}
      </section>
    })}
    <p className="fine-print">Taşıma kapasitesi {cargoCapacity(game)} mal · Ticaret limanı {tradeCapacity(game)} mal. Seferler ve casusluk Ada görünümünden (soldaki Ada danışmanı) adadaki bağımsız yerleşimlere düzenlenir.</p>
  </div>
}

/** Bir birliğin eğitim kartı: portre, savaş değerleri, adet kaydırıcısı ve Eğit. */
function UnitCard({ game, id, onRecruit, compact = false }: { game: Game; id: UnitId; onRecruit: (id: UnitId, count: number) => void; compact?: boolean }) {
  const [count, setCount] = useState(1)
  const unit = UNITS[id]
  const max = maxRecruit(game, id)
  const batch = Math.max(1, Math.min(count, Math.max(1, max)))
  const set = (n: number) => setCount(Math.max(1, Math.min(Math.max(1, max), Math.round(n) || 1)))
  const reason = recruitReason(game, id, batch)
  const information = <>
    <div className="unit-top">
      <span className="unit-portrait">{compact ? <BarracksPortrait id={id} /> : <UnitFigure id={id} size={60} />}</span>
      <span><strong>{unit.name} <em className="unit-role"><Term label={ROLE_NAMES[unit.role]} /></em></strong><small>{unit.description}</small></span>
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
      <span title="Aldığı vatandaş"><NufusArt className="size-3" />{unit.pop}</span>
      <span title="Can puanı">❤ {unit.hp}</span>
      <span title="Bakım gideri (akçe/dk)"><AkceArt className="size-3" />{unit.upkeep}/dk</span>
      {unit.cargo > 0 && <span title="Taşıma"><Warehouse className="size-3" />{unit.cargo}</span>}
    </div>
  </>
  return <article className={`unit-card${compact ? ' barracks-training' : ''}`}>
    {compact ? <details className="barracks-unit-information"><summary>{unit.branch === 'deniz' ? 'Gemi bilgisi ve savaş değerleri' : 'Birlik bilgisi ve savaş değerleri'}</summary>{information}</details> : information}
    {compact ? <div className="barracks-quantity">
      <label htmlFor={`barracks-count-${id}`}>Üretim adedi <output htmlFor={`barracks-count-${id}`}>{batch}</output></label>
      <input type="range" min={1} max={Math.max(1, max)} value={batch} disabled={max < 1}
        aria-label={`${unit.name} sayısı`} style={{ ['--fill' as string]: `${((batch - 1) / Math.max(1, max - 1)) * 100}%` }} onChange={e => set(Number(e.target.value))} />
      <div className="barracks-range-limits"><span>1</span><span>En fazla {max}</span></div>
      <div className="barracks-count-controls">
        <button type="button" aria-label={t.action.decrease} disabled={batch <= 1} onClick={() => set(batch - 1)}>−</button>
        <input id={`barracks-count-${id}`} type="number" inputMode="numeric" min={1} max={Math.max(1, max)} value={batch} disabled={max < 1} onChange={e => set(Number(e.target.value))} />
        <button type="button" aria-label={t.action.increase} disabled={batch >= max} onClick={() => set(batch + 1)}>+</button>
        <button type="button" disabled={max < 1} onClick={() => set(max)}>Maks.</button>
      </div>
    </div> : <>
    {max > 1 && <div className="unit-slider">
      <button type="button" aria-label="Bir" onClick={() => set(1)}><ChevronsLeft /></button>
      <input type="range" min={1} max={max} value={batch} aria-label={`${unit.name} sayısı`} style={{ ['--fill' as string]: `${((batch - 1) / Math.max(1, max - 1)) * 100}%` }} onChange={e => set(Number(e.target.value))} />
      <button type="button" aria-label="En fazla" onClick={() => set(max)}><ChevronsRight /></button>
      <input type="number" inputMode="numeric" min={1} max={max} value={batch} aria-label={`${unit.name} adedi`} onChange={e => set(Number(e.target.value))} />
      <small>en fazla {max}</small>
    </div>}
    </>}
    <div className="unit-bottom">
      <CostDisplay value={unitCost(id, batch, game)} lux={unitLuxuryCost(id, batch, game)} />
      <span><KumSaatiArt className="size-3" /> {unitDuration(game, id, batch)} sn</span>
      <GameButton size="sm" disabled={!!reason} data-guide={`recruit-${id}`} onClick={() => onRecruit(id, batch)}>{unit.branch === 'deniz' ? `İnşa et · ${batch} gemi` : compact ? `${batch} ${unit.name} Eğit` : `${batch} eğit`}</GameButton>
    </div>
    {reason && <p className="fine-print">{reason}</p>}
  </article>
}

const ROLE_ROW_SET = new Set<UnitRole>(['front', 'flank', 'range', 'artillery', 'bomber', 'fighter', 'support'])
/** Şehrin savaş meydanı: Divanhane seviyesiyle büyür (Ikariam). */
/** Eğitim sırası: her yapının emirleri, yürüyenin ilerlemesi ve bekleyenlerin başlama anı. */
function DrillQueue({ game, home }: { game: Game; home?: BuildingId }) {
  const jobs = game.drills.filter(j => !home || UNITS[j.id as UnitId].home === home)
  const register = home === 'kisla' || home === 'tersane'
  if (!jobs.length && !register) return null
  const now = game.updatedAt
  const clock = (ms: number) => { const t = Math.max(0, Math.ceil(ms / 1000)); return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}` }
  return <section className={`drill-queue${register ? ' barracks-production-queue' : ''}`} aria-label={register ? 'Üretim kuyruğu' : 'Eğitim sırası'}>
    {register ? <h2>Üretim kuyruğu</h2> : <span className="eyebrow">EĞİTİM SIRASI</span>}
    {!jobs.length && <p className="barracks-queue-empty">Henüz üretim emri yok.</p>}
    {jobs.map((j, i) => {
      const unit = UNITS[j.id as UnitId]
      const running = j.start <= now
      return <div key={`${j.id}-${j.start}-${i}`} className={`drill-job${running ? ' is-running' : ''}`}>
        {register ? <BarracksPortrait id={j.id as UnitId} /> : <UnitFigure id={j.id as UnitId} size={30} bare />}
        <span><strong>{j.count} {unit.name}</strong><small>{register ? (running ? home === 'tersane' ? 'İnşa ediliyor' : 'Eğitiliyor' : 'Sırada') : `${BUILDINGS[unit.home].name} · ${running ? `bitiş ${clock(j.end - now)}` : `sırada · ${clock(j.start - now)} sonra başlar`}`}</small></span>
        {register && <time className="barracks-queue-time" aria-label={running ? 'Kalan süre' : 'Başlamasına kalan süre'}>{clock(running ? j.end - now : j.start - now)}</time>}
        {running && <span className="drill-bar"><i style={{ width: `${Math.min(100, (100 * (now - j.start)) / (j.end - j.start))}%` }} /></span>}
      </div>
    })}
    <Hint>Kışla ve Tersane ayrı üretim sıraları kullanır; her birine en fazla {DRILL_QUEUE_LIMIT} emir sıralanır. Emir verildiği anda vatandaşlar sıraya ayrılır.</Hint>
  </section>
}

function BattlefieldCard({ game }: { game: Game }) {
  const level = game.buildings.divan
  const f = fieldSize(level)
  const next = level < 5 ? 5 : level < 10 ? 10 : level < 17 ? 17 : null
  const rows: Array<[string, number]> = (['front', 'flank', 'range', 'artillery', 'air', 'fighter'] as const).map(k => [FIELD_ROW_NAMES[k], f[k]])
  const garrison = (['kara', 'deniz'] as const).map(b => ({ b, used: garrisonUsed(game, b), max: garrisonLimit(game, b) }))
  return <article className="bf-card">
    <span className="eyebrow">SAVAŞ MEYDANI · {f.name.toUpperCase()}</span>
    <div className="bf-card-rows">{rows.map(([n, k]) => <span key={n}><strong>{k}</strong><small><Term label={n} /></small></span>)}</div>
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
export { IslandPanel } from './island-register'

/** Seviye etkisi: şu anki seviye ve bir sonraki seviyede ne değişir. */
export function BuildingEffects({ game, id, level, max }: { game: Game; id: BuildingId; level: number; max: number }) {
  const now = level > 0 ? effectLines(game, id, level) : []
  const next = level < max ? effectLines(game, id, level + 1) : []
  const rows = (next.length ? next : now).map((line, i) => ({ label: line.label, now: now[i]?.value ?? '—', next: next[i]?.value }))
  // Tablo yerine her etki bir satır: şimdi ➜ sonraki seviye (yeşil).
  return <section className="building-effects sk-effects" aria-label="Seviye etkisi">
    {rows.map(row => <NowNext key={row.label} label={<Term label={row.label} />} now={row.now} next={row.next}
      nowLabel={level > 0 ? `Sv. ${level}` : 'Kurulmadı'} nextLabel={`Sv. ${level + 1}`} />)}
  </section>
}

/** Koloni kurmanın önündeki engel (yoksa null) ve bedeli; dünya haritası çekmecesi gösterir. */
export function colonyBlocker(empire: Empire): string | null {
  const capital = capitalCity(empire).game
  return capital.buildings.saray < colonyPalaceLevel(empire) ? `Saray ${colonyPalaceLevel(empire)}. seviye gerekli`
    : capital.buildings.liman < 1 || idleMerchants(empire) < 3 ? 'Başkentte liman ve limanda boş 3 ticaret gemisi gerekli' : null
}
export const colonyCostText = `${COLONY_COST.gold} akçe, ${COLONY_COST.wood} kereste`
