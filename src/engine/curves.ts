// =====================================================================
// PRESBYTA — Front (base) curve recommendation
// =====================================================================
// The front-surface power chosen by a laboratory is driven by:
//   • Optical performance (Tscherning ellipse — minimise oblique
//     astigmatism for the wearer's vertex distance).
//   • Cosmetic constraints (flatter for high plus, steeper for plus
//     progressives).
//   • Material capability (high-index moulds available in fixed steps).
//
// We use a refined Vogel rule combined with a discrete material-aware
// snapping step that mirrors what real labs do.
// =====================================================================

import type { LensMaterial, LensType } from '@/types';

/**
 * Vogel's rule (updated):
 *   • Plus lenses:  base = sphere + 6
 *   • Minus lenses: base = sphere/2 + 6
 *
 * Then clamp to [0.5 D, 10.0 D].
 */
export function vogelBase(spherePower: number): number {
  const raw = spherePower >= 0 ? spherePower + 6 : spherePower / 2 + 6;
  return Math.min(10.0, Math.max(0.5, raw));
}

/**
 * Available front-curve moulds in real laboratories.
 * Most factories work in 0.5 D steps from 0.5 D to 10 D.
 */
const STANDARD_BASES = [0.5, 1, 2, 3, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 9, 10];

/**
 * Snap a continuous Vogel-style suggestion to the nearest mould.
 */
export function snapToStandardBase(continuousBase: number): number {
  return STANDARD_BASES.reduce((best, b) =>
    Math.abs(b - continuousBase) < Math.abs(best - continuousBase) ? b : best
  );
}

/**
 * Material- and lens-type-aware adjustment.
 *
 * Real-world deltas vs. raw Vogel:
 *   • Progressive: +0.5 D (steeper for corridor stability)
 *   • Office indoor: −0.5 D (flatter to thin)
 *   • High index (1.67+): −0.5 D flattening (lens can be flatter
 *                           because index is doing the work)
 *   • Polycarbonate: snapped, no extra adjustment
 */
export function recommendBaseCurve(
  spherePower: number,
  material: LensMaterial,
  lensType: LensType
): number {
  let base = vogelBase(spherePower);

  if (lensType === 'progressive') base += 0.5;
  if (lensType === 'office') base -= 0.5;
  if (material === 'MR7') base -= 0.5; // 1.67
  if (material === 'CR39') base += 0.0;

  return snapToStandardBase(Math.min(10, Math.max(0.5, base)));
}
