import type { CSSProperties, ReactNode } from 'react';
import './charts.css';

/* ============================================================
   Chart primitives (Phase 1 基盤)

   Hand-rolled, zero-dependency, dark-surface-only. Every color a
   chart draws is supplied by the caller as a token reference
   (`var(--cat-3)`, `var(--color-danger)`, …) or picked from the
   semantic tokens here — no literal hues live in this file, so a
   retune of style.css retunes the charts.

   Sizing rule: charts never measure themselves (no ResizeObserver).
   Horizontal size is always 100% of the parent; only the vertical
   dimension is a prop. SVG marks are positioned in percentages so
   that stays true at any width, and all text is real HTML text
   layered over the SVG so it never scales with the container.

   Mark conventions follow the dataviz skill: 4px rounded data-ends
   anchored to the baseline, a 2px surface gap between adjacent
   fills, recessive axis text, and direct labels only where they
   carry meaning (the selected bar), never on every mark.
   ============================================================ */

/** Vertical room reserved above the plot for the selected bar's value label. */
const BAR_LABEL_SPACE = 22;
/** Corner radius of a bar's top end; the bottom end is clipped flat at the baseline. */
const BAR_RADIUS = 4;
/** A bar keeps this much height at value 0 so its column stays legible. */
const BAR_MIN_PX = 2;
/** Share of a column occupied by its bar — the rest is breathing room. */
const BAR_FILL = 0.62;

const yen = (v: number) => `${Math.round(v).toLocaleString('ja-JP')}円`;

export interface BarDatum {
  /** Axis label under the bar (e.g. "7月"). Kept short — it ellipsizes. */
  label: string;
  value: number;
  /** Marks the bar as current/selected: accent fill + a direct value label. */
  highlight?: boolean;
}

export interface BarChartProps {
  data: BarDatum[];
  /** Total height of the plot area in px, label space included. Default 160. */
  height?: number;
  /** Called with the column index on tap. Omit to render a non-interactive chart. */
  onSelect?: (index: number) => void;
  /** Fill for highlighted bars. Default `var(--color-accent)`. */
  color?: string;
  /** Fill for the rest. Default `var(--border2)`. */
  mutedColor?: string;
  /** Formats the direct label on highlighted bars. Default `12,345円`. */
  formatValue?: (value: number) => string;
  /** Accessible name for the chart as a whole. */
  ariaLabel?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * Vertical bar chart for month-over-month trends (レポート / 年間).
 *
 * Bars are painted in SVG at percentage positions; the tap targets are
 * real `<button>`s covering the *whole column* (not just the bar), so a
 * narrow bar in a 12-month series is still comfortably tappable — the
 * column is the hit area even when it is under 44px wide, which is the
 * widest target the layout can offer.
 *
 * Only highlighted bars get a value label, per the "no number on every
 * mark" rule; the caller decides which bar that is (`highlight`), so the
 * chart stays a controlled component and can follow MonthSwitcher.
 */
export function BarChart({
  data,
  height = 160,
  onSelect,
  color = 'var(--color-accent)',
  mutedColor = 'var(--border2)',
  formatValue = yen,
  ariaLabel,
  className,
  style,
}: BarChartProps) {
  const n = data.length;
  if (n === 0) return null;

  const plot = Math.max(1, height - BAR_LABEL_SPACE);
  const max = Math.max(...data.map((d) => (Number.isFinite(d.value) ? Math.max(d.value, 0) : 0)), 0);
  const colW = 100 / n;
  const barW = colW * BAR_FILL;
  const barPx = (v: number) => {
    const safe = Number.isFinite(v) ? Math.max(v, 0) : 0;
    return max > 0 ? Math.max(BAR_MIN_PX, (safe / max) * plot) : BAR_MIN_PX;
  };

  return (
    <div className={['chart-bars', className].filter(Boolean).join(' ')} style={style}>
      <div className="chart-bars-plot" style={{ height: `${height}px` }}>
        <svg
          className="chart-bars-svg"
          height={height}
          width="100%"
          role="img"
          aria-label={ariaLabel ?? '月別推移'}
        >
          {data.map((d, i) => {
            const h = barPx(d.value);
            return (
              <rect
                key={i}
                className="chart-bar-rect"
                x={`${i * colW + (colW - barW) / 2}%`}
                width={`${barW}%`}
                /* Drawn BAR_RADIUS taller than needed so the bottom pair of
                   rounded corners falls outside the viewport and is clipped —
                   a data end is rounded, a baseline end is square. */
                y={height - h}
                height={h + BAR_RADIUS}
                rx={BAR_RADIUS}
                fill={d.highlight ? color : mutedColor}
              />
            );
          })}
        </svg>

        <div className="chart-bars-layer">
          {data.map((d, i) => {
            const cls = ['chart-bar-value', 'chart-num'];
            if (n > 1 && i === 0) cls.push('chart-bar-value--first');
            if (n > 1 && i === n - 1) cls.push('chart-bar-value--last');
            return (
              <button
                key={i}
                type="button"
                className="chart-bars-col"
                disabled={!onSelect}
                aria-pressed={onSelect ? !!d.highlight : undefined}
                aria-label={`${d.label} ${formatValue(d.value)}`}
                onClick={onSelect ? () => onSelect(i) : undefined}
              >
                {d.highlight && (
                  <span className={cls.join(' ')} style={{ bottom: `${barPx(d.value) + 6}px` }}>
                    {formatValue(d.value)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="chart-bars-axis" aria-hidden="true">
        {data.map((d, i) => (
          <div key={i} className={`chart-bars-axis-label${d.highlight ? ' is-on' : ''}`}>
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export interface DonutSegment {
  label: string;
  value: number;
  /** Token reference, e.g. `var(--cat-2)`. Assigned by the caller in fixed category order. */
  color: string;
}

export interface DonutProps {
  segments: DonutSegment[];
  /** Outer diameter in px. Default 160. */
  size?: number;
  /** Ring thickness in px. Default ~16% of `size`. */
  thickness?: number;
  /** Anything to render in the hole — usually a total, or a total + caption. */
  center?: ReactNode;
  ariaLabel?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * Category-breakdown donut (レポート内訳 / ホーム手取り内訳).
 *
 * Rendered as one `<circle>` per segment with a computed dash pattern:
 * the arc geometry is then a pair of animatable numbers, so a data
 * change sweeps rather than jumps, and the 2px surface gap between
 * segments is subtracted from each arc's length instead of being drawn.
 *
 * Collapsing the long tail into "その他" is the caller's job — this
 * component draws exactly the segments it is given, in the given order,
 * so category→color stays stable when a filter changes the segment count.
 */
export function Donut({
  segments,
  size = 160,
  thickness,
  center,
  ariaLabel,
  className,
  style,
}: DonutProps) {
  /* Geometry is authored in a 0–100 user-space box and scaled by the SVG
     to `size`, so px props are converted once here. */
  const t = ((thickness ?? Math.max(10, Math.round(size * 0.16))) * 100) / size;
  const gap = (2 * 100) / size;
  const r = (100 - t) / 2;
  const C = 2 * Math.PI * r;

  const values = segments.map((s) => (Number.isFinite(s.value) ? Math.max(s.value, 0) : 0));
  const total = values.reduce((a, b) => a + b, 0);
  const drawn = segments.filter((_, i) => values[i] > 0);
  const single = drawn.length === 1;

  let acc = 0;
  const arcs = segments.map((s, i) => {
    const v = values[i];
    if (v <= 0) return null;
    const start = acc;
    acc += v / total;
    const len = (v / total) * C;
    /* No gap when a single segment owns the whole ring — otherwise a
       100% category would show a phantom notch. */
    const visible = single ? C : Math.max(len - gap, 0.5);
    return (
      <circle
        key={i}
        className="chart-donut-seg"
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke={s.color}
        strokeWidth={t}
        strokeDasharray={`${visible} ${C - visible}`}
        strokeDashoffset={-start * C}
      />
    );
  });

  const label =
    ariaLabel ??
    (total > 0
      ? segments
          .filter((_, i) => values[i] > 0)
          .map((s, i) => `${s.label} ${Math.round((values[i] / total) * 100)}%`)
          .join('、')
      : 'データなし');

  return (
    <div
      className={['chart-donut', className].filter(Boolean).join(' ')}
      style={{ width: `${size}px`, height: `${size}px`, ...style }}
    >
      <svg className="chart-donut-svg" viewBox="0 0 100 100" role="img" aria-label={label}>
        {/* Track: also the entire chart when there is no data yet. */}
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--border)" strokeWidth={t} />
        {total > 0 && arcs}
      </svg>
      {center != null && <div className="chart-donut-center">{center}</div>}
    </div>
  );
}

export interface StackedSegment {
  value: number;
  /** Token reference, e.g. `var(--cat-1)`. */
  color: string;
  /** Used for the accessible description only; visible legends live outside the bar. */
  label?: string;
}

export interface StackedBarProps {
  segments: StackedSegment[];
  /**
   * Denominator. When given, the segments are drawn as a share of it and
   * the shortfall stays as bare `--border` track (= "not yet used" /
   * "not yet earned"). Omit to make the segments fill the bar (100%
   * composition). If the segments exceed `total` they are normalised
   * down to fill exactly, so the bar never overflows silently.
   */
  total?: number;
  /** Bar thickness in px. Default 8 — the 原則2 minimum, vs. the old 2px hairlines. */
  height?: number;
  ariaLabel?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * Horizontal stacked bar for composition and attainment
 * (手取り内訳: 固定費/変動費/残り, 年間の構成比, 目標の達成度).
 *
 * Adjacent fills are separated by a 2px `--bg` rule so neighbouring
 * category hues never touch, and the ends are pill-rounded by clipping
 * at the track rather than at each segment, keeping interior joins square.
 */
export function StackedBar({
  segments,
  total,
  height = 8,
  ariaLabel,
  className,
  style,
}: StackedBarProps) {
  const values = segments.map((s) => (Number.isFinite(s.value) ? Math.max(s.value, 0) : 0));
  const sum = values.reduce((a, b) => a + b, 0);
  const denom = total != null && total > 0 ? Math.max(total, 0) : sum;
  /* Over-filled bars are scaled to exactly 100%: the overflow is a state
     the caller signals with color/copy, not something the bar should crop. */
  const scale = denom > 0 ? (sum > denom ? 1 / sum : 1 / denom) : 0;

  return (
    <div
      className={['chart-track', className].filter(Boolean).join(' ')}
      style={{ height: `${height}px`, ...style }}
      role="img"
      aria-label={
        ariaLabel ??
        segments
          .filter((_, i) => values[i] > 0)
          .map((s, i) => `${s.label ? `${s.label} ` : ''}${Math.round(values[i] * scale * 100)}%`)
          .join('、')
      }
    >
      {segments.map((s, i) =>
        /* Zero-value segments are dropped rather than drawn at 0% — a 0%
           fill would still contribute its 2px separator rule. */
        values[i] > 0 ? (
          <div
            key={i}
            className="chart-track-seg"
            style={{ width: `${values[i] * scale * 100}%`, background: s.color }}
          />
        ) : null,
      )}
    </div>
  );
}

export interface MeterBarProps {
  /** Progress as a fraction. May exceed 1 — the overshoot is shown as color, not length. */
  ratio: number;
  /** Fill color. Omit to derive it: ≤0.8 accent / ≤1.0 warning / >1.0 danger. */
  color?: string;
  /** Bar thickness in px. Default 8. */
  height?: number;
  ariaLabel?: string;
  className?: string;
  style?: CSSProperties;
}

/** ≤0.8 neutral-accent, 0.8–1.0 caution, >1.0 over — the 予算 status contract (原則3). */
export function meterColor(ratio: number): string {
  if (ratio > 1) return 'var(--color-danger)';
  if (ratio > 0.8) return 'var(--color-warning)';
  return 'var(--color-accent)';
}

/**
 * Single-value progress meter (予算の使用率, 目標の達成率, 年間見込み).
 *
 * The bar stops at 100% and switches to `--color-danger` when the ratio
 * goes over, so "over budget" reads as a state change rather than as a
 * bar that quietly ran out of room. The status color is the only thing
 * carrying that meaning inside the mark — always pair it with a visible
 * figure or label in the surrounding row.
 */
export function MeterBar({ ratio, color, height = 8, ariaLabel, className, style }: MeterBarProps) {
  const safe = Number.isFinite(ratio) ? Math.max(ratio, 0) : 0;
  const pct = Math.min(safe, 1) * 100;

  return (
    <div
      className={['chart-track', className].filter(Boolean).join(' ')}
      style={{ height: `${height}px`, ...style }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      /* valuenow is clamped to the 0–100 range ARIA requires; valuetext
         carries the real figure so an overshoot is still announced. */
      aria-valuetext={`${Math.round(safe * 100)}%`}
      aria-label={ariaLabel}
    >
      <div
        className="chart-meter-fill"
        style={{ width: `${pct}%`, background: color ?? meterColor(safe) }}
      />
    </div>
  );
}
