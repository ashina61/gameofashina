'use client'
import { useEffect, useRef, useState } from 'react'
import { t } from '@/lib/i18n/tr'
import { asset } from '@/lib/asset'
import { Bell, HardDrive, Info, Settings } from './ui-art'
import { GameButton } from './game-button'
import { CourtTabs } from './court-kit'
import type { Empire } from '@/lib/game/empire'
import { VERSION } from '@/lib/game/changelog'
import { clearErrors, errorReport, readErrors, type ErrorEntry } from '@/lib/game/error-log'
import { RoyalPreferences } from './royal-preferences'
import { NoticeSettings } from './sound-settings'
import { notificationsSupported } from '@/lib/notify'
import { ApprovedArt } from './approved-court-art'
import { RoyalSection, RoyalStatus, RoyalToggle } from './royal-kit'
import type { Run } from './world-panels'

export type SettingsProps = {
  empire: Empire | undefined; run: Run; warning: string; native: boolean
  pwa: { installed: boolean; installAvailable: boolean; install: () => void; offlineReady: boolean }
  notify: { supported: boolean; on: boolean; denied: boolean; toggle: () => Promise<unknown> | void }
  onBackup: () => void; onRestore: (file?: File) => void; onReset: () => void; onTitle?: () => void; onChangelog: () => void
}
const TABS = [{ id: 'play', label: 'Tercihler', Icon: Settings }, { id: 'device', label: 'Cihaz', Icon: Bell }, { id: 'save', label: 'Kayıt', Icon: HardDrive }, { id: 'divan', label: 'Bilgi', Icon: Info }] as const
type Tab = typeof TABS[number]['id']

export function SettingsPanel({ empire, run, warning, native, pwa, notify, onBackup, onRestore, onReset, onTitle, onChangelog }: SettingsProps) {
  const [tab, setTab] = useState<Tab>('play'), [confirmReset, setConfirmReset] = useState(false)
  const saveImportRef = useRef<HTMLInputElement>(null)
  const { installed, installAvailable, install, offlineReady } = pwa
  return <div className="court-page court-admin royal-page">
    <div className="royal-settings-scene"><img src={asset('/images/game/ui/approved-court/desk.webp')} alt="" width={852} height={223} /><h2>Divan nizamnamesi</h2></div>
    <CourtTabs items={TABS} value={tab} onChange={next => { setTab(next); setConfirmReset(false) }} label="İdare defteri" illustrated={false}>
      {tab === 'play' && <RoyalPreferences empire={empire} run={run} />}
      {tab === 'device' && <div className="royal-subpage royal-device-page">
        <RoyalSection title="Habercilerin çağrısı" detail="Şehrinden gelen haberleri seç." art="bell">
          <div className="royal-inscription"><ApprovedArt name="tempo" /><p>Baskın, dönen ordular ve tamamlanan işlerden haberdar ol.</p></div>
          {notificationsSupported() ? <NoticeSettings royal /> : <>{notify.supported ? <RoyalToggle name="Şehir bildirimleri" art="bell" checked={notify.on} change={() => void notify.toggle()} hint="Oyun açıkken ve arka plandayken haber verir." /> : <p className="royal-note">Bu tarayıcı bildirimleri desteklemiyor.</p>}{notify.denied && <p className="royal-note">Bildirim izni tarayıcıda kapalı. Tarayıcı ayarlarından açabilirsin.</p>}</>}
        </RoyalSection>
        {!native && <RoyalSection title="Şehrin hep yanında" detail="Cihazına ekle, kolayca geri dön." art="city"><div className="royal-status-grid"><RoyalStatus art="city" title="Uygulama">{installed ? 'Yüklü' : 'Tarayıcıda'}</RoyalStatus><RoyalStatus art="seal" title="Çevrimdışı">{offlineReady ? 'Hazır' : 'Hazırlanıyor'}</RoyalStatus></div>{installAvailable && <GameButton className="royal-action" onClick={install}><ApprovedArt name="city" />Uygulamayı yükle</GameButton>}<p className="royal-note">{installed ? 'Oyun ana ekranından çalışıyor.' : 'Safari’de Paylaş → Ana Ekrana Ekle; Android’de tarayıcı menüsü → Uygulamayı yükle.'}</p><p className="royal-note">{offlineReady ? 'Bu cihazda internetsiz açabilirsin.' : 'Çevrimdışı açılış, uygulama ilk kez tamamen yüklendiğinde hazırlanır.'}</p></RoyalSection>}
      </div>}
      {tab === 'save' && <div className="royal-subpage royal-save-page">
        <RoyalSection title="Saltanatın emaneti" detail="Şehirlerini ve ilerlemeni güvenle sakla." art="seal"><div className="royal-inscription"><ApprovedArt name="tempo" /><p><strong>Otomatik kayıt açık</strong><br />İlerlemen bu cihazda tutulur; son sağlam kayıt ayrıca yedeklenir.</p></div>{warning && <p role="alert" className="storage-warning">{warning}</p>}
          <div className="royal-save-actions"><GameButton className="royal-action" onClick={onBackup}><ApprovedArt name="tempo" /><span><strong>Yedeği dışarı aktar</strong><small>Saltanatını bir dosyada sakla.</small></span><b aria-hidden="true">›</b></GameButton><GameButton className="royal-action" variant="outline" onClick={() => saveImportRef.current?.click()}><ApprovedArt name="tempo" /><span><strong>Yedekten geri yükle</strong><small>Kaydettiğin oyun dosyasını seç.</small></span><b aria-hidden="true">›</b></GameButton></div>
          <input ref={saveImportRef} type="file" accept="application/json,.json" hidden onChange={event => { onRestore(event.target.files?.[0]); event.target.value = '' }} />
          <p className="royal-note">Tarayıcı veya uygulama verisini silmeden önce dosya yedeği al. Dosya şehirlerini ve ilerlemeni içerir; kayıt bu cihazda saklanır.</p>
        </RoyalSection>
        <RoyalSection title="Yeni bir saltanat" detail="Yeni bir hikâyenin ilk taşı." art="hourglass"><p className="royal-note">Şehirlerin, kaynakların ve araştırmaların sıfırlanır. Bu işlem geri alınamaz.</p>{confirmReset ? <div className="royal-reset-confirm" role="group" aria-label="Yeni oyun onayı"><ApprovedArt name="seal" /><h4>Bu hikâyeyi kapatacak mısın?</h4><p>Devam etmeden önce oyununu dışarı aktarabilirsin.</p><GameButton className="royal-action" variant="outline" onClick={onBackup}>Önce yedeğimi al</GameButton><GameButton className="royal-action" variant="destructive" onClick={() => { onReset(); setConfirmReset(false) }}>Evet, şehrimi sıfırla</GameButton><GameButton className="royal-action" variant="outline" onClick={() => setConfirmReset(false)}>{t.action.cancel}</GameButton></div> : <GameButton className="royal-action" variant="outline" onClick={() => setConfirmReset(true)}><ApprovedArt name="hourglass" />Yeni oyun başlat</GameButton>}</RoyalSection>
      </div>}
      {tab === 'divan' && <div className="royal-subpage royal-info-page">
        <RoyalSection title="Payitaht Adaları" detail="Bir imparatorluğun hikâyesi" art="city"><div className="royal-version-seal"><ApprovedArt name="seal" /><span>Osmanlı esintili ada stratejisi<strong>Sürüm {VERSION}</strong></span></div><div className="royal-game-facts"><RoyalStatus art="city" title="Tek oyunculu">Yapay rakipler</RoyalStatus><RoyalStatus art="seal" title="Çevrimdışı">Cihazda kayıt</RoyalStatus><RoyalStatus art="oud" title="Müzik ve ses">Cihazda üretilir</RoyalStatus><RoyalStatus art="laurel" title="Reklamsız">Satın alma yok</RoyalStatus></div><p className="royal-note">Hesap açılmaz; kişisel veri toplanmaz. Oyun kaydı bu cihazda saklanır.</p><GameButton className="royal-action" variant="outline" onClick={onChangelog}><ApprovedArt name="tempo" />Sürüm arşivini aç</GameButton></RoyalSection>
        {onTitle && <RoyalSection title="Saray kapısı" detail="Hikâyene dilediğin zaman dön." art="city"><p className="royal-note">Otomatik kaydın korunur; giriş ekranından devam edebilirsin.</p><GameButton className="royal-action" variant="outline" onClick={onTitle}>Giriş ekranına dön</GameButton></RoyalSection>}
        <ErrorReport />
      </div>}
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
  return <RoyalSection title="Divan kayıt kontrolü" detail="Bu cihazdaki hata defteri" art="tempo"><div className="royal-inscription"><ApprovedArt name="seal" /><p>{list.length ? `${list.length} hata kaydı var. Son kayıt: ${new Date(list[0].time).toLocaleString('tr-TR')}.` : 'Defter temiz. Bu cihazda kayıtlı hata yok.'}</p></div><p className="royal-note">Rapor yalnızca sen kopyalarsan paylaşılır.</p><div className="royal-save-actions"><GameButton className="royal-action" variant="outline" onClick={copy}>Hata raporunu kopyala</GameButton>{list.length > 0 && <GameButton className="royal-action" variant="outline" onClick={() => { clearErrors(); setList([]); setNote('Hata kayıtları silindi.') }}>Hata kayıtlarını sil</GameButton>}</div>{note && <p className="royal-note" role="status">{note}</p>}</RoyalSection>
}
