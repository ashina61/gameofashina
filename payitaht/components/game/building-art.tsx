'use client'

/**
 * BİNA GÖRSELİ + CANLI SANCAKLAR — bina resimlerinde sancak kumaşı yoktur
 * (yalnız direk); kumaşı burada oyuncunun sancağıyla, direğin tepesine,
 * rüzgârda dalgalanan küçük SVG olarak çizeriz. Sancak değişince hepsi değişir.
 */
import { createContext, useContext } from 'react'
import { BUILDING_FLAGS, DEFAULT_LOOK, type BannerLook } from '@/lib/game/banner'
import type { BuildingId } from '@/lib/game/engine'
import { buildingArtKey, buildingImage, type CoastFacing } from '@/lib/asset'

export const BannerContext = createContext<BannerLook>(DEFAULT_LOOK)
export const useBanner = () => useContext(BannerContext)

/** Direğe bağlı kumaş (0..40 × 0..24), biçime göre; iki kare arasında dalgalanır. */
function cloth(shape: BannerLook['shape'], ph: number) {
  const N = 6, pts: string[] = [], bot: string[] = []
  for (let i = 0; i <= N; i++) {
    const u = i / N, x = u * 40, w = Math.sin(ph - u * 3.2) * 3 * u
    const pinch = shape === 'ucgen' ? u * 10 : 0
    pts.push(`${x.toFixed(1)} ${(2 + w + pinch).toFixed(1)}`)
    bot.unshift(`${x.toFixed(1)} ${(22 + w - u * 1.5 - pinch).toFixed(1)}`)
  }
  const tipW = Math.sin(ph - 3.2) * 3, mid = 12 + tipW
  const notch = shape === 'kirlangic' ? [`29 ${mid.toFixed(1)}`] : shape === 'cifte' ? [`38 ${(mid - 6).toFixed(1)}`, `36 ${(mid - 2).toFixed(1)}`, `23 ${mid.toFixed(1)}`, `36 ${(mid + 2).toFixed(1)}`, `38 ${(mid + 6).toFixed(1)}`] : []
  return 'M' + [...pts, ...notch, ...bot].join(' L') + ' Z'
}

export function FlagCloth({ look, style }: { look: BannerLook; style?: React.CSSProperties }) {
  const frames = [0, 2, 4, 6.28].map(p => cloth(look.shape, p))
  const cx = look.shape === 'ucgen' ? 12 : 16
  return <svg className="ba-flag" viewBox="0 0 40 24" style={style} aria-hidden="true">
    <path d={frames[0]} fill={look.color} stroke="#00000033" strokeWidth="0.6"><animate attributeName="d" dur="1.8s" repeatCount="indefinite" values={frames.join(';')} /></path>
    {look.crest === 'hilal'
      ? <g><circle cx={cx} cy="12" r="5" fill="#f6efe0" /><circle cx={cx + 1.6} cy="12" r="4.1" fill={look.color} /><circle cx={cx + 6} cy="12" r="1.5" fill="#f6efe0" /></g>
      : <circle cx={cx} cy="12" r="4.2" fill="#f6efe0" opacity="0.95" />}
  </svg>
}

/** Bina resmi; resimde sancak direği varsa kumaşı üstüne çizilir. */
export function BuildingArt({ id, level, className, alt = '', facing }: { id: BuildingId; level: number; className?: string; alt?: string; facing?: CoastFacing }) {
  const look = useBanner()
  const key = buildingArtKey(id, Math.max(1, level), facing)
  const m = BUILDING_FLAGS[key]
  const src = buildingImage(id, level, facing)
  const mirror = (id === 'liman' || id === 'tersane') && facing === 'right'
  if (!m) return <img className={className} src={src} alt={alt} draggable={false} style={mirror ? { transform: 'scaleX(-1)' } : undefined} />
  const [W, H, list] = m
  return <span className={`building-art ${className ?? ''}`} style={{ aspectRatio: `${W} / ${H}`, transform: mirror ? 'scaleX(-1)' : undefined }}>
    <img src={src} alt={alt} draggable={false} />
    {list.map(([fx, fy, fw, fh], i) => <FlagCloth key={i} look={look} style={{
      left: `${(fx / W) * 100}%`, top: `${(fy / H) * 100}%`, width: `${(fw * 1.2 / W) * 100}%`, height: `${(fh * 1.25 / H) * 100}%`,
    }} />)}
  </span>
}
