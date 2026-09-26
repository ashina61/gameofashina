/**
 * BİNA ETKİLERİ — her yapının bir seviyede NE verdiği, oyuncunun okuyacağı dille.
 *
 * Sayılar elle yazılmaz: yapının seviyesi değiştirilmiş bir oyun kopyası
 * üzerinde motorun kendi fonksiyonları çağrılır. Böylece panelde görünen
 * değer ile oyunun gerçekten uyguladığı değer asla ayrışmaz.
 */
import {
  BUILDING_EFFECTS, UNITS, UNIT_IDS, WORKERS_PER_LEVEL, capacity, contentment, corruption, counterSpy, drillBonus, exchangeLimit, exchangeRate, housing,
  merchantBuyPrice, merchantLimit, merchantSellPrice, tradeCapacity, wallDefense, type BuildingId, type Game,
} from './engine'
import { himmetCap, himmetRate, patronSlots } from './guilds'
import { lutufCap, lutufRate } from './gods'

export type EffectLine = { label: string; value: string }

const pct = (x: number) => `%${Math.round(x * 100)}`
const num = (x: number) => Math.round(x).toLocaleString('tr-TR')

/** `level` seviyesindeki yapının etkileri. */
export function effectLines(game: Game, id: BuildingId, level: number): EffectLine[] {
  const g: Game = { ...game, buildings: { ...game.buildings, [id]: level } }
  const E = BUILDING_EFFECTS
  // Uzun birlik listesi yerine sayı ve o seviyede açılanlar (dar ekranda tablo taşmasın).
  const unlocks = (home: BuildingId) => {
    const all = UNIT_IDS.filter(u => UNITS[u].home === home && UNITS[u].level <= level)
    const fresh = all.filter(u => UNITS[u].level === level).map(u => UNITS[u].name)
    return all.length ? `${all.length} tür${fresh.length ? ` · yeni: ${fresh.join(', ')}` : ''}` : '—'
  }
  switch (id) {
    case 'divan': return [
      { label: 'Diğer yapıların tavanı', value: `Sv. ${level + 1}` },
      { label: 'İdari barınma', value: `+${num(Math.max(0, level - 1) * E.divanHousing)} kişi` },
    ]
    case 'saray': return [
      { label: 'Koloni hakkı', value: `${level} yeni şehir` },
      { label: 'Akçe geliri', value: `+${pct(level * E.sarayGold)}` },
    ]
    case 'elcilik': return [
      { label: 'Casus yeri', value: `${level * E.elcilikSpies}` },
      { label: 'Casusluk başarısı', value: `+${pct(level * E.elcilikSpySuccess)}` },
      { label: 'Casus eğitimi', value: `${pct(drillBonus(g, 'elcilik'))} hızlı` },
    ]
    case 'konut': return [
      { label: 'Barınma', value: `${num(housing(g))} kişi` },
      { label: 'Halkın vergisi', value: `+${num(level * 120)} akçe/dk` },
    ]
    case 'hamam': return [{ label: 'Huzur', value: `+${num(level * 60)} (toplam ${num(contentment(g))})` }]
    case 'carsi': return [
      { label: 'Esnaf yeri', value: `${level * WORKERS_PER_LEVEL} kişi` },
      { label: 'Tam kadroda akçe', value: `+${num(level * 100)}/dk` },
      { label: 'Tüccar partisi', value: `${num(merchantLimit(g))} birim` },
    ]
    case 'ambar': return [{ label: 'Kaynak başına ambar', value: `${num(capacity(g))}` }]
    case 'kereste': return [
      { label: 'Oduncu yeri', value: `${level * WORKERS_PER_LEVEL} kişi` },
      { label: 'Tam kadroda kereste', value: `+${num(level * 120)}/dk` },
    ]
    case 'tas': return [
      { label: 'Taşçı yeri', value: `${level * WORKERS_PER_LEVEL} kişi` },
      { label: 'Tam kadroda taş', value: `+${num(level * 90)}/dk` },
    ]
    case 'medrese': return [
      { label: 'Âlim yeri', value: `${level * WORKERS_PER_LEVEL} kişi` },
      { label: 'Tam kadroda ilim', value: `+${num(level * 8)}/dk` },
    ]
    case 'kisla': return [
      { label: 'Eğitim hızı', value: `${pct(drillBonus(g, 'kisla'))} hızlı` },
      { label: 'Eğitilebilen', value: unlocks('kisla') },
    ]
    case 'surlar': return [{ label: 'Sur savunması', value: `${num(wallDefense(g))}` }]
    case 'liman': return [
      { label: 'Ticaret kapasitesi', value: `${num(tradeCapacity(g))} mal` },
      { label: 'Nakliye eğitimi', value: `${pct(drillBonus(g, 'liman'))} hızlı` },
    ]
    case 'tersane': return [
      { label: 'Gemi yapım hızı', value: `${pct(drillBonus(g, 'tersane'))} hızlı` },
      { label: 'Yapılabilen', value: unlocks('tersane') },
    ]
    case 'kahvehane': return [
      { label: 'Huzur', value: `+${num(level * E.kahvehaneContentment)}` },
      { label: 'Üzüm ikramıyla', value: `+${num(level * E.kahvehaneWineBonus)} huzur daha` },
      { label: 'Üzüm tüketimi', value: `${num(level * E.kahvehaneWine)}/dk` },
    ]
    case 'cami': return [
      { label: 'Huzur', value: `+${num(level * E.camiContentment)}` },
      { label: 'İlim üretimi', value: `+${pct(level * E.camiKnowledge)}` },
    ]
    case 'muze': return [{ label: 'Huzur', value: `+${num(level * E.muzeContentment)}` }]
    case 'marangoz': return [{ label: 'Kereste maliyeti', value: `-${pct(level * E.marangozWood)}` }]
    case 'mimar': return [{ label: 'Taş ve mermer maliyeti', value: `-${pct(level * E.mimarStone)}` }]
    case 'ormanci': return [{ label: 'Kereste üretimi', value: `+${pct(level * E.ormanciWood)}` }]
    case 'tasci': return [{ label: 'Taş ve mermer üretimi', value: `+${pct(level * E.tasciStone)}` }]
    case 'tophane': return [{ label: 'Birlik saldırı ve savunması', value: `+${pct(level * E.tophanePower)}` }]
    case 'bagci': return [{ label: 'Üzüm üretimi', value: `+${pct(level * E.bagciWine)}` }]
    case 'simyahane': return [{ label: 'Kükürt üretimi', value: `+${pct(level * E.simyaSulfur)}` }]
    case 'camci': return [{ label: 'Kristal üretimi', value: `+${pct(level * E.camciCrystal)}` }]
    case 'mahzen': return [{ label: 'Kahvehane üzüm tüketimi', value: `-${pct(Math.min(0.5, level * E.mahzenWine))}` }]
    case 'gozlukcu': return [{ label: 'Kristal maliyeti', value: `-${pct(Math.min(0.5, level * E.gozlukcuCrystal))}` }]
    case 'barutane': return [{ label: 'Birliklerin kükürt maliyeti', value: `-${pct(Math.min(0.5, level * E.barutaneSulfur))}` }]
    case 'depo': return [{ label: 'Ek saklama', value: `+${num(level * E.depoStorage)} (toplam ${num(capacity(g))})` }]
    case 'ticaret_merkezi': return [
      { label: 'Tüccar partisi', value: `${num(merchantLimit(g))} birim` },
      { label: 'Alış / satış fiyatı', value: `${merchantBuyPrice(g)} / ${merchantSellPrice(g)} akçe` },
    ]
    case 'harita_arsivi': return [{ label: 'Nakliye ve sefer yolu', value: `-${pct(Math.min(0.5, level * E.harita))}` }]
    case 'valilik': return [
      // Yolsuzluk 1 - (Valilik+1)/(koloni+1): Valilik seviyesi kadar koloniye kadar sıfırdır.
      { label: 'Yolsuzluksuz koloni sayısı', value: `${level}` },
      { label: 'Bu şehirde yolsuzluk', value: `%${Math.round(corruption(g) * 100)}` },
    ]
    case 'korsan_kalesi': return [
      { label: 'Yağma ganimeti', value: `+${pct(level * E.korsanLoot)}` },
      { label: 'Korsan seferi', value: level > 0 ? 'açık' : 'kapalı' },
    ]
    case 'tekke': return [
      { label: 'Himmet', value: `+${(himmetRate(g)).toFixed(1)}/dk · en fazla ${num(himmetCap(g))}` },
      { label: 'Himaye edilen lonca', value: `${patronSlots(level)}` },
    ]
    case 'mabet': return [
      { label: 'Lütuf', value: `+${(lutufRate(g)).toFixed(1)}/dk · en fazla ${num(lutufCap(g))}` },
      { label: 'Hami tanrının lütfü', value: `${Math.min(20, level)}. derece` },
    ]
    case 'siginak': return [
      { label: 'Casus yeri', value: `+${level * E.siginakSpies}` },
      { label: 'Casusluk başarısı', value: `+${pct(level * E.siginakSpySuccess)}` },
      { label: 'Yabancı casus yakalama', value: pct(counterSpy(g)) },
    ]
    case 'kara_pazar': return [
      { label: 'Takas oranı', value: `${exchangeRate(g)} : 1` },
      { label: 'Takas partisi', value: `${num(exchangeLimit(g))} birim` },
    ]
  }
}
