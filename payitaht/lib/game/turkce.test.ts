import test from 'node:test'
import assert from 'node:assert/strict'
import { da, de, den, e } from './turkce'

test('Turkish case suffixes follow vowel harmony and consonant assimilation', () => {
  assert.equal(de('Lalezar'), "Lalezar'da")
  assert.equal(de('Fenerbahçe'), "Fenerbahçe'de")
  assert.equal(de('Beytülhikme'), "Beytülhikme'de")
  assert.equal(den('Ateşkapı'), "Ateşkapı'dan")
  assert.equal(den('Sakızlı'), "Sakızlı'dan")
  assert.equal(de('Bağbaşı'), "Bağbaşı'nda")
  assert.equal(e('Çınaraltı'), "Çınaraltı'na")
  assert.equal(den('Kulebaşı'), "Kulebaşı'ndan")
  assert.equal(e('Kartalkaya'), "Kartalkaya'ya")
  assert.equal(e('Kemerkale'), "Kemerkale'ye")
  assert.equal(e('Kara Murad Bey'), "Kara Murad Bey'e")
  assert.equal(e('Sarphisar'), "Sarphisar'a")
  assert.equal(den('Mercanköy'), "Mercanköy'den")
  assert.equal(de('Korsuyu'), "Korsuyu'nda")
  assert.equal(de('Mavisu'), "Mavisu'da")
  assert.equal(da('Koca Yusuf Ağa'), 'Koca Yusuf Ağa da')
  assert.equal(da('Ali Kuşçu Efendi'), 'Ali Kuşçu Efendi de')
})
