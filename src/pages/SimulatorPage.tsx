import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, Download, RefreshCw, Eye, Sparkles, Box } from 'lucide-react';
import { motion } from 'framer-motion';
import GlassCard from '@/components/ui/GlassCard';
import FrameForm from '@/components/forms/FrameForm';
import LensForm from '@/components/forms/LensForm';
import ResultsPanel from '@/components/results/ResultsPanel';
import ComparisonTable from '@/components/results/ComparisonTable';
import Diagnostics from '@/components/results/Diagnostics';
import Scene from '@/components/three/Scene';
import ProfileView from '@/components/three/ProfileView';
import { useSimulatorStore } from '@/store/useSimulatorStore';
import { runSimulation } from '@/engine/calculate';
import { exportReportPdf, exportScreenshot } from '@/utils/export';

export default function SimulatorPage() {
  const { t } = useTranslation();
  const { lens, frame, mode, resetToDefaults } = useSimulatorStore();
  const [compareIndex, setCompareIndex] = useState<number | null>(null);

  const result = useMemo(() => runSimulation(lens, frame), [lens, frame]);

  const compareLens = compareIndex
    ? { ...lens, index: compareIndex as any }
    : undefined;

  return (
    <div id="presbyta-report" className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Hero / mode banner */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass-card p-5 flex flex-wrap items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold-gradient flex items-center justify-center text-presbyta-950 shadow-gold-glow">
            <Eye size={20} />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-gold-300/80">
              {t('brand.name')}
            </div>
            <h1 className="text-xl font-display font-bold text-white">
              {t('brand.tagline')}
            </h1>
          </div>
          <span className={`pill ms-3 ${
            mode === 'laboratory'
              ? 'bg-gold-500/15 text-gold-200 border border-gold-400/30'
              : 'bg-presbyta-500/15 text-presbyta-100 border border-presbyta-400/30'
          }`}>
            {t(`modes.${mode}`)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={resetToDefaults} className="btn-ghost">
            <RefreshCw size={14} /> {t('actions.reset')}
          </button>
          <button
            onClick={() => exportScreenshot('presbyta-3d-canvas')}
            className="btn-ghost"
          >
            <Camera size={14} /> {t('actions.screenshot')}
          </button>
          <button
            onClick={() => exportReportPdf(lens, frame, result)}
            className="btn-gold"
          >
            <Download size={14} /> {t('actions.exportPdf')}
          </button>
        </div>
      </motion.div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: forms */}
        <div className="lg:col-span-4 space-y-6">
          <FrameForm />
          <LensForm />
        </div>

        {/* Center: 3D + profile */}
        <div className="lg:col-span-5 space-y-6">
          <GlassCard
            title={t('sections.visualization')}
            icon={<Box size={14} />}
            actions={
              <CompareSwitch
                value={compareIndex}
                current={lens.index}
                onChange={setCompareIndex}
              />
            }
          >
            <Scene lens={lens} frame={frame} compareWith={compareLens} />
          </GlassCard>

          <GlassCard title="Profile / cross-section" icon={<Sparkles size={14} />}>
            <div className="aspect-[2.4/1] w-full">
              <ProfileView lens={lens} frame={frame} result={result} />
            </div>
          </GlassCard>
        </div>

        {/* Right: results */}
        <div className="lg:col-span-3 space-y-6">
          <ResultsPanel result={result} />
          <ComparisonTable
            comparison={result.comparison}
            optimal={result.optimalIndex}
          />
          <Diagnostics warnings={result.warnings} />
        </div>
      </div>
    </div>
  );
}

function CompareSwitch({
  value,
  current,
  onChange,
}: {
  value: number | null;
  current: number;
  onChange: (n: number | null) => void;
}) {
  const choices = [1.5, 1.59, 1.67, 1.74].filter((c) => c !== current);
  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] uppercase tracking-wider text-white/50 me-1">vs</span>
      <button
        onClick={() => onChange(null)}
        className={`px-2 py-0.5 text-[11px] rounded font-mono ${
          value === null
            ? 'bg-gold-gradient text-presbyta-950 font-semibold'
            : 'bg-white/5 text-white/60 hover:text-white'
        }`}
      >
        off
      </button>
      {choices.map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className={`px-2 py-0.5 text-[11px] rounded font-mono ${
            value === c
              ? 'bg-gold-gradient text-presbyta-950 font-semibold'
              : 'bg-white/5 text-white/60 hover:text-white'
          }`}
        >
          {c.toFixed(2)}
        </button>
      ))}
    </div>
  );
}
