// =====================================================================
// PRESBYTA — SVG frame-shape importer
// =====================================================================
// Reads an SVG file uploaded by the user, samples the first <path> or
// <polygon> element, normalises the polygon to mm with the centroid
// at the origin, and returns a CustomShape suitable for the engine
// and 3D renderer.
//
// Notes on coordinate conventions:
//   • SVG y-axis points down — we flip it so that +y points up.
//   • The polygon is centred on the bounding-box centroid.
//   • The output is scaled so the bounding-box width matches the
//     A-size of the active frame (or a safe default if none is set).
// =====================================================================

import type { CustomShape } from '@/types';

const SVG_NS = 'http://www.w3.org/2000/svg';
const PATH_SAMPLES = 220;

/**
 * Parse an SVG file into a CustomShape using the first usable path
 * or polygon element.  Throws when no usable element exists.
 */
export async function parseSvgShape(
  file: File,
  targetAMm = 52,
  targetBMm = 32
): Promise<CustomShape> {
  const text = await file.text();
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');

  const parserError = doc.querySelector('parsererror');
  if (parserError) throw new Error('Invalid SVG file');

  const path = doc.querySelector('path');
  const polygon = doc.querySelector('polygon');
  const polyline = doc.querySelector('polyline');

  let raw: [number, number][];
  if (path) {
    const d = path.getAttribute('d') || '';
    if (!d) throw new Error('Path has no "d" attribute');
    raw = sampleSvgPath(d);
  } else if (polygon) {
    raw = parsePoints(polygon.getAttribute('points') || '');
  } else if (polyline) {
    raw = parsePoints(polyline.getAttribute('points') || '');
  } else {
    throw new Error('No path / polygon found in SVG');
  }

  if (raw.length < 3) throw new Error('Polygon needs at least 3 points');

  const normalised = normalise(raw, targetAMm, targetBMm);
  return {
    name: file.name,
    points: normalised.points,
    aMm: normalised.aMm,
    bMm: normalised.bMm,
  };
}

// ----- Helpers --------------------------------------------------------

function parsePoints(attr: string): [number, number][] {
  return attr
    .trim()
    .split(/\s+/)
    .map((tok) => {
      const [x, y] = tok.split(',').map(parseFloat);
      return [x, y] as [number, number];
    })
    .filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
}

/**
 * Sample an SVG path's outline using getTotalLength/getPointAtLength.
 * Requires a temporary, off-screen SVG element attached to the DOM —
 * browser engines do not compute path length without layout context.
 */
function sampleSvgPath(d: string): [number, number][] {
  if (typeof document === 'undefined') return [];
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.style.position = 'absolute';
  svg.style.opacity = '0';
  svg.style.pointerEvents = 'none';

  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', d);
  svg.appendChild(path);
  document.body.appendChild(svg);

  try {
    const total = path.getTotalLength();
    if (!Number.isFinite(total) || total <= 0) return [];
    const points: [number, number][] = [];
    for (let i = 0; i <= PATH_SAMPLES; i++) {
      const t = (i / PATH_SAMPLES) * total;
      const p = path.getPointAtLength(t);
      points.push([p.x, p.y]);
    }
    return points;
  } finally {
    document.body.removeChild(svg);
  }
}

/**
 * Centre the polygon on its bounding-box centroid, flip the y-axis
 * (SVG → optical), and scale so the bounding-box width matches A.
 */
function normalise(
  raw: [number, number][],
  targetAMm: number,
  targetBMm: number
): { points: [number, number][]; aMm: number; bMm: number } {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [x, y] of raw) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const widthSvg = maxX - minX;
  const heightSvg = maxY - minY;
  const scale = widthSvg > 0 ? targetAMm / widthSvg : 1;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  const points = raw.map(([x, y]) => {
    return [
      (x - cx) * scale,
      // SVG y is down; flip to optical convention (up positive)
      -(y - cy) * scale,
    ] as [number, number];
  });

  return {
    points,
    aMm: widthSvg * scale,
    bMm: heightSvg * scale,
  };
}

// ----- Cutter ---------------------------------------------------------

/**
 * Point-in-polygon test using ray casting. Used by the lens geometry
 * builder to clip vertices outside the imported shape.
 */
export function makeCustomCutter(shape: CustomShape): (x: number, y: number) => boolean {
  const poly = shape.points;
  return (x: number, y: number) => {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i];
      const [xj, yj] = poly[j];
      const intersect =
        yi > y !== yj > y &&
        x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-12) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  };
}
