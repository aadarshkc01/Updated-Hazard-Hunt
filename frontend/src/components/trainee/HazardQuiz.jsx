import React, { useState } from 'react';
import { soundEngine } from '../../utils/audio';
import { ConfirmModal } from '../common/ConfirmModal';
import { FileQuestion, ArrowRight, ArrowLeft, ShieldCheck } from 'lucide-react';

export const HazardQuiz = ({
  questions = [],
  onComplete,
  isSubmitting = false,
  onBack,
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [showConfirmBack, setShowConfirmBack] = useState(false);

  const currentQ = questions[currentQuestionIndex];
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(answers).length;
  const allAnswered = totalQuestions > 0 && answeredCount === totalQuestions;

  const handleSelectOption = (optionIndex) => {
    soundEngine.playTick();
    setAnswers((prev) => ({ ...prev, [currentQ.id]: optionIndex }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      soundEngine.playTick();
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
      soundEngine.playTick();
    }
  };

  const executeSubmit = () => {
    soundEngine.playSuccess();
    onComplete(
      Object.entries(answers).map(([questionId, selectedOption]) => ({
        questionId,
        selectedOption,
      }))
    );
  };

  if (!currentQ) {
    return (
      <div className="app-page py-6">
        <div className="app-card p-8 text-center">
          <p className="app-body">No quiz questions are configured for this scenario.</p>
          <button
            type="button"
            onClick={() => onComplete([])}
            className="app-btn app-btn-primary mt-4"
          >
            Skip to results
          </button>
        </div>
      </div>
    );
  }

  const selectedOption = answers[currentQ.id];
  const answeredPct = totalQuestions ? (answeredCount / totalQuestions) * 100 : 0;

  return (
    <>
      <div className="app-page max-w-3xl animate-slide-up py-6">
        {/* ── Progress header ── */}
        <header className="app-card mb-4 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="app-icon-well h-10 w-10">
                <FileQuestion className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="app-eyebrow-accent">Regulatory knowledge check</p>
                <h1 className="mt-0.5 truncate text-lg font-bold text-mist-900 dark:text-dark-text">
                  Warehouse Safety Quiz
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="app-eyebrow">Answered</p>
                <p className="app-num mt-0.5 text-lg font-bold leading-none text-mist-900 dark:text-dark-text">
                  {answeredCount}
                  <span className="text-xs font-normal text-mist-400"> / {totalQuestions}</span>
                </p>
              </div>
              {/* The quiz is part of a graded attempt, so leaving discards it. */}
              {onBack && (
                <button
                  type="button"
                  onClick={() => setShowConfirmBack(true)}
                  className="app-btn app-btn-secondary app-btn-sm"
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  Back
                </button>
              )}
            </div>
          </div>
          <div className="app-meter rounded-none">
            <div className="app-meter-fill" style={{ width: `${answeredPct}%` }} />
          </div>
        </header>

        {/* ── Question ── */}
        <section className="app-card p-5 sm:p-7">
          <div className="mb-4 flex items-center justify-between gap-3">
            <span className="app-chip app-chip-brand">{currentQ.category || 'HSE Compliance'}</span>
            <span className="app-num text-xs font-semibold text-mist-500 dark:text-dark-muted">
              Question {currentQuestionIndex + 1} of {totalQuestions}
            </span>
          </div>

          <h2 className="mb-6 text-base font-bold leading-snug text-mist-900 sm:text-lg dark:text-dark-text">
            {currentQ.question}
          </h2>

          <div className="space-y-2.5">
            {currentQ.options.map((option, idx) => {
              const isSelected = selectedOption === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectOption(idx)}
                  aria-pressed={isSelected}
                  className={`flex w-full items-start gap-3 rounded-control border p-3.5 text-left ${
                    isSelected
                      ? 'border-primary-500 bg-primary-50 text-mist-900 ring-1 ring-primary-500 dark:bg-primary-950/30 dark:text-dark-text'
                      : 'border-mist-200 bg-white text-mist-700 hover:border-primary-400 dark:border-dark-border dark:bg-dark-surface dark:text-dark-text'
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                      isSelected
                        ? 'border-primary-500 bg-primary-500'
                        : 'border-mist-300 dark:border-dark-border'
                    }`}
                    aria-hidden="true"
                  >
                    {isSelected && <span className="h-2 w-2 rounded-full bg-white" />}
                  </span>
                  <span className="text-xs leading-relaxed sm:text-sm">{option}</span>
                </button>
              );
            })}
          </div>

          <div className="app-divider mt-6 flex items-center justify-between gap-3 pt-5">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentQuestionIndex === 0}
              className="app-btn app-btn-ghost disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>

            {currentQuestionIndex < totalQuestions - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={selectedOption === undefined}
                className="app-btn app-btn-primary disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next question
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowConfirmSubmit(true)}
                disabled={!allAnswered || isSubmitting}
                className="app-btn app-btn-primary disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isSubmitting ? (
                  <>
                    <span className="app-spinner" aria-hidden="true" />
                    Submitting
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                    Submit quiz
                  </>
                )}
              </button>
            )}
          </div>
        </section>
      </div>

      <ConfirmModal
        isOpen={showConfirmSubmit}
        title="Submit this assessment?"
        message="Your hazard findings and quiz answers will be scored server-side against the official compliance standard. This cannot be undone."
        confirmText="Confirm & submit"
        cancelText="Review answers"
        onConfirm={() => {
          setShowConfirmSubmit(false);
          executeSubmit();
        }}
        onCancel={() => setShowConfirmSubmit(false)}
      />

      <ConfirmModal
        isOpen={showConfirmBack}
        title="Leave the quiz?"
        message="This attempt has not been submitted yet. Leaving now discards your hazard findings and quiz answers, and nothing will be recorded."
        confirmText="Discard & go back"
        cancelText="Stay on this question"
        isDestructive
        onConfirm={() => {
          setShowConfirmBack(false);
          onBack?.();
        }}
        onCancel={() => setShowConfirmBack(false)}
      />
    </>
  );
};