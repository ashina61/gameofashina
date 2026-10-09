'use client'
import { useState } from 'react'
import { asset } from '@/lib/asset'
import { BUILDING_EFFECTS, UNIT_IDS, UNITS, upgradeCap, upgradeCost, upgradeReason, travelFactor, type Command, type Game, type UnitId } from '@/lib/game/engine'
import { activeCity, type Empire } from '@/lib/game/empire'
import { PIRACY_TARGETS, WARSHIPS, availableUnits } from '@/lib/game/expeditions'
import { targetCheck } from '@/lib/game/missions/dispatch'
import { troopList } from '@/lib/game/battle'
import { Box } from './building-page'
import { GameButton } from './game-button'
import { AkceArt, KumSaatiArt } from './resource-art'
const num = (n: number) => Math.floor(n).toLocaleString('tr-TR')
const clock = (ms: number) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }
function Portrait({ id }: { id: UnitId }) { return <img className="armament-portrait" src={asset(UNITS[id].branch === 'deniz' ? `/images/game/units/${id}.webp` : `/images/game/ui/barracks/portrait-${id}.webp`)} alt="" width={96} height={72} /> }
export function UpgradePanel({ game, onCommand }: { game: Game; onCommand: (c: Command) => void }) {
  const [branch, setBranch] = useState<'kara' | 'deniz'>('kara')
  const ids = UNIT_IDS.filter(id => UNITS[id].branch === branch && !['spy', 'transport', 'support'].includes(UNITS[id].role))
  return <>
    <Box title="Teçhizat defteri"><p className="armament-note">Açık teçhizat sınırı: <b>{upgradeCap(game)} / 8</b></p>
      {game.buildings.tophane < 2 && <p className="armament-note">Önce Tophane’yi 2. seviyeye yükselt.</p>}
      <div className="armament-branches" aria-label="Birlik dalı">{(['kara', 'deniz'] as const).map(b => <GameButton key={b} variant="outline" aria-pressed={branch === b} onClick={() => setBranch(b)}>{b === 'kara' ? 'Kara birlikleri' : 'Donanma'}</GameButton>)}</div>
    </Box>
    <Box title="Birlik teçhizatı"><div className="armament-units">{ids.map((id, i) => {
      const u = game.upgrades[id] ?? { atk: 0, def: 0 }
      return <details key={id} className="armament-unit" open={i === 0}><summary><Portrait id={id} /><span><strong>{UNITS[id].name}</strong><small>Saldırı {u.atk} · Zırh {u.def}</small></span></summary>
        <div className="armament-stats">{(['atk', 'def'] as const).map(stat => {
          const c = upgradeCost(game, id, stat), reason = upgradeReason(game, id, stat), label = stat === 'atk' ? 'Saldırı' : 'Zırh', cap = u[stat] >= upgradeCap(game)
          return <section key={stat} className="armament-stat"><h3>{label} · Seviye {u[stat]}</h3><p>Mevcut katkı: <b>+%{u[stat] * 5}</b>{!cap && <> → +%{(u[stat] + 1) * 5}</>}</p>
            {!cap && <p className="armament-price"><AkceArt />{num(c.gold)} akçe <img src={asset('/images/game/icons/res-kristal.webp')} alt="" />{num(c.kristal)} kristal</p>}
            <GameButton disabled={!!reason} onClick={() => onCommand({ type: 'upgrade', id, stat })} aria-label={`${UNITS[id].name} ${label.toLocaleLowerCase('tr')} geliştir`}>{cap ? 'Sınırda' : `${label} geliştir`}</GameButton>
            {reason && <p className="armament-reason">{reason}</p>}
          </section>
        })}</div>
      </details>
    })}</div></Box>
    <Box title="Ustanın notları"><details className="armament-help"><summary>Katkılar ve açılma koşulları</summary><p>Her saldırı veya zırh seviyesi ilgili değeri %5 artırır. Tophane’nin her iki seviyesi bir teçhizat seviyesi açar; sınır 8’dir. Bedel akçe ve kristaldir, işlem anında tamamlanır. Teçhizat geliştirmeleri imparatorluğun şehirleri arasında paylaşılır.</p><p>Tophane’nin ayrıca bu şehirdeki askerî güç katkısı +%{Math.round(game.buildings.tophane * BUILDING_EFFECTS.tophanePower * 100)}. Birlik teçhizatı seviyeleri bu yapı katkısından ayrıdır.</p></details></Box>
  </>
}
export function PiracyPanel({ empire, now, onPiracy }: { empire: Empire; now: number; onPiracy: (targetId: string, units: Partial<Record<UnitId, number>>) => void }) {
  const city = activeCity(empire), g = city.game, free = availableUnits(empire, city.id)
  const [target, setTarget] = useState(PIRACY_TARGETS[0].id), [pick, setPick] = useState<Partial<Record<UnitId, number>>>({})
  const t = PIRACY_TARGETS.find(p => p.id === target)!, missions = (empire.missions ?? []).filter(m => m.cityId === city.id && m.kind === 'piracy')
  const clean = Object.fromEntries(WARSHIPS.map(id => [id, Math.min(free[id], Math.max(0, pick[id] ?? 0))])) as Partial<Record<UnitId, number>>
  const selected = Object.values(clean).reduce((a, n) => a + (n ?? 0), 0), checked = targetCheck(empire, t.id, 'piracy', now)
  const reason = g.buildings.korsan_kalesi < t.level ? `Korsan Kalesi ${t.level}. seviye gerekli.` : 'error' in checked ? checked.error : !selected ? 'En az bir boşta savaş gemisi seç.' : null
  const set = (id: UnitId, n: number) => setPick({ ...clean, [id]: Math.max(0, Math.min(free[id], n)) })
  return <>
    <Box title="Hedef defteri"><p className="armament-note">Korsan şöhreti: <b>{num(g.piracy)}</b>. Hedefler yapay ticaret filolarıdır; ganimet yalnız zaferden sonra dönüşte gelir.</p>
      <div className="armament-targets">{PIRACY_TARGETS.map(p => <button key={p.id} type="button" aria-pressed={target === p.id} className="armament-target" onClick={() => setTarget(p.id)}>
        <strong>{p.name}</strong><small>{g.buildings.korsan_kalesi < p.level ? `Kilitli · Kale ${p.level}. seviye` : 'Sefer açıldı'}</small>
      </button>)}</div>
      <p className="armament-note">{t.description}</p><dl className="armament-facts"><div><dt>Zaferde akçe</dt><dd>{num(Math.round(t.gold * (1 + g.buildings.korsan_kalesi * BUILDING_EFFECTS.korsanLoot + (g.research.includes('korsanlik') ? .2 : 0))))}</dd></div><div><dt>Zaferde şöhret</dt><dd>+{t.points}</dd></div><div><dt>Tek yön yol</dt><dd><KumSaatiArt />{clock(Math.round(t.minutes * 60000 * travelFactor(g)))}</dd></div></dl>
      <details className="armament-help"><summary>Eskort ve ganimet hesabı</summary><p>Eskort: {troopList(t.escort)}. Eskort yenilmeden ganimet alınmaz; gemi kayıpları kalıcıdır.</p><p>Kale katkısı +%{Math.round(g.buildings.korsan_kalesi * BUILDING_EFFECTS.korsanLoot * 100)}{g.research.includes('korsanlik') ? ', Korsanlık araştırması +%20' : ''}. Gösterilen süre yalnız gidiştir; savaş ve dönüş ayrıca sürer. Dönüşte ambar kapasitesini aşan akçe depolanmaz.</p></details>
    </Box>
    <Box title="Sefer filosunu hazırla"><div className="armament-ships">{WARSHIPS.filter(id => free[id] > 0 || (pick[id] ?? 0) > 0).map(id => <div className="armament-ship" key={id}><div className="armament-ship-title"><Portrait id={id} /><span><strong>{UNITS[id].name}</strong><small>{num(free[id])} boşta · {num(clean[id] ?? 0)} seçili</small></span></div><div className="armament-stepper"><GameButton variant="outline" disabled={!clean[id]} aria-label={`${UNITS[id].name} azalt`} onClick={() => set(id, (clean[id] ?? 0) - 1)}>−</GameButton><label>{UNITS[id].name} adedi<input type="number" inputMode="numeric" min={0} max={free[id]} value={clean[id] ?? 0} onChange={e => set(id, Math.floor(Number(e.target.value) || 0))} /></label><GameButton variant="outline" disabled={(clean[id] ?? 0) >= free[id]} aria-label={`${UNITS[id].name} artır`} onClick={() => set(id, (clean[id] ?? 0) + 1)}>+</GameButton><GameButton variant="outline" disabled={(clean[id] ?? 0) >= free[id]} onClick={() => set(id, free[id])}>Maks.</GameButton></div></div>)}</div>
      {WARSHIPS.every(id => free[id] <= 0) && <p className="armament-note">Boşta savaş gemisi yok. Tersane’de savaş gemisi inşa et veya seferdeki filonun dönmesini bekle.</p>}
      <p className="armament-note">Seçilen filo: <b>{num(selected)} gemi</b></p><GameButton className="armament-dispatch" disabled={!!reason} onClick={() => { onPiracy(t.id, clean); setPick({}) }}>{t.name} peşine düş</GameButton>{reason && <p className="armament-reason">{reason}</p>}
    </Box>
    <Box title="Denizdeki seferler">{!missions.length ? <p className="armament-note">Bu şehirden yola çıkan korsan filosu yok.</p> : missions.map(m => <div className="armament-mission" key={m.id}><strong>{PIRACY_TARGETS.find(p => p.id === m.npcId)?.name}</strong><p>{m.battle ? `Savaşta · tur ${m.battle.state.round}` : m.resolved ? `Dönüş · ${clock(m.returnAt - now)}` : `Varış · ${clock(m.arriveAt - now)}`}</p><small>{troopList(m.units)}</small></div>)}</Box>
  </>
}
