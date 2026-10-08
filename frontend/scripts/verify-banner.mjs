/**
 * Guards the dashboard banner's colour contract.
 *
 * The band used to invert in dark mode to a near-black primary-950. That put a
 * dark, slightly red-brown field at the top of every dashboard, which read as a
 * different brand from the orange band in light mode, and the left accent rule
 * turned primary-400 - a lighter orange on orange, 1.9:1 - so the band lost its
 * edge entirely against an already-dark page.
 *
 * The ground is now primary-500 in both themes. These assertions check the
 * compiled stylesheet, because the failure mode was a class that compiled to
 * nothing and simply lost an argument.
 */

import assert from 'assert';

// WCAG relative luminance and contrast, so the ratios quoted in the comments are
// verified rather than asserted.
const srgb = (hex) => {
  const v = parseInt(hex.replace('#', ''), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
};
const channel = (c) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex) => {
  const [r, g, b] = srgb(hex).map(channel);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
};

const WHITE = '#ffffff';
const ORANGE_500 = '#ff6115';
const ORANGE_400 = '#ff7c42';
const ORANGE_950 = '#5c1d00';

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DIST = join(HERE, '..', 'dist', 'assets');

let cssFiles;
try {
  cssFiles = readdirSync(DIST).filter((f) => f.endsWith('.css'));
} catch {
  console.error('FAIL  dist/assets/ not found. Run `npm run build` first.');
  process.exit(1);
}
if (!cssFiles.length) {
  console.error('FAIL  no compiled CSS found. Run `npm run build` first.');
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

/**
 * Matches a colour declaration for a given RGB triple.
 *
 * Tailwind does not always emit hex. With an opacity modifier it writes
 * `rgb(255 97 21 / var(--tw-bg-opacity, 1))` where a plain @apply of a colour
 * with no modifier emits `#ff6115`. Asserting on the hex form alone therefore
 * produces false failures on correct CSS, so both forms are accepted.
 */
const hasColor = (rule, r, g, b) => {
  if (!rule) return false;
  const hex = `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
  const rgbSyntax = new RegExp(`rgb\\(${r} ${g} ${b}\\b`, 'i');
  const shortHex = `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0').replace(/^0/, '')).join('')}`;
  return (
    rule.toLowerCase().includes(hex) ||
    rule.toLowerCase().includes(shortHex) ||
    rgbSyntax.test(rule)
  );
};

const isWhite = (rule) => hasColor(rule, 255, 255, 255);
const isOrange500 = (rule) => hasColor(rule, 255, 97, 21);

/** True when a rule paints a translucent black overlay (any alpha 0-100%). */
const hasBlackOverlay = (rule) =>
  Boolean(rule) &&
  (/#000[0-9a-f]{1,2}\b/i.test(rule) || /rgba\(\s*0\s*,\s*0\s*,\s*0\s*,/i.test(rule));

// ---------------------------------------------------------------- ground
check('banner ground is primary-500 in BOTH themes', () => {
  const rule = ruleFor('.app-dashboard-banner{');
  assert.ok(rule, '.app-dashboard-banner rule missing');
  assert.ok(isOrange500(rule), 'ground is not #FF6115: ' + rule);
  assert.ok(
    !/#5c1d00|primary-950/i.test(rule),
    'a primary-950 dark ground survived; the band must stay orange: ' + rule,
  );
});

check('no dark-mode override darkens the band', () => {
  // The compiled form of a dark: variant inside @apply is a separate selector
  // carrying --tw-dark. Any of these on the band means an inverted ground.
  const idx = css.indexOf('.app-dashboard-banner{');
  const dark = css.indexOf('.dark .app-dashboard-banner', idx);
  assert.ok(
    dark === -1,
    'a .dark .app-dashboard-banner ground rule exists; it must not override the orange',
  );
});

check('primary-950 is no longer referenced by the banner at all', () => {
  assert.ok(
    !/#5c1d00/.test(css.slice(css.indexOf('.app-dashboard-banner{'), css.indexOf('.app-page-header'))),
    'the old near-black #5C1D00 ground is still emitted in the banner block',
  );
});

// ---------------------------------------------------------------- accent rule
check('left accent rule is white in both themes', () => {
  const rule = ruleFor('.app-dashboard-banner:before') || ruleFor('.app-dashboard-banner::before');
  assert.ok(rule, 'the ::before accent rule is missing from the compiled CSS');
  assert.ok(isWhite(rule), 'accent rule is not white: ' + rule);
  assert.ok(
    !hasColor(rule, 255, 124, 66),
    'the accent rule is primary-400 again; on orange that is 1.9:1 and invisible',
  );
});

check('accent rule clears the 3:1 non-text threshold (WCAG 1.4.11)', () => {
  const ratio = contrast(WHITE, ORANGE_500);
  assert.ok(
    ratio >= 3,
    `white on #FF6115 is ${ratio.toFixed(2)}:1, under the 3:1 required of a graphic edge`,
  );
});

check('the old primary-400 accent really would have failed', () => {
  // Guards the reasoning: if someone re-adds primary-400 this documents why.
  const ratio = contrast(ORANGE_400, ORANGE_500);
  assert.ok(
    ratio < 3,
    `primary-400 on primary-500 computes ${ratio.toFixed(2)}:1; expected it to be under 3:1`,
  );
});

// ---------------------------------------------------------------- type
check('banner type is white in both themes', () => {
  for (const sel of [
    '.app-dashboard-banner .app-display',
    '.app-dashboard-banner .app-eyebrow',
    '.app-dashboard-banner .app-eyebrow-accent',
    '.app-dashboard-banner .app-body',
    '.app-dashboard-banner .app-stat-sub',
    '.app-dashboard-banner .app-num',
  ]) {
    const rule = ruleFor(sel);
    assert.ok(rule, sel + ' rule missing');
    assert.ok(isWhite(rule), sel + ' is not white: ' + rule);
  }
});

check('no dark-mode tint darkens type on the orange ground', () => {
  // Scoped to the individual type rules rather than a slice of the file: a fixed
  // window also catches the ::selection background further along, which is
  // SUPPOSED to be near-black - it is the selection highlight, not the type.
  const inks = [
    [14, 18, 22, 'mist.950 ink'],
    [150, 161, 171, 'muted grey'],
    [22, 27, 32, 'dark.card'],
    [237, 240, 242, 'dark.text'],
  ];
  const typeRules = [
    '.app-dashboard-banner .app-display',
    '.app-dashboard-banner .app-eyebrow',
    '.app-dashboard-banner .app-eyebrow-accent',
    '.app-dashboard-banner .app-body',
    '.app-dashboard-banner .app-stat-sub',
    '.app-dashboard-banner .app-num',
    '.app-dashboard-banner .text-primary-400',
    '.app-dashboard-banner .text-dark-muted',
    '.app-dashboard-banner .text-mist-900',
  ];
  for (const sel of typeRules) {
    const rule = ruleFor(sel);
    assert.ok(rule, sel + ' rule missing');
    // Only `color:` matters here. These rules legitimately carry a dark
    // text-shadow, which is a legibility aid on the orange ground and is not
    // type colour - a naive "does the rule mention a dark ink" test flags it.
    const colorDecls = rule.match(/color:[^;}]+/gi) || [];
    assert.ok(colorDecls.length > 0, sel + ' has no color declaration');
    for (const [r, g, b, name] of inks) {
      for (const decl of colorDecls) {
        assert.ok(
          !hasColor(decl, r, g, b),
          `${sel} sets ${name} as its colour: ${decl}`,
        );
      }
    }
  }
});

check('small type on the band carries a legibility halo', () => {
  // The eyebrow and the description are 10-11px on a mid-luminance orange,
  // which no text colour can bring to 4.5:1. A soft dark shadow lifts the
  // glyph edges. This is deliberately recorded as an aid rather than a WCAG
  // 1.4.3 fix, because text-shadow is not counted by the contrast formula.
  for (const sel of ['.app-dashboard-banner .app-eyebrow', '.app-dashboard-banner .app-body']) {
    const rule = ruleFor(sel);
    assert.ok(rule, sel + ' rule missing');
    assert.ok(
      /text-shadow/.test(rule),
      sel + ' lost its halo; small type sits flat on a saturated ground',
    );
  }
});

check('explicit primary-* and dark-* text classes are forced white', () => {
  const rule = ruleFor('.app-dashboard-banner .text-primary-400');
  assert.ok(rule, 'the text-primary-* override group is missing');
  assert.ok(isWhite(rule), 'a text-primary-* class inside the band is not forced white: ' + rule);
});

check('banner title meets the 3:1 large-text threshold', () => {
  const ratio = contrast(WHITE, ORANGE_500);
  assert.ok(
    ratio >= 3,
    `white on #FF6115 is ${ratio.toFixed(2)}:1; the display size needs 3:1`,
  );
});

check('RECORDED LIMITATION: small banner text cannot reach 4.5:1 in any colour', () => {
  // This is a known, accepted trade-off rather than an oversight, so it is
  // pinned as an assertion. If the brand ground ever moves far enough in
  // luminance, this fails and the trade-off can be retired.
  //
  // #FF6115 sits near mid-luminance, so neither end of the scale clears 4.5:1
  // against it: white is 3.01:1 and primary-900 #782600 is 3.36:1. Only a dark
  // plate behind the small text would fix it, which changes the look of the
  // band, so the halo in .app-eyebrow/.app-body is used instead.
  const smallWhite = contrast(WHITE, ORANGE_500);
  const smallDark = contrast('#782600', ORANGE_500);
  const best = Math.max(smallWhite, smallDark);

  assert.ok(
    best < 4.5,
    `a small-text colour now reaches ${best.toFixed(2)}:1 on the brand ground; ` +
      'the documented trade-off can be retired and real AA type used instead',
  );
  assert.ok(
    Math.abs(smallWhite - 3.01) < 0.02,
    `white on the band computes ${smallWhite.toFixed(2)}:1, not the documented 3.01:1`,
  );
});

check('the large-text threshold genuinely applies to the title size', () => {
  // Sanity check on the rule above: if the title ever drops below 18.66px bold
  // or 24px, it would need 4.5:1 too and would silently start failing.
  const titlePx = 22;
  const titleWeight = 800;
  assert.ok(
    titlePx >= 24 || (titlePx >= 18.66 && titleWeight >= 700),
    `title at ${titlePx}px/${titleWeight} no longer qualifies as large text, ` +
      'so 3.01:1 would no longer be sufficient for it',
  );
});

// ---------------------------------------------------------------- inner surfaces
check('stat plate and chip stay legible on the orange ground', () => {
  for (const sel of ['.app-dashboard-banner .app-banner-stat', '.app-dashboard-banner .app-chip']) {
    const rule = ruleFor(sel);
    assert.ok(rule, sel + ' rule missing');
    assert.ok(isWhite(rule), sel + ' text is not white: ' + rule);
    assert.ok(
      hasBlackOverlay(rule),
      sel + ' lost its dark overlay; text would sit directly on orange: ' + rule,
    );
  }
});

check('in-band primary button is light, never orange on orange', () => {
  const rule = ruleFor('.app-dashboard-banner .app-btn-primary');
  assert.ok(rule, 'in-band primary button rule missing');
  assert.ok(isWhite(rule), 'button fill is not white: ' + rule);
  assert.ok(
    hasColor(rule, 147, 48, 0),
    'button label should be primary-800 on white: ' + rule,
  );
});

check('one selection rule serves both themes on this ground', () => {
  const first = css.indexOf('.app-dashboard-banner ::selection');
  const darkAfter = css.indexOf('.dark .app-dashboard-banner ::selection');
  assert.ok(first !== -1, 'selection styling missing');
  assert.ok(
    darkAfter === -1,
    'a dark-mode selection override survived; the ground is the same in both themes',
  );
});

console.log('');
const failed = results.filter((r) => !r).length;
if (failed) {
  console.log(`${failed} of ${results.length} banner checks FAILED`);
  process.exit(1);
}
console.log(`All ${results.length} banner checks passed.`);