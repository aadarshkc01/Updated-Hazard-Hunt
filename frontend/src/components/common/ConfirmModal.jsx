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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-mist-950/55 p-4 animate-fade-in"
      role="presentation"
    >
      <div
        className="app-card w-full max-w-[440px] animate-slide-up p-6 sm:p-7"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
      >
        <div className="flex items-start gap-4">
          <div className="app-icon-well h-10 w-10">
            <AlertCircle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className={`app-eyebrow ${isDestructive ? 'text-stop-600 dark:text-stop-200' : ''}`}>
              Confirm action
            </p>
            <h3
              id="confirm-dialog-title"
              className="mt-1 text-lg font-bold leading-tight text-mist-900 dark:text-dark-text"
            >
              {title}
            </h3>
          </div>
        </div>

        <p id="confirm-dialog-message" className="app-body mt-4 text-sm">
          {message}
        </p>

        <div className="app-divider mt-6 flex flex-col-reverse gap-2 pt-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            ref={cancelButtonRef}
            className="app-btn app-btn-secondary w-full sm:w-auto"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`app-btn w-full text-white sm:w-auto ${
              isDestructive ? 'app-btn-danger' : 'app-btn-primary'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
