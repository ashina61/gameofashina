import type { Metadata } from 'next'
import { MapDebugView } from '@/components/map-debug/map-debug-view'

export const metadata: Metadata = {
  title: 'Slot Debug · Payitaht',
  description: 'Tiled tabanlı şehir slot sisteminin geometrik doğrulama ekranı.',
}

/**
 * /map-debug — Tiled slot sisteminin bağımsız test ekranı. Canlı oyunu (/)
 * etkilemez; yalnızca slot geometrisini ve bina yerleşimini doğrular.
 */
export default function MapDebugPage() {
  return <MapDebugView />
}
