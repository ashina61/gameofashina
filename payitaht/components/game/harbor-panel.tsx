'use client'
import { asset } from '@/lib/asset'
import { loadingSpeed, tradeCapacity, type Game } from '@/lib/game/engine'
import { buyMerchantShip, type Empire } from '@/lib/game/empire'
import { idleMerchants, merchantShipPrice, shipCargo, totalMerchants } from '@/lib/game/expeditions'
import { Box } from './building-page'
import { GameButton } from './game-button'
import type { Run } from './world-panels'

const num = (n: number) => Math.floor(n).toLocaleString('tr-TR')
export function HarborPanel({ empire, game, run, onTransport }: { empire: Empire; game: Game; run: Run; onTransport: () => void }) {
  const total = totalMerchants(empire), idle = idleMerchants(empire), cargo = shipCargo(game), price = merchantShipPrice(total)
  const reason = game.buildings.liman < 1 ? 'Gemi satın almak için Liman kur.' : game.resources.gold < price ? 'Yeni gemi için akçe yetersiz.' : null
  return <>
    <Box title="Ortak ticaret filosu">
      <img className="maritime-merchant" src={asset('/images/game/units/nakliye.webp')} alt="Ticaret gemisi" width={160} height={120} />
      <dl className="maritime-facts">
        <div><dt>Toplam filo</dt><dd>{num(total)} gemi</dd></div>
        <div><dt>Limanda boş</dt><dd>{num(idle)} gemi</dd></div>
        <div><dt>Seferde veya yükte</dt><dd>{num(total - idle)} gemi</dd></div>
      </dl>
      <GameButton className="maritime-buy" disabled={!!reason} onClick={() => run((e, t) => buyMerchantShip(e, t), 'Yeni ticaret gemisi limana katıldı.')}>Gemi satın al · {num(price)} akçe</GameButton>
      {reason && <p className="maritime-note" role="status">{reason}</p>}
      <p className="maritime-note">Bütün şehirler aynı filoyu kullanır. Nakliye, deniz aşırı sefer ve koloniler boş gemileri ayırır. Her yeni geminin fiyatı artar.</p>
    </Box>
    <Box title="Yük ve nakliye">
      <dl className="maritime-facts">
        <div><dt>Şimdi taşınabilecek yük</dt><dd>{num(Math.min(idle * cargo, tradeCapacity(game)))} mal</dd></div>
        <div><dt>Gemi başına yük</dt><dd>{num(cargo)} mal</dd></div>
      </dl>
      <GameButton variant="outline" onClick={onTransport}>Nakliye gönder</GameButton>
      <details className="maritime-details"><summary>Limanın yükleme defteri</summary>
        <dl className="maritime-facts"><div><dt>Tek sevkiyat sınırı</dt><dd>{num(tradeCapacity(game))} mal</dd></div><div><dt>Yükleme hızı</dt><dd>{num(loadingSpeed(game))} mal/dk</dd></div></dl>
        <p>Taşınabilecek yük, boş gemiler ile bu limanın sevkiyat sınırından küçük olanıdır. Şehirler ekranında hedef, stok, sefer hakkı ve abluka koşulları kontrol edilir; kesin süre orada hesaplanır.</p>
      </details>
    </Box>
  </>
}
