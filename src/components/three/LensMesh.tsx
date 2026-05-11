import { useMemo } from 'react';
import * as THREE from 'three';
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
 * Ophthalmic-lens rendering calibrated against real laboratory photos.
 *
 * The mesh is split into two pieces — the curved BODY (front + back
 * surfaces) and the polished EDGE band — each shaded with its own
 * MeshPhysicalMaterial:
 *
 *   BODY  near-invisible substrate: transmission ≈ 0.97,
 *         attenuation_distance ≈ 180 mm, mild iridescence for AR
 *         coating shimmer, dispersion driven by the real Abbe number.
 *
 *   EDGE  bright polished resin rim: medium reflectivity, low
 *         transmission, stronger iridescence, mild clearcoat. The
 *         rim is the dominant visual feature of a real edged lens,
 *         exactly as in the reference photographs.
 *
 * No environment map and no HDR reflections — the goal is "real lens
 * photographed on a lab bench" not "polished glass sphere".
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

  // Dispersion scales inversely with Abbe number. CR-39 (V=58)
  // shows almost no rainbow; 1.74 (V=33) shows a visible fringe.
  const abbe = ABBE_BY_INDEX[lens.index] ?? 40;
  const dispersion = Math.min(0.6, Math.max(0.05, 8 / abbe));

  const baseColor = tint ?? TINT_BY_INDEX[lens.index] ?? '#fbfdff';

  // AR-coating thickness range — high-index substrates typically
  // ship with thicker stack coatings, producing a richer shimmer.
  const iridThickness: [number, number] =
    lens.index >= 1.67 ? [280, 580] : [180, 380];

  // Physical thickness in scene units (mm × scale).
  const physThickness = Math.max(0.25, result.finalCenterThickness * 0.04);

  return (
    <group>
      {/* ---- BODY ---- transparent ophthalmic substrate. */}
      <mesh geometry={body}>
        <meshPhysicalMaterial
          color="#ffffff"
          metalness={0}
          roughness={0.06}
          transmission={0.97}
          thickness={physThickness}
          ior={lens.index}
          attenuationColor={baseColor}
          attenuationDistance={180}
          envMapIntensity={0}
          reflectivity={0.05}
          clearcoat={0.22}
          clearcoatRoughness={0.10}
          iridescence={0.4}
          iridescenceIOR={1.3}
          iridescenceThicknessRange={iridThickness}
          dispersion={dispersion}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* ---- EDGE ---- polished AR-coated rim. */}
      <mesh geometry={edge}>
        <meshPhysicalMaterial
          color="#ffffff"
          metalness={0}
          roughness={0.10}
          // Edge is more reflective and less transmissive than body —
          // this is what produces the bright luminous rim signature.
          transmission={0.35}
          thickness={0.6}
          ior={lens.index}
          attenuationColor="#f7faff"
          attenuationDistance={15}
          envMapIntensity={0}
          reflectivity={0.32}
          clearcoat={0.7}
          clearcoatRoughness={0.06}
          iridescence={0.55}
          iridescenceIOR={1.32}
          iridescenceThicknessRange={[320, 680]}
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
