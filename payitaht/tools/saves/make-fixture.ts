/**
 * ESKİ SÜRÜM KAYIT ÖRNEĞİ ÜRETİCİ (V2 Faz 7.5).
 *
 * Bu dosya eski bir sürümün kaynak ağacına kopyalanıp ORADA çalıştırılır:
 * o sürümün kendi motoruyla oynanmış küçük bir imparatorluk kaydı yazar.
 * Kullanım: tools/saves/build-fixtures.sh (git arşivinden her sürümü açar).
 *
 * Yalnız her sürümde var olan uçları kullanır (initialEmpire, execute,
 * advanceEmpire); biri yoksa ya da hata verirse o adım atlanır.
 */
import * as empireMod from '../../lib/game/empire'
import * as engine from '../../lib/game/engine'

const T0 = Date.UTC(2026, 8, 20, 9, 0, 0)
const MIN = 60_000
const anyEngine = engine as unknown as Record<string, unknown>
const anyEmpire = empireMod as unknown as Record<string, unknown>

type Cmd = Record<string, unknown>
function run(e: { cities: { game: unknown }[] }, cmd: Cmd, now: number) {
  const execute = anyEngine.execute as ((g: unknown, c: Cmd, n: number) => { game: unknown; error?: string }) | undefined
  if (!execute) return
  try {
    const r = execute(e.cities[0].game, cmd, now)
    if (!r.error) e.cities[0].game = r.game
    else process.stderr.write(`${String(cmd.type)}: ${r.error}\n`)
  } catch { /* bu sürümde yok */ }
}

const initialEmpire = anyEmpire.initialEmpire as (n: number) => { cities: { game: Record<string, unknown> }[] }
const advanceEmpire = anyEmpire.advanceEmpire as (e: unknown, n: number) => typeof empire
let empire = initialEmpire(T0)
const g = empire.cities[0].game as { resources: Record<string, number>; luxury?: Record<string, number> }
for (const k of Object.keys(g.resources)) g.resources[k] = 40_000
for (const k of Object.keys(g.luxury ?? {})) g.luxury![k] = 2_000

let now = T0 + MIN
run(empire, { type: 'build', id: 'divan' }, now)
run(empire, { type: 'workers', id: 'kereste', value: 4 }, now)
empire = advanceEmpire(empire, (now += 30 * MIN))
run(empire, { type: 'build', id: 'divan' }, now)
run(empire, { type: 'claim', id: 'first-upgrade' }, now)
// Rakipler, dünya haberleri ve tehditler biraz işlesin.
for (let i = 0; i < 96; i++) empire = advanceEmpire(empire, (now += 15 * MIN))
for (const k of Object.keys(g.luxury ?? {})) (empire.cities[0].game as typeof g).luxury![k] = 2_000
run(empire, { type: 'build', id: 'divan' }, now)
run(empire, { type: 'build', id: 'konut' }, now)
empire = advanceEmpire(empire, now + MIN)
process.stdout.write(JSON.stringify(empire))
