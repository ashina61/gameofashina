'use client'

/**
 * HÜKÜMDAR PROFİLİ (Ikariam'daki oyuncu profili) ve SÜRÜM NOTLARI.
 * Profil: arma, ad, unvan, düstur, puanlar ve sıralama, şehirler,
 * istatistikler, başarımlar. Sürüm numarası sayfanın dibinde, sessizce durur.
 */
import { RoyalStandard, RoyalCrest } from './approved-court-art'
import { AtlasArt } from './deep-art'
import { asset } from '@/lib/asset'
import {
  BANNERS, BANNER_NAMES, COLOR_NAMES, CREST_COLORS, CREST_NAMES, CRESTS, type BannerId, type MedalTier,
  type CrestId, type Profile,
} from '@/lib/game/profile'


/** Older consumers share the approved painted standards and embroidery. */
export function SancakArt({ crest, color, banner = 'kirlangic', size = 280, still: _still = false }: { crest: CrestId; color: string; banner?: BannerId; size?: number; still?: boolean }) {
  return <span className="sancak-art" role="img" aria-label={`Sancak: ${BANNER_NAMES[banner]}`} style={{ display: 'inline-block', width: size, height: size * 214 / 320 }}><RoyalStandard crest={crest} color={color} banner={banner} /></span>
}

export type SancakChoice = Pick<Profile, 'crest' | 'color'> & { banner: BannerId }
export function SancakPicker({ value, onChange }: { value: SancakChoice; onChange: (value: SancakChoice) => void }) {
  return <div className="sancak-picker">
      <span className="profile-label">Sancak</span>
      <div className="banner-picker" role="radiogroup" aria-label="Sancak biçimi">{BANNERS.map(b => <button key={b} type="button" role="radio" aria-checked={value.banner === b}
        aria-label={BANNER_NAMES[b]} onClick={() => onChange({ ...value, banner: b })} title={BANNER_NAMES[b]}><SancakArt crest={value.crest} color={value.color} banner={b} size={72} still /><small>{BANNER_NAMES[b]}</small></button>)}</div>
      <span className="profile-label">Arma</span>
      <div className="crest-picker" role="radiogroup" aria-label="Arma">{CRESTS.map(c => <button key={c} type="button" role="radio" aria-checked={value.crest === c}
        aria-label={CREST_NAMES[c]} onClick={() => onChange({ ...value, crest: c })} title={CREST_NAMES[c]}><RulerCrest crest={c} color={value.color} size={44} /></button>)}</div>
      <span className="profile-label">Renk</span>
      <div className="color-picker" role="radiogroup" aria-label="Renk">{CREST_COLORS.map(c => <button key={c} type="button" role="radio" aria-checked={value.color === c}
        style={{ background: c }} onClick={() => onChange({ ...value, color: c })} aria-label={COLOR_NAMES[c]} title={COLOR_NAMES[c]}>{value.color === c && <span className="swatch-check" aria-hidden="true">✓</span>}</button>)}</div>
  </div>
}

/** Hükümdar arması: altın çerçeveli kalkan, renk zemin, sembol. */
export function RulerCrest({ crest, color, size = 72 }: { crest: CrestId; color: string; size?: number }) {
  return <span className="ruler-crest" role="img" aria-label={`Arma: ${CREST_NAMES[crest]}`} style={{ display: 'inline-block', width: size, height: size, backgroundColor: color, borderRadius: '50%', position: 'relative' }}><RoyalCrest crest={crest} /></span>
}

/** Madalya: kurdele ve disk; derece rengi tunç, gümüş ya da altın. */
const MEDAL_IDS = ['ilk-tas', 'kurucu', 'beyler', 'payitaht', 'sur', 'mimar', 'usta', 'koloni', 'adalar', 'kalabalik', 'kalabalik2', 'talebe', 'alim', 'allame', 'talim', 'ordu', 'donanma', 'ilk-zafer', 'zafer', 'zafer2', 'yagma', 'korsan1', 'korsan', 'casus1', 'casus', 'kervan', 'hayir', 'harika', 'ittifak', 'sadakat']
export function Medal({ tier, earned = true, size = 40, id }: { tier: MedalTier; earned?: boolean; size?: number; id?: string }) {
  const index = Math.max(0, MEDAL_IDS.indexOf(id ?? 'ilk-tas'))
  return <span className="medal-svg" aria-hidden="true" style={{ width: size, height: size * 1.2, display: 'inline-grid', placeItems: 'center', position: 'relative', flexShrink: 0, filter: earned ? undefined : 'grayscale(1) opacity(.45)' }}>
    {tier === 3 ? <img src={asset('/images/game/ui/medal-frame.webp')} alt="" width={size} height={size * 1.2} style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'contain' }} /> : <AtlasArt atlas="culture" index={tier === 1 ? 18 : 19} size={size} />}
    <span style={{ position: 'absolute', bottom: size * .11, left: size * .21 }}><AtlasArt atlas="medals" index={index} size={size * .58} /></span>
  </span>
}
