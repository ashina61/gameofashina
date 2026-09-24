'use client'

/**
 * BOYALI ARAYÜZ — üst panel, alt menü, yan düğmeler ve görev kartı.
 *
 * Görseller assets/source/painted'dan tools/art/import-ui.py ile hazırlanır:
 * gömülü sayılar silinmiştir, canlı değerler burada yüzde konumlarla
 * üstüne yazılır. Konumlar kırpılmış görselin boyutuna göredir; görsel
 * değişirse yalnızca buradaki yüzdeler güncellenir.
 */
import { asset } from '@/lib/asset'
import { cn } from '@/lib/utils'
import {
  OBJECTIVES, capacity, fullResources, might, objectiveDone, population, rates, type Game, type Resource,
} from '@/lib/game/engine'

/** 2.400.000 -> "2,4M", 856.300 -> "856,3K", 12.480 -> "12.480" */
export function compact(n: number) {
  const v = Math.floor(n)
  if (v >= 1_000_000) return `${(v / 1_000_000).toLocaleString('tr-TR', { maximumFractionDigits: 1 })}M`
  if (v >= 100_000) return `${(v / 1000).toLocaleString('tr-TR', { maximumFractionDigits: 1 })}K`
  return v.toLocaleString('tr-TR')
}

const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']

/** Kırpılmış hud-top görselindeki değer alanları (yüzde). */
const RES_SLOTS: { id: Resource | 'people'; left: number; right: number }[] = [
  { id: 'gold', left: 9.2, right: 15.8 },
  { id: 'wood', left: 27.9, right: 36.3 },
  { id: 'stone', left: 46.2, right: 54.2 },
  { id: 'knowledge', left: 64.1, right: 72.0 },
  { id: 'people', left: 82.8, right: 97.8 },
]

export function TopHud({ game, cityName, onEconomy, onArmy, onProfile, onCities }: {
  game: Game; cityName: string
  onEconomy: () => void; onArmy: () => void; onProfile: () => void; onCities: () => void
}) {
  const full = fullResources(game)
  const now = new Date(game.updatedAt)
  const production = rates(game)
  return <header className="painted-hud">
    <img className="painted-hud-bg" src={asset('/images/ui/hud-top.webp')} alt="" />
    <button className="hud-hit hud-portrait" onClick={onProfile} aria-label="Hükümdar ve ayarlar" />
    <span className="hud-level" aria-label={`Divanhane seviyesi ${game.buildings.divan}`}>{game.buildings.divan}</span>
    <button className="hud-might" onClick={onArmy} aria-label={`Şehir gücü ${compact(might(game))}`}>{might(game).toLocaleString('tr-TR')}</button>
    <button className="hud-city" onClick={onCities} aria-label={`Şehir: ${cityName}. Şehirlerini aç`}>{cityName}</button>
    <span className="hud-date">{now.getDate()} {MONTHS[now.getMonth()]} 1526</span>
    {RES_SLOTS.map(slot => {
      const value = slot.id === 'people' ? population(game) : game.resources[slot.id]
      const isFull = slot.id !== 'people' && full.includes(slot.id)
      const rate = slot.id === 'people' ? 0 : production[slot.id]
      return <button key={slot.id} className={cn('hud-res', isFull && 'hud-res-full')} style={{ left: `${slot.left}%`, width: `${slot.right - slot.left}%` }}
        onClick={onEconomy}
        aria-label={`${slot.id === 'people' ? 'Nüfus' : slot.id}: ${Math.floor(value)}${isFull ? ', ambar dolu' : ''}`}
        title={slot.id === 'people' ? 'Nüfus' : `Ambar ${compact(capacity(game))} · +${Math.round(rate)}/dk`}>
        {compact(value)}{slot.id !== 'people' && rate > 0 && !isFull && <small>+{compact(rate)}/dk</small>}
      </button>
    })}
  </header>
}

/** Boyalı alt menü: görseldeki hücrelerin üstüne saydam düğmeler. */
const NAV_CELLS = [
  { key: 'city', left: 0.5, right: 20.1 },
  { key: 'build', left: 20.3, right: 34.9 },
  { key: 'army', left: 34.9, right: 50.2 },
  { key: 'research', left: 50.2, right: 65.8 },
  { key: 'cities', left: 65.8, right: 81.1 },
  { key: 'objectives', left: 81.1, right: 97.9 },
] as const
const NAV_LABELS: Record<typeof NAV_CELLS[number]['key'], string> = {
  city: 'Şehir', build: 'İnşa', army: 'Kışla', research: 'Araştırma', cities: 'Ticaret', objectives: 'Görevler',
}
export type NavKey = typeof NAV_CELLS[number]['key']

export function PaintedNav({ active, badges, onSelect }: {
  active: NavKey | null; badges: Partial<Record<NavKey, number>>; onSelect: (key: NavKey) => void
}) {
  return <nav className="painted-nav" aria-label="Oyun menüsü">
    <img src={asset('/images/ui/nav-bar.webp')} alt="" />
    {NAV_CELLS.map(cell => <button key={cell.key} className={cn('painted-nav-cell', active === cell.key && 'painted-nav-active')}
      style={{ left: `${cell.left}%`, width: `${cell.right - cell.left}%` }}
      aria-label={NAV_LABELS[cell.key]} aria-current={active === cell.key ? 'page' : undefined}
      onClick={() => onSelect(cell.key)}>
      {(badges[cell.key] ?? 0) > 0 && <span className="painted-badge painted-nav-badge">{badges[cell.key]}</span>}
    </button>)}
  </nav>
}

/** Sağdaki yuvarlak düğmeler. Rozet konumları import-ui.py çıktısından. */
export function SideButtons({ reports, rewards, onPosta, onEvents, onRewards }: {
  reports: number; rewards: number; onPosta: () => void; onEvents: () => void; onRewards: () => void
}) {
  return <div className="painted-side">
    <button onClick={onPosta} aria-label={`Posta: ${reports} yeni rapor`}>
      <img src={asset('/images/ui/side-posta.webp')} alt="" />
      <span className="painted-badge" style={{ left: '82.4%', top: '17.1%' }}>{reports > 0 ? Math.min(99, reports) : ''}</span>
    </button>
    <button onClick={onEvents} aria-label="Etkinlikler: şehir günlüğü">
      <img src={asset('/images/ui/side-etkinlik.webp')} alt="" />
    </button>
    <button onClick={onRewards} aria-label={`Ödüller: ${rewards} alınabilir ödül`}>
      <img src={asset('/images/ui/side-odul.webp')} alt="" />
      <span className="painted-badge" style={{ left: '81.1%', top: '15.6%' }}>{rewards > 0 ? rewards : ''}</span>
    </button>
  </div>
}

/** Sol üstteki görev kartı: sıradaki hedef. */
export function QuestCard({ game, onOpen }: { game: Game; onOpen: () => void }) {
  const objective = OBJECTIVES.find(o => !game.claimed.includes(o.id))
  if (!objective) return null
  const done = objectiveDone(game, objective.id)
  return <button className={cn('painted-quest', done && 'painted-quest-done')} onClick={onOpen} aria-label={`Görev: ${objective.title}`}>
    <img src={asset('/images/ui/quest-research.webp')} alt="" />
    <span className="painted-quest-text">{objective.description}</span>
    <span className="painted-quest-count">{done ? 'Ödül hazır' : `${game.claimed.length}/${OBJECTIVES.length}`}</span>
  </button>
}
