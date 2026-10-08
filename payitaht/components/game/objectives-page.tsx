'use client'

import { useId, useRef, useState, type ReactNode } from 'react'
import { asset } from '@/lib/asset'
import { Castle, Gift, Check, ScrollText, ChevronRight, type IconProps } from './ui-art'
import { ApprovedArt } from './approved-court-art'
import { GameButton } from './game-button'
import { AkceArt, KeresteArt, IlimArt } from './resource-art'
import { OBJECTIVES, objectiveDone, formatNumber, type Game, type Resource } from '@/lib/game/engine'
import { advanceEmpire, type Empire } from '@/lib/game/empire'
import { DAILY_TASKS, claimLogin, claimTask, loginReward, taskProgress } from '@/lib/game/daily'
import { MILESTONES, claimMilestone, milestoneDone, milestoneProgress } from '@/lib/game/milestones'
import { seasonWeek, SEASONS } from '@/lib/game/events'
import { flyGoods } from '@/lib/fx'
import type { Run } from './world-panels'

function AchievementArt(_props: IconProps) { return <ApprovedArt name="laurel" /> }

const TABS = [
  { id: 'city', label: 'Şehir hedefi', Icon: Castle },
  { id: 'daily', label: 'Günlük', Icon: Gift },
  { id: 'milestones', label: 'Başarımlar', Icon: AchievementArt },
] as const
type Tab = typeof TABS[number]['id']
type State = 'ongoing' | 'ready' | 'claimed'
type Scene = 'capital' | 'builders' | 'scholar' | 'army' | 'harbour' | 'treasury'
type Reward = Partial<Record<Resource, number>>
const STATE_LABEL: Record<State, string> = { ongoing: 'Sürüyor', ready: 'Ödül hazır', claimed: 'Alındı' }
const REWARD_ICONS = { gold: AkceArt, wood: KeresteArt, knowledge: IlimArt }
const REWARD_NAMES = { gold: 'Akçe', wood: 'Kereste', knowledge: 'İlim' }
const scene = (id: Scene) => asset(`/images/game/quests/${id}.webp`)
const taskScene: Record<string, Scene> = { builds: 'builders', trained: 'army', researched: 'scholar', donated: 'builders', raids: 'army', spies: 'capital', piracy: 'harbour', shipments: 'harbour' }
const milestoneScene = (id: string): Scene => id.startsWith('research') ? 'scholar' : id.startsWith('colony') ? 'harbour' : id.startsWith('army') || id.startsWith('raids') || id.startsWith('walls') ? 'army' : 'capital'
const objectiveScene = (go: string): Scene => go === 'research' || go === 'medrese' || go === 'mabet' ? 'scholar' : go === 'army' || go === 'kisla' ? 'army' : go === 'island' || go === 'liman' ? 'harbour' : go === 'divan' || go === 'people' ? 'capital' : 'builders'

function Rewards({ reward }: { reward: Reward }) {
  return <div className="quest-prizes" aria-label="Görev ödülü">{(Object.entries(reward) as [Resource, number][]).map(([key, value]) => {
    const Icon = REWARD_ICONS[key]
    return <span className="quest-prize" key={key}><Icon aria-hidden="true" /><span><b>{formatNumber(value)}</b><small>{REWARD_NAMES[key]}</small></span></span>
  })}</div>
}
function Seal({ state }: { state: State }) {
  return <span className={`quest-seal is-${state}`}><span aria-hidden="true">{state === 'claimed' ? '✓' : state === 'ready' ? '✦' : '◷'}</span>{STATE_LABEL[state]}</span>
}
function Progress({ value, need, label }: { value: number; need: number; label: string }) {
  const current = Math.min(need, Math.max(0, value))
  return <div className="quest-progress"><span>{label}</span><b>{formatNumber(current)} / {formatNumber(need)}</b>
    <span className="quest-progress-rail" role="progressbar" aria-valuemin={0} aria-valuemax={need} aria-valuenow={current} aria-label={label}><i style={{ width: `${need > 0 ? current / need * 100 : 0}%` }} /></span>
  </div>
}
function Claim({ state, reward, onClaim, label = 'Ödülü al' }: { state: State; reward: Reward; onClaim: () => void; label?: string }) {
  return state === 'ready' ? <GameButton className="quest-claim" onClick={event => { flyGoods(event.currentTarget, reward); onClaim() }}><Gift painted aria-hidden="true" />{label}</GameButton>
    : <span className={`quest-action-status is-${state}`}>{state === 'claimed' ? <Check aria-hidden="true" /> : <ScrollText aria-hidden="true" />}{state === 'claimed' ? 'Ödül hazinene eklendi' : 'Görevi tamamla'}</span>
}
function RuleTitle({ children, count }: { children: ReactNode; count?: string }) {
  return <div className="quest-rule-title"><span aria-hidden="true">✧</span><h3>{children}</h3><span aria-hidden="true">✧</span>{count && <small>{count}</small>}</div>
}

/** A bespoke game screen; the engine remains responsible for every condition and payout. */
export function ObjectivesPage({ game, empire, foundingCity, cityName, onClaim, onGo, onFoundingCity, run }: {
  game: Game; empire: Empire | undefined; foundingCity: boolean; cityName: string
  onClaim: (id: string) => void; onGo: (id?: string) => void; onFoundingCity: () => void; run: Run
}) {
  const [tab, setTab] = useState<Tab>('city')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [readyOnly, setReadyOnly] = useState(false)
  const id = useId(), tabs = useRef<(HTMLButtonElement | null)[]>([])
  const first = OBJECTIVES.find(o => !game.claimed.includes(o.id))
  const objective = OBJECTIVES.find(o => o.id === selectedId) ?? first ?? OBJECTIVES[OBJECTIVES.length - 1]
  const objectiveState: State = game.claimed.includes(objective.id) ? 'claimed' : objectiveDone(game, objective.id) ? 'ready' : 'ongoing'
  const cityReady = foundingCity ? OBJECTIVES.filter(o => !game.claimed.includes(o.id) && objectiveDone(game, o.id)) : []
  const cityDone = OBJECTIVES.filter(o => game.claimed.includes(o.id) || objectiveDone(game, o.id)).length
  const daily = empire?.daily
  const tasks = daily?.tasks.map(key => DAILY_TASKS.find(t => t.id === key)!).filter(Boolean) ?? []
  const dailyReady = empire ? tasks.filter(t => !daily?.claimed.includes(t.id) && taskProgress(empire, t.id) >= t.need).length : 0
  const milestoneReady = empire ? MILESTONES.filter(m => !empire.milestones?.includes(m.id) && milestoneDone(empire, m)).length : 0
  const counts = { city: cityReady.length, daily: dailyReady + (daily && daily.loginDay !== daily.day ? 1 : 0), milestones: milestoneReady }
  const totalReady = Object.values(counts).reduce((sum, value) => sum + value, 0)
  const week = seasonWeek(game.updatedAt)
  const actDaily = (task?: string) => run((e, now) => { const next = advanceEmpire(e, now); return { empire: next, error: task ? claimTask(next, task, now) : claimLogin(next, now) } }, 'Ödül hazinene eklendi.')
  const actMilestone = (key: string) => run((e, now) => { const next = advanceEmpire(e, now); return { empire: next, error: claimMilestone(next, key, now) } }, 'Başarım ödülü hazinene eklendi.')
  const loginDone = !!daily && daily.loginDay === daily.day
  const previousDay = daily ? new Date(Date.parse(`${daily.day}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10) : ''
  const streak = Math.max(1, loginDone ? daily!.streak : daily?.loginDay === previousDay ? daily.streak + 1 : 1)
  const loginDay = Math.min(7, streak)
  const achievements = [...MILESTONES].sort((a, b) => {
    if (!empire) return 0
    const rank = (m: typeof a) => empire.milestones?.includes(m.id) ? 2 : milestoneDone(empire, m) ? 0 : 1
    return rank(a) - rank(b) || milestoneProgress(empire, b) / b.need - milestoneProgress(empire, a) / a.need
  }).filter(m => !readyOnly || (empire && !empire.milestones?.includes(m.id) && milestoneDone(empire, m)))

  return <div className="quest-court">
    <section className="quest-court-scene" aria-label="Divan görev dairesi">
      <img src={asset('/images/game/terrain/mandates-office.webp')} alt="" width={960} height={480} decoding="async" />
      <div className="quest-court-speech"><small>{cityName} Divanı</small><p>{totalReady ? 'Emeklerinin karşılığı seni bekliyor.' : 'Bir şehrin kaderi, tamamlanan her fermanla yazılır.'}</p></div>
    </section>
    <h2 className="quest-court-ribbon">Fermanlar ve görevler</h2>
    <div className="quest-court-tabs" role="tablist" aria-label="Görev defteri">{TABS.map(({ id: key, label, Icon }, index) => <button type="button" key={key}
      ref={el => { tabs.current[index] = el }} id={`${id}-${key}-tab`} role="tab" aria-selected={tab === key} aria-controls={`${id}-${key}-page`} tabIndex={tab === key ? 0 : -1}
      onClick={() => setTab(key)} onKeyDown={event => {
        let next = index
        if (event.key === 'ArrowRight') next = (index + 1) % TABS.length
        else if (event.key === 'ArrowLeft') next = (index + TABS.length - 1) % TABS.length
        else if (event.key === 'Home') next = 0
        else if (event.key === 'End') next = TABS.length - 1
        else return
        event.preventDefault(); setTab(TABS[next].id); tabs.current[next]?.focus()
      }}><Icon painted aria-hidden="true" /><span>{label}</span>{counts[key] > 0 && <b className="quest-tab-count" aria-label={`${counts[key]} ödül hazır`}>{counts[key]}</b>}</button>)}</div>
    <section className="quest-court-book" role="tabpanel" id={`${id}-${tab}-page`} aria-labelledby={`${id}-${tab}-tab`}>
      {tab === 'city' && <>
        <RuleTitle count={`${cityDone} / ${OBJECTIVES.length} tamamlandı`}>Şehrin yükselişi</RuleTitle>
        {!foundingCity ? <article className="quest-colony"><img src={scene('harbour')} alt="" /><h3>Yeni bir ufuk</h3><p>Bu koloni kendi yolunu çizecek. Başlangıç fermanların kurucu şehrinde seni bekliyor.</p><GameButton onClick={onFoundingCity}>Kurucu şehre git<ChevronRight aria-hidden="true" /></GameButton></article> : <>
          <div className="quest-chapters" aria-label="Şehir fermanları">{OBJECTIVES.map((o, index) => <button key={o.id} type="button" aria-label={`Ferman ${index + 1}: ${o.title}`} aria-pressed={objective.id === o.id}
            className={game.claimed.includes(o.id) ? 'is-claimed' : objectiveDone(game, o.id) ? 'is-ready' : ''} onClick={() => setSelectedId(o.id)}><span>{index + 1}</span>{game.claimed.includes(o.id) && <Check aria-hidden="true" />}</button>)}</div>
          <article className={`quest-feature is-${objectiveState}`}>
            <div className="quest-feature-picture"><img src={scene(objectiveScene(objective.go))} alt="" /><span className="quest-chapter-plaque">Ferman {OBJECTIVES.indexOf(objective) + 1}</span><Seal state={objectiveState} /><h3>{objective.title}</h3></div>
            <div className="quest-feature-body"><p>{objective.description}</p><div className="quest-ornament" aria-hidden="true">✧</div><span className="quest-reward-title">Fermanın mükâfatı</span><Rewards reward={{ gold: objective.reward }} />
              {objectiveState === 'ongoing' ? <GameButton className="quest-claim" onClick={() => onGo(objective.id)}><ScrollText painted aria-hidden="true" />Fermanı yerine getir<ChevronRight aria-hidden="true" /></GameButton> : <Claim state={objectiveState} reward={{ gold: objective.reward }} onClaim={() => onClaim(objective.id)} />}
            </div>
          </article>
          {cityReady.length > 1 && <div className="quest-treasury-call"><img src={scene('treasury')} alt="" /><span><b>{cityReady.length} ferman tamamlandı</b><small>{formatNumber(cityReady.reduce((sum, o) => sum + o.reward, 0))} akçe seni bekliyor</small></span><GameButton onClick={event => { flyGoods(event.currentTarget, { gold: cityReady.reduce((sum, o) => sum + o.reward, 0) }); cityReady.forEach(o => onClaim(o.id)) }}>Hepsini al</GameButton></div>}
          <Progress value={game.claimed.length} need={OBJECTIVES.length} label="Şehir fermanları · ödülü alınan" />
        </>}
      </>}
      {tab === 'daily' && <>
        <RuleTitle count={`${daily?.claimed.length ?? 0} / ${tasks.length} görev ödülü alındı`}>Bugünün fermanları</RuleTitle>
        {daily && <section className="quest-login">
          <div className="quest-login-head"><img src={scene('treasury')} alt="" /><span><small>DIVANIN ARMAĞANI</small><h3>{streak}. gün hediyesi</h3><p>Her dönüşün, hazinene bereket.</p></span><Seal state={loginDone ? 'claimed' : 'ready'} /></div>
          <div className="quest-login-days" aria-label="Yedi günlük giriş ödülü">{Array.from({ length: 7 }, (_, index) => <span key={index} className={index + 1 === loginDay ? 'is-current' : index + 1 < loginDay ? 'is-past' : ''}><small>{index + 1}. gün</small><AkceArt aria-hidden="true" /><b>{formatNumber(loginReward(index + 1).gold)}</b></span>)}</div>
          <div className="quest-login-foot"><Rewards reward={loginReward(streak)} /><GameButton disabled={loginDone} aria-label={loginDone ? 'Günlük giriş ödülü alındı' : 'Günlük giriş ödülünü al'} onClick={event => { flyGoods(event.currentTarget, loginReward(streak)); actDaily() }}>{loginDone ? 'Alındı' : 'Hediyeni al'}</GameButton></div>
        </section>}
        <div className="quest-daily-list">{empire && tasks.map(t => {
          const value = taskProgress(empire, t.id), state: State = daily?.claimed.includes(t.id) ? 'claimed' : value >= t.need ? 'ready' : 'ongoing'
          return <article key={t.id} className={`quest-daily-card is-${state}`}><div className="quest-daily-intro"><img src={scene(taskScene[t.key] ?? 'capital')} alt="" /><span><Seal state={state} /><h3>{t.text}</h3></span></div><Progress value={value} need={t.need} label="Görev ilerlemesi" /><footer><Rewards reward={t.reward} /><Claim state={state} reward={t.reward} onClaim={() => actDaily(t.id)} /></footer></article>
        })}</div>
        <aside className="quest-season"><span className="quest-season-seal"><ScrollText painted aria-hidden="true" /></span><div><small>BU HAFTA · {Math.max(0, Math.ceil((week.end - game.updatedAt) / 86_400_000))} gün kaldı</small><h3>{week.id ? SEASONS[week.id].name : 'Sakin hafta'}</h3><p>{week.id ? SEASONS[week.id].effect : 'Divan, şehrin gündelik işlerini takip ediyor.'}</p></div></aside>
      </>}
      {tab === 'milestones' && <>
        <RuleTitle count={`${empire?.milestones?.length ?? 0} / ${MILESTONES.length} nişan kazanıldı`}>İmparatorluk nişanları</RuleTitle>
        <div className="quest-achievement-filter"><button type="button" aria-pressed={!readyOnly} onClick={() => setReadyOnly(false)}>Bütün nişanlar</button><button type="button" aria-pressed={readyOnly} onClick={() => setReadyOnly(true)}>Ödül hazır · {milestoneReady}</button></div>
        <div className="quest-achievements">{empire && achievements.map(m => {
          const state: State = empire.milestones?.includes(m.id) ? 'claimed' : milestoneDone(empire, m) ? 'ready' : 'ongoing'
          return <article key={m.id} className={`quest-achievement is-${state}`}><div className="quest-achievement-picture"><img src={scene(milestoneScene(m.id))} alt="" loading="lazy" /><Seal state={state} /><span className="quest-medal" aria-hidden="true"><ApprovedArt name="laurel" /></span></div><h3>{m.title}</h3><p>{m.text}</p><Progress value={milestoneProgress(empire, m)} need={m.need} label="Başarım" /><Rewards reward={m.reward} /><Claim state={state} reward={m.reward} onClaim={() => actMilestone(m.id)} /></article>
        })}</div>
        {readyOnly && !achievements.length && <div className="quest-empty"><img src={scene('treasury')} alt="" /><h3>Sıradaki nişan seni bekliyor</h3><p>Henüz alınmayı bekleyen bir başarım ödülü yok.</p><GameButton variant="outline" onClick={() => setReadyOnly(false)}>Bütün nişanları göster</GameButton></div>}
      </>}
    </section>
  </div>
}
