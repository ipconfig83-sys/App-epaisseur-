import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Cpu, Box, Layers, Award } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import Logo from '@/components/brand/Logo';

export default function AboutPage() {
  const { t } = useTranslation();

  const features = [
    { icon: <Cpu size={20} />, key: 'precision' },
    { icon: <Box size={20} />, key: 'realtime' },
    { icon: <Layers size={20} />, key: 'compare' },
    { icon: <Award size={20} />, key: 'pro' },
  ] as const;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center text-center gap-6"
      >
        <Logo size={72} showWordmark={false} />
        <div>
          <div className="text-[11px] uppercase tracking-[0.4em] text-gold-300/80 mb-2">
            {t('brand.name')}
          </div>
          <h1 className="text-4xl sm:text-5xl font-display font-extrabold text-white">
            {t('about.title')}
          </h1>
          <p className="mt-4 text-white/70 max-w-2xl mx-auto leading-relaxed">
            {t('about.intro')}
          </p>
        </div>
      </motion.div>

      <GlassCard className="!p-8">
        <div className="space-y-4 text-white/80 leading-relaxed">
          <p>{t('about.p1')}</p>
          <p>{t('about.p2')}</p>
          <p className="text-gold-200">{t('about.p3')}</p>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {features.map((f, i) => (
          <motion.div
            key={f.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="glass-card p-5 flex gap-4 items-start"
          >
            <div className="w-11 h-11 rounded-xl bg-gold-gradient flex items-center justify-center text-presbyta-950 shadow-gold-glow shrink-0">
              {f.icon}
            </div>
            <div>
              <h3 className="font-display font-bold text-white">
                {t(`about.features.${f.key}`)}
              </h3>
              <p className="text-sm text-white/60 mt-1 leading-relaxed">
                {t(`about.features.${f.key}Desc`)}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="text-center text-xs text-white/40 pt-6 border-t border-white/10">
        <span className="font-display tracking-[0.3em] text-gold-300">PRESBYTA</span>
        <span className="mx-2">·</span>
        <span>presbyta.optical</span>
        <span className="mx-2">·</span>
        <span>v1.0.0</span>
      </div>
    </div>
  );
}
