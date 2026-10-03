/*
 * ÖLÇÜM ARAÇLARI İÇİN ORTAK YARDIMCI (V2 Faz 7.6).
 *
 * tools/*.cjs betikleri aynı birkaç adımı tekrar ediyordu: sunulan dışa
 * aktarımın adresi, ilk açılış rehberini atlama, kayıt tohumlama ve
 * başlık ekranından oyuna girme. Hepsi burada; yeni bir QA betiği buradan alır.
 */
const SAVE_KEY = 'payitaht-adalari-v1'
const GUIDE_KEY = 'payitaht-rehber'
/** Başlık ekranında oyuna giren düğme (yeni oyunda "Hikâyeye başla"). */
const START_BUTTON = /Hikâyeye başla|Devam et/

/** Denenecek adres: önce betiğe özel değişken, sonra QA_URL, sonra yerel sunucu. */
function qaOrigin(envName, port = 4173) {
  return (envName && process.env[envName]) || process.env.QA_URL || `http://127.0.0.1:${port}/gameofashina/`
}

/** Sayfa ya da bağlam açılırken ilk on dakika rehberini "görüldü" sayar. */
async function skipGuide(target) {
  await target.addInitScript(key => { try { localStorage.setItem(key, 'goruldu') } catch { /* depolama kapalı */ } }, GUIDE_KEY)
}

/** Kaydı her yüklemede yerleştirir (ham JSON ya da nesne). */
async function seedSave(target, empire) {
  const raw = typeof empire === 'string' ? empire : JSON.stringify(empire)
  await target.addInitScript(([key, value]) => localStorage.setItem(key, value), [SAVE_KEY, raw])
}

/** Başlık ekranından oyuna gir. */
async function enterGame(page, options) {
  await page.getByRole('button', { name: START_BUTTON }).click(options)
}

module.exports = { SAVE_KEY, GUIDE_KEY, START_BUTTON, qaOrigin, skipGuide, seedSave, enterGame }
