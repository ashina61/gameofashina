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
import { BookOpen, Check, Crown, Eye, Flag, Handshake, ListChecks, Megaphone, Pin, Scroll, Shield, Swords, UserMinus, UserPlus, Users } from './ui-art'
import { GameButton } from './game-button'
import type { Empire } from '@/lib/game/empire'
import {
  ABOUT_MAX, CIRCULAR_TOPICS, GOAL_PRESTIGE, NOTICE_MAX, PACT_GOALS, PACT_RANKS, RANK_DUTIES, STANCES, TITLE_MAX, allianceRankings, claimPactGoal,
  foundPact, invitePact, inviteNeed, kickMember, leavePact, pactCap, pactGoalProgress, rankTitle, readCirculars, sendCircular, setPactMotto,
  refreshPactGoals, setPactTexts, setRank, setRankTitle, setStance, weekStart, type CircularTopic, type PactRank, type Stance,
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
type Tab = 'genel' | 'uyeler' | 'gorevler' | 'genelge' | 'diplomasi'

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
        <small>{p.members.length + 1} / {pactCap(empire) + 1} üye · itibar {num(p.prestige ?? 0)} · kuruluş {new Date(p.founded).toLocaleDateString('tr-TR')}</small></div>
    </section>
    {p.notice && <p className="pact-notice"><Pin className="size-4" aria-hidden="true" /><span><b>İç duyuru</b>{p.notice}</span></p>}
    <div className="world-tabs alliance-tabs" role="group" aria-label="İttifak">
      {([['genel', 'Genel', Shield], ['uyeler', 'Üyeler', Users], ['gorevler', 'Görevler', ListChecks], ['genelge', 'Genelge', Megaphone], ['diplomasi', 'Diplomasi', Handshake]] as const).map(([k, label, Icon]) =>
        <button key={k} type="button" aria-pressed={tab === k} onClick={() => { setTab(k); if (k === 'genelge' && unread) run((e, x) => readCirculars(e, x)) }}>
          <Icon className="size-5" /><span>{label}</span>{k === 'genelge' && unread > 0 && <b className="world-tab-badge" data-tiny>{unread}</b>}</button>)}
    </div>
    {tab === 'genel' && <General empire={empire} now={now} run={run} />}
    {tab === 'uyeler' && <Members empire={empire} now={now} run={run} onRival={onRival} />}
    {tab === 'gorevler' && <Goals empire={empire} now={now} run={run} />}
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
      <GameButton size="sm" variant="outline" aria-expanded={editBanner} onClick={() => { setLook({ crest: prof.crest, color: prof.color, banner: prof.banner ?? 'kirlangic' }); setEditBanner(!editBanner) }}>{editBanner ? 'Vazgeç' : 'Sancağı düzenle'}</GameButton>
      {editBanner && <>
        <SancakArt {...look} size={260} />
        <SancakPicker value={look} onChange={setLook} />
        <GameButton size="sm" onClick={() => { run((e, t) => setProfile(e, look, t), 'Sancak kaydedildi.'); setEditBanner(false) }}>Sancağı kaydet</GameButton>
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
    <PactTexts empire={empire} run={run} />
    <section className="empire-section">
      <h3><Scroll className="size-4" /> İttifak düsturu</h3>
      <div className="batch-row"><input id="pact-motto" className="text-input" value={motto} maxLength={80} placeholder="Birlikten kuvvet doğar" onChange={e => setMotto(e.target.value)} />
        <GameButton size="sm" onClick={() => run((e, x) => setPactMotto(e, motto, x), 'Düstur kaydedildi.')}>Kaydet</GameButton></div>
      {confirm ? <div className="batch-row"><GameButton size="sm" variant="destructive" onClick={() => run((e, x) => leavePact(e, x), 'İttifak dağıtıldı.')}>Evet, dağıt</GameButton><GameButton size="sm" variant="outline" onClick={() => setConfirm(false)}>Vazgeç</GameButton></div>
        : <GameButton size="sm" variant="outline" onClick={() => setConfirm(true)}>İttifakı dağıt</GameButton>}
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
      <article className="member-row is-you"><span><strong>{prof.ruler}</strong><small>{rankTitle(p, 'lider')} · sen</small></span></article>
      {p.members.map(id => {
        const r = rivalById(id)!
        return <article key={id} className="member-row">
          <button type="button" className="member-name" onClick={() => onRival(id)}><strong>{r.city}</strong><small>{r.ruler} · {STYLE_NAMES[r.style]} · sv. {rivalLevel(empire, r, now)} · {num(rivalScore(empire, r, now).total)} puan</small></button>
          <select aria-label={`${r.ruler} rütbesi`} value={p.ranks[id] ?? 'uye'} onChange={e => run((x, t) => setRank(x, id, e.target.value as PactRank, t), 'Rütbe verildi.')}>
            {(Object.keys(PACT_RANKS) as PactRank[]).map(k => <option key={k} value={k}>{rankTitle(p, k)}</option>)}
          </select>
          <GameButton size="sm" variant="ghost" aria-label={`${r.ruler} ittifaktan çıkar`} onClick={() => run((x, t) => kickMember(x, id, t), 'Üye çıkarıldı.')}><UserMinus /></GameButton>
        </article>
      })}
    </section>
    <RankDuties empire={empire} run={run} />
    <section className="empire-section">
      <h3><UserPlus className="size-4" /> Davet et</h3>
      <p className="fine-print">Hükümdar, ilişkiniz en az {need} ise daveti kabul eder ve eski ittifakından ayrılır. İlişkiyi hediye ve selamla ısıt (Elçi · Diplomasi).</p>
      {candidates.map(r => {
        const rel = peek(empire, r.id).relation
        return <article key={r.id} className="member-row">
          <button type="button" className="member-name" onClick={() => onRival(r.id)}><strong>{r.city}</strong><small>{r.ruler} · {FACTIONS[r.faction].name} · ilişki <b className={rel >= need ? 'report-win' : 'report-loss'}>{rel}</b></small></button>
          <GameButton size="sm" disabled={p.members.length >= pactCap(empire)} variant={rel >= need ? 'default' : 'outline'} onClick={() => run((x, t) => invitePact(x, r.id, t), `${r.ruler} ittifaka katıldı!`)}>Davet et</GameButton>
        </article>
      })}
    </section>
  </>
}

/** Dış sayfa (herkese görünen tanıtım) ve iç duyuru (yalnız üyelere). */
function PactTexts({ empire, run }: { empire: Empire; run: Run }) {
  const p = empire.world!.pact!
  const [about, setAbout] = useState(p.about ?? '')
  const [notice, setNotice] = useState(p.notice ?? '')
  return <section className="empire-section pact-texts">
    <h3><BookOpen className="size-4" /> Dış sayfa</h3>
    <p className="fine-print">Öbür hükümdarlar ittifakına bakınca bunu okur: kim olduğunuzu, kimi aradığınızı yaz.</p>
    {p.about && <blockquote className="pact-about">{p.about}</blockquote>}
    <textarea id="pact-about" className="text-input" rows={3} maxLength={ABOUT_MAX} value={about} placeholder="Adaların bekçileriyiz. Barışta tüccar, savaşta yoldaşız." onChange={e => setAbout(e.target.value)} />
    <small className="fine-print">{about.length} / {ABOUT_MAX}</small>
    <h3><Pin className="size-4" /> İç duyuru</h3>
    <p className="fine-print">Yalnız üyeler görür; ittifak sayfasının en üstünde durur.</p>
    <textarea id="pact-notice" className="text-input" rows={2} maxLength={NOTICE_MAX} value={notice} placeholder="Cuma günü ortak talim; korsanlara karşı limanlar tetikte." onChange={e => setNotice(e.target.value)} />
    <small className="fine-print">{notice.length} / {NOTICE_MAX}</small>
    <GameButton size="sm" onClick={() => run((e, x) => setPactTexts(e, { about, notice }, x), 'İttifak sayfası kaydedildi.')}>Kaydet</GameButton>
  </section>
}

/** Rütbeler ve görevleri: kimin hangi görevde olduğu, yetkileri ve ittifaka özel rütbe adları. */
function RankDuties({ empire, run }: { empire: Empire; run: Run }) {
  const p = empire.world!.pact!
  const prof = profileOf(empire)
  const [edit, setEdit] = useState<PactRank | 'lider' | null>(null)
  const [title, setTitle] = useState('')
  const holders = (k: PactRank | 'lider') => k === 'lider' ? [prof.ruler]
    : p.members.filter(id => (p.ranks[id] ?? 'uye') === k).map(id => rivalById(id)!.ruler)
  return <section className="empire-section">
    <h3><Crown className="size-4" /> Rütbeler ve görevleri</h3>
    <p className="fine-print">Her rütbenin bir görevi ve yetkisi var. Rütbelere ittifakına özgü ad verebilirsin (ör. Serdar, Kethüda).</p>
    {(Object.keys(RANK_DUTIES) as (PactRank | 'lider')[]).map(k => {
      const d = RANK_DUTIES[k], who = holders(k)
      return <article key={k} className="rank-duty">
        <div className="rank-duty-head"><strong>{rankTitle(p, k)}</strong>{p.titles?.[k] && <small>({d.name})</small>}
          <button type="button" className="rank-duty-edit" onClick={() => { setEdit(edit === k ? null : k); setTitle(p.titles?.[k] ?? '') }}>{edit === k ? 'Vazgeç' : 'Adını değiştir'}</button></div>
        <p>{d.duty}</p>
        <ul className="rank-rights">{d.rights.map(r => <li key={r}><Check aria-hidden="true" />{r}</li>)}</ul>
        <small className="rank-who">{who.length ? who.join(', ') : k === 'uye' ? 'Rütbesiz üye yok' : 'Boş: Üyeler listesinden ata'}</small>
        {edit === k && <div className="batch-row"><input id={`rank-title-${k}`} className="text-input" maxLength={TITLE_MAX} value={title} placeholder={d.name} onChange={e => setTitle(e.target.value)} />
          <GameButton size="sm" onClick={() => { run((e, x) => setRankTitle(e, k, title, x), 'Rütbe adı kaydedildi.'); setEdit(null) }}>Kaydet</GameButton></div>}
      </article>
    })}
  </section>
}

/** Haftalık ittifak görevleri: üç ortak hedef, ödül akçe + ittifak itibarı. */
function Goals({ empire, now, run }: { empire: Empire; now: number; run: Run }) {
  const p = empire.world!.pact!
  const g = p.goals
  const ends = weekStart(now) + 7 * 24 * 3600_000
  const left = Math.max(0, ends - now), days = Math.floor(left / 86_400_000), hours = Math.floor(left % 86_400_000 / 3_600_000)
  return <section className="empire-section">
    <h3><ListChecks className="size-4" /> İttifak görevleri</h3>
    <p className="fine-print">Her hafta üç ortak görev. Tamamlanan her görev akçe ve ittifaka {GOAL_PRESTIGE} itibar kazandırır; itibar sıralamaya eklenir. Yenilenmesine {days} gün {hours} saat.</p>
    {!g || g.week !== new Date(weekStart(now)).toISOString().slice(0, 10)
      ? <GameButton size="sm" onClick={() => run((e, x) => refreshPactGoals(e, x), 'Bu haftanın görevleri belirlendi.')}>Bu haftanın görevlerini getir</GameButton>
      : g.tasks.map(id => {
      const t = PACT_GOALS.find(x => x.id === id)!
      const prog = pactGoalProgress(empire, id, now), done = g.claimed.includes(id)
      return <article key={id} className={done ? 'daily-task milestone is-done' : prog >= t.need ? 'daily-task milestone is-ready' : 'daily-task milestone'}>
        <span className="milestone-seal" aria-hidden="true"><Shield /></span>
        <span><strong>{t.text}</strong><small>{prog} / {t.need} · ödül {num(t.gold)} akçe, +{GOAL_PRESTIGE} itibar</small></span>
        <span className="people-meter"><span style={{ width: `${prog / t.need * 100}%` }} /></span>
        <GameButton size="sm" disabled={done || prog < t.need} onClick={() => run((e, x) => claimPactGoal(e, id, x), 'İttifak görevi tamamlandı.')}>{done ? 'Alındı' : prog < t.need ? 'Sürüyor' : 'Ödülü al'}</GameButton>
      </article>
    })}
  </section>
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
      <GameButton size="sm" onClick={() => { run((e, x) => sendCircular(e, topic, note, x), 'Genelge bütün üyelere ulaştı.'); setNote('') }}><Megaphone data-icon="inline-start" />Bütün üyelere gönder</GameButton>
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
      <GameButton onClick={() => run((e, x) => foundPact(e, name, tag, x), 'İttifak kuruldu!')}><Flag data-icon="inline-start" />İttifakı kur</GameButton>
    </section>
    <section className="empire-section">
      <h3><Handshake className="size-4" /> Ya da bir ittifaka katıl</h3>
      {(Object.keys(FACTIONS) as FactionId[]).map(f => <article key={f} className="mission-row">
        <span><strong>{FACTIONS[f].name}</strong><small>“{FACTIONS[f].motto}” · {factionMembers(f).length} yapay rakip · ortalama ilişki {factionStanding(empire, f)}</small></span>
        <GameButton size="sm" onClick={() => run((e, x) => joinAlliance(e, f, x), 'İttifaka katıldın.')}>Katıl</GameButton>
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
      <GameButton size="sm" variant="outline" onClick={() => run((e, x) => leaveAlliance(e, x), 'İttifaktan ayrıldın.')}>İttifaktan ayrıl</GameButton>
    </section>
    <section className="empire-section"><h3><Crown className="size-4" /> İttifak sıralaması</h3><Rankings empire={empire} now={now} /></section>
  </div>
}
