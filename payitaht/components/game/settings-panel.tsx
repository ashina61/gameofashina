'use client'

import { useEffect, useRef, useState } from 'react'
import { t } from '@/lib/i18n/tr'
import { Bell, Bug, Download, HardDrive, Home, Info, Moon, Music, RotateCcw, Settings, Upload, WifiOff, Check, ScrollText } from './ui-art'
import { GameButton } from './game-button'
import { CourtBook, CourtTabs } from './court-kit'
import type { Empire } from '@/lib/game/empire'
import { VERSION } from '@/lib/game/changelog'
import { clearErrors, errorReport, readErrors, type ErrorEntry } from '@/lib/game/error-log'
import { PaceSetting } from './ai-panels'
import { DayNightSetting, LiteModeSetting, MotionSetting, NoticeSettings, SoundSettings } from './sound-settings'
import { notificationsSupported } from '@/lib/notify'
import type { Run } from './world-panels'

export type SettingsProps = {
  empire: Empire | undefined; run: Run; warning: string; native: boolean
  pwa: { installed: boolean; installAvailable: boolean; install: () => void; offlineReady: boolean }
  notify: { supported: boolean; on: boolean; denied: boolean; toggle: () => Promise<unknown> | void }
  onBackup: () => void; onRestore: (file?: File) => void; onReset: () => void; onTitle?: () => void; onChangelog: () => void
}
const TABS = [{ id: 'play', label: 'Tercihler', Icon: Settings }, { id: 'device', label: 'Cihaz', Icon: Bell }, { id: 'save', label: 'Kayıt', Icon: HardDrive }, { id: 'divan', label: 'Divan', Icon: Info }] as const
type Tab = typeof TABS[number]['id']

export function SettingsPanel({ empire, run, warning, native, pwa, notify, onBackup, onRestore, onReset, onTitle, onChangelog }: SettingsProps) {
  const [tab, setTab] = useState<Tab>('play'), [confirmReset, setConfirmReset] = useState(false)
  const saveImportRef = useRef<HTMLInputElement>(null)
  const { installed, installAvailable, install, offlineReady } = pwa
  return <div className="court-page court-admin settings-v2">
    <header className="settings-v2-header"><span>PAYİTAHT ADALARI</span><h2>Ayarlar</h2><p>Oyunun ritmini, cihazını ve kayıtlarını tek yerden yönet.</p></header>
    <CourtTabs items={TABS} value={tab} onChange={next => { setTab(next); setConfirmReset(false) }} label="Ayarlar">
      {tab === 'play' && <>
        <CourtBook title="Dünyanın ritmi" detail="Yapay hükümdarların davranış temposu">
          {empire && <PaceSetting empire={empire} run={run} />}
        </CourtBook>
        <CourtBook title="Ses ve titreşim" detail="Oyun içi seslerin ve geri bildirimin"><div className="admin-section-heading"><Music aria-hidden="true" /><h4>Ses düzeni</h4></div><SoundSettings /></CourtBook>
        <CourtBook title="Görünüm ve performans" detail="Şehrin atmosferini cihazına göre ayarla"><div className="admin-section-heading"><Moon aria-hidden="true" /><h4>Şehrin atmosferi</h4></div><DayNightSetting /><MotionSetting /><LiteModeSetting /></CourtBook>
      </>}
      {tab === 'device' && <>
        <CourtBook title="Bildirimler" detail="Şehrinden gelen haberleri yönet">
          {notificationsSupported() ? <><p className="court-note">Baskın, savaş sonucu ve tamamlanan işlerden telefonunda haberdar ol. Her bildirim türünü ayrı seçebilirsin.</p><NoticeSettings /></> : <><p className="court-note">{notify.supported ? 'Bildirimler oyun açıkken ve arka plandayken çalışır. Oyun tamamen kapalıyken bu tarayıcıdan bildirim gönderilmez.' : 'Bu tarayıcı bildirimleri desteklemiyor.'}</p>{notify.supported && <GameButton className="court-wide" variant={notify.on ? 'outline' : 'default'} onClick={() => void notify.toggle()}><Bell aria-hidden="true" />{notify.on ? 'Bildirimleri kapat' : 'Bildirimleri aç'}</GameButton>}{notify.denied && <p className="court-note">Bildirim izni tarayıcıda kapalı. Tarayıcı ayarlarından izin verebilirsin.</p>}</>}
        </CourtBook>
        {!native && <CourtBook title="Cihaz ve çevrimdışı kullanım" detail={installed ? 'Ana ekranından çalışıyor' : 'Cihazına ekle, kolayca dön'}><div className="admin-device-status"><span><Download aria-hidden="true" /><b>{installed ? 'Yüklü' : 'Tarayıcıda'}</b></span><span><WifiOff aria-hidden="true" /><b>{offlineReady ? 'Çevrimdışı hazır' : 'Hazırlanıyor'}</b></span></div><p className="court-note">{installed ? 'Oyun ana ekranından çalışıyor.' : 'Safari’de Paylaş → Ana Ekrana Ekle; Android’de tarayıcı menüsü → Uygulamayı yükle.'}</p>{installAvailable && <GameButton className="court-wide" onClick={install}><Download aria-hidden="true" />Uygulamayı yükle</GameButton>}<p className="court-note">{offlineReady ? 'Bu cihazda internetsiz açabilirsin.' : 'Çevrimdışı açılış ilk tam yüklemeden sonra hazırlanır.'}</p></CourtBook>}
      </>}
      {tab === 'save' && <>
        <CourtBook title="Saltanatın emaneti" detail="Oyun kaydı ve dosya yedeği"><div className="admin-save-seal"><Check aria-hidden="true" /><span><b>Otomatik kayıt açık</b><small>Son sağlam kayıt ayrıca cihazda tutulur.</small></span></div>{warning && <p role="alert" className="storage-warning">{warning}</p>}
          <div className="admin-save-actions"><GameButton onClick={onBackup}><Download aria-hidden="true" />Yedeği dışarı aktar</GameButton><GameButton variant="outline" onClick={() => saveImportRef.current?.click()}><Upload aria-hidden="true" />Yedekten geri yükle</GameButton></div><input ref={saveImportRef} type="file" accept="application/json,.json" hidden onChange={event => { onRestore(event.target.files?.[0]); event.target.value = '' }} />
          <p className="court-note">Tarayıcı veya uygulama verisini silmeden önce dosya yedeği al. Hesap veya sunucu kaydı yoktur.</p>
        </CourtBook>
        <CourtBook title="Yeni bir saltanat" detail="Yeni oyun başlatma"><p className="court-note">Şehirlerin, kaynakların ve araştırmaların sıfırlanır. Bu işlem geri alınamaz.</p>{confirmReset ? <div className="admin-reset-confirm" role="group" aria-label="Yeni oyun onayı"><RotateCcw aria-hidden="true" /><h4>Bu hikâyeyi kapatacak mısın?</h4><p>Devam etmeden önce mevcut oyununu dışarı aktarabilirsin.</p><GameButton variant="outline" onClick={onBackup}><Download aria-hidden="true" />Önce yedeğimi al</GameButton><GameButton variant="destructive" onClick={() => { onReset(); setConfirmReset(false) }}>Evet, şehrimi sıfırla</GameButton><GameButton variant="outline" onClick={() => setConfirmReset(false)}>{t.action.cancel}</GameButton></div> : <GameButton className="court-wide" variant="outline" onClick={() => setConfirmReset(true)}><RotateCcw aria-hidden="true" />Yeni oyun başlat</GameButton>}</CourtBook>
      </>}
      {tab === 'divan' && <>
        <CourtBook title="Payitaht Adaları" detail={`Sürüm ${VERSION}`}><p className="court-note">Osmanlı esintili, tek oyunculu ada stratejisi. Çevrimdışı çalışır; hesap açılmaz ve oyun kaydı bu cihazda saklanır.</p><p className="court-note">Dünyadaki diğer hükümdarlar yapay rakiptir. Reklam ve uygulama içi satın alma yoktur.</p><GameButton className="court-wide" variant="outline" onClick={onChangelog}><ScrollText painted aria-hidden="true" />Sürüm arşivini aç</GameButton></CourtBook>
        {onTitle && <CourtBook title="Saray kapısı" detail="Giriş ekranına dön"><p className="court-note">Otomatik kayıt korunur; giriş ekranından devam edebilirsin.</p><GameButton className="court-wide" variant="outline" onClick={onTitle}><Home aria-hidden="true" />Giriş ekranına dön</GameButton></CourtBook>}
        <ErrorReport />
      </>}
    </CourtTabs>
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
  return <CourtBook title="Divan kayıt kontrolü" detail="Bu cihazdaki hata kayıtları"><div className="admin-errors"><Bug aria-hidden="true" /><p>{list.length ? `${list.length} hata kaydı var. Son kayıt: ${new Date(list[0].time).toLocaleString('tr-TR')}.` : 'Bu cihazda kayıtlı hata yok.'}</p></div><p className="court-note">Rapor yalnızca sen kopyalarsan paylaşılır; oyun kendisi hiçbir yere göndermez.</p><div className="admin-save-actions"><GameButton variant="outline" onClick={copy}>Hata raporunu kopyala</GameButton>{list.length > 0 && <GameButton variant="outline" onClick={() => { clearErrors(); setList([]); setNote('Hata kayıtları silindi.') }}>Hata kayıtlarını sil</GameButton>}</div>{note && <p className="court-note" role="status">{note}</p>}</CourtBook>
}
