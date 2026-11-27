import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Radio, Sparkles } from 'lucide-react';

export interface ToastNotice {
  id: string;
  title: string;
  subtitle: string;
  variant: 'synced' | 'reached' | 'info';
}

interface GoalToastProps {
  notice: ToastNotice | null;
}

export function GoalToast({ notice }: GoalToastProps) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-20 z-40 flex justify-center px-4 sm:top-22"
    >
      <AnimatePresence>
        {notice && (
          <motion.div
            key={notice.id}
            initial={{ opacity: 0, y: -18, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -14, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 420, damping: 26 }}
            className="flex items-center gap-3 rounded-2xl border border-emerald-500/40 bg-[var(--bg-surface)]/95 px-4 py-3 shadow-[var(--shadow-tinted)] backdrop-blur-xl"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              {notice.variant === 'reached' ? (
                <Sparkles className="h-5 w-5" aria-hidden="true" />
              ) : notice.variant === 'synced' ? (
                <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Radio className="h-5 w-5" aria-hidden="true" />
              )}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[var(--text-primary)] sm:text-sm">
                {notice.title}
              </p>
              <p className="truncate text-[11px] text-[var(--text-secondary)] sm:text-xs">
                {notice.subtitle}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
