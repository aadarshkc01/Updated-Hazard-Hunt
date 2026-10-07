import React, { useState } from 'react';
import { ConfirmModal } from '../common/ConfirmModal';
import { Clock, ChevronRight } from 'lucide-react';

const formatTime = (seconds) => {
  const mins = Math.floor(Math.max(0, seconds) / 60);
  const secs = Math.max(0, seconds) % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

/**
 * Session bar shown above the inspection view.
 *
 * Note the three-way control set: "Proceed to quiz" completes the attempt,
 * while "Cancel session" discards it entirely. Both are always reachable, so a
 * trainee is never trapped in a run they need to stop.
 */
export const TraineeSessionHUD = ({
  timeLeft,
  totalTime,
  foundCount,
  totalHazards,
  falseClicks,
  onFinishEarly,
  onCancel,
  isPracticeMode,
  trainingMode,
}) => {
  const [showConfirmFinish, setShowConfirmFinish] = useState(false);

  const pct = totalTime ? Math.max(0, (timeLeft / totalTime) * 100) : 0;
  const isUrgent = timeLeft <= 15;
  const isWarning = timeLeft <= 30 && timeLeft > 15;
  const allFound = foundCount === totalHazards;
  const remaining = Math.max(0, totalHazards - foundCount);

  const handleFinishClick = () => {
    if (allFound) onFinishEarly();
    else setShowConfirmFinish(true);
  };

  return (
    <>
      <div className="app-card mb-4 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 p-4">
          {/* Module */}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="app-section-title">Bay 4 Inbound Logistics</p>
              {isPracticeMode && <span className="app-chip app-chip-caution">Practice</span>}
            </div>
            <p className="app-body mt-0.5">
              {trainingMode === 'walkthrough' ? 'First-person inspection' : '360° perception sweep'}
            </p>
          </div>

          {/* Live metrics */}
          <div className="flex items-center gap-6">
            <div>
              <p className="app-eyebrow">Hazards spotted</p>
              <p className="app-num text-lg font-bold leading-tight text-mist-900 dark:text-dark-text">
                {foundCount}
                <span className="text-xs font-normal text-mist-400"> / {totalHazards}</span>
              </p>
            </div>
            <div className="border-l border-mist-200 pl-6 dark:border-dark-border">
              <p className="app-eyebrow">False clicks</p>
              <p
                className={`app-num text-lg font-bold leading-tight ${
                  falseClicks > 0
                    ? 'text-stop-600 dark:text-stop-200'
                    : 'text-mist-400 dark:text-dark-muted'
                }`}
              >
                {falseClicks}
              </p>
            </div>
            <div
              className={`flex items-center gap-2 rounded-control border px-3 py-1.5 ${
                isUrgent
                  ? 'border-stop-600 bg-stop-50 dark:bg-stop-600/10'
                  : isWarning
                    ? 'border-caution-200 bg-caution-50 dark:bg-caution-600/10'
                    : 'border-mist-200 bg-mist-50 dark:border-dark-border dark:bg-dark-surface'
              }`}
            >
              <Clock
                className={`h-4 w-4 ${
                  isUrgent
                    ? 'text-stop-600 dark:text-stop-200'
                    : isWarning
                      ? 'text-caution-600 dark:text-caution-200'
                      : 'text-mist-500 dark:text-dark-muted'
                }`}
                aria-hidden="true"
              />
              <span
                className={`app-num text-base font-bold ${
                  isUrgent
                    ? 'text-stop-700 dark:text-stop-200'
                    : isWarning
                      ? 'text-caution-700 dark:text-caution-200'
                      : 'text-mist-900 dark:text-dark-text'
                }`}
              >
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>

          {/* Finish and Cancel sit side by side: complete the attempt, or
              discard it. Neither is hidden behind the other. */}
          <div className="flex flex-wrap items-center gap-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="app-btn app-btn-secondary"
                title="Discard this attempt and return to the dashboard (Esc)"
              >
                Cancel session
              </button>
            )}
            <button
              type="button"
              onClick={handleFinishClick}
              className="app-btn app-btn-primary"
            >
              {allFound ? 'Proceed to quiz' : 'Finish early'}
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Depletion bar */}
        <div className="app-meter rounded-none">
          <div
            className={
              isUrgent ? 'app-meter-fill-stop' : isWarning ? 'bg-caution-600' : 'app-meter-fill'
            }
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <ConfirmModal
        isOpen={showConfirmFinish}
        title="Finish this inspection early?"
        message={`You have spotted ${foundCount} of ${totalHazards} hazards with ${formatTime(
          timeLeft
        )} remaining. ${
          remaining === 1 ? '1 hazard is' : `${remaining} hazards are`
        } still hidden and will be graded as missed.`}
        confirmText="Proceed to quiz"
        cancelText="Resume sweep"
        onConfirm={() => {
          setShowConfirmFinish(false);
          onFinishEarly();
        }}
        onCancel={() => setShowConfirmFinish(false)}
      />
    </>
  );
};