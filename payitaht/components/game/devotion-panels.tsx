'use client'
import { useState } from 'react'
import { Box } from './building-page'
import { Hint } from './hint'
import { AtlasArt } from './deep-art'
import { GameButton } from './game-button'
import { Sparkles, Hammer } from './ui-art'
import { KumSaatiArt } from './resource-art'
import { WorkforceSlider } from './workforce'
import { FAITH_CAP, MIRACLES, MIRACLE_IDS, MIRACLE_COOLDOWN_MS, WONDER_MAX, idleWorkers, miracleCost, miracleMinutes, priestCapacity, wonderCost, type Command, type Game, formatRate } from '@/lib/game/engine'
import { GUILDS, GUILD_IDS, GUILD_MAX, PATRON_COOLDOWN_MS, devotionFor, guildLevel, himmetCap, himmetRate, patronSlots } from '@/lib/game/guilds'
const num = (n: number) => Math.floor(n).toLocaleString('tr-TR')
const clock = (ms: number) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 3600)} sa ${Math.floor(s / 60) % 60} dk ${s % 60} sn` }
/** AHİ TEKKESİ: himmet, lonca dereceleri ve himaye (Ikariam'daki tanrılar). */
export function GuildPanel({ game, now, onCommand }: { game: Game; now: number; onCommand: (c: Command) => void }) {
  const gs = game.guilds
  const slots = patronSlots(game.buildings.tekke)
  const cap = himmetCap(game)
  const cooling = now < gs.changedAt + PATRON_COOLDOWN_MS
  const [amount, setAmount] = useState(100)
  return <div className="devotion-register"><Box title="Himmet ve himaye">
    <p className="devotion-status">Himaye edilen lonca: <b>{gs.patrons.length} / {slots}</b></p>{game.buildings.tekke < 1 && <p className="requirement">Önce Ahi Tekkesi kur.</p>}
    <div className="people-row-top"><span>Himmet</span><span className="people-count">{num(gs.himmet)} / {num(cap)} · +{formatRate(himmetRate(game))}/dk</span></div>
    <span className="people-meter"><span style={{ width: `${Math.min(100, (gs.himmet / cap) * 100)}%` }} /></span>
    <div className="batch-row"><span>Adak</span>{[100, 500, 2000].map(n => <GameButton key={n} size="sm" variant={amount === n ? 'default' : 'outline'} aria-pressed={amount === n} onClick={() => setAmount(n)}>{num(n)}</GameButton>)}</div>
    {cooling && <p className="fine-print"><KumSaatiArt className="size-3" /> Loncalar yeni düzene alışıyor · {clock(gs.changedAt + PATRON_COOLDOWN_MS - now)}</p>}
    {gs.himmet < 1 && game.buildings.tekke > 0 && <p className="requirement">Adanacak himmet yok. Tekke biriktiriyor.</p>}</Box><Box title="Lonca defteri"><div className="devotion-list">{GUILD_IDS.map(id => {
      const g = GUILDS[id]
      const level = guildLevel(gs.devotion[id])
      const on = gs.patrons.includes(id)
      const next = level < GUILD_MAX ? devotionFor(level + 1) : null
      const from = devotionFor(level)
      return <details key={id} className="devotion-card"><summary>
        <div className="devotion-heading"><span className="guild-seal" style={{ background: 'none', border: 0, position: 'relative' }}><AtlasArt atlas="culture" index={8 + GUILD_IDS.indexOf(id)} size={40} /><b style={{ position: 'absolute', bottom: -3, right: -3, background: 'var(--c-parch)', borderRadius: '50%', padding: '0 3px' }}>{level}</b></span>
          <span><strong>{g.name}</strong><small>{g.craft}</small></span>
          {on && <em>Himayede</em>}</div></summary>
        <p className="guild-effect">{level ? `${on ? 'Etkin' : 'Himaye edilirse'}: ${g.effect(level)}` : 'Henüz derecesi yok'}{next ? ` → ${level + 1}. derece: ${g.effect(level + 1)}` : ' · en yüksek derece'}</p>
        {next && <><span className="people-meter"><span style={{ width: `${Math.min(100, ((gs.devotion[id] - from) / (next - from)) * 100)}%` }} /></span>
          <small className="guild-need">{num(gs.devotion[id])} / {num(next)} himmet</small></>}
        <div className="batch-row">
          <GameButton size="sm" variant="outline" disabled={game.buildings.tekke < 1 || !next || gs.himmet < 1} onClick={() => onCommand({ type: 'devote', guild: id, amount })}>Adak sun ({num(Math.floor(Math.min(amount, gs.himmet, Math.max(0, devotionFor(GUILD_MAX) - gs.devotion[id]))))})</GameButton>
          <GameButton size="sm" variant={on ? 'secondary' : 'default'} disabled={game.buildings.tekke < 1 || cooling || (!on && gs.patrons.length >= slots)} onClick={() => onCommand({ type: 'patron', guild: id })}>{on ? 'Himayeden çıkar' : 'Himaye et'}</GameButton>
        </div>
      {!on && gs.patrons.length >= slots && <p className="devotion-note">Himaye yerleri dolu. Bir loncayı bırak veya Tekke’yi yükselt.</p>}</details>
    })}</div></Box>
    <details className="devotion-help"><summary>Himaye nasıl işler?</summary><Hint>Tekke 1. seviyede bir, 5.'de iki, 10.'da üç loncayı himaye eder. Himayede olmayan lonca derecesini korur ama etki etmez. Loncalar yönetim biçimi himmeti %25 artırır. Tanrılar ayrıca Ongun Mabedi'ndedir.</Hint></details>
  </div>
}

/** CAMİ: imamlar inanç biriktirir; inanç adanın harikasının mucizesini çağırır. */
export function TemplePanel({ game, now, onCommand }: { game: Game; now: number; onCommand: (c: Command) => void }) {
  const t = game.temple
  const m = MIRACLES[t.wonder]
  const [gift, setGift] = useState(500)
  const cap = priestCapacity(game)
  const active = t.active && now < t.until
  const resting = !active && now < t.cooldownUntil
  const need = miracleCost(Math.max(1, t.wonderLevel))
  return <div className="devotion-register"><Box title="Adanın mucizesi">
    <h3 className="devotion-heading"><AtlasArt atlas="wonders" index={MIRACLE_IDS.indexOf(t.wonder)} size={56} /> {m.wonder} · Sv. {t.wonderLevel}/{WONDER_MAX}</h3>
    <p className="fine-print">{`Adanın harikası. ${m.name} mucizesi: ${t.wonderLevel ? m.effect(t.wonderLevel) : `${m.effect(1)} (1. seviyede)`}, ${miracleMinutes(Math.max(1, t.wonderLevel))} dakika sürer.`}</p>
    {game.buildings.cami < 1
      ? <p className="requirement"><Hammer className="size-4" />İmamlar ve hocalar Cami'de hizmet eder. Önce Cami kur.</p>
      : <>
        <div className="people-row-top"><span>İnanç</span><span className="people-count">{num(t.faith)} / {num(FAITH_CAP)} · +{formatRate(Math.min(t.priests, cap) * 0.5)}/dk</span></div>
        <span className="people-meter"><span style={{ width: `${Math.min(100, t.faith / need * 100)}%` }} /></span>
        {active && <p className="report-win"><Sparkles className="size-4" /> {m.name} mucizesi etkin · {clock(t.until - now)}</p>}
        {resting && <p className="fine-print"><KumSaatiArt className="size-3" /> Harika dinleniyor · {clock(t.cooldownUntil - now)}</p>}
        <GameButton size="sm" disabled={!!active || resting || t.wonderLevel < 1 || t.faith < need} onClick={() => onCommand({ type: 'miracle' })}>
          <Sparkles data-icon="inline-start" />Mucizeyi çağır ({num(need)} inanç)</GameButton>
        {t.wonderLevel < 1 ? <p className="requirement">Harika henüz kurulmadı. Kereste bağışla.</p> : !active && !resting && t.faith < need ? <p className="requirement">{num(need - t.faith)} inanç daha gerekli.</p> : null}
        <p className="fine-print">Her imam dakikada 0,5 inanç toplar ve üretimde çalışmaz. Mucizeden sonra harika {MIRACLE_COOLDOWN_MS / 3600_000 * (game.research.includes('din') ? 2 / 3 : 1)} saat dinlenir.</p>
      </>}
  </Box>{game.buildings.cami > 0 && <Box title="İmamları görevlendir">        <WorkforceSlider label="İmam" figure="rahip" value={t.priests} cap={cap} idle={idleWorkers(game)}
          preview={n => { const v = Math.min(n, cap) * 0.5; return { amount: v, icon: <Sparkles className="workforce-icon" />, text: <><b>{formatRate(v)}</b> inanç/dk</> } }}
          onCommit={n => onCommand({ type: 'priests', value: n })} />
<p className="devotion-note">Atanan imamlar üretimde çalışmaz. Onayla ile görev dağılımını uygula.</p></Box>}<Box title="Harikanın gelişimi">    {t.wonderLevel < WONDER_MAX && <>
      <div className="people-row-top"><span>Harika bağışı</span><span className="people-count">{num(t.wonderWood)} / {num(wonderCost(t.wonderLevel))} kereste</span></div>
      <span className="people-meter"><span style={{ width: `${Math.min(100, t.wonderWood / wonderCost(t.wonderLevel) * 100)}%` }} /></span>
      <div className="batch-row">
        {[250, 500, 1000, 2500].map(n => <GameButton key={n} size="sm" variant={gift === n ? 'default' : 'outline'} aria-pressed={gift === n} onClick={() => setGift(n)}>{num(n)}</GameButton>)}
        <GameButton size="sm" disabled={game.resources.wood < gift} onClick={() => onCommand({ type: 'wonder', amount: gift })}>Bağışla</GameButton>
      </div>
      {game.resources.wood < gift && <p className="requirement">Bağış için {num(gift - game.resources.wood)} kereste daha gerekli.</p>}
    </>}
{t.wonderLevel >= WONDER_MAX && <p className="devotion-status">Harika en yüksek seviyede.</p>}</Box></div>
}

