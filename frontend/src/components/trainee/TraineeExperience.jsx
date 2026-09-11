import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import { soundEngine } from '../../utils/audio';
import { EmployeeHome } from './EmployeeHome';
import { OnboardingModal } from './OnboardingModal';
import { TraineeSessionHUD } from './TraineeSessionHUD';
import { PanoramaViewer } from '../viewer/PanoramaViewer';
import { HazardQuiz } from './HazardQuiz';
import { DiagnosticSummary } from './DiagnosticSummary';
import { AlertCircle, RefreshCw } from 'lucide-react';

// Experience phases:
//  'HOME'        → EmployeeHome dashboard (pre-session)
//  'INSPECTION'  → Live 360° panorama viewer
//  'QUIZ'        → Post-inspection safety quiz
//  'DIAGNOSTIC'  → Results screen

export const TraineeExperience = () => {
  const { user, markOnboardingComplete } = useAuth();
  const { showToast } = useToast();

  const [phase, setPhase] = useState('HOME');
  const [scenario, setScenario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Onboarding overlay
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Session state
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const [foundHotspots, setFoundHotspots] = useState([]);
  const [falseClicksCount, setFalseClicksCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(90);
  const [totalTime, setTotalTime] = useState(90);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [timeTaken, setTimeTaken] = useState(0);

  // Submission & Diagnostic
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [diagnosticData, setDiagnosticData] = useState(null);

  const timerIntervalRef = useRef(null);

  // Load scenario on mount
  useEffect(() => {
    const loadScenario = async () => {
      try {
        setLoading(true);
        const sc = await api.getActiveScenario();
        setScenario(sc);
        const limit = sc.timeLimitSeconds || 90;
        setTimeLeft(limit);
        setTotalTime(limit);
      } catch (err) {
        setError(err.message || 'Failed to initialize warehouse scenario');
        showToast('Failed to load 360 warehouse scenario', 'error');
      } finally {
        setLoading(false);
      }
    };
    loadScenario();
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  const startTimer = () => {
    setSessionStartTime(Date.now());
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current);
          handleTimeExpire();
          return 0;
        }
        if (prev === 15) {
          soundEngine.playUrgent();
          showToast('⚠ 15 seconds remaining!', 'warning');
        } else if (prev <= 5) {
          soundEngine.playTick();
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Called when "Begin Session" is clicked from EmployeeHome
  const handleLaunchSession = (practiceMode = false) => {
    soundEngine.init();
    setIsPracticeMode(practiceMode);
    setFoundHotspots([]);
    setFalseClicksCount(0);
    const limit = scenario?.timeLimitSeconds || 90;
    setTimeLeft(limit);
    setTotalTime(limit);
    setDiagnosticData(null);

    if (user && !user.hasCompletedOnboarding) {
      setShowOnboarding(true);
    } else {
      setPhase('INSPECTION');
      startTimer();
      if (practiceMode) {
        showToast('Practice Mode: results will not be officially recorded', 'info');
      } else {
        showToast('Official session started. Spot all 5 hazards!', 'info');
      }
    }
  };

  const handleCompleteOnboarding = () => {
    setShowOnboarding(false);
    markOnboardingComplete();
    showToast('Bay 4 Inspection timer started. Spot 5 hazards!', 'info');
    setPhase('INSPECTION');
    startTimer();
  };

  const handleTimeExpire = () => {
    soundEngine.playWarning();
    showToast('Time expired! Moving to safety quiz…', 'warning');
    transitionToQuiz();
  };

  const transitionToQuiz = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    const elapsed = sessionStartTime
      ? Math.round((Date.now() - sessionStartTime) / 1000)
      : totalTime - timeLeft;
    setTimeTaken(Math.min(totalTime, Math.max(1, elapsed)));
    soundEngine.playSuccess();
    setPhase('QUIZ');
  };

  const handleHazardFound = (hotspot) => {
    const alreadyFound = foundHotspots.some((h) => h.id === hotspot.id);
    if (alreadyFound) return;
    soundEngine.playSuccess();
    const updated = [...foundHotspots, hotspot];
    setFoundHotspots(updated);
    showToast(`✓ Hazard found: ${hotspot.title}`, 'success');
    const totalHazards = (scenario?.hotspots || []).filter((h) => h.isHazard).length;
    if (updated.length >= totalHazards) {
      showToast('🎉 All hazards discovered! Preparing quiz…', 'success');
      setTimeout(() => transitionToQuiz(), 1200);
    }
  };

  const handleFalseClick = () => {
    soundEngine.playWarning();
    setFalseClicksCount((prev) => prev + 1);
    showToast('⚠ False click! –5% accuracy deduction', 'error');
  };

  const handleQuizComplete = async (quizAnswers) => {
    setIsSubmitting(true);
    try {
      const payload = {
        scenarioId: scenario.id,
        foundHotspotIds: foundHotspots.map((h) => h.id),
        falseClicksCount,
        timeTakenSeconds: timeTaken,
        quizAnswers,
        isPracticeMode,
      };
      const res = await api.submitAttempt(payload);
      if (res.success && res.diagnostic) {
        setDiagnosticData(res.diagnostic);
        setPhase('DIAGNOSTIC');
        if (res.diagnostic.passed) {
          showToast(`🏆 Compliance Certified! Score: ${res.diagnostic.totalScore}%`, 'success');
        } else {
          showToast(`Session complete. Score: ${res.diagnostic.totalScore}% (Need 75% to pass)`, 'warning');
        }
      } else {
        throw new Error('Server evaluation failed');
      }
    } catch (err) {
      showToast('Error recording session: ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetryPractice = () => {
    soundEngine.playTick();
    handleLaunchSession(true);
  };

  const handleReturnHome = () => {
    soundEngine.playTick();
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setPhase('HOME');
    setFoundHotspots([]);
    setFalseClicksCount(0);
    setIsPracticeMode(false);
    setDiagnosticData(null);
    const limit = scenario?.timeLimitSeconds || 90;
    setTimeLeft(limit);
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading && phase === 'HOME') {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 text-center">
        <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mb-4" />
        <h3 className="text-base font-bold text-mist-900 dark:text-white">
          Loading 360° Warehouse Environment…
        </h3>
        <p className="text-xs text-mist-500 dark:text-dark-muted mt-1">Calibrating Bay 4 spherical panorama</p>
      </div>
    );
  }

  if (error && phase === 'HOME') {
    return (
      <div className="max-w-md mx-auto my-16 p-6 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-3xl text-center">
        <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400 mx-auto mb-2" />
        <h3 className="text-sm font-bold text-red-800 dark:text-red-300">Failed to Load Scenario</h3>
        <p className="text-xs text-red-600 dark:text-red-400 mt-1 mb-4">{error}</p>
        <button onClick={() => window.location.reload()}
          className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-xl">
          Reload
        </button>
      </div>
    );
  }

  const totalHazards = (scenario?.hotspots || []).filter((h) => h.isHazard).length;

  return (
    <>
      {/* Onboarding modal — shown before first inspection */}
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => { setShowOnboarding(false); setPhase('HOME'); }}
        onComplete={handleCompleteOnboarding}
      />

      {/* ── HOME phase: personal dashboard ── */}
      {phase === 'HOME' && (
        <EmployeeHome
          onLaunchSession={handleLaunchSession}
          scenario={scenario}
          loading={loading}
        />
      )}

      {/* ── INSPECTION phase: 360° viewer ── */}
      {phase === 'INSPECTION' && (
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 animate-fade-in">
          <TraineeSessionHUD
            timeLeft={timeLeft}
            totalTime={totalTime}
            foundCount={foundHotspots.length}
            totalHazards={totalHazards}
            falseClicks={falseClicksCount}
            onFinishEarly={transitionToQuiz}
            isPracticeMode={isPracticeMode}
          />
          <PanoramaViewer
            scenario={scenario}
            foundHotspots={foundHotspots}
            onHazardClick={handleHazardFound}
            onFalseClick={handleFalseClick}
            isEnded={false}
          />
        </div>
      )}

      {/* ── QUIZ phase ── */}
      {phase === 'QUIZ' && (
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 animate-fade-in">
          <HazardQuiz
            questions={scenario?.quizQuestions || []}
            onComplete={handleQuizComplete}
            isSubmitting={isSubmitting}
          />
        </div>
      )}

      {/* ── DIAGNOSTIC phase ── */}
      {phase === 'DIAGNOSTIC' && (
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 animate-fade-in">
          <DiagnosticSummary
            diagnostic={diagnosticData}
            onRetryPractice={handleRetryPractice}
            onReturnHome={handleReturnHome}
          />
        </div>
      )}
    </>
  );
};
