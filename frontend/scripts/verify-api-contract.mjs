/**
 * Contract guard between the frontend API client and the backend routes.
 *
 * The Delete button in the admin panel shipped broken because
 * `services/api.js` has called `DELETE /api/compliance/users/:id` since the
 * beginning, while the backend never implemented that route. The client and
 * the server were written independently and nothing compared them, so a
 * missing endpoint produced a runtime "Route not found" instead of a build or
 * test failure.
 *
 * This harness parses both sides and fails if any call the frontend makes has
 * no matching server route. It also checks the reverse direction, so a backend
 * route nobody can reach is caught too.
 */
import assert from 'assert';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const BACKEND = resolve(ROOT, '..', 'backend', 'src');

const results = [];
const check = (name, fn) => {
  try {
    fn();
    results.push({ name, ok: true });
    console.log(`PASS  ${name}`);
  } catch (err) {
    results.push({ name, ok: false });
    console.log(`FAIL  ${name}`);
    console.log(`      ${err.message}`);
  }
};

const apiSrc = readFileSync(resolve(ROOT, 'src', 'services', 'api.js'), 'utf8');

/**
 * Every `${API_BASE}/...` in the client, with its HTTP method.
 * Methods are matched from the fetch options object that follows each path;
 * a call with no `method:` defaults to GET, which is what fetch does too.
 */
const clientCalls = () => {
  const calls = [];
  const re = /\$\{API_BASE\}([^\s`'"\\]*)/g;
  let m;
  while ((m = re.exec(apiSrc))) {
    const tail = apiSrc.slice(m.index, m.index + 260);
    const verb = tail.match(/method:\s*'([A-Z]+)'/);
    calls.push({
      path: m[1],
      method: verb ? verb[1] : 'GET',
      template: m[0],
    });
  }
  return calls;
};

/** Backend routes, as `${METHOD} ${mountedPath}` keyed by the router file. */
const serverRoutes = () => {
  const mounts = [];
  const server = readFileSync(resolve(BACKEND, 'server.js'), 'utf8');
  const mountRe = /app\.use\(\s*'([^']+)'\s*,\s*(\w+)\s*\)/g;
  let m;
  while ((m = mountRe.exec(server))) mounts.push({ prefix: m[1], router: m[2] });

  const routers = {
    authRoutes: readFileSync(resolve(BACKEND, 'routes', 'authRoutes.js'), 'utf8'),
    scenarioRoutes: readFileSync(resolve(BACKEND, 'routes', 'scenarioRoutes.js'), 'utf8'),
    complianceRoutes: readFileSync(resolve(BACKEND, 'routes', 'complianceRoutes.js'), 'utf8'),
  };

  const routes = [];
  for (const { prefix, router } of mounts) {
    const src = routers[router];
    if (!src) continue;
    const re = /router\.(get|post|put|patch|delete)\(\s*'([^']*)'/gi;
    let r;
    while ((r = re.exec(src))) {
      routes.push({ method: r[1].toUpperCase(), path: prefix + r[2] });
    }
  }
  return routes;
};

/**
 * Normalise a path to comparable segments.
 *
 * The client writes paths relative to API_BASE ('/compliance/users'), while the
 * server stores them fully mounted ('/api/compliance/users'), so the mount
 * prefix is added before comparing. A trailing slash is dropped too, since
 * Express treats '/api/scenarios' and '/api/scenarios/' as the same route.
 */
const normalise = (p) => {
  let s = p.split('?')[0];
  if (s.length > 1 && s.endsWith('/')) s = s.slice(0, -1);
  return s;
};

const segments = (path) => {
  const p = normalise(path);
  return (p.startsWith('/api') ? p : '/api' + p).split('/').filter(Boolean);
};

/** Express treats `/x/:id` as matching `/x/anything`, so compare on segments. */
const matches = (route, call) => {
  if (route.method !== call.method) return false;
  const rSeg = segments(route.path);
  const cSeg = segments(call.path);
  if (rSeg.length !== cSeg.length) return false;
  return rSeg.every((seg, i) => seg.startsWith(':') || seg === cSeg[i]);
};

/**
 * Routes that exist server-side on purpose without a client caller.
 *
 * `GET /api/scenarios` backs the admin scenario list and is reachable by API
 * clients; the SPA itself only ever asks for `/active`. Listing it here keeps
 * the reachability check strict for everything else: a NEW orphaned route still
 * fails, because it would not be in this set.
 */
const UNCALLED_BY_DESIGN = new Set(['GET /api/scenarios']);

const calls = clientCalls();
const routes = serverRoutes().map((r) => ({ ...r, path: normalise(r.path) }));

// ---------------------------------------------------------------------------
check('the client and the server were both parsed', () => {
  // Guards against a broken regex silently matching nothing, which would make
  // every check below pass for the wrong reason.
  assert.ok(calls.length >= 13, `only found ${calls.length} client calls`);
  assert.ok(routes.length >= 14, `only found ${routes.length} server routes`);
  assert.ok(
    calls.some((c) => c.method === 'DELETE'),
    'no DELETE call parsed, so the contract check cannot see the delete bug'
  );
});

check('EVERY client call has a matching server route', () => {
  const missing = calls.filter((c) => !routes.some((r) => matches(r, c)));
  assert.strictEqual(
    missing.length,
    0,
    'unrouted client calls:\n        ' +
      missing.map((c) => `${c.method} ${c.path}`).join('\n        ')
  );
});

check('EVERY server route is reachable from the client', () => {
  const unused = routes
    .filter((r) => !calls.some((c) => matches(r, c)))
    .filter((r) => !UNCALLED_BY_DESIGN.has(`${r.method} ${r.path}`));
  assert.strictEqual(
    unused.length,
    0,
    'server routes no client calls:\n        ' +
      unused.map((r) => `${r.method} ${r.path}`).join('\n        ')
  );
});

check('the documented uncalled routes still exist', () => {
  UNCALLED_BY_DESIGN.forEach((sig) => {
    const [method, path] = sig.split(' ');
    assert.ok(
      routes.some((r) => r.method === method && r.path === path),
      `${sig} is listed as intentional but is not registered`
    );
  });
});

// ---------------------------------------------------------------------------
// The reported regression.
check('REGRESSION: DELETE /compliance/users/:id is implemented', () => {
  const hit = routes.find((r) => r.method === 'DELETE' && r.path === '/api/compliance/users/:id');
  assert.ok(hit, 'the delete route the admin panel calls does not exist');
});

check('REGRESSION: the delete route is admin-only and authenticated', () => {
  const src = readFileSync(resolve(BACKEND, 'routes', 'complianceRoutes.js'), 'utf8');
  const line = src.split('\n').find((l) => l.includes("router.delete('/users/:id'"));
  assert.ok(line, 'delete route line not found');
  assert.ok(line.includes("requireRole('admin')"), 'delete route is not admin-gated');
  assert.ok(line.includes('protect'), 'delete route is not auth-gated');
});

check('REGRESSION: the literal /users/all path is registered before /users/:id', () => {
  const src = readFileSync(resolve(BACKEND, 'routes', 'complianceRoutes.js'), 'utf8');
  const allAt = src.indexOf("router.get('/users/all'");
  const idAt = src.indexOf("router.delete('/users/:id'");
  assert.ok(allAt > -1 && idAt > -1, 'one of the two routes is missing');
  assert.ok(
    allAt < idAt,
    'if /users/:id were registered first it could shadow /users/all'
  );
});

check('REGRESSION: the delete controller guards against deleting the caller', () => {
  const src = readFileSync(resolve(BACKEND, 'controllers', 'complianceController.js'), 'utf8');
  const fn = src.slice(src.indexOf('export const deleteUser'));
  assert.ok(fn.includes('req.user._id'), 'no self-deletion guard');
});

check('REGRESSION: the delete controller protects the last administrator', () => {
  const src = readFileSync(resolve(BACKEND, 'controllers', 'complianceController.js'), 'utf8');
  const fn = src.slice(src.indexOf('export const deleteUser'));
  assert.ok(fn.includes("countDocuments({ role: 'admin' })"), 'no last-admin check');
});

// ---------------------------------------------------------------------------
// Credential exposure.
//
// `getAllUsers` used `.select('-password')`, which cannot exclude `passwordHash`
// because that path is not on the schema, so `.lean()` served five live bcrypt
// hashes to admin and supervisor clients. The fix is at the schema, so the
// exclusion cannot be forgotten by a future endpoint.
check('credentials are excluded at the schema, not per query', () => {
  const src = readFileSync(resolve(BACKEND, 'models', 'User.js'), 'utf8');
  // Each field's block runs from its own declaration to the next top-level field.
  const blockAfter = (field) => {
    const at = src.indexOf(field);
    assert.ok(at > -1, `${field} is not declared on the schema`);
    const rest = src.slice(at + field.length);
    const next = rest.search(/\n    \w+:\s*\{/);
    return next === -1 ? rest : rest.slice(0, next);
  };
  assert.ok(
    blockAfter('password: {').includes('select: false'),
    'password must be select:false so no query can leak it'
  );
  assert.ok(
    blockAfter('passwordHash: {').includes('select: false'),
    'the legacy passwordHash must be select:false too'
  );
});

check('login still reads the password it needs', () => {
  // select:false would silently break every sign-in if login did not opt back in.
  const src = readFileSync(resolve(BACKEND, 'controllers', 'authController.js'), 'utf8');
  const q = src.slice(src.indexOf('export const login'), src.indexOf('export const getMe'));
  assert.ok(
    q.includes('+password'),
    'login must opt back in with +password or every sign-in fails'
  );
});

const failed = results.filter((r) => !r.ok);
console.log('');
if (failed.length) {
  console.log(`${failed.length} of ${results.length} API-contract checks FAILED`);
  process.exit(1);
}
console.log(`All ${results.length} API-contract checks passed.`);