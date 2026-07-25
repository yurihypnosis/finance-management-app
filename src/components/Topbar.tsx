import { useAppStore } from '../store/appStore';

const STATUS_MAP: Record<string, { text: string; color: string; dot: string; pulse?: boolean }> = {
  idle: { text: '', color: 'var(--muted2)', dot: 'transparent' },
  pending: { text: '保存中…', color: 'var(--muted)', dot: 'var(--muted)', pulse: true },
  saved: { text: '保存済み', color: 'var(--green)', dot: 'var(--green)' },
  error: { text: '保存に失敗しました', color: 'var(--red)', dot: 'var(--red)' },
};

export function Topbar() {
  const syncStatus = useAppStore((st) => st.syncStatus);
  const m = STATUS_MAP[syncStatus] || STATUS_MAP.idle;
  return (
    <div id="topbar">
      <div className="topbar">
        <div className="topbar-title">KAKEIBO</div>
        {syncStatus !== 'idle' && (
          <div className="sync-status" style={{ color: m.color }}>
            <span className="sync-dot" style={{ background: m.dot, animation: m.pulse ? 'sync-pulse 1s ease-in-out infinite' : 'none' }} />
            {m.text}
          </div>
        )}
      </div>
    </div>
  );
}
