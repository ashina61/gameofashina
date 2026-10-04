'use client'

import { useRef, useState, type ReactNode } from 'react'
import { Sun, Sunset, Moon, Flag, Move, Anchor, Landmark, Settings } from './ui-art'
import { skyTint } from '@/lib/game/sky'
import type { BannerLook } from '@/lib/game/banner'
import { BUILDINGS, BUILDING_IDS, type Game, type BuildingId } from '@/lib/game/engine'
import { PEACEFUL_CITY, type SiegeAppearance } from '@/lib/game/siege-appearance'
import { CityCanvas, type CityControls } from './city-canvas'
import { t } from '@/lib/i18n/tr'

/*
 * ŞEHİR EKRANI.
 *
 * Artik yalnizca bir KABUK: dunyayi Phaser cizer, burasi onun uzerinde yuzen
 * birkac kucuk parcayi tutar. Eskiden sehir, arayuz seritlerinin arasina
 * sikismis kaydirilabilir bir kutuydu ve tam olarak ekran kadar
 * olcekleniyordu - yani kaydirilacak tasma yoktu, parmak hicbir sey
 * yapmiyordu. Tuval dunyayi ekrandan buyuk tutar; gezinme bu yuzden gercek.
 */

export function CityScene({ game, placing, onBuilding, onPlot, onRoad, moving, movePlot, onMovePlot, onMine, activity, shortcuts, banner, siege = PEACEFUL_CITY, paused = false, raid = false }: {
  game: Game
  placing: boolean
  onBuilding: (id: BuildingId) => void
  onPlot: (plot: number) => void
  onRoad: (cell: string) => void
  moving: BuildingId | null
  movePlot: number | null
  onMovePlot: (plot: number) => void
  onMine: () => void
  activity?: ReactNode
  shortcuts?: ReactNode
  banner?: BannerLook
  siege?: SiegeAppearance
  /** Şehri tamamen örten bir sayfa açık. */
  paused?: boolean
  raid?: boolean
}) {
  // Ikariam gibi: bina adları varsayılan olarak GİZLİ (göz binaya ve caddeye odaklanır);
  // bayrak düğmesi açar. İnşaat süren binanın sayacı her zaman görünür.
  const [labels, setLabels] = useState(false)
  const [toolsOpen, setToolsOpen] = useState(false)
  const controls = useRef<CityControls | null>(null)

  return <section className={`city-scene${siege.occupation ? ' city-occupied' : ''}${siege.blockade ? ' city-blockaded' : ''}`}
    aria-label={`${t.city.map}${siege.occupation ? ` · ${t.city.occupied}` : ''}${siege.blockade ? ` · ${t.city.blockaded}` : ''}`}>
    <CityCanvas game={game} showLabels={labels} placing={placing} controls={controls} onBuilding={onBuilding} onPlot={onPlot} onRoad={onRoad} moving={moving} movePlot={movePlot} onMovePlot={onMovePlot} onMine={onMine} banner={banner} siege={siege} paused={paused} raid={raid} />
    {(siege.occupation || siege.blockade) && <div className="siege-atmosphere" aria-hidden="true" />}
    <CityList game={game} onBuilding={onBuilding} />

    <Weather time={game.updatedAt} />
    {activity}
    {shortcuts}

    <div className="map-top-tools">
      <button type="button" aria-label="Harita araçları" aria-expanded={toolsOpen} onClick={() => setToolsOpen(v => !v)}><Settings size={28} /></button>
      {toolsOpen && <>
      <button aria-label={labels ? t.city.labelsHide : t.city.labelsShow}
        onClick={() => setLabels(v => !v)} aria-pressed={labels}><Flag painted /></button>
      <button aria-label={t.city.harbour} title={t.city.harbour}
        onClick={() => controls.current?.focusHarbour()}><Anchor painted /></button>
      <button aria-label={t.city.recenter} title={t.city.recenter}
        onClick={() => controls.current?.recenter()}><Landmark painted /></button>

      </>}
    </div>

    {/*
      * Yakinlastir/uzaklastir ve ortala dugmeleri KALDIRILDI: iki parmakla
      * yakinlastirma ve surukleme jesti zaten var, dugmeler ekrani mesgul
      * ediyordu. Pusula ve ipucu kaliyor.
      */}
    {/* Pusula da kaldirildi; yalnizca kisa bir gezinme ipucu kaliyor. */}
    <div className="map-bottom-tools">
      <span className="map-tip"><Move className="size-3" /> {t.city.dragHint}</span>
    </div>
  </section>
}

/**
 * ŞEHRİ LİSTE OLARAK GÖR (V2 Faz 8.3): Phaser tuvali ekran okuyucuya kapalı
 * (aria-hidden). Bu liste aynı binaları düğme olarak sunar; görünmez durur,
 * klavyeyle odak gelince ekranda açılır.
 */
function CityList({ game, onBuilding }: { game: Game; onBuilding: (id: BuildingId) => void }) {
  const building = new Set(game.queue.filter(j => j.kind === 'build').map(j => j.id))
  const ids = BUILDING_IDS.filter(id => game.buildings[id] > 0 || building.has(id))
  return <nav className="sr-only city-list" aria-label={t.city.asList}>
    <ul>
      {ids.map(id => <li key={id}><button type="button" onClick={() => onBuilding(id)}>
        {BUILDINGS[id].name}, {game.buildings[id] > 0 ? t.building.level(game.buildings[id]) : t.building.founding}{building.has(id) && game.buildings[id] > 0 ? `, ${t.building.upgrading}` : ''}
      </button></li>)}
    </ul>
  </nav>
}

/** Günün saatine göre güneş, akşam ya da ay (şehir sahnesindeki ışıkla aynı saat). */
function Weather({ time }: { time: number }) {
  const t = skyTint(new Date(time))
  const [Icon, label] = t.night >= 0.8 ? [Moon, 'Gece: pencerelerde kandiller yanıyor'] : t.alpha > 0 ? [Sunset, 'Akşamüstü'] : [Sun, 'Şehirde güneşli bir gün']
  return <span className="weather" title={label}><Icon aria-hidden="true" /></span>
}
