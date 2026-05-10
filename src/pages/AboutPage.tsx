import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Cpu,
  Box,
  Layers,
  Award,
  Glasses,
  FlaskConical,
  Stethoscope,
  ShieldCheck,
} from 'lucide-react';
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

  const audience = [
    { icon: <Glasses size={22} />, key: 'opticians' },
    { icon: <FlaskConical size={22} />, key: 'labs' },
    { icon: <Stethoscope size={22} />, key: 'clinical' },
  ] as const;

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 space-y-10">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center text-center gap-6"
      >
        <Logo size={84} showWordmark={false} />
        <div>
          <div className="text-[11px] uppercase tracking-[0.4em] text-gold-300/80 mb-2">
            {t('about.eyebrow')}
          </div>
          <h1 className="text-4xl sm:text-5xl font-display font-extrabold text-white">
            {t('about.title')}
          </h1>
          <p className="mt-5 text-lg text-white/70 max-w-3xl mx-auto leading-relaxed">
            {t('about.intro')}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          <span className="pill bg-gold-500/10 text-gold-200 border border-gold-400/30">
            <ShieldCheck size={11} />
            ANSI Z80.1 compliant
          </span>
          <span className="pill bg-presbyta-500/10 text-presbyta-100 border border-presbyta-400/30">
            ISO 8980 / 8624
          </span>
          <span className="pill bg-white/5 text-white/70 border border-white/10">
            Made for ECPs
          </span>
        </div>
      </motion.div>

      {/* Brand narrative */}
      <GlassCard className="!p-8">
        <div className="space-y-5 text-white/80 leading-relaxed">
          <p className="text-base">{t('about.p1')}</p>
          <p className="text-base">{t('about.p2')}</p>
          <p className="text-base text-gold-200">{t('about.p3')}</p>
        </div>
      </GlassCard>

      {/* Audience */}
      <section>
        <div className="text-center mb-6">
          <div className="text-[10px] uppercase tracking-[0.3em] text-gold-300/80">
            For optical professionals
          </div>
          <h2 className="font-display text-2xl font-bold text-white mt-1">
            Who PRESBYTA serves
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {audience.map((a, i) => (
            <motion.div
              key={a.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="glass-card p-5"
            >
              <div className="w-12 h-12 rounded-xl bg-gold-gradient flex items-center justify-center text-presbyta-950 shadow-gold-glow mb-3">
                {a.icon}
              </div>
              <h3 className="font-display font-bold text-white">
                {t(`about.audience.${a.key}`)}
              </h3>
              <p className="text-sm text-white/60 mt-1.5 leading-relaxed">
                {t(`about.audience.${a.key}Desc`)}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Capabilities */}
      <section>
        <div className="text-center mb-6">
          <div className="text-[10px] uppercase tracking-[0.3em] text-gold-300/80">
            Engine capabilities
          </div>
          <h2 className="font-display text-2xl font-bold text-white mt-1">
            Built on lab-grade optics
          </h2>
        </div>
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
      </section>

      {/* Owner / institutional plate */}
      <GlassCard className="!p-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="text-[10px] uppercase tracking-[0.4em] text-gold-300/80">
            Brand ownership
          </div>
          <div className="font-display text-3xl font-extrabold text-white">
            PRESBYTA<span className="text-gold-300"> × </span>Lunette 15 Minutes
          </div>
          <p className="text-sm text-white/70 max-w-2xl leading-relaxed">
            {t('about.ownerLine')}
          </p>
        </div>
      </GlassCard>

      {/* Footer plate */}
      <div className="text-center text-xs text-white/40 pt-6 border-t border-white/10">
        <span className="font-display tracking-[0.3em] text-gold-300">PRESBYTA</span>
        <span className="mx-2">·</span>
        <span>A Lunette 15 Minutes brand</span>
        <span className="mx-2">·</span>
        <span>v1.0.0</span>
      </div>
    </div>
  );
}
