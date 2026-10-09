import type { CSSProperties } from 'react'
import { BUILDING_EFFECTS, contentment, formatRate, housing, luxuryProduction, maxPopulation, tavernLevel, wineConsumption, wineServed, type Command, type Game } from '@/lib/game/engine'
import { Box } from './building-page'
import { HuzurArt, KahveArt, NufusArt } from './resource-art'
import { PersonArt } from './workforce'

const num = (n: number) => Math.floor(n).toLocaleString('tr-TR')

/** Keep the existing immediate tavern command; only its controls and ledger change. */
export function CoffeehousePanel({ game, onCommand }: { game: Game; onCommand: (c: Command) => void }) {
  const cap = game.buildings.kahvehane, level = tavernLevel(game), served = wineServed(game)
  const bonus = served ? level * BUILDING_EFFECTS.kahvehaneWineBonus * (game.research.includes('mutfak') ? 1.2 : 1) : 0
  const production = luxuryProduction(game).kahve, consumption = wineConsumption(game)
  const homeLimit = housing(game), peace = contentment(game)
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
      <div><dt><KahveArt /><span>Kahve stoğu</span></dt><dd>{num(game.luxury.kahve)}</dd></div>
      <div><dt><KahveArt /><span>{served ? 'Tüketim' : 'Planlanan tüketim'}</span></dt><dd>{formatRate(wineConsumption(game))} kahve/dk</dd></div>
      <div><dt><KahveArt /><span>Şehirde üretim</span></dt><dd>{formatRate(production)} kahve/dk</dd></div>
      <div><dt><KahveArt /><span>Üretim − ikram</span></dt><dd>{formatRate(production - consumption)} kahve/dk</dd></div>
      <div><dt><HuzurArt /><span>Yapının huzuru</span></dt><dd>+{num(cap * BUILDING_EFFECTS.kahvehaneContentment)} kişi</dd></div>
      <div><dt><HuzurArt /><span>İkramın huzuru</span></dt><dd>+{num(bonus)} kişi</dd></div>
      <div><dt><HuzurArt /><span>Toplam huzur</span></dt><dd>{num(contentment(game))} kişi</dd></div>
      <div><dt><NufusArt /><span>Barınma</span></dt><dd>{num(homeLimit)} kişi</dd></div>
      <div><dt><NufusArt /><span>Nüfus sınırı</span></dt><dd>{num(maxPopulation(game))} kişi</dd></div>
    </dl>
    <div className="housing-guidance"><h3>{cap < 1 ? 'Kahvehaneyi kurun' : level === 0 ? 'İkram kapalı' : served ? 'Halkın sohbet meclisi' : 'Kahveye ihtiyaç var'}</h3><p>{cap < 1 ? 'Gelişim bölümünden Kahvehaneyi kurarak ikramı açabilirsiniz.' : level === 0 ? 'Kahve harcanmıyor; ikramın ek huzur katkısı kapalı. Kahvehanenin bina seviyesinden gelen huzur katkısı devam eder.' : served ? `Hünkârım, ikram halkın huzuruna ${num(bonus)} kişilik katkı veriyor. Seviye arttıkça kahve tüketimi de artar; barınma nüfusun diğer sınırıdır.` : 'Ambarda kahve yok ve üretim seçili ikrama yetmiyor. Kahve geldiğinde seçili seviyede ikram yeniden başlar; şu an ek ikram huzuru alınmıyor.'}</p></div>
    {level > 0 && served && production < consumption && <p className="coffee-live-note">İkram üretimden fazla kahve istiyor. Stoğu tamamlayabilir veya ikram seviyesini azaltabilirsiniz.</p>}
    {homeLimit <= peace && <p className="coffee-live-note">{homeLimit === peace ? 'Barınma ve huzur aynı nüfus sınırında; yeni aileler için ikisini de artırmak gerekir.' : 'Nüfusu şu anda barınma sınırlıyor. Daha fazla ikram tek başına yeni ailelere yer açmaz; Konakları geliştirebilirsiniz.'}</p>}
    <details className="housing-explanation"><summary>Kahve ve huzur nasıl işler?</summary><p>Kahvehane, her bina seviyesinde {BUILDING_EFFECTS.kahvehaneContentment} kişilik huzur sağlar. Kahve ikramı her seçili seviyede ayrıca {num(BUILDING_EFFECTS.kahvehaneWineBonus * (game.research.includes('mutfak') ? 1.2 : 1))} kişilik katkı verir; bunun için kahve gerekir.</p><p>Üretim − ikram satırı, üretim ile seçilen ikram talebini karşılaştırır. Kahve yoksa bu değer gerçek harcama değildir; seçilen seviyenin ihtiyacını gösterir.</p><p>Şehrinizde her ikram seviyesi dakikada {formatRate(wineConsumption({ ...game, tavern: 1 }))} kahve ister. Kahve Kileri ve Mutfak araştırması tüketimi etkiler. İkramı sıfıra çekmek tüketimi durdurur.</p></details>
  </Box>
}
