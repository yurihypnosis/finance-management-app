import { useState } from 'react';
import type { Computed } from '../hooks/useComputed';
import { ConfirmDelete, FormActions, NumberField, SegTabs, submitOnEnter } from '../components/common';
import { ScreenHeader } from '../components/ScreenHeader';
import { AddAction, Badge } from '../components/parts';
import { Sheet } from '../components/Sheet';
import './Habit.css';

type HabitRow = Computed['habitRows'][number];
type SubRow = Computed['subRows'][number];

/** 習慣の閲覧行: 名前+頻度+月額+ON/OFFスイッチのみ。スイッチ以外をタップで編集シートを開く。 */
function HabitReadRow({ row, onOpen }: { row: HabitRow; onOpen: () => void }) {
  return (
    <button type="button" className={`hab-row${row.off ? ' hab-row-off' : ''}`} onClick={onOpen}>
      <div className="hab-row-main">
        <div className="hab-row-text">
          <div className="hab-row-name">{row.name}</div>
          <div className={`hab-row-note${row.off ? ' hab-row-saving' : ''}`}>
            {row.off ? '月' + row.monthFmt + '円節約中' : row.freq}
          </div>
        </div>
        <div className="hab-row-amount">{row.monthFmt}円/月</div>
        <div
          className="switch"
          style={{ background: row.off ? 'var(--border2)' : 'var(--green)' }}
          onClick={(e) => { e.stopPropagation(); row.toggle(); }}
        >
          <div className="switch-knob" style={{ left: row.off ? '2px' : '18px' }} />
        </div>
      </div>
    </button>
  );
}

/** サブスクの閲覧行: 名前+月額換算+活用度バッジ（低活用は「解約候補」も併記）。タップで編集シートを開く。 */
function SubReadRow({ row, onOpen }: { row: SubRow; onOpen: () => void }) {
  return (
    <button type="button" className="sub-row" style={row.cancelled ? { opacity: 0.55 } : undefined} onClick={onOpen}>
      <div className="sub-row-main">
        <div className="sub-row-text">
          <div className="sub-row-name">{row.name}</div>
          <div className="sub-row-badges">
            {row.cancelled
              ? <Badge label={row.cancelledPast ? '解約済み' : '今月で解約'} tone="neutral" />
              : <Badge label={row.usageLabel} tone={row.usageTone} />}
            {row.cancelCandidate && <Badge label="解約候補" tone="danger" />}
          </div>
        </div>
        <div className="sub-row-amount">{row.monthlyFmt}円/月</div>
      </div>
    </button>
  );
}

export function Habit({ v }: { v: Computed }) {
  const [editHabitId, setEditHabitId] = useState<string | null>(null);
  const [editSubId, setEditSubId] = useState<string | null>(null);

  const editHabit = v.habitRows.find((hb) => hb.id === editHabitId);
  const editSub = v.subRows.find((sub) => sub.id === editSubId);

  // 低活用（解約候補）ほど上、解約済みは最下段。表示順のみの並べ替えで計算ロジックは変えない。
  const sortedSubRows = [...v.subRows].sort((a, b) => (a.cancelled ? 1 : 0) - (b.cancelled ? 1 : 0) || a.usageRank - b.usageRank);

  const habitBody = (
    <div>
      <div className="hab-caption">明細から検出+手動登録。OFFで節約額が投資プランに反映されます</div>
      <div className="list">
        {v.habitRows.map((hb) => (
          <HabitReadRow key={hb.id} row={hb} onOpen={() => setEditHabitId(hb.id)} />
        ))}
      </div>
      <div className="row-flex hab-save-line">
        <div className="row-note">OFFにした習慣の節約額</div>
        <div className="hab-save-value">月 {v.habitSaveFmt}円</div>
      </div>
      <div className="hab-add">
        <AddAction label="＋ 習慣を追加" onClick={v.openAdd} />
      </div>
    </div>
  );

  const subBody = (
    <div>
      <div className="hab-caption">{v.subSummaryMsg}</div>
      <div className="list">
        {sortedSubRows.map((sub) => (
          <SubReadRow key={sub.id} row={sub} onOpen={() => setEditSubId(sub.id)} />
        ))}
      </div>
    </div>
  );

  return (
    <div>
      <ScreenHeader title="習慣" sub="OFFや解約で浮くお金をまとめて確認" />

      <div className="hero">
        <div className="hero-label">見直しで浮くお金</div>
        <div className="hero-value">
          {v.reliefTotalFmt}
          <span className="hero-unit">円/月</span>
        </div>
        <div className="hero-sub">OFFにした習慣の節約額＋未活用サブスクの合計</div>
      </div>

      <SegTabs items={[
        { label: '習慣', active: v.isHabitTab, onClick: v.setHabitTab },
        { label: 'サブスク ' + v.subCount + '件', active: v.isSubTab, onClick: v.setSubTab },
      ]} />
      {v.isHabitTab ? habitBody : subBody}

      {/* ---- 習慣: 編集シート ---- */}
      <Sheet open={!!editHabit} onClose={() => setEditHabitId(null)} title="習慣を編集">
        {editHabit && (
          <div className="hab-form">
            <div>
              <span className="field-label">名前</span>
              <input className="field-input" autoFocus value={editHabit.name} onChange={editHabit.onNameChange} />
            </div>
            <div>
              <span className="field-label">月にすると（円）</span>
              <NumberField className="field-input" value={editHabit.month} min={0} step={100} onChange={editHabit.onMonthChange} />
            </div>
            <div className="row-note">年にすると {editHabit.yearFmt}円</div>
            <div className="row-note">{editHabit.msg}</div>
            <div className="hab-sheet-actions">
              <div className="btn-primary" onClick={() => setEditHabitId(null)}>完了</div>
              <ConfirmDelete onConfirm={() => { editHabit.remove(); setEditHabitId(null); }} />
            </div>
          </div>
        )}
      </Sheet>

      {/* ---- 習慣: 追加シート ---- */}
      <Sheet open={v.addOpen} onClose={v.closeAdd} title="習慣を追加">
        <div className="hab-form">
          <input className="field-input" value={v.formName} placeholder="例: スタバ" autoFocus onKeyDown={submitOnEnter(v.addHabit)} onChange={v.onFormName} />
          <div className="hab-form-row">
            <div>
              <span className="field-label">週に何回</span>
              <NumberField className="field-input" value={v.formTimes} min={1} max={21} onKeyDown={submitOnEnter(v.addHabit)} onChange={v.onFormTimes} />
            </div>
            <div>
              <span className="field-label">1回あたり（円）</span>
              <NumberField className="field-input" value={v.formAmount} min={0} step={100} onKeyDown={submitOnEnter(v.addHabit)} onChange={v.onFormAmount} />
            </div>
          </div>
          <div className="row-note">月換算 {v.formMonthFmt}円 / 年換算 {v.formYearFmt}円</div>
          <FormActions valid={v.formHabitValid} errorMessage={v.formHabitError} onSubmit={v.addHabit} onCancel={v.closeAdd} />
        </div>
      </Sheet>

      {/* ---- サブスク: 編集シート（活用度4択・支払サイクル2択を大きなボタンで） ---- */}
      <Sheet open={!!editSub} onClose={() => setEditSubId(null)} title="サブスクを編集">
        {editSub && (
          <div className="hab-form">
            <div className="row-flex">
              <div className="row-top">{editSub.name}</div>
              <div className="row-value">{editSub.priceFmt}{editSub.priceUnit}</div>
            </div>
            <div>
              <span className="field-label">支払サイクル</span>
              <div className="hab-choice-grid">
                <button type="button" className={`hab-choice-btn${editSub.isMonthly ? ' hab-choice-btn-active' : ''}`} onClick={editSub.setMonthlyCycle}>月払い</button>
                <button type="button" className={`hab-choice-btn${editSub.isAnnual ? ' hab-choice-btn-active' : ''}`} onClick={editSub.setAnnualCycle}>年払い</button>
              </div>
            </div>
            <div>
              <span className="field-label">活用度</span>
              <div className="hab-choice-grid">
                <button type="button" className={`hab-choice-btn${editSub.highOn ? ' hab-choice-btn-active' : ''}`} onClick={editSub.setHigh}>よく使う</button>
                <button type="button" className={`hab-choice-btn${editSub.midOn ? ' hab-choice-btn-active' : ''}`} onClick={editSub.setMid}>たまに</button>
                <button type="button" className={`hab-choice-btn${editSub.lowOn ? ' hab-choice-btn-active' : ''}`} onClick={editSub.setLow}>ほぼ無し</button>
                <button type="button" className={`hab-choice-btn${editSub.noneOn ? ' hab-choice-btn-active' : ''}`} onClick={editSub.setNone}>未使用</button>
              </div>
            </div>
            <div>
              <span className="field-label">契約状態</span>
              <div className="hab-choice-grid">
                <button type="button" className={`hab-choice-btn${editSub.activeOn ? ' hab-choice-btn-active' : ''}`} onClick={editSub.setActive}>契約中</button>
                <button type="button" className={`hab-choice-btn${editSub.cancelledThisMonthOn ? ' hab-choice-btn-active' : ''}`} onClick={editSub.cancelThisMonth}>今月で解約</button>
                <button type="button" className={`hab-choice-btn${editSub.cancelledPastOn ? ' hab-choice-btn-active' : ''}`} onClick={editSub.cancelPast}>先月以前に解約済み</button>
              </div>
            </div>
            {editSub.cancelledNote
              ? <div className="row-note">{editSub.cancelledNote}</div>
              : <div className="hab-advice" style={{ color: editSub.adviceColor }}>{editSub.advice}</div>}
            <div className="hab-sheet-actions">
              <div className="btn-primary" onClick={() => setEditSubId(null)}>完了</div>
              {editSub.cancelled && <ConfirmDelete onConfirm={() => { editSub.remove(); setEditSubId(null); }} />}
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}
