import type { Computed } from '../hooks/useComputed';
import { ConfirmDelete, FormActions, ListRow, NumberField, SegTabs, submitOnEnter } from '../components/common';

export function Habit({ v }: { v: Computed }) {
  let body;
  if (v.isSubTab) {
    body = (
      <div>
        <div style={{ fontSize: '12px', color: 'var(--muted2)', marginBottom: '4px' }}>サブスク・固定サービスの活用度を設定すると、削減プランに反映されます</div>
        <div className="list">
          {v.subRows.map((sub) => {
            function pill(label: string, on: boolean, onClick: () => void) {
              return <div key={label} className="usage-pill" style={{ color: on ? sub.adviceColor : 'var(--muted2)', borderBottomColor: on ? sub.adviceColor : 'transparent' }} onClick={onClick}>{label}</div>;
            }
            function cyclePill(label: string, on: boolean, onClick: () => void) {
              return <div key={label} className="usage-pill" style={{ color: on ? 'var(--primary2)' : 'var(--muted2)', borderBottomColor: on ? 'var(--primary2)' : 'transparent' }} onClick={onClick}>{label}</div>;
            }
            return (
              <ListRow key={sub.id}>
                <div className="row-flex">
                  <div className="row-top">{sub.name}</div>
                  <div className="row-value">{sub.priceFmt}<span style={{ fontSize: '11px', color: 'var(--muted)' }}>{sub.priceUnit}</span></div>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {cyclePill('月払い', sub.isMonthly, sub.setMonthlyCycle)}
                  {cyclePill('年払い', sub.isAnnual, sub.setAnnualCycle)}
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {pill('よく使う', sub.highOn, sub.setHigh)}
                  {pill('たまに', sub.midOn, sub.setMid)}
                  {pill('ほぼ無し', sub.lowOn, sub.setLow)}
                  {pill('未使用', sub.noneOn, sub.setNone)}
                </div>
                <div style={{ fontSize: '12px', color: sub.adviceColor }}>{sub.advice}</div>
              </ListRow>
            );
          })}
        </div>
        <div className="hero" style={{ marginTop: '8px' }}>
          <div className="hero-label">未活用サービスの合計</div>
          <div className="hero-value" style={{ fontSize: '32px', color: 'var(--red)' }}>{v.lowSubTotalFmt}<span className="hero-unit">円/月</span></div>
          <div className="hero-sub">{v.subSummaryMsg}</div>
        </div>
      </div>
    );
  } else {
    body = (
      <div>
        {v.addOpen && (
          <div style={{ padding: '16px 0', borderBottom: '1px solid var(--border)', marginBottom: '4px' }}>
            <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '14px' }}>習慣を登録</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <input className="field-input" value={v.formName} placeholder="例: スタバ" autoFocus onKeyDown={submitOnEnter(v.addHabit)} onChange={v.onFormName} />
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <span className="field-label">週に何回</span>
                  <input className="field-input" type="number" value={v.formTimes} min={1} max={21} onKeyDown={submitOnEnter(v.addHabit)} onChange={v.onFormTimes} />
                </div>
                <div style={{ flex: 1 }}>
                  <span className="field-label">1回あたり（円）</span>
                  <input className="field-input" type="number" value={v.formAmount} min={0} step={100} onKeyDown={submitOnEnter(v.addHabit)} onChange={v.onFormAmount} />
                </div>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--muted)' }}>月換算 <span style={{ color: 'var(--fg)' }}>{v.formMonthFmt}円</span> / 年換算 <span style={{ color: 'var(--amber)' }}>{v.formYearFmt}円</span></div>
              <FormActions valid={v.formHabitValid} errorMessage={v.formHabitError} onSubmit={v.addHabit} onCancel={v.closeAdd} />
            </div>
          </div>
        )}
        <div className="list">
          {v.habitRows.map((hb) => (
            <ListRow key={hb.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <input className="field-input" style={{ fontSize: '13px', fontWeight: 500, padding: 0 }} value={hb.name} onChange={hb.onNameChange} />
                  <div className="row-note" style={{ marginTop: '2px' }}>{hb.freq}</div>
                </div>
                <div className="switch" style={{ background: hb.off ? 'var(--border2)' : 'var(--green)' }} onClick={hb.toggle}>
                  <div className="switch-knob" style={{ left: hb.off ? '2px' : '18px' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '24px', alignItems: 'baseline' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--muted2)' }}>月にすると</div>
                  <NumberField className="budget-used-input" style={{ width: '80px', marginTop: '2px' }} value={hb.month} min={0} step={100} onChange={hb.onMonthChange} />
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--muted2)' }}>年にすると</div>
                  <div style={{ fontSize: '15px', fontWeight: 400, marginTop: '2px', fontVariantNumeric: 'tabular-nums', color: 'var(--amber)' }}>{hb.yearFmt}円</div>
                </div>
              </div>
              <div className="row-flex">
                <div style={{ fontSize: '12px', color: hb.off ? 'var(--green)' : 'var(--muted2)' }}>{hb.msg}</div>
                <ConfirmDelete onConfirm={hb.remove} />
              </div>
            </ListRow>
          ))}
        </div>
        <div className="row-flex" style={{ padding: '16px 0' }}>
          <div style={{ fontSize: '12px', color: 'var(--muted)' }}>OFFにした習慣の節約額</div>
          <div style={{ fontSize: '16px', fontWeight: 400, color: 'var(--green)', fontVariantNumeric: 'tabular-nums' }}>月 {v.habitSaveFmt}円</div>
        </div>
        <div style={{ textAlign: 'center', marginTop: '4px' }}>
          <span className="btn-add" onClick={v.openAdd}>＋ 習慣を登録</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="screen-title">習慣トラッキング</div>
      <div className="screen-sub">明細から検出+手動登録。OFFで節約額が投資プランに反映</div>
      <SegTabs items={[
        { label: '習慣', active: v.isHabitTab, onClick: v.setHabitTab },
        { label: '固定費見直し ' + v.subCount + '件', active: v.isSubTab, onClick: v.setSubTab },
      ]} />
      {body}
    </div>
  );
}
