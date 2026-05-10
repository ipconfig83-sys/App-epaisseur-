import { useTranslation } from 'react-i18next';
import { Moon, Sun, FlaskConical, User2, Languages } from 'lucide-react';
import Logo from '@/components/brand/Logo';
import { useSimulatorStore } from '@/store/useSimulatorStore';
import type { Language } from '@/types';

export default function Header() {
  const { t } = useTranslation();
  const { theme, setTheme, mode, setMode, language, setLanguage, page, setPage } =
    useSimulatorStore();

  const langs: { code: Language; label: string }[] = [
    { code: 'en', label: 'EN' },
    { code: 'fr', label: 'FR' },
    { code: 'ar', label: 'ع' },
  ];

  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-presbyta-950/60 border-b border-white/10">
      <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center gap-6">
        <button onClick={() => setPage('simulator')} className="cursor-pointer">
          <Logo />
        </button>

        <nav className="hidden md:flex items-center gap-1 ms-6">
          <NavLink active={page === 'simulator'} onClick={() => setPage('simulator')}>
            {t('nav.simulator')}
          </NavLink>
          <NavLink active={page === 'about'} onClick={() => setPage('about')}>
            {t('nav.about')}
          </NavLink>
        </nav>

        <div className="ms-auto flex items-center gap-2">
          {/* Mode toggle */}
          <div className="hidden sm:flex items-center bg-white/5 border border-white/10 rounded-lg p-1">
            <ModePill active={mode === 'laboratory'} onClick={() => setMode('laboratory')} icon={<FlaskConical size={14} />}>
              {t('modes.laboratory')}
            </ModePill>
            <ModePill active={mode === 'patient'} onClick={() => setMode('patient')} icon={<User2 size={14} />}>
              {t('modes.patient')}
            </ModePill>
          </div>

          {/* Language */}
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-1">
            <Languages size={14} className="text-white/50 mx-1" />
            {langs.map((l) => (
              <button
                key={l.code}
                onClick={() => setLanguage(l.code)}
                className={`px-2 py-0.5 text-xs font-semibold rounded ${
                  language === l.code
                    ? 'bg-gold-gradient text-presbyta-950'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>

          {/* Theme */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="btn-ghost !p-2"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </div>
    </header>
  );
}

function NavLink({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
        active
          ? 'bg-white/10 text-white'
          : 'text-white/60 hover:text-white hover:bg-white/5'
      }`}
    >
      {children}
    </button>
  );
}

function ModePill({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition ${
        active
          ? 'bg-gold-gradient text-presbyta-950 shadow-gold-glow'
          : 'text-white/60 hover:text-white'
      }`}
    >
      {icon}
      {children}
    </button>
  );
}
