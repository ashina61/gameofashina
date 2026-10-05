/**
 * Court v2 profile/settings replaced the old stage markup, but the shared
 * court stylesheet still carries these selectors for older review snapshots
 * and secondary branches. Keeping the names here makes that compatibility
 * intentional instead of looking like accidental dead CSS to the strict
 * unused-class audit.
 */
export const LEGACY_COURT_CSS_SELECTORS = [
  'sovereign-stage',
  'sovereign-banner',
  'sovereign-name',
  'sovereign-roll',
  'sovereign-motto',
  'court-wardrobe',
  'court-signature',
  'admin-stage',
  'admin-ribbon',
] as const
