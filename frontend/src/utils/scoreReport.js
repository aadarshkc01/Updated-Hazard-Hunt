/**
 * Hazard Hunt score report (PDF) - single page, A4.
 *
 * Produces the document an HSE supervisor would file: a branded banner across
 * the top, the assessment evidence below it, and a footer strip.
 *
 * WHY SINGLE PAGE, AND WHY IT IS BUILT THIS WAY
 *
 * The previous version flowed across pages and used a running `y` cursor. Two
 * things went wrong with that:
 *
 *  - **Text overlapped.** Label and value were drawn at the same `y` with the
 *    value at a fixed x, while the LABEL was allowed to wrap. A two-line label
 *    pushed its value into the row beneath. Multi-page flow also meant the
 *    second page repeated the whole furniture stack and the content split at
 *    arbitrary points, mid-sentence and mid-table.
 *
 *  - **It ran long.** Everything got reported: every hazard's full explanation,
 *    every quiz question with its explanation, the full session history. A
 *    compliance summary is a page, not a transcript.
 *
 * So this version is a FIXED layout with an explicit vertical budget, and it
 * degrades by TRUNCATING rather than by paginating:
 *
 *   - Every row measures itself - the row advances by the taller of its wrapped
 *     label and its wrapped value, so nothing can land on anything else.
 *   - Hazard lists are capped at a fixed number of entries with a
 *     "and N more" line, so a bad session cannot run off the page.
 *   - Long free text is truncated at a character budget with an ellipsis.
 *   - If the budget is ever exhausted, remaining sections are dropped rather
 *     than pushed onto a second page.
 *
 * Two more things carried over from the multi-page version:
 *  - Pass/fail is carried by the label and the rule WEIGHT (solid vs dashed),
 *    never a green or red fill. A report that prints a solid green box also
 *    prints it as muddy grey on a mono printer, which is most of them.
 *  - The document is reproducible: the layout seed appears in the identity
 *    block, so a disputed result can be regenerated and checked.
 */
import { jsPDF } from 'jspdf';

//
//
// The masthead deliberately uses the SAME two values as the dashboard banner
// in index.css, so the printed record and the screen it came from are the same
// brand rather than two related brands:
//
//   band     primary-200 #FFC7AB  - the dashboard banner ground
//   accent   primary-600 #E24C00  - the dashboard banner leading rule
//   deep     primary-800 #933000  - accent text that still clears AA on band
//
// The masthead was previously filled with primary-500 #FF6115. At full bleed
// that reads as red rather than as hazard orange, and it was the one place on
// the page that did not match the dashboards.
const C = {
  // NOTE: this is NOT the dashboard banner colour. The dashboard band is
  // primary-500 #FF6115, matched byte for byte to .app-btn-primary; this printed
  // masthead is deliberately the softer primary-200, because a full-strength
  // orange block reads as a poster on paper where it works on screen.
  band: [255, 199, 171], // primary-200 - the printed masthead ground
  accent: [226, 76, 0], // primary-600 - identical to the dashboard rule
  deep: [147, 48, 0], // primary-800 - 5.26:1 on the band, clears AA
  wash: [255, 244, 238], // primary-50
  ink: [22, 27, 32], // mist-900 - 11.56:1 on the band, AAA
  inkSoft: [59, 68, 77], // mist-700 - 6.61:1 on the band, AA
  muted: [104, 116, 132],
  faint: [203, 213, 225],
};

// -- Page geometry ----------------------------------------------------------
//
// A4 portrait. Not a preference: A4 is the sheet an official compliance record
// is printed and filed on, and the page has to be one that a UK/ISO print room
// will not rescale. Letter is 8% shorter and would force the hazard list to
// truncate sooner for no gain.
const PAGE_W = 210;
const PAGE_H = 297;

/**
 * Page margin.
 *
 * 18 mm rather than the 15 mm a word processor would default to. This is a
 * printed record that gets hole-punched and filed, so there has to be room for
 * the holes and enough inset that the text column does not look like a web
 * page that ran out of road.
 *
 * This margin applies to the CONTENT. The masthead band itself is full bleed:
 * it runs from x = 0 to the paper edge with no margin and no padding around
 * it, which is what it was changed back to.
 */
const M = 18;
const W = PAGE_W - M * 2;

/**
 * Masthead: a full-bleed band across the top of the sheet.
 *
 * No margin and no padding around the band itself. Its CONTENT is inset by the
 * page margin, because every document has an optical margin even when the
 * background graphic does not.
 *
 * There is no corner radius, and that is a consequence rather than an
 * omission: a radius only reads where there is something behind it. On an
 * element that runs to the paper edge, rounding would clip against the trim and
 * simply vanish.
 */
const MAST_H = 46;

const FOOTER_Y = PAGE_H - 20;
const BODY_TOP = MAST_H + 11;
const BODY_BOTTOM = FOOTER_Y - 9;

/**
 * Type scale.
 *
 * THREE tiers, assigned by the JOB the text does rather than by how it happens
 * to look, and strictly ordered big > medium > small. That ordering is the point:
 * when size means something, a reader can find the section they need without
 * reading it, and the candidate's name is visibly subordinate to the section
 * headings rather than shouting over them.
 *
 *   BIG     section headings, and the document title in the masthead
 *   MEDIUM  the candidate name - the one thing a reader looks for first, so it
 *           is the largest content size, but still below the headings
 *   SMALL   contents: field labels, values, lists, footer, provenance
 *
 * `display` sits ABOVE big and is reserved for one thing: the composite score.
 * It is a figure rather than a heading, and it is the single number the page
 * exists to convey, so it is allowed to break the scale. Nothing else may - the
 * harness asserts both the chain and that `display` is used once.
 */
const TYPE = {
  display: 30, // composite score - the one documented exception
  title: 15.5, // BIG    - document title, masthead
  heading: 11.5, // BIG   - section headings
  name: 10.5, // MEDIUM - the candidate
  body: 9, // SMALL   - contents and values
  label: 7.5, // SMALL  - field labels
  micro: 6.5, // SMALL  - footer and provenance
};

const asArray = (v) => (Array.isArray(v) ? v : []);

const fmtDate = (v) => {
  if (!v) return '-';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const fmtDateTime = (v) => {
  if (!v) return '-';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const fmtDuration = (s) => {
  const n = Number(s) || 0;
  return `${Math.floor(n / 60)}m ${String(n % 60).padStart(2, '0')}s`;
};

/**
 * Hard character cap so a long field can never wrap into the next row.
 *
 * The truncation marker is three ASCII full stops, not a horizontal ellipsis.
 * U+2026 is not in the WinAnsi encoding table jsPDF's built-in Helvetica uses,
 * so a real ellipsis is silently dropped and the field renders as a word with a
 * hole in it - which looks like a rendering fault rather than like truncation.
 */
const clip = (text, max) => {
  const s = String(text ?? '-');
  if (s.length <= max) return s;
  return `${s.slice(0, Math.max(1, max - 3)).trimEnd()}...`;
};

/**
 * @param {Array} records  Compliance records, any order. Practice runs are ignored.
 * @param {Object} user    { name, username, department, role }
 * @param {Object} [options]
 * @param {jsPDF} [options.pdf]  Pre-built document to draw into. Defaults to a
 *   fresh A4 portrait document. The harness passes its own so it can instrument
 *   the instance - jsPDF attaches `text` and `getTextWidth` as OWN properties on
 *   each instance rather than on the prototype, so there is no way to observe
 *   the draw calls without holding the object they are made on.
 * @returns {{ pdf: jsPDF, docRef: string, filenameBase: string }}
 */
export const buildScoreReport = (records = [], user = {}, options = {}) => {
  const official = asArray(records)
    .filter((r) => !r.isPracticeMode)
    .sort((a, b) => new Date(b.completedAt || 0) - new Date(a.completedAt || 0));

  if (!official.length) throw new Error('No official score records are available yet');

  const latest = official[0];
  const pdf = options.pdf ?? new jsPDF({ unit: 'mm', format: 'a4', compress: true });

  const issuedOn = new Date();
  const docRef = `HH-SR-${String(latest._id || 'NEW').slice(-6).toUpperCase()}-${issuedOn
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, '')}`;

  const threshold = latest.passingThreshold ?? 75;
  const total = latest.totalScore ?? 0;
  const passed = !!latest.passed;
  const found = asArray(latest.hazardsFound);
  const missed = asArray(latest.hazardsMissed);
  const quiz = asArray(latest.quizReview);
  const quizCorrect = quiz.filter((q) => q.isCorrect).length;

  const setInk = () => pdf.setTextColor(...C.ink);
  const setMuted = () => pdf.setTextColor(...C.muted);
  const rule = (x1, y1, x2, y2, width = 0.2, colour = C.faint) => {
    pdf.setDrawColor(...colour);
    pdf.setLineWidth(width);
    pdf.line(x1, y1, x2, y2);
  };

  /**
   * Draws wrapped text one line at a time, at a leading WE control.
   *
   * jsPDF will take an array from splitTextToSize and lay it out itself, using
   * its own line-height factor rather than any spacing the caller intended.
   * That is a trap here: this layout advances a cursor by an assumed step per
   * line, so if the renderer disagrees about the leading, the next block lands
   * on top of the text and the cursor arithmetic becomes fiction.
   *
   * Drawing each line explicitly means every baseline is known here, so the
   * arithmetic and the rendered output agree by construction - and every line
   * is a separate draw, which is what lets the harness measure it.
   */
  const para = (lines, x, y, lineStep) => {
    asArray(lines).forEach((line, i) => pdf.text(line, x, y + i * lineStep));
  };

  // ── BANNER ───────────────────────────────────────────────────────────────
  // A full-width orange band with a white wordmark, then a tinted strip carrying
  // the candidate and the document reference. Drawn first and never moved, so
  // everything below can rely on BODY_TOP being a fixed floor.
  // -- MASTHEAD -----------------------------------------------------------
  //
  // A full-bleed band in the same orange as the dashboard banner, with the
  // identity set directly onto it.
  //
  // The identity used to sit inside a separate tinted PLATE with rounded
  // corners, under a rounded masthead. Two boxes nested inside each other, with
  // different corner radii, read as a mistake rather than as design - the inner
  // one looked like a sharp-edged rectangle bolted onto a curved card. Dropping
  // the plate removes the mismatch entirely: the name and the document
  // reference now sit on the band itself, and a single hairline separates the
  // wordmark row from the identity row. One shape, not three.
  pdf.setFillColor(...C.band);
  pdf.rect(0, 0, PAGE_W, MAST_H, 'F');

  // Content is inset by the page margin; the band is not.
  const mx = M;
  const rightX = PAGE_W - M;

  // Row 1 - wordmark and document title. BIG.
  pdf.setTextColor(...C.ink);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(TYPE.title);
  pdf.text('HAZARDHUNT', mx, 16);
  pdf.setFontSize(TYPE.heading);
  pdf.text('ASSESSMENT SCORE REPORT', rightX, 16, { align: 'right' });

  // Row 2 - product line and issue date. SMALL.
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(TYPE.label);
  pdf.setTextColor(...C.inkSoft);
  pdf.text('Warehouse Safety Perception Trainer', mx, 22.5);
  pdf.text(
    issuedOn.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    rightX,
    22.5,
    { align: 'right' }
  );

  // A hairline, not a second box. It separates the two halves of the band
  // without adding an edge to fight with.
  rule(mx, 27.5, rightX, 27.5, 0.4, C.accent);

  // Row 3 - the candidate (MEDIUM) against the document reference.
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(TYPE.name);
  pdf.setTextColor(...C.ink);
  // Clipped so a long name can never reach under the reference on the right.
  const refW = pdf.getTextWidth(docRef) + 8;
  pdf.text(
    clip(latest.userName || user.name || 'Employee', 40),
    mx,
    35
  );

  pdf.setFontSize(TYPE.body);
  pdf.setTextColor(...C.deep);
  pdf.text(docRef, rightX, 35, { align: 'right' });

  // Row 4 - account, department, scenario. The scenario belongs here: a score
  // report filed without knowing which assessment it covers is not a record.
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(TYPE.label);
  pdf.setTextColor(...C.inkSoft);
  // Middle dot, not a hyphen and not an em dash: the dot renders correctly in
  // WinAnsi, whereas jsPDF silently drops U+2014 and leaves a gap.
  const scenario = latest.scenarioTitle ? `  ·  ${latest.scenarioTitle}` : '';
  pdf.text(
    clip(
      `@${user.username || latest.username || 'employee'}${latest.department ? `  |  ${latest.department}` : ''}${scenario}`,
      74
    ),
    mx,
    41
  );
  pdf.text('Official compliance record', rightX, 41, { align: 'right' });

  let y = BODY_TOP;

  /** True while there is room for `height` more millimetres. */
  const fits = (height) => y + height <= BODY_BOTTOM;

  const heading = (text) => {
    // Air above the heading as well as below it. Space between SECTIONS is what
    // makes a page read as organised; space between lines only makes it longer.
    if (!fits(12)) return false;
    y += 2.2;
    setInk();
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(TYPE.heading);
    pdf.text(text, M, y);
    rule(M, y + 2.2, M + 15, y + 2.2, 0.9, C.accent);
    y += 8;
    return true;
  };

  /**
   * A label/value row. BOTH sides are wrapped and the row advances by the
   * taller of the two, which is the whole reason nothing overlaps.
   */
  const row = (label, value, opts = {}) => {
    const labelW = opts.labelW ?? 52;
    const gap = 6;
    const valueW = W - labelW - gap;
    const valueX = M + labelW + gap;
    const valueBold = opts.valueBold !== false;

    const labelLines = pdf.splitTextToSize(clip(label, 64), labelW);
    const valueLines = pdf.splitTextToSize(clip(value, 96), valueW);
    const h = Math.max(labelLines.length, valueLines.length) * 4.7 + 2.8;
    if (!fits(h)) return false;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(TYPE.label);
    setMuted();
    para(labelLines, M, y, 4.7);
    pdf.setFont('helvetica', valueBold ? 'bold' : 'normal');
    pdf.setFontSize(TYPE.body);
    setInk();
    para(valueLines, valueX, y, 4.7);

    y += h;
    rule(M, y - 1, PAGE_W - M, y - 1);
    return true;
  };

  // ── Result ───────────────────────────────────────────────────────────────
  if (fits(32)) {
    const boxH = 31;
    pdf.setFillColor(...C.wash);
    pdf.rect(M, y, W, boxH, 'F');
    rule(M, y, M + W, y, 0.8, C.accent);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(TYPE.label);
    setMuted();
    pdf.text('COMPOSITE SCORE', M + 6, y + 10);
    setInk();
    // The one element permitted ABOVE the type scale: the figure the page is
    // for. Nothing else uses TYPE.display.
    pdf.setFontSize(TYPE.display);
    pdf.text(`${total}%`, M + 6, y + 24.5);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(TYPE.body);
    setMuted();
    pdf.text(`${threshold}% required to certify`, M + 44, y + 24.5);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(TYPE.heading);
    setInk();
    pdf.text(passed ? 'PASSED' : 'NOT CERTIFIED', PAGE_W - M - 6, y + 11.5, { align: 'right' });
    // Weight states the outcome, not hue: solid rule for a pass, dashed for a fail.
    const rx = PAGE_W - M - 34;
    if (passed) {
      rule(rx, y + 15.2, PAGE_W - M - 6, y + 15.2, 1.6, C.accent);
    } else {
      for (let x = rx; x < PAGE_W - M - 6; x += 3) {
        rule(x, y + 15.2, Math.min(x + 1.6, PAGE_W - M - 6), y + 15.2, 0.6, C.muted);
      }
    }
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(TYPE.label);
    setMuted();
    pdf.text(
      passed ? 'Meets threshold' : `${Math.max(0, threshold - total)} points below threshold`,
      PAGE_W - M - 6,
      y + 21.6,
      { align: 'right' }
    );

    y += boxH + 7;
  }

  // ── Metrics, two columns so the page stays short ─────────────────────────
  if (heading('Assessment detail')) {
    const colW = W / 2 - 6;
    const left = [
      ['Session date', fmtDateTime(latest.completedAt)],
      ['Training mode', latest.trainingMode === 'walkthrough' ? '3D Walkthrough' : 'Standard 360'],
      ['Hazards identified', String(found.length)],
    ];
    const right = [
      ['Hazards missed', String(missed.length)],
      ['False activations', String(latest.falseClicksCount ?? 0)],
      ['Time taken', `${fmtDuration(latest.timeTakenSeconds)} / ${fmtDuration(latest.timeLimitSeconds ?? 90)}`],
    ];

    const lineH = 7.1;
    const rows = Math.max(left.length, right.length);
    if (fits(rows * lineH)) {
      // Each column's value is RIGHT-aligned to that column's own edge. Placing
      // it at a fixed x instead let "1m 24s / 1m 30s" run into the next column's
      // label, because nothing measured how wide the value actually was.
      const cell = (label, value, labelX, colRight, baseline) => {
        if (!label) return;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(TYPE.label);
        setMuted();
        pdf.text(clip(label, 22), labelX, baseline);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(TYPE.body);
        setInk();
        pdf.text(clip(value, 26), colRight, baseline, { align: 'right' });
      };
      for (let i = 0; i < rows; i += 1) {
        const baseline = y + i * lineH;
        cell(left[i]?.[0], left[i]?.[1], M, M + colW, baseline);
        cell(right[i]?.[0], right[i]?.[1], M + colW + 6, PAGE_W - M, baseline);
      }
      y += rows * lineH + 2;
    }
  }

  // ── Hazards found ────────────────────────────────────────────────────────
  const bulletList = (title, items, cap) => {
    if (!items.length || !fits(16)) return;
    if (!heading(title)) return;
    const shown = items.slice(0, cap);
    shown.forEach((h, i) => {
      if (!fits(6)) return;
      pdf.setFillColor(...C.accent);
      pdf.circle(M + 1.4, y - 1.1, 1.1, 'F');

      // Measure the title with the title's OWN font active, before switching.
      // Doing it after a font change measures the string with the wrong metrics,
      // which underestimates and prints the category straight through the end of
      // the title.
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(TYPE.body);
      const label = clip(`${i + 1}. ${h.title || h.id || 'Hazard'}`, 60);
      const labelW = pdf.getTextWidth(label);
      setInk();
      pdf.text(label, M + 5, y);

      const meta = `${h.category || 'Uncategorised'}${h.severity ? `  ·  ${h.severity}` : ''}`;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(TYPE.label);
      setMuted();
      const metaX = M + 5 + labelW + 3;
      // Trim the category to whatever room is actually left, using the REAL
      // metrics rather than a characters-times-average-width estimate. The
      // estimate was too crude here and truncated "Chemical & Slip Hazard  /
      // High" to "Chemical & Slip Hazard  /..." even though it fitted.
      let fitted = meta;
      if (metaX + pdf.getTextWidth(meta) > PAGE_W - M) {
        let cut = meta.length;
        while (cut > 3 && metaX + pdf.getTextWidth(`${meta.slice(0, cut).trimEnd()}...`) > PAGE_W - M) {
          cut -= 1;
        }
        fitted = `${meta.slice(0, cut).trimEnd()}...`;
      }
      pdf.text(fitted, metaX, y);
      y += 5.8;
    });
    if (items.length > shown.length && fits(5)) {
      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(TYPE.label);
      setMuted();
      pdf.text(`+ ${items.length - shown.length} more`, M + 5, y);
      y += 5;
    }
    y += 1;
  };

  bulletList(`Hazards identified (${found.length})`, found, 4);

  // ── Hazards missed, with the required action only ─────────────────────────
  // The full explanation is what makes the screen report long. The action is
  // what a supervisor actually needs on paper.
  if (missed.length && fits(20) && heading(`Hazards missed (${missed.length})`)) {
    const shown = missed.slice(0, 4);
    shown.forEach((h, i) => {
      const title = `${i + 1}. ${h.title || h.id || 'Hazard'}`;
      const action = h.correctAction || 'Refer to site procedure.';
      const actionLines = pdf.splitTextToSize(clip(action, 150), W - 6);
      const h4 = 5.4 + actionLines.length * 3.9;
      if (!fits(h4)) return;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(TYPE.body);
      setInk();
      pdf.text(clip(title, 96), M + 2, y);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(TYPE.body - 0.5);
      pdf.setTextColor(...C.deep);
      para(actionLines, M + 2, y + 4.6, 3.8);
      y += h4 + 1.8;
    });
    if (missed.length > shown.length && fits(5)) {
      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(TYPE.label);
      setMuted();
      pdf.text(`+ ${missed.length - shown.length} further hazard(s) missed`, M + 2, y);
      y += 5;
    }
    y += 1;
  }

  // ── Quiz, as a single summary line rather than per question ──────────────
  if (quiz.length && fits(7) && heading('Safety knowledge quiz')) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(TYPE.body);
    setMuted();
    pdf.text(`${quizCorrect} of ${quiz.length} answered correctly`, M, y);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(TYPE.body);
    setInk();
    pdf.text(`${latest.quizScore ?? 0}%`, PAGE_W - M, y, { align: 'right' });
    y += 7.6;
  }

  // ── Recommendation ────────────────────────────────────────────────────────
  const cats = [...new Set(missed.map((h) => h.category).filter(Boolean))];
  const note = passed
    ? cats.length
      ? `Certified. Gaps recorded in: ${cats.join(', ')}. A short practice run is recommended.`
      : 'Certified with no missed categories. Schedule retraining per the annual HSE cycle.'
    : cats.length
      ? `Not certified. Retraining priority: ${cats.join(', ')}.`
      : 'Not certified. Review the inspection breakdown before re-attempting.';

  if (fits(20) && heading('Outcome')) {
    pdf.setFillColor(...C.wash);
    const lines = pdf.splitTextToSize(clip(note, 220), W - 14);
    const boxH = lines.length * 4.3 + 7.5;
    if (fits(boxH)) {
      pdf.rect(M, y, W, boxH, 'F');
      rule(M, y, M, y + boxH, 1.2, C.accent);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(TYPE.body);
      setInk();
      para(lines, M + 7, y + 5.9, 4.3);
      y += boxH + 2;
    }
  }

  // ── Footer ───────────────────────────────────────────────────────────────
  // Two lines, left-and-right only.
  //
  // An earlier version put a centred note on the first line as well, and
  // because "CONFIDENTIAL - for HSE and line-management use only." runs to
  // roughly 83 mm while a 57-character note centred at 105 mm starts at
  // 70 mm, the two printed straight through each other. Left+right pairs
  // cannot collide, so there are no centred items in the footer at all.
  //
  // Both baselines sit at least 10 mm above the trimmed edge, which is the
  // minimum most office printers will actually print.
  rule(M, FOOTER_Y, PAGE_W - M, FOOTER_Y, 0.3);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(TYPE.micro + 0.5);
  setMuted();
  pdf.text('CONFIDENTIAL - for HSE and line-management use only.', M, FOOTER_Y + 5.5);
  pdf.setFont('helvetica', 'bold');
  setInk();
  pdf.text('Page 1 of 1', PAGE_W - M, FOOTER_Y + 5.5, { align: 'right' });

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(TYPE.micro);
  setMuted();
  pdf.text(
    clip(
      `Generated from the Hazard Hunt compliance record. Practice sessions excluded. Layout seed ${
        latest.walkthroughLayoutSeed ?? 'n/a'
      }.`,
      105
    ),
    M,
    FOOTER_Y + 10.5
  );
  pdf.text(docRef, PAGE_W - M, FOOTER_Y + 10.5, { align: 'right' });

  return {
    pdf,
    docRef,
    filenameBase: `Hazard_Hunt_Score_Report_${String(user.username || latest.userName || 'employee').replace(
      /[^a-z0-9_-]/gi,
      '_'
    )}`,
  };
};