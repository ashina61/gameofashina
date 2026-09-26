import type { MetadataRoute } from 'next'
import { asset } from '@/lib/asset'

/*
 * Manifest SABITTIR; istege gore degismez.
 *
 * Bunu soylemek statik disa aktarim icin zorunlu: `output: 'export'` bir
 * sunucu calistirmadigi icin her rotanin derleme aninda uretilebildigini
 * bilmek ister, aksi halde derleme durur. Normal dagitimda da davranis
 * degismez - dosya zaten her istekte ayni cikti veriyordu.
 */
export const dynamic = 'force-static'

export default function manifest(): MetadataRoute.Manifest {
  // Pages alt yolunda (/gameofashina) simge ve başlangıç adresi de o yola bağlanır.
  return { id: asset('/'), name: 'Payitaht Adaları', short_name: 'Payitaht', description: 'Kendi hikâyeni inşa et. Osmanlı esintili mobil ada stratejisi.', lang: 'tr', start_url: asset('/'), scope: asset('/'), display: 'standalone', orientation: 'any', background_color: '#102b29', theme_color: '#102b29', icons: [{ src: asset('/icon-192.png'), sizes: '192x192', type: 'image/png', purpose: 'any' }, { src: asset('/icon-512.png'), sizes: '512x512', type: 'image/png', purpose: 'any' }, { src: asset('/icon-512.png'), sizes: '512x512', type: 'image/png', purpose: 'maskable' }] }
}
