import { useMemo } from 'react';
import * as THREE from 'three';

/**
 * Optical-bench backdrop placed behind the lens.
 *
 * The MeshTransmissionMaterial samples whatever is behind the lens to
 * compute refraction, so the backdrop has to contain readable content
 * for the refraction effect to be perceptible. We use a calm,
 * laboratory-grade target reticle: a calibration grid in mm with two
 * cross-hairs, a discrete brand-mark, and nothing else. No eye chart,
 * no marketing text — the goal is for the rendered lens to read as a
 * real piece of measurement equipment, not a CGI demo.
 */
export default function Backdrop() {
  const texture = useMemo(() => makeBenchTexture(), []);
  return (
    <mesh position={[0, 0, -2.6]} rotation={[0, 0, 0]}>
      <planeGeometry args={[8, 5]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

function makeBenchTexture(): THREE.Texture {
  if (typeof document === 'undefined') {
    return new THREE.Texture();
  }
  const w = 1024;
  const h = 640;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // Lab paper background — slightly bluish white
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#e8eef5');
  grad.addColorStop(1, '#c9d4e0');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // 1 mm calibration grid (light)
  const pxPerMm = w / 200; // 200 mm wide bench
  ctx.strokeStyle = 'rgba(35, 80, 130, 0.10)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= w; x += pxPerMm) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y += pxPerMm) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  // 10 mm calibration grid (stronger)
  ctx.strokeStyle = 'rgba(35, 80, 130, 0.28)';
  ctx.lineWidth = 1.4;
  for (let x = 0; x <= w; x += pxPerMm * 10) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y += pxPerMm * 10) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Central reticle
  ctx.strokeStyle = 'rgba(15, 37, 71, 0.55)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, h / 2);
  ctx.lineTo(w, h / 2);
  ctx.moveTo(w / 2, 0);
  ctx.lineTo(w / 2, h);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(w / 2, h / 2, 100, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, 50, 0, Math.PI * 2);
  ctx.stroke();

  // Tick labels every 10 mm along the central axes
  ctx.fillStyle = 'rgba(15, 37, 71, 0.55)';
  ctx.font = '600 11px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  for (let mm = -90; mm <= 90; mm += 10) {
    if (mm === 0) continue;
    const x = w / 2 + mm * pxPerMm;
    ctx.fillText(`${mm}`, x, h / 2 + 14);
  }

  // Discrete branding bottom-right
  ctx.fillStyle = 'rgba(15, 37, 71, 0.45)';
  ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('PRESBYTA  ·  Optical bench reticle', w - 18, h - 14);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}
