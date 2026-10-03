import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { VERSION } from './changelog'
import { advanceEmpire, EMPIRE_SCHEMA, parseEmpire } from './empire'
import { BUILDING_IDS, GAME_MIGRATIONS, GAME_SCHEMA, migrateGame, NEWER_SAVE } from './engine'
import { loadStoredEmpire, SAVE_KEY, saveStoredEmpire } from './save-storage'

/*
 * ESKİ KAYITLAR (V2 Faz 7.5): lib/game/fixtures/saves/ altındaki her dosya o
 * sürümün kendi motoruyla oynanmış bir kayıttır (tools/saves/build-fixtures.sh).
 * Bugünkü sürüm hepsini açmalı, ilerletmeli ve oyuncunun emeğini korumalı.
 */
const dir = join(__dirname, 'fixtures', 'saves')
const files = readdirSync(dir).filter(f => f.endsWith('.json')).sort()

test('0.20 ve sonrasının bütün kayıt örnekleri mevcut', () => {
  const versions = files.map(f => f.replace(/\.json$/, ''))
  for (const v of ['0.20.0', '0.25.0', '0.29.1', '0.30.0', '0.38.0']) assert.ok(versions.includes(v), `${v} örneği yok`)
})

for (const file of files) {
  test(`${file.replace(/\.json$/, '')} kaydı açılır ve ilerler`, () => {
    const raw = readFileSync(join(dir, file), 'utf8')
    const old = JSON.parse(raw)
    const empire = parseEmpire(raw)
    assert.equal(empire.cities.length, old.cities.length)
    const before = old.cities[0].game, city = empire.cities[0].game
    // Bina seviyeleri, kaynaklar ve süren inşaat aynen korunur.
    for (const id of BUILDING_IDS) assert.equal(city.buildings[id], before.buildings[id] ?? 0, id)
    // 0.42: taş çıktı; stok 1:1 akçeye, Taş Ocağı seviyesi akçe+kereste iadesine, sıradaki ocak işi akçeye döner.
    const tasJobs = (before.queue ?? []).filter((j: { id: string }) => j.id === 'tas').length
    const tas = before.buildings.tas ?? 0
    assert.equal(city.resources.gold, before.resources.gold + Math.floor(before.resources.stone ?? 0) + tas * 200 + tasJobs * 300, 'gold')
    assert.equal(city.resources.wood, before.resources.wood + tas * 150, 'wood')
    assert.equal(city.resources.knowledge, before.resources.knowledge, 'knowledge')
    assert.equal('stone' in city.resources, false)
    assert.deepEqual(city.queue.map(j => j.id), (before.queue ?? []).map((j: { id: string }) => j.id).filter((id: string) => id !== 'tas'))
    // 0.42: üzüm kahveye döndü; eski stok aynen kahve olarak gelir.
    if (before.luxury?.uzum !== undefined) assert.equal(city.luxury.kahve, before.luxury.uzum)
    assert.equal(JSON.stringify(empire).includes('"uzum"'), false)
    assert.doesNotMatch(JSON.stringify(empire), /"stone"|"tas"/)
    // Bugünkü motorla bir saat ilerler ve yeniden kaydedilip açılır.
    const later = advanceEmpire(empire, city.updatedAt + 3600_000)
    const again = parseEmpire(JSON.stringify(later))
    assert.equal(again.cities[0].game.buildings.divan >= before.buildings.divan, true)
  })
}

test('şehir kaydı göç zinciri kesintisiz ve en yeni şemada bitiyor', () => {
  for (let v = 1; v < GAME_SCHEMA; v++) assert.equal(typeof GAME_MIGRATIONS[v], 'function', `v${v} adımı yok`)
  const migrated = migrateGame({ version: 1, buildings: { divan: 1 } })
  assert.equal(migrated.version, GAME_SCHEMA)
})

test('daha yeni sürümün kaydı anlaşılır bir hatayla reddedilir', () => {
  const raw = readFileSync(join(dir, files.at(-1)!), 'utf8')
  const future = JSON.parse(raw)
  assert.throws(() => parseEmpire(JSON.stringify({ ...future, version: EMPIRE_SCHEMA + 1 })), { message: NEWER_SAVE })
  future.cities[0].game.version = GAME_SCHEMA + 1
  assert.throws(() => parseEmpire(JSON.stringify(future)), { message: NEWER_SAVE })
})

test('yazılan kayıt hangi sürümün yazdığını taşır, okurken yok sayılır', () => {
  const mem = new Map<string, string>()
  const store = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) }
  const empire = parseEmpire(readFileSync(join(dir, files.at(-1)!), 'utf8'))
  saveStoredEmpire(store, empire)
  assert.equal(JSON.parse(mem.get(SAVE_KEY)!).savedBy, VERSION)
  assert.equal('savedBy' in loadStoredEmpire(store).empire!, false)
})

test('yeni sürümün kaydı yedekle ezilmez', () => {
  const mem = new Map<string, string>()
  const store = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) }
  const raw = readFileSync(join(dir, files.at(-1)!), 'utf8')
  const newer = JSON.stringify({ ...JSON.parse(raw), version: EMPIRE_SCHEMA + 1 })
  mem.set(SAVE_KEY, newer); mem.set(`${SAVE_KEY}-backup`, raw)
  assert.equal(loadStoredEmpire(store).error, NEWER_SAVE)
  assert.equal(mem.get(SAVE_KEY), newer)
})
