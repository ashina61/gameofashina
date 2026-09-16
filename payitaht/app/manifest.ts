import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return { id: '/', name: 'Payitaht Adaları', short_name: 'Payitaht', description: 'Kendi hikâyeni inşa et. Osmanlı esintili mobil ada stratejisi.', lang: 'tr', start_url: '/', scope: '/', display: 'standalone', orientation: 'any', background_color: '#102b29', theme_color: '#102b29', icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' }, { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }, { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }] }
}
