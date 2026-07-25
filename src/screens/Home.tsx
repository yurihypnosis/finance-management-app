import type { Computed } from '../hooks/useComputed';
import { ListRow, MonthSwitcher } from '../components/common';

export function Home({ v }: { v: Computed }) {
  return (
    <div>
      <div className="row-flex" style={{ padding: '4px 0 20px 0' }}>
        <div className="screen-title" style={{ padding: 0 }}>ホーム</div>
        <div className="link-quiet" onClick={v.goSalarySettings}>給与設定</div>
      </div>
      <MonthSwitcher {...v} />
      <div className="hero" style={{ paddingBottom: '4px' }}>
        <div className="hero-label">{v.viewMonthLabel} 残せるお金</div>
        <div className="hero-value">{v.surplusFmt}<span className="hero-unit"> 円</span></div>
        <div className="hero-sub">手取り {v.netFmt}円{v.monthBonusNet > 0 ? ' ＋ 賞与手取り ' + v.monthBonusNetFmt + '円' : ''}</div>
        <div className="progress-track split" style={{ marginTop: '2px' }}>
          <div style={{ width: v.homeFixedPct, background: 'var(--primary)' }} />
          <div style={{ width: v.homeVariablePct, background: 'var(--amber)' }} />
          <div style={{ flex: 1, background: 'var(--green)' }} />
        </div>
        <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: 'var(--muted2)', marginTop: '10px', flexWrap: 'wrap' }}>
          <div>{v.homeFixedLabel}</div><div>{v.homeVariableLabel}</div><div>残り</div>
        </div>
        {v.coachOn && <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '16px', lineHeight: 1.7 }}>{v.coachMsg}</div>}
        <div style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
          <div className="row-flex">
            <div style={{ fontSize: '11px', color: 'var(--muted2)', letterSpacing: '.08em' }}>残せるお金の目標</div>
            <div style={{ fontSize: '13px', fontVariantNumeric: 'tabular-nums' }}>{v.savingsGoalFmt}円</div>
          </div>
          <div className="progress-track" style={{ marginTop: '10px' }}><div style={{ width: v.savingsGoalPct, background: 'var(--green)' }} /></div>
          <div style={{ fontSize: '12px', marginTop: '8px', color: v.savingsGoalColor }}>{v.savingsGoalMsg}</div>
          <div className="link-quiet" style={{ fontSize: '11px', marginTop: '8px', display: 'inline-block' }} onClick={v.goGoalSettings}>目標を編集</div>
        </div>
      </div>

      {v.overCount > 0 && (
        <div className="alert-row" onClick={v.goBudget}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 500 }}>予算オーバーギャップ分析</div>
            <div style={{ fontSize: '11px', color: 'var(--muted2)', marginTop: '2px' }}>{v.overCount}カテゴリが超過・タップで内訳へ</div>
          </div>
          <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--red)', fontVariantNumeric: 'tabular-nums' }}>+{v.overTotalFmt}円</div>
        </div>
      )}

      <div className="section-label">超過カテゴリ（{v.viewMonthLabel}の予算実績）</div>
      {v.overRows.length > 0 ? (
        <div className="list">
          {v.overRows.map((o, i) => (
            <ListRow key={i}>
              <div className="row-flex">
                <div className="row-top">{o.name}</div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <span className="row-note">{o.ratio}</span>
                  <span style={{ fontSize: '11px', color: 'var(--red)', fontVariantNumeric: 'tabular-nums' }}>+{o.gapFmt}</span>
                </div>
              </div>
              <div className="progress-track"><div style={{ width: o.pct, background: o.barColor }} /></div>
              <div className="row-note">{o.note}</div>
            </ListRow>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: '12px', color: 'var(--muted2)', padding: '4px 0 8px 0' }}>この月は予算内に収まっています</div>
      )}

      <div className="section-label">このさき</div>
      <div style={{ display: 'flex', gap: '24px', marginTop: '4px' }}>
        <div style={{ flex: 1, cursor: 'pointer' }} onClick={v.goLifeEvents}>
          <div style={{ fontSize: '11px', color: 'var(--muted2)', letterSpacing: '.08em' }}>ライフイベント積立</div>
          <div style={{ fontSize: '20px', fontWeight: 300, marginTop: '4px', fontVariantNumeric: 'tabular-nums' }}>
            {v.eventMonthlyFmt}<span style={{ fontSize: '11px', color: 'var(--muted)' }}>円</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--muted2)', marginTop: '2px' }}>{v.eventCount}件 順調</div>
        </div>
        <div style={{ flex: 1, cursor: 'pointer' }} onClick={v.goInvest}>
          <div style={{ fontSize: '11px', color: 'var(--muted2)', letterSpacing: '.08em' }}>投資目標まで</div>
          <div style={{ fontSize: '20px', fontWeight: 300, marginTop: '4px', fontVariantNumeric: 'tabular-nums' }}>
            あと {v.investGapManFmt}<span style={{ fontSize: '11px', color: 'var(--muted)' }}>万円</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--muted2)', marginTop: '2px' }}>削減プランを見る →</div>
        </div>
      </div>
    </div>
  );
}
