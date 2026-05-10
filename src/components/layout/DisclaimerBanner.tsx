import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { useSimulatorStore } from '@/store/useSimulatorStore';

export default function DisclaimerBanner() {
  const { t } = useTranslation();
  const { disclaimerAcknowledged, acknowledgeDisclaimer } = useSimulatorStore();
  const [hidden, setHidden] = useState(false);

  if (disclaimerAcknowledged || hidden) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -20, opacity: 0 }}
        className="bg-gradient-to-r from-amber-500/10 via-gold-500/10 to-amber-500/10 border-b border-gold-400/30 backdrop-blur-md"
      >
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-2 flex items-center gap-3 text-[12px]">
          <AlertTriangle size={14} className="text-gold-300 shrink-0" />
          <span className="text-gold-100/90 leading-snug flex-1">
            {t('disclaimer.short')}
          </span>
          <button
            onClick={() => {
              acknowledgeDisclaimer();
              setHidden(true);
            }}
            className="hidden sm:inline-flex btn-ghost !py-1 !px-2 text-[11px]"
          >
            {t('disclaimer.accept')}
          </button>
          <button
            onClick={() => setHidden(true)}
            className="text-white/50 hover:text-white"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
