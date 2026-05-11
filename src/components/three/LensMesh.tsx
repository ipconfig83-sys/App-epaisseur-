import { useMemo } from 'react';
import * as THREE from 'three';
import { MeshTransmissionMaterial } from '@react-three/drei';
import { buildLensGeometry, makeShapeCutter } from '@/three/lensGeometry';
import { ABBE_BY_INDEX, TINT_BY_INDEX } from '@/engine/materials';
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
 * Renders a single ophthalmic lens with parameters tuned to match the
 * appearance of a real surfaced resin lens photographed on a lab
 * bench — NOT a polished glass sphere.
 *
 * Decisions:
 *   • No HDR environment map. We were inheriting harsh specular
 *     reflections from drei's <Environment>, which made the lens
 *     read as a black mirror. The scene now uses hemisphere +
 *     diffuse directional only, so the lens picks up soft, even
 *     light just like a real photo would.
 *   • Roughness raised to 0.18 — resin is not optical-grade glass;
 *     a tiny amount of microsurface roughness kills the mirror sheen.
 *   • Clearcoat removed. Modern AR coatings are nearly invisible in
 *     photos; clearcoat={1} produced an artificial second highlight.
 *   • Background of MeshTransmissionMaterial forced to a bright lab
 *     paper colour. Without this the transmission shader samples the
 *     scene's dark corners, which is what made the lens look dark.
 *   • Body-tint kept very faint so CR-39 stays nearly clear and only
 *     1.67 / 1.74 carry a perceptible warm cast — matching reality.
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
  const geometry = useMemo(() => {
    const cutter = cut
      ? makeShapeCutter(frame.shape, frame.aSize, frame.bSize, customShape)
      : undefined;
    return buildLensGeometry(lens, result, {
      segments: 144,
      rings: 64,
      scale: 0.04,
      shapeCutter: cutter,
      frameType: frame.type,
    });
  }, [lens, frame, result, cut, customShape]);

  // Abbe-driven chromatic dispersion (lower V → wider fringe).
  // Calibrated low so CR-39 (V=58) is invisible and 1.74 lenses
  // show only the faintest hint of colour at the edge.
  const abbe = ABBE_BY_INDEX[lens.index] ?? 40;
  const chromaticAberration = Math.min(0.025, Math.max(0.003, 0.6 / abbe));

  // Substrate tint — kept very, very subtle.
  const baseColor = tint ?? TINT_BY_INDEX[lens.index] ?? '#fbfdff';

  // Forced light "lab paper" background for the refraction shader.
  // This is what makes the lens read as a transparent resin lens
  // illuminated by overhead bench lighting, instead of a dark mirror.
  const bgTexture = useMemo(() => {
    const tex = new THREE.Color('#eaf0f7');
    return tex;
  }, []);

  return (
    <group>
      <mesh geometry={geometry}>
        <MeshTransmissionMaterial
          samples={6}
          resolution={768}
          transmission={1}
          // Slight surface roughness — kills the mirror-glass sheen.
          roughness={0.18}
          // Real lens centre thickness, scaled to scene units. Drives
          // how much light bends as it passes through the resin.
          thickness={Math.max(0.25, result.finalCenterThickness * 0.04)}
          ior={lens.index}
          chromaticAberration={chromaticAberration}
          anisotropicBlur={0}
          // Almost no distortion — ophthalmic resin lenses are well
          // surfaced and do not warp the world behind them visibly.
          distortion={0.005}
          distortionScale={0.1}
          temporalDistortion={0}
          color="#ffffff"
          attenuationColor={baseColor}
          attenuationDistance={80}
          // Render against bright lab paper instead of the scene's
          // env capture. This is the single biggest fix for the
          // "dark mirror" look.
          background={bgTexture as unknown as THREE.Texture}
          // No clearcoat — a real ophthalmic lens does not show a
          // second specular highlight on top of the substrate.
          clearcoat={0}
          clearcoatRoughness={0}
          backside
          backsideThickness={Math.max(0.1, result.finalCenterThickness * 0.02)}
          side={THREE.DoubleSide}
        />
      </mesh>

      {showWireframe && (
        <mesh geometry={geometry}>
          <meshBasicMaterial color="#ecc154" wireframe transparent opacity={0.18} />
        </mesh>
      )}
    </group>
  );
}
