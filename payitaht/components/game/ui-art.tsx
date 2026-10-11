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
import { type SVGProps, type ImgHTMLAttributes } from 'react'
import { asset } from '@/lib/asset'
import type { IconName } from './ui-icon-data'

export type IconProps = SVGProps<SVGSVGElement> & { size?: number | string; strokeWidth?: number | string; absoluteStrokeWidth?: boolean; painted?: boolean }

/** One painted sprite per action; retain the existing component names and sizing. */
function make(name: IconName) {
  const kebab = name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
  function PaintedIcon({ size = 24, painted: _painted, strokeWidth: _sw, absoluteStrokeWidth: _abs, color: _color, className, children: _children, ref: _ref, style, ...rest }: IconProps) {
    return <img {...rest as unknown as ImgHTMLAttributes<HTMLImageElement>}
      src={asset(`/images/game/icons/painted/${name}.webp`)} alt="" aria-hidden="true"
      width={size} height={size} draggable={false}
      className={`pi pi-${kebab} painted-icon${className ? ` ${className}` : ''}`}
      style={{ objectFit: 'contain', ...style }} />
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
export const Search = make('Search')
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
