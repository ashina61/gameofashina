'use client'
import { costRegister, COST_WORKSHOPS, type CostWorkshopId } from '@/lib/game/cost-register'
import { formatRate, MAX_LEVEL, type BuildingId, type Game, type Luxury } from '@/lib/game/engine'
import { asset } from '@/lib/asset'
import { Box } from './building-page'
import { GameButton } from './game-button'
import { luxuryIcons, resourceIcons } from './game-widgets'

const percent = (n: number) => formatRate(n * 100)
export function CostPanel({ game, id, onBuilding }: { game: Game; id: CostWorkshopId; onBuilding: (id: BuildingId) => void }) {
  const info = COST_WORKSHOPS[id], data = costRegister(game, id)
  const Icon = info.resource === 'wood' ? resourceIcons.wood : luxuryIcons[info.resource as Luxury]
  const coffee = id === 'mahzen', artillery = id === 'barutane'
  return <>
    <Box title={info.title}>
      <div className="cost-result"><Icon width={56} height={56} aria-hidden="true" /><div><small>Temel bedelden kalan</small><strong>%{percent(data.factor)}</strong><span>Toplam tasarruf: %{percent(1 - data.factor)}</span></div></div>
      <div className="cost-meter" role="meter" aria-label="Temel bedelden kalan yüzde" aria-valuemin={0} aria-valuemax={100} aria-valuenow={data.factor * 100}><span style={{ width: `${data.factor * 100}%` }} /></div>
      <dl className="cost-facts">
        <div><dt>Temel bedel</dt><dd>%100</dd></div>
        {data.parts.map(part => <div key={part.label}><dt>{part.label}</dt><dd>−%{percent(part.cut)}</dd></div>)}
        {(coffee || artillery) && <div><dt>Yapı sonrası kalan</dt><dd>%{percent(data.materialFactor)}</dd></div>}
        {coffee && <div><dt>Mutfak araştırması</dt><dd>{data.kitchen ? '× 0,90' : 'Henüz yok'}</dd></div>}
        {artillery && <><div><dt>Top Dökümü araştırması</dt><dd>{data.artillery ? '× 0,75' : 'Henüz yok'}<small>Yalnız topçu ve humbaracı</small></dd></div><div><dt>Topçu / humbaracı bedeli</dt><dd>%{percent(data.heavyFactor)}</dd></div></>}
      </dl>
      <p className="cost-note">{coffee ? 'Kilerin indirimi en fazla %50’dir. Mutfak araştırması kalan tüketimi ayrıca %10 azaltır.' : artillery ? 'Barut Alanı indirimi en fazla %50’dir. Top Dökümü, topçu ve humbaracının kalan kükürt bedelini ayrıca %25 azaltır.' : 'Bu indirimler toplanır; ilgili malın bedeli temel değerin %50’sinin altına inmez.'}</p>
      {game.buildings[id] === 0 && <p className="cost-note">Bu yapı henüz kurulmadı; yapı katkısı yok. İnşa koşulları Gelişim’de.</p>}
      {game.buildings[id] >= MAX_LEVEL[id] && <p className="cost-note">Bu yapı en yüksek seviyede.</p>}
    </Box>
    <Box title={coffee ? 'Mevcut ikramda tasarruf' : artillery ? 'Örnek: 10 topçu' : 'Örnek: sonraki Medrese seviyesi'}>
      <dl className="cost-facts">
        <div><dt>Bu yapı olmadan</dt><dd>{formatRate(data.before)}{coffee ? ' /dk' : ''}</dd></div>
        <div><dt>Mevcut yapıyla</dt><dd>{formatRate(data.after)}{coffee ? ' /dk' : ''}</dd></div>
        <div><dt>Bu yapıyla tasarruf</dt><dd>{formatRate(data.saved)}{coffee ? ' /dk' : ''}</dd></div>
      </dl>
      <p className="cost-note">{coffee ? `İkram ayarı: ${data.served}. seviye. Bu, ayarlanan tüketimdir; fiilî ikram kahvenin bulunmasına bağlıdır.` : artillery ? 'Kükürt miktarları gerçek eğitim hesabından alınır. Bu bir örnektir; birlik eğitimi Kışla’da yapılır.' : data.before === 0 ? 'Medresenin bu seviyesinde bu mal istenmiyor. İlerleyen seviyelerde indirim uygulanır.' : 'Yalnız bu yapının etkisi karşılaştırılır; diğer mevcut indirimler iki hesapta da korunur. Miktarlar oyun motorunun yuvarlanmış mal bedelleridir.'}</p>
      {!coffee && !artillery && game.buildings.medrese >= MAX_LEVEL.medrese && <p className="cost-note">Medrese son seviyede; bu örnek bir yükseltme başlatmaz.</p>}
      <GameButton onClick={() => onBuilding(info.target)}>{info.action}</GameButton>
    </Box>
    <details className="cost-explanation"><summary>İndirim nerede uygulanır?</summary><p>{id === 'marangoz' ? 'Binaların kereste maliyetine uygulanır. Akçe bedelini, inşaat süresini ve birlik ücretlerini azaltmaz.' : id === 'mimar' ? 'Mermer isteyen bina seviyelerinde uygulanır. İnşaat araştırmaları mermer bedelini de azaltır; Dülgerler loncası burada uygulanmaz.' : id === 'gozlukcu' ? 'Kristal isteyen bina seviyelerinde uygulanır. Hekim eğitimi, araştırma ve deneylerin kristal harcamalarını azaltmaz.' : coffee ? 'Kahvehanede seçili ikram seviyesinin tüketimini azaltır. Kahve üretimini artırmaz; ikramın huzur katkısını değiştirmez.' : 'Kükürt isteyen kara ve deniz birliklerinin eğitiminde uygulanır. Akçe, kereste, kahve ve kristal bedelleri aynı kalır.'}</p><img className="cost-scope-icon" src={asset('/images/game/ui/barracks/development-icon.webp')} width={32} height={32} alt="" /></details>
  </>
}
