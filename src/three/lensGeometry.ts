import * as THREE from 'three';
import { radiusFromPower, sagitta } from '@/engine/geometry';
import { recommendBaseCurve } from '@/engine/curves';
import type { CustomShape, LensData } from '@/types';
import { makeCustomCutter } from '@/utils/svgImport';

// =====================================================================
// Procedural lens geometry
// =====================================================================
// Builds a closed lens mesh by sampling the front and back spherical
// surfaces over a polar grid, stitched by an edge band.
//
// Conventions:
//   - Lens centred at origin, optical axis along +Z.
//   - Front surface (towards viewer) uses radius r1 (base curve).
//   - Back surface uses radius r2 (computed from total power − base).
//   - Length units are mm, scaled to scene units by `scale`.
//
// Surface signs (geometric):
//   - Plus lens (converging):  bulging front, flatter back.
//   - Minus lens (diverging):  flatter front, deeply concave back.
//
// Normals are computed by THREE.computeVertexNormals() after the mesh
// is built — this produces smooth shading that matches the geometry
// exactly, including around the cutter-trimmed edge.
// =====================================================================

interface LensGeometryOptions {
  segments?: number;
  rings?: number;
  scale?: number;
  shapeCutter?: (xMm: number, yMm: number) => boolean;
}

export function buildLensGeometry(
  lens: LensData,
  options: LensGeometryOptions = {}
): THREE.BufferGeometry {
  const segments = options.segments ?? 120;
  const rings = options.rings ?? 48;
  const scale = options.scale ?? 0.04;
  const cutter = options.shapeCutter;

  const radiusMm = lens.diameter / 2;
  const isPlus = lens.sphere + lens.cylinder / 2 >= 0;
  const baseCurve = recommendBaseCurve(lens.sphere, lens.material, lens.type);
  const totalPower = lens.sphere + (isPlus ? 0 : lens.cylinder);
  const backPower = totalPower - baseCurve;

  const r1 = Math.abs(radiusFromPower(baseCurve, lens.index));
  const r2 = Math.abs(radiusFromPower(backPower, lens.index));

  const sFront = sagitta(r1, radiusMm);
  const sBack = sagitta(r2, radiusMm);

  // Centre the lens vertically: thinnest section sits at z = 0 plane.
  const minThickness = isPlus ? lens.minEdgeThickness : lens.minCenterThickness;
  const centerOffset = isPlus ? sFront - sBack : sBack - sFront;
  const halfThickness = (minThickness + Math.abs(centerOffset)) / 2;

  // ---------- Vertex generation ----------
  const positions: number[] = [];
  const uvs: number[] = [];

  const vertexAt = (ring: number, seg: number) => {
    const t = ring / rings;
    const ang = (seg / segments) * Math.PI * 2;
    const r = radiusMm * t;
    return { x: Math.cos(ang) * r, y: Math.sin(ang) * r, r };
  };

  // Z value of the front-surface at radius r (centred lens).
  const zFront = (r: number) => {
    const sag = sagitta(r1, r);
    return isPlus ? halfThickness + (sFront - sag) : halfThickness - sag * 0.35;
  };
  // Z value of the back-surface at radius r.
  const zBack = (r: number) => {
    const sag = sagitta(r2, r);
    return isPlus ? -halfThickness + sag * 0.35 : -halfThickness - (sBack - sag);
  };

  // Front
  const frontStart = 0;
  for (let ring = 0; ring <= rings; ring++) {
    for (let seg = 0; seg <= segments; seg++) {
      const { x, y, r } = vertexAt(ring, seg);
      positions.push(x * scale, y * scale, zFront(r) * scale);
      uvs.push(seg / segments, ring / rings);
    }
  }

  // Back
  const backStart = positions.length / 3;
  for (let ring = 0; ring <= rings; ring++) {
    for (let seg = 0; seg <= segments; seg++) {
      const { x, y, r } = vertexAt(ring, seg);
      positions.push(x * scale, y * scale, zBack(r) * scale);
      uvs.push(seg / segments, ring / rings);
    }
  }

  // ---------- Triangulation ----------
  const indices: number[] = [];

  // Front faces
  for (let ring = 0; ring < rings; ring++) {
    for (let seg = 0; seg < segments; seg++) {
      const a = frontStart + ring * (segments + 1) + seg;
      const b = a + 1;
      const c = a + (segments + 1);
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  // Back faces (reverse winding so the outward normal points −Z)
  for (let ring = 0; ring < rings; ring++) {
    for (let seg = 0; seg < segments; seg++) {
      const a = backStart + ring * (segments + 1) + seg;
      const b = a + 1;
      const c = a + (segments + 1);
      const d = c + 1;
      indices.push(a, b, c, b, d, c);
    }
  }
  // Edge band — outer ring of front to outer ring of back
  for (let seg = 0; seg < segments; seg++) {
    const f = frontStart + rings * (segments + 1) + seg;
    const fNext = f + 1;
    const b = backStart + rings * (segments + 1) + seg;
    const bNext = b + 1;
    indices.push(f, fNext, b, fNext, bNext, b);
  }

  // ---------- Optional shape clip ----------
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

  // ---------- Assemble ----------
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(finalIndices);

  // Let Three compute smooth vertex normals — much more reliable than
  // hand-rolled analytic normals, especially around the trimmed edge.
  geom.computeVertexNormals();
  geom.computeBoundingSphere();
  return geom;
}

// ----- Frame shape cutters --------------------------------------------
// Each cutter accepts (x,y) in mm with origin at lens centre and returns
// true if that point lies within the frame outline.

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
