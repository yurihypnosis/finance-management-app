import type { Computed } from '../hooks/useComputed';
import { BudgetIcon, ExpenseIcon, HomeIcon, MoreIcon, ReportIcon } from './icons';

export function BottomNav({ v }: { v: Computed }) {
  const isMoreActive = !v.isHome && !v.isExpense && !v.isBudget && !v.isReport;
  const items = [
    { label: 'ホーム', Icon: HomeIcon, active: v.isHome, onClick: v.goHome },
    { label: '支出', Icon: ExpenseIcon, active: v.isExpense, onClick: v.goExpense },
    { label: '予算', Icon: BudgetIcon, active: v.isBudget, onClick: v.goBudget },
    { label: 'レポート', Icon: ReportIcon, active: v.isReport, onClick: v.goReport },
    { label: 'その他', Icon: MoreIcon, active: isMoreActive && v.menuOpen, onClick: v.toggleMenu },
  ];
  return (
    <div className="bottom-nav">
      {items.map((it) => (
        <div key={it.label} className="bottom-nav-item" style={{ color: it.active ? 'var(--primary2)' : 'var(--muted)' }} onClick={it.onClick}>
          <it.Icon size={20} />
          <div className="bottom-nav-label">{it.label}</div>
        </div>
      ))}
    </div>
  );
}
