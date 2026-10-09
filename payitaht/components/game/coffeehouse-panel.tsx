import type { CSSProperties } from 'react'
import { BUILDING_EFFECTS, contentment, formatRate, tavernLevel, wineConsumption, wineServed, type Command, type Game } from '@/lib/game/engine'
import { Box } from './building-page'
import { HuzurArt, KahveArt } from './resource-art'
import { PersonArt } from './workforce'

const num = (n: number) => Math.floor(n).toLocaleString('tr-TR')

/** Keep the existing immediate tavern command; only its controls and ledger change. */
export function CoffeehousePanel({ game, onCommand }: { game: Game; onCommand: (c: Command) => void }) {
  const cap = game.buildings.kahvehane, level = tavernLevel(game), served = wineServed(game)
  const bonus = served ? level * BUILDING_EFFECTS.kahvehaneWineBonus * (game.research.includes('mutfak') ? 1.2 : 1) : 0
  const setLevel = (value: number) => onCommand({ type: 'tavern', value: Math.max(0, Math.min(cap, value)) })
  return <Box title="Kahve ikramı" className="housing-ledger coffee-ledger">
    <div className="housing-residents"><PersonArt kind="halk" size={60} /><div><small>İkram seviyesi</small><strong>{level} <span>/ {cap}</span></strong><p>{level === 0 ? 'İkram kapalı' : served ? 'Kahve ikram ediliyor' : 'Kahve bekleniyor'}</p></div></div>
    <div className="coffee-quantity" style={{ '--fill': `${cap ? level / cap * 100 : 0}%` } as CSSProperties}>
      <input className="coffee-range" type="range" min={0} max={cap} value={level} disabled={cap < 1} aria-label="İkram seviyesi" onChange={e => setLevel(Number(e.target.value))} />
      <div className="coffee-limits"><span>Kapalı</span><span>En fazla {cap}</span></div>
      <div className="coffee-steps"><button type="button" className="coffee-minus" aria-label="İkramı azalt" disabled={level === 0} onClick={() => setLevel(level - 1)} /><output aria-label="Seçili ikram seviyesi">{level}</output><button type="button" className="coffee-plus" aria-label="İkramı artır" disabled={level >= cap} onClick={() => setLevel(level + 1)} /><button type="button" className="coffee-max" disabled={level >= cap} onClick={() => setLevel(cap)}>Maks.</button></div>
    </div>
    <p className="coffee-live-note">İkram seviyesi değiştirildiğinde hemen uygulanır.</p>
    <dl className="housing-facts">
      <div><dt><KahveArt />Kahve stoğu</dt><dd>{num(game.luxury.kahve)}</dd></div>
      <div><dt><KahveArt />{served ? 'Tüketim' : 'Planlanan tüketim'}</dt><dd>{formatRate(wineConsumption(game))} kahve/dk</dd></div>
      <div><dt><HuzurArt />İkramın huzuru</dt><dd>+{num(bonus)} kişi</dd></div>
      <div><dt><HuzurArt />Toplam huzur</dt><dd>{num(contentment(game))} kişi</dd></div>
    </dl>
    <div className="housing-guidance"><h3>{cap < 1 ? 'Kahvehaneyi kurun' : level === 0 ? 'İkram kapalı' : served ? 'Halkın sohbet meclisi' : 'Kahveye ihtiyaç var'}</h3><p>{cap < 1 ? 'Gelişim bölümünden Kahvehaneyi kurarak ikramı açabilirsiniz.' : level === 0 ? 'Kahve harcanmıyor; ikramın ek huzur katkısı kapalı. Kahvehanenin bina seviyesinden gelen huzur katkısı devam eder.' : served ? `Hünkârım, ikram halkın huzuruna ${num(bonus)} kişilik katkı veriyor. Seviye arttıkça kahve tüketimi de artar; barınma nüfusun diğer sınırıdır.` : 'Ambarda kahve yok ve üretim seçili ikrama yetmiyor. Kahve geldiğinde seçili seviyede ikram yeniden başlar; şu an ek ikram huzuru alınmıyor.'}</p></div>
    <details className="housing-explanation"><summary>Kahve ve huzur nasıl işler?</summary><p>Kahvehane, her bina seviyesinde {BUILDING_EFFECTS.kahvehaneContentment} kişilik huzur sağlar. Kahve ikramı her seçili seviyede ayrıca {num(BUILDING_EFFECTS.kahvehaneWineBonus * (game.research.includes('mutfak') ? 1.2 : 1))} kişilik katkı verir; bunun için kahve gerekir.</p><p>Şehrinizde her ikram seviyesi dakikada {formatRate(wineConsumption({ ...game, tavern: 1 }))} kahve ister. Kahve Kileri ve Mutfak araştırması tüketimi etkiler. İkramı sıfıra çekmek tüketimi durdurur.</p></details>
  </Box>
}
