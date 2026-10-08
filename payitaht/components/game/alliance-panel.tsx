'use client'
import { DiplomaticScene, RoyalFlagEditor } from './royal-diplomacy-kit'
import { ApprovedArt, RoyalCrest } from './approved-court-art'
import { CourtTabs } from './court-kit'

/**
 * İTTİFAK SAYFASI (alt menü) — Ikariam'daki ittifak ekranı.
 * İttifaksızken: kendi ittifakını kur ya da bir yapay ittifaka katıl.
 * Kendi ittifakında: Genel (sancak, sıralama, faydalar), Üyeler (rütbe,
 * çıkarma, davet), Genelge (bütün üyelere mesaj), Diplomasi (öbür
 * ittifaklarla barış, saldırmazlık, savaş). Üyeler yapay rakiptir.
 */
import { useState } from 'react'
import { Flag, Handshake, Scroll } from './ui-art'
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
import { profileOf, rivalHeraldry, setProfile, type Profile, type BannerId } from '@/lib/game/profile'
import { GoalCard, RewardTokens } from './goal-card'
type SancakChoice = Pick<Profile, 'crest' | 'color'> & { banner: BannerId }
import { Hint } from './hint'
import type { Run } from './world-panels'
import { t } from '@/lib/i18n/tr'

const num = (n: number) => Math.floor(n).toLocaleString('tr-TR')
const when = (t: number) => new Date(t).toLocaleString('tr-TR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })
type Tab = 'genel' | 'uyeler' | 'gorevler' | 'genelge' | 'diplomasi'

export function AlliancePanel({ empire, now, run, onRival, onEmbassy }: { empire: Empire; now: number; run: Run; onRival: (id: string) => void; onEmbassy: () => void }) {
  const w = empire.world
  const pact = w?.pact
  const [tab, setTab] = useState<Tab>('genel')
  if (!pact && !w?.alliance) return <NoAlliance empire={empire} run={run} onEmbassy={onEmbassy} />
  if (!pact && w?.alliance) return <FactionView empire={empire} now={now} run={run} onRival={onRival} f={w.alliance} />
  const p = pact!
  const unread = p.circulars.filter(c => !c.read).length
  const prof = profileOf(empire)
  return <div className="royal-page diplomatic-page alliance-page">
    <DiplomaticScene alliance title={`${p.name} [${p.tag}]`} subtitle={p.motto || `Lider · ${prof.ruler}`} standard={prof} />
    <div className="royal-summary"><span><ApprovedArt name="kurucu" /><span><b>{p.members.length + 1}/{pactCap(empire) + 1}</b>Üye</span></span><span><ApprovedArt name="laurel" /><span><b>{num(p.prestige ?? 0)}</b>İtibar</span></span><span><ApprovedArt name="seal" /><span><b>{unread}</b>Yeni genelge</span></span></div>
    {p.notice && <p className="diplomatic-notice"><ApprovedArt name="seal" /><span><b>İç duyuru</b>{p.notice}</span></p>}
    <CourtTabs items={(['genel', 'uyeler', 'gorevler', 'genelge', 'diplomasi'] as const).map(id => ({ id, label: id === 'genel' ? 'Birlik' : id === 'uyeler' ? 'Üyeler' : id === 'gorevler' ? 'Görevler' : id === 'genelge' ? `Genelge${unread ? ` (${unread})` : ''}` : 'Diplomasi', Icon: Scroll }))} value={tab} onChange={key => { setTab(key); if (key === 'genelge' && unread) run((e, x) => readCirculars(e, x)) }} label="İttifak defterleri" illustrated={false}>
      {tab === 'genel' && <General empire={empire} now={now} run={run} />}
      {tab === 'uyeler' && <Members empire={empire} now={now} run={run} onRival={onRival} />}
      {tab === 'gorevler' && <Goals empire={empire} now={now} run={run} />}
      {tab === 'genelge' && <Circulars empire={empire} run={run} />}
      {tab === 'diplomasi' && <Diplomacy empire={empire} run={run} />}
    </CourtTabs>
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
      <h3><ApprovedArt name="seal" /> İttifak sancağı</h3>
      <p className="fine-print">İttifakın, lider profilindeki sancak ve armayı kullanır.</p>
      <GameButton size="sm" variant="outline" aria-expanded={editBanner} onClick={() => { setLook({ crest: prof.crest, color: prof.color, banner: prof.banner ?? 'kirlangic' }); setEditBanner(!editBanner) }}>{editBanner ? t.action.cancel : 'Sancağı düzenle'}</GameButton>
      {editBanner && <RoyalFlagEditor value={look} change={setLook} save={() => { run((e, t) => setProfile(e, look, t), 'Sancak kaydedildi.'); setEditBanner(false) }} cancel={() => setEditBanner(false)} />}
    </section>
    <section className="empire-section">
      <h3><ApprovedArt name="laurel" /> İttifak sıralaması</h3>
      <Rankings empire={empire} now={now} />
    </section>
    <section className="empire-section">
      <h3><ApprovedArt name="military" /> Üyeliğin faydaları</h3>
      <ul className="alliance-perks">
        <li><ApprovedArt name="military" />Üyeler sana saldırmaz; baskında yardım ordusu yollar (Başkomutan iki kat).</li>
        <li><ApprovedArt name="seal" />Üye şehirlerine destek birliği gönderebilirsin (hükümdar sayfasından).</li>
        <li><ApprovedArt name="trade" />Hariciye Nazırı varsa üyelerden daha sık ticaret teklifi gelir.</li>
        <li><ApprovedArt name="kurucu" />Elçilik büyüdükçe üye sınırı artar (şu an {pactCap(empire)}).</li>
      </ul>
    </section>
    <PactTexts empire={empire} run={run} />
    <section className="empire-section">
      <h3><ApprovedArt name="seal" /> İttifak düsturu</h3>
      <div className="batch-row"><input aria-label="İttifak düsturu" id="pact-motto" className="text-input" value={motto} maxLength={80} placeholder="Birlikten kuvvet doğar" onChange={e => setMotto(e.target.value)} />
        <GameButton size="sm" onClick={() => run((e, x) => setPactMotto(e, motto, x), 'Düstur kaydedildi.')}>Kaydet</GameButton></div>
      {confirm ? <div className="batch-row"><GameButton size="sm" variant="destructive" onClick={() => run((e, x) => leavePact(e, x), 'İttifak dağıtıldı.')}>Evet, dağıt</GameButton><GameButton size="sm" variant="outline" onClick={() => setConfirm(false)}>{t.action.cancel}</GameButton></div>
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
      <h3><ApprovedArt name="kurucu" /> Üyeler · {p.members.length + 1}/{pactCap(empire) + 1}</h3>
      <div className="member-cards">
        <article className="member-card is-you">
          <span className="diplomatic-crest" style={{ backgroundColor: prof.color }}><RoyalCrest crest={prof.crest} /></span>
          <span className="member-card-name"><strong>{prof.ruler}</strong><small>sen</small></span>
          <span className="member-rank">{rankTitle(p, 'lider')}</span>
        </article>
        {p.members.map(id => {
          const r = rivalById(id)!, h = rivalHeraldry(id)
          return <article key={id} className="member-card">
            <button type="button" className="member-card-name" onClick={() => onRival(id)}>
              <span className="diplomatic-crest" style={{ backgroundColor: h.color }}><RoyalCrest crest={h.crest} /></span>
              <span><strong>{r.city}</strong><small>{r.ruler}</small><small>{STYLE_NAMES[r.style]} · Sv. {rivalLevel(empire, r, now)} · {num(rivalScore(empire, r, now).total)} puan</small></span>
            </button>
            <div className="member-card-tools">
              <select aria-label={`${r.ruler} rütbesi`} value={p.ranks[id] ?? 'uye'} onChange={e => run((x, t) => setRank(x, id, e.target.value as PactRank, t), 'Rütbe verildi.')}>
                {(Object.keys(PACT_RANKS) as PactRank[]).map(k => <option key={k} value={k}>{rankTitle(p, k)}</option>)}
              </select>
              <GameButton size="sm" variant="ghost" aria-label={`${r.ruler} ittifaktan çıkar`} onClick={() => run((x, t) => kickMember(x, id, t), 'Üye çıkarıldı.')}><ApprovedArt name="kurucu" /></GameButton>
            </div>
          </article>
        })}
      </div>
    </section>
    <RankDuties empire={empire} run={run} />
    <section className="empire-section">
      <h3><ApprovedArt name="kurucu" /> Davet et</h3>
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
    <h3><ApprovedArt name="science" /> Dış sayfa</h3>
    <p className="fine-print">Öbür hükümdarlar ittifakına bakınca bunu okur: kim olduğunuzu, kimi aradığınızı yaz.</p>
    {p.about && <blockquote className="pact-about">{p.about}</blockquote>}
    <label htmlFor="pact-about" className="profile-label">İttifakın tanıtımı</label>
    <textarea id="pact-about" className="text-input" rows={3} maxLength={ABOUT_MAX} value={about} placeholder="Adaların bekçileriyiz. Barışta tüccar, savaşta yoldaşız." onChange={e => setAbout(e.target.value)} />
    <small className="fine-print">{about.length} / {ABOUT_MAX}</small>
    <h3><ApprovedArt name="seal" /> İç duyuru</h3>
    <p className="fine-print">Yalnız üyeler görür; ittifak sayfasının en üstünde durur.</p>
    <label htmlFor="pact-notice" className="profile-label">Üyelere duyuru</label>
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
    <h3><ApprovedArt name="laurel" /> Rütbeler ve görevleri</h3>
    <p className="fine-print">Her rütbenin bir görevi ve yetkisi var. Rütbelere ittifakına özgü ad verebilirsin (ör. Serdar, Kethüda).</p>
    {(Object.keys(RANK_DUTIES) as (PactRank | 'lider')[]).map(k => {
      const d = RANK_DUTIES[k], who = holders(k)
      return <article key={k} className="rank-duty">
        <div className="rank-duty-head"><strong>{rankTitle(p, k)}</strong>{p.titles?.[k] && <small>({d.name})</small>}
          <button type="button" className="rank-duty-edit" onClick={() => { setEdit(edit === k ? null : k); setTitle(p.titles?.[k] ?? '') }}>{edit === k ? t.action.cancel : 'Adını değiştir'}</button></div>
        <p>{d.duty}</p>
        <ul className="rank-rights">{d.rights.map(r => <li key={r}><ApprovedArt name="laurel" />{r}</li>)}</ul>
        <small className="rank-who">{who.length ? who.join(', ') : k === 'uye' ? 'Rütbesiz üye yok' : 'Boş: Üyeler listesinden ata'}</small>
        {edit === k && <div className="batch-row"><input aria-label={`${d.name} rütbesinin adı`} id={`rank-title-${k}`} className="text-input" maxLength={TITLE_MAX} value={title} placeholder={d.name} onChange={e => setTitle(e.target.value)} />
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
    <h3><ApprovedArt name="laurel" /> İttifak görevleri</h3>
    <p className="fine-print">Her hafta üç ortak görev. Tamamlanan her görev akçe ve ittifaka {GOAL_PRESTIGE} itibar kazandırır; itibar sıralamaya eklenir. Yenilenmesine {days} gün {hours} saat.</p>
    {!g || g.week !== new Date(weekStart(now)).toISOString().slice(0, 10)
      ? <GameButton size="sm" onClick={() => run((e, x) => refreshPactGoals(e, x), 'Bu haftanın görevleri belirlendi.')}>Bu haftanın görevlerini getir</GameButton>
      : g.tasks.map(id => {
      const t = PACT_GOALS.find(x => x.id === id)!
      const prog = pactGoalProgress(empire, id, now), done = g.claimed.includes(id)
      return <GoalCard key={id} art={<ApprovedArt name="laurel" />} title={t.text} value={prog} need={t.need} goods={{ gold: t.gold }}
        reward={<RewardTokens reward={{ gold: t.gold }} extra={<span className="goal-token"><ApprovedArt name="laurel" /><b>+{GOAL_PRESTIGE}</b> itibar</span>} />}
        state={done ? 'done' : prog >= t.need ? 'ready' : 'run'} onClaim={() => run((e, x) => claimPactGoal(e, id, x), 'İttifak görevi tamamlandı.')} />
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
      <h3><ApprovedArt name="bell" /> Genelge yaz</h3>
      <div className="world-tabs circular-topics" role="group" aria-label="Konu">
        {(Object.keys(CIRCULAR_TOPICS) as CircularTopic[]).map(k => <button key={k} type="button" aria-pressed={topic === k} onClick={() => setTopic(k)}><span>{CIRCULAR_TOPICS[k].subject}</span></button>)}
      </div>
      <p className="fine-print">{CIRCULAR_TOPICS[topic].body}</p>
      <label className="sr-only" htmlFor="pact-note">Ek not</label>
      <input id="pact-note" className="text-input" value={note} maxLength={140} placeholder="Ek not (isteğe bağlı)" onChange={e => setNote(e.target.value)} />
      <GameButton size="sm" onClick={() => { run((e, x) => sendCircular(e, topic, note, x), 'Genelge bütün üyelere ulaştı.'); setNote('') }}><ApprovedArt name="bell" />Bütün üyelere gönder</GameButton>
    </section>
    <section className="empire-section">
      <h3><ApprovedArt name="seal" /> Genelgeler</h3>
      {p.circulars.map(c => <article key={c.id} className={`report-card${c.read ? '' : ' unread'}`}>
        <div className="report-head"><ApprovedArt name="seal" /><strong>{c.subject}</strong><time>{when(c.time)}</time></div>
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
    <h3><ApprovedArt name="military" /> İttifaklar arası diplomasi</h3>
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

function NoAlliance({ empire, run, onEmbassy }: { empire: Empire; run: Run; onEmbassy: () => void }) {
  const [name, setName] = useState('')
  const [tag, setTag] = useState('')
  const [tab, setTab] = useState<'found' | 'join'>('found')
  const prof = profileOf(empire), embassy = Math.max(...empire.cities.map(c => c.game.buildings.elcilik))
  return <div className="royal-page diplomatic-page alliance-foundation"><DiplomaticScene alliance title="Sancağının altında" subtitle="Bir birlik kur, adalarda yoldaş bul" standard={prof} /><div className="diplomatic-requirements"><ApprovedArt name="city" /><span>En yüksek Elçilik · {embassy}<small>Kendi birliğin için Elçilik; katılmak için seviye 3 ve ortalama 5 ilişki.</small></span></div><CourtTabs illustrated={false} label="İttifak seçimi" items={[{id:'found', label:'Birlik kur', Icon: Flag},{id:'join',label:'Birliğe katıl',Icon: Handshake}]} value={tab} onChange={setTab}>
    {tab === 'found' && <section className="empire-section">
      <h3><ApprovedArt name="seal" /> Kendi ittifakını kur</h3>
      <p className="fine-print">Elçiliği olan her hükümdar ittifak kurabilir. Lider sen olursun; yapay rakipleri davet eder, rütbe dağıtır, genelge yazarsın.</p>
      {!embassy && <GameButton onClick={onEmbassy}>Elçiliği kur</GameButton>}
      <label htmlFor="pact-name" className="profile-label">İttifak adı</label>
      <input id="pact-name" className="text-input" value={name} maxLength={30} placeholder="Ay Yıldız Birliği" onChange={e => setName(e.target.value)} />
      <label htmlFor="pact-tag" className="profile-label">Kısaltma</label>
      <input id="pact-tag" className="text-input" value={tag} maxLength={5} placeholder="AYB" onChange={e => setTag(e.target.value)} />
      <GameButton disabled={!embassy || name.trim().length < 3 || tag.trim().length < 2} onClick={() => run((e, x) => foundPact(e, name, tag, x), 'İttifak kuruldu!')}><ApprovedArt name="seal" />İttifakı kur</GameButton>
    </section>}
    {tab === 'join' && <section className="empire-section">
      <h3><ApprovedArt name="trade" /> Ya da bir ittifaka katıl</h3>
      {(Object.keys(FACTIONS) as FactionId[]).map(f => <article key={f} className="mission-row">
        <span><strong>{FACTIONS[f].name}</strong><small>“{FACTIONS[f].motto}” · {factionMembers(f).length} yapay rakip · ortalama ilişki {factionStanding(empire, f)}</small></span>
        <GameButton size="sm" onClick={() => run((e, x) => joinAlliance(e, f, x), 'İttifaka katıldın.')}>Katıl</GameButton>
      </article>)}
      <Hint>Katılmak için Elçilik 3. seviye ve üyelerle ortalama 5 ilişki gerekir.</Hint>
    </section>}</CourtTabs>
  </div>
}

function FactionView({ empire, now, run, onRival, f }: { empire: Empire; now: number; run: Run; onRival: (id: string) => void; f: FactionId }) {
  return <div className="royal-page diplomatic-page alliance-faction"><DiplomaticScene alliance title={FACTIONS[f].name} subtitle={FACTIONS[f].motto} standard={profileOf(empire)} /><div className="diplomatic-faction-body">
    <section className="empire-section">
      <h3><ApprovedArt name="military" /> {FACTIONS[f].name} · üyesin</h3>
      <p className="fine-print">“{FACTIONS[f].motto}” Bu ittifakın lideri yapay rakiplerdir; sen üyesin. Kendi ittifakını kurmak için önce ayrıl.</p>
      {factionMembers(f).map(r => <article key={r.id} className="member-row">
        <button type="button" className="member-name" onClick={() => onRival(r.id)}><strong>{r.city}</strong><small>{r.ruler} · sv. {rivalLevel(empire, r, now)} · ilişki {peek(empire, r.id).relation}</small></button>
        <ApprovedArt name="seal" />
      </article>)}
      <GameButton size="sm" variant="outline" onClick={() => run((e, x) => leaveAlliance(e, x), 'İttifaktan ayrıldın.')}>İttifaktan ayrıl</GameButton>
    </section>
    <section className="empire-section"><h3><ApprovedArt name="laurel" /> İttifak sıralaması</h3><Rankings empire={empire} now={now} /></section>
  </div></div>
}
