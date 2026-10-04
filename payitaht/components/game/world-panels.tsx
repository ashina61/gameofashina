'use client'

/**
 * DÜNYA VE ŞEHİR YÖNETİMİ PANELLERİ
 *
 * Yönetim biçimi, şehir adı, yıkım, kahvehane ikramı, ada ormanı, deneyler,
 * günlük görevler, birlik aktarma, konuşlu birlikler ve yapay rakiplerle
 * ilgili her şey (sıralama, diplomasi, pazar, mesajlar). Rakipler her yerde
 * "yapay rakip" diye anılır; gerçek oyuncu gibi gösterilmez.
 */
import { Hint } from './hint'
import { useState } from 'react'
import { Crown, Trash2, Coffee, TreePine, FlaskConical, CalendarCheck, Gift, Truck, Anchor, Flag, Trophy, Handshake, Store, Mail, Send, ScrollText, Swords, Eye, Check, Pencil, ShieldCheck, Newspaper } from './ui-art'
import { DailyArt } from './quest-art'
import { AtlasArt, RivalPortrait } from './deep-art'
import { NewsPanel, PaceSetting, ProposalsPanel, rivalWarLine } from './ai-panels'
import { GameButton } from './game-button'
import {
  ANARCHY_MS, BUILDINGS, FOREST_MAX_LEVEL, GOVERNMENTS, GOVERNMENT_COOLDOWN_MS, GOOD_NAMES, GOVERNMENT_IDS, UNITS, UNIT_IDS,
  anarchy, forestCapacity, forestProduction, forestUpgradeCost, governmentCost, idleWorkers, tavernLevel, wineConsumption,
  LUXURY_IDS, type BuildingId, type Command, type Game, type Good, type Luxury, type Resource, type UnitId, formatRate,
} from '@/lib/game/engine'
import { activeCity, renameCity, type Empire } from '@/lib/game/empire'
import { DAILY_TASKS, claimLogin, claimTask, loginReward, taskProgress } from '@/lib/game/daily'
import { MILESTONES, claimMilestone, milestoneDone, milestoneProgress } from '@/lib/game/milestones'
import { advanceEmpire } from '@/lib/game/empire'
import { dispatchDeploy, dispatchSupport, recallMission, retreatMission, targetName, transportsNeeded, availableUnits, RAID_UNITS, WARSHIPS, targetInfo, type Mission } from '@/lib/game/expeditions'
import { BattleView } from './battle-view'
import { troopList } from '@/lib/game/battle'
import {
  FACTIONS, FAIR_PRICE, MARKET_GOODS, RIVALS, STYLE_NAMES, TREATIES, acceptOffer, cancelOffer, cancelTreaty, factionMembers,
  factionStanding, fillRate, joinAlliance, leaveAlliance, marketOffers, offerSlots, postOffer, proposeTreaty, rankings, readMessages,
  rivalById, rivalLevel, sendGift, stationTribute, treatyCost, writeLetter, type FactionId, type RankKey, type TreatyId,
  buyMercenaries, mercenaryOffers, seaMinutes, friendOf, enemyOf,
} from '@/lib/game/rivals'
import { luxuryIcons, resourceIcons } from './game-widgets'
import { UnitFigure } from './unit-art'
import { UnitPicker } from './ikariam-panels'
import { WorkforceSlider } from './workforce'
import { KeresteArt, NufusArt } from './resource-art'
import { RulerCrest } from './profile-panel'
import { GoalCard, RewardTokens } from './goal-card'
import { flyGoods } from '@/lib/fx'
import { buildingImage } from '@/lib/asset'
import { SEASONS, seasonWeek } from '@/lib/game/events'
import { profileOf, rivalHeraldry } from '@/lib/game/profile'
import { t } from '@/lib/i18n/tr'

export type Op = (e: Empire, now: number) => { empire: Empire; error?: string }
export type Run = (op: Op, ok?: string) => void

const num = (n: number) => Math.floor(n).toLocaleString('tr-TR')
const clock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000)), h = Math.floor(s / 3600)
  return h ? `${h} sa ${Math.floor(s / 60) % 60} dk` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
const mutate = (fn: (e: Empire, now: number) => string | undefined): Op => (e, now) => {
  const next = advanceEmpire(e, now)
  const error = fn(next, now)
  return { empire: next, error }
}

/* ------------------------------------------------------------ DİVANHANE */

export function CityAdmin({ empire, game, now, onCommand, run }: { empire: Empire; game: Game; now: number; onCommand: (c: Command) => void; run: Run }) {
  const city = activeCity(empire)
  const [name, setName] = useState(city.name)
  const gov = game.government
  const locked = !game.research.includes('devlet')
  const cooling = gov.changedAt > 0 && now < gov.changedAt + GOVERNMENT_COOLDOWN_MS
  return <>
    <section className="empire-section">
      <h3><Pencil className="size-4" /> Şehrin adı</h3>
      <div className="batch-row">
        <input id="city-name" className="text-input" value={name} maxLength={24} onChange={e => setName(e.target.value)} aria-label="Şehir adı" />
        <GameButton size="sm" disabled={name.trim() === city.name} onClick={() => run((e, t) => renameCity(e, city.id, name, t), 'Şehrin yeni adı ilan edildi.')}>Değiştir</GameButton>
      </div>
    </section>
    <section className="empire-section">
      <h3><Crown className="size-4" /> Yönetim biçimi · {GOVERNMENTS[gov.id].name}</h3>
      {anarchy(game) && <p className="requirement">Kargaşa sürüyor: üretim -%25, huzur -50 · {clock(gov.anarchyUntil - now)}</p>}
      {locked && <p className="fine-print">Yönetim biçimini değiştirmek için Devlet Nizamı araştırması gerekli.</p>}
      <div className="gov-list">{GOVERNMENT_IDS.map(id => <article key={id} className={`gov-card${gov.id === id ? ' gov-active' : ''}`}>
        <AtlasArt atlas="culture" index={GOVERNMENT_IDS.indexOf(id)} size={52} /><strong>{GOVERNMENTS[id].name}</strong>
        <ul>{GOVERNMENTS[id].effects.map(e => <li key={e}>{e}</li>)}</ul>
        {gov.id === id ? <span className="gov-badge"><Check className="size-3" /> Yürürlükte</span>
          : <GameButton size="sm" variant="outline" disabled={locked || cooling || game.resources.gold < governmentCost(game)}
            onClick={() => onCommand({ type: 'government', id })}>İlan et</GameButton>}
      </article>)}</div>
      <p className="fine-print">Değişiklik {num(governmentCost(game))} akçe tutar ve {ANARCHY_MS / 60_000} dakika kargaşa getirir. {cooling ? `Yeni değişiklik için ${clock(gov.changedAt + GOVERNMENT_COOLDOWN_MS - now)} bekle.` : `Sonra ${GOVERNMENT_COOLDOWN_MS / 3600_000} saat yeniden değiştirilemez.`}</p>
    </section>
  </>
}

/** YIKIM onayı (Ikariam'daki yık düğmesi): bir seviye ya da tamamen. */
export function DemolishConfirm({ game, id, onCommand, onClose }: { game: Game; id: BuildingId; onCommand: (c: Command) => void; onClose: () => void }) {
  const level = game.buildings[id]
  if (id === 'divan' || level < 1) return null
  return <section className="demolish-sheet" role="alertdialog" aria-label={`${BUILDINGS[id].name} yıkılsın mı?`}>
    <strong><Trash2 className="size-4" /> {BUILDINGS[id].name} yıkılsın mı?</strong>
    <p>Harcanan kaynak geri gelmez. {level > 1 ? `Bir seviye yıkarsan ${level - 1}. seviyeye iner.` : 'Arsa boşalır.'}</p>
    <div className="batch-row">
      {level > 1 && <GameButton size="sm" variant="destructive" onClick={() => { onCommand({ type: 'demolish', id }); onClose() }}>Bir seviye yık</GameButton>}
      <GameButton size="sm" variant="destructive" onClick={() => { onCommand({ type: 'demolish', id, all: true }); onClose() }}>Tamamen yık</GameButton>
      <GameButton size="sm" variant="outline" onClick={onClose}>{t.action.cancel}</GameButton>
    </div>
  </section>
}

export function TavernPanel({ game, onCommand }: { game: Game; onCommand: (c: Command) => void }) {
  if (game.buildings.kahvehane < 1) return null
  const level = tavernLevel(game)
  return <section className="empire-section">
    <h3><Coffee className="size-4" /> İkram · {level} / {game.buildings.kahvehane}</h3>
    <input type="range" min={0} max={game.buildings.kahvehane} value={level} aria-label="İkram seviyesi"
      onChange={e => onCommand({ type: 'tavern', value: Number(e.target.value) })} />
    <p className="fine-print">Her ikram seviyesi dakikada {formatRate(wineConsumption({ ...game, tavern: 1 }))} kahve harcar ve huzuru artırır. Şu an dakikada {formatRate(wineConsumption(game))} kahve.</p>
  </section>
}

export function ExperimentPanel({ game, onCommand }: { game: Game; onCommand: (c: Command) => void }) {
  if (!game.research.includes('deney')) return null
  return <section className="empire-section">
    <h3><FlaskConical className="size-4" /> Deneyler</h3>
    <p className="fine-print">100 kristal → 150 ilim. Ambarda {num(game.luxury.kristal)} kristal.</p>
    <div className="batch-row">{[1, 5, 10].map(n => <GameButton key={n} size="sm" variant="outline" disabled={game.luxury.kristal < n * 100}
      onClick={() => onCommand({ type: 'experiment', batches: n })}>{n * 100} kristal</GameButton>)}</div>
  </section>
}

export function ForestPanel({ game, onCommand }: { game: Game; onCommand: (c: Command) => void }) {
  const f = game.forest
  const cap = forestCapacity(game)
  const [gift, setGift] = useState(500)
  return <section className="empire-section">
    <h3><TreePine className="size-4" /> Ada ormanı · Sv. {f.level}</h3>
    <WorkforceSlider label="Oduncu" figure="oduncu" value={f.workers} cap={cap} idle={idleWorkers(game)}
      preview={n => { const v = forestProduction({ ...game, forest: { ...f, workers: n } }); return { amount: v, icon: <KeresteArt className="workforce-icon" />, text: <><b>{num(v)}</b> kereste/dk</> } }}
      onCommit={n => onCommand({ type: 'foresters', value: n })} note="Her oduncu 4 kereste keser (şehir çarpanlarından önce)." />
    {f.level < FOREST_MAX_LEVEL && <>
      <div className="people-row-top"><span>Orman bağışı</span><span className="people-count">{num(f.wood)} / {num(forestUpgradeCost(f.level))}</span></div>
      <span className="people-meter"><span style={{ width: `${Math.min(100, f.wood / forestUpgradeCost(f.level) * 100)}%` }} /></span>
      <div className="batch-row">{[250, 500, 1000].map(n => <GameButton key={n} size="sm" variant={gift === n ? 'default' : 'outline'} onClick={() => setGift(n)}>{num(n)}</GameButton>)}
        <GameButton size="sm" disabled={game.resources.wood < gift} onClick={() => onCommand({ type: 'forestDonate', amount: gift })}>Bağışla</GameButton></div>
    </>}
  </section>
}

/* ------------------------------------------------------------ GÜNLÜK */

export function DailyPanel({ empire, run }: { empire: Empire; run: Run }) {
  const d = empire.daily
  if (!d) return null
  const loginDone = d.loginDay === d.day
  const nextStreak = loginDone ? d.streak : d.streak + 1
  const reward = loginReward(Math.max(1, nextStreak))
  return <section className="empire-section">
    <h3><CalendarCheck className="size-4" /> Günlük görevler</h3>
    <div className="daily-login">
      <DailyArt task="login" />
      <span><strong>Günlük giriş · {Math.max(1, nextStreak)}. gün</strong><small>{num(reward.gold)} akçe · {num(reward.wood)} kereste (7 güne kadar büyür)</small></span>
      <GameButton size="sm" disabled={loginDone} onClick={ev => { flyGoods(ev.currentTarget, { gold: reward.gold, wood: reward.wood }); run(mutate((e, now) => claimLogin(e, now)), 'Giriş ödülü hazinede.') }}>{loginDone ? 'Alındı' : 'Al'}</GameButton>
    </div>
    {d.tasks.map(id => {
      const t = DAILY_TASKS.find(x => x.id === id)!
      const p = taskProgress(empire, id), done = d.claimed.includes(id)
      return <GoalCard key={id} art={<DailyArt task={t.key} />} title={t.text} value={p} need={t.need}
        goods={t.reward} reward={<RewardTokens reward={t.reward} />} state={done ? 'done' : p >= t.need ? 'ready' : 'run'}
        onClaim={() => run(mutate((e, now) => claimTask(e, id, now)), 'Günlük görev ödülü hazinede.')} />
    })}
    <p className="fine-print">Görevler her gün (UTC gece yarısı) yenilenir.</p>
  </section>
}

/** BU HAFTA (V2 Faz 5.6): haftalık olayın adı, etkisi ve kalan süresi. */
export function SeasonCard({ now }: { now: number }) {
  const w = seasonWeek(now)
  const next = seasonWeek(w.end + 1)
  const days = Math.max(0, Math.ceil((w.end - now) / 86_400_000))
  return <section className={`season-card${w.id ? ` is-${w.id}` : ''}`}>
    <span className="eyebrow"><CalendarCheck className="size-3" /> BU HAFTA</span>
    {w.id ? <><strong>{SEASONS[w.id].name}</strong><p>{SEASONS[w.id].effect}</p></> : <><strong>Sakin hafta</strong><p>Bu hafta özel bir olay yok.</p></>}
    <small>{days} gün kaldı{next.id ? ` · sonra: ${SEASONS[next.id].name}` : ''}</small>
  </section>
}

/** Büyük hedefin kartındaki bina görseli (V2 Faz 2.8). */
const MILESTONE_ART: Record<string, string> = {
  divan10: 'divan', divan15: 'divan', divan20: 'divan', colony2: 'liman', colony4: 'liman', research15: 'medrese', research40: 'medrese',
  army200: 'kisla', raids10: 'kisla', walls10: 'surlar', pop2000: 'konut', saray5: 'saray',
}
/** BÜYÜK HEDEFLER: başlangıçtan sonra aylarca sürecek ödüllü kilometre taşları. */
export function MilestonesPanel({ empire, run }: { empire: Empire; run: Run }) {
  const got = new Set(empire.milestones ?? [])
  // Sıra: ödülü bekleyenler, sürenler (ilerlemeye göre), alınanlar en sonda.
  const list = [...MILESTONES].sort((a, b) => {
    const rank = (m: typeof a) => got.has(m.id) ? 2 : milestoneDone(empire, m) ? 0 : 1
    return rank(a) - rank(b) || milestoneProgress(empire, b) / b.need - milestoneProgress(empire, a) / a.need
  })
  return <section className="empire-section">
    <h3><Crown className="size-4" /> Büyük hedefler · {got.size} / {MILESTONES.length}</h3>
    {list.map(m => {
      const p = milestoneProgress(empire, m), done = got.has(m.id), ready = !done && milestoneDone(empire, m)
      return <GoalCard key={m.id} art={<img src={buildingImage(MILESTONE_ART[m.id] ?? 'divan', 8)} alt="" width={64} height={64} loading="lazy" />}
        title={m.title} text={m.text} value={p} need={m.need} goods={m.reward} reward={<RewardTokens reward={m.reward} />}
        state={done ? 'done' : ready ? 'ready' : 'run'} onClaim={() => run(mutate((e, now) => claimMilestone(e, m.id, now)), `${m.title}: ödül hazinede.`)} />
    })}
  </section>
}

/* ------------------------------------------------------------ BİRLİKLER */

export function DeployPanel({ empire, run }: { empire: Empire; run: Run }) {
  const city = activeCity(empire)
  const others = empire.cities.filter(c => c.id !== city.id)
  const [to, setTo] = useState(others[0]?.id ?? '')
  const [pick, setPick] = useState<Partial<Record<UnitId, number>>>({})
  if (!others.length) return null
  const free = availableUnits(empire, city.id)
  const target = empire.cities.find(c => c.id === to)
  const ships = target && target.islandId !== city.islandId ? transportsNeeded(pick) : 0
  return <section className="empire-section">
    <h3><Truck className="size-4" /> Birlik aktar</h3>
    <label className="field-row">Hedef şehir<select value={to} onChange={e => setTo(e.target.value)}>
      {others.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
    <UnitPicker ids={UNIT_IDS.filter(id => id !== 'nakliye')} free={free} pick={pick} onPick={setPick} />
    {ships > 0 && <p className="fine-print">{ships} nakliye gemisi gerekli · boşta {free.nakliye}.</p>}
    <GameButton size="sm" disabled={!to || !Object.values(pick).some(n => (n ?? 0) > 0)}
      onClick={() => { run((e, now) => dispatchDeploy(e, to, pick, now), 'Birlikler yola çıktı.'); setPick({}) }}>{t.action.send}</GameButton>
    <p className="fine-print">Birlikler hedef şehrin halkından yer ister; sığmayanlar geri döner.</p>
  </section>
}

export function MissionList({ empire, now, run }: { empire: Empire; now: number; run: Run }) {
  const city = activeCity(empire)
  const missions = (empire.missions ?? []).filter(m => m.cityId === city.id)
  if (!missions.length) return null
  const label: Record<string, string> = { raid: 'Sefer', spy: 'Casus', piracy: 'Korsan seferi', deploy: 'Aktarma', occupy: 'İşgal', blockade: 'Abluka', support: 'Destek' }
  return <section className="empire-section">
    <h3><Flag className="size-4" /> Yoldaki ve konuşlu birlikler</h3>
    {missions.map(m => <MissionRow key={m.id} m={m} empire={empire} now={now} run={run} label={label[m.kind]} />)}
  </section>
}

function MissionRow({ m, empire, now, run, label }: { m: Mission; empire: Empire; now: number; run: Run; label: string }) {
  const [watch, setWatch] = useState(false)
  const lb = m.battle
  return <article className={`mission-row${lb ? ' is-fighting' : ''}`}>
    <div className="mission-row-top">
      <span><strong>{label} · {m.kind === 'deploy' ? empire.cities.find(c => c.id === m.npcId)?.name : targetName(m.npcId)}</strong>
        <small>{lb ? `Savaşta · ${lb.stage === 'naval' ? 'deniz' : 'kara'} · tur ${lb.state.round} · sıradaki tur ${clock(lb.nextAt - now)}`
          : m.stationed && m.kind === 'support' ? `Müttefik şehri koruyor · ${troopList(m.units)}`
          : m.stationed && m.kind === 'spy' ? `İçeride ${m.units.casus ?? 0} casus${m.spyTask ? ` · görev ${clock(m.spyTask.at - now)}` : ' · görev bekliyor'}`
          : m.stationed ? `Konuşlu · saatte ${num(stationTribute(empire, m.npcId, m.kind as 'occupy' | 'blockade', now))} akçe haraç · birikmiş ${num(m.loot.gold)}`
          : m.resolved ? `Dönüş ${clock(m.returnAt - now)}` : `Varış ${clock(m.arriveAt - now)}`}</small></span>
      {lb && <GameButton size="sm" variant="outline" onClick={() => setWatch(w => !w)}>{watch ? t.action.close : t.action.watch}</GameButton>}
      {lb && <GameButton size="sm" variant="destructive" onClick={() => run((e, t) => retreatMission(e, m.id, t), 'Ordu geri çekiliyor.')}>Geri çekil</GameButton>}
      {m.stationed && <GameButton size="sm" variant="outline" onClick={() => run((e, t) => recallMission(e, m.id, t), 'Birlikler geri çağrıldı.')}>Geri çağır</GameButton>}
    </div>
    {lb && watch && <BattleView stored={lb.info} live={{ round: lb.state.round, nextAt: lb.nextAt, now }} />}
  </article>
}

/* ------------------------------------------------------------ RAKİP */

export function RivalDiplomacy({ empire, rivalId, now, run }: { empire: Empire; rivalId: string; now: number; run: Run }) {
  const r = rivalById(rivalId)!
  const s = empire.world?.rivals[rivalId] ?? { relation: 0, treaties: [] as TreatyId[] }
  const [gift, setGift] = useState(500)
  return <section className="empire-section">
    <h3><RivalPortrait id={rivalId} size={64} /> Diplomasi · ilişki {s.relation}</h3>
    <span className="relation-meter"><span style={{ left: `${(s.relation + 100) / 2}%` }} /></span>
    {(Object.keys(TREATIES) as TreatyId[]).map(t => <article key={t} className="mission-row">
      <span><strong>{TREATIES[t].name}</strong><small>{TREATIES[t].description} {s.treaties.includes(t) ? '' : `Gereken ilişki ~${TREATIES[t].need} · ${num(treatyCost(empire, r, now))} akçe.`}</small></span>
      {s.treaties.includes(t)
        ? <GameButton size="sm" variant="outline" onClick={() => run((e, x) => cancelTreaty(e, rivalId, t, x), 'Anlaşma bozuldu.')}>Boz</GameButton>
        : <GameButton size="sm" onClick={() => run((e, x) => proposeTreaty(e, rivalId, t, x), 'Anlaşma imzalandı.')}>Teklif et</GameButton>}
    </article>)}
    <div className="batch-row"><Gift className="size-4" />
      {[500, 2000, 5000].map(n => <GameButton key={n} size="sm" variant={gift === n ? 'default' : 'outline'} onClick={() => setGift(n)}>{num(n)}</GameButton>)}
      <GameButton size="sm" onClick={() => run((e, x) => sendGift(e, rivalId, gift, x), 'Hediye yola çıktı.')}>Hediye gönder</GameButton></div>
    <div className="batch-row"><Mail className="size-4" />
      <GameButton size="sm" variant="outline" onClick={() => run((e, x) => writeLetter(e, rivalId, 'selam', x), 'Mektup gönderildi.')}>Selam</GameButton>
      <GameButton size="sm" variant="outline" onClick={() => run((e, x) => writeLetter(e, rivalId, 'tehdit', x), 'Tehdit mektubu gönderildi.')}>Tehdit</GameButton>
      <GameButton size="sm" variant="outline" onClick={() => run((e, x) => writeLetter(e, rivalId, 'harac', x), 'Haraç istendi.')}>Haraç iste</GameButton></div>
    <p className="rival-bonds">
      <span><small>Dostu</small><strong>{friendOf(r.id)?.city ?? '—'}</strong></span>
      <span><small>Düşmanı</small><strong>{enemyOf(r.id)?.city ?? '—'}</strong></span>
    </p>
    <p className="fine-print">{r.ruler} bir yapay rakiptir ({STYLE_NAMES[r.style]}, {FACTIONS[r.faction].name}). Dostuna saldırırsan o da sana kin tutar; düşmanını yağmalarsan minnet duyar. Mektuplarında geçmişi anar. Yağma ilişkiyi düşürür ve intikam baskını getirir; hediye ve selam ilişkiyi yükseltir.</p>
  </section>
}

export function RivalWar({ empire, onOccupy, onBlockade }: {
  empire: Empire; rivalId: string
  onOccupy: (units: Partial<Record<UnitId, number>>) => void; onBlockade: (units: Partial<Record<UnitId, number>>) => void
}) {
  const city = activeCity(empire)
  const free = availableUnits(empire, city.id)
  const [ships, setShips] = useState<Partial<Record<UnitId, number>>>({})
  const warships = UNIT_IDS.filter(id => UNITS[id].branch === 'deniz' && UNITS[id].role !== 'transport')
  const [troops, setTroops] = useState<Partial<Record<UnitId, number>>>({})
  const land = UNIT_IDS.filter(id => UNITS[id].branch === 'kara' && UNITS[id].role !== 'spy')
  return <>
    <section className="empire-section">
      <h3><Swords className="size-4" /> İşgal et</h3>
      <Hint>Kazanırsan ordu şehirde kalır: her saat haraç toplar, hükümdar sana saldıramaz. Geri çağırınca haraçla döner.</Hint>
      <UnitPicker ids={land} free={free} pick={troops} onPick={setTroops} step={5} />
      <GameButton size="sm" disabled={!Object.values(troops).some(n => (n ?? 0) > 0)} onClick={() => { onOccupy(troops); setTroops({}) }}>İşgale çık</GameButton>
    </section>
    <section className="empire-section">
      <h3><Anchor className="size-4" /> Abluka</h3>
      <Hint>Savaş gemileri önce donanmasıyla savaşır; kazanırsa liman kapanır: pazarı kapanır, donanması çıkamaz, filo saatlik liman haracı toplar.</Hint>
      <UnitPicker ids={warships} free={free} pick={ships} onPick={setShips} />
      <GameButton size="sm" disabled={!Object.values(ships).some(n => (n ?? 0) > 0)} onClick={() => { onBlockade(ships); setShips({}) }}>Limanı kapat</GameButton>
    </section>
  </>
}

/** Müttefik hükümdarın şehrine destek birliği (ittifak üyesine saldırılamaz). */
export function RivalSupport({ empire, rivalId, now, run }: { empire: Empire; rivalId: string; now: number; run: Run }) {
  const city = activeCity(empire)
  const free = availableUnits(empire, city.id)
  const [pick, setPick] = useState<Partial<Record<UnitId, number>>>({})
  const target = targetInfo(empire, rivalId, now)!
  const overseas = target.islandId !== city.islandId
  const ships = overseas ? transportsNeeded(pick) : 0
  const here = (empire.missions ?? []).filter(m => m.kind === 'support' && m.npcId === rivalId && m.cityId === city.id)
  return <section className="empire-section">
    <h3><ShieldCheck className="size-4" /> Müttefike destek</h3>
    <Hint>{target.name} ittifak üyen. Birliklerin şehrinde konuşlanır ve karşı ittifak saldırırsa müttefikle birlikte savunur; zaferde ödül ve itibar kazanırsın. Bakımları senden düşer; Seferler panelinden geri çağırırsın.</Hint>
    {here.map(m => <p key={m.id} className="requirement"><ShieldCheck className="size-4" />{m.stationed ? `Konuşlu: ${troopList(m.units)}` : `Yolda: ${troopList(m.units)}`}</p>)}
    <UnitPicker ids={RAID_UNITS} free={free} pick={pick} onPick={setPick} step={5} />
    <UnitPicker ids={WARSHIPS} free={free} pick={pick} onPick={setPick} />
    {overseas && <p className={ships > free.nakliye ? 'requirement' : 'fine-print'}>Deniz aşırı: {ships} nakliye gemisi gerekli · boşta {free.nakliye}.</p>}
    <GameButton size="sm" disabled={!Object.values(pick).some(n => (n ?? 0) > 0) || ships > free.nakliye}
      onClick={() => { run((e, t) => dispatchSupport(e, rivalId, pick, t), 'Destek birlikleri yola çıktı.'); setPick({}) }}><ShieldCheck data-icon="inline-start" />Destek gönder</GameButton>
  </section>
}

/* ------------------------------------------------------------ DÜNYA */

type Tab = 'rank' | 'diplo' | 'offers' | 'market' | 'news' | 'mail'
export function WorldPanel({ empire, now, run, onRival, initial = 'rank' }: { empire: Empire; now: number; run: Run; onRival: (id: string) => void; initial?: Tab }) {
  const [tab, setTab] = useState<Tab>(initial)
  const unread = (empire.world?.messages ?? []).filter(m => !m.read).length
  const offers = (empire.world?.proposals ?? []).filter(p => p.until > now).length
  const badge = (key: Tab) => key === 'mail' ? unread : key === 'offers' ? offers : 0
  return <div className="advisor-panel world-panel">
    <p className="fine-print">{'Bu dünyadaki hükümdarlar yapay rakiplerdir, gerçek oyuncu değildir. Çevrimiçi rakipler için oyun sunucusu gerekir.'}</p>
    <div className="world-tabs" role="group" aria-label="Dünya">
      {([['rank', 'Sıralama', Trophy], ['diplo', 'Diplomasi', Handshake], ['offers', 'Teklifler', Gift], ['market', 'Pazar', Store], ['news', 'Haberler', Newspaper], ['mail', 'Mektup', Mail]] as const)
        .map(([key, label, Icon]) => <button key={key} type="button" aria-pressed={tab === key}
          aria-label={badge(key) ? `${label}: ${badge(key)} yeni` : undefined} onClick={() => {
          setTab(key)
          if (key === 'mail' && unread) run((e, x) => readMessages(e, x))
        }}><Icon className="size-5" /><span>{label}</span>{badge(key) > 0 && <b className="world-tab-badge" data-tiny>{badge(key)}</b>}</button>)}
    </div>
    {tab === 'rank' && <Rankings empire={empire} now={now} onRival={onRival} />}
    {tab === 'diplo' && <Diplomacy empire={empire} now={now} run={run} onRival={onRival} />}
    {tab === 'market' && <TradeCenter empire={empire} now={now} run={run} onRival={onRival} />}
    {tab === 'mail' && <Inbox empire={empire} onRival={onRival} />}
    {tab === 'offers' && <ProposalsPanel empire={empire} now={now} run={run} onRival={onRival} />}
    {tab === 'news' && <NewsPanel empire={empire} now={now} onRival={onRival} />}
  </div>
}

function Rankings({ empire, now, onRival }: { empire: Empire; now: number; onRival: (id: string) => void }) {
  const [key, setKey] = useState<RankKey>('total')
  const rows = rankings(empire, now, key)
  return <section className="empire-section">
    <div className="rank-tabs" role="group" aria-label="Sıralama kolu">{([['total', 'Genel'], ['builder', 'İnşaatçı'], ['military', 'Askerî'], ['offense', 'Saldırı'], ['defense', 'Savunma'], ['science', 'Bilim'], ['gold', 'Hazine'], ['trade', 'Ticaret']] as const).map(([k, l]) =>
      <GameButton key={k} size="sm" variant={key === k ? 'default' : 'outline'} aria-pressed={key === k} onClick={() => setKey(k)}>{l}</GameButton>)}</div>
    <RankPodium empire={empire} rows={rows.slice(0, 3)} score={key} onRival={onRival} />
    <ol className="rank-table" start={4}>{rows.slice(3).map((s, i) => <li key={s.name + i} className={s.you ? 'rank-you' : undefined}>
      <span className="rank-no">{i + 4}</span>
      <button type="button" disabled={s.you} onClick={() => s.rivalId && onRival(s.rivalId)}>
        <strong>{s.name}</strong><small>{s.you ? `${s.ruler} · sen` : `${s.ruler} · yapay rakip`}</small></button>
      <span className="rank-score">{num(s[key])}</span>
    </li>)}</ol>
  </section>
}

/** İlk üç kürsüde: ortada birinci, armalarıyla. */
function RankPodium({ empire, rows, score, onRival }: { empire: Empire; rows: ReturnType<typeof rankings>; score: RankKey; onRival: (id: string) => void }) {
  const me = profileOf(empire)
  const order = [1, 0, 2].filter(i => rows[i])
  return <ol className="rank-podium" aria-label="İlk üç">{order.map(i => {
    const s = rows[i]
    const h = s.you ? { crest: me.crest, color: me.color } : rivalHeraldry(s.rivalId ?? '')
    return <li key={s.name} className={`podium-${i + 1}${s.you ? ' rank-you' : ''}`} value={i + 1}>
      <button type="button" disabled={s.you} onClick={() => s.rivalId && onRival(s.rivalId)} aria-label={`${i + 1}. ${s.name}, ${num(s[score])} puan${s.you ? ', sen' : ', yapay rakip'}`}>
        <RulerCrest crest={h.crest} color={h.color} size={i === 0 ? 56 : 44} />
        <strong>{s.name}</strong>
        <small>{s.you ? 'sen' : 'yapay rakip'}</small>
        <b>{num(s[score])}</b>
      </button>
      <span className="podium-step" aria-hidden="true">{i + 1}</span>
    </li>
  })}</ol>
}

function Diplomacy({ empire, now, run, onRival }: { empire: Empire; now: number; run: Run; onRival: (id: string) => void }) {
  const alliance = empire.world?.alliance ?? null
  return <>
    <section className="empire-section">
      <h3><NufusArt className="size-4" /> İttifak {alliance ? `· ${FACTIONS[alliance].name}` : ''}</h3>
      {(Object.keys(FACTIONS) as FactionId[]).map(f => <article key={f} className="mission-row">
        <span><strong>{FACTIONS[f].name}</strong><small>“{FACTIONS[f].motto}” · {factionMembers(f).map(r => r.city).join(', ')} · ortalama ilişki {factionStanding(empire, f)}</small></span>
        {alliance === f ? <GameButton size="sm" variant="outline" onClick={() => run((e, x) => leaveAlliance(e, x), 'İttifaktan ayrıldın.')}>Ayrıl</GameButton>
          : <GameButton size="sm" disabled={!!alliance || !!empire.world?.pact} onClick={() => run((e, x) => joinAlliance(e, f, x), 'İttifaka katıldın.')}>Katıl</GameButton>}
      </article>)}
      <Hint>Üyelik için Elçilik 3. seviye ve ittifakla ortalama 5 ilişki gerekir. Üyeler sana saldırmaz, baskında yardım gönderir; öbür ittifak soğur.</Hint>
    </section>
    <section className="empire-section">
      <h3><Handshake className="size-4" /> Hükümdarlar</h3>
      {RIVALS.map(r => {
        const s = empire.world?.rivals[r.id]
        return <button key={r.id} type="button" className="rival-row" onClick={() => onRival(r.id)}>
          <span><strong>{r.city}</strong><small>{r.ruler} · {STYLE_NAMES[r.style]} · {FACTIONS[r.faction].name} · Sv. {rivalLevel(empire, r, now)}</small></span>
          <span className={(s?.relation ?? 0) >= 0 ? 'report-win' : 'report-loss'}>{s?.relation ?? 0}</span>
          <small>{(s?.treaties ?? []).map(t => TREATIES[t].name.split(' ')[0]).join(' · ') || '—'}</small>
          {rivalWarLine(empire, r.id) && <small className="rival-war"><Swords className="size-3" />{rivalWarLine(empire, r.id)}</small>}
        </button>
      })}
    </section>
    <section className="empire-section">
      <h3><Swords className="size-4" /> Yapay rakip temposu</h3>
      <PaceSetting empire={empire} run={run} />
    </section>
  </>
}

/**
 * TİCARET MERKEZİ (Ikariam'daki sekmeler): mal ticareti (al/sat, mal ve
 * menzil süzgeci), asker ticareti (paralı asker), ticaret anlaşmaları ve
 * kendi tekliflerin. Karşı taraf yapay rakip hükümdarlardır.
 */
type TradeTab = 'goods' | 'troops' | 'treaty' | 'own'
export function TradeCenter({ empire, now, run, onRival }: { empire: Empire; now: number; run: Run; onRival?: (id: string) => void }) {
  const [tab, setTab] = useState<TradeTab>('goods')
  return <div className="trade-center">
    <div className="world-tabs trade-tabs" role="group" aria-label="Ticaret Merkezi">
      {([['goods', 'Mal ticareti', Store], ['troops', 'Asker ticareti', Swords], ['treaty', 'Anlaşmalar', Handshake], ['own', 'Tekliflerin', Send]] as const).map(([k, l, Icon]) =>
        <button key={k} type="button" aria-pressed={tab === k} onClick={() => setTab(k)}><Icon className="size-5" /><span>{l}</span></button>)}
    </div>
    {tab === 'goods' && <GoodsTrade empire={empire} now={now} run={run} />}
    {tab === 'troops' && <TroopTrade empire={empire} now={now} run={run} />}
    {tab === 'treaty' && <TradeTreaties empire={empire} now={now} run={run} onRival={onRival} />}
    {tab === 'own' && <OwnOffers empire={empire} now={now} run={run} />}
  </div>
}
function GoodsTrade({ empire, now, run }: { empire: Empire; now: number; run: Run }) {
  const city = activeCity(empire)
  const [side, setSide] = useState<'sell' | 'buy'>('sell')
  const [good, setGood] = useState<Good | 'all'>('all')
  const [radius, setRadius] = useState<'ada' | 'yakin' | 'hepsi'>('hepsi')
  const limit = radius === 'ada' ? 2.01 : radius === 'yakin' ? 4 : Infinity
  const offers = marketOffers(empire, now).map(o => ({ o, r: rivalById(o.rivalId)!, dist: seaMinutes(rivalById(o.rivalId)!.islandId, city.islandId) }))
    .filter(x => x.o.side === side && (good === 'all' || x.o.good === good) && x.dist <= limit)
    .sort((a, b) => a.o.price - b.o.price || a.dist - b.dist)
  return <section className="empire-section">
    <h3><Store className="size-4" /> Ucuz mal tarayıcısı · saat başı yenilenir</h3>
    <div className="trade-filters">
      <div className="seg" role="radiogroup" aria-label="Yön">
        <button type="button" role="radio" aria-checked={side === 'sell'} onClick={() => setSide('sell')}>Satın al</button>
        <button type="button" role="radio" aria-checked={side === 'buy'} onClick={() => setSide('buy')}>Sat</button>
      </div>
      <select aria-label="Mal" value={good} onChange={e => setGood(e.target.value as Good | 'all')}>
        <option value="all">Bütün mallar</option>{MARKET_GOODS.map(x => <option key={x} value={x}>{GOOD_NAMES[x]}</option>)}
      </select>
      <select aria-label="Arama çapı" value={radius} onChange={e => setRadius(e.target.value as 'ada' | 'yakin' | 'hepsi')}>
        <option value="ada">Ada çevresi</option><option value="yakin">Yakın adalar</option><option value="hepsi">Bütün dünya</option>
      </select>
    </div>
    {!offers.length ? <p className="fine-print">Şu an bu süzgece uyan teklif yok. Süzgeci genişlet ya da bir saat sonra yeniden bak.</p>
      : <div className="trade-table">{offers.map(({ o, r, dist }) => <article key={o.id} className="trade-row">
        <span className="trade-good">{(() => { const I = (LUXURY_IDS as readonly string[]).includes(o.good) ? luxuryIcons[o.good as Luxury] : resourceIcons[o.good as Resource]; return <I className="trade-icon" /> })()}</span>
        <span className="trade-main"><strong>{num(o.amount)} {GOOD_NAMES[o.good]}</strong><small>{r.city} · {r.ruler} (yapay rakip) · ~{Math.round(dist)} dk</small></span>
        <span className="trade-price"><b>{o.price}</b><small>akçe/birim</small><em className={o.price <= FAIR_PRICE[o.good] === (side === 'sell') ? 'is-good' : 'is-bad'}>adil {FAIR_PRICE[o.good]}</em></span>
        <GameButton size="sm" variant={side === 'sell' ? 'default' : 'outline'} onClick={() => run((e, x) => acceptOffer(e, o.id, x), side === 'sell' ? 'Mal yolda.' : 'Mal yola çıktı; bedeli gelecek.')}>{side === 'sell' ? `Al · ${num(o.amount * o.price)}` : `Sat · ${num(o.amount * o.price)}`}</GameButton>
      </article>)}</div>}
  </section>
}
function TroopTrade({ empire, now, run }: { empire: Empire; now: number; run: Run }) {
  const offers = mercenaryOffers(empire, now)
  return <section className="empire-section">
    <h3><Swords className="size-4" /> Paralı askerler · saat başı yenilenir</h3>
    {!offers.length ? <p className="fine-print">Şu an asker satan hükümdar yok.</p> : offers.map(o => {
      const r = rivalById(o.rivalId)!, u = UNITS[o.unit]
      return <article key={o.id} className="trade-row">
        <span className="trade-good"><UnitFigure id={o.unit} size={44} /></span>
        <span className="trade-main"><strong>{o.count} {u.name}</strong><small>{r.city} · {r.ruler} (yapay rakip) · {u.pop * o.count} vatandaş yer</small></span>
        <span className="trade-price"><b>{num(o.price)}</b><small>akçe/adet</small></span>
        <GameButton size="sm" onClick={() => run((e, x) => buyMercenaries(e, o.id, x), `${o.count} ${u.name} sancağına katıldı.`)}>Al · {num(o.price * o.count)}</GameButton>
      </article>
    })}
    <Hint>Paralı askerler hemen şehre katılır; şehirde boşta vatandaş (barınak) ve garnizonda yer ister. Ticaret anlaşması olan hükümdar %10 ucuz satar; ilişkisi çok kötü olan satmaz.</Hint>
  </section>
}
function TradeTreaties({ empire, now, run, onRival }: { empire: Empire; now: number; run: Run; onRival?: (id: string) => void }) {
  return <section className="empire-section">
    <h3><Handshake className="size-4" /> Ticaret anlaşmaları</h3>
    <p className="fine-print">{TREATIES.ticaret.description} İlişki en az {TREATIES.ticaret.need} olmalı.</p>
    <div className="trade-table">{RIVALS.map(r => {
      const s = empire.world?.rivals[r.id]
      const on = s?.treaties.includes('ticaret')
      return <article key={r.id} className="trade-row">
        <span className="trade-main"><strong>{r.city}</strong><small>{r.ruler} (yapay rakip) · ilişki {s?.relation ?? 0}</small></span>
        {on ? <em className="treaty-on"><Check className="size-3" /> Anlaşma var</em>
          : <GameButton size="sm" variant="outline" onClick={() => run((e, x) => proposeTreaty(e, r.id, 'ticaret', x), 'Ticaret anlaşması imzalandı.')}>Teklif et · {num(treatyCost(empire, r, now))}</GameButton>}
        {onRival && <GameButton size="sm" variant="ghost" aria-label={`${r.ruler} sayfası`} onClick={() => onRival(r.id)}><Eye /></GameButton>}
      </article>
    })}</div>
  </section>
}
function OwnOffers({ empire, now, run }: { empire: Empire; now: number; run: Run }) {
  const city = activeCity(empire)
  const g = city.game
  const mine = (empire.world?.offers ?? []).filter(o => o.cityId === city.id)
  const deliveries = (empire.world?.deliveries ?? []).filter(d => d.cityId === city.id)
  const [good, setGood] = useState<Good>('wood')
  const [amount, setAmount] = useState('500')
  const [price, setPrice] = useState(String(FAIR_PRICE.wood))
  return <>
    <section className="empire-section">
      <h3><Send className="size-4" /> Senin tekliflerin · {mine.length}/{offerSlots(g)}</h3>
      {offerSlots(g) < 1 ? <p className="fine-print">Kendi satış teklifin için Ticaret Merkezi kur.</p> : <div className="empire-shipment-form">
        <label>Mal<select value={good} onChange={e => { setGood(e.target.value as Good); setPrice(String(FAIR_PRICE[e.target.value as Good])) }}>
          {MARKET_GOODS.map(x => <option key={x} value={x}>{GOOD_NAMES[x]}</option>)}</select></label>
        <label>Miktar<input type="number" min={1} value={amount} onChange={e => setAmount(e.target.value)} /></label>
        <label>Birim fiyat<input type="number" min={0.1} step={0.1} value={price} onChange={e => setPrice(e.target.value)} /></label>
        <GameButton size="sm" onClick={() => run((e, x) => postOffer(e, good, Number(amount), Number(price), x), 'Teklif Ticaret Merkezi\'nde.')}>Teklif ver</GameButton>
      </div>}
      {mine.map(o => <article key={o.id} className="mission-row">
        <span><strong>{num(o.left)} / {num(o.amount)} {GOOD_NAMES[o.good]} · {o.price} akçe</strong><small>Dakikada ~{formatRate(fillRate(empire, o))} birim satılıyor</small></span>
        <GameButton size="sm" variant="outline" onClick={() => run((e, x) => cancelOffer(e, o.id, x), 'Teklif geri çekildi.')}>Geri çek</GameButton>
      </article>)}
      <Hint>Yapay tüccarlar adil fiyata yakın teklifleri hızlı alır; adil fiyatın %60 üstünde hiç almazlar.</Hint>
    </section>
    {deliveries.length > 0 && <section className="empire-section">
      <h3><Truck className="size-4" /> Yoldaki teslimatlar</h3>
      {deliveries.map(d => <p key={d.id} className="fine-print">{num(d.amount)} {GOOD_NAMES[d.good]} · {d.from} · {clock(d.eta - now)}</p>)}
    </section>}
  </>
}

function Inbox({ empire, onRival }: { empire: Empire; onRival: (id: string) => void }) {
  const messages = empire.world?.messages ?? []
  if (!messages.length) return <p className="fine-print">Henüz mektup yok. Hükümdarlara selam gönder ya da anlaşma teklif et.</p>
  return <section className="empire-section">{messages.map(m => <article key={m.id} className={`report-card${m.read ? '' : ' unread'}`}>
    <div className="report-head"><ScrollText className="size-4" /><strong>{m.subject}</strong>
      <time>{new Date(m.time).toLocaleString('tr-TR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</time></div>
    <p className="fine-print mail-from">{m.from}{m.rivalId ? ' (yapay rakip)' : ''}</p>
    <p className="mail-body">{m.body}</p>
    {m.rivalId && <GameButton size="sm" variant="ghost" onClick={() => onRival(m.rivalId!)}><Eye data-icon="inline-start" />Hükümdarı aç</GameButton>}
  </article>)}</section>
}

