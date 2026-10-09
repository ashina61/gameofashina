import { capacity, LUXURY_IDS, LUXURY_NAMES, RESOURCE_IDS, RESOURCE_NAMES, type Game, type Luxury, type Resource } from '@/lib/game/engine'
import { safeStock } from '@/lib/game/expeditions'
import { asset } from '@/lib/asset'
import { Box } from './building-page'
import { luxuryIcons, resourceIcons } from './game-widgets'

const num = (n: number) => Math.floor(n).toLocaleString('tr-TR')
const goods: (Resource | Luxury)[] = [...RESOURCE_IDS, ...LUXURY_IDS]

export function StoragePanel({ game }: { game: Game }) {
  const cap = capacity(game), safe = safeStock(game)
  return <Box title="Stok defteri" className="storage-ledger">
    <div className="storage-capacity"><img src={asset('/images/game/ui/storage/storage-icon.webp')} alt="" width={72} height={72} /><div><small>Her mal için kapasite</small><strong>{num(cap)}</strong><p>Yağmalanabilen her malın en fazla {num(safe)} birimi korunur.</p></div></div>
    <div className="storage-goods">{goods.map(id => {
      const isResource = id in RESOURCE_NAMES
      const amount = isResource ? game.resources[id as Resource] : game.luxury[id as Luxury]
      const label = isResource ? RESOURCE_NAMES[id as Resource] : LUXURY_NAMES[id as Luxury]
      const Icon = isResource ? resourceIcons[id as Resource] : luxuryIcons[id as Luxury]
      const fill = Math.max(0, Math.min(100, amount / cap * 100))
      return <article className="storage-row" key={id} aria-label={`${label} stoğu`}>
        <div className="storage-row-heading"><h3><Icon width={30} height={30} aria-hidden="true" />{label}</h3><strong>{num(amount)} <span>/ {num(cap)}</span></strong></div>
        <div className="storage-meter" role="progressbar" aria-label={`${label} doluluğu`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(fill)}><span style={{ width: `${fill}%` }} /></div>
        <dl className="storage-facts"><div><dt>Boş yer</dt><dd>{num(Math.max(0, cap - amount))}{amount >= cap && <b>Dolu</b>}</dd></div><div><dt>Korunan</dt><dd>{id === 'knowledge' ? 'Yağmalanmaz' : num(Math.min(safe, amount))}</dd></div></dl>
      </article>
    })}</div>
    <details className="storage-explanation"><summary>Kapasite ve koruma nasıl işler?</summary><p>Ambar ve Depo birlikte her malın ayrı kapasitesini belirler. Bir malın stoğu dolduğunda o malın yeni üretimi boşa gider. Daha çok yer için Gelişim bölümünden yapıyı yükseltebilirsiniz.</p><p>Korunan miktar baskın sırasında elde kalan stoktur. Koruma araştırması bu sınırı artırır. İlim baskınlarda yağmalanmaz.</p></details>
  </Box>
}
