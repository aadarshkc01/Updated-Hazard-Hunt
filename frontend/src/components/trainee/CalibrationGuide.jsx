import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

export const CalibrationGuide = ({
  rotationProgress = 0,
  hasTargetBeenFound = false,
  onStartRealSweep,
  onSkipCalibration,
}) => {
  const rotationAchieved = rotationProgress >= 100;
  const isAllReady = rotationAchieved && hasTargetBeenFound;

  return (
    <div className="w-full mb-4 animate-fade-in">
      <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-sm border border-mist-200 dark:border-dark-border transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-primary-500">
                  Pre-Sweep Calibration
                </span>
                <span className="text-xs text-mist-500 dark:text-dark-muted font-medium">
                  | No Timer Active
                </span>
              </div>
              <h3 className="text-lg font-bold text-mist-900 dark:text-white mt-1">
                Practice 360° Gestures & Hazard Spotting
              </h3>
              <p className="text-sm text-mist-600 dark:text-dark-muted mt-1">
                Complete these two demo exercises to get comfortable before your official test starts.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onSkipCalibration}
              className="px-4 py-2 text-sm font-semibold text-mist-500 hover:text-mist-900 dark:hover:text-white transition-colors"
            >
              Skip Tutorial
            </button>
            <button
              onClick={onStartRealSweep}
              disabled={!isAllReady}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                isAllReady
                  ? 'bg-primary-500 hover:bg-primary-600 text-white shadow-sm'
                  : 'bg-mist-200 dark:bg-dark-surface text-mist-500 dark:text-dark-muted cursor-not-allowed'
              }`}
            >
              {isAllReady ? 'Begin Official Sweep' : 'Complete Tasks Below'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-mist-200 dark:border-dark-border">
          <div className="p-5 rounded-xl border border-mist-200 dark:border-dark-border">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-mist-900 dark:text-white">
                Task 1: Rotate View (Drag or Arrow Keys)
              </span>
              {rotationAchieved ? (
                <span className="inline-flex items-center space-x-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Calibrated</span>
                </span>
              ) : (
                <span className="text-xs font-mono font-bold text-mist-500">
                  {Math.min(100, Math.round(rotationProgress))}%
                </span>
              )}
            </div>
            <div className="w-full h-1.5 bg-mist-200 dark:bg-dark-border rounded-full overflow-hidden mb-3">
              <div
                className={`h-full transition-all duration-300 ${
                  rotationAchieved ? 'bg-emerald-500' : 'bg-primary-500'
                }`}
                style={{ width: `${Math.min(100, rotationProgress)}%` }}
              />
            </div>
            <p className="text-xs text-mist-600 dark:text-dark-muted">
              {rotationAchieved
                ? 'Excellent! You have adapted to 360° camera rotation.'
                : 'Drag your mouse horizontally or press Left/Right Arrow Keys to rotate.'}
            </p>
          </div>

          <div className="p-5 rounded-xl border border-mist-200 dark:border-dark-border">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-mist-900 dark:text-white">
                Task 2: Click the Practice Hazard
              </span>
              {hasTargetBeenFound ? (
                <span className="inline-flex items-center space-x-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Target Spotted</span>
                </span>
              ) : (
                <span className="text-xs font-bold text-primary-600 dark:text-primary-400">
                  Click Marker
                </span>
              )}
            </div>
            <p className="text-xs text-mist-600 dark:text-dark-muted leading-relaxed">
              {hasTargetBeenFound
                ? 'Spotting verified! Remember: in the official sweep, clicking safe areas causes a 5% false click penalty.'
                : 'Look near the center pallet for the pulsing marker and click it.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
