const CACHE = 'payitaht-shell-v42'
const BASE = new URL(self.registration.scope).pathname.replace(/\/$/, '')
const p = path => `${BASE}${path.startsWith('/') ? path : `/${path}`}`
const ASSETS = [
  p('/images/game/terrain/title-background.webp'),
  p('/images/game/ui/title-plaque.webp'),
  p('/apple-icon.png'),
  ...["research/ekonomi", "research/bilim", "research/askeri", "research/denizcilik", "research/mitoloji", "portraits/gods", "portraits/rivals", "culture/emblems", "culture/wonders", "medals/achievements", "terrain/battle-land", "terrain/battle-sea"].map(id => p(`/images/game/${id}.webp`)),
  ...["sahil", "zeytin", "akcam", "kizil", "akdeniz", "yalcin", "baglik", "atessiz", "mercan", "sakiz", "lodos", "kartal", "poyraz", "fener", "hisarada", "lalezar"].flatMap(id => [p(`/images/game/islands/${id}.webp`), p(`/images/game/islands/map-${id}.webp`)]),
  p('/images/game/terrain/world-sea.webp'),
  ...["walls/segment-1", "walls/segment-2", "walls/segment-3", "walls/tower-1", "walls/tower-2", "walls/tower-3", "walls/gate-1", "walls/gate-2", "walls/gate-3", "buildings/mine-kahve", "buildings/mine-mermer", "buildings/mine-kristal", "buildings/mine-kukurt", "buildings/forest-hero", "buildings/npc-koy", "buildings/npc-korsan", "buildings/npc-kale", "buildings/scaffold", "buildings/site", "buildings/pazar", "buildings/pier", "buildings/surlar-1", "buildings/surlar-2", "buildings/surlar-3", "ships/ship-a", "ships/ship-b", "ships/blockade", "ships/fishing", "siege/checkpoint"].map(id => p(`/images/game/${id}.webp`)),

  ...["yeniceri", "okcu", "sipahi", "topcu", "kadirga", "kalyon", "nakliye", "casus", "mizrakci", "azap", "sapanci", "tufekci", "kocbasi", "mancinik", "asci", "hekim", "ates_gemisi", "mancinik_gemisi", "deli", "humbaraci", "karamursel", "humbara_gemisi", "ikmal_gemisi", "hezarfen", "lagari", "zenberek_gemisi", "dalgic_gemisi", "buharli_koc", "balon_gemisi"].map(id => p(`/images/game/units/${id}.webp`)),
  p('/'),
  p('/manifest.webmanifest'),
  p('/icon-192.png'),
  p('/icon-512.png'),
  ...["olive-tree", "bush", "flower", "rock", "cypress", "cypress-b", "pine", "plane-tree", "poplar", "fruit-tree", "haystack", "well", "woodpile", "beehives", "tulip-bed", "tulip-clump", "cesme", "tezgah", "bostan", "mezarlik", "degirmen", "fig-tree", "orange-tree", "pomegranate-tree", "reed-clump", "dry-grass", "lavender", "terracotta-pots", "grain-sacks", "stone-bench", "coffee-garden"].map(name => p(`/images/game/decor/${name}-sm.webp`)),
  ...["grass", "dirt", "grass-shade", "grass-dry", "plaza-stone", "cobble", "quay-stone", "shore-sand", "water-shallow", "water-deep", "hills"].map(name => p(`/images/game/terrain/${name}.webp`)),
  ...['city', 'army', 'research', 'diplo'].map(id => p(`/images/game/portraits/advisor-${id}.webp`)),
  ...['res-akce', 'res-kereste', 'res-ilim', 'res-kahve', 'res-mermer', 'res-kristal', 'res-kukurt', 'res-nufus', 'res-sefer', 'res-huzur', 'res-yolsuzluk', 'ui-city', 'ui-island', 'ui-map', 'ui-alliance', 'ui-objectives', 'ui-flag', 'ui-harbour', 'ui-divan', 'ui-offer', 'ui-mail', 'ui-week'].map(name => p(`/images/game/icons/${name}.webp`)),
  ...['page-frame', 'walnut-plate', 'button-gold', 'button-parch', 'button-red', 'ribbon-red', 'medal-frame'].map(name => p(`/images/game/ui/${name}.webp`)),
  ...['divan', 'konut', 'kereste', 'ambar', 'medrese'].map(name => p(`/images/game/buildings/${name}-painted-1-sm.webp`)),
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
