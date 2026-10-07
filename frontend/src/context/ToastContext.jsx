import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Clear toasts when user clicks or presses a key
  React.useEffect(() => {
    const handleAction = () => {
      if (toasts.length > 0) {
        clearAllToasts();
      }
    };
    window.addEventListener('mousedown', handleAction);
    window.addEventListener('keydown', handleAction);
    return () => {
      window.removeEventListener('mousedown', handleAction);
      window.removeEventListener('keydown', handleAction);
    };
  }, [toasts.length, clearAllToasts]);

  const showToast = useCallback((message, type = 'info', duration = 2500) => {
    const id = Date.now() + Math.random().toString(36).substr(2, 5);
    // Overwrite existing toasts instead of appending
    setToasts([{ id, message, type }]);

    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, [removeToast]);

  // Toast tones map onto the same three semantic tokens used everywhere else.
  const TONE = {
    success: { icon: CheckCircle2, cls: 'border-pass-200 bg-pass-50 text-pass-700 dark:border-pass-600/40 dark:bg-pass-600/15 dark:text-pass-200' },
    error: { icon: AlertCircle, cls: 'border-stop-200 bg-stop-50 text-stop-700 dark:border-stop-600/40 dark:bg-stop-600/15 dark:text-stop-200' },
    warning: { icon: AlertTriangle, cls: 'border-caution-200 bg-caution-50 text-caution-700 dark:border-caution-600/40 dark:bg-caution-600/15 dark:text-caution-200' },
    info: { icon: Info, cls: 'border-primary-200 bg-primary-50 text-primary-800 dark:border-primary-800 dark:bg-primary-950/40 dark:text-primary-200' },
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toasts — fixed top-right, announced politely to assistive tech */}
      <div
        className="pointer-events-none fixed right-4 top-20 z-50 flex w-full max-w-sm flex-col gap-2"
        role="status"
        aria-live="polite"
      >
        {toasts.map((toast) => {
          const tone = TONE[toast.type] || TONE.info;
          const Icon = tone.icon;
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex animate-slide-down items-start gap-2.5 rounded-control border p-3.5 shadow-pop ${tone.cls}`}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p className="min-w-0 flex-1 text-xs font-medium leading-snug">{toast.message}</p>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="shrink-0 opacity-60 transition-opacity hover:opacity-100"
                aria-label="Dismiss notification"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
};
