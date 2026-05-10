import { useMemo } from 'react';
import type { FrameData, LensData, ThicknessResult } from '@/types';

/**
 * 2D side-profile schematic of the lens.
 * Renders the cross-section using actual centre/edge thicknesses
 * to give technicians a clean diagram complementing the 3D view.
 */
export default function ProfileView({
  lens,
  frame,
  result,
}: {
  lens: LensData;
  frame: FrameData;
  result: ThicknessResult;
}) {
  const data = useMemo(() => {
    const W = 540;
    const H = 220;
    const padX = 32;
    const padY = 30;
    const widthPx = W - padX * 2;
    const heightPx = H - padY * 2;

    const semi = lens.diameter / 2;
    const isPlus = lens.sphere + lens.cylinder / 2 >= 0;

    const tCenter = result.finalCenterThickness;
    const tEdge = result.finalEdgeThickness;
    const tMax = Math.max(tCenter, tEdge, 4);
    const yScale = (heightPx * 0.7) / tMax;
    const xScale = widthPx / lens.diameter;

    const points = 100;
    const front: [number, number][] = [];
    const back: [number, number][] = [];

    for (let i = 0; i <= points; i++) {
      const xMm = -semi + (i / points) * lens.diameter;
      const r = Math.abs(xMm);
      const ratio = r / semi;
      // Quadratic interpolation gives a more lens-like curve
      const k = ratio * ratio;
      const t = isPlus
        ? tCenter - (tCenter - tEdge) * k
        : tCenter + (tEdge - tCenter) * k;

      const cx = padX + (xMm + semi) * xScale;
      const yFront = padY + heightPx / 2 - (t / 2) * yScale;
      const yBack = padY + heightPx / 2 + (t / 2) * yScale;
      front.push([cx, yFront]);
      back.push([cx, yBack]);
    }

    const path =
      `M ${front[0][0]} ${front[0][1]} ` +
      front.map((p) => `L ${p[0]} ${p[1]}`).join(' ') +
      back
        .reverse()
        .map((p) => `L ${p[0]} ${p[1]}`)
        .join(' ') +
      ' Z';

    const frameSemi = frame.ed / 2;
    const frameLeftX = padX + (-frameSemi + semi) * xScale;
    const frameRightX = padX + (frameSemi + semi) * xScale;

    const centerX = padX + semi * xScale;
    const centerY1 = padY + heightPx / 2 - (tCenter / 2) * yScale;
    const centerY2 = padY + heightPx / 2 + (tCenter / 2) * yScale;

    const edgeX = padX + (lens.diameter - 4) * xScale;
    const edgeY1 = padY + heightPx / 2 - (tEdge / 2) * yScale;
    const edgeY2 = padY + heightPx / 2 + (tEdge / 2) * yScale;

    return {
      W, H, path,
      frameLeftX, frameRightX,
      centerX, centerY1, centerY2,
      edgeX, edgeY1, edgeY2,
      tCenter, tEdge,
      midY: padY + heightPx / 2,
    };
  }, [lens, frame, result]);

  return (
    <svg viewBox={`0 0 ${data.W} ${data.H}`} className="w-full h-full">
      <defs>
        <linearGradient id="lens-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(207,226,255,0.55)" />
          <stop offset="100%" stopColor="rgba(79,127,187,0.35)" />
        </linearGradient>
        <linearGradient id="grid-fade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(255,255,255,0)" />
          <stop offset="50%" stopColor="rgba(255,255,255,0.10)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>

      <line x1={20} y1={data.midY} x2={data.W - 20} y2={data.midY} stroke="url(#grid-fade)" strokeDasharray="4 6" />

      <path d={data.path} fill="url(#lens-fill)" stroke="#ecc154" strokeWidth="1.2" />

      <g stroke="#ecc154" strokeOpacity="0.5" strokeWidth="1" strokeDasharray="3 4">
        <line x1={data.frameLeftX} y1={20} x2={data.frameLeftX} y2={data.H - 20} />
        <line x1={data.frameRightX} y1={20} x2={data.frameRightX} y2={data.H - 20} />
      </g>

      {/* Centre dimension */}
      <g stroke="#ecc154" strokeWidth="1" fill="none">
        <line x1={data.centerX} y1={data.centerY1} x2={data.centerX} y2={data.centerY2} />
        <line x1={data.centerX - 6} y1={data.centerY1} x2={data.centerX + 6} y2={data.centerY1} />
        <line x1={data.centerX - 6} y1={data.centerY2} x2={data.centerX + 6} y2={data.centerY2} />
      </g>
      <text x={data.centerX + 10} y={data.midY + 4} fill="#ecc154" fontSize="11" fontFamily="JetBrains Mono, monospace">
        Ct = {data.tCenter.toFixed(2)} mm
      </text>

      {/* Edge dimension */}
      <g stroke="#ecc154" strokeWidth="1" fill="none">
        <line x1={data.edgeX} y1={data.edgeY1} x2={data.edgeX} y2={data.edgeY2} />
        <line x1={data.edgeX - 6} y1={data.edgeY1} x2={data.edgeX + 6} y2={data.edgeY1} />
        <line x1={data.edgeX - 6} y1={data.edgeY2} x2={data.edgeX + 6} y2={data.edgeY2} />
      </g>
      <text x={data.edgeX - 12} y={data.midY + 4} fill="#ecc154" fontSize="11" textAnchor="end" fontFamily="JetBrains Mono, monospace">
        Et = {data.tEdge.toFixed(2)} mm
      </text>

      <text x={data.frameLeftX} y={18} fill="#ecc154" fontSize="9" textAnchor="middle" fontFamily="Inter, sans-serif" letterSpacing="2">
        FRAME EDGE
      </text>
      <text x={data.frameRightX} y={18} fill="#ecc154" fontSize="9" textAnchor="middle" letterSpacing="2">
        FRAME EDGE
      </text>

      <text x={data.W / 2} y={data.H - 8} fill="#ffffff60" fontSize="9" textAnchor="middle" letterSpacing="3">
        OPTICAL AXIS  ·  Ø {lens.diameter} mm  ·  n = {lens.index.toFixed(2)}
      </text>
    </svg>
  );
}
