import { useAppStore } from '../store/appStore';
import {
  monthKey, shiftMonthKey, monthLabel, isoDate, dateShortLabel,
  RATES, SYM, COACH_ON, fmt, mean, stdev, Z80, subMonthly, subAnnual, tax, bonusTax,
} from '../lib/calc';
import type { AppState } from '../lib/types';
import { categoryColor } from '../lib/colors';
import { fmtMan } from '../lib/format';

/**
 * Single computed-values hook mirroring the original vanilla computeVals().
 * Kept as one hook (rather than split per screen) for this first migration
 * pass to minimize behavioral risk; the underlying tax/budget/forecast math
 * is unchanged from the vanilla implementation. Splitting into focused
 * per-domain hooks is a good follow-up once screen components have settled.
 */
export function useComputed() {
  const state = useAppStore((st) => st.state) as AppState;
  const setState = useAppStore((st) => st.setState);
  const s = state;

  const go = (screen: AppState['screen']) => () => setState({ screen, menuOpen: false });
  const t = tax(s.gross);

  const vm = s.viewMonth;
  const vmMonthNum = +vm.split('-')[1];
  const currentRealMonth = monthKey(new Date());
  const goPrevMonth = () => setState({ viewMonth: shiftMonthKey(vm, -1) });
  const goNextMonth = () => setState({ viewMonth: shiftMonthKey(vm, 1) });

  function setBonus(id: string, patch: Partial<AppState['bonuses'][number]>) {
    setState((st) => ({ bonuses: st.bonuses.map((b) => (b.id === id ? { ...b, ...patch } : b)) }));
  }
  const bonusRows = s.bonuses.map((b) => {
    const bt = bonusTax(b.amount, t.marginalRate);
    return {
      id: b.id, label: b.label, month: b.month, amount: b.amount,
      amountFmt: fmt(b.amount), shakaiFmt: fmt(bt.shakai), shotokuFmt: fmt(bt.shotoku), netFmt: fmt(bt.net), net: bt.net,
      kenkoFmt: fmt(bt.kenko), koseiFmt: fmt(bt.kousei), koyouFmt: fmt(bt.koyou),
      isThisMonth: b.month === vmMonthNum,
      onAmount: (e: React.ChangeEvent<HTMLInputElement>) => setBonus(b.id, { amount: +e.target.value }),
      onMonth: (e: React.ChangeEvent<HTMLSelectElement>) => setBonus(b.id, { month: +e.target.value }),
    };
  });
  const bonusAnnualNet = bonusRows.reduce((a, b) => a + b.net, 0);
  const monthBonusNet = bonusRows.filter((b) => b.isThisMonth).reduce((a, b) => a + b.net, 0);
  const goCurrentMonth = () => setState({ viewMonth: currentRealMonth });
  const canGoNext = vm !== currentRealMonth;

  const monthActuals = s.budgetActuals[vm] || {};
  const rawSpend = Object.keys(monthActuals).reduce((a, k) => a + (monthActuals[k] || 0), 0);
  const usedRaw = rawSpend;
  function setBudgetActual(catId: string, val: number) {
    setState((st) => {
      const ba = { ...st.budgetActuals };
      ba[vm] = { ...ba[vm] };
      ba[vm][catId] = val;
      return { budgetActuals: ba };
    });
  }
  function setBudgetCap(catId: string, val: number) {
    setState((st) => ({ budgetCategories: st.budgetCategories.map((c) => (c.id === catId ? { ...c, cap: val } : c)) }));
  }
  function setBudgetName(catId: string, val: string) {
    setState((st) => ({ budgetCategories: st.budgetCategories.map((c) => (c.id === catId ? { ...c, name: val } : c)) }));
  }
  const budgetRows = s.budgetCategories.map((b, i) => {
    const used = monthActuals[b.id] || 0;
    const r = used / b.cap;
    return {
      id: b.id, name: b.name, used, cap: b.cap, usedFmt: fmt(used), capFmt: fmt(b.cap),
      ratio: r, pctLabel: Math.round(r * 100) + '%',
      chipColor: categoryColor(b.id, i),
      gap: used - b.cap, gapFmt: fmt(used - b.cap),
      onUsedChange: (e: React.ChangeEvent<HTMLInputElement>) => setBudgetActual(b.id, Math.max(0, +e.target.value || 0)),
      onCapChange: (e: React.ChangeEvent<HTMLInputElement>) => setBudgetCap(b.id, Math.max(1, +e.target.value || 0)),
      onNameChange: (e: React.ChangeEvent<HTMLInputElement>) => setBudgetName(b.id, e.target.value),
      removeCategory: () => {
        setState((st) => {
          const ba: AppState['budgetActuals'] = {};
          Object.keys(st.budgetActuals).forEach((mk) => {
            const monthVals = { ...st.budgetActuals[mk] };
            delete monthVals[b.id];
            ba[mk] = monthVals;
          });
          return {
            budgetCategories: st.budgetCategories.filter((x) => x.id !== b.id),
            budgetActuals: ba,
          };
        });
      },
    };
  });
  const overCategories = budgetRows.filter((b) => b.gap > 0).sort((a, b) => b.gap - a.gap);
  const overRows = overCategories.slice(0, 3).map((o) => ({
    name: o.name, gapFmt: fmt(o.gap), barColor: 'var(--red)',
    ratio: o.usedFmt + ' / ' + o.capFmt,
    pct: Math.min(100, (o.used / o.cap) * 100) + '%',
    note: '予算を' + fmt(o.gap) + '円超過',
  }));
  const overCount = overCategories.length;
  const overTotalFmt = fmt(overCategories.reduce((a, o) => a + o.gap, 0));
  const budgetTotalUsed = budgetRows.reduce((a, b) => a + b.used, 0);
  const budgetTotalCap = budgetRows.reduce((a, b) => a + b.cap, 0);
  const budgetTotalRatio = budgetTotalCap > 0 ? budgetTotalUsed / budgetTotalCap : 0;
  const budgetTotalUsedFmt = fmt(budgetTotalUsed);
  const budgetTotalCapFmt = fmt(budgetTotalCap);

  const monthTransfers = s.transfersByMonth[vm] || [];
  const transferTotal = monthTransfers.reduce((a, tr) => a + tr.amount, 0);
  const monthCash = s.cashExpensesByMonth[vm] || [];
  const cashTotal = monthCash.reduce((a, c) => a + c.amount, 0);
  const realSpend = rawSpend - transferTotal + cashTotal;
  const usedReal = Math.max(0, usedRaw - transferTotal + cashTotal);
  const cashRowsSorted = [...monthCash].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  function setCashField(id: string, patch: Partial<AppState['cashExpensesByMonth'][string][number]>) {
    setState((st) => {
      const cbm = { ...st.cashExpensesByMonth };
      cbm[vm] = (cbm[vm] || []).map((x) => (x.id === id ? { ...x, ...patch } : x));
      return { cashExpensesByMonth: cbm };
    });
  }
  const cashRows = cashRowsSorted.map((c) => ({
    id: c.id, name: c.name, note: c.note, amount: c.amount, amountFmt: fmt(c.amount), date: c.date, dateLabel: dateShortLabel(c.date),
    onName: (e: React.ChangeEvent<HTMLInputElement>) => setCashField(c.id, { name: e.target.value }),
    onAmount: (e: React.ChangeEvent<HTMLInputElement>) => setCashField(c.id, { amount: Math.max(0, +e.target.value || 0) }),
    onNote: (e: React.ChangeEvent<HTMLInputElement>) => setCashField(c.id, { note: e.target.value }),
    onDate: (e: React.ChangeEvent<HTMLInputElement>) => setCashField(c.id, { date: e.target.value }),
    remove: () => {
      setState((st) => {
        const cbm = { ...st.cashExpensesByMonth };
        cbm[vm] = (cbm[vm] || []).filter((x) => x.id !== c.id);
        return { cashExpensesByMonth: cbm };
      });
    },
  }));
  /* ---- recurring cash-expense patterns (必ず発生する現金支出をまとめて登録) ---- */
  function addRecurringToMonth(r: AppState['cashRecurring'][number]) {
    setState((st) => {
      const cbm = { ...st.cashExpensesByMonth };
      const list = cbm[vm] || [];
      if (list.some((c) => c.recurringId === r.id)) return {};
      const nc = {
        id: 'cash-r-' + r.id + '-' + Math.random().toString(36).slice(2, 7),
        name: r.name, note: r.note || '固定支出パターンから登録', amount: r.amount,
        date: isoDate(new Date()), recurringId: r.id,
      };
      cbm[vm] = list.concat([nc]);
      return { cashExpensesByMonth: cbm };
    });
  }
  const cashRecurringRows = s.cashRecurring.map((r) => {
    const addedThisMonth = monthCash.some((c) => c.recurringId === r.id);
    return {
      id: r.id, name: r.name, note: r.note, amountFmt: fmt(r.amount), addedThisMonth,
      addOne: () => addRecurringToMonth(r),
      remove: () => setState((st) => ({ cashRecurring: st.cashRecurring.filter((x) => x.id !== r.id) })),
    };
  });
  const pendingRecurring = s.cashRecurring.filter((r) => !monthCash.some((c) => c.recurringId === r.id));

  const habitDefs = s.habits;
  const habitSave = habitDefs.reduce((a, hb) => a + (s.habitsOff[hb.id] ? hb.month : 0), 0);
  const surplus = t.net - realSpend + habitSave + monthBonusNet;

  const savingsGoal = s.savingsGoal;
  const savingsGoalGap = savingsGoal - surplus;
  const savingsGoalPct = Math.min(100, Math.max(0, (surplus / Math.max(1, savingsGoal)) * 100)) + '%';
  const savingsGoalMsg = savingsGoalGap > 0 ? '目標まであと ' + fmt(savingsGoalGap) + '円' : '目標を ' + fmt(-savingsGoalGap) + '円 上回っています';
  const savingsGoalColor = savingsGoalGap > 0 ? 'var(--amber)' : 'var(--green)';
  const savingsGoalRatio = Math.max(0, surplus / Math.max(1, savingsGoal));

  const spendGoal = s.spendGoal;
  const spendGoalGap = realSpend - spendGoal;
  const spendGoalOver = spendGoalGap > 0;
  const spendGoalPct = Math.min(100, (realSpend / spendGoal) * 100) + '%';
  const spendGoalRatio = realSpend / Math.max(1, spendGoal);
  const spendGoalMsg = spendGoalOver ? '目標より ' + fmt(spendGoalGap) + '円 超過' : 'あと ' + fmt(-spendGoalGap) + '円 の余裕';
  const spendGoalColor = spendGoalOver ? 'var(--red)' : 'var(--green)';

  function setTransferField(id: string, patch: Partial<AppState['transfersByMonth'][string][number]>) {
    setState((st) => {
      const tbm = { ...st.transfersByMonth };
      tbm[vm] = (tbm[vm] || []).map((x) => (x.id === id ? { ...x, ...patch } : x));
      return { transfersByMonth: tbm };
    });
  }
  const transferRows = monthTransfers.map((tr) => ({
    id: tr.id, name: tr.name, note: tr.note, amount: tr.amount, amountFmt: fmt(tr.amount), taxAdvantaged: !!tr.taxAdvantaged,
    onName: (e: React.ChangeEvent<HTMLInputElement>) => setTransferField(tr.id, { name: e.target.value }),
    onAmount: (e: React.ChangeEvent<HTMLInputElement>) => setTransferField(tr.id, { amount: Math.max(0, +e.target.value || 0) }),
    onNote: (e: React.ChangeEvent<HTMLInputElement>) => setTransferField(tr.id, { note: e.target.value }),
    toggleNisa: () => setTransferField(tr.id, { taxAdvantaged: !tr.taxAdvantaged }),
    remove: () => {
      setState((st) => {
        const tbm = { ...st.transfersByMonth };
        tbm[vm] = (tbm[vm] || []).filter((x) => x.id !== tr.id);
        return { transfersByMonth: tbm };
      });
    },
  }));

  const noneSubs = s.subs.filter((x) => x.usage === 'none');
  const lowSubs = s.subs.filter((x) => x.usage === 'low');
  const lowSubTotal = noneSubs.concat(lowSubs).reduce((a, x) => a + subMonthly(x), 0);
  /* ヒーロー「見直しで浮くお金」= OFF習慣の節約額 + 未活用サブスクの月換算合計。
     既存の habitSave / lowSubTotal をそのまま合算するだけで、計算式自体は変えない。 */
  const reliefTotal = habitSave + lowSubTotal;

  function subCycleNote(x: AppState['subs'][number]) { return x.cycle === 'annual' ? '年' + fmt(x.price) + '円（年払い）' : fmt(x.price) + '円/月'; }
  const cutDefs = ([] as { id: string; label: string; note: string; save: number }[])
    .concat(noneSubs.map((x) => ({ id: 'sub-' + x.id, label: x.name + ' を解約（未使用）', note: '全く使っていないサービス・' + subCycleNote(x), save: subMonthly(x) })))
    .concat(lowSubs.map((x) => ({ id: 'sub-' + x.id, label: x.name + ' を解約', note: '活用度: ほぼ無し・' + subCycleNote(x), save: subMonthly(x) })))
    .concat(s.subs.filter((x) => x.usage === 'mid').map((x) => ({ id: 'sub-' + x.id, label: x.name + ' を一時停止', note: '活用度: 低・利用月のみの契約も検討', save: subMonthly(x) })))
    .concat(habitDefs.filter((hb) => !s.habitsOff[hb.id]).map((hb) => ({ id: 'habit-' + hb.id, label: hb.name + ' を減らす', note: hb.freq + '・' + fmt(hb.month) + '円/月', save: Math.round(hb.month * 0.3) })));

  const cutsTotal = cutDefs.reduce((a, c) => a + (s.cuts[c.id] ? c.save : 0), 0);
  const gap = s.invTarget - surplus - cutsTotal;

  const cutRows = cutDefs.map((c) => {
    const on = !!s.cuts[c.id];
    return {
      id: c.id, label: c.label, note: c.note, save: c.save, saveFmt: fmt(c.save), on,
      toggle: () => setState((st) => { const cuts = { ...st.cuts }; cuts[c.id] = !cuts[c.id]; return { cuts }; }),
    };
  });

  const habitRows = habitDefs.map((hb) => {
    const off = !!s.habitsOff[hb.id];
    return {
      id: hb.id, name: hb.name, freq: hb.freq, off, month: hb.month,
      monthFmt: fmt(hb.month), yearFmt: fmt(hb.month * 12),
      msg: off ? '中止すると年 ' + fmt(hb.month * 12) + '円の削減。投資プランに反映済み' : '継続中・明細から自動検出',
      toggle: () => setState((st) => { const ho = { ...st.habitsOff }; ho[hb.id] = !ho[hb.id]; return { habitsOff: ho }; }),
      remove: () => setState((st) => ({ habits: st.habits.filter((x) => x.id !== hb.id) })),
      onNameChange: (e: React.ChangeEvent<HTMLInputElement>) => setState((st) => ({ habits: st.habits.map((x) => (x.id === hb.id ? { ...x, name: e.target.value } : x)) })),
      onMonthChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = Math.max(0, +e.target.value || 0);
        setState((st) => ({ habits: st.habits.map((x) => (x.id === hb.id ? { ...x, month: val } : x)) }));
      },
    };
  });

  function setEvent(idx: number, patch: Partial<AppState['events'][number]>) {
    setState((st) => ({ events: st.events.map((e, i) => (i === idx ? { ...e, ...patch } : e)) }));
  }
  function removeEvent(idx: number) {
    setState((st) => ({ events: st.events.filter((_e, i) => i !== idx) }));
  }
  const eventRows = s.events.map((ev, idx) => {
    const rate = RATES[ev.currency] || 1;
    const jpy = (n: number) => Math.round(n * rate);
    const isFx = ev.currency !== 'JPY';
    const manFmt = (n: number, digits: number) => (n / 10000).toFixed(digits) + '万円';
    const ratio = ev.target > 0 ? ev.saved / ev.target : 0;
    return {
      idx, name: ev.name, when: ev.when, currency: ev.currency, targetRaw: ev.target, savedRaw: ev.saved, monthlyRaw: ev.monthly,
      onName: (e: React.ChangeEvent<HTMLInputElement>) => setEvent(idx, { name: e.target.value }),
      onWhen: (e: React.ChangeEvent<HTMLInputElement>) => setEvent(idx, { when: e.target.value }),
      onSaved: (e: React.ChangeEvent<HTMLInputElement>) => setEvent(idx, { saved: Math.max(0, +e.target.value || 0) }),
      onTarget: (e: React.ChangeEvent<HTMLInputElement>) => setEvent(idx, { target: Math.max(1, +e.target.value || 0) }),
      onMonthly: (e: React.ChangeEvent<HTMLInputElement>) => setEvent(idx, { monthly: Math.max(0, +e.target.value || 0) }),
      remove: () => removeEvent(idx),
      savedFmt: isFx ? SYM[ev.currency] + fmt(ev.saved) : manFmt(ev.saved, 1),
      targetFmt: isFx ? SYM[ev.currency] + fmt(ev.target) : manFmt(ev.target, 0),
      monthlyFmt: isFx ? SYM[ev.currency] + fmt(ev.monthly) : manFmt(ev.monthly, 1),
      ratio,
      fxNote: isFx ? '自動円換算: 目標 ≒ ' + fmt(jpy(ev.target)) + '円・月 ≒ ' + fmt(jpy(ev.monthly)) + '円（1 ' + ev.currency + ' = ' + rate.toFixed(1) + '円）' : '',
      barColor: ratio >= 1 ? 'var(--color-positive)' : 'var(--color-accent)',
    };
  });
  const eventMonthlyTotal = s.events.reduce((a, ev) => a + ev.monthly * (RATES[ev.currency] || 1), 0);

  /* ---- annual expense simulation ---- */
  const subsAnnualTotal = s.subs.reduce((a, x) => a + subAnnual(x), 0);
  const subsMonthly = subsAnnualTotal / 12;
  const habitsOnMonthly = habitDefs.reduce((a, hb) => a + (s.habitsOff[hb.id] ? 0 : hb.month), 0);
  const recordedMonths = Object.keys(s.budgetActuals);
  function avgCategoryMonthly(catId: string): number | null {
    const vals = recordedMonths
      .map((mk) => (s.budgetActuals[mk] ? s.budgetActuals[mk][catId] : undefined))
      .filter((v): v is number => v !== undefined);
    if (vals.length === 0) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }
  const variableCats = s.budgetCategories.filter((b) => b.group === 'variable');
  const fixedCats = s.budgetCategories.filter((b) => b.group === 'fixed');
  const variableBudgetMonthly = variableCats.reduce((a, b) => {
    const avg = avgCategoryMonthly(b.id);
    return a + (avg !== null ? avg : b.cap);
  }, 0);
  const variableBasedOnActuals = variableCats.some((b) => avgCategoryMonthly(b.id) !== null);
  const fixedCoreMonthly = fixedCats.filter((b) => b.id !== 'sub').reduce((a, b) => {
    const avg = avgCategoryMonthly(b.id);
    return a + (avg !== null ? avg : b.cap);
  }, 0);

  /* ---- home screen: this month's take-home split into fixed / variable / remaining ---- */
  const homeFixedMonthly = fixedCoreMonthly + subsMonthly;
  const homeVariableMonthly = Math.max(0, realSpend - homeFixedMonthly);
  const homeBase = Math.max(1, t.net);
  const homeFixedPct = Math.min(100, (homeFixedMonthly / homeBase) * 100);
  const homeVariablePct = Math.min(100 - homeFixedPct, (homeVariableMonthly / homeBase) * 100);
  const homeRemainPct = Math.max(0, 100 - homeFixedPct - homeVariablePct);
  function manYen(n: number) { return (n / 10000).toFixed(1) + '万円'; }

  function categoryDelta(catId: string, used: number) {
    const avg = avgCategoryMonthly(catId);
    if (avg === null) return { delta: 'まだ記録がありません', deltaColor: 'var(--muted2)' };
    const diff = used - avg;
    if (Math.abs(diff) < 1) return { delta: '平均並み', deltaColor: 'var(--muted2)' };
    return {
      delta: (diff > 0 ? '+' : '') + fmt(diff) + '円（平均比）',
      deltaColor: diff > 0 ? 'var(--red)' : 'var(--green)',
    };
  }
  function categoryRow(b: AppState['budgetCategories'][number]) {
    const used = monthActuals[b.id] || 0;
    const d = categoryDelta(b.id, used);
    return { name: b.name, note: '目安 ' + fmt(b.cap) + '円', amount: used, delta: d.delta, deltaColor: d.deltaColor };
  }
  /* Expense「内訳」タブ: 固定費・流動費を1リストにまとめて出すため、グループごとの
     行データを別々に返す(旧 expenseRows はタブ選択で片方だけを返していた)。
     カテゴリ色は budgetCategories 内での位置で決まるので、グループが変わっても
     同じカテゴリは同じ色を保つ。 */
  const catColor = (b: AppState['budgetCategories'][number]) =>
    categoryColor(b.id, s.budgetCategories.findIndex((x) => x.id === b.id));
  function expenseRow(b: AppState['budgetCategories'][number]) {
    const row = categoryRow(b);
    return { ...row, id: b.id, color: catColor(b), amountFmt: fmt(row.amount) };
  }
  const expenseFixedRows = fixedCats.map(expenseRow);
  const expenseVariableRows = variableCats.map(expenseRow);
  const expenseFixedTotalFmt = fmt(fixedCats.reduce((a, b) => a + (monthActuals[b.id] || 0), 0));
  const expenseVariableTotalFmt = fmt(variableCats.reduce((a, b) => a + (monthActuals[b.id] || 0), 0));

  const recordedCashMonths = Object.keys(s.cashExpensesByMonth);
  const cashMonthlyTotals = recordedCashMonths.map((mk) => (s.cashExpensesByMonth[mk] || []).reduce((a, c) => a + c.amount, 0));
  const cashAvgMonthly = cashMonthlyTotals.length > 0 ? cashMonthlyTotals.reduce((a, b) => a + b, 0) / cashMonthlyTotals.length : 0;

  const annualFixed = fixedCoreMonthly * 12;
  const annualSubs = subsAnnualTotal;
  const annualHabits = habitsOnMonthly * 12;
  const annualVariable = Math.round(variableBudgetMonthly * 12);
  const annualEvents = Math.round(eventMonthlyTotal * 12);
  const annualCash = Math.round(cashAvgMonthly * 12);
  const annualBreakdown = [
    { key: 'fixed', name: '固定費', monthly: fixedCoreMonthly, annual: annualFixed, note: '家賃・駐車場・光熱・通信・保険' },
    { key: 'subs', name: 'サブスク', monthly: subsMonthly, annual: annualSubs, note: s.subs.length + '件・現在の契約から算出' },
    { key: 'habits', name: '習慣（ONのみ）', monthly: habitsOnMonthly, annual: annualHabits, note: habitDefs.filter((hb) => !s.habitsOff[hb.id]).length + '/' + habitDefs.length + '件が対象' },
    { key: 'variable', name: '流動費（買い物・ETC・食費等）', monthly: Math.round(variableBudgetMonthly), annual: annualVariable, note: variableBasedOnActuals ? '記録済み月の平均から算出' : 'まだ記録がないため予算目標から算出' },
    { key: 'cash', name: '現金支出', monthly: Math.round(cashAvgMonthly), annual: annualCash, note: recordedCashMonths.length > 0 ? recordedCashMonths.length + 'ヶ月分の記録から平均' : 'まだ記録がありません' },
    { key: 'events', name: 'ライフイベント積立', monthly: Math.round(eventMonthlyTotal), annual: annualEvents, note: s.events.length + '件の目標に向けた積立' },
  ];
  const annualTotal = annualFixed + annualSubs + annualHabits + annualVariable + annualCash + annualEvents;
  const annualNet = t.net * 12 + bonusAnnualNet;
  const annualGap = annualNet - annualTotal;
  const annualRows = annualBreakdown
    .map((r, i) => ({
      name: r.name, note: r.note,
      monthlyFmt: fmt(r.monthly), annualFmt: fmt(r.annual),
      monthlyManFmt: fmtMan(r.monthly), annualManFmt: fmtMan(r.annual),
      color: categoryColor(r.key, i),
      pctLabel: annualTotal > 0 ? Math.round((r.annual / annualTotal) * 100) + '%' : '0%',
      pct: Math.min(100, annualTotal > 0 ? (r.annual / annualTotal) * 100 : 0) + '%',
      annual: r.annual,
    }))
    .sort((a, b) => b.annual - a.annual);

  /* ---- statistical annual expense forecast (mean ± confidence interval) ---- */
  const categoryStats = variableCats.map((b) => {
    const vals = recordedMonths
      .map((mk) => (s.budgetActuals[mk] ? s.budgetActuals[mk][b.id] : undefined))
      .filter((v): v is number => v !== undefined);
    return { id: b.id, name: b.name, n: vals.length, avg: vals.length > 0 ? mean(vals) : b.cap, sd: stdev(vals) };
  });
  const variableMonthlyVariance = categoryStats.reduce((a, c) => a + c.sd * c.sd, 0);
  const variableSampleMonths = categoryStats.reduce((a, c) => Math.max(a, c.n), 0);

  const cashMonthlyStd = stdev(cashMonthlyTotals);
  const cashSampleMonths = cashMonthlyTotals.length;

  const forecastSampleMonths = Math.max(variableSampleMonths, cashSampleMonths);
  const forecastReliable = forecastSampleMonths >= 2;
  const annualVariance = (variableMonthlyVariance + cashMonthlyStd * cashMonthlyStd) * 12;
  const annualStd = Math.sqrt(annualVariance);
  const forecastLow = Math.max(0, Math.round(annualTotal - Z80 * annualStd));
  const forecastHigh = Math.round(annualTotal + Z80 * annualStd);
  const forecastCategoryRows = categoryStats.filter((c) => c.n >= 2).map((c) => ({ name: c.name, avgFmt: fmt(c.avg), sdFmt: fmt(c.sd), n: c.n }));

  /* ---- report: monthly totals across all recorded months (variable-budget actuals + cash) ---- */
  function monthTotalSpend(mk: string) {
    const ba = s.budgetActuals[mk] || {};
    const catTotal = Object.keys(ba).reduce((a, k) => a + (ba[k] || 0), 0);
    const cashList = s.cashExpensesByMonth[mk] || [];
    const cashT = cashList.reduce((a, c) => a + c.amount, 0);
    return catTotal + cashT;
  }
  const allRecordedMonths = Array.from(new Set(recordedMonths.concat(recordedCashMonths))).sort();
  const monthlyTotals = allRecordedMonths.map((mk) => ({ mk, total: monthTotalSpend(mk) }));
  const monthlyTotalsMax = monthlyTotals.reduce((a, m) => Math.max(a, m.total), 0);
  const reportTrendRows = monthlyTotals.map((m) => ({
    mk: m.mk, label: monthLabel(m.mk).replace(/^\d+年/, ''), total: m.total, totalFmt: fmt(m.total),
    pct: monthlyTotalsMax > 0 ? Math.max(2, Math.round((m.total / monthlyTotalsMax) * 100)) + '%' : '2%',
    isCurrent: m.mk === vm,
  }));
  /** BarChart のタップ選択 → その月に viewMonth を切り替える(月移動と同じ setState パターン)。 */
  const selectReportMonth = (mk: string) => setState({ viewMonth: mk });

  /* ---- report: current-month category breakdown, ranked ----
     色はカテゴリのチップ色(budgetRows と同じ位置ベース)を引き継ぎ、予算画面と一致させる。
     上位N件+「その他」への集約は呼び出し側(Report画面)の表示ロジックに任せる。 */
  const breakdownItems = budgetRows.map((b) => ({ name: b.name, used: b.used, color: b.chipColor }))
    .concat(cashTotal > 0 ? [{ name: '現金支出', used: cashTotal, color: 'var(--muted)' }] : []);
  const breakdownTotal = breakdownItems.reduce((a, b) => a + b.used, 0);
  const breakdownRows = breakdownItems.filter((b) => b.used > 0).sort((a, b) => b.used - a.used).map((b, i) => ({
    rank: i + 1, name: b.name, used: b.used, usedFmt: fmt(b.used), color: b.color,
    pctLabel: breakdownTotal > 0 ? Math.round((b.used / breakdownTotal) * 100) + '%' : '0%',
    pct: breakdownTotal > 0 ? Math.max(1, (b.used / breakdownTotal) * 100) + '%' : '1%',
  }));

  /* ---- report: per-category historical stats (avg/min/max/sd) + vs-average trend for the viewed month ---- */
  function categoryHistory(catId: string) {
    return recordedMonths.map((mk) => (s.budgetActuals[mk] ? s.budgetActuals[mk][catId] : undefined)).filter((v): v is number => v !== undefined);
  }
  const statsRows = s.budgetCategories.map((b) => {
    const vals = categoryHistory(b.id);
    if (vals.length === 0) return null;
    const avg = mean(vals);
    const cur = monthActuals[b.id];
    const diff = cur !== undefined ? cur - avg : null;
    return {
      name: b.name, n: vals.length,
      avgFmt: fmt(avg), minFmt: fmt(Math.min(...vals)), maxFmt: fmt(Math.max(...vals)), sdFmt: fmt(stdev(vals)),
      diffFmt: diff === null ? null : (diff >= 0 ? '+' : '') + fmt(diff) + '円',
      diffColor: diff === null ? 'var(--muted2)' : diff > 0 ? 'var(--red)' : diff < 0 ? 'var(--green)' : 'var(--muted2)',
      /* 「気になる動き」インサイトの並べ替え用(絶対値順)。diff が null の行は -1 で最後に沈める。 */
      diffAbs: diff === null ? -1 : Math.abs(diff),
    };
  }).filter((x): x is NonNullable<typeof x> => x !== null).sort((a, b) => b.n - a.n);
  /* ---- report: 統計の平易化 — 初期表示は差分の大きい上位数件だけの1行インサイトにする ---- */
  const statsInsightRows = [...statsRows].filter((c) => c.diffAbs > 0).sort((a, b) => b.diffAbs - a.diffAbs).slice(0, 3);

  /* ---- report: month-over-month comparison ---- */
  const prevMonthKey = shiftMonthKey(vm, -1);
  const prevActuals = s.budgetActuals[prevMonthKey];
  const prevCashList = s.cashExpensesByMonth[prevMonthKey];
  const momAvailable = !!prevActuals || !!prevCashList;
  const prevTotal = monthTotalSpend(prevMonthKey);
  const curTotal = monthTotalSpend(vm);
  const momDiff = curTotal - prevTotal;
  const momPct = prevTotal > 0 ? Math.round((momDiff / prevTotal) * 100) : null;
  /* 絶対値順のフルリスト。上位3件だけ見せて残りは「すべて見る」に回すのは呼び出し側(Report画面)の仕事。 */
  const momCategoryRows = s.budgetCategories.map((b) => {
    const cur = monthActuals[b.id] || 0;
    const prev = (prevActuals || {})[b.id] || 0;
    return { name: b.name, diff: cur - prev };
  }).filter((r) => r.diff !== 0).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff)).map((r) => ({
    name: r.name, diffFmt: (r.diff >= 0 ? '+' : '') + fmt(r.diff) + '円', color: r.diff > 0 ? 'var(--red)' : 'var(--green)',
  }));

  /* ---- report: cash-expense statistics across recorded months ---- */
  const cashStatsAvailable = cashMonthlyTotals.length > 0;
  const cashStats = cashStatsAvailable ? {
    n: cashMonthlyTotals.length, avgFmt: fmt(cashAvgMonthly),
    minFmt: fmt(Math.min(...cashMonthlyTotals)), maxFmt: fmt(Math.max(...cashMonthlyTotals)), sdFmt: fmt(cashMonthlyStd),
  } : null;

  const usageColors: Record<string, string> = { high: 'var(--green)', mid: 'var(--amber)', low: 'var(--red)', none: 'var(--red)' };
  /* 活用度バッジ: 高=positive/中=neutral/低=warning/未使用=danger（habit.md のビジュアル方針）。
     並び順は低活用ほど上（none→low→mid→high）に出すための rank も併せて持たせる。 */
  const usageBadge: Record<AppState['subs'][number]['usage'], { label: string; tone: 'positive' | 'warning' | 'danger' | 'neutral'; rank: number }> = {
    none: { label: '未使用', tone: 'danger', rank: 0 },
    low: { label: '低活用', tone: 'warning', rank: 1 },
    mid: { label: '中活用', tone: 'neutral', rank: 2 },
    high: { label: '高活用', tone: 'positive', rank: 3 },
  };
  function setUsage(id: string, usage: AppState['subs'][number]['usage']) {
    return () => setState((st) => ({ subs: st.subs.map((x) => (x.id === id ? { ...x, usage } : x)) }));
  }
  function setCycle(id: string, cycle: AppState['subs'][number]['cycle']) {
    return () => setState((st) => ({ subs: st.subs.map((x) => (x.id === id ? { ...x, cycle } : x)) }));
  }
  const subRows = s.subs.map((sub) => {
    const annual = subAnnual(sub);
    const badge = usageBadge[sub.usage];
    return {
      id: sub.id, name: sub.name, usage: sub.usage,
      priceFmt: fmt(sub.price), priceUnit: sub.cycle === 'annual' ? '円/年' : '円/月',
      monthlyFmt: fmt(subMonthly(sub)),
      isAnnual: sub.cycle === 'annual', isMonthly: sub.cycle !== 'annual',
      setMonthlyCycle: setCycle(sub.id, 'monthly'), setAnnualCycle: setCycle(sub.id, 'annual'),
      setHigh: setUsage(sub.id, 'high'), setMid: setUsage(sub.id, 'mid'), setLow: setUsage(sub.id, 'low'), setNone: setUsage(sub.id, 'none'),
      highOn: sub.usage === 'high', midOn: sub.usage === 'mid', lowOn: sub.usage === 'low', noneOn: sub.usage === 'none',
      usageLabel: badge.label, usageTone: badge.tone, usageRank: badge.rank,
      cancelCandidate: sub.usage === 'low' || sub.usage === 'none',
      advice: sub.usage === 'none' ? '全く使用なし。即解約で年 ' + fmt(annual) + '円の削減'
        : sub.usage === 'low' ? '解約候補・年 ' + fmt(annual) + '円の削減余地'
        : sub.usage === 'mid' ? '利用月のみ契約する運用も検討の余地'
        : '十分に活用中・継続',
      adviceColor: usageColors[sub.usage],
    };
  });

  const formMonth = Math.round((+s.formTimes || 0) * (+s.formAmount || 0) * 4.33);

  const tabDefs: { id: AppState['screen']; label: string }[] = [
    { id: 'home', label: 'ホーム' }, { id: 'expense', label: '支出' }, { id: 'habit', label: '習慣' },
    { id: 'budget', label: '予算' }, { id: 'report', label: 'レポート' }, { id: 'annual', label: '年間' }, { id: 'invest', label: '投資' }, { id: 'salary', label: '給与' },
  ];
  const tabs = tabDefs.map((tb) => ({
    id: tb.id, label: tb.label, go: go(tb.id),
    active: s.screen === tb.id || (tb.id === 'salary' && s.screen === 'salarySettings'),
  }));

  /* 支出画面のタブは2つ(内訳 / 現金・その他)に集約したが、AppState.expTab は保存済み
     データとの互換のため 'fixed'|'variable'|'transfer'|'cash' の4値のまま維持する。
     UI 側で fixed/variable→内訳、transfer/cash→現金・その他 にマップする。 */
  const isBreakdownTab = s.expTab === 'fixed' || s.expTab === 'variable';
  const isCashOtherTab = !isBreakdownTab;

  /* カード明細の生の請求額から着地予測を作るための調整分。常時表示せず InfoTip に退避する。 */
  const adjustParts: string[] = [];
  if (transferTotal !== 0) adjustParts.push('資金移動 -' + fmt(transferTotal) + '円を除いています');
  if (cashTotal !== 0) adjustParts.push('現金支出 +' + fmt(cashTotal) + '円を加えています');
  const expenseAdjustNote = 'カード請求額 ' + fmt(rawSpend) + '円に対して'
    + (adjustParts.length > 0 ? '、' + adjustParts.join('。') + '。' : '調整はありません。');

  const furusatoLimit = Math.round((s.gross * 12 * 0.012) / 1000) * 1000;
  const furusatoGiftValue = Math.round(furusatoLimit * 0.3);
  const idecoAnnual = 276000;
  const idecoSaving = Math.round(idecoAnnual * (t.marginalRate + 0.10));
  const medicalPaid = 15000;
  const medicalThreshold = 100000;
  const medicalGap = Math.max(0, medicalThreshold - medicalPaid);
  const medicalExcess = Math.max(0, medicalPaid - medicalThreshold);
  const medicalSaving = Math.round(medicalExcess * (t.marginalRate + 0.10));
  const medicalOverThreshold = medicalPaid > medicalThreshold;
  const dedTotal = idecoSaving + medicalSaving;

  const nisaLimitAnnual = 3600000;
  const yearPrefix = currentRealMonth.split('-')[0] + '-';
  const nisaYearTotal = Object.keys(s.transfersByMonth)
    .filter((k) => k.indexOf(yearPrefix) === 0)
    .reduce((a, k) => a + (s.transfersByMonth[k] || []).filter((tr) => tr.taxAdvantaged).reduce((a2, tr) => a2 + tr.amount, 0), 0);
  const nisaRemaining = Math.max(0, nisaLimitAnnual - nisaYearTotal);
  const nisaPct = Math.min(100, (nisaYearTotal / nisaLimitAnnual) * 100) + '%';

  return {
    isHome: s.screen === 'home', isExpense: s.screen === 'expense', isHabit: s.screen === 'habit',
    isBudget: s.screen === 'budget', isInvest: s.screen === 'invest', isSalary: s.screen === 'salary',
    isAnnual: s.screen === 'annual', isSalarySettings: s.screen === 'salarySettings',
    isGoalSettings: s.screen === 'goalSettings', isReport: s.screen === 'report',
    goReport: go('report'),
    reportTrendRows, selectReportMonth,
    breakdownRows, breakdownTotal, breakdownTotalFmt: fmt(breakdownTotal),
    statsRows, statsInsightRows,
    momAvailable, momDiffFmt: (momDiff >= 0 ? '+' : '') + fmt(momDiff) + '円', momPct,
    momColor: momDiff > 0 ? 'var(--red)' : momDiff < 0 ? 'var(--green)' : 'var(--muted2)',
    prevMonthLabel: monthLabel(prevMonthKey), momCategoryRows,
    cashStatsAvailable, cashStats,
    annualRows, annualTotalFmt: fmt(annualTotal), annualNetFmt: fmt(annualNet),
    annualTotalManFmt: fmtMan(annualTotal),
    annualGapColor: annualGap >= 0 ? 'var(--green)' : 'var(--red)',
    annualGapMsg: annualGap >= 0 ? '年間で ' + fmt(annualGap) + '円 残る見込み' : '年間で ' + fmt(-annualGap) + '円 不足する見込み',
    annualPct: Math.round(Math.min(100, (annualTotal / annualNet) * 100)) + '%',
    annualRatio: annualNet > 0 ? annualTotal / annualNet : 0,
    annualHeroLine:
      '手取りの' + Math.round((annualTotal / Math.max(annualNet, 1)) * 100) + '%・' +
      (annualGap >= 0 ? '残り' + fmtMan(annualGap) : fmtMan(-annualGap) + '超過'),
    annualBasedNote: variableBasedOnActuals ? '記録済みの予算実績をもとに算出しています' : 'まだ実績記録がないため、予算目標をもとに算出しています。予算画面で記録するほど精度が上がります',
    forecastReliable, forecastSampleMonths,
    forecastLowFmt: fmt(forecastLow), forecastHighFmt: fmt(forecastHigh), annualStdFmt: fmt(annualStd),
    annualForecastLine: 'ブレを見込むと ' + fmtMan(forecastLow) + ' 〜 ' + fmtMan(forecastHigh),
    forecastCategoryRows,
    homeFixedPct: homeFixedPct + '%', homeVariablePct: homeVariablePct + '%', homeRemainPct: homeRemainPct + '%',
    homeFixedLabel: '固定費 ' + manYen(homeFixedMonthly), homeVariableLabel: '流動費 ' + manYen(homeVariableMonthly),
    homeFixedMonthly, homeVariableMonthly, homeNet: homeBase,
    coachOn: COACH_ON,
    coachBad: lowSubTotal > 0,
    coachMsg: lowSubTotal > 0
      ? '未活用のサービスが' + (noneSubs.length + lowSubs.length) + '件（月' + fmt(lowSubTotal) + '円）。解約により投資余力を改善できます'
      : '契約サービスはすべて活用されています',
    isHabitTab: s.habitTab === 'habit', isSubTab: s.habitTab === 'sub',
    setHabitTab: () => setState({ habitTab: 'habit' }), setSubTab: () => setState({ habitTab: 'sub' }),
    subCount: s.subs.length, subRows, lowSubTotalFmt: fmt(lowSubTotal),
    subSummaryMsg: lowSubTotal > 0 ? '年間 ' + fmt(lowSubTotal * 12) + '円。投資タブの削減プランへ解約候補として反映済み' : '解約候補はありません',
    reliefTotalFmt: fmt(reliefTotal),
    addOpen: s.addOpen, openAdd: () => setState({ addOpen: true }), closeAdd: () => setState({ addOpen: false }),
    formName: s.formName, formTimes: s.formTimes, formAmount: s.formAmount,
    onFormName: (e: React.ChangeEvent<HTMLInputElement>) => setState({ formName: e.target.value }),
    onFormTimes: (e: React.ChangeEvent<HTMLInputElement>) => setState({ formTimes: +e.target.value }),
    onFormAmount: (e: React.ChangeEvent<HTMLInputElement>) => setState({ formAmount: +e.target.value }),
    formMonthFmt: fmt(formMonth), formYearFmt: fmt(formMonth * 12),
    formHabitValid: !!s.formName.trim() && formMonth > 0,
    formHabitError: !s.formName.trim() ? '習慣の名前を入力してください' : '週の回数と金額を入力してください',
    addHabit: () => {
      if (!s.formName.trim() || formMonth <= 0) return;
      const nh = { id: 'h' + s.habits.length + '-' + Math.random().toString(36).slice(2, 7), name: s.formName.trim(), freq: '週' + s.formTimes + '回 × ' + fmt(+s.formAmount) + '円', month: formMonth };
      setState((st) => ({ habits: st.habits.concat([nh]), addOpen: false, formName: '' }));
    },
    eventMonthlyFmt: fmt(eventMonthlyTotal), eventCount: s.events.length,
    addEventOpen: s.addEventOpen,
    openAddEvent: () => setState({ addEventOpen: true }), closeAddEvent: () => setState({ addEventOpen: false }),
    evName: s.evName, evWhen: s.evWhen, evAmount: s.evAmount, evMonths: s.evMonths, evCurrency: s.evCurrency,
    onEvName: (e: React.ChangeEvent<HTMLInputElement>) => setState({ evName: e.target.value }),
    onEvWhen: (e: React.ChangeEvent<HTMLInputElement>) => setState({ evWhen: e.target.value }),
    onEvAmount: (e: React.ChangeEvent<HTMLInputElement>) => setState({ evAmount: +e.target.value }),
    onEvMonths: (e: React.ChangeEvent<HTMLInputElement>) => setState({ evMonths: +e.target.value }),
    onEvCurrency: (e: React.ChangeEvent<HTMLSelectElement>) => setState({ evCurrency: e.target.value }),
    evMonthlyPreview: (() => {
      const amt = +s.evAmount || 0, months = Math.max(1, +s.evMonths || 1);
      const rate = RATES[s.evCurrency] || 1;
      const per = amt / months;
      return s.evCurrency === 'JPY'
        ? '月 ' + fmt(per) + '円 × ' + months + 'ヶ月'
        : '月 ' + SYM[s.evCurrency] + fmt(per) + ' ≒ ' + fmt(per * rate) + '円 × ' + months + 'ヶ月（1 ' + s.evCurrency + ' = ' + rate.toFixed(1) + '円）';
    })(),
    formEventValid: !!s.evName.trim() && (+s.evAmount || 0) > 0,
    formEventError: !s.evName.trim() ? 'イベント名を入力してください' : '目標金額を入力してください',
    addEvent: () => {
      const amt = +s.evAmount || 0, months = Math.max(1, +s.evMonths || 1);
      if (!s.evName.trim() || amt <= 0) return;
      const ne = { name: s.evName.trim(), when: s.evWhen || '時期未定', currency: s.evCurrency, target: amt, saved: 0, monthly: Math.round(amt / months) };
      setState((st) => ({ events: st.events.concat([ne]), addEventOpen: false, evName: '', evWhen: '' }));
    },
    goHome: go('home'), goSalary: go('salary'), goExpense: go('expense'), goInvest: go('invest'),
    goBudget: () => setState({ screen: 'budget', budgetTab: 'budget', menuOpen: false }),
    goLifeEvents: () => setState({ screen: 'budget', budgetTab: 'lifeEvent', menuOpen: false }),
    netFmt: fmt(t.net), surplusFmt: fmt(surplus),
    investGapManFmt: Math.max(0, gap / 10000).toFixed(1),
    tabs,
    menuOpen: s.menuOpen, toggleMenu: () => setState({ menuOpen: !s.menuOpen }), closeMenu: () => setState({ menuOpen: false }),
    expenseFixedRows, expenseVariableRows, expenseFixedTotalFmt, expenseVariableTotalFmt,
    habitRows, budgetRows, cutRows, overRows, eventRows,
    overCount, overTotalFmt,
    budgetTotalRatio, budgetTotalUsedFmt, budgetTotalCapFmt,
    habitSaveFmt: fmt(habitSave),
    addCategoryOpen: s.addCategoryOpen,
    openAddCategory: () => setState({ addCategoryOpen: true }), closeAddCategory: () => setState({ addCategoryOpen: false }),
    formCategoryName: s.formCategoryName, formCategoryCap: s.formCategoryCap,
    onFormCategoryName: (e: React.ChangeEvent<HTMLInputElement>) => setState({ formCategoryName: e.target.value }),
    onFormCategoryCap: (e: React.ChangeEvent<HTMLInputElement>) => setState({ formCategoryCap: +e.target.value }),
    formCategoryValid: !!s.formCategoryName.trim() && (+s.formCategoryCap || 0) > 0,
    formCategoryError: !s.formCategoryName.trim() ? 'カテゴリ名を入力してください' : '目標金額を入力してください',
    addCategory: () => {
      const cap = +s.formCategoryCap || 0;
      if (!s.formCategoryName.trim() || cap <= 0) return;
      const nc = { id: 'cat-' + s.budgetCategories.length + '-' + Math.random().toString(36).slice(2, 7), name: s.formCategoryName.trim(), cap, group: 'variable' as const };
      setState((st) => ({ budgetCategories: st.budgetCategories.concat([nc]), addCategoryOpen: false, formCategoryName: '' }));
    },
    viewMonth: vm, viewMonthLabel: monthLabel(vm), goPrevMonth, goNextMonth, goCurrentMonth,
    canGoNext, isCurrentMonth: vm === currentRealMonth,
    isBudgetTab: s.budgetTab === 'budget', isLifeEventTab: s.budgetTab === 'lifeEvent',
    setBudgetTab: () => setState({ budgetTab: 'budget' }), setLifeEventTab: () => setState({ budgetTab: 'lifeEvent' }),
    /* 支出タブは UI 上は2つ。expTab の4値のうち fixed/cash を代表値として書き込む。 */
    isBreakdownTab, isCashOtherTab,
    setBreakdownTab: () => setState({ expTab: 'fixed' }),
    setCashOtherTab: () => setState({ expTab: 'cash' }),
    expenseAdjustNote,
    rawSpendFmt: fmt(rawSpend), realSpendFmt: fmt(realSpend), usedRealFmt: fmt(usedReal),
    savingsGoal, savingsGoalFmt: fmt(savingsGoal), savingsGoalPct, savingsGoalRatio, savingsGoalMsg, savingsGoalColor,
    onSavingsGoal: (e: React.ChangeEvent<HTMLInputElement>) => setState({ savingsGoal: +e.target.value }),
    previewSavingsGoal: (goalVal: number) => {
      const g = goalVal - surplus;
      return {
        goalFmt: fmt(goalVal),
        pct: Math.min(100, Math.max(0, (surplus / Math.max(1, goalVal)) * 100)) + '%',
        msg: g > 0 ? '目標まであと ' + fmt(g) + '円' : '目標を ' + fmt(-g) + '円 上回っています',
        color: g > 0 ? 'var(--amber)' : 'var(--green)',
      };
    },
    spendGoal, spendGoalFmt: fmt(spendGoal), spendGoalPct, spendGoalRatio, spendGoalMsg, spendGoalColor,
    onSpendGoal: (e: React.ChangeEvent<HTMLInputElement>) => setState({ spendGoal: +e.target.value }),
    previewSpendGoal: (goalVal: number) => {
      const over = realSpend > goalVal;
      const g = realSpend - goalVal;
      return {
        goalFmt: fmt(goalVal),
        pct: Math.min(100, (realSpend / goalVal) * 100) + '%',
        msg: over ? '目標より ' + fmt(g) + '円 超過' : 'あと ' + fmt(-g) + '円 の余裕',
        color: over ? 'var(--red)' : 'var(--green)',
      };
    },
    transferRows, transferCount: monthTransfers.length, transferTotalFmt: fmt(transferTotal),
    addTransferOpen: s.addTransferOpen,
    openAddTransfer: () => setState({ addTransferOpen: true }), closeAddTransfer: () => setState({ addTransferOpen: false }),
    formTransferName: s.formTransferName, formTransferAmount: s.formTransferAmount, formTransferNote: s.formTransferNote,
    formTransferIsNisa: s.formTransferIsNisa,
    onFormTransferName: (e: React.ChangeEvent<HTMLInputElement>) => setState({ formTransferName: e.target.value }),
    onFormTransferAmount: (e: React.ChangeEvent<HTMLInputElement>) => setState({ formTransferAmount: +e.target.value }),
    onFormTransferNote: (e: React.ChangeEvent<HTMLInputElement>) => setState({ formTransferNote: e.target.value }),
    toggleFormTransferIsNisa: () => setState({ formTransferIsNisa: !s.formTransferIsNisa }),
    formTransferValid: !!s.formTransferName.trim() && (+s.formTransferAmount || 0) > 0,
    formTransferError: !s.formTransferName.trim() ? '内容を入力してください' : '金額を入力してください',
    addTransfer: () => {
      const amt = +s.formTransferAmount || 0;
      if (!s.formTransferName.trim() || amt <= 0) return;
      const nt = {
        id: 'transfer-' + monthTransfers.length + '-' + Math.random().toString(36).slice(2, 7),
        name: s.formTransferName.trim(), note: s.formTransferNote.trim() || '資産の移動・支出ではない', amount: amt,
        taxAdvantaged: !!s.formTransferIsNisa,
      };
      setState((st) => {
        const tbm = { ...st.transfersByMonth };
        tbm[vm] = (tbm[vm] || []).concat([nt]);
        return { transfersByMonth: tbm, addTransferOpen: false, formTransferName: '', formTransferNote: '', formTransferIsNisa: false };
      });
    },
    cashRows, cashCount: monthCash.length, cashTotalFmt: fmt(cashTotal),
    addCashOpen: s.addCashOpen,
    openAddCash: () => setState({ addCashOpen: true, formCashDate: isoDate(new Date()) }), closeAddCash: () => setState({ addCashOpen: false }),
    formCashName: s.formCashName, formCashAmount: s.formCashAmount, formCashNote: s.formCashNote, formCashDate: s.formCashDate,
    onFormCashName: (e: React.ChangeEvent<HTMLInputElement>) => setState({ formCashName: e.target.value }),
    onFormCashAmount: (e: React.ChangeEvent<HTMLInputElement>) => setState({ formCashAmount: +e.target.value }),
    onFormCashNote: (e: React.ChangeEvent<HTMLInputElement>) => setState({ formCashNote: e.target.value }),
    onFormCashDate: (e: React.ChangeEvent<HTMLInputElement>) => setState({ formCashDate: e.target.value }),
    formCashValid: !!s.formCashName.trim() && (+s.formCashAmount || 0) > 0,
    formCashError: !s.formCashName.trim() ? '内容を入力してください' : '金額を入力してください',
    addCash: () => {
      const amt = +s.formCashAmount || 0;
      if (!s.formCashName.trim() || amt <= 0) return;
      const nc = {
        id: 'cash-' + monthCash.length + '-' + Math.random().toString(36).slice(2, 7),
        name: s.formCashName.trim(), note: s.formCashNote.trim() || '現金払い・カード明細に含まれない', amount: amt,
        date: s.formCashDate || isoDate(new Date()),
      };
      setState((st) => {
        const cbm = { ...st.cashExpensesByMonth };
        cbm[vm] = (cbm[vm] || []).concat([nc]);
        return { cashExpensesByMonth: cbm, addCashOpen: false, formCashName: '', formCashNote: '' };
      });
    },
    cashRecurringRows, cashRecurringCount: s.cashRecurring.length, pendingRecurringCount: pendingRecurring.length,
    registerAllRecurring: () => {
      setState((st) => {
        const cbm = { ...st.cashExpensesByMonth };
        const list = cbm[vm] || [];
        const existingIds = list.filter((c) => c.recurringId).map((c) => c.recurringId);
        const today = isoDate(new Date());
        const toAdd = st.cashRecurring
          .filter((r) => existingIds.indexOf(r.id) === -1)
          .map((r) => ({
            id: 'cash-r-' + r.id + '-' + Math.random().toString(36).slice(2, 7),
            name: r.name, note: r.note || '固定支出パターンから登録', amount: r.amount, date: today, recurringId: r.id,
          }));
        if (toAdd.length === 0) return {};
        cbm[vm] = list.concat(toAdd);
        return { cashExpensesByMonth: cbm };
      });
    },
    addRecurringCashOpen: s.addRecurringCashOpen,
    openAddRecurringCash: () => setState({ addRecurringCashOpen: true }),
    closeAddRecurringCash: () => setState({ addRecurringCashOpen: false }),
    formRecurringCashName: s.formRecurringCashName, formRecurringCashAmount: s.formRecurringCashAmount, formRecurringCashNote: s.formRecurringCashNote,
    onFormRecurringCashName: (e: React.ChangeEvent<HTMLInputElement>) => setState({ formRecurringCashName: e.target.value }),
    onFormRecurringCashAmount: (e: React.ChangeEvent<HTMLInputElement>) => setState({ formRecurringCashAmount: +e.target.value }),
    onFormRecurringCashNote: (e: React.ChangeEvent<HTMLInputElement>) => setState({ formRecurringCashNote: e.target.value }),
    formRecurringCashValid: !!s.formRecurringCashName.trim() && (+s.formRecurringCashAmount || 0) > 0,
    formRecurringCashError: !s.formRecurringCashName.trim() ? '内容を入力してください' : '金額を入力してください',
    addRecurringCash: () => {
      const amt = +s.formRecurringCashAmount || 0;
      if (!s.formRecurringCashName.trim() || amt <= 0) return;
      const nr = {
        id: 'rec-' + s.cashRecurring.length + '-' + Math.random().toString(36).slice(2, 7),
        name: s.formRecurringCashName.trim(), amount: amt, note: s.formRecurringCashNote.trim(),
      };
      setState((st) => ({ cashRecurring: st.cashRecurring.concat([nr]), addRecurringCashOpen: false, formRecurringCashName: '', formRecurringCashNote: '' }));
    },
    invTarget: s.invTarget, invTargetFmt: fmt(s.invTarget),
    onInvTarget: (e: React.ChangeEvent<HTMLInputElement>) => setState({ invTarget: +e.target.value }),
    surplus, cutsTotal, cutsTotalFmt: fmt(cutsTotal),
    investGap: gap,
    gapColor: gap > 0 ? 'var(--red)' : 'var(--green)',
    gapLabel: gap > 0 ? fmt(gap) + '円' : '達成',
    investPct: Math.min(100, Math.max(0, ((surplus + cutsTotal) / s.invTarget) * 100)) + '%',
    investMsg: gap > 0
      ? '月' + fmt(gap) + '円の削減で、月' + fmt(s.invTarget) + '円の投資が実現します'
      : '月' + fmt(s.invTarget) + '円の投資が可能です・余力 ' + fmt(-gap) + '円',
    previewInvest: (target: number) => {
      const gp = target - surplus - cutsTotal;
      return {
        targetFmt: fmt(target),
        gapColor: gp > 0 ? 'var(--red)' : 'var(--green)',
        gapLabel: gp > 0 ? fmt(gp) + '円' : '達成',
        investPct: Math.min(100, Math.max(0, ((surplus + cutsTotal) / target) * 100)) + '%',
        investMsg: gp > 0
          ? '月' + fmt(gp) + '円の削減で、月' + fmt(target) + '円の投資が実現します'
          : '月' + fmt(target) + '円の投資が可能です・余力 ' + fmt(-gp) + '円',
      };
    },
    gross: s.gross, grossFmt: fmt(s.gross),
    onGross: (e: React.ChangeEvent<HTMLInputElement>) => setState({ gross: +e.target.value }),
    net: t.net,
    /** 控除内訳の生の数値（StackedBar のセグメント値用。表示はそれぞれの `*Fmt` を使う）。 */
    kenko: t.kenko, kosei: t.kousei, koyou: t.koyou, shotoku: t.shotoku, jumin: t.jumin,
    shakaiFmt: fmt(t.shakai), shotokuFmt: fmt(t.shotoku), juminFmt: fmt(t.jumin),
    kenkoFmt: fmt(t.kenko), koseiFmt: fmt(t.kousei), koyouFmt: fmt(t.koyou),
    shakaiPct: (t.shakai / s.gross) * 100 + '%', shotokuPct: (t.shotoku / s.gross) * 100 + '%', juminPct: (t.jumin / s.gross) * 100 + '%',
    kenkoPct: (t.kenko / s.gross) * 100 + '%', koseiPct: (t.kousei / s.gross) * 100 + '%', koyouPct: (t.koyou / s.gross) * 100 + '%',
    /** 額面から手取りへの控除合計（ヒーローの「額面◯円から −◯円」用）。 */
    deductionTotalFmt: fmt(s.gross - t.net),
    furusatoFmt: fmt(furusatoLimit), furusatoGiftValueFmt: fmt(furusatoGiftValue),
    idecoAnnualFmt: fmt(idecoAnnual), idecoFmt: fmt(idecoSaving),
    medicalPaidFmt: fmt(medicalPaid), medicalThresholdFmt: fmt(medicalThreshold), medicalGapFmt: fmt(medicalGap),
    medicalSavingFmt: fmt(medicalSaving), medicalOverThreshold,
    medicalPct: Math.min(100, (medicalPaid / medicalThreshold) * 100) + '%',
    nisaYearTotal, nisaLimitAnnual, medicalPaid, medicalThreshold,
    nisaYearTotalFmt: fmt(nisaYearTotal), nisaLimitFmt: fmt(nisaLimitAnnual), nisaRemainingFmt: fmt(nisaRemaining), nisaPct,
    dedTotalFmt: fmt(dedTotal),
    bonusRows, bonusAnnualNetFmt: fmt(bonusAnnualNet), monthBonusNetFmt: fmt(monthBonusNet), monthBonusNet,
    goSalarySettings: go('salarySettings'),
    goGoalSettings: go('goalSettings'),
    previewSalary: (grossVal: number) => {
      const tt = tax(grossVal);
      const furu = Math.round((grossVal * 12 * 0.012) / 1000) * 1000;
      const idecoSav = Math.round(idecoAnnual * (tt.marginalRate + 0.10));
      const medExcess = Math.max(0, medicalPaid - medicalThreshold);
      const medSav = Math.round(medExcess * (tt.marginalRate + 0.10));
      return {
        grossFmt: fmt(grossVal), netFmt: fmt(tt.net),
        shakaiFmt: fmt(tt.shakai), shotokuFmt: fmt(tt.shotoku), juminFmt: fmt(tt.jumin),
        kenkoFmt: fmt(tt.kenko), koseiFmt: fmt(tt.kousei), koyouFmt: fmt(tt.koyou),
        shakaiPct: (tt.shakai / grossVal) * 100 + '%', shotokuPct: (tt.shotoku / grossVal) * 100 + '%', juminPct: (tt.jumin / grossVal) * 100 + '%',
        kenkoPct: (tt.kenko / grossVal) * 100 + '%', koseiPct: (tt.kousei / grossVal) * 100 + '%', koyouPct: (tt.koyou / grossVal) * 100 + '%',
        furusatoFmt: fmt(furu), furusatoGiftValueFmt: fmt(Math.round(furu * 0.3)),
        idecoFmt: fmt(idecoSav), medicalSavingFmt: fmt(medSav), dedTotalFmt: fmt(idecoSav + medSav),
      };
    },
  };
}

export type Computed = ReturnType<typeof useComputed>;
