'use client'

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
export { diploAdvice } from './advisor-advice'

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
