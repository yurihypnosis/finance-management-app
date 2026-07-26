export interface Bonus { id: string; label: string; month: number; amount: number }
export interface BudgetCategory { id: string; name: string; cap: number; group: 'fixed' | 'variable' }
export interface Habit { id: string; name: string; freq: string; month: number }
/** cancelledMonth: 解約月 "YYYY-MM"。未設定なら契約中。当月なら今月分までシミュレーションに反映、前月以前なら反映しない。 */
export interface Sub { id: string; name: string; price: number; usage: 'high' | 'mid' | 'low' | 'none'; cycle: 'monthly' | 'annual'; cancelledMonth?: string }
/** startMonth: 積立開始月 "YYYY-MM"。未設定は今月扱い。monthly は開始月〜時期の月数で target を按分した値。 */
export interface LifeEvent { name: string; when: string; currency: string; target: number; saved: number; monthly: number; startMonth?: string }
export interface Transfer { id: string; name: string; note: string; amount: number; taxAdvantaged?: boolean }
export interface CashExpense { id: string; name: string; note: string; amount: number; date: string; recurringId?: string }
export interface CashRecurring { id: string; name: string; amount: number; note: string }

export type Screen =
  | 'home' | 'expense' | 'habit' | 'budget' | 'report' | 'annual' | 'invest'
  | 'salary' | 'salarySettings' | 'goalSettings';

export interface AppState {
  screen: Screen;
  menuOpen: boolean;
  expTab: 'fixed' | 'variable' | 'transfer' | 'cash';
  budgetTab: 'budget' | 'lifeEvent';
  invTarget: number;
  cuts: Record<string, boolean>;
  habitsOff: Record<string, boolean>;
  gross: number;
  savingsGoal: number;
  spendGoal: number;
  bonuses: Bonus[];
  viewMonth: string;
  addCategoryOpen: boolean;
  formCategoryName: string;
  formCategoryCap: number;
  budgetCategories: BudgetCategory[];
  budgetActuals: Record<string, Record<string, number>>;
  dbLoaded: boolean;
  transfersByMonth: Record<string, Transfer[]>;
  habitTab: 'habit' | 'sub';
  addOpen: boolean;
  formName: string;
  formTimes: number;
  formAmount: number;
  habits: Habit[];
  subs: Sub[];
  /** ユーザーが削除したサブスクのid。カード明細からの再構築時に復活させないための控え。 */
  deletedSubIds: string[];
  addEventOpen: boolean;
  evName: string;
  evWhen: string;
  evStart: string;
  evAmount: number;
  evCurrency: string;
  evMonths: number;
  events: LifeEvent[];
  addTransferOpen: boolean;
  formTransferName: string;
  formTransferAmount: number;
  formTransferNote: string;
  formTransferIsNisa: boolean;
  addCashOpen: boolean;
  formCashName: string;
  formCashAmount: number;
  formCashNote: string;
  formCashDate: string;
  cashExpensesByMonth: Record<string, CashExpense[]>;
  addRecurringCashOpen: boolean;
  formRecurringCashName: string;
  formRecurringCashAmount: number;
  formRecurringCashNote: string;
  cashRecurring: CashRecurring[];
}

export function defaultState(monthKeyFn: (d: Date) => string, isoDateFn: (d: Date) => string): AppState {
  const cm = monthKeyFn(new Date());
  return {
    screen: 'home', menuOpen: false, expTab: 'fixed', budgetTab: 'budget', invTarget: 80000, cuts: {}, habitsOff: {}, gross: 400000,
    savingsGoal: 100000, spendGoal: 250000,
    bonuses: [
      { id: 'b1', label: '夏のボーナス', month: 6, amount: 300000 },
      { id: 'b2', label: '冬のボーナス', month: 12, amount: 300000 },
    ],
    viewMonth: cm,
    addCategoryOpen: false, formCategoryName: '', formCategoryCap: 10000,
    budgetCategories: [
      { id: 'rent', name: '家賃', cap: 100000, group: 'fixed' },
      { id: 'parking', name: '駐車場', cap: 10000, group: 'fixed' },
      { id: 'utility', name: '光熱・水道', cap: 15000, group: 'fixed' },
      { id: 'telecom', name: '通信', cap: 8000, group: 'fixed' },
      { id: 'insurance', name: '保険', cap: 10000, group: 'fixed' },
      { id: 'sub', name: 'サブスク', cap: 10000, group: 'fixed' },
      { id: 'food', name: '食費・外食', cap: 40000, group: 'variable' },
      { id: 'shopping', name: '買い物', cap: 15000, group: 'variable' },
      { id: 'etc', name: 'ETC・高速', cap: 10000, group: 'variable' },
      { id: 'suica', name: 'Suicaチャージ', cap: 10000, group: 'variable' },
      { id: 'movie', name: '映画・娯楽', cap: 8000, group: 'variable' },
      { id: 'medical', name: '医療', cap: 5000, group: 'variable' },
      { id: 'other', name: 'その他', cap: 10000, group: 'variable' },
    ],
    budgetActuals: {},
    dbLoaded: false,
    transfersByMonth: {},
    habitTab: 'habit', addOpen: false, formName: '', formTimes: 3, formAmount: 500,
    habits: [
      { id: 'cafe', name: 'カフェ通い', freq: '週3回 × 600円', month: 7200 },
      { id: 'taxi', name: 'タクシー利用', freq: '週2回 × 1,500円', month: 12000 },
      { id: 'delivery', name: 'デリバリー利用', freq: '週2回 × 2,000円', month: 16000 },
    ],
    subs: [
      { id: 'sub1', name: '動画配信サービス', price: 1490, usage: 'high', cycle: 'monthly' },
      { id: 'sub2', name: 'クラウドストレージ', price: 1300, usage: 'mid', cycle: 'monthly' },
      { id: 'sub3', name: '学習アプリ', price: 2980, usage: 'low', cycle: 'monthly' },
      { id: 'sub4', name: '音楽配信', price: 980, usage: 'mid', cycle: 'monthly' },
      { id: 'sub5', name: 'ジム会員', price: 8000, usage: 'low', cycle: 'monthly' },
      { id: 'sub6', name: '雑誌読み放題', price: 500, usage: 'none', cycle: 'monthly' },
    ],
    deletedSubIds: [],
    addEventOpen: false, evName: '', evWhen: '', evStart: '', evAmount: 2000, evCurrency: 'USD', evMonths: 12,
    events: [
      { name: '旅行A', when: '2026年10月', currency: 'JPY', target: 150000, saved: 60000, monthly: 15000 },
      { name: '旅行B', when: '2027年6月', currency: 'USD', target: 1500, saved: 300, monthly: 100 },
      { name: '車検', when: '2027年3月', currency: 'JPY', target: 100000, saved: 30000, monthly: 8000 },
    ],
    addTransferOpen: false, formTransferName: '', formTransferAmount: 5000, formTransferNote: '', formTransferIsNisa: false,
    addCashOpen: false, formCashName: '', formCashAmount: 1000, formCashNote: '', formCashDate: isoDateFn(new Date()),
    cashExpensesByMonth: {},
    addRecurringCashOpen: false, formRecurringCashName: '', formRecurringCashAmount: 1000, formRecurringCashNote: '',
    cashRecurring: [],
  };
}
