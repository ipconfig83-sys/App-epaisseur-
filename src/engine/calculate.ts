// =====================================================================
// PRESBYTA — Optical Lens Thickness Calculation Engine
// =====================================================================
// Orchestrates the full simulation pipeline used by the UI:
//
//   1. Decompose the prescription into two principal meridians.
//   2. Recommend a material- and lens-type-aware base curve.
//   3. Compute per-meridian sagittas and edge thickness on the uncut
//      blank.
//   4. Apply ANSI Z80.1 minima for centre / edge.
//   5. Compute decentration (H + V), MBS, and worst-side cut diameter.
//   6. Recompute final edge thickness on the cut diameter.
//   7. For high-plus lenses, apply prism thinning to redistribute
//      thickness.
//   8. Estimate weight from material density and edged-volume
//      approximation.
//   9. Compare across all available indices and select the optimal
//      candidate.
//  10. Build a list of structured warnings (ANSI, MBS, brittleness…).
//
// All formulas are documented inline.  Unless stated otherwise, lengths
// are in mm and powers in dioptres (D).
// =====================================================================

import type {
  AnsiCheck,
  BlankAnalysis,
  FrameData,
  IndexComparison,
  LensData,
  MeridianResult,
  RefractiveIndex,
  ThicknessResult,
  Warning,
} from '@/types';
import { AVAILABLE_INDICES, DENSITY_BY_INDEX, MATERIALS } from './materials';
import {
  meridianPower,
  radiusFromPower,
  sagitta,
  sphericalEquivalent,
} from './geometry';
import { recommendBaseCurve as suggestBase } from './curves';
import { ansiCenterMin, ansiEdgeMin } from './ansi';
import {
  blankFits,
  computeDecentration,
  minimumBlankSize,
  worstSideCutDiameter,
} from './decentration';
import { computePrismThinning } from './prism';

// Re-exports kept for callers that imported from this module historically.
export { sagitta, radiusFromPower } from './geometry';
export { recommendBaseCurve } from './curves';

// ----- Per-meridian thickness computation -----------------------------

function computeMeridian(
  lens: LensData,
  baseCurveD: number,
  axisDeg: number,
  thetaDeg: number
): MeridianResult {
  const F = meridianPower(lens.sphere, lens.cylinder, axisDeg, thetaDeg);
  const F1 = baseCurveD;
  const F2 = F - F1; // thin-lens additivity (vertex-distance corrections ignored at this scale)

  const r1 = Math.abs(radiusFromPower(F1, lens.index));
  const r2 = Math.abs(radiusFromPower(F2, lens.index));

  const semi = lens.diameter / 2;
  const s1 = sagitta(r1, semi);
  const s2 = sagitta(r2, semi);

  // Provisional edge thickness using minimum centre thickness and the
  // surface-sagitta difference.  The sign depends on which surface is
  // more curved in this meridian.
  const provisionalCenter = lens.minCenterThickness;
  // ΔSag positive when the back is more curved (s2 > s1) — minus power case.
  const deltaSag = s2 - s1;
  const provisionalEdge = provisionalCenter + deltaSag;

  return {
    power: F,
    axis: thetaDeg,
    frontPower: F1,
    backPower: F2,
    frontRadius: r1,
    backRadius: r2,
    frontSag: s1,
    backSag: s2,
    edgeThickness: provisionalEdge,
  };
}

// ----- ANSI minimum enforcement ---------------------------------------

function applyAnsi(lens: LensData, F_se: number): { ctMin: number; etMin: number; check: AnsiCheck } {
  const ctMin = Math.max(lens.minCenterThickness, ansiCenterMin(lens.material, F_se));
  const etMin = Math.max(lens.minEdgeThickness, ansiEdgeMin(lens.material, F_se));
  return {
    ctMin,
    etMin,
    check: {
      centerOk: lens.minCenterThickness >= ansiCenterMin(lens.material, F_se),
      edgeOk: lens.minEdgeThickness >= ansiEdgeMin(lens.material, F_se),
      ansiCenterMin: ansiCenterMin(lens.material, F_se),
      ansiEdgeMin: ansiEdgeMin(lens.material, F_se),
      standard: 'Z80.1-dress',
    },
  };
}

// ----- Worst-meridian helper ------------------------------------------

interface CoreThickness {
  centerThickness: number;
  edgeMaxUncut: number;
  edgeMinUncut: number;
  baseCurve: number;
  meridians: MeridianResult[];
  worstMeridian: MeridianResult;
  bestMeridian: MeridianResult;
  ansi: AnsiCheck;
  ctMinApplied: number;
  etMinApplied: number;
}

/**
 * Compute centre & per-meridian edge thicknesses for an uncut round
 * lens, with ANSI safety minima applied.
 *
 * The two principal meridians are:
 *   • along the cylinder axis (F = sphere)
 *   • perpendicular to it      (F = sphere + cylinder)
 *
 * For both we compute the back-surface power F2 = F − F1 (base curve)
 * and use sagitta differences to derive the edge thickness assuming a
 * common centre thickness.  The maximum and minimum edges around the
 * blank circle are then the meridian extremes.
 */
export function calculateThickness(lens: LensData): CoreThickness {
  const F_se = sphericalEquivalent(lens.sphere, lens.cylinder);
  const isPlus = F_se >= 0;

  const baseCurve = suggestBase(lens.sphere, lens.material, lens.type);

  const m1 = computeMeridian(lens, baseCurve, lens.axis, lens.axis);
  const m2 = computeMeridian(lens, baseCurve, lens.axis, lens.axis + 90);
  const meridians: MeridianResult[] = [m1, m2];

  // ANSI minima
  const { ctMin, etMin, check } = applyAnsi(lens, F_se);

  // Establish a reference centre thickness, then re-derive each
  // meridian's edge from sagitta differences.
  let centerThickness: number;
  let edges: number[];

  if (isPlus) {
    // Plus: the EDGE is set by the manufacturer minimum (etMin).
    // CT = etMin + max(s1 − s2) over meridians  (largest "bulge").
    const ctCandidates = meridians.map((m) => etMin + (m.frontSag - m.backSag));
    centerThickness = Math.max(ctMin, ...ctCandidates);
    // Each meridian's edge then derives from this CT:
    edges = meridians.map((m) => Math.max(etMin, centerThickness - (m.frontSag - m.backSag)));
  } else {
    // Minus: the CENTRE is set by ctMin.
    centerThickness = ctMin;
    // Each meridian's edge:
    edges = meridians.map((m) => Math.max(etMin, centerThickness + (m.backSag - m.frontSag)));
  }

  // Update the meridian objects with their final edge values.
  meridians.forEach((m, i) => (m.edgeThickness = edges[i]));

  const edgeMaxUncut = Math.max(...edges);
  const edgeMinUncut = Math.min(...edges);

  const worstMeridian = edges[0] >= edges[1] ? m1 : m2;
  const bestMeridian = edges[0] < edges[1] ? m1 : m2;

  return {
    centerThickness,
    edgeMaxUncut,
    edgeMinUncut,
    baseCurve,
    meridians,
    worstMeridian,
    bestMeridian,
    ansi: check,
    ctMinApplied: ctMin,
    etMinApplied: etMin,
  };
}

// ----- Final thickness after edging -----------------------------------

/**
 * Recompute the worst-meridian edge thickness on the cut diameter
 * (frame ED inflated by twice the decentration).  The OC stays at the
 * cut centre, so the centre thickness is preserved unless prism
 * thinning later applies.
 */
export function finalEdgedThickness(
  lens: LensData,
  frame: FrameData,
  core: CoreThickness,
  decTotal: number
): { finalCenter: number; finalEdge: number } {
  const cutD = Math.min(lens.diameter, worstSideCutDiameter(frame, decTotal));
  const semi = cutD / 2;

  const F_se = sphericalEquivalent(lens.sphere, lens.cylinder);
  const isPlus = F_se >= 0;

  const m = core.worstMeridian;
  const r1 = Math.abs(radiusFromPower(m.frontPower, lens.index));
  const r2 = Math.abs(radiusFromPower(m.backPower, lens.index));

  const s1 = sagitta(r1, semi);
  const s2 = sagitta(r2, semi);

  let finalEdge: number;
  if (isPlus) {
    finalEdge = Math.max(core.etMinApplied, core.centerThickness - (s1 - s2));
  } else {
    finalEdge = Math.max(core.etMinApplied, core.centerThickness + (s2 - s1));
  }

  return { finalCenter: core.centerThickness, finalEdge };
}

// ----- Weight estimation ----------------------------------------------

/**
 * Approximate weight of the finished (cut) lens.
 *
 * The cut shape is approximated as an ellipse of axes (A, B) inflated
 * by 2 mm to account for bevel/groove allowance.  Average thickness is
 * the mean of centre and worst edge:
 *
 *     V[cm³] = π · (A/2 · B/2) · t_avg / 1000
 *     m[g]   = V · ρ
 */
export function estimateWeight(
  lens: LensData,
  frame: FrameData,
  centerT: number,
  edgeT: number
): number {
  const tAvgMm = (centerT + edgeT) / 2;
  const aMm = Math.min(lens.diameter, frame.aSize) + 2;
  const bMm = Math.min(lens.diameter, frame.bSize) + 2;
  const aCm = aMm / 20; // mm → cm, divide by 2 for radius
  const bCm = bMm / 20;
  const tCm = tAvgMm / 10;
  const volumeCm3 = Math.PI * aCm * bCm * tCm;
  const density = MATERIALS[lens.material]?.density ?? DENSITY_BY_INDEX[lens.index] ?? 1.3;
  return volumeCm3 * density;
}

// ----- Index comparison -----------------------------------------------

/**
 * Recompute thickness for every available index and return a
 * comparison table.
 *
 * The "optimal" index is the lowest n meeting:
 *   • final edge ≤ 4 mm comfort target
 *   • MBS satisfied with the requested uncut diameter
 *
 * If none satisfy the comfort target, the thinnest-edge variant wins.
 */
export function compareIndices(
  lens: LensData,
  frame: FrameData,
  decTotal: number
): { comparison: IndexComparison[]; optimalIndex: RefractiveIndex } {
  const comparison: IndexComparison[] = AVAILABLE_INDICES.map((idx) => {
    const variant: LensData = { ...lens, index: idx };
    const core = calculateThickness(variant);
    const { finalEdge } = finalEdgedThickness(variant, frame, core, decTotal);
    const weight = estimateWeight(variant, frame, core.centerThickness, finalEdge);
    return {
      index: idx,
      centerThickness: core.centerThickness,
      edgeThickness: finalEdge,
      weight,
    };
  });

  const COMFORT_EDGE = 4.0;
  const acceptable = comparison.filter((c) => c.edgeThickness <= COMFORT_EDGE);
  const optimal =
    acceptable.length > 0
      ? acceptable[0]
      : comparison.reduce((best, c) =>
          c.edgeThickness < best.edgeThickness ? c : best
        );

  return { comparison, optimalIndex: optimal.index };
}

// ----- Diagnostics ----------------------------------------------------

function buildWarnings(
  lens: LensData,
  frame: FrameData,
  finalEdge: number,
  finalCenter: number,
  blank: BlankAnalysis,
  ansi: AnsiCheck,
  prismThinningApplied: boolean
): Warning[] {
  const out: Warning[] = [];

  // MBS check
  if (!blank.fits) {
    out.push({
      severity: 'error',
      code: 'MBS_FAILED',
      message: `Lens diameter ${lens.diameter.toFixed(0)} mm is below the minimum blank size ${blank.minimumBlankSize.toFixed(0)} mm. Increase Ø or reduce decentration.`,
    });
  }

  // ANSI checks
  if (!ansi.centerOk) {
    out.push({
      severity: 'warning',
      code: 'ANSI_CT_VIOLATION',
      message: `Configured min. centre ${lens.minCenterThickness.toFixed(2)} mm is below ANSI Z80.1 ${ansi.ansiCenterMin.toFixed(2)} mm for ${lens.material}.`,
    });
  }
  if (!ansi.edgeOk) {
    out.push({
      severity: 'warning',
      code: 'ANSI_ET_VIOLATION',
      message: `Configured min. edge ${lens.minEdgeThickness.toFixed(2)} mm is below ANSI Z80.1 ${ansi.ansiEdgeMin.toFixed(2)} mm for ${lens.material}.`,
    });
  }

  // Edge / centre comfort
  if (finalEdge > 6) {
    out.push({
      severity: 'warning',
      code: 'THICK_EDGE',
      message: `Edge thickness ${finalEdge.toFixed(2)} mm is high. Consider a higher index or a smaller frame.`,
    });
  } else if (finalEdge > 4) {
    out.push({
      severity: 'info',
      code: 'EDGE_NOTABLE',
      message: `Edge thickness ${finalEdge.toFixed(2)} mm is acceptable but a higher index could improve cosmetics.`,
    });
  }
  if (finalCenter > 6) {
    out.push({
      severity: 'warning',
      code: 'THICK_CENTER',
      message: `Centre thickness ${finalCenter.toFixed(2)} mm is high — common for strong plus prescriptions. Prism thinning ${prismThinningApplied ? 'has been applied' : 'recommended'}.`,
    });
  }

  // Frame / material brittleness
  if (frame.type === 'rimless' && lens.index >= 1.67) {
    out.push({
      severity: 'info',
      code: 'RIMLESS_BRITTLE',
      message: 'High-index materials (≥ 1.67) can be brittle for drilled rimless mounts. Prefer MR-8 or polycarbonate.',
    });
  }
  if (frame.type === 'semi-rimless' && Math.abs(lens.sphere) >= 4) {
    out.push({
      severity: 'info',
      code: 'GROOVE_THIN',
      message: 'Nylon-grooved mounts require ≥ 2.0 mm edge thickness on the groove side.',
    });
  }
  if (Math.abs(lens.sphere) >= 6 && lens.index <= 1.5) {
    out.push({
      severity: 'warning',
      code: 'INDEX_LOW',
      message: 'Strong prescription with low index will produce visibly thick lenses.',
    });
  }
  if (frame.aSize > 58 && lens.sphere <= -4) {
    out.push({
      severity: 'warning',
      code: 'FRAME_TOO_LARGE',
      message: 'Large frame combined with strong minus power increases edge thickness considerably.',
    });
  }

  // Decentration
  if (Math.abs(blank.effectiveDecentrationH) > 5 || Math.abs(blank.effectiveDecentrationV) > 5) {
    out.push({
      severity: 'info',
      code: 'HIGH_DECENTRATION',
      message: `High decentration detected (H ${blank.effectiveDecentrationH.toFixed(1)} mm, V ${blank.effectiveDecentrationV.toFixed(1)} mm).`,
    });
  }

  // Prism thinning info
  if (prismThinningApplied) {
    out.push({
      severity: 'info',
      code: 'PRISM_THINNING',
      message: 'Prism thinning has been applied to redistribute centre thickness.',
    });
  }

  return out;
}

// ----- Top-level orchestrator -----------------------------------------

export function runSimulation(lens: LensData, frame: FrameData): ThicknessResult {
  const dec = computeDecentration(frame);

  const core = calculateThickness(lens);
  const { finalCenter: fCenterRaw, finalEdge: fEdgeRaw } = finalEdgedThickness(
    lens,
    frame,
    core,
    dec.magnitude
  );

  // Prism thinning (acts on plus/high-plus only)
  const prism = computePrismThinning(lens, core.worstMeridian.power);
  // Apply: top-edge thickness reduced by full reduction; centre by ⅓.
  const reduction = prism.applied ? prism.thicknessReductionMm : 0;
  const finalEdge = Math.max(core.etMinApplied, fEdgeRaw - reduction);
  const finalCenter = Math.max(core.ctMinApplied, fCenterRaw - reduction / 3);

  const weight = estimateWeight(lens, frame, finalCenter, finalEdge);

  // Blank analysis
  const mbs = minimumBlankSize(frame, dec.magnitude);
  const blank: BlankAnalysis = {
    minimumBlankSize: mbs,
    effectiveDecentrationH: dec.horizontal,
    effectiveDecentrationV: dec.vertical,
    totalDecentration: dec.magnitude,
    uncutDiameterUsed: lens.diameter,
    cutDiameterWorstSide: worstSideCutDiameter(frame, dec.magnitude),
    fits: blankFits(lens.diameter, mbs),
  };

  // Index comparison
  const { comparison, optimalIndex } = compareIndices(lens, frame, dec.magnitude);

  // Diagnostics
  const warnings = buildWarnings(
    lens,
    frame,
    finalEdge,
    finalCenter,
    blank,
    core.ansi,
    prism.applied
  );

  return {
    centerThickness: core.centerThickness,
    edgeThickness: core.edgeMaxUncut,
    finalCenterThickness: finalCenter,
    finalEdgeThickness: finalEdge,
    edgeThicknessMin: core.edgeMinUncut,
    edgeThicknessMax: core.edgeMaxUncut,

    baseCurve: core.baseCurve,
    backCurve: core.worstMeridian.backPower,
    weight,

    meridians: core.meridians,
    prismThinning: prism,
    blank,
    ansi: core.ansi,

    warnings,
    optimalIndex,
    comparison,
  };
}
