"use client";

import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import type { ToastState } from '@/hooks/useLotoEngine';

const TONES = {
  success: { icon: CheckCircle2, className: 'text-success' },
  info: { icon: Info, className: 'text-primary-soft' },
  error: { icon: AlertTriangle, className: 'text-danger' },
} as const;

export function Toast({ toast }: { toast: ToastState | null }) {
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-5 z-50 flex justify-center px-4">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.message}
            initial={{ opacity: 0, y: -14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="panel flex max-w-[92vw] items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-ink"
          >
            {(() => {
              const { icon: Icon, className } = TONES[toast.tone];
              return <Icon className={`h-4 w-4 shrink-0 ${className}`} aria-hidden />;
            })()}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
