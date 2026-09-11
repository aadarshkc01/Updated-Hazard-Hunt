import React, { useState } from 'react';
import { ConfirmModal } from '../common/ConfirmModal';
import { Clock, Target, AlertTriangle, ChevronRight } from 'lucide-react';

export const TraineeSessionHUD = ({
  timeLeft,
  totalTime,
  foundCount,
  totalHazards,
  falseClicks,
  onFinishEarly,
  isPracticeMode,
}) => {
  const [showConfirmFinish, setShowConfirmFinish] = useState(false);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const timePercentage = Math.max(0, (timeLeft / totalTime) * 100);
  const isUrgent = timeLeft <= 15;
  const isWarning = timeLeft <= 30 && timeLeft > 15;

  const timerColorClass = isUrgent
    ? 'text-red-500 bg-red-950/70 border-red-500/80 animate-pulse'
    : isWarning
    ? 'text-amber-400 bg-amber-950/70 border-amber-500/80'
    : 'text-white bg-dark-card/90 border-white/20';

  const handleFinishClick = () => {
    if (foundCount === totalHazards) {
      onFinishEarly();
    } else {
      setShowConfirmFinish(true);
    }
  };

  return (
    <>
      <div className="w-full mb-4">
        {/* HUD Bar */}
        <div className="bg-dark-card/90 text-white rounded-3xl p-4 sm:p-5 shadow-2xl border border-dark-border backdrop-blur-xl flex flex-wrap items-center justify-between gap-4">
          {/* Left: Module Tag */}
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-2xl bg-violet-600/30 border border-violet-500 flex items-center justify-center text-violet-400">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold tracking-tight text-white">
                  Bay 4 Inbound Logistics
                </span>
                {isPracticeMode && (
                  <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    Practice
                  </span>
                )}
              </div>
              <p className="text-xs text-dark-muted font-medium">
                360° Safety Perception Sweep
              </p>
            </div>
          </div>

          {/* Center: Live Inspection Metrics */}
          <div className="flex items-center space-x-6">
            {/* Hazards Found Counter */}
            <div className="flex items-center space-x-2.5">
              <div className="text-right">
                <span className="text-[10px] uppercase tracking-wider text-dark-muted font-bold block">
                  Hazards Spotted
                </span>
                <span className="text-lg font-black text-emerald-400 font-mono">
                  {foundCount} <span className="text-xs text-dark-muted font-normal">/ {totalHazards}</span>
                </span>
              </div>
              <div className="w-9 h-9 rounded-full border-2 border-emerald-500/30 flex items-center justify-center">
                <span className="text-xs font-bold text-emerald-400">
                  {Math.round((foundCount / totalHazards) * 100)}%
                </span>
              </div>
            </div>

            {/* False Clicks Counter */}
            <div className="hidden sm:flex items-center space-x-2 border-l border-dark-border pl-6">
              <div className="text-right">
                <span className="text-[10px] uppercase tracking-wider text-dark-muted font-bold block">
                  False Clicks
                </span>
                <span className={`text-lg font-black font-mono ${falseClicks > 0 ? 'text-red-400' : 'text-gray-300'}`}>
                  {falseClicks}
                </span>
              </div>
            </div>

            {/* Countdown Timer */}
            <div className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl border backdrop-blur-md transition-all ${timerColorClass}`}>
              <Clock className={`w-4 h-4 ${isUrgent ? 'animate-spin' : ''}`} />
              <div className="font-mono text-base font-extrabold tracking-wider">
                {formatTime(timeLeft)}
              </div>
            </div>
          </div>

          {/* Right: Proceed Button */}
          <div>
            <button
              onClick={handleFinishClick}
              className="px-5 py-2.5 rounded-xl bg-violet-500 hover:bg-violet-600 text-white text-xs font-bold transition-all shadow-violet hover:shadow-violet-lg flex items-center space-x-2"
            >
              <span>{foundCount === totalHazards ? 'Proceed to Quiz' : 'Finish Sweep Early'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress Line */}
        <div className="w-full h-1.5 bg-dark-surface rounded-full mt-2 overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ${
              isUrgent ? 'bg-red-500' : isWarning ? 'bg-amber-400' : 'bg-violet-500'
            }`}
            style={{ width: `${timePercentage}%` }}
          />
        </div>
      </div>

      {/* Early Finish Confirmation Modal */}
      <ConfirmModal
        isOpen={showConfirmFinish}
        title="Complete Inspection Sweep Early?"
        message={`You have spotted ${foundCount} of ${totalHazards} hazards with ${formatTime(
          timeLeft
        )} remaining. Undetected hazards will be graded as missed. Proceed to the safety knowledge quiz?`}
        confirmText="Proceed to Quiz"
        cancelText="Resume Sweep"
        isDestructive={false}
        onConfirm={() => {
          setShowConfirmFinish(false);
          onFinishEarly();
        }}
        onCancel={() => setShowConfirmFinish(false)}
      />
    </>
  );
};
