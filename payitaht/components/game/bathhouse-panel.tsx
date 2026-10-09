import { contentment, formatRate, growthRate, housing, MAX_LEVEL, maxPopulation, population, type Game } from '@/lib/game/engine'
import { Box } from './building-page'
import { GameButton } from './game-button'
import { PersonArt } from './workforce'
import { HuzurArt, NufusArt } from './resource-art'

const num = (n: number) => Math.floor(n).toLocaleString('tr-TR')

/** The existing bathhouse effect is +60 contentment per level; this ledger is read-only. */
export function BathhousePanel({ game, onPeople, onHousing }: { game: Game; onPeople: () => void; onHousing: () => void }) {
  const people = population(game), homes = housing(game), peace = contentment(game), limit = maxPopulation(game), growth = growthRate(game)
  const homeLimited = homes <= peace, maxed = game.buildings.hamam >= MAX_LEVEL.hamam
  return <Box title="Halkın huzuru" className="housing-ledger">
    <div className="housing-residents"><PersonArt kind="halk" size={72} /><div><small>Hamamın huzura katkısı</small><strong>+{num(game.buildings.hamam * 60)} <span>kişi</span></strong><p>{num(people)} kişi şehirde yaşıyor</p></div></div>
    <GameButton onClick={onPeople}>Halk ve iş gücü</GameButton>
    <dl className="housing-facts">
      <div><dt><HuzurArt />Toplam huzur</dt><dd>{num(peace)} kişi</dd></div>
      <div><dt><NufusArt />Barınma</dt><dd>{num(homes)} kişi</dd></div>
      <div><dt><NufusArt />Nüfus sınırı</dt><dd>{num(limit)} kişi</dd></div>
      <div><dt><NufusArt />Nüfus artışı</dt><dd>{growth > 0 ? `+${formatRate(growth)} kişi/dk` : 'Tavanda'}</dd></div>
    </dl>
    <div className="housing-guidance"><h3>{homeLimited ? 'Yeni ailelere yer açın' : 'Huzuru artırın'}</h3><p>{homes === peace ? 'Hünkârım, barınma ve huzur aynı nüfus sınırında. Yeni aileler için Konaklarla birlikte halkın huzurunu da artırmanız gerekir.' : homeLimited ? `Hünkârım, halkın huzuru ${num(peace)} kişiye yeterli; barınma ise ${num(homes)} kişiyle sınırlı. Nüfusun büyümesi için Konaklarda yeni ailelere yer açabilirsiniz.` : maxed ? 'Hamam en yüksek seviyede. Daha fazla huzur için Kahvehane, Müze ve diğer huzur kaynaklarını değerlendirebilirsiniz.' : 'Hünkârım, boş evler var fakat halkın huzuru nüfusu sınırlıyor. Gelişim bölümünden hamamı yükseltmek bu sınırı artırır.'}</p>{homeLimited && <GameButton variant="outline" onClick={onHousing}>Konakları incele</GameButton>}</div>
    <details className="housing-explanation"><summary>Hamam halka ne sağlar?</summary><p>Her Hamam seviyesi huzura 60 kişilik katkı verir. Hamamın etkisi, şehrin diğer huzur kaynaklarıyla birlikte toplam huzur değerine eklenir.</p><p>Nüfus sınırı, barınma ve huzur değerlerinden düşük olanıdır. Hamam halkı anında artırmaz; yeterli barınma olduğunda nüfus zamanla büyür.</p></details>
  </Box>
}
