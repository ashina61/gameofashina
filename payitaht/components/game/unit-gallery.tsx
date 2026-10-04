'use client'
/**
 * BİRLİK GALERİSİ (görsel brif 2, bina sayfası): Kışla, Tersane ve Elçilik
 * sayfasının başında birliklerin büyük boyalı portreleri. Dokunulan birlik
 * seçilir; eğitim kartı galerinin altında açılır. Kilitli birlik (bina
 * seviyesi ya da araştırma eksik) soluk ve kilitli görünür.
 */
import { useEffect, useRef } from 'react'
import { RESEARCH, UNITS, type Game, type UnitId } from '@/lib/game/engine'
import { asset } from '@/lib/asset'
import { LockKeyhole, ShieldCheck, Swords } from './ui-art'
import { NufusArt } from './resource-art'

export function unitLock(game: Game, id: UnitId): string | null {
  const u = UNITS[id]
  if (game.buildings[u.home] < u.level) return `Sv. ${u.level}`
  if (u.tech && !game.research.includes(u.tech)) return RESEARCH[u.tech].name
  return null
}

export function UnitGallery({ game, units, chosen, onPick }: { game: Game; units: UnitId[]; chosen?: UnitId; onPick: (id: UnitId) => void }) {
  const sea = units.some(id => UNITS[id].branch === 'deniz')
  const field = asset(`/images/game/terrain/${sea ? 'battle-sea' : 'battle-land'}.webp`)
  const strip = useRef<HTMLDivElement>(null)
  // Seçilen birlik şeridin görünür kısmına kayar (sayfa dikeyde kaymaz).
  useEffect(() => {
    const row = strip.current, tile = row?.querySelector<HTMLElement>('[aria-selected="true"]')
    if (row && tile && (tile.offsetLeft < row.scrollLeft || tile.offsetLeft + tile.offsetWidth > row.scrollLeft + row.clientWidth)) {
      row.scrollTo({ left: tile.offsetLeft - 8, behavior: 'smooth' })
    }
  }, [chosen])
  return <div ref={strip} className="unit-gallery" role="listbox" aria-label="Birlikler · yana kaydır">
    {units.map(id => {
      const u = UNITS[id], lock = unitLock(game, id)
      return <button key={id} type="button" role="option" aria-selected={id === chosen}
        className={`unit-tile${lock ? ' is-locked' : ''}`} onClick={() => onPick(id)}
        aria-label={`${u.name}${lock ? `, kilitli: ${lock}` : `, elde ${game.army[id]}`}`}>
        <span className="unit-tile-art" style={{ backgroundImage: `url(${field})` }}>
          <img src={asset(`/images/game/units/${id}.webp`)} alt="" loading="lazy" decoding="async" draggable={false} />
          {game.army[id] > 0 && <b className="unit-tile-have">{game.army[id]}</b>}
          {lock && <span className="unit-tile-lock"><LockKeyhole aria-hidden="true" />{lock}</span>}
        </span>
        <strong>{u.name}</strong>
        <span className="unit-tile-stats" aria-hidden="true">
          <span><Swords />{u.attack}</span><span><ShieldCheck />{u.defense}</span><span><NufusArt />{u.pop}</span>
        </span>
      </button>
    })}
  </div>
}
