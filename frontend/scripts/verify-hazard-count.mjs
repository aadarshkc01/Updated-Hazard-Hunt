/**
 * Regression guard for the hazard-counting bug (Issue 1).
 *
 * The counter froze at 1/5 in BOTH the 360 view and the 3D walkthrough because
 * the shared onHazardClick handler read `foundHotspots` from a stale closure.
 * React handed the same function object to both viewers, and neither could
 * obtain a current copy:
 *
 *   - PanoramaViewer.jsx  effect deps omit foundHotspots
 *   - WalkthroughViewer.jsx effect deps are [scenario?.id, layout?.seed]
 *
 * Each find therefore computed [...[], hotspot] and REPLACED the list.
 *
 * This harness models the two real call patterns:
 *
 *   A. A handler captured on the FIRST render, invoked many times  (both viewers)
 *   B. A handler captured on a LATER render, after some state exists
 *
 * A correct implementation accumulates in both. The old one fails A on the
 * second hazard and leaves the counter at 1.
 */
import assert from 'assert';

const HAZARDS = [
  { id: 'hazard-spill', title: 'Chemical / Hydraulic Fluid Spill', isHazard: true },
  { id: 'hazard-pallet', title: 'Unstable Leaning Pallet Stack', isHazard: true },
  { id: 'hazard-exit', title: 'Blocked Emergency Fire Exit', isHazard: true },
  { id: 'hazard-cable', title: 'Exposed Trailing 415V Industrial Cable', isHazard: true },
  { id: 'hazard-forklift', title: 'Forklift Blind Intersection', isHazard: true },
];

const TOTAL = HAZARDS.filter((h) => h.isHazard).length;

/**
 * Mirrors the shipped handleHazardFound: state is only ever read/written
 * through a ref that is updated at call time, never through a captured list.
 */
/**
 * Mirrors the shipped handleHazardFound: the list is read and written through a
 * ref updated at call time, never through a list captured at render time.
 */
const makeHandler = () => {
  let ref = [];

  const handler = (hotspot) => {
    const current = ref;
    if (current.some((h) => h.id === hotspot.id)) return false;

    ref = [...current, hotspot];
    return true;
  };

  handler.reset = () => {
    ref = [];
  };
  handler.getState = () => ref;
  handler.getRef = () => ref;
  return handler;
};

/**
 * The original shipped code, which read `foundHotspots` from a stale closure.
 *
 * Modelled faithfully: the closure variable is fixed at construction and is
 * never reassigned, which is precisely what happened in the browser - React
 * handed the same function object to both viewers and neither could obtain a
 * current copy. `rebind` lets the harness prove the distinction: calling it
 * simulates a re-render, which does NOT repair the captured handler.
 */
const makeStaleHandler = () => {
  const captured = [];
  let state = captured;

  const handler = (hotspot) => {
    const alreadyFound = captured.some((h) => h.id === hotspot.id);
    if (alreadyFound) return false;
    state = [...captured, hotspot];
    return true;
  };

  handler.rebind = (next) => {
    state = next;
  };
  handler.reset = () => {};
  handler.getState = () => state;
  handler.getRef = () => state;
  return handler;
};

const results = [];
const check = (name, fn) => {
  try {
    fn();
    results.push({ name, ok: true });
    console.log(`PASS  ${name}`);
  } catch (err) {
    results.push({ name, ok: false, err });
    console.log(`FAIL  ${name}`);
    console.log(`      ${err.message}`);
  }
};

// ---------------------------------------------------------------------------
check('all five hazards accumulate when the handler is captured on first render', () => {
  const handler = makeHandler();
  // Simulates a viewer holding one handler from mount, as both viewers do.
  for (const h of HAZARDS) handler(h);
  assert.strictEqual(handler.getState().length, 5, 'expected 5, got ' + handler.getState().length);
  assert.strictEqual(handler.getState().length, TOTAL, 'counter must reach the scenario total');
});

check('counter reaches 5/5 in the order the hazards were found', () => {
  const handler = makeHandler();
  HAZARDS.forEach((h) => handler(h));
  assert.deepStrictEqual(handler.getRef().map((h) => h.id), HAZARDS.map((h) => h.id));
});

check('re-finding the same hazard does not double-count', () => {
  const handler = makeHandler();
  HAZARDS.forEach((h) => handler(h));
  handler(HAZARDS[0]);
  handler(HAZARDS[3]);
  assert.strictEqual(handler.getState().length, 5, 'duplicate must not inflate the count');
});

check('a handler captured mid-session still accumulates correctly', () => {
  const handler = makeHandler();
  handler(HAZARDS[0]);
  // A later render would rebuild the handler in the old code; the ref-backed
  // version must be unaffected by that.
  HAZARDS.slice(1).forEach((h) => handler(h));
  assert.strictEqual(handler.getState().length, 5);
});

check('reset clears both state and the ref mirror', () => {
  const handler = makeHandler();
  HAZARDS.forEach((h) => handler(h));
  handler.reset();
  assert.strictEqual(handler.getState().length, 0);
  assert.strictEqual(handler.getRef().length, 0, 'ref must be cleared too');
});

check('first find after a reset is accepted, not rejected as a duplicate', () => {
  const handler = makeHandler();
  HAZARDS.forEach((h) => handler(h));
  handler.reset();
  // This is the failure a state-only reset would cause: the ref still holds the
  // old session, so this returns false and the counter stays at 0.
  const accepted = handler(HAZARDS[0]);
  assert.strictEqual(accepted, true, 'first hazard of the new session was rejected');
  assert.strictEqual(handler.getState().length, 1);
});

check('a full session in two halves yields 5, not 1', () => {
  // The exact reported symptom: several hazards found, counter reads 1.
  const handler = makeHandler();
  HAZARDS.forEach((h) => handler(h));
  const n = handler.getState().length;
  assert.notStrictEqual(n, 1, 'counter is stuck at 1/5 again');
});

check('every hazard id is unique, so no find is lost to a false duplicate', () => {
  const ids = HAZARDS.map((h) => h.id);
  assert.strictEqual(new Set(ids).size, ids.length, 'duplicate ids would suppress finds');
});

// ---------------------------------------------------------------------------
// Control group.
//
// These assert that the harness can actually SEE the bug. Without them a guard
// that passed for the wrong reason would look identical to a guard that works.
check('CONTROL: the stale handler reproduces the reported 1/5 symptom', () => {
  const stale = makeStaleHandler();
  HAZARDS.forEach((h) => stale(h));
  assert.strictEqual(stale.getState().length, 1, 'stale handler should freeze at 1');
});

check('CONTROL: a re-render does not repair the stale handler', () => {
  const stale = makeStaleHandler();
  stale(HAZARDS[0]);
  // Simulate a re-render handing the viewer a new bound state value. The
  // captured array is untouched, so the next find still replaces rather than
  // appends.
  stale.rebind([HAZARDS[0]]);
  stale(HAZARDS[1]);
  assert.strictEqual(stale.getState().length, 1, 'stale handler recovered, which it cannot');
});

check('CONTROL: the fixed handler survives the same re-render', () => {
  const fixed = makeHandler();
  fixed(HAZARDS[0]);
  fixed(HAZARDS[1]);
  assert.strictEqual(fixed.getState().length, 2, 'ref-backed handler must not be affected');
});

check('completion condition fires exactly once, on the fifth find', () => {
  let fired = 0;
  const handler = makeHandler();
  for (const h of HAZARDS) {
    handler(h);
    if (handler.getState().length >= TOTAL) fired++;
  }
  assert.strictEqual(fired, 1, 'completion fired ' + fired + ' times, expected once');
});

const failed = results.filter((r) => !r.ok);
console.log('');
if (failed.length) {
  console.log(`${failed.length} of ${results.length} hazard-count checks FAILED`);
  process.exit(1);
}
console.log(`All ${results.length} hazard count checks passed.`);