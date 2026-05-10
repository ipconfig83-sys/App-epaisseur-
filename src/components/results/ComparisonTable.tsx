import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { BarChart3, Star } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import type { IndexComparison, RefractiveIndex } from '@/types';

interface Props {
  comparison: IndexComparison[];
  optimal: RefractiveIndex;
}

export default function ComparisonTable({ comparison, optimal }: Props) {
  const { t } = useTranslation();
  const maxEdge = Math.max(...comparison.map((c) => c.edgeThickness));

  return (
    <GlassCard title={t('sections.comparison')} icon={<BarChart3 size={14} />}>
      <div className="space-y-2">
        {comparison.map((c) => {
          const widthPct = Math.min(100, (c.edgeThickness / maxEdge) * 100);
          const isOptimal = c.index === optimal;
          return (
            <div
              key={c.index}
              className={`relative rounded-lg overflow-hidden border ${
                isOptimal
                  ? 'border-gold-400/50 bg-gold-500/5'
                  : 'border-white/10 bg-white/[0.02]'
              }`}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${widthPct}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className={`absolute inset-y-0 left-0 ${
                  isOptimal ? 'bg-gold-gradient/20' : 'bg-presbyta-400/15'
                }`}
                style={{
                  background: isOptimal
                    ? 'linear-gradient(90deg, rgba(236,193,84,0.25), rgba(236,193,84,0.05))'
                    : 'linear-gradient(90deg, rgba(79,127,187,0.25), rgba(79,127,187,0.05))',
                }}
              />
              <div className="relative flex items-center gap-3 p-2.5 text-sm">
                <div className="flex items-center gap-1.5 w-16 font-mono font-semibold">
                  {isOptimal && <Star size={12} className="text-gold-300 fill-gold-300" />}
                  <span className={isOptimal ? 'text-gold-300' : 'text-white/80'}>
                    {c.index.toFixed(2)}
                  </span>
                </div>
                <div className="flex-1 grid grid-cols-3 gap-2 text-xs">
                  <Metric label="Center" value={`${c.centerThickness.toFixed(2)} mm`} />
                  <Metric label="Edge" value={`${c.edgeThickness.toFixed(2)} mm`} />
                  <Metric label="Weight" value={`${c.weight.toFixed(1)} g`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[9px] uppercase tracking-wider text-white/40">{label}</span>
      <span className="font-mono text-white/90">{value}</span>
    </div>
  );
}
