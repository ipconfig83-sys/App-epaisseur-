import { useTranslation } from 'react-i18next';
import { Activity, Gauge, Layers, Sparkles, Weight, CircleDot } from 'lucide-react';
import { motion } from 'framer-motion';
import GlassCard from '@/components/ui/GlassCard';
import type { ThicknessResult } from '@/types';

interface Props {
  result: ThicknessResult;
}

export default function ResultsPanel({ result }: Props) {
  const { t } = useTranslation();

  const stats = [
    {
      icon: <Gauge size={14} />,
      label: t('results.centerThickness'),
      value: result.centerThickness.toFixed(2),
      unit: 'mm',
    },
    {
      icon: <Layers size={14} />,
      label: t('results.edgeThickness'),
      value: result.edgeThickness.toFixed(2),
      unit: 'mm',
    },
    {
      icon: <CircleDot size={14} />,
      label: t('results.finalEdge'),
      value: result.finalEdgeThickness.toFixed(2),
      unit: 'mm',
      highlight: true,
    },
    {
      icon: <Activity size={14} />,
      label: t('results.baseCurve'),
      value: result.baseCurve.toFixed(1),
      unit: 'D',
    },
    {
      icon: <Weight size={14} />,
      label: t('results.weight'),
      value: result.weight.toFixed(1),
      unit: 'g',
    },
    {
      icon: <Sparkles size={14} />,
      label: t('results.optimalIndex'),
      value: result.optimalIndex.toFixed(2),
      unit: '',
      gold: true,
    },
  ];

  return (
    <GlassCard title={t('sections.results')} icon={<Gauge size={14} />}>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className={`relative rounded-xl p-3 border ${
              s.highlight
                ? 'border-gold-400/40 bg-gold-500/5'
                : s.gold
                ? 'border-gold-400/30 bg-gradient-to-br from-gold-500/15 to-transparent'
                : 'border-white/10 bg-white/[0.03]'
            }`}
          >
            <div className="flex items-center gap-1.5 stat-label">
              {s.icon}
              <span>{s.label}</span>
            </div>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className={`stat-value ${s.gold ? 'text-gold-300' : ''}`}>{s.value}</span>
              {s.unit && <span className="text-xs text-white/50 font-mono">{s.unit}</span>}
            </div>
          </motion.div>
        ))}
      </div>
    </GlassCard>
  );
}
