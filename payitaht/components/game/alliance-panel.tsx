'use client'
import { NufusArt } from './resource-art'

/**
 * İTTİFAK SAYFASI (alt menü) — Ikariam'daki ittifak ekranı.
 * İttifaksızken: kendi ittifakını kur ya da bir yapay ittifaka katıl.
 * Kendi ittifakında: Genel (sancak, sıralama, faydalar), Üyeler (rütbe,
 * çıkarma, davet), Genelge (bütün üyelere mesaj), Diplomasi (öbür
 * ittifaklarla barış, saldırmazlık, savaş). Üyeler yapay rakiptir.
 */
import { useState } from 'react'
import { Crown, Eye, Flag, Handshake, Megaphone, Scroll, Shield, Swords, UserMinus, UserPlus, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Empire } from '@/lib/game/empire'
import {
  CIRCULAR_TOPICS, PACT_RANKS, STANCES, allianceRankings, foundPact, invitePact, inviteNeed, kickMember, leavePact, pactCap,
  readCirculars, sendCircular, setPactMotto, setRank, setStance, type CircularTopic, type PactRank, type Stance,
} from '@/lib/game/pact'
import {
  FACTIONS, RIVALS, STYLE_NAMES, factionMembers, factionStanding, joinAlliance, leaveAlliance, peek, rivalById, rivalLevel, rivalScore,
  type FactionId,
} from '@/lib/game/rivals'
import { profileOf, setProfile } from '@/lib/game/profile'
import { SancakArt, SancakPicker, type SancakChoice } from './profile-panel'
import { Hint } from './hint'
import type { Run } from './world-panels'

const num = (n: number) => Math.floor(n).toLocaleString('tr-TR')
const when = (t: number) => new Date(t).toLocaleString('tr-TR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })
type Tab = 'genel' | 'uyeler' | 'genelge' | 'diplomasi'

export function AlliancePanel({ empire, now, run, onRival }: { empire: Empire; now: number; run: Run; onRival: (id: string) => void }) {
  const w = empire.world
  const pact = w?.pact
  const [tab, setTab] = useState<Tab>('genel')
  if (!pact && !w?.alliance) return <NoAlliance empire={empire} run={run} />
  if (!pact && w?.alliance) return <FactionView empire={empire} now={now} run={run} onRival={onRival} f={w.alliance} />
  const p = pact!
  const unread = p.circulars.filter(c => !c.read).length
  const prof = profileOf(empire)
  return <div className="advisor-panel alliance-panel">
    <section className="alliance-head">
      <SancakArt crest={prof.crest} color={prof.color} banner={prof.banner} size={150} />
      <div><span className="eyebrow">İTTİFAK · LİDER {prof.ruler.toLocaleUpperCase('tr')}</span>
        <strong>{p.name} <em>[{p.tag}]</em></strong>
        {p.motto && <q>{p.motto}</q>}
        <small>{p.members.length + 1} / {pactCap(empire) + 1} üye · kuruluş {new Date(p.founded).toLocaleDateString('tr-TR')}</small></div>
    </section>
    <div className="world-tabs alliance-tabs" role="group" aria-label="İttifak">
      {([['genel', 'Genel', Shield], ['uyeler', 'Üyeler', Users], ['genelge', 'Genelge', Megaphone], ['diplomasi', 'Diplomasi', Handshake]] as const).map(([k, label, Icon]) =>
        <button key={k} type="button" aria-pressed={tab === k} onClick={() => { setTab(k); if (k === 'genelge' && unread) run((e, x) => readCirculars(e, x)) }}>
          <Icon className="size-5" /><span>{label}</span>{k === 'genelge' && unread > 0 && <b className="world-tab-badge">{unread}</b>}</button>)}
    </div>
    {tab === 'genel' && <General empire={empire} now={now} run={run} />}
    {tab === 'uyeler' && <Members empire={empire} now={now} run={run} onRival={onRival} />}
    {tab === 'genelge' && <Circulars empire={empire} run={run} />}
    {tab === 'diplomasi' && <Diplomacy empire={empire} run={run} />}
  </div>
}

function Rankings({ empire, now }: { empire: Empire; now: number }) {
  return <ol className="rank-table">{allianceRankings(empire, now).map((r, i) => <li key={r.id} className={r.you ? 'rank-you' : undefined}>
    <span className="rank-no">{i + 1}</span>
    <button type="button" disabled><strong>{r.name} [{r.tag}]</strong><small>{r.members} üye{r.you ? ' · senin ittifakın' : ' · yapay ittifak'}</small></button>
    <span className="rank-score">{num(r.score)}</span>
  </li>)}</ol>
}

function General({ empire, now, run }: { empire: Empire; now: number; run: Run }) {
  const p = empire.world!.pact!
  const [motto, setMotto] = useState(p.motto)
  const [confirm, setConfirm] = useState(false)
  const prof = profileOf(empire)
  const [editBanner, setEditBanner] = useState(false)
  const [look, setLook] = useState<SancakChoice>({ crest: prof.crest, color: prof.color, banner: prof.banner ?? 'kirlangic' })
  return <>
    <section className="empire-section alliance-banner-edit">
      <h3><Flag className="size-4" /> İttifak sancağı</h3>
      <p className="fine-print">İttifakın, lider profilindeki sancak ve armayı kullanır.</p>
      <Button size="sm" variant="outline" aria-expanded={editBanner} onClick={() => { setLook({ crest: prof.crest, color: prof.color, banner: prof.banner ?? 'kirlangic' }); setEditBanner(!editBanner) }}>{editBanner ? 'Vazgeç' : 'Sancağı düzenle'}</Button>
      {editBanner && <>
        <SancakArt {...look} size={260} />
        <SancakPicker value={look} onChange={setLook} />
        <Button size="sm" onClick={() => { run((e, t) => setProfile(e, look, t), 'Sancak kaydedildi.'); setEditBanner(false) }}>Sancağı kaydet</Button>
      </>}
    </section>
    <section className="empire-section">
      <h3><Crown className="size-4" /> İttifak sıralaması</h3>
      <Rankings empire={empire} now={now} />
    </section>
    <section className="empire-section">
      <h3><Shield className="size-4" /> Üyeliğin faydaları</h3>
      <ul className="alliance-perks">
        <li><Shield />Üyeler sana saldırmaz; baskında yardım ordusu yollar (Başkomutan iki kat).</li>
        <li><Flag />Üye şehirlerine destek birliği gönderebilirsin (hükümdar sayfasından).</li>
        <li><Handshake />Hariciye Nazırı varsa üyelerden daha sık ticaret teklifi gelir.</li>
        <li><NufusArt />Elçilik büyüdükçe üye sınırı artar (şu an {pactCap(empire)}).</li>
      </ul>
    </section>
    <section className="empire-section">
      <h3><Scroll className="size-4" /> İttifak düsturu</h3>
      <div className="batch-row"><input id="pact-motto" className="text-input" value={motto} maxLength={80} placeholder="Birlikten kuvvet doğar" onChange={e => setMotto(e.target.value)} />
        <Button size="sm" onClick={() => run((e, x) => setPactMotto(e, motto, x), 'Düstur kaydedildi.')}>Kaydet</Button></div>
      {confirm ? <div className="batch-row"><Button size="sm" variant="destructive" onClick={() => run((e, x) => leavePact(e, x), 'İttifak dağıtıldı.')}>Evet, dağıt</Button><Button size="sm" variant="outline" onClick={() => setConfirm(false)}>Vazgeç</Button></div>
        : <Button size="sm" variant="outline" onClick={() => setConfirm(true)}>İttifakı dağıt</Button>}
    </section>
  </>
}

function Members({ empire, now, run, onRival }: { empire: Empire; now: number; run: Run; onRival: (id: string) => void }) {
  const p = empire.world!.pact!
  const prof = profileOf(empire)
  const candidates = RIVALS.filter(r => !p.members.includes(r.id)).sort((a, b) => peek(empire, b.id).relation - peek(empire, a.id).relation)
  const need = inviteNeed(p)
  return <>
    <section className="empire-section">
      <h3><NufusArt className="size-4" /> Üyeler · {p.members.length + 1}/{pactCap(empire) + 1}</h3>
      <article className="member-row is-you"><span><strong>{prof.ruler}</strong><small>Lider · sen</small></span></article>
      {p.members.map(id => {
        const r = rivalById(id)!
        return <article key={id} className="member-row">
          <button type="button" className="member-name" onClick={() => onRival(id)}><strong>{r.city}</strong><small>{r.ruler} · {STYLE_NAMES[r.style]} · sv. {rivalLevel(empire, r, now)} · {num(rivalScore(empire, r, now).total)} puan</small></button>
          <select aria-label={`${r.ruler} rütbesi`} value={p.ranks[id] ?? 'uye'} onChange={e => run((x, t) => setRank(x, id, e.target.value as PactRank, t), 'Rütbe verildi.')}>
            {(Object.keys(PACT_RANKS) as PactRank[]).map(k => <option key={k} value={k}>{PACT_RANKS[k].name}</option>)}
          </select>
          <Button size="sm" variant="ghost" aria-label={`${r.ruler} ittifaktan çıkar`} onClick={() => run((x, t) => kickMember(x, id, t), 'Üye çıkarıldı.')}><UserMinus /></Button>
        </article>
      })}
      <Hint>{(Object.keys(PACT_RANKS) as PactRank[]).filter(k => k !== 'uye').map(k => `${PACT_RANKS[k].name}: ${PACT_RANKS[k].text}`).join(' ')}</Hint>
    </section>
    <section className="empire-section">
      <h3><UserPlus className="size-4" /> Davet et</h3>
      <p className="fine-print">Hükümdar, ilişkiniz en az {need} ise daveti kabul eder ve eski ittifakından ayrılır. İlişkiyi hediye ve selamla ısıt (Elçi · Diplomasi).</p>
      {candidates.map(r => {
        const rel = peek(empire, r.id).relation
        return <article key={r.id} className="member-row">
          <button type="button" className="member-name" onClick={() => onRival(r.id)}><strong>{r.city}</strong><small>{r.ruler} · {FACTIONS[r.faction].name} · ilişki <b className={rel >= need ? 'report-win' : 'report-loss'}>{rel}</b></small></button>
          <Button size="sm" disabled={p.members.length >= pactCap(empire)} variant={rel >= need ? 'default' : 'outline'} onClick={() => run((x, t) => invitePact(x, r.id, t), `${r.ruler} ittifaka katıldı!`)}>Davet et</Button>
        </article>
      })}
    </section>
  </>
}

function Circulars({ empire, run }: { empire: Empire; run: Run }) {
  const p = empire.world!.pact!
  const [topic, setTopic] = useState<CircularTopic>('selam')
  const [note, setNote] = useState('')
  const author = (from: string) => from === 'sen' ? `${profileOf(empire).ruler} (lider)` : `${rivalById(from)?.ruler ?? from} (yapay rakip)`
  return <>
    <section className="empire-section">
      <h3><Megaphone className="size-4" /> Genelge yaz</h3>
      <div className="world-tabs circular-topics" role="group" aria-label="Konu">
        {(Object.keys(CIRCULAR_TOPICS) as CircularTopic[]).map(k => <button key={k} type="button" aria-pressed={topic === k} onClick={() => setTopic(k)}><span>{CIRCULAR_TOPICS[k].subject}</span></button>)}
      </div>
      <p className="fine-print">{CIRCULAR_TOPICS[topic].body}</p>
      <label className="sr-only" htmlFor="pact-note">Ek not</label>
      <input id="pact-note" className="text-input" value={note} maxLength={140} placeholder="Ek not (isteğe bağlı)" onChange={e => setNote(e.target.value)} />
      <Button size="sm" onClick={() => { run((e, x) => sendCircular(e, topic, note, x), 'Genelge bütün üyelere ulaştı.'); setNote('') }}><Megaphone data-icon="inline-start" />Bütün üyelere gönder</Button>
    </section>
    <section className="empire-section">
      <h3><Scroll className="size-4" /> Genelgeler</h3>
      {p.circulars.map(c => <article key={c.id} className={`report-card${c.read ? '' : ' unread'}`}>
        <div className="report-head"><Scroll className="size-4" /><strong>{c.subject}</strong><time>{when(c.time)}</time></div>
        <p className="fine-print mail-from">{author(c.from)}</p>
        <p className="mail-body">{c.body}</p>
        {c.replies?.map(r => <p key={r.rivalId} className="circular-reply"><b>{rivalById(r.rivalId)?.ruler}:</b> {r.text}</p>)}
      </article>)}
    </section>
  </>
}

function Diplomacy({ empire, run }: { empire: Empire; run: Run }) {
  const p = empire.world!.pact!
  return <section className="empire-section">
    <h3><Swords className="size-4" /> İttifaklar arası diplomasi</h3>
    {(Object.keys(FACTIONS) as FactionId[]).map(f => {
      const st = p.stance[f] ?? 'baris'
      return <article key={f} className="stance-card">
        <span><strong>{FACTIONS[f].name}</strong><small>“{FACTIONS[f].motto}” · yapay ittifak · durum: <b className={st === 'savas' ? 'report-loss' : st === 'saldirmazlik' ? 'report-win' : ''}>{STANCES[st]}</b></small></span>
        <div className="world-tabs stance-tabs" role="group" aria-label={`${FACTIONS[f].name} ile durum`}>
          {(Object.keys(STANCES) as Stance[]).map(s => <button key={s} type="button" aria-pressed={st === s} onClick={() => run((e, x) => setStance(e, f, s, x), `${FACTIONS[f].name}: ${STANCES[s]}`)}><span>{STANCES[s]}</span></button>)}
        </div>
      </article>
    })}
    <Hint>Saldırmazlık: o ittifakın üyeleri sana savaş açmaz (ortalama ilişki eksi olmamalı). Savaş: üyelerinin gözü sende olur, senin üyelerin de onlara sefer düzenler; ilişkiler soğur.</Hint>
  </section>
}

function NoAlliance({ empire, run }: { empire: Empire; run: Run }) {
  const [name, setName] = useState('')
  const [tag, setTag] = useState('')
  return <div className="advisor-panel alliance-panel">
    <section className="empire-section">
      <h3><Flag className="size-4" /> Kendi ittifakını kur</h3>
      <p className="fine-print">Elçiliği olan her hükümdar ittifak kurabilir. Lider sen olursun; yapay rakipleri davet eder, rütbe dağıtır, genelge yazarsın.</p>
      <label htmlFor="pact-name" className="profile-label">İttifak adı</label>
      <input id="pact-name" className="text-input" value={name} maxLength={30} placeholder="Ay Yıldız Birliği" onChange={e => setName(e.target.value)} />
      <label htmlFor="pact-tag" className="profile-label">Kısaltma</label>
      <input id="pact-tag" className="text-input" value={tag} maxLength={5} placeholder="AYB" onChange={e => setTag(e.target.value)} />
      <Button onClick={() => run((e, x) => foundPact(e, name, tag, x), 'İttifak kuruldu!')}><Flag data-icon="inline-start" />İttifakı kur</Button>
    </section>
    <section className="empire-section">
      <h3><Handshake className="size-4" /> Ya da bir ittifaka katıl</h3>
      {(Object.keys(FACTIONS) as FactionId[]).map(f => <article key={f} className="mission-row">
        <span><strong>{FACTIONS[f].name}</strong><small>“{FACTIONS[f].motto}” · {factionMembers(f).length} yapay rakip · ortalama ilişki {factionStanding(empire, f)}</small></span>
        <Button size="sm" onClick={() => run((e, x) => joinAlliance(e, f, x), 'İttifaka katıldın.')}>Katıl</Button>
      </article>)}
      <Hint>Katılmak için Elçilik 3. seviye ve üyelerle ortalama 5 ilişki gerekir.</Hint>
    </section>
  </div>
}

function FactionView({ empire, now, run, onRival, f }: { empire: Empire; now: number; run: Run; onRival: (id: string) => void; f: FactionId }) {
  return <div className="advisor-panel alliance-panel">
    <section className="empire-section">
      <h3><Shield className="size-4" /> {FACTIONS[f].name} · üyesin</h3>
      <p className="fine-print">“{FACTIONS[f].motto}” Bu ittifakın lideri yapay rakiplerdir; sen üyesin. Kendi ittifakını kurmak için önce ayrıl.</p>
      {factionMembers(f).map(r => <article key={r.id} className="member-row">
        <button type="button" className="member-name" onClick={() => onRival(r.id)}><strong>{r.city}</strong><small>{r.ruler} · sv. {rivalLevel(empire, r, now)} · ilişki {peek(empire, r.id).relation}</small></button>
        <Eye className="size-4" />
      </article>)}
      <Button size="sm" variant="outline" onClick={() => run((e, x) => leaveAlliance(e, x), 'İttifaktan ayrıldın.')}>İttifaktan ayrıl</Button>
    </section>
    <section className="empire-section"><h3><Crown className="size-4" /> İttifak sıralaması</h3><Rankings empire={empire} now={now} /></section>
  </div>
}
