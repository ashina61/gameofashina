import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dayGroups, dayLabel, logKind } from './log-view'

test('logKind sorts log lines into icon groups', () => {
  assert.equal(logKind('Ordu Karaçalı üzerine sefere çıktı.'), 'war')
  assert.equal(logKind('Gözcüler Kara Koy korsanlarını gördü! Baskın yaklaşıyor.'), 'war')
  assert.equal(logKind('Kışla 4. seviyeye ulaştı.'), 'build')
  assert.equal(logKind('Usta Elleri araştırması tamamlandı.'), 'research')
  assert.equal(logKind('Ticaret Merkezi: 200 mermer satıldı.'), 'trade')
  assert.equal(logKind('Büyük hedef: Sancak merkezi. Ödül hazinede.'), 'reward')
  assert.equal(logKind('Hoş geldin! Yokluğundaki 1 saatlik üretim ambara kondu.'), 'other')
})

test('dayGroups splits by calendar day, newest first', () => {
  const now = new Date(2026, 9, 2, 15).getTime()
  const g = dayGroups([{ time: now - 3600_000 }, { time: now - 2 * 3600_000 }, { time: now - 26 * 3600_000 }, { time: now - 5 * 86_400_000 }], now)
  assert.deepEqual(g.map(x => [x.label, x.items.length]), [['Bugün', 2], ['Dün', 1], [dayLabel(now - 5 * 86_400_000, now), 1]])
  assert.match(g[2].label, /Eyl/)
})
