import { useEffect, useRef, useState, type ChangeEvent, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { fmt } from '../lib/calc';

/** Lets a text field submit its enclosing add-form on Enter, like a normal form would.
    IME の変換確定 Enter（isComposing / Safari の keyCode 229）では送信しない。 */
export function submitOnEnter(fn: () => void) {
  return (e: KeyboardEvent) => {
    const ne = e.nativeEvent as unknown as { isComposing?: boolean; keyCode?: number };
    if (e.key === 'Enter' && !ne.isComposing && ne.keyCode !== 229) fn();
  };
}

export function ListRow({ children }: { children: ReactNode }) {
  return <div className="list-row">{children}</div>;
}

export interface SegTabItem { label: string; active: boolean; onClick: () => void }
export function SegTabs({ items }: { items: SegTabItem[] }) {
  return (
    <div className="seg-tabs">
      {items.map((it, i) => (
        <div
          key={i}
          className="seg-tab"
          style={{ color: it.active ? 'var(--fg)' : 'var(--muted)', borderBottomColor: it.active ? 'var(--primary2)' : 'transparent' }}
          onClick={it.onClick}
        >
          {it.label}
        </div>
      ))}
    </div>
  );
}

export interface MonthSwitcherProps {
  viewMonthLabel: string;
  isCurrentMonth: boolean;
  canGoNext: boolean;
  goPrevMonth: () => void;
  goNextMonth: () => void;
  goCurrentMonth: () => void;
}
export function MonthSwitcher(v: MonthSwitcherProps) {
  return (
    <div className="month-switcher">
      <div className="month-arrow" onClick={v.goPrevMonth}>‹</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <div className="month-label">{v.viewMonthLabel}</div>
        {!v.isCurrentMonth && <div className="link-quiet" style={{ fontSize: '11px' }} onClick={v.goCurrentMonth}>今月</div>}
      </div>
      <div className="month-arrow" style={{ visibility: v.canGoNext ? 'visible' : 'hidden' }} onClick={v.canGoNext ? v.goNextMonth : undefined}>›</div>
    </div>
  );
}

/**
 * A "削除" link that requires a second tap within 3s to actually fire —
 * cheap undo-by-hesitation for destructive actions that previously fired
 * on a single accidental tap with no way back.
 */
export function ConfirmDelete({ onConfirm, label = '削除', style }: { onConfirm: () => void; label?: string; style?: CSSProperties }) {
  const [armed, setArmed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <div
      className="link-quiet"
      style={{ fontSize: '11px', color: armed ? 'var(--red)' : undefined, padding: '6px 2px', ...style }}
      onClick={() => {
        if (armed) {
          if (timerRef.current) clearTimeout(timerRef.current);
          setArmed(false);
          onConfirm();
          return;
        }
        setArmed(true);
        timerRef.current = setTimeout(() => setArmed(false), 3000);
      }}
    >
      {armed ? '本当に削除？' : label}
    </div>
  );
}

/**
 * Number input that shows a comma-formatted value at rest and the raw
 * editable number while focused, so amounts are readable ("10,000円")
 * without fighting the browser over caret position during typing.
 */
export function NumberField({ value, onChange, className, style, min, max, step, placeholder, dataField, onKeyDown, autoFocus }: {
  value: number;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  style?: CSSProperties;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  dataField?: string;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  autoFocus?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const [local, setLocal] = useState(String(value));

  useEffect(() => { if (!focused) setLocal(String(value)); }, [value, focused]);

  return (
    <input
      className={className}
      style={style}
      type={focused ? 'number' : 'text'}
      inputMode="decimal"
      min={min}
      max={max}
      step={step}
      placeholder={placeholder}
      data-field={dataField}
      autoFocus={autoFocus}
      onKeyDown={onKeyDown}
      value={focused ? local : fmt(value || 0)}
      onFocus={(e) => { setFocused(true); setLocal(String(value)); e.target.select(); }}
      onBlur={() => setFocused(false)}
      onChange={(e) => { setLocal(e.target.value); onChange(e); }}
    />
  );
}

/**
 * "登録する"/"やめる" row for add-forms. Previously an invalid submit
 * (empty name, zero amount) just silently did nothing — no error, no
 * feedback, so it looked like the button was broken. Now the first
 * invalid attempt reveals why, and the button visually reads as
 * disabled until the form is actually submittable.
 */
export function FormActions({ valid, errorMessage, onSubmit, onCancel, submitLabel = '登録する' }: {
  valid: boolean;
  errorMessage: string;
  onSubmit: () => void;
  onCancel: () => void;
  submitLabel?: string;
}) {
  const [showError, setShowError] = useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {showError && !valid && <div style={{ fontSize: '12px', color: 'var(--red)' }}>{errorMessage}</div>}
      <div style={{ display: 'flex', gap: '8px' }}>
        <div
          className="btn-primary" style={{ opacity: valid ? 1 : .55 }}
          onClick={() => { if (valid) { setShowError(false); onSubmit(); } else setShowError(true); }}
        >
          {submitLabel}
        </div>
        <div className="btn-cancel" onClick={onCancel}>やめる</div>
      </div>
    </div>
  );
}
