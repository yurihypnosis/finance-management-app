import type { Computed } from '../hooks/useComputed';
import { ListRow } from '../components/common';

export function Annual({ v }: { v: Computed }) {
  return (
    <div>
      <div className="screen-title">年間出費シミュレーション</div>
      <div className="screen-sub">固定費・サブスク・習慣・流動費・ライフイベント積立から12ヶ月分を試算</div>
      <div className="hero">
        <div className="hero-label">年間の支出見込み</div>
        <div className="hero-value">{v.annualTotalFmt}<span className="hero-unit"> 円</span></div>
        <div className="hero-sub">年間手取り {v.annualNetFmt}円に対して</div>
        <div className="progress-track" style={{ marginTop: '14px' }}><div style={{ width: v.annualPct, background: v.annualGapColor }} /></div>
        <div style={{ marginTop: '10px', fontSize: '12px', color: v.annualGapColor }}>{v.annualGapMsg}</div>
        <div style={{ marginTop: '10px', fontSize: '11px', color: 'var(--muted2)' }}>{v.annualBasedNote}</div>
      </div>

      {v.forecastReliable ? (
        <div className="hero" style={{ marginTop: '16px' }}>
          <div className="hero-label">統計的な年間支出予想（80%信頼区間）</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
            <div className="hero-value" style={{ fontSize: '26px' }}>{v.forecastLowFmt}</div>
            <div style={{ fontSize: '13px', color: 'var(--muted2)' }}>円 〜</div>
            <div className="hero-value" style={{ fontSize: '26px' }}>{v.forecastHighFmt}</div>
            <div style={{ fontSize: '13px', color: 'var(--muted2)' }}>円</div>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--muted2)', marginTop: '8px' }}>
            中心値 {v.annualTotalFmt}円・年間の標準偏差 ±{v.annualStdFmt}円（記録済み最大{v.forecastSampleMonths}ヶ月分の実績から算出）
          </div>
          {v.forecastCategoryRows.length > 0 && (
            <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {v.forecastCategoryRows.map((c, i) => (
                <div key={i} className="row-flex" style={{ fontSize: '12px' }}>
                  <div style={{ color: 'var(--muted)' }}>{c.name}</div>
                  <div style={{ fontVariantNumeric: 'tabular-nums' }}>月 {c.avgFmt}円 ± {c.sdFmt}円（n={c.n}）</div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="hero" style={{ marginTop: '16px' }}>
          <div className="hero-label">統計的な年間支出予想（80%信頼区間）</div>
          <div style={{ fontSize: '12px', color: 'var(--muted2)', marginTop: '8px' }}>
            統計的な予測にはあと最低2ヶ月分の予算実績の記録が必要です（現在 {v.forecastSampleMonths}ヶ月分）。予算画面で毎月記録すると、ばらつきを考慮した予測レンジが表示されます
          </div>
        </div>
      )}

      <div className="section-label">内訳（月額 × 12ヶ月）</div>
      <div className="list">
        {v.annualRows.map((r, i) => (
          <ListRow key={i}>
            <div className="row-flex">
              <div className="row-top">{r.name}</div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline' }}>
                <span className="row-note">月 {r.monthlyFmt}円</span>
                <span className="row-value">年 {r.annualFmt}円</span>
              </div>
            </div>
            <div className="progress-track"><div style={{ width: r.pct, background: 'var(--primary)' }} /></div>
            <div className="row-note">{r.note}</div>
          </ListRow>
        ))}
      </div>
    </div>
  );
}
