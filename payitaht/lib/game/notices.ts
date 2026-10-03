/**
 * YEREL BİLDİRİM PLANI (V2 Faz 5.5) — oyun arka plana geçince telefona
 * kurulacak hatırlatmalar. Saf işlevdir: kayıttan ne zaman ne söyleneceğini
 * çıkarır; kurmayı lib/notify.ts yapar (Capacitor Local Notifications).
 *
 *   insaat   inşaat bitti          sıradaki her yapının bitiş anı
 *   sefer    sefer döndü           yoldaki her ordunun dönüş anı
 *   baskin   baskın 10 dk sonra    kapıya gelecek her düşmandan 10 dk önce
 *   ambar    ambar doldu           bir kaynağın ambarı dolduğu an
 *
 * Her tür Ayarlar'dan ayrı kapatılır. Kimlikler kararlıdır: aynı olay her
 * kurulumda aynı numarayı alır, eskisinin yerine geçer.
 */
import { BUILDINGS, RESOURCE_IDS, RESOURCE_NAMES, capacity, offlineCapHours, rates, type BuildingId } from './engine'
import { de, den } from './turkce'
import { targetName } from './expeditions'
import type { Empire } from './empire'

export type NoticeKind = 'insaat' | 'sefer' | 'baskin' | 'ambar'
export const NOTICE_KINDS: NoticeKind[] = ['insaat', 'sefer', 'baskin', 'ambar']
export const NOTICE_NAMES: Record<NoticeKind, { name: string; hint: string }> = {
  insaat: { name: 'İnşaat bitti', hint: 'Sıradaki yapı tamamlanınca' },
  sefer: { name: 'Sefer döndü', hint: 'Ordu ganimetle şehre girince' },
  baskin: { name: 'Baskın yaklaşıyor', hint: 'Düşman kapıya varmadan 10 dakika önce' },
  ambar: { name: 'Ambar doldu', hint: 'Bir kaynak ambara sığmayınca (üretim boşa gider)' },
}
export type NoticePrefs = Record<NoticeKind, boolean>
export const DEFAULT_NOTICE_PREFS: NoticePrefs = { insaat: true, sefer: true, baskin: true, ambar: true }
export type Notice = { id: number; kind: NoticeKind; at: number; title: string; body: string }

/** Baskın uyarısı kapıya varıştan bu kadar önce gelir. */
export const RAID_LEAD_MS = 10 * 60_000
/** Telefona en fazla bu kadar bildirim kurulur (en yakın olanlar). */
export const MAX_NOTICES = 24

function stableId(key: string) {
  let h = 2166136261
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619)
  // Android bildirim kimliği 32 bitlik pozitif tamsayı olmalı.
  return (h >>> 1) || 1
}

export function planNotices(empire: Empire, now: number, prefs: NoticePrefs = DEFAULT_NOTICE_PREFS): Notice[] {
  const out: Notice[] = []
  const add = (kind: NoticeKind, key: string, at: number, title: string, body: string) => {
    if (prefs[kind] && at > now) out.push({ id: stableId(`${kind}:${key}`), kind, at, title, body })
  }
  const many = empire.cities.length > 1
  for (const city of empire.cities) {
    const g = city.game
    for (const job of g.queue) {
      if (job.kind !== 'build') continue
      const id = job.id as BuildingId
      add('insaat', `${city.id}:${id}:${job.end}`, job.end, 'İnşaat bitti',
        `${many ? `${de(city.name)} ` : ''}${BUILDINGS[id].name} ${g.buildings[id] + 1}. seviyeye çıktı.`)
    }
    // Ambar: üretim kapalı kaldığı süre içinde (çevrimdışı üst sınır) dolan ilk kaynak.
    const speed = rates(g), cap = capacity(g), horizon = offlineCapHours(g) * 3600_000
    let first: { at: number; name: string } | null = null
    for (const r of RESOURCE_IDS) {
      if (speed[r] <= 0 || g.resources[r] >= cap) continue
      const at = now + ((cap - g.resources[r]) / speed[r]) * 60_000
      if (at - now <= horizon && (!first || at < first.at)) first = { at, name: RESOURCE_NAMES[r].toLocaleLowerCase('tr') }
    }
    if (first) add('ambar', `${city.id}:${Math.round(first.at / 60_000)}`, Math.round(first.at), 'Ambar doldu',
      `${de(city.name)} ${first.name} ambara sığmıyor; üretim boşa gidiyor. Ambarı yükselt ya da harca.`)
  }
  for (const m of empire.missions ?? []) {
    if (m.stationed || m.kind === 'spy' || m.kind === 'deploy') continue
    const home = empire.cities.find(c => c.id === m.cityId)
    if (!home) continue
    add('sefer', `${m.id}`, m.returnAt, 'Sefer döndü', `Ordu ${den(targetName(m.npcId))} ${home.name} şehrine döndü. Raporu oku, ganimeti say.`)
  }
  for (const t of empire.threats ?? []) {
    if (t.battle) continue
    const city = empire.cities.find(c => c.id === t.cityId)
    if (!city) continue
    add('baskin', t.id, t.arriveAt - RAID_LEAD_MS, 'Baskın 10 dakika sonra',
      `${targetName(t.npcId)} ordusu ${city.name} kapısına geliyor. Surları ve askerini hazırla.`)
  }
  return out.sort((a, b) => a.at - b.at).slice(0, MAX_NOTICES)
}
