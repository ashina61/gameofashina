import type { Metadata } from 'next'
import { FoundationView } from '@/components/foundation/foundation-view'

export const metadata: Metadata = { title: 'Yeni Şehir · Payitaht', description: 'Yeni şehir zemini, yollar ve üç yapının ortak yerleşimi.' }
export default function CityFoundationPage() { return <FoundationView /> }
