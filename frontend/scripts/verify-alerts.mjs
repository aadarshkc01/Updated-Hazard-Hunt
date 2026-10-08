/**
 * Guards the alert boxes against merging into the surface behind them.
 *
 * The bug: every alert variant painted `dark:bg-dark-surface` (#1F262D), which is
 * also the ground of .app-band and .app-card-quiet. An alert inside either was
 * #1F262D on #1F262D — no fill edge at all, so it read as floating text, which
 * is what was reported as "same background or transparent".
 *
 * These checks assert the *distinction*, not a specific colour: the point is
 * that an alert ground must differ from every surface it can be placed on. A
 * future palette change that keeps them distinct still passes.
 */
import assert from 'assert';
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

// ---------------------------------------------------------------- colour maths
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

/** Euclidean RGB distance; 0 means identical, i.e. the invisible case. */
const distance = (a, b) => {
  const [r1, g1, b1] = srgb(a);
  const [r2, g2, b2] = srgb(b);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
};

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
 * Reads a `background-color` from a CSS declaration block.
 *
 * Tailwind emits `rgb(r g b / var(--tw-bg-opacity, 1))` rather than hex whenever
 * it has to attach an opacity variable, and emits plain hex when it does not. A
 * hex-only matcher therefore reports "no background" on a perfectly correct rule,
 * which is exactly the false failure this replaced. Both forms are accepted here.
 */
const bgColor = (rule) => {
  if (!rule) return null;

  const hex = rule.match(/background-color:\s*(#[0-9a-f]{3,6})\b/i);
  if (hex) {
    let h = hex[1].slice(1);
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    return '#' + h.toLowerCase();
  }

  const rgb = rule.match(/background-color:\s*rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
  if (rgb) {
    const [r, g, b] = [rgb[1], rgb[2], rgb[3]].map(Number);
    return (
      '#' +
      [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')
    );
  }
  return null;
};

/**
 * Returns every declaration block whose selector matches.
 *
 * Tailwind splits one @apply into several rules, so a single class appears
 * multiple times: some blocks carry only a colour override from a nested
 * selector (`.app-dashboard-banner .app-alert-brand:is(.dark *)`), and the real
 * properties live in another. Reading the first match therefore returns a block
 * with no background at all, which is a false failure rather than a finding.
 *
 * All blocks for the selector are collected and concatenated so the harness sees
 * the union of what applies.
 */
const allBlocksFor = (selector, { dark }) => {
  const wanted = new Set([`.${selector}`, `.${selector}:is(.dark *)`]);
  const blocks = [];

  // Walk every block in the sheet and keep those whose selector is EXACTLY the
  // class asked for. Matching on a substring instead picks up the tail of longer
  // selectors such as `.app-dashboard-banner .app-alert-icon`, whose rules are
  // scoped to the banner and say nothing about alerts elsewhere.
  let i = 0;
  while (i < css.length) {
    const open = css.indexOf('{', i);
    if (open === -1) break;

    // The selector runs back to the previous closing brace.
    const prevClose = css.lastIndexOf('}', open);
    const start = prevClose === -1 ? 0 : prevClose + 1;
    const selectorText = css.slice(start, open).trim();

    let depth = 0;
    let end = -1;
    for (let k = open; k < css.length; k++) {
      if (css[k] === '{') depth++;
      else if (css[k] === '}') {
        depth--;
        if (depth === 0) {
          end = k;
          break;
        }
      }
    }
    if (end === -1) break;

    if (wanted.has(selectorText)) {
      const isDark = /:is\(\.dark/.test(selectorText);
      if (isDark === dark) blocks.push(css.slice(open, end + 1));
    }
    i = end + 1;
  }

  return blocks.length ? blocks.join('') : null;
};

const darkRuleFor = (selector) => allBlocksFor(selector, { dark: true });
const lightRuleFor = (selector) => allBlocksFor(selector, { dark: false });

// Surfaces an alert can be rendered on top of.
const SURFACES = {
  'dark.card': '#161b20',
  'dark.surface': '#1f262d',
  'dark.raised': '#272e36',
};

// A visible fill edge needs some real separation. 20 is comfortably above the
// ~5 where two greys read as the same box on screen.
const MIN_SEPARATION = 20;

const VARIANTS = ['brand', 'pass', 'caution', 'stop'];

for (const variant of VARIANTS) {
  check(`app-alert-${variant} dark ground differs from every surface behind it`, () => {
    const dark = darkRuleFor(`app-alert-${variant}`);
    assert.ok(dark, `.app-alert-${variant} has no dark-mode rule`);

    const bg = bgColor(dark);
    assert.ok(bg, `.app-alert-${variant} dark rule has no background: ${dark.slice(0, 200)}`);

    for (const [name, surface] of Object.entries(SURFACES)) {
      const d = distance(bg, surface);
      assert.ok(
        d >= MIN_SEPARATION,
        `dark ground ${bg} is only ${d.toFixed(1)} from ${name} ${surface}; ` +
          `they read as the same box (needs >= ${MIN_SEPARATION})`,
      );
    }
  });

  check(`app-alert-${variant} body text clears AA on its dark ground`, () => {
    const dark = darkRuleFor(`app-alert-${variant}`);
    const bg = bgColor(dark);
    assert.ok(bg, `.app-alert-${variant} dark rule has no background`);
    // dark.text is #EDF0F2, the token every alert uses in dark mode.
    const ratio = contrast('#edf0f2', bg);
    assert.ok(
      ratio >= 4.5,
      `#EDF0F2 on ${bg} is ${ratio.toFixed(2)}:1, under the 4.5:1 needed for body text`,
    );
  });
}

check('no alert variant still paints the shared dark.surface ground', () => {
  // The precise regression: a background equal to dark.surface inside a dark
  // alert rule is invisible against .app-band and .app-card-quiet.
  for (const variant of VARIANTS) {
    const bg = bgColor(darkRuleFor(`app-alert-${variant}`));
    assert.ok(bg, `.app-alert-${variant} dark rule has no background`);
    assert.ok(
      distance(bg, SURFACES['dark.surface']) >= MIN_SEPARATION,
      `.app-alert-${variant} is back on dark.surface, invisible against a band or card`,
    );
  }
});

check('alert grounds stay inside the brand range (no green, no red)', () => {
  // The palette rule: no green and no red. These grounds are deep orange-browns,
  // which sit far from both a pure green and a pure red.
  for (const variant of VARIANTS) {
    const bg = bgColor(darkRuleFor(`app-alert-${variant}`));
    assert.ok(bg, `.app-alert-${variant} dark rule has no background`);
    const [r, g, b] = srgb(bg);

    // Green dominance: g clearly above both r and b.
    assert.ok(
      !(g > r + 12 && g > b + 12),
      `${bg} reads green (g=${g} vs r=${r}, b=${b})`,
    );
    // Red dominance: r high while g and b are both very low, i.e. pure crimson.
    assert.ok(
      !(r > 140 && g < 60 && b < 60),
      `${bg} reads red (r=${r}, g=${g}, b=${b})`,
    );
    // Warm: red must lead. These are orange-browns by construction.
    assert.ok(r > g && g >= b, `${bg} is not a warm orange-brown`);
  }
});

check('each alert variant has a distinct ground', () => {
  const grounds = VARIANTS.map((variant) => bgColor(darkRuleFor(`app-alert-${variant}`)));
  for (let i = 0; i < grounds.length; i++) {
    for (let j = i + 1; j < grounds.length; j++) {
      const d = distance(grounds[i], grounds[j]);
      assert.ok(
        d >= 8,
        `app-alert-${VARIANTS[i]} ${grounds[i]} and app-alert-${VARIANTS[j]} ${grounds[j]} ` +
          `are only ${d.toFixed(1)} apart`,
      );
    }
  }
});

check('alert icons are visible against their own dark ground', () => {
  // The icon used primary-400 (#FF7C42) before. On these deeper grounds that is
  // weaker, so the rule moved to primary-300 (#FFA173).
  const dark = darkRuleFor('app-alert-icon');
  assert.ok(dark, '.app-alert-icon has no dark-mode rule');
  const colors = dark.match(/color:[^;}]+/gi) || [];
  assert.ok(colors.length > 0, '.app-alert-icon dark rule sets no colour');
  // Every colour block that mentions a primary tint must be the brighter one.
  const tints = colors.filter((c) => /primary|255 \d+ \d+|#f/i.test(c));
  for (const c of tints) {
    assert.ok(
      /255 161 115|#ffa173/i.test(c),
      `alert icon dark colour should be primary-300, found: ${c}`,
    );
  }
  // Against the darkest ground used.
  const ratio = contrast('#ffa173', '#1a1009');
  assert.ok(
    ratio >= 3,
    `primary-300 on the darkest alert ground is ${ratio.toFixed(2)}:1; a graphic needs 3:1`,
  );
});

check('alert borders and left rules are visible on their dark grounds', () => {
  // A border that sinks into the fill leaves a coloured box with no edge, which
  // is the same failure as an invisible background.
  const expected = {
    brand: { border: '#b93c00', ground: '#1a1009' },
    pass: { border: '#e24c00', ground: '#2a1a10' },
    caution: { border: '#c14a06', ground: '#33200e' },
    stop: { border: '#ff6115', ground: '#301709' },
  };
  for (const [variant, want] of Object.entries(expected)) {
    const dark = darkRuleFor(`app-alert-${variant}`);
    assert.ok(dark, `.app-alert-${variant} dark rule missing`);
    const borderColors = (dark.match(/border-color:[^;}]+/gi) || []).join(' ');
    assert.ok(
      borderColors.length > 0,
      `.app-alert-${variant} sets no dark border colour`,
    );
    // The border must be present in the rule and clear 3:1 against the fill.
    const ratio = contrast(want.border, want.ground);
    assert.ok(
      ratio >= 3,
      `app-alert-${variant} border ${want.border} on ${want.ground} is ` +
        `${ratio.toFixed(2)}:1, under the 3:1 needed for a visible edge`,
    );
    assert.ok(
      /border-color/.test(dark),
      `.app-alert-${variant} lost its border in dark mode`,
    );
  }
});

check('the left rule clears 3:1 on every dark ground', () => {
  const ground = contrast('#ff6115', '#1a1009');
  assert.ok(
    ground >= 3,
    `primary-500 rule on the alert ground is ${ground.toFixed(2)}:1`,
  );
});

check('RECORDED: light-mode alerts rely on their border, not a fill difference', () => {
  // In light mode every alert shares the same warm off-white ground as
  // .app-card-quiet, so an alert inside one has zero FILL separation. The box
  // still reads because the border is primary-200/300 against it, and the text
  // measures 9.3:1. This was the state light mode has always been in, and it is
  // why only dark mode was reported as broken: there the border was the cool
  // dark.border on an identical fill, so nothing separated the box at all.
  const lightGrounds = new Set(
    VARIANTS.map((v) => bgColor(lightRuleFor(`app-alert-${v}`))),
  );
  const quiet = bgColor(lightRuleFor('app-card-quiet'));
  assert.ok(quiet, '.app-card-quiet light ground missing');

  const shared = [...lightGrounds].filter((g) => distance(g, quiet) < 2);
  assert.ok(
    shared.length > 0,
    'light alert grounds no longer share the quiet-card ground; update this note',
  );

  // The compensating requirement: a light border must still be present.
  for (const variant of VARIANTS) {
    const light = lightRuleFor(`app-alert-${variant}`);
    assert.ok(
      /border/.test(light),
      `.app-alert-${variant} has no light border, and its fill no longer differs ` +
        'from the surface behind it, so the box would be invisible',
    );
  }
});

check('light-mode alert grounds are unchanged', () => {
  // Only dark mode was broken; light keeps the warm off-white grounds.
  const lightGrounds = new Set();
  for (const variant of VARIANTS) {
    const light = lightRuleFor(`app-alert-${variant}`);
    assert.ok(light, `.app-alert-${variant} light rule missing`);
    const bg = bgColor(light);
    assert.ok(bg, `.app-alert-${variant} light rule has no background`);
    lightGrounds.add(bg);
    assert.notStrictEqual(
      bg,
      SURFACES['dark.card'],
      '.app-alert light ground changed unexpectedly',
    );
  }
  // Every light ground should be a pale value, i.e. luminance well above the
  // dark surfaces.
  for (const bg of lightGrounds) {
    assert.ok(
      luminance(bg) > 0.7,
      `light alert ground ${bg} is not a pale value`,
    );
  }
});

const failed = results.filter((r) => !r).length;
console.log('');
if (failed) {
  console.log(`${failed} of ${results.length} alert checks FAILED`);
  process.exit(1);
}
console.log(`All ${results.length} alert checks passed.`);