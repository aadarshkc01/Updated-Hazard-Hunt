/**
 * Shared fixtures for the score-report harness.
 *
 * Two shapes, deliberately:
 *
 *  - TYPICAL - a realistic mixed session: some found, some missed, a quiz
 *    section, and a second official record so the exporter has to sort.
 *  - WORST   - nothing found, all five hazards missed, and every text field
 *    padded out to roughly the longest string the seed data can produce. This
 *    is the case that used to push the layout off the page, so it is the one
 *    worth asserting on.
 */
export const hotspot = (i, title, category, severity, explanation, correctAction) => ({
  id: `hazard-${i}`,
  title,
  category,
  severity,
  explanation,
  correctAction,
});

export const HAZARDS = [
  hotspot(
    1,
    'Chemical / Hydraulic Fluid Spill',
    'Chemical & Slip Hazard',
    'High',
    'Uncontained hydraulic fluid pooling from an electric pallet truck creates an acute slip hazard and risk of chemical contamination across the transit aisle.',
    'Cordon off area immediately, deploy absorbent granules from the COSHH spill kit, and tag out the leaking pallet truck.'
  ),
  hotspot(
    2,
    'Unstable Leaning Pallet Stack',
    'Material Handling',
    'Critical',
    'Damaged wooden stringer and split bottom deckboard causing an asymmetrical 2.4 m stack of heavy automotive parts to lean dangerously over the pedestrian transit aisle.',
    'Halt pedestrian aisle traffic, de-stack using a counterbalanced forklift under supervisor direction, and tag the pallet as scrap.'
  ),
  hotspot(
    3,
    'Blocked Emergency Fire Exit',
    'Fire Safety',
    'Critical',
    'Pallets stacked across the exit approach. The egress route is obstructed and the door cannot be opened to its full travel, which is a direct breach of the means-of-escape requirement.',
    'Clear the exit immediately and reinstate the marked keep-clear zone in front of the door.'
  ),
  hotspot(
    4,
    'Exposed Trailing 415V Industrial Cable',
    'Electrical & Trip Hazard',
    'Critical',
    'A live 415 V three-phase supply cable is trailing unprotected across an aisle and presents both a trip hazard at shin height and a direct electrocution risk.',
    'Isolate at the wall socket, coil and cable-tie the lead to the nearest fixed point, then report the fault to the maintenance team.'
  ),
  hotspot(
    5,
    'Forklift Blind Intersection',
    'Traffic Separation',
    'High',
    'A reversing forklift crosses a pedestrian route with no reversing alarm, no beacon and no visible operator, so neither party can see the other approach.',
    'Stop pedestrians, establish and sign a right-of-way rule, and fit a reversing alarm and beacon before the vehicle is returned to service.'
  ),
];

const base = {
  _id: '68f0aa11bb22cc33dd44ee55',
  userName: 'Alex Rai',
  department: 'Inbound Logistics',
  scenarioTitle: 'Bay 4 Inspection',
  trainingMode: 'walkthrough',
  walkthroughLayoutSeed: 4412,
  falseClicksCount: 2,
  timeTakenSeconds: 84,
  timeLimitSeconds: 90,
  passingThreshold: 75,
  completedAt: '2026-10-06T09:14:00.000Z',
  quizReview: [
    {
      questionId: 'q1',
      question: 'Who may re-energise a 415 V supply after a fault?',
      isCorrect: true,
      explanation: 'Only a competent, authorised electrician may re-energise.',
    },
    {
      questionId: 'q2',
      question: 'What is the minimum bunding volume for a 205 L drum?',
      isCorrect: false,
      explanation: 'Bunding must hold at least 110% of the largest container.',
    },
  ],
};

/** One found, two missed, one quiz wrong. */
export const typical = {
  ...base,
  passed: false,
  totalScore: 62,
  hazardScore: 40,
  quizScore: 80,
  hazardsFound: [HAZARDS[0]],
  hazardsMissed: [HAZARDS[1], HAZARDS[2]],
};

/** A second, older official record so the exporter has to sort and filter. */
export const older = {
  ...typical,
  _id: '68f0aa00bb22cc33dd44ee00',
  completedAt: '2026-09-28T10:02:00.000Z',
  passed: true,
  totalScore: 88,
  hazardScore: 80,
  quizScore: 100,
  hazardsFound: HAZARDS.slice(0, 3),
  hazardsMissed: [],
  falseClicksCount: 0,
};

/** Nothing found, everything missed, every text field at its longest. */
export const worst = {
  ...base,
  userName: 'Bartholomew Fitzgerald-Montgomery',
  department: 'Inbound Logistics, Automotive Components Division',
  passed: false,
  totalScore: 8,
  hazardScore: 0,
  quizScore: 0,
  falseClicksCount: 17,
  timeTakenSeconds: 90,
  hazardsFound: [],
  hazardsMissed: HAZARDS,
  quizReview: base.quizReview.map((q) => ({ ...q, isCorrect: false })),
};