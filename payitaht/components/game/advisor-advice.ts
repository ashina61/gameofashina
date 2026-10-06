import { rivalById } from '@/lib/game/rivals'
import type { Empire } from '@/lib/game/empire'

export function diploAdvice(e: Empire) {
  const unread = (e.world?.messages ?? []).filter(m => !m.read).length
  const offers = e.world?.proposals ?? []
  const tribute = offers.find(p => p.kind === 'harac')
  if (tribute) return `${rivalById(tribute.rivalId)?.ruler ?? 'Bir hükümdar'} haraç istiyor efendim. Ödersek bir gün rahat ederiz; reddedersek ordusu gelebilir. Teklifler sekmesine bakalım.`
  if (offers.length) return `${offers.length} teklif kapıda bekliyor efendim${unread ? `, ${unread} de okunmamış mektup var` : ''}. Süreleri dolmadan cevap verelim.`
  if (unread) return `${unread} yeni mektup var efendim. Hükümdarların ne dediğine bakalım.`
  const war = e.world?.wars?.[0]
  if (war) return `${rivalById(war.a)?.city} ile ${rivalById(war.b)?.city} savaşta. Savaşan hükümdarların ordusu cephede; pazarları ise mala aç. Haberler sekmesinden izleyelim.`
  if (!e.world?.alliance && !e.world?.pact) return 'Bir ittifaka katılmak baskınlarda yardım getirir. Hükümdarlarla ilişkimizi güçlendirelim.'
  return 'Diplomasi yolunda. Pazardaki tekliflere göz atmayı unutmayın.'
}
