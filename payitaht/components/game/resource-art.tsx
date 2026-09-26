/**
 * KAYNAK RESİMLERİ — akçe, kereste, taş, ilim, dört lüks mal, nüfus ve hamle
 * için küçük boyalı simgeler (Ikariam'daki kaynak resimleri gibi). Lucide
 * simgeleriyle aynı arayüzü taşırlar (className, aria-hidden...), böylece
 * bütün oyun tek yerden bu resimlere geçer.
 */
import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement>
const INK = '#3a2410'
const Svg = ({ children, ...p }: P) => <svg viewBox="0 0 32 32" width={24} height={24} {...p}>{children}</svg>

/** Akçe: üst üste gümüş-altın sikkeler, en üstte tuğralı yüz. */
export function AkceArt(p: P) {
  const coin = (y: number, k: number) => <g key={k}>
    <ellipse cx="16" cy={y + 2.2} rx="11" ry="4.2" fill="#a8741c" stroke={INK} strokeWidth="1" />
    <ellipse cx="16" cy={y} rx="11" ry="4.2" fill="#f0c95a" stroke={INK} strokeWidth="1" />
  </g>
  return <Svg {...p}>
    {coin(24, 0)}{coin(19.5, 1)}{coin(15, 2)}
    <ellipse cx="16" cy="15" rx="7.4" ry="2.6" fill="none" stroke="#b8862a" strokeWidth="0.9" />
    <path d="M12.5 15.2 q1.5 -2 3 0 t3 0 M14 13.8 v1.4" stroke="#8a5a14" strokeWidth="0.9" fill="none" strokeLinecap="round" />
    <path d="M7.5 13.6 q3 -2.4 7 -2.8" stroke="#fff6cc" strokeWidth="1.1" fill="none" strokeLinecap="round" opacity="0.8" />
  </Svg>
}

/** Kereste: üçgen istiflenmiş üç kütük, uçlarında yıllık halkalar. */
export function KeresteArt(p: P) {
  const log = (x: number, y: number, k: number) => <g key={k}>
    <rect x={x - 11} y={y - 4.5} width="11" height="9" rx="1" fill="#9a6232" stroke={INK} strokeWidth="1" />
    <circle cx={x} cy={y} r="4.6" fill="#e6c08a" stroke={INK} strokeWidth="1" />
    <circle cx={x} cy={y} r="2.6" fill="none" stroke="#b07a44" strokeWidth="0.8" />
    <circle cx={x} cy={y} r="0.9" fill="#b07a44" />
  </g>
  return <Svg {...p}>{log(17, 23, 0)}{log(27, 23, 1)}{log(22, 14.5, 2)}
    <path d="M7 20.5 h8 M12 12 h8" stroke="#c48a52" strokeWidth="1" strokeLinecap="round" />
  </Svg>
}

/** Taş: kesme taş blokları. */
export function TasArt(p: P) {
  const block = (x: number, y: number, w: number, h: number, k: number) => <g key={k}>
    <path d={`M${x} ${y} l${w} 0 l3 -3 l-${w} 0 Z`} fill="#e8dcc2" stroke={INK} strokeWidth="1" strokeLinejoin="round" />
    <path d={`M${x + w} ${y} l3 -3 v${h} l-3 3 Z`} fill="#9d8c72" stroke={INK} strokeWidth="1" strokeLinejoin="round" />
    <rect x={x} y={y} width={w} height={h} fill="#cdbb98" stroke={INK} strokeWidth="1" />
  </g>
  return <Svg {...p}>{block(3, 20, 12, 8, 0)}{block(15, 20, 12, 8, 1)}{block(9, 12, 12, 8, 2)}
    <path d="M6 24 h4 M19 25 h5 M12 16 h5" stroke="#a8977a" strokeWidth="0.9" strokeLinecap="round" />
  </Svg>
}

/** İlim: yanan kandil (bilginin ışığı). */
export function IlimArt(p: P) {
  return <Svg {...p}>
    <circle cx="16" cy="9" r="7" fill="#ffe7a0" opacity="0.45" />
    <path d="M16 3.5 q3.2 4 0.2 8.5 q-3.4 -3.6 -0.2 -8.5 Z" fill="#f5a623" stroke="#b5561a" strokeWidth="0.9" />
    <path d="M16 7 q1.2 2 0 3.8 q-1.4 -1.6 0 -3.8 Z" fill="#fff3c2" />
    <path d="M5 17 q0 7 11 7 q9 0 11.5 -5 l1.5 -2.5 q-4 1.5 -6 0.5 Q20 13 13 13 q-8 0 -8 4 Z" fill="#c9832e" stroke={INK} strokeWidth="1" strokeLinejoin="round" />
    <path d="M7 17 q4 2.2 13 1" stroke="#f0c070" strokeWidth="1.1" fill="none" strokeLinecap="round" />
    <path d="M5.5 18 q-3 -1 -2.5 2.5 q0.6 2.6 4 2" stroke={INK} strokeWidth="1.3" fill="none" />
    <rect x="12" y="24" width="8" height="3.5" rx="1" fill="#a4652a" stroke={INK} strokeWidth="1" />
  </Svg>
}

/** Üzüm (şarap): mor salkım, yaprak ve çubuk. */
export function UzumArt(p: P) {
  const grapes: [number, number][] = [[11, 12], [16, 11.5], [21, 12], [13.5, 16.5], [18.5, 16.5], [11, 21], [16, 21], [21, 20.5], [13.5, 25], [18.5, 25], [16, 28.5]]
  return <Svg {...p}>
    <path d="M16 11 V5 q2 -2 5 -1.5" stroke="#6b4424" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    <path d="M17 6 q6 -4 11 0 q-4 5 -11 0 Z" fill="#6f9a3e" stroke={INK} strokeWidth="1" />
    {grapes.map(([x, y], i) => <g key={i}><circle cx={x} cy={y} r="3.3" fill="#7a3b8c" stroke={INK} strokeWidth="0.9" /><circle cx={x - 1} cy={y - 1.1} r="0.9" fill="#d9b4e6" /></g>)}
  </Svg>
}

/** Mermer: damarlı beyaz blok. */
export function MermerArt(p: P) {
  return <Svg {...p}>
    <path d="M5 11 l8 -6 h14 l-8 6 Z" fill="#ffffff" stroke={INK} strokeWidth="1" strokeLinejoin="round" />
    <path d="M19 11 l8 -6 v16 l-8 6 Z" fill="#c9ccd2" stroke={INK} strokeWidth="1" strokeLinejoin="round" />
    <rect x="5" y="11" width="14" height="16" fill="#eceef1" stroke={INK} strokeWidth="1" />
    <path d="M7 14 q3 3 1 6 t3 6 M12 11.5 q2 4 5 5 M20.5 12 q2 4 0 8 M9 7.5 q5 1 9 -1" stroke="#8d95a3" strokeWidth="0.9" fill="none" strokeLinecap="round" />
  </Svg>
}

/** Kristal: turkuaz kristal kümesi. */
export function KristalArt(p: P) {
  const shard = (d: string, fill: string, k: number) => <path key={k} d={d} fill={fill} stroke={INK} strokeWidth="1" strokeLinejoin="round" />
  return <Svg {...p}>
    {shard('M7 28 l-2 -9 l4 -5 l4 6 l-1 8 Z', '#6fb8c4', 0)}
    {shard('M21 28 l1 -10 l4 -4 l3 6 l-2 8 Z', '#5aa3b3', 1)}
    {shard('M11 28 l-1 -14 l6 -10 l6 10 l-1 14 Z', '#9fdbe3', 2)}
    <path d="M16 4 v24 M10 14 l6 3 l6 -3" stroke="#e8fbff" strokeWidth="0.9" fill="none" opacity="0.8" />
    <path d="M13.5 9 l2 -3" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" />
  </Svg>
}

/** Kükürt: sarı kükürt yığını, üstünde duman. */
export function KukurtArt(p: P) {
  return <Svg {...p}>
    <path d="M13 9 q-2 -3 1 -5 q2 -1 1 -3 M19 9 q2 -3 -1 -5" stroke="#b7b0a0" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.8" />
    <path d="M3 27 q2 -10 9 -12 q3 -4 7 -2 q7 1 10 14 Z" fill="#e8c83a" stroke={INK} strokeWidth="1" strokeLinejoin="round" />
    <path d="M9 20 q3 -2 5 0 M16 16 q3 -1 5 1 M19 22 q3 -1 5 1 M11 25 q2 -1 4 0" stroke="#b8961c" strokeWidth="1" fill="none" strokeLinecap="round" />
    <path d="M8 22 q2 -4 5 -5" stroke="#fff4a8" strokeWidth="1.2" fill="none" strokeLinecap="round" />
  </Svg>
}

/** Nüfus: fesli bir şehirli. */
export function NufusArt(p: P) {
  return <Svg {...p}>
    <path d="M6 30 q0 -10 10 -10 q10 0 10 10 Z" fill="#3f6f9a" stroke={INK} strokeWidth="1" />
    <path d="M14 20 l2 5 l2 -5" fill="#f6ecd6" stroke={INK} strokeWidth="0.8" />
    <circle cx="16" cy="14" r="5.5" fill="#e8b98a" stroke={INK} strokeWidth="1" />
    <path d="M11.2 11 l1 -6 h7.6 l1 6 Z" fill="#b3261e" stroke={INK} strokeWidth="1" strokeLinejoin="round" />
    <path d="M19.5 5 q3 1 2.5 5" stroke="#1d1d1d" strokeWidth="1" fill="none" />
    <path d="M14 16.5 q2 1.2 4 0" stroke={INK} strokeWidth="0.8" fill="none" strokeLinecap="round" />
  </Svg>
}

/** Hamle puanı: ay-yıldızlı kırlangıç sancak. */
export function HamleArt(p: P) {
  return <Svg {...p}>
    <path d="M7 3 V29" stroke="#5e3c22" strokeWidth="2" strokeLinecap="round" />
    <circle cx="7" cy="3" r="1.6" fill="#e2bd78" />
    <path d="M8 5 H27 L22 11 L27 17 H8 Z" fill="#b3261e" stroke={INK} strokeWidth="1" strokeLinejoin="round" />
    <circle cx="15" cy="11" r="3.4" fill="#fff" /><circle cx="16.2" cy="11" r="2.8" fill="#b3261e" />
    <path d="M19.4 11 l-1.6 0.5 1 -1.3 v1.6 l-1 -1.3 Z" fill="#fff" />
  </Svg>
}
