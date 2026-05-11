import { useMemo } from 'react';
import * as THREE from 'three';

/**
 * Bench surface backdrop placed behind the lens.
 *
 * Everything decorative has been removed — no reticle, no grid, no
 * Snellen letters, no brand panel. The lens is the focus of the
 * scene and any "engineering target" content behind it created the
 * fake-photoreal look the user flagged.
 *
 * What remains is a soft, slightly bluish-grey bench surface with a
 * gentle radial darkening at the corners — enough to make the lens
 * stand out without imposing any pattern of its own.
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

  // Plain neutral bench surface.
  const base = ctx.createLinearGradient(0, 0, 0, h);
  base.addColorStop(0, '#eaedf2');
  base.addColorStop(1, '#d6dae1');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);

  // Very gentle vignette to keep the lens in focus.
  const vignette = ctx.createRadialGradient(w / 2, h / 2, w * 0.25, w / 2, h / 2, w * 0.65);
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.15)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  // A single discreet brand mark — small, low-contrast, off-corner.
  ctx.fillStyle = 'rgba(60, 80, 110, 0.18)';
  ctx.font = '500 9px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('PRESBYTA', w - 14, h - 12);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}
