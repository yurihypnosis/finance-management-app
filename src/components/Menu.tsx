import { useAppStore } from '../store/appStore';
import type { Computed } from '../hooks/useComputed';

// ドロワーは navigation.md のグループ構成に従う(分析/計画/収入)。
// ホーム/支出/予算は下部タブに常設のためここには出さない。レポートは下部タブと
// ドロワーの両方から到達できてよい(navigation.md 注記)。
const MENU_GROUPS: { title: string; ids: string[] }[] = [
  { title: '分析', ids: ['report', 'annual'] },
  { title: '計画', ids: ['invest', 'habit'] },
  { title: '収入', ids: ['salary'] },
];

export function Menu({ v }: { v: Computed }) {
  const signOut = useAppStore((st) => st.signOut);
  if (!v.menuOpen) return null;
  return (
    <div className="menu-overlay" onClick={v.closeMenu}>
      <div className="menu-panel" onClick={(e) => e.stopPropagation()}>
        {MENU_GROUPS.map((group) => {
          const items = group.ids
            .map((id) => v.tabs.find((t) => t.id === id))
            .filter((t): t is NonNullable<typeof t> => !!t);
          if (items.length === 0) return null;
          return (
            <div key={group.title} style={{ marginBottom: '20px' }}>
              <div className="menu-panel-title">{group.title}</div>
              <div>
                {items.map((t) => (
                  <div key={t.id} className="menu-item" style={{ color: t.active ? 'var(--fg)' : 'var(--muted)' }} onClick={t.go}>
                    {t.label}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        <div className="menu-panel-title">設定</div>
        <div>
          <div className="menu-item" style={{ color: v.isGoalSettings ? 'var(--fg)' : 'var(--muted)' }} onClick={v.goGoalSettings}>目標の設定</div>
          <div className="menu-item" style={{ color: v.isSalarySettings ? 'var(--fg)' : 'var(--muted)' }} onClick={v.goSalarySettings}>給与・賞与の設定</div>
          <div className="menu-item" style={{ color: 'var(--muted)' }} onClick={signOut}>ログアウト</div>
        </div>
      </div>
    </div>
  );
}
