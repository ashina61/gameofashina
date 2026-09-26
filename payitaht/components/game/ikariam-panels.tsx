'use client'

/**
 * Cami (rahip, harika, mucize), Tophane yükseltmeleri, Gelecek araştırmaları,
 * Kara Pazar takası, Korsan Kalesi seferleri ve yaklaşan korsan baskını.
 * Hepsi motorun kendi fonksiyonlarını okur; panel sayı uydurmaz.
 */
import { Hint } from './hint'
import { useState } from 'react'
import { Sparkles, Minus, Plus, Swords, ShieldCheck, Clock3, Skull, Anchor, TriangleAlert, Repeat, Hammer } from 'lucide-react'
import { AkceArt } from './resource-art'
import { SHOWS, SHOW_IDS, type ShowId } from '@/lib/game/theatre'
import { WorkforceSlider } from './workforce'
import { Button } from '@/components/ui/button'
import { UnitFigure } from './unit-art'
import {
  FAITH_CAP, GOOD_NAMES, LUXURY_IDS, MIRACLES, MIRACLE_COOLDOWN_MS, RESEARCH, RESEARCH_BRANCHES, RESEARCH_IDS, RESOURCE_IDS, UNITS,
  UNIT_IDS, WONDER_MAX, exchangeLimit, exchangeRate, futureCost, futureReason, goodAmount, idleWorkers, miracleCost, miracleMinutes,
  priestCapacity, upgradeCap, upgradeCost, upgradeReason, wonderCost, travelFactor,
  type Command, type Game, type Good, type UnitId,
} from '@/lib/game/engine'
import { activeCity, type Empire } from '@/lib/game/empire'
import { PIRACY_TARGETS, RAID_UNITS, SIEGE_MAX_MS, THREAT_WARNING_MS, WARSHIPS, availableUnits, cityGuards, cityWallHp, liberateCity, safeStock, siegeTribute, targetName, type Siege } from '@/lib/game/expeditions'
import { EXPEL_COOLDOWN_MS, expelSpies, rivalById } from '@/lib/game/rivals'
import type { Run } from './world-panels'
import { BattleView } from './battle-view'
import { GUILDS, GUILD_IDS, GUILD_MAX, PATRON_COOLDOWN_MS, devotionFor, guildLevel, himmetCap, himmetRate, patronSlots } from '@/lib/game/guilds'
import { troopList } from '@/lib/game/battle'

const clock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(s / 3600)
  return h ? `${h}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
const num = (n: number) => Math.floor(n).toLocaleString('tr-TR')

/** Birlik seçici: her satırda azalt/artır/hepsi. */
export function UnitPicker({ ids, free, pick, onPick, step = 1 }: {
  ids: UnitId[]; free: Record<UnitId, number>; pick: Partial<Record<UnitId, number>>
  onPick: (next: Partial<Record<UnitId, number>>) => void; step?: number
}) {
  const set = (id: UnitId, n: number) => onPick({ ...pick, [id]: Math.max(0, Math.min(free[id], n)) })
  const shown = ids.filter(id => free[id] > 0 || (pick[id] ?? 0) > 0)
  if (!shown.length) return null
  return <div className="raid-units">{shown.map(id => <div key={id} className="raid-unit">
    <UnitFigure id={id} size={36} />
    <span><strong>{UNITS[id].name}</strong><small>{free[id]} boşta · saldırı {UNITS[id].attack}</small></span>
    <Button size="sm" variant="outline" disabled={!(pick[id] ?? 0)} onClick={() => set(id, (pick[id] ?? 0) - step)} aria-label={`${UNITS[id].name} azalt`}><Minus /></Button>
    <strong className="stepper-value">{pick[id] ?? 0}</strong>
    <Button size="sm" variant="outline" disabled={(pick[id] ?? 0) >= free[id]} onClick={() => set(id, (pick[id] ?? 0) + step)} aria-label={`${UNITS[id].name} artır`}><Plus /></Button>
    <Button size="sm" variant="ghost" onClick={() => set(id, free[id])}>Hepsi</Button>
  </div>)}</div>
}

/** AHİ TEKKESİ: himmet, lonca dereceleri ve himaye (Ikariam'daki tanrılar). */
export function GuildPanel({ game, now, onCommand }: { game: Game; now: number; onCommand: (c: Command) => void }) {
  const gs = game.guilds
  const slots = patronSlots(game.buildings.tekke)
  const cap = himmetCap(game)
  const cooling = now < gs.changedAt + PATRON_COOLDOWN_MS
  const [amount, setAmount] = useState(100)
  return <section className="empire-section guild-panel">
    <h3><Sparkles className="size-4" /> Lonca himayesi · {gs.patrons.length}/{slots}</h3>
    <div className="people-row-top"><span>Himmet</span><span className="people-count">{num(gs.himmet)} / {num(cap)} · +{himmetRate(game).toFixed(1)}/dk</span></div>
    <span className="people-meter"><span style={{ width: `${Math.min(100, (gs.himmet / cap) * 100)}%` }} /></span>
    <div className="batch-row"><span>Adak</span>{[100, 500, 2000].map(n => <Button key={n} size="sm" variant={amount === n ? 'default' : 'outline'} onClick={() => setAmount(n)}>{num(n)}</Button>)}</div>
    {cooling && <p className="fine-print"><Clock3 className="size-3" /> Loncalar yeni düzene alışıyor · {clock(gs.changedAt + PATRON_COOLDOWN_MS - now)}</p>}
    <div className="guild-list">{GUILD_IDS.map(id => {
      const g = GUILDS[id]
      const level = guildLevel(gs.devotion[id])
      const on = gs.patrons.includes(id)
      const next = level < GUILD_MAX ? devotionFor(level + 1) : null
      const from = devotionFor(level)
      return <article key={id} className={`guild-card${on ? ' is-patron' : ''}`}>
        <div className="guild-top"><span className="guild-seal" aria-hidden="true">{level}</span>
          <span><strong>{g.name}</strong><small>{g.craft}</small></span>
          {on && <em>Himayede</em>}</div>
        <p className="guild-effect">{level ? g.effect(level) : 'Henüz derecesi yok'}{next ? ` → ${level + 1}. derece: ${g.effect(level + 1)}` : ' · en yüksek derece'}</p>
        {next && <><span className="people-meter"><span style={{ width: `${Math.min(100, ((gs.devotion[id] - from) / (next - from)) * 100)}%` }} /></span>
          <small className="guild-need">{num(gs.devotion[id])} / {num(next)} himmet</small></>}
        <div className="batch-row">
          <Button size="sm" variant="outline" disabled={!next || gs.himmet < 1} onClick={() => onCommand({ type: 'devote', guild: id, amount })}>Adak sun ({num(Math.min(amount, Math.floor(gs.himmet)))})</Button>
          <Button size="sm" variant={on ? 'secondary' : 'default'} disabled={cooling || (!on && gs.patrons.length >= slots)} onClick={() => onCommand({ type: 'patron', guild: id })}>{on ? 'Himayeden çıkar' : 'Himaye et'}</Button>
        </div>
      </article>
    })}</div>
    <Hint>Tekke 1. seviyede bir, 5.'de iki, 10.'da üç loncayı himaye eder. Himayede olmayan lonca derecesini korur ama etki etmez. Loncalar yönetim biçimi himmeti %25 artırır. Tanrılar ayrıca Ongun Mabedi'ndedir.</Hint>
  </section>
}

/** CAMİ: rahipler inanç biriktirir; inanç adanın harikasının mucizesini çağırır. */
export function TemplePanel({ game, now, onCommand }: { game: Game; now: number; onCommand: (c: Command) => void }) {
  const t = game.temple
  const m = MIRACLES[t.wonder]
  const [gift, setGift] = useState(500)
  const cap = priestCapacity(game)
  const active = t.active && now < t.until
  const resting = !active && now < t.cooldownUntil
  const need = miracleCost(Math.max(1, t.wonderLevel))
  return <section className="empire-section">
    <h3><Sparkles className="size-4" /> {m.wonder} · Sv. {t.wonderLevel}/{WONDER_MAX}</h3>
    <p className="fine-print">{`Adanın harikası. ${m.name} mucizesi: ${t.wonderLevel ? m.effect(t.wonderLevel) : `${m.effect(1)} (1. seviyede)`}, ${miracleMinutes(Math.max(1, t.wonderLevel))} dakika sürer.`}</p>
    {t.wonderLevel < WONDER_MAX && <>
      <div className="people-row-top"><span>Harika bağışı</span><span className="people-count">{num(t.wonderWood)} / {num(wonderCost(t.wonderLevel))} kereste</span></div>
      <span className="people-meter"><span style={{ width: `${Math.min(100, t.wonderWood / wonderCost(t.wonderLevel) * 100)}%` }} /></span>
      <div className="batch-row">
        {[250, 500, 1000, 2500].map(n => <Button key={n} size="sm" variant={gift === n ? 'default' : 'outline'} onClick={() => setGift(n)}>{num(n)}</Button>)}
        <Button size="sm" disabled={game.resources.wood < gift} onClick={() => onCommand({ type: 'wonder', amount: gift })}>Bağışla</Button>
      </div>
    </>}
    {game.buildings.cami < 1
      ? <p className="requirement"><Hammer className="size-4" />Rahipler Cami'de hizmet eder. Önce Cami kur.</p>
      : <>
        <WorkforceSlider label="İmam" figure="rahip" value={t.priests} cap={cap} idle={idleWorkers(game)}
          preview={n => { const v = Math.min(n, cap) * 0.5; return { amount: v, icon: <Sparkles className="workforce-icon" />, text: <><b>{v.toFixed(1)}</b> inanç/dk</> } }}
          onCommit={n => onCommand({ type: 'priests', value: n })} />
        <div className="people-row-top"><span>İnanç</span><span className="people-count">{num(t.faith)} / {num(FAITH_CAP)} · +{(Math.min(t.priests, cap) * 0.5).toFixed(1)}/dk</span></div>
        <span className="people-meter"><span style={{ width: `${Math.min(100, t.faith / need * 100)}%` }} /></span>
        {active && <p className="report-win"><Sparkles className="size-4" /> {m.name} mucizesi etkin · {clock(t.until - now)}</p>}
        {resting && <p className="fine-print"><Clock3 className="size-3" /> Harika dinleniyor · {clock(t.cooldownUntil - now)}</p>}
        <Button size="sm" disabled={!!active || resting || t.wonderLevel < 1 || t.faith < need} onClick={() => onCommand({ type: 'miracle' })}>
          <Sparkles data-icon="inline-start" />Mucizeyi çağır ({num(need)} inanç)</Button>
        <p className="fine-print">Her rahip dakikada 0,5 inanç toplar ve üretimde çalışmaz. Mucizeden sonra harika {MIRACLE_COOLDOWN_MS / 3600_000} saat dinlenir.</p>
      </>}
  </section>
}

/** TOPHANE: birlik başına saldırı ve zırh yükseltmesi (+%5/seviye). */
export function UpgradePanel({ game, onCommand }: { game: Game; onCommand: (c: Command) => void }) {
  const ids = UNIT_IDS.filter(id => !['spy', 'transport', 'support'].includes(UNITS[id].role))
  return <section className="empire-section">
    <h3><Swords className="size-4" /> Birlik yükseltmeleri</h3>
    <Hint>Her seviye o birliğin saldırısını ya da zırhını %5 artırır. Tophane'nin her iki seviyesi bir yükseltme seviyesi açar (şu an en fazla {upgradeCap(game)}). Bedeli akçe ve kristaldir.</Hint>
    {game.buildings.tophane < 2 && <p className="requirement"><Hammer className="size-4" />Yükseltmeler Tophane 2. seviyede açılır.</p>}
    <div className="upgrade-list">{ids.map(id => {
      const u = game.upgrades[id] ?? { atk: 0, def: 0 }
      return <div key={id} className="upgrade-row">
        <strong>{UNITS[id].name}</strong>
        {(['atk', 'def'] as const).map(stat => {
          const c = upgradeCost(game, id, stat), reason = upgradeReason(game, id, stat)
          return <Button key={stat} size="sm" variant="outline" disabled={!!reason} title={reason ?? undefined}
            onClick={() => onCommand({ type: 'upgrade', id, stat })}>
            {stat === 'atk' ? <Swords data-icon="inline-start" /> : <ShieldCheck data-icon="inline-start" />}
            {u[stat]} → {u[stat] + 1}<small className="upgrade-cost-hint">{num(c.gold)}a · {c.kristal}k</small>
          </Button>
        })}
      </div>
    })}</div>
  </section>
}

/** GELECEK ARAŞTIRMALARI: bir dalın bütün araştırmaları bitince tekrar tekrar ilerler. */
const FUTURE_EFFECT: Record<string, (l: number) => string> = {
  ekonomi: l => `Akçe, kereste ve taş +%${2 * l}`,
  bilim: l => `İlim +%${3 * l}`,
  askeri: l => `Birlik gücü +%${2 * l}`,
  denizcilik: l => `Yolculuk -%${Math.min(30, 3 * l)}`,
  mitoloji: l => `Lütuf birikimi +%${5 * l}`,
}
export function FuturePanel({ game, onCommand }: { game: Game; onCommand: (c: Command) => void }) {
  return <section className="research-branch">
    <div className="research-branch-top"><h3>Gelecek araştırmaları</h3><span><Repeat className="size-4" /></span></div>
    <Hint>Bir dalın bütün araştırmaları bitince o dalın Geleceği açılır ve sınırsızca tekrarlanır; her seviye daha pahalıdır ve anında işler.</Hint>
    {RESEARCH_BRANCHES.map(b => {
      const level = game.future[b.key]
      const reason = futureReason(game, b.key)
      const left = RESEARCH_IDS.filter(id => RESEARCH[id].branch === b.key && !game.research.includes(id)).length
      return <article key={b.key} className="research-card">
        <div className="research-card-top"><span className="research-icon"><Repeat /></span><span><h3>{b.title} Geleceği · Sv. {level}</h3></span></div>
        <p>{level ? FUTURE_EFFECT[b.key](level) : 'Henüz yok'} → {FUTURE_EFFECT[b.key](level + 1)}</p>
        <div className="research-bottom"><span>{num(futureCost(level))} ilim</span>
          <Button size="sm" disabled={!!reason} onClick={() => onCommand({ type: 'future', branch: b.key })}>İlerlet</Button></div>
        {left > 0 && <p className="fine-print">Önce bu dalda {left} araştırma kaldı.</p>}
      </article>
    })}
  </section>
}

/** KARA PAZAR: her malı başka bir mala zararına çevirir. */
const GOODS: Good[] = [...RESOURCE_IDS.filter(r => r !== 'knowledge'), ...LUXURY_IDS]
export function ExchangePanel({ game, onCommand }: { game: Game; onCommand: (c: Command) => void }) {
  const [from, setFrom] = useState<Good>('wood')
  const [to, setTo] = useState<Good>('kristal')
  const [amount, setAmount] = useState('400')
  const n = Math.floor(Number(amount))
  const rate = exchangeRate(game)
  if (game.buildings.kara_pazar < 1) return null
  return <section className="empire-section">
    <h3><Repeat className="size-4" /> Takas</h3>
    <p className="fine-print">Kara Pazar'da {rate} birim ver, 1 birim al. Tek seferde en fazla {num(exchangeLimit(game))} birim. Oran seviyeyle iyileşir (en iyi 2 : 1).</p>
    <div className="empire-shipment-form">
      <label>Ver<select value={from} onChange={e => setFrom(e.target.value as Good)}>
        {GOODS.map(g => <option key={g} value={g}>{GOOD_NAMES[g]} ({num(goodAmount(game, g))})</option>)}</select></label>
      <label>Al<select value={to} onChange={e => setTo(e.target.value as Good)}>
        {GOODS.filter(g => g !== from).map(g => <option key={g} value={g}>{GOOD_NAMES[g]}</option>)}</select></label>
      <label>Miktar<input type="number" min={1} step={1} inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value)} /></label>
      <Button size="sm" disabled={!Number.isSafeInteger(n) || n <= 0 || from === to}
        onClick={() => onCommand({ type: 'exchange', from, to, amount: n })}>
        {Number.isSafeInteger(n) && n > 0 ? `${num(n)} → ${num(n / rate)} ${GOOD_NAMES[to]}` : 'Takas et'}</Button>
    </div>
  </section>
}

/** KORSAN KALESİ: savaş gemileriyle tüccar gemilerine baskın. */
export function PiracyPanel({ empire, now, onPiracy }: {
  empire: Empire; now: number; onPiracy: (targetId: string, units: Partial<Record<UnitId, number>>) => void
}) {
  const city = activeCity(empire)
  const g = city.game
  const free = availableUnits(empire, city.id)
  const [target, setTarget] = useState(PIRACY_TARGETS[0].id)
  const [pick, setPick] = useState<Partial<Record<UnitId, number>>>({})
  const missions = (empire.missions ?? []).filter(m => m.cityId === city.id && m.kind === 'piracy')
  if (g.buildings.korsan_kalesi < 1) return null
  const t = PIRACY_TARGETS.find(p => p.id === target)!
  return <section className="empire-section">
    <h3><Skull className="size-4" /> Korsan seferleri · şöhret {g.piracy}</h3>
    <div className="piracy-targets">{PIRACY_TARGETS.map(p => <button key={p.id} type="button" className="piracy-target"
      aria-pressed={target === p.id} disabled={g.buildings.korsan_kalesi < p.level} onClick={() => setTarget(p.id)}>
      <strong>{p.name}</strong><small>{p.description}</small>
      <small><AkceArt className="size-3" /> {num(p.gold * (1 + g.buildings.korsan_kalesi * 0.1))} · <Clock3 className="size-3" /> {clock(p.minutes * 60_000 * travelFactor(g))}
        {g.buildings.korsan_kalesi < p.level ? ` · Kale ${p.level}. sv.` : ''}</small>
      <small>Eskort: {troopList(p.escort)}</small>
    </button>)}</div>
    {WARSHIPS.every(id => free[id] <= 0)
      ? <p className="fine-print">Limanda boşta savaş gemisi yok. Tersane'de kadırga yap.</p>
      : <UnitPicker ids={WARSHIPS} free={free} pick={pick} onPick={setPick} />}
    <Hint>Eskort gemileri zayıf zırhlıdır ama batmadan pes etmez: kalabalık bir filo götür. Kayıplar kalıcıdır.</Hint>
    <Button size="sm" disabled={!Object.values(pick).some(n => (n ?? 0) > 0) || missions.some(m => m.npcId === t.id)}
      onClick={() => { onPiracy(t.id, pick); setPick({}) }}><Anchor data-icon="inline-start" />{t.name} peşine düş</Button>
    {missions.map(m => <p key={m.id} className="requirement"><Clock3 className="size-4" />
      {PIRACY_TARGETS.find(p => p.id === m.npcId)?.name}: {m.battle ? `savaşta · tur ${m.battle.state.round}` : m.resolved ? `dönüş ${clock(m.returnAt - now)}` : `varış ${clock(m.arriveAt - now)}`}</p>)}
  </section>
}

/** Yaklaşan korsan baskını uyarısı (şehir ekranının üstünde). */
export function ThreatBanner({ empire, now, onOpen }: { empire: Empire; now: number; onOpen: () => void }) {
  const city = activeCity(empire)
  // Hükümdarların savaş ilanı iki saat önceden görünür; korsanlar 15 dakika önceden.
  const threat = (empire.threats ?? []).find(t => t.cityId === city.id && (t.intent || t.arriveAt - now <= THREAT_WARNING_MS))
  const siege = (empire.sieges ?? []).find(s => s.cityId === city.id)
  const held = siege && <button type="button" className="threat-banner is-siege is-held" onClick={onOpen}>
    <TriangleAlert aria-hidden="true" />
    <span><strong>{siege.kind === 'occupy' ? `Şehir işgal altında · ${targetName(siege.rivalId)}` : `Liman abluka altında · ${targetName(siege.rivalId)}`}</strong>
      <small>{troopList(siege.troops)} · saatte {num(siegeTribute(siege))} akçe · kurtarmak için dokun</small></span>
  </button>
  if (!threat) return held || null
  const lb = threat.battle
  return <>{held}<button type="button" className={`threat-banner${lb ? ' is-siege' : ''}`} onClick={onOpen}>
    <TriangleAlert aria-hidden="true" />
    <span><strong>{lb ? `Kapıda savaş · ${lb.stage === 'naval' ? 'deniz' : 'surlar'} · tur ${lb.state.round}` : `${targetName(threat.npcId)} ${threat.intent === 'occupy' ? 'işgale geliyor' : threat.intent === 'blockade' ? 'limanı kapatmaya geliyor' : 'baskını'} · ${clock(threat.arriveAt - now)}`}</strong>
      <small>{troopList(threat.troops)}{Object.values(threat.fleet).some(n => (n ?? 0) > 0) ? ` · filo: ${troopList(threat.fleet)}` : ''}</small></span>
  </button></>
}

/** Savunma özeti (Ordu panelinde). */
export function DefenseSummary({ empire }: { empire: Empire }) {
  const city = activeCity(empire)
  const g = city.game
  const incoming = (empire.threats ?? []).find(t => t.cityId === city.id)
  const next = incoming?.arriveAt ?? empire.nextThreat?.[city.id]
  return <section className="empire-section">
    <h3><ShieldCheck className="size-4" /> Şehir savunması</h3>
    <div className="raid-summary">
      <span>Sur canı {num(cityWallHp(g))}</span>
      <span>Sur muhafızı {cityGuards(g)}</span>
      <span>Korunan mal {num(safeStock(g))}/tür</span>
      <span>{g.buildings.divan < 5 ? 'Acemi koruması (Divanhane 5\'e kadar)' : incoming?.battle ? `Kapıda savaş · tur ${incoming.battle.state.round}` : incoming ? `Baskın yolda · ${clock(incoming.arriveAt - g.updatedAt)}` : next ? `Sonraki baskın ~${clock(Math.max(0, next - g.updatedAt))}` : 'Gözcüler denizde'}</span>
    </div>
    {incoming?.battle && <BattleView stored={incoming.battle.info} live={{ round: incoming.battle.state.round, nextAt: incoming.battle.nextAt, now: g.updatedAt }} />}
    <Hint>Korsanlar önce limandaki savaş gemilerine, sonra sura ve şehirdeki kara birliklerine çarpar. Savaş dakikada bir tur sürer: bu sırada eğitimi biten ya da seferden dönen birlikler sıradaki tura katılır, ama şehirden birlik çıkamaz. Seferdeki birlikler şehri savunmaz.</Hint>
  </section>
}

/** KUŞATMA: işgalci ordu / abluka filosu ile şehrin gücü; kurtarma saldırısı. */
export function SiegePanel({ empire, now, run }: { empire: Empire; now: number; run: Run }) {
  const city = activeCity(empire)
  const sieges = (empire.sieges ?? []).filter(s => s.cityId === city.id)
  if (!sieges.length) return null
  const free = availableUnits(empire, city.id)
  return <>{sieges.map((s: Siege) => {
    const mine = Object.fromEntries((s.kind === 'occupy' ? RAID_UNITS : WARSHIPS).filter(id => free[id] > 0).map(id => [id, free[id]]))
    return <section key={s.id} className="empire-section siege-panel">
      <h3><TriangleAlert className="size-4" /> {s.kind === 'occupy' ? 'Şehir işgal altında' : 'Liman abluka altında'}</h3>
      <p className="report-loss">{rivalById(s.rivalId)?.ruler ?? targetName(s.rivalId)} (yapay rakip) · {s.kind === 'occupy' ? 'kapılar tutuluyor: ordu, casus ve nakliye çıkamaz' : 'deniz yolu kapalı: nakliye ve deniz aşırı sefer yok'}.</p>
      <div className="siege-sides">
        <div><small>Düşman</small><strong>{troopList(s.troops)}</strong></div>
        <div><small>{s.kind === 'occupy' ? 'Şehirdeki kara birliklerin' : 'Limandaki savaş gemilerin'}</small><strong>{troopList(mine)}</strong></div>
      </div>
      <p className="fine-print"><Clock3 className="size-3" /> Saatte {num(siegeTribute(s))} akçe haraç · en geç {clock(s.since + SIEGE_MAX_MS - now)} sonra çekilirler.</p>
      <Button size="sm" variant="destructive" disabled={!Object.keys(mine).length}
        onClick={() => run((e, t) => liberateCity(e, city.id, s.kind, t), s.kind === 'occupy' ? 'Şehir kurtarıldı!' : 'Abluka kırıldı!')}>
        <Swords data-icon="inline-start" />{s.kind === 'occupy' ? 'Şehri kurtar' : 'Ablukayı kır'}</Button>
      <Hint>Savaş tek seferde olur ve raporda tur tur izlenir. Yetmezse başka şehirden birlik aktar, Kışla ya da Tersane'de eğit; ya da hükümdarla barış anlaşması yap.</Hint>
    </section>
  })}</>
}

/** GİZLİ SIĞINAK: şehre sızmış yabancı casuslar. */
export function ForeignSpies({ empire, game, now, run }: { empire: Empire; game: Game; now: number; run: Run }) {
  const city = activeCity(empire)
  const spies = (empire.world?.spies ?? []).filter(x => x.cityId === city.id)
  const last = empire.world?.expelAt?.[city.id] ?? 0
  const wait = last + EXPEL_COOLDOWN_MS - now
  return <section className="empire-section">
    <h3><Skull className="size-4" /> Şehirdeki yabancı casuslar</h3>
    {game.buildings.siginak < 1 ? <p className="fine-print">Yabancı casusları bulmak için Gizli Sığınak kur.</p>
      : !spies.length ? <p className="fine-print">Muhafızlar şehirde yabancı casus bulamadı.</p>
      : <>
        <ul className="wm-facts">{spies.map(x => <li key={x.id}><Skull className="size-3" />{rivalById(x.rivalId)?.ruler ?? 'Bilinmeyen'} (yapay rakip) · {clock(now - x.since)} önce sızdı</li>)}</ul>
        <p className="fine-print">Casusları olan hükümdar saldırırsa ordusu surlarını iyi tanır (+%15 asker) ve bu şehri seçme olasılığı artar.</p>
        <Button size="sm" disabled={wait > 0} onClick={() => run((e, t) => expelSpies(e, city.id, t), 'Casuslar kovuldu.')}>
          <ShieldCheck data-icon="inline-start" />{wait > 0 ? `Yeniden arama · ${clock(wait)}` : 'Casusları yakala ve kov'}</Button>
      </>}
  </section>
}

/** KARAGÖZ PERDESİ: ışıklı perde sahnesi ve dört gösteri (Ikariam'daki tiyatro). */
function ShadowStage({ show }: { show: ShowId | null }) {
  const ink = '#2a1a10'
  return <svg viewBox="0 0 320 150" className="shadow-stage" role="img" aria-label="Karagöz perdesi">
    <defs>
      <radialGradient id="perde-glow" cx="50%" cy="55%" r="60%"><stop offset="0" stopColor="#fff6d6" /><stop offset="0.7" stopColor="#ffd98a" /><stop offset="1" stopColor="#e8a94a" /></radialGradient>
    </defs>
    <rect width="320" height="150" fill="#3a2212" />
    <path d="M0 0 H320 V22 Q290 34 260 22 Q230 34 200 22 Q160 36 120 22 Q90 34 60 22 Q30 34 0 22 Z" fill="#9a2a1e" />
    <rect x="40" y="26" width="240" height="104" rx="4" fill="#6b4424" />
    <rect x="48" y="32" width="224" height="92" fill="url(#perde-glow)" />
    <g opacity="0.9">
      {/* Karagöz: yuvarlak sakal, işlik (sivri başlık) */}
      <g fill="#8a2a1e" stroke={ink} strokeWidth="1">
        <path d="M112 124 L104 86 Q112 74 124 78 L132 124 Z" />
        <circle cx="118" cy="66" r="11" />
        <path d="M108 58 L126 56 L134 36 Z" fill="#6b1f16" />
        <path d="M110 72 Q118 84 128 72" fill="#2a1a10" />
        <path d="M128 92 L150 84" strokeWidth="3" />
      </g>
      {/* Hacivat: sivri sakal, kavuk */}
      <g fill="#2f3f78" stroke={ink} strokeWidth="1">
        <path d="M196 124 L190 84 Q200 74 212 80 L214 124 Z" />
        <circle cx="202" cy="66" r="10" />
        <rect x="193" y="42" width="18" height="16" rx="6" fill="#e9dcc0" />
        <path d="M198 74 L202 88 L206 74 Z" fill="#2a1a10" />
        <path d="M190 94 L170 86" strokeWidth="3" />
      </g>
      {show === 'tanrisal' && <circle cx="160" cy="52" r="8" fill="#f5c85a" stroke={ink} />}
      {show === 'komedi' && <path d="M150 104 q10 -12 20 0" stroke={ink} strokeWidth="2" fill="none" />}
    </g>
    {[60, 260].map(x => <g key={x}><path d={`M${x} 26 V14`} stroke="#e2bd78" /><circle cx={x} cy="30" r="5" fill="#f5c85a" /></g>)}
  </svg>
}
export function TheatrePanel({ game, now, onCommand }: { game: Game; now: number; onCommand: (c: Command) => void }) {
  const lv = game.buildings.karagoz
  if (lv < 1) return null
  const sh = game.shows
  const active = sh?.active && now < sh.active.until ? sh.active : null
  const wait = sh ? sh.readyAt - now : 0
  return <section className="empire-section theatre-panel">
    <h3><Sparkles className="size-4" /> Hangi oyunu sahneleyelim?</h3>
    <ShadowStage show={active?.id ?? null} />
    {active && <p className="report-win"><Sparkles className="size-4" /> "{SHOWS[active.id].play}" oynanıyor · {SHOWS[active.id].effect(lv)} · {clock(active.until - now)}</p>}
    {!active && wait > 0 && <p className="fine-print"><Clock3 className="size-3" /> Perde dinleniyor · {clock(wait)}</p>}
    <div className="show-grid">{SHOW_IDS.map(id => {
      const s = SHOWS[id]
      const blocked = id === 'tanrisal' && game.buildings.mabet < 1
      return <article key={id} className={active?.id === id ? 'show-card is-on' : 'show-card'}>
        <strong>{s.name}</strong><em>"{s.play}"</em><small>{s.effect(lv)}{id !== 'tanrisal' ? ' · 12 saat' : ''}</small>
        <Button size="sm" disabled={!!active || wait > 0 || blocked} onClick={() => onCommand({ type: 'show', show: id })}>{blocked ? 'Mabet gerekli' : 'Gösteriyi sun'}</Button>
      </article>
    })}</div>
    <Hint>Aynı anda tek gösteri oynar; bittiğinde perde bir süre dinlenir (seviye yükseldikçe kısalır). Karagöz Perdesi Ikariam'daki tiyatronun Osmanlı karşılığıdır.</Hint>
  </section>
}
