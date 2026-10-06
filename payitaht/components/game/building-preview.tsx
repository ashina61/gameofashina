'use client'

import { useEffect, useRef } from 'react'
import { BUILDINGS, MAX_LEVEL, type BuildingId, type Game } from '@/lib/game/engine'
import { buildingImage } from '@/lib/asset'
import { UpgradeDock } from './building-page'
import { BuildingEffects } from './game-panels'
import { GameButton } from './game-button'
import { ChevronRight, X } from './ui-art'

/** Modeless building inspector: the city remains animated and touchable. */
export function BuildingPreview({ game, id, onClose, onDetails, onBuild }: {
  game: Game; id: BuildingId
  onClose: () => void; onDetails: () => void; onBuild: () => void
}) {
  const building = BUILDINGS[id]
  const level = game.buildings[id]
  const closeButton = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const previous = document.activeElement
    const close = closeButton.current
    close?.focus({ preventScroll: true })
    return () => {
      // Do not steal focus from another building, navigation, or a detail page.
      if (previous instanceof HTMLElement && previous.isConnected &&
        (document.activeElement === document.body || document.activeElement === close)) {
        previous.focus({ preventScroll: true })
      }
    }
  }, [])
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [onClose])
  const facing = id === 'liman' || id === 'tersane' ? game.coastFacing[id] : undefined
  return <section className="building-inspector" role="dialog" aria-modal="false" aria-labelledby="building-inspector-title">
    <header className="building-inspector-header">
      <div>
        <small>{building.category} · {level ? `Seviye ${level}` : 'Kurulmadı'}</small>
        <h2 id="building-inspector-title">{building.name}</h2>
      </div>
      <button ref={closeButton} type="button" className="building-inspector-close" onClick={onClose} aria-label="Binayı kapat"><X /></button>
    </header>
    <div className="building-inspector-content">
      <div className="building-inspector-summary">
        {building.art && <img src={buildingImage(id, Math.max(1, level), facing)} alt="" width={112} height={112} decoding="async" />}
        <p>{building.description}</p>
      </div>
      <BuildingEffects game={game} id={id} level={level} max={MAX_LEVEL[id]} />
    </div>
    <GameButton variant="ghost" className="building-inspector-details" onClick={onDetails}>
      Yapıyı yönet <ChevronRight aria-hidden="true" />
    </GameButton>
    <UpgradeDock game={game} id={id} onBuild={onBuild} />
  </section>
}
