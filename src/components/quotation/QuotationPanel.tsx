import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  ShoppingBag,
  Sparkles,
  Tag,
  Eye,
  Sun,
  Briefcase,
  Layers as LayersIcon,
  Printer,
} from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import { useSimulatorStore } from '@/store/useSimulatorStore';
import { recommendProduct, PRESBYTA_CATALOG } from '@/data/products';
import { computeQuotePrice, formatPrice } from '@/data/pricing';
import type { ThicknessResult, Currency } from '@/types';

export default function QuotationPanel({ result }: { result: ThicknessResult }) {
  const { t } = useTranslation();
  const {
    lens, frame, preferences, setPreferences,
    currency, setCurrency,
  } = useSimulatorStore();

  const reco = useMemo(
    () => recommendProduct(lens, frame, preferences),
    [lens, frame, preferences]
  );

  const price = useMemo(
    () => computeQuotePrice(reco.product, { rimless: frame.type === 'rimless' }),
    [reco.product, frame.type]
  );

  const featureToggles: { key: keyof typeof preferences; label: string; icon: React.ReactNode }[] = [
    { key: 'progressive', label: t('quotation.progressive'), icon: <LayersIcon size={12} /> },
    { key: 'blueBlock', label: t('quotation.blueBlock'), icon: <Eye size={12} /> },
    { key: 'photochromic', label: t('quotation.photochromic'), icon: <Sun size={12} /> },
    { key: 'office', label: t('quotation.office'), icon: <Briefcase size={12} /> },
  ];

  const currencies: Currency[] = ['MAD', 'EUR', 'USD'];

  return (
    <GlassCard title={t('quotation.title')} icon={<ShoppingBag size={14} />}>
      {/* Preferences */}
      <div className="mb-4">
        <div className="text-[10px] uppercase tracking-[0.2em] text-gold-300/80 mb-2">
          {t('quotation.preferences')}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {featureToggles.map((p) => (
            <button
              key={p.key}
              onClick={() => setPreferences({ [p.key]: !preferences[p.key] } as any)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition ${
                preferences[p.key]
                  ? 'bg-gold-gradient text-presbyta-950 border-gold-400/60 shadow-gold-glow'
                  : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
              }`}
            >
              {p.icon}
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Recommended product */}
      <motion.div
        key={reco.product.code}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-gold-400/40 bg-gradient-to-br from-gold-500/15 via-gold-500/5 to-transparent p-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-gold-300/80">
              {t('quotation.recommended')}
            </div>
            <h3 className="font-display text-lg font-bold text-white mt-0.5">
              {reco.product.name}
            </h3>
            <div className="text-[11px] font-mono text-white/60 mt-0.5">
              <Tag size={10} className="inline -mt-0.5 me-1" />
              {reco.product.code}
            </div>
          </div>
          <div className="text-right">
            <div className="stat-label">{t('quotation.price')}</div>
            <div className="font-mono text-2xl font-extrabold text-gold-300">
              {formatPrice(price, currency)}
            </div>
          </div>
        </div>

        {/* Coatings */}
        <div className="flex flex-wrap gap-1 mt-3">
          {reco.product.features.map((f) => (
            <span
              key={f}
              className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/70"
            >
              {f}
            </span>
          ))}
        </div>

        <p className="text-sm text-white/80 leading-relaxed mt-3">
          {reco.product.shortDescription}
        </p>
      </motion.div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-2 mt-4">
        <Metric
          label={t('quotation.estimatedThickness')}
          value={`${result.finalCenterThickness.toFixed(2)} / ${result.finalEdgeThickness.toFixed(2)} mm`}
        />
        <Metric
          label={t('quotation.estimatedWeight')}
          value={`${result.weight.toFixed(1)} g`}
        />
      </div>

      {/* Commercial explanation */}
      <div className="mt-4">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-gold-300/80 mb-1.5">
          <Sparkles size={12} />
          {t('quotation.commercialTitle')}
        </div>
        <p className="text-sm text-white/75 leading-relaxed">
          {reco.product.longDescription}
        </p>
      </div>

      {/* Rationale */}
      {reco.rationale.length > 0 && (
        <div className="mt-4 rounded-lg bg-white/[0.03] border border-white/10 p-3">
          <div className="text-[10px] uppercase tracking-[0.2em] text-gold-300/80 mb-1">
            {t('quotation.rationale')}
          </div>
          <ul className="text-[11px] text-white/70 space-y-1 list-disc list-inside">
            {reco.rationale.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Alternatives */}
      <div className="mt-4">
        <div className="text-[10px] uppercase tracking-[0.2em] text-gold-300/80 mb-2">
          {t('quotation.alternatives')}
        </div>
        <div className="grid grid-cols-1 gap-1.5">
          {reco.alternatives.map((a) => (
            <div
              key={a.code}
              className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs"
            >
              <div>
                <div className="font-medium text-white/90">{a.name}</div>
                <div className="font-mono text-[10px] text-white/40">{a.code}</div>
              </div>
              <div className="font-mono text-gold-200">
                {formatPrice(computeQuotePrice(a, { rimless: frame.type === 'rimless' }), currency)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Currency + actions */}
      <div className="mt-4 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-1">
          <span className="text-[10px] text-white/50 px-1">{t('quotation.currency')}</span>
          {currencies.map((c) => (
            <button
              key={c}
              onClick={() => setCurrency(c)}
              className={`px-2 py-0.5 text-[10px] rounded font-mono ${
                currency === c
                  ? 'bg-gold-gradient text-presbyta-950 font-semibold'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <button onClick={() => window.print()} className="btn-ghost text-xs">
          <Printer size={12} />
          {t('quotation.print')}
        </button>
      </div>

      {frame.type === 'rimless' && (
        <p className="text-[10px] text-white/40 mt-2">{t('quotation.feeRimless')}</p>
      )}
    </GlassCard>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2.5">
      <div className="stat-label">{label}</div>
      <div className="font-mono text-sm text-white mt-1">{value}</div>
    </div>
  );
}
