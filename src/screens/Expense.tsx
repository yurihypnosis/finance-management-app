import type { Computed } from '../hooks/useComputed';
import { ConfirmDelete, ListRow, MonthSwitcher, NumberField, SegTabs } from '../components/common';

export function Expense({ v }: { v: Computed }) {
  const noteParts: string[] = [];
  if (v.transferTotalFmt !== '0') noteParts.push('資金移動 -' + v.transferTotalFmt + '円を除く');
  if (v.cashTotalFmt !== '0') noteParts.push('現金支出 +' + v.cashTotalFmt + '円を追加');
  const transferNote = noteParts.length > 0 ? noteParts.join(' ・ ') + '（カード請求額 ' + v.rawSpendFmt + '円）' : null;

  let body;
  if (v.transferTab.active) {
    body = (
      <div>
        <div style={{ fontSize: '12px', color: 'var(--muted2)', marginBottom: '4px' }}>
          口座やカードからは引かれるが、資産が移動しただけで実質的な支出ではないお金を記録します。残せるお金の計算には含めません
        </div>
        <div className="list">
          {v.transferRows.map((tr) => (
            <ListRow key={tr.id}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input className="field-input" style={{ fontSize: '13px', fontWeight: 500, padding: 0 }} value={tr.name} onChange={tr.onName} />
                    {tr.taxAdvantaged && <span style={{ fontSize: '10px', color: 'var(--green)', flexShrink: 0 }}>NISA</span>}
                  </div>
                  <input className="field-input" style={{ fontSize: '11px', color: 'var(--muted2)', padding: '4px 0 0 0', border: 'none' }} value={tr.note} placeholder="メモ" onChange={tr.onNote} />
                </div>
                <div style={{ textAlign: 'right' }}>
                  <NumberField className="budget-used-input" style={{ width: '90px', textAlign: 'right' }} value={tr.amount} min={0} step={100} onChange={tr.onAmount} />
                  <ConfirmDelete onConfirm={tr.remove} style={{ marginTop: '4px' }} />
                </div>
              </div>
            </ListRow>
          ))}
        </div>
        <div className="hero" style={{ marginTop: '8px' }}>
          <div className="hero-label">資金移動の合計</div>
          <div className="hero-value" style={{ fontSize: '32px', color: 'var(--green)' }}>{v.transferTotalFmt}<span className="hero-unit">円</span></div>
          <div className="hero-sub">この金額は支出として数えず、残せるお金にそのまま反映されます</div>
        </div>
        {v.addTransferOpen && (
          <div style={{ padding: '16px 0', borderBottom: '1px solid var(--border)', marginBottom: '4px' }}>
            <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '14px' }}>資金移動を登録</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <input className="field-input" value={v.formTransferName} placeholder="例: 証券口座への入金" onChange={v.onFormTransferName} />
              <input className="field-input" value={v.formTransferNote} placeholder="メモ（任意）" onChange={v.onFormTransferNote} />
              <div>
                <span className="field-label">金額（円）</span>
                <input className="field-input" type="number" value={v.formTransferAmount} min={0} step={1000} onChange={v.onFormTransferAmount} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={v.toggleFormTransferIsNisa}>
                <div className="check-box" style={{ borderColor: v.formTransferIsNisa ? 'var(--green)' : 'var(--border2)', background: v.formTransferIsNisa ? 'var(--green)' : 'transparent' }}>{v.formTransferIsNisa ? '✓' : ''}</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>NISA枠の利用として記録する（年間利用額の目安に反映）</div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div className="btn-primary" onClick={v.addTransfer}>登録する</div>
                <div className="btn-cancel" onClick={v.closeAddTransfer}>やめる</div>
              </div>
            </div>
          </div>
        )}
        <div style={{ textAlign: 'center' }}><span className="btn-add" onClick={v.openAddTransfer}>＋ 資金移動を登録</span></div>
      </div>
    );
  } else if (v.cashTab.active) {
    body = (
      <div>
        <div style={{ fontSize: '12px', color: 'var(--muted2)', marginBottom: '4px' }}>
          カード明細に載らない現金払いの支出を記録します。月末の着地予測・残せるお金に反映されます
        </div>
        <div className="list">
          {v.cashRows.map((c) => (
            <ListRow key={c.id}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <input className="field-input" style={{ fontSize: '13px', fontWeight: 500, padding: 0 }} value={c.name} onChange={c.onName} />
                  <input className="field-input" style={{ fontSize: '11px', color: 'var(--muted2)', padding: '4px 0 0 0', border: 'none' }} value={c.note} placeholder="メモ" onChange={c.onNote} />
                </div>
                <div style={{ textAlign: 'right' }}>
                  <NumberField className="budget-used-input" style={{ width: '90px', textAlign: 'right' }} value={c.amount} min={0} step={100} onChange={c.onAmount} />
                  <input className="field-input" style={{ fontSize: '11px', marginTop: '4px', padding: 0, textAlign: 'right', border: 'none' }} type="date" value={c.date} onChange={c.onDate} />
                  <ConfirmDelete onConfirm={c.remove} style={{ marginTop: '4px' }} />
                </div>
              </div>
            </ListRow>
          ))}
        </div>
        <div className="hero" style={{ marginTop: '8px' }}>
          <div className="hero-label">現金支出の合計</div>
          <div className="hero-value" style={{ fontSize: '32px', color: 'var(--red)' }}>{v.cashTotalFmt}<span className="hero-unit">円</span></div>
          <div className="hero-sub">この金額はカード請求額に含まれていないため、支出として別途加算されます</div>
        </div>
        {v.addCashOpen && (
          <div style={{ padding: '16px 0', borderBottom: '1px solid var(--border)', marginBottom: '4px' }}>
            <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '14px' }}>現金支出を登録</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <input className="field-input" value={v.formCashName} placeholder="例: 現金でのランチ" onChange={v.onFormCashName} />
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 2 }}>
                  <span className="field-label">金額（円）</span>
                  <input className="field-input" type="number" value={v.formCashAmount} min={0} step={100} onChange={v.onFormCashAmount} />
                </div>
                <div style={{ flex: 1 }}>
                  <span className="field-label">日付</span>
                  <input className="field-input" type="date" value={v.formCashDate} onChange={v.onFormCashDate} />
                </div>
              </div>
              <input className="field-input" value={v.formCashNote} placeholder="メモ（任意）" onChange={v.onFormCashNote} />
              <div style={{ display: 'flex', gap: '8px' }}>
                <div className="btn-primary" onClick={v.addCash}>登録する</div>
                <div className="btn-cancel" onClick={v.closeAddCash}>やめる</div>
              </div>
            </div>
          </div>
        )}
        <div style={{ textAlign: 'center' }}><span className="btn-add" onClick={v.openAddCash}>＋ 現金支出を登録</span></div>

        <div style={{ marginTop: '24px' }}>
          <div className="row-flex">
            <div className="section-label" style={{ margin: 0 }}>必ず発生する現金支出パターン</div>
            {v.pendingRecurringCount > 0 && <div className="link-quiet" style={{ fontSize: '11px' }} onClick={v.registerAllRecurring}>今月分を{v.pendingRecurringCount}件まとめて登録</div>}
          </div>
          {v.cashRecurringRows.length === 0 ? (
            <div style={{ fontSize: '12px', color: 'var(--muted2)', padding: '8px 0' }}>毎回同じ金額で発生する支出（例: 週末の駐車料金など）を登録しておくと、まとめて今月分に反映できます</div>
          ) : (
            <div className="list">
              {v.cashRecurringRows.map((r) => (
                <ListRow key={r.id}>
                  <div className="row-flex">
                    <div>
                      <div className="row-top">{r.name}</div>
                      <div className="row-note" style={{ marginTop: '2px' }}>{r.note || r.amountFmt + '円・登録するたび今月の現金支出に追加'}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="row-value">{r.amountFmt}円</div>
                      {r.addedThisMonth
                        ? <div style={{ fontSize: '11px', color: 'var(--green)', marginTop: '4px' }}>今月分 登録済み</div>
                        : <div className="link-quiet" style={{ marginTop: '4px', fontSize: '11px' }} onClick={r.addOne}>＋ 今月に登録</div>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <ConfirmDelete onConfirm={r.remove} label="パターンを削除" />
                  </div>
                </ListRow>
              ))}
            </div>
          )}
          {v.addRecurringCashOpen && (
            <div style={{ padding: '16px 0', borderBottom: '1px solid var(--border)', marginBottom: '4px' }}>
              <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '14px' }}>固定支出パターンを登録</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <input className="field-input" value={v.formRecurringCashName} placeholder="例: 週末の駐輪場代" onChange={v.onFormRecurringCashName} />
                <div>
                  <span className="field-label">金額（円）</span>
                  <input className="field-input" type="number" value={v.formRecurringCashAmount} min={0} step={100} onChange={v.onFormRecurringCashAmount} />
                </div>
                <input className="field-input" value={v.formRecurringCashNote} placeholder="メモ（任意）" onChange={v.onFormRecurringCashNote} />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div className="btn-primary" onClick={v.addRecurringCash}>登録する</div>
                  <div className="btn-cancel" onClick={v.closeAddRecurringCash}>やめる</div>
                </div>
              </div>
            </div>
          )}
          <div style={{ textAlign: 'center', marginTop: '8px' }}><span className="btn-add" onClick={v.openAddRecurringCash}>＋ パターンを登録</span></div>
        </div>
      </div>
    );
  } else {
    body = (
      <div className="list">
        {v.expenseRows.map((row, i) => (
          <ListRow key={i}>
            <div className="row-flex">
              <div>
                <div className="row-top">{row.name}</div>
                <div className="row-note" style={{ marginTop: '2px' }}>{row.note}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="row-value">{row.amountFmt}円</div>
                <div className="row-delta" style={{ color: row.deltaColor, marginTop: '2px' }}>{row.delta}</div>
              </div>
            </div>
          </ListRow>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="screen-title">支出予測</div>
      <MonthSwitcher {...v} />
      <div className="screen-sub">カード明細の実績から予測</div>
      <div className="hero">
        <div className="hero-label">月末の着地予測</div>
        <div className="hero-value">{v.realSpendFmt}<span className="hero-unit"> 円</span></div>
        <div style={{ fontSize: '11px', color: 'var(--muted2)', marginTop: '8px' }}>使用済み {v.usedRealFmt}円</div>
        {transferNote && <div style={{ fontSize: '11px', color: 'var(--green)', marginTop: '4px' }}>{transferNote}</div>}
        <div style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
          <div className="row-flex">
            <div style={{ fontSize: '11px', color: 'var(--muted2)', letterSpacing: '.08em' }}>支出の目標</div>
            <div style={{ fontSize: '13px', fontVariantNumeric: 'tabular-nums' }}>{v.spendGoalFmt}円</div>
          </div>
          <div className="progress-track" style={{ marginTop: '10px' }}><div style={{ width: v.spendGoalPct, background: v.spendGoalColor }} /></div>
          <div style={{ fontSize: '11px', marginTop: '8px', color: v.spendGoalColor }}>{v.spendGoalMsg}</div>
          <div className="link-quiet" style={{ fontSize: '11px', marginTop: '8px', display: 'inline-block' }} onClick={v.goGoalSettings}>目標を編集</div>
        </div>
      </div>
      <SegTabs items={[
        { label: '固定費', active: v.fixedTab.active, onClick: v.setFixed },
        { label: '流動費', active: v.varTab.active, onClick: v.setVariable },
        { label: '資金移動 ' + v.transferCount + '件', active: v.transferTab.active, onClick: v.setTransferTab },
        { label: '現金支出 ' + v.cashCount + '件', active: v.cashTab.active, onClick: v.setCashTab },
      ]} />
      {body}
    </div>
  );
}
