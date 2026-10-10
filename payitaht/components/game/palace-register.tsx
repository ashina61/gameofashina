import { corruption, type Game } from '@/lib/game/engine'
import { capitalCity, capitalId, colonyPalaceLevel, MAX_CITIES, type Empire } from '@/lib/game/empire'
import { Box } from './building-page'
import { GameButton } from './game-button'
import { ApprovedArt } from './approved-court-art'

/** Administration ledger reads existing empire rules; city actions stay in Cities. */
export function PalaceRegister({ game, empire, id, onCities }: { game: Game; empire?: Empire; id: 'saray' | 'valilik'; onCities: () => void }) {
  const palace = id === 'saray', rate = Math.round(corruption(game) * 100)
  const colonies = Math.max(0, (empire?.cities.length ?? game.empire?.cities ?? 1) - 1)
  const capital = empire ? capitalCity(empire) : undefined
  const required = empire ? colonyPalaceLevel(empire) : undefined
  const full = !!empire && empire.cities.length >= MAX_CITIES
  const level = game.buildings[id]
  return <div className="palace-register">
    <Box title={palace ? 'Koloni fermanı' : 'Valinin sicili'}>
      <div className="palace-status"><ApprovedArt name="seal" /><div><small>{palace ? 'Mevcut koloniler' : 'Bu şehirde yolsuzluk'}</small><strong>{palace ? colonies : `%${rate}`}</strong><p>{palace ? 'Başkent bu sayıya dahil değildir.' : game.empire?.capital ? 'Başkent yolsuzluktan muaftır.' : rate === 0 ? 'Bu şehrin üretiminde yolsuzluk kaybı yok.' : 'Yolsuzluk bu şehrin üretimini azaltıyor.'}</p></div></div>
      <GameButton onClick={onCities}>{palace ? 'Yerleşimleri ve koloni şartlarını aç' : 'Şehirlerin idaresini aç'}</GameButton>
      <dl className="palace-facts">
        <div><dt>{palace ? 'Başkent Sarayı' : 'Valilik seviyesi'}</dt><dd>{palace ? capital?.game.buildings.saray ?? level : level}</dd></div>
        {palace && required !== undefined && <div><dt>Sonraki koloni için Saray</dt><dd>{full ? 'Şehir sınırında' : `Seviye ${required}`}</dd></div>}
        {palace && empire && <div><dt>İmparatorluk şehirleri</dt><dd>{empire.cities.length} / {MAX_CITIES}</dd></div>}
        {!palace && <div><dt>İmparatorluktaki koloniler</dt><dd>{colonies}</dd></div>}
      </dl>
      <p className="palace-guidance">{palace ? full ? 'İmparatorluk şehir sınırına ulaştı. Mevcut yerleşimlerini Şehirler defterinden yönetebilirsin.' : required !== undefined && capital && capital.game.buildings.saray < required ? `Bir sonraki koloni için başkentteki Saray en az ${required}. seviyeye ulaşmalı. Filoyu, kaynakları ve uygun adayı Şehirler defterinde kontrol et.` : 'Sarayın seviye şartını Şehirler defterindeki kaynak, ticaret filosu ve ada şartlarıyla birlikte kontrol et. Genişleme araştırması gereken Saray seviyesini azaltır.' : 'Valilik seviyesi koloni sayısına yetiştikçe temel yolsuzluk azalır. Yasama araştırması ve yönetim biçimi de son oranı etkiler; burada gerçek güncel oran gösterilir.'}</p>
    </Box>
    {empire && <Box title="Şehirlerin idare defteri"><div className="palace-city-list">{empire.cities.map(city => {
      const isCapital = city.id === capitalId(empire)
      return <article className="palace-city" key={city.id}><header><h3>{city.name}</h3><span>{isCapital ? 'Başkent' : 'Koloni'}</span></header><dl className="palace-facts"><div><dt>{isCapital ? 'Saray' : 'Valilik'}</dt><dd>Seviye {city.game.buildings[isCapital ? 'saray' : 'valilik']}</dd></div><div><dt>Divanhane</dt><dd>Seviye {city.game.buildings.divan}</dd></div><div><dt>Yolsuzluk</dt><dd>%{Math.round(corruption(city.game) * 100)}</dd></div></dl></article>
    })}</div></Box>}
  </div>
}
