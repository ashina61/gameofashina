/* Keep the legacy visual-qa runner aligned with the current city-first flow.
 *
 * BuildingList intentionally opens the modeless BuildingPreview first; the
 * player then chooses "Yapıyı yönet" to enter the full BuildingPage. The
 * older visual QA predates that inspector and waited for BuildingPage
 * immediately, producing a false city-390 failure. Patch the checked-out QA
 * copy at CI runtime only; production/game behavior remains untouched.
 */
const fs = require('node:fs')
const path = require('node:path')

const file = path.resolve(__dirname, 'visual-qa.cjs')
const source = fs.readFileSync(file, 'utf8')

const before = `      await page.locator('.building-list-item').filter({ hasText: 'Medrese' }).click()\n      await page.getByRole('dialog', { name: 'Medrese sayfası' }).waitFor({ timeout: 10_000 })`
const after = `      await page.locator('.building-list-item').filter({ hasText: 'Medrese' }).click()\n      await page.getByRole('dialog', { name: 'Medrese' }).waitFor({ timeout: 10_000 })\n      await page.getByRole('button', { name: 'Yapıyı yönet' }).click()\n      await page.getByRole('dialog', { name: 'Medrese sayfası' }).waitFor({ timeout: 10_000 })`

if (!source.includes(before)) {
  throw new Error('visual-qa building flow marker changed; update visual-qa-current-flow.cjs instead of silently skipping the compatibility patch')
}

fs.writeFileSync(file, source.replace(before, after))
console.log('visual-qa: synced BuildingList → inspector → BuildingPage flow')
