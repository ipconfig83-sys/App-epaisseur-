import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ClipboardCheck, Save } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import { Field, NumberInput } from '@/components/ui/Field';
import { useSimulatorStore } from '@/store/useSimulatorStore';
import type { ThicknessResult } from '@/types';

const TOL_PASS = 0.2;
const TOL_WARN = 0.5;

export default function ValidationPanel({ result }: { result: ThicknessResult }) {
  const { t } = useTranslation();
  const { validation, setValidation } = useSimulatorStore();

  const ctDelta = useMemo(
    () =>
      validation.measuredCenterMm > 0
        ? validation.measuredCenterMm - result.finalCenterThickness
        : null,
    [validation.measuredCenterMm, result.finalCenterThickness]
  );

  const etDelta = useMemo(
    () =>
      validation.measuredEdgeMm > 0
        ? validation.measuredEdgeMm - result.finalEdgeThickness
        : null,
    [validation.measuredEdgeMm, result.finalEdgeThickness]
  );

  const verdict = useMemo(() => {
    if (ctDelta == null || etDelta == null) return null;
    const worst = Math.max(Math.abs(ctDelta), Math.abs(etDelta));
    if (worst <= TOL_PASS) return 'pass' as const;
    if (worst <= TOL_WARN) return 'warn' as const;
    return 'reject' as const;
  }, [ctDelta, etDelta]);

  const handleSave = () => {
    const record = {
      timestamp: new Date().toISOString(),
      ...validation,
      calculatedCt: result.finalCenterThickness,
      calculatedEt: result.finalEdgeThickness,
      ctDelta,
      etDelta,
      verdict,
    };
    const blob = new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `presbyta-qc-${validation.batchNumber || Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <GlassCard title={t('validation.title')} icon={<ClipboardCheck size={14} />}>
      <p className="text-xs text-white/60 mb-4 leading-relaxed">{t('validation.subtitle')}</p>

      <div className="grid grid-cols-2 gap-3">
        <Field label={t('validation.measuredCt')} unit="mm">
          <NumberInput
            value={validation.measuredCenterMm}
            onChange={(v) => setValidation({ measuredCenterMm: v })}
            step={0.01}
            min={0}
            max={20}
          />
        </Field>
        <Field label={t('validation.measuredEt')} unit="mm">
          <NumberInput
            value={validation.measuredEdgeMm}
            onChange={(v) => setValidation({ measuredEdgeMm: v })}
            step={0.01}
            min={0}
            max={20}
          />
        </Field>
        <Field label={t('validation.batch')}>
          <input
            type="text"
            className="glass-input"
            value={validation.batchNumber}
            onChange={(e) => setValidation({ batchNumber: e.target.value })}
            placeholder="LOT-2026-0001"
          />
        </Field>
        <Field label={t('validation.technician')}>
          <input
            type="text"
            className="glass-input"
            value={validation.technician}
            onChange={(e) => setValidation({ technician: e.target.value })}
            placeholder="Technician ID"
          />
        </Field>
      </div>

      {/* Comparison table */}
      <div className="mt-4 rounded-xl border border-white/10 overflow-hidden">
        <div className="grid grid-cols-4 gap-px bg-white/10 text-[10px] uppercase tracking-wider">
          <div className="bg-presbyta-900/80 px-3 py-2 text-white/60"></div>
          <div className="bg-presbyta-900/80 px-3 py-2 text-white/60">{t('validation.calculated')}</div>
          <div className="bg-presbyta-900/80 px-3 py-2 text-white/60">{t('validation.measured')}</div>
          <div className="bg-presbyta-900/80 px-3 py-2 text-white/60">{t('validation.delta')}</div>
        </div>
        <Row
          label={t('results.centerThickness')}
          calc={result.finalCenterThickness}
          meas={validation.measuredCenterMm}
          delta={ctDelta}
        />
        <Row
          label={t('results.finalEdge')}
          calc={result.finalEdgeThickness}
          meas={validation.measuredEdgeMm}
          delta={etDelta}
        />
      </div>

      <p className="text-[10px] text-white/40 mt-2 leading-snug">{t('validation.tolerance')}</p>

      {/* Verdict */}
      {verdict && (
        <motion.div
          key={verdict}
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`mt-4 rounded-xl border p-4 flex items-center justify-between ${
            verdict === 'pass'
              ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
              : verdict === 'warn'
              ? 'border-amber-400/40 bg-amber-500/10 text-amber-200'
              : 'border-red-400/40 bg-red-500/10 text-red-200'
          }`}
        >
          <div className="font-display font-extrabold text-2xl tracking-wider">
            {t(`validation.${verdict}`)}
          </div>
          <button onClick={handleSave} className="btn-ghost text-xs">
            <Save size={12} />
            {t('validation.saveRecord')}
          </button>
        </motion.div>
      )}

      {/* Notes */}
      <div className="mt-4">
        <span className="label">{t('validation.notes')}</span>
        <textarea
          className="glass-input min-h-[64px] resize-y"
          value={validation.notes}
          onChange={(e) => setValidation({ notes: e.target.value })}
          placeholder="Inspection observations…"
        />
      </div>
    </GlassCard>
  );
}

function Row({
  label,
  calc,
  meas,
  delta,
}: {
  label: string;
  calc: number;
  meas: number;
  delta: number | null;
}) {
  const color =
    delta == null
      ? 'text-white/50'
      : Math.abs(delta) <= TOL_PASS
      ? 'text-emerald-300'
      : Math.abs(delta) <= TOL_WARN
      ? 'text-amber-300'
      : 'text-red-300';

  return (
    <div className="grid grid-cols-4 gap-px bg-white/10 text-xs">
      <div className="bg-presbyta-950/60 px-3 py-2 text-white/70">{label}</div>
      <div className="bg-presbyta-950/40 px-3 py-2 font-mono text-white">{calc.toFixed(2)}</div>
      <div className="bg-presbyta-950/40 px-3 py-2 font-mono text-white">
        {meas > 0 ? meas.toFixed(2) : '—'}
      </div>
      <div className={`bg-presbyta-950/40 px-3 py-2 font-mono ${color}`}>
        {delta != null ? `${delta >= 0 ? '+' : ''}${delta.toFixed(2)}` : '—'}
      </div>
    </div>
  );
}
