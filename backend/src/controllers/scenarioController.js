import { Scenario } from '../models/Scenario.js';
import {
  generateWalkthroughLayout,
  randomSeed,
} from '../utils/walkthroughLayout.js';

/**
 * The scenario this project ships with.
 *
 * The lookup used to be `findOne({ isActive: true })`, which returns whichever
 * active scenario the database happens to yield first. The shared Atlas cluster
 * used during development also held two earlier scenarios, both flagged active,
 * so trainees were served "Legacy Plant Walkthrough" - a 5-hazard, 7-question
 * scenario containing hazards that do not exist in Bay 4 - instead of Bay 4.
 *
 * That is worse than a wrong question count: the whole scenario was wrong, and
 * the 4-question quiz required by FR-07 was never reached. Asking for a named
 * scenario makes the response deterministic, and keeps the right content on
 * screen even if the database holds anything else.
 */
const SCENARIO_CODE = process.env.SCENARIO_CODE || 'WH-BAY-04';

/**
 * Strips the answer key from a scenario before it leaves the server.
 *
 * This lives in one place on purpose. The sanitisation used to exist only
 * inside the active-scenario handler, so the list endpoint - which serialised
 * raw documents - shipped every `correctIndex` to any signed-in user. Two
 * copies of the same rule is how they drift apart, so both paths now go through
 * this single function.
 */
const sanitizeScenario = (scenario) => ({
  id: scenario._id,
  title: scenario.title,
  code: scenario.code,
  description: scenario.description,
  facility: scenario.facility,
  panoramaUrl: scenario.panoramaUrl,
  timeLimitSeconds: scenario.timeLimitSeconds,
  passingScorePercentage: scenario.passingScorePercentage,
  hotspots: scenario.hotspots,
  // Deliberately omits `correctIndex` and `explanation`: the answer key is
  // never sent to the browser, and grading happens strictly server-side.
  quizQuestions: (scenario.quizQuestions || []).map((q) => ({
    id: q.id,
    question: q.question,
    options: q.options,
    category: q.category,
  })),
});

export const getActiveScenario = async (req, res) => {
  try {
    // Prefer the named scenario, and only fall back to an active one if the
    // named scenario is genuinely absent.
    const scenario =
      (await Scenario.findOne({ code: SCENARIO_CODE })) ||
      (await Scenario.findOne({ isActive: true }));

    if (!scenario) {
      return res.status(404).json({
        success: false,
        message: 'No active hazard scenario currently configured',
      });
    }

    // Randomized staging plan for the 3D walkthrough. Re-rolled on every load so
    // hazard positions cannot be memorised between attempts. The seed is echoed
    // back so an auditor can reproduce the exact layout later. Scoring remains
    // server-side against the canonical hotspots below.
    const walkthroughLayout = generateWalkthroughLayout(scenario.hotspots, randomSeed());

    return res.status(200).json({
      success: true,
      // Sanitised centrally, so this endpoint cannot drift from the list one.
      scenario: { ...sanitizeScenario(scenario), walkthroughLayout },
    });
  } catch (error) {
    console.error('getActiveScenario error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getAllScenarios = async (req, res) => {
  try {
    const scenarios = await Scenario.find().select('-__v');
    return res.status(200).json({
      success: true,
      count: scenarios.length,
      // Same sanitiser as the active endpoint. This one previously returned raw
      // documents, which handed every quiz answer to any signed-in user.
      scenarios: scenarios.map(sanitizeScenario),
    });
  } catch (error) {
    console.error('getAllScenarios error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
