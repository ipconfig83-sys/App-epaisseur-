import { useMemo } from 'react';
import type { FrameData, LensData, ThicknessResult } from '@/types';
import { radiusFromPower, sagitta, meridianPower } from '@/engine/geometry';
import { makeShapeCutter } from '@/three/lensGeometry';

// =====================================================================
// PRESBYTA — Laboratory edge-profile analysis
// =====================================================================
// Re-implements the 360° edge thickness analysis to read like an
// edging-laboratory diagnostic screen (Essilor Mr. Blue / Hoya
// HiVisual style) instead of an abstract diagram.
//
// Three integrated panels:
//
//   FRONT VIEW (left)
//     • Frame outline drawn as it sits on the patient's face.
//     • Inside the outline, 96 inward-pointing thickness bars whose
//       length is normalised to the local edge thickness — gives an
//       immediate visual reading of where the lens is thick / thin.
//     • Eight numerical callouts at 0° / 45° / … / 315° with leader
//       lines to their perimeter positions.
//     • Optical centre cross (gold), boxing-centre cross (white),
//       and the decentration vector connecting the two.
//     • Faint engineering grid inside the lens.
//
//   READOUT (right)
//     • Cardinal Et table — TEMP / NAS / SUP / INF / OBL+ / OBL−.
//     • Asymmetry numbers — ΔH = Temp − Nas, ΔV = Sup − Inf.
//     • Two-meridian cross-section with bevel apex indicated.
//     • Worst- and best-meridian numerical summary.
//
//   FOOTER
//     • Colour-scale legend in mm.
// =====================================================================

interface Props {
  lens: LensData;
  frame: FrameData;
  result: ThicknessResult;
}

const PERIM_SAMPLES = 192; // 1.875° resolution for the perimeter
const RIGHT_EYE_NASAL_DIR = -1; // assume right eye: nasal = −x

export default function ProfileView({ lens, frame, result }: Props) {
  const data = useMemo(() => computeProfile(lens, frame, result), [lens, frame, result]);

  const W = 720;
  const H = 380;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
      <defs>
        <linearGradient id="edge-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#5bd0a8" />
          <stop offset="50%" stopColor="#ecc154" />
          <stop offset="100%" stopColor="#ef6a5a" />
        </linearGradient>
        <pattern id="grid" patternUnits="userSpaceOnUse" width="10" height="10">
          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
        </pattern>
      </defs>

      {/* Header strip */}
      <g transform="translate(16, 14)">
        <text fill="#ffffff70" fontSize="9" letterSpacing="3" fontFamily="Inter, sans-serif">
          EDGE PROFILE  ·  LABORATORY ANALYSIS
        </text>
        <text x={0} y={14} fill="#ecc154" fontSize="10" fontFamily="JetBrains Mono, monospace">
          {frame.shape.toUpperCase()} · {frame.aSize}×{frame.bSize} mm · Ø {lens.diameter} mm · n = {lens.index.toFixed(2)}
        </text>
      </g>
      <g transform={`translate(${W - 16}, 14)`}>
        <text fill="#ffffff70" fontSize="9" letterSpacing="3" textAnchor="end">
          φ WORST = {data.worstMeridianAngle.toFixed(0)}°  ·  DEC {data.ocX.toFixed(1)}H / {data.ocY.toFixed(1)}V mm
        </text>
      </g>

      {/* ============================ FRONT VIEW ============================ */}
      <g transform={`translate(${W * 0.27}, ${H / 2 + 12})`}>
        <FrontView data={data} />
      </g>

      {/* ============================ READOUT =============================== */}
      <g transform={`translate(${W * 0.56}, 56)`}>
        <Readout data={data} lens={lens} result={result} />
      </g>

      {/* Footer scale legend */}
      <g transform={`translate(${W / 2 - 130}, ${H - 22})`}>
        <text x={0} y={-4} fill="#ffffff70" fontSize="9" letterSpacing="2">
          EDGE THICKNESS
        </text>
        <rect x={0} y={2} width={260} height={6} fill="url(#edge-grad)" rx={3} />
        <text x={0} y={20} fill="#5bd0a8" fontSize="9" fontFamily="JetBrains Mono, monospace">
          min  {data.minEdge.toFixed(2)} mm
        </text>
        <text x={130} y={20} fill="#ecc154" fontSize="9" textAnchor="middle" fontFamily="JetBrains Mono, monospace">
          avg  {data.avgEdge.toFixed(2)} mm
        </text>
        <text x={260} y={20} fill="#ef6a5a" fontSize="9" textAnchor="end" fontFamily="JetBrains Mono, monospace">
          max  {data.maxEdge.toFixed(2)} mm
        </text>
      </g>
    </svg>
  );
}

// =====================================================================
// FRONT VIEW
// =====================================================================

function FrontView({ data }: { data: ProfileData }) {
  const scale = data.scale;
  const barNormaliser = Math.max(0.5, data.maxEdge - data.minEdge);

  // Inward bar length in scene units. Bars longer where Et is larger.
  const MAX_BAR_LEN = 32;

  return (
    <g>
      {/* Background fill for the frame interior — faint engineering tint */}
      <path d={polygonPath(data.framePts, scale)} fill="rgba(207,226,255,0.04)" />

      {/* Inner engineering grid masked to the frame interior */}
      <clipPath id="frame-clip">
        <path d={polygonPath(data.framePts, scale)} />
      </clipPath>
      <rect
        x={data.bbox.minX * scale - 5}
        y={-data.bbox.maxY * scale - 5}
        width={(data.bbox.maxX - data.bbox.minX) * scale + 10}
        height={(data.bbox.maxY - data.bbox.minY) * scale + 10}
        fill="url(#grid)"
        clipPath="url(#frame-clip)"
      />

      {/* === Inward-pointing thickness bars ===
          Length and colour both encode edge thickness — exactly the
          kind of "spike plot" surfacing-lab software uses. */}
      {data.framePts.map((p, i) => {
        // Skip a couple of segments so bars don't merge into a wall.
        if (i % 2 !== 0) return null;
        const ang = Math.atan2(p.y, p.x);
        const norm = (p.edge - data.minEdge) / barNormaliser;
        const len = (0.25 + norm * 0.75) * MAX_BAR_LEN;
        const x1 = p.x * scale;
        const y1 = -p.y * scale;
        const x2 = (p.x - Math.cos(ang) * (len / scale)) * scale;
        const y2 = -(p.y - Math.sin(ang) * (len / scale)) * scale;
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={colourForThickness(p.edge, data.minEdge, data.maxEdge)}
            strokeWidth={1.2}
            strokeOpacity={0.65}
            strokeLinecap="round"
          />
        );
      })}

      {/* === Frame outline (coloured by local thickness) === */}
      {data.framePts.map((p, i) => {
        const next = data.framePts[(i + 1) % data.framePts.length];
        return (
          <line
            key={`p${i}`}
            x1={p.x * scale}
            y1={-p.y * scale}
            x2={next.x * scale}
            y2={-next.y * scale}
            stroke={colourForThickness(p.edge, data.minEdge, data.maxEdge)}
            strokeWidth={2.8}
            strokeLinecap="round"
          />
        );
      })}

      {/* Boxing-centre cross (geometric centre of the frame) */}
      <g stroke="rgba(255,255,255,0.28)" strokeWidth="0.8">
        <line x1={-5} y1={0} x2={5} y2={0} />
        <line x1={0} y1={-5} x2={0} y2={5} />
      </g>

      {/* Optical-centre cross — offset by decentration */}
      <g
        transform={`translate(${data.ocX * scale}, ${-data.ocY * scale})`}
        stroke="#ecc154"
        strokeWidth="1.2"
      >
        <circle r="3.5" fill="rgba(15,37,71,0.5)" />
        <line x1={-8} y1={0} x2={8} y2={0} />
        <line x1={0} y1={-8} x2={0} y2={8} />
      </g>

      {/* Decentration vector (dashed gold) */}
      {(Math.abs(data.ocX) > 0.3 || Math.abs(data.ocY) > 0.3) && (
        <line
          x1={0}
          y1={0}
          x2={data.ocX * scale}
          y2={-data.ocY * scale}
          stroke="#ecc154"
          strokeWidth="0.7"
          strokeDasharray="3 3"
          opacity="0.7"
        />
      )}

      {/* === 8 cardinal callouts === */}
      {data.cardinals.map((c) => (
        <CardinalCallout key={c.angleDeg} c={c} scale={scale} />
      ))}

      {/* Min/Max indicators */}
      <PerimDot point={data.minPoint} scale={scale} colour="#5bd0a8" label="min" />
      <PerimDot point={data.maxPoint} scale={scale} colour="#ef6a5a" label="max" />
    </g>
  );
}

function CardinalCallout({
  c,
  scale,
}: {
  c: CardinalSample;
  scale: number;
}) {
  const px = c.x * scale;
  const py = -c.y * scale;
  const ang = Math.atan2(c.y, c.x);
  const off = 24;
  const lx = px + Math.cos(ang) * off;
  const ly = py + -Math.sin(ang) * off;
  const anchor = lx > 4 ? 'start' : lx < -4 ? 'end' : 'middle';
  return (
    <g>
      <circle cx={px} cy={py} r="2.5" fill="#ffffff" stroke="#0a1a33" strokeWidth="0.8" />
      <line x1={px} y1={py} x2={lx} y2={ly} stroke="#ffffff60" strokeWidth="0.6" />
      <rect
        x={lx + (anchor === 'end' ? -42 : 0)}
        y={ly - 7}
        width="42"
        height="14"
        rx="2"
        fill="rgba(10,26,51,0.92)"
        stroke="rgba(236,193,84,0.5)"
        strokeWidth="0.6"
      />
      <text
        x={lx + (anchor === 'end' ? -3 : 3)}
        y={ly + 3}
        fontSize="9"
        fill="#ecc154"
        textAnchor={anchor === 'middle' ? 'middle' : anchor}
        fontFamily="JetBrains Mono, monospace"
      >
        {c.angleDeg}° {c.edge.toFixed(2)}
      </text>
    </g>
  );
}

function PerimDot({
  point,
  scale,
  colour,
  label,
}: {
  point: Sample;
  scale: number;
  colour: string;
  label: string;
}) {
  return (
    <g>
      <circle cx={point.x * scale} cy={-point.y * scale} r="4" fill={colour} opacity="0.9" />
      <circle
        cx={point.x * scale}
        cy={-point.y * scale}
        r="7"
        fill="none"
        stroke={colour}
        strokeOpacity="0.5"
        strokeWidth="1.2"
      />
      <text
        x={point.x * scale}
        y={-point.y * scale - 11}
        fontSize="7"
        fill={colour}
        textAnchor="middle"
        letterSpacing="1"
        fontFamily="Inter, sans-serif"
      >
        {label.toUpperCase()}
      </text>
    </g>
  );
}

// =====================================================================
// READOUT PANEL (right side)
// =====================================================================

function Readout({
  data,
  lens,
  result,
}: {
  data: ProfileData;
  lens: LensData;
  result: ThicknessResult;
}) {
  return (
    <g>
      {/* Cardinal readout — 2×3 grid of mm values */}
      <text x={0} y={0} fill="#ffffff70" fontSize="9" letterSpacing="3">
        EDGE THICKNESS PER DIRECTION
      </text>

      <CardinalCell x={0}   y={12} label="TEMP" angle="0°"   value={data.cardinalMap[0]} />
      <CardinalCell x={88}  y={12} label="SUP"  angle="90°"  value={data.cardinalMap[90]} />
      <CardinalCell x={176} y={12} label="NAS"  angle="180°" value={data.cardinalMap[180]} />
      <CardinalCell x={0}   y={56} label="INF"  angle="270°" value={data.cardinalMap[270]} />
      <CardinalCell x={88}  y={56} label="OBL+" angle="45°"  value={data.cardinalMap[45]} />
      <CardinalCell x={176} y={56} label="OBL−" angle="225°" value={data.cardinalMap[225]} />

      {/* Asymmetry analysis */}
      <text x={0} y={108} fill="#ffffff70" fontSize="9" letterSpacing="3">
        ASYMMETRY
      </text>
      <AsymRow
        x={0}
        y={120}
        label="ΔH  TEMP − NAS"
        value={data.deltaH}
        warnThreshold={1.5}
      />
      <AsymRow
        x={0}
        y={138}
        label="ΔV  SUP − INF"
        value={data.deltaV}
        warnThreshold={1.5}
      />

      {/* Worst-meridian section line + numerical Ct / Et */}
      <text x={0} y={172} fill="#ffffff70" fontSize="9" letterSpacing="3">
        WORST-MERIDIAN CROSS-SECTION
      </text>
      <g transform="translate(0, 184)">
        <CrossSection
          ct={result.finalCenterThickness}
          et={data.maxEdge}
          diameter={data.crossDiameter}
          isPlus={data.isPlus}
          R1={result.meridians[0].frontRadius}
          R2={data.worstBackRadius}
          frameType="full-rim"
        />
      </g>

      <g transform="translate(0, 268)">
        <text x={0} y={0} fill="#ffffff70" fontSize="9" letterSpacing="3">
          ENGINEERING
        </text>
        <Row label="Centre thickness" value={`${result.finalCenterThickness.toFixed(2)} mm`} color="#ecc154" />
        <Row label="Base curve" value={`${result.baseCurve.toFixed(2)} D`} y={12} />
        <Row label="Worst meridian" value={`${result.backCurve.toFixed(2)} D back`} y={24} />
      </g>
    </g>
  );
}

function CardinalCell({
  x,
  y,
  label,
  angle,
  value,
}: {
  x: number;
  y: number;
  label: string;
  angle: string;
  value: number | undefined;
}) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect width="80" height="38" rx="4" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)" />
      <text x={6} y={11} fill="#ffffff60" fontSize="8" letterSpacing="2">
        {label}
      </text>
      <text x={74} y={11} fill="#ffffff40" fontSize="7" textAnchor="end" letterSpacing="1">
        {angle}
      </text>
      <text
        x={40}
        y={29}
        fill="#ecc154"
        fontSize="14"
        fontFamily="JetBrains Mono, monospace"
        textAnchor="middle"
        fontWeight="600"
      >
        {value !== undefined ? value.toFixed(2) : '—'}
      </text>
    </g>
  );
}

function AsymRow({
  x,
  y,
  label,
  value,
  warnThreshold,
}: {
  x: number;
  y: number;
  label: string;
  value: number;
  warnThreshold: number;
}) {
  const col = Math.abs(value) > warnThreshold ? '#ef6a5a' : '#5bd0a8';
  const arrow = value > 0 ? '→' : value < 0 ? '←' : '·';
  return (
    <g transform={`translate(${x}, ${y})`}>
      <text x={0} y={0} fill="#ffffff80" fontSize="10" fontFamily="JetBrains Mono, monospace">
        {label}
      </text>
      <text
        x={256}
        y={0}
        fill={col}
        fontSize="11"
        fontFamily="JetBrains Mono, monospace"
        textAnchor="end"
        fontWeight="600"
      >
        {arrow} {Math.abs(value).toFixed(2)} mm
      </text>
    </g>
  );
}

function Row({
  label,
  value,
  y = 0,
  color = '#ffffffa0',
}: {
  label: string;
  value: string;
  y?: number;
  color?: string;
}) {
  return (
    <g transform={`translate(0, ${12 + y})`}>
      <text x={0} y={0} fill="#ffffff70" fontSize="10">
        {label}
      </text>
      <text x={256} y={0} fill={color} fontSize="11" fontFamily="JetBrains Mono, monospace" textAnchor="end">
        {value}
      </text>
    </g>
  );
}

// =====================================================================
// CROSS-SECTION (worst meridian, with bevel apex marker)
// =====================================================================

function CrossSection({
  ct,
  et,
  diameter,
  isPlus,
  R1,
  R2,
  frameType,
}: {
  ct: number;
  et: number;
  diameter: number;
  isPlus: boolean;
  R1: number;
  R2: number;
  frameType: 'full-rim' | 'rimless' | 'semi-rimless' | string;
}) {
  const W = 256;
  const H = 70;
  const semi = diameter / 2;
  const tMax = Math.max(ct, et, 4);
  const yScale = (H * 0.6) / tMax;
  const xScale = W / Math.max(diameter, 1);
  const cx = W / 2;

  // Build profile points using TRUE spherical sagittas — the same
  // math the engine uses to predict edge thickness. The thickness
  // at radius r:  t(r) = Ct + (s_back(r) − s_front(r)) for minus,
  //               t(r) = Ct − (s_front(r) − s_back(r)) for plus.
  // No parabolic shortcut.
  const sag = (R: number, r: number) =>
    R <= 0 || r <= 0 ? 0 : r >= R ? R : R - Math.sqrt(R * R - r * r);
  const N = 60;
  const front: [number, number][] = [];
  const back: [number, number][] = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const xMm = -semi + u * diameter;
    const r = Math.abs(xMm);
    const s1 = sag(R1, r);
    const s2 = sag(R2, r);
    const t = isPlus ? ct - (s1 - s2) : ct + (s2 - s1);
    const tSafe = Math.max(0.3, t);
    const px = cx + xMm * xScale;
    front.push([px, H / 2 - (tSafe / 2) * yScale]);
    back.push([px, H / 2 + (tSafe / 2) * yScale]);
  }
  const path =
    `M ${front[0][0]} ${front[0][1]} ` +
    front.map((p) => `L ${p[0]} ${p[1]}`).join(' ') +
    back
      .reverse()
      .map((p) => `L ${p[0]} ${p[1]}`)
      .join(' ') +
    ' Z';

  // Bevel marker — V-shape at the temporal edge (right side)
  const showBevel = frameType === 'full-rim';
  const bevelX = cx + semi * xScale;
  const bevelTopY = H / 2 - (et / 2) * yScale;
  const bevelBotY = H / 2 + (et / 2) * yScale;
  const bevelMidY = H / 2;

  return (
    <g>
      {/* Frame width box */}
      <rect x={0} y={0} width={W} height={H} fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.08)" rx={3} />

      {/* Optical axis */}
      <line x1={4} y1={H / 2} x2={W - 4} y2={H / 2} stroke="rgba(255,255,255,0.18)" strokeDasharray="3 3" />

      {/* Lens shape */}
      <path d={path} fill="rgba(207,226,255,0.18)" stroke="#ecc154" strokeWidth="1.1" />

      {/* Ct line */}
      <g stroke="#ecc154" strokeWidth="0.8">
        <line x1={cx} y1={H / 2 - (ct / 2) * yScale} x2={cx} y2={H / 2 + (ct / 2) * yScale} />
        <line x1={cx - 4} y1={H / 2 - (ct / 2) * yScale} x2={cx + 4} y2={H / 2 - (ct / 2) * yScale} />
        <line x1={cx - 4} y1={H / 2 + (ct / 2) * yScale} x2={cx + 4} y2={H / 2 + (ct / 2) * yScale} />
      </g>
      <text x={cx + 7} y={H / 2 + 3} fill="#ecc154" fontSize="9" fontFamily="JetBrains Mono, monospace">
        Ct {ct.toFixed(2)}
      </text>

      {/* Et line (right edge) */}
      <g stroke="#ef6a5a" strokeWidth="0.8">
        <line x1={bevelX - 4} y1={bevelTopY} x2={bevelX - 4} y2={bevelBotY} />
        <line x1={bevelX - 7} y1={bevelTopY} x2={bevelX - 1} y2={bevelTopY} />
        <line x1={bevelX - 7} y1={bevelBotY} x2={bevelX - 1} y2={bevelBotY} />
      </g>
      <text x={bevelX - 7} y={H / 2 + 3} fill="#ef6a5a" fontSize="9" fontFamily="JetBrains Mono, monospace" textAnchor="end">
        Et {et.toFixed(2)}
      </text>

      {/* Bevel apex marker (V at the centre of edge thickness) */}
      {showBevel && (
        <g>
          <polygon
            points={`${bevelX + 1},${bevelMidY - 2} ${bevelX + 6},${bevelMidY} ${bevelX + 1},${bevelMidY + 2}`}
            fill="#ecc154"
            opacity="0.85"
          />
          <text x={bevelX + 8} y={bevelMidY + 3} fill="#ecc154" fontSize="7" letterSpacing="1">
            BEVEL
          </text>
        </g>
      )}
    </g>
  );
}

// =====================================================================
// DATA PIPELINE
// =====================================================================

interface Sample {
  x: number;
  y: number;
  edge: number;
  angleDeg: number;
  radius: number;
}

interface CardinalSample extends Sample {
  /** Display label (TEMP / SUP / NAS / INF / OBL+ / OBL−). */
  label: string;
}

interface ProfileData {
  framePts: Sample[];
  cardinals: CardinalSample[];
  cardinalMap: Record<number, number>;
  minEdge: number;
  maxEdge: number;
  avgEdge: number;
  minPoint: Sample;
  maxPoint: Sample;
  ocX: number;
  ocY: number;
  bbox: { minX: number; maxX: number; minY: number; maxY: number };
  scale: number;
  isPlus: boolean;
  worstMeridianAngle: number;
  worstBackRadius: number;
  crossDiameter: number;
  deltaH: number; // temp - nasal
  deltaV: number; // sup - inf
}

function computeProfile(
  lens: LensData,
  frame: FrameData,
  result: ThicknessResult
): ProfileData {
  const F_se = lens.sphere + lens.cylinder / 2;
  const isPlus = F_se >= 0;
  const baseCurve = result.baseCurve;
  const etMin = result.ansi.ansiEdgeMin;
  const ct = result.finalCenterThickness;

  const dcH = result.blank.effectiveDecentrationH;
  const dcV = result.blank.effectiveDecentrationV;

  const cutter = makeShapeCutter(frame.shape, frame.aSize, frame.bSize);

  // Sample the perimeter at high resolution.
  const framePts: Sample[] = [];
  let sumEdge = 0;
  let minEdge = Infinity;
  let maxEdge = -Infinity;
  let minPoint: Sample | null = null;
  let maxPoint: Sample | null = null;
  let worstMeridianAngle = 0;
  let crossDiameter = 0;
  let worstBackRadius = 0;

  for (let i = 0; i < PERIM_SAMPLES; i++) {
    const theta = (i / PERIM_SAMPLES) * 2 * Math.PI;
    const r = perimeterRadius(cutter, theta);
    const xf = Math.cos(theta) * r;
    const yf = Math.sin(theta) * r;
    const edge = edgeAtFramePoint(xf, yf, dcH, dcV, lens, baseCurve, etMin, ct, isPlus);
    const sample: Sample = {
      x: xf,
      y: yf,
      edge,
      angleDeg: ((Math.atan2(yf - dcV, xf - dcH) * 180) / Math.PI + 360) % 360,
      radius: Math.hypot(xf - dcH, yf - dcV),
    };
    framePts.push(sample);
    sumEdge += edge;
    if (edge > maxEdge) {
      maxEdge = edge;
      maxPoint = sample;
      worstMeridianAngle = sample.angleDeg;
      crossDiameter = 2 * sample.radius;
      // Capture the back-surface radius at the worst meridian.
      const F = meridianPower(lens.sphere, lens.cylinder, lens.axis, sample.angleDeg);
      worstBackRadius = Math.abs(radiusFromPower(F - baseCurve, lens.index));
    }
    if (edge < minEdge) {
      minEdge = edge;
      minPoint = sample;
    }
  }

  // Eight cardinal callouts in the FRAME coordinate system (boxing).
  const cardinalAngles = [0, 45, 90, 135, 180, 225, 270, 315];
  const labelByAngle: Record<number, string> = {
    0: 'TEMP',
    45: 'OBL+',
    90: 'SUP',
    135: 'OBL+',
    180: 'NAS',
    225: 'OBL−',
    270: 'INF',
    315: 'OBL−',
  };
  // Adjust label for left eye if RIGHT_EYE_NASAL_DIR < 0
  if (RIGHT_EYE_NASAL_DIR < 0) {
    labelByAngle[0] = 'TEMP';
    labelByAngle[180] = 'NAS';
  }

  const cardinals: CardinalSample[] = [];
  const cardinalMap: Record<number, number> = {};
  for (const deg of cardinalAngles) {
    const theta = (deg * Math.PI) / 180;
    const r = perimeterRadius(cutter, theta);
    const xf = Math.cos(theta) * r;
    const yf = Math.sin(theta) * r;
    const edge = edgeAtFramePoint(xf, yf, dcH, dcV, lens, baseCurve, etMin, ct, isPlus);
    const angleFromOC =
      ((Math.atan2(yf - dcV, xf - dcH) * 180) / Math.PI + 360) % 360;
    cardinals.push({
      x: xf,
      y: yf,
      edge,
      angleDeg: deg,
      radius: Math.hypot(xf - dcH, yf - dcV),
      label: labelByAngle[deg],
    });
    cardinalMap[deg] = edge;
  }

  // Bounding box (mm) for scaling.
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of framePts) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const widthMm = maxX - minX;
  const heightMm = maxY - minY;
  // Scale chosen so the front view fits ~180 px wide / 150 px tall.
  const scale = Math.min(170 / Math.max(widthMm, 1), 150 / Math.max(heightMm, 1));

  return {
    framePts,
    cardinals,
    cardinalMap,
    minEdge,
    maxEdge,
    avgEdge: sumEdge / PERIM_SAMPLES,
    minPoint: minPoint ?? framePts[0],
    maxPoint: maxPoint ?? framePts[0],
    ocX: dcH,
    ocY: dcV,
    bbox: { minX, maxX, minY, maxY },
    scale,
    isPlus,
    worstMeridianAngle,
    worstBackRadius,
    crossDiameter,
    deltaH: (cardinalMap[0] ?? 0) - (cardinalMap[180] ?? 0),
    deltaV: (cardinalMap[90] ?? 0) - (cardinalMap[270] ?? 0),
  };
}

function edgeAtFramePoint(
  xf: number,
  yf: number,
  dcH: number,
  dcV: number,
  lens: LensData,
  baseCurve: number,
  etMin: number,
  ct: number,
  isPlus: boolean
): number {
  const xo = xf - dcH;
  const yo = yf - dcV;
  const rOC = Math.hypot(xo, yo);
  const angleFromOC = (Math.atan2(yo, xo) * 180) / Math.PI;
  const F = meridianPower(lens.sphere, lens.cylinder, lens.axis, angleFromOC);
  const F2 = F - baseCurve;
  const r1 = Math.abs(radiusFromPower(baseCurve, lens.index));
  const r2 = Math.abs(radiusFromPower(F2, lens.index));
  const s1 = sagitta(r1, rOC);
  const s2 = sagitta(r2, rOC);
  return isPlus ? Math.max(etMin, ct - (s1 - s2)) : Math.max(etMin, ct + (s2 - s1));
}

function perimeterRadius(
  cutter: (x: number, y: number) => boolean,
  theta: number
): number {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  let hi = 5;
  while (cutter(hi * c, hi * s) && hi < 200) hi *= 1.5;
  let lo = 0;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (cutter(mid * c, mid * s)) lo = mid;
    else hi = mid;
  }
  return lo;
}

// ---------- SVG helpers -----------------------------------------------

function polygonPath(pts: Sample[], scale: number) {
  if (pts.length === 0) return '';
  return (
    `M ${pts[0].x * scale} ${-pts[0].y * scale} ` +
    pts.map((p) => `L ${p.x * scale} ${-p.y * scale}`).join(' ') +
    ' Z'
  );
}

function colourForThickness(value: number, min: number, max: number): string {
  if (max <= min) return '#ecc154';
  const t = (value - min) / (max - min);
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
