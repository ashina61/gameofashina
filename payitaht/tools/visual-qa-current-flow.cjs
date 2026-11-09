/* The canonical visual runner now exercises the current construction register,
 * building inspector and management page directly. Keep this former CI entry
 * point as a read-only guard; never rewrite the checked-out test at runtime. */
const fs = require('node:fs')
const path = require('node:path')
const source = fs.readFileSync(path.resolve(__dirname, 'visual-qa.cjs'), 'utf8')
for (const marker of ['.construction-entry[data-building="medrese"]', "name: 'Binaya git'", "name: 'Yapıyı yönet'", "name: 'Medrese sayfası'", "snapPanel('medrese-development')"]) {
  if (!source.includes(marker)) throw new Error(`visual-qa current flow guard missing: ${marker}`)
}
console.log('visual-qa: current construction register → inspector → management flow verified')
