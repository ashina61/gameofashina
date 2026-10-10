'use client'
import { useState } from 'react'
import { activeCity, type Empire } from '@/lib/game/empire'
import { availableUnits, idleMerchants, totalMerchants } from '@/lib/game/expeditions'
import { armyUpkeep, garrisonLimit, garrisonUsed, idleWorkers, power, type BuildingId, type Game, type UnitId } from '@/lib/game/engine'
import { ArmyPanel, BattlefieldCard } from './game-panels'
import { CourtTabs } from './court-kit'
import { GameButton } from './game-button'
import { Flag, Anchor, ScrollText } from './ui-art'
import { DefenseSummary, SiegePanel } from './ikariam-panels'
import { DeployPanel, MissionList, type Run } from './world-panels'

type Tab = 'land' | 'sea' | 'missions'
const TABS = [{ id: 'land', label: 'Kara ordusu', Icon: Flag }, { id: 'sea', label: 'Donanma', Icon: Anchor }, { id: 'missions', label: 'Seferler', Icon: ScrollText }] as const
const n = (x: number) => x.toLocaleString('tr-TR', { maximumFractionDigits: 1 })
export function ArmyRegister({ game, empire, run, onRecruit, onBuild, onIsland }: { game: Game; empire: Empire; run: Run; onRecruit: (id: UnitId, count: number) => void; onBuild: (id: BuildingId) => void; onIsland: () => void }) {
  const [tab, setTab] = useState<Tab>('land')
  const city = activeCity(empire), free = availableUnits(empire, city.id)
  const branch = tab === 'sea' ? 'deniz' : 'kara', strength = power(game, branch)
  const home = tab === 'sea' ? 'tersane' : 'kisla'
  const missions = (empire.missions ?? []).filter(m => m.cityId === city.id)
  return <div className="muster-register">
    {(empire.sieges ?? []).some(s => s.cityId === city.id) && <details className="muster-support muster-siege"><summary>İşgal / abluka · savunma emirleri</summary><SiegePanel empire={empire} now={game.updatedAt} run={run} /></details>}
    <CourtTabs items={TABS} value={tab} onChange={setTab} label="Ordu ve donanma">
      {tab !== 'missions' ? <>
        <p className="muster-note">Boşta halk: <strong>{n(idleWorkers(game))}</strong> · Garnizon: <strong>{n(garrisonUsed(game, branch))} / {n(garrisonLimit(game, branch))}</strong></p>
        <details className="muster-support"><summary>Garnizon, güç ve bakım hesabı</summary><dl className="muster-summary">
          <div><dt>Boşta halk</dt><dd>{n(idleWorkers(game))}</dd></div>
          <div><dt>{tab === 'sea' ? 'Deniz' : 'Kara'} garnizonu</dt><dd>{n(garrisonUsed(game, branch))} / {n(garrisonLimit(game, branch))}</dd></div>
          <div><dt>Kayıtlı güç</dt><dd>{n(strength.attack)} saldırı · {n(strength.defense)} savunma</dd></div>
          <div><dt>Toplam ordu bakımı</dt><dd>{n(armyUpkeep(game))} akçe/dk</dd></div>
        </dl>
        <p className="muster-note">Kayıtlı birlikler seferdekileri de içerir. Kullanılabilir sayı, şu an yeni bir emre ayrılabilen birlikleri gösterir. Eğitim halktan yer ayırır.</p></details>
        {!game.buildings[home] && <GameButton onClick={() => onBuild(home)}>{tab === 'sea' ? 'Tersane' : 'Kışla'} inşa et</GameButton>}
        <ArmyPanel key={tab} game={game} home={home} onRecruit={onRecruit} onBuild={onBuild} register available={free} />
        {tab === 'land' && <details className="muster-support"><summary>Casus yetiştir</summary><ArmyPanel game={game} home="elcilik" onRecruit={onRecruit} onBuild={onBuild} register available={free} /></details>}
        {tab === 'sea' && <section className="muster-support"><h2>Ticaret filosu</h2><p>{n(totalMerchants(empire))} ortak gemi · {n(idleMerchants(empire))} boş gemi. Ticaret gemileri Liman’dan satın alınır.</p><GameButton onClick={() => onBuild('liman')}>Limanı aç</GameButton></section>}
        <details className="muster-support"><summary>Savaş meydanı ve kapasite</summary><BattlefieldCard game={game} /></details>
      </> : <>
        <GameButton onClick={onIsland}>Adadan sefer hedefi seç</GameButton>
        <MissionList empire={empire} now={game.updatedAt} run={run} />
        {!missions.length && <p className="muster-note">Bu şehre ait yolda veya konuşlu sefer yok. Hedefi Ada görünümünden seçebilirsin.</p>}
        <DefenseSummary empire={empire} />
        {empire.cities.length > 1 ? <DeployPanel empire={empire} run={run} /> : <p className="muster-note">Birlik aktarımı, ikinci şehrini kurduğunda açılır.</p>}
      </>}
    </CourtTabs>
  </div>
}
