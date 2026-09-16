'use client'

import { useEffect, useRef, useState } from 'react'
import { Plus, Minus, LocateFixed, Hammer, Compass, ChevronDown, Users, Sun, Flag, Move } from 'lucide-react'
import { BUILDINGS, BUILDING_IDS, PLOTS, activeJob, population, type Game, type BuildingId } from '@/lib/game/engine'
import { TILE_W, TILE_H, cityFocus } from '@/lib/game/layout'
import { CityGround } from './city-ground'
import { cn } from '@/lib/utils'
import { asset, buildingImage } from '@/lib/asset'

/*
 * Bina, durdugu ARSA KADAR yer kaplar.
 *
 * Eskiden her yapinin kendi genisligi vardi ve hicbiri altindaki zeminle
 * ayni olcude degildi. Artik tek olcu var: karo genisligi. Divanhane gibi
 * baskin yapilar yalnizca biraz tasar - zemini degil, siluetiyle.
 */
const widthPercent = (id: BuildingId) => (id === 'divan' ? TILE_W * 1.18 : TILE_W)

/** Acilista ekrana sigdirilacak kutu, tuvalin bir orani olarak. */
const FOCUS = (() => {
  const f = cityFocus()
  return {
    width: (f.right - f.left) / 100,
    height: (f.bottom - f.top) / 100,
    centerX: (f.left + f.right) / 200,
    centerY: (f.top + f.bottom) / 200,
  }
})()

/** Etiketlerin kenara yapismamasi icin birakilan pay. */
const EDGE_MARGIN = 28
/** Haritanin ustunu ve altini ortan arayuz seritlerinin toplam yuksekligi. */
const OVERLAY_INSET = 150
/** Ustteki serit alttakinden kalin; gorunur pencere bu kadar yukarida. */
const TOP_BIAS = 26
const MAX_ZOOM = 1.6

export function CityScene({ game, onBuilding, onPlot }: { game: Game; onBuilding: (id: BuildingId) => void; onPlot: (plot: number) => void }) {
  const viewport = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  const [baseSize, setBaseSize] = useState(560)
  const [viewportWidth, setViewportWidth] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(0)
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
    ? Math.min(1, Math.max(0.5, Math.min(
        (viewportWidth - EDGE_MARGIN) / (baseSize * FOCUS.width),
        // Ust ve alt seritler (sehir basligi, hedef karti) haritayi ortuyor;
        // sigdirma bu payi dusmezse sehir ekranin disina tasiyor.
        (viewportHeight - OVERLAY_INSET) / (baseSize * FOCUS.height))))
    : 1
  const [labels, setLabels] = useState(true)
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null)
  const size = baseSize * zoom
  /*
   * Gorunumu SEHRIN MERKEZINE getirir.
   *
   * Eskiden tuvalin sabit bir yuzdesine kaydiriliyordu; izgara degistiginde
   * bu sayi sessizce yanlis oluyordu. Artik odak kutusunun merkezinden
   * turer, yani satir eklemek ya da karo buyutmek acilis gorunumunu
   * kendiliginden duzeltir.
   */
  const center = () => {
    const el = viewport.current
    if (!el) return
    el.scrollLeft = Math.max(0, size * FOCUS.centerX - el.clientWidth / 2)
    /*
     * Dikeyde biraz ASAGI kaydirilir: ustteki sehir basligi alttaki hedef
     * kartindan daha yer kaplar, yani gorunur pencere tam ortada degildir.
     */
    el.scrollTop = Math.max(0, size * FOCUS.centerY - el.clientHeight / 2 - TOP_BIAS)
  }
  useEffect(() => {
    const el = viewport.current
    if (!el) return
    const observer = new ResizeObserver(() => {
      setBaseSize(Math.max(560, el.clientWidth, el.clientHeight * 1.22))
      setViewportWidth(el.clientWidth)
      setViewportHeight(el.clientHeight)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  // Olculer hazir olunca sehri bir kez sigdir; sonrasi oyuncunun kararidir.
  const fitted = useRef(false)
  useEffect(() => {
    if (fitted.current || viewportWidth === 0 || viewportHeight === 0) return
    fitted.current = true
    setZoom(fitZoom)
  }, [fitZoom, viewportWidth, viewportHeight])
  useEffect(center, [size])
  return <section className="city-scene" aria-label="Sahilhisar şehir haritası">
    <div className="city-title"><div><span className="eyebrow"><span className="live-dot" /> EGE KIYILARI · BAŞKENTİN</span><h1>Sahilhisar <ChevronDown aria-hidden="true" /></h1><p><Users aria-hidden="true" /> {population(game)} nüfus <span>·</span> Seviye {game.buildings.divan} yerleşim</p></div><span className="weather" title="Şehirde güneşli bir gün"><Sun aria-hidden="true" /><span>Huzurlu bir gün</span></span></div>
    <div ref={viewport} className="map-viewport" onPointerDown={event => { if ((event.target as HTMLElement).closest('button')) return; drag.current = { x: event.clientX, y: event.clientY, left: event.currentTarget.scrollLeft, top: event.currentTarget.scrollTop }; event.currentTarget.setPointerCapture(event.pointerId) }} onPointerMove={event => { if (!drag.current) return; event.currentTarget.scrollLeft = drag.current.left - event.clientX + drag.current.x; event.currentTarget.scrollTop = drag.current.top - event.clientY + drag.current.y }} onPointerUp={() => { drag.current = null }} onPointerCancel={() => { drag.current = null }}>
      <div className="map-canvas" style={{ width: size, height: size }}>
        <img src={asset('/images/game/island.webp')} className="island-image" alt="Sahilhisar'ı çevreleyen kırlar, servi ağaçları ve kıyı" width={1024} height={1024} fetchPriority="high" draggable={false} />
        <CityGround game={game} />
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
        {PLOTS.map(slot => ({ slot, index: slot.index, id: BUILDING_IDS.find(id => game.placement[id] === slot.index) ?? null }))
          .sort((a, b) => a.slot.y - b.slot.y || a.slot.x - b.slot.x)
          .map(({ slot, index, id }) => {
            const level = id ? game.buildings[id] : 0
            const active = id !== null && activeJob(game)?.id === id
            const width = id ? widthPercent(id) : TILE_W
            return <button
              key={index}
              onClick={() => (id ? onBuilding(id) : onPlot(index))}
              className={cn('map-building', !id && 'empty-building', active && 'building-active')}
              style={{
                left: `${slot.x}%`,
                top: `${slot.y}%`,
                width: `${width}%`,
                /*
                 * Bina KARONUN UZERINE oturur: yatayda ortalanir, dikeyde
                 * tabani karonun merkezine gelir. Transform yerine yuzde
                 * kenar boslugu kullanilir - transform yigin baglami acar ve
                 * etiketler komsu binalarin altinda kalirdi.
                 */
                marginLeft: `${-width / 2}%`,
                marginTop: id ? `${-(width - TILE_H / 2)}%` : `${-TILE_H / 2}%`,
                height: id ? undefined : `${TILE_H}%`,
              }}
              aria-label={id
                ? `${BUILDINGS[id].name}, seviye ${level}${active ? ', inşaat sürüyor' : ''}`
                : slot.zone === 'liman' ? 'Boş iskele, buraya liman yapısı kur' : 'Boş inşaat arsası, buraya yeni bir yapı kur'}
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
              {/*
                * Etiket YALNIZCA kurulu yapilarda.
                *
                * Yirmi dort arsanin hepsini etiketlemek sehri okunmaz bir
                * yazi yiginina cevirdi - bos arsanin zaten bir adi yok,
                * karosu ve arti isareti ne oldugunu soyluyor.
                */}
              {id && (labels || active) && <span className="building-label">{active && <Hammer aria-hidden="true" />}{BUILDINGS[id].name}<span className="level-label">{level}</span></span>}
            </button>
          })}
        <span className="harbor-label" style={{ top: `${PLOTS[PLOTS.length - 1].y + TILE_H}%` }}>SAHİLHİSAR LİMANI</span>
      </div>
    </div>
    <div className="map-top-tools"><button aria-label={labels ? 'Bina etiketlerini gizle' : 'Bina etiketlerini göster'} onClick={() => setLabels(!labels)} aria-pressed={labels}><Flag /></button></div>
    <div className="map-bottom-tools"><span className="compass"><Compass aria-hidden="true" /><span>K</span></span><span className="map-tip"><Move className="size-3" /> Keşfetmek için sürükle</span><div className="zoom-tools"><button aria-label="Uzaklaştır" disabled={zoom <= fitZoom + .001} onClick={() => setZoom(z => Math.max(fitZoom, +(z - .15).toFixed(2)))}><Minus /></button><button aria-label="Şehri ortala" onClick={() => { setZoom(fitZoom); center() }}><LocateFixed /></button><button aria-label="Yakınlaştır" disabled={zoom >= MAX_ZOOM} onClick={() => setZoom(z => Math.min(MAX_ZOOM, +(z + .15).toFixed(2)))}><Plus /></button></div></div>
  </section>
}
