import { jsPDF } from 'jspdf';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('hazard_hunt_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const api = {
  // Auth
  async login(username, password, requestedRole) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, requestedRole }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Login failed');
    return data;
  },

  async getMe() {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to get current user');
    return data;
  },

  async completeOnboarding() {
    const res = await fetch(`${API_BASE}/auth/complete-onboarding`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update onboarding');
    return data;
  },

  // Scenarios
  async getActiveScenario() {
    const res = await fetch(`${API_BASE}/scenarios/active`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to load scenario');
    return data.scenario;
  },

  // Compliance & Trainee
  async submitAttempt(payload) {
    const res = await fetch(`${API_BASE}/compliance/submit`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to submit compliance record');
    return data;
  },

  async getMyHistory() {
    const res = await fetch(`${API_BASE}/compliance/my-history`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to load history');
    return data.records;
  },

  // Supervisor & Admin Analytics Endpoints
  async getTeamDashboard() {
    const res = await fetch(`${API_BASE}/compliance/team`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to load team dashboard');
    return data;
  },

  async getAnalyticsSummary() {
    const res = await fetch(`${API_BASE}/compliance/analytics`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to load vulnerability analytics');
    return data;
  },

  async getTraineeAudit(traineeId) {
    const res = await fetch(`${API_BASE}/compliance/trainee/${traineeId}`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to load trainee audit detail');
    return data;
  },

  async downloadComplianceCSV() {
    const token = localStorage.getItem('hazard_hunt_token');
    const res = await fetch(`${API_BASE}/compliance/export-csv`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) throw new Error('Failed to download CSV');

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Hazard_Hunt_Compliance_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },

  downloadScoreReport(records = [], user = {}) {
    const officialRecords = records
      .filter((record) => !record.isPracticeMode)
      .sort((left, right) => new Date(right.completedAt || 0) - new Date(left.completedAt || 0));
    if (!officialRecords.length) {
      throw new Error('No official score records are available yet');
    }

    const latest = officialRecords[0];
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    const orange = [255, 97, 21];
    const ink = [15, 23, 42];
    const muted = [100, 116, 139];
    const line = [226, 232, 240];
    const result = latest.isPracticeMode ? 'Practice' : latest.passed ? 'Passed' : 'Failed';
    const safeName = (user.username || 'employee').replace(/[^a-z0-9_-]/gi, '_');

    pdf.setTextColor(...orange);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('HAZARD HUNT', 20, 22);
    pdf.setTextColor(...ink);
    pdf.setFontSize(22);
    pdf.text('Score Report', 20, 34);
    pdf.setTextColor(...muted);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Generated ${new Date().toLocaleDateString('en-GB')}`, 20, 42);

    pdf.setDrawColor(...line);
    pdf.line(20, 49, 190, 49);
    pdf.setTextColor(...ink);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(user.name || 'Employee', 20, 61);
    pdf.setTextColor(...muted);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`@${user.username || 'employee'}${user.department ? ` · ${user.department}` : ''}`, 20, 68);

    pdf.setFillColor(latest.passed ? 236 : 254, latest.passed ? 253 : 242, latest.passed ? 245 : 242);
    pdf.roundedRect(20, 79, 170, 29, 3, 3, 'F');
    pdf.setTextColor(...muted);
    pdf.setFontSize(9);
    pdf.text('LATEST RESULT', 28, 89);
    pdf.setTextColor(latest.passed ? 5 : 220, latest.passed ? 150 : 38, latest.passed ? 105 : 38);
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${latest.totalScore ?? 0}%`, 28, 101);
    pdf.setTextColor(...ink);
    pdf.setFontSize(11);
    pdf.text(result, 70, 98);
    pdf.setTextColor(...muted);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text(latest.completedAt ? new Date(latest.completedAt).toLocaleString('en-GB') : '', 70, 104);

    const metrics = [
      ['Hazard score', `${latest.hazardScore ?? 0}%`],
      ['Quiz score', `${latest.quizScore ?? 0}%`],
      ['Hazards found', `${latest.hazardsFound?.length ?? 0}`],
      ['False clicks', `${latest.falseClicksCount ?? 0}`],
      ['Time taken', `${latest.timeTakenSeconds ?? 0}s`],
    ];
    let y = 126;
    pdf.setTextColor(...ink);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Assessment details', 20, y);
    y += 11;
    pdf.setFontSize(10);
    metrics.forEach(([label, value]) => {
      pdf.setTextColor(...muted);
      pdf.setFont('helvetica', 'normal');
      pdf.text(label, 24, y);
      pdf.setTextColor(...ink);
      pdf.setFont('helvetica', 'bold');
      pdf.text(value, 130, y);
      pdf.setDrawColor(...line);
      pdf.line(24, y + 3, 186, y + 3);
      y += 10;
    });

    y += 8;
    pdf.setTextColor(...muted);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text('This report summarises the latest completed assessment. Practice sessions are not official compliance records.', 20, y, { maxWidth: 170 });
    pdf.save(`Hazard_Hunt_${safeName}_Score_Report.pdf`);
  },

  async createAccount(userData) {
    const res = await fetch(`${API_BASE}/compliance/users`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(userData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to create user account');
    return data;
  },

  async getAllUsers() {
    const res = await fetch(`${API_BASE}/compliance/users/all`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch users');
    return data.users;
  },

  async deleteUser(userId) {
    const res = await fetch(`${API_BASE}/compliance/users/${userId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to delete user');
    return data;
  },
};
