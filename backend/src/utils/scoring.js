/**
 * Tamper-Resistant Server-Side Scoring Engine
 * Computes scores and compliance status based on canonical database scenario
 */
export const calculateComplianceScore = ({
  scenario,
  foundHotspotIds = [],
  falseClicksCount = 0,
  timeTakenSeconds = 0,
  quizAnswers = [],
  trainingMode = 'walkthrough',
}) => {
  const allHotspots = scenario.hotspots || [];
  const totalHazards = allHotspots.filter((h) => h.isHazard).length;

  // The panorama describes the same five hazards in different words, against a
  // different photograph. The report has to describe what the trainee actually
  // saw, so the display text is sourced per mode. Grading itself is unaffected:
  // it still runs over `allHotspots` keyed by id, because the two sets share ids.
  const isPanorama = /panorama/i.test(String(trainingMode));
  const panoramaById = new Map(
    (scenario.panoramaSpots || []).map((s) => [s.id, s])
  );
  const describe = (h) =>
    isPanorama && panoramaById.has(h.id) ? panoramaById.get(h.id) : h;

  // Filter valid found hazards against scenario
  const foundMap = new Set(foundHotspotIds);
  const hazardsFound = [];
  const hazardsMissed = [];

  allHotspots.forEach((h) => {
    if (h.isHazard) {
      const d = describe(h);
      const entry = {
        id: h.id,
        title: d.title,
        category: d.category,
        severity: d.severity ?? h.severity,
        explanation: d.explanation,
        correctAction: d.correctAction,
      };
      if (foundMap.has(h.id)) {
        hazardsFound.push(entry);
      } else {
        hazardsMissed.push(entry);
      }
    }
  });

  // 1. Hazard Perception Score (0-100)
  // Base score from found fraction minus penalty for inaccurate false clicks
  const foundRatio = totalHazards > 0 ? hazardsFound.length / totalHazards : 0;
  const rawHazardScore = foundRatio * 100;
  const penalty = Math.max(0, falseClicksCount * 5); // 5% deduction per false click
  const hazardScore = Math.max(0, Math.round(rawHazardScore - penalty));

  // 2. Quiz Knowledge Score (0-100)
  const quizQuestions = scenario.quizQuestions || [];
  let quizCorrectCount = 0;
  const evaluatedQuizAnswers = [];

  quizQuestions.forEach((q) => {
    const traineeSubmission = quizAnswers.find((ans) => ans.questionId === q.id);
    const selected = traineeSubmission ? traineeSubmission.selectedOption : -1;
    const isCorrect = selected === q.correctIndex;

    if (isCorrect) {
      quizCorrectCount++;
    }

    evaluatedQuizAnswers.push({
      questionId: q.id,
      question: q.question,
      selectedOption: selected,
      correctIndex: q.correctIndex,
      isCorrect,
      explanation: q.explanation,
    });
  });

  const quizScore =
    quizQuestions.length > 0
      ? Math.round((quizCorrectCount / quizQuestions.length) * 100)
      : 100;

  // 3. Composite Total Score (60% Hazard Perception + 40% Quiz Knowledge)
  const totalScore = Math.round(hazardScore * 0.6 + quizScore * 0.4);

  const passingThreshold = scenario.passingScorePercentage || 75;
  const passed = totalScore >= passingThreshold;

  return {
    hazardsFound,
    hazardsMissed,
    totalHazards,
    foundCount: hazardsFound.length,
    missedCount: hazardsMissed.length,
    falseClicksCount: Math.max(0, Number(falseClicksCount) || 0),
    timeTakenSeconds: Math.max(1, Number(timeTakenSeconds) || 1),
    timeLimitSeconds: scenario.timeLimitSeconds,
    hazardScore,
    quizScore,
    totalScore,
    passingThreshold,
    passed,
    evaluatedQuizAnswers,
  };
};
