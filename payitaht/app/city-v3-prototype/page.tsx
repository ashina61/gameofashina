import type { Metadata } from 'next'
import { CityV3Prototype } from '@/components/prototype/city-v3-prototype'

export const metadata: Metadata = {
  title: 'Payitaht · City V3 Prototype',
  description: 'Canlı oyundan tamamen bağımsız, oynanabilir geniş şehir prototipi.',
}

/**
 * SADECE prototype/city-v3-rok dalında kullanılır.
 * Canlı oyun route'u (/), save/economy ve deploy akışıyla hiçbir bağlantısı yoktur.
 */
export default function CityV3PrototypePage() {
  return <CityV3Prototype />
}
