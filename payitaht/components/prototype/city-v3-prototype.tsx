'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { CityV3Scene } from './city-v3-scene'
import { BUILDING_ASSETS, HALL_BUILDING_ID } from '@/lib/game/city-map/building-assets'

const movable = BUILDING_ASSETS.filter(b => !b.fixed)

export function CityV3Prototype() {
  const holder = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<CityV3Scene | null>(null)
  const [selected, setSelected] = useState(movable[0]?.buildingId ?? HALL_BUILDING_ID)
  const [info, setInfo] = useState('Geniş şehir prototipi yükleniyor…')
  const [trayOpen, setTrayOpen] = useState(false)
  const [life, setLife] = useState(true)
  const [compact, setCompact] = useState(false)
  const selectedAsset = useMemo(() => BUILDING_ASSETS.find(b => b.buildingId === selected), [selected])

  useEffect(() => {
    const sync = () => setCompact(window.innerWidth < 600)
    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [])

  useEffect(() => {
    let disposed = false
    let game: import('phaser').Game | null = null
    let cleanup = () => {}

    void (async () => {
      const [Phaser, sceneMod] = await Promise.all([import('phaser'), import('./city-v3-responsive-scene')])
      if (disposed || !holder.current) return

      const scene = new sceneMod.CityV3ResponsiveScene()
      scene.onInfo = text => setInfo(text)
      sceneRef.current = scene
      scene.setActiveBuilding(selected)
      scene.setLifeEnabled(life)

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
    // Sandbox scene tek sefer kurulur; seçim ve yaşam ayarı metodlarla aktarılır.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { sceneRef.current?.setActiveBuilding(selected) }, [selected])
  useEffect(() => { sceneRef.current?.setLifeEnabled(life) }, [life])

  const choose = (id: string) => {
    setSelected(id)
    sceneRef.current?.setActiveBuilding(id)
    setTrayOpen(false)
  }

  return (
    <main style={root}>
      <div ref={holder} style={canvas} />

      <div style={{ ...topHud, ...(compact ? topHudCompact : {}) }}>
        <div style={{ ...brand, ...(compact ? brandCompact : {}) }}>
          <div style={{ ...crest, ...(compact ? crestCompact : {}) }}>☾</div>
          <div>
            <strong style={{ display: 'block', letterSpacing: '.04em', fontSize: compact ? 13 : undefined }}>PAYİTAHT</strong>
            <span style={{ fontSize: compact ? 7 : 9, opacity: .74 }}>{compact ? 'CITY V3' : 'CITY V3 · GENİŞ SANDBOX'}</span>
          </div>
        </div>
        <div style={{ ...resources, ...(compact ? resourcesCompact : {}) }}>
          <span>🪵 1.8M</span><span>🪨 1.4M</span><span>🪙 3.2M</span>
        </div>
      </div>

      <div style={{ ...leftTools, ...(compact ? leftToolsCompact : {}) }}>
        <button style={{ ...roundBtn, ...(compact ? roundBtnCompact : {}) }} onClick={() => sceneRef.current?.setCityView()} title="Şehir görünümü">⌂</button>
        <button style={{ ...roundBtn, ...(compact ? roundBtnCompact : {}) }} onClick={() => sceneRef.current?.setOverview()} title="Geniş görünüm">⌗</button>
        <button style={{ ...roundBtn, ...(compact ? roundBtnCompact : {}) }} onClick={() => sceneRef.current?.randomize()} title="Yerleşimi karıştır">⟳</button>
        <button style={{ ...roundBtn, ...(compact ? roundBtnCompact : {}), opacity: life ? 1 : .55 }} onClick={() => setLife(v => !v)} title="Şehir yaşamı">♟</button>
      </div>

      <div style={{ ...statusCard, ...(compact ? statusCardCompact : {}) }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 5 : 8 }}>
          <span style={{ ...statusDot, ...(compact ? { width: 6, height: 6 } : {}) }} />
          <div style={{ minWidth: 0 }}>
            {!compact && <div style={{ fontSize: 9, opacity: .68 }}>SEÇİLİ BİNA</div>}
            <strong style={{ fontSize: compact ? 11 : undefined }}>{selectedAsset?.name ?? selected}</strong>
          </div>
        </div>
        {!compact && <div style={{ marginTop: 5, fontSize: 10, opacity: .82, lineHeight: 1.25 }}>{info}</div>}
      </div>

      <div style={{ ...rightTools, ...(compact ? rightToolsCompact : {}) }}>
        <button style={{ ...smallBtn, ...(compact ? smallBtnCompact : {}) }} onClick={() => setTrayOpen(v => !v)}>🏛 Bina</button>
        <button style={{ ...smallBtn, ...(compact ? smallBtnCompact : {}) }} onClick={() => sceneRef.current?.resetCity()}>↶ Sıfırla</button>
      </div>

      {trayOpen && (
        <div style={{ ...trayWrap, ...(compact ? { bottom: 38, left: 5, right: 5 } : {}) }}>
          <div style={trayHead}>
            <div>
              <strong>Sandbox bina paleti</strong>
              <div style={{ fontSize: 9, opacity: .65 }}>Seç → şehirde bir parsele dokun</div>
            </div>
            <button style={closeBtn} onClick={() => setTrayOpen(false)}>×</button>
          </div>
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
        </div>
      )}

      <div style={{ ...hint, ...(compact ? hintCompact : {}) }}>TEK PARMAK: GEZ · İKİ PARMAK: ZOOM · PARSELE DOKUN: BİNA DEĞİŞTİR</div>
      <div style={{ ...prototypeBadge, ...(compact ? badgeCompact : {}) }}>CANLI OYUN DEĞİL · SAVE YOK · ANA DALA DOKUNMAZ</div>
    </main>
  )
}

const root: React.CSSProperties = { position: 'fixed', inset: 0, overflow: 'hidden', background: '#16343b', color: '#f7edd2', fontFamily: 'system-ui, sans-serif', touchAction: 'none' }
const canvas: React.CSSProperties = { position: 'absolute', inset: 0 }
const topHud: React.CSSProperties = { position: 'absolute', zIndex: 20, left: 8, right: 8, top: 7, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 7, pointerEvents: 'none' }
const topHudCompact: React.CSSProperties = { left: 5, right: 5, top: 5, minHeight: 34, gap: 4 }
const brand: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 7, padding: '5px 8px', borderRadius: 12, background: 'linear-gradient(180deg,#271c16ef,#0f1717ef)', border: '1px solid #d5ad63aa', boxShadow: '0 4px 18px #0008' }
const brandCompact: React.CSSProperties = { gap: 5, padding: '4px 6px', borderRadius: 10 }
const crest: React.CSSProperties = { width: 30, height: 30, borderRadius: 99, display: 'grid', placeItems: 'center', fontSize: 19, background: '#70372c', border: '2px solid #d6ae64' }
const crestCompact: React.CSSProperties = { width: 23, height: 23, fontSize: 14, borderWidth: 1 }
const resources: React.CSSProperties = { display: 'flex', gap: 5, padding: '6px 8px', borderRadius: 12, background: '#111918e9', border: '1px solid #d5ad6366', fontSize: 10, fontWeight: 700, boxShadow: '0 4px 18px #0007' }
const resourcesCompact: React.CSSProperties = { gap: 3, padding: '5px 6px', borderRadius: 10, fontSize: 8 }
const leftTools: React.CSSProperties = { position: 'absolute', zIndex: 21, left: 8, top: 62, display: 'grid', gap: 6 }
const leftToolsCompact: React.CSSProperties = { left: 5, top: 48, gap: 5 }
const rightTools: React.CSSProperties = { position: 'absolute', zIndex: 21, right: 8, top: 62, display: 'grid', gap: 6 }
const rightToolsCompact: React.CSSProperties = { right: 5, top: 48, gap: 5 }
const roundBtn: React.CSSProperties = { width: 38, height: 38, borderRadius: 12, border: '1px solid #dbb46f99', background: '#171c1be8', color: '#f7e2b8', fontSize: 18, fontWeight: 800, boxShadow: '0 4px 14px #0007' }
const roundBtnCompact: React.CSSProperties = { width: 32, height: 32, borderRadius: 10, fontSize: 15 }
const smallBtn: React.CSSProperties = { minWidth: 66, height: 34, padding: '0 8px', borderRadius: 10, border: '1px solid #dbb46f88', background: '#171c1be8', color: '#f7e2b8', fontSize: 10, fontWeight: 800, boxShadow: '0 4px 14px #0007' }
const smallBtnCompact: React.CSSProperties = { minWidth: 54, height: 29, padding: '0 6px', borderRadius: 9, fontSize: 8 }
const statusCard: React.CSSProperties = { position: 'absolute', zIndex: 20, left: 53, top: 61, width: 'min(265px, calc(100vw - 132px))', padding: '7px 9px', borderRadius: 11, background: '#151c1bdd', border: '1px solid #d5ad6355', boxShadow: '0 4px 14px #0006', pointerEvents: 'none' }
const statusCardCompact: React.CSSProperties = { left: 43, top: 48, width: 'calc(100vw - 108px)', padding: '5px 7px', borderRadius: 9 }
const statusDot: React.CSSProperties = { width: 8, height: 8, borderRadius: 99, background: '#72c76d', boxShadow: '0 0 0 3px #72c76d22' }
const trayWrap: React.CSSProperties = { position: 'absolute', zIndex: 30, left: 8, right: 8, bottom: 44, padding: '8px', borderRadius: 14, background: '#101717f4', border: '1px solid #d6ae6466', boxShadow: '0 5px 24px #000b' }
const trayHead: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px 7px 4px' }
const closeBtn: React.CSSProperties = { width: 30, height: 30, borderRadius: 9, border: '1px solid #d6ae6455', background: '#2b211bd9', color: '#f6dfb7', fontSize: 20 }
const tray: React.CSSProperties = { display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2, WebkitOverflowScrolling: 'touch' }
const buildingBtn: React.CSSProperties = { minWidth: 70, width: 70, height: 76, padding: '3px', borderRadius: 10, border: '1px solid #806a4555', background: '#26231ddd', color: '#e9dcc1', display: 'grid', gridTemplateRows: '50px 1fr', alignItems: 'center', justifyItems: 'center', fontSize: 9, fontWeight: 700, overflow: 'hidden' }
const activeBuildingBtn: React.CSSProperties = { border: '2px solid #e3b75f', background: '#49361fef', boxShadow: '0 0 0 2px #0008 inset' }
const thumb: React.CSSProperties = { width: 58, height: 49, objectFit: 'contain', filter: 'drop-shadow(0 4px 4px #0008)' }
const hint: React.CSSProperties = { position: 'absolute', zIndex: 20, left: 10, bottom: 23, padding: '4px 7px', borderRadius: 7, background: '#101717b8', color: '#e8d7b4', fontSize: 8, fontWeight: 700, letterSpacing: '.035em', pointerEvents: 'none' }
const hintCompact: React.CSSProperties = { left: 6, bottom: 30, padding: '3px 5px', fontSize: 6.5, maxWidth: '78vw', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }
const prototypeBadge: React.CSSProperties = { position: 'absolute', zIndex: 25, right: 9, bottom: 8, padding: '4px 7px', borderRadius: 7, background: '#4b1f1fdc', border: '1px solid #e49b7788', color: '#ffd8bf', fontSize: 8, fontWeight: 800, letterSpacing: '.05em', pointerEvents: 'none' }
const badgeCompact: React.CSSProperties = { right: 6, bottom: 6, padding: '3px 5px', fontSize: 6.5 }
