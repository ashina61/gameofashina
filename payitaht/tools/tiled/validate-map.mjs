/**
 * PAYİTAHT HARİTA DOĞRULAYICI (CI).
 *
 *   node tools/tiled/validate-map.mjs
 *
 * Denetler:
 *  - payitaht_city.tmj geçerli JSON ve doğru izometrik ölçü (128x64).
 *  - Zorunlu katmanlar var (GROUND..DEBUG).
 *  - BUILDING_SLOTS'ta en az 24 normal + belediye; her slotta gx/gy/fw/fh/
 *    slotType özellikleri; bütün city footprint'leri BİREBİR aynı.
 *  - .tmj slotları ile oyunun okuduğu city-slots.json BİREBİR uyumlu (parity).
 *
 * Hata varsa çıkış kodu 1.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const errors = []
const fail = (m) => errors.push(m)

const tmj = JSON.parse(readFileSync(join(ROOT, 'maps/payitaht/payitaht_city.tmj'), 'utf8'))
const json = JSON.parse(readFileSync(join(ROOT, 'lib/game/city-map/city-slots.json'), 'utf8'))

// --- Harita temel özellikleri ---
if (tmj.orientation !== 'isometric') fail(`orientation isometric olmalı, bulundu ${tmj.orientation}`)
if (tmj.tilewidth !== 128) fail(`tilewidth 128 olmalı, bulundu ${tmj.tilewidth}`)
if (tmj.tileheight !== 64) fail(`tileheight 64 olmalı, bulundu ${tmj.tileheight}`)
if (!(tmj.width >= 90 && tmj.height >= 120)) fail(`harita büyük/dikey olmalı (~100x140), bulundu ${tmj.width}x${tmj.height}`)

// --- Katmanlar ---
const REQUIRED = ['GROUND', 'ROADS', 'BUILDING_SLOTS', 'COAST_SLOTS', 'DEFENSE_FOUNDATION', 'DECORATION', 'BUILDINGS', 'DEFENSE', 'DEBUG']
const layerNames = new Set((tmj.layers ?? []).map(l => l.name))
for (const n of REQUIRED) if (!layerNames.has(n)) fail(`eksik katman: ${n}`)

const layer = (name) => (tmj.layers ?? []).find(l => l.name === name)
const prop = (obj, name) => (obj.properties ?? []).find(p => p.name === name)?.value

// --- BUILDING_SLOTS ---
const bs = layer('BUILDING_SLOTS')
const cityObjs = (bs?.objects ?? [])
const cityFixed = cityObjs.filter(o => prop(o, 'fixed') === true)
const cityMovable = cityObjs.filter(o => prop(o, 'fixed') !== true)
if (cityMovable.length < 24) fail(`en az 24 taşınabilir city slotu olmalı, bulundu ${cityMovable.length}`)
if (cityFixed.length < 1) fail('belediye için çakılı bir slot olmalı')

// Her slotta gerekli özellikler + aynı footprint.
let refFoot = null
for (const o of cityObjs) {
  for (const p of ['slotId', 'slotType', 'gx', 'gy', 'fw', 'fh']) {
    if (prop(o, p) === undefined) fail(`slot ${o.name}: eksik özellik ${p}`)
  }
  const foot = `${prop(o, 'fw')}x${prop(o, 'fh')}`
  if (refFoot === null) refFoot = foot
  else if (foot !== refFoot) fail(`slot ${o.name}: footprint ${foot} != ${refFoot} (hepsi aynı olmalı)`)
}

// Slot tipleri yalnızca city/coast/defense.
const ALLOWED = new Set(['city', 'coast', 'defense'])
for (const name of ['BUILDING_SLOTS', 'COAST_SLOTS', 'DEFENSE_FOUNDATION']) {
  for (const o of layer(name)?.objects ?? []) {
    const t = prop(o, 'slotType')
    if (t !== undefined && !ALLOWED.has(t)) fail(`${name}/${o.name}: geçersiz slotType ${t}`)
  }
}

// --- Parity: .tmj slotları == city-slots.json ---
const tmjSlots = new Map()
for (const name of ['BUILDING_SLOTS', 'COAST_SLOTS', 'DEFENSE_FOUNDATION']) {
  for (const o of layer(name)?.objects ?? []) {
    const id = prop(o, 'slotId')
    if (id) tmjSlots.set(id, { gx: prop(o, 'gx'), gy: prop(o, 'gy'), type: prop(o, 'slotType') })
  }
}
for (const s of json.slots) {
  const t = tmjSlots.get(s.id)
  if (!t) { fail(`parity: ${s.id} JSON'da var ama .tmj'de yok`); continue }
  if (t.gx !== s.gx || t.gy !== s.gy) fail(`parity: ${s.id} koordinat uyuşmuyor (.tmj ${t.gx},${t.gy} vs json ${s.gx},${s.gy})`)
  if (t.type !== s.type) fail(`parity: ${s.id} tip uyuşmuyor`)
}
if (tmjSlots.size !== json.slots.length) fail(`parity: slot sayısı farklı (.tmj ${tmjSlots.size} vs json ${json.slots.length})`)

// --- Sonuç ---
if (errors.length) {
  console.error('HARİTA DOĞRULAMA BAŞARISIZ:')
  for (const e of errors) console.error('  - ' + e)
  process.exit(1)
}
console.log(`OK · ${tmj.width}x${tmj.height} @ ${tmj.tilewidth}x${tmj.tileheight} iso`)
console.log(`OK · slotlar: ${cityObjs.length} city (${cityFixed.length} çakılı), toplam ${json.slots.length}; footprint ${refFoot}`)
console.log('OK · .tmj ↔ city-slots.json parity tamam')
