/**
 * ŞEHİR NİŞANLARI: kırlangıç kuyruklu sancak üstünde motif. Adada şehrin
 * etiketinde, Divanhane'de ve şehir listesinde görünür.
 */
import type { EmblemId } from '@/lib/game/empire'

const INK = '#2a1a10', GOLD = '#e2bd78', PAPER = '#f6ecd6', RED = '#b3261e'
const MOTIF: Record<EmblemId, React.ReactNode> = {
  sancak: <g><circle cx="24" cy="24" r="7" fill={PAPER} /><circle cx="26.5" cy="24" r="5.8" fill={RED} /><path d="M33 24 l-3 1 2 -2.6 v3.2 l-2 -2.6 Z" fill={PAPER} /></g>,
  lale: <g stroke={INK} strokeWidth="0.8"><path d="M24 34 V24" stroke="#3f6a37" strokeWidth="1.6" /><path d="M24 26 Q17 22 19 13 Q22 17 24 14 Q26 17 29 13 Q31 22 24 26 Z" fill={RED} /><path d="M24 31 Q18 29 17 24 Q22 26 24 29" fill="#4f7d4a" /></g>,
  zeytin: <g stroke={INK} strokeWidth="0.7"><path d="M16 32 Q24 22 32 14" stroke="#5e3c22" strokeWidth="1.4" fill="none" />{[[19, 27], [23, 22], [27, 18], [22, 29], [27, 24]].map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx="3.4" ry="1.6" transform={`rotate(-40 ${x} ${y})`} fill="#6f9a3e" />)}<circle cx="30" cy="22" r="1.8" fill="#3a4a2a" /></g>,
  gemi: <g stroke={INK} strokeWidth="0.8"><path d="M13 27 H35 L31 33 H17 Z" fill="#8a5a35" /><path d="M24 27 V12" /><path d="M24 13 L33 24 H24 Z" fill={PAPER} /><path d="M13 35 q3 -2 6 0 t6 0 t6 0 t6 0" stroke="#4f9bb5" fill="none" /></g>,
  kule: <g stroke={INK} strokeWidth="0.8"><path d="M17 34 V18 H20 V15 H23 V18 H25 V15 H28 V18 H31 V34 Z" fill="#d9c7a1" /><path d="M22 34 V28 A2 2 0 0 1 26 28 V34" fill={INK} /><rect x="22.5" y="21" width="3" height="3.5" fill={INK} /></g>,
  kartal: <g fill={INK}><path d="M24 16 L21 20 L15 17 L17 22 L12 22 L18 26 L20 31 L24 28 L28 31 L30 26 L36 22 L31 22 L33 17 L27 20 Z" fill={GOLD} stroke={INK} strokeWidth="0.8" /><circle cx="21" cy="17" r="1.6" fill={GOLD} stroke={INK} strokeWidth="0.6" /><circle cx="27" cy="17" r="1.6" fill={GOLD} stroke={INK} strokeWidth="0.6" /></g>,
  yildiz: <g><rect x="16" y="16" width="16" height="16" fill={GOLD} stroke={INK} strokeWidth="0.8" /><rect x="16" y="16" width="16" height="16" fill={GOLD} stroke={INK} strokeWidth="0.8" transform="rotate(45 24 24)" /><circle cx="24" cy="24" r="3.5" fill={RED} stroke={INK} strokeWidth="0.6" /></g>,
  tugra: <g fill="none" stroke={GOLD} strokeWidth="1.6" strokeLinecap="round"><path d="M16 30 Q24 36 32 30 Q28 26 24 30 Q20 26 16 30 Z" /><path d="M20 30 V14 M24 30 V12 M28 30 V14" /><path d="M14 26 Q10 20 16 18" /></g>,
}
export function CityEmblem({ id = 'sancak', size = 40, locked = false }: { id?: EmblemId; size?: number; locked?: boolean }) {
  return <svg viewBox="0 0 48 52" width={size} height={size * 52 / 48} aria-hidden="true" className={locked ? 'city-emblem-art is-locked' : 'city-emblem-art'}>
    <path d="M6 4 H42 V40 L24 50 L6 40 Z" fill={id === 'sancak' ? RED : '#7a1f16'} stroke={GOLD} strokeWidth="2" />
    <path d="M9 7 H39 V38 L24 46.5 L9 38 Z" fill={id === 'sancak' ? RED : '#5e3c22'} opacity="0.35" />
    {MOTIF[id]}
  </svg>
}
