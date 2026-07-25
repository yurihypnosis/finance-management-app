import { useEffect, useRef, useState } from 'react';
import './parts.css';

/** Small rounded square that identifies a category by its --cat-N color. */
export function ColorChip({ color, size = 10 }: { color: string; size?: number }) {
  return (
    <span
      className="color-chip"
      style={{ width: size, height: size, background: color }}
      aria-hidden="true"
    />
  );
}

export type BadgeTone = 'positive' | 'warning' | 'danger' | 'neutral';

const BADGE_TONE_VAR: Record<BadgeTone, string> = {
  positive: 'var(--color-positive)',
  warning: 'var(--color-warning)',
  danger: 'var(--color-danger)',
  neutral: 'var(--muted)',
};

/** Small status label with a quiet 15%-tinted background matching its tone color. */
export function Badge({ label, tone }: { label: string; tone: BadgeTone }) {
  const color = BADGE_TONE_VAR[tone];
  return (
    <span
      className="badge"
      style={{ color, background: `color-mix(in srgb, ${color} 15%, transparent)` }}
    >
      {label}
    </span>
  );
}

/** Numeric summary tile (e.g. home "このさき") with an optional tap target. */
export function StatTile({ label, value, unit, sub, onClick }: {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  onClick?: () => void;
}) {
  return (
    <div
      className={`stat-tile${onClick ? ' stat-tile-clickable' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      <div className="stat-tile-label">{label}</div>
      <div className="stat-tile-value-row">
        <span className="stat-tile-value">{value}</span>
        {unit && <span className="stat-tile-unit">{unit}</span>}
      </div>
      {sub && <div className="stat-tile-sub">{sub}</div>}
    </div>
  );
}

/** Unified full-width "＋追加" action used at the bottom of list screens. */
export function AddAction({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div className="add-action" onClick={onClick} role="button">
      {label}
    </div>
  );
}

/** Tappable (i) icon that toggles a short explanatory popover; closes on retap or outside tap. */
export function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', onOutside, true);
    document.addEventListener('touchstart', onOutside, true);
    return () => {
      document.removeEventListener('click', onOutside, true);
      document.removeEventListener('touchstart', onOutside, true);
    };
  }, [open]);

  return (
    <div className="info-tip" ref={ref}>
      <div className="info-tip-trigger" onClick={() => setOpen((v) => !v)} role="button" aria-label="説明">
        i
      </div>
      {open && <div className="info-tip-popover">{text}</div>}
    </div>
  );
}
