import { useTranslation } from 'react-i18next';
import { AlertTriangle, AlertCircle, Info, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '@/components/ui/GlassCard';
import type { Warning } from '@/types';

const ICONS = {
  error: <AlertCircle size={16} />,
  warning: <AlertTriangle size={16} />,
  info: <Info size={16} />,
};

const COLORS = {
  error: 'border-red-400/40 bg-red-500/10 text-red-200',
  warning: 'border-amber-400/40 bg-amber-500/10 text-amber-200',
  info: 'border-presbyta-300/40 bg-presbyta-400/10 text-presbyta-100',
};

export default function Diagnostics({ warnings }: { warnings: Warning[] }) {
  const { t } = useTranslation();

  return (
    <GlassCard title={t('warnings.title')} icon={<ShieldCheck size={14} />}>
      <AnimatePresence mode="popLayout">
        {warnings.length === 0 ? (
          <motion.div
            key="ok"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 p-3 rounded-lg border border-emerald-400/30 bg-emerald-500/5 text-emerald-200 text-sm"
          >
            <ShieldCheck size={16} />
            <span>{t('warnings.none')}</span>
          </motion.div>
        ) : (
          <div className="space-y-2">
            {warnings.map((w, i) => (
              <motion.div
                key={`${w.code}-${i}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`flex items-start gap-2 p-3 rounded-lg border text-xs leading-relaxed ${COLORS[w.severity]}`}
              >
                <span className="mt-0.5">{ICONS[w.severity]}</span>
                <div className="flex-1">
                  <div className="font-semibold tracking-wider uppercase text-[10px] mb-0.5 opacity-80">
                    {w.code.replace(/_/g, ' ')}
                  </div>
                  <span>{w.message}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}
