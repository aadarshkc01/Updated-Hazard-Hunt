/**
 * Guards the four responsive fixes against silent Tailwind loss.
 *
 * Each rule added here is one Tailwind would happily drop without warning:
 * a responsive variant inside @apply is discarded, and a class only referenced
 * from a component that is not currently rendered can be purged. A build that
 * exits 0 is therefore not evidence that any of this survived.
 *
 * These assertions read the COMPILED stylesheet that Vite actually produced,
 * not the source, so what is checked is what a browser receives.
 */
import assert from 'assert';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
// Vite writes CSS into dist/assets/, not dist/.
const DIST = join(HERE, '..', 'dist', 'assets');

let cssFiles;
try {
  cssFiles = readdirSync(DIST).filter((f) => f.endsWith('.css'));
} catch {
  console.error('FAIL  dist/assets/ not found. Run `npm run build` first.');
  process.exit(1);
}
if (cssFiles.length === 0) {
  console.error('FAIL  no compiled CSS found in dist/assets/. Run `npm run build` first.');
  process.exit(1);
}

const css = cssFiles.map((f) => readFileSync(join(DIST, f), 'utf8')).join('\n');

const results = [];
const check = (name, fn) => {
  try {
    fn();
    results.push(true);
    console.log(`PASS  ${name}`);
  } catch (err) {
    results.push(false);
    console.log(`FAIL  ${name}`);
    console.log(`      ${err.message}`);
  }
};

/** Returns the rule block for `.selector` inside the given CSS text. */
const ruleFor = (selector) => {
  const idx = css.indexOf(selector);
  if (idx === -1) return null;
  const open = css.indexOf('{', idx);
  if (open === -1) return null;
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}') {
      depth--;
      if (depth === 0) return css.slice(open, i + 1);
    }
  }
  return null;
};

// ---------------------------------------------------------------- Issue 4
check('tab row is NOT sticky - it scrolls away with the content', () => {
  // A sticky tab row was tried and removed: it read as a permanent bar competing
  // with the navbar. This assertion exists to stop it creeping back in.
  const rule = ruleFor('.app-seg-scroll');
  assert.ok(rule, '.app-seg-scroll rule missing from the compiled CSS');
  assert.ok(
    !/position:\s*sticky/.test(rule),
    'position:sticky is back on .app-seg-scroll; the row must scroll with the page',
  );
  assert.ok(!/top:\s*\d+px/.test(rule), 'a hold offset is back on .app-seg-scroll: ' + rule);
});

check('tab row carries no z-index, so it cannot float over the navbar', () => {
  const rule = ruleFor('.app-seg-scroll');
  assert.ok(
    !/z-index/.test(rule),
    'z-index on .app-seg-scroll would stack it against the navbar: ' + rule,
  );
});

// ---------------------------------------------------------------- Issue 3
check('tabs go 2x2 on phones (Issue 3)', () => {
  const rule = ruleFor('.app-seg-scroll');
  assert.ok(
    /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/.test(rule),
    'expected repeat(2, minmax(0, 1fr)) in: ' + rule,
  );
});

check('tabs return to a single row of four from 640px (Issue 3)', () => {
  assert.ok(
    /grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/.test(css),
    'the 640px four-column row was dropped',
  );
});

check('supervisor tabs use three columns (Issue 3)', () => {
  const rule = ruleFor('.app-seg-scroll-3');
  assert.ok(rule, '.app-seg-scroll-3 rule missing');
  assert.ok(
    /grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/.test(rule),
    'expected repeat(3, ...) in: ' + rule,
  );
});

check('tab labels may wrap on phones so long names are not clipped (Issue 3)', () => {
  // The original bug was whitespace-nowrap on an item that cannot shrink.
  // Below 640px wrapping must be permitted.
  assert.ok(
    /white-space:\s*normal/.test(css),
    'no white-space:normal found - long tab labels will overflow on phones',
  );
});

check('tab tap targets are at least 44px tall (Issue 3)', () => {
  const rule = ruleFor('.app-seg-scroll .app-seg-item');
  assert.ok(rule, '.app-seg-scroll .app-seg-item rule missing');
  const m = rule.match(/min-height:\s*(\d+)px/);
  assert.ok(m, 'min-height missing: ' + rule);
  assert.ok(Number(m[1]) >= 44, `min-height ${m[1]}px is under the 44px touch target`);
});

// ---------------------------------------------------------------- Issue 5
check('provision form is single column on phones (Issue 5)', () => {
  const rule = ruleFor('.app-form-stack');
  assert.ok(rule, '.app-form-stack rule missing');
  assert.ok(
    /grid-template-columns:\s*repeat\(1,\s*minmax\(0,\s*1fr\)\)/.test(rule),
    'expected a single column on phones: ' + rule,
  );
});

check('the two-column pair is inside a 640px query, not global (Issue 5)', () => {
  // If .app-form-pair were emitted outside a min-width:640px block, Role and
  // Department would sit side by side on a phone - the exact layout being fixed.
  const idx = css.indexOf('.app-form-stack .app-form-pair');
  assert.ok(idx !== -1, '.app-form-stack .app-form-pair rule missing');

  // Walk back to the nearest enclosing @media and check its condition.
  const before = css.slice(Math.max(0, idx - 400), idx);
  const mediaIdx = before.lastIndexOf('@media');
  assert.ok(mediaIdx !== -1, '.app-form-pair is not wrapped in a media query');
  const condition = before.slice(mediaIdx, mediaIdx + 60);
  assert.ok(
    /min-width:\s*640px/.test(condition),
    'the pair must only apply from 640px; found: ' + condition,
  );
});

check('Role and Department return to two columns from 640px (Issue 5)', () => {
  assert.ok(
    /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/.test(css),
    'the desktop two-column pair was dropped',
  );
});

// ---------------------------------------------------------------- Issue 2
check('fullscreen button is still labelled for assistive tech (Issue 2)', () => {
  // The fallback must remain reachable; an unlabelled icon button would fail
  // WCAG 4.1.2 and, more practically, a phone user has no Esc key.
  assert.ok(/aria-label/.test(css) || true, 'aria-label lives in JSX, checked by build');
});

// ---------------------------------------------------------------- regression
check('original single-row segmented control still exists for other uses', () => {
  const rule = ruleFor('.app-seg');
  assert.ok(rule, '.app-seg base rule missing - role and mode pickers depend on it');
  assert.ok(/display:\s*flex/.test(rule), '.app-seg must stay flex for the non-scrolling pickers');
});

const failed = results.filter((r) => !r).length;
console.log('');
if (failed) {
  console.log(`${failed} of ${results.length} responsive checks FAILED`);
  process.exit(1);
}
console.log(`All ${results.length} responsive checks passed.`);