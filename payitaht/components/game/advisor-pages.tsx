'use client'
import { rivalById } from '@/lib/game/rivals'

/**
 * DANIŞMAN SAYFALARI — Ikariam'da danışmana basınca açılan özet ekranlar.
 * Vezir şehirleri ve olayları, Serasker orduyu ve raporları anlatır. Her
 * danışman duruma göre bir öğüt verir.
 */
import { Swords } from './ui-art'
export { CityAdvisor } from './royal-vizier'
import { GameButton } from './game-button'
import {
  researchReason, RESEARCH_IDS,
  timeLeft, type Game,
} from '@/lib/game/engine'
import { type Empire } from '@/lib/game/empire'
import { AdvisorSpeech } from './ika-hud'
import { Box } from './building-page'
import { DefenseSummary } from './ikariam-panels'
import { MissionList, type Run } from './world-panels'
import { ReportsPanel } from './island-view'


function armyAdvice(e: Empire, g: Game) {
  const threat = (e.threats ?? []).find(t => t.cityId === e.activeCityId)
  if (threat) return `Düşman yaklaşıyor! ${timeLeft({ id: 'divan', kind: 'build', start: 0, end: threat.arriveAt }, g.updatedAt)} sonra kapıda. Askerleri şehirde tutun, surları güçlendirin.`
  if (!g.buildings.kisla) return 'Ordumuz yok. Bir Kışla kurmadan şehir savunmasız kalır.'
  if (g.buildings.divan >= 4 && g.buildings.surlar < 2) return 'Korsanlar yakında şehre göz dikecek. Surları yükseltmenin vakti.'
  return 'Ordu hazır. Casus gönderip komşuları tartabilir, zayıf olanı yağmalayabiliriz.'
}
export function researchAdvice(g: Game) {
  if (!g.buildings.medrese) return 'Bir Medrese kurulmadan ilim ilerlemez efendim.'
  if (g.study) return 'Âlimler çalışıyor. Bitince bir sonrakini seçelim.'
  if (RESEARCH_IDS.some(id => !researchReason(g, id))) return 'Âlimler boşta! Yeni bir araştırma seçmenin vakti geldi.'
  return 'Yeni araştırma için ilim birikmesini bekliyoruz. Âlim sayısını artırmak hızlandırır.'
}
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

export function ArmyAdvisor({ empire, game, run, onArmy }: { empire: Empire; game: Game; run: Run; onArmy: () => void }) {
  return <>
    <AdvisorSpeech id="army">{armyAdvice(empire, game)}</AdvisorSpeech>
    <Box title="Kışla ve tersane">
      <p className="bp-note">Asker ve gemi eğitimi, birlik aktarma.</p>
      <GameButton size="sm" onClick={onArmy}><Swords data-icon="inline-start" />Orduya git</GameButton>
    </Box>
    <DefenseSummary empire={empire} />
    <MissionList empire={empire} now={game.updatedAt} run={run} />
    <Box title="Savaş ve casus raporları"><ReportsPanel empire={empire} run={run} /></Box>
  </>
}
