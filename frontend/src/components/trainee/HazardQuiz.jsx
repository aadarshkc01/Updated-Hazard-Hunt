import React, { useState } from 'react';
import { soundEngine } from '../../utils/audio';
import { ConfirmModal } from '../common/ConfirmModal';
import {
  FileQuestion,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Award,
} from 'lucide-react';

export const HazardQuiz = ({ questions = [], onComplete, isSubmitting = false }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);

  const currentQ = questions[currentQuestionIndex];
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === totalQuestions;

  const handleSelectOption = (optionIndex) => {
    soundEngine.playTick();
    setAnswers((prev) => ({
      ...prev,
      [currentQ.id]: optionIndex,
    }));
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
    const formattedAnswers = Object.entries(answers).map(([questionId, selectedOption]) => ({
      questionId,
      selectedOption,
    }));
    onComplete(formattedAnswers);
  };

  if (!currentQ) {
    return (
      <div className="p-8 text-center bg-white dark:bg-dark-card rounded-3xl border border-mist-300 dark:border-dark-border">
        <p className="text-xs text-mist-600 dark:text-dark-muted">No quiz questions configured for this scenario.</p>
        <button
          onClick={() => onComplete([])}
          className="mt-4 px-4 py-2 bg-violet-500 text-white rounded-xl text-xs font-bold shadow-violet"
        >
          Skip to Diagnostic
        </button>
      </div>
    );
  }

  const selectedOption = answers[currentQ.id];

  return (
    <>
      <div className="max-w-3xl mx-auto py-6 animate-fade-in transition-colors duration-200">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-violet-700 via-violet-600 to-violet-800 text-white rounded-3xl p-6 sm:p-7 mb-6 shadow-xl border border-violet-500/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3.5">
              <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white">
                <FileQuestion className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-violet-200">
                  Regulatory Compliance Assessment (FR-07)
                </span>
                <h2 className="text-xl font-extrabold text-white">
                  Warehouse Safety Knowledge Quiz
                </h2>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-violet-200 font-medium block">Completed</span>
              <span className="text-xl font-mono font-bold text-white">
                {answeredCount} <span className="text-xs font-normal">/ {totalQuestions}</span>
              </span>
            </div>
          </div>

          <div className="w-full h-1.5 bg-violet-900/60 rounded-full mt-4 overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-300"
              style={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white dark:bg-dark-card rounded-3xl shadow-card dark:shadow-card-dark border border-mist-300 dark:border-dark-border p-6 sm:p-8 mb-6 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
              {currentQ.category || 'HSE Compliance'}
            </span>
            <span className="text-xs font-mono font-semibold text-mist-500 dark:text-dark-muted">
              Question {currentQuestionIndex + 1} of {totalQuestions}
            </span>
          </div>

          <h3 className="text-base sm:text-lg font-bold text-mist-900 dark:text-white mb-6 leading-snug">
            {currentQ.question}
          </h3>

          {/* Options */}
          <div className="space-y-3 mb-8">
            {currentQ.options.map((option, idx) => {
              const isSelected = selectedOption === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectOption(idx)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start space-x-3.5 ${
                    isSelected
                      ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/40 text-mist-900 dark:text-white shadow-sm ring-1 ring-violet-500'
                      : 'border-mist-300 dark:border-dark-border hover:border-violet-400 bg-white dark:bg-dark-surface text-mist-700 dark:text-dark-text'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                      isSelected
                        ? 'border-violet-500 bg-violet-500 text-white'
                        : 'border-mist-400 dark:border-dark-border bg-white dark:bg-dark-card'
                    }`}
                  >
                    {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <span className="text-xs sm:text-sm font-medium leading-relaxed">
                    {option}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between pt-6 border-t border-mist-200 dark:border-dark-border">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentQuestionIndex === 0}
              className="px-4 py-2 text-xs font-bold text-mist-600 dark:text-dark-muted hover:text-mist-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            <div className="flex items-center space-x-3">
              {currentQuestionIndex < totalQuestions - 1 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={selectedOption === undefined}
                  className="px-5 py-2.5 rounded-xl bg-mist-900 dark:bg-dark-surface hover:bg-mist-800 text-white text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1.5 shadow-sm"
                >
                  <span>Next Question</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowConfirmSubmit(true)}
                  disabled={!allAnswered || isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-violet-500 hover:bg-violet-600 text-white text-xs font-bold transition-all shadow-violet hover:shadow-violet-lg disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isSubmitting ? (
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Submit Compliance Quiz</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal on Quiz Submission */}
      <ConfirmModal
        isOpen={showConfirmSubmit}
        title="Submit Safety Assessment?"
        message="Your hazard perception findings and quiz answers will be evaluated server-side against official UK HSE compliance standards. Confirm submission?"
        confirmText="Confirm & Submit"
        cancelText="Review Answers"
        isDestructive={false}
        onConfirm={() => {
          setShowConfirmSubmit(false);
          executeSubmit();
        }}
        onCancel={() => setShowConfirmSubmit(false)}
      />
    </>
  );
};
