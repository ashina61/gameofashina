'use client'

import { useState, type ReactNode } from 'react'
import { asset, buildingImage } from '@/lib/asset'
import { BUILDINGS, LUXURY_IDS, LUXURY_NAMES, RESOURCE_IDS, RESOURCE_NAMES, armyUpkeep, capacity, clampWorkers, corruption, forestCapacity, formatNumber, formatRate, idleWorkers, luxuryProduction, luxuryRates, mineCapacity, offlineCapHours, rates, scientistCount, scientistUpkeepPerMinute, workerCapacity, type BuildingId, type Game, type Good } from '@/lib/game/engine'
import { resourceIcons, luxuryIcons } from './game-widgets'
import { CourtProgress, CourtTabs } from './court-kit'
import { Box } from './building-page'
import { GameButton } from './game-button'
import { Coins, TrendingUp, Warehouse, Swords, BookOpen, ChevronRight, TriangleAlert, Store, Users, TreePine, Pickaxe } from './ui-art'

const TABS = [{ id: 'ledger', label: 'Hazine', Icon: Coins, art: '/images/game/icons/res-akce.webp' }, { id: 'production', label: 'Üretim', Icon: TrendingUp, art: '/images/game/ui/atlas/register.webp' }, { id: 'stores', label: 'Ambar', Icon: Warehouse, art: '/images/game/buildings/ambar-painted-1-sm.webp' }] as const
const GOODS: readonly Good[] = [...RESOURCE_IDS, ...LUXURY_IDS]
const NAMES = { ...RESOURCE_NAMES, ...LUXURY_NAMES }
const ICONS = { ...resourceIcons, ...luxuryIcons }
const PURPOSE: Record<Good, string> = { gold: 'İnşaat, araştırma, birlik eğitimi ve ticaretin ortak parası.', wood: 'Yapılar, gemiler ve ada yatırımları için temel malzeme.', knowledge: 'Medresede araştırma açmak ve bilimde ilerlemek için biriken bilgi.', kahve: 'Kahvehanede ikram edilir; şehirde huzuru ve nüfusun kalma isteğini artırır.', mermer: 'Gelişmiş bina yükseltmelerinde kullanılır.', kristal: 'Bilim ve kültür yapılarının gelişiminde kullanılır.', kukurt: 'Barutlu ve gelişmiş birliklerin eğitiminde kullanılır.' }
function TreasuryBook({ title, detail, children }: { title: string; detail?: string; children: ReactNode }) {
  return <Box title={title}>{detail && <p className="treasury-book-detail">{detail}</p>}{children}</Box>
}
function horizon(stock: number, rate: number, limit: number) {
  if (rate === 0) return 'Stok bu hızla değişmiyor.'
  if (rate > 0 && stock >= limit) return 'Ambar dolu; yeni üretime yer yok.'
  if (rate < 0 && stock <= 0) return 'Stok tükendi.'
  const minutes = Math.max(1, Math.ceil((rate > 0 ? limit - stock : stock) / Math.abs(rate)))
  const duration = minutes < 60 ? `${minutes} dk` : minutes < 1440 ? `${Math.floor(minutes / 60)} sa ${minutes % 60} dk` : `${Math.floor(minutes / 1440)} gün ${Math.floor(minutes % 1440 / 60)} sa`
  return `Bu hızla yaklaşık ${duration} sonra ${rate > 0 ? 'dolar' : 'tükenir'}.`
}
export function TreasuryPage({ game, cityName, onBuilding, onPeople, onForest, onIsland }: { game: Game; cityName: string; onBuilding: (id: BuildingId) => void; onPeople: () => void; onForest: () => void; onIsland: () => void }) {
  const [tab, setTab] = useState<typeof TABS[number]['id']>('ledger'), [selected, setSelected] = useState<Good>('wood')
  const production = rates(game), lux = luxuryRates(game), grossLux = luxuryProduction(game), limit = capacity(game), workers = clampWorkers(game)
  const stock = (id: Good) => id in game.resources ? game.resources[id as keyof typeof game.resources] : game.luxury[id as keyof typeof game.luxury]
  const speed = (id: Good) => id in production ? production[id as keyof typeof production] : lux[id as keyof typeof lux]
  const full = GOODS.filter(id => stock(id) >= limit && speed(id) > 0), near = GOODS.filter(id => stock(id) < limit && stock(id) >= limit * .9 && speed(id) > 0)
  const coffeeUse = Math.max(0, grossLux.kahve - lux.kahve), army = armyUpkeep(game), scholars = scientistUpkeepPerMinute(game), loss = corruption(game)
  const Icon = ICONS[selected], main = RESOURCE_IDS.includes(selected as typeof RESOURCE_IDS[number]), native = selected === game.mine.specialty
  function select(id: Good) { setSelected(id); setTab('production') }
  function building(id: BuildingId, caption?: string) { return <GameButton className="court-wide" variant="outline" onClick={() => onBuilding(id)}>{caption ?? `${BUILDINGS[id].name} · ${game.buildings[id]}. seviye`}<ChevronRight aria-hidden="true" /></GameButton> }
  return <div className="treasury-page">
    <figure className="academy-banner"><img src={asset('/images/game/terrain/treasury-room.webp')} alt="" width={960} height={480} decoding="async" /><figcaption>{cityName}</figcaption></figure>
    <CourtTabs items={TABS} value={tab} onChange={setTab} label="Hazine defterinin bölümleri">
      {tab === 'ledger' && <>
        <TreasuryBook title="Hazinedeki akçe" detail={cityName}>
          <div className="treasury-balance"><ICONS.gold aria-hidden="true" /><span><small>Mevcut stok</small><strong>{formatNumber(game.resources.gold)}</strong></span><span className="treasury-balance-rate"><b>{formatRate(production.gold, true)}</b><small>net / dk</small></span></div>
          {game.resources.gold >= limit && <p className="treasury-horizon is-warning">Akçe ambarı dolu.</p>}
          <GameButton className="court-wide" onClick={() => select('gold')}>Akçe üretimini incele</GameButton>
        </TreasuryBook>
        <TreasuryBook title="Akçe hesabı" detail="Bu şehirdeki sürekli gelir ve bakım">
          <div className="treasury-net"><span>Giderlerden sonra hazinede kalan</span><strong>{formatRate(production.gold, true)}<small>akçe / dk</small></strong></div>
          <div className="treasury-account"><div><Swords aria-hidden="true" /><span><b>Ordu ve donanma</b><small>Mevcut birliklerin bakımı</small></span><strong>−{formatRate(army)}<small>/ dk</small></strong></div><div><BookOpen aria-hidden="true" /><span><b>Âlimlerin gideri</b><small>{scientistCount(game)} çalışan âlim</small></span><strong>−{formatRate(scholars)}<small>/ dk</small></strong></div></div>
          <p className="court-note">Bakım giderleri yukarıdaki net kazançtan zaten düşülmüş durumda. Vergiler ve çarşı esnafı akçe getirir; giderler geliri aşarsa akçe birikimi durur.</p>
          <div className="treasury-income-sources"><button type="button" onClick={() => onBuilding('konut')}><img src={buildingImage('konut', game.buildings.konut)} alt="" /><span><b>Konakların vergisi</b><small>{game.buildings.konut}. seviye</small></span><ChevronRight aria-hidden="true" /></button><button type="button" onClick={onPeople}><img src={buildingImage('carsi', game.buildings.carsi)} alt="" /><span><b>Çarşı esnafı</b><small>{workers.carsi} / {workerCapacity(game, 'carsi')} çalışan</small></span><ChevronRight aria-hidden="true" /></button></div>
        </TreasuryBook>
        <TreasuryBook title="Hazinedarın notu" detail="Şehrinin şu anki durumundan">
          {full.length > 0 ? <div className="treasury-advice is-warning"><TriangleAlert aria-hidden="true" /><h4>Ambarın emeği tutamıyor</h4><p>{full.map(id => NAMES[id]).join(', ')} için yer kalmadı. Ambarı büyüt veya eldeki malları kullan.</p><GameButton className="court-wide" onClick={() => setTab('stores')}>Dolu ambarları gör<ChevronRight aria-hidden="true" /></GameButton></div> : near.length > 0 ? <div className="treasury-advice"><Warehouse aria-hidden="true" /><h4>Yer daralmaya başladı</h4><p>{near.map(id => NAMES[id]).join(', ')} ambarı en az %90 dolu. Yeni üretime yer açmayı planla.</p><GameButton className="court-wide" onClick={() => setTab('stores')}>Ambar defterini aç<ChevronRight aria-hidden="true" /></GameButton></div> : <div className="treasury-advice"><Coins aria-hidden="true" /><h4>{production.gold > 0 ? 'Hazineye akçe geliyor' : 'Akçe birikimi durmuş'}</h4><p>{production.gold > 0 ? 'Sürekli bakım giderlerinden sonra hazinen büyüyor. Çarşıdaki çalışanları ve konak seviyesini inceleyerek gelirini geliştirebilirsin.' : 'Konaklar vergiyi, çarşı esnafı ticaret gelirini artırır. Âlim ve birlik bakımı da kazancı etkiler.'}</p><GameButton className="court-wide" onClick={onPeople}><Users aria-hidden="true" />Çalışanları düzenle</GameButton></div>}
          {lux.kahve < 0 && <button type="button" className="treasury-coffee-note" onClick={() => select('kahve')}><ICONS.kahve aria-hidden="true" /><span><b>Kahve ikramı stoku azaltıyor</b><small>{horizon(game.luxury.kahve, lux.kahve, limit)}</small></span><ChevronRight aria-hidden="true" /></button>}
          {loss > 0 && <p className="treasury-corruption"><TriangleAlert aria-hidden="true" />Üretimde %{Math.round(loss * 100)} yolsuzluk etkisi var. Valiliği geliştirerek azaltabilirsin.</p>}
          {loss > 0 && building('valilik', 'Valilik durumunu incele')}
        </TreasuryBook>
        <TreasuryBook title="Çarşının kapısı" detail="Eksik malı edin, fazlasını değerlendir"><div className="treasury-market-call"><img src={asset('/images/game/quests/harbour.webp')} alt="" width={96} height={96} /><p>Adanın yatağı <b>{LUXURY_NAMES[game.mine.specialty]}</b>. Diğer lüks malları ticaret veya başka adadaki şehirlerinle edinirsin. İlim alınıp satılmaz.</p></div><GameButton className="court-wide" onClick={() => onBuilding('carsi')}><Store aria-hidden="true" />Çarşı ve tüccara git</GameButton></TreasuryBook>
      </>}
      {tab === 'production' && <>
        <div className="treasury-goods" role="group" aria-label="Üretimi incelenecek kaynak">{GOODS.map(id => { const Art = ICONS[id]; return <button type="button" key={id} aria-pressed={selected === id} onClick={() => setSelected(id)}><Art aria-hidden="true" /><span>{NAMES[id]}</span></button> })}</div>
        <TreasuryBook title={`${NAMES[selected]} defteri`} detail={main ? 'Şehrinin ana kaynaklarından' : native ? 'Bu adanın maden yatağı' : 'Bu adada yatağı bulunmuyor'}>
          <div className="treasury-production-summary"><Icon aria-hidden="true" /><span><b>{formatRate(speed(selected), true)}</b><small>net {NAMES[selected].toLocaleLowerCase('tr-TR')} / dk</small></span></div>
          <p className="treasury-purpose">{PURPOSE[selected]}</p>
          <div className="treasury-stock-line"><span>Eldeki stok<b>{formatNumber(stock(selected))}</b></span><span>Her kaynak için kapasite<b>{formatNumber(limit)}</b></span></div>
          <CourtProgress value={stock(selected)} need={limit} label={`${NAMES[selected]} ambarı`} />
          <p className={`treasury-horizon${speed(selected) < 0 || stock(selected) >= limit ? ' is-warning' : ''}`}>{horizon(stock(selected), speed(selected), limit)}</p>
          <p className="treasury-estimate-note">Süre, şu anki net hızın değişmediği varsayımıyla hesaplanır; harcamalar ve yeni kararların sonucu değiştirir.</p>
          <div className="treasury-production-sources">
            {selected === 'gold' && <><h4>Vergi ve esnaf</h4><p>Konaklar işçi istemeden vergi getirir. Çarşının gelirinde çalışan esnafın payı belirleyicidir; saray da geliri güçlendirir.</p><dl><div><dt>Konaklar</dt><dd>{game.buildings.konut}. seviye</dd></div><div><dt>Çarşı esnafı</dt><dd>{workers.carsi} / {workerCapacity(game, 'carsi')}</dd></div><div><dt>Saray</dt><dd>{game.buildings.saray}. seviye</dd></div></dl><GameButton className="court-wide" onClick={onPeople}>Çarşı çalışanlarını düzenle</GameButton>{building('konut', 'Konakları geliştir')}{building('saray', 'Sarayın etkisini incele')}</>}
            {selected === 'wood' && <><h4>Atölyeden ve ada ormanından</h4><p>Kerestehane ve ada ormanındaki oduncular birlikte üretir. Boş kalan işçi yerleri üretime katılmaz.</p><dl><div><dt>Kerestehane</dt><dd>{workers.kereste} / {workerCapacity(game, 'kereste')} işçi</dd></div><div><dt>Ada ormanı</dt><dd>{Math.min(game.forest.workers, forestCapacity(game))} / {forestCapacity(game)} oduncu</dd></div></dl><GameButton className="court-wide" onClick={onPeople}>Kerestehane işçilerini düzenle</GameButton><GameButton className="court-wide" variant="outline" onClick={onForest}><TreePine aria-hidden="true" />Ada ormanına git</GameButton>{building('kereste', 'Kerestehaneyi geliştir')}</>}
            {selected === 'knowledge' && <><h4>Medresenin emeği</h4><p>Medreseye yerleştirdiğin âlimler ilim üretir; boş yerler üretime katılmaz. Cami ve bilim geliştirmeleri üretimi güçlendirir.</p><dl><div><dt>Çalışan âlim</dt><dd>{scientistCount(game)} / {workerCapacity(game, 'medrese')}</dd></div><div><dt>Âlim bakım gideri</dt><dd>{formatRate(scholars)} akçe / dk</dd></div></dl><GameButton className="court-wide" onClick={onPeople}>Âlimleri görevlendir</GameButton>{building('medrese', 'Medreseyi aç')}{building('cami', 'Caminin etkisini incele')}</>}
            {!main && <><h4>{native ? 'Adanın ortak madeni' : 'Ticaret ve diğer adalar'}</h4><p>{native ? `${NAMES[selected]} bu adanın yatağından çıkarılır. Madencilerin sayısı ve ortak madenin seviyesi üretimi belirler.` : `Bu adadan ${NAMES[selected].toLocaleLowerCase('tr-TR')} çıkarılmaz. Çarşıdaki tüccardan veya bu kaynağa sahip başka bir adadaki şehrinden edin.`}</p>{native && <dl><div><dt>Çalışan madenci</dt><dd>{Math.min(game.mine.miners, mineCapacity(game))} / {mineCapacity(game)}</dd></div><div><dt>Madenden gelen</dt><dd>{formatRate(grossLux[selected as keyof typeof grossLux])} / dk</dd></div></dl>}{selected === 'kahve' && <><dl><div><dt>Madenden gelen kahve</dt><dd>{formatRate(grossLux.kahve)} / dk</dd></div><div><dt>Kahvehanedeki tüketim</dt><dd>{formatRate(coffeeUse)} / dk</dd></div></dl><p>İkram, ambardaki kahveyi tüketir. Kahvehaneden ikram seviyesini değiştirebilirsin.</p>{building('kahvehane', 'Kahve ikramını düzenle')}</>}{native && <GameButton className="court-wide" onClick={onIsland}><Pickaxe aria-hidden="true" />Ada madenine git</GameButton>}<GameButton className="court-wide" variant="outline" onClick={() => onBuilding('carsi')}>Çarşı ve tüccara git</GameButton></>}
          </div>
          <p className="court-note">{idleWorkers(game)} kişi başka bir işe ayrılabilir. Araştırmalar, yapılar ve etkin şehir etkileri yukarıdaki net hızın içinde hesaplanır.</p>
        </TreasuryBook>
      </>}
      {tab === 'stores' && <>
        <TreasuryBook title="Ambar yoklaması" detail={`Her kaynak için ${formatNumber(limit)} kapasite`}>
          <p className="court-note">Her malın ayrı stok sınırı vardır; boşluklar mallar arasında paylaşılmaz. Bir kaynağa dokunarak üretim defterini aç.</p>
          <div className="treasury-store-ledger">{GOODS.map(id => { const Art = ICONS[id], filled = stock(id) >= limit; return <button type="button" key={id} onClick={() => select(id)} aria-label={`${NAMES[id]} üretimini aç`} className={filled ? 'is-full' : ''}><Art aria-hidden="true" /><span><b>{NAMES[id]}</b><small>{formatNumber(stock(id))} / {formatNumber(limit)}</small><span className="treasury-store-meter" aria-hidden="true"><i style={{ width: `${Math.min(100, stock(id) / limit * 100)}%` }} /></span><small>{filled && speed(id) >= 0 ? 'Ambar dolu' : horizon(stock(id), speed(id), limit)}</small></span><ChevronRight aria-hidden="true" /></button> })}</div>
        </TreasuryBook>
        <TreasuryBook title="Yer aç, emeği koru" detail="Depolama ve oyun dışındaki üretim"><div className="treasury-storage-building"><img src={buildingImage('ambar', game.buildings.ambar)} alt="" /><span><b>Ambar {game.buildings.ambar}. seviye</b><small>Depo {game.buildings.depo}. seviye</small></span></div>{building('ambar', 'Ambarı geliştir')}{building('depo', 'Depoyu incele')}<div className="treasury-offline"><Warehouse aria-hidden="true" /><span><b>En fazla {offlineCapHours(game)} saat</b><small>Oyun kapalıyken hesaplanan üretim süresi. Ambar seviyesi bu süreyi artırır; üst sınır 24 saattir. Dolan kaynak yeni üretim biriktirmez.</small></span></div><GameButton className="court-wide" variant="outline" onClick={() => onBuilding('carsi')}>Fazla malları çarşıda değerlendir</GameButton></TreasuryBook>
      </>}
    </CourtTabs>
  </div>
}
