'use client'

import { useRef, useState } from 'react'
import { Flag, LocateFixed, Hammer, X } from 'lucide-react'
import type { Game, BuildingId } from '@/lib/game/engine'
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

export function CityScene({ game, placing, onBuilding, onPlot, onRoad, moving, movePlot, onMovePlot, onExitBuild, onOpenList }: {
  game: Game
  placing: boolean
  onBuilding: (id: BuildingId) => void
  onPlot: (plot: number) => void
  onRoad: (cell: string) => void
  moving: BuildingId | null
  movePlot: number | null
  onMovePlot: (plot: number) => void
  onExitBuild: () => void
  onOpenList: () => void
}) {
  const [labels, setLabels] = useState(false)
  const controls = useRef<CityControls | null>(null)

  return <section className="city-scene" aria-label="Sahilhisar şehir haritası">
    <CityCanvas game={game} showLabels={labels} placing={placing} controls={controls} onBuilding={onBuilding} onPlot={onPlot} onRoad={onRoad} moving={moving} movePlot={movePlot} onMovePlot={onMovePlot} />

    {/*
      * İNŞA KİPİ.
      *
      * Bos arsalar surekli isaretli durmuyor; oyuncu "İnşa"ya bastiginda
      * harita insa kipine giriyor ve arsalar beliriyor. Referans oyunlarin
      * hepsi boyle: dunya normalde bir dunya, yalnizca yerlestirirken bir
      * izgara.
      */}
    {placing && !moving && <div className="build-hint">
      <span><Hammer aria-hidden="true" /> Boş arsaya dokun, yapını seç</span>
      <button onClick={onOpenList}>Listeden seç</button>
      <button className="build-exit" onClick={onExitBuild} aria-label="İnşa kipinden çık"><X /></button>
    </div>}

    <div className="map-top-tools">
      <button aria-label="Şehri ortala" onClick={() => controls.current?.recenter()}><LocateFixed /></button>
      <button aria-label={labels ? 'Bina adlarını gizle' : 'Bina adlarını göster'}
        onClick={() => setLabels(v => !v)} aria-pressed={labels}><Flag /></button>
    </div>

  </section>
}
