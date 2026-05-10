import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';

export default function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-white/10 bg-presbyta-950/40 backdrop-blur-md">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4 space-y-2">
        {/* Disclaimer line — always visible */}
        <div className="flex items-start gap-2 text-[11px] text-amber-200/80 leading-relaxed">
          <AlertTriangle size={12} className="text-gold-300 shrink-0 mt-0.5" />
          <span>{t('disclaimer.short')}</span>
        </div>
        {/* Brand row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-white/50 pt-2 border-t border-white/5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-display font-bold tracking-[0.22em] text-gold-300">PRESBYTA</span>
            <span>© {year}</span>
            <span>·</span>
            <span>{t('footer.rights')}</span>
            <span>·</span>
            <span className="text-white/60">A Lunette 15 Minutes brand</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="pill bg-white/5 text-white/60 border border-white/10">v2.0.0</span>
            <span className="pill bg-gold-500/10 text-gold-300 border border-gold-500/30">
              Lab build
            </span>
            <span className="pill bg-amber-500/10 text-amber-200 border border-amber-400/30">
              {t('disclaimer.badge')}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
