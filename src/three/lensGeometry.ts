import * as THREE from 'three';
import { radiusFromPower, sagitta } from '@/engine/geometry';
import { recommendBaseCurve } from '@/engine/curves';
import type { CustomShape, FrameType, LensData, ThicknessResult } from '@/types';
import { makeCustomCutter } from '@/utils/svgImport';

// =====================================================================
// Physically faithful lens geometry — body + edge as two meshes
// =====================================================================
// Surface math (same as the optical engine):
//
//   z_front(r) = +Ct/2 − s_front(r)        s_front(r) = R1 − √(R1² − r²)
//   z_back(r)  = −Ct/2 − s_back(r)         s_back(r)  = R2 − √(R2² − r²)
//   t(r)       = Ct + (s_back(r) − s_front(r))
//
// The mesh is split into two BufferGeometry pieces:
//
//   • body : front + back surfaces only — rendered with a very
//            transparent transmission material so the background
//            reads cleanly through the lens.
//   • edge : the polished perimeter band, walked along the actual
//            frame outline (cutter ray-march) — rendered with a
//            bright, mildly reflective AR-coated material so the
//            rim reproduces the luminous white band visible in real
//            lens photographs.
// =====================================================================

interface BuildOptions {
  segments?: number;
  rings?: number;
  scale?: number;
  shapeCutter?: (xMm: number, yMm: number) => boolean;
  frameType?: FrameType;
}

export interface LensGeometries {
  body: THREE.BufferGeometry;
  edge: THREE.BufferGeometry;
}

export function buildLensGeometry(
  lens: LensData,
  result: ThicknessResult | null,
  options: BuildOptions = {}
): LensGeometries {
  const segments = options.segments ?? 160;
  const rings = options.rings ?? 64;
  const scale = options.scale ?? 0.04;
  const cutter = options.shapeCutter;
  const frameType = options.frameType ?? 'full-rim';

  const isPlus = lens.sphere + lens.cylinder / 2 >= 0;
  const baseCurve =
    result?.baseCurve ?? recommendBaseCurve(lens.sphere, lens.material, lens.type);
  const worstPower = isPlus
    ? Math.max(lens.sphere, lens.sphere + lens.cylinder)
    : Math.min(lens.sphere, lens.sphere + lens.cylinder);
  const backPower = worstPower - baseCurve;

  const R1 = Math.abs(radiusFromPower(baseCurve, lens.index));
  const R2 = Math.abs(radiusFromPower(backPower, lens.index));

  const ctMm = result?.finalCenterThickness ?? lens.minCenterThickness;

  const sFront = (r: number) => sagitta(R1, r);
  const sBack = (r: number) => sagitta(R2, r);

  const zFront = (r: number) => ctMm / 2 - sFront(r);
  const zBack = (r: number) => -ctMm / 2 - sBack(r);

  const radiusMm = lens.diameter / 2;

  // -----------------------------------------------------------------
  // Body geometry — front + back surfaces only.
  // -----------------------------------------------------------------
  const bodyPositions: number[] = [];
  const bodyUvs: number[] = [];
  const bodyIndices: number[] = [];

  const frontStart = 0;
  for (let ring = 0; ring <= rings; ring++) {
    for (let seg = 0; seg <= segments; seg++) {
      const t = ring / rings;
      const ang = (seg / segments) * Math.PI * 2;
      const r = radiusMm * t;
      const x = Math.cos(ang) * r;
      const y = Math.sin(ang) * r;
      bodyPositions.push(x * scale, y * scale, zFront(r) * scale);
      bodyUvs.push(seg / segments, ring / rings);
    }
  }

  const backStart = bodyPositions.length / 3;
  for (let ring = 0; ring <= rings; ring++) {
    for (let seg = 0; seg <= segments; seg++) {
      const t = ring / rings;
      const ang = (seg / segments) * Math.PI * 2;
      const r = radiusMm * t;
      const x = Math.cos(ang) * r;
      const y = Math.sin(ang) * r;
      bodyPositions.push(x * scale, y * scale, zBack(r) * scale);
      bodyUvs.push(seg / segments, ring / rings);
    }
  }

  for (let ring = 0; ring < rings; ring++) {
    for (let seg = 0; seg < segments; seg++) {
      const a = frontStart + ring * (segments + 1) + seg;
      const b = a + 1;
      const c = a + (segments + 1);
      const d = c + 1;
      bodyIndices.push(a, c, b, b, c, d);
    }
  }
  for (let ring = 0; ring < rings; ring++) {
    for (let seg = 0; seg < segments; seg++) {
      const a = backStart + ring * (segments + 1) + seg;
      const b = a + 1;
      const c = a + (segments + 1);
      const d = c + 1;
      bodyIndices.push(a, b, c, b, d, c);
    }
  }

  const bodyFinalIndices = cutter
    ? clipByCutter(bodyIndices, bodyPositions, scale, cutter)
    : bodyIndices;

  // -----------------------------------------------------------------
  // Edge geometry — bevel band walked along the actual frame outline.
  // -----------------------------------------------------------------
  const edgePositions: number[] = [];
  const edgeUvs: number[] = [];
  const edgeIndices: number[] = [];
  const edgeProfile = makeEdgeProfile(frameType);

  const perimeter = sampleFramePerimeter(cutter, radiusMm, segments);

  for (let seg = 0; seg <= segments; seg++) {
    const { x, y, r } = perimeter[seg];
    const ang = Math.atan2(y, x);
    const nxOut = Math.cos(ang);
    const nyOut = Math.sin(ang);
    const zF = zFront(r);
    const zB = zBack(r);
    const tEdge = zF - zB;

    for (const slot of edgeProfile) {
      const z = zB + slot.t * tEdge;
      const xx = x + nxOut * slot.outMm;
      const yy = y + nyOut * slot.outMm;
      edgePositions.push(xx * scale, yy * scale, z * scale);
      edgeUvs.push(seg / segments, slot.t);
    }
  }

  for (let slot = 0; slot < edgeProfile.length - 1; slot++) {
    for (let seg = 0; seg < segments; seg++) {
      const a = seg * edgeProfile.length + slot;
      const b = (seg + 1) * edgeProfile.length + slot;
      const c = a + 1;
      const d = b + 1;
      edgeIndices.push(a, b, c, b, d, c);
    }
  }

  // -----------------------------------------------------------------
  // Assemble + compute normals.
  // -----------------------------------------------------------------
  const body = new THREE.BufferGeometry();
  body.setAttribute('position', new THREE.Float32BufferAttribute(bodyPositions, 3));
  body.setAttribute('uv', new THREE.Float32BufferAttribute(bodyUvs, 2));
  body.setIndex(bodyFinalIndices);
  body.computeVertexNormals();
  body.computeBoundingSphere();

  const edge = new THREE.BufferGeometry();
  edge.setAttribute('position', new THREE.Float32BufferAttribute(edgePositions, 3));
  edge.setAttribute('uv', new THREE.Float32BufferAttribute(edgeUvs, 2));
  edge.setIndex(edgeIndices);
  edge.computeVertexNormals();
  edge.computeBoundingSphere();

  return { body, edge };
}

// ---------------------------------------------------------------------

function clipByCutter(
  indices: number[],
  positions: number[],
  scale: number,
  cutter: (x: number, y: number) => boolean
): number[] {
  const out: number[] = [];
  for (let i = 0; i < indices.length; i += 3) {
    const i0 = indices[i] * 3;
    const i1 = indices[i + 1] * 3;
    const i2 = indices[i + 2] * 3;
    const cx = (positions[i0] + positions[i1] + positions[i2]) / 3 / scale;
    const cy = (positions[i0 + 1] + positions[i1 + 1] + positions[i2 + 1]) / 3 / scale;
    if (cutter(cx, cy)) out.push(indices[i], indices[i + 1], indices[i + 2]);
  }
  return out;
}

/**
 * Sample the frame perimeter at `segments + 1` evenly spaced angles.
 * Falls back to a circle of `radiusMm` if no cutter is supplied.
 */
function sampleFramePerimeter(
  cutter: ((x: number, y: number) => boolean) | undefined,
  radiusMm: number,
  segments: number
): { x: number; y: number; r: number }[] {
  const pts: { x: number; y: number; r: number }[] = [];
  for (let seg = 0; seg <= segments; seg++) {
    const theta = (seg / segments) * Math.PI * 2;
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    let r = radiusMm;
    if (cutter) r = rayMarch(cutter, cos, sin, radiusMm);
    pts.push({ x: cos * r, y: sin * r, r });
  }
  return pts;
}

function rayMarch(
  cutter: (x: number, y: number) => boolean,
  c: number,
  s: number,
  maxR: number
): number {
  let lo = 0;
  let hi = maxR;
  if (!cutter(c * (maxR * 0.01), s * (maxR * 0.01))) return 0;
  for (let i = 0; i < 18; i++) {
    const mid = (lo + hi) / 2;
    if (cutter(c * mid, s * mid)) lo = mid;
    else hi = mid;
  }
  return lo;
}

// ---------- Edge-profile slots ----------------------------------------

interface EdgeSlot {
  /** Interp factor between back surface (0) and front surface (1). */
  t: number;
  /** Radial offset in mm (positive = out, negative = into the lens). */
  outMm: number;
}

function makeEdgeProfile(type: FrameType): EdgeSlot[] {
  if (type === 'full-rim') {
    // Real edging-machine V-bevel: a flat polished band on both
    // sides of a small V apex (≈ 0.10 mm out) at the centre of edge
    // thickness. The flats either side of the apex are the contact
    // surfaces between the lens and the rim groove.
    return [
      { t: 0.00, outMm: 0.00 },
      { t: 0.32, outMm: 0.00 },
      { t: 0.44, outMm: 0.04 },
      { t: 0.50, outMm: 0.10 },
      { t: 0.56, outMm: 0.04 },
      { t: 0.68, outMm: 0.00 },
      { t: 1.00, outMm: 0.00 },
    ];
  }
  if (type === 'semi-rimless') {
    // Nylor / nylon-grooved frame: a small V groove cut INTO the
    // edge at 50 % thickness — the nylon thread sits in this groove.
    return [
      { t: 0.00, outMm: 0.00 },
      { t: 0.42, outMm: 0.00 },
      { t: 0.46, outMm: -0.08 },
      { t: 0.50, outMm: -0.18 },
      { t: 0.54, outMm: -0.08 },
      { t: 0.58, outMm: 0.00 },
      { t: 1.00, outMm: 0.00 },
    ];
  }
  // Rimless — flat polished edge, just the gentlest outward roll.
  return [
    { t: 0.00, outMm: 0.00 },
    { t: 0.30, outMm: 0.015 },
    { t: 0.50, outMm: 0.03 },
    { t: 0.70, outMm: 0.015 },
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
