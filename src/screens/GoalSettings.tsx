import type { Computed } from '../hooks/useComputed';

function GoalSection({ label, valueFmt, unit, children, pct, barColor, msg, msgColor }: {
  label: string; valueFmt: string; unit: string; children: React.ReactNode;
  pct: string; barColor: string; msg: string; msgColor: string;
}) {
  return (
    <div style={{ marginBottom: '28px' }}>
      <div className="row-flex">
        <div className="section-label" style={{ margin: 0 }}>{label}</div>
        <div style={{ fontSize: '15px', fontVariantNumeric: 'tabular-nums' }}>{valueFmt}<span style={{ color: 'var(--muted)', fontSize: '12px' }}>{unit}</span></div>
      </div>
      {children}
      <div className="progress-track"><div style={{ width: pct, background: barColor }} /></div>
      <div style={{ fontSize: '12px', marginTop: '8px', color: msgColor }}>{msg}</div>
    </div>
  );
}

export function GoalSettings({ v }: { v: Computed }) {
  return (
    <div>
      <div className="hdr-row">
        <div className="screen-title" style={{ padding: '4px 0 2px 0' }}>目標の設定</div>
        <div className="link-quiet" onClick={v.goHome}>ホームへ戻る</div>
      </div>
      <div className="screen-sub">ここで設定した目標が、ホーム・支出・投資の各画面に反映されます</div>

      <GoalSection label="残せるお金の目標" valueFmt={v.savingsGoalFmt} unit="円" pct={v.savingsGoalPct} barColor="var(--green)" msg={v.savingsGoalMsg} msgColor={v.savingsGoalColor}>
        <input type="range" min={0} max={500000} step={10000} value={v.savingsGoal} onChange={v.onSavingsGoal} />
      </GoalSection>

      <GoalSection label="支出の目標" valueFmt={v.spendGoalFmt} unit="円" pct={v.spendGoalPct} barColor={v.spendGoalColor} msg={v.spendGoalMsg} msgColor={v.spendGoalColor}>
        <input type="range" min={100000} max={600000} step={5000} value={v.spendGoal} onChange={v.onSpendGoal} />
      </GoalSection>

      <GoalSection label="毎月の投資目標" valueFmt={v.invTargetFmt} unit="円" pct={v.investPct} barColor="var(--green)" msg={v.investMsg} msgColor={v.gapColor}>
        <input type="range" min={30000} max={200000} step={5000} value={v.invTarget} onChange={v.onInvTarget} />
      </GoalSection>
    </div>
  );
}
