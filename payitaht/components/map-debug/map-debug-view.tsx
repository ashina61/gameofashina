'use client'

import { useEffect, useRef, useState } from 'react'
import type { SlotDebugScene } from './slot-debug-scene'

/**
 * SLOT DEBUG EKRANI (/map-debug).
 *
 * Canlı oyundan bağımsız bir Phaser sahnesi: Tiled slot sistemini gözle
 * doğrulamak için. "Randomize Buildings" ile normal binaları rastgele
 * slotlara dağıtır (scale değişmeden), böylece her binanın her normal slota
 * geometrik oturduğu test edilir.
 */
export function MapDebugView() {
  const holder = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<SlotDebugScene | null>(null)
  const [info, setInfo] = useState('Bir slota dokun · sürükle ve tekerlekle gez')
  const [debug, setDebug] = useState(true)

  useEffect(() => {
    let disposed = false
    let instance: import('phaser').Game | null = null
    let cleanup = () => {}
    void (async () => {
      const [Phaser, { SlotDebugScene }] = await Promise.all([import('phaser'), import('./slot-debug-scene')])
      if (disposed || !holder.current) return
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const box = holder.current.getBoundingClientRect()
      const scene = new SlotDebugScene()
      scene.onSelect = (t) => setInfo(t)
      sceneRef.current = scene
      instance = new Phaser.Game({
        type: Phaser.AUTO, parent: holder.current, transparent: false,
        scale: { mode: Phaser.Scale.NONE, width: Math.round(box.width * dpr), height: Math.round(box.height * dpr), zoom: 1 / dpr },
        render: { antialias: true }, banner: false, audio: { noAudio: true }, input: { windowEvents: false }, scene: [scene],
      })
      const ro = new ResizeObserver(es => { const r = es[0]?.contentRect; if (r && r.width > 0) instance?.scale.resize(Math.round(r.width * dpr), Math.round(r.height * dpr)) })
      ro.observe(holder.current)
      cleanup = () => ro.disconnect()
    })()
    return () => { disposed = true; sceneRef.current = null; cleanup(); instance?.destroy(true) }
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#22333b', color: '#e7ecd9', fontFamily: 'system-ui, sans-serif' }}>
      <div ref={holder} style={{ position: 'absolute', inset: 0 }} />
      <div style={{ position: 'absolute', top: 10, left: 10, right: 10, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', padding: '8px 12px', borderRadius: 12, background: '#0d2522d9', border: '1px solid #d9c18540', backdropFilter: 'blur(8px)', zIndex: 5 }}>
        <strong style={{ fontFamily: 'Georgia, serif', color: '#fff4da' }}>Payitaht · Slot Debug</strong>
        <button onClick={() => sceneRef.current?.randomize()} style={btn('#2f5a3f')}>Randomize Buildings</button>
        <button onClick={() => sceneRef.current?.runExhaustive()} style={btn('#4a3a6a')}>Exhaustive Test</button>
        <button onClick={() => { const n = !debug; setDebug(n); sceneRef.current?.setDebug(n) }} style={btn('#274a55')}>{debug ? 'Debug: AÇIK' : 'Debug: KAPALI'}</button>
        <span style={{ fontSize: 12, color: '#cbe6bd', flex: '1 1 240px', minWidth: 0 }}>{info}</span>
      </div>
    </div>
  )
}

function btn(bg: string): React.CSSProperties {
  return { padding: '7px 12px', borderRadius: 9, background: bg, color: '#fff', border: '1px solid #ffffff2e', cursor: 'pointer', fontSize: 13, fontWeight: 600 }
}
