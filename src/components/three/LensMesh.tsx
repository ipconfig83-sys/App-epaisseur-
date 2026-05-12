import { useMemo } from 'react';
import * as THREE from 'three';
import { buildLensGeometry, makeShapeCutter } from '@/three/lensGeometry';
import { TINT_BY_INDEX } from '@/engine/materials';
import type { CustomShape, FrameData, LensData, ThicknessResult } from '@/types';

interface LensMeshProps {
  lens: LensData;
  frame: FrameData;
  result: ThicknessResult;
  cut: boolean;
  tint?: string;
  showWireframe?: boolean;
  customShape?: CustomShape | null;
}

/**
 * Restrained ophthalmic-lens rendering for laboratory credibility.
 *
 * Body
 *   • Almost invisible: opacity 0.12, transmission 0.7 with shallow
 *     thickness. No iridescence, no clearcoat, no dispersion. Surface
 *     carries a faint procedural polish-mark texture so it does not
 *     read as mathematically perfect.
 *
 * Edge
 *   • The visible polished perimeter. Brighter, more reflective,
 *     keeps a discreet AR-coating hint (iridescence 0.18) — that is
 *     where the real polished-edge sheen lives in lab photos.
 *
 * No environment map anywhere, ever — HDR reflections were the
 * source of every "CGI lens" reading.
 */
export default function LensMesh({
  lens,
  frame,
  result,
  cut,
  tint,
  showWireframe = false,
  customShape = null,
}: LensMeshProps) {
  const { body, edge } = useMemo(() => {
    const cutter = cut
      ? makeShapeCutter(frame.shape, frame.aSize, frame.bSize, customShape)
      : undefined;
    return buildLensGeometry(lens, result, {
      segments: 160,
      rings: 64,
      scale: 0.04,
      shapeCutter: cutter,
      frameType: frame.type,
    });
  }, [lens, frame, result, cut, customShape]);

  // Procedural surface micro-roughness — kills the "perfectly clean
  // 3D primitive" appearance by giving the polished resin a tiny
  // amount of believable surface variation (think faint polish
  // marks visible at grazing angles in real bench photographs).
  const roughnessMap = useMemo(() => makePolishNoise(), []);

  const baseColor = tint ?? TINT_BY_INDEX[lens.index] ?? '#fcfeff';
  const physThickness = Math.max(0.15, result.finalCenterThickness * 0.04);

  return (
    <group>
      {/* ---- BODY ---- nearly invisible substrate ---- */}
      <mesh geometry={body} castShadow>
        <meshPhysicalMaterial
          color="#ffffff"
          transparent
          opacity={0.12}
          metalness={0}
          // Slightly higher base roughness (0.08) plus the noise map
          // produces the "real polished resin, not optical glass"
          // appearance. Surfaces are smooth but not optically flat.
          roughness={0.08}
          roughnessMap={roughnessMap}
          transmission={0.7}
          thickness={physThickness * 0.5}
          ior={lens.index}
          attenuationColor={baseColor}
          attenuationDistance={250}
          envMapIntensity={0}
          reflectivity={0.32}
          // No clearcoat — the previous secondary lacquer highlight
          // was a primary cause of the cinematic glass look.
          clearcoat={0}
          // No iridescence on the body. Real lens bodies show no
          // visible AR shimmer face-on; only the rim does.
          iridescence={0}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* ---- EDGE ---- polished AR-coated rim ---- */}
      <mesh geometry={edge} castShadow>
        <meshPhysicalMaterial
          color="#ffffff"
          transparent
          opacity={0.7}
          metalness={0}
          roughness={0.1}
          roughnessMap={roughnessMap}
          transmission={0.18}
          thickness={0.25}
          ior={lens.index}
          attenuationColor="#f7faff"
          attenuationDistance={15}
          envMapIntensity={0}
          reflectivity={0.55}
          // Very mild clearcoat on the edge band only — captures the
          // polished resin sheen seen on the bright rim in real photos.
          clearcoat={0.3}
          clearcoatRoughness={0.08}
          // AR-coating shimmer concentrated on the polished perimeter
          // (which is where it's actually visible in lab photographs).
          iridescence={lens.index >= 1.67 ? 0.22 : 0.14}
          iridescenceIOR={1.32}
          iridescenceThicknessRange={[280, 540]}
          side={THREE.DoubleSide}
        />
      </mesh>

      {showWireframe && (
        <>
          <mesh geometry={body}>
            <meshBasicMaterial color="#ecc154" wireframe transparent opacity={0.18} />
          </mesh>
          <mesh geometry={edge}>
            <meshBasicMaterial color="#ecc154" wireframe transparent opacity={0.18} />
          </mesh>
        </>
      )}
    </group>
  );
}

// =====================================================================
// Procedural polish-mark roughness texture
// =====================================================================
// Generates a 256×256 greyscale noise pattern with subtle low-
// frequency variation. Loaded as `roughnessMap` it perturbs the
// material's microfacet roughness, producing the faint streaks and
// uneven sheen visible on real polished resin surfaces.
function makePolishNoise(): THREE.DataTexture {
  const size = 256;
  const data = new Uint8Array(size * size * 4);
  // Combine a couple of octaves of value noise so the pattern is
  // organic, not pixel-grain.
  const seedA = new Float32Array(64 * 64);
  const seedB = new Float32Array(16 * 16);
  for (let i = 0; i < seedA.length; i++) seedA[i] = Math.random();
  for (let i = 0; i < seedB.length; i++) seedB[i] = Math.random();

  const sample = (seed: Float32Array, w: number, x: number, y: number) => {
    const xf = (x * w) % w;
    const yf = (y * w) % w;
    const x0 = Math.floor(xf);
    const y0 = Math.floor(yf);
    const x1 = (x0 + 1) % w;
    const y1 = (y0 + 1) % w;
    const fx = xf - x0;
    const fy = yf - y0;
    const a = seed[y0 * w + x0];
    const b = seed[y0 * w + x1];
    const c = seed[y1 * w + x0];
    const d = seed[y1 * w + x1];
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const noise = 0.7 * sample(seedA, 64, u, v) + 0.3 * sample(seedB, 16, u, v);
      // Compress the noise into a small range centred on neutral
      // roughness — we want SUBTLE variation, not blotchy texture.
      const r = 110 + noise * 30;
      const idx = (y * size + x) * 4;
      data[idx] = r;
      data[idx + 1] = r;
      data[idx + 2] = r;
      data[idx + 3] = 255;
    }
  }

  const tex = new THREE.DataTexture(data, size, size);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  tex.needsUpdate = true;
  return tex;
}
