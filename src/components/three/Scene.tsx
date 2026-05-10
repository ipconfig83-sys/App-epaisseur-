import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Float } from '@react-three/drei';
import { Suspense, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, RotateCw, ZoomIn, ZoomOut, Layers } from 'lucide-react';
import LensMesh from './LensMesh';
import type { FrameData, LensData } from '@/types';

interface SceneProps {
  lens: LensData;
  frame: FrameData;
  compareWith?: LensData; // optional second lens for comparison
}

export default function Scene({ lens, frame, compareWith }: SceneProps) {
  const { t } = useTranslation();
  const [autoRotate, setAutoRotate] = useState(true);
  const [showWire, setShowWire] = useState(false);
  const [zoom, setZoom] = useState(1);
  const controlsRef = useRef<any>(null);

  const handleZoom = (factor: number) => {
    setZoom((z) => Math.min(2.5, Math.max(0.4, z * factor)));
  };

  return (
    <div className="relative w-full h-full min-h-[420px] rounded-2xl overflow-hidden bg-gradient-to-br from-presbyta-900 via-presbyta-950 to-black border border-white/10">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 0.4, 4 / zoom], fov: 38 }}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
        id="presbyta-3d-canvas"
      >
        <color attach="background" args={['#050d1d']} />
        <ambientLight intensity={0.35} />
        <directionalLight
          position={[3, 4, 5]}
          intensity={1.4}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <directionalLight position={[-3, 2, -2]} intensity={0.7} color="#ecc154" />

        <Suspense fallback={null}>
          <Environment preset="studio" />
          <Float speed={autoRotate ? 1.2 : 0} rotationIntensity={0.4} floatIntensity={0.3}>
            <group position={compareWith ? [-1.4, 0, 0] : [0, 0, 0]}>
              <LensMesh
                lens={lens}
                frame={frame}
                cut
                tint="#cfe2ff"
                showWireframe={showWire}
              />
            </group>
            {compareWith && (
              <group position={[1.4, 0, 0]}>
                <LensMesh
                  lens={compareWith}
                  frame={frame}
                  cut
                  tint="#fff7d6"
                  showWireframe={showWire}
                />
              </group>
            )}
          </Float>
          <ContactShadows
            position={[0, -1.4, 0]}
            opacity={0.4}
            scale={8}
            blur={2.4}
            far={3}
            color="#020a18"
          />
        </Suspense>

        <OrbitControls
          ref={controlsRef}
          enablePan={false}
          autoRotate={autoRotate}
          autoRotateSpeed={1.4}
          minDistance={1.6}
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
        <div className="pill bg-black/40 border border-white/10 text-white/80 backdrop-blur-md">
          <Box size={11} />
          <span className="font-mono">n = {lens.index.toFixed(2)}</span>
        </div>
        <div className="pill bg-black/40 border border-gold-400/30 text-gold-200 backdrop-blur-md">
          <span>Ø {lens.diameter} mm</span>
        </div>
      </div>

      {/* Bottom HUD: power info */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between z-10 pointer-events-none">
        <div className="text-[10px] uppercase tracking-[0.25em] text-white/40 font-mono">
          PRESBYTA · 3D Lens Render
        </div>
        <div className="font-mono text-xs text-white/70">
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
          : 'bg-black/40 border-white/10 text-white/70 hover:bg-black/60 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}
