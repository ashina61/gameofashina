'use client'

/**
 * GİRİŞ EKRANI — oyun açılınca önce bu gelir.
 *
 * Kayıt varsa "Devam et" kartı hükümdarı, armayı, başkenti ve son oynanan
 * zamanı gösterir; yoksa (ilk açılış) doğrudan hükümdar adı ve arma seçilir.
 * Her şey çevrimdışıdır: kayıt bu cihazın yerel depolamasında durur. Diğer
 * hükümdarlar yapay rakiptir; gerçek oyuncu yoktur.
 */
import { useEffect, useState } from 'react'
import { BookOpen, ChevronLeft, Play, ScrollText, Sparkles, TriangleAlert } from 'lucide-react'
import { RulerCrest, ChangelogPanel } from './profile-panel'
import { peekSave, startNewGame } from '@/hooks/use-game'
import { capitalCity, initialEmpire, renameCity, type Empire } from '@/lib/game/empire'
import { CREST_COLORS, CREST_NAMES, CRESTS, profileOf, rulerTitle, setProfile, type CrestId } from '@/lib/game/profile'
import { playerScore } from '@/lib/game/rivals'
import { VERSION } from '@/lib/game/changelog'
import { asset, buildingImage } from '@/lib/asset'

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
  { title: 'Halkı çalıştır', text: 'Oduncu, taşçı ve âlimleri kaydırıcıyla ata. Boştaki halk akçe öder; işçiler kaynak üretir.' },
  { title: 'İlimle ilerle', text: 'Medresede âlimler ilim üretir. Beş dalda araştırma yeni binaları, birlikleri ve yönetimleri açar.' },
  { title: 'Adaları keşfet', text: 'Haritadan yeni adalara koloni kur. Her adanın lüks malı farklıdır: üzüm, mermer, kristal ya da kükürt.' },
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
      <RulerCrest crest={crest} color={color} size={78} />
      <div>
        <label htmlFor="title-ruler">Hükümdarın adı</label>
        <input id="title-ruler" value={ruler} maxLength={24} placeholder="Ertuğrul" autoComplete="off" onChange={e => setRuler(e.target.value)} />
        <label htmlFor="title-city">Başkentin adı</label>
        <input id="title-city" value={city} maxLength={24} placeholder="Sahilhisar" autoComplete="off" onChange={e => setCity(e.target.value)} />
      </div>
    </div>
    <fieldset className="title-crests">
      <legend>Arma</legend>
      {CRESTS.map(c => <button key={c} type="button" aria-pressed={crest === c} aria-label={CREST_NAMES[c]} onClick={() => setCrest(c)}><RulerCrest crest={c} color={color} size={40} /></button>)}
    </fieldset>
    <fieldset className="title-colors">
      <legend>Renk</legend>
      {CREST_COLORS.map(c => <button key={c} type="button" aria-pressed={color === c} aria-label={`Renk ${c}`} style={{ background: c }} onClick={() => setColor(c)} />)}
    </fieldset>
    {error && <p role="alert" className="title-error">{error}</p>}
    {confirmWipe && <p role="alert" className="title-warn"><TriangleAlert /> Bu cihazdaki eski şehrin silinecek. Emin misin?</p>}
    <button type="submit" className="title-btn is-primary"><Sparkles />{confirmWipe ? 'Evet, eskisini sil ve başla' : 'Hikâyeye başla'}</button>
    {hasSave && <button type="button" className="title-btn" onClick={() => { setMode('menu'); setConfirmWipe(false) }}><ChevronLeft />Vazgeç</button>}
  </form>

  return <main className="title-screen">
    <div className="title-sea" aria-hidden="true" style={{ backgroundImage: `url(${asset('/images/game/islands/sahil.webp')})` }} />
    <div className="title-skyline" aria-hidden="true">
      <img src={buildingImage('saray', 8)} alt="" className="is-left" />
      <img src={buildingImage('divan', 8)} alt="" className="is-mid" />
      <img src={buildingImage('liman', 8)} alt="" className="is-right" />
      <img src={asset('/images/game/ships/ship-a.png')} alt="" className="is-ship" />
    </div>

    <header className="title-head">
      <p className="title-kicker">Osmanlı esintili ada stratejisi</p>
      <h1>Payitaht<span>Adaları</span></h1>
      <p className="title-motto">Kendi hikâyeni inşa et.</p>
    </header>

    <section className="title-card" aria-live="polite">
      {save === null ? <p className="title-note">Kayıt okunuyor…</p>

      : mode === 'howto' ? <div className="title-howto">
        <h2>Nasıl oynanır?</h2>
        <ol>{HOWTO.map(h => <li key={h.title}><strong>{h.title}</strong><span>{h.text}</span></li>)}</ol>
        <button type="button" className="title-btn" onClick={() => setMode('menu')}><ChevronLeft />Geri</button>
      </div>

      : mode === 'notes' ? <div className="title-notes">
        <h2>Sürüm notları</h2>
        <div className="title-notes-scroll"><ChangelogPanel /></div>
        <button type="button" className="title-btn" onClick={() => setMode('menu')}><ChevronLeft />Geri</button>
      </div>

      : !hasSave || mode === 'new' ? <>
        <h2>{hasSave ? 'Yeni oyun' : 'Hoş geldin, hükümdar'}</h2>
        {!hasSave && <p className="title-note">Adını ve armanı seç; Sahilhisar sahilinde ilk şehrin seni bekliyor.</p>}
        {newGameForm}
      </>

      : <>
        {empire && profile && capital ? <div className="title-save">
          <RulerCrest crest={profile.crest} color={profile.color} size={62} />
          <div>
            <strong>{rulerTitle(playerScore(empire).total).name} {profile.ruler}</strong>
            <span>{capital.name} · Divanhane {capital.game.buildings.divan}. seviye</span>
            <small>{empire.cities.length} şehir · son oynama {ago(Date.now() - lastPlayed)}</small>
          </div>
        </div> : <p role="alert" className="title-warn"><TriangleAlert /> {save.error} Kayıt korunuyor; devam edersen oyun onu değiştirmez.</p>}
        <button type="button" className="title-btn is-primary" onClick={onStart}><Play />Devam et</button>
        <button type="button" className="title-btn" onClick={() => { setMode('new'); setConfirmWipe(false) }}><Sparkles />Yeni oyun</button>
      </>}

      {save !== null && mode !== 'howto' && mode !== 'notes' && <nav className="title-links">
        <button type="button" onClick={() => setMode('howto')}><BookOpen />Nasıl oynanır</button>
        <button type="button" onClick={() => setMode('notes')}><ScrollText />Sürüm notları</button>
      </nav>}
    </section>

    <footer className="title-foot">
      <p>Çevrimdışı deneme sürümü · kayıt bu cihazda · sürüm {VERSION}</p>
      <p>Diğer hükümdarlar yapay rakiptir; gerçek oyuncu yoktur.</p>
    </footer>
  </main>
}
