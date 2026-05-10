import { useMemo } from 'react';
import * as THREE from 'three';
import { MeshTransmissionMaterial } from '@react-three/drei';
import { buildLensGeometry, makeShapeCutter } from '@/three/lensGeometry';
import type { CustomShape, FrameData, LensData } from '@/types';

interface LensMeshProps {
  lens: LensData;
  frame: FrameData;
  cut: boolean;
  tint?: string;
  showWireframe?: boolean;
  customShape?: CustomShape | null;
}

/**
 * Physically-plausible lens rendering using drei's
 * MeshTransmissionMaterial. The material captures a refraction render
 * target each frame, so for the lens to "look like glass" the scene
 * MUST contain visible content behind the lens. The Scene component
 * places a textured backdrop for this purpose.
 *
 * Key material parameters:
 *   • transmission = 1       fully transmissive (no opacity)
 *   • roughness ≈ 0.05       slight surface diffusion
 *   • ior        = lens.index real refractive index drives bending
 *   • attenuationDistance large → no body tint (clear glass)
 *   • chromaticAberration adds a subtle prism-like rainbow on edges
 *   • samples / resolution control refraction sharpness
 */
export default function LensMesh({
  lens,
  frame,
  cut,
  tint,
  showWireframe = false,
  customShape = null,
}: LensMeshProps) {
  const geometry = useMemo(() => {
    const cutter = cut
      ? makeShapeCutter(frame.shape, frame.aSize, frame.bSize, customShape)
      : undefined;
    return buildLensGeometry(lens, {
      segments: 128,
      rings: 56,
      scale: 0.04,
      shapeCutter: cutter,
    });
  }, [lens, frame, cut, customShape]);

  // A very subtle attenuation colour preserves the impression of glass
  // without making the lens look tinted. The compare lens can pass a
  // gentle warm tint via the `tint` prop.
  const attenuationColor = tint ?? '#eaf3ff';
  const baseColor = tint ?? '#ffffff';

  return (
    <group>
      <mesh geometry={geometry} castShadow receiveShadow>
        <MeshTransmissionMaterial
          samples={6}
          resolution={1024}
          transmission={1}
          roughness={0.04}
          thickness={1.2}
          ior={lens.index}
          chromaticAberration={0.05}
          anisotropicBlur={0}
          distortion={0.05}
          distortionScale={0.2}
          temporalDistortion={0}
          color={baseColor}
          attenuationColor={attenuationColor}
          attenuationDistance={30}
          clearcoat={1}
          clearcoatRoughness={0.04}
          backside
          backsideThickness={0.3}
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
