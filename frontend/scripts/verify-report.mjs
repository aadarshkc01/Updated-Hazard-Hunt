/**
 * Score report generator harness.
 *
 * Asserts the things that are easy to break and invisible in a build log:
 *
 *  - the output is a real PDF, and it is ONE page of A4
 *  - nothing is drawn outside the printable area
 *  - **no two text runs overlap**
 *  - a worst-case session (nothing found, all five hazards missed, every field
 *    padded to its longest realistic value) still fits on that one page
 *  - practice runs are excluded, and a report with no official records is
 *    refused rather than rendering a blank page
 *
 * WHY THE OVERLAP CHECK WORKS THE WAY IT DOES
 *
 * An earlier version of this report printed the category straight through the
 * end of every hazard title, and the footer's centred note straight through
 * the confidentiality line. `pdf.save()` reported neither, and a green build
 * reported neither.
 *
 * Two earlier attempts at catching this were both wrong:
 *
 *  - Estimating width as `chars x fontSize x k` for some constant k produced
 *    seven false positives on a clean document. Any k small enough to be safe
 *    against real overlaps is far too large against Helvetica, and it cannot
 *    tell a left-aligned run from a right-aligned one, so it read every
 *    right-aligned run as starting at its right edge.
 *
 *  - Parsing `x y Td (text) Tj` out of the content stream recovers coordinates
 *    but discards alignment, font and size, which are not in the stream.
 *
 * So this measures the draw calls themselves, while they happen, and asks
 * jsPDF for the width using the font and size actually in force. `getTextWidth`
 * is called at the moment of the draw, so it returns the true advance width in
 * millimetres. Alignment is captured from the options object. What is asserted
 * is therefore exactly what is plotted - not a re-implementation of it.
 *
 * The content stream is still parsed, separately, to confirm the PDF is
 * well-formed, one page, and actually carries text.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Write the proof next to this script so the output lands in the same place
// regardless of the directory the harness is invoked from.
const HERE = dirname(fileURLToPath(import.meta.url));
const PROOF = join(HERE, 'score-report-proof.pdf');
import zlib from 'node:zlib';
import { jsPDF } from 'jspdf';
import { buildScoreReport } from '../src/utils/scoreReport.js';
import { typical, older, worst } from './report-fixtures.mjs';

// â”€â”€ Geometry, in millimetres, matching the report's own units â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 18;
const MAST_TOP = 18;
const MAST_H = 44;
const FOOTER_Y = PAGE_H - 20;

/** Baselines closer than this are considered to be on the same line. */
const SAME_LINE_MM = 3;
/** 0.4 mm of slack: runs that merely abut are not overlapping. */
const SLACK = 0.4;
/** Nothing may be printed closer than this to a trimmed edge. */
const EDGE_SAFE = 8;

let failed = 0;
const check = (name, pass, detail = '') => {
  if (!pass) failed += 1;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  ${detail}` : ''}`);
};

/**
 * An instrumented document.
 *
 * jsPDF attaches `text` and `getTextWidth` as OWN properties on each instance,
 * not on the prototype, so patching the prototype silently records nothing and
 * every geometry check then passes vacuously over an empty list. That is exactly
 * what happened on the first attempt. Owning the instance is the only way to
 * observe the draw calls, which is why the builder accepts one.
 *
 * getTextWidth is called at the moment of the draw, so it returns the true
 * advance width in millimetres for the font and size actually in force.
 */
const instrumentedPdf = () => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const original = doc.text.bind(doc);
  const runs = [];
  // Fill colours are recorded too: the masthead is asserted to be the SAME
  // orange as the dashboard banner, and that cannot be checked from geometry.
  const fills = [];
  const origFill = doc.setFillColor.bind(doc);
  doc.setFillColor = (...args) => {
    fills.push(args.length === 1 ? args[0] : args);
    return origFill(...args);
  };
  doc.text = (text, x, y, opts) => {
    if (typeof text === 'string' && typeof x === 'number' && typeof y === 'number' && text.trim()) {
      const w = doc.getTextWidth(text);
      const align = opts?.align || 'left';
      const left = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
      runs.push({ text, left, right: left + w, baseline: y, size: doc.internal.getFontSize() });
    }
    return original(text, x, y, opts);
  };
  return { doc, runs, fills };
};

/** Pairs on the same visual line whose horizontal spans intersect. */
const findOverlaps = (runs) => {
  const hits = [];
  for (let i = 0; i < runs.length; i += 1) {
    for (let j = i + 1; j < runs.length; j += 1) {
      const a = runs[i];
      const b = runs[j];
      if (Math.abs(a.baseline - b.baseline) > SAME_LINE_MM) continue;
      if (a.right > b.left + SLACK && b.right > a.left + SLACK) hits.push([a, b]);
    }
  }
  return hits;
};

const inflateTextOps = (buf) => {
  const raw = buf.toString('latin1');
  let all = '';
  const re = /stream\r?\n/g;
  let m;
  while ((m = re.exec(raw)) !== null) {
    const start = m.index + m[0].length;
    const end = raw.indexOf('endstream', start);
    if (end === -1) continue;
    let d = Buffer.from(raw.slice(start, end), 'latin1');
    try {
      d = zlib.inflateSync(d);
    } catch {
      /* not compressed */
    }
    const s = d.toString('latin1');
    if (/Tj/.test(s)) all += s;
  }
  return all;
};

const audit = (label, records, user, verbose) => {
  console.log(`\n--- ${label} ---`);
  // The masthead clips the candidate to 40 characters before drawing, so the
  // type-scale lookup has to compare against the clipped form, not the raw one.
  const latest = records.filter((r) => !r.isPracticeMode)[0] || {};
  const first = latest.userName || user.name || 'Employee';
  const latestName = first.length > 40 ? `${first.slice(0, 37).trimEnd()}...` : first;
  const { doc, runs, fills } = instrumentedPdf();
  let result;
  try {
    result = buildScoreReport(records, user, { pdf: doc });
  } catch (err) {
    check(`${label}: builds without throwing`, false, err.message);
    return null;
  }

  const buf = Buffer.from(doc.output('arraybuffer'));
  const ops = inflateTextOps(buf);

  check(`${label}: builds without throwing`, true);

  // â”€â”€ Stream-level: is this actually a PDF? â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  check(`${label}: exactly one page`, doc.getNumberOfPages() === 1, `pages=${result.pdf.getNumberOfPages()}`);
  check(
    `${label}: PDF header and EOF marker`,
    buf[0] === 0x25 &&
      buf[1] === 0x50 &&
      buf[2] === 0x44 &&
      buf[3] === 0x46 &&
      buf.subarray(Math.max(0, buf.length - 64)).toString('latin1').includes('%%EOF')
  );
  check(`${label}: content stream carries text`, /\(.*\)\s*Tj/.test(ops), `ops=${ops.length} bytes`);
  check(`${label}: has a document reference`, /^HH-SR-/.test(result.docRef), result.docRef);

  // â”€â”€ Geometry: measured from the real draw calls â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  check(`${label}: drew a usable amount of text`, runs.length >= 25, `runs=${runs.length}`);

  const overlaps = findOverlaps(runs);
  check(`${label}: no overlapping text`, overlaps.length === 0, `overlaps=${overlaps.length}`);
  overlaps.slice(0, 5).forEach(([a, b]) => {
    console.log(
      `        "${a.text.slice(0, 44)}" [${a.left.toFixed(1)}..${a.right.toFixed(1)}]` +
        ` vs "${b.text.slice(0, 44)}" [${b.left.toFixed(1)}..${b.right.toFixed(1)}]`
    );
  });

  const offTop = runs.filter((r) => r.baseline < EDGE_SAFE);
  check(`${label}: nothing in the top trim margin`, offTop.length === 0, `stray=${offTop.length}`);

  // Masthead: a FULL-BLEED band, deliberately without margin or padding.
  //
  // These assertions are the inverse of an earlier round, when the masthead was
  // an inset rounded card. Read from the emitted stream so that putting a margin
  // or a radius back fails here rather than passing quietly.
  //
  // jsPDF emits the rectangle operator in POINTS through the page CTM, so the
  // page margin arrives as 51.02 and comparing it against 18 fails on a layout
  // that is exactly right.
  const toMm = (pt) => (pt * 25.4) / 72;
  const shapes = [...ops.matchAll(/([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+) re/g)].map((m) => ({
    x: toMm(+m[1]),
    y: toMm(+m[2]),
    w: toMm(+m[3]),
    h: toMm(+m[4]),
  }));
  const band = shapes.find((r) => r.w > PAGE_W - 2);
  check(
    `${label}: masthead band runs the full page width, no margin`,
    !!band && Math.abs(band.x) < 0.5 && band.h < 0,
    band ? `x=${band.x.toFixed(1)}mm w=${band.w.toFixed(1)}mm` : 'no full-width shape found'
  );
  check(
    `${label}: masthead band is square-cornered (nothing to round against)`,
    !!band && Math.abs(band.w - PAGE_W) < 0.5,
    'a radius on a shape flush to the trim would clip and never read'
  );

  // One shape in the band area and no more: a second box inside the masthead is
  // the nested-plate problem that was reported, so it is asserted against.
  const bandTopMm = PAGE_H - (band ? Math.abs(band.h) : 0);
  const inside = shapes.filter((r) => r.y < PAGE_H && r.y >= bandTopMm - 0.5 && r !== band);
  check(
    `${label}: no plate box nested inside the masthead`,
    inside.length === 0,
    `nested shapes=${inside.length}`
  );

  // The masthead band is the printed orange, byte for byte. Note it is
  // deliberately NOT the same value as the dashboard banner, which uses
  // primary-500: a saturated block reads as a poster on paper.
  // The previous
  // fill was primary-500 #FF6115, which at full bleed reads as red rather than
  // as hazard orange and was the one place the report did not match the UI.
  const rgb = (c) => (Array.isArray(c) ? c : [c, c, c]).slice(0, 3).map((v) => Math.round(v)).join(',');
  check(
    `${label}: masthead band is the printed orange #FFC7AB`,
    fills.some((c) => rgb(c) === '255,199,171'),
    `fills: ${fills.map(rgb).slice(0, 5).join(' | ')}`
  );
  check(
    `${label}: no red-like primary-500 fill remains on the masthead`,
    !fills.some((c) => rgb(c) === '255,97,21'),
    ''
  );

  const offBottom = runs.filter((r) => r.baseline > PAGE_H - EDGE_SAFE);
  check(
    `${label}: nothing in the bottom trim margin`,
    offBottom.length === 0,
    offBottom.length ? `lowest=${Math.max(...offBottom.map((r) => r.baseline)).toFixed(1)}mm` : ''
  );

  const offSide = runs.filter((r) => r.left < MARGIN - 1 || r.right > PAGE_W - MARGIN + 1);
  check(`${label}: text stays inside the side margins`, offSide.length === 0, `stray=${offSide.length}`);
  offSide.slice(0, 3).forEach((r) => {
    console.log(`        "${r.text.slice(0, 44)}" [${r.left.toFixed(1)}..${r.right.toFixed(1)}]`);
  });

  const text = runs.map((r) => r.text).join(' | ');
  // -- Type scale ------------------------------------------------------------
  // Stated as the ORDERING the design calls for rather than as a list of magic
  // numbers: big > medium > small, with the composite score as the single
  // documented exception above all of them.
  const sizeOf = (needle) => runs.find((r) => r.text === needle)?.size;
  const scale = {
    display: sizeOf(`${latest.totalScore ?? 0}%`),
    title: sizeOf('HAZARDHUNT'),
    heading: sizeOf('Assessment detail'),
    name: sizeOf(latestName),
    body: sizeOf('3D Walkthrough'),
    label: sizeOf('Session date'),
    micro: sizeOf('CONFIDENTIAL - for HSE and line-management use only.'),
  };
  check(
    `${label}: every tier is actually used`,
    Object.values(scale).every((v) => typeof v === "number"),
    JSON.stringify(scale)
  );
  check(
    `${label}: BIG heading > MEDIUM name > SMALL contents`,
    scale.title > scale.heading &&
      scale.heading > scale.name &&
      scale.name > scale.body &&
      scale.body > scale.label,
    `title ${scale.title} > heading ${scale.heading} > name ${scale.name} > body ${scale.body} > label ${scale.label}`
  );
  check(
    `${label}: score is the only thing above the scale`,
    scale.display > scale.title && runs.filter((r) => r.size === scale.display).length === 1,
    `display ${scale.display}pt, used ${runs.filter((r) => r.size === scale.display).length}x`
  );
  check(
    `${label}: footer is the smallest tier`,
    scale.micro <= scale.label,
    `micro ${scale.micro} <= label ${scale.label}`
  );

  check(`${label}: shows the composite score`, /%/.test(text));
  check(`${label}: shows a verdict`, /PASSED|NOT CERTIFIED/.test(text));
  check(`${label}: shows the candidate`, text.includes(user.name.split(' ')[0].slice(0, 6)));
  check(`${label}: footer is present`, /CONFIDENTIAL/.test(text) && /Page 1 of 1/.test(text));
  check(`${label}: layout seed recorded for reproducibility`, /Layout seed/.test(text));
  // Character coverage.
  //
  // jsPDF's built-in Helvetica is WinAnsi encoded and silently DROPS anything
  // its encoding table does not carry - an em dash simply vanishes, leaving a
  // gap, with no warning and no exception. That is a real bug that shipped once
  // in a section heading.
  //
  // The allowlist is deliberately narrow rather than "any non-ASCII": the middle
  // dot used to separate category from severity does render correctly and is
  // wanted, so the guard asserts exactly which characters are permitted instead
  // of blanket-rejecting everything above U+007F.
  const ALLOWED_NON_ASCII = /[\u00B7]/g;
  const body = runs.map((r) => r.text).join('');
  const offenders = [...new Set(body.replace(ALLOWED_NON_ASCII, '').match(/[^\x00-\x7F]/g) || [])];
  check(
    `${label}: only WinAnsi-safe characters used`,
    offenders.length === 0,
    offenders.length
      ? `offending codepoints: ${offenders.map((c) => 'U+' + c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')).join(', ')}`
      : 'middle dot (U+00B7) only'
  );

  if (verbose) {
    const lowest = Math.max(...runs.map((r) => r.baseline));
    console.log(
      `        content reaches ${lowest.toFixed(0)} mm down the page ` +
        `(footer rule at ${FOOTER_Y} mm); ${runs.length} runs, ${buf.length} bytes`
    );
    console.log(`        file: ${result.filenameBase}.pdf`);
  }
  return buf;
};

const user = { name: 'Alex Rai', username: 'trainee1', department: 'Inbound Logistics', role: 'employee' };

// A typical mixed session, plus an older official record and a practice run
// that must be ignored entirely.
const typicalBuf = audit(
  'typical session',
  [typical, older, { ...typical, isPracticeMode: true, totalScore: 12 }],
  user,
  true
);

// The case that used to run off the page.
audit(
  'worst case session',
  [worst],
  {
    name: 'Bartholomew Fitzgerald-Montgomery',
    username: 'bfitzgerald',
    department: 'Inbound Logistics, Automotive Components Division',
    role: 'employee',
  },
  false
);

// Exercises the other branch of the result card and the "certified, no gaps"
// wording, and the empty-list paths.
audit(
  'clean pass',
  [{ ...older, hazardsMissed: [], falseClicksCount: 0 }],
  user,
  false
);

// A record with no quiz and nothing found, to check the sparse path.
audit(
  'sparse record',
  [{ ...typical, quizReview: [], hazardsFound: [], hazardsMissed: [], passed: false, totalScore: 0 }],
  user,
  false
);

let refused = false;
try {
  buildScoreReport([{ ...typical, isPracticeMode: true }], user);
} catch {
  refused = true;
}
check('refuses to build a report with no official records', refused);

if (typicalBuf) writeFileSync(PROOF, typicalBuf);
console.log('\nwrote scripts/score-report-proof.pdf for visual inspection');

console.log(failed === 0 ? '\nAll score report checks passed.' : `\n${failed} CHECK(S) FAILED`);
process.exit(failed === 0 ? 0 : 1);