'use client'

import { useEffect, useRef, useState } from 'react'
import type { CityBaseV1Scene } from './city-base-v1-scene'

export function CityBaseV1() {
  const holder = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<CityBaseV1Scene | null>(null)
  const [info, setInfo] = useState('CITY BASE V1 hazırlanıyor…')

  useEffect(() => {
    let disposed = false
    let game: import('phaser').Game | null = null
    let cleanup = () => {}

    void (async () => {
      const [Phaser, sceneMod] = await Promise.all([import('phaser'), import('./city-base-v1-scene')])
      if (disposed || !holder.current) return

      const scene = new sceneMod.CityBaseV1Scene()
      scene.onInfo = setInfo
      sceneRef.current = scene

      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const box = holder.current.getBoundingClientRect()
      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: holder.current,
        transparent: false,
        scale: {
          mode: Phaser.Scale.NONE,
          width: Math.max(1, Math.round(box.width * dpr)),
          height: Math.max(1, Math.round(box.height * dpr)),
          zoom: 1 / dpr,
        },
        render: { antialias: true, roundPixels: false },
        banner: false,
        audio: { noAudio: true },
        input: { windowEvents: false },
        scene: [scene],
      })

      const ro = new ResizeObserver(entries => {
        const r = entries[0]?.contentRect
        if (!r || r.width <= 0 || r.height <= 0) return
        game?.scale.resize(Math.round(r.width * dpr), Math.round(r.height * dpr))
      })
      ro.observe(holder.current)
      cleanup = () => ro.disconnect()
    })()

    return () => {
      disposed = true
      sceneRef.current = null
      cleanup()
      game?.destroy(true)
    }
  }, [])

  return (
    <main style={root}>
      <div ref={holder} style={canvas} />

      <div style={topBar}>
        <div style={titleBox}>
          <span style={crest}>☾</span>
          <div>
            <strong style={{ display: 'block', fontSize: 12, letterSpacing: '.06em' }}>PAYİTAHT · CITY BASE V1</strong>
            <span style={{ fontSize: 9, opacity: .72 }}>ARKAPLAN / DÜNYA PROTOTİPİ · BİNA YOK</span>
          </div>
        </div>
        <div style={status}>{info}</div>
      </div>

      <div style={tools}>
        <button style={tool} onClick={() => sceneRef.current?.setCityView()} title="Şehir platosu">⌂</button>
        <button style={tool} onClick={() => sceneRef.current?.setOverview()} title="Tüm dünya">⌗</button>
        <button style={tool} onClick={() => sceneRef.current?.focusRiver()} title="Nehir">≋</button>
        <button style={tool} onClick={() => sceneRef.current?.focusHarbour()} title="Liman koyu">⚓</button>
      </div>

      <div style={bottomHint}>SÜRÜKLE: DÜNYADA GEZ · PINCH / MOUSE WHEEL: ZOOM</div>
      <div style={safeBadge}>AYRI PROTOTİP · CANLI OYUNA / SAVE'E / ANA DALA DOKUNMAZ</div>
    </main>
  )
}

const root: React.CSSProperties = {
  position: 'fixed', inset: 0, overflow: 'hidden', background: '#123d50', color: '#f5ead0',
  fontFamily: 'system-ui, sans-serif', touchAction: 'none', userSelect: 'none',
}
const canvas: React.CSSProperties = { position: 'absolute', inset: 0 }
const topBar: React.CSSProperties = {
  position: 'absolute', zIndex: 20, top: 8, left: 8, right: 8, display: 'flex', gap: 8,
  alignItems: 'flex-start', justifyContent: 'space-between', pointerEvents: 'none',
}
const titleBox: React.CSSProperties = {
  display: 'flex', gap: 8, alignItems: 'center', padding: '7px 10px', borderRadius: 12,
  background: 'linear-gradient(180deg,#2c2119ef,#111a18ef)', border: '1px solid #d2ac6c88', boxShadow: '0 6px 18px #0007',
}
const crest: React.CSSProperties = {
  width: 30, height: 30, borderRadius: 99, display: 'grid', placeItems: 'center', background: '#6d342d',
  border: '2px solid #d4ad67', fontSize: 19,
}
const status: React.CSSProperties = {
  maxWidth: 320, padding: '7px 10px', borderRadius: 10, background: '#111b1bd8', border: '1px solid #d2ac6c55',
  fontSize: 10, lineHeight: 1.3, boxShadow: '0 5px 15px #0006',
}
const tools: React.CSSProperties = { position: 'absolute', zIndex: 21, left: 9, top: 70, display: 'grid', gap: 7 }
const tool: React.CSSProperties = {
  width: 40, height: 40, borderRadius: 12, border: '1px solid #d9b36c99', background: '#151c1be8', color: '#f3ddb0',
  fontSize: 19, fontWeight: 800, boxShadow: '0 4px 12px #0007',
}
const bottomHint: React.CSSProperties = {
  position: 'absolute', zIndex: 20, left: 10, bottom: 11, padding: '5px 8px', borderRadius: 8, background: '#101819ba',
  fontSize: 8, fontWeight: 800, letterSpacing: '.04em', pointerEvents: 'none',
}
const safeBadge: React.CSSProperties = {
  position: 'absolute', zIndex: 20, right: 10, bottom: 11, padding: '5px 8px', borderRadius: 8,
  background: '#462321d9', border: '1px solid #d68d6f66', color: '#ffd6bf', fontSize: 8, fontWeight: 800, pointerEvents: 'none',
}
