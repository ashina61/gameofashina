import type { CSSProperties } from 'react'
import { asset } from './asset'

/** G1 kit: one phone-size source per material, shared across UI surfaces. */
export const PAINTED_UI = ['page-frame', 'walnut-plate', 'button-gold', 'button-parch', 'button-red', 'ribbon-red', 'medal-frame'] as const

export const paintedUiStyle = Object.fromEntries(PAINTED_UI.map(name => [
  `--art-${name}`, `url("${asset(`/images/game/ui/${name}.webp`)}")`,
])) as CSSProperties
