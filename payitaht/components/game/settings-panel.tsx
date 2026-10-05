'use client'

import { useEffect, useRef, useState } from 'react'
import { t } from '@/lib/i18n/tr'
import { Bell, Bug, Download, HardDrive, Home, Info, Moon, RotateCcw, Settings, Upload, WifiOff, Check, ScrollText, UserRound, Sparkles, Play, Volume2, Eye, ChevronDown } from './ui-art'
import { GameButton } from './game-button'
import { CourtBook } from './court-kit'
import type { Empire } from '@/lib/game/empire'
import { VERSION } from '@/lib/game/changelog'
import { clearErrors, errorReport, readErrors, type ErrorEntry } from '@/lib/game/error-log'
import { PaceSetting } from './ai-panels'
import { DayNightSetting, LiteModeSetting, NoticeSettings } from './sound-settings'
import { notificationsSupported } from '@/lib/notify'
import { lowMotionSetting, setLiteSetting, setLowMotion } from '@/lib/motion'
import { dayNightEnabled, setDayNight } from '@/lib/game/sky'
import { setSoundPrefs, soundPrefs } from '@/lib/sfx'
import type { Run } from './world-panels'

export type SettingsProps = {
  empire: Empire | undefined; run: Run; warning: string; native: boolean
  pwa: { installed: boolean; installAvailable: boolean; install: () => void; offlineReady: boolean }
  notify: { supported: boolean; on: boolean; denied: boolean; toggle: () => Promise<unknown> | void }
  onBackup: () => void; onRestore: (file?: File) => void; onReset: () => void; onTitle?: () => void; onChangelog: () => void
}
const TABS = [
  { id: 'general', label: 'Genel', Icon: Settings },
  { id: 'account', label: 'Hesap', Icon: UserRound },
  { id: 'notifications', label: 'Bildirimler', Icon: Bell },
  { id: 'appearance', label: 'Görünüm', Icon: Sparkles },
  { id: 'game', label: 'Oyun', Icon: Play },
] as const
type Tab = typeof TABS[number]['id']
type GraphicQuality = 'high' | 'medium' | 'low'

type SwitchRowProps = { label: string; checked: boolean; onChange: (value: boolean) => void }
function RefSwitch({ label, checked, onChange }: SwitchRowProps) {
  return <label className="ref-switch-row"><span>{label}</span><input type="checkbox" role="switch" aria-label={label} checked={checked} onChange={event => onChange(event.target.checked)} /><i aria-hidden="true" /></label>
}

function SliderRow({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label className="ref-slider-row"><span>{label}</span><input aria-label={label} type="range" min="0" max="100" step="5" value={value} onChange={event => onChange(Number(event.target.value))} style={{ '--ref-value': `${value}%` } as React.CSSProperties} /><b>%{value}</b></label>
}

function GeneralSettings() {
  const [master, setMaster] = useState(80), [music, setMusic] = useState(60), [sfx, setSfx] = useState(70)
  const [quality, setQuality] = useState<GraphicQuality>('high')
  const [shadows, setShadows] = useState(true), [water, setWater] = useState(true), [details, setDetails] = useState(true)
  const [compact, setCompact] = useState(false), [quick, setQuick] = useState(true), [reduced, setReduced] = useState(false), [dayNight, setDayNightState] = useState(true)
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    const s = soundPrefs()
    setMusic(s.music ? 60 : 0); setSfx(s.sfx ? 70 : 0); setReduced(lowMotionSetting()); setDayNightState(dayNightEnabled())
    try {
      const raw = JSON.parse(localStorage.getItem('payitaht-reference-settings') ?? '{}')
      if (typeof raw.master === 'number') setMaster(raw.master)
      if (typeof raw.music === 'number') setMusic(raw.music)
      if (typeof raw.sfx === 'number') setSfx(raw.sfx)
      if (raw.quality === 'high' || raw.quality === 'medium' || raw.quality === 'low') setQuality(raw.quality)
      if (typeof raw.shadows === 'boolean') setShadows(raw.shadows)
      if (typeof raw.water === 'boolean') setWater(raw.water)
      if (typeof raw.details === 'boolean') setDetails(raw.details)
      if (typeof raw.compact === 'boolean') setCompact(raw.compact)
      if (typeof raw.quick === 'boolean') setQuick(raw.quick)
    } catch { /* ilk açılış */ }
  }, [])
  function save() {
    setSoundPrefs({ music: master > 0 && music > 0, sfx: master > 0 && sfx > 0 })
    setLowMotion(reduced)
    setDayNight(dayNight)
    setLiteSetting(quality === 'high' ? 'kapali' : quality === 'low' ? 'acik' : 'otomatik')
    try { localStorage.setItem('payitaht-reference-settings', JSON.stringify({ master, music, sfx, quality, shadows, water, details, compact, quick })) } catch { /* depolama kapalı */ }
    setSaved(true); window.setTimeout(() => setSaved(false), 1300)
  }
  return <div className="ref-settings-general">
    <section className="ref-setting-language">
      <span className="ref-setting-icon">◎</span><div><h3>Dil</h3><p>Oyun dilini seç.</p></div>
      <label><span className="sr-only">Dil</span><select aria-label="Dil" value="tr" onChange={() => undefined}><option value="tr">🇹🇷 Türkçe</option></select><ChevronDown aria-hidden="true" /></label>
    </section>
    <section className="ref-settings-block">
      <header><Volume2 /><div><h3>Ses Ayarları</h3><p>Oyun içi ses seviyelerini düzenle.</p></div></header>
      <div className="ref-slider-list"><SliderRow label="Genel Ses" value={master} onChange={setMaster} /><SliderRow label="Müzik" value={music} onChange={setMusic} /><SliderRow label="Efekt Sesleri" value={sfx} onChange={setSfx} /></div>
    </section>
    <section className="ref-settings-block">
      <header><Eye /><div><h3>Grafik Ayarları</h3><p>Görsel kalite ayarlarını düzenle.</p></div></header>
      <div className="ref-setting-select-row"><span>Grafik Kalitesi</span><label><select aria-label="Grafik Kalitesi" value={quality} onChange={event => setQuality(event.target.value as GraphicQuality)}><option value="high">Yüksek</option><option value="medium">Orta</option><option value="low">Düşük</option></select><ChevronDown aria-hidden="true" /></label></div>
      <RefSwitch label="Gölgeler" checked={shadows} onChange={setShadows} />
      <RefSwitch label="Su Efektleri" checked={water} onChange={setWater} />
      <RefSwitch label="Detaylı Grafikler" checked={details} onChange={setDetails} />
    </section>
    <section className="ref-settings-block">
      <header><UserRound /><div><h3>Arayüz</h3><p>Arayüz tercihlerini düzenle.</p></div></header>
      <RefSwitch label="Kompakt Arayüz" checked={compact} onChange={setCompact} />
      <RefSwitch label="Hızlı Eylem Butonları" checked={quick} onChange={setQuick} />
      <RefSwitch label="Animasyonları Azalt" checked={reduced} onChange={setReduced} />
      <RefSwitch label="Gece ve Gündüz" checked={dayNight} onChange={setDayNightState} />
    </section>
    <button type="button" className="ref-red-action ref-settings-save" onClick={save}><Check />{saved ? 'Kaydedildi' : 'Değişiklikleri Kaydet'}</button>
  </div>
}

export function SettingsPanel({ empire, run, warning, native, pwa, notify, onBackup, onRestore, onReset, onTitle, onChangelog }: SettingsProps) {
  const [tab, setTab] = useState<Tab>('general'), [confirmReset, setConfirmReset] = useState(false)
  const saveImportRef = useRef<HTMLInputElement>(null)
  const { installed, installAvailable, install, offlineReady } = pwa
  return <div className="court-page court-admin settings-v2 ref-settings-screen">
    <nav className="ref-settings-tabs" role="tablist" aria-label="Ayarlar">
      {TABS.map(({ id, label, Icon }) => <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => { setTab(id); setConfirmReset(false) }}><Icon aria-hidden="true" /><span>{label}</span></button>)}
    </nav>
    <div className="ref-settings-sheet">
      {tab === 'general' && <GeneralSettings />}
      {tab === 'account' && <div className="ref-settings-secondary">
        <CourtBook title="Saltanatın emaneti" detail="Oyun kaydı ve dosya yedeği"><div className="admin-save-seal"><Check aria-hidden="true" /><span><b>Otomatik kayıt açık</b><small>Son sağlam kayıt ayrıca cihazda tutulur.</small></span></div>{warning && <p role="alert" className="storage-warning">{warning}</p>}
          <div className="admin-save-actions"><GameButton onClick={onBackup}><Download aria-hidden="true" />Yedeği dışarı aktar</GameButton><GameButton variant="outline" onClick={() => saveImportRef.current?.click()}><Upload aria-hidden="true" />Yedekten geri yükle</GameButton></div><input ref={saveImportRef} type="file" accept="application/json,.json" hidden onChange={event => { onRestore(event.target.files?.[0]); event.target.value = '' }} />
        </CourtBook>
        {!native && <CourtBook title="Cihaz ve çevrimdışı kullanım" detail={installed ? 'Ana ekranından çalışıyor' : 'Cihazına ekle, kolayca dön'}><div className="admin-device-status"><span><Download aria-hidden="true" /><b>{installed ? 'Yüklü' : 'Tarayıcıda'}</b></span><span><WifiOff aria-hidden="true" /><b>{offlineReady ? 'Çevrimdışı hazır' : 'Hazırlanıyor'}</b></span></div>{installAvailable && <GameButton className="court-wide" onClick={install}><Download aria-hidden="true" />Uygulamayı yükle</GameButton>}</CourtBook>}
        <CourtBook title="Yeni bir saltanat" detail="Yeni oyun başlatma">{confirmReset ? <div className="admin-reset-confirm" role="group" aria-label="Yeni oyun onayı"><RotateCcw aria-hidden="true" /><h4>Bu hikâyeyi kapatacak mısın?</h4><GameButton variant="outline" onClick={onBackup}><Download aria-hidden="true" />Önce yedeğimi al</GameButton><GameButton variant="destructive" onClick={() => { onReset(); setConfirmReset(false) }}>Evet, şehrimi sıfırla</GameButton><GameButton variant="outline" onClick={() => setConfirmReset(false)}>{t.action.cancel}</GameButton></div> : <GameButton className="court-wide" variant="outline" onClick={() => setConfirmReset(true)}><RotateCcw aria-hidden="true" />Yeni oyun başlat</GameButton>}</CourtBook>
      </div>}
      {tab === 'notifications' && <div className="ref-settings-secondary"><CourtBook title="Bildirimler" detail="Şehrinden gelen haberleri yönet">
        {notificationsSupported() ? <NoticeSettings /> : <><p className="court-note">{notify.supported ? 'Bildirimler oyun açıkken ve arka plandayken çalışır.' : 'Bu tarayıcı bildirimleri desteklemiyor.'}</p>{notify.supported && <GameButton className="court-wide" variant={notify.on ? 'outline' : 'default'} onClick={() => void notify.toggle()}><Bell aria-hidden="true" />{notify.on ? 'Bildirimleri kapat' : 'Bildirimleri aç'}</GameButton>}{notify.denied && <p className="court-note">Bildirim izni tarayıcıda kapalı.</p>}</>}
      </CourtBook></div>}
      {tab === 'appearance' && <div className="ref-settings-secondary"><CourtBook title="Görünüm ve performans" detail="Şehrin atmosferini cihazına göre ayarla"><div className="admin-section-heading"><Moon aria-hidden="true" /><h4>Şehrin atmosferi</h4></div><DayNightSetting /><LiteModeSetting /></CourtBook></div>}
      {tab === 'game' && <div className="ref-settings-secondary">
        <CourtBook title="Dünyanın ritmi" detail="Yapay hükümdarların davranış temposu">{empire && <PaceSetting empire={empire} run={run} />}</CourtBook>
        <CourtBook title="Payitaht Adaları" detail={`Sürüm ${VERSION}`}><p className="court-note">Osmanlı esintili, tek oyunculu ada stratejisi. Çevrimdışı çalışır; oyun kaydı bu cihazda saklanır.</p><GameButton className="court-wide" variant="outline" onClick={onChangelog}><ScrollText painted aria-hidden="true" />Sürüm arşivini aç</GameButton></CourtBook>
        {onTitle && <CourtBook title="Saray kapısı" detail="Giriş ekranına dön"><GameButton className="court-wide" variant="outline" onClick={onTitle}><Home aria-hidden="true" />Giriş ekranına dön</GameButton></CourtBook>}
        <ErrorReport />
      </div>}
    </div>
  </div>
}

function ErrorReport() {
  const [list, setList] = useState<ErrorEntry[]>([]), [note, setNote] = useState('')
  useEffect(() => setList(readErrors()), [])
  async function copy() {
    const text = errorReport(list, { version: VERSION, device: navigator.userAgent, now: Date.now() })
    try { await navigator.clipboard.writeText(text); setNote('Rapor panoya kopyalandı.') }
    catch { setNote('Kopyalanamadı; bu cihaz panoya yazmaya izin vermiyor.') }
  }
  return <CourtBook title="Divan kayıt kontrolü" detail="Bu cihazdaki hata kayıtları"><div className="admin-errors"><Bug aria-hidden="true" /><p>{list.length ? `${list.length} hata kaydı var. Son kayıt: ${new Date(list[0].time).toLocaleString('tr-TR')}.` : 'Bu cihazda kayıtlı hata yok.'}</p></div><p className="court-note">Rapor yalnızca sen kopyalarsan paylaşılır.</p><div className="admin-save-actions"><GameButton variant="outline" onClick={copy}>Hata raporunu kopyala</GameButton>{list.length > 0 && <GameButton variant="outline" onClick={() => { clearErrors(); setList([]); setNote('Hata kayıtları silindi.') }}>Hata kayıtlarını sil</GameButton>}</div>{note && <p className="court-note" role="status">{note}</p>}</CourtBook>
}
