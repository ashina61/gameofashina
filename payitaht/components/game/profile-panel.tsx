'use client'

/**
 * HÜKÜMDAR PROFİLİ (Ikariam'daki oyuncu profili) ve SÜRÜM NOTLARI.
 * Profil: arma, ad, unvan, düstur, puanlar ve sıralama, şehirler,
 * istatistikler, başarımlar. Sürüm numarası sayfanın dibinde, sessizce durur.
 */
import { useState } from 'react'
import { Award, Castle, Pencil, Settings, Swords, Trophy, ScrollText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { population, soldiers } from '@/lib/game/engine'
import { capitalId, islandOf, type Empire } from '@/lib/game/empire'
import {
  BANNERS, BANNER_NAMES, CREST_COLORS, CREST_NAMES, CRESTS, type BannerId, achievements, allianceName, playerScore, profileOf, profileRanks, profileStats, rulerTitle, setProfile,
  type CrestId,
} from '@/lib/game/profile'
import { CHANGELOG, VERSION } from '@/lib/game/changelog'
import type { Run } from './world-panels'

const num = (n: number) => Math.floor(n).toLocaleString('tr-TR')
const GOLD = '#e2bd78', INK = '#2a1a10', PAPER = '#f6ecd6'

function CrestSymbol({ crest }: { crest: CrestId }) {
  const s = { stroke: INK, strokeWidth: 1.2, strokeLinejoin: 'round' as const }
  switch (crest) {
    case 'hilal': return <g><path d="M36 20 A13 13 0 1 0 36 44 A10 10 0 1 1 36 20 Z" fill={PAPER} /><path d="M42 29 l1.6 3.4 3.7 0.4 -2.8 2.5 0.8 3.6 -3.3 -1.9 -3.3 1.9 0.8 -3.6 -2.8 -2.5 3.7 -0.4 Z" fill={PAPER} /></g>
    case 'lale': return <g {...s}><path d="M32 46 V32" stroke="#6f9a48" strokeWidth="2" /><path d="M32 40 Q24 38 22 32 Q30 32 32 38" fill="#6f9a48" /><path d="M24 20 Q24 32 32 34 Q40 32 40 20 Q36 26 32 18 Q28 26 24 20 Z" fill={PAPER} /></g>
    case 'kilic': return <g {...s}><path d="M20 46 Q30 30 44 18" stroke={PAPER} strokeWidth="3" fill="none" /><path d="M44 46 Q34 30 20 18" stroke={PAPER} strokeWidth="3" fill="none" /><path d="M18 42 L24 48 M46 42 L40 48" stroke={GOLD} strokeWidth="2.5" /></g>
    case 'gemi': return <g {...s}><path d="M16 38 H48 L43 46 H21 Z" fill={PAPER} /><path d="M32 38 V16" /><path d="M33 18 Q44 26 42 34 H33 Z" fill={PAPER} /><path d="M18 44 L14 50 M24 45 L20 51 M30 46 L26 52" stroke={PAPER} /></g>
    case 'kule': return <g {...s}><path d="M22 46 V24 H26 V20 H30 V24 H34 V20 H38 V24 H42 V46 Z" fill={PAPER} /><path d="M29 46 V38 A3 3 0 0 1 35 38 V46" fill={INK} /><path d="M30 30 H34" /></g>
    case 'kitap': return <g {...s}><path d="M32 24 Q25 20 18 22 V42 Q25 40 32 44 Q39 40 46 42 V22 Q39 20 32 24 Z" fill={PAPER} /><path d="M32 24 V44" /></g>
  }
}


/**
 * SANCAK — direğe bağlı, rüzgârda dalgalanan hükümdar bayrağı. Dalga direkten
 * uca doğru büyür; biçim profilde seçilir, renk ve arma profilden gelir.
 */
function flagPath(banner: BannerId, phase: number) {
  const x0 = 46, top = 22, h = 116, L = 244, N = 16
  const wave = (x: number) => Math.sin(x / L * Math.PI * 2.2 + phase) * 9 * (x / L)
  const edge = (y: number, t: number) => { const x = t * L; return [x0 + x, y + wave(x) + (banner === 'ucgen' ? (y === top ? t * h * 0.46 : -t * h * 0.46) : 0)] }
  const topPts = Array.from({ length: N + 1 }, (_, i) => edge(top, i / N))
  const botPts = Array.from({ length: N + 1 }, (_, i) => edge(top + h, i / N)).reverse()
  const [tx, ty] = topPts[N], [bx, by] = botPts[0]
  const fly: number[][] = banner === 'kirlangic' ? [[tx - 64, (ty + by) / 2]]
    : banner === 'cifte' ? [[tx - 6, ty + h * 0.16], [tx - 30, ty + h * 0.34], [tx - 118, (ty + by) / 2], [bx - 30, by - h * 0.34], [bx - 6, by - h * 0.16]]
    : banner === 'ucgen' ? [] : []
  const pts = [...topPts, ...fly, ...botPts]
  return 'M' + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L') + ' Z'
}
export function SancakArt({ crest, color, banner = 'kirlangic', size = 280, still = false }: { crest: CrestId; color: string; banner?: BannerId; size?: number; still?: boolean }) {
  const frames = [0, 1.6, 3.2, 4.8, 6.4].map(ph => flagPath(banner, ph))
  const id = `sancak-${banner}-${color.slice(1)}`
  return <svg viewBox="0 0 320 214" width={size} height={size * 214 / 320} className="sancak-art" role="img" aria-label={`Sancak: ${BANNER_NAMES[banner]}`}>
    <defs>
      <linearGradient id={`${id}-fold`} x1="0" x2="1">
        {[0, 0.18, 0.36, 0.54, 0.72, 0.9].map((o, i) => <stop key={o} offset={o} stopColor={i % 2 ? '#000' : '#fff'} stopOpacity={i % 2 ? 0.16 : 0.1} />)}
      </linearGradient>
    </defs>
    {/* Direk ve alem */}
    <rect x="38" y="16" width="7" height="196" rx="3" fill="#6b4424" />
    <rect x="39.5" y="16" width="2" height="196" fill="#9a6a3a" opacity="0.7" />
    <circle cx="41.5" cy="14" r="6" fill="#e2bd78" stroke="#8a5a22" strokeWidth="1.2" />
    <path d="M41.5 -2 a8 8 0 1 0 0.1 0 a6 6 0 1 1 -0.1 0 Z" fill="#e2bd78" transform="translate(0 2) scale(1 0.9)" />
    <g>
      <path d={frames[0]} fill={color} stroke="#e2bd78" strokeWidth="3" strokeLinejoin="round">
        {!still && <animate attributeName="d" dur="2.6s" repeatCount="indefinite" values={frames.join(';')} />}
      </path>
      <path d={frames[0]} fill={`url(#${id}-fold)`}>
        {!still && <animate attributeName="d" dur="2.6s" repeatCount="indefinite" values={frames.join(';')} />}
      </path>
      <g transform={`translate(${banner === 'ucgen' ? 96 : 128} 50) scale(${banner === 'ucgen' ? 1.1 : 1.5})`}>
        {!still && <animateTransform attributeName="transform" type="translate" additive="sum" dur="2.6s" repeatCount="indefinite" values="0 0; 0 3; 0 0; 0 -3; 0 0" />}
        <CrestSymbol crest={crest} />
      </g>
    </g>
  </svg>
}

/** Hükümdar arması: altın çerçeveli kalkan, renk zemin, sembol. */
export function RulerCrest({ crest, color, size = 72 }: { crest: CrestId; color: string; size?: number }) {
  return <svg viewBox="0 0 64 64" width={size} height={size} role="img" aria-label={`Arma: ${CREST_NAMES[crest]}`} className="ruler-crest">
    <path d="M32 3 L56 12 V30 Q56 50 32 61 Q8 50 8 30 V12 Z" fill="#6a4a1a" />
    <path d="M32 6 L53 14 V30 Q53 48 32 58 Q11 48 11 30 V14 Z" fill={color} stroke={GOLD} strokeWidth="2" />
    <path d="M32 10 L49 16.5 V30 Q49 45 32 54 Q15 45 15 30 V16.5 Z" fill="none" stroke={GOLD} strokeWidth="0.7" opacity="0.7" />
    <CrestSymbol crest={crest} />
  </svg>
}

export function ProfilePanel({ empire, now, run, onCity, onSettings, onChangelog }: {
  empire: Empire; now: number; run: Run; onCity: (id: string) => void; onSettings: () => void; onChangelog: () => void
}) {
  const p = profileOf(empire)
  const score = playerScore(empire)
  const title = rulerTitle(score.total)
  const ranks = profileRanks(empire, now)
  const stats = profileStats(empire)
  const list = achievements(empire)
  const [edit, setEdit] = useState(false)
  const banner = p.banner ?? 'kirlangic'
  const [draft, setDraft] = useState({ ruler: p.ruler, motto: p.motto, crest: p.crest, color: p.color, banner })
  const days = Math.max(1, Math.ceil((now - p.since) / 86_400_000))
  const done = list.filter(a => a.value >= a.goal).length
  const tiles: [string, number, number][] = [['Toplam puan', score.total, ranks.total], ['İnşaatçı', score.builder, ranks.builder],
    ['Askerî', score.military, ranks.military], ['Saldırı', score.offense, ranks.offense], ['Savunma', score.defense, ranks.defense],
    ['Bilim', score.science, ranks.science], ['Hazine', score.gold, ranks.gold], ['Ticaret', score.trade, ranks.trade]]
  const rows: [string, string][] = [
    ['Şehir', num(stats.cities)], ['Nüfus', num(stats.population)], ['Asker ve tayfa', num(stats.soldiers)], ['Bina seviyesi', num(stats.levels)],
    ['Araştırma', num(stats.research)], ['Kurulan yapı', num(stats.builds)], ['Eğitilen birlik', num(stats.trained)], ['Bağış (kereste)', num(stats.donated)],
    ['Kazanılan savaş', num(stats.won)], ['Kaybedilen savaş', num(stats.lost)], ['Sefer yağması', num(stats.raids)], ['Casus görevi', num(stats.spies)],
    ['Korsan şöhreti', num(stats.fame)], ['Nakliye', num(stats.shipments)],
  ]
  return <div className="advisor-panel profile-panel">
    <section className="profile-sancak" aria-label="Hükümdarın sancağı">
      <SancakArt crest={edit ? draft.crest : p.crest} color={edit ? draft.color : p.color} banner={edit ? draft.banner : banner} size={300} />
      <span className="profile-sancak-name"><small>{title.name}</small>{p.ruler}</span>
    </section>
    <article className="profile-head">
      <RulerCrest crest={p.crest} color={p.color} size={92} />
      <div className="profile-id">
        <span className="eyebrow">{title.name.toLocaleUpperCase('tr')} · {days}. SALTANAT GÜNÜ</span>
        <strong>{p.ruler}</strong>
        {p.motto && <q>{p.motto}</q>}
        <small>{allianceName(empire) ?? 'İttifaksız'} · {empire.cities.length} şehir</small>
      </div>
      <Button size="sm" variant="outline" onClick={() => { setDraft({ ruler: p.ruler, motto: p.motto, crest: p.crest, color: p.color, banner }); setEdit(e => !e) }} aria-expanded={edit}>
        <Pencil data-icon="inline-start" />{edit ? 'Kapat' : 'Düzenle'}</Button>
    </article>

    {edit && <section className="empire-section profile-edit">
      <label htmlFor="profile-name">Hükümdarın adı</label>
      <input id="profile-name" className="text-input" value={draft.ruler} maxLength={24} onChange={e => setDraft({ ...draft, ruler: e.target.value })} />
      <label htmlFor="profile-motto">Düstur</label>
      <input id="profile-motto" className="text-input" value={draft.motto} maxLength={60} placeholder="Devlet-i ebed-müddet" onChange={e => setDraft({ ...draft, motto: e.target.value })} />
      <span className="profile-label">Sancak</span>
      <div className="banner-picker" role="radiogroup" aria-label="Sancak biçimi">{BANNERS.map(b => <button key={b} type="button" role="radio" aria-checked={draft.banner === b}
        onClick={() => setDraft({ ...draft, banner: b })} title={BANNER_NAMES[b]}><SancakArt crest={draft.crest} color={draft.color} banner={b} size={72} still /><small>{BANNER_NAMES[b]}</small></button>)}</div>
      <span className="profile-label">Arma</span>
      <div className="crest-picker" role="radiogroup" aria-label="Arma">{CRESTS.map(c => <button key={c} type="button" role="radio" aria-checked={draft.crest === c}
        onClick={() => setDraft({ ...draft, crest: c })} title={CREST_NAMES[c]}><RulerCrest crest={c} color={draft.color} size={44} /></button>)}</div>
      <span className="profile-label">Renk</span>
      <div className="color-picker" role="radiogroup" aria-label="Renk">{CREST_COLORS.map(c => <button key={c} type="button" role="radio" aria-checked={draft.color === c}
        style={{ background: c }} onClick={() => setDraft({ ...draft, color: c })} aria-label={c} />)}</div>
      <Button size="sm" onClick={() => { run((e, t) => setProfile(e, draft, t), 'Profil kaydedildi.'); setEdit(false) }}>Kaydet</Button>
    </section>}

    <section className="empire-section">
      <h3><Award className="size-4" /> Unvan</h3>
      <div className="title-track"><span style={{ width: `${Math.round(title.progress * 100)}%` }} /></div>
      <p className="fine-print">{title.next ? `${title.next} unvanına ${num(title.need)} puan kaldı.` : 'En yüksek unvana ulaştın.'} Unvanlar: Bey, Sancakbeyi, Beylerbeyi, Vezir, Sadrazam, Sultan.</p>
    </section>

    <section className="empire-section">
      <h3><Trophy className="size-4" /> Puanlar ve sıralama</h3>
      <div className="profile-tiles">{tiles.map(([n, v, r]) => <div key={n}><small>{n}</small><strong>{num(v)}</strong><span>{r}. / {ranks.of}</span></div>)}</div>
      <p className="fine-print">Sıralamadaki diğer hükümdarlar yapay rakiplerdir, gerçek oyuncu değildir.</p>
    </section>

    <section className="empire-section">
      <h3><Castle className="size-4" /> Şehirlerin</h3>
      {empire.cities.map(c => <button key={c.id} type="button" className="profile-city" onClick={() => onCity(c.id)}>
        <strong>{c.name}{c.id === capitalId(empire) ? ' · başkent' : ''}</strong>
        <small>{islandOf(c).name} · Divanhane {c.game.buildings.divan} · nüfus {num(population(c.game))} · asker {num(soldiers(c.game))}</small>
      </button>)}
    </section>

    <section className="empire-section">
      <h3><Swords className="size-4" /> İstatistikler</h3>
      <dl className="profile-stats">{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
    </section>

    <section className="empire-section">
      <h3><Award className="size-4" /> Başarımlar · {done}/{list.length}</h3>
      <div className="achievements">{list.map(a => {
        const ok = a.value >= a.goal
        return <div key={a.id} className={ok ? 'achievement is-done' : 'achievement'}>
          <span className="achievement-medal" aria-hidden="true">{ok ? '★' : '☆'}</span>
          <span><strong>{a.name}</strong><small>{a.description}</small>
            <span className="achievement-bar"><i style={{ width: `${Math.min(100, (100 * a.value) / a.goal)}%` }} /></span>
            <small>{num(Math.min(a.value, a.goal))} / {num(a.goal)}</small></span>
        </div>
      })}</div>
    </section>

    <div className="profile-foot">
      <Button size="sm" variant="outline" onClick={onSettings}><Settings data-icon="inline-start" />Oyun ayarları</Button>
      <button type="button" className="version-link" onClick={onChangelog}>Sürüm {VERSION} · sürüm notları</button>
    </div>
  </div>
}

/** Sürüm notları: baştan sona. */
export function ChangelogPanel() {
  return <div className="advisor-panel changelog">
    <p className="fine-print"><ScrollText className="size-3" /> Payitaht Adaları'nın ilk satırından bugüne yapılan her şey. En yeni sürüm en üstte.</p>
    {CHANGELOG.map((r, i) => <article key={r.version} className="release">
      <div className="release-head"><span className="release-version">{r.version}</span><strong>{r.title}</strong>{i === 0 && <em>Yeni</em>}<time>{r.date}</time></div>
      <ul>{r.notes.map(n => <li key={n}>{n}</li>)}</ul>
    </article>)}
  </div>
}
