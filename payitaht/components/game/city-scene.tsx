'use client'

import { useRef, useState } from 'react'
import { Sun, Flag, Move, Hammer, X } from 'lucide-react'
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

export function CityScene({ game, placing, onBuilding, onPlot, onExitBuild, onOpenList }: {
  game: Game
  placing: boolean
  onBuilding: (id: BuildingId) => void
  onPlot: (plot: number) => void
  onExitBuild: () => void
  onOpenList: () => void
}) {
  const [labels, setLabels] = useState(false)
  const controls = useRef<CityControls | null>(null)

  return <section className="city-scene" aria-label="Sahilhisar şehir haritası">
    <CityCanvas game={game} showLabels={labels} placing={placing} controls={controls} onBuilding={onBuilding} onPlot={onPlot} />

    {/*
      * İNŞA KİPİ.
      *
      * Bos arsalar surekli isaretli durmuyor; oyuncu "İnşa"ya bastiginda
      * harita insa kipine giriyor ve arsalar beliriyor. Referans oyunlarin
      * hepsi boyle: dunya normalde bir dunya, yalnizca yerlestirirken bir
      * izgara.
      */}
    {placing && <div className="build-hint">
      <span><Hammer aria-hidden="true" /> Boş bir arsaya dokun</span>
      <button onClick={onOpenList}>Listeden seç</button>
      <button className="build-exit" onClick={onExitBuild} aria-label="İnşa kipinden çık"><X /></button>
    </div>}

    <span className="weather" title="Şehirde güneşli bir gün"><Sun aria-hidden="true" /></span>

    <div className="map-top-tools">
      <button aria-label={labels ? 'Bina etiketlerini gizle' : 'Bina etiketlerini göster'}
        onClick={() => setLabels(v => !v)} aria-pressed={labels}><Flag /></button>
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
