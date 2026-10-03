/**
 * Tempo simülasyonu tablosu: npx tsx tools/pace-sim.ts
 * Mantık ve hedefler: lib/game/pace.ts.
 */
import { PACE_TARGETS, dayReached, paceCurve, type Profile } from '../lib/game/pace'

const profiles: Profile[] = ['aktif', 'gunde3', 'gunde1']
const curves = Object.fromEntries(profiles.map(p => [p, paceCurve(p)])) as Record<Profile, number[]>
console.log('Gün | ' + profiles.join(' | '))
for (const d of [1, 2, 3, 5, 7, 10, 14, 21, 30]) console.log(`${String(d).padStart(3)} | ${profiles.map(p => String(curves[p][d - 1]).padStart(5)).join(' | ')}`)
console.log('\nHedefe ulaşma günü (hedef ±%20):')
for (const t of PACE_TARGETS) console.log(`Divanhane ${t.level} → hedef ${t.day}. gün · ${profiles.map(p => `${p}: ${dayReached(curves[p], t.level) ?? 'yok'}`).join(' · ')}`)
