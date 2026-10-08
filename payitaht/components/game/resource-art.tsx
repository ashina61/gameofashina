/** G2 resource art: phone-size painted WebP; public component signatures stay compatible. */
import type { SVGProps, ImgHTMLAttributes } from 'react'
import { asset } from '@/lib/asset'
type P = SVGProps<SVGSVGElement>
function ResourceImage({ artId, className, width = 24, height = 24, children: _children, ref: _ref, ...props }: P & { artId: string }) {
  return <img {...props as unknown as ImgHTMLAttributes<HTMLImageElement>} alt="" aria-hidden="true"
    src={asset(`/images/game/icons/res-${artId}.webp`)} width={width} height={height}
    className={`painted-icon painted-resource-icon${className ? ` ${className}` : ''}`} />
}
export function AkceArt(p: P) { return <ResourceImage {...p} artId="akce" /> }
export function KeresteArt(p: P) { return <ResourceImage {...p} artId="kereste" /> }
export function IlimArt(p: P) { return <ResourceImage width={28} height={28} {...p} className={`knowledge-icon ${p.className ?? ''}`} artId="ilim-v2" /> }
export function KahveArt(p: P) { return <ResourceImage {...p} artId="kahve" /> }
export function MermerArt(p: P) { return <ResourceImage {...p} artId="mermer" /> }
export function KristalArt(p: P) { return <ResourceImage {...p} artId="kristal" /> }
export function KukurtArt(p: P) { return <ResourceImage {...p} artId="kukurt" /> }
export function NufusArt(p: P) { return <ResourceImage {...p} artId="nufus" /> }
export function HamleArt(p: P) { return <ResourceImage {...p} artId="sefer" /> }
export function HuzurArt(p: P) { return <ResourceImage {...p} artId="huzur" /> }
export function YolsuzlukArt(p: P) { return <ResourceImage {...p} artId="yolsuzluk" /> }

/** Ortak boyalı kum saati: bütün maliyet, süre ve bekleme alanlarında. */
export function KumSaatiArt(p: P) { return <ResourceImage width={28} height={28} {...p} className={`duration-icon ${p.className ?? ''}`} artId="sure" /> }
