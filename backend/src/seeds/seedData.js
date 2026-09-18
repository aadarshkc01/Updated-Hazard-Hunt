import { User } from '../models/User.js';
import { Scenario } from '../models/Scenario.js';
import { ComplianceRecord } from '../models/ComplianceRecord.js';

const ensureDemoUser = async ({ username, password, name, role, department, hasCompletedOnboarding }) => {
  let user = await User.findOne({ username });

  if (!user) {
    user = new User({ username, password, name, role, department, hasCompletedOnboarding });
    await user.save();
    return user;
  }

  user.name = name;
  user.role = role;
  user.department = department;
  user.hasCompletedOnboarding = role !== 'employee' ? true : hasCompletedOnboarding;
  user.password = password;
  await user.save();
  return user;
};

const ensureScenario = async () => {
  const scenarioData = {
    title: 'Bay 4: Automotive Logistics & Inbound Storage',
    code: 'WH-BAY-04',
    description:
      'High-density automotive component depot receiving palletized battery packs and stamped panels. Identify acute slip risks, racking instability, electrical violations, blocked fire exits, and blind vehicle corners.',
    facility: 'Sunderland Logistics Hub',
    panoramaUrl: '/panoramas/warehouse_bay4.webp',
    timeLimitSeconds: 90,
    passingScorePercentage: 75,
    hotspots: [
      {
        id: 'hazard-spill',
        title: 'Chemical / Hydraulic Fluid Spill',
        category: 'Chemical & Slip Hazard',
        pitch: -25,
        yaw: -15,
        radius: 9,
        isHazard: true,
        severity: 'High',
        explanation:
          'Uncontained hydraulic fluid pooling from an electric pallet truck creates an acute slip hazard and risk of chemical contamination.',
        correctAction:
          'Cordon off area immediately, deploy absorbent granules from COSHH spill kit, and tag out the leaking pallet truck.',
      },
      {
        id: 'hazard-pallet',
        title: 'Unstable Leaning Pallet Stack',
        category: 'Material Handling',
        pitch: -3,
        yaw: 40,
        radius: 10,
        isHazard: true,
        severity: 'Critical',
        explanation:
          'Damaged wooden stringer and split bottom deckboard causing an asymmetrical 2.4m stack of heavy automotive parts to lean dangerously over pedestrian transit aisle.',
        correctAction:
          'Halt pedestrian aisle traffic, de-stack using counterbalanced forklift under supervisor direction, tag pallet as scrap.',
      },
      {
        id: 'hazard-exit',
        title: 'Blocked Emergency Fire Exit',
        category: 'Fire Safety',
        pitch: 2,
        yaw: 118,
        radius: 9,
        isHazard: true,
        severity: 'Critical',
        explanation:
          'Double fire escape push-bar door completely obstructed by stacked wooden crates and wrapping waste, violating UK Regulatory Reform (Fire Safety) Order 2005.',
        correctAction:
          'Clear immediate 1-meter clear zone around escape route and keep unobstructed at all times.',
      },
      {
        id: 'hazard-cable',
        title: 'Exposed Trailing 415V Industrial Cable',
        category: 'Electrical & Trip Hazard',
        pitch: -33,
        yaw: 80,
        radius: 9,
        isHazard: true,
        severity: 'High',
        explanation:
          'Temporary heavy-duty three-phase cable routed across designated pedestrian footway without rubber ramp protection or warning signage.',
        correctAction:
          'Isolate power supply at distribution board, re-route through overhead cable gantry or install heavy-duty ramp covers.',
      },
      {
        id: 'hazard-forklift',
        title: 'Forklift Blind Intersection (No Mirror / Barrier)',
        category: 'Traffic Separation',
        pitch: -2,
        yaw: -138,
        radius: 10,
        isHazard: true,
        severity: 'High',
        explanation:
          'High-rack corner intersection lacking parabolic safety mirror and segregated pedestrian physical barrier where FLT reversing manoeuvres occur.',
        correctAction:
          'Fit 600mm convex intersection mirror, establish floor painted zebra crossing, and mandate horn sounding.',
      },
    ],
    quizQuestions: [
      {
        id: 'quiz-1',
        question:
          'What is the mandatory first response upon identifying an uncontained chemical or hydraulic fluid spill on a warehouse concrete floor?',
        options: [
          'Ignore it until the scheduled end-of-shift deep clean',
          'Cordon off the immediate area, warn nearby workers, and retrieve the appropriate COSHH spill kit',
          'Wash it into the nearest surface water floor drain with a high-pressure hose',
          'Cover it with loose cardboard sheets until dry',
        ],
        correctIndex: 1,
        explanation:
          'Under COSHH and HSE guidelines, securing the zone to prevent slip incidents and deploying dedicated absorbent materials is the mandatory first step.',
        category: 'Chemical & Slip Hazard',
      },
      {
        id: 'quiz-2',
        question:
          'According to HSE warehousing safety standards, what action must be taken if a loaded wooden pallet exhibits a fractured bottom deckboard or splintered bearer?',
        options: [
          'Wrap plastic stretch-film around it and continue storage',
          'De-stack and transfer load to a certified sound pallet immediately; quarantine the defective pallet',
          'Place it at the highest rack level to keep it out of high-traffic zones',
          'Drive forklift tines into the sound section and leave it alone',
        ],
        correctIndex: 1,
        explanation:
          'Damaged pallets lose structural integrity under compressive loading; loads must be transferred safely and the pallet removed from service.',
        category: 'Material Handling',
      },
      {
        id: 'quiz-3',
        question:
          'Under UK Fire Safety regulations, when may an emergency fire exit door or marked egress route be temporarily blocked by incoming cargo?',
        options: [
          'Only during peak unloading periods for under 30 minutes',
          'If a warehouse shift supervisor signs a temporary exemption note',
          'Never: emergency escape routes must be maintained 100% clear and unobstructed at all times',
          'Only if there is another marked fire exit within 100 meters',
        ],
        correctIndex: 2,
        explanation:
          'Fire escape routes and doors must remain 100% clear and immediately operable without keys or obstructions 24 hours a day.',
        category: 'Fire Safety',
      },
      {
        id: 'quiz-4',
        question:
          'What is the recommended safe pedestrian exclusion distance when walking in the vicinity of an operating counterbalanced forklift truck?',
        options: [
          'At least 0.5 metres',
          'At least 2 to 3 metres minimum safe clearance, maintaining positive eye contact with the driver',
          'Any distance as long as you are wearing a high-visibility vest',
          'There is no minimum clearance required in marked loading bays',
        ],
        correctIndex: 1,
        explanation:
          'HSE guidance mandates maintaining a minimum 2-3m safety bubble and establishing clear visual confirmation with the operator before crossing.',
        category: 'Traffic Separation',
      },
    ],
    isActive: true,
  };

  let scenario = await Scenario.findOne({ code: 'WH-BAY-04' });

  if (!scenario) {
    scenario = await Scenario.create(scenarioData);
  } else {
    Object.assign(scenario, scenarioData);
    await scenario.save();
  }

  return scenario;
};

export const seedDatabase = async () => {
  try {
    console.log('Seeding demo users and scenario...');

    const trainee1 = await ensureDemoUser({
      username: 'trainee1',
      password: 'SafetyPass123!',
      name: 'Alex Morgan',
      role: 'employee',
      department: 'Inbound Logistics Bay 4',
      hasCompletedOnboarding: false,
    });

    const trainee2 = await ensureDemoUser({
      username: 'trainee2',
      password: 'SafetyPass123!',
      name: 'Jordan Lee',
      role: 'employee',
      department: 'Quality & Packaging',
      hasCompletedOnboarding: true,
    });

    const supervisor = await ensureDemoUser({
      username: 'supervisor1',
      password: 'SuperVisor2026!',
      name: 'Eleanor Vance (HSE Lead)',
      role: 'supervisor',
      department: 'Health, Safety & Environment',
      hasCompletedOnboarding: true,
    });

    const admin = await ensureDemoUser({
      username: 'admin1',
      password: 'AdminMaster2026!',
      name: 'Marcus Sterling (SysAdmin)',
      role: 'admin',
      department: 'Enterprise Operations',
      hasCompletedOnboarding: true,
    });

    console.log('Ensured demo accounts: trainee1, trainee2, supervisor1, admin1');

    const scenario = await ensureScenario();
    console.log(`Ensured scenario: ${scenario.title} (${scenario.code})`);

    const hasTrainee1Record = await ComplianceRecord.exists({ userId: trainee1._id });
    const hasTrainee2Record = await ComplianceRecord.exists({ userId: trainee2._id });

    if (!hasTrainee1Record || !hasTrainee2Record) {
      const recordsToCreate = [];

      if (!hasTrainee2Record) {
        recordsToCreate.push({
          userId: trainee2._id,
          userName: trainee2.name,
          department: trainee2.department,
          scenarioId: scenario._id,
          scenarioTitle: scenario.title,
          isPracticeMode: false,
          hazardsFound: [
            scenario.hotspots[0],
            scenario.hotspots[1],
            scenario.hotspots[2],
            scenario.hotspots[3],
            scenario.hotspots[4],
          ],
          hazardsMissed: [],
          falseClicksCount: 1,
          timeTakenSeconds: 52,
          timeLimitSeconds: 90,
          hazardScore: 95,
          quizScore: 100,
          totalScore: 97,
          passed: true,
          passingThreshold: 75,
          quizAnswers: [
            { questionId: 'quiz-1', selectedOption: 1, isCorrect: true },
            { questionId: 'quiz-2', selectedOption: 1, isCorrect: true },
            { questionId: 'quiz-3', selectedOption: 2, isCorrect: true },
            { questionId: 'quiz-4', selectedOption: 1, isCorrect: true },
          ],
          completedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        });
      }

      if (!hasTrainee1Record) {
        recordsToCreate.push({
          userId: trainee1._id,
          userName: trainee1.name,
          department: trainee1.department,
          scenarioId: scenario._id,
          scenarioTitle: scenario.title,
          isPracticeMode: false,
          hazardsFound: [scenario.hotspots[0], scenario.hotspots[2]],
          hazardsMissed: [scenario.hotspots[1], scenario.hotspots[3], scenario.hotspots[4]],
          falseClicksCount: 3,
          timeTakenSeconds: 88,
          timeLimitSeconds: 90,
          hazardScore: 35,
          quizScore: 50,
          totalScore: 41,
          passed: false,
          passingThreshold: 75,
          quizAnswers: [
            { questionId: 'quiz-1', selectedOption: 1, isCorrect: true },
            { questionId: 'quiz-2', selectedOption: 0, isCorrect: false },
            { questionId: 'quiz-3', selectedOption: 2, isCorrect: true },
            { questionId: 'quiz-4', selectedOption: 0, isCorrect: false },
          ],
          completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        });
      }

      if (recordsToCreate.length > 0) {
        await ComplianceRecord.create(recordsToCreate);
        console.log(`Ensured demo compliance records for ${recordsToCreate.length} trainee(s).`);
      }
    }
  } catch (error) {
    console.error('Error seeding database:', error);
  }
};
