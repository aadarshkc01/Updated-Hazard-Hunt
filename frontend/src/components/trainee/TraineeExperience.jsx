import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
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
import { ConfirmModal } from '../common/ConfirmModal';
import { OctagonX, MousePointer2, ArrowLeftRight, ArrowUpDown, Move, Keyboard, Play } from 'lucide-react';
import { SESSION_FLAG } from '../common/Navbar';

// The 3D walkthrough (Three.js scene + hazard props) is code-split so that
// trainees who only ever use Standard 360Â° never download it.
const WalkthroughViewer = lazy(() =>
  import('../viewer/WalkthroughViewer').then((m) => ({ default: m.WalkthroughViewer }))
);

// Experience phases:
//  'HOME'        â†’ EmployeeHome dashboard (pre-session)
//  'INSPECTION'  â†’ Live 360Â° panorama viewer
//  'QUIZ'        â†’ Post-inspection safety quiz
//  'DIAGNOSTIC'  â†’ Results screen

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
  const [trainingMode, setTrainingMode] = useState('panorama360'); // 'panorama360' | 'walkthrough'
  // True once the trainee has committed to a run but not yet pressed Start. The
  // environment is mounted behind the ready panel, so pressing Start begins the
  // hunt immediately with nothing left to load.
  const [awaitingStart, setAwaitingStart] = useState(false);
  const [foundHotspots, setFoundHotspots] = useState([]);
  const [falseClicksCount, setFalseClicksCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(90);
  const [totalTime, setTotalTime] = useState(90);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [timeTaken, setTimeTaken] = useState(0);

  // Submission & Diagnostic
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [diagnosticData, setDiagnosticData] = useState(null);
  const [showAbortConfirm, setShowAbortConfirm] = useState(false);

  const timerIntervalRef = useRef(null);

  /* Marks <html> while a timed session is actually running, so the navbar
     wordmark refuses to navigate away and silently discard an in-progress hunt.
     The ready panel is deliberately NOT counted: nothing is lost by leaving then. */
  useEffect(() => {
    const running = phase === 'INSPECTION' && !awaitingStart;
    document.documentElement.setAttribute(SESSION_FLAG, running ? 'true' : 'false');
    return () => document.documentElement.removeAttribute(SESSION_FLAG);
  }, [phase, awaitingStart]);

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
          showToast('15 seconds remaining!', 'warning');
        } else if (prev <= 5) {
          soundEngine.playTick();
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Called when "Begin Session" is clicked from EmployeeHome
  const handleLaunchSession = (practiceMode = false, mode = 'panorama360') => {
    soundEngine.init();
    setIsPracticeMode(practiceMode);
    setTrainingMode(mode);
    resetFoundHotspots();
    setFalseClicksCount(0);
    const limit = scenario?.timeLimitSeconds || 90;
    setTimeLeft(limit);
    setTotalTime(limit);
    setDiagnosticData(null);

    if (user && !user.hasCompletedOnboarding) {
      setShowOnboarding(true);
    } else {
      // Stage the environment but hold the clock until the trainee presses Start.
      setPhase('INSPECTION');
      setAwaitingStart(true);
    }
  };

  /* Start pressed on the ready panel. This is the only place the official clock
     is allowed to begin. */
  const handleReadyStart = () => {
    setAwaitingStart(false);
    startTimer();
    if (isPracticeMode) {
      showToast('Practice Mode: results will not be officially recorded', 'info');
    } else {
      showToast('Official session started. Spot all 5 hazards!', 'info');
    }
  };

  const handleCompleteOnboarding = () => {
    setShowOnboarding(false);
    markOnboardingComplete();
    showToast('Briefing complete. Press Start when you are ready.', 'info');
    setPhase('INSPECTION');
    setAwaitingStart(true);
  };

  const handleTimeExpire = () => {
    soundEngine.playWarning();
    showToast('Time expired! Moving to safety quizâ€¦', 'warning');
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

  // Mirror of foundHotspots that is always current.
  //
  // This exists because of a bug that affected BOTH environments, not just the
  // 360 view. This handler is passed to PanoramaViewer and WalkthroughViewer as
  // onHazardClick, and neither viewer can call a fresh version of it:
  //
  //   - PanoramaViewer.jsx builds its Pannellum hotspots inside a useEffect that
  //     depends on [scenario?.id, isEnded, isCalibrationMode,
  //     practiceTargetFound]. foundHotspots is not among them, so Pannellum keeps
  //     the handler handed to it on the first render.
  //   - WalkthroughViewer.jsx registers its canvas, pointer and key listeners in a
  //     useEffect depending on [scenario?.id, layout?.seed] (and suppresses
  //     exhaustive-deps on the preceding line), so those listeners close over
  //     that same first-render handler too.
  //
  // So `foundHotspots` read directly inside this function was whatever the list
  // held at that first render - an empty array. Every find therefore computed
  // [...[], hotspot] and REPLACED the list instead of adding to it, leaving the
  // counter frozen at 1/5 and submitting a single hazard id to the quiz.
  //
  // Reading and writing the ref instead makes the handler correct regardless of
  // which render a caller happens to be holding. Fixing it here rather than in
  // each viewer repairs both environments at once.
  const foundHotspotsRef = useRef([]);
  foundHotspotsRef.current = foundHotspots;

  // Clears both the state and the mirror in one place. Every reset below must go
  // through here: resetting only the state would leave the ref holding the
  // previous session's hazards, so the first find of the next session would be
  // rejected as a duplicate.
  const resetFoundHotspots = () => {
    foundHotspotsRef.current = [];
    setFoundHotspots([]);
  };

  const handleHazardFound = (hotspot) => {
    const current = foundHotspotsRef.current;
    if (current.some((h) => h.id === hotspot.id)) return;

    const updated = [...current, hotspot];
    foundHotspotsRef.current = updated;
    setFoundHotspots(updated);

    soundEngine.playSuccess();
    showToast(`Hazard found: ${hotspot.title}`, 'success');

    const totalHazards = (scenario?.hotspots || []).filter((h) => h.isHazard).length;
    if (updated.length >= totalHazards) {
      showToast('All hazards discovered! Preparing quizâ€¦', 'success');
      setTimeout(() => transitionToQuiz(), 1200);
    }
  };

  const handleFalseClick = () => {
    soundEngine.playWarning();
    setFalseClicksCount((prev) => prev + 1);
    showToast('False click! -5% accuracy deduction', 'error');
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
        trainingMode,
        // Lets a supervisor replay the exact randomized staging plan on audit.
        walkthroughLayoutSeed:
          trainingMode === 'walkthrough' ? scenario?.walkthroughLayout?.seed ?? null : null,
      };
      const res = await api.submitAttempt(payload);
      if (res.success && res.diagnostic) {
        setDiagnosticData(res.diagnostic);
        setPhase('DIAGNOSTIC');
        if (res.diagnostic.passed) {
          showToast(`Compliance certified! Score: ${res.diagnostic.totalScore}%`, 'success');
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
    handleLaunchSession(true, trainingMode);
  };

  /**
   * Abort an in-progress hunt and go back to the dashboard.
   *
   * The attempt is DISCARDED, not submitted â€” a trainee who realises they are in
   * the wrong scenario, or who needs to stop, must never be silently graded on a
   * partial run. Everything the session accumulated is cleared, the timer is
   * stopped, and the trainee returns to a clean home screen.
   */
  const handleAbortSession = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setShowAbortConfirm(false);
    soundEngine.playWarning();
    setPhase('HOME');
    setAwaitingStart(false);
    resetFoundHotspots();
    setFalseClicksCount(0);
    setIsPracticeMode(false);
    setDiagnosticData(null);
    setSessionStartTime(null);
    setTimeTaken(0);
    setTrainingMode('panorama360');
    const limit = scenario?.timeLimitSeconds || 90;
    setTimeLeft(limit);
    showToast('Session cancelled. Nothing was recorded.', 'info');
  };

  const handleReturnHome = () => {
    soundEngine.playTick();
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setPhase('HOME');
    resetFoundHotspots();
    setFalseClicksCount(0);
    setIsPracticeMode(false);
    setDiagnosticData(null);
    const limit = scenario?.timeLimitSeconds || 90;
    setTimeLeft(limit);
  };

  // Escape aborts the session from anywhere inside the inspection phase.
  useEffect(() => {
    if (phase !== 'INSPECTION') return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setShowAbortConfirm(true);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [phase]);

  // â”€â”€ Loading state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (loading && phase === 'HOME') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-8 text-center">
        <span className="app-spinner h-8 w-8 text-primary-500" />
        <p className="app-section-title">Loading warehouse scenarioâ€¦</p>
        <p className="app-body">Calibrating the Bay 4 inspection</p>
      </div>
    );
  }

  if (error && phase === 'HOME') {
    return (
      <div className="app-page py-10">
        <div className="app-alert app-alert-stop mx-auto max-w-md">
          <AlertCircle className="app-alert-icon" aria-hidden="true" />
          <div>
            <p className="font-bold">Could not load the scenario</p>
            <p className="mt-1">{error}</p>
          </div>
        </div>
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="app-btn app-btn-primary"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }

  const totalHazards = (scenario?.hotspots || []).filter((h) => h.isHazard).length;

  return (
    <>
      {/* Onboarding modal â€” shown before first inspection */}
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => { setShowOnboarding(false); setPhase('HOME'); }}
        onComplete={handleCompleteOnboarding}
      />

      {/* Confirm before throwing away a partially completed attempt. */}
      <ConfirmModal
        isOpen={showAbortConfirm}
        title="Cancel this session?"
        message={
          isPracticeMode
            ? 'This practice run will be discarded. Nothing is recorded either way.'
            : 'This official attempt will be discarded and will NOT be graded or recorded. You can start again whenever you are ready.'
        }
        confirmText="Cancel session"
        cancelText="Keep going"
        isDestructive={!isPracticeMode}
        onConfirm={handleAbortSession}
        onCancel={() => setShowAbortConfirm(false)}
      />

      {/* â”€â”€ HOME phase: personal dashboard â”€â”€ */}
      {phase === 'HOME' && (
        <EmployeeHome
          onLaunchSession={handleLaunchSession}
          scenario={scenario}
          loading={loading}
        />
      )}

      {/* â”€â”€ INSPECTION phase â”€â”€ */}
      {phase === 'INSPECTION' && (
        <div className="app-page animate-fade-in py-4">
          <div className="app-card mb-4 flex flex-wrap items-start justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="app-eyebrow-accent">
                {isPracticeMode ? 'Practice session' : 'Official compliance audit'}
              </p>
              <h1 className="mt-1 text-lg font-bold text-mist-900 dark:text-dark-text">
                {isPracticeMode
                  ? 'No official result will be recorded'
                  : `Spot all ${totalHazards} hazards before the timer ends`}
              </h1>
              <ul className="app-body mt-2 grid gap-1 sm:grid-cols-3">
                <li>
                  {trainingMode === 'walkthrough'
                    ? 'Walk the aisles and inspect every bay.'
                    : 'Rotate the panorama and inspect every corner.'}
                </li>
                <li>Report only genuine hazards â€” false reports cost 5%.</li>
                <li>
                  {isPracticeMode
                    ? 'Rehearse freely; your standing is untouched.'
                    : 'Recorded to the HSE compliance audit.'}
                </li>
              </ul>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <span
                className={`app-chip ${isPracticeMode ? 'app-chip-caution' : 'app-chip-brand'}`}
              >
                {isPracticeMode ? 'Practice' : 'Official'}
              </span>
              {/* Abort: an in-progress hunt can always be stopped. */}
              <button
                type="button"
                onClick={() => setShowAbortConfirm(true)}
                className="app-btn app-btn-secondary app-btn-sm"
              >
                <OctagonX className="h-3.5 w-3.5" aria-hidden="true" />
                Cancel session
              </button>
            </div>
          </div>

          {/* Hidden until Start: a countdown the trainee has not agreed to yet
              would only add pressure before they have read the controls. */}
          {!awaitingStart && (
            <TraineeSessionHUD
              timeLeft={timeLeft}
              totalTime={totalTime}
              foundCount={foundHotspots.length}
              totalHazards={totalHazards}
              falseClicks={falseClicksCount}
              onFinishEarly={transitionToQuiz}
              onCancel={() => setShowAbortConfirm(true)}
              isPracticeMode={isPracticeMode}
              trainingMode={trainingMode}
            />
          )}
          {trainingMode === 'walkthrough' ? (
            <Suspense
              fallback={
                <div className="flex h-[74vh] min-h-[440px] items-center justify-center rounded-panel border border-dark-border bg-dark-bg">
                  <div className="text-center">
                    <span className="app-spinner mx-auto mb-3 h-8 w-8 text-primary-500" />
                    <p className="text-xs font-bold text-white">Building the Bay 4 warehouseâ€¦</p>
                  </div>
                </div>
              }
            >
              <WalkthroughViewer
                scenario={scenario}
                foundHotspots={foundHotspots}
                onHazardClick={handleHazardFound}
                onFalseClick={handleFalseClick}
                isEnded={false}
                timeLeft={timeLeft}
                totalTime={totalTime}
              />
            </Suspense>
          ) : (
            <PanoramaViewer
              scenario={scenario}
              foundHotspots={foundHotspots}
              onHazardClick={handleHazardFound}
              onFalseClick={handleFalseClick}
              isEnded={false}
            />
          )}

          {/* Ready panel. The environment above is already mounted, so
              pressing Start begins the hunt with no load time left. */}
          {awaitingStart && (
            <div
              className="fixed inset-0 z-40 flex items-center justify-center bg-mist-950/70 p-4 backdrop-blur-sm animate-fade-in"
              role="dialog"
              aria-modal="true"
              aria-labelledby="ready-title"
            >
              <div className="app-card w-full max-w-lg p-6 shadow-pop">
                <p className="app-eyebrow-accent">
                  {isPracticeMode ? 'Practice session' : 'Official compliance audit'}
                </p>
                <h2 id="ready-title" className="app-title mt-1 text-lg">
                  {trainingMode === 'walkthrough'
                    ? 'Ready to walk the warehouse?'
                    : 'Ready to begin the inspection?'}
                </h2>
                <p className="app-body mt-2">
                  The {totalTime}-second clock starts when you press Start, not
                  before. Read the controls, then begin when you are ready.
                </p>

                <ul className="app-card-quiet mt-4 grid gap-2 p-4">
                  {(
                    trainingMode === 'walkthrough'
                      ? [
                          { icon: MousePointer2, k: 'Click', v: 'Look around' },
                          { icon: Keyboard, k: 'W A S D', v: 'Walk the aisles' },
                          { icon: ArrowUpDown, k: 'Ctrl', v: 'Release the mouse' },
                          { icon: Move, k: 'Drag', v: 'Move on a touch screen' },
                        ]
                      : [
                          { icon: Move, k: 'Drag', v: 'Pan around the bay' },
                          { icon: ArrowLeftRight, k: 'Arrows', v: 'Look left / right' },
                          { icon: ArrowUpDown, k: 'Up / Down', v: 'Look up and down' },
                          { icon: MousePointer2, k: 'Click', v: 'Report a hazard' },
                        ]
                  ).map(({ icon: Icon, k, v }) => (
                    <li key={k} className="flex items-center gap-3">
                      <Icon className="h-4 w-4 shrink-0 text-primary-600 dark:text-primary-400" aria-hidden="true" />
                      <span className="app-kbd shrink-0">{k}</span>
                      <span className="app-body">{v}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleReadyStart}
                    className="app-btn app-btn-primary"
                  >
                    <Play className="h-4 w-4" aria-hidden="true" />
                    Start {totalTime}-second session
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAbortConfirm(true)}
                    className="app-btn app-btn-secondary"
                  >
                    <OctagonX className="h-4 w-4" aria-hidden="true" />
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* â”€â”€ QUIZ phase â”€â”€ */}
      {phase === 'QUIZ' && (
        <HazardQuiz
          questions={scenario?.quizQuestions || []}
          onComplete={handleQuizComplete}
          isSubmitting={isSubmitting}
          onBack={handleReturnHome}
        />
      )}

      {/* â”€â”€ DIAGNOSTIC phase â”€â”€ */}
      {phase === 'DIAGNOSTIC' && (
        <DiagnosticSummary
          diagnostic={diagnosticData}
          onRetryPractice={handleRetryPractice}
          onReturnHome={handleReturnHome}
        />
      )}
    </>
  );
};
