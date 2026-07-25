import type { ReactNode } from 'react';

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
