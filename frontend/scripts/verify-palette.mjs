/**
 * Scene palette guard.
 *
 * Run with: node verify-palette.mjs
 *
 * The product palette is hazard orange on warm neutral, with no green and no
 * red. Inside a 3D warehouse that rule needs a few carve-outs, and this file
 * encodes them rather than relying on good intentions:
 *
 *   ALLOWED â€” fire-protection red. Sprinkler main, heads, extinguishers and
 *             hose reels. Red is the internationally recognised colour for fire
 *             protection pipework, and part of what a trainee is trained to
 *             identify, so painting it orange would teach the wrong thing.
 *
 *   ALLOWED â€” green signage and indicator lamps. A "running man" exit sign is
 *             green under ISO 7010 and BS 5499, an eyewash station is ISO
 *             safety green, and a healthy-charge lamp is green. Recolouring
 *             any of them would make the environment factually wrong, which is
 *             worse for a safety tool than an off-brand accent.
 *
 * Everything else must be orange, amber, kraft, blue, grey or neutral.
 *
 * This check exists because two hues slipped through by looking like something
 * else. A drum at 0x2f6f4e had been read as "the blue one" for so long that
 * nobody noticed it is (47,111,78) â€” green â€” and a rust-red drum sat beside it
 * on the floor. Both are fixed; this stops them coming back.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolve from this file, not from process.cwd(). The previous version used a
// cwd-relative path, so it only worked when invoked from inside frontend/ and
// failed with ENOENT from anywhere else, including the repository root.
const HERE = dirname(fileURLToPath(import.meta.url));
const DIR = join(HERE, '..', 'src', 'components', 'viewer');
const files = readdirSync(DIR).filter((f) => f.endsWith('.js') || f.endsWith('.jsx'));

/** Colours permitted to be green, with the reason. */
const ALLOWED_GREEN = new Map([
  ['38d16a', 'charging-bay status lamp (healthy = green)'],
  ['1f9d55', 'fire exit running-man sign (ISO 7010 / BS 5499 green)'],
  ['2f7d5b', 'emergency eyewash station (ISO safety green)'],
]);

/** Colours permitted to be red, with the reason. */
const ALLOWED_RED = new Map([
  ['b0342a', 'sprinkler main, heads, extinguishers, hose reels'],
]);

/**
 * Hue in degrees: 0 = red, 60 = yellow, 120 = green, 240 = blue.
 *
 * Hue is the right discriminator here; channel-gap tests are not. Two earlier
 * versions failed in opposite directions:
 *
 *  - A green gap test MISSED the original green drum. #2f6f4e is (47,111,78),
 *    where green leads blue by only 33, so any threshold demanding a wide lead
 *    over both other channels waved it through. By hue it is 149Â°.
 *  - A red gap test flagged every orange in the project, because orange is the
 *    brand colour. By hue the families separate cleanly.
 */
const hueOf = (r, g, b) => {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return -1; // achromatic
  let h;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h *= 60;
  return h < 0 ? h + 360 : h;
};

const satOf = (r, g, b) => {
  const max = Math.max(r, g, b);
  return max === 0 ? 0 : (max - Math.min(r, g, b)) / max;
};

// Green: 100-200 deg covers leaf through emerald. ANSI Class 2 hi-vis lime
// (#c6e82a) sits at 71 deg and is correctly NOT flagged â€” hi-vis is
// yellow-green by standard and must stay that colour to read as PPE.
const isGreen = (r, g, b) => {
  const h = hueOf(r, g, b);
  return h >= 100 && h <= 200 && satOf(r, g, b) > 0.22;
};

// Red: under 12 deg. Amber lamp (#ffa41c, 60 deg) and the brand oranges
// (#d9700a at 30, #e0592a at 16) all sit well clear of it.
//
// The 12-20 deg band is vermilion â€” orange pushed towards red â€” and is
// deliberately treated as ORANGE. That is a judgement call with a hard edge: the
// traffic cone at 15.5 deg and a rust-oxide drum at 17.8 deg are 2 degrees apart
// and cannot be separated by hue, yet one is obviously on-palette and the other
// reads as red. So the band is allowed. The rust drum was removed for a
// different reason, recorded at the colour itself: a run of large saturated
// cylinders on the floor reads as an alarm state, whatever its hue is called.
const isRed = (r, g, b) => {
  const h = hueOf(r, g, b);
  return h >= 0 && h < 12 && satOf(r, g, b) > 0.35;
};

const found = [];
const seen = new Set();

for (const file of files) {
  const lines = readFileSync(join(DIR, file), 'utf8').split('\n');
  lines.forEach((line, i) => {
    const matches = line.match(/([A-Za-z_$][\w$]*|'[^']*')\s*:\s*0x([0-9a-fA-F]{6})/g);
    if (!matches) return;
    matches.forEach((tok) => {
      const hex = tok.slice(-6).toLowerCase();
      const key = `${file}:${hex}`;
      if (seen.has(key)) return;
      seen.add(key);
      const name = tok.replace(/\s*:\s*0x[0-9a-fA-F]{6}$/, '').trim();
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const rgb = `rgb(${r},${g},${b})`;
      if (isGreen(r, g, b) && !ALLOWED_GREEN.has(hex)) {
        found.push(`GREEN  ${file}:${i + 1}  ${name} = #${hex}  ${rgb}`);
      }
      if (isRed(r, g, b) && !ALLOWED_RED.has(hex)) {
        found.push(`RED    ${file}:${i + 1}  ${name} = #${hex}  ${rgb}`);
      }
    });
  });
}

console.log(`scanned ${seen.size} distinct named colours across ${files.length} files`);
console.log(
  `carve-outs: ${ALLOWED_GREEN.size} green, ${ALLOWED_RED.size} red ` +
    '(fire-protection red, exit-sign green â€” see the header)'
);

if (found.length) {
  console.log('');
  found.forEach((f) => console.log('  ' + f));
  console.log(`\nPALETTE AUDIT FAILED (${found.length} unexpected hue(s))`);
  process.exit(1);
}

console.log('\nPalette audit passed: no unexpected green or red in the 3D scene.');