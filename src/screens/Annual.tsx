import { useState } from 'react';
import type { Computed } from '../hooks/useComputed';
import { ListRow } from '../components/common';
import { ScreenHeader } from '../components/ScreenHeader';
import { MeterBar } from '../components/charts';
import { ColorChip } from '../components/parts';
import { Sheet } from '../components/Sheet';
import './Annual.css';

type AnnualRow = Computed['annualRows'][number];

/** 内訳1行: 色チップ + 名前 + 構成比バー + 万円要約(月/年)。タップで詳細シートを開く。 */
function AnnualBreakdownRow({ row, onOpen }: { row: AnnualRow; onOpen: () => void }) {
  return (
    <button type="button" className="ann-row" onClick={onOpen}>
      <div className="row-flex">
        <div className="ann-row-name">
          <ColorChip color={row.color} />
          <span>{row.name}</span>
        </div>
        <div className="ann-row-fig">
          <span className="row-note">{row.pctLabel}</span>
          <span className="row-value">{row.annualManFmt}</span>
        </div>
      </div>
      <MeterBar ratio={parseFloat(row.pct) / 100} color={row.color} className="ann-row-meter" ariaLabel={row.name + ' 構成比 ' + row.pctLabel} />
    </button>
  );
}

export function Annual({ v }: { v: Computed }) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [openRow, setOpenRow] = useState<AnnualRow | null>(null);

  return (
    <div>
      <ScreenHeader title="年間" sub="固定費・サブスク・習慣・流動費・ライフイベント積立から12ヶ月分を試算" />

      {/* ---- ヒーロー: 年間支出見込み（1つに統合） ---- */}
      <div className="hero">
        <div className="hero-label">年間の支出見込み</div>
        <div className="hero-value">{v.annualTotalManFmt}</div>
        <MeterBar ratio={v.annualRatio} color={v.annualGapColor} className="ann-hero-meter" ariaLabel={'年間手取りに対して ' + v.annualPct} />
        <div className="ann-hero-line" style={{ color: v.annualGapColor }}>{v.annualHeroLine}</div>
        {v.forecastReliable && (
          <div className="ann-hero-forecast">{v.annualForecastLine}</div>
        )}
        <div className="ann-hero-note">{v.annualBasedNote}</div>
      </div>

      <div className="link-quiet ann-detail-toggle" onClick={() => setDetailOpen(true)} role="button">
        計算の詳細を見る →
      </div>

      {/* ---- 内訳の視覚化: 構成比バー付きリスト（降順） ---- */}
      <div className="section-label">内訳（月額 × 12ヶ月）</div>
      <div className="list">
        {v.annualRows.map((r, i) => (
          <ListRow key={i}>
            <AnnualBreakdownRow row={r} onOpen={() => setOpenRow(r)} />
          </ListRow>
        ))}
      </div>

      {/* ---- 内訳行の詳細シート ---- */}
      <Sheet open={!!openRow} onClose={() => setOpenRow(null)} title={openRow?.name}>
        {openRow && (
          <div className="ann-row-detail">
            <div className="ann-row-detail-figures">
              <div>
                <div className="ann-figlabel">月額</div>
                <div className="ann-row-detail-value">{openRow.monthlyFmt}円</div>
              </div>
              <div>
                <div className="ann-figlabel">年額</div>
                <div className="ann-row-detail-value">{openRow.annualFmt}円</div>
              </div>
            </div>
            <div className="row-note">{openRow.note}</div>
          </div>
        )}
      </Sheet>

      {/* ---- 計算の詳細（信頼区間・ばらつき・カテゴリ別） ---- */}
      <Sheet open={detailOpen} onClose={() => setDetailOpen(false)} title="計算の詳細">
        <div className="ann-detail">
          {v.forecastReliable ? (
            <div className="ann-detail-section">
              <div className="ann-heading">年間の支出見込み（統計的な範囲）</div>
              <div className="ann-detail-range">いつもの年なら {v.forecastLowFmt}円 〜 {v.forecastHighFmt}円</div>
              <div className="row-note">
                統計的には80%信頼区間・ばらつき±{v.annualStdFmt}円（記録済み最大{v.forecastSampleMonths}ヶ月分の実績から算出）
              </div>

              {v.forecastCategoryRows.length > 0 && (
                <div className="ann-detail-catlist">
                  {v.forecastCategoryRows.map((c, i) => (
                    <div key={i} className="row-flex ann-detail-catrow">
                      <div className="row-note">{c.name}</div>
                      <div className="ann-detail-catfig">月 {c.avgFmt}円 ± {c.sdFmt}円（n={c.n}）</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="ann-detail-section">
              <div className="ann-heading">年間の支出見込み（統計的な範囲）</div>
              <div className="row-note">
                統計的な予測にはあと最低2ヶ月分の予算実績の記録が必要です（現在 {v.forecastSampleMonths}ヶ月分）。予算画面で毎月記録すると、ばらつきを考慮した予測レンジが表示されます
              </div>
            </div>
          )}

          <div className="ann-detail-section">
            <div className="ann-heading">算出の前提</div>
            <div className="row-note">{v.annualBasedNote}</div>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
