'use client'

import { useRef, useState } from 'react'
import { Plus, Minus, LocateFixed, Compass, ChevronDown, Users, Sun, Flag, Move } from 'lucide-react'
import { population, type Game, type BuildingId } from '@/lib/game/engine'
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

export function CityScene({ game, onBuilding, onPlot }: {
  game: Game
  onBuilding: (id: BuildingId) => void
  onPlot: (plot: number) => void
}) {
  const [labels, setLabels] = useState(true)
  const controls = useRef<CityControls | null>(null)

  return <section className="city-scene" aria-label="Sahilhisar şehir haritası">
    <CityCanvas game={game} showLabels={labels} controls={controls} onBuilding={onBuilding} onPlot={onPlot} />

    {/*
      * Sehir kimligi artik kocaman bir baslik degil, kucuk bir rozet.
      * Haritanin ustunde duran her piksel dunyadan calinmis demektir.
      */}
    <div className="city-badge">
      <span className="eyebrow"><span className="live-dot" /> EGE KIYILARI</span>
      <h1>Sahilhisar <ChevronDown aria-hidden="true" /></h1>
      <p><Users aria-hidden="true" /> {population(game)} <span>·</span> Sv. {game.buildings.divan}</p>
    </div>
    <span className="weather" title="Şehirde güneşli bir gün"><Sun aria-hidden="true" /></span>

    <div className="map-top-tools">
      <button aria-label={labels ? 'Bina etiketlerini gizle' : 'Bina etiketlerini göster'}
        onClick={() => setLabels(v => !v)} aria-pressed={labels}><Flag /></button>
    </div>

    <div className="map-bottom-tools">
      <span className="compass"><Compass aria-hidden="true" /><span>K</span></span>
      <span className="map-tip"><Move className="size-3" /> Sürükle · iki parmakla yakınlaş</span>
      <div className="zoom-tools">
        <button aria-label="Uzaklaştır" onClick={() => controls.current?.zoomBy(1 / 1.25)}><Minus /></button>
        <button aria-label="Şehri ortala" onClick={() => controls.current?.recenter()}><LocateFixed /></button>
        <button aria-label="Yakınlaştır" onClick={() => controls.current?.zoomBy(1.25)}><Plus /></button>
      </div>
    </div>
  </section>
}
