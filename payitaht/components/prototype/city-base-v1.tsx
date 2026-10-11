'use client'

import { useEffect, useRef, useState } from 'react'
import type { CityBaseV3Scene } from './city-base-v3-scene'

const LEVELS = [1, 5, 10, 15, 20] as const

export function CityBaseV1() {
  const holder = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<CityBaseV3Scene | null>(null)
  const [info, setInfo] = useState('CITY BASE V3 hazırlanıyor…')
  const [compact, setCompact] = useState(false)
  const [hallLevel, setHallLevelState] = useState(10)

  useEffect(() => {
    let disposed = false
    let game: import('phaser').Game | null = null
    let cleanup = () => {}

    setCompact(window.innerWidth < 620)
    const fromQuery = Number(new URLSearchParams(window.location.search).get('hall'))
    const initialHall = Number.isFinite(fromQuery) && fromQuery > 0 ? Math.min(40, Math.floor(fromQuery)) : 10
    setHallLevelState(initialHall)

    void (async () => {
      const [Phaser, sceneMod] = await Promise.all([import('phaser'), import('./city-base-v3-scene')])
      if (disposed || !holder.current) return

      const scene = new sceneMod.CityBaseV3Scene()
      scene.initialHallLevel = initialHall
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
        setCompact(r.width < 620)
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

  const setHallLevel = (level: number) => {
    setHallLevelState(level)
    sceneRef.current?.setHallLevel(level)
  }

  return (
    <main style={root}>
      <div ref={holder} style={canvas} />

      <div style={{ ...topBar, ...(compact ? topBarCompact : {}) }}>
        <div style={{ ...titleBox, ...(compact ? titleBoxCompact : {}) }}>
          <span style={{ ...crest, ...(compact ? crestCompact : {}) }}>☾</span>
          <div>
            <strong style={{ display: 'block', fontSize: compact ? 10 : 12, letterSpacing: '.06em' }}>PAYİTAHT · CITY BASE V3</strong>
            {!compact && <span style={{ fontSize: 9, opacity: .72 }}>BELEDİYEYE GÖRE BÜYÜYEN ŞEHİR TABANI · SLOT GÖRÜNMEZ</span>}
          </div>
        </div>
        {!compact && <div style={status}>{info}</div>}
      </div>

      <div style={{ ...tools, ...(compact ? toolsCompact : {}) }}>
        <button style={{ ...tool, ...(compact ? toolCompact : {}) }} onClick={() => sceneRef.current?.setCityView()} title="Şehir platosu">⌂</button>
        <button style={{ ...tool, ...(compact ? toolCompact : {}) }} onClick={() => sceneRef.current?.setOverview()} title="Tüm dünya">⌗</button>
        <button style={{ ...tool, ...(compact ? toolCompact : {}) }} onClick={() => sceneRef.current?.focusRiver()} title="Nehir">≋</button>
        <button style={{ ...tool, ...(compact ? toolCompact : {}) }} onClick={() => sceneRef.current?.focusHarbour()} title="Liman koyu">⚓</button>
      </div>

      <div style={{ ...phasePanel, ...(compact ? phasePanelCompact : {}) }}>
        {!compact && <span style={phaseLabel}>BELEDİYE</span>}
        {LEVELS.map(level => (
          <button
            key={level}
            style={{
              ...phaseButton,
              ...(compact ? phaseButtonCompact : {}),
              ...(hallLevel === level ? phaseButtonActive : {}),
            }}
            onClick={() => setHallLevel(level)}
            title={`Belediye ${level}`}
          >
            {level}
          </button>
        ))}
      </div>

      {!compact && <div style={bottomHint}>SÜRÜKLE: DÜNYADA GEZ · PINCH / MOUSE WHEEL: ZOOM</div>}
      <div style={{ ...safeBadge, ...(compact ? safeBadgeCompact : {}) }}>AYRI PROTOTİP · ANA DALA DOKUNMAZ</div>
      {compact && <div style={mobileStatus}>{info}</div>}
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
const topBarCompact: React.CSSProperties = { right: 'auto', maxWidth: 'calc(100vw - 66px)' }
const titleBox: React.CSSProperties = {
  display: 'flex', gap: 8, alignItems: 'center', padding: '7px 10px', borderRadius: 12,
  background: 'linear-gradient(180deg,#2c2119ef,#111a18ef)', border: '1px solid #d2ac6c88', boxShadow: '0 6px 18px #0007',
}
const titleBoxCompact: React.CSSProperties = { padding: '5px 8px', borderRadius: 10, gap: 6 }
const crest: React.CSSProperties = {
  width: 30, height: 30, borderRadius: 99, display: 'grid', placeItems: 'center', background: '#6d342d',
  border: '2px solid #d4ad67', fontSize: 19,
}
const crestCompact: React.CSSProperties = { width: 24, height: 24, fontSize: 15 }
const status: React.CSSProperties = {
  maxWidth: 430, padding: '7px 10px', borderRadius: 10, background: '#111b1bd8', border: '1px solid #d2ac6c55',
  fontSize: 10, lineHeight: 1.3, boxShadow: '0 5px 15px #0006',
}
const tools: React.CSSProperties = { position: 'absolute', zIndex: 21, left: 9, top: 70, display: 'grid', gap: 7 }
const toolsCompact: React.CSSProperties = { top: 54, left: 7, gap: 5 }
const tool: React.CSSProperties = {
  width: 40, height: 40, borderRadius: 12, border: '1px solid #d9b36c99', background: '#151c1be8', color: '#f3ddb0',
  fontSize: 19, fontWeight: 800, boxShadow: '0 4px 12px #0007',
}
const toolCompact: React.CSSProperties = { width: 33, height: 33, borderRadius: 10, fontSize: 15 }
const phasePanel: React.CSSProperties = {
  position: 'absolute', zIndex: 22, left: '50%', bottom: 12, transform: 'translateX(-50%)', display: 'flex',
  alignItems: 'center', gap: 6, padding: '6px 8px', borderRadius: 14, background: '#171b18e8',
  border: '1px solid #d6b06d88', boxShadow: '0 6px 18px #0008',
}
const phasePanelCompact: React.CSSProperties = { bottom: 42, gap: 4, padding: '5px 6px', borderRadius: 12 }
const phaseLabel: React.CSSProperties = { fontSize: 8, fontWeight: 900, letterSpacing: '.08em', opacity: .74, marginRight: 2 }
const phaseButton: React.CSSProperties = {
  width: 35, height: 29, borderRadius: 9, border: '1px solid #a98754aa', background: '#2b2a23', color: '#ead7af',
  fontSize: 10, fontWeight: 900, cursor: 'pointer',
}
const phaseButtonCompact: React.CSSProperties = { width: 31, height: 27, borderRadius: 8, fontSize: 9 }
const phaseButtonActive: React.CSSProperties = {
  background: 'linear-gradient(180deg,#a4703d,#6b422d)', border: '1px solid #f0ca82', color: '#fff0c9', boxShadow: '0 0 0 1px #4c2b1d inset',
}
const bottomHint: React.CSSProperties = {
  position: 'absolute', zIndex: 20, left: 10, bottom: 11, padding: '5px 8px', borderRadius: 8, background: '#101819ba',
  fontSize: 8, fontWeight: 800, letterSpacing: '.04em', pointerEvents: 'none',
}
const safeBadge: React.CSSProperties = {
  position: 'absolute', zIndex: 20, right: 10, bottom: 11, padding: '5px 8px', borderRadius: 8,
  background: '#462321d9', border: '1px solid #d68d6f66', color: '#ffd6bf', fontSize: 8, fontWeight: 800, pointerEvents: 'none',
}
const safeBadgeCompact: React.CSSProperties = { right: 7, bottom: 7, fontSize: 7, padding: '4px 6px' }
const mobileStatus: React.CSSProperties = {
  position: 'absolute', zIndex: 20, left: 48, right: 8, top: 55, padding: '5px 7px', borderRadius: 8,
  background: '#101819bf', border: '1px solid #d2ac6c44', fontSize: 8, lineHeight: 1.25, pointerEvents: 'none',
}
