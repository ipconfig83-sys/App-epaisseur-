// =====================================================================
// PRESBYTA — Prism thinning model
// =====================================================================
// Prism thinning is a finishing technique applied almost exclusively to
// high-plus and progressive lenses where the optical centre sits well
// above the geometric centre of the boxed shape.  Without it, the top
// of a finished plus lens would carry a large, cosmetically unpleasant
// thickness because of the asymmetric sagitta around the OC.
//
// The technique adds a small amount of yoked base-down prism (typically
// equal in both eyes so binocular alignment is preserved).  Equivalent
// to tilting the back-surface, this redistributes the lens material so
// that the top-edge thickness is reduced while the bottom-edge
// thickness increases by an equal amount.
//
// Common laboratory rule of thumb (Younger / Essilor / Hoya):
//
//     Δ = ⅔ · Add + 0.5 · max(0, F_max − 4)        [in prism dioptres]
//
// where Add is the addition in D and F_max is the strongest meridian
// power.  We apply this only when the resulting Δ exceeds a small
// activation threshold (≈ 0.5 Δ) and when the lens is plus.
//
// Thickness reduction at the top edge from prism Δ is geometrically:
//
//     Δt_top  = (h/2) · tan(α)    where α is the prism angle
//                                 1 Δ ≈ 1 cm displacement at 1 m
//                                 ≈ 0.573°
//
// For typical lens diameters (60-70 mm), this yields:
//
//     Δt_top ≈ Δ_dioptres · D_mm / 200
//
// We apply this as a reduction to the worst-case edge thickness and
// (a smaller portion) to the centre thickness.
// =====================================================================

import type { LensData, PrismThinning } from '@/types';

const ACTIVATION_THRESHOLD_DIOPTRES = 0.5;

/**
 * Decide whether prism thinning is appropriate, compute the prism
 * value, and convert it to a thickness reduction.
 */
export function computePrismThinning(lens: LensData, worstMeridianPower: number): PrismThinning {
  const isPlus = worstMeridianPower > 0;
  if (!isPlus) {
    return {
      applied: false,
      prismDiopters: 0,
      base: 'none',
      thicknessReductionMm: 0,
      rationale: 'Prism thinning is not applied to minus lenses.',
    };
  }

  // Lab rule combining addition contribution and high-plus contribution.
  const addContribution = (2 / 3) * Math.max(0, lens.addition);
  const powerContribution = 0.5 * Math.max(0, worstMeridianPower - 4);
  const prism = addContribution + powerContribution;

  if (prism < ACTIVATION_THRESHOLD_DIOPTRES) {
    return {
      applied: false,
      prismDiopters: prism,
      base: 'none',
      thicknessReductionMm: 0,
      rationale: `Prism (${prism.toFixed(2)}Δ) below activation threshold of ${ACTIVATION_THRESHOLD_DIOPTRES}Δ.`,
    };
  }

  // Geometric reduction: ≈ Δ × diameter / 200 mm.
  // The centre saving is roughly ⅓ of the top-edge saving.
  const reduction = (prism * lens.diameter) / 200;

  return {
    applied: true,
    prismDiopters: Math.round(prism * 100) / 100,
    base: 'down',
    thicknessReductionMm: Math.round(reduction * 100) / 100,
    rationale: `Yoked base-down prism of ${prism.toFixed(2)}Δ reduces top-edge thickness by ≈ ${reduction.toFixed(2)} mm (Add ${lens.addition.toFixed(2)}D, F ${worstMeridianPower.toFixed(2)}D).`,
  };
}
