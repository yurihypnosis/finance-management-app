import type { Computed } from '../hooks/useComputed';

export function Invest({ v }: { v: Computed }) {
  return (
    <div>
      <div className="hdr-row">
        <div className="screen-title" style={{ padding: '4px 0 2px 0' }}>投資シミュレーション</div>
        <div className="link-quiet" onClick={v.goGoalSettings}>目標を編集</div>
      </div>
      <div className="hero">
        <div className="hero-label">毎月の投資目標</div>
        <div className="hero-value" style={{ fontSize: '38px' }}>{v.invTargetFmt}<span className="hero-unit"> 円</span></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', marginTop: '16px' }}>
          <div className="row-flex"><div style={{ color: 'var(--muted)' }}>いま残せるお金</div><div style={{ fontVariantNumeric: 'tabular-nums' }}>{v.surplusFmt}円</div></div>
          <div className="row-flex"><div style={{ color: 'var(--muted)' }}>選んだ削減プラン</div><div style={{ color: 'var(--green)', fontVariantNumeric: 'tabular-nums' }}>+{v.cutsTotalFmt}円</div></div>
          <div className="row-flex" style={{ borderTop: '1px solid var(--border)', paddingTop: '10px' }}><div>あと必要な削減</div><div style={{ color: v.gapColor, fontVariantNumeric: 'tabular-nums' }}>{v.gapLabel}</div></div>
        </div>
        <div className="progress-track" style={{ marginTop: '14px' }}><div style={{ width: v.investPct, background: 'var(--green)' }} /></div>
        <div style={{ marginTop: '10px', fontSize: '12px', color: v.gapColor }}>{v.investMsg}</div>
      </div>
      <div className="section-label">削減プランを選ぶ（明細から提案）</div>
      <div className="list">
        {v.cutRows.map((c) => (
          <div key={c.id} className="check-row" onClick={c.toggle}>
            <div className="check-box" style={{ borderColor: c.on ? 'var(--green)' : 'var(--border2)', background: c.on ? 'var(--green)' : 'transparent' }}>{c.on ? '✓' : ''}</div>
            <div style={{ flex: 1 }}>
              <div className="row-top">{c.label}</div>
              <div className="row-note" style={{ marginTop: '1px' }}>{c.note}</div>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--green)', fontVariantNumeric: 'tabular-nums' }}>+{c.saveFmt}円</div>
          </div>
        ))}
      </div>
    </div>
  );
}
