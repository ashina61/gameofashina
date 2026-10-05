'use client'
import { RESOURCE_IDS, RESOURCE_NAMES, formatShort, type Game } from '@/lib/game/engine'
import { resourceIcons } from './game-widgets'
export function PageStocks({ game, onOpen }: { game: Game; onOpen: () => void }) {
  return <div className="page-stocks" role="group" aria-label="Şehrin kaynakları">{RESOURCE_IDS.map(id => { const Icon = resourceIcons[id]; return <button type="button" key={id} onClick={onOpen} aria-label={`${RESOURCE_NAMES[id]}: ${Math.floor(game.resources[id]).toLocaleString('tr-TR')}. Hazineyi aç`}><Icon aria-hidden="true" /><span>{RESOURCE_NAMES[id]}</span><b>{formatShort(game.resources[id])}</b></button> })}</div>
}
