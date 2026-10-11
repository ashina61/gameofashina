'use client'

/**
 * İLK AÇILIŞ REHBERİ — yeni oyuncuya ekranın dört köşesini sırayla gösterir:
 * kaynaklar, danışmanlar, ilk hedef ve alt menü. Her adım ilgili öğeyi
 * vurgular (öğenin ekrandaki kutusu ölçülür); "Atla" ya da son adım rehberi
 * bir daha göstermez. Kayıt yerine cihazda bir bayrak tutulur.
 */
import { useEffect, useLayoutEffect, useState } from 'react'

const KEY = 'payitaht-rehber'

type Step = { target: string; title: string; text: string }
const STEPS: Step[] = [
  { target: '.ika-res', title: 'Hazinen', text: 'Akçe, kereste ve ilim burada birikir; yeşil sayılar dakikalık üretimdir. Ambar dolunca sayı kızarır, üretim boşa gider.' },
  { target: '.ika-advisors', title: 'Danışmanların', text: 'Şehir, ordu, ilim ve diplomasi danışmanı. Kırmızı rozet, ilgilenmen gereken bir şey olduğunu söyler.' },
  { target: '.quest-chip', title: 'İlk on dakikan', text: 'Hedefler şehri adım adım kurdurur ve ödül verir. Her adımda basacağın tek düğme parlar, üstünde ok durur: önce Divanhane ve Medrese, sonra ilk âlimin, ilk araştırman, sur temeli, ilk bölüğün ve ilk seferin.' },
  { target: '.ika-nav', title: 'Dünyan', text: 'Şehir, ada, dünya haritası, ittifak ve görevler arasında buradan geçersin. Boş bir arsaya dokunarak bina kurabilirsin.' },
]

export function shouldShowGuide(): boolean {
  try { return localStorage.getItem(KEY) !== 'goruldu' } catch { return false }
}

export function FirstRunGuide({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0)
  const [box, setBox] = useState<DOMRect | null>(null)
  const step = STEPS[i]
  useLayoutEffect(() => {
    const measure = () => setBox(document.querySelector(step.target)?.getBoundingClientRect() ?? null)
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [step.target])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') finish() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })
  function finish() {
    try { localStorage.setItem(KEY, 'goruldu') } catch { /* oturumluk */ }
    onDone()
  }
  // Kart, vurgulanan öğenin karşı yarısında durur (öğeyi örtmez).
  const below = !box || box.top + box.height / 2 < window.innerHeight / 2
  const edge = box ? Math.max(12, Math.min(window.innerHeight - 120, below ? box.bottom + 14 : window.innerHeight - box.top + 14)) : 12
  const cardStyle = box
    ? { ...(below ? { top: edge } : { bottom: edge }), maxHeight: window.innerHeight - edge - 12 }
    : { top: '35%', maxHeight: 'calc(65dvh - 12px)' }
  return <div className="frg" role="dialog" aria-modal="true" aria-labelledby="frg-title">
    {box && <span className="frg-spot" style={{ left: box.left - 6, top: box.top - 6, width: box.width + 12, height: box.height + 12 }} aria-hidden="true" />}
    <div className="frg-card" style={cardStyle}>
      <span className="eyebrow">REHBER · {i + 1} / {STEPS.length}</span>
      <h3 id="frg-title">{step.title}</h3>
      <p>{step.text}</p>
      <div className="frg-actions">
        <button type="button" className="ovl-btn is-ghost" onClick={finish}>Atla</button>
        <button type="button" className="ovl-btn" onClick={() => (i + 1 < STEPS.length ? setI(i + 1) : finish())}>{i + 1 < STEPS.length ? 'İleri' : 'Başlayalım'}</button>
      </div>
    </div>
  </div>
}
