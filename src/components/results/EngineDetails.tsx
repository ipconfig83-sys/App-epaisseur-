import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Cog, Ruler, Triangle, Waves, ShieldCheck, CircleSlash } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import type { ThicknessResult } from '@/types';

interface Props {
  result: ThicknessResult;
}

export default function EngineDetails({ result }: Props) {
  const { t } = useTranslation();
  const { meridians, blank, ansi, prismThinning } = result;

  return (
    <GlassCard title={t('sections.engine')} icon={<Cog size={14} />}>
      <div className="space-y-4">
        {/* Meridians */}
        <Block title={t('engine.meridians')} icon={<Waves size={12} />}>
          <div className="grid grid-cols-2 gap-2">
            {meridians.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="rounded-lg border border-white/10 bg-white/[0.03] p-2.5 font-mono text-[11px]"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] uppercase tracking-wider text-gold-300">
                    M{i + 1} · {m.axis.toFixed(0)}°
                  </span>
                  <span className="text-white/80 font-semibold">
                    {fmt(m.power)} D
                  </span>
                </div>
                <Row label="F1 / F2" value={`${fmt(m.frontPower)} · ${fmt(m.backPower)}`} />
                <Row label="r1 / r2" value={`${m.frontRadius.toFixed(1)} · ${m.backRadius.toFixed(1)} mm`} />
                <Row label="s1 / s2" value={`${m.frontSag.toFixed(2)} · ${m.backSag.toFixed(2)} mm`} />
                <Row label="Edge" value={`${m.edgeThickness.toFixed(2)} mm`} highlight />
              </motion.div>
            ))}
          </div>
        </Block>

        {/* Blank analysis */}
        <Block title={t('engine.blank')} icon={<Ruler size={12} />}>
          <div className="space-y-1.5 font-mono text-[11px]">
            <Row
              label={t('engine.mbs')}
              value={`${blank.minimumBlankSize.toFixed(1)} mm`}
              status={blank.fits ? 'ok' : 'fail'}
            />
            <Row label={t('engine.uncut')} value={`${blank.uncutDiameterUsed.toFixed(0)} mm`} />
            <Row label={t('engine.cutWorst')} value={`${blank.cutDiameterWorstSide.toFixed(1)} mm`} />
            <Row
              label={t('engine.decH')}
              value={`${signed(blank.effectiveDecentrationH)} mm`}
            />
            <Row
              label={t('engine.decV')}
              value={`${signed(blank.effectiveDecentrationV)} mm`}
            />
            <Row label={t('engine.decTotal')} value={`${blank.totalDecentration.toFixed(2)} mm`} />
          </div>
        </Block>

        {/* ANSI */}
        <Block title={t('engine.ansi')} icon={<ShieldCheck size={12} />}>
          <div className="space-y-1.5 font-mono text-[11px]">
            <Row
              label={t('engine.ansiCt')}
              value={`${ansi.ansiCenterMin.toFixed(2)} mm`}
              status={ansi.centerOk ? 'ok' : 'warn'}
            />
            <Row
              label={t('engine.ansiEt')}
              value={`${ansi.ansiEdgeMin.toFixed(2)} mm`}
              status={ansi.edgeOk ? 'ok' : 'warn'}
            />
            <Row label={t('engine.standard')} value={ansi.standard} />
          </div>
        </Block>

        {/* Prism thinning */}
        <Block
          title={t('engine.prism')}
          icon={prismThinning.applied ? <Triangle size={12} /> : <CircleSlash size={12} />}
        >
          {prismThinning.applied ? (
            <div className="space-y-1.5 font-mono text-[11px]">
              <Row
                label={t('engine.prismValue')}
                value={`${prismThinning.prismDiopters.toFixed(2)} Δ ${prismThinning.base}`}
                highlight
              />
              <Row
                label={t('engine.prismSaving')}
                value={`− ${prismThinning.thicknessReductionMm.toFixed(2)} mm`}
                status="ok"
              />
              <p className="text-[10px] text-white/50 leading-snug pt-1">
                {prismThinning.rationale}
              </p>
            </div>
          ) : (
            <p className="text-[11px] text-white/50 leading-snug">
              {prismThinning.rationale}
            </p>
          )}
        </Block>
      </div>
    </GlassCard>
  );
}

function Block({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-gold-300/80 mb-2">
        {icon}
        <span>{title}</span>
      </div>
      {children}
    </div>
  );
}

function Row({
  label,
  value,
  status,
  highlight,
}: {
  label: string;
  value: string;
  status?: 'ok' | 'warn' | 'fail';
  highlight?: boolean;
}) {
  const color =
    status === 'fail'
      ? 'text-red-300'
      : status === 'warn'
      ? 'text-amber-300'
      : status === 'ok'
      ? 'text-emerald-300'
      : highlight
      ? 'text-gold-300'
      : 'text-white/85';
  return (
    <div className="flex items-center justify-between text-[11px]">
      <span className="text-white/50">{label}</span>
      <span className={`${color} font-mono`}>{value}</span>
    </div>
  );
}

function fmt(n: number) {
  return (n >= 0 ? '+' : '') + n.toFixed(2);
}
function signed(n: number) {
  return (n >= 0 ? '+' : '') + n.toFixed(2);
}
