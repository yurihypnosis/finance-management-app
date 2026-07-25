import { useAppStore } from '../store/appStore';

const STATUS_MAP: Record<string, { text: string; color: string }> = {
  idle: { text: '', color: 'var(--muted2)' },
  pending: { text: '保存中…', color: 'var(--muted)' },
  saved: { text: '保存済み', color: 'var(--green)' },
  error: { text: '保存に失敗しました', color: 'var(--red)' },
};

export function Topbar({ toggleMenu }: { toggleMenu: () => void }) {
  const syncStatus = useAppStore((st) => st.syncStatus);
  const m = STATUS_MAP[syncStatus] || STATUS_MAP.idle;
  return (
    <div id="topbar">
      <div className="topbar">
        <div className="menu-btn" onClick={toggleMenu}>
          <div className="menu-btn-line" /><div className="menu-btn-line" /><div className="menu-btn-line" />
        </div>
        <div className="topbar-title">KAKEIBO</div>
        <div className="sync-status" style={{ color: m.color }}>{m.text}</div>
      </div>
    </div>
  );
}
