import type { Computed } from '../hooks/useComputed';
import { MonthSwitcher } from '../components/common';
import { ScreenHeader } from '../components/ScreenHeader';
import { StackedBar, MeterBar } from '../components/charts';
import { ColorChip, StatTile } from '../components/parts';
import './Home.css';

export function Home({ v }: { v: Computed }) {
  return (
    <div>
      <ScreenHeader title="ホーム" />
      <MonthSwitcher {...v} />

      <div className="hero">
        <div className="hero-label">{v.viewMonthLabel} 残せるお金</div>
        <div className="hero-value">
          {v.surplusFmt}
          <span className="hero-unit"> 円</span>
        </div>
        <div className="hero-sub">
          手取り {v.netFmt}円{v.monthBonusNet > 0 ? ' ＋ 賞与手取り ' + v.monthBonusNetFmt + '円' : ''}
        </div>

        <StackedBar
          className="home-breakdown-bar"
          total={v.homeNet}
          segments={[
            { value: v.homeFixedMonthly, color: 'var(--primary)', label: '固定費' },
            { value: v.homeVariableMonthly, color: 'var(--amber)', label: '流動費' },
          ]}
        />
        <div className="home-breakdown-legend">
          <span><ColorChip color="var(--primary)" />固定費</span>
          <span><ColorChip color="var(--amber)" />流動費</span>
          <span><ColorChip color="var(--green)" />残り</span>
        </div>

        <div className="home-goal">
          <div className="row-flex">
            <span className="home-goal-label">残せるお金の目標</span>
            <span className="home-goal-value">{v.savingsGoalFmt}円</span>
          </div>
          <MeterBar
            ratio={v.savingsGoalRatio}
            color={v.savingsGoalColor}
            className="home-goal-meter"
            ariaLabel={v.savingsGoalMsg}
          />
          <div className="home-goal-msg" style={{ color: v.savingsGoalColor }}>{v.savingsGoalMsg}</div>
        </div>

        {v.coachOn && v.coachBad && <div className="home-coach">{v.coachMsg}</div>}
      </div>

      {v.overCount > 0 && (
        <div className="alert-row" onClick={v.goBudget} role="button">
          <div>
            <div className="home-alert-title">予算超過</div>
            <div className="home-alert-sub">{v.overCount}カテゴリが超過・タップで予算へ</div>
          </div>
          <div className="home-alert-amount">+{v.overTotalFmt}円</div>
        </div>
      )}

      <div className="section-label">このさき</div>
      <div className="home-tiles">
        <StatTile
          label="ライフイベント積立"
          value={v.eventMonthlyFmt}
          unit="円"
          sub={v.eventCount + '件 順調'}
          onClick={v.goLifeEvents}
        />
        <StatTile
          label="投資目標まで"
          value={'あと ' + v.investGapManFmt}
          unit="万円"
          sub="削減プランを見る →"
          onClick={v.goInvest}
        />
      </div>
    </div>
  );
}
