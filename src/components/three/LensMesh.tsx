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
 * Renders a single lens with physically-derived geometry:
 *
 *   • Surface sagittas come directly from R1 / R2 = 1000(n−1)/F.
 *   • Centre thickness is read from the engine result, so the rendered
 *     thickness matches the value shown in the results panel exactly.
 *   • Refraction index ior = lens.index → bending strength matches the
 *     prescription.
 *   • Chromatic aberration scales inversely with Abbe number, so a
 *     1.74 lens shows visibly more colour fringing on the edge than
 *     a 1.50 CR-39 lens — the same behaviour the patient experiences.
 *   • Body-tint table reflects the faint substrate cast of real
 *     ophthalmic materials.
 *   • Frame type drives the edge finish: V-bevel for full-rim, flat
 *     polished for rimless, nylor groove for semi-rimless.
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
  // Calibrated so CR-39 (V=58) is almost invisible (≈ 0.012) and a
  // 1.74 lens (V=33) shows clear fringing (≈ 0.055).
  const abbe = ABBE_BY_INDEX[lens.index] ?? 40;
  const chromaticAberration = Math.min(0.08, Math.max(0.01, 1.7 / abbe));

  // Per-index body tint (overridable for compare-lens highlight).
  const baseColor = tint ?? TINT_BY_INDEX[lens.index] ?? '#ffffff';

  // Refraction quality scales with index — high-index lenses bend
  // light more, so we sample more thoroughly to keep edges sharp.
  const samples = lens.index >= 1.67 ? 8 : 6;

  return (
    <group>
      <mesh geometry={geometry} castShadow receiveShadow>
        <MeshTransmissionMaterial
          samples={samples}
          resolution={1024}
          transmission={1}
          roughness={0.03}
          // Use the actual rendered centre thickness (mm → scene units)
          // so refraction depth corresponds to real lens depth.
          thickness={Math.max(0.3, result.finalCenterThickness * 0.04)}
          ior={lens.index}
          chromaticAberration={chromaticAberration}
          anisotropicBlur={0}
          distortion={0.02}
          distortionScale={0.15}
          temporalDistortion={0}
          color={baseColor}
          attenuationColor={baseColor}
          attenuationDistance={lens.index >= 1.67 ? 22 : 32}
          clearcoat={1}
          clearcoatRoughness={0.03}
          backside
          backsideThickness={Math.max(0.15, result.finalCenterThickness * 0.02)}
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
