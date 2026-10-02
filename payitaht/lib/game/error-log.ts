/**
 * YEREL HATA KAYDI (V2 Faz 0.7) — yakalanmayan hatalar yalnız bu cihazda,
 * son 20 kayıt olarak tutulur. Sunucuya hiçbir şey gönderilmez; oyuncu
 * Ayarlar > Hakkında'dan raporu kopyalayıp isterse geliştiriciye iletir.
 */

export type ErrorEntry = { time: number; message: string; stack?: string; count: number }

export const ERROR_KEY = 'payitaht-hatalar'
export const ERROR_MAX = 20
const MESSAGE_MAX = 300
const STACK_MAX = 1200

/** Kaydı ekler: art arda aynı hata tek satırda sayılır, en yeni başta. */
export function pushError(list: ErrorEntry[], message: string, stack: string | undefined, time: number): ErrorEntry[] {
  const msg = message.slice(0, MESSAGE_MAX)
  const top = list[0]
  if (top && top.message === msg) return [{ ...top, time, count: top.count + 1 }, ...list.slice(1)]
  const entry: ErrorEntry = { time, message: msg, count: 1 }
  if (stack) entry.stack = stack.slice(0, STACK_MAX)
  return [entry, ...list].slice(0, ERROR_MAX)
}

/** Bozuk ya da eski biçimli kayıtta boş liste döner; oyun asla bundan düşmez. */
export function parseErrors(raw: string | null): ErrorEntry[] {
  if (!raw) return []
  try {
    const v = JSON.parse(raw)
    if (!Array.isArray(v)) return []
    return v.filter((e): e is ErrorEntry => !!e && typeof e.time === 'number' && typeof e.message === 'string' && typeof e.count === 'number'
      && (e.stack === undefined || typeof e.stack === 'string')).slice(0, ERROR_MAX)
  } catch {
    return []
  }
}

/** Kopyalanacak düz metin rapor. */
export function errorReport(list: ErrorEntry[], meta: { version: string; device: string; now: number }): string {
  const head = [`Payitaht Adaları ${meta.version} · hata raporu`, `Tarih: ${new Date(meta.now).toISOString()}`, `Cihaz: ${meta.device}`, `Kayıt: ${list.length}`, '']
  const body = list.map((e, i) => [
    `#${i + 1} ${new Date(e.time).toISOString()}${e.count > 1 ? ` (×${e.count})` : ''}`,
    e.message,
    ...(e.stack ? [e.stack] : []),
    '',
  ].join('\n'))
  return [...head, ...(body.length ? body : ['Kayıtlı hata yok.'])].join('\n')
}

export function readErrors(): ErrorEntry[] {
  try { return parseErrors(localStorage.getItem(ERROR_KEY)) } catch { return [] }
}

export function clearErrors() {
  try { localStorage.removeItem(ERROR_KEY) } catch { /* depolama yok */ }
}

function record(message: string, stack?: string) {
  try { localStorage.setItem(ERROR_KEY, JSON.stringify(pushError(readErrors(), message, stack, Date.now()))) } catch { /* depolama dolu ya da yok */ }
}

/** Pencereye dinleyici takar; söküm fonksiyonu döner. */
export function installErrorLog(): () => void {
  if (typeof window === 'undefined') return () => {}
  const onError = (e: ErrorEvent) => record(e.message || String(e.error), e.error instanceof Error ? e.error.stack : `${e.filename}:${e.lineno}:${e.colno}`)
  const onRejection = (e: PromiseRejectionEvent) => {
    const r = e.reason
    record(r instanceof Error ? r.message : `Yakalanmayan söz: ${String(r)}`, r instanceof Error ? r.stack : undefined)
  }
  window.addEventListener('error', onError)
  window.addEventListener('unhandledrejection', onRejection)
  return () => { window.removeEventListener('error', onError); window.removeEventListener('unhandledrejection', onRejection) }
}
