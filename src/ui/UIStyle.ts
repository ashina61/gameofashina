import type Phaser from 'phaser';

/** Arayuzun ortak renk, yazi ve olcu degerleri. Tek kaynaktan tema yonetimi. */

export const UIColors = {
  panel: 0x1d1a13,
  panelBorder: 0x5a4c33,
  accent: 0xe8c86a,
  danger: 0xd05a52,
  success: 0x6ee27a,
} as const;

export const UIText = {
  primary: '#e9dcc0',
  muted: '#a2947a',
  accent: '#e8c86a',
  danger: '#f0908a',
  success: '#8ce69a',
} as const;

/** Dokunma hedeflerinin asgari boyutu - mobilde parmakla isabet icin. */
export const TOUCH_TARGET = 48;

/** Panel ve kenar bosluklari. */
export const UISpacing = {
  edge: 12,
  gap: 8,
  panelPadding: 14,
} as const;

/** Ortak yazi stili uretici. */
export function labelStyle(
  size: number,
  color: string = UIText.primary,
  bold = false,
): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
    fontSize: `${size}px`,
    color,
    fontStyle: bold ? 'bold' : 'normal',
  };
}
