import type { Computed } from '../hooks/useComputed';
import { NumberField } from '../components/common';
import { ScreenHeader } from '../components/ScreenHeader';
import { MeterBar } from '../components/charts';
import './GoalSettings.css';

export function GoalSettings({ v }: { v: Computed }) {
  return (
    <div>
      <ScreenHeader
        title="目標の設定"
        sub="ここで設定した内容が「ホーム」「支出」「投資」の表示に反映されます"
        onBack={v.goHome}
      />

      {/* 残せるお金の目標 */}
      <div className="gs-goal-card">
        <div className="gs-goal-header">
          <div className="gs-goal-label">残せるお金の目標</div>
          <div className="gs-goal-value">{v.savingsGoalFmt}<span className="gs-goal-unit">円</span></div>
        </div>
        <div className="gs-slider-row">
          <input type="range" min={0} max={500000} step={10000} value={v.savingsGoal} onChange={v.onSavingsGoal} />
          <NumberField
            className="gs-numfield"
            value={v.savingsGoal}
            onChange={v.onSavingsGoal}
            min={0}
            step={10000}
          />
        </div>
        <MeterBar ratio={v.savingsGoalRatio} height={8} />
        <div className="gs-feedback" style={{ color: v.savingsGoalColor }}>{v.savingsGoalMsg}</div>
      </div>

      {/* 支出の目標 */}
      <div className="gs-goal-card">
        <div className="gs-goal-header">
          <div className="gs-goal-label">支出の目標</div>
          <div className="gs-goal-value">{v.spendGoalFmt}<span className="gs-goal-unit">円</span></div>
        </div>
        <div className="gs-slider-row">
          <input type="range" min={100000} max={600000} step={5000} value={v.spendGoal} onChange={v.onSpendGoal} />
          <NumberField
            className="gs-numfield"
            value={v.spendGoal}
            onChange={v.onSpendGoal}
            min={0}
            step={5000}
          />
        </div>
        <MeterBar ratio={v.spendGoalRatio} height={8} />
        <div className="gs-feedback" style={{ color: v.spendGoalColor }}>{v.spendGoalMsg}</div>
      </div>

      {/* 毎月の投資目標 */}
      <div className="gs-goal-card">
        <div className="gs-goal-header">
          <div className="gs-goal-label">毎月の投資目標</div>
          <div className="gs-goal-value">{v.invTargetFmt}<span className="gs-goal-unit">円</span></div>
        </div>
        <div className="gs-slider-row">
          <input type="range" min={30000} max={200000} step={5000} value={v.invTarget} onChange={v.onInvTarget} />
          <NumberField
            className="gs-numfield"
            value={v.invTarget}
            onChange={v.onInvTarget}
            min={0}
            step={5000}
          />
        </div>
        <MeterBar ratio={Math.max(0, (v.surplus + v.cutsTotal) / Math.max(1, v.invTarget))} height={8} />
        <div className="gs-feedback" style={{ color: v.gapColor }}>{v.investMsg}</div>
      </div>
    </div>
  );
}
