import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  title?: string;
  icon?: ReactNode;
  actions?: ReactNode;
}

export default function GlassCard({
  children,
  className = '',
  delay = 0,
  title,
  icon,
  actions,
}: GlassCardProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
      className={`glass-card p-5 ${className}`}
    >
      {(title || actions) && (
        <header className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {icon && <span className="text-gold-300">{icon}</span>}
            {title && (
              <h2 className="section-title !mb-0">{title}</h2>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      {children}
    </motion.section>
  );
}
