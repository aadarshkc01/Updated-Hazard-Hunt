import React, { useState } from 'react';
import { soundEngine } from '../../utils/audio';
import {
  Compass,
  AlertTriangle,
  Clock,
  HelpCircle,
  Award,
  ArrowRight,
  CheckCircle2,
  X,
  Target,
  FileCheck,
} from 'lucide-react';

export const OnboardingModal = ({ isOpen, onClose, onComplete }) => {
  const [step, setStep] = useState(0);

  if (!isOpen) return null;

  const slides = [
    {
      title: 'Welcome to Hazard Hunt 360°',
      badge: 'Automotive Logistics Bay 4',
      icon: Compass,
      color: 'bg-primary-600',
      description:
        'You are assigned to conduct a panoramic safety sweep of Bay 4 Inbound Logistics. Replaces passive posters with an active, timed perception test.',
      points: [
        'Explore the warehouse in high-resolution 360° panoramic projection.',
        'Simulates real operating risks in high-density automotive warehousing.',
        'Runs directly in modern laptop/tablet browsers without any VR headset required.',
      ],
    },
    {
      title: 'How to Inspect & Spot Hazards',
      badge: '5 Hidden Critical Violations',
      icon: Target,
      color: 'bg-primary-600',
      description:
        'Rotate your perspective by clicking and dragging with your mouse (or swiping on tablets/mobile screens).',
      points: [
        'Click directly on dangerous conditions to flag and secure them.',
        'Target violations: Chemical fluid spills, leaning pallet stacks, blocked fire escapes, trailing 415V cables, and blind corners.',
        'Confirmation reticle and audio chime indicate a successful find.',
      ],
    },
    {
      title: 'Scoring & Accuracy Rules',
      badge: 'Penalty-Aware Perception',
      icon: AlertTriangle,
      color: 'bg-primary-600',
      description:
        'High-standard safety inspection requires avoiding false alarms while detecting true risks.',
      points: [
        'Valid Hazard spotted: +20% base hazard perception score.',
        'False click (clicking non-hazard zones): -5% accuracy penalty per false alarm.',
        'Session ends automatically when the 90s timer runs out or all 5 hazards are discovered.',
      ],
    },
    {
      title: 'Post-Inspection Knowledge Quiz & Compliance',
      badge: '75% Pass Standard',
      icon: FileCheck,
      color: 'bg-primary-600',
      description:
        'Following the 360 sweep, you must complete a 4-question multiple choice knowledge quiz on UK HSE and warehouse regulations.',
      points: [
        'Composite Score = 60% Hazard Perception + 40% Safety Knowledge Quiz.',
        'Requires 75% or higher to achieve certified HSE Compliance.',
        'Results are permanently recorded in the enterprise compliance database.',
      ],
    },
  ];

  const currentSlide = slides[step];
  const handleNext = () => {
    soundEngine.playTick();
    if (step < slides.length - 1) {
      setStep(step + 1);
    } else {
      soundEngine.playSuccess();
      onComplete();
    }
  };

  const handleSkip = () => {
    soundEngine.playTick();
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-dark-card rounded-3xl shadow-2xl max-w-xl w-full border border-mist-300 dark:border-dark-border overflow-hidden relative transition-all animate-slide-up">
        {/* Banner */}
        <div className={`h-24 ${currentSlide.color} p-6 flex items-center justify-between text-white relative`}>
          <div className="flex items-center space-x-3.5">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-black/20 px-2.5 py-0.5 rounded-full">
                {currentSlide.badge}
              </span>
              <h2 className="text-lg sm:text-xl font-bold mt-1 text-white">{currentSlide.title}</h2>
            </div>
          </div>

          <button
            onClick={handleSkip}
            title="Skip Onboarding"
            className="p-1.5 rounded-full bg-black/20 hover:bg-black/30 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8">
          <p className="text-mist-700 dark:text-dark-text text-xs sm:text-sm leading-relaxed mb-6 font-medium">
            {currentSlide.description}
          </p>

          <div className="space-y-3 mb-8">
            {currentSlide.points.map((pt, idx) => (
              <div
                key={idx}
                className="flex items-start space-x-3 p-3 rounded-2xl bg-mist-100 dark:bg-dark-surface border border-mist-300/80 dark:border-dark-border text-xs text-mist-900 dark:text-dark-text"
              >
                <span className="leading-snug font-medium">{pt}</span>
              </div>
            ))}
          </div>

          {/* Stepper */}
          <div className="flex items-center justify-between pt-4 border-t border-mist-200 dark:border-dark-border">
            <div className="flex items-center space-x-1.5">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  className={`h-2 rounded-full transition-all ${
                    step === i ? 'w-6 bg-primary-500' : 'w-2 bg-mist-300 dark:bg-dark-border'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center space-x-2">
              {step < slides.length - 1 ? (
                <>
                  <button
                    onClick={handleSkip}
                    className="px-3 py-2 text-xs font-semibold text-mist-600 dark:text-dark-muted hover:text-mist-900 dark:hover:text-white"
                  >
                    Skip
                  </button>
                  <button
                    onClick={handleNext}
                    className="px-5 py-2.5 rounded-xl bg-mist-900 dark:bg-dark-surface hover:bg-mist-800 text-white text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm"
                  >
                    <span>Next</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <button
                  onClick={handleNext}
                  className="px-6 py-2.5 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-xs font-bold transition-all flex items-center space-x-1.5"
                >
                  <span>Start Bay 4 Inspection</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
