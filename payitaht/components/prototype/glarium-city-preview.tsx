'use client'

import { useEffect, useRef, useState } from 'react'
import type { GlariumCityScene } from './glarium-city-scene'

export function GlariumCityPreview() {
  const holder = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<GlariumCityScene | null>(null)
  const [status, setStatus] = useState('Şehir hazırlanıyor…')

  useEffect(() => {
    let disposed = false
    let game: import('phaser').Game | undefined
    let observer: ResizeObserver | undefined
    void (async () => {
      try {
        const [Phaser, mod] = await Promise.all([import('phaser'), import('./glarium-city-scene')])
        if (disposed || !holder.current) return
        const scene = new mod.GlariumCityScene()
        scene.onReady = () => { if (!disposed) setStatus('Sürükle · İki parmakla yakınlaştır') }
        scene.onError = () => { if (!disposed) setStatus('Şehir görseli yüklenemedi. Sayfayı yeniden aç.') }
        sceneRef.current = scene
        const box = holder.current.getBoundingClientRect()
        game = new Phaser.Game({
          type: Phaser.AUTO, parent: holder.current, width: box.width, height: box.height,
          banner: false, audio: { noAudio: true }, scene: [scene],
          render: { antialias: true }, input: { windowEvents: false },
        })
        observer = new ResizeObserver(entries => {
          const r = entries[0]?.contentRect
          if (r && r.width > 0 && r.height > 0) game?.scale.resize(r.width, r.height)
        })
        observer.observe(holder.current)
      } catch {
        if (!disposed) setStatus('Önizleme açılamadı. Sayfayı yeniden aç.')
      }
    })()
    return () => { disposed = true; observer?.disconnect(); sceneRef.current = null; game?.destroy(true) }
  }, [])

  return <main style={{ position: 'fixed', inset: 0, background: '#173e41', color: '#f5ead0', touchAction: 'none' }}>
    <div ref={holder} style={{ position: 'absolute', inset: 0 }} aria-label="Osmanlı şehri görsel önizlemesi" />
    <div style={{ position: 'absolute', top: 10, left: 10, right: 10, pointerEvents: 'none' }}>
      <strong style={{ display: 'inline-block', background: '#302419ed', border: '1px solid #ba985b', borderRadius: 8, padding: '8px 12px' }}>PAYİTAHT · ŞEHİR TASARIMI</strong>
    </div>
    <nav aria-label="Şehir kamerası" style={{ position: 'absolute', left: 10, bottom: 56, display: 'flex', flexWrap: 'wrap', gap: 6, right: 10 }}>
      <button style={button} onClick={() => sceneRef.current?.overview()}>Genel</button>
      <button style={button} onClick={() => sceneRef.current?.focus('city')}>Şehir</button>
      <button style={button} onClick={() => sceneRef.current?.focus('harbour')}>Liman</button>
      <button style={button} aria-label="Yakınlaştır" onClick={() => sceneRef.current?.zoomBy(1.25)}>+</button>
      <button style={button} aria-label="Uzaklaştır" onClick={() => sceneRef.current?.zoomBy(.8)}>−</button>
    </nav>
    <p role="status" style={{ position: 'absolute', left: 10, right: 10, bottom: 10, margin: 0, fontSize: 11, padding: 8, background: '#211b17e8', borderRadius: 6 }}>{status} · Görsel taslak</p>
  </main>
}

const button: React.CSSProperties = { minWidth: 44, minHeight: 44, padding: '8px 12px', background: '#34281fee', color: '#f5e6c7', border: '1px solid #ba985b', borderRadius: 8, cursor: 'pointer' }
