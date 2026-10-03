/**
 * TELEFON BİLDİRİMLERİ (V2 Faz 5.5): oyun arka plana geçince planı
 * (lib/game/notices.ts) Capacitor Local Notifications ile kurar, oyuna
 * dönünce bekleyenleri siler — oyun içindeyken her şey zaten ekranda.
 * Tarayıcıda (PWA) hiçbir şey yapmaz. Tür başına açık/kapalı tercihi
 * cihazda saklanır.
 */
import { DEFAULT_NOTICE_PREFS, NOTICE_KINDS, planNotices, type NoticePrefs } from './game/notices'
import type { Empire } from './game/empire'

const KEY = 'payitaht-bildirim'
const native = process.env.NEXT_PUBLIC_NATIVE === '1'
type Listener = (p: NoticePrefs) => void
const listeners = new Set<Listener>()

export const notificationsSupported = () => native

export function noticePrefs(): NoticePrefs {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<NoticePrefs>
    return Object.fromEntries(NOTICE_KINDS.map(k => [k, typeof raw[k] === 'boolean' ? raw[k] : DEFAULT_NOTICE_PREFS[k]])) as NoticePrefs
  } catch { return { ...DEFAULT_NOTICE_PREFS } }
}
export function setNoticePrefs(patch: Partial<NoticePrefs>) {
  const next = { ...noticePrefs(), ...patch }
  try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* oturumluk */ }
  for (const l of listeners) l(next)
  // İlk açılan türde izin istenir (Android 13+ bildirim izni).
  if (Object.values(patch).some(Boolean)) void ensurePermission()
}
export function onNoticePrefs(l: Listener) { listeners.add(l); return () => { listeners.delete(l) } }

async function plugin() {
  if (!native) return null
  try { return (await import('@capacitor/local-notifications')).LocalNotifications } catch { return null }
}
/** Bildirim izni: verilmişse true; sorulmadıysa bir kez sorar. */
export async function ensurePermission(): Promise<boolean> {
  const ln = await plugin()
  if (!ln) return false
  try {
    const s = await ln.checkPermissions()
    if (s.display === 'granted') return true
    if (s.display === 'denied') return false
    return (await ln.requestPermissions()).display === 'granted'
  } catch { return false }
}
export async function notificationPermission(): Promise<'granted' | 'denied' | 'prompt' | 'none'> {
  const ln = await plugin()
  if (!ln) return 'none'
  try { const s = (await ln.checkPermissions()).display; return s === 'granted' || s === 'denied' ? s : 'prompt' } catch { return 'none' }
}

/** Bekleyen bütün oyun bildirimlerini siler. */
export async function clearNotices() {
  const ln = await plugin()
  if (!ln) return
  try {
    const pending = await ln.getPending()
    if (pending.notifications.length) await ln.cancel({ notifications: pending.notifications.map(n => ({ id: n.id })) })
  } catch { /* bildirim kurulamadıysa sessizce geç */ }
}

/**
 * Oyun arka plana geçerken çağrılır. `gameNow` oyun saatidir; cihaz saati
 * geri alındıysa plan cihaz saatine çevrilir.
 */
export async function scheduleNotices(empire: Empire, gameNow: number) {
  const ln = await plugin()
  if (!ln) return
  const prefs = noticePrefs()
  if (!Object.values(prefs).some(Boolean)) return clearNotices()
  try {
    if ((await ln.checkPermissions()).display !== 'granted') return
    await clearNotices()
    const shift = Date.now() - gameNow
    const list = planNotices(empire, gameNow, prefs)
    if (!list.length) return
    await ln.schedule({
      notifications: list.map(n => ({
        id: n.id, title: n.title, body: n.body,
        schedule: { at: new Date(n.at + shift), allowWhileIdle: true },
        extra: { kind: n.kind },
      })),
    })
  } catch { /* bildirim kurulamadıysa oyun etkilenmez */ }
}
