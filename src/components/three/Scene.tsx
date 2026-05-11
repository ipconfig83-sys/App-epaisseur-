import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Suspense, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, RotateCw, ZoomIn, ZoomOut, Layers } from 'lucide-react';
import LensMesh from './LensMesh';
import Backdrop from './Backdrop';
import type { CustomShape, FrameData, LensData, ThicknessResult } from '@/types';

interface SceneProps {
  lens: LensData;
  frame: FrameData;
  result: ThicknessResult;
  compareWith?: { lens: LensData; result: ThicknessResult };
  customShape?: CustomShape | null;
}

export default function Scene({ lens, frame, result, compareWith, customShape = null }: SceneProps) {
  const { t } = useTranslation();
  const [autoRotate, setAutoRotate] = useState(false);
  const [showWire, setShowWire] = useState(false);
  const [zoom, setZoom] = useState(1);
  const controlsRef = useRef<any>(null);

  const handleZoom = (factor: number) => {
    setZoom((z) => Math.min(2.5, Math.max(0.4, z * factor)));
  };

  return (
    <div className="relative w-full h-full min-h-[420px] rounded-2xl overflow-hidden bg-[#e6ecf3] border border-white/10">
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0.15, 4.2 / zoom], fov: 28 }}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
        id="presbyta-3d-canvas"
      >
        {/* Daylight lab-bench background — light enough that the lens
            transmission samples a bright scene and the resin reads as
            transparent rather than as a dark mirror. */}
        <color attach="background" args={['#dce4ee']} />

        {/* Soft, diffuse, neutral light only.
            No HDR environment map → no harsh specular bowls on the
            front surface, no "polished glass sphere" look. */}
        <hemisphereLight args={['#ffffff', '#bcc6d3', 0.95]} />
        <directionalLight position={[2.5, 3, 5]} intensity={0.55} color="#ffffff" />
        <directionalLight position={[-3, 2, 3]} intensity={0.25} color="#e7eef7" />

        <Suspense fallback={null}>
          {/* Calibration reticle behind the lens. */}
          <Backdrop />

          <group position={compareWith ? [-1.4, 0, 0] : [0, 0, 0]}>
            <LensMesh
              lens={lens}
              frame={frame}
              result={result}
              cut
              showWireframe={showWire}
              customShape={customShape}
            />
          </group>
          {compareWith && (
            <group position={[1.4, 0, 0]}>
              <LensMesh
                lens={compareWith.lens}
                frame={frame}
                result={compareWith.result}
                cut
                showWireframe={showWire}
                customShape={customShape}
              />
            </group>
          )}
          {/* No Environment, no ContactShadows.
              Cinematic reflections and dark shadows under the lens
              were what made the previous render look like polished
              black glass instead of ophthalmic resin. */}
        </Suspense>

        <OrbitControls
          ref={controlsRef}
          enablePan={false}
          autoRotate={autoRotate}
          autoRotateSpeed={0.6}
          minDistance={2.2}
          maxDistance={8}
        />
      </Canvas>

      {/* Floating overlay controls */}
      <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-10">
        <Tool tip={t('actions.rotate')} onClick={() => setAutoRotate((v) => !v)} active={autoRotate}>
          <RotateCw size={14} />
        </Tool>
        <Tool tip={t('actions.zoomIn')} onClick={() => handleZoom(1.2)}>
          <ZoomIn size={14} />
        </Tool>
        <Tool tip={t('actions.zoomOut')} onClick={() => handleZoom(0.83)}>
          <ZoomOut size={14} />
        </Tool>
        <Tool tip="Wireframe" onClick={() => setShowWire((v) => !v)} active={showWire}>
          <Layers size={14} />
        </Tool>
      </div>

      {/* Top-left HUD */}
      <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
        <div className="pill bg-presbyta-950/70 border border-white/15 text-white/90 backdrop-blur-md">
          <Box size={11} />
          <span className="font-mono">n = {lens.index.toFixed(2)}</span>
        </div>
        <div className="pill bg-presbyta-950/70 border border-gold-400/40 text-gold-200 backdrop-blur-md">
          <span>Ø {lens.diameter} mm</span>
        </div>
      </div>

      {/* Bottom HUD: power info */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between z-10 pointer-events-none">
        <div className="text-[10px] uppercase tracking-[0.25em] text-presbyta-900/55 font-mono">
          PRESBYTA · Bench render
        </div>
        <div className="font-mono text-xs text-presbyta-900/75">
          SPH {fmt(lens.sphere)} · CYL {fmt(lens.cylinder)} · AXIS {lens.axis}°
        </div>
      </div>
    </div>
  );
}

function fmt(n: number) {
  return (n >= 0 ? '+' : '') + n.toFixed(2);
}

function Tool({
  tip,
  onClick,
  active,
  children,
}: {
  tip: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      title={tip}
      onClick={onClick}
      className={`p-2 rounded-lg backdrop-blur-md border transition ${
        active
          ? 'bg-gold-gradient text-presbyta-950 border-gold-400/60 shadow-gold-glow'
          : 'bg-white/70 border-presbyta-200 text-presbyta-800 hover:bg-white hover:text-presbyta-900'
      }`}
    >
      {children}
    </button>
  );
}
