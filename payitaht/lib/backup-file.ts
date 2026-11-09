import { Capacitor, registerPlugin } from '@capacitor/core'

const NativeBackup = registerPlugin<{
  save(options: { data: string; filename: string }): Promise<{ cancelled: boolean }>
}>('SaveBackup')

/** Android uses the system document picker; no broad storage permission is needed. */
export async function saveBackupFile(raw: string): Promise<boolean> {
  const filename = `payitaht-yedek-${new Date().toISOString().slice(0, 10)}.json`
  if (Capacitor.getPlatform() === 'android') {
    return !(await NativeBackup.save({ data: raw, filename })).cancelled
  }
  const file = new File([raw], filename, { type: 'application/json' })
  const data = { files: [file], title: 'Payitaht Adaları kayıt yedeği' }
  try {
    if (navigator.share && navigator.canShare?.(data)) await navigator.share(data)
    else {
      const url = URL.createObjectURL(file)
      const link = document.createElement('a')
      link.href = url; link.download = filename
      document.body.appendChild(link); link.click(); link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    }
    return true
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return false
    throw error
  }
}
