#!/usr/bin/env node
/* Run on a fresh Android emulator with the repository's debug APK. */
const assert = require('node:assert/strict')
const { execFileSync } = require('node:child_process')
const fs = require('node:fs/promises')
const path = require('node:path')
const { setTimeout: delay } = require('node:timers/promises')
const { _android } = require('playwright')

const APP = 'com.ashina.payitaht'
const CITY = 'Android QA Sahili'
const RULER = 'Android QA'
const SAVE_ROOT = '/storage/emulated/0'
const OUT = path.resolve(process.env.ANDROID_DEVICE_EVIDENCE || 'visual-review/android-device')
const APK = process.argv[2]
const report = { checks: [] }

function adb(...args) {
  return execFileSync('adb', args, { timeout: 30_000, maxBuffer: 4 * 1024 * 1024 })
}

function shell(...args) {
  return adb('shell', ...args).toString().trim()
}

async function until(label, read, timeout = 30_000) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    const value = await read()
    if (value) return value
    await delay(350)
  }
  throw new Error('Timed out waiting for ' + label)
}

async function screenshot(name) {
  return fs.writeFile(path.join(OUT, name + '.png'), adb('exec-out', 'screencap', '-p'))
}

async function start(device) {
  shell('am', 'start', '-W', '-n', APP + '/.MainActivity')
  const view = await device.webView({ pkg: APP }, { timeout: 45_000 })
  const page = await view.page()
  assert.ok(page, 'Capacitor WebView not found')
  await page.waitForURL('https://localhost/**', { timeout: 45_000 })
  page.setDefaultTimeout(35_000)
  return page
}

function savedCity(page) {
  return page.evaluate(() => {
    const empire = JSON.parse(localStorage.getItem('payitaht-adalari-v1') || 'null')
    return empire?.cities.find(city => city.id === empire.activeCityId)?.name
  })
}

function record(check) {
  report.checks.push(check)
  console.log('Android emulator passed: ' + check)
}

async function settings(page) {
  await page.getByRole('button', { name: /^Hükümdar profili:/ }).click()
  await page.getByRole('button', { name: 'Ayarları aç', exact: true }).click()
  await page.getByRole('tab', { name: 'Kayıt', exact: true }).click()
}

function pickerIsOpen() {
  return shell('dumpsys', 'window').split('\n').some(line => line.includes('mCurrentFocus') && line.includes('documentsui'))
}

function tapSave() {
  const xmlPath = '/data/local/tmp/payitaht-window.xml'
  shell('uiautomator', 'dump', xmlPath)
  const xml = shell('cat', xmlPath)
  for (const tag of xml.match(/<node\b[^>]*>/g) ?? []) {
    if (!/\btext="save"/i.test(tag) && !/\bcontent-desc="save"/i.test(tag)) continue
    if (!/\benabled="true"/.test(tag)) continue
    const bounds = tag.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/)
    if (!bounds) continue
    const [, left, top, right, bottom] = bounds.map(Number)
    shell('input', 'tap', String(Math.round((left + right) / 2)), String(Math.round((top + bottom) / 2)))
    return true
  }
  return false
}

function findBackup() {
  return shell('find', SAVE_ROOT, '-maxdepth', '3', '-name', "'payitaht-yedek-*.json'", '2>/dev/null', '||', 'true').split('\n').find(Boolean)
}

async function main() {
  await fs.mkdir(OUT, { recursive: true })
  assert.ok(APK, 'Pass the debug APK path')
  adb('install', APK)
  report.androidApi = Number(shell('getprop', 'ro.build.version.sdk'))
  shell('cmd', 'connectivity', 'airplane-mode', 'enable')
  shell('svc', 'wifi', 'disable')
  shell('svc', 'data', 'disable')
  assert.equal(shell('settings', 'get', 'global', 'airplane_mode_on'), '1')
  shell('input', 'keyevent', 'KEYCODE_WAKEUP')
  shell('wm', 'dismiss-keyguard')
  const devices = await _android.devices()
  assert.equal(devices.length, 1, 'Expected a single Android emulator')
  const [device] = devices
  const errors = []
  const watch = page => page.on('pageerror', error => errors.push(error.message))
  try {
    let page = await start(device)
    watch(page)
    // Airplane mode and both radio settings are set before launch. WebView's
    // navigator.onLine can still be true for the emulator's virtual interface.
    await page.getByRole('button', { name: 'Hikâyeye başla', exact: true }).waitFor()
    record('Installed WebView reaches the bundled title screen in airplane mode')
    await page.getByRole('button', { name: 'Hikâyeye başla', exact: true }).click()
    await page.getByLabel('Hükümdarın adı').fill(RULER)
    await page.locator('#title-city').fill(CITY)
    await page.locator('.title-form button[type="submit"]').click()
    await page.getByRole('button', { name: 'Atla', exact: true }).click()
    await page.waitForFunction(() => Number(document.documentElement.dataset.cityReady) > 0)
    await until('initial city saved', async () => await savedCity(page) === CITY)
    await screenshot('01-offline-city')
    record('Fresh install boots offline and saves a newly named city')

    const closed = page.waitForEvent('close')
    shell('am', 'force-stop', APP)
    await closed
    page = await start(device)
    watch(page)
    await page.getByRole('button', { name: 'Devam et', exact: true }).click()
    await page.getByRole('button', { name: new RegExp('^Şehir: ' + CITY) }).waitFor()
    assert.equal(await savedCity(page), CITY)
    record('City persists after process stop and restart')

    await settings(page)
    const exportButton = page.getByRole('button', { name: /^Yedeği dışarı aktar/ })
    await exportButton.click()
    await until('Android create-document picker', pickerIsOpen)
    shell('input', 'keyevent', 'KEYCODE_BACK')
    await until('picker closes after cancel', () => !pickerIsOpen())
    assert.equal(findBackup(), undefined)
    assert.equal(await savedCity(page), CITY)
    record('Cancelling the Android document picker keeps the current save')

    await exportButton.click()
    await until('Android create-document picker', pickerIsOpen)
    await screenshot('02-android-document-picker')
    await until('enabled Save action in Android picker', tapSave)
    await until('picker closes after save', () => !pickerIsOpen())
    const backupPath = await until('backup file on shared storage', findBackup)
    const raw = adb('exec-out', 'cat', backupPath)
    const backup = JSON.parse(raw.toString())
    assert.equal(backup.cities.find(city => city.id === backup.activeCityId)?.name, CITY)
    assert.equal(backup.profile?.ruler, RULER)
    record('Actual Android document picker writes a valid game JSON')

    await page.getByRole('button', { name: 'Yeni oyun başlat', exact: true }).click()
    await page.getByRole('button', { name: 'Evet, şehrimi sıfırla', exact: true }).click()
    await until('test reset saved', async () => (await savedCity(page)) !== CITY)
    await page.locator('.royal-save-page input[type="file"]').setInputFiles({
      name: 'payitaht-ci-backup.json', mimeType: 'application/json', buffer: raw,
    })
    await until('exported city restored', async () => await savedCity(page) === CITY)
    await page.getByRole('button', { name: new RegExp('^Şehir: ' + CITY) }).waitFor()
    await screenshot('03-restored-city')
    record('Exported JSON restores the game through the WebView import control')
    assert.deepEqual(errors, [])
  } catch (error) {
    await screenshot('failure').catch(() => {})
    throw error
  } finally {
    await device.close().catch(() => {})
  }
}
main().catch(error => {
  report.error = error.message
  console.error(error)
  process.exitCode = 1
}).finally(() => fs.writeFile(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2) + '\n'))
