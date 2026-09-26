import type { Metadata, Viewport } from 'next'
import { Cormorant_Garamond, Manrope } from 'next/font/google'
import './globals.css'
import './imperial-ui.css'

const serif = Cormorant_Garamond({ subsets: ['latin', 'latin-ext'], weight: ['400', '500', '600', '700'], variable: '--font-heading', display: 'swap' })
const sans = Manrope({ subsets: ['latin', 'latin-ext'], variable: '--font-body', display: 'swap' })

export const metadata: Metadata = {
  title: 'Payitaht Adaları — Kendi hikâyeni inşa et',
  description: 'Osmanlı esintili özgün ada stratejisi. Sahilhisar şehrini kur, kaynaklarını yönet ve ilimle geliş. Mobil, tek oyunculu ve cihazda kayıtlı prototip.',
  applicationName: 'Payitaht Adaları',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Payitaht' },
  icons: { icon: '/icon-192.png', apple: '/icon-192.png' },
}
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#102b29', colorScheme: 'dark' }
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="tr" className={`${sans.variable} ${serif.variable}`}><body>{children}</body></html>
}
