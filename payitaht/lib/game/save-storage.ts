import { parseEmpire, type Empire } from './empire'

/** Legacy anahtar korunur; mevcut kurulumlar ve migration bozulmaz. */
export const SAVE_KEY = 'payitaht-adalari-v1'
export const SAVE_BACKUP_KEY = `${SAVE_KEY}-backup`
export const SAVE_CORRUPT_KEY = `${SAVE_KEY}-corrupt`

export type SaveStore = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem?(key: string): void
}

export type StoredSave = {
  empire?: Empire
  recovered?: boolean
  warning?: string
  error?: string
}

const message = (error: unknown) => error instanceof Error ? error.message : 'Kayıt okunamadı.'

function parse(raw: string | null): Empire | undefined {
  return raw ? parseEmpire(raw) : undefined
}

/**
 * Ana kayıt geçerliyse onu döndürür. Bozuksa ham veriyi kurtarma slotunda
 * saklar ve son doğrulanmış yedeği ana slota geri koyar.
 */
export function loadStoredEmpire(store: SaveStore): StoredSave {
  let raw: string | null = null
  try {
    raw = store.getItem(SAVE_KEY)
    if (raw) return { empire: parseEmpire(raw) }
  } catch (primaryError) {
    // Ana kayıt bozuksa onu asla sessizce ezmeyiz; tanı/kurtarma için saklarız.
    if (raw) {
      try { store.setItem(SAVE_CORRUPT_KEY, raw) } catch { /* depolama tamamen kapalı olabilir */ }
    }
    try {
      const backupRaw = store.getItem(SAVE_BACKUP_KEY)
      const backup = parse(backupRaw)
      if (backup && backupRaw) {
        try { store.setItem(SAVE_KEY, backupRaw) } catch { /* oturum yine backup ile açılabilir */ }
        return {
          empire: backup,
          recovered: true,
          warning: 'Ana kayıt bozulmuştu; son sağlam cihaz yedeği otomatik geri yüklendi.',
        }
      }
    } catch {
      // Aşağıda ana hatayı göster.
    }
    return { error: message(primaryError) }
  }

  // Ana slot yok ama backup kaldıysa (ör. yarım storage temizliği) onu kurtar.
  try {
    const backupRaw = store.getItem(SAVE_BACKUP_KEY)
    const backup = parse(backupRaw)
    if (backup && backupRaw) {
      try { store.setItem(SAVE_KEY, backupRaw) } catch { /* salt-okunur depolama */ }
      return {
        empire: backup,
        recovered: true,
        warning: 'Ana kayıt bulunamadı; son sağlam cihaz yedeği geri yüklendi.',
      }
    }
  } catch (error) {
    return { error: message(error) }
  }
  return {}
}

/** Başlık ekranı için depolamayı değiştirmeyen okuma. */
export function peekStoredEmpire(store: SaveStore): StoredSave {
  try {
    const raw = store.getItem(SAVE_KEY)
    if (raw) return { empire: parseEmpire(raw) }
    const backup = parse(store.getItem(SAVE_BACKUP_KEY))
    return backup ? { empire: backup, recovered: true } : {}
  } catch (primaryError) {
    try {
      const backup = parse(store.getItem(SAVE_BACKUP_KEY))
      if (backup) return {
        empire: backup,
        recovered: true,
        warning: 'Ana kayıt okunamadı; devam edersen cihaz yedeği kullanılacak.',
      }
    } catch { /* ana hatayı koru */ }
    return { error: message(primaryError) }
  }
}

/**
 * Yazmadan önce mevcut ana kaydı parse ederek doğrular ve yalnızca sağlam
 * kayıtları backup slotuna taşır. Böylece bozuk bir string yedeği de zehirlemez.
 */
export function saveStoredEmpire(store: SaveStore, empire: Empire) {
  const next = JSON.stringify(empire)
  const previous = store.getItem(SAVE_KEY)
  if (previous && previous !== next) {
    try {
      parseEmpire(previous)
      store.setItem(SAVE_BACKUP_KEY, previous)
    } catch {
      try { store.setItem(SAVE_CORRUPT_KEY, previous) } catch { /* best effort */ }
    }
  }
  store.setItem(SAVE_KEY, next)
  // İlk çalıştırmada da iki sağlam kopya bulunsun.
  if (!store.getItem(SAVE_BACKUP_KEY)) store.setItem(SAVE_BACKUP_KEY, next)
}

export function importStoredEmpire(store: SaveStore, raw: string): Empire {
  const empire = parseEmpire(raw)
  saveStoredEmpire(store, empire)
  return empire
}

export function exportStoredEmpire(empire: Empire) {
  return JSON.stringify(empire, null, 2)
}
