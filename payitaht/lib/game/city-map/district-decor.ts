import type { BuildingId } from '@/lib/game/engine'

export type DistrictProp = {
  asset: string
  /** TILE.w / TILE.h cinsinden slot merkezine göre konum. */
  dx: number
  dy: number
  /** Ekrandaki hedef genişlik TILE.w çarpanı. */
  width: number
  minLevel: number
  alpha?: number
}

/**
 * Bina çevresi, binanın parçası DEĞİLDİR; aynı slotta bina değişirse dekor da
 * değişir. Böylece 2x2 standardı ve taşınabilirlik korunurken mahalle karakteri
 * kazanılır.
 */
const D: Partial<Record<BuildingId, DistrictProp[]>> = {
  divan: [
    { asset: 'lamp', dx: -1.02, dy: 0.05, width: 0.25, minLevel: 1 },
    { asset: 'lamp', dx: 1.02, dy: 0.05, width: 0.25, minLevel: 2 },
    { asset: 'bench', dx: -0.78, dy: 0.92, width: 0.36, minLevel: 2 },
    { asset: 'fountain', dx: 0.86, dy: 0.88, width: 0.47, minLevel: 3 },
    { asset: 'statue', dx: 0.00, dy: -0.95, width: 0.42, minLevel: 7 },
  ],
  saray: [
    { asset: 'lamp', dx: -1.02, dy: 0.05, width: 0.24, minLevel: 1 },
    { asset: 'bench', dx: 0.96, dy: 0.72, width: 0.34, minLevel: 2 },
    { asset: 'statue', dx: -0.78, dy: -0.72, width: 0.36, minLevel: 5 },
  ],
  carsi: [
    { asset: 'market-stall', dx: -0.98, dy: 0.56, width: 0.54, minLevel: 1 },
    { asset: 'amphora', dx: 0.94, dy: 0.70, width: 0.23, minLevel: 1 },
    { asset: 'crate', dx: 0.78, dy: 0.97, width: 0.23, minLevel: 2 },
    { asset: 'cart', dx: 1.08, dy: -0.18, width: 0.45, minLevel: 3 },
  ],
  ambar: [
    { asset: 'crate', dx: -0.96, dy: 0.70, width: 0.25, minLevel: 1 },
    { asset: 'barrel', dx: 0.90, dy: 0.82, width: 0.24, minLevel: 1 },
    { asset: 'crate', dx: 0.66, dy: 1.04, width: 0.22, minLevel: 2 },
    { asset: 'cart', dx: -1.02, dy: -0.06, width: 0.42, minLevel: 4 },
  ],
  kereste: [
    { asset: 'cart', dx: -0.98, dy: 0.48, width: 0.43, minLevel: 1 },
    { asset: 'crate', dx: 0.93, dy: 0.75, width: 0.22, minLevel: 2 },
    { asset: 'barrel', dx: 0.70, dy: 1.00, width: 0.22, minLevel: 3 },
  ],
  tas: [
    { asset: 'cart', dx: 1.00, dy: 0.48, width: 0.42, minLevel: 1 },
    { asset: 'crate', dx: -0.94, dy: 0.76, width: 0.22, minLevel: 2 },
    { asset: 'rock', dx: -1.03, dy: -0.18, width: 0.34, minLevel: 3, alpha: 0.92 },
  ],
  hamam: [
    { asset: 'amphora', dx: -0.95, dy: 0.76, width: 0.22, minLevel: 1 },
    { asset: 'bench', dx: 0.92, dy: 0.74, width: 0.34, minLevel: 2 },
    { asset: 'fountain', dx: -0.84, dy: -0.62, width: 0.42, minLevel: 4 },
  ],
  medrese: [
    { asset: 'bench', dx: -0.94, dy: 0.74, width: 0.34, minLevel: 1 },
    { asset: 'lamp', dx: 0.98, dy: 0.10, width: 0.23, minLevel: 2 },
    { asset: 'amphora', dx: 0.82, dy: 0.90, width: 0.21, minLevel: 3 },
  ],
  kisla: [
    { asset: 'crate', dx: -0.96, dy: 0.73, width: 0.23, minLevel: 1 },
    { asset: 'barrel', dx: 0.90, dy: 0.82, width: 0.22, minLevel: 2 },
    { asset: 'sign', dx: 1.02, dy: -0.14, width: 0.27, minLevel: 3 },
  ],
  elcilik: [
    { asset: 'lamp', dx: -0.97, dy: 0.12, width: 0.23, minLevel: 1 },
    { asset: 'bench', dx: 0.90, dy: 0.74, width: 0.33, minLevel: 2 },
    { asset: 'sign', dx: -0.88, dy: -0.62, width: 0.26, minLevel: 3 },
  ],
  konut: [
    { asset: 'amphora', dx: -0.88, dy: 0.80, width: 0.20, minLevel: 1 },
    { asset: 'bush', dx: 0.92, dy: 0.72, width: 0.31, minLevel: 2, alpha: 0.92 },
    { asset: 'flower', dx: -0.74, dy: -0.64, width: 0.28, minLevel: 3, alpha: 0.90 },
  ],
  liman: [
    { asset: 'barrel-water', dx: -0.96, dy: 0.72, width: 0.26, minLevel: 1 },
    { asset: 'crate', dx: 0.92, dy: 0.80, width: 0.24, minLevel: 1 },
    { asset: 'sign', dx: -0.90, dy: -0.46, width: 0.26, minLevel: 2 },
    { asset: 'cart', dx: 1.02, dy: -0.12, width: 0.42, minLevel: 3 },
  ],
  tersane: [
    { asset: 'barrel-water', dx: 0.94, dy: 0.76, width: 0.25, minLevel: 1 },
    { asset: 'crate', dx: -0.96, dy: 0.80, width: 0.23, minLevel: 1 },
    { asset: 'cart', dx: -1.00, dy: -0.08, width: 0.42, minLevel: 2 },
    { asset: 'sign', dx: 0.98, dy: -0.42, width: 0.25, minLevel: 3 },
  ],
}

export function districtPropsFor(id: BuildingId, level: number): DistrictProp[] {
  return (D[id] ?? []).filter(prop => level >= prop.minLevel)
}
