/**
 * ARAŞTIRMA AMBLEMLERİ — her araştırmaya kendi motifi (64x64 vektör).
 * Çerçeve dalın rengini taşır: ekonomi altın-toprak, bilim lacivert,
 * askerî al, denizcilik deniz mavisi. Sekiz köşeli yıldız (Selçuklu-Osmanlı
 * süslemesi) madalyonun kenarıdır; motif ortada mürekkep çizgisiyle durur.
 */
import type { ReactNode } from 'react'
import { RESEARCH, type ResearchBranch, type ResearchId } from '@/lib/game/engine'

const INK = '#2a1a10', GOLD = '#e2bd78', PAPER = '#f6ecd6', STEEL = '#b9c2c8', WOOD = '#8a5a35', RED = '#b3261e', SEA = '#4f9bb5'
const BRANCH: Record<ResearchBranch, [string, string]> = {
  ekonomi: ['#f1d9a0', '#b58a3a'],
  bilim: ['#cfe0ef', '#3d5f8a'],
  askeri: ['#f0c4b4', '#9a3324'],
  denizcilik: ['#cfe8ee', '#2f7a92'],
  mitoloji: ['#e3d3f0', '#6a4a8a'],
}
const S = { stroke: INK, strokeWidth: 1.4, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const }

/* ------------------------------------------------------------ motif parçaları */
const Hammer = () => <g {...S}><path d="M24 44 L38 28" strokeWidth="3" stroke={WOOD} /><path d="M33 22 L44 22 L44 29 L36 29 Z" fill={STEEL} /></g>
const Crates = () => <g {...S}>{[[20, 34], [33, 34], [26.5, 22]].map(([x, y]) => <g key={x + y}><rect x={x} y={y} width="12" height="12" fill={WOOD} /><path d={`M${x} ${y} l12 12 M${x + 12} ${y} l-12 12`} strokeWidth="0.8" /></g>)}</g>
const Scales = () => <g {...S} fill="none"><path d="M32 18 V44 M24 46 H40 M20 24 H44" /><path d="M20 24 L15 34 H25 Z M44 24 L39 34 H49 Z" fill={GOLD} /></g>
const Pulley = () => <g {...S}><path d="M32 16 V22" /><circle cx="32" cy="28" r="7" fill={STEEL} /><circle cx="32" cy="28" r="2" fill={INK} /><path d="M25 28 V44 M39 28 V38" fill="none" /><rect x="35" y="38" width="8" height="7" fill={WOOD} /></g>
const Divider = () => <g {...S} fill="none"><path d="M32 16 L22 46 M32 16 L42 46" strokeWidth="2" /><circle cx="32" cy="17" r="2.5" fill={GOLD} /><path d="M18 40 A16 16 0 0 1 46 40" strokeDasharray="2 2" /></g>
const Level = () => <g {...S}><path d="M20 44 L32 20 L44 44 Z" fill="none" strokeWidth="2" /><path d="M24 36 H40" /><path d="M32 20 V38" strokeWidth="0.8" /><circle cx="32" cy="39" r="2" fill={GOLD} /></g>
const Axe = () => <g {...S}><path d="M22 44 L40 22" stroke={WOOD} strokeWidth="3" /><path d="M36 18 Q46 20 44 30 L38 26 Z" fill={STEEL} /><ellipse cx="26" cy="46" rx="8" ry="3" fill={WOOD} /></g>
const Chisel = () => <g {...S}><rect x="16" y="32" width="18" height="14" fill="#d8c6a0" /><path d="M16 38 H34 M25 32 V38" strokeWidth="0.8" /><path d="M36 30 L46 18" stroke={WOOD} strokeWidth="3" /><path d="M33 33 L37 29" stroke={STEEL} strokeWidth="3" /></g>
const Plan = () => <g {...S}><rect x="17" y="17" width="30" height="30" fill={PAPER} />{[24, 31, 38].map(v => <path key={v} d={`M${v} 17 V47 M17 ${v} H47`} strokeWidth="0.8" />)}<rect x="24" y="24" width="7" height="7" fill={RED} /><rect x="31" y="31" width="7" height="7" fill={GOLD} /></g>
const Storehouse = () => <g {...S}><rect x="16" y="30" width="32" height="16" fill="#d8c6a0" /><path d="M20 30 A6 6 0 0 1 32 30 M32 30 A6 6 0 0 1 44 30" fill={STEEL} /><path d="M29 46 V38 A3 3 0 0 1 35 38 V46" fill={INK} /></g>
const DomeArch = () => <g {...S}><path d="M18 46 V32 H46 V46" fill="#f4efe4" /><path d="M22 32 A10 10 0 0 1 42 32" fill={STEEL} /><path d="M32 22 V18" /><path d="M24 46 V38 A3 3 0 0 1 30 38 V46 M34 46 V38 A3 3 0 0 1 40 38 V46" fill={INK} /></g>
const Book = () => <g {...S}><path d="M32 24 Q24 20 16 22 V44 Q24 42 32 46 Q40 42 48 44 V22 Q40 20 32 24 Z" fill={PAPER} /><path d="M32 24 V46" /><path d="M20 28 H28 M20 32 H28 M36 28 H44 M36 32 H44" strokeWidth="0.8" /></g>
const Scroll = () => <g {...S}><rect x="20" y="20" width="24" height="24" fill={PAPER} /><path d="M18 20 H46 M18 44 H46" strokeWidth="3" stroke={WOOD} /><path d="M24 27 H40 M24 31 H40 M24 35 H36" strokeWidth="0.8" /></g>
const Ink = () => <g {...S}><path d="M22 46 H38 V36 Q30 30 22 36 Z" fill="#3a2d24" /><path d="M36 38 L46 16" stroke={GOLD} strokeWidth="2" /><path d="M46 16 L44 22" /></g>
const Gear = ({ cx = 32, cy = 32, r = 10 }: { cx?: number; cy?: number; r?: number }) => <g {...S}>
  {Array.from({ length: 8 }, (_, i) => <rect key={i} x={cx - 2.5} y={cy - r - 4} width="5" height="6" fill={STEEL} transform={`rotate(${i * 45} ${cx} ${cy})`} />)}
  <circle cx={cx} cy={cy} r={r} fill={STEEL} /><circle cx={cx} cy={cy} r={r * 0.35} fill={INK} /></g>
const Swords = () => <g {...S}><path d="M18 44 Q30 30 44 18" stroke="#6f7c85" strokeWidth="3" fill="none" /><path d="M46 44 Q34 30 20 18" stroke="#6f7c85" strokeWidth="3" fill="none" /><path d="M16 40 L22 46 M48 40 L42 46" stroke={GOLD} strokeWidth="2.5" /></g>
const Wall = () => <g {...S}><path d="M14 46 V30 H22 V26 H26 V30 H30 V26 H34 V30 H38 V26 H42 V30 H50 V46 Z" fill="#d8c6a0" /><rect x="40" y="20" width="10" height="26" fill="#d8c6a0" /><path d="M29 46 V38 A3 3 0 0 1 35 38 V46" fill={INK} /></g>
const Target = () => <g {...S}><circle cx="36" cy="30" r="12" fill={PAPER} /><circle cx="36" cy="30" r="7" fill={RED} /><circle cx="36" cy="30" r="2.5" fill={PAPER} /><path d="M14 46 L34 30" stroke={WOOD} strokeWidth="2" /></g>
const Shield = () => <g {...S}><circle cx="32" cy="32" r="13" fill={GOLD} /><circle cx="32" cy="32" r="8" fill={STEEL} /><circle cx="32" cy="32" r="2.5" fill={RED} /></g>
const Keg = ({ spark = true }: { spark?: boolean }) => <g {...S}><path d="M22 24 Q20 34 22 44 H40 Q42 34 40 24 Z" fill={WOOD} /><path d="M21 30 H41 M21 38 H41" stroke={INK} strokeWidth="1.2" />{spark && <><path d="M40 24 Q46 18 44 14" fill="none" /><circle cx="44" cy="13" r="3" fill="#f2a53a" stroke="none" /></>}</g>
const Cauldron = () => <g {...S}><path d="M18 30 H46 Q46 46 32 46 Q18 46 18 30 Z" fill="#3a3540" /><path d="M24 26 q2 -4 0 -8 M32 26 q2 -4 0 -8 M40 26 q2 -4 0 -8" stroke="#8a8478" fill="none" /></g>
const Compass = () => <g {...S}><circle cx="32" cy="32" r="13" fill={PAPER} /><path d="M32 17 L35 32 L32 47 L29 32 Z" fill={RED} /><path d="M17 32 L32 29 L47 32 L32 35 Z" fill={INK} /><circle cx="32" cy="32" r="2" fill={GOLD} /></g>
const Sail = () => <g {...S}><path d="M30 14 V44" /><path d="M31 16 Q46 26 44 40 L31 40 Z" fill={PAPER} /><path d="M16 46 Q32 52 48 46 L44 42 H20 Z" fill={WOOD} /></g>
const Map = () => <g {...S}><path d="M16 20 L26 17 L38 21 L48 18 V44 L38 47 L26 43 L16 46 Z" fill={PAPER} /><path d="M26 17 V43 M38 21 V47" strokeWidth="0.8" /><path d="M20 38 Q28 26 36 34 T44 24" stroke={RED} strokeDasharray="2 2" fill="none" /></g>
const Hook = () => <g {...S}><path d="M18 16 H46 M40 16 V26" strokeWidth="2" /><path d="M40 26 Q46 30 40 34 Q36 34 36 31" fill="none" strokeWidth="1.6" /><rect x="24" y="34" width="14" height="12" fill={WOOD} /></g>
const Hull = () => <g {...S}><path d="M12 32 H52 L46 44 Q32 48 18 44 Z" fill={WOOD} />{[18, 24, 30, 36, 42].map(x => <path key={x} d={`M${x} 32 V44`} strokeWidth="0.8" />)}<path d="M12 32 H52" stroke={GOLD} strokeWidth="2" /></g>
const Grapes = () => <g {...S}><path d="M32 18 Q34 14 40 14" stroke="#4f7d4a" strokeWidth="2" fill="none" /><path d="M34 16 Q44 16 42 24 Q36 22 34 16 Z" fill="#5f8c3e" />{[[28, 24], [36, 24], [24, 30], [32, 30], [40, 30], [28, 36], [36, 36], [32, 42]].map(([x, y]) => <circle key={x * 100 + y} cx={x} cy={y} r="4" fill="#5b2a5a" />)}</g>
const Alembic = () => <g {...S}><circle cx="26" cy="36" r="9" fill="#7fcf9a" /><path d="M26 27 V20 Q26 16 32 16 L46 24" fill="none" strokeWidth="2" /><path d="M44 22 L48 30" /><circle cx="48" cy="33" r="3" fill="#7fcf9a" /><path d="M22 34 q4 3 8 0" stroke={PAPER} fill="none" /></g>
const Vase = () => <g {...S}><path d="M28 16 H36 V20 Q46 28 40 44 H24 Q18 28 28 20 Z" fill="#4fa3c7" /><path d="M26 30 Q32 34 38 30" stroke={PAPER} fill="none" /></g>
const Spectacles = () => <g {...S} fill="none"><circle cx="23" cy="34" r="7" fill="#dff0f5" /><circle cx="41" cy="34" r="7" fill="#dff0f5" /><path d="M30 34 Q32 31 34 34 M16 33 L12 26 M48 33 L52 26" strokeWidth="1.8" /></g>
const Mortar = () => <g {...S}><path d="M18 32 H46 L42 46 H22 Z" fill="#d8c6a0" /><path d="M36 30 L46 14" stroke={WOOD} strokeWidth="3" /><path d="M20 30 q4 -6 8 0" stroke="#4f7d4a" fill="#5f8c3e" /></g>
const Ram = () => <g {...S}><path d="M16 26 L32 16 L48 26 Z" fill={WOOD} /><rect x="18" y="26" width="28" height="12" fill={WOOD} /><path d="M10 34 H40" strokeWidth="4" stroke="#4a3020" /><circle cx="24" cy="42" r="4" fill={WOOD} /><circle cx="40" cy="42" r="4" fill={WOOD} /></g>
const Catapult = () => <g {...S}><rect x="16" y="40" width="32" height="5" fill={WOOD} /><path d="M24 40 L32 26 L40 40" fill="none" stroke={WOOD} strokeWidth="2" /><path d="M20 30 L46 16" stroke={WOOD} strokeWidth="3" /><circle cx="46" cy="15" r="3.5" fill="#8a8478" /></g>
const FireWave = () => <g {...S}><path d="M32 14 Q42 24 36 32 Q40 26 34 22 Q34 30 28 32 Q22 24 32 14 Z" fill="#f2a53a" /><path d="M14 40 q6 -4 12 0 t12 0 t12 0" stroke={SEA} strokeWidth="2.5" fill="none" /></g>
const Cannon = ({ ship = false }: { ship?: boolean }) => <g {...S}>{ship && <path d="M12 38 H52 L46 48 H18 Z" fill={WOOD} />}<path d={ship ? 'M22 36 L44 26 L46 30 L24 40 Z' : 'M16 38 L44 24 L47 30 L19 44 Z'} fill="#5b5550" /><circle cx={ship ? 26 : 22} cy={ship ? 41 : 44} r="5" fill={WOOD} /></g>
const Padlock = () => <g {...S}><path d="M24 30 V24 A8 8 0 0 1 40 24 V30" fill="none" strokeWidth="3" /><rect x="20" y="30" width="24" height="16" rx="2" fill={GOLD} /><circle cx="32" cy="37" r="2.5" fill={INK} /></g>
const Coins = () => <g {...S}>{[0, 1, 2, 3].map(i => <ellipse key={i} cx={28} cy={42 - i * 5} rx="10" ry="3.5" fill={GOLD} />)}<circle cx="42" cy="28" r="7" fill={GOLD} /><path d="M40 28 H44 M42 25 V31" strokeWidth="0.8" /></g>
const Lanterns = () => <g {...S}><path d="M14 18 Q32 28 50 18" fill="none" />{[20, 32, 44].map((x, i) => <g key={x}><path d={`M${x} ${21 + (i === 1 ? 4 : 0)} v3`} /><ellipse cx={x} cy={29 + (i === 1 ? 4 : 0)} rx="4.5" ry="6" fill={[RED, GOLD, '#3f8d8a'][i]} /></g>)}<path d="M28 44 A7 7 0 1 0 36 40 A5 5 0 1 1 28 44 Z" fill={GOLD} stroke="none" /></g>
const Pot = () => <g {...S}><path d="M20 28 H44 V40 Q44 46 32 46 Q20 46 20 40 Z" fill="#b8872e" /><path d="M18 28 H46" strokeWidth="2.5" /><path d="M26 24 q2 -4 0 -8 M34 24 q2 -4 0 -8" stroke="#8a8478" fill="none" /></g>
const Tools = () => <g {...S}><path d="M18 46 L42 18" stroke={WOOD} strokeWidth="2.5" /><path d="M38 14 Q46 18 46 24 L40 20 Z" fill={STEEL} /><path d="M46 46 L22 18" stroke={WOOD} strokeWidth="2.5" /><path d="M18 16 H28 L24 22 Z" fill={STEEL} /></g>
const Seal = () => <g {...S}><rect x="18" y="16" width="28" height="30" fill={PAPER} /><path d="M22 22 H42 M22 26 H42 M22 30 H36" strokeWidth="0.8" /><circle cx="38" cy="40" r="6" fill={RED} /><path d="M36 45 L34 50 M40 45 L42 50" stroke={RED} strokeWidth="2" /></g>
const Tugra = () => <g {...S} fill="none"><path d="M22 44 Q20 26 24 18 M28 44 Q27 28 30 18 M34 44 Q34 28 36 18" strokeWidth="2" /><path d="M18 36 Q34 28 46 36 Q34 44 18 36 Z" /><path d="M40 30 Q50 24 46 16" strokeWidth="1.8" /><circle cx="44" cy="40" r="2" fill={GOLD} /></g>
const SunCity = () => <g {...S}>{Array.from({ length: 9 }, (_, i) => <path key={i} d="M32 26 L32 12" transform={`rotate(${-80 + i * 20} 32 30)`} stroke={GOLD} strokeWidth="1.6" />)}<path d="M14 46 V36 H20 V32 H26 V38 H30 A4 4 0 0 1 38 38 H42 V34 H48 V46 Z" fill="#f4efe4" /></g>
const Well = () => <g {...S}><path d="M20 34 H44 V46 H20 Z" fill="#d8c6a0" /><path d="M20 38 H44" strokeWidth="0.8" /><path d="M22 34 V20 M42 34 V20 M18 20 H46" stroke={WOOD} strokeWidth="2" /><path d="M32 20 V28" /><rect x="29" y="28" width="6" height="5" fill={WOOD} /></g>
const Eye = () => <g {...S}><path d="M12 32 Q32 14 52 32 Q32 50 12 32 Z" fill={PAPER} /><circle cx="32" cy="32" r="8" fill="#3d5f8a" /><circle cx="32" cy="32" r="3.5" fill={INK} /><circle cx="34" cy="30" r="1.2" fill={PAPER} stroke="none" /></g>
const Kavuk = () => <g {...S}><ellipse cx="32" cy="38" rx="14" ry="8" fill={PAPER} /><path d="M20 36 Q32 30 44 38 M20 40 Q32 34 44 42" strokeWidth="0.8" fill="none" /><path d="M28 30 Q32 14 36 30" fill={RED} /><path d="M32 22 Q40 12 42 18" stroke={GOLD} strokeWidth="2" fill="none" /><circle cx="32" cy="30" r="2.5" fill={GOLD} /></g>
const Rose = () => <g {...S}><path d="M32 46 V30" stroke="#4f7d4a" strokeWidth="2" /><path d="M32 38 Q24 36 22 30 Q30 30 32 36" fill="#5f8c3e" /><circle cx="32" cy="24" r="8" fill={RED} /><path d="M28 24 Q32 18 36 24 Q32 28 28 24" stroke="#7a1a14" fill="none" /></g>
const Bone = () => <g {...S}><path d="M22 42 L40 24" strokeWidth="5" stroke={PAPER} /><circle cx="20" cy="41" r="3" fill={PAPER} /><circle cx="23" cy="45" r="3" fill={PAPER} /><circle cx="41" cy="22" r="3" fill={PAPER} /><circle cx="44" cy="26" r="3" fill={PAPER} /><path d="M18 22 L30 32" stroke={STEEL} strokeWidth="2" /></g>
const Crystal = () => <g {...S}><path d="M26 22 L32 14 L38 22 L32 32 Z" fill="#b8a3e0" /><path d="M22 34 H42 L38 46 H26 Z" fill="#7fcf9a" /><circle cx="30" cy="40" r="1.5" fill={PAPER} /><circle cx="35" cy="37" r="1" fill={PAPER} /></g>
const MosqueDome = () => <g {...S}><path d="M18 46 V34 H46 V46 Z" fill="#f4efe4" /><path d="M22 34 A10 10 0 0 1 42 34" fill={STEEL} /><path d="M32 24 V20" /><path d="M30 18 A3 3 0 1 0 34 16 A2.2 2.2 0 1 1 30 18 Z" fill={GOLD} /><path d="M12 46 V22 M52 46 V22" strokeWidth="2" /><path d="M11 22 L12 16 L13 22 M51 22 L52 16 L53 22" fill={STEEL} /></g>
const Bird = () => <g {...S}><path d="M14 30 Q24 20 32 30 Q40 20 50 30 Q40 26 32 34 Q24 26 14 30 Z" fill="#6d7a86" /><circle cx="32" cy="32" r="2" fill={INK} /></g>
const Press = () => <g {...S}><path d="M18 46 V18 H46 V46" fill="none" stroke={WOOD} strokeWidth="2.5" /><path d="M32 18 V28" strokeWidth="2" /><rect x="24" y="28" width="16" height="4" fill={STEEL} /><rect x="22" y="38" width="20" height="4" fill={PAPER} /><path d="M26 22 H38" /></g>
const Dock = () => <g {...S}><path d="M14 46 V28 A8 8 0 0 1 30 28 V46 M34 46 V28 A8 8 0 0 1 50 28 V46" fill="#d8c6a0" /><path d="M16 40 H28 L26 44 H18 Z M36 40 H48 L46 44 H38 Z" fill={WOOD} /></g>
const Bork = () => <g {...S}><path d="M22 44 H42 L38 18 Q28 14 20 26 Z" fill={PAPER} /><rect x="21" y="40" width="22" height="5" fill={GOLD} /><path d="M31 40 V30" stroke={GOLD} strokeWidth="2.5" /></g>
const Medal = () => <g {...S}><path d="M26 14 L32 26 L38 14" stroke={RED} strokeWidth="4" fill="none" /><path d="M32 24 L35 31 L43 31 L37 36 L39 44 L32 39 L25 44 L27 36 L21 31 L29 31 Z" fill={GOLD} /></g>
const Arc = () => <g {...S}><path d="M14 44 Q30 6 50 40" fill="none" strokeDasharray="3 2" /><circle cx="50" cy="40" r="4" fill="#3d3a37" /><path d="M12 46 L22 38" stroke="#5b5550" strokeWidth="4" /></g>
const Casting = () => <g {...S}><path d="M14 22 H28 L26 30 H16 Z" fill="#b8872e" /><path d="M24 30 Q26 36 30 38" stroke="#f2a53a" strokeWidth="2.5" fill="none" /><path d="M26 42 L48 32 L50 38 L28 48 Z" fill="#5b5550" /></g>
const Skull = () => <g {...S}><path d="M18 46 L46 18 M46 46 L18 18" stroke={STEEL} strokeWidth="2.5" /><path d="M22 28 Q22 16 32 16 Q42 16 42 28 Q42 34 38 36 V40 H26 V36 Q22 34 22 28 Z" fill={PAPER} /><circle cx="28" cy="28" r="3" fill={INK} /><circle cx="36" cy="28" r="3" fill={INK} /></g>
const Island = () => <g {...S}><path d="M12 42 q10 -4 20 0 t20 0" stroke={SEA} strokeWidth="2" fill="none" /><path d="M18 40 Q32 28 46 40 Z" fill="#c9b58c" /><path d="M32 34 V16" /><path d="M32 16 L42 19 L32 23 Z" fill={RED} /></g>
const Tar = () => <g {...S}><Keg spark={false} /><path d="M31 44 V50 Q31 53 33 50 V44" fill="#1c1a18" /><path d="M22 24 H40" stroke="#1c1a18" strokeWidth="3" /></g>
const Globe = () => <g {...S}><circle cx="32" cy="32" r="13" fill="#9cc7d6" /><path d="M24 24 Q30 28 28 34 Q24 38 22 34 Z M36 22 Q42 26 40 32 Q44 38 38 42 Q34 36 36 30 Z" fill="#8aa55a" /><path d="M19 32 H45" strokeWidth="0.8" /></g>
const Boat = () => <g {...S}><path d="M14 36 H50 L44 44 H20 Z" fill={WOOD} />{[20, 28, 36, 44].map(x => <path key={x} d={`M${x} 38 L${x - 6} 48`} stroke={WOOD} />)}<path d="M32 36 V18 L42 30 Z" fill={PAPER} /></g>
const SupplyShip = () => <g {...S}><path d="M12 36 H52 L46 46 H18 Z" fill={WOOD} />{[18, 26, 34].map(x => <rect key={x} x={x} y="28" width="7" height="8" fill="#b8872e" />)}<path d="M44 36 V16" /><path d="M44 18 H52 L44 24 Z" fill="#2f6b4c" /></g>
const MortarGun = () => <g {...S}><rect x="16" y="40" width="32" height="6" fill={WOOD} /><path d="M24 40 L22 26 H38 L36 40 Z" fill="#5b5550" /><ellipse cx="30" cy="26" rx="8" ry="2.5" fill="#2a2a2a" /><circle cx="44" cy="16" r="3.5" fill="#3d3a37" /></g>
const Wings = () => <g {...S}><path d="M30 34 Q14 16 8 24 Q12 26 10 30 Q16 30 14 34 Q22 34 30 38 Z M34 34 Q50 16 56 24 Q52 26 54 30 Q48 30 50 34 Q42 34 34 38 Z" fill={PAPER} /><circle cx="32" cy="30" r="4" fill="#3d5f8a" /></g>
const Rocket = () => <g {...S}><path d="M20 44 L40 20 L46 24 L26 48 Z" fill={WOOD} /><path d="M40 20 L50 12 L46 24 Z" fill={RED} /><path d="M20 44 Q12 48 12 54 Q18 52 22 48" fill="#f2a53a" /></g>
const Crossbow = () => <g {...S}><path d="M14 30 Q32 18 50 30" fill="none" stroke={WOOD} strokeWidth="3" /><path d="M14 30 L32 34 L50 30" fill="none" strokeWidth="0.8" /><path d="M32 22 V48" stroke={WOOD} strokeWidth="3" /><path d="M32 16 L29 22 H35 Z" fill={STEEL} /></g>
const Periscope = () => <g {...S}><path d="M10 34 q8 -4 16 0 t16 0 t16 0" stroke={SEA} strokeWidth="2" fill="none" /><path d="M16 42 Q32 34 48 42 Q32 50 16 42 Z" fill="#6a5a3a" /><path d="M32 38 V18 H38" strokeWidth="2.5" fill="none" /><circle cx="40" cy="18" r="2" fill={GOLD} /></g>
const Steam = () => <g {...S}><Gear cx={26} cy={38} r={8} /><rect x="38" y="22" width="8" height="24" fill="#3a3a3e" /><circle cx="42" cy="16" r="4" fill="#dcd6cc" stroke="none" /><circle cx="48" cy="12" r="3" fill="#dcd6cc" stroke="none" /></g>
const Architect = () => <g {...S}><DomeArch /><path d="M40 16 L48 16 L44 24 Z" fill={GOLD} /></g>
const Scholars = () => <g {...S}><Book /><path d="M32 14 l1.5 3 3.4 0.4 -2.5 2.3 0.7 3.3 -3.1 -1.7 -3.1 1.7 0.7 -3.3 -2.5 -2.3 3.4 -0.4 Z" fill={GOLD} /></g>
const PenGear = () => <g><Gear cx={26} cy={36} r={8} /><g {...S}><path d="M36 42 L48 18" stroke={GOLD} strokeWidth="2.5" /><path d="M36 42 L34 46" /></g></g>

/* Mitoloji: ongun direği, balbal, kopuz, kam davulu, tamga, gök kutu. */
const Totem = () => <g {...S}><rect x="29" y="22" width="6" height="26" fill={WOOD} /><path d="M29 30 H35 M29 38 H35" strokeWidth="0.8" /><path d="M32 22 Q22 16 18 20 Q24 22 26 26 Q30 20 32 22 Q34 20 38 26 Q40 22 46 20 Q42 16 32 22 Z" fill={GOLD} /><circle cx="32" cy="18" r="2.5" fill={PAPER} /></g>
const Balbal = () => <g {...S}><path d="M24 48 V22 Q24 14 32 14 Q40 14 40 22 V48 Z" fill="#b7ae9c" /><circle cx="29" cy="24" r="1.3" fill={INK} /><circle cx="35" cy="24" r="1.3" fill={INK} /><path d="M29 30 Q32 32 35 30 M26 38 Q32 36 38 38 M28 42 L32 36" strokeWidth="1" fill="none" /></g>
const Kopuz = () => <g {...S}><path d="M22 40 Q16 30 24 26 Q32 24 34 32 Q36 42 26 44 Z" fill={WOOD} /><circle cx="26" cy="34" r="2.5" fill={INK} /><path d="M32 28 L46 14" stroke={WOOD} strokeWidth="3" /><path d="M44 12 L48 16" strokeWidth="2" /><path d="M24 30 L44 14 M26 32 L46 16" strokeWidth="0.6" /></g>
const Drum = () => <g {...S}><ellipse cx="32" cy="32" rx="14" ry="15" fill="#e8d6b0" /><ellipse cx="32" cy="32" rx="14" ry="15" fill="none" strokeWidth="2.4" stroke={WOOD} /><path d="M32 19 V45 M20 28 H44" stroke={RED} strokeWidth="1.2" /><circle cx="26" cy="24" r="2" fill={RED} stroke="none" /><circle cx="38" cy="40" r="2" fill={RED} stroke="none" /><path d="M44 44 L50 50" stroke={WOOD} strokeWidth="2.5" /></g>
const Tamga = () => <g {...S} fill="none"><path d="M24 44 L32 20 L40 44" strokeWidth="3" stroke={RED} /><path d="M20 26 Q32 34 44 26" strokeWidth="3" stroke={RED} /><circle cx="32" cy="16" r="2.5" fill={GOLD} /></g>
const Kut = () => <g {...S}><circle cx="32" cy="32" r="12" fill="#9fc3e6" /><path d="M32 22 l2.6 5.3 5.8 0.8 -4.2 4.1 1 5.8 -5.2 -2.7 -5.2 2.7 1 -5.8 -4.2 -4.1 5.8 -0.8 Z" fill={GOLD} />{Array.from({ length: 8 }, (_, i) => <path key={i} d="M32 16 V12" transform={`rotate(${i * 45} 32 32)`} stroke={GOLD} strokeWidth="2" />)}</g>

/** Her araştırmanın motifi. */
const MOTIF: Record<ResearchId, () => ReactNode> = {
  tools: Hammer, storage: Crates, ticaret: Scales, makara: Pulley, geometri: Divider, su_terazisi: Level,
  ormancilik: Axe, tascilik: Chisel, kent_planlama: Plan, ambar_teknigi: Storehouse,
  architecture: Architect, alimler: Scholars, kagit: Scroll, murekkep: Ink, mekanik_kalem: PenGear,
  celik: Swords, istihkam: Wall, talim: Target, zirh: Shield, barut: () => <Keg />, askeri_lojistik: Cauldron,
  pusula: Compass, yelken: Sail, haritacilik: Map, yukleme: Hook, gemi_govdesi: Hull,
  bagcilik: Grapes, simya: Alembic, camcilik: Vase, optik: Spectacles, tip: Mortar,
  muhendislik: Ram, kusatma: Catapult, rum_atesi: FireWave, deniz_topculugu: () => <Cannon ship />,
  koruma: Padlock, zenginlik: Coins, tatil: Lanterns, mutfak: Pot, yardim_eli: Tools, yasama: Seal,
  burokrasi: Tugra, utopya: SunCity, kuyu: Well, casusluk: Eye, devlet: Kavuk, kultur: Rose, anatomi: Bone,
  deney: Crystal, din: MosqueDome, kus_ucusu: Bird, matbaa: Press,
  kuru_havuz: Dock, meslek_ordusu: Bork, seref: Medal, balistik: Arc, top_dokum: Casting,
  guverte: () => <Cannon ship />, korsanlik: Skull, genisleme: Island, zift: Tar, yabanci_kultur: Globe,
  hafif_tekne: Boat, ikmal: SupplyShip, havan: MortarGun,
  kanat: Wings, roket: Rocket, zenberek: Crossbow, dalgic: Periscope, buhar: Steam,
  ongun_toresi: Totem, balbal: Balbal, destan: Kopuz, kam_ayini: Drum, tore: Tamga, gok_kutu: Kut,
}

/** Sekiz köşeli yıldız çerçeve (iki iç içe kare). */
const star = (r: number) => {
  const pts: string[] = []
  for (let i = 0; i < 16; i++) {
    const a = (Math.PI / 8) * i - Math.PI / 2
    const rr = i % 2 === 0 ? r : r * 0.86
    pts.push(`${(32 + rr * Math.cos(a)).toFixed(2)},${(32 + rr * Math.sin(a)).toFixed(2)}`)
  }
  return pts.join(' ')
}

export type EmblemState = 'done' | 'active' | 'open' | 'locked'
export function ResearchEmblem({ id, size = 56, state = 'open' }: { id: ResearchId; size?: number; state?: EmblemState }) {
  const [light, dark] = BRANCH[RESEARCH[id].branch]
  const gid = `re-${RESEARCH[id].branch}`
  const Motif = MOTIF[id]
  return <svg viewBox="0 0 64 64" width={size} height={size} role="img" aria-label={RESEARCH[id].name} className={`research-emblem is-${state}`}>
    <defs><radialGradient id={gid} cx="50%" cy="38%" r="65%"><stop offset="0" stopColor={light} /><stop offset="1" stopColor={dark} /></radialGradient></defs>
    <polygon points={star(31)} fill={dark} stroke="#6a4a1a" strokeWidth="1" />
    <polygon points={star(28)} fill={`url(#${gid})`} stroke={GOLD} strokeWidth="1.2" />
    <circle cx="32" cy="32" r="21" fill={PAPER} opacity="0.55" />
    <Motif />
    {state === 'done' && <g><circle cx="52" cy="52" r="8" fill="#2f6b4c" stroke={PAPER} strokeWidth="1.5" /><path d="M48 52 L51 55 L56 49" stroke={PAPER} strokeWidth="2" fill="none" strokeLinecap="round" /></g>}
  </svg>
}
