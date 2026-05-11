import * as THREE from 'three';
import { radiusFromPower, sagitta } from '@/engine/geometry';
import { recommendBaseCurve } from '@/engine/curves';
import type { CustomShape, FrameData, FrameType, LensData, ThicknessResult } from '@/types';
import { makeCustomCutter } from '@/utils/svgImport';

// =====================================================================
// Physically faithful lens geometry
// =====================================================================
// Builds a meniscus (or plano-convex / plano-concave) lens mesh using
// the same sagitta math the optical engine uses to predict thickness:
//
//   z_front(r) = +Ct/2 − s_front(r)        s_front(r) = R1 − √(R1² − r²)
//   z_back(r)  = −Ct/2 − s_back(r)         s_back(r)  = R2 − √(R2² − r²)
//
//   t(r) = z_front(r) − z_back(r) = Ct + (s_back(r) − s_front(r))
//
// • For a MINUS lens, R2 < R1 so s_back > s_front and t(r) grows from
//   Ct at the centre to Et at the edge — the lens visibly dishes
//   inward toward the eye, exactly as a surfaced meniscus minus does.
// • For a PLUS lens, R1 < R2 so s_front > s_back and t(r) decreases
//   from Ct at the centre to Et at the edge — the classic biconvex
//   meniscus plus.
//
// The mesh is built as three pieces, all sharing the same outer
// polygon (the frame shape):
//   1. Front surface — a polar grid of (r, θ) → (x, y, z_front).
//   2. Back surface  — a polar grid of (r, θ) → (x, y, z_back).
//   3. Edge ring     — a band that joins the two surfaces, with an
//      optional bevel / nylor groove based on `frameType`.
//
// Coordinates are mm, scaled to scene units by `scale`.
// =====================================================================

interface BuildOptions {
  segments?: number;
  rings?: number;
  scale?: number;
  shapeCutter?: (xMm: number, yMm: number) => boolean;
  frameType?: FrameType;
}

export function buildLensGeometry(
  lens: LensData,
  result: ThicknessResult | null,
  options: BuildOptions = {}
): THREE.BufferGeometry {
  const segments = options.segments ?? 144;
  const rings = options.rings ?? 56;
  const scale = options.scale ?? 0.04;
  const cutter = options.shapeCutter;
  const frameType = options.frameType ?? 'full-rim';

  const isPlus = lens.sphere + lens.cylinder / 2 >= 0;
  const baseCurve = result?.baseCurve ?? recommendBaseCurve(lens.sphere, lens.material, lens.type);
  // Worst-meridian power for the back curve — this is the meridian
  // the rendered mesh visually follows. Cylinder modulates per-angle
  // edge thickness in the 360° profile component but rendering a true
  // toric back surface would require an aspheric / atoric mesh.
  const worstPower = isPlus
    ? Math.max(lens.sphere, lens.sphere + lens.cylinder)
    : Math.min(lens.sphere, lens.sphere + lens.cylinder);
  const backPower = worstPower - baseCurve;

  const R1 = Math.abs(radiusFromPower(baseCurve, lens.index));
  const R2 = Math.abs(radiusFromPower(backPower, lens.index));

  const ctMm = result?.finalCenterThickness ?? lens.minCenterThickness;

  const sFront = (r: number) => sagitta(R1, r);
  const sBack = (r: number) => sagitta(R2, r);

  // Surface z values (mm, lens centred on z=0).
  const zFront = (r: number) => ctMm / 2 - sFront(r);
  const zBack = (r: number) => -ctMm / 2 - sBack(r);

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const radiusMm = lens.diameter / 2;

  // ---------- Front + Back grids ----------
  const frontStart = 0;
  for (let ring = 0; ring <= rings; ring++) {
    for (let seg = 0; seg <= segments; seg++) {
      const t = ring / rings;
      const ang = (seg / segments) * Math.PI * 2;
      const r = radiusMm * t;
      const x = Math.cos(ang) * r;
      const y = Math.sin(ang) * r;
      positions.push(x * scale, y * scale, zFront(r) * scale);
      uvs.push(seg / segments, ring / rings);
    }
  }
  const frontVerts = positions.length / 3;

  const backStart = frontVerts;
  for (let ring = 0; ring <= rings; ring++) {
    for (let seg = 0; seg <= segments; seg++) {
      const t = ring / rings;
      const ang = (seg / segments) * Math.PI * 2;
      const r = radiusMm * t;
      const x = Math.cos(ang) * r;
      const y = Math.sin(ang) * r;
      positions.push(x * scale, y * scale, zBack(r) * scale);
      uvs.push(seg / segments, ring / rings);
    }
  }

  // Front-surface triangulation (winding so normals point +Z at apex)
  for (let ring = 0; ring < rings; ring++) {
    for (let seg = 0; seg < segments; seg++) {
      const a = frontStart + ring * (segments + 1) + seg;
      const b = a + 1;
      const c = a + (segments + 1);
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  // Back-surface triangulation (reverse winding)
  for (let ring = 0; ring < rings; ring++) {
    for (let seg = 0; seg < segments; seg++) {
      const a = backStart + ring * (segments + 1) + seg;
      const b = a + 1;
      const c = a + (segments + 1);
      const d = c + 1;
      indices.push(a, b, c, b, d, c);
    }
  }

  // ---------- Edge ring (with bevel / groove / polish) ----------
  // The edge is generated as N segments along the outer ring of the
  // surfaces. For each segment, we emit a band that joins front-edge
  // to back-edge via 1-3 intermediate rings depending on the frame
  // type:
  //   full-rim   → two slanted sides meeting at a V-bevel apex (≈40%
  //                of edge thickness, pointed outward).
  //   rimless    → a flat polished band (one straight segment).
  //   semi-rimless / nylor → a flat upper bevel, a V-groove sunk
  //                into the middle, and a flat lower bevel.
  const edgeRingStart = positions.length / 3;
  const edgeProfile = makeEdgeProfile(frameType);

  // Each θ-segment produces edgeProfile.length new vertices.
  for (let seg = 0; seg <= segments; seg++) {
    const ang = (seg / segments) * Math.PI * 2;
    const r = radiusMm;
    const x = Math.cos(ang) * r;
    const y = Math.sin(ang) * r;
    const zF = zFront(r);
    const zB = zBack(r);
    const tEdge = zF - zB;            // local edge thickness at this θ
    const nx = Math.cos(ang);
    const ny = Math.sin(ang);

    for (const slot of edgeProfile) {
      // slot.t   : interpolation factor between zF (1) and zB (0)
      // slot.out : radial offset in mm (positive = outward bevel
      //            apex, negative = inward groove)
      const z = zB + slot.t * tEdge;
      const radial = r + slot.outMm;
      positions.push(
        Math.cos(ang) * radial * scale,
        Math.sin(ang) * radial * scale,
        z * scale
      );
      uvs.push(seg / segments, slot.t);
    }
  }

  // Connect edge slots to the back-surface outer ring → first slot
  for (let seg = 0; seg < segments; seg++) {
    const backEdgeA = backStart + rings * (segments + 1) + seg;
    const backEdgeB = backEdgeA + 1;
    const edgeA = edgeRingStart + seg * edgeProfile.length;
    const edgeB = edgeRingStart + (seg + 1) * edgeProfile.length;
    indices.push(backEdgeA, edgeA, backEdgeB, backEdgeB, edgeA, edgeB);
  }

  // Connect successive edge slots
  for (let slot = 0; slot < edgeProfile.length - 1; slot++) {
    for (let seg = 0; seg < segments; seg++) {
      const a = edgeRingStart + seg * edgeProfile.length + slot;
      const b = edgeRingStart + (seg + 1) * edgeProfile.length + slot;
      const c = a + 1;
      const d = b + 1;
      indices.push(a, b, c, b, d, c);
    }
  }

  // Connect last edge slot to the front-surface outer ring
  for (let seg = 0; seg < segments; seg++) {
    const last = edgeProfile.length - 1;
    const edgeA = edgeRingStart + seg * edgeProfile.length + last;
    const edgeB = edgeRingStart + (seg + 1) * edgeProfile.length + last;
    const frontEdgeA = frontStart + rings * (segments + 1) + seg;
    const frontEdgeB = frontEdgeA + 1;
    indices.push(edgeA, edgeB, frontEdgeA, edgeB, frontEdgeB, frontEdgeA);
  }

  // ---------- Optional polygon clip (frame outline) ----------
  let finalIndices = indices;
  if (cutter) {
    const filtered: number[] = [];
    for (let i = 0; i < indices.length; i += 3) {
      const i0 = indices[i] * 3;
      const i1 = indices[i + 1] * 3;
      const i2 = indices[i + 2] * 3;
      const cx = (positions[i0] + positions[i1] + positions[i2]) / 3 / scale;
      const cy = (positions[i0 + 1] + positions[i1 + 1] + positions[i2 + 1]) / 3 / scale;
      if (cutter(cx, cy)) {
        filtered.push(indices[i], indices[i + 1], indices[i + 2]);
      }
    }
    finalIndices = filtered;
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(finalIndices);
  geom.computeVertexNormals();
  geom.computeBoundingSphere();
  return geom;
}

// ---------- Edge-profile slots ----------------------------------------

interface EdgeSlot {
  /** Interp factor between back surface (0) and front surface (1). */
  t: number;
  /** Radial offset in mm (negative = into the lens, positive = out). */
  outMm: number;
}

/**
 * Returns a list of slot positions for the edge polyline running from
 * the back-surface edge up to the front-surface edge.
 *
 *   full-rim   : back → flat → bevel apex (outwards) → flat → front
 *   rimless    : back → flat (slightly rounded) → front
 *   nylor      : back → flat → groove apex (inwards) → flat → front
 *
 * The bevel/groove apex sits at t = 0.5 of the local edge thickness,
 * which is where surfacing machines place the V to seat in a frame.
 */
function makeEdgeProfile(type: FrameType): EdgeSlot[] {
  if (type === 'full-rim') {
    return [
      { t: 0.00, outMm: 0.00 },
      { t: 0.30, outMm: 0.00 },
      { t: 0.50, outMm: 0.18 }, // V-bevel apex
      { t: 0.70, outMm: 0.00 },
      { t: 1.00, outMm: 0.00 },
    ];
  }
  if (type === 'semi-rimless') {
    return [
      { t: 0.00, outMm: 0.00 },
      { t: 0.40, outMm: 0.00 },
      { t: 0.50, outMm: -0.25 }, // groove apex (nylon thread sits here)
      { t: 0.60, outMm: 0.00 },
      { t: 1.00, outMm: 0.00 },
    ];
  }
  // rimless — flat polished edge with a tiny outward roll for the sheen
  return [
    { t: 0.00, outMm: 0.00 },
    { t: 0.50, outMm: 0.04 },
    { t: 1.00, outMm: 0.00 },
  ];
}

// ---------- Frame shape cutters --------------------------------------

export function makeShapeCutter(
  shape: string,
  aMm: number,
  bMm: number,
  custom?: CustomShape | null
): (x: number, y: number) => boolean {
  if (custom && custom.points.length >= 3) {
    return makeCustomCutter(custom);
  }
  const halfA = aMm / 2;
  const halfB = bMm / 2;
  switch (shape) {
    case 'round':
      return (x, y) => x * x + y * y <= halfA * halfA;
    case 'oval':
      return (x, y) => (x * x) / (halfA * halfA) + (y * y) / (halfB * halfB) <= 1;
    case 'rectangular':
      return (x, y) => Math.abs(x) <= halfA && Math.abs(y) <= halfB;
    case 'square':
      return (x, y) => Math.abs(x) <= halfA && Math.abs(y) <= halfA;
    case 'aviator':
      return (x, y) => {
        const ny = (y + halfB * 0.15) / halfB;
        const nx = x / halfA;
        return nx * nx + ny * ny * (ny < 0 ? 1.4 : 1.0) <= 1;
      };
    case 'cat-eye':
      return (x, y) => {
        const ny = y / halfB;
        const nx = x / halfA;
        const lift = nx > 0 ? -0.15 * Math.abs(nx) : 0.15 * Math.abs(nx);
        return nx * nx + (ny + lift) * (ny + lift) <= 1;
      };
    case 'panto':
      return (x, y) => {
        const ny = (y - halfB * 0.1) / halfB;
        const nx = x / halfA;
        return nx * nx + ny * ny * (ny < 0 ? 1.6 : 1.1) <= 1;
      };
    default:
      return (x, y) => (x * x) / (halfA * halfA) + (y * y) / (halfB * halfB) <= 1;
  }
}

// Helper used by the ProfileView component to know the frame type
// when sampling the cutter for perimeter rays.
export type { FrameData };
