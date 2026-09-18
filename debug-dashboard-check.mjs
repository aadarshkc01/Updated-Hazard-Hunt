const base = 'http://localhost:5000';

async function login(username, password, requestedRole) {
  const res = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, requestedRole })
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function getJson(url, token) {
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  const data = await res.json();
  return { status: res.status, data };
}

const results = [];

for (const [label, username, password, role] of [
  ['trainee', 'trainee1', 'SafetyPass123!', 'employee'],
  ['supervisor', 'supervisor1', 'SuperVisor2026!', 'supervisor'],
  ['admin', 'admin1', 'AdminMaster2026!', 'admin'],
]) {
  const auth = await login(username, password, role);
  const token = auth.data?.token;
  const team = token ? await getJson(`${base}/api/compliance/team`, token) : { status: 401, data: {} };
  const analytics = token ? await getJson(`${base}/api/compliance/analytics`, token) : { status: 401, data: {} };
  results.push({ label, authStatus: auth.status, authSuccess: auth.data?.success, tokenPresent: !!token, teamStatus: team.status, teamSuccess: team.data?.success, teamStats: team.data?.stats, analyticsStatus: analytics.status, analyticsSuccess: analytics.data?.success, totalAudits: analytics.data?.totalAudits, categoryBreakdown: analytics.data?.categoryBreakdown?.length ?? 0 });
}

console.log(JSON.stringify(results, null, 2));
