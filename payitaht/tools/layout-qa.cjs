/*
 * DÜZEN DENETİMİ (V2 Faz 0.1–0.3) — telefon ekranında bütün sayfaları ve
 * bütün bina sayfalarını açar, dört kuralı ölçer:
 *
 *   taşma     öğe ekranın dışına çıkıyor (yatay kaydırılan kutular hariç)
 *   kesik     metin kutusuna sığmıyor ve "…" ile bitmiyor
 *   küçük     dokunulan öğenin parmak alanı 44×44 px'ten küçük
 *   minik     11 px'ten küçük yazı ([data-tiny] ile işaretli rakamlar hariç)
 *   çakışma   bir yazı, yanındaki düğmenin altında/üstünde kalıyor
 *   isimsiz   düğme ya da alanın ekran okuyucuya okunacak adı yok (V2 Faz 8.3)
 *
 * İkinci tur aynı sayfaları %130 yazı boyuyla dener (V2 Faz 8.1): Android'in
 * sistem yazı boyutu gibi her öğenin yazısı büyütülür; minik kuralı bu turda
 * sayılmaz (yazı zaten büyük).
 *
 * Herhangi bir ihlal varsa çıkış kodu 1. Rapor: visual-review/layout-report.json
 *
 *   node tools/layout-qa.cjs                  # 4173'te sunulan dışa aktarımı dener
 *   LAYOUT_QA_URL=http://... node tools/layout-qa.cjs
 */
const fs = require('node:fs/promises')
const path = require('node:path')
const { chromium } = require('playwright')

const ORIGIN = process.env.LAYOUT_QA_URL || 'http://127.0.0.1:4173/gameofashina/'
const VIEWPORTS = [{ width: 360, height: 740 }, { width: 360, height: 740, zoom: 1.3 }]
const PANELS = ['economy', 'advisor-city', 'reports', 'research', 'diplomacy', 'build', 'army', 'people', 'cities', 'map', 'overview',
  'alliance', 'objectives', 'journal', 'profile', 'settings', 'changelog', 'island', 'forest']

/** Sayfada çalışır: görünür öğeleri dört kurala göre ölçer. */
function scanPage() {
  const W = innerWidth, H = innerHeight, MIN = 44, R = MIN / 2 - 1
  const found = { taşma: {}, kesik: {}, küçük: {}, minik: {}, çakışma: {}, isimsiz: {} }
  const name = el => el.tagName.toLowerCase() + [...el.classList].slice(0, 2).map(c => '.' + c).join('')
  const where = el => { const p = []; for (let e = el, i = 0; e && e !== document.body && i < 3; e = e.parentElement, i++) p.unshift(name(e)); return p.join(' > ') }
  const text = el => (el.innerText || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 40)
  const note = (kind, el, extra) => { const k = where(el); (found[kind][k] ??= { örnek: text(el), adet: 0, ...extra }).adet++ }
  const skip = el => !!el.closest('[aria-hidden="true"], .sr-only, [data-qa-skip], canvas')
  const shown = el => el.checkVisibility({ opacityProperty: true, visibilityProperty: true, contentVisibilityAuto: true })
  // Yatay kaydırılan şeritler (sekme sırası, tablo sarmalayıcı, harita) muaf.
  // Sayfanın DİKEY kaydırıcısı muaf değil: tarayıcı onun overflow-x'ini de
  // "auto" hesaplar; saymak sayfadaki her taşmayı gizlerdi.
  const PAGE_SCROLLERS = '.bp-scroll, .bp, .ika-page, [role="dialog"], main, body, html'
  const inHScroll = el => {
    for (let e = el.parentElement; e; e = e.parentElement) {
      if (e.matches('[data-hscroll], .map-viewport-frame')) return true
      const o = getComputedStyle(e).overflowX
      if ((o === 'auto' || o === 'scroll') && !e.matches(PAGE_SCROLLERS)) return true
    }
    return false
  }
  const ownText = el => [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())
  // Tam ekran sayfa açıkken altında kalan HUD, görev şeridi ve ada ölçülmez.
  const pageOpen = [...document.querySelectorAll('.bp')].some(shown)
  const under = '.ika-top, .quest-chip, .threat-banner, .island-view, .map-top-tools'
  const roots = [...document.querySelectorAll('.bp, .ika-top, .ika-nav, .quest-chip, .threat-banner, .island-view, .map-top-tools, .title-screen, [role="dialog"]')]
    .filter(r => !(pageOpen && r.matches(under) && !r.closest('.bp')))
  const seen = new Set()
  const controls = []
  for (const root of roots) for (const el of [root, ...root.querySelectorAll('*')]) {
    if (seen.has(el)) continue
    seen.add(el)
    if (skip(el) || !shown(el)) continue
    const r = el.getBoundingClientRect()
    if (!r.width || !r.height) continue
    const cs = getComputedStyle(el)
    if ((r.right > W + 1 || r.left < -1) && !inHScroll(el)) note('taşma', el, { sol: Math.round(r.left), sağ: Math.round(r.right) })
    if (ownText(el)) {
      if ((cs.overflowX === 'hidden' || cs.overflowX === 'clip') && el.scrollWidth > el.clientWidth + 1 && cs.textOverflow !== 'ellipsis' && cs.webkitLineClamp === 'none')
        note('kesik', el)
      // SVG yazısı ekranda ölçeklenir: gerçek boy = font × ekran dönüşümü.
      const px = parseFloat(cs.fontSize) * (el instanceof SVGGraphicsElement ? Math.abs(el.getScreenCTM()?.a ?? 1) : 1)
      if (px < 11 && !el.closest('[data-tiny]')) note('minik', el, { px: Math.round(px * 10) / 10 })
    }
    if (el.matches('button, a[href], [role="button"], [role="tab"], [role="radio"], [role="switch"], summary, select, input:not([type="hidden"])') && !el.disabled) controls.push(el)
  }
  // İsimsiz: ekran okuyucunun okuyacağı ad yok (yazı, aria-label, title, label, resim alt).
  const accName = el => {
    const by = el.getAttribute('aria-labelledby')
    if (by) return by.split(/\s+/).map(id => document.getElementById(id)?.textContent ?? '').join(' ').trim()
    const label = el.id ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`) : el.closest('label')
    return (el.getAttribute('aria-label') || el.textContent || el.getAttribute('title') || label?.textContent ||
      [...el.querySelectorAll('img[alt]')].map(i => i.alt).join(' ') || el.getAttribute('placeholder') || '').trim()
  }
  for (const el of controls) if (!accName(el)) note('isimsiz', el)
  // Çakışma: düğmenin yakın akrabalarındaki (iki üst kap) yazılardan biri
  // düğmenin kutusuyla 4 px'ten fazla örtüşüyorsa.
  // Sabit katmanlar (alt menü, sayfa) arası örtüşme sayılmaz: içerik menünün
  // arkasından kayar. Haritalardaki işaret etiketleri de muaf.
  const layer = x => { for (let e = x; e; e = e.parentElement) { const p = getComputedStyle(e).position; if (p === 'fixed' || p === 'sticky') return e } return null }
  // Görünen kutu: öğenin kutusu, taşanı kırpan bütün üst kaplarla kesişir
  // (kaydırma alanında görünmeyen kısım sayılmaz).
  const visibleRect = el => {
    let { left, top, right, bottom } = el.getBoundingClientRect()
    for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) {
      const cs = getComputedStyle(e)
      if (cs.overflowX === 'visible' && cs.overflowY === 'visible') continue
      const r = e.getBoundingClientRect()
      left = Math.max(left, r.left); top = Math.max(top, r.top); right = Math.min(right, r.right); bottom = Math.min(bottom, r.bottom)
    }
    return { left, top, right, bottom, width: Math.max(0, right - left), height: Math.max(0, bottom - top) }
  }
  for (const el of controls) {
    const a = visibleRect(el)
    const scope = el.parentElement?.parentElement
    if (!scope || !a.width || !a.height || el.closest('.map-viewport-frame, [data-hscroll]')) continue
    const own = layer(el)
    for (const t of scope.querySelectorAll('*')) {
      if (t === el || el.contains(t) || t.contains(el) || !ownText(t) || skip(t) || !shown(t) || layer(t) !== own || t.closest('[data-tiny]')) continue
      const b = visibleRect(t)
      if (!b.width || !b.height) continue
      const w = Math.min(a.right, b.right) - Math.max(a.left, b.left), h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
      if (w > 4 && h > 4) note('çakışma', t, { düğme: text(el) })
    }
  }
  // Parmak alanı: öğeyi ortaya kaydır, merkezin ±21 px dört yanına dokun;
  // vuruş öğenin kendisine (ya da içine) düşmüyorsa alan küçüktür. ::before
  // ile büyütülmüş alanlar da böylece doğru sayılır.
  for (const el of controls) {
    let r = el.getBoundingClientRect()
    if (r.width >= MIN && r.height >= MIN) continue
    if (el.matches('input[type="range"]') && r.width >= MIN) continue // kaydırıcı: başparmak yüksekliği ayrı ölçülmez
    el.scrollIntoView({ block: 'center', inline: 'center' })
    r = el.getBoundingClientRect()
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2
    const label = el.id ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`) : null
    const hits = [[cx - R, cy], [cx + R, cy], [cx, cy - R], [cx, cy + R]].filter(([x, y]) => x >= 0 && y >= 0 && x < W && y < H)
    const miss = hits.filter(([x, y]) => { const h = document.elementFromPoint(x, y); return !h || !(el.contains(h) || (label && label.contains(h)) || h.closest('label')?.contains(el)) })
    if (miss.length) note('küçük', el, { gen: Math.round(r.width), yük: Math.round(r.height) })
  }
  for (const root of roots) if (root.scrollTo) root.scrollTo(0, 0)
  for (const s of document.querySelectorAll('.bp-scroll')) s.scrollTo(0, 0)
  return found
}

async function main() {
  const out = path.resolve('visual-review')
  await fs.mkdir(out, { recursive: true })
  const fixture = JSON.parse(await fs.readFile(path.join(__dirname, 'fixtures', 'late-game.json'), 'utf8'))
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  const report = { sayfalar: {}, toplam: { taşma: 0, kesik: 0, küçük: 0, minik: 0, çakışma: 0, isimsiz: 0 }, hatalar: [] }
  try {
    for (const vp of VIEWPORTS) {
      const label = `${vp.width}x${vp.height}${vp.zoom ? `@${Math.round(vp.zoom * 100)}%` : ''}`
      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
      await context.addInitScript(raw => {
        try {
          const e = JSON.parse(raw)
          const now = Date.now()
          for (const c of e.cities) c.game.updatedAt = now // çevrimdışı ilerleme ve "yokluğunda" kartı olmasın
          localStorage.setItem('payitaht-adalari-v1', JSON.stringify(e))
          localStorage.setItem('payitaht-rehber', 'goruldu')
          localStorage.setItem('payitaht-qa', '1')
        } catch { /* yok */ }
      }, JSON.stringify(fixture))
      const page = await context.newPage()
      page.setDefaultTimeout(20_000)
      page.on('pageerror', e => report.hatalar.push(`${label}: ${e.message}`))
      const visit = async (key, open) => {
        await page.evaluate(open)
        await page.waitForTimeout(150)
        // Sayfa giriş animasyonu (alttan kayma) bitmeden ölçme: sonlu bütün
        // animasyonlar dursun (sonsuz döngüler, ör. bayrak, sayılmaz).
        await page.waitForFunction(() => document.getAnimations().every(a => a.playState !== 'running' || a.effect?.getComputedTiming().iterations === Infinity), null, { timeout: 5000 }).catch(() => {})
        await page.waitForTimeout(100)
        if (vp.zoom) {
          // Sistem yazı boyutu: her öğenin hesaplanan yazısı büyür (önce hepsi okunur, sonra yazılır).
          await page.evaluate(z => {
            const els = [...document.querySelectorAll('body *')].filter(el => !el.dataset.qaZoom && !(el instanceof SVGElement))
            const sizes = els.map(el => parseFloat(getComputedStyle(el).fontSize))
            els.forEach((el, i) => { el.style.fontSize = `${sizes[i] * z}px`; el.dataset.qaZoom = '1' })
          }, vp.zoom)
          await page.waitForTimeout(120)
        }
        const found = await page.evaluate(scanPage)
        if (vp.zoom) found.minik = {}
        // Bina sayfası (V2 2.1): Yükselt doku kaydırmadan görünür ve düğmenin
        // üstüne başka bir şey (ör. alt menü madalyonu) binmez.
        if (key.startsWith('bina:')) {
          const dock = await page.evaluate(() => {
            const d = document.querySelector('.bp-dock')
            if (!d) return 'Yükselt doku yok'
            const btn = d.querySelector('button') || d
            const r = btn.getBoundingClientRect()
            if (r.top < 0 || r.bottom > innerHeight) return `Yükselt ekranda değil (${Math.round(r.top)}..${Math.round(r.bottom)})`
            const mid = r.top + r.height / 2, low = r.bottom - 3, cx = r.left + r.width / 2
            for (const [x, y] of [[cx, mid], [r.left + 12, mid], [r.right - 12, mid], [cx, low], [cx - 30, low], [cx + 30, low]]) {
              const h = document.elementFromPoint(x, y)
              if (h && !btn.contains(h)) return `Yükselt'in üstünde başka öğe: ${h.tagName.toLowerCase()}.${[...h.classList].join('.')}`
            }
            return null
          })
          if (dock) (found.çakışma[`.bp-dock :: ${dock}`] ??= { örnek: dock, adet: 0 }).adet++
        }
        const n = Object.fromEntries(Object.entries(found).map(([k, v]) => [k, Object.values(v).reduce((s, x) => s + x.adet, 0)]))
        for (const k of Object.keys(n)) report.toplam[k] += n[k]
        if (Object.values(n).some(Boolean)) report.sayfalar[`${label} ${key}`] = found
        console.log(`${label} ${key.padEnd(24)} taşma ${n.taşma} · kesik ${n.kesik} · küçük ${n.küçük} · minik ${n.minik} · çakışma ${n.çakışma} · isimsiz ${n.isimsiz}`)
      }
      await page.goto(ORIGIN, { waitUntil: 'domcontentloaded', timeout: 60_000 })
      await page.getByRole('button', { name: /Devam et/ }).waitFor()
      await visit('başlık', () => {})
      await page.getByRole('button', { name: 'Yeni oyun' }).click()
      await visit('başlık:yeni-oyun', () => {})
      await page.getByRole('button', { name: 'Vazgeç' }).click()
      await page.getByRole('button', { name: /Hikâyeye başla|Devam et/ }).click()
      await page.waitForFunction(() => !!window.__payitahtQa, null, { timeout: 60_000 })
      await page.getByRole('button', { name: 'Şehre dön' }).click({ timeout: 1500 }).catch(() => {})
      const ids = await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('payitaht-adalari-v1')).cities[0].game.buildings))
      await visit('şehir', () => window.__payitahtQa.close())
      // ÖZ-DENETİM: kurallar gerçekten yakalıyor mu? Bilerek bozuk üç öğe ekle.
      await page.evaluate(() => {
        window.__payitahtQa.panel('economy')
      })
      await page.waitForTimeout(350)
      const self = await page.evaluate(scan => {
        const host = document.querySelector('.bp .bp-scroll') || document.querySelector('.bp')
        const bad = document.createElement('div')
        bad.innerHTML = '<div style="width:520px;height:10px">geniş</div><button style="width:20px;height:20px">x</button><span style="font-size:9px">minik</span>' +
          '<div><div style="position:relative;height:50px"><button style="width:80px;height:44px">düğme</button><span style="position:absolute;left:10px;top:12px">üstte yazı</span></div></div><button style="width:48px;height:48px"></button>'
        host.prepend(bad)
        const found = (0, eval)(scan)()
        bad.remove()
        return Object.fromEntries(Object.entries(found).map(([k, v]) => [k, Object.keys(v).length]))
      }, `(${scanPage})`)
      if (!self.taşma || !self.küçük || !self.minik || !self.çakışma || !self.isimsiz) throw new Error(`Öz-denetim başarısız, kurallar bozuk öğeyi görmedi: ${JSON.stringify(self)}`)
      console.log(`${label} öz-denetim              yakalandı: ${JSON.stringify(self)}`)
      for (const p of PANELS) await visit(`sayfa:${p}`, new Function(`window.__payitahtQa.panel(${JSON.stringify(p)})`))
      await visit('ada', () => window.__payitahtQa.island())
      for (const id of ids) await visit(`bina:${id}`, new Function(`window.__payitahtQa.building(${JSON.stringify(id)})`))
      await context.close()
    }
  } finally {
    await browser.close()
  }
  await fs.writeFile(path.join(out, 'layout-report.json'), JSON.stringify(report, null, 2))
  const t = report.toplam
  console.log(`\nTOPLAM taşma ${t.taşma} · kesik ${t.kesik} · küçük ${t.küçük} · minik ${t.minik} · çakışma ${t.çakışma} · isimsiz ${t.isimsiz} · sayfa hatası ${report.hatalar.length}`)
  if (report.hatalar.length || Object.values(t).some(Boolean)) {
    for (const [p, f] of Object.entries(report.sayfalar)) for (const [kind, items] of Object.entries(f)) for (const [where, x] of Object.entries(items))
      console.log(`  ${kind.padEnd(6)} ${p} :: ${where} "${x.örnek}" ×${x.adet}${x.gen ? ` (${x.gen}×${x.yük})` : ''}${x.px ? ` (${x.px}px)` : ''}`)
    for (const e of report.hatalar) console.log('  HATA', e)
    process.exitCode = 1
  }
}

main().catch(e => { console.error(e); process.exitCode = 1 })
