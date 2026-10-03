'use client'

import { useEffect, useRef } from 'react'
import { play } from '@/lib/sfx'
import type { CityScene } from './phaser-city'
import type { BuildingId, Game } from '@/lib/game/engine'
import type { BannerLook } from '@/lib/game/banner'
import type { FlagLook } from './city-life'
import { canvasDpr } from '@/lib/render-dpr'
import { IDLE_AFTER_MS, setFrameCap, wantedFps } from '@/lib/frame-cap'
import { liteMode, onLiteChange } from '@/lib/motion'
import { PEACEFUL_CITY, type SiegeAppearance } from '@/lib/game/siege-appearance'

/*
 * TUVAL KÖPRÜSÜ.
 *
 * Phaser yalnizca tarayicida calisir ve sunucuda `window` arar; bu yuzden
 * dinamik olarak, ilk cizimden SONRA yuklenir. Oyun mantigi React'te kalir -
 * sahne yalnizca durumu alir ve dokunusu geri bildirir.
 */

/** Arayuzun kameraya verebilecegi komutlar. */
export type CityControls = { recenter: () => void; zoomBy: (factor: number) => void; focusHarbour: () => void }

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
  /** Ada madenine dokunuldu. */
  onMine: () => void
  /** Oyuncunun sancağı (renk, biçim, arma). */
  banner?: BannerLook
  siege?: SiegeAppearance
  /** Tam ekran bir sayfa şehri örtüyor: döngü uyur, pil ve işlemci boşa harcanmaz. */
  paused?: boolean
  /** Bu şehre baskın yolda: ufukta düşman yelkenlileri, meydanda nöbetçiler (V2 Faz 3.6). */
  raid?: boolean
}
const toLook = (b?: BannerLook): FlagLook | undefined => b && { color: parseInt(b.color.slice(1), 16), shape: b.shape, crest: b.crest }

export function CityCanvas({ game, showLabels, placing, controls, onBuilding, onPlot, onRoad, moving, movePlot, onMovePlot, onMine, banner, siege = PEACEFUL_CITY, paused = false, raid = false }: Props) {
  const holder = useRef<HTMLDivElement>(null)
  const phaser = useRef<import('phaser').Game | null>(null)
  const scene = useRef<CityScene | null>(null)
  /*
   * Geri cagrilar ve ilk durum REF'te tutulur. Sahne bir kez kurulur; her
   * yeni React cizimi yuzunden yeniden kurulmasi, oyuncunun kaydirdigi
   * kamerayi saniyede bir sifirlamak olurdu.
   */
  const handlers = useRef({ onBuilding, onPlot, onRoad, onMovePlot, onMine })
  handlers.current = { onBuilding, onPlot, onRoad, onMovePlot, onMine }
  const firstLook = useRef(toLook(banner))
  // Async Phaser import may finish after a siege starts/ends; use the latest props.
  const latest = useRef({ game, showLabels, placing, moving, movePlot, siege, raid })
  latest.current = { game, showLabels, placing, moving, movePlot, siege, raid }

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
      const dpr = canvasDpr()
      const box = holder.current.getBoundingClientRect()
      const view = new CityScene()
      scene.current = view
      controls.current = {
        recenter: () => view.recenter(),
        zoomBy: (factor: number) => view.zoomBy(factor),
        focusHarbour: () => view.focusHarbour(),
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
      phaser.current = instance
      instance.scene.add('city', view, true, {
        game: latest.current.game,
        siege: latest.current.siege,
        look: firstLook.current,
        events: {
          onReady: () => {
            const p = latest.current
            view.sync(p.game, p.showLabels, p.placing, p.moving, p.movePlot, p.siege)
            view.setRaidAlert(p.raid)
          },
          onBuilding: (id: BuildingId) => { play('tap'); handlers.current.onBuilding(id) },
          onPlot: (index: number) => handlers.current.onPlot(index),
          onRoad: (cell: string) => handlers.current.onRoad(cell),
          onMovePlot: (plot: number) => handlers.current.onMovePlot(plot),
          onMine: () => handlers.current.onMine(),
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
      phaser.current = null
      scene.current = null
      controls.current = null
      cleanup()
      instance?.destroy(true)
    }
  }, [])

  /*
   * ORTULU SEHIR UYUR (V2 Faz 2.5 ölçümü): bina sayfası, panel ya da ada
   * görünümü şehri tamamen örterken Phaser her kareyi boşuna çiziyordu;
   * yavaş cihazda sayfa animasyonları kare atlıyordu. Uyanınca Phaser
   * zaman farkını sıfırlar, tween'ler zıplamaz. Kurulum bitmeden uyutulmaz:
   * ilk kare çizilmeden "şehir hazır" işareti gelmez.
   */
  useEffect(() => {
    const loop = phaser.current?.loop
    if (!loop || !document.documentElement.dataset.cityReady) return
    if (paused) loop.sleep()
    else loop.wake()
  }, [paused])

  /*
   * BOŞTA KARE SINIRI (V2 Faz 6.3): beş saniye dokunulmayan şehir 20 kare/sn
   * çizer; dokunuş, kaydırma ya da sefer efekti tam hıza döndürür. Hafif
   * modda (zayıf cihaz) üst sınır 30. Arka planda Phaser zaten durur.
   */
  useEffect(() => {
    const el = holder.current
    if (!el) return
    let timer = 0, idle = false
    const apply = () => { const loop = phaser.current?.loop; if (loop) setFrameCap(loop, wantedFps(idle, liteMode())) }
    const wake = () => {
      window.clearTimeout(timer)
      if (idle) { idle = false; apply() }
      timer = window.setTimeout(() => { idle = true; apply() }, IDLE_AFTER_MS)
    }
    const onMove = (e: PointerEvent) => { if (e.buttons) wake() }
    el.addEventListener('pointerdown', wake, { passive: true })
    el.addEventListener('pointermove', onMove, { passive: true })
    el.addEventListener('wheel', wake, { passive: true })
    window.addEventListener('payitaht-city-fx', wake)
    const offLite = onLiteChange(apply)
    wake(); apply()
    return () => {
      window.clearTimeout(timer)
      el.removeEventListener('pointerdown', wake)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('wheel', wake)
      window.removeEventListener('payitaht-city-fx', wake)
      offLite()
    }
  }, [])

  useEffect(() => { scene.current?.setRaidAlert(raid) }, [raid])
  // Sefer çıkınca/dönünce kabuk 'payitaht-city-fx' olayı yollar (V2 Faz 3.5).
  useEffect(() => {
    const on = (e: Event) => {
      const kind = (e as CustomEvent<string>).detail
      if (kind === 'sail') scene.current?.fxSail()
      else if (kind === 'march') scene.current?.fxMarch()
    }
    window.addEventListener('payitaht-city-fx', on)
    return () => window.removeEventListener('payitaht-city-fx', on)
  }, [])

  // Durum degistiginde sahneye haber ver; sahne gorunen bir sey degismediyse
  // hicbir sey cizmez.
  useEffect(() => { scene.current?.sync(game, showLabels, placing, moving, movePlot, siege) }, [game, showLabels, placing, moving, movePlot, siege])

  const lookKey = banner ? `${banner.color}-${banner.shape}-${banner.crest}` : ''
  useEffect(() => { const l = toLook(banner); if (l) { firstLook.current = l; scene.current?.setBanner(l) } }, [lookKey]) // eslint-disable-line react-hooks/exhaustive-deps
  return <div ref={holder} className="city-canvas" aria-hidden="true" />
}
