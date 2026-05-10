// =====================================================================
// ANSI Z80.1 — Minimum thickness for finished spectacle lenses
// =====================================================================
// References:
//   • ANSI Z80.1-2020 Ophthalmic — Prescription Spectacle Lenses
//   • ANSI Z87.1-2020 Occupational Eye and Face Protective Devices
//   • Brooks & Borish "System for Ophthalmic Dispensing"
//
// The spec gives both safety (drop-ball impact) and dimensional
// minimums.  We encode pragmatic per-material defaults and a power-
// dependent ramp for high-plus lenses where a thicker centre is
// required for impact resistance.
// =====================================================================

import type { LensMaterial } from '@/types';

interface AnsiBaseline {
  /** Minimum centre thickness for + lenses in dress eyewear (mm). */
  ctMinPlus: number;
  /** Minimum centre thickness for − lenses (mm). */
  ctMinMinus: number;
  /** Minimum edge thickness for − lenses in full-rim mounts (mm). */
  etMinMinus: number;
  /** Minimum edge thickness for + lenses (mm). */
  etMinPlus: number;
  /** ANSI Z87.1 (industrial impact) baseline (mm). */
  z87Baseline: number;
}

/**
 * Per-material baselines.  Polycarbonate / Trivex are impact-rated and
 * are allowed thinner sections than CR-39.
 */
export const ANSI_BASELINES: Record<LensMaterial, AnsiBaseline> = {
  CR39:           { ctMinPlus: 2.0, ctMinMinus: 1.5, etMinMinus: 1.5, etMinPlus: 1.0, z87Baseline: 3.0 },
  Polycarbonate:  { ctMinPlus: 1.0, ctMinMinus: 1.0, etMinMinus: 1.0, etMinPlus: 1.0, z87Baseline: 2.0 },
  MR8:            { ctMinPlus: 1.3, ctMinMinus: 1.2, etMinMinus: 1.2, etMinPlus: 1.0, z87Baseline: 2.5 },
  MR7:            { ctMinPlus: 1.2, ctMinMinus: 1.0, etMinMinus: 1.0, etMinPlus: 0.9, z87Baseline: 2.5 },
};

/**
 * Power-dependent ramp.  Higher plus lenses require a thicker centre
 * for drop-ball compliance — empirical lab guideline:
 *
 *   Ct_min(F) = baseline + 0.10·max(0, F − 4)
 *
 * Higher minus lenses similarly require more edge thickness for the
 * full-rim seating groove.
 */
export function ansiCenterMin(material: LensMaterial, sphericalEquivalent: number, isImpact = false): number {
  const b = ANSI_BASELINES[material];
  const baseline = isImpact
    ? b.z87Baseline
    : sphericalEquivalent >= 0
      ? b.ctMinPlus
      : b.ctMinMinus;
  const excess = Math.max(0, sphericalEquivalent - 4);
  return baseline + 0.10 * excess;
}

export function ansiEdgeMin(material: LensMaterial, sphericalEquivalent: number, isImpact = false): number {
  const b = ANSI_BASELINES[material];
  const baseline = isImpact
    ? b.z87Baseline * 0.7
    : sphericalEquivalent >= 0
      ? b.etMinPlus
      : b.etMinMinus;
  // For strong minus lenses, full-rim grooves require more edge support.
  const excess = Math.max(0, -sphericalEquivalent - 6);
  return baseline + 0.05 * excess;
}
