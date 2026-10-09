const CACHE = 'payitaht-shell-v93'
const BASE = new URL(self.registration.scope).pathname.replace(/\/$/, '')
const p = path => `${BASE}${path.startsWith('/') ? path : `/${path}`}`
const ASSETS = [
  p('/images/game/ui/defense/harita_arsivi.webp'),
  p('/images/game/ui/defense/surlar.webp'),
  p('/images/game/ui/defense/siginak.webp'),
  p('/images/game/ui/maritime/harbor.webp'),
  p('/images/game/ui/maritime/shipyard.webp'),
  p('/images/game/ui/exchange/market.webp'),
  p('/images/game/ui/commerce/bazaar.webp'),
  p('/images/game/ui/commerce/caravanserai.webp'),
  p('/images/game/ui/commerce/shopkeeper.webp'),

  p('/images/game/ui/cost/marangoz.webp'),
  p('/images/game/ui/cost/mimar.webp'),
  p('/images/game/ui/cost/mahzen.webp'),
  p('/images/game/ui/cost/gozlukcu.webp'),
  p('/images/game/ui/cost/barutane.webp'),

  p('/images/game/ui/production/lumber.webp'),
  p('/images/game/ui/production/lumberjack.webp'),
  p('/images/game/ui/production/ormanci.webp'),
  p('/images/game/ui/production/bagci.webp'),
  p('/images/game/ui/production/tasci.webp'),
  p('/images/game/ui/production/camci.webp'),
  p('/images/game/ui/production/simyahane.webp'),
  p('/images/game/ui/storage/warehouse.webp'),
  p('/images/game/ui/storage/depot.webp'),
  p('/images/game/ui/storage/storage-icon.webp'),
  p('/images/game/ui/coffeehouse/terrace.webp'),
  p('/images/game/ui/bathhouse/court.webp'),
  p('/images/game/ui/housing/neighborhood.webp'),
  p('/images/game/ui/people/citizen-figure.webp'),
  p('/images/game/ui/people/scholar-figure.webp'),
  p('/images/game/ui/people/citizens.webp'),
  p('/images/game/ui/people/scholar.webp'),
  p('/images/game/icons/res-ilim-v2.webp'),
  p('/images/game/icons/res-sure.webp'),
  p('/images/game/ui/barracks/army-medallion.webp'),
  p('/images/game/ui/medrese/library.webp'),
  p('/images/game/ui/medrese/scholar.webp'),
  p('/images/game/ui/medrese/student.webp'),
  p('/images/game/ui/barracks/minus-button.webp'),
  p('/images/game/ui/barracks/plus-button.webp'),
  p('/images/game/ui/barracks/slider-thumb.webp'),
  p('/images/game/ui/barracks/max-frame.webp'),
  p('/images/game/ui/barracks/development-icon.webp'),
  p('/images/game/ui/barracks/slider-wood.webp'),
  p('/images/game/ui/barracks/slider-gold.webp'),
  p('/images/game/ui/barracks/heading-ornament.webp'),
  p('/images/game/ui/barracks/portrait-topcu.webp'),
  p('/images/game/ui/barracks/portrait-mizrakci.webp'),
  p('/images/game/ui/barracks/portrait-azap.webp'),
  p('/images/game/ui/barracks/portrait-sapanci.webp'),
  p('/images/game/ui/barracks/portrait-tufekci.webp'),
  p('/images/game/ui/barracks/portrait-kocbasi.webp'),
  p('/images/game/ui/barracks/portrait-mancinik.webp'),
  p('/images/game/ui/barracks/portrait-asci.webp'),
  p('/images/game/ui/barracks/portrait-hekim.webp'),
  p('/images/game/ui/barracks/portrait-deli.webp'),
  p('/images/game/ui/barracks/portrait-humbaraci.webp'),
  p('/images/game/ui/barracks/portrait-hezarfen.webp'),
  p('/images/game/ui/barracks/portrait-lagari.webp'),
  p('/images/game/ui/barracks/paper.webp'),
  p('/images/game/ui/barracks/unit-frame.webp'),
  p('/images/game/ui/barracks/portrait-yeniceri.webp'),
  p('/images/game/ui/barracks/portrait-okcu.webp'),
  p('/images/game/ui/barracks/portrait-sipahi.webp'),
  p('/images/game/ui/barracks/recruit-button.webp'),
  p('/images/game/ui/barracks/courtyard.webp'),
  p('/images/game/ui/barracks/red-silk.webp'),
  p('/fonts/tinos-latin-700-normal.woff2'),
  p('/fonts/tinos-latin-ext-700-normal.woff2'),
  p('/images/game/ui/profile-v2/header.webp'),
  p('/images/game/ui/profile-v2/scene.webp'),
  p('/images/game/ui/profile-v2/summary.webp'),
  p('/images/game/ui/profile-v2/edit.webp'),
  p('/images/game/ui/profile-v2/tabs.webp'),
  p('/images/game/ui/profile-v2/title.webp'),
  p('/images/game/ui/profile-v2/ledger.webp'),
  p('/images/game/ui/profile-v2/honours.webp'),
  p('/images/game/ui/profile-v2/footer.webp'),

  p('/images/game/ui/divan/civic-square.webp'),
  p('/images/game/ui/divan/envoy-scene.webp'),
  p('/images/game/ui/divan/vizier-scene.webp'),
  p('/images/game/ui/approved-court/cloth-mask.webp'),
  p('/images/game/ui/approved-court/page-frame.webp'),
  p('/images/game/ui/approved-court/header-frame.webp'),
  p('/images/game/ui/approved-court/gold-button-frame.webp'),
  p('/images/game/ui/approved-court/tab-frame.webp'),
  p('/images/game/ui/approved-court/alim.webp'),
  p('/images/game/ui/approved-court/back.webp'),
  p('/images/game/ui/approved-court/bell.webp'),
  p('/images/game/ui/approved-court/city.webp'),
  p('/images/game/ui/approved-court/close.webp'),
  p('/images/game/ui/approved-court/construction.webp'),
  p('/images/game/ui/approved-court/crown.webp'),
  p('/images/game/ui/approved-court/desk.webp'),
  p('/images/game/ui/approved-court/drum.webp'),
  p('/images/game/ui/approved-court/hourglass.webp'),
  p('/images/game/ui/approved-court/ilk-zafer.webp'),
  p('/images/game/ui/approved-court/kurucu.webp'),
  p('/images/game/ui/approved-court/laurel.webp'),
  p('/images/game/ui/approved-court/military.webp'),
  p('/images/game/ui/approved-court/motion.webp'),
  p('/images/game/ui/approved-court/nav-alliance.webp'),
  p('/images/game/ui/approved-court/nav-city.webp'),
  p('/images/game/ui/approved-court/nav-island.webp'),
  p('/images/game/ui/approved-court/nav-map.webp'),
  p('/images/game/ui/approved-court/nav-quests.webp'),
  p('/images/game/ui/approved-court/olive.webp'),
  p('/images/game/ui/approved-court/oud.webp'),
  p('/images/game/ui/approved-court/paper.webp'),
  p('/images/game/ui/approved-court/profile-scene.webp'),
  p('/images/game/ui/approved-court/science.webp'),
  p('/images/game/ui/approved-court/seal.webp'),
  p('/images/game/ui/approved-court/sky.webp'),
  p('/images/game/ui/approved-court/standard.webp'),
  p('/images/game/ui/approved-court/tempo.webp'),
  p('/images/game/ui/approved-court/trade.webp'),
  p('/images/game/ui/approved-court/vibration.webp'),
  p('/images/game/ui/approved-court/wood.webp'),

  p('/images/game/terrain/town-square.webp'),
  p('/images/game/terrain/island-harbour.webp'),
  p('/images/game/terrain/treasury-room.webp'),
  p('/images/game/terrain/royal-court.webp'),
  p('/images/game/terrain/admin-desk.webp'),
  p('/images/game/terrain/archive-hall.webp'),
  p('/images/game/terrain/mandates-office.webp'),
  p('/images/game/quests/capital.webp'),
  p('/images/game/quests/builders.webp'),
  p('/images/game/quests/scholar.webp'),
  p('/images/game/quests/army.webp'),
  p('/images/game/quests/harbour.webp'),
  p('/images/game/quests/treasury.webp'),
  ...['wood', 'crest', 'card', 'nav', 'city', 'army', 'research', 'diplo'].map(id => p(`/images/game/ui/reference-bars/${id}.webp`)),
  p('/images/game/terrain/barracks-courtyard.webp'),
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