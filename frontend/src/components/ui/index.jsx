import React from 'react';

/**
 * Shared presentational primitives.
 *
 * These exist so the dashboards can be built from a fixed vocabulary instead of
 * each screen inventing its own card, meter and empty state.
 */

/**
 * Page header.
 *
 * Carries the brand on every dashboard in one place, so no screen invents its
 * own treatment. The orange is confined to three spots — the eyebrow, the rule
 * beside it, and the leading edge of the header — because tinting the whole
 * header turns a dashboard into a poster and drowns the figures the page exists
 * to show.
 *
 * The layout is a two-column grid rather than `items-end` flex: with a
 * description present the previous version vertically centred a two-line block
 * against a single row of buttons, so the buttons drifted off the title's
 * baseline. `items-start` with a consistent gap keeps every screen's header
 * aligned the same way regardless of how many actions it has.
 */
/**
 * The coloured band that opens every dashboard.
 *
 * All three roles open with the same shape of content - a greeting or console
 * label, a title, one line of framing prose, and a right-hand slot of actions or
 * a headline figure. That made it worth ONE component: when the trainee screen
 * had a plain white heading and the two supervisory screens had the brand rule,
 * the trainee dashboard simply looked unfinished next to the others.
 *
 * The band is the largest place the brand colour is allowed to appear, so it is
 * deliberately restrained - a warm orange wash with a single saturated rule, not
 * a solid orange block. A full-strength fill behind body copy is hard to read and
 * makes every screen look like a marketing page.
 *
 * `meta` renders on the right inside the band; `actions` sit outside it, below.
 */
export const DashboardBanner = ({ eyebrow, title, description, meta, actions }) => (
  <header className="app-dashboard-banner">
    <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4 p-5">
      <div className="min-w-0">
        {eyebrow && (
          <div className="flex items-center gap-2.5">
            <span className="app-eyebrow-accent">{eyebrow}</span>
            {/* Deep, not primary-400: on the saturated band ground a lighter
                rule disappears into it. */}
            {/* Full white, not a brand tint: at that lightness the rule sits the same
                value as the band ground and disappears. 3:1 is the threshold for
                a non-text element and white on the band is exactly 3.01:1. */}
            <span className="h-px w-16 bg-white/70 dark:bg-primary-700" aria-hidden="true" />
          </div>
        )}
        <h1 className="app-display mt-1.5">{title}</h1>
        {description && <p className="app-body mt-1.5 max-w-2xl">{description}</p>}
      </div>
      {meta && <div className="shrink-0">{meta}</div>}
    </div>
    {actions && (
      // Dark translucent, not white: a bright strip would out-shout the band it
      // belongs to. Darkening the ground also raises the contrast of whatever
      // sits on it.
      <div className="flex flex-wrap items-center gap-2 border-t border-white/20 bg-black/20 px-5 py-3 dark:border-primary-800 dark:bg-black/20">
        {actions}
      </div>
    )}
  </header>
);

export const PageHeader = ({ eyebrow, title, description, actions }) => (
  <header className="app-page-header mb-5 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
    <div className="min-w-0 flex-1">
      {eyebrow && (
        <div className="flex items-center gap-2.5">
          <span className="app-eyebrow-accent">{eyebrow}</span>
          <span className="h-px w-16 bg-primary-300 dark:bg-primary-800" aria-hidden="true" />
        </div>
      )}
      <h1 className="app-display mt-1.5">{title}</h1>
      {description && <p className="app-body mt-1.5 max-w-3xl">{description}</p>}
    </div>
    {actions && (
      <div className="flex shrink-0 flex-wrap items-center gap-2 pt-0.5">{actions}</div>
    )}
  </header>
);

/** KPI tile. `tone` maps to the three semantic colours — never a raw class. */
export const StatTile = ({ label, value, sub, tone = 'neutral', meter, flat = false }) => {
  const valueTone =
    tone === 'pass'
      ? 'text-pass-600 dark:text-pass-200'
      : tone === 'stop'
        ? 'text-stop-600 dark:text-stop-200'
        : tone === 'caution'
          ? 'text-caution-600 dark:text-caution-200'
          : tone === 'brand'
            ? 'text-primary-600 dark:text-primary-400'
            : '';

  return (
    <div className={flat ? 'flex flex-col' : 'app-stat'}>
      <p className="app-stat-label">{label}</p>
      <p className="app-stat-value app-num">
        <span className={valueTone}>{value}</span>
      </p>
      {sub && <p className="app-stat-sub">{sub}</p>}
      {typeof meter === 'number' && (
        <div className="app-meter mt-2.5">
          <div
            className={`app-meter-fill ${tone === 'pass' ? 'app-meter-fill-pass' : tone === 'stop' ? 'app-meter-fill-stop' : ''}`}
            style={{ width: `${Math.max(0, Math.min(100, meter))}%` }}
          />
        </div>
      )}
    </div>
  );
};

/**
 * Horizontal bar chart built on plain divs.
 * Deliberately dependency-free — it inherits the theme and stays legible on
 * small screens where a canvas/SVG chart would need its own scaling logic.
 */
/**
 * Horizontal bar chart built on plain divs.
 *
 * Deliberately dependency-free — it inherits the theme and stays legible on
 * small screens where a canvas/SVG chart would need its own scaling logic.
 * `items` are scaled against the largest value, so the shape reads correctly
 * even when the underlying units are counts rather than percentages.
 */
export const BarList = ({ items, emptyLabel = 'No data yet', valueSuffix = '%' }) => {
  if (!items?.length) {
    return <p className="app-body px-4 py-6 text-center">{emptyLabel}</p>;
  }
  const max = Math.max(...items.map((i) => Number(i.value) || 0), 1);

  const FILL = {
    pass: 'bg-primary-600',
    caution: 'bg-caution-600',
    stop: 'bg-stop-700',
    neutral: 'bg-mist-400',
  };

  return (
    <ul className="space-y-2.5">
      {items.map((item) => {
        const pct = ((Number(item.value) || 0) / max) * 100;
        const fill = FILL[item.tone] ?? FILL.pass;
        return (
          <li key={item.label}>
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <span className="truncate text-xs font-semibold text-mist-700 dark:text-dark-muted">
                {item.label}
              </span>
              <span className="app-num shrink-0 text-xs font-bold text-mist-900 dark:text-dark-text">
                {item.display ?? `${item.value}${valueSuffix}`}
              </span>
            </div>
            <div className="app-meter">
              <div className={`h-full rounded-full ${fill}`} style={{ width: `${pct}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
};

/**
 * Compact column chart for a short time series.
 *
 * Used for the seven-day activity view, where columns are the honest shape:
 * each day is an independent count, not a continuous reading.
 *
 * `domain` exists because scaling to the peak alone is misleading for
 * bounded values. A run of scores at 82/85/84 drawn against a peak of 85 renders
 * three near-identical full-height bars and shows no trend at all. Passing an
 * explicit `[min, max]` keeps a percentage series on a true 0–100 axis, so a
 * five-point move is visible instead of hidden.
 */
export const ColumnChart = ({
  data = [],
  valueKey = 'value',
  labelKey = 'label',
  height = 96,
  domain,
  emptyLabel = 'No activity in this period',
  formatValue = (v) => v,
}) => {
  if (!data.length) {
    return <p className="app-body px-4 py-6 text-center">{emptyLabel}</p>;
  }

  const values = data.map((d) => Number(d[valueKey]) || 0);
  const [lo, hi] = domain ?? [0, Math.max(...values, 1)];
  const span = hi - lo || 1;
  const scale = (v) => ((Math.min(hi, Math.max(lo, v)) - lo) / span) * 100;

  return (
    <div>
      <div
        className="flex items-end gap-1.5"
        style={{ height: `${height}px` }}
        role="img"
        aria-label={`${labelKey} per period, range ${lo} to ${hi}`}
      >
        {data.map((d, i) => {
          const value = Number(d[valueKey]) || 0;
          const isLast = i === data.length - 1;
          // `h-full` on this wrapper is load-bearing: without an explicit height
          // the child's percentage height resolves against `auto` and collapses
          // to zero, so no bars render at all.
          return (
            <div
              key={d.date ?? d[labelKey] ?? i}
              className="flex h-full min-w-0 flex-1 flex-col justify-end"
            >
              <div
                className={`w-full rounded-t-sm transition-[height] duration-500 ${
                  isLast
                    ? 'bg-primary-500'
                    : 'bg-primary-300 dark:bg-primary-800'
                }`}
                style={{ height: `${Math.max(value > 0 ? 4 : 2, scale(value))}%` }}
                title={`${d[labelKey]}: ${formatValue(value)}`}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-1.5">
        {data.map((d, i) => (
          <p
            key={d.date ?? d[labelKey] ?? i}
            className={`min-w-0 flex-1 truncate text-center text-[10px] font-semibold ${
              i === data.length - 1
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-mist-400 dark:text-dark-muted'
            }`}
          >
            {d[labelKey]}
          </p>
        ))}
      </div>
    </div>
  );
};

/**
 * Line chart for a continuous series — a score over time, where the *shape*
 * between points is the point of the chart.
 *
 * Drawn as inline SVG rather than columns because a trendline needs to connect
 * readings; columns imply independent buckets and flatten the very movement the
 * viewer is looking for.
 *
 * `reference` draws a dashed threshold line (the 75% pass mark, say) so every
 * point can be read against the standard rather than against the axis alone.
 * The area fill under the line gives the shape weight at a glance, and the last
 * point is enlarged so "where I am now" is unambiguous.
 */
export const TrendChart = ({
  data = [],
  valueKey = 'value',
  labelKey = 'label',
  height = 120,
  domain = [0, 100],
  reference,
  referenceLabel,
  emptyLabel = 'Not enough data to plot a trend yet',
  formatValue = (v) => `${v}%`,
  unit = '%',
}) => {
  if (data.length < 2) {
    return (
      <p className="app-body px-4 py-8 text-center">
        {data.length === 1
          ? 'One session recorded. Complete another to plot a trend.'
          : emptyLabel}
      </p>
    );
  }

  // The theme lives on <html> as a class, and the gradients are referenced by
  // id, so resolve the current theme once per render to pick the right fill.
  const theme = typeof document !== 'undefined'
    ? document.documentElement.classList.contains('dark')
      ? 'dark'
      : 'light'
    : 'light';
  const areaFill = `url(#app-trend-fill-${theme})`;

  const W = 320;
  const H = height;
  const PAD_TOP = 10;
  const PAD_BOTTOM = 4;
  const plot = H - PAD_TOP - PAD_BOTTOM;
  const [lo, hi] = domain;
  const span = hi - lo || 1;

  const xAt = (i) => (data.length === 1 ? W / 2 : (i / (data.length - 1)) * (W - 12) + 6);
  const yAt = (v) => PAD_TOP + plot - ((Math.min(hi, Math.max(lo, v)) - lo) / span) * plot;

  const points = data.map((d, i) => [xAt(i), yAt(Number(d[valueKey]) || 0)]);
  const line = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${points[points.length - 1][0].toFixed(1)},${H - PAD_BOTTOM} L${points[0][0].toFixed(1)},${H - PAD_BOTTOM} Z`;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label={`Trend of ${labelKey}, ${data.length} points, range ${lo} to ${hi}`}
      >
        <defs>
          {/* Two gradients, selected by the theme class on <html>. A single
              gradient tuned for a light canvas becomes an opaque brown block on
              a dark one. */}
          <linearGradient id="app-trend-fill-light" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(255 97 21)" stopOpacity="0.15" />
            <stop offset="100%" stopColor="rgb(255 97 21)" stopOpacity="0.01" />
          </linearGradient>
          <linearGradient id="app-trend-fill-dark" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(255 122 60)" stopOpacity="0.16" />
            <stop offset="100%" stopColor="rgb(255 122 60)" stopOpacity="0.015" />
          </linearGradient>
        </defs>

        {/* Pass threshold, so every reading is judged against the standard. */}
        {reference !== undefined && reference >= lo && reference <= hi && (
          <g>
            <line
              x1="0"
              x2={W}
              y1={yAt(reference)}
              y2={yAt(reference)}
              className="app-trend-ref"
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            {referenceLabel && (
              <text
                x="4"
                y={yAt(reference) - 4}
                className="app-trend-ref-label text-[9px] font-bold"
              >
                {referenceLabel}
              </text>
            )}
          </g>
        )}

        <path d={area} fill={areaFill} />
        <path
          d={line}
          className="app-trend-line"
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />

        {points.map(([x, y], i) => {
          const isLast = i === points.length - 1;
          const d = data[i];
          const value = Number(d[valueKey]) || 0;
          return (
            <circle
              key={d.date ?? d[labelKey] ?? i}
              cx={x}
              cy={y}
              r={isLast ? 4.5 : 3}
              className={isLast ? 'app-trend-dot app-trend-dot-last' : 'app-trend-dot'}
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            >
              <title>{`${d[labelKey]}: ${formatValue(value)}`}</title>
            </circle>
          );
        })}
      </svg>

      <div className="mt-1 flex gap-1">
        {data.map((d, i) => (
          <p
            key={d.date ?? d[labelKey] ?? i}
            className={`min-w-0 flex-1 truncate text-center text-[10px] font-semibold ${
              i === data.length - 1
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-mist-400 dark:text-dark-muted'
            }`}
          >
            {d[labelKey]}
          </p>
        ))}
      </div>
    </div>
  );
};

/**
 * A single headline figure with an optional comparison against a baseline.
 *
 * `delta` is passed as an already-computed number so the caller decides the
 * semantics (improving vs declining) rather than the component guessing from a
 * sign. `invert` flips the tone mapping for metrics where down is good.
 */
export const Metric = ({
  label,
  value,
  unit,
  baseline,
  delta,
  deltaLabel = 'vs earlier sessions',
  invert = false,
  hint,
}) => {
  const deltaTone =
    delta === undefined || delta === null
      ? ''
      : invert
        ? delta > 0
          ? 'text-stop-700 dark:text-stop-200'
          : 'text-primary-600 dark:text-primary-400'
        : delta > 0
          ? 'text-primary-600 dark:text-primary-400'
          : 'text-stop-700 dark:text-stop-200';

  return (
    <div className="min-w-0">
      <p className="app-eyebrow">{label}</p>
      <p className="app-num mt-1 text-xl font-bold leading-none text-mist-900 dark:text-dark-text">
        {value}
        {unit && <span className="ml-0.5 text-xs font-semibold text-mist-400">{unit}</span>}
      </p>
      {delta !== undefined && delta !== null && (
        <p className={`app-num mt-1 text-[11px] font-bold ${deltaTone}`}>
          {delta > 0 ? '+' : ''}
          {delta}
          {unit && unit !== '%' ? unit : ''} {deltaLabel}
        </p>
      )}
      {baseline !== undefined && baseline !== null && (
        <p className="app-num mt-0.5 text-[11px] text-mist-400 dark:text-dark-muted">
          {baseline}
        </p>
      )}
      {hint && <p className="app-body mt-1 leading-snug">{hint}</p>}
    </div>
  );
};

export const EmptyState = ({ title, description, action }) => (
  <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
    <p className="app-section-title">{title}</p>
    {description && <p className="app-body max-w-sm">{description}</p>}
    {action}
  </div>
);

export const SectionCard = ({
  title,
  description,
  actions,
  children,
  bodyClass = 'p-4',
  className = '',
}) => (
  <section className={`app-card overflow-hidden ${className}`}>
    {(title || actions) && (
      <div className="app-card-head">
        <div className="min-w-0">
          {title && <h2 className="app-section-title">{title}</h2>}
          {description && <p className="app-body mt-0.5">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    )}
    <div className={bodyClass}>{children}</div>
  </section>
);