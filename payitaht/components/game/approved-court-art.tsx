'use client'
import { asset } from '@/lib/asset'
import type { BannerId, CrestId } from '@/lib/game/profile'
import { CrestSymbol } from './profile-panel'
import { BANNER_OUTLINES } from '@/lib/game/banner-shapes'

export function ApprovedArt({ name, className }: { name: string; className?: string }) {
  return <img className={`royal-art${className ? ` ${className}` : ''}`} src={asset(`/images/game/ui/approved-court/${name}.webp`)} alt="" decoding="async" />
}

/** Real saved identity: embroidered vertical standard, with the selected outline. */
export function RoyalStandard({ crest, color, banner }: { crest: CrestId; color: string; banner: BannerId }) {
  const silhouette = [[0,0],[100,0],[100,15], ...[...BANNER_OUTLINES[banner]].reverse().map(([u,v]) => [27 + v * 63, 12.4 + u * 66]), [27,100],[0,100]].map(([x,y]) => `${x}% ${y}%`).join(', ')
  return <div className="royal-standard" style={{ '--standard-color': color, '--royal-cloth-mask': `url("${asset('/images/game/ui/approved-court/cloth-mask.webp')}")`, '--standard-silhouette': `polygon(${silhouette})` } as React.CSSProperties} aria-label="Hükümdarın sancağı"><ApprovedArt name="standard" /><div className="royal-standard-tint" /><svg className="royal-embroidery" viewBox="14 14 38 38" aria-hidden="true"><CrestSymbol crest={crest} /></svg></div>
}
