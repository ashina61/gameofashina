'use client'
import { LUXURY_NAMES, RESOURCE_NAMES, formatRate, formatShort, growthRate, luxuryRates, population, rates, type Game } from '@/lib/game/engine'
import { luxuryIcons, resourceIcons } from './game-widgets'
import { NufusArt } from './resource-art'

export function PageStocks({ game, onOpen }: { game: Game; onOpen: () => void }) {
  const lux = game.mine.specialty
  const LuxIcon = luxuryIcons[lux]
  const coreRates = rates(game)
  const luxRate = luxuryRates(game)[lux]
  const items = [
    { key: 'gold', name: RESOURCE_NAMES.gold, value: game.resources.gold, rate: coreRates.gold, icon: <resourceIcons.gold aria-hidden="true" /> },
    { key: 'wood', name: RESOURCE_NAMES.wood, value: game.resources.wood, rate: coreRates.wood, icon: <resourceIcons.wood aria-hidden="true" /> },
    { key: 'lux', name: LUXURY_NAMES[lux], value: game.luxury[lux], rate: luxRate, icon: <LuxIcon aria-hidden="true" /> },
    { key: 'knowledge', name: RESOURCE_NAMES.knowledge, value: game.resources.knowledge, rate: coreRates.knowledge, icon: <resourceIcons.knowledge aria-hidden="true" /> },
    { key: 'population', name: 'Nüfus', value: population(game), rate: growthRate(game), icon: <NufusArt aria-hidden="true" /> },
  ]
  return <div className="page-stocks" role="group" aria-label="Şehrin kaynakları">
    {items.map(item => <button type="button" key={item.key} onClick={onOpen} aria-label={`${item.name}: ${Math.floor(item.value).toLocaleString('tr-TR')}. Hazineyi aç`}>
      {item.icon}<span>{item.name}</span><b>{formatShort(item.value)}</b><small>{formatRate(item.rate, true)}/dk</small>
    </button>)}
    <button type="button" className="page-stocks-plus" onClick={onOpen} aria-label="Hazineyi aç"><strong aria-hidden="true">+</strong></button>
  </div>
}
