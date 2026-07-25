import { useAppStore } from '../store/appStore';
import type { Computed } from '../hooks/useComputed';

// Home/支出/予算/レポートは下部タブに常設したので、ここには残りの画面だけ並べる
const HIDDEN_IN_MENU = new Set(['home', 'expense', 'budget', 'report']);

export function Menu({ v }: { v: Computed }) {
  const signOut = useAppStore((st) => st.signOut);
  if (!v.menuOpen) return null;
  const menuTabs = v.tabs.filter((t) => !HIDDEN_IN_MENU.has(t.id));
  return (
    <div className="menu-overlay" onClick={v.closeMenu}>
      <div className="menu-panel" onClick={(e) => e.stopPropagation()}>
        <div className="menu-panel-title">メニュー</div>
        <div>
          {menuTabs.map((t) => (
            <div key={t.id} className="menu-item" style={{ color: t.active ? 'var(--fg)' : 'var(--muted)' }} onClick={t.go}>
              {t.label}
            </div>
          ))}
        </div>
        <div className="menu-panel-title" style={{ marginTop: '20px' }}>設定</div>
        <div>
          <div className="menu-item" style={{ color: v.isGoalSettings ? 'var(--fg)' : 'var(--muted)' }} onClick={v.goGoalSettings}>目標の設定</div>
          <div className="menu-item" style={{ color: v.isSalarySettings ? 'var(--fg)' : 'var(--muted)' }} onClick={v.goSalarySettings}>給与・賞与の設定</div>
        </div>
        <div className="menu-item" style={{ color: 'var(--muted)' }} onClick={signOut}>ログアウト</div>
      </div>
    </div>
  );
}
