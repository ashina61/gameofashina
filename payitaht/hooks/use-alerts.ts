'use client'

/**
 * BİLDİRİMLER. Oyun açıkken (sekme arka planda ya da ekran kapalıyken bile
 * uygulama yaşıyorsa) baskın uyarısı, savaş sonucu ve biten inşaat için sistem
 * bildirimi gösterir. Oyun tamamen kapalıyken bildirim göndermek bir sunucu
 * (push) ister; bu sürümde yoktur.
 */
import { useEffect, useRef, useState } from 'react'
import type { Empire } from '@/lib/game/empire'
import { targetName } from '@/lib/game/expeditions'
import { asset } from '@/lib/asset'

const KEY = 'payitaht-notify'
export function notifySupported() { return typeof window !== 'undefined' && 'Notification' in window }
function enabled() {
  try { return notifySupported() && Notification.permission === 'granted' && localStorage.getItem(KEY) === '1' } catch { return false }
}
async function show(title: string, body: string) {
  const options = { body, icon: asset('/icon-192.png'), badge: asset('/icon-192.png'), tag: `${title}-${body}`.slice(0, 64) }
  try {
    const reg = await navigator.serviceWorker?.getRegistration(asset('/'))
    if (reg) await reg.showNotification(title, options)
    else new Notification(title, options)
  } catch { /* bildirim gösterilemedi */ }
}

/** Ayarlar için: bildirimleri aç/kapat. */
export function useNotifySetting() {
  const [on, setOn] = useState(false)
  const [denied, setDenied] = useState(false)
  useEffect(() => { setOn(enabled()); setDenied(notifySupported() && Notification.permission === 'denied') }, [])
  async function toggle() {
    if (!notifySupported()) return
    if (on) { try { localStorage.setItem(KEY, '0') } catch { /* yok */ } setOn(false); return }
    const perm = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission()
    setDenied(perm === 'denied')
    if (perm === 'granted') { try { localStorage.setItem(KEY, '1') } catch { /* yok */ } setOn(true); void show('Bildirimler açık', 'Baskınlar ve savaş sonuçları sana haber verilecek.') }
  }
  return { on, denied, supported: notifySupported(), toggle }
}

/** Yeni baskın, yeni rapor ve biten inşaat/araştırma için bildirim. */
export function useAlerts(empire?: Empire) {
  const prev = useRef<{ threats: Set<string>; reports: Set<string>; logs: Record<string, number> } | null>(null)
  useEffect(() => {
    if (!empire) return
    const threats = new Set((empire.threats ?? []).map(t => t.id))
    const reports = new Set((empire.reports ?? []).map(r => r.id))
    const logs = Object.fromEntries(empire.cities.map(c => [c.id, c.game.log[0]?.time ?? 0]))
    const before = prev.current
    prev.current = { threats, reports, logs }
    if (!before || !enabled() || !document.hidden) return
    for (const t of empire.threats ?? []) {
      if (before.threats.has(t.id)) continue
      const city = empire.cities.find(c => c.id === t.cityId)?.name ?? 'Şehrin'
      void show(`${targetName(t.npcId)} baskını yaklaşıyor!`, `${city} önüne 15 dakika içinde varacaklar. Surları ve askerleri hazırla.`)
    }
    for (const r of empire.reports ?? []) if (!before.reports.has(r.id)) void show(r.title, r.lines[0] ?? '')
    for (const c of empire.cities) {
      const fresh = c.game.log.filter(l => l.time > (before.logs[c.id] ?? 0) && /seviyeye ulaştı|araştırması tamamlandı|sancağın altına girdi/.test(l.text))
      for (const l of fresh.slice(0, 3)) void show(c.name, l.text)
    }
  }, [empire])
}
