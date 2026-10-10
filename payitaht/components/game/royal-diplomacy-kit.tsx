'use client'
import { useState } from 'react'
import { asset } from '@/lib/asset'
import { BANNERS, BANNER_NAMES, CRESTS, CREST_NAMES, CREST_COLORS, COLOR_NAMES, type Profile, type BannerId } from '@/lib/game/profile'
import { ApprovedArt, RoyalCrest, RoyalStandard } from './approved-court-art'
import { CourtTabs } from './court-kit'
import { ScrollText } from './ui-art'
import { GameButton } from './game-button'
import { t } from '@/lib/i18n/tr'

export function DiplomaticScene({ title, subtitle, alliance = false, standard }: { title: string; subtitle: string; alliance?: boolean; standard?: Pick<Profile, 'crest' | 'color'> & { banner?: BannerId } }) {
  return <><div className={`diplomatic-scene${alliance ? ' is-alliance' : ''}`}><img src={asset(alliance ? '/images/game/ui/approved-court/profile-scene.webp' : '/images/game/ui/divan/envoy-scene.webp')} alt="" width={1200} height={400} />{standard && <RoyalStandard {...standard} banner={standard.banner ?? 'kirlangic'} />}<div className="diplomatic-scene-caption"><h2>{title}</h2></div></div><p className="diplomatic-scene-note">{subtitle}</p></>
}
export function DiplomaticEmpty({ title, children, art = 'seal' }: { title: string; children: React.ReactNode; art?: string }) {
  return <div className="diplomatic-empty"><ApprovedArt name={art} /><div><h3>{title}</h3><p>{children}</p></div></div>
}
type FlagLook = Pick<Profile, 'crest' | 'color'> & { banner: BannerId }
export function RoyalFlagEditor({ value, change, save, cancel }: { value: FlagLook; change: (v: FlagLook) => void; save: () => void; cancel: () => void }) {
  const [tab, setTab] = useState<'shape' | 'crest' | 'color'>('shape')
  return <div className="diplomatic-flag-editor"><div className="diplomatic-flag-preview"><RoyalStandard {...value} /></div><CourtTabs value={tab} onChange={setTab} label="İttifak sancağı ayrıntısı" items={[{ id: 'shape', label: 'Biçim', Icon: ScrollText, art: '/images/game/ui/approved-court/seal.webp' }, { id: 'crest', label: 'Arma', Icon: ScrollText, art: '/images/game/ui/approved-court/laurel.webp' }, { id: 'color', label: 'Renk', Icon: ScrollText, art: '/images/game/ui/approved-court/trade.webp' }]}>
    <div className="sancaktar-selection">
      {tab === 'shape' && <div className="sancaktar-cloths" role="radiogroup" aria-label="Sancak biçimi">{BANNERS.map(b => <button type="button" role="radio" aria-label={BANNER_NAMES[b]} aria-checked={value.banner === b} key={b} onClick={() => change({ ...value, banner: b })}><div className="sancaktar-cloth-art" aria-hidden="true"><RoyalStandard {...value} banner={b} /></div><span>{BANNER_NAMES[b]}</span></button>)}</div>}
      {tab === 'crest' && <div className="sancaktar-emblems" role="radiogroup" aria-label="Arma">{CRESTS.map(c => <button type="button" role="radio" aria-label={CREST_NAMES[c]} aria-checked={value.crest === c} key={c} onClick={() => change({ ...value, crest: c })}><RoyalCrest crest={c} /><span>{CREST_NAMES[c]}</span></button>)}</div>}
      {tab === 'color' && <div className="sancaktar-colors" role="radiogroup" aria-label="Renk">{CREST_COLORS.map(c => <button type="button" role="radio" aria-label={COLOR_NAMES[c]} aria-checked={value.color === c} key={c} onClick={() => change({ ...value, color: c })}><div className="sancaktar-color-art" aria-hidden="true"><RoyalStandard {...value} color={c} /></div><span>{COLOR_NAMES[c]}</span></button>)}</div>}
    </div>
  </CourtTabs><div className="diplomatic-signature"><GameButton onClick={save}>Sancağı kaydet</GameButton><GameButton variant="outline" onClick={cancel}>{t.action.cancel}</GameButton></div></div>
}
