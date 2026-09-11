import React, { useState } from 'react';
import {
  Compass,
  Target,
  CheckCircle2,
  ArrowRight,
  Move,
  MousePointer,
  AlertTriangle,
  Play,
  SkipForward,
} from 'lucide-react';

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
      <div className="bg-white dark:bg-dark-card rounded-3xl p-5 sm:p-6 shadow-xl border border-mist-300 dark:border-dark-border transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Header */}
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-violet-500 text-white flex items-center justify-center shadow-violet flex-shrink-0">
              <Compass className="w-6 h-6 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full text-2xs font-extrabold uppercase tracking-wider bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                  Pre-Sweep Calibration Sandbox
                </span>
                <span className="text-xs text-mist-600 dark:text-dark-muted font-medium">
                  No Timer Active
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-mist-950 dark:text-white mt-0.5">
                Practice 360 Gestures & Hazard Spotting
              </h3>
              <p className="text-xs text-mist-700 dark:text-dark-muted">
                Complete these two demo exercises to get comfortable before your official timed test starts.
              </p>
            </div>
          </div>

          {/* Action to Start Real Sweep */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onSkipCalibration}
              className="px-4 py-2 text-xs font-bold text-mist-600 dark:text-dark-muted hover:text-mist-950 dark:hover:text-white transition-colors"
            >
              Skip Tutorial
            </button>
            <button
              onClick={onStartRealSweep}
              disabled={!isAllReady}
              className={`px-6 py-3 rounded-2xl text-xs font-bold transition-all flex items-center space-x-2 shadow-lg ${
                isAllReady
                  ? 'bg-violet-500 hover:bg-violet-600 text-white shadow-violet hover:shadow-violet-lg animate-pulse'
                  : 'bg-mist-300 dark:bg-dark-surface text-mist-600 dark:text-dark-muted cursor-not-allowed'
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{isAllReady ? 'Begin Official Timed Sweep' : 'Complete 2 Tasks Below'}</span>
            </button>
          </div>
        </div>

        {/* 2 Interactive Sandbox Checklist Tasks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5 pt-5 border-t border-mist-200 dark:border-dark-border">
          {/* TASK 1: Camera Rotation */}
          <div
            className={`p-4 rounded-2xl border transition-all ${
              rotationAchieved
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                : 'bg-mist-100 dark:bg-dark-surface border-mist-300 dark:border-dark-border'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold flex items-center space-x-2 text-mist-950 dark:text-white">
                <Move className="w-4 h-4 text-violet-500" />
                <span>Task 1: Rotate View (Click & Drag or Arrow Keys)</span>
              </span>
              {rotationAchieved ? (
                <span className="inline-flex items-center space-x-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Calibrated</span>
                </span>
              ) : (
                <span className="text-2xs font-mono font-bold text-mist-500 dark:text-dark-muted">
                  {Math.min(100, Math.round(rotationProgress))}%
                </span>
              )}
            </div>

            {/* Rotation progress bar */}
            <div className="w-full h-2 bg-mist-300 dark:bg-dark-border rounded-full overflow-hidden mb-2">
              <div
                className={`h-full transition-all duration-300 ${
                  rotationAchieved ? 'bg-emerald-500' : 'bg-violet-500'
                }`}
                style={{ width: `${Math.min(100, rotationProgress)}%` }}
              />
            </div>

            <p className="text-2xs text-mist-700 dark:text-dark-muted">
              {rotationAchieved
                ? '✓ Excellent! You have adapted to 360° camera rotation.'
                : 'Drag your mouse horizontally or press Left/Right Arrow Keys to rotate.'}
            </p>
          </div>

          {/* TASK 2: Click Hazard */}
          <div
            className={`p-4 rounded-2xl border transition-all ${
              hasTargetBeenFound
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                : 'bg-mist-100 dark:bg-dark-surface border-mist-300 dark:border-dark-border'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold flex items-center space-x-2 text-mist-950 dark:text-white">
                <MousePointer className="w-4 h-4 text-violet-500" />
                <span>Task 2: Click the Practice Hazard Target</span>
              </span>
              {hasTargetBeenFound ? (
                <span className="inline-flex items-center space-x-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Target Spotted</span>
                </span>
              ) : (
                <span className="text-2xs font-bold text-amber-600 dark:text-amber-400 animate-pulse">
                  Click Glowing Marker
                </span>
              )}
            </div>

            <p className="text-2xs text-mist-700 dark:text-dark-muted leading-relaxed">
              {hasTargetBeenFound
                ? '✓ Spotting verified! Remember: in the official sweep, clicking safe areas causes a 5% false click penalty.'
                : 'Look near the center pallet for the pulsing purple marker and click it.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
