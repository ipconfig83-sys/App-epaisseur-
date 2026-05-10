import { useMemo } from 'react';
import { MeshTransmissionMaterial } from '@react-three/drei';
import { buildLensGeometry, makeShapeCutter } from '@/three/lensGeometry';
import type { FrameData, LensData } from '@/types';

interface LensMeshProps {
  lens: LensData;
  frame: FrameData;
  cut: boolean;
  tint?: string;
  showWireframe?: boolean;
}

export default function LensMesh({
  lens,
  frame,
  cut,
  tint = '#cfe2ff',
  showWireframe = false,
}: LensMeshProps) {
  const geometry = useMemo(() => {
    const cutter = cut ? makeShapeCutter(frame.shape, frame.aSize, frame.bSize) : undefined;
    return buildLensGeometry(lens, { segments: 96, scale: 0.04, shapeCutter: cutter });
  }, [lens, frame, cut]);

  return (
    <group>
      <mesh geometry={geometry} castShadow receiveShadow>
        <MeshTransmissionMaterial
          transmission={1}
          roughness={0.02}
          thickness={1.6}
          ior={lens.index}
          chromaticAberration={0.02}
          anisotropicBlur={0.05}
          distortion={0.15}
          distortionScale={0.3}
          temporalDistortion={0}
          color={tint}
          attenuationColor={tint}
          attenuationDistance={2.5}
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
