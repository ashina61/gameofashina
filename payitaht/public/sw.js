const CACHE = 'payitaht-shell-v6-city-composition'
const ASSETS = ['/', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png', '/images/game/environments/city-empty-v6.webp', '/images/game/environments/city-fortified-v6.webp', '/images/game/construction-v4.webp', ...['divan', 'konut', 'kereste', 'tas', 'ambar', 'medrese', 'saray', 'elcilik', 'hamam', 'carsi', 'kisla', 'liman', 'tersane'].map(name => name === 'liman' || name === 'tersane' ? `/images/game/${name}-v4.webp` : `/images/game/buildings-v5/${name}.webp`)]
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())) })
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('payitaht-shell-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())) })
self.addEventListener('message', event => {
  if (event.data?.type !== 'CACHE_ASSETS' || !Array.isArray(event.data.urls)) return
  const urls = event.data.urls.filter(value => { try { const url = new URL(value); return url.origin === self.location.origin && (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/images/game/')) } catch { return false } })
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(urls)).then(() => event.source?.postMessage('OFFLINE_READY')))
})
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin || request.headers.get('rsc') === '1') return
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => { if (response.ok && url.pathname === '/') { const copy = response.clone(); event.waitUntil(caches.open(CACHE).then(cache => cache.put('/', copy))) } return response }).catch(async () => (await caches.match('/')) || new Response('Oyunu ilk kez açmak için internet bağlantısı gerekiyor.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })))
  } else if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/images/game/') || ASSETS.includes(url.pathname)) {
    event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => { if (response.ok) { const copy = response.clone(); event.waitUntil(caches.open(CACHE).then(cache => cache.put(request, copy))) } return response })))
  }
})
