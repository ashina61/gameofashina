'use client'

/**
 * BİNA GÖRSELİ + CANLI SANCAKLAR — bina resimlerinde sancak kumaşı yoktur
 * (yalnız direk); kumaşı burada oyuncunun sancağıyla, direğin tepesine,
 * rüzgârda dalgalanan küçük SVG olarak çizeriz. Sancak değişince hepsi değişir.
 */
import { createContext, useContext } from 'react'
import { BUILDING_FLAGS, DEFAULT_LOOK, type BannerLook } from '@/lib/game/banner'
import type { BuildingId } from '@/lib/game/engine'
import { asset, buildingArtKey, buildingImage, isPaintedBuilding, type CoastFacing } from '@/lib/asset'

export const BannerContext = createContext<BannerLook>(DEFAULT_LOOK)
export const useBanner = () => useContext(BannerContext)

/** Painted cloth and embroidered motif, with the player's chosen colour. */
export function FlagCloth({ look, style }: { look: BannerLook; style?: React.CSSProperties }) {
  const cloth = asset(`/images/game/ui/sancaktar/cloth-${look.shape}.webp`)
  const mask = asset(`/images/game/ui/sancaktar/mask-${look.shape}.webp`)
  return <span className="ba-flag" style={{ ...style, backgroundImage: `url(${cloth})`, backgroundSize: '100% 100%' }} aria-hidden="true">
    <span style={{ position: 'absolute', inset: 0, backgroundColor: look.color, mixBlendMode: 'multiply', maskImage: `url(${mask})`, maskSize: '100% 100%' }} />
    <img src={asset(`/images/game/ui/sancaktar/crest-${look.crest}.webp`)} alt="" style={{ position: 'absolute', left: '25%', top: '20%', width: '45%', height: '55%', objectFit: 'contain' }} />
  </span>
}

/** Bina resmi; resimde sancak direği varsa kumaşı üstüne çizilir. */
export function BuildingArt({ id, level, className, alt = '', facing }: { id: BuildingId; level: number; className?: string; alt?: string; facing?: CoastFacing }) {
  const look = useBanner()
  const key = buildingArtKey(id, Math.max(1, level), facing)
  const m = isPaintedBuilding(id) ? undefined : BUILDING_FLAGS[key]
  const src = buildingImage(id, level, facing)
  const mirror = (id === 'liman' || id === 'tersane') && facing === 'right'
  if (!m) return <img className={className} src={src} alt={alt} draggable={false} decoding="async" style={mirror ? { transform: 'scaleX(-1)' } : undefined} />
  const [W, H, list] = m
  return <span className={`building-art ${className ?? ''}`} style={{ aspectRatio: `${W} / ${H}`, transform: mirror ? 'scaleX(-1)' : undefined }}>
    <img src={src} alt={alt} draggable={false} />
    {list.map(([fx, fy, fw, fh], i) => <FlagCloth key={i} look={look} style={{
      left: `${(fx / W) * 100}%`, top: `${(fy / H) * 100}%`, width: `${(fw * 1.2 / W) * 100}%`, height: `${(fh * 1.25 / H) * 100}%`,
    }} />)}
  </span>
}
