/** G2 resource art: phone-size painted WebP; public component signatures stay compatible. */
import type { SVGProps, ImgHTMLAttributes } from 'react'
import { asset } from '@/lib/asset'
type P = SVGProps<SVGSVGElement>
const INK = '#3a2410'
const Svg = ({ children, ...p }: P) => <svg viewBox="0 0 32 32" width={24} height={24} {...p}>{children}</svg>
function ResourceImage({ artId, className, width = 24, height = 24, children: _children, ref: _ref, ...props }: P & { artId: string }) {
  return <img {...props as unknown as ImgHTMLAttributes<HTMLImageElement>} alt="" aria-hidden="true"
    src={asset(`/images/game/icons/res-${artId}.webp`)} width={width} height={height}
    className={`painted-icon painted-resource-icon${className ? ` ${className}` : ''}`} />
}
export function AkceArt(p: P) { return <ResourceImage {...p} artId="akce" /> }
export function KeresteArt(p: P) { return <ResourceImage {...p} artId="kereste" /> }
export function IlimArt(p: P) { return <ResourceImage {...p} artId="ilim" /> }
export function KahveArt(p: P) { return <ResourceImage {...p} artId="kahve" /> }
export function MermerArt(p: P) { return <ResourceImage {...p} artId="mermer" /> }
export function KristalArt(p: P) { return <ResourceImage {...p} artId="kristal" /> }
export function KukurtArt(p: P) { return <ResourceImage {...p} artId="kukurt" /> }
export function NufusArt(p: P) { return <ResourceImage {...p} artId="nufus" /> }
export function HamleArt(p: P) { return <ResourceImage {...p} artId="sefer" /> }
export function HuzurArt(p: P) { return <ResourceImage {...p} artId="huzur" /> }
export function YolsuzlukArt(p: P) { return <ResourceImage {...p} artId="yolsuzluk" /> }

/** Kum saati (süre, bekleme): ahşap başlıklar, cam haznelerde akan kum. */
export function KumSaatiArt(p: P) {
  return <Svg {...p}>
    <rect x="7" y="3" width="18" height="3.4" rx="1.2" fill="#8a5a22" stroke={INK} strokeWidth="1" />
    <rect x="7" y="25.6" width="18" height="3.4" rx="1.2" fill="#8a5a22" stroke={INK} strokeWidth="1" />
    <path d="M9 6.4 V9 q0 4 6 7 q-6 3 -6 7 v2.6 M23 6.4 V9 q0 4 -6 7 q6 3 6 7 v2.6" stroke="#6b4424" strokeWidth="1.6" fill="none" />
    <path d="M10.5 6.8 h11 v1.6 q0 3.6 -5.5 7.2 q-5.5 -3.6 -5.5 -7.2 Z" fill="#dff0f2" stroke={INK} strokeWidth="0.9" />
    <path d="M10.5 25.2 h11 v-1.4 q0 -3.6 -5.5 -7.4 q-5.5 3.8 -5.5 7.4 Z" fill="#dff0f2" stroke={INK} strokeWidth="0.9" />
    <path d="M12.5 9.6 h7 q-1.2 2.6 -3.5 4.4 q-2.3 -1.8 -3.5 -4.4 Z" fill="#e2b25a" />
    <path d="M11.4 25 h9.2 q-0.6 -3.2 -4.6 -4.6 q-4 1.4 -4.6 4.6 Z" fill="#e2b25a" />
    <path d="M16 15.8 V20.6" stroke="#e2b25a" strokeWidth="1.1" />
    <path d="M12 8 q1 4 3.4 6" stroke="#ffffff" strokeWidth="0.9" fill="none" opacity="0.8" />
  </Svg>
}
