'use client'

import { useEffect, useRef, useState } from 'react'
import { Plus, Minus, LocateFixed, Hammer, Compass, ChevronDown, Users, Sun, Flag, Move } from 'lucide-react'
import { BUILDINGS, BUILDING_IDS, PLOTS, activeJob, freePlots, population, type Game, type BuildingId } from '@/lib/game/engine'
import { cn } from '@/lib/utils'
import { asset, buildingImage } from '@/lib/asset'

/** Binanin harita uzerindeki genisligi (tuval genisliginin yuzdesi). */
const widthPercent = (id: BuildingId) => (id === 'divan' ? 21 : 18)

/*
 * Sehrin tuval uzerinde kapladigi YATAY pay.
 *
 * BUILDINGS verisinden turer; bir bina tasindiginda ya da eklendiginde
 * kendiliginde guncellenir. Sabit bir sayi yazmak, yerlesim degistiginde
 * sessizce yanlis hale gelirdi.
 */
const citySpan = (() => {
  const half = 21 / 2
  const left = Math.min(...PLOTS.map(p => p.x - half))
  const right = Math.max(...PLOTS.map(p => p.x + half))
  return (right - left) / 100
})()

/** Etiketlerin kenara yapismamasi icin birakilan pay. */
const EDGE_MARGIN = 28
const MAX_ZOOM = 1.6

export function CityScene({ game, onBuilding, onPlot }: { game: Game; onBuilding: (id: BuildingId) => void; onPlot: (plot: number) => void }) {
  const viewport = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  const [baseSize, setBaseSize] = useState(560)
  const [viewportWidth, setViewportWidth] = useState(0)
  /*
   * SEHRI EKRANA SIGDIRAN yakinlastirma.
   *
   * Tuval boyutu ada goruntusunun ekrani KAPLAMASI icin secilir
   * (clientHeight * 1.22), ama sehrin binalari tuvalin yalnizca ortadaki
   * %61'ine yayilir. 390 piksellik bir telefonda tuval 781 piksel oluyor ve
   * binalarin kapladigi 476 piksel ekrana SIGMIYORDU: en soldaki Kereste
   * Ocagi x = -16'da, etiketi -4'te kaliyordu (olculdu).
   *
   * Acilis yakinlastirmasi artik sehrin genisligine gore hesaplanir, boylece
   * oyuncu ilk bakista sehrin TAMAMINI gorur ve isterse yakinlasir.
   */
  const fitZoom = viewportWidth > 0
    ? Math.min(1, Math.max(0.5, (viewportWidth - EDGE_MARGIN) / (baseSize * citySpan)))
    : 1
  const [labels, setLabels] = useState(true)
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null)
  const size = baseSize * zoom
  const center = () => { const el = viewport.current; if (el) { el.scrollLeft = (size - el.clientWidth) / 2; el.scrollTop = Math.max(0, size * (el.clientWidth < 768 ? .32 : .49) - el.clientHeight / 2) } }
  useEffect(() => {
    const el = viewport.current
    if (!el) return
    const observer = new ResizeObserver(() => {
      setBaseSize(Math.max(560, el.clientWidth, el.clientHeight * 1.22))
      setViewportWidth(el.clientWidth)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  // Olculer hazir olunca sehri bir kez sigdir; sonrasi oyuncunun kararidir.
  const fitted = useRef(false)
  useEffect(() => {
    if (fitted.current || viewportWidth === 0) return
    fitted.current = true
    setZoom(fitZoom)
  }, [fitZoom, viewportWidth])
  useEffect(center, [size])
  return <section className="city-scene" aria-label="Sahilhisar şehir haritası">
    <div className="city-title"><div><span className="eyebrow"><span className="live-dot" /> EGE KIYILARI · BAŞKENTİN</span><h1>Sahilhisar <ChevronDown aria-hidden="true" /></h1><p><Users aria-hidden="true" /> {population(game)} nüfus <span>·</span> Seviye {game.buildings.divan} yerleşim</p></div><span className="weather" title="Şehirde güneşli bir gün"><Sun aria-hidden="true" /><span>Huzurlu bir gün</span></span></div>
    <div ref={viewport} className="map-viewport" onPointerDown={event => { if ((event.target as HTMLElement).closest('button')) return; drag.current = { x: event.clientX, y: event.clientY, left: event.currentTarget.scrollLeft, top: event.currentTarget.scrollTop }; event.currentTarget.setPointerCapture(event.pointerId) }} onPointerMove={event => { if (!drag.current) return; event.currentTarget.scrollLeft = drag.current.left - event.clientX + drag.current.x; event.currentTarget.scrollTop = drag.current.top - event.clientY + drag.current.y }} onPointerUp={() => { drag.current = null }} onPointerCancel={() => { drag.current = null }}>
      <div className="map-canvas" style={{ width: size, height: size }}>
        <img src={asset('/images/game/island.webp')} className="island-image" alt="Ormanları, taş yolları ve yelkenlilerin yanaştığı limanıyla Osmanlı esintili Sahilhisar adası" width={1024} height={1024} fetchPriority="high" draggable={false} />
        {/*
          * Sahne ARSALAR uzerinden cizilir.
          *
          * Once her arsanin uzerinde ne oldugu bulunur; bos arsa "+" isareti,
          * dolu arsa binanin gorseli olur. Eskiden liste bina katalogundan
          * geliyordu ve yalnizca BUILDINGS'te x/y'si olan yapilar cizilebiliyordu -
          * bu yuzden adadaki yedinci arsa hic gorunmuyordu.
          *
          * RESSAM SIRASI: arkadaki arsa once cizilir, yoksa ondeki bina
          * arkadaki tarafindan ortulur.
          */}
        {PLOTS.map((plot, index) => ({ plot, index, id: BUILDING_IDS.find(id => game.placement[id] === index) ?? null }))
          .sort((a, b) => a.plot.y - b.plot.y)
          .map(({ plot, index, id }) => {
            const level = id ? game.buildings[id] : 0
            const active = id !== null && activeJob(game)?.id === id
            const width = id ? widthPercent(id) : 18
            return <button
              key={index}
              onClick={() => (id ? onBuilding(id) : onPlot(index))}
              className={cn('map-building', !id && 'empty-building', active && 'building-active')}
              style={{
                left: `${plot.x}%`,
                top: `${plot.y}%`,
                width: `${width}%`,
                // Kutuyu kendi merkezine/tabanina oturtur; transform yerine
                // yuzde kullanilir ki etiketler sprite'larin ustune cikabilsin.
                marginLeft: `${-width / 2}%`,
                marginTop: id ? `${-width * 0.85}%` : '-61px',
              }}
              aria-label={id ? `${BUILDINGS[id].name}, seviye ${level}${active ? ', inşaat sürüyor' : ''}` : 'Boş inşaat arsası, buraya yeni bir yapı kur'}
            >
              {/*
                * Gorseli HENUZ OLMAYAN yapi kirik resim olarak degil, tas bir
                * kaide uzerinde adiyla cizilir. Boylece yeni bir yapi kurallariyla
                * eklenip oynanabilir olur, boyali gorseli sonra gelir.
                */}
              {id
                ? BUILDINGS[id].art
                  ? <img src={buildingImage(id)} alt="" width={360} height={360} draggable={false} />
                  : <span className="building-pending"><Hammer aria-hidden="true" /></span>
                : <span className="plot-sign">{active ? <Hammer /> : <Plus />}</span>}
              {(labels || !id || active) && <span className="building-label">{active && <Hammer aria-hidden="true" />}{id ? BUILDINGS[id].name : 'Boş arsa'}{id && <span className="level-label">{level}</span>}</span>}
            </button>
          })}
        <span className="harbor-label">SAHİLHİSAR LİMANI</span>
      </div>
    </div>
    <div className="map-top-tools"><button aria-label={labels ? 'Bina etiketlerini gizle' : 'Bina etiketlerini göster'} onClick={() => setLabels(!labels)} aria-pressed={labels}><Flag /></button></div>
    <div className="map-bottom-tools"><span className="compass"><Compass aria-hidden="true" /><span>K</span></span><span className="map-tip"><Move className="size-3" /> Keşfetmek için sürükle</span><div className="zoom-tools"><button aria-label="Uzaklaştır" disabled={zoom <= fitZoom + .001} onClick={() => setZoom(z => Math.max(fitZoom, +(z - .15).toFixed(2)))}><Minus /></button><button aria-label="Şehri ortala" onClick={() => { setZoom(fitZoom); center() }}><LocateFixed /></button><button aria-label="Yakınlaştır" disabled={zoom >= MAX_ZOOM} onClick={() => setZoom(z => Math.min(MAX_ZOOM, +(z + .15).toFixed(2)))}><Plus /></button></div></div>
  </section>
}
