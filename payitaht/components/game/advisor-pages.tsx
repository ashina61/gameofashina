'use client'
import { rivalById } from '@/lib/game/rivals'

/**
 * DANIŞMAN SAYFALARI — Ikariam'da danışmana basınca açılan özet ekranlar.
 * Vezir şehirleri ve olayları, Serasker orduyu ve raporları anlatır. Her
 * danışman duruma göre bir öğüt verir.
 */
import { ChevronRight, Hammer, Swords } from './ui-art'
import { GameButton } from './game-button'
import { Meter, StatRow } from './stat-kit'
import { EventTimeline } from './event-timeline'
import { resourceIcons } from './game-widgets'
import {
  BUILDINGS, activeJob, contentment, fullResources, housing, idleWorkers, maxPopulation, population, rates, researchReason, RESEARCH_IDS,
  timeLeft, type BuildingId, type Game, formatRate,
} from '@/lib/game/engine'
import { activeCity, type Empire } from '@/lib/game/empire'
import { AdvisorSpeech } from './ika-hud'
import { Box } from './building-page'
import { DefenseSummary } from './ikariam-panels'
import { MissionList, type Run } from './world-panels'
import { ReportsPanel } from './island-view'


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

export function CityAdvisor({ empire, game, onCity, onBuilding, onCities, onBuildList, onOverview }: {
  empire: Empire; game: Game; onCity: (id: string) => void; onBuilding: (id: BuildingId) => void; onCities: () => void; onBuildList: () => void; onOverview: () => void
}) {
  const current = activeCity(empire)
  return <>
    <AdvisorSpeech id="city">{cityAdvice(game)}</AdvisorSpeech>
    <Box title="Şehirlerin">
      {/* Tablo yerine şehir kartı: Divanhane madalyonu, nüfus çubuğu, ustaların işi. */}
      <div className="cc-list">{empire.cities.map(c => {
        const job = activeJob(c.game)
        return <button key={c.id} type="button" className={`cc-card${c.id === current.id ? ' is-here' : ''}`} onClick={() => onCity(c.id)}
          aria-label={`${c.name}${c.id === current.id ? ' (buradasın)' : ''}: şehre git`}>
          <span className="cc-medal" aria-hidden="true">{c.game.buildings.divan}</span>
          <span className="cc-main">
            <span className="cc-name"><strong>{c.name}</strong>{c.id === current.id && <small>burada</small>}</span>
            <Meter value={population(c.game)} max={maxPopulation(c.game)} label={`${c.name} nüfusu`} />
            <span className={`cc-job${job ? '' : ' is-idle'}`}><Hammer aria-hidden="true" />{job ? `${BUILDINGS[job.id as BuildingId].name} · ${timeLeft(job, c.game.updatedAt)}` : 'Ustalar boşta'}</span>
          </span>
        </button>
      })}</div>
      <div className="batch-row">
        <GameButton size="sm" variant="outline" onClick={onCities}>Şehirler ve harita<ChevronRight data-icon="inline-end" /></GameButton>
        <GameButton size="sm" variant="outline" onClick={onBuildList}>Bütün yapılar<ChevronRight data-icon="inline-end" /></GameButton>
        <GameButton size="sm" variant="outline" onClick={onOverview}>İmparatorluk özeti<ChevronRight data-icon="inline-end" /></GameButton>
      </div>
    </Box>
    <Box title="Üretim">
      <div className="sk-list">
        {([['gold', 'Akçe'], ['wood', 'Kereste'], ['knowledge', 'İlim']] as const).map(([k, l]) => {
          const v = rates(game)[k], Icon = resourceIcons[k]
          return <StatRow key={k} icon={<Icon />} label={l} value={<>{formatRate(v, true)}<small> /dk</small></>} tone={v > 0 ? 'up' : v < 0 ? 'down' : 'idle'} />
        })}
      </div>
      <GameButton size="sm" variant="outline" onClick={() => onBuilding('divan')}>Divanhane<ChevronRight data-icon="inline-end" /></GameButton>
    </Box>
    <Box title="Olaylar">
      <EventTimeline log={game.log} now={game.updatedAt} />
    </Box>
  </>
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
