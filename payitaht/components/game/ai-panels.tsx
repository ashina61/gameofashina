'use client'
import { KumSaatiArt } from './resource-art'

/**
 * YAPAY RAKİPLERİN DÜNYASI — teklifler, dünya haberleri, rakip savaşları ve
 * tempo ayarı. Buradaki bütün hükümdarlar yapay rakiptir (gerçek oyuncu değil).
 */
import type { ReactNode } from 'react'
import { Check, Coins, Eye, Gift, Handshake, HeartHandshake, Newspaper, Ship, Swords, TrendingUp, X } from './ui-art'
import { GameButton } from './game-button'
import { GOOD_NAMES, LUXURY_IDS, type Good, type Luxury, type Resource } from '@/lib/game/engine'
import type { Empire } from '@/lib/game/empire'
import {
  PACES, PACE_IDS, PROPOSAL_NAMES, acceptProposal, declineProposal, setPace, type Deal, type NewsKind, type Proposal, type ProposalKind,
} from '@/lib/game/ai'
import { STYLE_NAMES, rivalById, rivalLevel } from '@/lib/game/rivals'
import { luxuryIcons, resourceIcons } from './game-widgets'
import type { Run } from './world-panels'

const num = (n: number) => Math.floor(n).toLocaleString('tr-TR')
const left = (ms: number) => { const m = Math.max(0, Math.round(ms / 60_000)); return m >= 60 ? `${Math.floor(m / 60)} sa ${m % 60} dk` : `${m} dk` }
const when = (t: number) => new Date(t).toLocaleString('tr-TR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })

function GoodIcon({ good }: { good: Good }) {
  const Icon = (LUXURY_IDS as readonly string[]).includes(good) ? luxuryIcons[good as Luxury] : resourceIcons[good as Resource]
  return <Icon className="size-5" aria-hidden="true" />
}
function DealChip({ label, deal }: { label: string; deal: Deal }) {
  return <span className="deal-chip"><small>{label}</small><GoodIcon good={deal.good} /><b>{num(deal.amount)}</b><span className="sr-only">{GOOD_NAMES[deal.good]}</span></span>
}
const KIND_ICON: Record<ProposalKind, ReactNode> = {
  satis: <Ship />, alis: <Coins />, anlasma: <Handshake />, harac: <Swords />, yardim: <HeartHandshake />, hediye: <Gift />,
}

/** Rakiplerin sana getirdiği teklifler: kabul ya da ret. */
export function ProposalsPanel({ empire, now, run, onRival }: { empire: Empire; now: number; run: Run; onRival: (id: string) => void }) {
  const list = (empire.world?.proposals ?? []).filter(p => p.until > now)
  if (!list.length) return <section className="empire-section">
    <p className="fine-print">Şu an bekleyen teklif yok. Yapay rakipler birkaç saatte bir mal satmaya, malını almaya, anlaşma yapmaya ya da haraç istemeye gelir. Daha sık gelsinler istersen tempoyu “Hareketli” yap.</p>
    <PaceSetting empire={empire} run={run} />
  </section>
  return <section className="empire-section proposals">
    {list.map(p => <ProposalCard key={p.id} p={p} empire={empire} now={now} run={run} onRival={onRival} />)}
  </section>
}

function ProposalCard({ p, empire, now, run, onRival }: { p: Proposal; empire: Empire; now: number; run: Run; onRival: (id: string) => void }) {
  const r = rivalById(p.rivalId)!
  const accept = p.kind === 'harac' ? 'Haracı öde' : p.kind === 'yardim' ? 'Destek gönder' : p.kind === 'hediye' ? 'Teşekkürle al' : p.kind === 'anlasma' ? 'İmzala' : 'Kabul et'
  const ok = p.kind === 'harac' ? 'Haraç ödendi; bir gün saldırı yok.' : p.kind === 'anlasma' ? 'Anlaşma imzalandı.' : p.kind === 'yardim' ? 'Destek yola çıktı.' : 'Anlaşıldı; gemiler yolda.'
  return <article className={`proposal-card is-${p.kind}`}>
    <header>
      <span className="proposal-kind">{KIND_ICON[p.kind]}{PROPOSAL_NAMES[p.kind]}</span>
      <time><KumSaatiArt className="size-3" />{left(p.until - now)}</time>
    </header>
    <button type="button" className="proposal-from" onClick={() => onRival(r.id)}>
      <strong>{r.city}</strong><small>{r.ruler} · {STYLE_NAMES[r.style]} · sv. {rivalLevel(empire, r, now)} · yapay rakip</small>
    </button>
    <p className="proposal-text">“{p.text}”</p>
    {(p.give || p.want) && <div className="proposal-deal">
      {p.give && <DealChip label="Verir" deal={p.give} />}
      {p.give && p.want && <span className="proposal-swap" aria-hidden="true">⇄</span>}
      {p.want && <DealChip label="İster" deal={p.want} />}
    </div>}
    <div className="proposal-actions">
      <GameButton size="sm" onClick={() => run((e, x) => acceptProposal(e, p.id, x), ok)}><Check data-icon="inline-start" />{accept}</GameButton>
      <GameButton size="sm" variant="outline" onClick={() => run((e, x) => declineProposal(e, p.id, x), p.kind === 'harac' ? 'Haraç reddedildi. Surları hazırla!' : 'Teklif geri çevrildi.')}><X data-icon="inline-start" />{p.kind === 'harac' ? 'Reddet' : 'Geri çevir'}</GameButton>
    </div>
  </article>
}

const NEWS_ICON: Record<NewsKind, ReactNode> = {
  savas: <Swords />, catisma: <Swords />, baris: <Handshake />, ticaret: <Ship />, buyume: <TrendingUp />, anlasma: <Handshake />,
}
/** Dünya haberleri ve süren rakip savaşları. */
export function NewsPanel({ empire, now, onRival }: { empire: Empire; now: number; onRival: (id: string) => void }) {
  const wars = empire.world?.wars ?? []
  const news = empire.world?.news ?? []
  return <>
    {wars.length > 0 && <section className="empire-section">
      <h3><Swords className="size-4" /> Süren savaşlar</h3>
      {wars.map(w => {
        const A = rivalById(w.a)!, B = rivalById(w.b)!
        const share = 50 + w.score * 12.5
        return <article key={w.id} className="war-row">
          <div className="war-sides">
            <button type="button" onClick={() => onRival(A.id)}>{A.city}</button>
            <Swords aria-hidden="true" />
            <button type="button" onClick={() => onRival(B.id)}>{B.city}</button>
          </div>
          <span className="war-meter" role="img" aria-label={`Savaş durumu: ${w.score > 0 ? A.city : w.score < 0 ? B.city : 'kimse'} önde`}><span style={{ width: `${Math.max(6, Math.min(94, share))}%` }} /></span>
          <small>{w.score === 0 ? 'Denge' : `${w.score > 0 ? A.city : B.city} önde`} · en geç {left(w.until - now)} içinde biter</small>
        </article>
      })}
    </section>}
    <section className="empire-section">
      <h3><Newspaper className="size-4" /> Dünya haberleri</h3>
      {!news.length && <p className="fine-print">Henüz haber yok. Yapay rakipler savaştıkça, ticaret yaptıkça ve büyüdükçe burada yazılır.</p>}
      <ol className="news-list">{news.map(n => <li key={n.id} className={`news-${n.kind}`}>
        <i aria-hidden="true">{NEWS_ICON[n.kind]}</i>
        <span>{n.text}<time>{when(n.time)}</time></span>
        {n.rivals[0] && <button type="button" aria-label={`${rivalById(n.rivals[0])?.city} hükümdarını aç`} onClick={() => onRival(n.rivals[0])}><Eye className="size-4" /></button>}
      </li>)}</ol>
    </section>
  </>
}

/** Yapay rakip temposu: oyunu denemek için olayları sıklaştırır. */
export function PaceSetting({ empire, run }: { empire: Empire; run: Run }) {
  const pace = empire.world?.pace ?? 'normal'
  return <div className="pace-setting">
    <div className="world-tabs pace-tabs" role="group" aria-label="Yapay rakip temposu">
      {PACE_IDS.map(id => <button key={id} type="button" aria-pressed={pace === id}
        onClick={() => run((e, x) => setPace(e, id, x), `Tempo: ${PACES[id].name}`)}><span>{PACES[id].name}</span></button>)}
    </div>
    <p className="fine-print">{PACES[pace].text}</p>
  </div>
}

/** Bir hükümdarın başka bir rakiple savaşı (NPC panelinde). */
export function rivalWarLine(empire: Empire, rivalId: string) {
  const w = (empire.world?.wars ?? []).find(x => x.a === rivalId || x.b === rivalId)
  if (!w) return null
  const foe = rivalById(w.a === rivalId ? w.b : w.a)!
  const mine = w.a === rivalId ? w.score : -w.score
  return `${foe.city} ile savaşta (${mine > 0 ? 'önde' : mine < 0 ? 'geride' : 'denge'}); ordusu cephede, sana saldırmaz.`
}
