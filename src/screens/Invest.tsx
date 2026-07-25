import type { Computed } from '../hooks/useComputed';
import { ScreenHeader } from '../components/ScreenHeader';
import { StackedBar } from '../components/charts';
import { ColorChip } from '../components/parts';
import './Invest.css';

export function Invest({ v }: { v: Computed }) {
  const achieved = v.investGap <= 0;
  // 節約額の大きい順。表示順のみの並べ替えで計算ロジックは変えない。
  const sortedCutRows = [...v.cutRows].sort((a, b) => b.save - a.save);

  return (
    <div>
      <ScreenHeader title="投資" action={{ label: '目標を編集', onClick: v.goGoalSettings }} />

      <div className="hero">
        <div className="hero-label">毎月の投資目標</div>
        <div className="hero-value">
          {v.invTargetFmt}
          <span className="hero-unit"> 円</span>
        </div>

        <StackedBar
          className="ivt-bar"
          height={12}
          total={v.invTarget}
          segments={[
            { value: v.surplus, color: 'var(--color-accent)', label: 'いま残せるお金' },
            { value: v.cutsTotal, color: 'var(--color-positive)', label: '選んだ削減プラン' },
          ]}
        />
        <div className="ivt-legend">
          <span><ColorChip color="var(--color-accent)" />残せるお金</span>
          <span><ColorChip color="var(--color-positive)" />削減プラン</span>
          <span><ColorChip color="var(--border2)" />残り</span>
        </div>

        <div className="ivt-gap" style={{ color: v.gapColor }}>
          {achieved ? '目標を達成しています' : 'あと ' + v.gapLabel}
        </div>

        <div className="ivt-rows">
          <div className="row-flex"><div className="ivt-row-label">いま残せるお金</div><div className="chart-num">{v.surplusFmt}円</div></div>
          <div className="row-flex"><div className="ivt-row-label">選んだ削減プラン</div><div className="ivt-row-plus chart-num">+{v.cutsTotalFmt}円</div></div>
          <div className="row-flex ivt-row-total"><div>あと必要な削減</div><div className="chart-num" style={{ color: v.gapColor }}>{v.gapLabel}</div></div>
        </div>
      </div>

      <div className="section-label">削減プランを選ぶ（明細から提案）</div>
      {!achieved && (
        <div className="ivt-hint">あと{v.gapLabel}分選ぶと達成</div>
      )}
      <div className="list">
        {sortedCutRows.map((c) => (
          <div key={c.id} className="check-row ivt-check-row" onClick={c.toggle}>
            <div className={`check-box ivt-check-box${c.on ? ' ivt-check-box-on' : ''}`}>{c.on ? '✓' : ''}</div>
            <div className="ivt-row-text">
              <div className="row-top">{c.label}</div>
              <div className="row-note">{c.note}</div>
            </div>
            <div className="ivt-row-save chart-num">+{c.saveFmt}円</div>
          </div>
        ))}
      </div>
    </div>
  );
}
