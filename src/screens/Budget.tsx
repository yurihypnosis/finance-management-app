import { useState } from 'react';
import type { Computed } from '../hooks/useComputed';
import { ConfirmDelete, FormActions, MonthSwitcher, SegTabs, submitOnEnter } from '../components/common';
import { ScreenHeader } from '../components/ScreenHeader';
import { MeterBar, meterColor } from '../components/charts';
import { AddAction, Badge, ColorChip } from '../components/parts';
import { Sheet } from '../components/Sheet';
import { SYM } from '../lib/calc';
import './Budget.css';

type BudgetRow = Computed['budgetRows'][number];
type EventRow = Computed['eventRows'][number];

/** 閲覧行: カテゴリ色チップ + 名前 + 太い進捗バー + 実績/予算。タップで編集シートを開く。 */
function BudgetCategoryRow({ row, onOpen }: { row: BudgetRow; onOpen: () => void }) {
  return (
    <button type="button" className="bud-row" onClick={onOpen}>
      <div className="row-flex">
        <div className="bud-row-name">
          <ColorChip color={row.chipColor} />
          <span>{row.name}</span>
        </div>
        <div className="bud-row-pct" style={{ color: meterColor(row.ratio) }}>{row.pctLabel}</div>
      </div>
      <MeterBar ratio={row.ratio} className="bud-row-meter" ariaLabel={row.name + ' 使用率 ' + row.pctLabel} />
      <div className="row-note bud-row-fig">実績 {row.usedFmt}円 / 予算 {row.capFmt}円</div>
    </button>
  );
}

/** ライフイベント1件=1カード: 名前・時期・積立進捗バー・積立済/目標・月々の積立額。タップで編集シートを開く。 */
function EventCard({ row, onOpen }: { row: EventRow; onOpen: () => void }) {
  return (
    <button type="button" className="bud-event" onClick={onOpen}>
      <div className="row-flex">
        <div className="bud-event-name">{row.name}</div>
        <div className="bud-event-when">{row.when}</div>
      </div>
      <MeterBar ratio={row.ratio} color={row.barColor} className="bud-event-meter" ariaLabel={row.name + ' 積立進捗'} />
      <div className="row-note bud-event-fig">積立済 {row.savedFmt} / 目標 {row.targetFmt}</div>
      <div className="row-note">月 {row.monthlyFmt}積立中</div>
    </button>
  );
}

export function Budget({ v }: { v: Computed }) {
  const [editCatId, setEditCatId] = useState<string | null>(null);
  const [editEventIdx, setEditEventIdx] = useState<number | null>(null);

  const editCat = v.budgetRows.find((b) => b.id === editCatId);
  const editEvent = v.eventRows.find((ev) => ev.idx === editEventIdx);

  // 危ないカテゴリ（使用率の高いもの）を上に出す。表示順のみの並べ替えで計算ロジックは変えない。
  const sortedBudgetRows = [...v.budgetRows].sort((a, b) => b.ratio - a.ratio);

  const budgetBody = (
    <div>
      <div className="bud-summary">
        <div className="row-flex">
          <span className="bud-summary-label">{v.viewMonthLabel} 予算使用率</span>
          {v.overCount > 0 && <Badge label={'超過 ' + v.overCount + '件'} tone="danger" />}
        </div>
        <MeterBar
          ratio={v.budgetTotalRatio}
          className="bud-summary-meter"
          ariaLabel={'予算使用率 ' + Math.round(v.budgetTotalRatio * 100) + '%'}
        />
        <div className="row-note bud-summary-fig">実績 {v.budgetTotalUsedFmt}円 / 予算 {v.budgetTotalCapFmt}円</div>
      </div>

      <div className="list">
        {sortedBudgetRows.map((b) => (
          <BudgetCategoryRow key={b.id} row={b} onOpen={() => setEditCatId(b.id)} />
        ))}
      </div>

      <div className="bud-add">
        <AddAction label="＋ カテゴリを追加" onClick={v.openAddCategory} />
      </div>
    </div>
  );

  const lifeEventBody = (
    <div>
      <div className="bud-summary-line row-note">月の積立合計 {v.eventMonthlyFmt}円</div>

      <div className="bud-event-list">
        {v.eventRows.map((ev) => (
          <EventCard key={ev.idx} row={ev} onOpen={() => setEditEventIdx(ev.idx)} />
        ))}
      </div>

      <div className="bud-add">
        <AddAction label="＋ イベントを追加" onClick={v.openAddEvent} />
      </div>
    </div>
  );

  return (
    <div>
      <ScreenHeader title="予算" />
      <MonthSwitcher {...v} />
      <SegTabs items={[
        { label: '予算', active: v.isBudgetTab, onClick: v.setBudgetTab },
        { label: 'ライフイベント', active: v.isLifeEventTab, onClick: v.setLifeEventTab },
      ]} />
      {v.isBudgetTab ? budgetBody : lifeEventBody}

      {/* ---- 編集シート（閲覧と編集の分離: 行タップで開く） ---- */}
      <Sheet open={!!editCat} onClose={() => setEditCatId(null)} title="カテゴリを編集">
        {editCat && (
          <div className="bud-form">
            <div>
              <span className="field-label">今月の実績（円）</span>
              <input className="field-input" type="number" min={0} step={100} autoFocus value={editCat.used} onChange={editCat.onUsedChange} />
            </div>
            <div>
              <span className="field-label">カテゴリ名</span>
              <input className="field-input" value={editCat.name} onChange={editCat.onNameChange} />
            </div>
            <div>
              <span className="field-label">予算（円/月）</span>
              <input className="field-input" type="number" min={1} step={1000} value={editCat.cap} onChange={editCat.onCapChange} />
            </div>
            <div className="bud-sheet-actions">
              <div className="btn-primary" onClick={() => setEditCatId(null)}>完了</div>
              <ConfirmDelete onConfirm={() => { editCat.removeCategory(); setEditCatId(null); }} />
            </div>
          </div>
        )}
      </Sheet>

      <Sheet open={!!editEvent} onClose={() => setEditEventIdx(null)} title="ライフイベントを編集">
        {editEvent && (
          <div className="bud-form">
            <div>
              <span className="field-label">積立済（{SYM[editEvent.currency] || '円'}）</span>
              <input className="field-input" type="number" min={0} autoFocus value={editEvent.savedRaw} onChange={editEvent.onSaved} />
            </div>
            <div>
              <span className="field-label">目標（{SYM[editEvent.currency] || '円'}）</span>
              <input className="field-input" type="number" min={1} value={editEvent.targetRaw} onChange={editEvent.onTarget} />
            </div>
            <div>
              <span className="field-label">月々の積立額（{SYM[editEvent.currency] || '円'}）</span>
              <input className="field-input" type="number" min={0} value={editEvent.monthlyRaw} onChange={editEvent.onMonthly} />
            </div>
            <div>
              <span className="field-label">名前</span>
              <input className="field-input" value={editEvent.name} onChange={editEvent.onName} />
            </div>
            <div>
              <span className="field-label">時期{editEvent.whenMonthValue ? '' : '（未設定: ' + editEvent.when + '）'}</span>
              <input className="field-input" type="month" value={editEvent.whenMonthValue} onChange={editEvent.onWhen} />
            </div>
            {editEvent.fxNote && <div className="row-note">{editEvent.fxNote}</div>}
            <div className="bud-sheet-actions">
              <div className="btn-primary" onClick={() => setEditEventIdx(null)}>完了</div>
              <ConfirmDelete onConfirm={() => { editEvent.remove(); setEditEventIdx(null); }} />
            </div>
          </div>
        )}
      </Sheet>

      {/* ---- 追加シート ---- */}
      <Sheet open={v.addCategoryOpen} onClose={v.closeAddCategory} title="カテゴリを追加">
        <div className="bud-form">
          <input className="field-input" value={v.formCategoryName} placeholder="例: 交際費" autoFocus onKeyDown={submitOnEnter(v.addCategory)} onChange={v.onFormCategoryName} />
          <div>
            <span className="field-label">目標金額（円/月）</span>
            <input className="field-input" type="number" value={v.formCategoryCap} min={0} step={1000} onKeyDown={submitOnEnter(v.addCategory)} onChange={v.onFormCategoryCap} />
          </div>
          <FormActions valid={v.formCategoryValid} errorMessage={v.formCategoryError} onSubmit={v.addCategory} onCancel={v.closeAddCategory} />
        </div>
      </Sheet>

      <Sheet open={v.addEventOpen} onClose={v.closeAddEvent} title="イベントを追加">
        <div className="bud-form">
          <input className="field-input" value={v.evName} placeholder="例: ハワイ旅行" autoFocus onKeyDown={submitOnEnter(v.addEvent)} onChange={v.onEvName} />
          <div>
            <span className="field-label">時期（いつまでに）</span>
            <input className="field-input" type="month" value={v.evWhen} min={v.evWhenMin} onKeyDown={submitOnEnter(v.addEvent)} onChange={v.onEvWhen} />
          </div>
          <div className="bud-form-row">
            <div className="bud-form-col-2">
              <span className="field-label">目標金額</span>
              <input className="field-input" type="number" value={v.evAmount} min={0} onKeyDown={submitOnEnter(v.addEvent)} onChange={v.onEvAmount} />
            </div>
            <div className="bud-form-col-1">
              <span className="field-label">通貨</span>
              <select className="field-select" value={v.evCurrency} onChange={v.onEvCurrency}>
                <option value="JPY">JPY 円</option><option value="USD">USD ドル</option><option value="EUR">EUR ユーロ</option>
              </select>
            </div>
          </div>
          <div className="row-note">{v.evMonthlyPreview}</div>
          <FormActions valid={v.formEventValid} errorMessage={v.formEventError} onSubmit={v.addEvent} onCancel={v.closeAddEvent} />
        </div>
      </Sheet>
    </div>
  );
}
