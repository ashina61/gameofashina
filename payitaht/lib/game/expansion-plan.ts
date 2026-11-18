import { COLONY_COST, capitalCity, type Empire } from './empire'
import { idleMerchants } from './expeditions'
import { capacity, type BuildingId } from './engine'

export type ExpansionTarget = {
  cityId: string
  building?: BuildingId
  panel?: 'map' | 'cities' | 'island' | 'economy'
  manage?: boolean
}
export type ExpansionStep = {
  id: string
  title: string
  detail: string
  action: string
  done: boolean
  target: ExpansionTarget
}

/** Derived from the existing save. No separate progression or reward state. */
export function expansionPlan(empire: Empire): ExpansionStep[] {
  const capital = capitalCity(empire), game = capital.game
  if (!game.claimed.includes('first-raid') && game.buildings.divan < 5) return []
  const colony = empire.cities.find(city => city.id !== capital.id)
  const atCapital = { cityId: capital.id }
  const atColony = { cityId: colony?.id ?? capital.id }
  const hasColony = !!colony
  const fleet = idleMerchants(empire)
  const stores = game.resources
  const steps: ExpansionStep[] = [
    {
      id: 'divan',
      title: 'Divanhaneyi 3. seviyeye çıkar',
      detail: 'Sarayın kurulması için gereken yönetim seviyesini aç.',
      action: 'Divanhaneye git',
      done: hasColony || game.buildings.divan >= 3,
      target: { ...atCapital, building: 'divan' },
    },
    {
      id: 'harbour',
      title: 'Başkentte Ticaret Limanı kur',
      detail: 'Ortak ticaret filosunu ve şehirler arası nakliyeyi aç.',
      action: 'Limanı aç',
      done: hasColony || game.buildings.liman >= 1,
      target: { ...atCapital, building: 'liman' },
    },
    {
      id: 'palace',
      title: 'Başkentte Saray kur',
      detail: 'Sarayın ilk seviyesi bir koloni yönetmeni sağlar.',
      action: 'Sarayı aç',
      done: hasColony || game.buildings.saray >= 1,
      target: { ...atCapital, building: 'saray' },
    },
    {
      id: 'fleet',
      title: 'Limanda 3 boş ticaret gemisi hazırla',
      detail: `${fleet} / 3 gemi limanda. Seferdeki gemiler dönünce yeniden kullanılabilir.`,
      action: 'Filoyu yönet',
      done: hasColony || fleet >= 3,
      target: { ...atCapital, building: 'liman', manage: true },
    },
    {
      id: 'stores',
      title: 'Koloni erzağını başkentte biriktir',
      detail: `${Math.floor(stores.gold).toLocaleString('tr-TR')} / ${COLONY_COST.gold.toLocaleString('tr-TR')} akçe · ${Math.floor(stores.wood).toLocaleString('tr-TR')} / ${COLONY_COST.wood.toLocaleString('tr-TR')} kereste`,
      action: 'Üretimi aç',
      done: hasColony || stores.gold >= COLONY_COST.gold && stores.wood >= COLONY_COST.wood,
      target: { ...atCapital, panel: 'economy' },
    },
    {
      id: 'colony',
      title: 'Yeni bir adada ilk kolonini kur',
      detail: 'Kahve, kristal veya kükürt adası seçerek başkentindeki mermer üretimini tamamla.',
      action: 'Ada seç',
      done: hasColony,
      target: { ...atCapital, panel: 'map' },
    },
    {
      id: 'governor',
      title: 'Kolonide Valilik kur',
      detail: 'İlk Valilik, iki şehirli imparatorluğundaki koloninin yolsuzluğunu azaltır.',
      action: 'Valiliği aç',
      done: !!colony?.game.buildings.valilik,
      target: { ...atColony, building: 'valilik' },
    },
    {
      id: 'miners',
      title: 'Koloninin madenine 5 işçi ata',
      detail: 'Yeni adanın kaynağını üretmeye başla. İşçiler, koloninin boşta halkından ayrılır.',
      action: 'Madene git',
      done: (colony?.game.mine.miners ?? 0) >= 5,
      target: { ...atColony, panel: 'island' },
    },
    {
      id: 'cargo',
      title: 'Şehirlerin arasında ilk nakliyeyi gönder',
      detail: 'Yerleşimler ekranından başkente mal getir veya koloniye inşa malzemesi gönder.',
      action: 'Nakliyeyi aç',
      done: (empire.stats?.shipments ?? 0) > 0,
      target: { ...atCapital, panel: 'cities' },
    },
  ]
  if (!hasColony && capacity(game) < Math.max(COLONY_COST.gold, COLONY_COST.wood)) {
    const storesStep = steps.find(step => step.id === 'stores')!
    storesStep.detail = 'Koloni erzağını saklayabilmek için önce başkentteki Ambarı genişlet.'
    storesStep.action = 'Ambarı aç'
    storesStep.target = { ...atCapital, building: 'ambar' }
  }
  return steps
}
