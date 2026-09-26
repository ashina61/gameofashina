const CACHE = 'payitaht-shell-v8'
const BASE = new URL(self.registration.scope).pathname.replace(/\/$/, '')
const p = path => `${BASE}${path.startsWith('/') ? path : `/${path}`}`
const ASSETS = [
  p('/'),
  p('/manifest.webmanifest'),
  p('/icon-192.png'),
  p('/icon-512.png'),
  ...['divan', 'konut', 'kereste', 'tas', 'ambar', 'medrese'].map(name => p(`/images/game/buildings/${name}-1.webp`)),
]

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith('payitaht-shell-') && key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('message', event => {
  if (event.data?.type !== 'CACHE_ASSETS' || !Array.isArray(event.data.urls)) return
  const nextStatic = p('/_next/static/')
  const gameImages = p('/images/game/')
  const urls = event.data.urls.filter(value => {
    try {
      const url = new URL(value)
      return url.origin === self.location.origin &&
        (url.pathname.startsWith(nextStatic) || url.pathname.startsWith(gameImages))
    } catch {
      return false
    }
  })
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(urls))
      .then(() => event.source?.postMessage('OFFLINE_READY')),
  )
})

self.addEventListener('fetch', event => {
  const request = event.request
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin || request.headers.get('rsc') === '1') return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok && url.pathname === p('/')) {
            const copy = response.clone()
            event.waitUntil(caches.open(CACHE).then(cache => cache.put(p('/'), copy)))
          }
          return response
        })
        .catch(async () => (await caches.match(p('/'))) || new Response(
          'Oyunu ilk kez açmak için internet bağlantısı gerekiyor.',
          { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
        )),
    )
    return
  }

  const nextStatic = p('/_next/static/')
  const gameImages = p('/images/game/')

  // Next statik dosyaları hash'li: cache-first güvenli.
  if (url.pathname.startsWith(nextStatic)) {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone()
          event.waitUntil(caches.open(CACHE).then(cache => cache.put(request, copy)))
        }
        return response
      })),
    )
    return
  }

  // Oyun görselleri hash'li değil. Yeni deploy'da eski görsel kalmasın:
  // network-first, çevrimdışında cache fallback.
  if (url.pathname.startsWith(gameImages) || ASSETS.includes(url.pathname)) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone()
            event.waitUntil(caches.open(CACHE).then(cache => cache.put(request, copy)))
          }
          return response
        })
        .catch(() => caches.match(request)),
    )
  }
})

// Bildirime dokununca oyunu öne getir (açık değilse aç).
self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    .then(list => (list[0] ? list[0].focus() : self.clients.openWindow(p('/')))))
})
