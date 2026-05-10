import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-white/10 bg-presbyta-950/40 backdrop-blur-md">
      <div className="max-w-[1600px] mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-white/50">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-display font-bold tracking-[0.22em] text-gold-300">PRESBYTA</span>
          <span>© {year}</span>
          <span>·</span>
          <span>{t('footer.rights')}</span>
          <span>·</span>
          <span className="text-white/60">A Lunette 15 Minutes brand</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="pill bg-white/5 text-white/60 border border-white/10">v1.0.0</span>
          <span className="pill bg-gold-500/10 text-gold-300 border border-gold-500/30">
            Lab build
          </span>
        </div>
      </div>
    </footer>
  );
}
