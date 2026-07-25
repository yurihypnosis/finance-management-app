import { useState } from 'react';
import type { Computed } from '../hooks/useComputed';
import { ConfirmDelete, FormActions, MonthSwitcher, SegTabs, submitOnEnter } from '../components/common';
import { ScreenHeader } from '../components/ScreenHeader';
import { MeterBar } from '../components/charts';
import { AddAction, Badge, ColorChip, InfoTip } from '../components/parts';
import { Sheet } from '../components/Sheet';
import './Expense.css';

type CashRow = Computed['cashRows'][number];
type TransferRow = Computed['transferRows'][number];
type ExpenseRow = Computed['expenseFixedRows'][number];

/* 概念説明は常時表示せず (i) の中に退避する（原則1: 長い説明文は詳細階層へ）。 */
const CASH_HELP = 'カード明細に載らない現金払いの支出です。月末の着地予測と残せるお金に反映されます。';
const TRANSFER_HELP = '口座やカードからは引かれますが、資産が移動しただけで実質的な支出ではないお金です。支出として数えないため、残せるお金にそのまま反映されます。';
const RECURRING_HELP = '毎回同じ金額で発生する支出（例: 週末の駐車料金）を登録しておくと、まとめて今月分に反映できます。';

/** 内訳タブのグループ（固定費 / 流動費）。閲覧専用。 */
function BreakdownGroup({ label, totalFmt, rows }: { label: string; totalFmt: string; rows: ExpenseRow[] }) {
  return (
    <div className="exp-group">
      <div className="row-flex exp-group-head">
        <div className="exp-group-label">{label}</div>
        <div className="exp-group-total">{totalFmt}円</div>
      </div>
      {rows.length === 0 ? (
        <div className="exp-empty">カテゴリがまだありません</div>
      ) : (
        <div className="list">
          {rows.map((row) => (
            <div className="list-row" key={row.id}>
              <div className="row-flex">
                <div className="exp-cat">
                  <ColorChip color={row.color} />
                  <div className="exp-cat-text">
                    <div className="row-top">{row.name}</div>
                    <div className="row-note">{row.note}</div>
                  </div>
                </div>
                <div className="exp-row-right">
                  <div className="row-value">{row.amountFmt}円</div>
                  <div className="row-delta" style={{ color: row.deltaColor }}>{row.delta}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** セクション見出し（タイトル + 件数バッジ + (i) + 合計）。 */
function SectionHead({ title, count, help, totalLabel, totalFmt, totalPositive }: {
  title: string;
  count: number;
  help: string;
  totalLabel: string;
  totalFmt: string;
  totalPositive?: boolean;
}) {
  return (
    <div className="exp-section-head">
      <div className="exp-section-title-row">
        <span className="exp-section-title">{title}</span>
        <Badge label={count + '件'} tone="neutral" />
        <InfoTip text={help} />
      </div>
      <div className="row-flex exp-section-summary">
        <span className="exp-section-summary-label">{totalLabel}</span>
        <span className={'exp-section-summary-value' + (totalPositive ? ' is-positive' : '')}>{totalFmt}円</span>
      </div>
    </div>
  );
}

/** 閲覧行（名前・メモ・金額・日付）。タップで編集シートを開く。 */
function EntryRow({ name, note, amountFmt, dateLabel, badge, onOpen }: {
  name: string;
  note: string;
  amountFmt: string;
  dateLabel?: string;
  badge?: string;
  onOpen: () => void;
}) {
  return (
    <button type="button" className="exp-entry" onClick={onOpen}>
      <div className="exp-entry-main">
        <div className="exp-entry-name">
          {name}
          {badge && <span className="exp-entry-badge">{badge}</span>}
        </div>
        {note && <div className="row-note">{note}</div>}
      </div>
      <div className="exp-row-right">
        <div className="row-value">{amountFmt}円</div>
        {dateLabel && <div className="exp-entry-date">{dateLabel}</div>}
      </div>
    </button>
  );
}

function NisaCheck({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div className="exp-check" onClick={onToggle} role="button">
      <div className="check-box exp-check-box" data-on={on ? 'true' : 'false'}>{on ? '✓' : ''}</div>
      <div className="exp-check-label">NISA枠の利用として記録する（年間利用額の目安に反映）</div>
    </div>
  );
}

export function Expense({ v }: { v: Computed }) {
  const [editCashId, setEditCashId] = useState<string | null>(null);
  const [editTransferId, setEditTransferId] = useState<string | null>(null);
  const [recurringOpen, setRecurringOpen] = useState(false);

  const editCash: CashRow | undefined = v.cashRows.find((c) => c.id === editCashId);
  const editTransfer: TransferRow | undefined = v.transferRows.find((t) => t.id === editTransferId);

  return (
    <div>
      <ScreenHeader title="支出" sub="カード明細の実績から今月の着地を予測します" />
      <MonthSwitcher {...v} />

      <div className="hero">
        <div className="exp-hero-head">
          <span className="hero-label">{v.viewMonthLabel} 月末の着地予測</span>
          <InfoTip text={v.expenseAdjustNote} />
        </div>
        <div className="hero-value">
          {v.realSpendFmt}
          <span className="hero-unit"> 円</span>
        </div>
        <div className="hero-sub">使用済み {v.usedRealFmt}円 ・ 支出目標 {v.spendGoalFmt}円</div>

        <MeterBar
          ratio={v.spendGoalRatio}
          color={v.spendGoalColor}
          className="exp-goal-meter"
          ariaLabel={v.spendGoalMsg}
        />
        <div className="exp-goal-msg" style={{ color: v.spendGoalColor }}>{v.spendGoalMsg}</div>
      </div>

      <SegTabs items={[
        { label: '内訳', active: v.isBreakdownTab, onClick: v.setBreakdownTab },
        { label: '現金・その他', active: v.isCashOtherTab, onClick: v.setCashOtherTab },
      ]} />

      {v.isBreakdownTab ? (
        <div>
          <BreakdownGroup label="固定費" totalFmt={v.expenseFixedTotalFmt} rows={v.expenseFixedRows} />
          <BreakdownGroup label="流動費" totalFmt={v.expenseVariableTotalFmt} rows={v.expenseVariableRows} />
        </div>
      ) : (
        <div>
          <section className="exp-section">
            <SectionHead
              title="現金支出"
              count={v.cashCount}
              help={CASH_HELP}
              totalLabel="今月の合計"
              totalFmt={v.cashTotalFmt}
            />
            {v.cashRows.length > 0 && (
              <div className="list">
                {v.cashRows.map((c) => (
                  <EntryRow
                    key={c.id}
                    name={c.name}
                    note={c.note}
                    amountFmt={c.amountFmt}
                    dateLabel={c.dateLabel}
                    onOpen={() => setEditCashId(c.id)}
                  />
                ))}
              </div>
            )}
            <div className="exp-add">
              <AddAction label="＋ 現金支出を追加" onClick={v.openAddCash} />
            </div>
          </section>

          <section className="exp-section">
            <SectionHead
              title="資金移動"
              count={v.transferCount}
              help={TRANSFER_HELP}
              totalLabel="今月の合計"
              totalFmt={v.transferTotalFmt}
              totalPositive
            />
            {v.transferRows.length > 0 && (
              <div className="list">
                {v.transferRows.map((tr) => (
                  <EntryRow
                    key={tr.id}
                    name={tr.name}
                    note={tr.note}
                    amountFmt={tr.amountFmt}
                    badge={tr.taxAdvantaged ? 'NISA' : undefined}
                    onOpen={() => setEditTransferId(tr.id)}
                  />
                ))}
              </div>
            )}
            <div className="exp-add">
              <AddAction label="＋ 資金移動を追加" onClick={v.openAddTransfer} />
            </div>
          </section>

          <section className="exp-section">
            <button
              type="button"
              className="exp-collapse"
              aria-expanded={recurringOpen}
              onClick={() => setRecurringOpen((o) => !o)}
            >
              <span className="exp-section-title-row">
                <span className="exp-section-title">繰り返しパターン</span>
                <Badge label={v.cashRecurringCount + '件'} tone="neutral" />
              </span>
              <span className={'exp-collapse-caret' + (recurringOpen ? ' is-open' : '')}>›</span>
            </button>

            {recurringOpen && (
              <div className="exp-collapse-body">
                <div className="exp-collapse-help">{RECURRING_HELP}</div>
                {v.pendingRecurringCount > 0 && (
                  <div className="link-quiet exp-bulk" onClick={v.registerAllRecurring}>
                    今月分を{v.pendingRecurringCount}件まとめて登録
                  </div>
                )}
                {v.cashRecurringRows.length > 0 && (
                  <div className="list">
                    {v.cashRecurringRows.map((r) => (
                      <div className="list-row" key={r.id}>
                        <div className="row-flex">
                          <div className="exp-entry-main">
                            <div className="row-top">{r.name}</div>
                            <div className="row-note">{r.note || r.amountFmt + '円・登録するたび今月の現金支出に追加'}</div>
                          </div>
                          <div className="exp-row-right">
                            <div className="row-value">{r.amountFmt}円</div>
                            {r.addedThisMonth
                              ? <div className="exp-done">今月分 登録済み</div>
                              : <div className="link-quiet exp-register-one" onClick={r.addOne}>＋ 今月に登録</div>}
                          </div>
                        </div>
                        <div className="exp-row-actions">
                          <ConfirmDelete onConfirm={r.remove} label="パターンを削除" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="exp-add">
                  <AddAction label="＋ パターンを追加" onClick={v.openAddRecurringCash} />
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {/* ---- 編集シート（閲覧と編集の分離: 行タップで開く） ---- */}
      <Sheet open={!!editCash} onClose={() => setEditCashId(null)} title="現金支出を編集">
        {editCash && (
          <div className="exp-form">
            <div>
              <span className="field-label">内容</span>
              <input className="field-input" value={editCash.name} onChange={editCash.onName} />
            </div>
            <div>
              <span className="field-label">金額（円）</span>
              <input className="field-input" type="number" min={0} step={100} value={editCash.amount} onChange={editCash.onAmount} />
            </div>
            <div>
              <span className="field-label">日付</span>
              <input className="field-input" type="date" value={editCash.date} onChange={editCash.onDate} />
            </div>
            <div>
              <span className="field-label">メモ</span>
              <input className="field-input" value={editCash.note} placeholder="メモ（任意）" onChange={editCash.onNote} />
            </div>
            <div className="exp-sheet-actions">
              <div className="btn-primary" onClick={() => setEditCashId(null)}>完了</div>
              <ConfirmDelete onConfirm={() => { editCash.remove(); setEditCashId(null); }} />
            </div>
          </div>
        )}
      </Sheet>

      <Sheet open={!!editTransfer} onClose={() => setEditTransferId(null)} title="資金移動を編集">
        {editTransfer && (
          <div className="exp-form">
            <div>
              <span className="field-label">内容</span>
              <input className="field-input" value={editTransfer.name} onChange={editTransfer.onName} />
            </div>
            <div>
              <span className="field-label">金額（円）</span>
              <input className="field-input" type="number" min={0} step={1000} value={editTransfer.amount} onChange={editTransfer.onAmount} />
            </div>
            <div>
              <span className="field-label">メモ</span>
              <input className="field-input" value={editTransfer.note} placeholder="メモ（任意）" onChange={editTransfer.onNote} />
            </div>
            <NisaCheck on={editTransfer.taxAdvantaged} onToggle={editTransfer.toggleNisa} />
            <div className="exp-sheet-actions">
              <div className="btn-primary" onClick={() => setEditTransferId(null)}>完了</div>
              <ConfirmDelete onConfirm={() => { editTransfer.remove(); setEditTransferId(null); }} />
            </div>
          </div>
        )}
      </Sheet>

      {/* ---- 追加シート ---- */}
      <Sheet open={v.addCashOpen} onClose={v.closeAddCash} title="現金支出を追加">
        <div className="exp-form">
          <input className="field-input" value={v.formCashName} placeholder="例: 現金でのランチ" autoFocus onKeyDown={submitOnEnter(v.addCash)} onChange={v.onFormCashName} />
          <div className="exp-form-row">
            <div className="exp-form-col-2">
              <span className="field-label">金額（円）</span>
              <input className="field-input" type="number" value={v.formCashAmount} min={0} step={100} onKeyDown={submitOnEnter(v.addCash)} onChange={v.onFormCashAmount} />
            </div>
            <div className="exp-form-col-1">
              <span className="field-label">日付</span>
              <input className="field-input" type="date" value={v.formCashDate} onChange={v.onFormCashDate} />
            </div>
          </div>
          <input className="field-input" value={v.formCashNote} placeholder="メモ（任意）" onKeyDown={submitOnEnter(v.addCash)} onChange={v.onFormCashNote} />
          <FormActions valid={v.formCashValid} errorMessage={v.formCashError} onSubmit={v.addCash} onCancel={v.closeAddCash} />
        </div>
      </Sheet>

      <Sheet open={v.addTransferOpen} onClose={v.closeAddTransfer} title="資金移動を追加">
        <div className="exp-form">
          <input className="field-input" value={v.formTransferName} placeholder="例: 証券口座への入金" autoFocus onKeyDown={submitOnEnter(v.addTransfer)} onChange={v.onFormTransferName} />
          <div>
            <span className="field-label">金額（円）</span>
            <input className="field-input" type="number" value={v.formTransferAmount} min={0} step={1000} onKeyDown={submitOnEnter(v.addTransfer)} onChange={v.onFormTransferAmount} />
          </div>
          <input className="field-input" value={v.formTransferNote} placeholder="メモ（任意）" onKeyDown={submitOnEnter(v.addTransfer)} onChange={v.onFormTransferNote} />
          <NisaCheck on={v.formTransferIsNisa} onToggle={v.toggleFormTransferIsNisa} />
          <FormActions valid={v.formTransferValid} errorMessage={v.formTransferError} onSubmit={v.addTransfer} onCancel={v.closeAddTransfer} />
        </div>
      </Sheet>

      <Sheet open={v.addRecurringCashOpen} onClose={v.closeAddRecurringCash} title="パターンを追加">
        <div className="exp-form">
          <input className="field-input" value={v.formRecurringCashName} placeholder="例: 週末の駐輪場代" autoFocus onKeyDown={submitOnEnter(v.addRecurringCash)} onChange={v.onFormRecurringCashName} />
          <div>
            <span className="field-label">金額（円）</span>
            <input className="field-input" type="number" value={v.formRecurringCashAmount} min={0} step={100} onKeyDown={submitOnEnter(v.addRecurringCash)} onChange={v.onFormRecurringCashAmount} />
          </div>
          <input className="field-input" value={v.formRecurringCashNote} placeholder="メモ（任意）" onKeyDown={submitOnEnter(v.addRecurringCash)} onChange={v.onFormRecurringCashNote} />
          <FormActions valid={v.formRecurringCashValid} errorMessage={v.formRecurringCashError} onSubmit={v.addRecurringCash} onCancel={v.closeAddRecurringCash} />
        </div>
      </Sheet>
    </div>
  );
}
