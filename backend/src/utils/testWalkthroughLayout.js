/**
 * Verification harness for the randomized walkthrough layout engine.
 * Run with: node --experimental-vm-modules src/utils/testWalkthroughLayout.js
 */
import assert from 'assert';
import {
  generateWalkthroughLayout,
  randomSeed,
  categoriseHotspot,
  HAZARD_ANCHORS,
  insideSolid,
} from './walkthroughLayout.js';

const hotspots = [
  { id: 'hazard-spill', title: 'Chemical / Hydraulic Fluid Spill', category: 'Chemical & Slip Hazard', isHazard: true },
  { id: 'hazard-pallet', title: 'Unstable Leaning Pallet Stack', category: 'Material Handling', isHazard: true },
  { id: 'hazard-exit', title: 'Blocked Emergency Fire Exit', category: 'Fire Safety', isHazard: true },
  { id: 'hazard-cable', title: 'Exposed Trailing 415V Industrial Cable', category: 'Electrical & Trip Hazard', isHazard: true },
  { id: 'hazard-forklift', title: 'Forklift Blind Intersection', category: 'Traffic Separation', isHazard: true },
];

// 1. Category mapping
assert.strictEqual(categoriseHotspot(hotspots[0]), 'chemical', 'spill -> chemical');
assert.strictEqual(categoriseHotspot(hotspots[1]), 'material', 'pallet -> material');
assert.strictEqual(categoriseHotspot(hotspots[2]), 'fire', 'exit -> fire');
assert.strictEqual(categoriseHotspot(hotspots[3]), 'electrical', 'cable -> electrical');
assert.strictEqual(categoriseHotspot(hotspots[4]), 'traffic', 'forklift -> traffic');
console.log('PASS  category mapping');

// 2. Determinism from an explicit seed
const a = generateWalkthroughLayout(hotspots, 12345);
const b = generateWalkthroughLayout(hotspots, 12345);
assert.deepStrictEqual(a, b, 'same seed must produce an identical layout');
console.log('PASS  determinism from seed');

// 3. Different seeds actually produce different layouts
let differing = 0;
for (let s = 1; s <= 40; s += 1) {
  const x = generateWalkthroughLayout(hotspots, s);
  const y = generateWalkthroughLayout(hotspots, s + 1000);
  if (JSON.stringify(x.items) !== JSON.stringify(y.items)) differing += 1;
}
assert.ok(differing > 30, `expected most seeds to differ, got ${differing}/40`);
console.log(`PASS  seed variance (${differing}/40 runs differed)`);

// 4. Over many runs: unique anchors, all walkable, fire hazard always at the exit
const MAX_X = 15;
const MAX_Z = 10.5;
let fireCorrect = 0;
let totalRuns = 0;
const positionCounts = new Map();
// Per-run family coverage: every hazard family must be staged on EVERY run.
const FAMILIES = ['chemical', 'material', 'electrical', 'fire', 'traffic'];
let runsMissingAFamily = 0;

for (let s = 0; s < 600; s += 1) {
  const { items } = generateWalkthroughLayout(hotspots, randomSeed());
  totalRuns += 1;

  assert.strictEqual(items.length, hotspots.length, 'every hazard must be staged');

  const anchorIds = items.map((i) => i.anchorId);
  assert.strictEqual(new Set(anchorIds).size, anchorIds.length, 'anchors must be unique');

  const ids = items.map((i) => i.hotspotId);
  assert.strictEqual(new Set(ids).size, ids.length, 'hotspots must be unique');

  // "Random hazards of all types": every run must contain all five families, so
  // a trainee is always assessed across the whole syllabus rather than drawing a
  // run that happens to omit, say, fire. Counts come from the hotspot set, so
  // this asserts the generator never drops or duplicates one.
  const familiesInRun = new Set(items.map((i) => i.family));
  if (FAMILIES.some((f) => !familiesInRun.has(f))) runsMissingAFamily += 1;

  for (const item of items) {
    const [x, y, z] = item.position;
    positionCounts.set(item.anchorId, (positionCounts.get(item.anchorId) || 0) + 1);
    assert.ok(!insideSolid(x, z), `hazard ${item.hotspotId} staged inside a solid at ${x},${z}`);
    assert.ok(
      Math.abs(x) <= MAX_X && Math.abs(z) <= MAX_Z,
      `hazard outside room bounds: ${x},${z}`
    );
    assert.ok(y >= 0 && y <= 0.2, `hazard y out of range: ${y}`);
    // The safety-yellow walkway (x -1.7 .. 1.7) must stay clear of staged props.
    assert.ok(
      !(Math.abs(x) < 1.7 && z > -9.4 && z < 9.4),
      `hazard ${item.hotspotId} blocks the pedestrian walkway at ${x},${z}`
    );
    if (item.family === 'fire' && item.anchorId === 'fire-exit-approach') fireCorrect += 1;
  }
}
assert.strictEqual(fireCorrect, totalRuns, 'fire hazard must always stage at the fire exit');
assert.strictEqual(runsMissingAFamily, 0, `${runsMissingAFamily} run(s) omitted a hazard family`);
console.log(`PASS  unique anchors, walkable placement, clear walkway, fire exit staging`);
console.log(`PASS  all 5 hazard families staged on every one of ${totalRuns} runs`);

// 5. The staging really does move around, and no anchor is starved or favoured.
//
// "Every anchor used at least once" is too weak on its own: a biased shuffle can
// satisfy it while still sending a trainee to the same three corners every time.
// So also assert that no freely-chosen anchor dominates.
//
// `fire-exit-approach` is excluded because it is RESERVED: the blocked-exit
// hazard must always be staged directly in front of the exit or the depiction
// stops making sense, so it is used on 100% of runs by design. Measuring it
// against the others would flag a deliberate feature as bias.
//
// The remaining 16 anchors share 4 freely-placed hazards, so an even rotation
// would put each at ~25% of runs. The bound is deliberately loose (45%): it is
// there to catch a structural bias, not to police sampling noise.
const RESERVED_ANCHORS = new Set(['fire-exit-approach']);
const freeCounts = [...positionCounts.entries()].filter(([id]) => !RESERVED_ANCHORS.has(id));
const usedAnchors = positionCounts.size;
assert.strictEqual(usedAnchors, HAZARD_ANCHORS.length, `expected every anchor to rotate, saw ${usedAnchors}`);
assert.strictEqual(
  freeCounts.length,
  HAZARD_ANCHORS.length - RESERVED_ANCHORS.size,
  'reserved anchor bookkeeping is out of step with HAZARD_ANCHORS'
);
const busiest = Math.max(...freeCounts.map(([, n]) => n));
const rarest = Math.min(...freeCounts.map(([, n]) => n));
assert.ok(
  busiest < totalRuns * 0.45,
  `free-anchor concentration too high: busiest anchor used ${busiest}/${totalRuns} runs`
);
assert.ok(rarest > 0, 'at least one free anchor is never used');
console.log(
  `PASS  anchors rotate (${usedAnchors}/${HAZARD_ANCHORS.length} used; ` +
    `${RESERVED_ANCHORS.size} reserved, free anchors ${((rarest / totalRuns) * 100).toFixed(0)}-${((busiest / totalRuns) * 100).toFixed(0)}% of runs)`
);

// 6. Variant pools vary, and both variants of every family appear
const variants = new Set();
const familyVariants = new Map();
for (let s = 0; s < 200; s += 1) {
  generateWalkthroughLayout(hotspots, randomSeed()).items.forEach((i) => {
    variants.add(i.propType);
    if (!familyVariants.has(i.family)) familyVariants.set(i.family, new Set());
    familyVariants.get(i.family).add(i.propType);
  });
}
assert.strictEqual(variants.size, 10, `expected all 10 prop variants, saw ${variants.size}`);
const thin = [...familyVariants.entries()].filter(([, v]) => v.size < 2);
assert.strictEqual(thin.length, 0, `families with a single visual variant: ${thin.map(([f]) => f).join(', ')}`);
console.log(`PASS  prop variant variety (${variants.size} distinct variants, 2 per family)`);

// 7. Degraded input: no hotspots must not throw
assert.deepStrictEqual(generateWalkthroughLayout([], 7).items, []);
assert.doesNotThrow(() => generateWalkthroughLayout(undefined, undefined));
console.log('PASS  graceful handling of empty input');

console.log('\nAll walkthrough layout checks passed.');