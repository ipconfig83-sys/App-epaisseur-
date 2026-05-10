import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSimulatorStore } from '@/store/useSimulatorStore';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import DisclaimerBanner from '@/components/layout/DisclaimerBanner';
import SimulatorPage from '@/pages/SimulatorPage';
import AboutPage from '@/pages/AboutPage';

export default function App() {
  const { theme, language, page } = useSimulatorStore();
  const { i18n } = useTranslation();

  // Sync theme to <html> class
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('light', theme === 'light');
    root.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Sync language + RTL direction
  useEffect(() => {
    i18n.changeLanguage(language);
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language, i18n]);

  return (
    <div className="min-h-screen flex flex-col">
      <DisclaimerBanner />
      <Header />
      <main className="flex-1">
        {page === 'simulator' ? <SimulatorPage /> : <AboutPage />}
      </main>
      <Footer />
    </div>
  );
}
