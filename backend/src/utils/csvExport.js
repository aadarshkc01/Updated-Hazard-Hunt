/**
 * Generates RFC 4180 compliant CSV string from compliance records
 */
export const generateComplianceCSV = (records) => {
  const headers = [
    'Record ID',
    'Trainee Name',
    'Department',
    'Scenario Title',
    'Mode',
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
    escapeCSV(r.passed ? 'PASS' : 'FAIL'),
    escapeCSV(r.totalScore),
    escapeCSV(r.hazardScore),
    escapeCSV(r.quizScore),
    escapeCSV(r.hazardsFound ? r.hazardsFound.length : 0),
    escapeCSV(r.hazardsMissed ? r.hazardsMissed.length : 0),
    escapeCSV(r.falseClicksCount || 0),
    escapeCSV(r.timeTakenSeconds),
    escapeCSV(r.passingThreshold || 75),
    escapeCSV(new Date(r.completedAt).toISOString()),
  ]);

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
};
