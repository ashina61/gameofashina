'use client'

/**
 * GÖREV ÇİZİMLERİ — her hedef ve günlük görev kendi konusunu gösterir:
 * bina görevlerinde o binanın hedef seviyedeki resmi, araştırmada kandilli
 * âlim, halk görevinde işçiler, maden görevinde adanın madeni, ordu
 * görevinde askerler. Hepsi aynı küçük sahnede durur: gökyüzü, çayır tümseği.
 */
import type { ReactNode } from 'react'
import { BUILDINGS, type BuildingId, type Game, type ObjectiveGo } from '@/lib/game/engine'
import type { DailyTask } from '@/lib/game/daily'
import { asset, buildingImage } from '@/lib/asset'
import { PersonArt } from './workforce'
import { BuildingArt } from './building-art'
import { UnitFigure } from './unit-art'
import { AkceArt, IlimArt } from './resource-art'

/** Hedefin istediği seviye (görselin aşaması buna göre seçilir). */
const TARGET: Record<string, number> = { 'first-upgrade': 2, homes: 3, warehouse: 2, divan5: 5, divan8: 8 }

function Stage({ size, children, tone = 'day' }: { size: number; children: ReactNode; tone?: 'day' | 'gold' | 'dusk' }) {
  return <span className={`quest-art is-${tone}`} style={{ width: size, height: size * 0.78 }} aria-hidden="true">
    <span className="quest-art-sky" /><span className="quest-art-hill" />
    <span className="quest-art-subject">{children}</span>
  </span>
}
const Img = ({ src }: { src: string }) => <img src={src} alt="" draggable={false} />

export function ObjectiveArt({ id, go, game, size = 120 }: { id: string; go: ObjectiveGo; game: Game; size?: number }) {
  const people = (kinds: Parameters<typeof PersonArt>[0]['kind'][], s: number) =>
    <span className="quest-art-row">{kinds.map((k, i) => <PersonArt key={i} kind={k} size={s} />)}</span>
  if (go === 'research') return <Stage size={size} tone="dusk"><span className="quest-art-row">{people(['alim'], size * 0.36)}<IlimArt width={size * 0.3} height={size * 0.3} /></span></Stage>
  if (go === 'people') return <Stage size={size}>{people(['alim', 'halk', 'alim'], size * 0.28)}</Stage>
  if (go === 'island') return <Stage size={size}><Img src={asset(`/images/game/buildings/mine-${game.mine.specialty}.webp`)} /></Stage>
  if (go === 'army') return <Stage size={size} tone="gold"><span className="quest-art-row"><UnitFigure id="mizrakci" size={size * 0.34} bare /><UnitFigure id="yeniceri" size={size * 0.4} bare /><UnitFigure id="okcu" size={size * 0.34} bare /></span></Stage>
  const b = go as BuildingId
  return <Stage size={size} tone={id.startsWith('divan') || id === 'first-upgrade' ? 'gold' : 'day'}>
    {BUILDINGS[b]?.art ? <BuildingArt id={b} level={TARGET[id] ?? 1} /> : <AkceArt width={size * 0.4} height={size * 0.4} />}
  </Stage>
}

export function DailyArt({ task, size = 52 }: { task: DailyTask['key'] | 'login'; size?: number }) {
  const art: Record<string, ReactNode> = {
    login: <AkceArt width={size * 0.5} height={size * 0.5} />,
    builds: <Img src={buildingImage('mimar', 4)} />,
    trained: <UnitFigure id="yeniceri" size={size * 0.62} bare />,
    researched: <IlimArt width={size * 0.46} height={size * 0.46} />,
    donated: <Img src={buildingImage('kereste', 8)} />,
    raids: <UnitFigure id="sipahi" size={size * 0.62} bare />,
    spies: <UnitFigure id="casus" size={size * 0.6} bare />,
    piracy: <Img src={buildingImage('korsan_kalesi', 4)} />,
    shipments: <Img src={buildingImage('liman', 4)} />,
  }
  return <Stage size={size} tone={task === 'login' ? 'gold' : 'day'}>{art[task] ?? <AkceArt />}</Stage>
}
