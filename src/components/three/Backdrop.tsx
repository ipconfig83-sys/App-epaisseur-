import { useMemo } from 'react';
import * as THREE from 'three';

/**
 * Procedural "eye chart" backdrop displayed behind the lens so the
 * MeshTransmissionMaterial has something interesting to refract.
 *
 * The texture is generated on a 2D canvas at module load and reused —
 * no external asset, no network fetch. Pattern:
 *   • Soft radial blue gradient (PRESBYTA brand).
 *   • Concentric grid lines (caliper feel).
 *   • Three rows of Snellen-style letters and the PRESBYTA wordmark.
 */
export default function Backdrop() {
  const texture = useMemo(() => makeBackdropTexture(), []);
  return (
    <mesh position={[0, 0, -3]} rotation={[0, 0, 0]}>
      <planeGeometry args={[10, 6.5]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

function makeBackdropTexture(): THREE.Texture {
  if (typeof document === 'undefined') {
    return new THREE.Texture();
  }
  const w = 1024;
  const h = 640;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // Radial gradient background
  const grad = ctx.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, w * 0.75);
  grad.addColorStop(0, '#163461');
  grad.addColorStop(0.6, '#0a1a33');
  grad.addColorStop(1, '#050d1d');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Caliper grid
  ctx.strokeStyle = 'rgba(236, 193, 84, 0.12)';
  ctx.lineWidth = 1;
  const step = 40;
  for (let x = 0; x <= w; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Central axis cross
  ctx.strokeStyle = 'rgba(236, 193, 84, 0.45)';
  ctx.lineWidth = 1.2;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(0, h / 2);
  ctx.lineTo(w, h / 2);
  ctx.moveTo(w / 2, 0);
  ctx.lineTo(w / 2, h);
  ctx.stroke();
  ctx.setLineDash([]);

  // Snellen-style chart rows
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const rows: { letters: string; size: number; y: number }[] = [
    { letters: 'E', size: 180, y: 0.22 },
    { letters: 'F P', size: 120, y: 0.40 },
    { letters: 'T O Z', size: 84, y: 0.55 },
    { letters: 'L P E D', size: 56, y: 0.68 },
    { letters: 'P E C F D', size: 40, y: 0.78 },
  ];
  for (const r of rows) {
    ctx.font = `700 ${r.size}px "JetBrains Mono", "Inter", monospace`;
    ctx.fillText(r.letters, w / 2, h * r.y);
  }

  // PRESBYTA wordmark
  ctx.fillStyle = 'rgba(236, 193, 84, 0.85)';
  ctx.font = '700 26px "Plus Jakarta Sans", "Inter", sans-serif';
  ctx.letterSpacing = '12px';
  ctx.fillText('P R E S B Y T A', w / 2, h * 0.93);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.font = '500 12px Inter, sans-serif';
  ctx.fillText('OPHTHALMIC  LENSES  ·  A  LUNETTE  15  MINUTES  BRAND', w / 2, h * 0.97);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}
