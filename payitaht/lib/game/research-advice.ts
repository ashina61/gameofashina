/** Salt okunur öneri: mevcut kuralları kullanır, araştırma emri vermez. */
import { RESEARCH, RESEARCH_IDS, RESOURCE_IDS, capacity, contentment, housing, population, rates, scientistCount, soldiers, wineServed, type Game, type ResearchId } from './engine'

export function researchAdvice(g: Game): string {
  if (!g.buildings.medrese) return 'Hünkârım, önce bir Medrese kurmalıyız. Araştırmalarımız ancak ilim meclisi kurulunca başlayabilir.'
  if (g.study) return `Hünkârım, ${RESEARCH[g.study.id as ResearchId].name} üzerinde çalışıyoruz. ${RESEARCH[g.study.id as ResearchId].description} Bu çalışma bitmeden yenisine başlayamayız.`
  const unfinished = RESEARCH_IDS.filter(id => !g.research.includes(id))
  const pending = unfinished.filter(id => !g.empire?.studying?.includes(id))
  if (!unfinished.length) return 'Hünkârım, bütün araştırmalarımız tamamlandı. Gelecek araştırmalarından birini ilerleterek şehrimizin kazanımlarını artırabiliriz.'
  if (!pending.length) return 'Hünkârım, kalan araştırmalar diğer şehirlerimizde sürüyor. Tamamlanmalarını bekleyelim; aynı çalışmayı iki kez başlatamayız.'
  const eligible = pending.filter(id => (!RESEARCH[id].needs || g.research.includes(RESEARCH[id].needs!)) && g.buildings.medrese >= RESEARCH[id].required)
  if (!eligible.length) {
    const next = pending.filter(id => !RESEARCH[id].needs || g.research.includes(RESEARCH[id].needs!)).sort((a,b) => RESEARCH[a].required - RESEARCH[b].required)[0]
    return next ? `Hünkârım, ${RESEARCH[next].name} için Medreseyi ${RESEARCH[next].required}. seviyeye yükseltmeliyiz. ${RESEARCH[next].description}` : 'Hünkârım, diğer şehirlerimizdeki araştırmaların tamamlanmasını bekleyelim; aynı çalışmayı iki kez başlatamayız.'
  }
  const priority: [ResearchId[], string][] = []
  const capital = g.empire?.capital ?? true
  if (contentment(g) <= population(g) + 30) priority.push([[...(capital ? ['kuyu', 'utopya'] as ResearchId[] : []), 'tatil', ...(wineServed(g) ? ['mutfak'] as ResearchId[] : [])], 'halkımızın huzurunu ve şehrimizin büyümesini desteklemek için'])
  if (housing(g) <= population(g) + 30) priority.push([[...(capital ? ['kuyu'] as ResearchId[] : []), 'kent_planlama'], 'halkımıza daha fazla barınma alanı sağlamak için'])
  if (RESOURCE_IDS.some(r => r !== 'knowledge' && g.resources[r] >= capacity(g) * .85)) priority.push([['storage', 'ambar_teknigi'], 'ambarımız dolmaya yaklaştığı için'])
  if (rates(g).gold < 0) priority.push([['tools', 'askeri_lojistik'], 'hazinemizin gelir ve gider dengesini iyileştirmek için'])
  if (g.queue.length) priority.push([['architecture', 'makara', 'geometri'], 'devam eden şehir gelişimini sonraki inşaatlarda daha verimli sürdürmek için'])
  if (soldiers(g) > 0) priority.push([['celik', 'zirh', 'istihkam'], 'ordumuzun ve şehir savunmamızın gücünü artırmak için'])
  if (g.buildings.liman > 0) priority.push([['pusula', 'haritacilik'], 'limanımızın nakliye olanaklarını geliştirmek için'])
  if (scientistCount(g) > 0) priority.push([['alimler', 'kagit', 'murekkep'], 'âlimlerimizin daha çok ilim üretmesi için'])
  priority.push([['tools', 'makara'], 'şehrimizin üretim ve gelişimini desteklemek için'])
  const choice = priority.map(([ids, why]) => ({ id: ids.find(id => eligible.includes(id)), why })).find(x => x.id)
  const id = choice?.id ?? eligible.slice().sort((a,b) => RESEARCH[a].cost - RESEARCH[b].cost)[0]
  const r = RESEARCH[id]
  const short = Math.max(0, Math.ceil(r.cost - g.resources.knowledge))
  const ready = short ? ` Henüz ${short.toLocaleString('tr-TR')} ilim eksiğimiz var. ${scientistCount(g) ? 'Âlimlerimiz biriktiriyor; boşta halkınız varsa âlim sayısını artırabilirsiniz.' : 'Medreseye âlim atayarak ilim üretimini başlatmalıyız.'}` : ' Gerekli ilim hazır; araştırmayı şimdi başlatabiliriz.'
  return `Hünkârım, ${choice?.why ?? 'şehrimize yeni bir imkân kazandırmak için'} ${r.name} araştırmasını öneririm. ${r.description}${ready}`
}
