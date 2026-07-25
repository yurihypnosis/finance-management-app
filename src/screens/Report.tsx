import { useState } from 'react';
import type { Computed } from '../hooks/useComputed';
import { ListRow, MonthSwitcher } from '../components/common';
import { ScreenHeader } from '../components/ScreenHeader';
import { BarChart, Donut } from '../components/charts';
import { ColorChip } from '../components/parts';
import { Sheet } from '../components/Sheet';
import { fmt } from '../lib/calc';
import './Report.css';

/** 内訳ランキングを上位N件+「その他」に集約する(ドーナツ・リストの両方に使う)。呼び出し側の責務。 */
const BREAKDOWN_TOP_N = 5;
function summarizeBreakdown(rows: Computed['breakdownRows'], total: number) {
  if (rows.length <= BREAKDOWN_TOP_N) return rows;
  const top = rows.slice(0, BREAKDOWN_TOP_N);
  const restUsed = rows.slice(BREAKDOWN_TOP_N).reduce((a, b) => a + b.used, 0);
  if (restUsed <= 0) return top;
  return top.concat([{
    rank: BREAKDOWN_TOP_N + 1,
    name: 'その他',
    used: restUsed,
    usedFmt: fmt(restUsed),
    color: 'var(--muted)',
    pctLabel: total > 0 ? Math.round((restUsed / total) * 100) + '%' : '0%',
    pct: total > 0 ? Math.max(1, (restUsed / total) * 100) + '%' : '1%',
  }]);
}

export function Report({ v }: { v: Computed }) {
  const [momSheetOpen, setMomSheetOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  const momTop = v.momCategoryRows.slice(0, 3);
  const momRest = v.momCategoryRows.slice(3);
  const breakdownDisplay = summarizeBreakdown(v.breakdownRows, v.breakdownTotal);
  const hasDetail = v.statsRows.length > 0 || v.forecastReliable || (v.cashStatsAvailable && !!v.cashStats);

  return (
    <div>
      <ScreenHeader title="レポート" />
      <MonthSwitcher {...v} />

      {/* ---- ヒーロー: 前月比 ---- */}
      {v.momAvailable ? (
        <div className="hero rep-hero">
          <div className="hero-label">前月比（{v.prevMonthLabel} →）</div>
          <div className="hero-value" style={{ color: v.momColor }}>{v.momDiffFmt}</div>
          {v.momPct !== null && (
            <div className="rep-hero-pct">{v.momPct >= 0 ? '+' : ''}{v.momPct}%</div>
          )}

          {momTop.length > 0 && (
            <div className="rep-mom-list">
              {momTop.map((r, i) => (
                <div key={i} className="row-flex rep-mom-row">
                  <div className="rep-mom-name">{r.name}</div>
                  <div className="rep-mom-diff" style={{ color: r.color }}>{r.diffFmt}</div>
                </div>
              ))}
            </div>
          )}
          {momRest.length > 0 && (
            <div className="link-quiet rep-mom-more" onClick={() => setMomSheetOpen(true)} role="button">
              すべて見る
            </div>
          )}
        </div>
      ) : (
        <div className="hero rep-hero">
          <div className="hero-label">前月比</div>
          <div className="rep-empty">{v.prevMonthLabel}の記録がまだないため比較できません</div>
        </div>
      )}

      {/* ---- 推移グラフの主役化 ---- */}
      <div className="section-label">月別支出の推移</div>
      {v.reportTrendRows.length > 0 ? (
        <BarChart
          className="rep-trend-chart"
          height={180}
          data={v.reportTrendRows.map((m) => ({ label: m.label, value: m.total, highlight: m.isCurrent }))}
          onSelect={(i) => v.selectReportMonth(v.reportTrendRows[i].mk)}
          ariaLabel="月別支出の推移"
        />
      ) : (
        <div className="rep-empty">まだ記録された月がありません。予算画面や現金支出で記録すると推移が表示されます</div>
      )}

      {/* ---- 内訳の視覚化 ---- */}
      <div className="section-label">{v.viewMonthLabel}の内訳</div>
      {breakdownDisplay.length > 0 ? (
        <div className="rep-breakdown">
          <Donut
            segments={breakdownDisplay.map((b) => ({ label: b.name, value: b.used, color: b.color }))}
            center={
              <div className="rep-donut-center">
                <div className="rep-donut-total">{v.breakdownTotalFmt}</div>
                <div className="rep-donut-caption">円</div>
              </div>
            }
          />
          <div className="rep-breakdown-list">
            {breakdownDisplay.map((b, i) => (
              <div key={i} className="row-flex rep-breakdown-row">
                <div className="rep-breakdown-name">
                  <ColorChip color={b.color} />
                  <span>{b.name}</span>
                </div>
                <div className="rep-breakdown-fig">
                  <span className="row-note">{b.pctLabel}</span>
                  <span className="row-value">{b.usedFmt}円</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rep-empty">この月はまだ支出の記録がありません</div>
      )}

      {/* ---- 統計の平易化: 初期表示は1行インサイトのみ ---- */}
      <div className="section-label">気になる動き</div>
      {v.statsInsightRows.length > 0 ? (
        <div className="list">
          {v.statsInsightRows.map((c, i) => (
            <ListRow key={i}>
              <div className="rep-insight-row">
                <span>{c.name}はいつもより</span>
                <span style={{ color: c.diffColor }}>{c.diffFmt}</span>
              </div>
            </ListRow>
          ))}
        </div>
      ) : (
        <div className="rep-empty">統計を出すには予算画面で複数ヶ月の実績を記録してください</div>
      )}

      {hasDetail && (
        <div className="link-quiet rep-detail-toggle" onClick={() => setDetailOpen(true)} role="button">
          詳しい統計を見る →
        </div>
      )}

      {/* ---- 前月比カテゴリ別増減（すべて） ---- */}
      <Sheet open={momSheetOpen} onClose={() => setMomSheetOpen(false)} title="カテゴリ別の増減（すべて）">
        <div className="rep-mom-list">
          {v.momCategoryRows.map((r, i) => (
            <div key={i} className="row-flex rep-mom-row">
              <div className="rep-mom-name">{r.name}</div>
              <div className="rep-mom-diff" style={{ color: r.color }}>{r.diffFmt}</div>
            </div>
          ))}
        </div>
      </Sheet>

      {/* ---- 詳しい統計（平均/最小/最大/ばらつき・年間見込み・現金統計） ---- */}
      <Sheet open={detailOpen} onClose={() => setDetailOpen(false)} title="詳しい統計">
        <div className="rep-detail">
          {v.statsRows.length > 0 && (
            <div className="rep-detail-section">
              <div className="rep-detail-heading">カテゴリ別の平均・ばらつき</div>
              <div className="list">
                {v.statsRows.map((c, i) => (
                  <ListRow key={i}>
                    <div className="row-flex">
                      <div className="row-top">{c.name}</div>
                      <div className="rep-stat-n">記録{c.n}ヶ月分</div>
                    </div>
                    <div className="rep-stat-figures">
                      <div><div className="rep-stat-figlabel">平均</div><div className="rep-stat-figvalue">{c.avgFmt}円</div></div>
                      <div><div className="rep-stat-figlabel">最小</div><div className="rep-stat-figvalue">{c.minFmt}円</div></div>
                      <div><div className="rep-stat-figlabel">最大</div><div className="rep-stat-figvalue">{c.maxFmt}円</div></div>
                      <div><div className="rep-stat-figlabel">ばらつき</div><div className="rep-stat-figvalue">±{c.sdFmt}円</div></div>
                    </div>
                    {c.diffFmt !== null && (
                      <div className="row-note" style={{ color: c.diffColor }}>今月は平均より {c.diffFmt}</div>
                    )}
                  </ListRow>
                ))}
              </div>
            </div>
          )}

          {v.forecastReliable && (
            <div className="rep-detail-section">
              <div className="rep-detail-heading">年間の支出見込み</div>
              <div className="rep-forecast-range">いつもの年なら {v.forecastLowFmt}円 〜 {v.forecastHighFmt}円</div>
              <div className="row-note">
                統計的には80%信頼区間・ばらつき±{v.annualStdFmt}円（記録済み最大{v.forecastSampleMonths}ヶ月分の実績から算出）
              </div>
              <div className="row-note">詳細は「年間」タブを参照</div>
            </div>
          )}

          {v.cashStatsAvailable && v.cashStats && (
            <div className="rep-detail-section">
              <div className="rep-detail-heading">現金支出の統計（月あたり・記録{v.cashStats.n}ヶ月分）</div>
              <div className="rep-stat-figures">
                <div><div className="rep-stat-figlabel">平均</div><div className="rep-stat-figvalue">{v.cashStats.avgFmt}円</div></div>
                <div><div className="rep-stat-figlabel">最小</div><div className="rep-stat-figvalue">{v.cashStats.minFmt}円</div></div>
                <div><div className="rep-stat-figlabel">最大</div><div className="rep-stat-figvalue">{v.cashStats.maxFmt}円</div></div>
                <div><div className="rep-stat-figlabel">ばらつき</div><div className="rep-stat-figvalue">±{v.cashStats.sdFmt}円</div></div>
              </div>
            </div>
          )}
        </div>
      </Sheet>
    </div>
  );
}
