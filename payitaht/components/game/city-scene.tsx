'use client'
import type { BadgeMode } from '@/lib/game/badges'

import { useRef, useState } from 'react'
import { Sun, Sunset, Moon, Flag, Move, Anchor, Landmark, ScrollText } from './ui-art'
import { skyTint } from '@/lib/game/sky'
import type { BannerLook } from '@/lib/game/banner'
import type { Game, BuildingId } from '@/lib/game/engine'
import { PEACEFUL_CITY, type SiegeAppearance } from '@/lib/game/siege-appearance'
import { CityCanvas, type CityControls } from './city-canvas'

/*
 * ŞEHİR EKRANI.
 *
 * Artik yalnizca bir KABUK: dunyayi Phaser cizer, burasi onun uzerinde yuzen
 * birkac kucuk parcayi tutar. Eskiden sehir, arayuz seritlerinin arasina
 * sikismis kaydirilabilir bir kutuydu ve tam olarak ekran kadar
 * olcekleniyordu - yani kaydirilacak tasma yoktu, parmak hicbir sey
 * yapmiyordu. Tuval dunyayi ekrandan buyuk tutar; gezinme bu yuzden gercek.
 */

export function CityScene({ game, placing, onBuilding, onPlot, onRoad, moving, movePlot, onMovePlot, onMine, offers = 0, offerMode = 'count', onOffers, banner, siege = PEACEFUL_CITY, paused = false }: {
  game: Game
  placing: boolean
  onBuilding: (id: BuildingId) => void
  onPlot: (plot: number) => void
  onRoad: (cell: string) => void
  moving: BuildingId | null
  movePlot: number | null
  onMovePlot: (plot: number) => void
  onMine: () => void
  /** Bekleyen yapay rakip teklifleri: elçi mektubu düğmesi. */
  offers?: number
  offerMode?: BadgeMode
  onOffers?: () => void
  banner?: BannerLook
  siege?: SiegeAppearance
  /** Şehri tamamen örten bir sayfa açık. */
  paused?: boolean
}) {
  // Ikariam gibi: bina adları varsayılan olarak GİZLİ (göz binaya ve caddeye odaklanır);
  // bayrak düğmesi açar. İnşaat süren binanın sayacı her zaman görünür.
  const [labels, setLabels] = useState(false)
  const controls = useRef<CityControls | null>(null)

  return <section className={`city-scene${siege.occupation ? ' city-occupied' : ''}${siege.blockade ? ' city-blockaded' : ''}`}
    aria-label={`Şehir haritası${siege.occupation ? ' · işgal altında' : ''}${siege.blockade ? ' · liman abluka altında' : ''}`}>
    <CityCanvas game={game} showLabels={labels} placing={placing} controls={controls} onBuilding={onBuilding} onPlot={onPlot} onRoad={onRoad} moving={moving} movePlot={movePlot} onMovePlot={onMovePlot} onMine={onMine} banner={banner} siege={siege} paused={paused} />
    {(siege.occupation || siege.blockade) && <div className="siege-atmosphere" aria-hidden="true" />}

    <Weather time={game.updatedAt} />

    <div className="map-top-tools">
      <button aria-label={labels ? 'Bina etiketlerini gizle' : 'Bina etiketlerini göster'}
        onClick={() => setLabels(v => !v)} aria-pressed={labels}><Flag /></button>
      <button aria-label="Donanma ve limana git" title="Donanma ve limana git"
        onClick={() => controls.current?.focusHarbour()}><Anchor /></button>
      <button aria-label="Belediyeye dön" title="Belediyeye dön"
        onClick={() => controls.current?.recenter()}><Landmark /></button>
      {offers > 0 && onOffers && <button className="map-offer" aria-label={`${offers} yapay rakip teklifi bekliyor`} title="Elçi mektubu" onClick={onOffers}>
        <ScrollText />{offerMode === 'dot' ? <b className="is-dot" aria-hidden="true" /> : offerMode && <b>{offers}</b>}</button>}
    </div>

    {/*
      * Yakinlastir/uzaklastir ve ortala dugmeleri KALDIRILDI: iki parmakla
      * yakinlastirma ve surukleme jesti zaten var, dugmeler ekrani mesgul
      * ediyordu. Pusula ve ipucu kaliyor.
      */}
    {/* Pusula da kaldirildi; yalnizca kisa bir gezinme ipucu kaliyor. */}
    <div className="map-bottom-tools">
      <span className="map-tip"><Move className="size-3" /> Sürükle · iki parmakla yakınlaş</span>
    </div>
  </section>
}

/** Günün saatine göre güneş, akşam ya da ay (şehir sahnesindeki ışıkla aynı saat). */
function Weather({ time }: { time: number }) {
  const t = skyTint(new Date(time))
  const [Icon, label] = t.night >= 0.8 ? [Moon, 'Gece: pencerelerde kandiller yanıyor'] : t.alpha > 0 ? [Sunset, 'Akşamüstü'] : [Sun, 'Şehirde güneşli bir gün']
  return <span className="weather" title={label}><Icon aria-hidden="true" /></span>
}
