import * as THREE from 'three';
import { radiusFromPower, recommendBaseCurve, sagitta } from '@/engine/calculate';
import type { LensData } from '@/types';

// =====================================================================
// Procedural lens geometry
// =====================================================================
// Builds a closed lens mesh by sampling the front and back spherical
// surfaces over a circular aperture. The two surfaces are stitched
// together by a thin cylindrical band at the edge.
//
// Coordinates: lens is centred at origin, axis along +Z.
//   - front surface (towards viewer) uses radius r1 (base curve)
//   - back surface uses radius r2 (computed from total power − base)
//
// Length units: millimetres are scaled to scene units by `scale`.
// =====================================================================

interface LensGeometryOptions {
  segments?: number;
  scale?: number;       // mm → scene units
  shapeCutter?: (xMm: number, yMm: number) => boolean; // returns true if (x,y) is inside the cut shape
}

export function buildLensGeometry(
  lens: LensData,
  options: LensGeometryOptions = {}
): THREE.BufferGeometry {
  const segments = options.segments ?? 96;
  const scale = options.scale ?? 0.04;
  const cutter = options.shapeCutter;

  const radiusMm = lens.diameter / 2;
  const isPlus = lens.sphere + lens.cylinder / 2 >= 0;
  const baseCurve = recommendBaseCurve(lens.sphere);
  const totalPower = lens.sphere + (isPlus ? 0 : lens.cylinder);
  const backPower = totalPower - baseCurve;

  const r1 = Math.abs(radiusFromPower(baseCurve, lens.index));
  const r2 = Math.abs(radiusFromPower(backPower, lens.index));

  const sFront = sagitta(r1, radiusMm);
  const sBack = sagitta(r2, radiusMm);

  // Place the lens so the "thinnest" part sits centred on z=0.
  const minThickness = isPlus ? lens.minEdgeThickness : lens.minCenterThickness;

  // Front surface z: convex side towards viewer (+z bulge for plus).
  // For a converging (plus) lens, front sag adds to centre thickness.
  // For a diverging (minus) lens, back sag adds to edge thickness.
  const centerOffset = (isPlus ? sFront - sBack : sBack - sFront);
  const halfThickness = (minThickness + Math.abs(centerOffset)) / 2;

  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  const uvs: number[] = [];

  // Build a polar grid (rings × segments) for both faces.
  const rings = 32;

  // Index helpers
  const frontStart = 0;
  const backStart = (rings + 1) * (segments + 1);

  // Helper that maps (ring, seg) to (x, y) and tells if the vertex is inside the shape.
  function vertexAt(ring: number, seg: number) {
    const t = ring / rings;
    const ang = (seg / segments) * Math.PI * 2;
    const r = radiusMm * t;
    const x = Math.cos(ang) * r;
    const y = Math.sin(ang) * r;
    return { x, y, ang, r };
  }

  // FRONT surface
  for (let ring = 0; ring <= rings; ring++) {
    for (let seg = 0; seg <= segments; seg++) {
      const { x, y, r } = vertexAt(ring, seg);
      const sag = sagitta(r1, r);
      const z = halfThickness + (isPlus ? (sFront - sag) : -sag * 0.4);
      positions.push(x * scale, y * scale, z * scale);

      // Approximate normal pointing along (x, y, slope_z)
      const slope = r / Math.sqrt(Math.max(r1 * r1 - r * r, 1e-3));
      const nx = (x / Math.max(r, 1e-3)) * slope;
      const ny = (y / Math.max(r, 1e-3)) * slope;
      const n = new THREE.Vector3(nx, ny, 1).normalize();
      normals.push(n.x, n.y, n.z);
      uvs.push(seg / segments, ring / rings);
    }
  }

  // BACK surface
  for (let ring = 0; ring <= rings; ring++) {
    for (let seg = 0; seg <= segments; seg++) {
      const { x, y, r } = vertexAt(ring, seg);
      const sag = sagitta(r2, r);
      const z = -halfThickness - (isPlus ? -sag * 0.4 : (sBack - sag));
      positions.push(x * scale, y * scale, z * scale);

      const slope = r / Math.sqrt(Math.max(r2 * r2 - r * r, 1e-3));
      const nx = -(x / Math.max(r, 1e-3)) * slope;
      const ny = -(y / Math.max(r, 1e-3)) * slope;
      const n = new THREE.Vector3(nx, ny, -1).normalize();
      normals.push(n.x, n.y, n.z);
      uvs.push(seg / segments, ring / rings);
    }
  }

  // Faces — front
  for (let ring = 0; ring < rings; ring++) {
    for (let seg = 0; seg < segments; seg++) {
      const a = frontStart + ring * (segments + 1) + seg;
      const b = a + 1;
      const c = a + (segments + 1);
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  // Faces — back (flipped winding)
  for (let ring = 0; ring < rings; ring++) {
    for (let seg = 0; seg < segments; seg++) {
      const a = backStart + ring * (segments + 1) + seg;
      const b = a + 1;
      const c = a + (segments + 1);
      const d = c + 1;
      indices.push(a, b, c, b, d, c);
    }
  }
  // Edge band — connect outer ring of front to outer ring of back
  for (let seg = 0; seg < segments; seg++) {
    const f = frontStart + rings * (segments + 1) + seg;
    const fNext = f + 1;
    const b = backStart + rings * (segments + 1) + seg;
    const bNext = b + 1;
    indices.push(f, fNext, b, fNext, bNext, b);
  }

  // Optional shape cut: drop triangles whose centroid lies outside the cutter.
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
  geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(finalIndices);
  geom.computeBoundingSphere();
  return geom;
}

// ----- Frame shape cutters --------------------------------------------
// Each cutter accepts (x,y) in mm with origin at lens centre and returns
// true if that point lies within the frame outline.

export function makeShapeCutter(
  shape: string,
  aMm: number,
  bMm: number
): (x: number, y: number) => boolean {
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
      // Teardrop-ish — wider at top, tapering at bottom
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
