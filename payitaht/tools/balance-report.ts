/**
 * Denge raporu tablosu: npx tsx tools/balance-report.ts
 * Kural ve formül: lib/game/balance.ts.
 */
import { BALANCE_LIMIT, balanceTable } from '../lib/game/balance'

const rows = balanceTable()
console.log('| Birim | Kol/rol | Değer | Maliyet | Verim | Rol ortancasına göre |')
console.log('|---|---|---:|---:|---:|---:|')
for (const r of rows) {
  const flag = r.vsMedian > BALANCE_LIMIT ? ' ⚠' : ''
  console.log(`| ${r.name} | ${r.group} | ${r.value.toFixed(0)} | ${r.cost.toFixed(0)} | ${r.efficiency.toFixed(2)} | ${r.vsMedian.toFixed(2)}${flag} |`)
}
const bad = rows.filter(r => r.vsMedian > BALANCE_LIMIT)
console.log(bad.length ? `\n${bad.length} birim sınırı (×${BALANCE_LIMIT}) aşıyor.` : `\nBütün birimler rol ortancasının ×${BALANCE_LIMIT} sınırı içinde.`)
process.exitCode = bad.length ? 1 : 0
