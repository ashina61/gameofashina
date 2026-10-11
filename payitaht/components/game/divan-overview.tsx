'use client'

/**
 * DİVANHANE ÖZETİ (Ikariam belediye binasının üst kutusu): boş konut, garnizon
 * sınırları, hamle puanı, büyüme, net akçe, yolsuzluk, halkın yüz ifadesi;
 * altında "Nüfus ve üretim" şeridi (her meslek resmiyle, sayısı ve getirisi)
 * ve şehir nişanı seçimi.
 */
import { asset } from '@/lib/asset'
import { Box } from './building-page'
import { AkceArt } from './resource-art'
import { ApprovedArt } from './approved-court-art'
import {
  actionPoints, contentment, corruption, garrisonLimit, garrisonUsed, growthRate, housing, idleWorkers,
  luxuryProduction, population, rates, scientistUpkeepPerMinute, LUXURY_NAMES, type Game, formatRate,
} from '@/lib/game/engine'
import { EMBLEMS, EMBLEM_IDS, activeCity, capitalId, setCityEmblem, type Empire } from '@/lib/game/empire'
import { actionsInUse } from '@/lib/game/expeditions'
import { PersonArt, type Figure } from './workforce'
import { CityEmblem } from './city-emblem'
import type { Run } from './world-panels'

const n = (x: number) => Math.round(x).toLocaleString('tr-TR')
type Mood = { key: string; name: string; mouth: string; fill: string }
export function moodOf(g: Game): Mood {
  const surplus = contentment(g) - population(g)
  return surplus >= 300 ? { key: 'cosku', name: 'coşkulu', mouth: 'M22 38 Q32 50 42 38 Z', fill: '#f5c542' }
    : surplus >= 100 ? { key: 'mutlu', name: 'mutlu', mouth: 'M22 38 Q32 46 42 38', fill: '#f5c542' }
    : surplus >= 0 ? { key: 'notr', name: 'nötr', mouth: 'M23 40 H41', fill: '#f2cf62' }
    : surplus >= -100 ? { key: 'mutsuz', name: 'mutsuz', mouth: 'M22 44 Q32 36 42 44', fill: '#e7b85a' }
    : { key: 'ofkeli', name: 'öfkeli', mouth: 'M22 45 Q32 34 42 45', fill: '#e0843d' }
}
export function MoodFace({ g, size = 56 }: { g: Game; size?: number }) {
  const m = moodOf(g)
  return <img src={asset(`/images/game/ui/legacy-replacement/mood-${m.key}.webp`)} width={size} height={size} alt={`Halk ${m.name}`} style={{ objectFit: 'contain' }} />
}

export function DivanOverview({ game, empire, run }: { game: Game; empire?: Empire; run?: Run }) {
  const city = empire ? activeCity(empire) : null
  const r = rates(game), lux = luxuryProduction(game)
  const ap = actionPoints(game), used = empire && city ? actionsInUse(empire, city.id) : 0
  const spec = game.mine.specialty
  const jobs: { fig: Figure; label: string; count: number; out: string; neg?: string }[] = [
    { fig: 'oduncu', label: 'Oduncu', count: game.workers.kereste + (game.forest?.workers ?? 0), out: `+${n(r.wood)} kereste` },
    { fig: 'madenci', label: 'Madenci', count: game.mine.miners, out: `+${formatRate(lux[spec])} ${LUXURY_NAMES[spec].toLocaleLowerCase('tr')}` },
    { fig: 'alim', label: 'Âlim', count: game.workers.medrese, out: `+${formatRate(r.knowledge)} ilim`, neg: `${formatRate(-scientistUpkeepPerMinute(game))} akçe` },
    { fig: 'esnaf', label: 'Esnaf', count: game.workers.carsi, out: 'çarşı akçesi' },
    { fig: 'rahip', label: 'İmam', count: game.temple?.priests ?? 0, out: `+${formatRate((game.temple?.priests ?? 0) * 0.5)} inanç` },
    { fig: 'halk', label: 'Boştaki halk', count: idleWorkers(game), out: `+${n(r.gold)} akçe net` },
  ]
  const free = Math.max(0, housing(game) - population(game))
  return <section className="divan-overview"><Box title="Şehir yoklaması">
    <div className="dv-head">
      <span className="dv-emblem"><CityEmblem id={city?.emblem} size={46} /></span>
      <span className="dv-title"><small>{city ? (empire && city.id === capitalId(empire) ? 'BAŞKENT' : 'KOLONİ') : 'ŞEHİR'}</small><strong>{city?.name ?? "Şehir"}</strong></span>
      <span className="dv-mood"><ApprovedArt name="olive" /><small>{moodOf(game).name} · yolsuzluk %{Math.round(corruption(game) * 100)}</small></span>
    </div>
    <div className="dv-stats">
      <span><ApprovedArt name="city" /><small>Boş konut</small><b>{n(free)}<i>/{n(housing(game))}</i></b></span>
      <span><ApprovedArt name="military" /><small>Kara garnizonu</small><b>{n(garrisonUsed(game, 'kara'))}<i>/{n(garrisonLimit(game, 'kara'))}</i></b></span>
      <span><ApprovedArt name="trade" /><small>Deniz garnizonu</small><b>{n(garrisonUsed(game, 'deniz'))}<i>/{n(garrisonLimit(game, 'deniz'))}</i></b></span>
      <span><ApprovedArt name="motion" /><small>Sefer hakkı</small><b>{ap - used}<i>/{ap}</i></b></span>
      <span><ApprovedArt name="olive" /><small>Büyüme</small><b className={growthRate(game) > 0 ? 'is-up' : undefined}>{formatRate(growthRate(game) * 60)}<i>/saat</i></b></span>
      <span><AkceArt /><small>Net akçe</small><b className={r.gold >= 0 ? 'is-up' : 'is-down'}>{n(r.gold * 60)}<i>/saat</i></b></span>
    </div>
    </Box><Box title="Nüfus ve üretim">
    <div className="dv-strip" aria-label="Nüfus ve üretim">
      {jobs.map(j => <div key={j.label} className={j.count ? 'dv-job' : 'dv-job is-empty'}>
        <PersonArt kind={j.fig} size={72} />
        <b>{n(j.count)}</b><small>{j.label}</small><em>{j.out}</em>{j.neg && <em className="is-down">{j.neg}</em>}
      </div>)}
    </div>
    </Box>{city && run && <Box title="Şehir nişanı"><div className="dv-emblems">
      <p>Nişanın adada şehrini temsil eder.</p>
      <div className="dv-emblem-grid">{EMBLEM_IDS.map(id => {
        const locked = game.buildings.divan < EMBLEMS[id].divan
        return <button key={id} type="button" aria-pressed={(city.emblem ?? 'sancak') === id} disabled={locked}
          title={locked ? `${EMBLEMS[id].name} · Divanhane ${EMBLEMS[id].divan}` : EMBLEMS[id].name}
          onClick={() => run((e, t) => setCityEmblem(e, city.id, id, t), `${EMBLEMS[id].name} nişanı asıldı.`)}>
          <CityEmblem id={id} size={34} locked={locked} /><span>{EMBLEMS[id].name}</span>{locked && <small>Sv. {EMBLEMS[id].divan}</small>}
        </button>
      })}</div>
    </div></Box>}
  </section>
}
