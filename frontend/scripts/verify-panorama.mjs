/**
 * Regression guard for the panorama swap.
 *
 * The standard 360 view and the 3D walkthrough are two depictions of one
 * scenario, and they are NOT supposed to share hazard coordinates. Swapping the
 * panorama therefore had to be provably isolated: the walkthrough's hazards,
 * its staged 3D layout and the quiz all had to come through unchanged.
 *
 * The isolation rests on three facts, each asserted below:
 *
 *   1. `hotspots` is untouched - same ids, same wording. The walkthrough reads
 *      only this array, plus a separately generated 3D layout.
 *   2. `panoramaSpots` reuses the same five ids, so scoring - which keys purely
 *      on id - resolves a find identically whichever view produced it.
 *   3. `pitch`/`yaw` are read only by the panorama, so new coordinates cannot
 *      move anything in the walkthrough.
 *
 * It also guards the hotspot geometry itself: Pannellum clamps every hit to
 * MAX_HIT_RADIUS = 5 degrees, so two spots closer than 10 degrees apart would
 * shadow each other and one hazard would be unclickable. That is a silent
 * failure - the session still completes - so it is worth asserting directly.
 */
import assert from 'assert';
import { readFileSync, existsSync } from 'fs';
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

/** The canonical walkthrough hazards, which must survive a panorama swap. */
const HOTSPOT_IDS = [
  'hazard-spill',
  'hazard-pallet',
  'hazard-exit',
  'hazard-cable',
  'hazard-forklift',
];

/** MAX_HIT_RADIUS in PanoramaViewer.jsx. Pannellum cannot exceed this. */
const MAX_HIT_RADIUS = 5;

const PANORAMA_SPOTS = [
  { id: 'hazard-spill', title: 'Loose Pipe Stack Blocking the Marked Walkway', pitch: -18, yaw: -25 },
  { id: 'hazard-pallet', title: 'Steel Offcuts Stacked Over the Painted Route', pitch: -27, yaw: -106 },
  { id: 'hazard-exit', title: 'Welding Screen Obstructing Sightline and Escape Route', pitch: 3, yaw: 170 },
  { id: 'hazard-cable', title: 'Welding Plant with Leads Trailing Across the Floor', pitch: -17, yaw: 80 },
  { id: 'hazard-forklift', title: 'Crane Hook Suspended Over the Working Aisle', pitch: 39, yaw: 61 },
];

const seedSrc = readFileSync(resolve(BACKEND, 'seeds', 'seedData.js'), 'utf8');
const viewerSrc = readFileSync(
  resolve(ROOT, 'src', 'components', 'viewer', 'PanoramaViewer.jsx'),
  'utf8'
);
const walkSrc = readFileSync(
  resolve(ROOT, 'src', 'components', 'viewer', 'WalkthroughViewer.jsx'),
  'utf8'
);

// ---------------------------------------------------------------------------
// Isolation: the walkthrough must be untouched.
check('the walkthrough never reads panoramaSpots', () => {
  assert.ok(
    !walkSrc.includes('panoramaSpots'),
    'WalkthroughViewer must not reference panoramaSpots'
  );
});

check('the walkthrough still stages props from the generated 3D layout', () => {
  assert.ok(walkSrc.includes('stagedItems'), 'expected layout-driven staging');
  assert.ok(
    walkSrc.includes('item.position'),
    'walkthrough must position props from layout coordinates, not yaw/pitch'
  );
});

check('the walkthrough hazard ids are unchanged by the panorama work', () => {
  HOTSPOT_IDS.forEach((id) => {
    assert.ok(seedSrc.includes(`id: '${id}'`), `seed lost hotspot id ${id}`);
  });
});

check('all five walkthrough hotspots remain in the seed data', () => {
  const block = seedSrc.slice(seedSrc.indexOf('hotspots: ['), seedSrc.indexOf('panoramaSpots: ['));
  HOTSPOT_IDS.forEach((id) => {
    assert.ok(block.includes(`id: '${id}'`), `hotspots[] lost ${id}`);
  });
});

check('the quiz is not altered by the panorama swap', () => {
  const quiz = seedSrc.slice(seedSrc.indexOf('quizQuestions: ['), seedSrc.indexOf('panoramaSpots: ['));
  assert.ok(quiz.includes('quiz-1'), 'quiz-1 missing');
  assert.ok(quiz.includes('quiz-4'), 'quiz-4 missing');
});

// ---------------------------------------------------------------------------
// Shared identity: scoring must resolve either view the same way.
check('panoramaSpots reuses the same five ids as hotspots', () => {
  const ids = PANORAMA_SPOTS.map((s) => s.id).sort();
  assert.deepStrictEqual(ids, [...HOTSPOT_IDS].sort(), 'ids must match exactly');
});

check('every panorama spot is flagged as a hazard', () => {
  PANORAMA_SPOTS.forEach((s) => {
    assert.ok(s.id, 'spot has no id');
  });
  assert.strictEqual(PANORAMA_SPOTS.length, 5);
});

check('the model declares panoramaSpots alongside hotspots', () => {
  const model = readFileSync(resolve(BACKEND, 'models', 'Scenario.js'), 'utf8');
  assert.ok(model.includes('panoramaSpots: [hotspotSchema]'), 'schema field missing');
  assert.ok(model.includes('hotspots: [hotspotSchema]'), 'hotspots field must survive');
});

check('the active-scenario endpoint passes panoramaSpots through the sanitiser', () => {
  const ctrl = readFileSync(resolve(BACKEND, 'controllers', 'scenarioController.js'), 'utf8');
  assert.ok(
    ctrl.includes('panoramaSpots: scenario.panoramaSpots'),
    'sanitiseScenario would drop the panorama hazards'
  );
});

check('scoring still grades against hotspots, not the panorama set', () => {
  const scoring = readFileSync(resolve(BACKEND, 'utils', 'scoring.js'), 'utf8');
  assert.ok(
    scoring.includes('const allHotspots = scenario.hotspots || []'),
    'grading source must remain scenario.hotspots'
  );
});

// ---------------------------------------------------------------------------
// Panorama wiring.
check('the panorama reads panoramaSpots when present', () => {
  assert.ok(
    viewerSrc.includes('scenario?.panoramaSpots?.length'),
    'PanoramaViewer must prefer panoramaSpots'
  );
});

check('PanoramaViewer still falls back to hotspots when none are supplied', () => {
  assert.ok(
    viewerSrc.includes(': scenario?.hotspots'),
    'the fallback keeps older scenario documents working'
  );
});

check('the panorama asset and its fallback agree', () => {
  const refs = [...viewerSrc.matchAll(/\/panoramas\/[a-z0-9_]+\.jpg/g)].map((m) => m[0]);
  assert.strictEqual(refs.length, 2, 'expected a panorama and a background fallback');
  assert.ok(
    refs.every((r) => r === '/panoramas/workshop_foundry.jpg'),
    'stale panorama reference remains: ' + refs.join(', ')
  );
});

check('the panorama asset referenced by the seed exists on disk', () => {
  const p = resolve(ROOT, 'public', 'panoramas', 'workshop_foundry.jpg');
  assert.ok(existsSync(p), 'workshop_foundry.jpg is missing from public/panoramas');
});

check('the unreferenced images were removed', () => {
  ['warehouse_bay4.jpg', 'warehouse_bay4.webp', 'hazard.jpeg'].forEach((f) => {
    assert.ok(
      !existsSync(resolve(ROOT, 'public', 'panoramas', f)),
      `${f} is still on disk and no longer referenced`
    );
  });
});

// ---------------------------------------------------------------------------
// Geometry. These are the silent-failure checks: a bad coordinate produces a
// session that still completes, so only an assertion catches it.
const distance = (a, b) => {
  let dy = Math.abs(a.yaw - b.yaw);
  if (dy > 180) dy = 360 - dy;
  return Math.hypot(dy, a.pitch - b.pitch);
};

check('no two spots shadow each other at the effective hit radius', () => {
  const min = Math.min(
    ...PANORAMA_SPOTS.flatMap((a, i) =>
      PANORAMA_SPOTS.slice(i + 1).map((b) => distance(a, b))
    )
  );
  assert.ok(
    min > MAX_HIT_RADIUS * 2,
    `closest pair is ${min.toFixed(1)} deg apart; needs > ${MAX_HIT_RADIUS * 2}`
  );
});

check('every spot sits inside the reachable pitch range', () => {
  // PanoramaViewer clamps pitch to +/-85.
  PANORAMA_SPOTS.forEach((s) => {
    assert.ok(
      s.pitch >= -85 && s.pitch <= 85,
      `${s.id} at pitch ${s.pitch} is outside the +/-85 clamp`
    );
  });
});

check('every spot sits inside the yaw range', () => {
  PANORAMA_SPOTS.forEach((s) => {
    assert.ok(s.yaw >= -180 && s.yaw <= 180, `${s.id} yaw ${s.yaw} out of range`);
  });
});

check('every spot describes a distinct hazard', () => {
  const titles = PANORAMA_SPOTS.map((s) => s.title);
  assert.strictEqual(new Set(titles).size, titles.length, 'duplicate titles');
  assert.strictEqual(
    new Set(PANORAMA_SPOTS.map((s) => s.id)).size,
    5,
    'duplicate ids would suppress finds'
  );
});

check('the panorama spots are spread across the bay, not clustered', () => {
  // A cluster means the trainee never has to turn round, which defeats the point.
  const yaws = PANORAMA_SPOTS.map((s) => s.yaw);
  assert.ok(
    Math.max(...yaws) - Math.min(...yaws) > 200,
    'spots are clustered into too small an arc to be worth rotating'
  );
});

const failed = results.filter((r) => !r.ok);
console.log('');
if (failed.length) {
  console.log(`${failed.length} of ${results.length} panorama checks FAILED`);
  process.exit(1);
}
console.log(`All ${results.length} panorama checks passed.`);