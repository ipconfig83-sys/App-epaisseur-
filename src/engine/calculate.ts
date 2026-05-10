// =====================================================================
// PRESBYTA — Optical Lens Thickness Calculation Engine
// =====================================================================
// All formulas below follow standard ophthalmic geometry conventions.
//
// Key conventions:
//   • All linear dimensions are in millimetres unless stated otherwise.
//   • Powers (sphere, cylinder, addition) are in dioptres (D).
//   • Refractive index n is unitless; air assumed n0 = 1.
//   • Thin-lens / sagitta approximations used for fast real-time UI.
//
// References:
//   - Jalie, M. — "Ophthalmic Lenses & Dispensing"
//   - Brooks & Borish — "System for Ophthalmic Dispensing"
//   - ISO 8980-1:2017 — Uncut finished spectacle lenses
// =====================================================================

import type {
  FrameData,
  LensData,
  ThicknessResult,
  IndexComparison,
  RefractiveIndex,
  Warning,
} from '@/types';
import { AVAILABLE_INDICES, DENSITY_BY_INDEX } from './materials';

// ----- Geometric helpers ----------------------------------------------

/**
 * Sagitta of a spherical cap.
 *   s = R − √(R² − r²)
 * @param radius     surface radius of curvature (mm)
 * @param semiChord  half-chord = lens radius for that meridian (mm)
 */
export function sagitta(radius: number, semiChord: number): number {
  if (radius <= 0 || semiChord <= 0) return 0;
  if (semiChord >= radius) return radius; // safety clamp at hemisphere
  return radius - Math.sqrt(radius * radius - semiChord * semiChord);
}

/**
 * Surface radius from surface power.
 *   F = (n − n₀) / r            (r in metres)
 *   r[mm] = 1000 · (n − 1) / F
 *
 * Returns a large radius (≈ flat) when |F| is tiny.
 */
export function radiusFromPower(power: number, index: number): number {
  if (Math.abs(power) < 1e-3) return 1e9;
  return (1000 * (index - 1)) / power;
}

// ----- Base curve recommendation --------------------------------------

/**
 * Vogel's rule of thumb for recommended front (base) curve:
 *   • Plus lenses:  base = sphere + 6
 *   • Minus lenses: base = sphere/2 + 6
 * Clamped to a sensible range [0.5 D, 10 D].
 */
export function recommendBaseCurve(sphere: number): number {
  const raw = sphere >= 0 ? sphere + 6 : sphere / 2 + 6;
  return Math.min(10, Math.max(0.5, raw));
}

// ----- Effective decentration ----------------------------------------

/**
 * Effective decentration = how far the optical centre sits from the
 * geometric centre of the boxed lens shape.
 *   dec = (frame.A + frame.DBL)/2 − monocularPD
 * The result drives the worst-case edge thickness on the wider side.
 */
export function effectiveDecentration(frame: FrameData): number {
  const geometricCenter = (frame.aSize + frame.dbl) / 2;
  return Math.abs(geometricCenter - frame.monocularPD);
}

// ----- Minimum required uncut diameter (MBS) --------------------------

/**
 * Minimum Blank Size required to fully cover the frame when decentred.
 *   MBS = ED + 2·|decentration| + tolerance
 */
export function minimumBlankSize(frame: FrameData, decentration: number): number {
  const tolerance = 2; // mm safety margin
  return frame.ed + 2 * decentration + tolerance;
}

// ----- Core thickness calculation -------------------------------------

interface CoreThickness {
  centerThickness: number;
  edgeThickness: number;
  baseCurve: number;
}

/**
 * Compute centre & edge thickness for an uncut round lens.
 *
 * Geometric model (single-vision, sphero-cylindrical, thin-lens):
 *   1. Power in the strongest meridian:
 *        F_max = sphere + (cylinder if cyl<0 else 0) for minus convention
 *      Here we use the worst-case meridian for edge of minus lenses
 *      and the central meridian for centre of plus lenses.
 *   2. Choose a recommended base curve F1 (Vogel).
 *   3. Back curve F2 = F_total − F1.
 *   4. Surface radii from radiusFromPower(F, n).
 *   5. Sagittas on each surface for the lens semi-diameter.
 *   6. For PLUS lenses (converging): centre is thicker.
 *        centerThickness = minEdgeThickness + s1 − s2
 *        edgeThickness   = minEdgeThickness
 *   7. For MINUS lenses (diverging): edge is thicker.
 *        edgeThickness   = minCenterThickness + s2 − s1
 *        centerThickness = minCenterThickness
 *   8. Apply minimum constraints from manufacturer data.
 *
 * Cylinder is included by considering the most powerful meridian
 * in the worst direction (edge thickness of minus = strongest minus).
 */
export function calculateThickness(lens: LensData): CoreThickness {
  const { sphere, cylinder, index, diameter, minCenterThickness, minEdgeThickness } = lens;

  // Worst-case meridian power (most negative or most positive).
  // For minus lenses, worst meridian is sphere + cyl (cyl is typically negative).
  // For plus lenses, the strongest plus is sphere when cyl is negative.
  const meridian1 = sphere;
  const meridian2 = sphere + cylinder;
  const isPlus = sphere + cylinder / 2 >= 0;
  const worstPower = isPlus
    ? Math.max(meridian1, meridian2)
    : Math.min(meridian1, meridian2);

  const baseCurve = recommendBaseCurve(sphere);
  const backPower = worstPower - baseCurve; // total = front + back

  const r1 = radiusFromPower(baseCurve, index);
  const r2 = radiusFromPower(backPower, index);

  const semi = diameter / 2;
  const s1 = sagitta(Math.abs(r1), semi); // front sag (always positive for convex)
  const s2 = sagitta(Math.abs(r2), semi); // back sag

  let centerThickness: number;
  let edgeThickness: number;

  if (isPlus) {
    // Plus lens: edge is the manufacturer minimum, centre = minEdge + (s1 − s2)
    edgeThickness = minEdgeThickness;
    centerThickness = Math.max(minCenterThickness, edgeThickness + (s1 - s2));
  } else {
    // Minus lens: centre is the manufacturer minimum, edge = minCenter + (s2 − s1)
    centerThickness = minCenterThickness;
    edgeThickness = Math.max(minEdgeThickness, centerThickness + (s2 - s1));
  }

  return {
    centerThickness,
    edgeThickness,
    baseCurve,
  };
}

// ----- Final thickness after edging -----------------------------------

/**
 * After edging the round lens to the frame shape, only material within
 * the frame outline survives. The edge thickness at the worst meridian
 * is reduced because the cut diameter (≈ frame ED + 2·dec) is smaller
 * than the uncut blank.
 *
 * We re-run the sagitta computation using the effective cut diameter
 * to estimate the final edge thickness on the wider side.
 */
export function finalEdgedThickness(
  lens: LensData,
  frame: FrameData,
  core: CoreThickness
): { finalCenter: number; finalEdge: number } {
  const dec = effectiveDecentration(frame);
  // Worst-side cut diameter — the side opposite to where the optical
  // centre is shifted. Approximate as ED + 2·dec.
  const cutDiameter = Math.min(lens.diameter, frame.ed + 2 * dec);
  const semi = cutDiameter / 2;

  const sphere = lens.sphere;
  const cyl = lens.cylinder;
  const isPlus = sphere + cyl / 2 >= 0;
  const worstPower = isPlus ? Math.max(sphere, sphere + cyl) : Math.min(sphere, sphere + cyl);

  const baseCurve = core.baseCurve;
  const backPower = worstPower - baseCurve;

  const r1 = radiusFromPower(baseCurve, lens.index);
  const r2 = radiusFromPower(backPower, lens.index);

  const s1 = sagitta(Math.abs(r1), semi);
  const s2 = sagitta(Math.abs(r2), semi);

  let finalCenter = core.centerThickness;
  let finalEdge = core.edgeThickness;

  if (isPlus) {
    finalEdge = Math.max(lens.minEdgeThickness, core.centerThickness - (s1 - s2));
  } else {
    finalEdge = Math.max(lens.minEdgeThickness, core.centerThickness + (s2 - s1));
  }

  return { finalCenter, finalEdge };
}

// ----- Weight estimation ----------------------------------------------

/**
 * Approximate weight of a finished lens shape.
 * Treat the edged lens as a cylinder of effective diameter D_eff
 * and average thickness t_avg.
 *
 *   V[cm³] = π · (D_eff/2)² · t_avg / 1000
 *   m[g]   = V · ρ
 */
export function estimateWeight(
  lens: LensData,
  frame: FrameData,
  centerT: number,
  edgeT: number
): number {
  const tAvgMm = (centerT + edgeT) / 2;
  const dEffMm = Math.min(lens.diameter, (frame.aSize + frame.bSize) / 2 + 4);
  const rCm = dEffMm / 20; // mm → cm, divide by 2
  const tCm = tAvgMm / 10;
  const volumeCm3 = Math.PI * rCm * rCm * tCm;
  const density = DENSITY_BY_INDEX[lens.index] ?? 1.3;
  return volumeCm3 * density;
}

// ----- Index comparison & optimal selector ----------------------------

/**
 * Recompute thickness for every available index and return a
 * comparison table. The "optimal" index is chosen as the lowest
 * index whose final edge thickness is below 4 mm — a comfort target
 * commonly used in optical labs.
 */
export function compareIndices(lens: LensData, frame: FrameData): {
  comparison: IndexComparison[];
  optimalIndex: RefractiveIndex;
} {
  const comparison: IndexComparison[] = AVAILABLE_INDICES.map((idx) => {
    const variant: LensData = { ...lens, index: idx };
    const core = calculateThickness(variant);
    const { finalEdge } = finalEdgedThickness(variant, frame, core);
    const weight = estimateWeight(variant, frame, core.centerThickness, finalEdge);
    return {
      index: idx,
      centerThickness: core.centerThickness,
      edgeThickness: finalEdge,
      weight,
    };
  });

  // Optimal = lowest index meeting the comfort target, else thinnest.
  const COMFORT_EDGE = 4.0;
  const acceptable = comparison.filter((c) => c.edgeThickness <= COMFORT_EDGE);
  const optimal = (acceptable.length > 0
    ? acceptable[0]
    : comparison.reduce((best, c) => (c.edgeThickness < best.edgeThickness ? c : best))
  );

  return { comparison, optimalIndex: optimal.index };
}

// ----- Warnings -------------------------------------------------------

function buildWarnings(
  lens: LensData,
  frame: FrameData,
  finalEdge: number,
  finalCenter: number
): Warning[] {
  const out: Warning[] = [];
  const dec = effectiveDecentration(frame);

  // Lens diameter vs minimum blank size
  const mbs = minimumBlankSize(frame, dec);
  if (lens.diameter < mbs) {
    out.push({
      severity: 'error',
      code: 'BLANK_TOO_SMALL',
      message: `Lens diameter ${lens.diameter.toFixed(0)} mm is below the minimum blank size ${mbs.toFixed(0)} mm required by this frame.`,
    });
  }

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
      message: `Centre thickness ${finalCenter.toFixed(2)} mm is high — typical for strong plus prescriptions.`,
    });
  }

  if (frame.type === 'rimless' && lens.index >= 1.67) {
    out.push({
      severity: 'info',
      code: 'RIMLESS_BRITTLE',
      message: 'High-index materials (≥ 1.67) can be brittle for drilled rimless mounts. Prefer MR8 or polycarbonate.',
    });
  }

  if (frame.type === 'semi-rimless' && Math.abs(lens.sphere) >= 4) {
    out.push({
      severity: 'info',
      code: 'GROOVE_THIN',
      message: 'For nylon-grooved frames, a minimum edge thickness ≥ 2.0 mm is recommended.',
    });
  }

  if (Math.abs(lens.sphere) >= 6 && lens.index <= 1.5) {
    out.push({
      severity: 'warning',
      code: 'INDEX_LOW',
      message: 'Strong prescription with low index will produce visibly thick lenses.',
    });
  }

  // Frame size sanity
  if (frame.aSize > 58 && lens.sphere <= -4) {
    out.push({
      severity: 'warning',
      code: 'FRAME_TOO_LARGE',
      message: 'Large frame combined with strong minus power increases edge thickness considerably.',
    });
  }

  return out;
}

// ----- Top-level orchestrator -----------------------------------------

export function runSimulation(lens: LensData, frame: FrameData): ThicknessResult {
  const core = calculateThickness(lens);
  const { finalCenter, finalEdge } = finalEdgedThickness(lens, frame, core);
  const weight = estimateWeight(lens, frame, finalCenter, finalEdge);
  const { comparison, optimalIndex } = compareIndices(lens, frame);
  const warnings = buildWarnings(lens, frame, finalEdge, finalCenter);

  return {
    centerThickness: core.centerThickness,
    edgeThickness: core.edgeThickness,
    finalCenterThickness: finalCenter,
    finalEdgeThickness: finalEdge,
    baseCurve: core.baseCurve,
    weight,
    warnings,
    optimalIndex,
    comparison,
  };
}
