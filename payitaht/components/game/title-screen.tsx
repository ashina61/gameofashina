'use client'

/**
 * GİRİŞ EKRANI — oyun açılınca önce bu gelir.
 *
 * Ana menü her durumda sinematik kalır. Kayıt varsa "Devam et" hükümdarı ve
 * başkenti gösterir; ilk açılışta ise yalnız "Hikâyeye başla" görünür. İsim,
 * başkent ve arma seçimi ancak oyuncu yeni oyun akışını açınca gösterilir.
 * Her şey çevrimdışıdır: kayıt bu cihazın yerel depolamasında durur. Diğer
 * hükümdarlar yapay rakiptir; gerçek oyuncu yoktur.
 */
import { useEffect, useState } from 'react'
import { BookOpen, ChevronLeft, Play, ScrollText, Sparkles, TriangleAlert } from './ui-art'
import { RoyalCrest } from './approved-court-art'
import { ChangelogPage } from './chronicle-pages'
import { peekSave, startNewGame } from '@/hooks/use-game'
import { capitalCity, initialEmpire, renameCity, type Empire } from '@/lib/game/empire'
import { COLOR_NAMES, CREST_COLORS, CREST_NAMES, CRESTS, profileOf, rulerTitle, setProfile, type CrestId } from '@/lib/game/profile'
import { playerScore } from '@/lib/game/rivals'
import { VERSION } from '@/lib/game/changelog'
import { asset } from '@/lib/asset'
import { BannerContext, BuildingArt } from './building-art'
import type { BannerLook } from '@/lib/game/banner'
import { t } from '@/lib/i18n/tr'

function TitleCrest({ crest, color }: { crest: CrestId; color: string }) {
  return <span className="title-emblem" role="img" aria-label={`Arma: ${CREST_NAMES[crest]}`} style={{ backgroundColor: color }}><RoyalCrest crest={crest} /></span>
}

type Mode = 'menu' | 'new' | 'howto' | 'notes'

function ago(ms: number) {
  const m = Math.max(0, Math.round(ms / 60_000))
  if (m < 2) return 'az önce'
  if (m < 60) return `${m} dakika önce`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} saat önce`
  return `${Math.round(h / 24)} gün önce`
}

const HOWTO: { title: string; text: string }[] = [
  { title: 'Şehrini kur', text: 'Boş arsaya dokun, yapını seç. Divanhane büyüdükçe yeni arsalar ve sokaklar açılır.' },
  { title: 'Halkı çalıştır', text: 'Oduncu, esnaf ve âlimleri kaydırıcıyla ata. Boştaki halk akçe öder; işçiler kaynak üretir.' },
  { title: 'İlimle ilerle', text: 'Medresede âlimler ilim üretir. Beş dalda araştırma yeni binaları, birlikleri ve yönetimleri açar.' },
  { title: 'Adaları keşfet', text: 'Haritadan yeni adalara koloni kur. Her adanın lüks malı farklıdır: kahve, mermer, kristal ya da kükürt.' },
  { title: 'Ordu ve diplomasi', text: 'Kışla ve Tersane asker yetiştirir. Yapay rakip hükümdarlarla ticaret yap, anlaş ya da savaş.' },
  { title: 'Görevleri izle', text: 'Görevler ekranı sıradaki adımı gösterir ve ödül verir. Oyun sen yokken de işler; döndüğünde üretim birikmiş olur.' },
]

export function TitleScreen({ onStart }: { onStart: () => void }) {
  /** Kayıt yalnızca tarayıcıda okunur; ilk çizimde (sunucu çıktısı) boş kalır. */
  const [save, setSave] = useState<{ empire?: Empire; error?: string } | null>(null)
  const [mode, setMode] = useState<Mode>('menu')
  const [ruler, setRuler] = useState('')
  const [city, setCity] = useState('')
  const [crest, setCrest] = useState<CrestId>('hilal')
  const [color, setColor] = useState<string>(CREST_COLORS[0])
  const [confirmWipe, setConfirmWipe] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { setSave(peekSave()) }, [])

  const hasSave = !!save && (!!save.empire || !!save.error)
  const empire = save?.empire
  const profile = empire ? profileOf(empire) : null
  const capital = empire ? capitalCity(empire) : null
  const lastPlayed = empire ? Math.max(...empire.cities.map(c => c.game.updatedAt)) : 0

  function begin() {
    setError('')
    if (hasSave && !confirmWipe) { setConfirmWipe(true); return }
    const now = Date.now()
    let e = initialEmpire(now)
    const named = setProfile(e, { ruler: ruler || 'Ertuğrul', crest, color }, now)
    if (named.error) { setError(named.error); return }
    e = named.empire
    if (city.trim()) {
      // Ad kurallarını renameCity denetler; yeni oyunda "adı değişti" günlüğü düşmesin.
      const renamed = renameCity(e, e.cities[0].id, city, now)
      if (renamed.error) { setError(renamed.error); return }
      e.cities[0].name = renamed.empire.cities[0].name
    }
    startNewGame(e)
    onStart()
  }

  const newGameForm = <form className="title-form" onSubmit={ev => { ev.preventDefault(); begin() }}>
    <div className="title-form-crest">
      <TitleCrest crest={crest} color={color} />
      <div>
        <label htmlFor="title-ruler">Hükümdarın adı</label>
        <input id="title-ruler" value={ruler} maxLength={24} placeholder="Ertuğrul" autoComplete="off" onChange={e => setRuler(e.target.value)} />
        <label htmlFor="title-city">Başkentin adı</label>
        <input id="title-city" value={city} maxLength={24} placeholder="Sahilhisar" autoComplete="off" onChange={e => setCity(e.target.value)} />
      </div>
    </div>
    <fieldset className="title-crests">
      <legend>Arma</legend>
      {CRESTS.map(c => <button key={c} type="button" aria-pressed={crest === c} aria-label={CREST_NAMES[c]} onClick={() => setCrest(c)}><RoyalCrest crest={c} /></button>)}
    </fieldset>
    <fieldset className="title-colors">
      <legend>Renk</legend>
      {CREST_COLORS.map(c => <button key={c} type="button" aria-pressed={color === c} aria-label={`Renk: ${COLOR_NAMES[c]}`} title={COLOR_NAMES[c]} style={{ background: c }} onClick={() => setColor(c)}>{color === c && <span className="swatch-check" aria-hidden="true">✓</span>}</button>)}
    </fieldset>
    {error && <p role="alert" className="title-error">{error}</p>}
    {confirmWipe && <p role="alert" className="title-warn"><TriangleAlert painted aria-hidden="true" /> Bu cihazdaki eski şehrin silinecek. Emin misin?</p>}
    <button type="submit" className="title-btn is-primary"><Sparkles painted aria-hidden="true" />{confirmWipe ? 'Evet, eskisini sil ve başla' : 'Hikâyeye başla'}</button>
    <button type="button" className="title-btn" onClick={() => { setMode('menu'); setConfirmWipe(false); setError('') }}><ChevronLeft />{hasSave ? t.action.cancel : t.action.back}</button>
  </form>

  const look: BannerLook = profile ? { color: profile.color, shape: profile.banner ?? 'kirlangic', crest: profile.crest } : { color, shape: 'kirlangic', crest }
  return <BannerContext.Provider value={look}><main className="title-screen title-painted">
    <div className="title-sea" aria-hidden="true" style={{ backgroundImage: `url(${asset('/images/game/terrain/title-background.webp')})` }} />
    <div className="title-skyline" aria-hidden="true">
      <BuildingArt id="saray" level={8} className="is-left" />
      <BuildingArt id="divan" level={8} className="is-mid" />
      <BuildingArt id="liman" level={8} className="is-right" />
      <img src={asset('/images/game/ships/ship-a.webp')} alt="" className="is-ship" />
    </div>

    <header className="title-head">
      <p className="title-kicker">Osmanlı esintili ada stratejisi</p>
      <h1 style={{ backgroundImage: `url(${asset('/images/game/ui/title-plaque.webp')})` }}>Payitaht<span>Adaları</span></h1>
      <p className="title-motto">Kendi hikâyeni inşa et.</p>
    </header>

    <section className="title-card" aria-live="polite">
      {save === null ? <p className="title-note">Kayıt okunuyor…</p>

      : mode === 'howto' ? <div className="title-howto">
        <h2>Nasıl oynanır?</h2>
        <ol>{HOWTO.map(h => <li key={h.title}><strong>{h.title}</strong><span>{h.text}</span></li>)}</ol>
        <button type="button" className="title-btn" onClick={() => setMode('menu')}><ChevronLeft />{t.action.back}</button>
      </div>

      : mode === 'notes' ? <div className="title-notes">
        <h2>Sürüm notları</h2>
        <div className="title-notes-scroll"><ChangelogPage /></div>
        <button type="button" className="title-btn" onClick={() => setMode('menu')}><ChevronLeft />{t.action.back}</button>
      </div>

      : mode === 'new' ? <>
        <h2>Yeni oyun</h2>
        {newGameForm}
      </>

      : !hasSave ? <>
        <button type="button" className="title-btn is-primary" onClick={() => setMode('new')}><Sparkles painted aria-hidden="true" />Hikâyeye başla</button>
      </>

      : <>
        {empire && profile && capital ? <div className="title-save">
          <TitleCrest crest={profile.crest} color={profile.color} />
          <div>
            <strong>{rulerTitle(playerScore(empire).total).name} {profile.ruler}</strong>
            <span>{capital.name} · Divanhane {capital.game.buildings.divan}. seviye</span>
            <small>{empire.cities.length} şehir · son oynama {ago(Date.now() - lastPlayed)}</small>
          </div>
        </div> : <p role="alert" className="title-warn"><TriangleAlert painted aria-hidden="true" /> {save.error} Kayıt korunuyor; devam edersen oyun onu değiştirmez.</p>}
        <button type="button" className="title-btn is-primary" onClick={onStart}><Play painted aria-hidden="true" />Devam et</button>
        <button type="button" className="title-btn" onClick={() => { setMode('new'); setConfirmWipe(false) }}><Sparkles painted aria-hidden="true" />Yeni oyun</button>
      </>}

      {save !== null && mode !== 'howto' && mode !== 'notes' && mode !== 'new' && <nav className="title-links">
        <button type="button" onClick={() => setMode('howto')}><BookOpen painted aria-hidden="true" />Nasıl oynanır</button>
        <button type="button" onClick={() => setMode('notes')}><ScrollText painted aria-hidden="true" />Sürüm notları</button>
      </nav>}
    </section>

    <footer className="title-foot">
      <p>Çevrimdışı deneme sürümü · kayıt bu cihazda · sürüm {VERSION}</p>
      <p>Diğer hükümdarlar yapay rakiptir; gerçek oyuncu yoktur.</p>
    </footer>
  </main></BannerContext.Provider>
}
