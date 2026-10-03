/**
 * TÜRKÇE EKLER — özel adlara kesme işaretiyle hâl eki. Ünlü uyumu son
 * ünlüye, ünsüz benzeşmesi son harfe bakar: Lalezar'da, Fenerbahçe'de,
 * Kemerkale'ye, Ateşkapı'dan, Kartalkaya'ya. Tamlama biçimli adlar
 * kaynaştırma n'si alır: Bağbaşı'nda, Çınaraltı'na, Korsuyu'ndan.
 */
const VOWELS = 'aıoueiöüâîû', BACK = 'aıouâû', HARD = 'fstkçşhp'
const low = (w: string) => w.toLocaleLowerCase('tr')
const lastVowel = (w: string) => [...low(w)].reverse().find(c => VOWELS.includes(c)) ?? 'e'
const back = (w: string) => BACK.includes(lastVowel(w))
const endsVowel = (w: string) => VOWELS.includes(low(w).at(-1) ?? '')
const hard = (w: string) => HARD.includes(low(w).at(-1) ?? '')
const compound = (w: string) => /(başı|altı|suyu|üstü|yanı|önü|içi)$/.test(low(w))

/** Bulunma: -de/-da/-te/-ta. */
export const de = (w: string) => `${w}'${compound(w) ? 'nd' : hard(w) ? 't' : 'd'}${back(w) ? 'a' : 'e'}`
/** Ayrılma: -den/-dan/-ten/-tan. */
export const den = (w: string) => `${de(w)}n`
/** Yönelme: -e/-a, ünlüyle bitende -ye/-ya. */
export const e = (w: string) => `${w}'${compound(w) ? 'n' : endsVowel(w) ? 'y' : ''}${back(w) ? 'a' : 'e'}`
/** Bağlaç "de/da": ayrı yazılır, uyumu önceki kelimeye bakar ("Hızır da", "Ağa da"). */
export const da = (w: string) => `${w} ${back(w) ? 'da' : 'de'}`
