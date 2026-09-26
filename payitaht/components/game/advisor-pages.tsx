'use client'

/**
 * DANIŞMAN SAYFALARI — Ikariam'da danışmana basınca açılan özet ekranlar.
 * Vezir şehirleri ve olayları, Serasker orduyu ve raporları anlatır. Her
 * danışman duruma göre bir öğüt verir.
 */
import { ChevronRight, Swords } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  BUILDINGS, activeJob, contentment, fullResources, housing, idleWorkers, maxPopulation, population, rates, researchReason, RESEARCH_IDS,
  timeLeft, type BuildingId, type Game,
} from '@/lib/game/engine'
import { activeCity, type Empire } from '@/lib/game/empire'
import { AdvisorSpeech } from './ika-hud'
import { Box } from './building-page'
import { DefenseSummary } from './ikariam-panels'
import { MissionList, type Run } from './world-panels'
import { ReportsPanel } from './island-view'

const num = (n: number) => Math.floor(n).toLocaleString('tr-TR')

function cityAdvice(g: Game) {
  if (!activeJob(g)) return 'Ustalar boş oturuyor efendim. İnşa menüsünden yeni bir yapıya başlayalım.'
  if (fullResources(g).length) return 'Ambarlar ağzına kadar dolu; üretim boşa gidiyor. Ambarı yükseltelim ya da harcayalım.'
  if (housing(g) > contentment(g)) return 'Halk huzursuz, konaklar boş kalıyor. Hamam, Kahvehane ya da Cami huzuru artırır.'
  if (idleWorkers(g) > 20) return `${idleWorkers(g)} kişi boşta geziyor. Ocaklara ve medreseye işçi verelim.`
  return 'Şehir yolunda efendim. İnşaat sürüyor, halk memnun.'
}
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
  if (unread) return `${unread} yeni mektup var efendim. Hükümdarların ne dediğine bakalım.`
  if (!e.world?.alliance) return 'Bir ittifaka katılmak baskınlarda yardım getirir. Hükümdarlarla ilişkimizi güçlendirelim.'
  return 'Diplomasi yolunda. Pazardaki tekliflere göz atmayı unutmayın.'
}

export function CityAdvisor({ empire, game, onCity, onBuilding, onCities }: {
  empire: Empire; game: Game; onCity: (id: string) => void; onBuilding: (id: BuildingId) => void; onCities: () => void
}) {
  const current = activeCity(empire)
  return <>
    <AdvisorSpeech id="city">{cityAdvice(game)}</AdvisorSpeech>
    <Box title="Şehirlerin">
      <table className="bp-table">
        <thead><tr><th>Şehir</th><th>Nüfus</th><th>İnşaat</th></tr></thead>
        <tbody>{empire.cities.map(c => {
          const job = activeJob(c.game)
          return <tr key={c.id}>
            <td><button type="button" className="ika-link" onClick={() => onCity(c.id)}>{c.name}</button>{c.id === current.id && <small className="bp-here"> · burada</small>}</td>
            <td>{num(population(c.game))}/{num(maxPopulation(c.game))}</td>
            <td>{job ? `${BUILDINGS[job.id as BuildingId].name} ${timeLeft(job, c.game.updatedAt)}` : <span className="ika-warn-text">boş</span>}</td>
          </tr>
        })}</tbody>
      </table>
      <Button size="sm" variant="outline" onClick={onCities}>Şehirler ve harita<ChevronRight data-icon="inline-end" /></Button>
    </Box>
    <Box title="Üretim">
      <table className="bp-table"><tbody>
        {([['Akçe', rates(game).gold], ['Kereste', rates(game).wood], ['Taş', rates(game).stone], ['İlim', rates(game).knowledge]] as const)
          .map(([l, v]) => <tr key={l}><td>{l}</td><td>{v.toFixed(l === 'İlim' ? 1 : 0)} /dk</td></tr>)}
      </tbody></table>
      <Button size="sm" variant="outline" onClick={() => onBuilding('divan')}>Divanhane<ChevronRight data-icon="inline-end" /></Button>
    </Box>
    <Box title="Olaylar">
      <ul className="ika-events">{game.log.slice(0, 20).map((l, i) => <li key={i}>
        <time>{new Date(l.time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</time><span>{l.text}</span></li>)}</ul>
    </Box>
  </>
}

export function ArmyAdvisor({ empire, game, run, onArmy }: { empire: Empire; game: Game; run: Run; onArmy: () => void }) {
  return <>
    <AdvisorSpeech id="army">{armyAdvice(empire, game)}</AdvisorSpeech>
    <Box title="Kışla ve tersane">
      <p className="bp-note">Asker ve gemi eğitimi, birlik aktarma.</p>
      <Button size="sm" onClick={onArmy}><Swords data-icon="inline-start" />Orduya git</Button>
    </Box>
    <DefenseSummary empire={empire} />
    <MissionList empire={empire} now={game.updatedAt} run={run} />
    <Box title="Savaş ve casus raporları"><ReportsPanel empire={empire} /></Box>
  </>
}
