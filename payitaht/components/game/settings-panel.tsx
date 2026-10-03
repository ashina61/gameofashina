'use client'

/**
 * AYARLAR SAYFASI: kayıt ve yedek, ana ekrana ekleme, yapay rakip temposu,
 * ses, görünüm, bildirimler, yeni oyun, giriş ekranı ve hakkında.
 * (game-shell'deki tek satırlık dev bloktan ayrıldı.)
 */
import { useEffect, useRef, useState } from 'react'
import { Bell, Bug, Download, HardDrive, Home, Info, Moon, Music, RotateCcw, Swords, Upload, WifiOff } from './ui-art'
import { GameButton } from './game-button'
import type { Empire } from '@/lib/game/empire'
import { VERSION } from '@/lib/game/changelog'
import { clearErrors, errorReport, readErrors, type ErrorEntry } from '@/lib/game/error-log'
import { PaceSetting } from './ai-panels'
import { DayNightSetting, MotionSetting, NoticeSettings, SoundSettings } from './sound-settings'
import { notificationsSupported } from '@/lib/notify'
import type { Run } from './world-panels'

export type SettingsProps = {
  empire: Empire | undefined
  run: Run
  warning: string
  native: boolean
  pwa: { installed: boolean; installAvailable: boolean; install: () => void; offlineReady: boolean }
  notify: { supported: boolean; on: boolean; denied: boolean; toggle: () => Promise<unknown> | void }
  onBackup: () => void
  onRestore: (file?: File) => void
  onReset: () => void
  onTitle?: () => void
  onChangelog: () => void
}

export function SettingsPanel({ empire, run, warning, native, pwa, notify, onBackup, onRestore, onReset, onTitle, onChangelog }: SettingsProps) {
  const [confirmReset, setConfirmReset] = useState(false)
  const saveImportRef = useRef<HTMLInputElement>(null)
  const { installed, installAvailable, install, offlineReady } = pwa
  return <div className="settings-panel">
    <section><h3><HardDrive /> Kayıt ve yedek</h3><p>İlerlemen otomatik kaydedilir ve cihazda son sağlam kayıt ayrıca yedeklenir. Ana kayıt bozulursa bu yedek otomatik geri yüklenir. Uygulamayı/tarayıcı verisini tamamen silmeye karşı aşağıdan ayrıca dosya yedeği alabilirsin.</p>{warning && <p role="alert" className="storage-warning">{warning}</p>}<div className="flex flex-wrap gap-2"><GameButton variant="outline" onClick={onBackup}><Download data-icon="inline-start" /> Yedeği dışarı aktar</GameButton><GameButton variant="outline" onClick={() => saveImportRef.current?.click()}><Upload data-icon="inline-start" /> Yedekten geri yükle</GameButton>
  </div><input ref={saveImportRef} type="file" accept="application/json,.json" hidden onChange={e => { onRestore(e.target.files?.[0]); e.target.value = '' }} /><p className="fine-print">Yedek dosyası yalnızca oyun kaydını içerir; hesabın ya da sunucu kaydı yoktur.</p></section>{!native && 
    <section><h3><Download /> Şehrin hep yanında</h3><p>{installed ? 'Oyun ana ekranından çalışıyor.' : 'Ana ekrana ekle, uygulama gibi oyna. Safari’de Paylaş → Ana Ekrana Ekle; Android’de tarayıcı menüsü → Uygulamayı yükle.'}</p>{installAvailable && <GameButton onClick={install}><Download data-icon="inline-start" /> Uygulamayı yükle</GameButton>}<p className="fine-print"><WifiOff className="size-3" />{offlineReady ? 'Çevrimdışı oyun hazır. Bu cihazda internetsiz açabilirsin.' : 'Çevrimdışı açılış, yayınlanan uygulama ilk kez tamamen yüklendiğinde hazırlanır.'}</p></section>}{empire && 
    <section><h3><Swords /> Yapay rakipler</h3><p>Dünyadaki hükümdarlar yapay rakiptir. Tempo, savaşların ve tekliflerin sıklığını belirler; oyunu denemek için “Hareketli” seç.</p><PaceSetting empire={empire} run={run} /></section>}
    <section><h3><Music /> Ses ve titreşim</h3><SoundSettings /></section>
    <section><h3><Moon /> Görünüm</h3><DayNightSetting /><MotionSetting /></section>
    {notificationsSupported() ? <section><h3><Bell /> Bildirimler</h3><p>Oyun kapalıyken telefonun seni çağırır. Her türü ayrı açıp kapatabilirsin; oyuna dönünce bekleyen hatırlatmalar silinir.</p><NoticeSettings /></section> : <section><h3><Bell /> Bildirimler</h3><p>{notify.supported ? 'Baskın uyarıları, savaş sonuçları ve biten inşaatlar için bildirim. Oyun açıkken (arka planda da) çalışır; oyun tamamen kapalıyken bildirim için sunucu gerekir.' : 'Bu tarayıcı bildirimleri desteklemiyor.'}</p>{notify.supported && <GameButton variant={notify.on ? 'outline' : 'default'} onClick={() => void notify.toggle()}><Bell data-icon="inline-start" />{notify.on ? 'Bildirimleri kapat' : 'Bildirimleri aç'}</GameButton>}{notify.denied && <p className="fine-print">Bildirim izni tarayıcıda kapalı; tarayıcı ayarlarından izin verebilirsin.</p>}</section>}
    <section><h3>Yeni bir hikâye</h3><p>Şehrin, kaynakların ve araştırmaların sıfırlanır. Bu işlem geri alınamaz.</p>{confirmReset ? <div className="flex gap-3"><GameButton variant="destructive" onClick={() => { onReset(); setConfirmReset(false) }}>Evet, şehrimi sıfırla</GameButton><GameButton variant="outline" onClick={() => setConfirmReset(false)}>Vazgeç</GameButton>
  </div> : <GameButton variant="outline" onClick={() => setConfirmReset(true)}><RotateCcw data-icon="inline-start" /> Yeni oyun başlat</GameButton>}</section>{onTitle && 
    <section><h3><Home /> Giriş ekranı</h3><p>Oyun kaydedildi; giriş ekranına dönüp devam edebilir ya da yeni bir hikâye başlatabilirsin.</p><GameButton variant="outline" onClick={onTitle}><Home data-icon="inline-start" /> Giriş ekranına dön</GameButton></section>}
    <section><h3><Info /> Hakkında</h3><p>Payitaht Adaları, Osmanlı esintili tek oyunculu bir ada stratejisidir. Çevrimdışı çalışır: hesap açılmaz, kişisel veri toplanmaz, reklam ve uygulama içi satın alma yoktur. Kayıt yalnızca bu cihazda durur.</p><p className="fine-print">Dünyadaki diğer hükümdarlar yapay rakiptir; gerçek oyuncu yoktur. Müzik ve sesler oyunun içinde, cihazda üretilir.</p></section>
    <ErrorReport />
    <button type="button" className="version-link" onClick={onChangelog}>Payitaht Adaları · sürüm {VERSION} · sürüm notları</button>
  </div>
}

/**
 * HATA RAPORU: cihazda tutulan son hatalar. Kopyalanan düz metin, oyuncu
 * isterse geliştiriciye iletilir; oyun kendisi hiçbir yere göndermez.
 */
function ErrorReport() {
  const [list, setList] = useState<ErrorEntry[]>([])
  const [note, setNote] = useState('')
  useEffect(() => setList(readErrors()), [])
  async function copy() {
    const text = errorReport(list, { version: VERSION, device: navigator.userAgent, now: Date.now() })
    try { await navigator.clipboard.writeText(text); setNote('Rapor panoya kopyalandı.') }
    catch { setNote('Kopyalanamadı; bu cihaz panoya yazmaya izin vermiyor.') }
  }
  return <section className="error-report"><h3><Bug /> Hata raporu</h3>
    <p className="fine-print">{list.length ? `Bu cihazda ${list.length} hata kaydı var (son: ${new Date(list[0].time).toLocaleString('tr-TR')}). Rapor yalnızca sen kopyalarsan paylaşılır.` : 'Bu cihazda kayıtlı hata yok.'}</p>
    <div className="batch-row">
      <GameButton size="sm" variant="outline" onClick={copy}>Hata raporunu kopyala</GameButton>
      {list.length > 0 && <GameButton size="sm" variant="ghost" onClick={() => { clearErrors(); setList([]); setNote('Hata kayıtları silindi.') }}>Kayıtları sil</GameButton>}
    </div>
    {note && <p className="fine-print" role="status">{note}</p>}
  </section>
}
