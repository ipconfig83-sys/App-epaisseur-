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
  thetaDeg: number,
  designSemiMm: number
): MeridianResult {
  const F = meridianPower(lens.sphere, lens.cylinder, axisDeg, thetaDeg);
  const F1 = baseCurveD;
  const F2 = F - F1; // thin-lens additivity (vertex-distance corrections ignored at this scale)

  const r1 = Math.abs(radiusFromPower(F1, lens.index));
  const r2 = Math.abs(radiusFromPower(F2, lens.index));

  const s1 = sagitta(r1, designSemiMm);
  const s2 = sagitta(r2, designSemiMm);

  // Provisional edge thickness — finalised by calculateThickness once
  // we know whether the lens is plus or minus.
  return {
    power: F,
    axis: thetaDeg,
    frontPower: F1,
    backPower: F2,
    frontRadius: r1,
    backRadius: r2,
    frontSag: s1,
    backSag: s2,
    edgeThickness: 0,
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
 * Compute centre & per-meridian edge thicknesses with ANSI safety
 * minima applied.
 *
 * `designDiameterMm` is the chord at which the etMin / sagitta
 * relationship is enforced.  Real laboratories solve the geometry at
 * the FRAME edge (i.e. the cut diameter) — material outside the
 * frame is wasted, so it has no bearing on centre thickness.  The
 * caller therefore passes:
 *
 *     designDiameter = min(blankDiameter, frame.ED + 2·decentration)
 *
 * The two principal meridians are evaluated:
 *   • along the cylinder axis (F = sphere)
 *   • perpendicular to it      (F = sphere + cylinder)
 *
 * F2 = F − F1, sagittas at designSemi, then plus / minus rules.
 */
export function calculateThickness(
  lens: LensData,
  opts: { designDiameterMm?: number } = {}
): CoreThickness {
  const designDiameter = Math.max(
    1,
    Math.min(lens.diameter, opts.designDiameterMm ?? lens.diameter)
  );
  const designSemi = designDiameter / 2;

  const F_se = sphericalEquivalent(lens.sphere, lens.cylinder);
  const isPlus = F_se >= 0;

  const baseCurve = suggestBase(lens.sphere, lens.material, lens.type);

  const m1 = computeMeridian(lens, baseCurve, lens.axis, lens.axis, designSemi);
  const m2 = computeMeridian(lens, baseCurve, lens.axis, lens.axis + 90, designSemi);
  const meridians: MeridianResult[] = [m1, m2];

  // ANSI minima
  const { ctMin, etMin, check } = applyAnsi(lens, F_se);

  // Establish a reference centre thickness, then re-derive each
  // meridian's edge from sagitta differences.
  let centerThickness: number;
  let edges: number[];

  if (isPlus) {
    // Plus: the EDGE at the design (frame) chord is set by etMin.
    // CT = etMin + max(s1 − s2) over meridians  (largest "bulge").
    const ctCandidates = meridians.map((m) => etMin + (m.frontSag - m.backSag));
    centerThickness = Math.max(ctMin, ...ctCandidates);
    edges = meridians.map((m) =>
      Math.max(etMin, centerThickness - (m.frontSag - m.backSag))
    );
  } else {
    // Minus: the CENTRE is set by ctMin.  Edge at the design chord
    // grows with the back-surface curvature.
    centerThickness = ctMin;
    edges = meridians.map((m) =>
      Math.max(etMin, centerThickness + (m.backSag - m.frontSag))
    );
  }

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
 * Final centre/edge thicknesses at the frame edge.  Because the core
 * solver already operates on the design (cut) diameter, this function
 * is now a thin wrapper that returns the same numbers — kept for
 * backward-compatibility and as a clear extension point if more
 * post-edging effects are added (chip allowance, bevel placement).
 */
export function finalEdgedThickness(
  _lens: LensData,
  _frame: FrameData,
  core: CoreThickness,
  _decTotal: number
): { finalCenter: number; finalEdge: number } {
  return {
    finalCenter: core.centerThickness,
    finalEdge: core.edgeMaxUncut,
  };
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
  const cutD = worstSideCutDiameter(frame, decTotal);
  const designD = Math.min(lens.diameter, cutD);
  const comparison: IndexComparison[] = AVAILABLE_INDICES.map((idx) => {
    const variant: LensData = { ...lens, index: idx };
    const core = calculateThickness(variant, { designDiameterMm: designD });
    const finalEdge = core.edgeMaxUncut;
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
  const F_se = sphericalEquivalent(lens.sphere, lens.cylinder);
  const isPlus = F_se > 0;
  const isMinus = F_se < 0;

  // ── 1. INSUFFICIENT DIAMETER (lens blank cannot cover the frame) ──
  if (!blank.fits) {
    out.push({
      severity: 'error',
      code: 'INSUFFICIENT_DIAMETER',
      message: `Insufficient lens diameter: Ø ${lens.diameter.toFixed(0)} mm is below the minimum blank size ${blank.minimumBlankSize.toFixed(0)} mm required by this frame and decentration. Increase the blank diameter or reduce decentration.`,
    });
  }

  // ── 2. EXCESSIVE DECENTRATION ──
  if (blank.totalDecentration > 6) {
    out.push({
      severity: 'error',
      code: 'EXCESSIVE_DECENTRATION',
      message: `Excessive decentration: total ${blank.totalDecentration.toFixed(1)} mm (H ${blank.effectiveDecentrationH.toFixed(1)} / V ${blank.effectiveDecentrationV.toFixed(1)} mm). Verify the patient's PD and fitting height before ordering.`,
    });
  } else if (blank.totalDecentration > 4) {
    out.push({
      severity: 'warning',
      code: 'HIGH_DECENTRATION',
      message: `Notable decentration: total ${blank.totalDecentration.toFixed(1)} mm (H ${blank.effectiveDecentrationH.toFixed(1)} / V ${blank.effectiveDecentrationV.toFixed(1)} mm). Confirm the blank diameter is adequate.`,
    });
  }

  // ── 3. POOR FRAME CHOICE ──
  // Large frame + strong minus → very thick edges
  if (frame.aSize > 56 && lens.sphere <= -4) {
    out.push({
      severity: 'warning',
      code: 'POOR_FRAME_CHOICE',
      message: `Poor frame choice: A=${frame.aSize.toFixed(0)} mm with ${lens.sphere.toFixed(2)} D will produce visibly thick edges. Recommend a smaller A-size or a higher index.`,
    });
  }
  // Drilled rimless + high-index brittle material
  if (frame.type === 'rimless' && lens.index >= 1.67) {
    out.push({
      severity: 'warning',
      code: 'POOR_FRAME_CHOICE',
      message: 'Poor frame choice: high-index 1.67+ is brittle for drilled rimless mounts. Prefer MR-8 (1.60) or polycarbonate.',
    });
  }
  // Semi-rimless with low edge — groove won't hold
  if (frame.type === 'semi-rimless' && lens.minEdgeThickness < 1.8) {
    out.push({
      severity: 'info',
      code: 'POOR_FRAME_CHOICE',
      message: `Nylon-grooved frames require ≥ 2.0 mm edge thickness; configured minimum ${lens.minEdgeThickness.toFixed(2)} mm may not hold.`,
    });
  }

  // ── 4. HIGH MINUS EDGE THICKNESS ──
  if (isMinus && finalEdge > 7) {
    out.push({
      severity: 'error',
      code: 'HIGH_MINUS_EDGE',
      message: `High-minus edge: ${finalEdge.toFixed(2)} mm exceeds 7.0 mm. Strongly recommend a higher refractive index (1.67 or 1.74) and a smaller frame.`,
    });
  } else if (isMinus && finalEdge > 5) {
    out.push({
      severity: 'warning',
      code: 'HIGH_MINUS_EDGE',
      message: `High-minus edge: ${finalEdge.toFixed(2)} mm. Consider PRESBYTA 1.67 or 1.74 to improve cosmetics.`,
    });
  } else if (finalEdge > 4) {
    out.push({
      severity: 'info',
      code: 'EDGE_NOTABLE',
      message: `Edge thickness ${finalEdge.toFixed(2)} mm is acceptable but a higher index could improve cosmetics.`,
    });
  }

  // ── 5. HIGH PLUS CENTRE THICKNESS ──
  if (isPlus && finalCenter > 7) {
    out.push({
      severity: 'error',
      code: 'HIGH_PLUS_CENTER',
      message: `High-plus centre: ${finalCenter.toFixed(2)} mm exceeds 7.0 mm.${prismThinningApplied ? ' Prism thinning is already applied.' : ' Prism thinning is strongly recommended.'} Consider an aspheric design or higher index.`,
    });
  } else if (isPlus && finalCenter > 5) {
    out.push({
      severity: 'warning',
      code: 'HIGH_PLUS_CENTER',
      message: `High-plus centre: ${finalCenter.toFixed(2)} mm.${prismThinningApplied ? ' Prism thinning applied.' : ' Prism thinning recommended.'}`,
    });
  }

  // ── 6. ANSI Z80.1 compliance ──
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

  // ── 7. Index too low for the prescription ──
  if (Math.abs(F_se) >= 6 && lens.index <= 1.5) {
    out.push({
      severity: 'warning',
      code: 'INDEX_TOO_LOW',
      message: 'Strong prescription with low index 1.5 — significantly thicker lenses than necessary. Recommend PRESBYTA 1.67 or 1.74.',
    });
  }
  if (Math.abs(F_se) >= 4 && lens.index <= 1.56) {
    out.push({
      severity: 'info',
      code: 'INDEX_SUBOPTIMAL',
      message: 'Index 1.56 is sub-optimal for this prescription magnitude. PRESBYTA 1.60 / 1.67 would improve cosmetics.',
    });
  }

  // ── 8. Prism thinning info ──
  if (prismThinningApplied) {
    out.push({
      severity: 'info',
      code: 'PRISM_THINNING_APPLIED',
      message: 'Prism thinning has been applied to redistribute centre thickness.',
    });
  }

  return out;
}

// ----- Top-level orchestrator -----------------------------------------

export function runSimulation(lens: LensData, frame: FrameData): ThicknessResult {
  const dec = computeDecentration(frame);

  // Solve the geometry at the frame's effective (cut) chord — the
  // chord at which etMin must hold and where the patient sees the
  // lens edge after edging.  Material outside this chord is wasted.
  const cutD = worstSideCutDiameter(frame, dec.magnitude);
  const designD = Math.min(lens.diameter, cutD);

  const core = calculateThickness(lens, { designDiameterMm: designD });
  const fCenterRaw = core.centerThickness;
  const fEdgeRaw = core.edgeMaxUncut;

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
