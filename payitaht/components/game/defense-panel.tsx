'use client'
import { BUILDING_EFFECTS, cityDefense, counterSpy, garrisonLimit, garrisonUsed, spyBonus, spyCapacity, travelFactor, wallDefense, type BuildingId, type Game } from '@/lib/game/engine'
import { cityGuards, cityWallHp, safeStock } from '@/lib/game/expeditions'
import { Box } from './building-page'
import { GameButton } from './game-button'

export const DEFENSE = {
  harita_arsivi: { tab: 'Yol defteri', alt: 'Osmanlı harita arşivinde portolan hazırlığı', icon: 'ui/approved-court/nav-map.webp' },
  surlar: { tab: 'Savunma', alt: 'Osmanlı şehir surlarında muhafızlar', icon: 'units/mizrakci.webp' },
  siginak: { tab: 'İstihbarat', alt: 'Osmanlı gizli haber odasında muhafız ve haberci', icon: 'units/casus.webp' },
} as const
export const isDefense = (id: BuildingId): id is keyof typeof DEFENSE => id in DEFENSE
const num = (n: number) => Math.floor(n).toLocaleString('tr-TR')
const pct = (n: number) => (100 * n).toLocaleString('tr-TR', { maximumFractionDigits: 1 })
function Facts({ rows }: { rows: [string, string][] }) {
  return <dl className="defense-facts">{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
}
export function DefensePanel({ game, id, onBuilding, onCities, onIsland }: { game: Game; id: keyof typeof DEFENSE; onBuilding: (id: BuildingId) => void; onCities: () => void; onIsland: () => void }) {
  if (id === 'harita_arsivi') {
    const archive = Math.min(.5, game.buildings.harita_arsivi * BUILDING_EFFECTS.harita), factor = travelFactor(game)
    return <>
      <Box title="Seferlerin yol defteri">
        <Facts rows={[[ 'Arşivin yol indirimi', `%${pct(archive)}` ], ['Toplam yol çarpanı', `×${factor.toLocaleString('tr-TR', { maximumFractionDigits: 3 })}`]]} />
        <p className="defense-note">Arşiv, sefer ve nakliye sürelerini kısaltır. İndirim 25. seviyede %50’ye ulaşır; diğer yol bonusları bununla çarpılır.</p>
        <div className="defense-actions"><GameButton onClick={onCities}>Nakliye planla</GameButton><GameButton variant="outline" onClick={onIsland}>Adada sefer seç</GameButton></div>
      </Box>
      <Box title="Süre hesabı"><Facts rows={[[ '100 dk temel sefer örneği', `${pct(factor)} dk` ], ['100 dk temel nakliye örneği', `${pct(factor * (game.research.includes('haritacilik') ? .85 : 1))} dk`]]} />
        <details className="defense-details"><summary>Bonuslar ve örneklerin kapsamı</summary><p>Örnekler 100 dakikalık temel süreye mevcut çarpanları uygular; gerçek varış zamanı değildir. Nakliyede Haritacılık araştırması ayrıca %15 indirim verir. Seferin hedefi, mesafesi ve birlik hızı; nakliyede yükleme hızı ve yük miktarı kesin süreyi belirler.</p><Facts rows={[[ 'Yalnız arşivin çarpanı', `×${(1 - archive).toLocaleString('tr-TR', { maximumFractionDigits: 2 })}` ], ['Diğer yol bonuslarının çarpanı', `×${(factor / (1 - archive)).toLocaleString('tr-TR', { maximumFractionDigits: 3 })}`]]} /><p>Diğer yol bonusları Denizcilik Geleceği, Poyraz mucizesi, yönetim ve Yel etkilerinden gelir. Gelişim’de sonraki seviye ve inşa koşulları bulunur.</p></details>
      </Box>
    </>
  }
  if (id === 'surlar') return <>
    <Box title="Şehir savunması"><Facts rows={[[ 'Surun savunma gücü', num(wallDefense(game)) ], ['Şehrin toplam savunması', num(cityDefense(game))], ['Sur canı · savaş başlangıcı', num(cityWallHp(game))], ['Sur muhafızları', `${num(cityGuards(game))} mızrakçı`]]} />
      <p className="defense-note">Muhafızlar sur seviyesinden gelir ve halktan asker ayırmaz. Sur canı başlangıç dayanıklılığıdır; devam eden bir savaşın kalan canı raporda izlenir.</p>
      <GameButton onClick={() => onBuilding('kisla')}>Kışlada birlik yetiştir</GameButton>
    </Box>
    <Box title="Kara garnizonu"><Facts rows={[[ 'Kullanılan / toplam yer', `${num(garrisonUsed(game, 'kara'))} / ${num(garrisonLimit(game, 'kara'))}` ], ['Surların yer katkısı', `${num(game.buildings.surlar * 50)} halk`]]} /><details className="defense-details"><summary>Garnizon ve korunan stok</summary><p>Yer hesabı birliklerin halk karşılığıdır; seferdekiler ve üretim sırası dâhildir. Divanhane ile Surlar kara garnizonunu büyütür.</p><Facts rows={[[ 'Yağmadan korunan stok', `${num(safeStock(game))} / mal`]]} /><p>Yağma koruması ambar kapasitesi ve Koruma Usulü araştırmasıyla hesaplanır. İlim yağmalanmaz.</p><GameButton variant="outline" onClick={() => onBuilding('ambar')}>Ambarı incele</GameButton></details></Box>
  </>
  return <>
    <Box title="Sığınağın istihbarat sicili"><Facts rows={[[ 'Sığınağın casus yerleri', num(game.buildings.siginak * BUILDING_EFFECTS.siginakSpies) ], ['Toplam casus kapasitesi', num(spyCapacity(game))], ['Kayıtlı casuslar', num(game.army.casus)], ['Casusluk başarısına şehir katkısı', `+%${pct(spyBonus(game))}`]]} /><p className="defense-note">Toplam kapasite Elçilik ve Sığınak’tan gelir. Şehir katkısı görev ihtimaline eklenir; kesin başarı hedefe ve gönderilen casus sayısına bağlıdır.</p><div className="defense-actions"><GameButton onClick={() => onBuilding('elcilik')}>Elçilikte casus yetiştir</GameButton><GameButton variant="outline" onClick={onIsland}>Casusluk hedefi seç</GameButton></div></Box>
    <Box title="Karşı casusluk"><Facts rows={[[ 'Şehrin karşı casusluk gücü', `%${pct(counterSpy(game))}` ], ['Taramada casus başına yakalama', `%${pct(Math.min(.95, .4 + counterSpy(game)))}`]]} /><p className="defense-note">Bir tarama her yabancı casusu ayrı sınar; hepsinin yakalanması garanti değildir. Casus kovulan bir aramadan sonra muhafızlar 30 dakika bekler. Yakalanan casusun hükümdarıyla ilişki 3 puan düşer.</p></Box>
  </>
}
