/**
 * Generates RFC 4180 compliant CSV string from compliance records
 */

/** ISO-8601 string, or '' when the value is missing/unparseable. */
const formatDate = (value) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
};

export const generateComplianceCSV = (records) => {
  const headers = [
    'Record ID',
    'Trainee Name',
    'Department',
    'Scenario Title',
    'Mode',
    'Training Mode',
    'Layout Seed',
    'Status',
    'Total Score (%)',
    'Hazard Score (%)',
    'Quiz Score (%)',
    'Hazards Found',
    'Hazards Missed',
    'False Clicks',
    'Time Taken (s)',
    'Passing Threshold (%)',
    'Completion Date (UTC)',
  ];

  const escapeCSV = (field) => {
    if (field === null || field === undefined) return '""';
    const stringField = String(field);
    if (
      stringField.includes(',') ||
      stringField.includes('"') ||
      stringField.includes('\n')
    ) {
      return `"${stringField.replace(/"/g, '""')}"`;
    }
    return `"${stringField}"`;
  };

  const rows = records.map((r) => [
    escapeCSV(r._id),
    escapeCSV(r.userName),
    escapeCSV(r.department || 'N/A'),
    escapeCSV(r.scenarioTitle),
    escapeCSV(r.isPracticeMode ? 'PRACTICE' : 'OFFICIAL'),
    escapeCSV(r.trainingMode === 'walkthrough' ? 'WALKTHROUGH' : '360'),
    escapeCSV(r.walkthroughLayoutSeed ?? 'N/A'),
    escapeCSV(r.passed ? 'PASS' : 'FAIL'),
    escapeCSV(r.totalScore),
    escapeCSV(r.hazardScore),
    escapeCSV(r.quizScore),
    escapeCSV(r.hazardsFound ? r.hazardsFound.length : 0),
    escapeCSV(r.hazardsMissed ? r.hazardsMissed.length : 0),
    escapeCSV(r.falseClicksCount || 0),
    escapeCSV(r.timeTakenSeconds),
    escapeCSV(r.passingThreshold || 75),
    // Defensive: legacy/hand-inserted records may carry an absent or malformed
    // completedAt. Emitting an empty cell keeps the export from failing outright.
    escapeCSV(formatDate(r.completedAt)),
  ]);

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
};
