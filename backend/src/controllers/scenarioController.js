import { Scenario } from '../models/Scenario.js';

export const getActiveScenario = async (req, res) => {
  try {
    const scenario = await Scenario.findOne({ isActive: true });

    if (!scenario) {
      return res.status(404).json({
        success: false,
        message: 'No active hazard scenario currently configured',
      });
    }

    // Tamper resistance: Strip out correct answer indices from the quiz payload
    // Explanations and correct indices are verified strictly server-side
    const sanitizedQuiz = scenario.quizQuestions.map((q) => ({
      id: q.id,
      question: q.question,
      options: q.options,
      category: q.category,
    }));

    return res.status(200).json({
      success: true,
      scenario: {
        id: scenario._id,
        title: scenario.title,
        code: scenario.code,
        description: scenario.description,
        facility: scenario.facility,
        panoramaUrl: scenario.panoramaUrl,
        timeLimitSeconds: scenario.timeLimitSeconds,
        passingScorePercentage: scenario.passingScorePercentage,
        hotspots: scenario.hotspots,
        quizQuestions: sanitizedQuiz,
      },
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
      scenarios,
    });
  } catch (error) {
    console.error('getAllScenarios error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
