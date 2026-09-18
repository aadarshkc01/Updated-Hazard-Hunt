import { Scenario } from '../models/Scenario.js';
import { ComplianceRecord } from '../models/ComplianceRecord.js';
import { User } from '../models/User.js';
import { calculateComplianceScore } from '../utils/scoring.js';
import { generateComplianceCSV } from '../utils/csvExport.js';

export const submitAttempt = async (req, res) => {
  try {
    const {
      scenarioId,
      foundHotspotIds = [],
      falseClicksCount = 0,
      timeTakenSeconds = 0,
      quizAnswers = [],
      isPracticeMode = false,
    } = req.body;

    if (!scenarioId) {
      return res.status(400).json({
        success: false,
        message: 'Scenario ID is required for compliance evaluation',
      });
    }

    const scenario = await Scenario.findById(scenarioId);
    if (!scenario) {
      return res.status(404).json({
        success: false,
        message: 'Specified scenario not found',
      });
    }

    // Server-side calculation ensures scores cannot be forged in client browser
    const diagnostic = calculateComplianceScore({
      scenario,
      foundHotspotIds,
      falseClicksCount,
      timeTakenSeconds,
      quizAnswers,
    });

    const record = await ComplianceRecord.create({
      userId: req.user._id,
      userName: req.user.name,
      department: req.user.department,
      scenarioId: scenario._id,
      scenarioTitle: scenario.title,
      isPracticeMode: Boolean(isPracticeMode),
      hazardsFound: diagnostic.hazardsFound,
      hazardsMissed: diagnostic.hazardsMissed,
      falseClicksCount: diagnostic.falseClicksCount,
      timeTakenSeconds: diagnostic.timeTakenSeconds,
      timeLimitSeconds: diagnostic.timeLimitSeconds,
      hazardScore: diagnostic.hazardScore,
      quizScore: diagnostic.quizScore,
      totalScore: diagnostic.totalScore,
      passed: diagnostic.passed,
      passingThreshold: diagnostic.passingThreshold,
      quizAnswers: diagnostic.evaluatedQuizAnswers.map((ans) => ({
        questionId: ans.questionId,
        selectedOption: ans.selectedOption,
        isCorrect: ans.isCorrect,
      })),
      completedAt: new Date(),
    });

    return res.status(201).json({
      success: true,
      message: isPracticeMode
        ? 'Practice attempt completed (not recorded as official compliance)'
        : 'Official compliance record registered successfully',
      recordId: record._id,
      diagnostic: {
        recordId: record._id,
        userName: req.user.name,
        scenarioTitle: scenario.title,
        isPracticeMode: record.isPracticeMode,
        passed: diagnostic.passed,
        passingThreshold: diagnostic.passingThreshold,
        totalScore: diagnostic.totalScore,
        hazardScore: diagnostic.hazardScore,
        quizScore: diagnostic.quizScore,
        foundCount: diagnostic.foundCount,
        missedCount: diagnostic.missedCount,
        totalHazards: diagnostic.totalHazards,
        hazardsFound: diagnostic.hazardsFound,
        hazardsMissed: diagnostic.hazardsMissed,
        falseClicksCount: diagnostic.falseClicksCount,
        timeTakenSeconds: diagnostic.timeTakenSeconds,
        timeLimitSeconds: diagnostic.timeLimitSeconds,
        quizReview: diagnostic.evaluatedQuizAnswers,
        completedAt: record.completedAt,
      },
    });
  } catch (error) {
    console.error('submitAttempt error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while calculating and saving compliance record',
    });
  }
};

export const getMyHistory = async (req, res) => {
  try {
    const records = await ComplianceRecord.find({ userId: req.user._id })
      .sort({ completedAt: -1 })
      .limit(30);

    return res.status(200).json({
      success: true,
      count: records.length,
      records,
    });
  } catch (error) {
    console.error('getMyHistory error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getTeamDashboard = async (req, res) => {
  try {
    // 1. Fetch all employee users
    const employees = await User.find({ role: 'employee' })
      .select('-password')
      .lean();

    // 2. Fetch all official records
    const officialRecords = await ComplianceRecord.find({ isPracticeMode: false })
      .sort({ completedAt: -1 })
      .lean();

    // 3. Match latest record per employee
    const employeeSummaries = employees.map((emp) => {
      const empRecords = officialRecords.filter(
        (r) => r.userId.toString() === emp._id.toString()
      );
      const latestRecord = empRecords[0] || null;

      return {
        id: emp._id,
        name: emp.name,
        username: emp.username,
        department: emp.department,
        totalAttempts: empRecords.length,
        hasAttempted: Boolean(latestRecord),
        status: latestRecord ? (latestRecord.passed ? 'PASS' : 'FAIL') : 'PENDING',
        latestScore: latestRecord ? latestRecord.totalScore : null,
        hazardScore: latestRecord ? latestRecord.hazardScore : null,
        quizScore: latestRecord ? latestRecord.quizScore : null,
        lastAttemptDate: latestRecord ? latestRecord.completedAt : null,
        hazardsFoundCount: latestRecord ? latestRecord.hazardsFound.length : 0,
        hazardsMissedCount: latestRecord ? latestRecord.hazardsMissed.length : 0,
        falseClicksCount: latestRecord ? latestRecord.falseClicksCount : 0,
        timeTakenSeconds: latestRecord ? latestRecord.timeTakenSeconds : 0,
      };
    });

    // 4. Calculate team-wide analytics KPIs
    const attemptedEmployees = employeeSummaries.filter((e) => e.hasAttempted);
    const passedEmployees = attemptedEmployees.filter((e) => e.status === 'PASS');

    const passRate =
      attemptedEmployees.length > 0
        ? Math.round((passedEmployees.length / attemptedEmployees.length) * 100)
        : 0;

    const avgScore =
      attemptedEmployees.length > 0
        ? Math.round(
            attemptedEmployees.reduce((acc, curr) => acc + (curr.latestScore || 0), 0) /
              attemptedEmployees.length
          )
        : 0;

    return res.status(200).json({
      success: true,
      stats: {
        totalEmployees: employees.length,
        attemptedCount: attemptedEmployees.length,
        passedCount: passedEmployees.length,
        failedCount: attemptedEmployees.length - passedEmployees.length,
        pendingCount: employees.length - attemptedEmployees.length,
        passRatePercentage: passRate,
        averageScorePercentage: avgScore,
      },
      team: employeeSummaries,
    });
  } catch (error) {
    console.error('getTeamDashboard error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Real-Time Hazard Vulnerability Radar & Analytics
export const getAnalyticsSummary = async (req, res) => {
  try {
    const allRecords = await ComplianceRecord.find().lean();
    const records = Array.isArray(allRecords) ? allRecords.filter(Boolean) : [];

    const safeList = (value) => {
      if (!Array.isArray(value)) return [];
      return value.filter((item) => item && typeof item === 'object');
    };

    const categoryStats = {
      'Chemical & Slip Hazard': { spotted: 0, missed: 0, total: 0 },
      'Material Handling': { spotted: 0, missed: 0, total: 0 },
      'Fire Safety': { spotted: 0, missed: 0, total: 0 },
      'Electrical & Trip Hazard': { spotted: 0, missed: 0, total: 0 },
      'Traffic Separation': { spotted: 0, missed: 0, total: 0 },
    };

    records.forEach((rec) => {
      safeList(rec.hazardsFound).forEach((h) => {
        const cat = h.category || 'Material Handling';
        if (categoryStats[cat]) {
          categoryStats[cat].spotted += 1;
          categoryStats[cat].total += 1;
        }
      });

      safeList(rec.hazardsMissed).forEach((h) => {
        const cat = h.category || 'Material Handling';
        if (categoryStats[cat]) {
          categoryStats[cat].missed += 1;
          categoryStats[cat].total += 1;
        }
      });
    });

    const categoryBreakdown = Object.entries(categoryStats).map(([category, stats]) => {
      const missRate = stats.total > 0 ? Math.round((stats.missed / stats.total) * 100) : 0;
      const spotRate = stats.total > 0 ? Math.round((stats.spotted / stats.total) * 100) : 0;
      return {
        category,
        spotted: stats.spotted,
        missed: stats.missed,
        totalOccurrences: stats.total,
        missRatePercentage: missRate,
        spotRatePercentage: spotRate,
        riskLevel: missRate > 40 ? 'CRITICAL' : missRate > 20 ? 'MEDIUM' : 'LOW',
      };
    });

    const distribution = {
      distDistinction: records.filter((r) => Number(r?.totalScore ?? 0) >= 90).length,
      distPass: records.filter((r) => Number(r?.totalScore ?? 0) >= 75 && Number(r?.totalScore ?? 0) < 90).length,
      distNearMiss: records.filter((r) => Number(r?.totalScore ?? 0) >= 60 && Number(r?.totalScore ?? 0) < 75).length,
      distFail: records.filter((r) => Number(r?.totalScore ?? 0) < 60).length,
    };

    const totalTime = records.reduce((acc, r) => acc + Number(r?.timeTakenSeconds ?? 0), 0);
    const avgTimeTaken = records.length > 0 ? Math.round(totalTime / records.length) : 0;

    const totalFalse = records.reduce((acc, r) => acc + Number(r?.falseClicksCount ?? 0), 0);
    const avgFalseClicks = records.length > 0 ? (totalFalse / records.length).toFixed(1) : '0';

    return res.status(200).json({
      success: true,
      totalAudits: records.length,
      avgTimeTakenSeconds: avgTimeTaken,
      avgFalseClicksCount: Number(avgFalseClicks),
      categoryBreakdown,
      scoreDistribution: distribution,
    });
  } catch (error) {
    console.error('getAnalyticsSummary error:', error);
    return res.status(500).json({ success: false, message: 'Server error calculating analytics' });
  }
};

// Detailed Audit Inspection Drawer for a specific Trainee
export const getTraineeAuditDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const trainee = await User.findById(id).select('-password').lean();
    if (!trainee) {
      return res.status(404).json({ success: false, message: 'Trainee not found' });
    }

    const records = await ComplianceRecord.find({ userId: id })
      .sort({ completedAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      trainee,
      totalAttempts: records.length,
      records,
    });
  } catch (error) {
    console.error('getTraineeAuditDetail error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const exportComplianceCSV = async (req, res) => {
  try {
    const records = await ComplianceRecord.find().sort({ completedAt: -1 }).lean();
    const csvData = generateComplianceCSV(records);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=Hazard_Hunt_Compliance_Report_${new Date().toISOString().slice(0, 10)}.csv`
    );

    return res.status(200).send(csvData);
  } catch (error) {
    console.error('exportComplianceCSV error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate CSV export' });
  }
};

// Role-Hardened Account Creation (FR-11)
export const createAccount = async (req, res) => {
  try {
    const { username, password, name, role = 'employee', department } = req.body;

    if (!username || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Username, password, and full name are required',
      });
    }

    // Role Provisioning Boundary: Supervisors CANNOT create supervisors or admins!
    if (req.user.role === 'supervisor') {
      if (role && role !== 'employee') {
        return res.status(403).json({
          success: false,
          message:
            'Access Denied: HSE Supervisors have clearance to provision Employee (Trainee) credentials only. Only System Administrators can provision Supervisor accounts.',
        });
      }
    }

    const existing = await User.findOne({ username: username.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'An account with that username already exists',
      });
    }

    // Determine safe assigned role based on creator's permission
    const assignedRole =
      req.user.role === 'admin' && ['employee', 'supervisor'].includes(role)
        ? role
        : 'employee';

    const newUser = await User.create({
      username: username.toLowerCase().trim(),
      password,
      name: name.trim(),
      role: assignedRole,
      department: department?.trim() || 'Inbound Logistics Bay 4',
      hasCompletedOnboarding: assignedRole === 'employee' ? false : true,
    });

    return res.status(201).json({
      success: true,
      message: `Account created successfully for ${newUser.name} (${newUser.role})`,
      user: {
        id: newUser._id,
        username: newUser.username,
        name: newUser.name,
        role: newUser.role,
        department: newUser.department,
      },
    });
  } catch (error) {
    console.error('createAccount error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create user account' });
  }
};

// Admin User Management: Fetch all users
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 }).lean();
    return res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error('getAllUsers error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
