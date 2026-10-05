'use client'
import { useId, useState } from 'react'
import { BANNERS, BANNER_NAMES, CRESTS, CREST_NAMES, CREST_COLORS, COLOR_NAMES, type Profile, type BannerId } from '@/lib/game/profile'
import { ApprovedArt, RoyalCrest, RoyalStandard } from './approved-court-art'
import { GameButton } from './game-button'
import { t } from '@/lib/i18n/tr'

type Look = Pick<Profile, 'ruler' | 'motto' | 'crest' | 'color'> & { banner: BannerId }
const STEPS = [{ id: 'shape', name: 'Biçim', hint: 'Sancağının kesimini seç.', title: 'Sarayın kumaşları' }, { id: 'crest', name: 'Arma', hint: 'Altın sırmayla işlenen alametini seç.', title: 'Hükümdarın alameti' }, { id: 'color', name: 'Renk', hint: 'Sancağının ipek rengini seç.', title: 'İpek renkleri' }] as const
export function RoyalWardrobe({ value, change, save, cancel }: { value: Look; change: (next: Look) => void; save: () => void; cancel: () => void }) {
  const id = useId(), [choice, setChoice] = useState<typeof STEPS[number]['id']>('shape')
  const valid = value.ruler.trim().replace(/\s+/g, ' ').length >= 2, step = STEPS.find(s => s.id === choice)!
  const selected = choice === 'shape' ? BANNER_NAMES[value.banner] : choice === 'crest' ? CREST_NAMES[value.crest] : COLOR_NAMES[value.color as keyof typeof COLOR_NAMES]
  return <form className="sancaktar-workshop" onSubmit={event => { event.preventDefault(); if (valid) save() }}>
    <header className="sancaktar-heading"><ApprovedArt name="seal" /><div><h3>Sancaktar odası</h3><p>Saltanatının imzasını kendin işle.</p></div></header>
    <div className="sancaktar-identity"><label htmlFor={`${id}-name`}>Hükümdarın adı</label><input id={`${id}-name`} value={value.ruler} maxLength={24} minLength={2} required aria-invalid={!valid} onChange={event => change({ ...value, ruler: event.target.value })} /><label htmlFor={`${id}-motto`}>Düstur</label><input id={`${id}-motto`} value={value.motto} maxLength={60} placeholder="Devlet-i ebed-müddet" onChange={event => change({ ...value, motto: event.target.value })} /></div>
    <nav className="sancaktar-steps" aria-label="Sancak ayrıntısı">{STEPS.map((s, i) => <button type="button" key={s.id} aria-label={s.name} aria-pressed={choice === s.id} onClick={() => { setChoice(s.id); requestAnimationFrame(() => document.getElementById(`${id}-selection`)?.scrollIntoView({ block: 'start' })) }}><small aria-hidden="true">{i + 1}</small><span>{s.name}</span></button>)}</nav>
    <section className="sancaktar-selection" id={`${id}-selection`}><header><div><h4>{step.title}</h4><p>{step.hint}</p></div><span aria-live="polite">{selected}</span></header>
      {choice === 'shape' && <div className="sancaktar-cloths" role="radiogroup" aria-label="Sancak biçimi">{BANNERS.map(b => <button type="button" role="radio" aria-label={BANNER_NAMES[b]} aria-checked={value.banner === b} key={b} onClick={() => change({ ...value, banner: b })}><div className="sancaktar-cloth-art" aria-hidden="true"><RoyalStandard crest={value.crest} color={value.color} banner={b} /></div><span>{BANNER_NAMES[b]}</span><small>{value.banner === b ? '✓ Seçildi' : 'Seç'}</small></button>)}</div>}
      {choice === 'crest' && <div className="sancaktar-emblems" role="radiogroup" aria-label="Arma">{CRESTS.map(c => <button type="button" role="radio" aria-label={CREST_NAMES[c]} aria-checked={value.crest === c} key={c} onClick={() => change({ ...value, crest: c })}><RoyalCrest crest={c} /><span>{CREST_NAMES[c]}</span><small>{value.crest === c ? '✓ Seçildi' : 'Sırma arma'}</small></button>)}</div>}
      {choice === 'color' && <div className="sancaktar-colors" role="radiogroup" aria-label="Renk">{CREST_COLORS.map(c => <button type="button" role="radio" aria-label={COLOR_NAMES[c]} aria-checked={value.color === c} key={c} onClick={() => change({ ...value, color: c })}><div className="sancaktar-color-art" aria-hidden="true"><RoyalStandard crest={value.crest} color={c} banner={value.banner} /></div><span>{COLOR_NAMES[c]}</span><small>{value.color === c ? '✓ Seçildi' : 'İpek kumaş'}</small></button>)}</div>}
    </section>
    <div className="sancaktar-signature"><p>{valid ? 'Seçimlerin üstteki sancakta görünür. Kaydederek mühürle.' : 'Hükümdarın adı en az 2 harf olmalı.'}</p><div><GameButton type="submit" disabled={!valid}>Sancağı kaydet</GameButton><GameButton variant="outline" onClick={cancel}>{t.action.cancel}</GameButton></div></div>
  </form>
}
