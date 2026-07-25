import type { Computed } from '../hooks/useComputed';
import { ListRow, NumberField } from '../components/common';
import { ScreenHeader } from '../components/ScreenHeader';
import './Salary.css';

const GROSS_MIN = 300000;
const GROSS_MAX = 1200000;
const BONUS_MIN = 0;
const BONUS_MAX = 2000000;

export function SalarySettings({ v }: { v: Computed }) {
  return (
    <div>
      <ScreenHeader title="給与・賞与の設定" sub="ここで設定した内容が「給与」画面の表示に反映されます" onBack={v.goSalary} />

      <div className="hero">
        <div className="hero-label">月収（額面）</div>
        <div className="hero-value">{v.grossFmt}<span className="hero-unit"> 円</span></div>
        <div className="salary-settings-slider-row">
          <input type="range" min={GROSS_MIN} max={GROSS_MAX} step={10000} value={v.gross} onChange={v.onGross} />
          <NumberField
            className="salary-settings-numfield"
            value={v.gross}
            onChange={v.onGross}
            min={0}
            step={10000}
          />
        </div>
        <div className="hero-sub">手取り 見込み {v.netFmt}円</div>
      </div>

      <div className="section-label">賞与（ボーナス）</div>
      <div className="list">
        {v.bonusRows.map((b) => (
          <ListRow key={b.id}>
            <div className="row-flex">
              <div className="row-top">{b.label}</div>
              <div className="salary-breakdown-value">手取り {b.netFmt}円</div>
            </div>
            <div className="salary-settings-bonus-fields">
              <div className="salary-settings-bonus-month">
                <span className="field-label">支給月</span>
                <select className="field-select" value={String(b.month)} onChange={b.onMonth}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((mo) => <option key={mo} value={String(mo)}>{mo}月</option>)}
                </select>
              </div>
              <div className="salary-settings-bonus-amount">
                <span className="field-label">支給額　{b.amountFmt}円</span>
                <div className="salary-settings-slider-row">
                  <input type="range" min={BONUS_MIN} max={BONUS_MAX} step={10000} value={b.amount} onChange={b.onAmount} />
                  <NumberField
                    className="salary-settings-numfield"
                    value={b.amount}
                    onChange={b.onAmount}
                    min={0}
                    step={10000}
                  />
                </div>
              </div>
            </div>
          </ListRow>
        ))}
      </div>
    </div>
  );
}
