import React, { useState } from 'react';
import { soundEngine } from '../../utils/audio';
import { Compass, AlertTriangle, ArrowRight, X, Target, FileCheck, OctagonX } from 'lucide-react';

export const OnboardingModal = ({ isOpen, onClose, onComplete }) => {
  const [step, setStep] = useState(0);

  if (!isOpen) return null;

  const slides = [
    {
      title: 'Welcome to Hazard Hunt 360°',
      badge: 'Automotive Logistics Bay 4',
      icon: Compass,
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
      description:
        'Walk the depot in first person, or rotate the panorama, and report every dangerous condition you can find.',
      points: [
        'Target violations: chemical fluid spills, leaning pallet stacks, blocked fire exits, trailing 415V cables, and blind corners.',
        'Point the centre reticle at equipment and it names it, so you can learn what belongs on a warehouse floor.',
        'Follow the safety-yellow walkway � it is always kept clear so you can reach every aisle.',
        'A confirmation reticle and audio chime indicate a successful find.',
      ],
    },
    {
      title: 'Scoring & Accuracy Rules',
      badge: 'Penalty-Aware Perception',
      icon: AlertTriangle,
      description:
        'High-standard safety inspection requires avoiding false alarms while detecting true risks.',
      points: [
        'Valid hazard spotted: +20% base hazard perception score.',
        'False click (clicking non-hazard zones): -5% accuracy penalty per false alarm.',
        'Session ends automatically when the 90s timer runs out or all 5 hazards are discovered.',
      ],
    },
    {
      title: 'You Can Stop Anytime',
      badge: 'Nothing Is Forced On You',
      icon: OctagonX,
      description:
        'If you start the wrong session or simply need to stop, use Cancel session and nothing will be recorded.',
      points: [
        'Cancel session discards the attempt completely - it is never graded and never recorded.',
        'Finish early submits what you have found so far; anything still hidden counts as missed.',
        'Both buttons sit in the session bar, and pressing Esc opens the cancel confirmation from anywhere.',
        'You can restart as many times as you like before submitting an official attempt.',
      ],
    },
    {
      title: 'Post-Inspection Knowledge Quiz & Compliance',
      badge: '75% Pass Standard',
      icon: FileCheck,
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
const Icon = currentSlide.icon;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-mist-950/55 p-4 backdrop-blur-sm animate-fade-in">
      <div
        className="app-card relative w-full max-w-xl animate-slide-up overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Bay 4 induction briefing"
      >
        <div className="app-card-head">
          <div className="min-w-0">
            <p className="app-eyebrow-accent">{currentSlide.badge}</p>
            <h2 className="mt-1 text-lg font-bold text-mist-900 dark:text-dark-text">
              {currentSlide.title}
            </h2>
          </div>
          <button
            type="button"
            // Dismisses the briefing only. This used to call handleSkip, which
            // routes through onComplete and therefore started the 90-second
            // clock - so a trainee who simply closed the briefing was entered
            // into the environment with time already running.
            onClick={onClose}
            className="app-icon-btn"
            title="Close briefing"
            aria-label="Close briefing"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 sm:p-7">
          <p className="app-body text-sm">{currentSlide.description}</p>

          <ul className="mb-6 mt-4 space-y-2">
            {currentSlide.points.map((pt, idx) => (
              <li
                key={idx}
                className="app-card-quiet flex items-start gap-2.5 p-3 text-xs font-medium text-mist-800 dark:text-dark-text"
              >
                <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-600 dark:text-primary-400" />
                <span>{pt}</span>
              </li>
            ))}
          </ul>

          <div className="app-divider flex items-center justify-between gap-3 pt-4">
            <div className="flex items-center gap-1.5">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setStep(i)}
                  aria-label={`Go to step ${i + 1}`}
                  aria-current={step === i}
                  className={`h-1.5 rounded-full transition-all ${
                    step === i ? 'w-6 bg-primary-500' : 'w-2 bg-mist-300 dark:bg-dark-border'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              {step < slides.length - 1 ? (
                <>
                  <button type="button" onClick={handleSkip} className="app-btn app-btn-ghost">
                    Skip
                  </button>
                  <button type="button" onClick={handleNext} className="app-btn app-btn-primary">
                    Next
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </>
              ) : (
                <button type="button" onClick={handleNext} className="app-btn app-btn-primary">
                  Start Bay 4 inspection
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
