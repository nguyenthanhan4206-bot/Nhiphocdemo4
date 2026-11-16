import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Bell, BookOpen, CheckCheck, MessageSquareText, X } from 'lucide-react';

export type ToastCategory = 'assignment' | 'graded' | 'message' | 'info';

export interface NhiphocToast {
  id: string;
  category: ToastCategory;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  createdAtMs: number;
}

interface ToastViewportProps {
  toasts: NhiphocToast[];
  dark?: boolean;
  onDismiss: (id: string) => void;
}

const ToastItem: React.FC<{
  toast: NhiphocToast;
  dark: boolean;
  onDismiss: (id: string) => void;
}> = ({ toast, dark, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 6500);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const Icon =
    toast.category === 'assignment'
      ? BookOpen
      : toast.category === 'graded'
        ? CheckCheck
        : toast.category === 'message'
          ? MessageSquareText
          : Bell;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className={`pointer-events-auto w-full rounded-2xl border p-4 shadow-[0_16px_40px_-16px_rgba(35,30,24,0.22)] ${
        dark
          ? 'bg-[#221D17] border-[#3A3227] text-[#F7F2E7]'
          : 'bg-white border-[#E5DBC4] text-[#231E18]'
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            dark
              ? 'bg-[#C45A15]/25 text-[#E6B87D]'
              : toast.category === 'graded'
                ? 'bg-[#C45A15] text-white'
                : 'bg-[#FDF3D0] text-[#C45A15]'
          }`}
        >
          <Icon className="w-4 h-4" />
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-bold leading-snug">{toast.title}</p>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className={`p-1 -m-1 rounded-lg transition-colors shrink-0 ${
                dark
                  ? 'text-[#C8BCAA] hover:bg-[#2F2820] hover:text-white'
                  : 'text-[#6B6154] hover:bg-[#FDF3D0] hover:text-[#231E18]'
              }`}
              aria-label="Đóng thông báo"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <p
            className={`text-xs leading-relaxed line-clamp-2 ${
              dark ? 'text-[#DCD1BF]' : 'text-[#5C5347]'
            }`}
          >
            {toast.message}
          </p>

          {toast.actionLabel && toast.onAction && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  toast.onAction?.();
                  onDismiss(toast.id);
                }}
                className={`text-xs font-bold hover:underline ${
                  dark ? 'text-[#E6B87D]' : 'text-[#C45A15]'
                }`}
              >
                {toast.actionLabel} →
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export const ToastViewport: React.FC<ToastViewportProps> = ({
  toasts,
  dark = false,
  onDismiss,
}) => {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 left-4 sm:left-auto z-50 sm:w-[360px] flex flex-col gap-2.5 pointer-events-none"
      aria-label="Thông báo NhịpHọc"
    >
      <AnimatePresence initial={false}>
        {toasts.slice(0, 3).map((toast) => (
          <ToastItem key={toast.id} toast={toast} dark={dark} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
};
