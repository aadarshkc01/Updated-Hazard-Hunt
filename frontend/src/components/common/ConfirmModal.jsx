import React from 'react';
import { AlertTriangle, HelpCircle, X } from 'lucide-react';

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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-dark-card rounded-3xl shadow-2xl max-w-md w-full border border-mist-300 dark:border-dark-border p-6 sm:p-7 relative overflow-hidden transition-all animate-slide-up">
        {/* Close Button */}
        <button
          onClick={onCancel}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon & Title */}
        <div className="flex items-center space-x-3.5 mb-3">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${
              isDestructive
                ? 'bg-red-50 dark:bg-red-950/50 text-red-600 border border-red-200 dark:border-red-900/50'
                : 'bg-violet-50 dark:bg-violet-950/50 text-violet-500 border border-violet-200 dark:border-violet-900/50'
            }`}
          >
            {isDestructive ? <AlertTriangle className="w-5 h-5" /> : <HelpCircle className="w-5 h-5" />}
          </div>
          <h3 className="text-lg font-bold text-mist-900 dark:text-dark-text tracking-tight">
            {title}
          </h3>
        </div>

        {/* Message */}
        <p className="text-xs sm:text-sm text-gray-600 dark:text-dark-muted mb-6 leading-relaxed">
          {message}
        </p>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-2.5 pt-4 border-t border-mist-200 dark:border-dark-border">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-mist-200 dark:hover:bg-dark-surface transition-all"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-md ${
              isDestructive
                ? 'bg-red-600 hover:bg-red-700 shadow-red-500/20'
                : 'bg-violet-500 hover:bg-violet-600 shadow-violet'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
