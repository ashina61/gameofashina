'use client'

/**
 * Cami (imam, harika, mucize), Tophane yükseltmeleri, Gelecek araştırmaları,
 * Kara Pazar takası, Korsan Kalesi seferleri ve yaklaşan korsan baskını.
 * Hepsi motorun kendi fonksiyonlarını okur; panel sayı uydurmaz.
 */
import { Box } from './building-page'
import { Hint } from './hint'
import { AtlasArt } from './deep-art'
import { asset } from '@/lib/asset'
import { Sparkles, Minus, Plus, Swords, ShieldCheck, Skull, TriangleAlert, Repeat, Castle, Users, Warehouse } from './ui-art'
import { StatRow } from './stat-kit'
import { KumSaatiArt } from './resource-art'
import { SHOWS, SHOW_IDS, type ShowId } from '@/lib/game/theatre'
import { GameButton } from './game-button'
import { UnitFigure } from './unit-art'
import {
  RESEARCH, RESEARCH_BRANCHES, RESEARCH_IDS, UNITS,
  futureCost, futureReason,
  type Command, type Game, type UnitId,
} from '@/lib/game/engine'
import { activeCity, type Empire } from '@/lib/game/empire'
import { RAID_UNITS, SIEGE_MAX_MS, THREAT_WARNING_MS, WARSHIPS, availableUnits, cityGuards, cityWallHp, liberateCity, safeStock, siegeTribute, targetName, type Siege } from '@/lib/game/expeditions'
import { EXPEL_COOLDOWN_MS, expelSpies, rivalById } from '@/lib/game/rivals'
import type { Run } from './world-panels'
import { BattleView } from './battle-view'
import { ResearchEmblem } from './research-art'
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
    <GameButton size="sm" variant="outline" disabled={!(pick[id] ?? 0)} onClick={() => set(id, (pick[id] ?? 0) - step)} aria-label={`${UNITS[id].name} azalt`}><Minus /></GameButton>
    <strong className="stepper-value">{pick[id] ?? 0}</strong>
    <GameButton size="sm" variant="outline" disabled={(pick[id] ?? 0) >= free[id]} onClick={() => set(id, (pick[id] ?? 0) + step)} aria-label={`${UNITS[id].name} artır`}><Plus /></GameButton>
    <GameButton size="sm" variant="ghost" data-guide={`all-${id}`} disabled={!free[id] || (pick[id] ?? 0) >= free[id]} onClick={() => set(id, free[id])}>Hepsi</GameButton>
  </div>)}</div>
}

export { GuildPanel, TemplePanel } from './devotion-panels'

export { UpgradePanel, PiracyPanel } from './armament-panels'

/** GELECEK ARAŞTIRMALARI: bir dalın bütün araştırmaları bitince tekrar tekrar ilerler. */
const FUTURE_EFFECT: Record<string, (l: number) => string> = {
  ekonomi: l => `Akçe ve kereste +%${2 * l}`,
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
        <div className="research-card-top"><ResearchEmblem id={RESEARCH_IDS.filter(id => RESEARCH[id].branch === b.key).slice(-1)[0]} size={52} state={left > 0 ? 'locked' : 'open'} /><span><h3>{b.title} Geleceği · Sv. {level}</h3></span></div>
        <p>Şu an: {level ? FUTURE_EFFECT[b.key](level) : 'yok'} · Sonraki seviye: <b>{FUTURE_EFFECT[b.key](level + 1)}</b></p>
        <div className="research-bottom"><span>{num(futureCost(level))} ilim</span>
          <GameButton size="sm" disabled={!!reason} onClick={() => onCommand({ type: 'future', branch: b.key })}>İlerlet</GameButton></div>
        {left > 0 && <p className="fine-print">Önce bu dalda {left} araştırma kaldı.</p>}
      </article>
    })}
  </section>
}

export { ExchangePanel } from './exchange-panel'

/** Yaklaşan korsan baskını uyarısı (şehir ekranının üstünde). */
export function ThreatBanner({ empire, now, onOpen }: { empire: Empire; now: number; onOpen: () => void }) {
  const city = activeCity(empire)
  // Hükümdarların savaş ilanı iki saat önceden görünür; korsanlar 15 dakika önceden.
  const threat = (empire.threats ?? []).find(t => t.cityId === city.id && (t.intent || t.arriveAt - now <= THREAT_WARNING_MS))
  const siege = (empire.sieges ?? []).find(s => s.cityId === city.id)
  const bothHeld = (empire.sieges ?? []).some(s => s.cityId === city.id && s.kind === 'occupy') && (empire.sieges ?? []).some(s => s.cityId === city.id && s.kind === 'blockade')
  const held = siege && <button type="button" className="threat-banner is-siege is-held" onClick={onOpen}>
    <TriangleAlert aria-hidden="true" />
    <span><strong>{bothHeld ? 'Şehir işgal altında · liman ablukada' : siege.kind === 'occupy' ? `Şehir işgal altında · ${targetName(siege.rivalId)}` : `Liman abluka altında · ${targetName(siege.rivalId)}`}</strong>
      <small>{bothHeld ? `Kara ve deniz yolları tutuluyor · saatte ${num((empire.sieges ?? []).filter(s => s.cityId === city.id).reduce((sum, s) => sum + siegeTribute(s), 0))} akçe` : `${troopList(siege.troops)} · saatte ${num(siegeTribute(siege))} akçe`} · kurtarmak için dokun</small></span>
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
    <div className="sk-grid">
      <StatRow icon={<Castle />} label="Sur canı" value={num(cityWallHp(g))} />
      <StatRow icon={<Users />} label="Sur muhafızı" value={cityGuards(g)} />
      <StatRow icon={<Warehouse />} label="Korunan mal" note="her türden" value={num(safeStock(g))} />
      <StatRow icon={<Swords />} label={g.buildings.divan < 5 ? 'Acemi koruması' : incoming ? 'Baskın' : 'Sonraki baskın'} tone={incoming ? 'down' : undefined}
        value={g.buildings.divan < 5 ? 'Divan 5\'e kadar' : incoming?.battle ? `tur ${incoming.battle.state.round}` : incoming ? clock(incoming.arriveAt - g.updatedAt) : next ? `~${clock(Math.max(0, next - g.updatedAt))}` : 'yok'} />
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
      <p className="fine-print"><KumSaatiArt className="size-3" /> Saatte {num(siegeTribute(s))} akçe haraç · en geç {clock(s.since + SIEGE_MAX_MS - now)} sonra çekilirler.</p>
      <GameButton size="sm" variant="destructive" disabled={!Object.keys(mine).length}
        onClick={() => run((e, t) => liberateCity(e, city.id, s.kind, t), s.kind === 'occupy' ? 'Şehir kurtarıldı!' : 'Abluka kırıldı!')}>
        <Swords data-icon="inline-start" />{s.kind === 'occupy' ? 'Şehri kurtar' : 'Ablukayı kır'}</GameButton>
      <Hint>Savaş tek seferde olur ve raporda tur tur izlenir. Yetmezse başka şehirden birlik aktar, Kışla ya da Tersane'de eğit; ya da hükümdarla barış anlaşması yap.</Hint>
    </section>
  })}</>
}

/** GİZLİ SIĞINAK: şehre sızmış yabancı casuslar. */
export function ForeignSpies({ empire, game, now, run, register = false }: { empire: Empire; game: Game; now: number; run: Run; register?: boolean }) {
  const city = activeCity(empire)
  const spies = (empire.world?.spies ?? []).filter(x => x.cityId === city.id)
  const last = empire.world?.expelAt?.[city.id] ?? 0
  const wait = last + EXPEL_COOLDOWN_MS - now
  const content = <>
    {game.buildings.siginak < 1 ? <p className="fine-print">Yabancı casusları bulmak için Gizli Sığınak kur.</p>
      : !spies.length ? <p className="fine-print">Bu şehirde bilinen yabancı casus yok.</p>
      : <>
        <ul className="wm-facts">{spies.map(x => <li key={x.id}><Skull className="size-3" />{rivalById(x.rivalId)?.ruler ?? 'Bilinmeyen'} (yapay rakip) · {clock(now - x.since)} önce sızdı</li>)}</ul>
        <p className="fine-print">Casusları olan hükümdar saldırırsa ordusu surlarını iyi tanır (+%15 asker) ve bu şehri seçme olasılığı artar.</p>
        <GameButton size="sm" disabled={wait > 0} onClick={() => run((e, t) => expelSpies(e, city.id, t), 'Muhafızların araması tamamlandı.')}>
          <ShieldCheck data-icon="inline-start" />{wait > 0 ? `Yeniden arama · ${clock(wait)}` : 'Casusları yakala ve kov'}</GameButton>
      </>}
    {register && wait > 0 && !spies.length && <p className="fine-print">Yeni aramaya {clock(wait)} kaldı.</p>}
  </>
  return register ? <Box title="Şehirdeki yabancı casuslar" className="defense-spies">{content}</Box> : <section className="empire-section"><h3><Skull className="size-4" /> Şehirdeki yabancı casuslar</h3>{content}</section>
}

/** KARAGÖZ PERDESİ: ışıklı perde sahnesi ve dört gösteri (Ikariam'daki tiyatro). */
function ShadowStage({ show }: { show: ShowId | null }) {
  return <div className="shadow-stage" role="img" aria-label="Karagöz perdesi" style={{ display: 'flex', justifyContent: 'center', background: `url(${asset('/images/game/ui/page-frame.webp')}) center / 100% 100%`, padding: 10 }}>
    <AtlasArt atlas="culture" index={14 + SHOW_IDS.indexOf(show ?? 'komedi')} size={144} />
  </div>
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
    {!active && wait > 0 && <p className="fine-print"><KumSaatiArt className="size-3" /> Perde dinleniyor · {clock(wait)}</p>}
    <div className="show-grid">{SHOW_IDS.map(id => {
      const s = SHOWS[id]
      const blocked = id === 'tanrisal' && game.buildings.mabet < 1
      return <article key={id} className={active?.id === id ? 'show-card is-on' : 'show-card'}>
        <AtlasArt atlas="culture" index={14 + SHOW_IDS.indexOf(id)} size={56} /><strong>{s.name}</strong><em>"{s.play}"</em><small>{s.effect(lv)}{id !== 'tanrisal' ? ' · 12 saat' : ''}</small>
        <GameButton size="sm" disabled={!!active || wait > 0 || blocked} onClick={() => onCommand({ type: 'show', show: id })}>{blocked ? 'Mabet gerekli' : 'Gösteriyi sun'}</GameButton>
      </article>
    })}</div>
    <Hint>Aynı anda tek gösteri oynar; bittiğinde perde bir süre dinlenir (seviye yükseldikçe kısalır). Karagöz Perdesi Ikariam'daki tiyatronun Osmanlı karşılığıdır.</Hint>
  </section>
}
