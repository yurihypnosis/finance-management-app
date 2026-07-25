import type { Computed } from '../hooks/useComputed';
import { ListRow } from '../components/common';

export function SalarySettings({ v }: { v: Computed }) {
  return (
    <div>
      <div className="hdr-row">
        <div className="screen-title" style={{ padding: '4px 0 2px 0' }}>給与・賞与の設定</div>
        <div className="link-quiet" onClick={v.goSalary}>概要へ戻る</div>
      </div>
      <div className="screen-sub">ここで設定した内容が「給与」画面の表示に反映されます</div>
      <div className="hero">
        <div className="hero-label">月収（額面）</div>
        <div className="hero-value" style={{ fontSize: '38px' }}>{v.grossFmt}<span className="hero-unit"> 円</span></div>
        <input type="range" min={300000} max={1200000} step={10000} value={v.gross} onChange={v.onGross} />
        <div className="hero-sub">手取り 見込み {v.netFmt}円</div>
      </div>
      <div className="section-label">賞与（ボーナス）</div>
      <div className="list">
        {v.bonusRows.map((b) => (
          <ListRow key={b.id}>
            <div className="row-flex">
              <div className="row-top">{b.label}</div>
              <div style={{ fontSize: '13px', fontVariantNumeric: 'tabular-nums' }}>手取り {b.netFmt}円</div>
            </div>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <span className="field-label">支給月</span>
                <select className="field-select" value={String(b.month)} onChange={b.onMonth}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((mo) => <option key={mo} value={String(mo)}>{mo}月</option>)}
                </select>
              </div>
              <div style={{ flex: 2 }}>
                <span className="field-label">支給額　{b.amountFmt}円</span>
                <input type="range" min={0} max={2000000} step={10000} value={b.amount} onChange={b.onAmount} />
              </div>
            </div>
          </ListRow>
        ))}
      </div>
    </div>
  );
}
