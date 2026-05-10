import { motion } from 'framer-motion';

interface LogoProps {
  size?: number;
  showWordmark?: boolean;
}

export default function Logo({ size = 36, showWordmark = true }: LogoProps) {
  return (
    <div className="flex items-center gap-3 select-none">
      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        initial={{ rotate: -10, opacity: 0 }}
        animate={{ rotate: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 120, damping: 14 }}
      >
        <defs>
          <linearGradient id="logo-grad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#ecc154" />
            <stop offset="1" stopColor="#c98a1f" />
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r="29" stroke="url(#logo-grad)" strokeWidth="2.4" fill="rgba(15,37,71,0.6)" />
        <ellipse cx="32" cy="32" rx="20" ry="11" stroke="url(#logo-grad)" strokeWidth="1.8" fill="none" />
        <ellipse cx="32" cy="32" rx="9" ry="11" stroke="url(#logo-grad)" strokeWidth="1.4" fill="none" />
        <circle cx="32" cy="32" r="2.2" fill="url(#logo-grad)" />
      </motion.svg>
      {showWordmark && (
        <div className="leading-tight">
          <div className="font-display font-extrabold tracking-[0.22em] text-base text-white">
            PRESBYTA
          </div>
          <div className="text-[10px] tracking-[0.3em] uppercase text-gold-300/80">
            Ophthalmic Lenses
          </div>
        </div>
      )}
    </div>
  );
}
