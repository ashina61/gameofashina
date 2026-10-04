'use client'

import { useId, useRef, useState, type ReactNode } from 'react'
import { asset } from '@/lib/asset'
import { Castle, Gift, Crown } from './ui-art'

const SECTIONS = [
  { id: 'city', label: 'Şehir hedefi', Icon: Castle },
  { id: 'daily', label: 'Günlük', Icon: Gift },
  { id: 'milestones', label: 'Başarımlar', Icon: Crown },
] as const
type Section = typeof SECTIONS[number]['id']

/** Presentation only: existing goal/reward panels keep their original actions. */
export function ObjectivesPage({ city, daily, milestones, season }: {
  city: ReactNode; daily: ReactNode; milestones: ReactNode; season: ReactNode
}) {
  const [section, setSection] = useState<Section>('city')
  const id = useId()
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const contents = { city, daily, milestones }
  return <div className="mandates-page">
    <section className="mandates-scene" aria-label="Divan görev dairesi">
      <img src={asset('/images/game/terrain/mandates-office.webp')} alt="" width={960} height={480} decoding="async" />
      <div className="mandates-scene-note"><span>Divan fermanları</span><p>Her tamamlanan görev, şehrinin geleceğine bir adım.</p></div>
    </section>
    <h2 className="mandates-ribbon">Fermanlar ve görevler</h2>
    <div className="mandates-tabs" role="tablist" aria-label="Görev defteri">
      {SECTIONS.map(({ id: key, label, Icon }, index) => <button type="button" key={key}
        ref={el => { tabs.current[index] = el }} id={`${id}-${key}-tab`} role="tab"
        aria-selected={section === key} aria-controls={`${id}-${key}-page`} tabIndex={section === key ? 0 : -1}
        onClick={() => setSection(key)} onKeyDown={event => {
          let next = index
          if (event.key === 'ArrowRight') next = (index + 1) % SECTIONS.length
          else if (event.key === 'ArrowLeft') next = (index + SECTIONS.length - 1) % SECTIONS.length
          else if (event.key === 'Home') next = 0
          else if (event.key === 'End') next = SECTIONS.length - 1
          else return
          event.preventDefault()
          setSection(SECTIONS[next].id)
          tabs.current[next]?.focus()
        }}><Icon painted aria-hidden="true" /><span>{label}</span></button>)}
    </div>
    {SECTIONS.map(({ id: key }) => <section key={key} id={`${id}-${key}-page`} role="tabpanel"
      aria-labelledby={`${id}-${key}-tab`} hidden={section !== key} className="mandates-ledger">
      {section === key && <>{contents[key]}{key === 'daily' && season}</>}
    </section>)}
  </div>
}
