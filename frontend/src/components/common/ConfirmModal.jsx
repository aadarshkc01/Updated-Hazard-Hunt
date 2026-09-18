import React, { useEffect, useRef } from 'react';
import { AlertCircle } from 'lucide-react';

export const ConfirmModal = ({
  isOpen,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
  onConfirm,
  onCancel,
}) => {
  const cancelButtonRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onCancel();
    };

    document.addEventListener('keydown', handleKeyDown);
    cancelButtonRef.current?.focus();
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-mist-950/55 backdrop-blur-[2px] animate-fade-in" role="presentation">
      <div
        className="app-card w-full max-w-[440px] p-6 sm:p-7 animate-slide-up"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
      >
        <div className="flex items-start gap-5">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border ${isDestructive ? 'border-red-200 bg-red-50 text-red-600 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300' : 'border-primary-200 bg-primary-50 text-primary-600 dark:border-primary-900/60 dark:bg-primary-950/30 dark:text-primary-300'}`}>
            <AlertCircle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 pt-0.5">
            <p className={`text-[10px] font-bold uppercase tracking-[0.16em] ${isDestructive ? 'text-red-600 dark:text-red-300' : 'text-primary-600 dark:text-primary-300'}`}>
              Confirm action
            </p>
            <h3 id="confirm-dialog-title" className="mt-1 text-lg font-bold leading-tight text-mist-900 dark:text-dark-text">
              {title}
            </h3>
          </div>
        </div>

        <p id="confirm-dialog-message" className="mt-5 pl-16 text-sm leading-6 text-mist-600 dark:text-dark-muted">
          {message}
        </p>

        <div className="mt-6 flex flex-col-reverse gap-2 border-t border-mist-200 pt-5 dark:border-dark-border sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            ref={cancelButtonRef}
            className="app-action w-full border border-mist-300 bg-white text-mist-800 hover:bg-mist-100 dark:border-dark-border dark:bg-dark-card dark:text-dark-text dark:hover:bg-dark-surface sm:w-auto"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`app-action w-full text-white sm:w-auto ${
              isDestructive
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-primary-500 hover:bg-primary-600'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
