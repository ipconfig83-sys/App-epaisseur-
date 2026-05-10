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
 * Recommend a continuous base curve before snapping.
 *
 *   • Plus lenses (Vogel):       base = sphere + 6,  capped at 10 D
 *   • Minus lenses (lab table):  flatter bases for stronger minus, the
 *                                cosmetic standard used by surfacing
 *                                laboratories.  Linear ramp:
 *
 *        sphere ≥ −2.50 D  →  6.00 D
 *        sphere = −4.00 D  →  4.00 D
 *        sphere = −6.00 D  →  2.00 D
 *        sphere = −8.00 D  →  1.00 D
 *        sphere ≤ −10.0 D  →  0.50 D
 *
 *     This is closer to what real labs choose than naïve Vogel
 *     (sphere/2 + 6), which produces visibly thicker edges for
 *     high-minus prescriptions.
 */
export function vogelBase(spherePower: number): number {
  if (spherePower >= 0) {
    return Math.min(10.0, Math.max(0.5, spherePower + 6));
  }
  // Minus — laboratory cosmetic table, linearly interpolated.
  const knots: [number, number][] = [
    [-2.5, 6.0],
    [-4.0, 4.0],
    [-6.0, 2.0],
    [-8.0, 1.0],
    [-10.0, 0.5],
  ];
  if (spherePower >= knots[0][0]) return knots[0][1];
  if (spherePower <= knots[knots.length - 1][0]) return knots[knots.length - 1][1];
  for (let i = 0; i < knots.length - 1; i++) {
    const [s1, b1] = knots[i];
    const [s2, b2] = knots[i + 1];
    if (spherePower <= s1 && spherePower >= s2) {
      const t = (spherePower - s1) / (s2 - s1);
      return Math.max(0.5, b1 + t * (b2 - b1));
    }
  }
  return 0.5;
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
