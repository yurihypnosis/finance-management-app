import type { Computed } from '../hooks/useComputed';
import { ConfirmDelete, FormActions, ListRow, MonthSwitcher, NumberField, SegTabs, submitOnEnter } from '../components/common';
import { SYM } from '../lib/calc';

export function Budget({ v }: { v: Computed }) {
  const budgetBody = (
    <div>
      <div className="section-label" style={{ marginTop: '4px' }}>{v.viewMonthLabel}の予算実績（実績を入力・予算はタップして編集）</div>
      <div className="list">
        {v.budgetRows.map((b) => (
          <ListRow key={b.id}>
            <div className="row-flex">
              <input className="field-input" style={{ fontSize: '13px', fontWeight: 500, flex: 1, padding: 0 }} value={b.name} onChange={b.onNameChange} />
              <div style={{ fontSize: '12px', color: b.color, fontVariantNumeric: 'tabular-nums', marginLeft: '10px' }}>{b.pctLabel}</div>
            </div>
            <div className="progress-track"><div style={{ width: b.pct, background: b.color }} /></div>
            <div className="row-flex" style={{ marginTop: '2px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <NumberField className="budget-used-input" style={{ width: '68px' }} value={b.used} min={0} step={100} onChange={b.onUsedChange} />
                <span className="row-note">円 / 予算</span>
                <NumberField className="budget-used-input" style={{ width: '68px' }} value={b.cap} min={1} step={1000} onChange={b.onCapChange} />
                <span className="row-note">円</span>
              </div>
              <ConfirmDelete onConfirm={b.removeCategory} />
            </div>
          </ListRow>
        ))}
      </div>
      {v.addCategoryOpen && (
        <div style={{ padding: '16px 0', borderBottom: '1px solid var(--border)', marginBottom: '4px' }}>
          <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '14px' }}>予算カテゴリを追加</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <input className="field-input" value={v.formCategoryName} placeholder="例: 交際費" autoFocus onKeyDown={submitOnEnter(v.addCategory)} onChange={v.onFormCategoryName} />
            <div>
              <span className="field-label">目標金額（円/月）</span>
              <input className="field-input" type="number" value={v.formCategoryCap} min={0} step={1000} onKeyDown={submitOnEnter(v.addCategory)} onChange={v.onFormCategoryCap} />
            </div>
            <FormActions valid={v.formCategoryValid} errorMessage={v.formCategoryError} onSubmit={v.addCategory} onCancel={v.closeAddCategory} />
          </div>
        </div>
      )}
      <div style={{ textAlign: 'center', margin: '8px 0 0 0' }}><span className="btn-add" onClick={v.openAddCategory}>＋ カテゴリを追加</span></div>
    </div>
  );

  const lifeEventBody = (
    <div>
      <div className="row-flex">
        <div className="section-label" style={{ margin: 0 }}>ライフイベント積立</div>
        <div style={{ fontSize: '11px', color: 'var(--muted)' }}>月 {v.eventMonthlyFmt}円 確保中</div>
      </div>
      <div className="list">
        {v.eventRows.map((ev, i) => (
          <ListRow key={i}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input className="field-input" style={{ flex: 2 }} value={ev.name} onChange={ev.onName} />
              <input className="field-input" style={{ flex: 1 }} value={ev.when} placeholder="時期" onChange={ev.onWhen} />
            </div>
            <div className="progress-track"><div style={{ width: ev.pct, background: ev.barColor }} /></div>
            <div className="row-flex" style={{ marginTop: '2px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span className="row-note">積立済 {SYM[ev.currency]}</span>
                <NumberField className="budget-used-input" style={{ width: '76px' }} value={ev.savedRaw} min={0} onChange={ev.onSaved} />
                <span className="row-note">/ 目標 {SYM[ev.currency]}</span>
                <NumberField className="budget-used-input" style={{ width: '76px' }} value={ev.targetRaw} min={1} onChange={ev.onTarget} />
              </div>
              <ConfirmDelete onConfirm={ev.remove} />
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              <span className="row-note">月々の積立額 {SYM[ev.currency]}</span>
              <NumberField className="budget-used-input" style={{ width: '76px' }} value={ev.monthlyRaw} min={0} onChange={ev.onMonthly} />
            </div>
            {ev.fxNote && <div className="row-note">{ev.fxNote}</div>}
          </ListRow>
        ))}
      </div>
      <div style={{ fontSize: '12px', color: 'var(--muted2)', margin: '12px 0 20px 0' }}>外貨建ての予算は毎日の為替レートで自動円換算されます</div>
      {v.addEventOpen && (
        <div style={{ padding: '16px 0', borderBottom: '1px solid var(--border)', marginBottom: '4px' }}>
          <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '14px' }}>ライフイベントを登録</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <input className="field-input" value={v.evName} placeholder="例: ハワイ旅行" autoFocus onKeyDown={submitOnEnter(v.addEvent)} onChange={v.onEvName} />
            <input className="field-input" value={v.evWhen} placeholder="時期（例: 2027年6月）" onKeyDown={submitOnEnter(v.addEvent)} onChange={v.onEvWhen} />
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 2 }}>
                <span className="field-label">目標金額</span>
                <input className="field-input" type="number" value={v.evAmount} min={0} onKeyDown={submitOnEnter(v.addEvent)} onChange={v.onEvAmount} />
              </div>
              <div style={{ flex: 1 }}>
                <span className="field-label">通貨</span>
                <select className="field-select" value={v.evCurrency} onChange={v.onEvCurrency}>
                  <option value="JPY">JPY 円</option><option value="USD">USD ドル</option><option value="EUR">EUR ユーロ</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <span className="field-label">積立月数</span>
                <input className="field-input" type="number" value={v.evMonths} min={1} max={120} onKeyDown={submitOnEnter(v.addEvent)} onChange={v.onEvMonths} />
              </div>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{v.evMonthlyPreview}</div>
            <FormActions valid={v.formEventValid} errorMessage={v.formEventError} onSubmit={v.addEvent} onCancel={v.closeAddEvent} />
          </div>
        </div>
      )}
      <div style={{ textAlign: 'center' }}><span className="btn-add" onClick={v.openAddEvent}>＋ イベントを追加</span></div>
    </div>
  );

  return (
    <div>
      <div className="screen-title">予算とライフイベント</div>
      <MonthSwitcher {...v} />
      <SegTabs items={[
        { label: '予算', active: v.isBudgetTab, onClick: v.setBudgetTab },
        { label: 'ライフイベント', active: v.isLifeEventTab, onClick: v.setLifeEventTab },
      ]} />
      {v.isBudgetTab ? budgetBody : lifeEventBody}
    </div>
  );
}
