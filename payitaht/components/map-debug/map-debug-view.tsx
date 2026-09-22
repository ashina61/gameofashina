'use client'

import { useEffect, useRef, useState } from 'react'
import type { SlotDebugScene, Toggles, RealAssetRow, FillReport } from './slot-debug-scene'
import { BUILDING_ASSETS, HALL_BUILDING_ID } from '@/lib/game/city-map/building-assets'

/**
 * SLOT DEBUG EKRANI (/map-debug) — GERÇEK bina assetleriyle görsel uygunluk.
 * Canlı oyunu etkilemez. Bina seç, 24 city slota taşı, katmanları aç/kapat,
 * "Test Real Assets" ile geometri + görsel uyarı tablosu al.
 */
export function MapDebugView() {
  const holder = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<SlotDebugScene | null>(null)
  const [info, setInfo] = useState('Bina seç → CITY slota dokun taşı · sürükle/tekerlek gez')
  const [active, setActive] = useState<string>(HALL_BUILDING_ID)
  const [toggles, setToggles] = useState<Toggles>({ footprint: true, ground: true, anchor: false, bbox: false })
  const [rows, setRows] = useState<RealAssetRow[] | null>(null)
  const [fill, setFill] = useState<FillReport | null>(null)
  const [roads, setRoads] = useState<{ edge: string; through: string }[] | null>(null)
  const [open, setOpen] = useState(false) // debug paneli başlangıçta KAPALI

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

  const toggle = (k: keyof Toggles) => { const n = { ...toggles, [k]: !toggles[k] }; setToggles(n); sceneRef.current?.setToggle(k, n[k]) }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#22333b', color: '#e7ecd9', fontFamily: 'system-ui, sans-serif' }}>
      <div ref={holder} style={{ position: 'absolute', inset: 0 }} />

      {/* KOMPAKT ÜST ŞERİT — panel kapalıyken şehir görünümünü kapatmaz. */}
      <div style={header}>
        <button onClick={() => setOpen(o => !o)} style={btn(open ? '#4a3a6a' : '#2a3b44')}>{open ? '▴' : '☰'}</button>
        <button onClick={() => sceneRef.current?.showEmpty()} style={btn('#2f5a3f')}>EMPTY</button>
        <button onClick={() => { sceneRef.current?.showFull() }} style={btn('#7a4a2a')}>FULL</button>
        <button onClick={() => sceneRef.current?.setCityView()} style={btn('#274a55')}>CITY</button>
        <button onClick={() => sceneRef.current?.setOverview()} style={btn('#3a4a55')}>OVERVIEW</button>
        <span style={{ fontSize: 11, color: '#cbe6bd', flex: '1 1 90px', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{info}</span>
      </div>

      {/* AÇILIR kontrol paneli — yalnızca Debug açıkken. */}
      {open && (
        <div style={bar}>
          <label style={{ fontSize: 12, display: 'flex', gap: 5, alignItems: 'center' }}>Bina:
            <select value={active} onChange={e => { setActive(e.target.value); sceneRef.current?.setActiveBuilding(e.target.value) }} style={sel}>
              {BUILDING_ASSETS.map(b => <option key={b.buildingId} value={b.buildingId}>{b.name}{b.fixed ? ' (çakılı)' : ''}</option>)}
            </select>
          </label>
          <button onClick={() => { const r = sceneRef.current?.fillAll('A'); if (r) { setFill(r); setRows(null) } }} style={btn('#7a4a2a')}>Fill All City Slots</button>
          <button onClick={() => { const r = sceneRef.current?.fillAll('B'); if (r) { setFill(r); setRows(null) } }} style={btn('#7a5a2a')}>Fill Layout B</button>
          <button onClick={() => { sceneRef.current?.clearFill(); setFill(null) }} style={btn('#3a2b2b')}>Clear Fill</button>
          <button onClick={() => { const r = sceneRef.current?.runRealAssetTest(); if (r) { setRows(r); setFill(null) } }} style={btn('#4a3a6a')}>Test Real Assets</button>
          <button onClick={() => sceneRef.current?.randomize()} style={btn('#2f5a3f')}>Randomize</button>
          <button onClick={() => { const r = sceneRef.current?.roadCrossings(); if (r) setRoads(r) }} style={btn('#274a55')}>Yol Kontrolü</button>
          <button onClick={() => sceneRef.current?.runExhaustive()} style={btn('#274a55')}>Geometry (mock)</button>
          {(['footprint', 'ground', 'anchor', 'bbox'] as (keyof Toggles)[]).map(k =>
            <label key={k} style={chk}><input type="checkbox" checked={toggles[k]} onChange={() => toggle(k)} />{k}</label>)}
        </div>
      )}

      {/* Dolu şehir raporu */}
      {fill && (
        <div style={panel}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <strong>Fill {fill.variant} · {fill.filledSlots}/25 slot dolu (belediye sabit)</strong>
            <button onClick={() => setFill(null)} style={btn('#3a2b2b')}>Kapat</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 6, fontSize: 12 }}>
            <Stat label="Zemin temas (footprint içinde)" val={`${fill.groundContactOk}/${fill.filledSlots} ✓`} ok />
            <Stat label="Taban komşuya taşma" val={`${fill.baseOverflowPairs} çift`} ok={fill.baseOverflowPairs === 0} />
            <Stat label="Depth ters sıra" val={`${fill.depthInversions}`} ok={fill.depthInversions === 0} />
            <Stat label="Yol boşluğu (min footprint aralığı)" val={`${fill.roadGapMinPx}px`} ok={fill.roadGapMinPx > 0} />
            <Stat label="Çatı/üst kat örtüşen komşu" val={`${fill.roofOverlapPairs.length} çift`} ok={fill.roofOverlapPairs.length === 0} warn={fill.roofOverlapPairs.length > 0} />
            <Stat label="Yüksek yapı (kubbe/minare)" val={`${fill.tall.length}`} />
          </div>
          {fill.roofOverlapPairs.length > 0 && (
            <div style={{ marginTop: 8, fontSize: 11, color: '#ffcf5a', maxHeight: '20vh', overflow: 'auto' }}>
              <b>Görsel örtüşen komşu çiftleri (footprint hatası değil, çatı/üst kat):</b>
              <div>{fill.roofOverlapPairs.map((p, i) => <div key={i}>{p.a} ↔ {p.b} · %{p.pct}</div>)}</div>
            </div>
          )}
        </div>
      )}

      {/* Yol kontrolü raporu (#4): uçları dışında footprint'ten geçen kenarlar. */}
      {roads && (
        <div style={{ ...panel, bottom: fill || rows ? 'auto' : 8, top: fill || rows ? 100 : 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ color: roads.length ? '#ffcf5a' : '#6dff92' }}>
              Yol Kontrolü · {roads.length === 0 ? 'hiçbir kenar footprint içinden geçmiyor ✓' : `${roads.length} reroute gerekli`}
            </strong>
            <button onClick={() => setRoads(null)} style={btn('#3a2b2b')}>Kapat</button>
          </div>
          {roads.length > 0 && (
            <div style={{ marginTop: 6, fontSize: 11, color: '#ffcf5a', maxHeight: '20vh', overflow: 'auto' }}>
              {roads.map((r, i) => <div key={i}>{r.edge} · {r.through} footprint&apos;inden geçiyor (slot değişmez → reroute)</div>)}
            </div>
          )}
        </div>
      )}

      {/* Sonuç tablosu */}
      {!fill && rows && (
        <div style={panel}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <strong>Test Real Assets · {rows.filter(r => r.geometry.startsWith('24/')).length}/{rows.length} GEOMETRY PASS</strong>
            <button onClick={() => setRows(null)} style={btn('#3a2b2b')}>Kapat</button>
          </div>
          <div style={{ overflow: 'auto', maxHeight: '46vh' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr style={{ color: '#cbe6bd', textAlign: 'left' }}>
                {['Building', '24/24 Geometry', 'Anchor', 'Scale', 'Ground', 'Visual Warnings'].map(h => <th key={h} style={th}>{h}</th>)}
              </tr></thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} style={{ borderTop: '1px solid #ffffff14' }}>
                    <td style={td}>{r.name}</td>
                    <td style={{ ...td, color: r.geometry.startsWith('24/') ? '#6dff92' : '#ff8a6d' }}>{r.geometry}</td>
                    <td style={td}>{r.anchor ? '✓' : '✗'}</td>
                    <td style={td}>{r.scale ? '✓' : '✗'}</td>
                    <td style={td}>{r.groundContact ? '✓' : '✗'}</td>
                    <td style={{ ...td, color: r.warnings.length ? '#ffcf5a' : '#8fae86' }}>{r.warnings.length ? r.warnings.join(' · ') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

const header: React.CSSProperties = { position: 'absolute', top: 8, left: 8, right: 8, display: 'flex', gap: 8, alignItems: 'center', zIndex: 6 }
const bar: React.CSSProperties = { position: 'absolute', top: 52, left: 8, right: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', padding: '8px 12px', borderRadius: 12, background: '#0d2522f2', border: '1px solid #d9c18540', backdropFilter: 'blur(8px)', zIndex: 5 }
const panel: React.CSSProperties = { position: 'absolute', bottom: 8, left: 8, right: 8, padding: '10px 12px', borderRadius: 12, background: '#0d2522f2', border: '1px solid #d9c18540', backdropFilter: 'blur(8px)', zIndex: 6 }
const th: React.CSSProperties = { padding: '4px 8px', position: 'sticky', top: 0, background: '#0d2522' }
const td: React.CSSProperties = { padding: '4px 8px', color: '#e7ecd9', whiteSpace: 'nowrap' }
const sel: React.CSSProperties = { padding: '5px 8px', borderRadius: 8, background: '#173b34', color: '#fff', border: '1px solid #ffffff2e', fontSize: 13 }
const chk: React.CSSProperties = { fontSize: 12, display: 'flex', gap: 4, alignItems: 'center', textTransform: 'capitalize', color: '#cbe6bd' }
function btn(bg: string): React.CSSProperties {
  return { padding: '7px 12px', borderRadius: 9, background: bg, color: '#fff', border: '1px solid #ffffff2e', cursor: 'pointer', fontSize: 13, fontWeight: 600 }
}

function Stat({ label, val, ok, warn }: { label: string; val: string; ok?: boolean; warn?: boolean }) {
  const color = warn ? '#ffcf5a' : ok ? '#6dff92' : '#e7ecd9'
  return (
    <div style={{ padding: '6px 8px', borderRadius: 8, background: '#ffffff0f', border: '1px solid #ffffff14' }}>
      <div style={{ color: '#9fb39a', fontSize: 10 }}>{label}</div>
      <div style={{ color, fontWeight: 700 }}>{val}</div>
    </div>
  )
}
