import test from 'node:test'
import assert from 'node:assert/strict'
import { initialGame, capacity, RESEARCH_IDS } from './engine'
import { researchAdvice } from './research-advice'
const setup = () => { const g = initialGame(1000); g.buildings.medrese = 3; g.resources.knowledge = 500; g.citizens = 20; return g }
test('medrese yokken araştırma başlatmayı önermez', () => {
  const g = setup(); g.buildings.medrese = 0
  assert.match(researchAdvice(g), /önce bir Medrese/)
})
test('aktif araştırmayı adı ve gerçek kazanımıyla anlatır', () => {
  const g = setup(); g.study = { kind: 'research', id: 'architecture', start: 1000, end: 46000 }
  assert.match(researchAdvice(g), /Mimarın Sırrı.*%25.*bitmeden/)
})
test('huzur sınırına yaklaşan başkentte halka yararlı araştırma önerir', () => {
  const g = setup(); g.citizens = 120
  assert.match(researchAdvice(g), /halkımızın huzurunu.*Kuyu Kazımı.*50 artar/)
})
test('ambar dolmaya yakınken saklama kapasitesini önce önerir', () => {
  const g = setup(); g.resources.wood = capacity(g) * .9
  assert.match(researchAdvice(g), /ambarımız dolmaya.*Ambar Nizamı/)
})
test('ilim eksikken hazırmış gibi konuşmaz; âlim atamasına yönlendirir', () => {
  const g = setup(); g.resources.knowledge = 0; g.workers.medrese = 0
  assert.match(researchAdvice(g), /ilim eksiğimiz.*âlim atayarak/)
  assert.doesNotMatch(researchAdvice(g), /şimdi başlat/)
})
test('tamamlanan veya Medrese seviyesinin yetmediği araştırmayı önermez', () => {
  const g = setup(); g.buildings.medrese = 1; g.workers.medrese = 5; g.research = ['tools', 'makara']
  assert.doesNotMatch(researchAdvice(g), /Âlimler Meclisi araştırmasını|Usta Elleri araştırmasını/)
})
test('ağaç tamamlanınca Gelecek araştırmalarına yönlendirir', () => {
  const g = setup(); g.research = [...RESEARCH_IDS]
  assert.match(researchAdvice(g), /bütün araştırmalarımız tamamlandı.*Gelecek/)
})
