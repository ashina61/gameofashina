'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { SlotDebugScene } from '@/components/map-debug/slot-debug-scene'
import { BUILDING_ASSETS, HALL_BUILDING_ID } from '@/lib/game/city-map/building-assets'

const movable = BUILDING_ASSETS.filter(b => !b.fixed)

export function CityV3Prototype() {
  const holder = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<SlotDebugScene | null>(null)
  const [selected, setSelected] = useState(movable[0]?.buildingId ?? HALL_BUILDING_ID)
  const [info, setInfo] = useState('Bina seç → şehirde bir parsele dokun. Tek parmakla gez, iki parmakla zoom yap.')
  const [trayOpen, setTrayOpen] = useState(true)
  const selectedAsset = useMemo(() => BUILDING_ASSETS.find(b => b.buildingId === selected), [selected])

  useEffect(() => {
    let disposed = false
    let game: import('phaser').Game | null = null
    let cleanup = () => {}

    void (async () => {
      const [Phaser, sceneMod] = await Promise.all([import('phaser'), import('@/components/map-debug/slot-debug-scene')])
      if (disposed || !holder.current) return

      const scene = new sceneMod.SlotDebugScene()
      scene.onSelect = text => setInfo(text)
      sceneRef.current = scene
      scene.events.once(Phaser.Scenes.Events.CREATE, () => {
        // Debug sahnesinin oyun-mantığından bağımsız gerçek asset yerleşimini kullan.
        // showEmpty() create() içinde çağrılıyor; burada tüm tekil binaları geri açıyoruz.
        scene.clearFill()
        scene.setDebug(false)
        scene.setActiveBuilding(selected)
        scene.setOverview()
        setInfo('CITY V3 sandbox hazır. Bina seç → bir parsele dokunarak taşı/takas et.')
      })

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
        render: { antialias: true },
        banner: false,
        audio: { noAudio: true },
        input: { windowEvents: false },
        scene: [scene],
      })

      const ro = new ResizeObserver(entries => {
        const r = entries[0]?.contentRect
        if (r && r.width > 0 && r.height > 0) game?.scale.resize(Math.round(r.width * dpr), Math.round(r.height * dpr))
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
    // Prototype scene intentionally mounts once; selected is pushed through setActiveBuilding below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    sceneRef.current?.setActiveBuilding(selected)
  }, [selected])

  const choose = (id: string) => {
    setSelected(id)
    sceneRef.current?.setActiveBuilding(id)
  }

  return (
    <main style={root}>
      <div ref={holder} style={canvas} />

      <div style={topHud}>
        <div style={brand}>
          <div style={crest}>☾</div>
          <div>
            <strong style={{ display: 'block', letterSpacing: '.04em' }}>PAYİTAHT</strong>
            <span style={{ fontSize: 10, opacity: .72 }}>CITY V3 · BAĞIMSIZ PROTOTİP</span>
          </div>
        </div>
        <div style={resources}>
          <span>🪵 1.8M</span><span>🪨 1.4M</span><span>🪙 3.2M</span>
        </div>
      </div>

      <div style={leftTools}>
        <button style={roundBtn} onClick={() => sceneRef.current?.setCityView()} title="Şehir görünümü">⌂</button>
        <button style={roundBtn} onClick={() => sceneRef.current?.setOverview()} title="Geniş görünüm">⌗</button>
        <button style={roundBtn} onClick={() => sceneRef.current?.randomize()} title="Yerleşimi karıştır">⟳</button>
      </div>

      <div style={statusCard}>
        <div style={{ fontSize: 10, opacity: .72, marginBottom: 2 }}>SEÇİLİ</div>
        <strong>{selectedAsset?.name ?? selected}</strong>
        <div style={{ marginTop: 3, fontSize: 11, opacity: .82 }}>{info}</div>
      </div>

      <div style={trayWrap}>
        <button style={trayToggle} onClick={() => setTrayOpen(v => !v)}>{trayOpen ? '▾ Bina seçimi' : '▴ Bina seçimi'}</button>
        {trayOpen && (
          <div style={tray}>
            {movable.map(b => {
              const active = b.buildingId === selected
              return (
                <button key={b.buildingId} onClick={() => choose(b.buildingId)} style={{ ...buildingBtn, ...(active ? activeBuildingBtn : {}) }}>
                  <img src={b.assetPath} alt="" style={thumb} />
                  <span>{b.name}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div style={prototypeBadge}>CANLI OYUN DEĞİL · SAVE YOK · MEKANİK YOK</div>
    </main>
  )
}

const root: React.CSSProperties = { position: 'fixed', inset: 0, overflow: 'hidden', background: '#16343b', color: '#f7edd2', fontFamily: 'system-ui, sans-serif', touchAction: 'none' }
const canvas: React.CSSProperties = { position: 'absolute', inset: 0 }
const topHud: React.CSSProperties = { position: 'absolute', zIndex: 20, left: 10, right: 10, top: 8, minHeight: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, pointerEvents: 'none' }
const brand: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 9, padding: '7px 11px', borderRadius: 13, background: 'linear-gradient(180deg,#271c16ed,#0f1717ed)', border: '1px solid #d5ad63aa', boxShadow: '0 4px 18px #0008' }
const crest: React.CSSProperties = { width: 34, height: 34, borderRadius: 99, display: 'grid', placeItems: 'center', fontSize: 22, background: '#70372c', border: '2px solid #d6ae64' }
const resources: React.CSSProperties = { display: 'flex', gap: 8, padding: '8px 10px', borderRadius: 13, background: '#111918e8', border: '1px solid #d5ad6366', fontSize: 12, fontWeight: 700, boxShadow: '0 4px 18px #0007' }
const leftTools: React.CSSProperties = { position: 'absolute', zIndex: 21, left: 10, top: 70, display: 'grid', gap: 8 }
const roundBtn: React.CSSProperties = { width: 42, height: 42, borderRadius: 14, border: '1px solid #dbb46f99', background: '#171c1bdd', color: '#f7e2b8', fontSize: 21, fontWeight: 800, boxShadow: '0 4px 14px #0007' }
const statusCard: React.CSSProperties = { position: 'absolute', zIndex: 20, left: 62, top: 70, width: 'min(330px, calc(100vw - 78px))', padding: '8px 11px', borderRadius: 12, background: '#151c1bdd', border: '1px solid #d5ad6355', boxShadow: '0 4px 14px #0006', pointerEvents: 'none' }
const trayWrap: React.CSSProperties = { position: 'absolute', zIndex: 30, left: 8, right: 8, bottom: 10 }
const trayToggle: React.CSSProperties = { display: 'block', margin: '0 auto 5px', padding: '6px 12px', borderRadius: 10, border: '1px solid #d6ae6477', background: '#151b19e8', color: '#f3ddb2', fontWeight: 700, fontSize: 12 }
const tray: React.CSSProperties = { display: 'flex', gap: 7, overflowX: 'auto', padding: '8px', borderRadius: 14, background: '#101717ee', border: '1px solid #d6ae6466', boxShadow: '0 5px 20px #0009', WebkitOverflowScrolling: 'touch' }
const buildingBtn: React.CSSProperties = { minWidth: 76, width: 76, height: 82, padding: '4px', borderRadius: 11, border: '1px solid #806a4555', background: '#26231ddd', color: '#e9dcc1', display: 'grid', gridTemplateRows: '55px 1fr', alignItems: 'center', justifyItems: 'center', fontSize: 10, fontWeight: 700, overflow: 'hidden' }
const activeBuildingBtn: React.CSSProperties = { border: '2px solid #e3b75f', background: '#49361fef', boxShadow: '0 0 0 2px #0008 inset' }
const thumb: React.CSSProperties = { width: 62, height: 54, objectFit: 'contain', filter: 'drop-shadow(0 4px 4px #0008)' }
const prototypeBadge: React.CSSProperties = { position: 'absolute', zIndex: 25, right: 10, bottom: 112, padding: '5px 8px', borderRadius: 8, background: '#4b1f1fd9', border: '1px solid #e49b7788', color: '#ffd8bf', fontSize: 9, fontWeight: 800, letterSpacing: '.06em', pointerEvents: 'none' }
