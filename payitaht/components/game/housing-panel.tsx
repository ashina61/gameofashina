import { contentment, formatRate, growthRate, housing, idleWorkers, maxPopulation, population, type Game } from '@/lib/game/engine'
import { Box } from './building-page'
import { GameButton } from './game-button'
import { PersonArt } from './workforce'
import { HuzurArt, NufusArt } from './resource-art'

const num = (n: number) => Math.floor(n).toLocaleString('tr-TR')

/** Read-only neighborhood ledger; every value comes from the existing economy. */
export function HousingPanel({ game, onPeople, onHamam }: { game: Game; onPeople: () => void; onHamam: () => void }) {
  const people = population(game), homes = housing(game), peace = contentment(game), limit = maxPopulation(game), growth = growthRate(game)
  const peaceLimited = peace < homes
  return <Box title="Mahalle halkı" className="housing-ledger">
    <div className="housing-residents"><PersonArt kind="halk" size={72} /><div><small>Şehirde yaşayan</small><strong>{num(people)} <span>/ {num(limit)}</span></strong><p>{num(idleWorkers(game))} kişi iş bekliyor</p></div></div>
    <GameButton onClick={onPeople}>Halk ve iş gücü</GameButton>
    <dl className="housing-facts">
      <div><dt><NufusArt />Barınma</dt><dd>{num(homes)} kişi</dd></div>
      <div><dt><NufusArt />Boş barınma</dt><dd>{num(Math.max(0, homes - people))} yer</dd></div>
      <div><dt><HuzurArt />Huzur sınırı</dt><dd>{num(peace)} kişi</dd></div>
      <div><dt><NufusArt />Nüfus artışı</dt><dd>{growth > 0 ? `+${formatRate(growth)} kişi/dk` : 'Tavanda'}</dd></div>
    </dl>
    <div className="housing-guidance"><h3>{peaceLimited ? 'Halkın huzuru' : 'Mahallenin gelişimi'}</h3><p>{peaceLimited ? `Hünkârım, ${num(homes)} kişilik barınma var; huzur şu anda ${num(limit)} kişiye izin veriyor. Yeni konuttan önce halkın huzurunu artırmak nüfusun büyümesini destekler.` : people >= limit ? 'Hünkârım, mahalle nüfus sınırına ulaştı. Gelişim bölümünden barınmayı artırabilirsiniz; büyüme için halkın huzuru da yeterli olmalı.' : `Mahalleye yeni sakinler geliyor. Nüfus şu anda dakikada ${formatRate(growth)} kişi artıyor; barınma ve huzurdan düşük olan değer büyüme sınırıdır.`}</p>{peaceLimited && <GameButton variant="outline" onClick={onHamam}>Hamamı incele</GameButton>}</div>
    <details className="housing-explanation"><summary>Barınma ve huzur nasıl işler?</summary><p>Konut barınmayı artırır. Şehrin nüfus tavanı, barınma ve huzur değerlerinden düşük olanıdır. Boş ev olması tek başına yeni halk gelmesini sağlamaz.</p><p>Boştaki halkı üretime veya ilim çalışmalarına ayırmak için Halk ve iş gücü bölümünü açın.</p></details>
  </Box>
}
