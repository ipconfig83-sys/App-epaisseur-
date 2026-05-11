import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Camera,
  Download,
  RefreshCw,
  Eye,
  Sparkles,
  Box,
  AlertTriangle,
} from 'lucide-react';
import { motion } from 'framer-motion';
import GlassCard from '@/components/ui/GlassCard';
import FrameForm from '@/components/forms/FrameForm';
import LensForm from '@/components/forms/LensForm';
import ResultsPanel from '@/components/results/ResultsPanel';
import ComparisonTable from '@/components/results/ComparisonTable';
import Diagnostics from '@/components/results/Diagnostics';
import EngineDetails from '@/components/results/EngineDetails';
import Scene from '@/components/three/Scene';
import ProfileView from '@/components/three/ProfileView';
import QuotationPanel from '@/components/quotation/QuotationPanel';
import ValidationPanel from '@/components/validation/ValidationPanel';
import { useSimulatorStore } from '@/store/useSimulatorStore';
import { runSimulation } from '@/engine/calculate';
import { exportReportPdf, exportScreenshot } from '@/utils/export';

export default function SimulatorPage() {
  const { t } = useTranslation();
  const { lens, frame, mode, customShape, resetToDefaults } = useSimulatorStore();
  const [compareIndex, setCompareIndex] = useState<number | null>(null);

  const result = useMemo(() => runSimulation(lens, frame), [lens, frame]);

  const compareLens = compareIndex
    ? { ...lens, index: compareIndex as any }
    : undefined;
  const compareResult = useMemo(
    () => (compareLens ? runSimulation(compareLens, frame) : null),
    [compareLens, frame]
  );

  return (
    <div id="presbyta-report" className="max-w-[1600px] mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Hero / mode banner */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass-card p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 sm:gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold-gradient flex items-center justify-center text-presbyta-950 shadow-gold-glow">
            <Eye size={20} />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-gold-300/80">
              {t('brand.name')}
            </div>
            <h1 className="text-lg sm:text-xl font-display font-bold text-white">
              {t('brand.tagline')}
            </h1>
          </div>
          <span
            className={`pill ms-2 hidden sm:inline-flex ${
              mode === 'laboratory'
                ? 'bg-gold-500/15 text-gold-200 border border-gold-400/30'
                : mode === 'quotation'
                ? 'bg-emerald-500/15 text-emerald-200 border border-emerald-400/30'
                : mode === 'validation'
                ? 'bg-violet-500/15 text-violet-200 border border-violet-400/30'
                : 'bg-presbyta-500/15 text-presbyta-100 border border-presbyta-400/30'
            }`}
          >
            {t(`modes.${mode}`)}
          </span>
          <span className="pill bg-amber-500/15 text-amber-200 border border-amber-400/30 hidden md:inline-flex">
            <AlertTriangle size={11} />
            {t('disclaimer.badge')}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={resetToDefaults} className="btn-ghost text-xs">
            <RefreshCw size={14} /> {t('actions.reset')}
          </button>
          <button
            onClick={() => exportScreenshot('presbyta-3d-canvas')}
            className="btn-ghost text-xs"
          >
            <Camera size={14} /> {t('actions.screenshot')}
          </button>
          <button
            onClick={() => exportReportPdf(lens, frame, result)}
            className="btn-gold text-xs"
          >
            <Download size={14} /> {t('actions.exportPdf')}
          </button>
        </div>
      </motion.div>

      {/* Main grid — responsive layout
          Mobile (< sm): single column, forms at top, then 3D, then results
          Tablet (sm – lg): 2-column with forms left, 3D + results stacked
          Desktop (≥ lg): 4 / 5 / 3 split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Forms */}
        <div className="lg:col-span-4 space-y-4 sm:space-y-6 order-2 lg:order-1">
          <FrameForm />
          <LensForm />
        </div>

        {/* 3D + profile */}
        <div className="lg:col-span-5 space-y-4 sm:space-y-6 order-1 lg:order-2">
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
            <Scene
              lens={lens}
              frame={frame}
              result={result}
              compareWith={
                compareLens && compareResult
                  ? { lens: compareLens, result: compareResult }
                  : undefined
              }
              customShape={customShape}
            />
          </GlassCard>

          <GlassCard title={t('sections.profile360')} icon={<Sparkles size={14} />}>
            <div className="aspect-[1.75/1] w-full">
              <ProfileView lens={lens} frame={frame} result={result} />
            </div>
          </GlassCard>
        </div>

        {/* Right: mode-specific */}
        <div className="lg:col-span-3 space-y-4 sm:space-y-6 order-3">
          {mode === 'patient' && (
            <>
              <ResultsPanel result={result} />
              <Diagnostics warnings={result.warnings} />
            </>
          )}

          {mode === 'laboratory' && (
            <>
              <ResultsPanel result={result} />
              <ComparisonTable
                comparison={result.comparison}
                optimal={result.optimalIndex}
              />
              <EngineDetails result={result} />
              <Diagnostics warnings={result.warnings} />
            </>
          )}

          {mode === 'quotation' && (
            <>
              <QuotationPanel result={result} />
              <Diagnostics warnings={result.warnings} />
            </>
          )}

          {mode === 'validation' && (
            <>
              <ValidationPanel result={result} />
              <ResultsPanel result={result} />
              <EngineDetails result={result} />
            </>
          )}
        </div>
      </div>

      {/* Footer disclaimer (always present in print + on screen) */}
      <p className="text-center text-[10px] text-white/40 pt-2 leading-relaxed max-w-3xl mx-auto">
        {t('disclaimer.short')}
      </p>
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
    <div className="flex items-center gap-1 flex-wrap">
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
