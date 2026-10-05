'use client'
import { asset } from '@/lib/asset'
import type { BannerId, CrestId } from '@/lib/game/profile'

export function ApprovedArt({ name, className }: { name: string; className?: string }) {
  return <img className={`royal-art${className ? ` ${className}` : ''}`} src={asset(`/images/game/ui/approved-court/${name}.webp`)} alt="" decoding="async" />
}

/** Painted, transparent gold-thread applique, shared by preview and chooser. */
export function RoyalCrest({ crest }: { crest: CrestId }) {
  return <img className="royal-embroidery" src={asset(`/images/game/ui/sancaktar/crest-${crest}.webp`)} alt="" decoding="async" width={256} height={256} />
}
/** Each silhouette has its own painted cloth and border; tint touches only silver silk. */
export function RoyalStandard({ crest, color, banner }: { crest: CrestId; color: string; banner: BannerId }) {
  return <div className="royal-standard" style={{ '--standard-color': color, '--royal-cloth-mask': `url("${asset(`/images/game/ui/sancaktar/mask-${banner}.webp`)}")` } as React.CSSProperties} aria-label="Hükümdarın sancağı"><img className="royal-art" src={asset(`/images/game/ui/sancaktar/cloth-${banner}.webp`)} alt="" width={300} height={500} /><div className="royal-standard-tint" /><RoyalCrest crest={crest} /></div>
}
