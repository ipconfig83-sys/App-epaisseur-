// =====================================================================
// PRESBYTA — Decentration & blank-size optimization
// =====================================================================
// Boxing-system geometry per ISO 8624:2011 / ANSI Z80.5:
//
//   - The frame "boxing rectangle" has horizontal size A and vertical
//     size B with the bridge at distance DBL between the two boxes.
//   - The wearer's monocular pupillary distance (mPD) is measured from
//     the bridge centre to the pupil.
//   - The wearer's fitting height is measured from the lowest point of
//     the lens shape to the pupil (in the box).
//
// Horizontal decentration:
//     DC_h = (A + DBL)/2 − mPD
// Vertical decentration:
//     DC_v = B/2 − fittingHeight
//
// Total decentration vector:
//     DC = √(DC_h² + DC_v²)
//
// The Minimum Blank Size (MBS) is the smallest uncut diameter that
// will both cover the frame's effective diameter and accommodate the
// decentration without "chipping out" during edging:
//
//     MBS = ED + 2·DC + chipAllowance
// =====================================================================

import type { FrameData } from '@/types';

export interface DecentrationVector {
  horizontal: number;
  vertical: number;
  magnitude: number;
}

/**
 * Compute horizontal & vertical decentration in millimetres.
 * Both are signed magnitudes so the UI can show direction; the engine
 * uses |·| for blank-size calculations.
 */
export function computeDecentration(frame: FrameData): DecentrationVector {
  const horizontal = (frame.aSize + frame.dbl) / 2 - frame.monocularPD;
  const vertical = frame.bSize / 2 - frame.fittingHeight;
  const magnitude = Math.hypot(horizontal, vertical);
  return { horizontal, vertical, magnitude };
}

/**
 * Minimum Blank Size required for safe edging.
 *   MBS = ED + 2 · |DC| + chip allowance
 * Typical chip allowance is 2 mm in production.
 */
export function minimumBlankSize(frame: FrameData, decTotal: number, chipAllowance = 2): number {
  return frame.ed + 2 * Math.abs(decTotal) + chipAllowance;
}

/**
 * Effective cut diameter on the worst (longer) side of the lens.
 * Used to recompute the post-edging edge thickness on the side opposite
 * the optical centre shift.
 */
export function worstSideCutDiameter(frame: FrameData, decTotal: number): number {
  return frame.ed + 2 * Math.abs(decTotal);
}

/**
 * "Effective diameter" check: does the requested uncut diameter
 * actually accommodate the wearer's measurements?  Returns true if
 * uncutDiameter ≥ MBS.
 */
export function blankFits(uncutDiameter: number, mbs: number): boolean {
  return uncutDiameter + 1e-6 >= mbs;
}
