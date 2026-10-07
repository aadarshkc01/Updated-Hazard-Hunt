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
      trainingMode = 'panorama360',
      walkthroughLayoutSeed = null,
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
      trainingMode: ['panorama360', 'walkthrough'].includes(trainingMode) ? trainingMode : 'panorama360',
      // Sanitised, not trusted: only a finite non-negative integer is retained.
      walkthroughLayoutSeed: Number.isInteger(walkthroughLayoutSeed) && walkthroughLayoutSeed >= 0
        ? walkthroughLayoutSeed
        : null,
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
        trainingMode: record.trainingMode,
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

    // ── Derived analytics ──────────────────────────────────────────────────────
    // Everything below is computed from the same record set as
    // `categoryBreakdown` rather than counted in the database, so the figures
    // cannot drift apart. Every division is guarded: an empty deployment
    // returns zeroes, never NaN.

    const official = records.filter((r) => r?.isPracticeMode === false);
    const practice = records.filter((r) => r?.isPracticeMode === true);
    const num = (v) => Number(v ?? 0);

    /** Median — far more representative than a mean for skewed timings. */
    const median = (values) => {
      if (!values.length) return 0;
      const sorted = [...values].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
    };

    /** Order statistic, used for the "slowest 10%" figure. */
    const percentile = (values, p) => {
      if (!values.length) return 0;
      const sorted = [...values].sort((a, b) => a - b);
      return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))];
    };

    const mean = (list) => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : 0);
    const scores = records.map((r) => num(r?.totalScore));
    const times = records.map((r) => num(r?.timeTakenSeconds)).filter((t) => t > 0);

    /**
     * Score trend: the most recent half of attempts against the earlier half.
     * This is the figure a supervisor can act on — a single strong session can
     * flatter a mean, but it cannot reverse a cohort-wide direction.
     */
    const half = Math.floor(scores.length / 2);
    const recentAvg = mean(scores.slice(scores.length - half));
    const earlierAvg = mean(scores.slice(0, scores.length - half));
    const scoreTrend =
      half === 0
        ? { direction: 'INSUFFICIENT_DATA', deltaPoints: 0, recentAvg: 0, earlierAvg: 0 }
        : {
            direction:
              recentAvg - earlierAvg > 2
                ? 'IMPROVING'
                : earlierAvg - recentAvg > 2
                  ? 'DECLINING'
                  : 'STABLE',
            deltaPoints: Math.round((recentAvg - earlierAvg) * 10) / 10,
            recentAvg: Math.round(recentAvg * 10) / 10,
            earlierAvg: Math.round(earlierAvg * 10) / 10,
          };

    /**
     * Detection accuracy: of everything a trainee clicked, how much was a real
     * hazard. Precision and false-click count share one root cause (clicking
     * without looking), so they are reported together.
     */
    const totalSpotted = Object.values(categoryStats).reduce((a, s) => a + s.spotted, 0);
    const totalMissed = Object.values(categoryStats).reduce((a, s) => a + s.missed, 0);
    const totalClicks = totalSpotted + totalMissed + totalFalse;
    const precision = totalClicks > 0 ? Math.round((totalSpotted / totalClicks) * 1000) / 10 : 0;

    /** Most-missed category — the single highest-value training message. */
    const topGap = [...categoryBreakdown]
      .filter((c) => c.missed > 0)
      .sort((a, b) => b.missed - a.missed)[0] ?? null;

    /**
     * Seven-day activity, oldest first so it plots directly. Bucketed on the
     * server clock so every client agrees on what "today" means.
     */
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const weeklyActivity = [];
    for (let i = 6; i >= 0; i -= 1) {
      const dayEnd = new Date(today);
      dayEnd.setDate(dayEnd.getDate() - i);
      const dayStart = new Date(dayEnd);
      dayStart.setHours(0, 0, 0, 0);
      const inDay = records.filter((r) => {
        const at = new Date(r?.completedAt ?? 0);
        return at >= dayStart && at <= dayEnd;
      });
      weeklyActivity.push({
        date: dayStart.toISOString().slice(0, 10),
        label: dayStart.toLocaleDateString('en-GB', { weekday: 'short' }),
        attempts: inDay.length,
        passed: inDay.filter((r) => r?.passed === true).length,
        avgScore:
          inDay.length > 0
            ? Math.round((inDay.reduce((a, r) => a + num(r?.totalScore), 0) / inDay.length) * 10) / 10
            : 0,
      });
    }

    /**
     * Practice vs official split. If most volume is practice, the compliance
     * pass rate is not yet a meaningful figure — worth saying out loud.
     */
    const practiceShare = records.length > 0 ? Math.round((practice.length / records.length) * 100) : 0;

    return res.status(200).json({
      success: true,
      totalAudits: records.length,
      avgTimeTakenSeconds: avgTimeTaken,
      avgFalseClicksCount: Number(avgFalseClicks),
      categoryBreakdown,
      scoreDistribution: distribution,
      analytics: {
        officialAttempts: official.length,
        practiceAttempts: practice.length,
        practiceSharePercentage: practiceShare,

        medianTimeTakenSeconds: median(times),
        p90TimeTakenSeconds: percentile(times, 0.9),
        fastestTimeSeconds: times.length ? Math.min(...times) : 0,

        medianScore: median(scores),
        scoreSpread: scores.length
          ? Math.round((Math.max(...scores) - Math.min(...scores)) * 10) / 10
          : 0,

        detectionAccuracyPercentage: precision,
        totalSpotted,
        totalMissed,
        totalFalseClicks: totalFalse,

        scoreTrend,
        topGapCategory: topGap
          ? {
              category: topGap.category,
              missed: topGap.missed,
              missRatePercentage: topGap.missRatePercentage,
            }
          : null,
        weeklyActivity,
      },
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
