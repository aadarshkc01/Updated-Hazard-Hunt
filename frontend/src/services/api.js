const API_BASE = '/api';

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
};
