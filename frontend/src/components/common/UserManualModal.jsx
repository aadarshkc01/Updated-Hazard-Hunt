import React from 'react';
import { X } from 'lucide-react';

export const UserManualModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-mist-900/50 animate-fade-in">
      <div className="bg-white dark:bg-dark-card rounded-xl shadow-2xl max-w-lg w-full border border-mist-300 dark:border-dark-border overflow-hidden animate-slide-up">
        <div className="px-6 py-5 border-b border-mist-200 dark:border-dark-border flex items-start justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-primary-500">Employee quick start</p>
            <h2 className="text-xl font-bold text-mist-900 dark:text-white mt-1">Hazard Hunt 360°</h2>
          </div>
          <button onClick={onClose} aria-label="Close manual" className="p-1.5 text-mist-500 hover:text-mist-900 dark:hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-5 text-sm text-mist-700 dark:text-dark-muted">
          <section>
            <h3 className="text-sm font-bold text-mist-900 dark:text-white">1. Complete the inspection</h3>
            <p className="mt-1.5 leading-relaxed">Rotate the warehouse view, find the five hazards, and click each one. The timed official inspection starts after calibration.</p>
          </section>
          <section>
            <h3 className="text-sm font-bold text-mist-900 dark:text-white">2. Avoid false clicks</h3>
            <p className="mt-1.5 leading-relaxed">Drag to look around. Click only when you are sure an object is hazardous. Safe-area clicks reduce your hazard score.</p>
          </section>
          <section>
            <h3 className="text-sm font-bold text-mist-900 dark:text-white">3. Complete the quiz</h3>
            <p className="mt-1.5 leading-relaxed">Answer the four HSE questions after the inspection. A composite score of 75% or higher is required to pass.</p>
          </section>
          <div className="border-l-2 border-primary-500 bg-mist-100 dark:bg-dark-surface px-4 py-3 text-xs leading-relaxed">
            Your official result is saved for your HSE supervisor. Practice sessions are available from the employee dashboard and do not replace your official result.
          </div>
        </div>
        <div className="px-6 py-4 border-t border-mist-200 dark:border-dark-border flex justify-end">
          <button onClick={onClose} className="px-5 py-2.5 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-xs font-bold">Close</button>
        </div>
      </div>
    </div>
  );
};
