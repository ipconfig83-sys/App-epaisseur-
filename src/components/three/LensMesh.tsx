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
 * Physically restrained ophthalmic-lens rendering.
 *
 * Earlier passes used dispersion + iridescence + clearcoat at levels
 * that read as "cinematic" rather than "real lens". This pass dials
 * everything back to what a real CR-39 / 1.6 / 1.67 lens actually
 * looks like under bench lighting:
 *
 *   BODY  Almost invisible. opacity ≈ 0.16, transmission ≈ 0.75 with
 *         a very short thickness — refraction is present but subtle
 *         (real ophthalmic lenses do not strongly warp the world
 *         behind them at typical viewing distance). No dispersion,
 *         only the faintest hint of AR iridescence.
 *
 *   EDGE  The dominant visible feature, exactly as in the reference
 *         photos — a brighter, more reflective polished band with a
 *         slightly stronger AR sheen.
 *
 * No HDR environment map, no clearcoat lacquer, no chromatic
 * aberration — those were the source of the "polished glass sphere"
 * appearance.
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

  // Very faint per-substrate tint (CR-39 hint of green, 1.67/1.74
  // hint of warm). Most users will not perceive it.
  const baseColor = tint ?? TINT_BY_INDEX[lens.index] ?? '#fcfeff';

  // Physical thickness in scene units (mm × scale).
  const physThickness = Math.max(0.15, result.finalCenterThickness * 0.04);

  // Iridescence tuned by index — high-index lenses ship with thicker
  // AR coatings → richer but still subtle shimmer.
  const iridStrength = lens.index >= 1.67 ? 0.12 : 0.06;
  const iridThickness: [number, number] =
    lens.index >= 1.67 ? [250, 420] : [120, 280];

  return (
    <group>
      {/* ---- BODY ---- nearly invisible ophthalmic substrate ---- */}
      <mesh geometry={body}>
        <meshPhysicalMaterial
          color="#ffffff"
          transparent
          opacity={0.16}
          metalness={0}
          roughness={0.05}
          // Mild transmission for partial refraction — not enough to
          // visibly warp the background like the previous render did.
          transmission={0.75}
          thickness={physThickness * 0.6}
          ior={lens.index}
          attenuationColor={baseColor}
          attenuationDistance={250}
          envMapIntensity={0}
          reflectivity={0.35}
          // Almost no surface lacquer — real lenses don't read as
          // "double-coated".
          clearcoat={0.08}
          clearcoatRoughness={0.12}
          iridescence={iridStrength}
          iridescenceIOR={1.3}
          iridescenceThicknessRange={iridThickness}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* ---- EDGE ---- polished AR-coated rim ---- */}
      <mesh geometry={edge}>
        <meshPhysicalMaterial
          color="#ffffff"
          transparent
          opacity={0.65}
          metalness={0}
          roughness={0.08}
          transmission={0.25}
          thickness={0.3}
          ior={lens.index}
          attenuationColor="#f7faff"
          attenuationDistance={18}
          envMapIntensity={0}
          reflectivity={0.55}
          clearcoat={0.35}
          clearcoatRoughness={0.08}
          iridescence={iridStrength * 2.5}
          iridescenceIOR={1.32}
          iridescenceThicknessRange={[iridThickness[0] + 60, iridThickness[1] + 200]}
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
