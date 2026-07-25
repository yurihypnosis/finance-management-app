import type { Computed } from '../hooks/useComputed';
import { ListRow, MonthSwitcher } from '../components/common';

export function Report({ v }: { v: Computed }) {
  return (
    <div>
      <div className="screen-title">レポート・統計</div>
      <MonthSwitcher {...v} />
      <div className="screen-sub">記録された実績から支出の内訳・推移・統計をまとめて確認できます</div>

      <div className="section-label" style={{ marginTop: 0 }}>月別支出の推移</div>
      {v.reportTrendRows.length > 0 ? (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '90px', marginTop: '6px' }}>
          {v.reportTrendRows.map((m, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%', justifyContent: 'flex-end' }}>
              <div style={{ width: '100%', maxWidth: '28px', height: m.pct, background: m.isCurrent ? 'var(--primary)' : 'var(--border2)', borderRadius: '2px 2px 0 0' }} />
              <div style={{ fontSize: '10px', color: m.isCurrent ? 'var(--fg)' : 'var(--muted2)' }}>{m.label}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: '12px', color: 'var(--muted2)', padding: '8px 0' }}>まだ記録された月がありません。予算画面や現金支出で記録すると推移が表示されます</div>
      )}

      <div className="section-label">{v.viewMonthLabel}の内訳（ランキング）</div>
      {v.breakdownRows.length > 0 ? (
        <div className="list">
          {v.breakdownRows.map((b, i) => (
            <ListRow key={i}>
              <div className="row-flex">
                <div className="row-top">#{b.rank} {b.name}</div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'baseline' }}>
                  <span className="row-note">{b.pctLabel}</span>
                  <span className="row-value">{b.usedFmt}円</span>
                </div>
              </div>
              <div className="progress-track"><div style={{ width: b.pct, background: 'var(--primary)' }} /></div>
            </ListRow>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: '12px', color: 'var(--muted2)', padding: '8px 0' }}>この月はまだ支出の記録がありません</div>
      )}

      {v.momAvailable ? (
        <div className="hero" style={{ marginTop: '16px' }}>
          <div className="hero-label">前月比（{v.prevMonthLabel} →）</div>
          <div className="hero-value" style={{ fontSize: '30px', color: v.momColor }}>{v.momDiffFmt}</div>
          {v.momPct !== null && <div style={{ fontSize: '11px', color: 'var(--muted2)', marginTop: '6px' }}>{v.momPct >= 0 ? '+' : ''}{v.momPct}%</div>}
          {v.momCategoryRows.length > 0 && (
            <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {v.momCategoryRows.map((r, i) => (
                <div key={i} className="row-flex" style={{ fontSize: '12px' }}>
                  <div style={{ color: 'var(--muted)' }}>{r.name}</div>
                  <div style={{ color: r.color, fontVariantNumeric: 'tabular-nums' }}>{r.diffFmt}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="hero" style={{ marginTop: '16px' }}>
          <div className="hero-label">前月比</div>
          <div style={{ fontSize: '12px', color: 'var(--muted2)', marginTop: '8px' }}>{v.prevMonthLabel}の記録がまだないため比較できません</div>
        </div>
      )}

      <div className="section-label">カテゴリ別統計（記録済み実績から算出）</div>
      {v.statsRows.length > 0 ? (
        <div className="list">
          {v.statsRows.map((c, i) => (
            <ListRow key={i}>
              <div className="row-flex">
                <div className="row-top">{c.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--muted2)' }}>n={c.n}ヶ月</div>
              </div>
              <div style={{ display: 'flex', gap: '20px', fontSize: '12px' }}>
                <div><div style={{ color: 'var(--muted2)', fontSize: '10px' }}>平均</div><div style={{ fontVariantNumeric: 'tabular-nums' }}>{c.avgFmt}円</div></div>
                <div><div style={{ color: 'var(--muted2)', fontSize: '10px' }}>最小</div><div style={{ fontVariantNumeric: 'tabular-nums' }}>{c.minFmt}円</div></div>
                <div><div style={{ color: 'var(--muted2)', fontSize: '10px' }}>最大</div><div style={{ fontVariantNumeric: 'tabular-nums' }}>{c.maxFmt}円</div></div>
                <div><div style={{ color: 'var(--muted2)', fontSize: '10px' }}>標準偏差</div><div style={{ fontVariantNumeric: 'tabular-nums' }}>±{c.sdFmt}</div></div>
              </div>
              {c.diffFmt !== null && <div style={{ fontSize: '11px', color: c.diffColor }}>今月は平均より {c.diffFmt}</div>}
            </ListRow>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: '12px', color: 'var(--muted2)', padding: '8px 0' }}>統計を出すには予算画面で複数ヶ月の実績を記録してください</div>
      )}

      {v.forecastReliable && (
        <div style={{ marginTop: '16px', fontSize: '12px', color: 'var(--muted)', borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
          統計的な年間支出予想（80%信頼区間）： <span style={{ color: 'var(--fg)' }}>{v.forecastLowFmt}円 〜 {v.forecastHighFmt}円</span>
          <div style={{ fontSize: '11px', color: 'var(--muted2)', marginTop: '4px' }}>詳細は「年間」タブを参照</div>
        </div>
      )}

      {v.cashStatsAvailable && v.cashStats && (
        <div style={{ marginTop: '24px' }}>
          <div className="section-label" style={{ marginTop: 0 }}>現金支出の統計（月あたり・n={v.cashStats.n}ヶ月）</div>
          <div style={{ display: 'flex', gap: '20px', fontSize: '12px' }}>
            <div><div style={{ color: 'var(--muted2)', fontSize: '10px' }}>平均</div><div style={{ fontVariantNumeric: 'tabular-nums' }}>{v.cashStats.avgFmt}円</div></div>
            <div><div style={{ color: 'var(--muted2)', fontSize: '10px' }}>最小</div><div style={{ fontVariantNumeric: 'tabular-nums' }}>{v.cashStats.minFmt}円</div></div>
            <div><div style={{ color: 'var(--muted2)', fontSize: '10px' }}>最大</div><div style={{ fontVariantNumeric: 'tabular-nums' }}>{v.cashStats.maxFmt}円</div></div>
            <div><div style={{ color: 'var(--muted2)', fontSize: '10px' }}>標準偏差</div><div style={{ fontVariantNumeric: 'tabular-nums' }}>±{v.cashStats.sdFmt}</div></div>
          </div>
        </div>
      )}
    </div>
  );
}
