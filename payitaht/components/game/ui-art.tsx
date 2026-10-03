/**
 * BOYALI ARAYÜZ İKONLARI (V2 Faz 1.3) — kaynak simgeleriyle (resource-art)
 * aynı dil: koyu mürekkep kontur, renkli gövde, sol üstten ışık ve hafif
 * gölge. G2 ana menü ikonları WebP, küçük glifler ui-icon-data.ts'ten gelir; her ikonun
 * amacına uygun bir malzemesi (pirinç, çelik, ahşap, al, yeşil, deniz,
 * parşömen, taş) vardır.
 *
 * Lucide bileşenleriyle aynı adları ve aynı arayüzü taşır (className, size,
 * aria-*, data-*): import satırını değiştirmek yeter.
 */
import { createElement, type SVGProps, type ImgHTMLAttributes } from 'react'
import { asset } from '@/lib/asset'
import { ICON_DATA, type IconName, type IconNode } from './ui-icon-data'

const PAINTED_ICONS: Partial<Record<IconName, string>> = { Castle: 'city', TreePalm: 'island', Compass: 'map', Shield: 'alliance', ScrollText: 'objectives', Flag: 'flag', Anchor: 'harbour', Landmark: 'divan', Gift: 'offer' }

const INK = '#3a2410'

type Tone = { body: string; light: string; fill: string }
const TONES = {
  brass: { body: '#d9a63c', light: '#fff0b5', fill: '#f2d488' },
  steel: { body: '#a9b4b8', light: '#f4fbff', fill: '#d8e0e2' },
  wood: { body: '#a86b34', light: '#f0c48c', fill: '#d49a5c' },
  red: { body: '#c4362a', light: '#ffb3a3', fill: '#e8705e' },
  green: { body: '#4f9a2a', light: '#d6f5b0', fill: '#86c95a' },
  sea: { body: '#3f86b4', light: '#c9ecff', fill: '#7cbde2' },
  parch: { body: '#e3c88e', light: '#fffaf0', fill: '#f5e6bf' },
  stone: { body: '#c2ae86', light: '#fbf1d9', fill: '#e2d3b0' },
  skin: { body: '#d8a272', light: '#ffe2c4', fill: '#efc49c' },
  night: { body: '#4b5fa8', light: '#d4ddff', fill: '#8496d8' },
} satisfies Record<string, Tone>
type ToneName = keyof typeof TONES

/** Varsayılan pirinç; amacına göre malzeme. */
const TONE_OF: Partial<Record<IconName, ToneName>> = {
  Swords: 'steel', Shield: 'steel', ShieldCheck: 'steel', LockKeyhole: 'steel', Anchor: 'steel', Pickaxe: 'steel', Settings: 'steel', Scale: 'steel',
  Hammer: 'wood', Truck: 'wood', Store: 'wood', Warehouse: 'wood', Ship: 'wood', Coffee: 'wood', House: 'wood', Home: 'wood',
  X: 'red', Flame: 'red', TriangleAlert: 'red', Flag: 'red', Megaphone: 'red', Trash2: 'red', Bug: 'red', UserMinus: 'red',
  Check: 'green', CalendarCheck: 'green', ListChecks: 'green', TreePine: 'green', TreePalm: 'green', Sprout: 'green', TrendingUp: 'green', UserPlus: 'green', BookmarkCheck: 'green',
  Waves: 'sea', Eye: 'sea', Mail: 'sea', Send: 'sea', Info: 'sea', Download: 'sea', Upload: 'sea', HardDrive: 'sea', WifiOff: 'sea', Music: 'sea', Volume2: 'sea', Vibrate: 'sea', FlaskConical: 'sea',
  ScrollText: 'parch', Scroll: 'parch', Newspaper: 'parch', BookOpen: 'parch', Bookmark: 'parch', Skull: 'parch',
  Castle: 'stone', Landmark: 'stone',
  Users: 'skin', UserRound: 'skin', Handshake: 'skin', HeartHandshake: 'skin',
  Moon: 'night',
}

const CLOSED = (tag: string, attrs: Record<string, string>) =>
  tag === 'circle' || tag === 'rect' || tag === 'ellipse' || tag === 'polygon' || (tag === 'path' && /z\s*$/i.test(attrs.d ?? ''))

function shapes(node: IconNode, only?: (tag: string, a: Record<string, string>) => boolean) {
  return node.filter(([t, a]) => !only || only(t, a)).map(([tag, attrs], i) => createElement(tag, { key: i, ...attrs }))
}

export type IconProps = SVGProps<SVGSVGElement> & { size?: number | string; strokeWidth?: number | string; absoluteStrokeWidth?: boolean }

function make(name: IconName) {
  const node = ICON_DATA[name] as IconNode
  const tone = TONES[TONE_OF[name] ?? 'brass']
  const kebab = name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
  function PaintedIcon({ size = 24, strokeWidth: _sw, absoluteStrokeWidth: _abs, color: _color, className, children: _children, ref: _ref, ...rest }: IconProps) {
    const painted = PAINTED_ICONS[name]
    const tiny = (typeof size === 'number' && size < 16) || /(?:^|\s)(?:size|w)-[1-3](?:\.5)?(?:\s|$)/.test(className ?? '')
    if (painted && !tiny) return <img {...rest as unknown as ImgHTMLAttributes<HTMLImageElement>} src={asset(`/images/game/icons/ui-${painted}.webp`)} alt="" aria-hidden="true" width={size} height={size} className={`pi pi-${kebab} painted-icon painted-ui-icon${className ? ` ${className}` : ''}`} />
    return <svg viewBox="-1.5 -1.5 27 27" width={size} height={size} fill="none" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" className={`pi pi-${kebab}${className ? ` ${className}` : ''}`} {...rest}>
      <g transform="translate(0.7 1)" stroke="#2a1608" strokeOpacity="0.32" strokeWidth="4">{shapes(node)}</g>
      <g fill={tone.fill} stroke="none">{shapes(node, CLOSED)}</g>
      <g stroke={INK} strokeWidth="3.6">{shapes(node)}</g>
      <g stroke={tone.body} strokeWidth="2.1">{shapes(node)}</g>
      <g transform="translate(-0.35 -0.45)" stroke={tone.light} strokeWidth="0.8" opacity="0.85">{shapes(node)}</g>
    </svg>
  }
  PaintedIcon.displayName = name
  return PaintedIcon
}

export const Anchor = make('Anchor')
export const ArrowLeft = make('ArrowLeft')
export const ArrowUp = make('ArrowUp')
export const ArrowUpRight = make('ArrowUpRight')
export const Award = make('Award')
export const Bell = make('Bell')
export const BookOpen = make('BookOpen')
export const Bookmark = make('Bookmark')
export const BookmarkCheck = make('BookmarkCheck')
export const Bug = make('Bug')
export const CalendarCheck = make('CalendarCheck')
export const Castle = make('Castle')
export const Check = make('Check')
export const ChevronDown = make('ChevronDown')
export const ChevronLeft = make('ChevronLeft')
export const ChevronRight = make('ChevronRight')
export const ChevronsLeft = make('ChevronsLeft')
export const ChevronsRight = make('ChevronsRight')
export const Coffee = make('Coffee')
export const Coins = make('Coins')
export const Compass = make('Compass')
export const Crown = make('Crown')
export const Download = make('Download')
export const Eye = make('Eye')
export const Flag = make('Flag')
export const Flame = make('Flame')
export const FlaskConical = make('FlaskConical')
export const FlipHorizontal2 = make('FlipHorizontal2')
export const Gift = make('Gift')
export const Hammer = make('Hammer')
export const Handshake = make('Handshake')
export const HardDrive = make('HardDrive')
export const HeartHandshake = make('HeartHandshake')
export const Home = make('Home')
export const House = make('House')
export const Info = make('Info')
export const Landmark = make('Landmark')
export const ListChecks = make('ListChecks')
export const LockKeyhole = make('LockKeyhole')
export const Mail = make('Mail')
export const Megaphone = make('Megaphone')
export const Minus = make('Minus')
export const Moon = make('Moon')
export const Move = make('Move')
export const Music = make('Music')
export const Newspaper = make('Newspaper')
export const Pencil = make('Pencil')
export const Pickaxe = make('Pickaxe')
export const Pin = make('Pin')
export const Play = make('Play')
export const Plus = make('Plus')
export const Repeat = make('Repeat')
export const RotateCcw = make('RotateCcw')
export const RotateCw = make('RotateCw')
export const Scale = make('Scale')
export const Scroll = make('Scroll')
export const ScrollText = make('ScrollText')
export const Send = make('Send')
export const Settings = make('Settings')
export const Shield = make('Shield')
export const ShieldCheck = make('ShieldCheck')
export const Ship = make('Ship')
export const Skull = make('Skull')
export const Sparkles = make('Sparkles')
export const Sprout = make('Sprout')
export const Store = make('Store')
export const Sun = make('Sun')
export const Sunset = make('Sunset')
export const Swords = make('Swords')
export const Trash2 = make('Trash2')
export const TreePalm = make('TreePalm')
export const TreePine = make('TreePine')
export const TrendingUp = make('TrendingUp')
export const TriangleAlert = make('TriangleAlert')
export const Trophy = make('Trophy')
export const Truck = make('Truck')
export const Undo2 = make('Undo2')
export const Upload = make('Upload')
export const UserMinus = make('UserMinus')
export const UserPlus = make('UserPlus')
export const UserRound = make('UserRound')
export const Users = make('Users')
export const Vibrate = make('Vibrate')
export const Volume2 = make('Volume2')
export const Warehouse = make('Warehouse')
export const Waves = make('Waves')
export const WifiOff = make('WifiOff')
export const X = make('X')
