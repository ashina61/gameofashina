import type { Metadata, Viewport } from 'next'
import { Cormorant_Garamond, Manrope } from 'next/font/google'
import './globals.css'
import { asset } from '@/lib/asset'

const serif = Cormorant_Garamond({ subsets: ['latin', 'latin-ext'], weight: ['400', '500', '600', '700'], variable: '--font-heading', display: 'swap' })
const sans = Manrope({ subsets: ['latin', 'latin-ext'], variable: '--font-body', display: 'swap' })

export const metadata: Metadata = {
  title: 'Payitaht Adaları — Kendi hikâyeni inşa et',
  description: 'Osmanlı esintili özgün ada stratejisi. Sahilhisar şehrini kur, kaynaklarını yönet ve ilimle geliş. Mobil, tek oyunculu ve cihazda kayıtlı prototip.',
  applicationName: 'Payitaht Adaları',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Payitaht' },
  icons: { icon: asset('/icon-192.png'), apple: asset('/icon-192.png') },
}
/*
 * Android paketinde (NEXT_PUBLIC_NATIVE=1) sayfa ekranın kenarlarına taşmaz:
 * viewport-fit=cover olmayınca Capacitor WebView'ı durum çubuğunun altından
 * ve gezinme çubuğunun üstünden başlatır. Böylece hiçbir WebView sürümünde
 * başlıklar ve bildirimler saatin altına girmez.
 */
const native = process.env.NEXT_PUBLIC_NATIVE === '1'
export const viewport: Viewport = { width: 'device-width', initialScale: 1, ...(native ? {} : { viewportFit: 'cover' as const }), themeColor: '#3a2413', colorScheme: 'light' }
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="tr" className={`${sans.variable} ${serif.variable}`}><body>{children}</body></html>
}
