'use client'

/**
 * DÜNYA VE ŞEHİR YÖNETİMİ PANELLERİ
 *
 * Yönetim biçimi, şehir adı, yıkım, kahvehane ikramı, ada ormanı, deneyler,
 * günlük görevler, birlik aktarma, konuşlu birlikler ve yapay rakiplerle
 * ilgili her şey (sıralama, diplomasi, pazar, mesajlar). Rakipler her yerde
 * "yapay rakip" diye anılır; gerçek oyuncu gibi gösterilmez.
 */
import { useState } from 'react'
import {
  Crown, Trash2, Coffee, TreePine, FlaskConical, CalendarCheck, Gift, Truck, Anchor, Flag, Trophy, Handshake,
  Store, Mail, Send, ScrollText, Users, Swords, Eye, Check, Pencil, ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  ANARCHY_MS, BUILDINGS, FOREST_MAX_LEVEL, GOVERNMENTS, GOVERNMENT_COOLDOWN_MS, GOOD_NAMES, GOVERNMENT_IDS, UNITS, UNIT_IDS,
  anarchy, forestCapacity, forestProduction, forestUpgradeCost, governmentCost, idleWorkers, tavernLevel, wineConsumption,
  type BuildingId, type Command, type Game, type Good, type UnitId,
} from '@/lib/game/engine'
import { activeCity, renameCity, type Empire } from '@/lib/game/empire'
import { DAILY_TASKS, claimLogin, claimTask, loginReward, taskProgress } from '@/lib/game/daily'
import { advanceEmpire } from '@/lib/game/empire'
import { dispatchDeploy, dispatchSupport, recallMission, retreatMission, targetName, transportsNeeded, availableUnits, RAID_UNITS, WARSHIPS, targetInfo, type Mission } from '@/lib/game/expeditions'
import { BattleView } from './battle-view'
import { troopList } from '@/lib/game/battle'
import {
  FACTIONS, FAIR_PRICE, MARKET_GOODS, RIVALS, STYLE_NAMES, TREATIES, acceptOffer, cancelOffer, cancelTreaty, factionMembers,
  factionStanding, fillRate, joinAlliance, leaveAlliance, marketOffers, offerSlots, postOffer, proposeTreaty, rankings, readMessages,
  rivalById, rivalLevel, sendGift, stationTribute, treatyCost, writeLetter, type FactionId, type RankKey, type TreatyId,
} from '@/lib/game/rivals'
import { UnitPicker } from './ikariam-panels'

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
        <Button size="sm" disabled={name.trim() === city.name} onClick={() => run((e, t) => renameCity(e, city.id, name, t), 'Şehrin yeni adı ilan edildi.')}>Değiştir</Button>
      </div>
    </section>
    <section className="empire-section">
      <h3><Crown className="size-4" /> Yönetim biçimi · {GOVERNMENTS[gov.id].name}</h3>
      {anarchy(game) && <p className="requirement">Kargaşa sürüyor: üretim -%25, huzur -50 · {clock(gov.anarchyUntil - now)}</p>}
      {locked && <p className="fine-print">Yönetim biçimini değiştirmek için Devlet Nizamı araştırması gerekli.</p>}
      <div className="gov-list">{GOVERNMENT_IDS.map(id => <article key={id} className={`gov-card${gov.id === id ? ' gov-active' : ''}`}>
        <strong>{GOVERNMENTS[id].name}</strong>
        <ul>{GOVERNMENTS[id].effects.map(e => <li key={e}>{e}</li>)}</ul>
        {gov.id === id ? <span className="gov-badge"><Check className="size-3" /> Yürürlükte</span>
          : <Button size="sm" variant="outline" disabled={locked || cooling || game.resources.gold < governmentCost(game)}
            onClick={() => onCommand({ type: 'government', id })}>İlan et</Button>}
      </article>)}</div>
      <p className="fine-print">Değişiklik {num(governmentCost(game))} akçe tutar ve {ANARCHY_MS / 60_000} dakika kargaşa getirir. {cooling ? `Yeni değişiklik için ${clock(gov.changedAt + GOVERNMENT_COOLDOWN_MS - now)} bekle.` : `Sonra ${GOVERNMENT_COOLDOWN_MS / 3600_000} saat yeniden değiştirilemez.`}</p>
    </section>
  </>
}

/** Binayı bir seviye yık (onaylı). */
export function DemolishRow({ game, id, onCommand }: { game: Game; id: BuildingId; onCommand: (c: Command) => void }) {
  const [sure, setSure] = useState(false)
  if (id === 'divan' || game.buildings[id] < 1) return null
  return <section className="empire-section demolish-row">
    {sure
      ? <div className="batch-row"><span>{BUILDINGS[id].name} {game.buildings[id] - 1 ? `${game.buildings[id] - 1}. seviyeye inecek` : 'tamamen yıkılacak'}. Harcanan kaynak geri gelmez.</span>
        <Button size="sm" variant="destructive" onClick={() => { onCommand({ type: 'demolish', id }); setSure(false) }}>Yık</Button>
        <Button size="sm" variant="outline" onClick={() => setSure(false)}>Vazgeç</Button></div>
      : <Button size="sm" variant="ghost" onClick={() => setSure(true)}><Trash2 data-icon="inline-start" />Bir seviye yık</Button>}
  </section>
}

export function TavernPanel({ game, onCommand }: { game: Game; onCommand: (c: Command) => void }) {
  if (game.buildings.kahvehane < 1) return null
  const level = tavernLevel(game)
  return <section className="empire-section">
    <h3><Coffee className="size-4" /> İkram · {level} / {game.buildings.kahvehane}</h3>
    <input type="range" min={0} max={game.buildings.kahvehane} value={level} aria-label="İkram seviyesi"
      onChange={e => onCommand({ type: 'tavern', value: Number(e.target.value) })} />
    <p className="fine-print">Her ikram seviyesi dakikada {wineConsumption({ ...game, tavern: 1 }).toFixed(1)} üzüm harcar ve huzuru artırır. Şu an dakikada {wineConsumption(game).toFixed(1)} üzüm.</p>
  </section>
}

export function ExperimentPanel({ game, onCommand }: { game: Game; onCommand: (c: Command) => void }) {
  if (!game.research.includes('deney')) return null
  return <section className="empire-section">
    <h3><FlaskConical className="size-4" /> Deneyler</h3>
    <p className="fine-print">100 kristal → 150 ilim. Ambarda {num(game.luxury.kristal)} kristal.</p>
    <div className="batch-row">{[1, 5, 10].map(n => <Button key={n} size="sm" variant="outline" disabled={game.luxury.kristal < n * 100}
      onClick={() => onCommand({ type: 'experiment', batches: n })}>{n * 100} kristal</Button>)}</div>
  </section>
}

export function ForestPanel({ game, onCommand }: { game: Game; onCommand: (c: Command) => void }) {
  const f = game.forest
  const cap = forestCapacity(game)
  const [gift, setGift] = useState(500)
  return <section className="empire-section">
    <h3><TreePine className="size-4" /> Ada ormanı · Sv. {f.level}</h3>
    <div className="people-row-top"><strong>Oduncular</strong><span className="people-count">{f.workers} / {cap}</span></div>
    <div className="people-controls">
      <input type="range" min={0} max={cap} value={f.workers} aria-label="Oduncu sayısı" onChange={e => onCommand({ type: 'foresters', value: Number(e.target.value) })} />
      <Button size="sm" variant="ghost" disabled={idleWorkers(game) <= 0} onClick={() => onCommand({ type: 'foresters', value: f.workers + idleWorkers(game) })}>Boştakiler</Button>
    </div>
    <p className="fine-print">Orman dakikada {num(forestProduction(game))} kereste verir (çarpanlardan önce). Her oduncu 4 kereste keser.</p>
    {f.level < FOREST_MAX_LEVEL && <>
      <div className="people-row-top"><span>Orman bağışı</span><span className="people-count">{num(f.wood)} / {num(forestUpgradeCost(f.level))}</span></div>
      <span className="people-meter"><span style={{ width: `${Math.min(100, f.wood / forestUpgradeCost(f.level) * 100)}%` }} /></span>
      <div className="batch-row">{[250, 500, 1000].map(n => <Button key={n} size="sm" variant={gift === n ? 'default' : 'outline'} onClick={() => setGift(n)}>{num(n)}</Button>)}
        <Button size="sm" disabled={game.resources.wood < gift} onClick={() => onCommand({ type: 'forestDonate', amount: gift })}>Bağışla</Button></div>
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
      <Gift className="size-5" />
      <span><strong>Günlük giriş · {Math.max(1, nextStreak)}. gün</strong><small>{num(reward.gold)} akçe · {num(reward.wood)} kereste (7 güne kadar büyür)</small></span>
      <Button size="sm" disabled={loginDone} onClick={() => run(mutate((e, now) => claimLogin(e, now)), 'Giriş ödülü hazinede.')}>{loginDone ? 'Alındı' : 'Al'}</Button>
    </div>
    {d.tasks.map(id => {
      const t = DAILY_TASKS.find(x => x.id === id)!
      const p = taskProgress(empire, id), done = d.claimed.includes(id)
      return <article key={id} className="daily-task">
        <span><strong>{t.text}</strong><small>{p} / {t.need} · ödül {Object.entries(t.reward).map(([r, n]) => `${num(n!)} ${GOOD_NAMES[r as Good].toLocaleLowerCase('tr')}`).join(', ')}</small></span>
        <span className="people-meter"><span style={{ width: `${p / t.need * 100}%` }} /></span>
        <Button size="sm" disabled={done || p < t.need} onClick={() => run(mutate((e, now) => claimTask(e, id, now)), 'Görev ödülü alındı.')}>{done ? 'Alındı' : 'Ödülü al'}</Button>
      </article>
    })}
    <p className="fine-print">Görevler her gün (UTC gece yarısı) yenilenir.</p>
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
    <Button size="sm" disabled={!to || !Object.values(pick).some(n => (n ?? 0) > 0)}
      onClick={() => { run((e, now) => dispatchDeploy(e, to, pick, now), 'Birlikler yola çıktı.'); setPick({}) }}>Gönder</Button>
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
      {lb && <Button size="sm" variant="outline" onClick={() => setWatch(w => !w)}>{watch ? 'Kapat' : 'İzle'}</Button>}
      {lb && <Button size="sm" variant="destructive" onClick={() => run((e, t) => retreatMission(e, m.id, t), 'Ordu geri çekiliyor.')}>Geri çekil</Button>}
      {m.stationed && <Button size="sm" variant="outline" onClick={() => run((e, t) => recallMission(e, m.id, t), 'Birlikler geri çağrıldı.')}>Geri çağır</Button>}
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
    <h3><Handshake className="size-4" /> Diplomasi · ilişki {s.relation}</h3>
    <span className="relation-meter"><span style={{ left: `${(s.relation + 100) / 2}%` }} /></span>
    {(Object.keys(TREATIES) as TreatyId[]).map(t => <article key={t} className="mission-row">
      <span><strong>{TREATIES[t].name}</strong><small>{TREATIES[t].description} {s.treaties.includes(t) ? '' : `Gereken ilişki ~${TREATIES[t].need} · ${num(treatyCost(empire, r, now))} akçe.`}</small></span>
      {s.treaties.includes(t)
        ? <Button size="sm" variant="outline" onClick={() => run((e, x) => cancelTreaty(e, rivalId, t, x), 'Anlaşma bozuldu.')}>Boz</Button>
        : <Button size="sm" onClick={() => run((e, x) => proposeTreaty(e, rivalId, t, x), 'Anlaşma imzalandı.')}>Teklif et</Button>}
    </article>)}
    <div className="batch-row"><Gift className="size-4" />
      {[500, 2000, 5000].map(n => <Button key={n} size="sm" variant={gift === n ? 'default' : 'outline'} onClick={() => setGift(n)}>{num(n)}</Button>)}
      <Button size="sm" onClick={() => run((e, x) => sendGift(e, rivalId, gift, x), 'Hediye yola çıktı.')}>Hediye gönder</Button></div>
    <div className="batch-row"><Mail className="size-4" />
      <Button size="sm" variant="outline" onClick={() => run((e, x) => writeLetter(e, rivalId, 'selam', x), 'Mektup gönderildi.')}>Selam</Button>
      <Button size="sm" variant="outline" onClick={() => run((e, x) => writeLetter(e, rivalId, 'tehdit', x), 'Tehdit mektubu gönderildi.')}>Tehdit</Button>
      <Button size="sm" variant="outline" onClick={() => run((e, x) => writeLetter(e, rivalId, 'harac', x), 'Haraç istendi.')}>Haraç iste</Button></div>
    <p className="fine-print">{r.ruler} bir yapay rakiptir ({STYLE_NAMES[r.style]}, {FACTIONS[r.faction].name}). Yağma ilişkiyi düşürür ve intikam baskını getirir; hediye ve selam ilişkiyi yükseltir.</p>
  </section>
}

export function RivalWar({ empire, rivalId, onOccupy, onBlockade }: {
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
      <p className="fine-print">Kazanırsan ordu şehirde kalır: her saat haraç toplar, hükümdar sana saldıramaz. Geri çağırınca haraçla döner.</p>
      <UnitPicker ids={land} free={free} pick={troops} onPick={setTroops} step={5} />
      <Button size="sm" disabled={!Object.values(troops).some(n => (n ?? 0) > 0)} onClick={() => { onOccupy(troops); setTroops({}) }}>İşgale çık</Button>
    </section>
    <section className="empire-section">
      <h3><Anchor className="size-4" /> Abluka</h3>
      <p className="fine-print">Savaş gemileri önce donanmasıyla savaşır; kazanırsa liman kapanır: pazarı kapanır, donanması çıkamaz, filo saatlik liman haracı toplar.</p>
      <UnitPicker ids={warships} free={free} pick={ships} onPick={setShips} />
      <Button size="sm" disabled={!Object.values(ships).some(n => (n ?? 0) > 0)} onClick={() => { onBlockade(ships); setShips({}) }}>Limanı kapat</Button>
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
    <p className="fine-print">{target.name} ittifak üyen. Birliklerin şehrinde konuşlanır ve karşı ittifak saldırırsa müttefikle birlikte savunur; zaferde ödül ve itibar kazanırsın. Bakımları senden düşer; Seferler panelinden geri çağırırsın.</p>
    {here.map(m => <p key={m.id} className="requirement"><ShieldCheck className="size-4" />{m.stationed ? `Konuşlu: ${troopList(m.units)}` : `Yolda: ${troopList(m.units)}`}</p>)}
    <UnitPicker ids={RAID_UNITS} free={free} pick={pick} onPick={setPick} step={5} />
    <UnitPicker ids={WARSHIPS} free={free} pick={pick} onPick={setPick} />
    {overseas && <p className={ships > free.nakliye ? 'requirement' : 'fine-print'}>Deniz aşırı: {ships} nakliye gemisi gerekli · boşta {free.nakliye}.</p>}
    <Button size="sm" disabled={!Object.values(pick).some(n => (n ?? 0) > 0) || ships > free.nakliye}
      onClick={() => { run((e, t) => dispatchSupport(e, rivalId, pick, t), 'Destek birlikleri yola çıktı.'); setPick({}) }}><ShieldCheck data-icon="inline-start" />Destek gönder</Button>
  </section>
}

/* ------------------------------------------------------------ DÜNYA */

type Tab = 'rank' | 'diplo' | 'market' | 'mail'
export function WorldPanel({ empire, now, run, onRival, initial = 'rank' }: { empire: Empire; now: number; run: Run; onRival: (id: string) => void; initial?: Tab }) {
  const [tab, setTab] = useState<Tab>(initial)
  const unread = (empire.world?.messages ?? []).filter(m => !m.read).length
  return <div className="advisor-panel world-panel">
    <p className="fine-print">{'Bu dünyadaki hükümdarlar yapay rakiplerdir, gerçek oyuncu değildir. Çevrimiçi rakipler için oyun sunucusu gerekir.'}</p>
    <div className="research-branch-tabs" role="group" aria-label="Dünya">
      {([['rank', 'Sıralama', Trophy], ['diplo', 'Diplomasi', Handshake], ['market', 'Pazar', Store], ['mail', `Mesajlar${unread ? ` · ${unread}` : ''}`, Mail]] as const)
        .map(([key, label, Icon]) => <button key={key} type="button" aria-pressed={tab === key} onClick={() => {
          setTab(key)
          if (key === 'mail' && unread) run((e, x) => readMessages(e, x))
        }}><Icon className="size-4" /> {label}</button>)}
    </div>
    {tab === 'rank' && <Rankings empire={empire} now={now} onRival={onRival} />}
    {tab === 'diplo' && <Diplomacy empire={empire} now={now} run={run} onRival={onRival} />}
    {tab === 'market' && <Market empire={empire} now={now} run={run} />}
    {tab === 'mail' && <Inbox empire={empire} onRival={onRival} />}
  </div>
}

function Rankings({ empire, now, onRival }: { empire: Empire; now: number; onRival: (id: string) => void }) {
  const [key, setKey] = useState<RankKey>('total')
  const rows = rankings(empire, now, key)
  return <section className="empire-section">
    <div className="rank-tabs" role="group" aria-label="Sıralama kolu">{([['total', 'Genel'], ['builder', 'İnşaatçı'], ['military', 'Askerî'], ['offense', 'Saldırı'], ['defense', 'Savunma'], ['science', 'Bilim'], ['gold', 'Hazine'], ['trade', 'Ticaret']] as const).map(([k, l]) =>
      <Button key={k} size="sm" variant={key === k ? 'default' : 'outline'} aria-pressed={key === k} onClick={() => setKey(k)}>{l}</Button>)}</div>
    <ol className="rank-table">{rows.map((s, i) => <li key={s.name + i} className={s.you ? 'rank-you' : undefined}>
      <span className="rank-no">{i + 1}</span>
      <button type="button" disabled={s.you} onClick={() => s.rivalId && onRival(s.rivalId)}>
        <strong>{s.name}</strong><small>{s.you ? `${s.ruler} · sen` : `${s.ruler} · yapay rakip`}</small></button>
      <span className="rank-score">{num(s[key])}</span>
    </li>)}</ol>
  </section>
}

function Diplomacy({ empire, now, run, onRival }: { empire: Empire; now: number; run: Run; onRival: (id: string) => void }) {
  const alliance = empire.world?.alliance ?? null
  return <>
    <section className="empire-section">
      <h3><Users className="size-4" /> İttifak {alliance ? `· ${FACTIONS[alliance].name}` : ''}</h3>
      {(Object.keys(FACTIONS) as FactionId[]).map(f => <article key={f} className="mission-row">
        <span><strong>{FACTIONS[f].name}</strong><small>“{FACTIONS[f].motto}” · {factionMembers(f).map(r => r.city).join(', ')} · ortalama ilişki {factionStanding(empire, f)}</small></span>
        {alliance === f ? <Button size="sm" variant="outline" onClick={() => run((e, x) => leaveAlliance(e, x), 'İttifaktan ayrıldın.')}>Ayrıl</Button>
          : <Button size="sm" disabled={!!alliance} onClick={() => run((e, x) => joinAlliance(e, f, x), 'İttifaka katıldın.')}>Katıl</Button>}
      </article>)}
      <p className="fine-print">Üyelik için Elçilik 3. seviye ve ittifakla ortalama 5 ilişki gerekir. Üyeler sana saldırmaz, baskında yardım gönderir; öbür ittifak soğur.</p>
    </section>
    <section className="empire-section">
      <h3><Handshake className="size-4" /> Hükümdarlar</h3>
      {RIVALS.map(r => {
        const s = empire.world?.rivals[r.id]
        return <button key={r.id} type="button" className="rival-row" onClick={() => onRival(r.id)}>
          <span><strong>{r.city}</strong><small>{r.ruler} · {STYLE_NAMES[r.style]} · {FACTIONS[r.faction].name} · Sv. {rivalLevel(empire, r, now)}</small></span>
          <span className={(s?.relation ?? 0) >= 0 ? 'report-win' : 'report-loss'}>{s?.relation ?? 0}</span>
          <small>{(s?.treaties ?? []).map(t => TREATIES[t].name.split(' ')[0]).join(' · ') || '—'}</small>
        </button>
      })}
    </section>
  </>
}

function Market({ empire, now, run }: { empire: Empire; now: number; run: Run }) {
  const city = activeCity(empire)
  const g = city.game
  const offers = marketOffers(empire, now)
  const mine = (empire.world?.offers ?? []).filter(o => o.cityId === city.id)
  const deliveries = (empire.world?.deliveries ?? []).filter(d => d.cityId === city.id)
  const [good, setGood] = useState<Good>('wood')
  const [amount, setAmount] = useState('500')
  const [price, setPrice] = useState(String(FAIR_PRICE.wood))
  return <>
    <section className="empire-section">
      <h3><Store className="size-4" /> Hükümdarların teklifleri · saat başı yenilenir</h3>
      {offers.map(o => { const r = rivalById(o.rivalId)!; return <article key={o.id} className="mission-row">
        <span><strong>{o.side === 'sell' ? 'Satıyor' : 'Alıyor'}: {num(o.amount)} {GOOD_NAMES[o.good]}</strong>
          <small>{r.city} · birimi {o.price} akçe (adil {FAIR_PRICE[o.good]}) · toplam {num(o.amount * o.price)}</small></span>
        <Button size="sm" variant="outline" onClick={() => run((e, x) => acceptOffer(e, o.id, x), o.side === 'sell' ? 'Mal yolda.' : 'Mal yola çıktı; bedeli gelecek.')}>{o.side === 'sell' ? 'Satın al' : 'Sat'}</Button>
      </article> })}
    </section>
    <section className="empire-section">
      <h3><Send className="size-4" /> Senin tekliflerin · {mine.length}/{offerSlots(g)}</h3>
      {offerSlots(g) < 1 ? <p className="fine-print">Kendi satış teklifin için Ticaret Merkezi kur.</p> : <div className="empire-shipment-form">
        <label>Mal<select value={good} onChange={e => { setGood(e.target.value as Good); setPrice(String(FAIR_PRICE[e.target.value as Good])) }}>
          {MARKET_GOODS.map(x => <option key={x} value={x}>{GOOD_NAMES[x]}</option>)}</select></label>
        <label>Miktar<input type="number" min={1} value={amount} onChange={e => setAmount(e.target.value)} /></label>
        <label>Birim fiyat<input type="number" min={0.1} step={0.1} value={price} onChange={e => setPrice(e.target.value)} /></label>
        <Button size="sm" onClick={() => run((e, x) => postOffer(e, good, Number(amount), Number(price), x), 'Teklif Ticaret Merkezi\'nde.')}>Teklif ver</Button>
      </div>}
      {mine.map(o => <article key={o.id} className="mission-row">
        <span><strong>{num(o.left)} / {num(o.amount)} {GOOD_NAMES[o.good]} · {o.price} akçe</strong><small>Dakikada ~{fillRate(empire, o).toFixed(1)} birim satılıyor</small></span>
        <Button size="sm" variant="outline" onClick={() => run((e, x) => cancelOffer(e, o.id, x), 'Teklif geri çekildi.')}>Geri çek</Button>
      </article>)}
      <p className="fine-print">Yapay tüccarlar adil fiyata yakın teklifleri hızlı alır; adil fiyatın %60 üstünde hiç almazlar.</p>
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
    {m.rivalId && <Button size="sm" variant="ghost" onClick={() => onRival(m.rivalId!)}><Eye data-icon="inline-start" />Hükümdarı aç</Button>}
  </article>)}</section>
}

