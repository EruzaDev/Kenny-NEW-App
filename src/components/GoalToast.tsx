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
      className="pointer-events-none fixed inset-x-0 top-[calc(max(0.75rem,env(safe-area-inset-top))+4.25rem)] z-40 flex justify-center px-3 sm:px-4"
    >
      <AnimatePresence>
        {notice && (
          <motion.div
            key={notice.id}
            initial={{ opacity: 0, y: -16, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            className="flex max-w-[calc(100vw-1.5rem)] items-center gap-3 rounded-2xl border border-emerald-500/40 bg-[var(--bg-surface)]/96 px-3.5 py-2.5 shadow-[var(--shadow-tinted)] backdrop-blur-xl sm:max-w-md sm:px-4 sm:py-3"
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
              <p className="truncate text-xs font-bold text-[var(--text-primary)] sm:text-sm">
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
