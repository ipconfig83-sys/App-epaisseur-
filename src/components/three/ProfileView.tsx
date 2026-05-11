import { useMemo } from 'react';
import type { FrameData, LensData, ThicknessResult } from '@/types';
import { radiusFromPower, sagitta, meridianPower } from '@/engine/geometry';
import { makeShapeCutter } from '@/three/lensGeometry';

// =====================================================================
// 360° edge-thickness profile
// =====================================================================
// Renders the frame outline as it sits on the patient's face and
// colour-codes the LENS EDGE THICKNESS at every angle around it.
//
// For each sample angle θ around the frame:
//   1. Find the frame perimeter point (xf, yf) at that angle.
//   2. Translate to the optical centre by subtracting decentration:
//        (xo, yo) = (xf − DCh, yf − DCv)
//   3. Compute radial distance r and meridian angle φ from the OC.
//   4. The meridian power at φ:
//        F(φ) = sphere + cyl · sin²(φ − axis)
//   5. Sagittas with F1 = base, F2 = F − F1, r1 / r2 from the index.
//   6. Edge thickness at this point:
//        Plus  : et = max(etMin, Ct − (s1 − s2))
//        Minus : et = max(etMin, Ct + (s2 − s1))
//
// The component also draws an inset showing the worst-meridian
// cross-section with Ct / Et labels.
// =====================================================================

interface Props {
  lens: LensData;
  frame: FrameData;
  result: ThicknessResult;
}

const SAMPLES = 144; // 2.5° resolution around the frame

export default function ProfileView({ lens, frame, result }: Props) {
  const data = useMemo(() => computeProfile(lens, frame, result), [lens, frame, result]);

  const W = 560;
  const H = 320;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
      <defs>
        <linearGradient id="edge-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#5bd0a8" />
          <stop offset="50%" stopColor="#ecc154" />
          <stop offset="100%" stopColor="#ef6a5a" />
        </linearGradient>
        <linearGradient id="lens-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(207,226,255,0.20)" />
          <stop offset="100%" stopColor="rgba(79,127,187,0.10)" />
        </linearGradient>
      </defs>

      {/* ===== LEFT — 360° front view of the frame ===== */}
      <g transform={`translate(${W * 0.27}, ${H / 2})`}>
        {/* Background frame outline (faint) */}
        <path
          d={polygonPath(data.framePts, data.scale)}
          fill="url(#lens-fill)"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="1"
        />

        {/* Colour-coded thickness band — each segment coloured by its edge value */}
        {data.framePts.map((p, i) => {
          const next = data.framePts[(i + 1) % data.framePts.length];
          const col = colourForThickness(p.edge, data.minEdge, data.maxEdge);
          return (
            <line
              key={i}
              x1={p.x * data.scale}
              y1={-p.y * data.scale}
              x2={next.x * data.scale}
              y2={-next.y * data.scale}
              stroke={col}
              strokeWidth={2.4}
              strokeLinecap="round"
            />
          );
        })}

        {/* Boxing centre cross (geometric centre of the frame) */}
        <g stroke="rgba(255,255,255,0.30)" strokeWidth="0.8">
          <line x1={-6} y1={0} x2={6} y2={0} />
          <line x1={0} y1={-6} x2={0} y2={6} />
        </g>

        {/* Optical centre cross — offset by decentration */}
        <g
          transform={`translate(${data.ocX * data.scale}, ${-data.ocY * data.scale})`}
          stroke="#ecc154"
          strokeWidth="1.2"
        >
          <circle r="3" fill="none" />
          <line x1={-7} y1={0} x2={7} y2={0} />
          <line x1={0} y1={-7} x2={0} y2={7} />
        </g>

        {/* Decentration vector */}
        {(Math.abs(data.ocX) > 0.5 || Math.abs(data.ocY) > 0.5) && (
          <line
            x1={0}
            y1={0}
            x2={data.ocX * data.scale}
            y2={-data.ocY * data.scale}
            stroke="#ecc154"
            strokeWidth="0.6"
            strokeDasharray="3 3"
          />
        )}

        {/* Min/Max labels at their perimeter positions */}
        <PerimeterLabel
          point={data.maxPoint}
          scale={data.scale}
          text={`Et max ${data.maxEdge.toFixed(2)} mm`}
          color="#ef6a5a"
        />
        <PerimeterLabel
          point={data.minPoint}
          scale={data.scale}
          text={`Et min ${data.minEdge.toFixed(2)} mm`}
          color="#5bd0a8"
        />

        {/* Cardinal labels — temporal / nasal / superior / inferior */}
        <CardinalTag x={data.bbox.maxX * data.scale + 8} y={0} text="TEMP" />
        <CardinalTag x={data.bbox.minX * data.scale - 8} y={0} text="NAS" anchorEnd />
        <CardinalTag x={0} y={-data.bbox.maxY * data.scale - 6} text="SUP" middle />
        <CardinalTag x={0} y={-data.bbox.minY * data.scale + 14} text="INF" middle />
      </g>

      {/* ===== RIGHT — side cross-section of the worst meridian ===== */}
      <g transform={`translate(${W * 0.62}, ${H / 2})`}>
        <text x={0} y={-H / 2 + 22} fill="#ecc154" fontSize="9" letterSpacing="3" fontFamily="Inter, sans-serif">
          WORST MERIDIAN  ·  φ = {data.worstMeridianAngle.toFixed(0)}°
        </text>
        <CrossSection
          ct={result.finalCenterThickness}
          et={data.maxEdge}
          diameter={data.crossDiameter}
          isPlus={data.isPlus}
        />
      </g>

      {/* ===== Footer scale legend ===== */}
      <g transform={`translate(${W / 2 - 110}, ${H - 18})`}>
        <text x={0} y={-4} fill="#ffffff80" fontSize="9" letterSpacing="2">
          EDGE THICKNESS
        </text>
        <rect x={0} y={2} width={220} height={6} fill="url(#edge-grad)" rx={3} />
        <text x={0} y={20} fill="#5bd0a8" fontSize="9" fontFamily="JetBrains Mono, monospace">
          {data.minEdge.toFixed(2)} mm
        </text>
        <text x={220} y={20} fill="#ef6a5a" fontSize="9" textAnchor="end" fontFamily="JetBrains Mono, monospace">
          {data.maxEdge.toFixed(2)} mm
        </text>
      </g>

      {/* Title */}
      <text x={20} y={20} fill="#ffffff60" fontSize="10" letterSpacing="3">
        360° EDGE PROFILE  ·  {frame.shape.toUpperCase()}  ·  Ø {lens.diameter} mm  ·  n = {lens.index}
      </text>
    </svg>
  );
}

// ---------- Helpers ----------------------------------------------------

interface Sample {
  x: number;        // mm in frame coords (boxing centre at origin)
  y: number;
  edge: number;     // edge thickness at that perimeter point (mm)
  angleDeg: number; // angle from OC
  radius: number;   // radius from OC
}

function computeProfile(lens: LensData, frame: FrameData, result: ThicknessResult) {
  const F_se = lens.sphere + lens.cylinder / 2;
  const isPlus = F_se >= 0;
  const baseCurve = result.baseCurve;
  const ctMin = result.ansi.ansiCenterMin;
  const etMin = result.ansi.ansiEdgeMin;
  const ct = result.finalCenterThickness;

  // Decentration: vector from boxing centre to optical centre.
  // DC_h positive when OC must shift nasally (towards bridge);
  // for the front view we plot the OC at +DC nasally.
  const dcH = result.blank.effectiveDecentrationH;
  const dcV = result.blank.effectiveDecentrationV;

  // Ray-march the frame perimeter using the existing shape cutter.
  const cutter = makeShapeCutter(frame.shape, frame.aSize, frame.bSize);

  const framePts: Sample[] = [];
  let minEdge = Infinity, maxEdge = -Infinity;
  let minPoint: Sample | null = null, maxPoint: Sample | null = null;
  let worstMeridianAngle = 0;
  let crossDiameter = 0;

  for (let i = 0; i < SAMPLES; i++) {
    const theta = (i / SAMPLES) * 2 * Math.PI;
    const r = perimeterRadius(cutter, theta);
    const xf = Math.cos(theta) * r;
    const yf = Math.sin(theta) * r;

    // Translate to optical-centre coordinates
    const xo = xf - dcH;
    const yo = yf - dcV;
    const rOC = Math.hypot(xo, yo);
    const angleFromOCDeg = (Math.atan2(yo, xo) * 180) / Math.PI;

    // Meridian power at this angle
    const F = meridianPower(lens.sphere, lens.cylinder, lens.axis, angleFromOCDeg);
    const F2 = F - baseCurve;
    const r1 = Math.abs(radiusFromPower(baseCurve, lens.index));
    const r2 = Math.abs(radiusFromPower(F2, lens.index));
    const s1 = sagitta(r1, rOC);
    const s2 = sagitta(r2, rOC);

    const edge = isPlus
      ? Math.max(etMin, ct - (s1 - s2))
      : Math.max(etMin, ct + (s2 - s1));

    const sample: Sample = { x: xf, y: yf, edge, angleDeg: angleFromOCDeg, radius: rOC };
    framePts.push(sample);

    if (edge > maxEdge) { maxEdge = edge; maxPoint = sample; worstMeridianAngle = angleFromOCDeg; crossDiameter = 2 * rOC; }
    if (edge < minEdge) { minEdge = edge; minPoint = sample; }
  }

  // Bounding box (for cardinal labels and scaling)
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of framePts) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  // Scale so the frame fits the left half nicely (≈ 180 px wide)
  const widthMm = maxX - minX;
  const heightMm = maxY - minY;
  const scale = Math.min(170 / Math.max(widthMm, 1), 130 / Math.max(heightMm, 1));

  return {
    framePts,
    minEdge,
    maxEdge,
    minPoint: minPoint ?? framePts[0],
    maxPoint: maxPoint ?? framePts[0],
    ocX: dcH,
    ocY: dcV,
    bbox: { minX, maxX, minY, maxY },
    scale,
    isPlus,
    worstMeridianAngle,
    crossDiameter,
  };
}

/**
 * Ray-march from the origin to the frame perimeter at angle θ using
 * the shape cutter as an inside test.  Binary search to 0.05 mm.
 */
function perimeterRadius(cutter: (x: number, y: number) => boolean, theta: number): number {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  // Expand until outside
  let hi = 5;
  while (cutter(hi * c, hi * s) && hi < 200) hi *= 1.5;
  let lo = 0;
  // Binary search
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (cutter(mid * c, mid * s)) lo = mid;
    else hi = mid;
  }
  return lo;
}

function polygonPath(pts: Sample[], scale: number) {
  if (pts.length === 0) return '';
  return (
    `M ${pts[0].x * scale} ${-pts[0].y * scale} ` +
    pts.map((p) => `L ${p.x * scale} ${-p.y * scale}`).join(' ') +
    ' Z'
  );
}

function colourForThickness(value: number, min: number, max: number): string {
  const t = max > min ? (value - min) / (max - min) : 0;
  // Green → gold → red gradient
  if (t < 0.5) {
    const u = t / 0.5;
    return mix('#5bd0a8', '#ecc154', u);
  }
  const u = (t - 0.5) / 0.5;
  return mix('#ecc154', '#ef6a5a', u);
}

function mix(a: string, b: string, t: number): string {
  const pa = parseHex(a);
  const pb = parseHex(b);
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

function parseHex(h: string): [number, number, number] {
  const s = h.replace('#', '');
  return [
    parseInt(s.slice(0, 2), 16),
    parseInt(s.slice(2, 4), 16),
    parseInt(s.slice(4, 6), 16),
  ];
}

function PerimeterLabel({
  point,
  scale,
  text,
  color,
}: {
  point: Sample;
  scale: number;
  text: string;
  color: string;
}) {
  const ang = Math.atan2(point.y, point.x);
  const r = Math.hypot(point.x, point.y) * scale + 18;
  const lx = Math.cos(ang) * r;
  const ly = -Math.sin(ang) * r;
  const tickStart = { x: point.x * scale, y: -point.y * scale };
  const labelAnchor = lx > 4 ? 'start' : lx < -4 ? 'end' : 'middle';

  return (
    <g>
      <line
        x1={tickStart.x}
        y1={tickStart.y}
        x2={lx}
        y2={ly}
        stroke={color}
        strokeWidth="0.8"
      />
      <circle cx={tickStart.x} cy={tickStart.y} r="2.5" fill={color} />
      <text
        x={lx + (lx > 0 ? 3 : lx < 0 ? -3 : 0)}
        y={ly + 3}
        fontSize="9"
        fill={color}
        textAnchor={labelAnchor}
        fontFamily="JetBrains Mono, monospace"
      >
        {text}
      </text>
    </g>
  );
}

function CardinalTag({
  x,
  y,
  text,
  anchorEnd,
  middle,
}: {
  x: number;
  y: number;
  text: string;
  anchorEnd?: boolean;
  middle?: boolean;
}) {
  return (
    <text
      x={x}
      y={y}
      fontSize="8"
      fill="#ffffff45"
      letterSpacing="2"
      textAnchor={anchorEnd ? 'end' : middle ? 'middle' : 'start'}
    >
      {text}
    </text>
  );
}

function CrossSection({
  ct,
  et,
  diameter,
  isPlus,
}: {
  ct: number;
  et: number;
  diameter: number;
  isPlus: boolean;
}) {
  const W = 180;
  const H = 110;
  const semi = diameter / 2;
  const tMax = Math.max(ct, et, 4);
  const yScale = (H * 0.55) / tMax;
  const xScale = W / Math.max(diameter, 1);

  const points = 80;
  const front: [number, number][] = [];
  const back: [number, number][] = [];
  for (let i = 0; i <= points; i++) {
    const xMm = -semi + (i / points) * diameter;
    const ratio = Math.abs(xMm) / semi;
    const k = ratio * ratio;
    const t = isPlus ? ct - (ct - et) * k : ct + (et - ct) * k;
    const cx = xMm * xScale;
    front.push([cx, -t / 2 * yScale]);
    back.push([cx, t / 2 * yScale]);
  }
  const path =
    `M ${front[0][0]} ${front[0][1]} ` +
    front.map((p) => `L ${p[0]} ${p[1]}`).join(' ') +
    back.reverse().map((p) => `L ${p[0]} ${p[1]}`).join(' ') +
    ' Z';

  return (
    <g>
      <line x1={-W / 2 - 4} y1={0} x2={W / 2 + 4} y2={0} stroke="rgba(255,255,255,0.10)" strokeDasharray="3 4" />
      <path d={path} fill="rgba(207,226,255,0.30)" stroke="#ecc154" strokeWidth="1.1" />

      {/* CT marker */}
      <g stroke="#ecc154" strokeWidth="0.8" fill="none">
        <line x1={0} y1={(-ct / 2) * yScale} x2={0} y2={(ct / 2) * yScale} />
        <line x1={-5} y1={(-ct / 2) * yScale} x2={5} y2={(-ct / 2) * yScale} />
        <line x1={-5} y1={(ct / 2) * yScale} x2={5} y2={(ct / 2) * yScale} />
      </g>
      <text x={8} y={4} fontSize="10" fill="#ecc154" fontFamily="JetBrains Mono, monospace">
        Ct {ct.toFixed(2)}
      </text>

      {/* ET marker */}
      <g stroke="#ef6a5a" strokeWidth="0.8" fill="none">
        <line x1={W / 2 - 8} y1={(-et / 2) * yScale} x2={W / 2 - 8} y2={(et / 2) * yScale} />
        <line x1={W / 2 - 12} y1={(-et / 2) * yScale} x2={W / 2 - 4} y2={(-et / 2) * yScale} />
        <line x1={W / 2 - 12} y1={(et / 2) * yScale} x2={W / 2 - 4} y2={(et / 2) * yScale} />
      </g>
      <text x={W / 2 - 14} y={4} fontSize="10" fill="#ef6a5a" textAnchor="end" fontFamily="JetBrains Mono, monospace">
        Et {et.toFixed(2)}
      </text>
    </g>
  );
}
