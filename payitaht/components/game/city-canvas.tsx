'use client'

import { useEffect, useRef } from 'react'
import type { CityScene } from './phaser-city'
import type { BuildingId, Game } from '@/lib/game/engine'

/*
 * TUVAL KÖPRÜSÜ.
 *
 * Phaser yalnizca tarayicida calisir ve sunucuda `window` arar; bu yuzden
 * dinamik olarak, ilk cizimden SONRA yuklenir. Oyun mantigi React'te kalir -
 * sahne yalnizca durumu alir ve dokunusu geri bildirir.
 */

/** Arayuzun kameraya verebilecegi komutlar. */
export type CityControls = { recenter: () => void; zoomBy: (factor: number) => void }

type Props = {
  game: Game
  showLabels: boolean
  /** İnsa kipi: bos arsalar yalnizca bu acikken haritada isaretlenir. */
  placing: boolean
  /** Sahne hazir oldugunda doldurulur; arayuz kamerayi buradan surer. */
  controls: { current: CityControls | null }
  onBuilding: (id: BuildingId) => void
  onPlot: (index: number) => void
  /** Oyuncu bos zemine dokundu: yol hucresini ac/kapat ("gx,gy"). */
  onRoad: (cell: string) => void
  /** Tasima kipi: hangi bina tasiniyor ve o an hedeflenen arsa. */
  moving: BuildingId | null
  movePlot: number | null
  onMovePlot: (plot: number) => void
}

export function CityCanvas({ game, showLabels, placing, controls, onBuilding, onPlot, onRoad, moving, movePlot, onMovePlot }: Props) {
  const holder = useRef<HTMLDivElement>(null)
  const scene = useRef<CityScene | null>(null)
  /*
   * Geri cagrilar ve ilk durum REF'te tutulur. Sahne bir kez kurulur; her
   * yeni React cizimi yuzunden yeniden kurulmasi, oyuncunun kaydirdigi
   * kamerayi saniyede bir sifirlamak olurdu.
   */
  const handlers = useRef({ onBuilding, onPlot, onRoad, onMovePlot })
  handlers.current = { onBuilding, onPlot, onRoad, onMovePlot }
  const firstState = useRef(game)

  useEffect(() => {
    let disposed = false
    let instance: import('phaser').Game | null = null
    let cleanup = () => {}

    void (async () => {
      // Phaser'in ESM paketi varsayilan disa aktarim sunmaz; ad alani alinir.
      const [Phaser, { CityScene }] = await Promise.all([
        import('phaser'), import('./phaser-city'),
      ])
      if (disposed || !holder.current) return

      /*
       * PIKSEL YOGUNLUGU.
       *
       * Phaser tuvali varsayilan olarak CSS pikseliyle olcer; DPR 2 bir
       * telefonda bu, ekranin yarisi kadar cozunurluk ve gozle gorulur bir
       * bulaniklik demek (olculdu: 390x844 arka bellek, 390x844 CSS).
       *
       * RESIZE kipi tuval olculerini kendi belirledigi icin `zoom` orada bir
       * ise yaramiyor. NONE kipinde ise olcuyu biz veriyoruz: oyun boyutu
       * CIHAZ pikseli, `zoom: 1/dpr` ile CSS boyutu yine ekran kadar. Olcek
       * yoneticisi bu orani bildiginden dokunus koordinatlari da dogru
       * cevriliyor - elle CSS yazsaydik girdi iki kat kayardi.
       *
       * Ust sinir 2: DPR 3 telefonlarda dort kat piksel, gorunur kazanc
       * olmadan pil yakar.
       */
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const box = holder.current.getBoundingClientRect()
      const view = new CityScene()
      scene.current = view
      controls.current = {
        recenter: () => view.recenter(),
        zoomBy: (factor: number) => view.zoomBy(factor),
      }

      instance = new Phaser.Game({
        type: Phaser.AUTO,
        parent: holder.current,
        transparent: false,
        scale: {
          mode: Phaser.Scale.NONE,
          width: Math.round(box.width * dpr),
          height: Math.round(box.height * dpr),
          zoom: 1 / dpr,
        },
        render: { antialias: true, roundPixels: false, powerPreference: 'high-performance' },
        /*
         * PENCERE OLAYLARI KAPALI.
         *
         * Phaser varsayilan olarak `pointerup`'i WINDOW uzerinde de dinler -
         * tuvalin disinda birakilan surukleme yakalansin diye. Ama bizim
         * arayuzumuz tuvalin USTUNDE duruyor: "Uzaklaştır" dugmesine basmak
         * hem dugmeyi calistiriyor hem de altindaki arsayi tikliyordu, yani
         * her yakinlastirmada bos arsa paneli aciliyordu. Tuval tum ekrani
         * kapladigi icin disarida birakilan surukleme zaten olmuyor.
         */
        input: { windowEvents: false },
        // Fizik yok: sehir duruyor, carpisma diye bir sey yok.
        banner: false,
        audio: { noAudio: true },
        scene: [],
      })
      instance.scene.add('city', view, true, {
        game: firstState.current,
        events: {
          onBuilding: (id: BuildingId) => handlers.current.onBuilding(id),
          onPlot: (index: number) => handlers.current.onPlot(index),
          onRoad: (cell: string) => handlers.current.onRoad(cell),
          onMovePlot: (plot: number) => handlers.current.onMovePlot(plot),
        },
      })

      // Ekran donunce ya da kabuk degisince tuval yeniden olculur.
      const observer = new ResizeObserver(entries => {
        const rect = entries[0]?.contentRect
        if (rect && rect.width > 0) instance?.scale.resize(Math.round(rect.width * dpr), Math.round(rect.height * dpr))
      })
      observer.observe(holder.current)
      cleanup = () => observer.disconnect()
    })()

    return () => {
      disposed = true
      scene.current = null
      controls.current = null
      cleanup()
      instance?.destroy(true)
    }
  }, [])

  // Durum degistiginde sahneye haber ver; sahne gorunen bir sey degismediyse
  // hicbir sey cizmez.
  useEffect(() => { scene.current?.sync(game, showLabels, placing, moving, movePlot) }, [game, showLabels, placing, moving, movePlot])

  return <div ref={holder} className="city-canvas" aria-hidden="true" />
}
