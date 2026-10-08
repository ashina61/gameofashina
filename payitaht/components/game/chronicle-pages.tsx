'use client'

import { useId, useState, type ReactNode, type CSSProperties } from 'react'
import { asset } from '@/lib/asset'
import { groupLog, type Game } from '@/lib/game/engine'
import { dayGroups, dayLabel, logKind, type LogKind } from '@/lib/game/log-view'
import { CHANGELOG, VERSION, type Release } from '@/lib/game/changelog'
import { BookOpen, Gift, Hammer, ScrollText, Ship, Sparkles, Swords, Search, X, ChevronDown } from './ui-art'
import { GameButton } from './game-button'

const KINDS = [
  { id: 'all', label: 'Tümü', Icon: ScrollText },
  { id: 'build', label: 'İnşa', Icon: Hammer },
  { id: 'research', label: 'İlim', Icon: BookOpen },
  { id: 'trade', label: 'Ticaret', Icon: Ship },
  { id: 'war', label: 'Sefer', Icon: Swords },
  { id: 'reward', label: 'Ödül', Icon: Gift },
  { id: 'faith', label: 'İnanç', Icon: Sparkles },
  { id: 'other', label: 'Diğer', Icon: ScrollText },
] as const
type Filter = typeof KINDS[number]['id']
const ART: Record<LogKind, string> = { build: 'builders', research: 'scholar', trade: 'harbour', war: 'army', reward: 'treasury', faith: 'capital', other: 'capital' }
const KIND_NAMES: Record<LogKind, string> = { build: 'İnşaat', research: 'İlim', trade: 'Ticaret', war: 'Sefer ve ordu', reward: 'Mükâfat', faith: 'İnanç', other: 'Divan kaydı' }
const clock = (time: number) => new Date(time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
const match = (text: string, query: string) => text.toLocaleLowerCase('tr-TR').includes(query.trim().toLocaleLowerCase('tr-TR'))

function ArchiveHeader({ title, label, children }: { title: string; label: string; children: ReactNode }) {
  return <><div className="annals-scene"><img src={asset('/images/game/terrain/archive-hall.webp')} alt="" width={960} height={480} decoding="async" /><div className="annals-scene-note"><small>{label}</small><p>{children}</p></div></div><h2 className="annals-ribbon">{title}</h2></>
}
function LedgerHeading({ title, detail }: { title: string; detail: string }) {
  return <div className="annals-ledger-heading"><span aria-hidden="true">✧</span><h3>{title}</h3><span aria-hidden="true">✧</span><p>{detail}</p></div>
}
function ArchiveSearch({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  const id = useId()
  return <div className="annals-search"><Search aria-hidden="true" /><label className="sr-only" htmlFor={id}>{label}</label><input id={id} type="search" value={value} onChange={event => onChange(event.target.value)} placeholder={label} autoComplete="off" />{value && <button type="button" aria-label="Aramayı temizle" onClick={() => onChange('')}><X aria-hidden="true" /></button>}</div>
}

/** The city ledger uses the existing log and its existing grouping rules. */
export function JournalPage({ game, cityName }: { game: Game; cityName: string }) {
  const [kind, setKind] = useState<Filter>('all'), [query, setQuery] = useState(''), [limit, setLimit] = useState(20)
  const entries = groupLog(game.log)
  const filtered = entries.filter(entry => (kind === 'all' || logKind(entry.text) === kind) && match(entry.text, query))
  const groups = dayGroups(filtered.slice(0, limit), game.updatedAt)
  const latest = entries[0]
  const count = filtered.reduce((sum, entry) => sum + entry.count, 0)
  const reset = () => { setKind('all'); setQuery(''); setLimit(20) }
  return <div className="annals-page">
    <ArchiveHeader title="Şehrin vakayinamesi" label={`${cityName} · Divan arşivi`}>Her taş, her sefer, her yeni başlangıç bu defterde.</ArchiveHeader>
    <section className="annals-ledger">
      <LedgerHeading title="Şehrinin hikâyesi" detail={`${game.log.length} olay kaydı · en yeni kayıt başta`} />
      {latest && kind === 'all' && !query && <article className="annals-latest" aria-label="Son olay"><img src={asset(`/images/game/quests/${ART[logKind(latest.text)]}.webp`)} alt="" width={112} height={112} /><div><small>SON KAYIT · {KIND_NAMES[logKind(latest.text)]}</small><p>{latest.text}</p><time dateTime={new Date(latest.time).toISOString()}>{dayLabel(latest.time, game.updatedAt)} · {clock(latest.time)}{latest.count > 1 && ` · ${latest.count} kez`}</time></div></article>}
      <div className="annals-kind-strip" aria-label="Günlük olay türü" data-hscroll>{KINDS.map(({ id, label, Icon }) => {
        const total = id === 'all' ? game.log.length : game.log.filter(entry => logKind(entry.text) === id).length
        return <button key={id} type="button" aria-pressed={kind === id} aria-label={`${label} · ${total} olay`} onClick={() => { setKind(id); setLimit(20) }}><Icon painted aria-hidden="true" /><span>{label}</span><b>{total}</b></button>
      })}</div>
      <ArchiveSearch value={query} onChange={value => { setQuery(value); setLimit(20) }} label="Günlükte ara" />
      <p className="annals-result" role="status">{count} olay · {filtered.length} kayıt{kind !== 'all' && ` · ${KINDS.find(item => item.id === kind)!.label}`}</p>
      <div className="annals-days">{groups.map((group, index) => <section className="annals-day" key={`${group.label}-${index}`}><h3 className="annals-day-title"><span>{group.label}</span><small>{group.items.reduce((sum, entry) => sum + entry.count, 0)} olay</small></h3><ol>{group.items.map((entry, i) => {
        const type = logKind(entry.text), Icon = KINDS.find(item => item.id === type)!.Icon
        return <li key={`${entry.time}-${i}`} className={`annals-entry is-${type}`}><span className="annals-entry-seal" aria-hidden="true"><Icon painted /></span><div><div className="annals-entry-meta"><b>{KIND_NAMES[type]}</b><time dateTime={new Date(entry.time).toISOString()}>{entry.count > 1 && entry.first !== entry.time ? `${clock(entry.first)} – ${clock(entry.time)}` : clock(entry.time)}</time></div><p>{entry.text}</p>{entry.count > 1 && <span className="annals-repeat">Bu olay {entry.count} kez tekrarlandı</span>}</div></li>
      })}</ol></section>)}</div>
      {!filtered.length && <div className="annals-empty"><BookOpen aria-hidden="true" /><h3>{game.log.length ? 'Bu sayfada kayıt bulunamadı' : 'İlk satır seni bekliyor'}</h3><p>{game.log.length ? 'Başka bir olay türü seç veya aradığın sözcüğü değiştir.' : 'Şehrindeki gelişmeler burada tarihe geçecek.'}</p>{game.log.length > 0 && <GameButton variant="outline" onClick={reset}>Bütün kayıtları göster</GameButton>}</div>}
      {filtered.length > limit && <GameButton className="annals-more" variant="outline" onClick={() => setLimit(value => value + 20)}>Eski kayıtları göster<ChevronDown aria-hidden="true" /></GameButton>}
      <footer className="annals-colophon"><ScrollText painted aria-hidden="true" /><p>Bu şehrin son 60 olayı divan defterinde saklanır.</p></footer>
    </section>
  </div>
}

function ReleaseNotes({ release }: { release: Release }) {
  return <ul className="annals-release-notes">{release.notes.map((note, index) => <li key={note}><span aria-hidden="true">{index + 1}</span><p>{note}</p></li>)}</ul>
}
/** Shared between the in-game archive and the title screen's notes view. */
export function ChangelogPage() {
  const id = useId()
  const [query, setQuery] = useState(''), [expanded, setExpanded] = useState<Set<string>>(() => new Set())
  const latest = CHANGELOG[0]
  const releases = CHANGELOG.filter(release => match(`${release.version} ${release.title} ${release.date} ${release.notes.join(' ')}`, query))
  const older = releases.filter(release => release.version !== latest.version)
  const allOpen = older.length > 0 && older.every(release => expanded.has(release.version))
  const toggle = (version: string) => setExpanded(current => { const next = new Set(current); if (next.has(version)) next.delete(version); else next.add(version); return next })
  return <div className="annals-page annals-editions" style={Object.fromEntries(['wood', 'paper', 'page-frame'].map(name => [`--royal-${name}`, `url("${asset(`/images/game/ui/approved-court/${name}.webp`)}")`])) as CSSProperties}>
    <ArchiveHeader title="Divan neşriyatı" label="Payitaht Adaları">Şehrin değişen yüzü, ilk taştan bugüne.</ArchiveHeader>
    <section className="annals-ledger">
      <LedgerHeading title="Yenilikler defteri" detail={`Güncel sürüm ${VERSION} · ${CHANGELOG.length} sürüm kaydı`} />
      <ArchiveSearch value={query} onChange={setQuery} label="Sürüm arşivinde ara" />
      {query && <p className="annals-result" role="status">{releases.length} sürüm bulundu</p>}
      {releases.some(release => release.version === latest.version) && <article className="annals-new-edition"><header><span className="annals-version">v{latest.version}</span><b className="annals-new-seal">YENİ</b><time>{latest.date}</time></header><h3>{latest.title}</h3><ReleaseNotes release={latest} /></article>}
      {older.length > 0 && <><div className="annals-archive-title"><h3>Önceki fermanlar</h3><button type="button" onClick={() => setExpanded(allOpen ? new Set() : new Set(older.map(release => release.version)))}>{allOpen ? 'Hepsini kapat' : 'Hepsini aç'}<ChevronDown aria-hidden="true" /></button></div><div className="annals-release-list">{older.map(release => <article className="annals-release" key={release.version}><button type="button" className="annals-release-toggle" aria-expanded={expanded.has(release.version)} aria-controls={`${id}-edition-${release.version.replaceAll('.', '-')}`} onClick={() => toggle(release.version)}><span className="annals-release-mark" aria-hidden="true"><ScrollText painted /></span><span><span className="annals-release-meta"><b>v{release.version}</b><time>{release.date}</time></span><strong>{release.title}</strong><small>{release.notes.length} yenilik</small></span><ChevronDown aria-hidden="true" /></button><div hidden={!expanded.has(release.version)} id={`${id}-edition-${release.version.replaceAll('.', '-')}`} className="annals-release-content"><ReleaseNotes release={release} /></div></article>)}</div></>}
      {!releases.length && <div className="annals-empty"><ScrollText painted aria-hidden="true" /><h3>Arşivde eşleşme bulunamadı</h3><p>Bir sürüm numarası veya başka bir sözcük dene.</p><GameButton variant="outline" onClick={() => setQuery('')}>Aramanı temizle</GameButton></div>}
      <footer className="annals-colophon"><BookOpen aria-hidden="true" /><p>İlk taş: {CHANGELOG[CHANGELOG.length - 1].date}. Payitaht&apos;ın bütün sürüm notları bu arşivde.</p></footer>
    </section>
  </div>
}
