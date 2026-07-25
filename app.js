'use strict';

/* ---------- tiny DOM builder ---------- */
function h(tag, attrs, children) {
  const el = document.createElement(tag);
  attrs = attrs || {};
  for (const k in attrs) {
    const v = attrs[k];
    if (v === undefined || v === null || v === false) continue;
    if (k === 'style') Object.assign(el.style, v);
    else if (k === 'class') el.className = v;
    else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k in el) { try { el[k] = v; } catch (e) { el.setAttribute(k, v); } }
    else el.setAttribute(k, v);
  }
  (children === undefined || children === null ? [] : Array.isArray(children) ? children : [children])
    .forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    });
  if (tag === 'select' && attrs.value !== undefined) el.value = attrs.value;
  return el;
}

const STORAGE_KEY = 'kakeibo-app-v2-state';

/* ---------- month helpers ---------- */
function monthKey(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
function shiftMonthKey(key, delta) {
  const parts = key.split('-');
  const y = +parts[0], m = +parts[1] - 1 + delta;
  const d = new Date(y, m, 1);
  return monthKey(d);
}
function monthLabel(key) {
  const parts = key.split('-');
  return +parts[0] + '年' + (+parts[1]) + '月';
}
function isoDate(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function dateShortLabel(iso) {
  if (!iso) return '';
  const parts = iso.split('-');
  return +parts[1] + '/' + +parts[2];
}

/* ---------- default state ---------- */
function defaultState() {
  const cm = monthKey(new Date());
  return {
    screen: 'home', menuOpen: false, expTab: 'fixed', invTarget: 80000, cuts: {}, habitsOff: {}, gross: 400000,
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
    addEventOpen: false, evName: '', evWhen: '', evAmount: 2000, evCurrency: 'USD', evMonths: 12,
    events: [
      { name: '旅行A', when: '2026年10月', currency: 'JPY', target: 150000, saved: 60000, monthly: 15000 },
      { name: '旅行B', when: '2027年6月', currency: 'USD', target: 1500, saved: 300, monthly: 100 },
      { name: '車検', when: '2027年3月', currency: 'JPY', target: 100000, saved: 30000, monthly: 8000 },
    ],
    addTransferOpen: false, formTransferName: '', formTransferAmount: 5000, formTransferNote: '', formTransferIsNisa: false,
    addCashOpen: false, formCashName: '', formCashAmount: 1000, formCashNote: '', formCashDate: isoDate(new Date()),
    cashExpensesByMonth: {},
    addRecurringCashOpen: false, formRecurringCashName: '', formRecurringCashAmount: 1000, formRecurringCashNote: '',
    cashRecurring: [],
  };
}


/* ---------- Supabase: auth + per-user cloud state ---------- */
const SUPABASE_URL = 'https://cgyhdxbhlfgkduybfgva.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_85rJkuoUtKo7trOaRPNr2Q_p2DAfJLN';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let session = null; // the logged-in Supabase auth session, or null while signed out
let state = null;   // app state; only populated once a user is authenticated and loaded

function userStorageKey() { return STORAGE_KEY + ':' + session.user.id; }

let pendingSyncTimer = null;
function flushSync() {
  if (pendingSyncTimer) { clearTimeout(pendingSyncTimer); pendingSyncTimer = null; }
  if (!session) return;
  sb.from('user_state').upsert({ user_id: session.user.id, data: state, updated_at: new Date().toISOString() })
    .then(function (res) { if (res.error) console.error('状態の保存に失敗しました', res.error); });
}
function scheduleSync() {
  if (!session) return;
  if (pendingSyncTimer) clearTimeout(pendingSyncTimer);
  pendingSyncTimer = setTimeout(flushSync, 800);
}
// Best-effort: if the tab is closed/navigated away while a sync is still
// debouncing, flush immediately instead of losing the last ~800ms of edits.
window.addEventListener('pagehide', function () { if (pendingSyncTimer) flushSync(); });
window.addEventListener('visibilitychange', function () {
  if (document.visibilityState === 'hidden' && pendingSyncTimer) flushSync();
});

function setState(patch) {
  const next = typeof patch === 'function' ? patch(state) : patch;
  state = Object.assign({}, state, next);
  try { localStorage.setItem(userStorageKey(), JSON.stringify(state)); } catch (e) {}
  scheduleSync();
  render();
}

// Card statements use full-width (zenkaku) Latin letters/punctuation/spaces
// ('ＣＬＡＵＤＥ', '．', '　'); normalize to half-width before keyword matching.
function toHalfWidth(str) {
  return str
    .replace(/[！-～]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); })
    .replace(/　/g, ' ');
}

/* Map a raw card-statement merchant string to a stable id + clean display
   name (+ billing cycle), so real recurring charges (Claude, Google One,
   Udemy, ...) show up by name instead of generic placeholders. */
const SUB_NAME_RULES = [
  [/claude|anthropic/i, 'claude', 'Claude', 'monthly'],
  [/google.*one/i, 'google-one', 'Google One', 'monthly'],
  [/suno/i, 'suno', 'Suno', 'monthly'],
  [/udemy/i, 'udemy', 'Udemy', 'monthly'],
  [/midjourney/i, 'midjourney', 'Midjourney', 'monthly'],
  [/educative/i, 'educative', 'Educative', 'monthly'],
  [/paddle.*speak/i, 'speak', 'Speak', 'monthly'],
  [/cursor/i, 'cursor', 'Cursor', 'monthly'],
  [/pdfguru/i, 'pdfguru', 'PDFGuru', 'monthly'],
  [/uber.*one/i, 'uber-one', 'Uber One', 'monthly'],
  [/jal.*club.*est/i, 'jal-club-est', 'JAL CLUB EST', 'annual'],
  [/jalカード年会費|jal.*card.*fee/i, 'jal-card', 'JALカード', 'annual'],
  [/ツアープレミアム/, 'jal-tour-premium', 'JALツアープレミアム', 'annual'],
  [/toho.*one/i, 'toho-one', 'TOHO-ONE', 'annual'],
  [/ご利用代金明細書交付手数料/, 'statement-fee', '利用明細発行手数料', 'monthly'],
];
function canonicalSubName(rawMerchant) {
  const merchant = toHalfWidth(rawMerchant).trim();
  for (const rule of SUB_NAME_RULES) if (rule[0].test(merchant)) return { id: rule[1], name: rule[2], cycle: rule[3] };
  const id = 'sub-' + merchant.toLowerCase().replace(/[^a-z0-9ぁ-んァ-ン一-龠]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  const isAnnual = /年会費|年間登録/.test(merchant);
  return { id: id || 'sub-other', name: merchant, cycle: isAnnual ? 'annual' : 'monthly' };
}

function loadCardTransactions() {
  sb.from('card_transactions').select('statement_month,amount,category_id,merchant').eq('user_id', session.user.id)
    .then(function (res) {
      if (res.error) throw res.error;
      const byMonth = {};
      const subTxByMonth = {}; // id -> { name, cycle, byMonth: { month: amount } }
      res.data.forEach(function (r) {
        const m = byMonth[r.statement_month] || (byMonth[r.statement_month] = {});
        m[r.category_id] = (m[r.category_id] || 0) + Number(r.amount);
        if (r.category_id === 'sub') {
          const c = canonicalSubName(r.merchant);
          const entry = subTxByMonth[c.id] || (subTxByMonth[c.id] = { name: c.name, cycle: c.cycle, byMonth: {} });
          entry.byMonth[r.statement_month] = (entry.byMonth[r.statement_month] || 0) + Number(r.amount);
        }
      });

      const derivedSubs = Object.keys(subTxByMonth).map(function (id) {
        const entry = subTxByMonth[id];
        const months = Object.keys(entry.byMonth).sort();
        const latestMonth = months[months.length - 1];
        return { id: id, name: entry.name, price: Math.round(entry.byMonth[latestMonth]), cycle: entry.cycle };
      });

      setState(function (st) {
        const ba = Object.assign({}, st.budgetActuals);
        Object.keys(byMonth).forEach(function (mk) {
          // Fill in categories with no recorded value yet; never clobber an
          // existing value (e.g. one the user already typed into the budget
          // screen), or a manual edit would be silently reverted on every reload.
          const existing = ba[mk] || {};
          const merged = Object.assign({}, existing);
          Object.keys(byMonth[mk]).forEach(function (catId) {
            if (merged[catId] === undefined) merged[catId] = byMonth[mk][catId];
          });
          ba[mk] = merged;
        });

        // Real imported subscriptions replace the generic starter placeholders,
        // but keep whatever usage classification the user already set for a
        // subscription that's still present (matched by its stable id).
        let subs = st.subs;
        if (derivedSubs.length > 0) {
          const prevById = {};
          st.subs.forEach(function (s) { prevById[s.id] = s; });
          subs = derivedSubs.map(function (d) {
            const prev = prevById[d.id];
            return { id: d.id, name: d.name, price: d.price, cycle: d.cycle, usage: prev ? prev.usage : 'mid' };
          });
        }

        return { budgetActuals: ba, subs: subs, dbLoaded: true };
      });
    })
    .catch(function (e) { console.error('カード明細の取得に失敗しました', e); });
}

/* ---------- auth screen ---------- */
let authState = { mode: 'login', email: '', password: '', error: '', loading: false };
function setAuthState(patch) { authState = Object.assign({}, authState, patch); renderAuth(); }

function renderAuth() {
  const active = document.activeElement;
  const field = active && contentEl.contains(active) ? active.getAttribute('data-field') : null;
  const selStart = field && 'selectionStart' in active ? active.selectionStart : null;
  const selEnd = field && 'selectionEnd' in active ? active.selectionEnd : null;

  const a = authState;
  const isSignup = a.mode === 'signup';
  function translateAuthError(message) {
    const rules = [
      [/invalid login credentials/i, 'メールアドレスまたはパスワードが正しくありません'],
      [/already registered|already exists/i, 'このメールアドレスはすでに登録されています'],
      [/password.*at least|password.*short|weak password/i, 'パスワードは6文字以上で入力してください'],
      [/invalid email|unable to validate email/i, 'メールアドレスの形式が正しくありません'],
      [/rate limit|too many requests/i, '試行回数が多すぎます。しばらく待ってから再度お試しください'],
      [/network/i, 'ネットワークエラーが発生しました。接続を確認してください'],
    ];
    for (const r of rules) if (r[0].test(message)) return r[1];
    return message;
  }
  function submit() {
    if (!a.email.trim() || !a.password) { setAuthState({ error: 'メールアドレスとパスワードを入力してください' }); return; }
    setAuthState({ loading: true, error: '' });
    const call = isSignup
      ? sb.auth.signUp({ email: a.email.trim(), password: a.password })
      : sb.auth.signInWithPassword({ email: a.email.trim(), password: a.password });
    call.then(function (res) {
      if (res.error) { setAuthState({ loading: false, error: translateAuthError(res.error.message) }); return; }
      if (!res.data.session) { setAuthState({ loading: false, error: 'メールの確認が必要です。管理者に確認してください' }); return; }
      setAuthState({ loading: false, error: '' });
      enterApp(res.data.session);
    });
  }
  const view = h('div', { style: { padding: '40px 24px', maxWidth: '360px', margin: '0 auto' } }, [
    h('div', { class: 'topbar-title', style: { textAlign: 'center', marginBottom: '8px' } }, 'KAKEIBO'),
    h('div', { class: 'screen-sub', style: { textAlign: 'center', marginBottom: '28px' } }, isSignup ? '新規登録' : 'ログイン'),
    h('div', { style: { display: 'flex', flexDirection: 'column', gap: '16px' } }, [
      h('div', {}, [
        h('span', { class: 'field-label' }, 'メールアドレス'),
        h('input', {
          class: 'field-input', type: 'email', value: a.email, autocomplete: 'email', 'data-field': 'authEmail',
          oninput: function (e) { setAuthState({ email: e.target.value }); },
        }),
      ]),
      h('div', {}, [
        h('span', { class: 'field-label' }, 'パスワード（6文字以上）'),
        h('input', {
          class: 'field-input', type: 'password', value: a.password, autocomplete: isSignup ? 'new-password' : 'current-password',
          'data-field': 'authPassword',
          oninput: function (e) { setAuthState({ password: e.target.value }); },
          onkeydown: function (e) { if (e.key === 'Enter') submit(); },
        }),
      ]),
      a.error ? h('div', { style: { fontSize: '12px', color: 'var(--red)' } }, a.error) : null,
      h('div', { class: 'btn-primary', style: { textAlign: 'center' }, onclick: a.loading ? null : submit }, a.loading ? '処理中…' : (isSignup ? '登録する' : 'ログイン')),
      h('div', {
        class: 'link-quiet', style: { textAlign: 'center', margin: '4px auto 0 auto' },
        onclick: function () { setAuthState({ mode: isSignup ? 'login' : 'signup', error: '' }); },
      }, isSignup ? 'アカウントをお持ちの方はこちら' : 'はじめての方はこちら（新規登録）'),
    ]),
  ]);
  contentEl.innerHTML = '';
  contentEl.appendChild(view);
  topbarEl.innerHTML = '';
  menuEl.innerHTML = '';

  if (field) {
    const next = contentEl.querySelector('[data-field="' + field + '"]');
    if (next) {
      next.focus();
      if (selStart !== null && selEnd !== null && 'setSelectionRange' in next) {
        try { next.setSelectionRange(selStart, selEnd); } catch (e) { /* not supported for this input type */ }
      }
    }
  }
}

/* ---------- app bootstrap ---------- */
function enterApp(sess) {
  session = sess;
  let cached = null;
  try { cached = JSON.parse(localStorage.getItem(userStorageKey())); } catch (e) { /* no local cache */ }
  sb.from('user_state').select('data').eq('user_id', sess.user.id).maybeSingle()
    .then(function (res) {
      if (res.error) throw res.error;
      state = Object.assign(defaultState(), cached, res.data && res.data.data ? res.data.data : {});
      render();
      loadCardTransactions();
    })
    .catch(function (e) {
      // A failed read must never fall back to blank defaults here: the next
      // mutation would sync that empty state to Supabase and overwrite the
      // user's real saved data. Fall back to the last-known local cache instead.
      console.error('ユーザーデータの読み込みに失敗しました', e);
      state = Object.assign(defaultState(), cached);
      render();
      loadCardTransactions();
    });
}

function signOut() {
  sb.auth.signOut().then(function () { window.location.reload(); });
}

function boot() {
  sb.auth.getSession().then(function (res) {
    if (res.data.session) enterApp(res.data.session);
    else renderAuth();
  });
}

/* ---------- domain constants / helpers ---------- */
const RATES = { JPY: 1, USD: 157.2, EUR: 170.4 };
const SYM = { JPY: '', USD: '$', EUR: '€' };
const COACH_ON = true;

function fmt(n) { return Math.round(n).toLocaleString('ja-JP'); }

/* ---------- basic stats helpers ---------- */
function mean(arr) { return arr.length === 0 ? 0 : arr.reduce(function (a, b) { return a + b; }, 0) / arr.length; }
function stdev(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const variance = arr.reduce(function (a, b) { return a + (b - m) * (b - m); }, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}
const Z80 = 1.2816; /* 80%信頼区間のz値 */

/* ---------- subscription billing-cycle helpers ---------- */
function subMonthly(sub) { return sub.cycle === 'annual' ? sub.price / 12 : sub.price; }
function subAnnual(sub) { return sub.cycle === 'annual' ? sub.price : sub.price * 12; }

/* employee-side rates (協会けんぽ全国平均・厚生年金・雇用保険一般の目安。介護保険は40歳未満想定で除く) */
const KENKO_HOKEN_RATE = 0.0495;
const KOSEI_NENKIN_RATE = 0.0915;
const KOSEI_NENKIN_CAP_BASE = 650000; /* 標準報酬月額の上限（簡易モデル） */
const KOYOU_HOKEN_RATE = 0.006;
const BONUS_KOSEI_NENKIN_CAP_BASE = 1500000; /* 賞与ごとの厚生年金上限（簡易モデル） */

function shakaiHoken(gross) {
  const kenko = Math.round(gross * KENKO_HOKEN_RATE);
  const kousei = Math.round(Math.min(gross, KOSEI_NENKIN_CAP_BASE) * KOSEI_NENKIN_RATE);
  const koyou = Math.round(gross * KOYOU_HOKEN_RATE);
  return { kenko: kenko, kousei: kousei, koyou: koyou, total: kenko + kousei + koyou };
}

function tax(gross) {
  const annual = gross * 12;
  const sh = shakaiHoken(gross);
  const shakai = sh.total;
  let ded;
  if (annual <= 1625000) ded = 550000;
  else if (annual <= 1800000) ded = annual * 0.4 - 100000;
  else if (annual <= 3600000) ded = annual * 0.3 + 80000;
  else if (annual <= 6600000) ded = annual * 0.2 + 440000;
  else if (annual <= 8500000) ded = annual * 0.1 + 1100000;
  else ded = 1950000;
  const taxable = Math.max(0, annual - ded - shakai * 12 - 480000);
  const brackets = [
    [1950000, .05, 0], [3300000, .10, 97500], [6950000, .20, 427500],
    [9000000, .23, 636000], [18000000, .33, 1536000], [40000000, .40, 2796000],
    [Infinity, .45, 4796000],
  ];
  const b = brackets.find(function (x) { return taxable <= x[0]; });
  const shotoku = Math.round((taxable * b[1] - b[2]) * 1.021 / 12);
  const jumin = Math.round(taxable * 0.10 / 12);
  return {
    shakai: shakai, kenko: sh.kenko, kousei: sh.kousei, koyou: sh.koyou,
    shotoku: Math.max(0, shotoku), jumin: jumin, net: gross - shakai - Math.max(0, shotoku) - jumin,
    marginalRate: taxable > 0 ? b[1] : 0, annualTaxable: taxable,
  };
}

function bonusTax(bonusGross, marginalRate) {
  const kenko = Math.round(bonusGross * KENKO_HOKEN_RATE);
  const kousei = Math.round(Math.min(bonusGross, BONUS_KOSEI_NENKIN_CAP_BASE) * KOSEI_NENKIN_RATE);
  const koyou = Math.round(bonusGross * KOYOU_HOKEN_RATE);
  const shakai = kenko + kousei + koyou;
  const taxable = Math.max(0, bonusGross - shakai);
  const shotoku = Math.round(taxable * marginalRate * 1.021);
  return { shakai: shakai, kenko: kenko, kousei: kousei, koyou: koyou, shotoku: shotoku, net: bonusGross - shakai - shotoku };
}

/* ---------- derived values (mirrors original renderVals) ---------- */
function computeVals() {
  const s = state;
  const go = function (screen) { return function () { setState({ screen: screen, menuOpen: false }); }; };
  const t = tax(s.gross);

  const vm = s.viewMonth;
  const vmMonthNum = +vm.split('-')[1];
  const currentRealMonth = monthKey(new Date());
  const goPrevMonth = function () { setState({ viewMonth: shiftMonthKey(vm, -1) }); };
  const goNextMonth = function () { setState({ viewMonth: shiftMonthKey(vm, 1) }); };

  function setBonus(id, patch) {
    setState(function (st) {
      return { bonuses: st.bonuses.map(function (b) { return b.id === id ? Object.assign({}, b, patch) : b; }) };
    });
  }
  const bonusRows = s.bonuses.map(function (b) {
    const bt = bonusTax(b.amount, t.marginalRate);
    return {
      id: b.id, label: b.label, month: b.month, amount: b.amount,
      amountFmt: fmt(b.amount), shakaiFmt: fmt(bt.shakai), shotokuFmt: fmt(bt.shotoku), netFmt: fmt(bt.net), net: bt.net,
      kenkoFmt: fmt(bt.kenko), koseiFmt: fmt(bt.kousei), koyouFmt: fmt(bt.koyou),
      isThisMonth: b.month === vmMonthNum,
      onAmount: function (e) { setBonus(b.id, { amount: +e.target.value }); },
      onMonth: function (e) { setBonus(b.id, { month: +e.target.value }); },
    };
  });
  const bonusAnnualNet = bonusRows.reduce(function (a, b) { return a + b.net; }, 0);
  const monthBonusNet = bonusRows.filter(function (b) { return b.isThisMonth; }).reduce(function (a, b) { return a + b.net; }, 0);
  const goCurrentMonth = function () { setState({ viewMonth: currentRealMonth }); };
  const canGoNext = vm !== currentRealMonth;

  const monthActuals = s.budgetActuals[vm] || {};
  const rawSpend = Object.keys(monthActuals).reduce(function (a, k) { return a + (monthActuals[k] || 0); }, 0);
  const usedRaw = rawSpend;
  function setBudgetActual(catId, val) {
    setState(function (st) {
      const ba = Object.assign({}, st.budgetActuals);
      ba[vm] = Object.assign({}, ba[vm], {});
      ba[vm][catId] = val;
      return { budgetActuals: ba };
    });
  }
  const budgetRows = s.budgetCategories.map(function (b) {
    const used = monthActuals[b.id] || 0;
    const r = used / b.cap;
    return {
      id: b.id, name: b.name, used: used, cap: b.cap, usedFmt: fmt(used), capFmt: fmt(b.cap),
      pct: Math.min(100, r * 100) + '%', pctLabel: Math.round(r * 100) + '%',
      color: r > 1 ? 'var(--red)' : r > 0.85 ? 'var(--amber)' : 'var(--green)',
      gap: used - b.cap,
      onUsedChange: function (e) { setBudgetActual(b.id, Math.max(0, +e.target.value || 0)); },
      removeCategory: function () {
        setState(function (st) {
          const ba = {};
          Object.keys(st.budgetActuals).forEach(function (mk) {
            const monthVals = Object.assign({}, st.budgetActuals[mk]);
            delete monthVals[b.id];
            ba[mk] = monthVals;
          });
          return {
            budgetCategories: st.budgetCategories.filter(function (x) { return x.id !== b.id; }),
            budgetActuals: ba,
          };
        });
      },
    };
  });
  const overCategories = budgetRows.filter(function (b) { return b.gap > 0; }).sort(function (a, b) { return b.gap - a.gap; });
  const overRows = overCategories.slice(0, 3).map(function (o) {
    return {
      name: o.name, gapFmt: fmt(o.gap), barColor: 'var(--red)',
      ratio: o.usedFmt + ' / ' + o.capFmt,
      pct: Math.min(100, o.used / o.cap * 100) + '%',
      note: '予算を' + fmt(o.gap) + '円超過',
    };
  });
  const overCount = overCategories.length;
  const overTotalFmt = fmt(overCategories.reduce(function (a, o) { return a + o.gap; }, 0));

  const monthTransfers = s.transfersByMonth[vm] || [];
  const transferTotal = monthTransfers.reduce(function (a, tr) { return a + tr.amount; }, 0);
  const monthCash = s.cashExpensesByMonth[vm] || [];
  const cashTotal = monthCash.reduce(function (a, c) { return a + c.amount; }, 0);
  const realSpend = rawSpend - transferTotal + cashTotal;
  const usedReal = Math.max(0, usedRaw - transferTotal + cashTotal);
  const cashRowsSorted = monthCash.slice().sort(function (a, b) { return (a.date || '').localeCompare(b.date || ''); });
  const cashRows = cashRowsSorted.map(function (c) {
    return {
      id: c.id, name: c.name, note: c.note, amountFmt: fmt(c.amount), dateLabel: dateShortLabel(c.date),
      remove: function () {
        setState(function (st) {
          const cbm = Object.assign({}, st.cashExpensesByMonth);
          cbm[vm] = (cbm[vm] || []).filter(function (x) { return x.id !== c.id; });
          return { cashExpensesByMonth: cbm };
        });
      },
    };
  });
  /* ---- recurring cash-expense patterns (必ず発生する現金支出をまとめて登録) ---- */
  function addRecurringToMonth(r) {
    setState(function (st) {
      const cbm = Object.assign({}, st.cashExpensesByMonth);
      const list = cbm[vm] || [];
      if (list.some(function (c) { return c.recurringId === r.id; })) return {};
      const nc = {
        id: 'cash-r-' + r.id + '-' + Math.random().toString(36).slice(2, 7),
        name: r.name, note: r.note || '固定支出パターンから登録', amount: r.amount,
        date: isoDate(new Date()), recurringId: r.id,
      };
      cbm[vm] = list.concat([nc]);
      return { cashExpensesByMonth: cbm };
    });
  }
  const cashRecurringRows = s.cashRecurring.map(function (r) {
    const addedThisMonth = monthCash.some(function (c) { return c.recurringId === r.id; });
    return {
      id: r.id, name: r.name, note: r.note, amountFmt: fmt(r.amount), addedThisMonth: addedThisMonth,
      addOne: function () { addRecurringToMonth(r); },
      remove: function () { setState(function (st) { return { cashRecurring: st.cashRecurring.filter(function (x) { return x.id !== r.id; }) }; }); },
    };
  });
  const pendingRecurring = s.cashRecurring.filter(function (r) { return !monthCash.some(function (c) { return c.recurringId === r.id; }); });

  const habitDefs = s.habits;
  const habitSave = habitDefs.reduce(function (a, hb) { return a + (s.habitsOff[hb.id] ? hb.month : 0); }, 0);
  const surplus = t.net - realSpend + habitSave + monthBonusNet;

  const savingsGoal = s.savingsGoal;
  const savingsGoalGap = savingsGoal - surplus;
  const savingsGoalPct = Math.min(100, Math.max(0, surplus / Math.max(1, savingsGoal) * 100)) + '%';
  const savingsGoalMsg = savingsGoalGap > 0 ? ('目標まであと ' + fmt(savingsGoalGap) + '円') : ('目標を ' + fmt(-savingsGoalGap) + '円 上回っています');
  const savingsGoalColor = savingsGoalGap > 0 ? 'var(--amber)' : 'var(--green)';

  const spendGoal = s.spendGoal;
  const spendGoalGap = realSpend - spendGoal;
  const spendGoalOver = spendGoalGap > 0;
  const spendGoalPct = Math.min(100, realSpend / spendGoal * 100) + '%';
  const spendGoalMsg = spendGoalOver ? ('目標より ' + fmt(spendGoalGap) + '円 超過') : ('あと ' + fmt(-spendGoalGap) + '円 の余裕');
  const spendGoalColor = spendGoalOver ? 'var(--red)' : 'var(--green)';

  const transferRows = monthTransfers.map(function (tr) {
    return {
      id: tr.id, name: tr.name, note: tr.note, amountFmt: fmt(tr.amount), taxAdvantaged: !!tr.taxAdvantaged,
      remove: function () {
        setState(function (st) {
          const tbm = Object.assign({}, st.transfersByMonth);
          tbm[vm] = (tbm[vm] || []).filter(function (x) { return x.id !== tr.id; });
          return { transfersByMonth: tbm };
        });
      },
    };
  });

  const noneSubs = s.subs.filter(function (x) { return x.usage === 'none'; });
  const lowSubs = s.subs.filter(function (x) { return x.usage === 'low'; });
  const lowSubTotal = noneSubs.concat(lowSubs).reduce(function (a, x) { return a + subMonthly(x); }, 0);

  function subCycleNote(x) { return x.cycle === 'annual' ? ('年' + fmt(x.price) + '円（年払い）') : ('月' + fmt(x.price) + '円'); }
  const cutDefs = []
    .concat(noneSubs.map(function (x) {
      return { id: 'sub-' + x.id, label: x.name + ' を解約（未使用）', note: '全く使っていないサービス・' + subCycleNote(x), save: subMonthly(x) };
    }))
    .concat(lowSubs.map(function (x) {
      return { id: 'sub-' + x.id, label: x.name + ' を解約', note: '活用度: ほぼ無し・' + subCycleNote(x), save: subMonthly(x) };
    }))
    .concat(s.subs.filter(function (x) { return x.usage === 'mid'; }).map(function (x) {
      return { id: 'sub-' + x.id, label: x.name + ' を一時停止', note: '活用度: 低・利用月のみの契約も検討', save: subMonthly(x) };
    }))
    .concat(habitDefs.filter(function (hb) { return !s.habitsOff[hb.id]; }).map(function (hb) {
      return { id: 'habit-' + hb.id, label: hb.name + ' を減らす', note: hb.freq + '・月' + fmt(hb.month) + '円', save: Math.round(hb.month * 0.3) };
    }));

  const cutsTotal = cutDefs.reduce(function (a, c) { return a + (s.cuts[c.id] ? c.save : 0); }, 0);
  const gap = s.invTarget - surplus - cutsTotal;

  const cutRows = cutDefs.map(function (c) {
    const on = !!s.cuts[c.id];
    return {
      id: c.id, label: c.label, note: c.note, saveFmt: fmt(c.save), on: on,
      toggle: function () { setState(function (st) { const cuts = Object.assign({}, st.cuts); cuts[c.id] = !cuts[c.id]; return { cuts: cuts }; }); },
    };
  });

  const habitRows = habitDefs.map(function (hb) {
    const off = !!s.habitsOff[hb.id];
    return {
      id: hb.id, name: hb.name, freq: hb.freq, off: off,
      monthFmt: fmt(hb.month), yearFmt: fmt(hb.month * 12),
      msg: off ? ('中止すると年 ' + fmt(hb.month * 12) + '円の削減。投資プランに反映済み') : '継続中・明細から自動検出',
      toggle: function () { setState(function (st) { const ho = Object.assign({}, st.habitsOff); ho[hb.id] = !ho[hb.id]; return { habitsOff: ho }; }); },
      remove: function () { setState(function (st) { return { habits: st.habits.filter(function (x) { return x.id !== hb.id; }) }; }); },
    };
  });

  const fixed = s.expTab === 'fixed';

  const eventRows = s.events.map(function (ev) {
    const rate = RATES[ev.currency] || 1;
    const jpy = function (n) { return Math.round(n * rate); };
    const isFx = ev.currency !== 'JPY';
    return {
      name: ev.name, when: ev.when,
      progress: isFx
        ? (SYM[ev.currency] + fmt(ev.saved) + ' / ' + SYM[ev.currency] + fmt(ev.target))
        : ((ev.saved / 10000).toFixed(1) + ' / ' + (ev.target / 10000).toFixed(0) + '万'),
      monthly: isFx ? (SYM[ev.currency] + fmt(ev.monthly)) : ((ev.monthly / 10000).toFixed(1) + '万'),
      pct: Math.min(100, ev.saved / ev.target * 100) + '%',
      fxNote: isFx ? ('自動円換算: 目標 ≒ ' + fmt(jpy(ev.target)) + '円・月 ≒ ' + fmt(jpy(ev.monthly)) + '円（1 ' + ev.currency + ' = ' + rate.toFixed(1) + '円）') : '',
      barColor: isFx ? 'var(--muted2)' : 'var(--primary)',
    };
  });
  const eventMonthlyTotal = s.events.reduce(function (a, ev) { return a + ev.monthly * (RATES[ev.currency] || 1); }, 0);

  /* ---- annual expense simulation ---- */
  const subsAnnualTotal = s.subs.reduce(function (a, x) { return a + subAnnual(x); }, 0);
  const subsMonthly = subsAnnualTotal / 12;
  const habitsOnMonthly = habitDefs.reduce(function (a, hb) { return a + (s.habitsOff[hb.id] ? 0 : hb.month); }, 0);
  const recordedMonths = Object.keys(s.budgetActuals);
  function avgCategoryMonthly(catId) {
    const vals = recordedMonths
      .map(function (mk) { return s.budgetActuals[mk] ? s.budgetActuals[mk][catId] : undefined; })
      .filter(function (v) { return v !== undefined; });
    if (vals.length === 0) return null;
    return vals.reduce(function (a, b) { return a + b; }, 0) / vals.length;
  }
  const variableCats = s.budgetCategories.filter(function (b) { return b.group === 'variable'; });
  const fixedCats = s.budgetCategories.filter(function (b) { return b.group === 'fixed'; });
  const variableBudgetMonthly = variableCats.reduce(function (a, b) {
    const avg = avgCategoryMonthly(b.id);
    return a + (avg !== null ? avg : b.cap);
  }, 0);
  const variableBasedOnActuals = variableCats.some(function (b) { return avgCategoryMonthly(b.id) !== null; });
  const fixedCoreMonthly = fixedCats.filter(function (b) { return b.id !== 'sub'; }).reduce(function (a, b) {
    const avg = avgCategoryMonthly(b.id);
    return a + (avg !== null ? avg : b.cap);
  }, 0);

  /* ---- home screen: this month's take-home split into fixed / variable / remaining ---- */
  const homeFixedMonthly = fixedCoreMonthly + subsMonthly;
  const homeVariableMonthly = Math.max(0, realSpend - homeFixedMonthly);
  const homeBase = Math.max(1, t.net);
  const homeFixedPct = Math.min(100, homeFixedMonthly / homeBase * 100);
  const homeVariablePct = Math.min(100 - homeFixedPct, homeVariableMonthly / homeBase * 100);
  const homeRemainPct = Math.max(0, 100 - homeFixedPct - homeVariablePct);
  function manYen(n) { return (n / 10000).toFixed(1) + '万'; }

  function categoryDelta(catId, used) {
    const avg = avgCategoryMonthly(catId);
    if (avg === null) return { delta: 'まだ記録がありません', deltaColor: 'var(--muted2)' };
    const diff = used - avg;
    if (Math.abs(diff) < 1) return { delta: '平均並み', deltaColor: 'var(--muted2)' };
    return {
      delta: (diff > 0 ? '+' : '') + fmt(diff) + '円（平均比）',
      deltaColor: diff > 0 ? 'var(--red)' : 'var(--green)',
    };
  }
  function categoryRow(b) {
    const used = monthActuals[b.id] || 0;
    const d = categoryDelta(b.id, used);
    return { name: b.name, note: '目安 ' + fmt(b.cap) + '円', amount: used, delta: d.delta, deltaColor: d.deltaColor };
  }
  const expenseRows = (fixed ? fixedCats : variableCats).map(function (b) {
    const row = categoryRow(b);
    return Object.assign({}, row, { amountFmt: fmt(row.amount) });
  });

  const recordedCashMonths = Object.keys(s.cashExpensesByMonth);
  const cashMonthlyTotals = recordedCashMonths.map(function (mk) {
    return (s.cashExpensesByMonth[mk] || []).reduce(function (a, c) { return a + c.amount; }, 0);
  });
  const cashAvgMonthly = cashMonthlyTotals.length > 0 ? cashMonthlyTotals.reduce(function (a, b) { return a + b; }, 0) / cashMonthlyTotals.length : 0;

  const annualFixed = fixedCoreMonthly * 12;
  const annualSubs = subsAnnualTotal;
  const annualHabits = habitsOnMonthly * 12;
  const annualVariable = Math.round(variableBudgetMonthly * 12);
  const annualEvents = Math.round(eventMonthlyTotal * 12);
  const annualCash = Math.round(cashAvgMonthly * 12);
  const annualBreakdown = [
    { key: 'fixed', name: '固定費', monthly: fixedCoreMonthly, annual: annualFixed, note: '家賃・駐車場・光熱・通信・保険' },
    { key: 'subs', name: 'サブスク', monthly: subsMonthly, annual: annualSubs, note: s.subs.length + '件・現在の契約から算出' },
    { key: 'habits', name: '習慣（ONのみ）', monthly: habitsOnMonthly, annual: annualHabits, note: habitDefs.filter(function (hb) { return !s.habitsOff[hb.id]; }).length + '/' + habitDefs.length + '件が対象' },
    { key: 'variable', name: '流動費（買い物・ETC・食費等）', monthly: Math.round(variableBudgetMonthly), annual: annualVariable, note: variableBasedOnActuals ? '記録済み月の平均から算出' : 'まだ記録がないため予算目標から算出' },
    { key: 'cash', name: '現金支出', monthly: Math.round(cashAvgMonthly), annual: annualCash, note: recordedCashMonths.length > 0 ? (recordedCashMonths.length + 'ヶ月分の記録から平均') : 'まだ記録がありません' },
    { key: 'events', name: 'ライフイベント積立', monthly: Math.round(eventMonthlyTotal), annual: annualEvents, note: s.events.length + '件の目標に向けた積立' },
  ];
  const annualTotal = annualFixed + annualSubs + annualHabits + annualVariable + annualCash + annualEvents;
  const annualNet = t.net * 12 + bonusAnnualNet;
  const annualGap = annualNet - annualTotal;
  const annualRows = annualBreakdown.map(function (r) {
    return { name: r.name, note: r.note, monthlyFmt: fmt(r.monthly), annualFmt: fmt(r.annual), pct: Math.min(100, r.annual / annualTotal * 100) + '%' };
  });

  /* ---- statistical annual expense forecast (mean ± confidence interval) ---- */
  const categoryStats = variableCats.map(function (b) {
    const vals = recordedMonths
      .map(function (mk) { return s.budgetActuals[mk] ? s.budgetActuals[mk][b.id] : undefined; })
      .filter(function (v) { return v !== undefined; });
    return { id: b.id, name: b.name, n: vals.length, avg: vals.length > 0 ? mean(vals) : b.cap, sd: stdev(vals) };
  });
  const variableMonthlyVariance = categoryStats.reduce(function (a, c) { return a + c.sd * c.sd; }, 0);
  const variableMonthlyStd = Math.sqrt(variableMonthlyVariance);
  const variableSampleMonths = categoryStats.reduce(function (a, c) { return Math.max(a, c.n); }, 0);

  const cashMonthlyStd = stdev(cashMonthlyTotals);
  const cashSampleMonths = cashMonthlyTotals.length;

  const forecastSampleMonths = Math.max(variableSampleMonths, cashSampleMonths);
  const forecastReliable = forecastSampleMonths >= 2;
  const annualVariance = (variableMonthlyVariance + cashMonthlyStd * cashMonthlyStd) * 12;
  const annualStd = Math.sqrt(annualVariance);
  const forecastLow = Math.max(0, Math.round(annualTotal - Z80 * annualStd));
  const forecastHigh = Math.round(annualTotal + Z80 * annualStd);
  const forecastCategoryRows = categoryStats.filter(function (c) { return c.n >= 2; }).map(function (c) {
    return { name: c.name, avgFmt: fmt(c.avg), sdFmt: fmt(c.sd), n: c.n };
  });

  /* ---- report: monthly totals across all recorded months (variable-budget actuals + cash) ---- */
  function monthTotalSpend(mk) {
    const ba = s.budgetActuals[mk] || {};
    const catTotal = Object.keys(ba).reduce(function (a, k) { return a + (ba[k] || 0); }, 0);
    const cashList = s.cashExpensesByMonth[mk] || [];
    const cashT = cashList.reduce(function (a, c) { return a + c.amount; }, 0);
    return catTotal + cashT;
  }
  const allRecordedMonths = Array.from(new Set(recordedMonths.concat(recordedCashMonths))).sort();
  const monthlyTotals = allRecordedMonths.map(function (mk) { return { mk: mk, total: monthTotalSpend(mk) }; });
  const monthlyTotalsMax = monthlyTotals.reduce(function (a, m) { return Math.max(a, m.total); }, 0);
  const reportTrendRows = monthlyTotals.map(function (m) {
    return {
      label: monthLabel(m.mk).replace(/^\d+年/, ''), totalFmt: fmt(m.total),
      pct: monthlyTotalsMax > 0 ? Math.max(2, Math.round(m.total / monthlyTotalsMax * 100)) + '%' : '2%',
      isCurrent: m.mk === vm,
    };
  });

  /* ---- report: current-month category breakdown, ranked ---- */
  const breakdownItems = budgetRows.map(function (b) { return { name: b.name, used: b.used }; })
    .concat(cashTotal > 0 ? [{ name: '現金支出', used: cashTotal }] : []);
  const breakdownTotal = breakdownItems.reduce(function (a, b) { return a + b.used; }, 0);
  const breakdownRows = breakdownItems.filter(function (b) { return b.used > 0; })
    .sort(function (a, b) { return b.used - a.used; })
    .map(function (b, i) {
      return {
        rank: i + 1, name: b.name, usedFmt: fmt(b.used),
        pctLabel: breakdownTotal > 0 ? Math.round(b.used / breakdownTotal * 100) + '%' : '0%',
        pct: breakdownTotal > 0 ? Math.max(1, b.used / breakdownTotal * 100) + '%' : '1%',
      };
    });

  /* ---- report: per-category historical stats (avg/min/max/sd) + vs-average trend for the viewed month ---- */
  function categoryHistory(catId) {
    return recordedMonths.map(function (mk) { return s.budgetActuals[mk] ? s.budgetActuals[mk][catId] : undefined; })
      .filter(function (v) { return v !== undefined; });
  }
  const statsRows = s.budgetCategories.map(function (b) {
    const vals = categoryHistory(b.id);
    if (vals.length === 0) return null;
    const avg = mean(vals);
    const cur = monthActuals[b.id];
    const diff = cur !== undefined ? cur - avg : null;
    return {
      name: b.name, n: vals.length,
      avgFmt: fmt(avg), minFmt: fmt(Math.min.apply(null, vals)), maxFmt: fmt(Math.max.apply(null, vals)), sdFmt: fmt(stdev(vals)),
      diffFmt: diff === null ? null : (diff >= 0 ? '+' : '') + fmt(diff) + '円',
      diffColor: diff === null ? 'var(--muted2)' : diff > 0 ? 'var(--red)' : diff < 0 ? 'var(--green)' : 'var(--muted2)',
    };
  }).filter(Boolean).sort(function (a, b) { return b.n - a.n; });

  /* ---- report: month-over-month comparison ---- */
  const prevMonthKey = shiftMonthKey(vm, -1);
  const prevActuals = s.budgetActuals[prevMonthKey];
  const prevCashList = s.cashExpensesByMonth[prevMonthKey];
  const momAvailable = !!prevActuals || !!prevCashList;
  const prevTotal = monthTotalSpend(prevMonthKey);
  const curTotal = monthTotalSpend(vm);
  const momDiff = curTotal - prevTotal;
  const momPct = prevTotal > 0 ? Math.round(momDiff / prevTotal * 100) : null;
  const momCategoryRows = s.budgetCategories.map(function (b) {
    const cur = monthActuals[b.id] || 0;
    const prev = (prevActuals || {})[b.id] || 0;
    return { name: b.name, diff: cur - prev };
  }).filter(function (r) { return r.diff !== 0; }).sort(function (a, b) { return Math.abs(b.diff) - Math.abs(a.diff); }).slice(0, 4).map(function (r) {
    return { name: r.name, diffFmt: (r.diff >= 0 ? '+' : '') + fmt(r.diff) + '円', color: r.diff > 0 ? 'var(--red)' : 'var(--green)' };
  });

  /* ---- report: cash-expense statistics across recorded months ---- */
  const cashStatsAvailable = cashMonthlyTotals.length > 0;
  const cashStats = cashStatsAvailable ? {
    n: cashMonthlyTotals.length, avgFmt: fmt(cashAvgMonthly),
    minFmt: fmt(Math.min.apply(null, cashMonthlyTotals)), maxFmt: fmt(Math.max.apply(null, cashMonthlyTotals)), sdFmt: fmt(cashMonthlyStd),
  } : null;

  const usageColors = { high: 'var(--green)', mid: 'var(--amber)', low: 'var(--red)', none: 'var(--red)' };
  function setUsage(id, usage) {
    return function () { setState(function (st) { return { subs: st.subs.map(function (x) { return x.id === id ? Object.assign({}, x, { usage: usage }) : x; }) }; }); };
  }
  function setCycle(id, cycle) {
    return function () { setState(function (st) { return { subs: st.subs.map(function (x) { return x.id === id ? Object.assign({}, x, { cycle: cycle }) : x; }) }; }); };
  }
  const subRows = s.subs.map(function (sub) {
    const annual = subAnnual(sub);
    return {
      id: sub.id, name: sub.name, usage: sub.usage,
      priceFmt: fmt(sub.price), priceUnit: sub.cycle === 'annual' ? '円/年' : '円/月',
      isAnnual: sub.cycle === 'annual', isMonthly: sub.cycle !== 'annual',
      setMonthlyCycle: setCycle(sub.id, 'monthly'), setAnnualCycle: setCycle(sub.id, 'annual'),
      setHigh: setUsage(sub.id, 'high'), setMid: setUsage(sub.id, 'mid'), setLow: setUsage(sub.id, 'low'), setNone: setUsage(sub.id, 'none'),
      highOn: sub.usage === 'high', midOn: sub.usage === 'mid', lowOn: sub.usage === 'low', noneOn: sub.usage === 'none',
      advice: sub.usage === 'none' ? ('全く使用なし。即解約で年 ' + fmt(annual) + '円の削減')
        : sub.usage === 'low' ? ('解約候補・年 ' + fmt(annual) + '円の削減余地')
        : sub.usage === 'mid' ? '利用月のみ契約する運用も検討の余地'
        : '十分に活用中・継続',
      adviceColor: usageColors[sub.usage],
    };
  });

  const formMonth = Math.round((+s.formTimes || 0) * (+s.formAmount || 0) * 4.33);

  const tabDefs = [
    { id: 'home', label: 'ホーム' }, { id: 'expense', label: '支出' }, { id: 'habit', label: '習慣' },
    { id: 'budget', label: '予算' }, { id: 'report', label: 'レポート' }, { id: 'annual', label: '年間' }, { id: 'invest', label: '投資' }, { id: 'salary', label: '給与' },
  ];
  const tabs = tabDefs.map(function (tb) {
    return {
      id: tb.id, label: tb.label, go: go(tb.id),
      active: s.screen === tb.id || (tb.id === 'salary' && s.screen === 'salarySettings'),
    };
  });

  function seg(on) { return { active: on }; }
  const ft = seg(s.expTab === 'fixed'), vt = seg(s.expTab === 'variable'), trTab = seg(s.expTab === 'transfer'), cashTab = seg(s.expTab === 'cash');

  const furusatoLimit = Math.round((s.gross * 12) * 0.012 / 1000) * 1000;
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
    .filter(function (k) { return k.indexOf(yearPrefix) === 0; })
    .reduce(function (a, k) {
      return a + (s.transfersByMonth[k] || []).filter(function (tr) { return tr.taxAdvantaged; })
        .reduce(function (a2, tr) { return a2 + tr.amount; }, 0);
    }, 0);
  const nisaRemaining = Math.max(0, nisaLimitAnnual - nisaYearTotal);
  const nisaPct = Math.min(100, nisaYearTotal / nisaLimitAnnual * 100) + '%';

  return {
    isHome: s.screen === 'home', isExpense: s.screen === 'expense', isHabit: s.screen === 'habit',
    isBudget: s.screen === 'budget', isInvest: s.screen === 'invest', isSalary: s.screen === 'salary',
    isAnnual: s.screen === 'annual', isSalarySettings: s.screen === 'salarySettings',
    isGoalSettings: s.screen === 'goalSettings', isReport: s.screen === 'report',
    goReport: go('report'),
    reportTrendRows: reportTrendRows,
    breakdownRows: breakdownRows, breakdownTotalFmt: fmt(breakdownTotal),
    statsRows: statsRows,
    momAvailable: momAvailable, momDiffFmt: (momDiff >= 0 ? '+' : '') + fmt(momDiff) + '円', momPct: momPct,
    momColor: momDiff > 0 ? 'var(--red)' : momDiff < 0 ? 'var(--green)' : 'var(--muted2)',
    prevMonthLabel: monthLabel(prevMonthKey), momCategoryRows: momCategoryRows,
    cashStatsAvailable: cashStatsAvailable, cashStats: cashStats,
    annualRows: annualRows, annualTotalFmt: fmt(annualTotal), annualNetFmt: fmt(annualNet),
    annualGapColor: annualGap >= 0 ? 'var(--green)' : 'var(--red)',
    annualGapMsg: annualGap >= 0 ? ('年間で ' + fmt(annualGap) + '円 残る見込み') : ('年間で ' + fmt(-annualGap) + '円 不足する見込み'),
    annualPct: Math.round(Math.min(100, annualTotal / annualNet * 100)) + '%',
    annualBasedNote: variableBasedOnActuals ? '記録済みの予算実績をもとに算出しています' : 'まだ実績記録がないため、予算目標をもとに算出しています。予算画面で記録するほど精度が上がります',
    forecastReliable: forecastReliable, forecastSampleMonths: forecastSampleMonths,
    forecastLowFmt: fmt(forecastLow), forecastHighFmt: fmt(forecastHigh), annualStdFmt: fmt(annualStd),
    forecastCategoryRows: forecastCategoryRows,
    homeFixedPct: homeFixedPct + '%', homeVariablePct: homeVariablePct + '%', homeRemainPct: homeRemainPct + '%',
    homeFixedLabel: '固定費 ' + manYen(homeFixedMonthly), homeVariableLabel: '流動費 ' + manYen(homeVariableMonthly),
    coachOn: COACH_ON,
    coachMsg: lowSubTotal > 0
      ? ('未活用のサービスが' + (noneSubs.length + lowSubs.length) + '件（月' + fmt(lowSubTotal) + '円）。解約により投資余力を改善できます')
      : '契約サービスはすべて活用されています',
    isHabitTab: s.habitTab === 'habit', isSubTab: s.habitTab === 'sub',
    setHabitTab: function () { setState({ habitTab: 'habit' }); }, setSubTab: function () { setState({ habitTab: 'sub' }); },
    subCount: s.subs.length, subRows: subRows, lowSubTotalFmt: fmt(lowSubTotal),
    subSummaryMsg: lowSubTotal > 0 ? ('年間 ' + fmt(lowSubTotal * 12) + '円。投資タブの削減プランへ解約候補として反映済み') : '解約候補はありません',
    addOpen: s.addOpen, openAdd: function () { setState({ addOpen: true }); }, closeAdd: function () { setState({ addOpen: false }); },
    formName: s.formName, formTimes: s.formTimes, formAmount: s.formAmount,
    onFormName: function (e) { setState({ formName: e.target.value }); },
    onFormTimes: function (e) { setState({ formTimes: e.target.value }); },
    onFormAmount: function (e) { setState({ formAmount: e.target.value }); },
    formMonthFmt: fmt(formMonth), formYearFmt: fmt(formMonth * 12),
    addHabit: function () {
      if (!s.formName.trim() || formMonth <= 0) return;
      const nh = { id: 'h' + state.habits.length + '-' + Math.random().toString(36).slice(2, 7), name: s.formName.trim(), freq: '週' + s.formTimes + '回 × ' + fmt(+s.formAmount) + '円', month: formMonth };
      setState(function (st) { return { habits: st.habits.concat([nh]), addOpen: false, formName: '' }; });
    },
    eventMonthlyFmt: fmt(eventMonthlyTotal), eventCount: s.events.length,
    addEventOpen: s.addEventOpen,
    openAddEvent: function () { setState({ addEventOpen: true }); }, closeAddEvent: function () { setState({ addEventOpen: false }); },
    evName: s.evName, evWhen: s.evWhen, evAmount: s.evAmount, evMonths: s.evMonths, evCurrency: s.evCurrency,
    onEvName: function (e) { setState({ evName: e.target.value }); },
    onEvWhen: function (e) { setState({ evWhen: e.target.value }); },
    onEvAmount: function (e) { setState({ evAmount: e.target.value }); },
    onEvMonths: function (e) { setState({ evMonths: e.target.value }); },
    onEvCurrency: function (e) { setState({ evCurrency: e.target.value }); },
    evMonthlyPreview: (function () {
      const amt = +s.evAmount || 0, months = Math.max(1, +s.evMonths || 1);
      const rate = RATES[s.evCurrency] || 1;
      const per = amt / months;
      return s.evCurrency === 'JPY'
        ? ('月 ' + fmt(per) + '円 × ' + months + 'ヶ月')
        : ('月 ' + SYM[s.evCurrency] + fmt(per) + ' ≒ ' + fmt(per * rate) + '円 × ' + months + 'ヶ月（1 ' + s.evCurrency + ' = ' + rate.toFixed(1) + '円）');
    })(),
    addEvent: function () {
      const amt = +s.evAmount || 0, months = Math.max(1, +s.evMonths || 1);
      if (!s.evName.trim() || amt <= 0) return;
      const ne = { name: s.evName.trim(), when: s.evWhen || '時期未定', currency: s.evCurrency, target: amt, saved: 0, monthly: Math.round(amt / months) };
      setState(function (st) { return { events: st.events.concat([ne]), addEventOpen: false, evName: '', evWhen: '' }; });
    },
    goHome: go('home'), goSalary: go('salary'), goExpense: go('expense'), goBudget: go('budget'), goInvest: go('invest'),
    netFmt: fmt(t.net), surplusFmt: fmt(surplus),
    investGapManFmt: Math.max(0, gap / 10000).toFixed(1),
    tabs: tabs,
    menuOpen: s.menuOpen, toggleMenu: function () { setState({ menuOpen: !s.menuOpen }); }, closeMenu: function () { setState({ menuOpen: false }); },
    expenseRows: expenseRows, habitRows: habitRows, budgetRows: budgetRows, cutRows: cutRows, overRows: overRows, eventRows: eventRows,
    overCount: overCount, overTotalFmt: overTotalFmt,
    habitSaveFmt: fmt(habitSave),
    addCategoryOpen: s.addCategoryOpen,
    openAddCategory: function () { setState({ addCategoryOpen: true }); }, closeAddCategory: function () { setState({ addCategoryOpen: false }); },
    formCategoryName: s.formCategoryName, formCategoryCap: s.formCategoryCap,
    onFormCategoryName: function (e) { setState({ formCategoryName: e.target.value }); },
    onFormCategoryCap: function (e) { setState({ formCategoryCap: e.target.value }); },
    addCategory: function () {
      const cap = +s.formCategoryCap || 0;
      if (!s.formCategoryName.trim() || cap <= 0) return;
      const nc = { id: 'cat-' + s.budgetCategories.length + '-' + Math.random().toString(36).slice(2, 7), name: s.formCategoryName.trim(), cap: cap, group: 'variable' };
      setState(function (st) { return { budgetCategories: st.budgetCategories.concat([nc]), addCategoryOpen: false, formCategoryName: '' }; });
    },
    viewMonth: vm, viewMonthLabel: monthLabel(vm), goPrevMonth: goPrevMonth, goNextMonth: goNextMonth, goCurrentMonth: goCurrentMonth,
    canGoNext: canGoNext, isCurrentMonth: vm === currentRealMonth,
    setFixed: function () { setState({ expTab: 'fixed' }); }, setVariable: function () { setState({ expTab: 'variable' }); },
    setTransferTab: function () { setState({ expTab: 'transfer' }); },
    fixedTab: ft, varTab: vt, transferTab: trTab,
    rawSpendFmt: fmt(rawSpend), realSpendFmt: fmt(realSpend), usedRealFmt: fmt(usedReal),
    savingsGoal: savingsGoal, savingsGoalFmt: fmt(savingsGoal), savingsGoalPct: savingsGoalPct, savingsGoalMsg: savingsGoalMsg, savingsGoalColor: savingsGoalColor,
    onSavingsGoal: function (e) { setState({ savingsGoal: +e.target.value }); },
    previewSavingsGoal: function (goal) {
      const gap = goal - surplus;
      return {
        goalFmt: fmt(goal),
        pct: Math.min(100, Math.max(0, surplus / Math.max(1, goal) * 100)) + '%',
        msg: gap > 0 ? ('目標まであと ' + fmt(gap) + '円') : ('目標を ' + fmt(-gap) + '円 上回っています'),
        color: gap > 0 ? 'var(--amber)' : 'var(--green)',
      };
    },
    spendGoal: spendGoal, spendGoalFmt: fmt(spendGoal), spendGoalPct: spendGoalPct, spendGoalMsg: spendGoalMsg, spendGoalColor: spendGoalColor,
    onSpendGoal: function (e) { setState({ spendGoal: +e.target.value }); },
    previewSpendGoal: function (goal) {
      const over = realSpend > goal;
      const gap = realSpend - goal;
      return {
        goalFmt: fmt(goal),
        pct: Math.min(100, realSpend / goal * 100) + '%',
        msg: over ? ('目標より ' + fmt(gap) + '円 超過') : ('あと ' + fmt(-gap) + '円 の余裕'),
        color: over ? 'var(--red)' : 'var(--green)',
      };
    },
    transferRows: transferRows, transferCount: monthTransfers.length, transferTotalFmt: fmt(transferTotal),
    addTransferOpen: s.addTransferOpen,
    openAddTransfer: function () { setState({ addTransferOpen: true }); }, closeAddTransfer: function () { setState({ addTransferOpen: false }); },
    formTransferName: s.formTransferName, formTransferAmount: s.formTransferAmount, formTransferNote: s.formTransferNote,
    formTransferIsNisa: s.formTransferIsNisa,
    onFormTransferName: function (e) { setState({ formTransferName: e.target.value }); },
    onFormTransferAmount: function (e) { setState({ formTransferAmount: e.target.value }); },
    onFormTransferNote: function (e) { setState({ formTransferNote: e.target.value }); },
    toggleFormTransferIsNisa: function () { setState({ formTransferIsNisa: !s.formTransferIsNisa }); },
    addTransfer: function () {
      const amt = +s.formTransferAmount || 0;
      if (!s.formTransferName.trim() || amt <= 0) return;
      const nt = {
        id: 'transfer-' + monthTransfers.length + '-' + Math.random().toString(36).slice(2, 7),
        name: s.formTransferName.trim(), note: s.formTransferNote.trim() || '資産の移動・支出ではない', amount: amt,
        taxAdvantaged: !!s.formTransferIsNisa,
      };
      setState(function (st) {
        const tbm = Object.assign({}, st.transfersByMonth);
        tbm[vm] = (tbm[vm] || []).concat([nt]);
        return { transfersByMonth: tbm, addTransferOpen: false, formTransferName: '', formTransferNote: '', formTransferIsNisa: false };
      });
    },
    setCashTab: function () { setState({ expTab: 'cash' }); },
    cashTab: cashTab,
    cashRows: cashRows, cashCount: monthCash.length, cashTotalFmt: fmt(cashTotal),
    addCashOpen: s.addCashOpen,
    openAddCash: function () { setState({ addCashOpen: true, formCashDate: isoDate(new Date()) }); }, closeAddCash: function () { setState({ addCashOpen: false }); },
    formCashName: s.formCashName, formCashAmount: s.formCashAmount, formCashNote: s.formCashNote, formCashDate: s.formCashDate,
    onFormCashName: function (e) { setState({ formCashName: e.target.value }); },
    onFormCashAmount: function (e) { setState({ formCashAmount: e.target.value }); },
    onFormCashNote: function (e) { setState({ formCashNote: e.target.value }); },
    onFormCashDate: function (e) { setState({ formCashDate: e.target.value }); },
    addCash: function () {
      const amt = +s.formCashAmount || 0;
      if (!s.formCashName.trim() || amt <= 0) return;
      const nc = {
        id: 'cash-' + monthCash.length + '-' + Math.random().toString(36).slice(2, 7),
        name: s.formCashName.trim(), note: s.formCashNote.trim() || '現金払い・カード明細に含まれない', amount: amt,
        date: s.formCashDate || isoDate(new Date()),
      };
      setState(function (st) {
        const cbm = Object.assign({}, st.cashExpensesByMonth);
        cbm[vm] = (cbm[vm] || []).concat([nc]);
        return { cashExpensesByMonth: cbm, addCashOpen: false, formCashName: '', formCashNote: '' };
      });
    },
    cashRecurringRows: cashRecurringRows, pendingRecurringCount: pendingRecurring.length,
    registerAllRecurring: function () {
      setState(function (st) {
        const cbm = Object.assign({}, st.cashExpensesByMonth);
        const list = cbm[vm] || [];
        const existingIds = list.filter(function (c) { return c.recurringId; }).map(function (c) { return c.recurringId; });
        const today = isoDate(new Date());
        const toAdd = st.cashRecurring
          .filter(function (r) { return existingIds.indexOf(r.id) === -1; })
          .map(function (r) {
            return {
              id: 'cash-r-' + r.id + '-' + Math.random().toString(36).slice(2, 7),
              name: r.name, note: r.note || '固定支出パターンから登録', amount: r.amount, date: today, recurringId: r.id,
            };
          });
        if (toAdd.length === 0) return {};
        cbm[vm] = list.concat(toAdd);
        return { cashExpensesByMonth: cbm };
      });
    },
    addRecurringCashOpen: s.addRecurringCashOpen,
    openAddRecurringCash: function () { setState({ addRecurringCashOpen: true }); },
    closeAddRecurringCash: function () { setState({ addRecurringCashOpen: false }); },
    formRecurringCashName: s.formRecurringCashName, formRecurringCashAmount: s.formRecurringCashAmount, formRecurringCashNote: s.formRecurringCashNote,
    onFormRecurringCashName: function (e) { setState({ formRecurringCashName: e.target.value }); },
    onFormRecurringCashAmount: function (e) { setState({ formRecurringCashAmount: e.target.value }); },
    onFormRecurringCashNote: function (e) { setState({ formRecurringCashNote: e.target.value }); },
    addRecurringCash: function () {
      const amt = +s.formRecurringCashAmount || 0;
      if (!s.formRecurringCashName.trim() || amt <= 0) return;
      const nr = {
        id: 'rec-' + s.cashRecurring.length + '-' + Math.random().toString(36).slice(2, 7),
        name: s.formRecurringCashName.trim(), amount: amt, note: s.formRecurringCashNote.trim(),
      };
      setState(function (st) {
        return { cashRecurring: st.cashRecurring.concat([nr]), addRecurringCashOpen: false, formRecurringCashName: '', formRecurringCashNote: '' };
      });
    },
    invTarget: s.invTarget, invTargetFmt: fmt(s.invTarget),
    onInvTarget: function (e) { setState({ invTarget: +e.target.value }); },
    cutsTotalFmt: fmt(cutsTotal),
    gapColor: gap > 0 ? 'var(--red)' : 'var(--green)',
    gapLabel: gap > 0 ? (fmt(gap) + '円') : '達成',
    investPct: Math.min(100, Math.max(0, (surplus + cutsTotal) / s.invTarget * 100)) + '%',
    investMsg: gap > 0
      ? ('月' + fmt(gap) + '円の削減で、月' + fmt(s.invTarget) + '円の投資が実現します')
      : ('月' + fmt(s.invTarget) + '円の投資が可能です・余力 ' + fmt(-gap) + '円'),
    previewInvest: function (target) {
      const gp = target - surplus - cutsTotal;
      return {
        targetFmt: fmt(target),
        gapColor: gp > 0 ? 'var(--red)' : 'var(--green)',
        gapLabel: gp > 0 ? (fmt(gp) + '円') : '達成',
        investPct: Math.min(100, Math.max(0, (surplus + cutsTotal) / target * 100)) + '%',
        investMsg: gp > 0
          ? ('月' + fmt(gp) + '円の削減で、月' + fmt(target) + '円の投資が実現します')
          : ('月' + fmt(target) + '円の投資が可能です・余力 ' + fmt(-gp) + '円'),
      };
    },
    gross: s.gross, grossFmt: fmt(s.gross),
    onGross: function (e) { setState({ gross: +e.target.value }); },
    shakaiFmt: fmt(t.shakai), shotokuFmt: fmt(t.shotoku), juminFmt: fmt(t.jumin),
    kenkoFmt: fmt(t.kenko), koseiFmt: fmt(t.kousei), koyouFmt: fmt(t.koyou),
    shakaiPct: (t.shakai / s.gross * 100) + '%', shotokuPct: (t.shotoku / s.gross * 100) + '%', juminPct: (t.jumin / s.gross * 100) + '%',
    kenkoPct: (t.kenko / s.gross * 100) + '%', koseiPct: (t.kousei / s.gross * 100) + '%', koyouPct: (t.koyou / s.gross * 100) + '%',
    furusatoFmt: fmt(furusatoLimit), furusatoGiftValueFmt: fmt(furusatoGiftValue),
    idecoAnnualFmt: fmt(idecoAnnual), idecoFmt: fmt(idecoSaving),
    medicalPaidFmt: fmt(medicalPaid), medicalThresholdFmt: fmt(medicalThreshold), medicalGapFmt: fmt(medicalGap),
    medicalSavingFmt: fmt(medicalSaving), medicalOverThreshold: medicalOverThreshold,
    medicalPct: Math.min(100, medicalPaid / medicalThreshold * 100) + '%',
    nisaYearTotalFmt: fmt(nisaYearTotal), nisaLimitFmt: fmt(nisaLimitAnnual), nisaRemainingFmt: fmt(nisaRemaining), nisaPct: nisaPct,
    dedTotalFmt: fmt(dedTotal),
    bonusRows: bonusRows, bonusAnnualNetFmt: fmt(bonusAnnualNet), monthBonusNetFmt: fmt(monthBonusNet), monthBonusNet: monthBonusNet,
    goSalarySettings: go('salarySettings'),
    goGoalSettings: go('goalSettings'),
    previewSalary: function (gross) {
      const tt = tax(gross);
      const furu = Math.round((gross * 12) * 0.012 / 1000) * 1000;
      const idecoSav = Math.round(idecoAnnual * (tt.marginalRate + 0.10));
      const medExcess = Math.max(0, medicalPaid - medicalThreshold);
      const medSav = Math.round(medExcess * (tt.marginalRate + 0.10));
      return {
        grossFmt: fmt(gross), netFmt: fmt(tt.net),
        shakaiFmt: fmt(tt.shakai), shotokuFmt: fmt(tt.shotoku), juminFmt: fmt(tt.jumin),
        kenkoFmt: fmt(tt.kenko), koseiFmt: fmt(tt.kousei), koyouFmt: fmt(tt.koyou),
        shakaiPct: (tt.shakai / gross * 100) + '%', shotokuPct: (tt.shotoku / gross * 100) + '%', juminPct: (tt.jumin / gross * 100) + '%',
        kenkoPct: (tt.kenko / gross * 100) + '%', koseiPct: (tt.kousei / gross * 100) + '%', koyouPct: (tt.koyou / gross * 100) + '%',
        furusatoFmt: fmt(furu), furusatoGiftValueFmt: fmt(Math.round(furu * 0.3)),
        idecoFmt: fmt(idecoSav), medicalSavingFmt: fmt(medSav), dedTotalFmt: fmt(idecoSav + medSav),
      };
    },
  };
}

/* ---------- screen builders ---------- */
/* ---------- shared building blocks ---------- */
function listRow(children) {
  return h('div', { class: 'list-row' }, children);
}

function segTabs(items) {
  return h('div', { class: 'seg-tabs' }, items.map(function (it) {
    return h('div', {
      class: 'seg-tab',
      style: { color: it.active ? 'var(--fg)' : 'var(--muted)', borderBottomColor: it.active ? 'var(--primary2)' : 'transparent' },
      onclick: it.onclick,
    }, it.label);
  }));
}

function monthSwitcher(v) {
  return h('div', { class: 'month-switcher' }, [
    h('div', { class: 'month-arrow', onclick: v.goPrevMonth }, '‹'),
    h('div', { style: { display: 'flex', alignItems: 'baseline', gap: '8px' } }, [
      h('div', { class: 'month-label' }, v.viewMonthLabel),
      v.isCurrentMonth ? null : h('div', { class: 'link-quiet', style: { fontSize: '11px' }, onclick: v.goCurrentMonth }, '今月'),
    ]),
    h('div', { class: 'month-arrow', style: { visibility: v.canGoNext ? 'visible' : 'hidden' }, onclick: v.canGoNext ? v.goNextMonth : null }, '›'),
  ]);
}

function screenHome(v) {
  const splitBar = h('div', { class: 'progress-track split', style: { marginTop: '2px' } }, [
    h('div', { style: { width: v.homeFixedPct, background: 'var(--primary)' } }),
    h('div', { style: { width: v.homeVariablePct, background: 'var(--amber)' } }),
    h('div', { style: { flex: '1', background: 'var(--green)' } }),
  ]);
  const legend = h('div', { style: { display: 'flex', gap: '16px', fontSize: '11px', color: 'var(--muted2)', marginTop: '10px', flexWrap: 'wrap' } }, [
    h('div', {}, v.homeFixedLabel), h('div', {}, v.homeVariableLabel), h('div', {}, '残り'),
  ]);
  const coach = v.coachOn ? h('div', { style: { fontSize: '12px', color: 'var(--muted)', marginTop: '16px', lineHeight: '1.7' } }, v.coachMsg) : null;

  const goalBlock = h('div', { style: { marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '14px' } }, [
    h('div', { class: 'row-flex' }, [
      h('div', { style: { fontSize: '11px', color: 'var(--muted2)', letterSpacing: '.08em' } }, '残せるお金の目標'),
      h('div', { style: { fontSize: '13px', fontVariantNumeric: 'tabular-nums' } }, v.savingsGoalFmt + '円'),
    ]),
    h('div', { class: 'progress-track', style: { marginTop: '10px' } }, [h('div', { style: { width: v.savingsGoalPct, background: 'var(--green)' } })]),
    h('div', { style: { fontSize: '12px', marginTop: '8px', color: v.savingsGoalColor } }, v.savingsGoalMsg),
    h('div', { class: 'link-quiet', style: { fontSize: '11px', marginTop: '8px', display: 'inline-block' }, onclick: v.goGoalSettings }, '目標を編集'),
  ]);

  const overAlert = v.overCount > 0 ? h('div', { class: 'alert-row', onclick: v.goBudget }, [
    h('div', {}, [
      h('div', { style: { fontSize: '13px', fontWeight: '500' } }, '予算オーバーギャップ分析'),
      h('div', { style: { fontSize: '11px', color: 'var(--muted2)', marginTop: '2px' } }, v.overCount + 'カテゴリが超過・タップで内訳へ'),
    ]),
    h('div', { style: { fontSize: '13px', fontWeight: '500', color: 'var(--red)', fontVariantNumeric: 'tabular-nums' } }, '+' + v.overTotalFmt + '円'),
  ]) : null;

  const overList = v.overRows.length > 0 ? h('div', { class: 'list' },
    v.overRows.map(function (o) {
      return listRow([
        h('div', { class: 'row-flex' }, [
          h('div', { class: 'row-top' }, o.name),
          h('div', { style: { display: 'flex', gap: '10px' } }, [
            h('span', { class: 'row-note' }, o.ratio),
            h('span', { style: { fontSize: '11px', color: 'var(--red)', fontVariantNumeric: 'tabular-nums' } }, '+' + o.gapFmt),
          ]),
        ]),
        h('div', { class: 'progress-track' }, [h('div', { style: { width: o.pct, background: o.barColor } })]),
        h('div', { class: 'row-note' }, o.note),
      ]);
    })
  ) : h('div', { style: { fontSize: '12px', color: 'var(--muted2)', padding: '4px 0 8px 0' } }, 'この月は予算内に収まっています');

  const shortcuts = h('div', { style: { display: 'flex', gap: '24px', marginTop: '4px' } }, [
    h('div', { style: { flex: '1', cursor: 'pointer' }, onclick: v.goBudget }, [
      h('div', { style: { fontSize: '11px', color: 'var(--muted2)', letterSpacing: '.08em' } }, 'ライフイベント積立'),
      h('div', { style: { fontSize: '20px', fontWeight: '300', marginTop: '4px', fontVariantNumeric: 'tabular-nums' } }, [v.eventMonthlyFmt, h('span', { style: { fontSize: '11px', color: 'var(--muted)' } }, '円')]),
      h('div', { style: { fontSize: '11px', color: 'var(--muted2)', marginTop: '2px' } }, v.eventCount + '件 順調'),
    ]),
    h('div', { style: { flex: '1', cursor: 'pointer' }, onclick: v.goInvest }, [
      h('div', { style: { fontSize: '11px', color: 'var(--muted2)', letterSpacing: '.08em' } }, '投資目標まで'),
      h('div', { style: { fontSize: '20px', fontWeight: '300', marginTop: '4px', fontVariantNumeric: 'tabular-nums' } }, ['あと ' + v.investGapManFmt, h('span', { style: { fontSize: '11px', color: 'var(--muted)' } }, '万円')]),
      h('div', { style: { fontSize: '11px', color: 'var(--muted2)', marginTop: '2px' } }, '削減プランを見る →'),
    ]),
  ]);

  return h('div', {}, [
    h('div', { class: 'row-flex', style: { padding: '4px 0 20px 0' } }, [
      h('div', { class: 'screen-title', style: { padding: '0' } }, 'ホーム'),
      h('div', { class: 'link-quiet', onclick: v.goSalarySettings }, '給与設定'),
    ]),
    monthSwitcher(v),
    h('div', { class: 'hero', style: { paddingBottom: '4px' } }, [
      h('div', { class: 'hero-label' }, v.viewMonthLabel + ' 残せるお金'),
      h('div', { class: 'hero-value' }, [v.surplusFmt, h('span', { class: 'hero-unit' }, ' 円')]),
      h('div', { class: 'hero-sub' }, '手取り ' + v.netFmt + '円' + (v.monthBonusNet > 0 ? ' ＋ 賞与手取り ' + v.monthBonusNetFmt + '円' : '')),
      splitBar, legend, coach, goalBlock,
    ]),
    overAlert,
    h('div', { class: 'section-label' }, '超過カテゴリ（' + v.viewMonthLabel + 'の予算実績）'),
    overList,
    h('div', { class: 'section-label' }, 'このさき'),
    shortcuts,
  ]);
}

function screenExpense(v) {
  const noteParts = [];
  if (v.transferTotalFmt !== '0') noteParts.push('資金移動 -' + v.transferTotalFmt + '円を除く');
  if (v.cashTotalFmt !== '0') noteParts.push('現金支出 +' + v.cashTotalFmt + '円を追加');
  const transferNote = noteParts.length > 0 ? (noteParts.join(' ・ ') + '（カード請求額 ' + v.rawSpendFmt + '円）') : null;

  const tabs = segTabs([
    { label: '固定費', active: v.fixedTab.active, onclick: v.setFixed },
    { label: '流動費', active: v.varTab.active, onclick: v.setVariable },
    { label: '資金移動 ' + v.transferCount + '件', active: v.transferTab.active, onclick: v.setTransferTab },
    { label: '現金支出 ' + v.cashCount + '件', active: v.cashTab.active, onclick: v.setCashTab },
  ]);

  let body;
  if (v.transferTab.active) {
    const addForm = v.addTransferOpen ? h('div', { style: { padding: '16px 0', borderBottom: '1px solid var(--border)', marginBottom: '4px' } }, [
      h('div', { style: { fontSize: '13px', fontWeight: '500', marginBottom: '14px' } }, '資金移動を登録'),
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: '14px' } }, [
        h('input', { class: 'field-input', 'data-field': 'formTransferName', value: v.formTransferName, placeholder: '例: 証券口座への入金', oninput: v.onFormTransferName }),
        h('input', { class: 'field-input', 'data-field': 'formTransferNote', value: v.formTransferNote, placeholder: 'メモ（任意）', oninput: v.onFormTransferNote }),
        h('div', {}, [
          h('span', { class: 'field-label' }, '金額（円）'),
          h('input', { class: 'field-input', 'data-field': 'formTransferAmount', type: 'number', value: v.formTransferAmount, min: '0', step: '1000', oninput: v.onFormTransferAmount }),
        ]),
        h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }, onclick: v.toggleFormTransferIsNisa }, [
          h('div', { class: 'check-box', style: { borderColor: v.formTransferIsNisa ? 'var(--green)' : 'var(--border2)', background: v.formTransferIsNisa ? 'var(--green)' : 'transparent' } }, v.formTransferIsNisa ? '✓' : ''),
          h('div', { style: { fontSize: '12px', color: 'var(--muted)' } }, 'NISA枠の利用として記録する（年間利用額の目安に反映）'),
        ]),
        h('div', { style: { display: 'flex', gap: '8px' } }, [
          h('div', { class: 'btn-primary', onclick: v.addTransfer }, '登録する'),
          h('div', { class: 'btn-cancel', onclick: v.closeAddTransfer }, 'やめる'),
        ]),
      ]),
    ]) : null;

    body = h('div', {}, [
      h('div', { style: { fontSize: '12px', color: 'var(--muted2)', marginBottom: '4px' } }, '口座やカードからは引かれるが、資産が移動しただけで実質的な支出ではないお金を記録します。残せるお金の計算には含めません'),
      h('div', { class: 'list' },
        v.transferRows.map(function (tr) {
          return listRow([
            h('div', { class: 'row-flex' }, [
              h('div', {}, [
                h('div', { class: 'row-top' }, [tr.name, tr.taxAdvantaged ? h('span', { style: { fontSize: '10px', color: 'var(--green)', marginLeft: '6px' } }, 'NISA') : null]),
                h('div', { class: 'row-note', style: { marginTop: '2px' } }, tr.note),
              ]),
              h('div', { style: { textAlign: 'right' } }, [
                h('div', { class: 'row-value' }, tr.amountFmt + '円'),
                h('div', { class: 'link-quiet', style: { marginTop: '4px', fontSize: '11px' }, onclick: tr.remove }, '削除'),
              ]),
            ]),
          ]);
        })
      ),
      h('div', { class: 'hero', style: { marginTop: '8px' } }, [
        h('div', { class: 'hero-label' }, '資金移動の合計'),
        h('div', { class: 'hero-value', style: { fontSize: '32px', color: 'var(--green)' } }, [v.transferTotalFmt, h('span', { class: 'hero-unit' }, '円')]),
        h('div', { class: 'hero-sub' }, 'この金額は支出として数えず、残せるお金にそのまま反映されます'),
      ]),
      addForm,
      h('div', { style: { textAlign: 'center' } }, [h('span', { class: 'btn-add', onclick: v.openAddTransfer }, '＋ 資金移動を登録')]),
    ]);
  } else if (v.cashTab.active) {
    const addCashForm = v.addCashOpen ? h('div', { style: { padding: '16px 0', borderBottom: '1px solid var(--border)', marginBottom: '4px' } }, [
      h('div', { style: { fontSize: '13px', fontWeight: '500', marginBottom: '14px' } }, '現金支出を登録'),
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: '14px' } }, [
        h('input', { class: 'field-input', 'data-field': 'formCashName', value: v.formCashName, placeholder: '例: 現金でのランチ', oninput: v.onFormCashName }),
        h('div', { style: { display: 'flex', gap: '16px' } }, [
          h('div', { style: { flex: '2' } }, [
            h('span', { class: 'field-label' }, '金額（円）'),
            h('input', { class: 'field-input', 'data-field': 'formCashAmount', type: 'number', value: v.formCashAmount, min: '0', step: '100', oninput: v.onFormCashAmount }),
          ]),
          h('div', { style: { flex: '1' } }, [
            h('span', { class: 'field-label' }, '日付'),
            h('input', { class: 'field-input', 'data-field': 'formCashDate', type: 'date', value: v.formCashDate, oninput: v.onFormCashDate }),
          ]),
        ]),
        h('input', { class: 'field-input', 'data-field': 'formCashNote', value: v.formCashNote, placeholder: 'メモ（任意）', oninput: v.onFormCashNote }),
        h('div', { style: { display: 'flex', gap: '8px' } }, [
          h('div', { class: 'btn-primary', onclick: v.addCash }, '登録する'),
          h('div', { class: 'btn-cancel', onclick: v.closeAddCash }, 'やめる'),
        ]),
      ]),
    ]) : null;

    const addRecurringForm = v.addRecurringCashOpen ? h('div', { style: { padding: '16px 0', borderBottom: '1px solid var(--border)', marginBottom: '4px' } }, [
      h('div', { style: { fontSize: '13px', fontWeight: '500', marginBottom: '14px' } }, '固定支出パターンを登録'),
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: '14px' } }, [
        h('input', { class: 'field-input', 'data-field': 'formRecurringCashName', value: v.formRecurringCashName, placeholder: '例: 週末の駐輪場代', oninput: v.onFormRecurringCashName }),
        h('div', {}, [
          h('span', { class: 'field-label' }, '金額（円）'),
          h('input', { class: 'field-input', 'data-field': 'formRecurringCashAmount', type: 'number', value: v.formRecurringCashAmount, min: '0', step: '100', oninput: v.onFormRecurringCashAmount }),
        ]),
        h('input', { class: 'field-input', 'data-field': 'formRecurringCashNote', value: v.formRecurringCashNote, placeholder: 'メモ（任意）', oninput: v.onFormRecurringCashNote }),
        h('div', { style: { display: 'flex', gap: '8px' } }, [
          h('div', { class: 'btn-primary', onclick: v.addRecurringCash }, '登録する'),
          h('div', { class: 'btn-cancel', onclick: v.closeAddRecurringCash }, 'やめる'),
        ]),
      ]),
    ]) : null;

    const recurringSection = h('div', { style: { marginTop: '24px' } }, [
      h('div', { class: 'row-flex' }, [
        h('div', { class: 'section-label', style: { margin: '0' } }, '必ず発生する現金支出パターン'),
        v.pendingRecurringCount > 0 ? h('div', { class: 'link-quiet', style: { fontSize: '11px' }, onclick: v.registerAllRecurring } , '今月分を' + v.pendingRecurringCount + '件まとめて登録') : null,
      ]),
      v.cashRecurringRows.length === 0
        ? h('div', { style: { fontSize: '12px', color: 'var(--muted2)', padding: '8px 0' } }, '毎回同じ金額で発生する支出（例: 週末の駐車料金など）を登録しておくと、まとめて今月分に反映できます')
        : h('div', { class: 'list' },
          v.cashRecurringRows.map(function (r) {
            return listRow([
              h('div', { class: 'row-flex' }, [
                h('div', {}, [
                  h('div', { class: 'row-top' }, r.name),
                  h('div', { class: 'row-note', style: { marginTop: '2px' } }, r.note || (r.amountFmt + '円・登録するたび今月の現金支出に追加')),
                ]),
                h('div', { style: { textAlign: 'right' } }, [
                  h('div', { class: 'row-value' }, r.amountFmt + '円'),
                  r.addedThisMonth
                    ? h('div', { style: { fontSize: '11px', color: 'var(--green)', marginTop: '4px' } }, '今月分 登録済み')
                    : h('div', { class: 'link-quiet', style: { marginTop: '4px', fontSize: '11px' }, onclick: r.addOne }, '＋ 今月に登録'),
                ]),
              ]),
              h('div', { style: { textAlign: 'right' } }, [
                h('div', { class: 'link-quiet', style: { fontSize: '11px' }, onclick: r.remove }, 'パターンを削除'),
              ]),
            ]);
          })
        ),
      addRecurringForm,
      h('div', { style: { textAlign: 'center', marginTop: '8px' } }, [h('span', { class: 'btn-add', onclick: v.openAddRecurringCash }, '＋ パターンを登録')]),
    ]);

    body = h('div', {}, [
      h('div', { style: { fontSize: '12px', color: 'var(--muted2)', marginBottom: '4px' } }, 'カード明細に載らない現金払いの支出を記録します。月末の着地予測・残せるお金に反映されます'),
      h('div', { class: 'list' },
        v.cashRows.map(function (c) {
          return listRow([
            h('div', { class: 'row-flex' }, [
              h('div', {}, [
                h('div', { class: 'row-top' }, [c.name, c.dateLabel ? h('span', { class: 'row-note', style: { marginLeft: '8px' } }, c.dateLabel) : null]),
                h('div', { class: 'row-note', style: { marginTop: '2px' } }, c.note),
              ]),
              h('div', { style: { textAlign: 'right' } }, [
                h('div', { class: 'row-value' }, c.amountFmt + '円'),
                h('div', { class: 'link-quiet', style: { marginTop: '4px', fontSize: '11px' }, onclick: c.remove }, '削除'),
              ]),
            ]),
          ]);
        })
      ),
      h('div', { class: 'hero', style: { marginTop: '8px' } }, [
        h('div', { class: 'hero-label' }, '現金支出の合計'),
        h('div', { class: 'hero-value', style: { fontSize: '32px', color: 'var(--red)' } }, [v.cashTotalFmt, h('span', { class: 'hero-unit' }, '円')]),
        h('div', { class: 'hero-sub' }, 'この金額はカード請求額に含まれていないため、支出として別途加算されます'),
      ]),
      addCashForm,
      h('div', { style: { textAlign: 'center' } }, [h('span', { class: 'btn-add', onclick: v.openAddCash }, '＋ 現金支出を登録')]),
      recurringSection,
    ]);
  } else {
    body = h('div', { class: 'list' },
      v.expenseRows.map(function (row) {
        return listRow([
          h('div', { class: 'row-flex' }, [
            h('div', {}, [
              h('div', { class: 'row-top' }, row.name),
              h('div', { class: 'row-note', style: { marginTop: '2px' } }, row.note),
            ]),
            h('div', { style: { textAlign: 'right' } }, [
              h('div', { class: 'row-value' }, row.amountFmt + '円'),
              h('div', { class: 'row-delta', style: { color: row.deltaColor, marginTop: '2px' } }, row.delta),
            ]),
          ]),
        ]);
      })
    );
  }

  return h('div', {}, [
    h('div', { class: 'screen-title' }, '支出予測'),
    monthSwitcher(v),
    h('div', { class: 'screen-sub' }, 'カード明細の実績から予測'),
    h('div', { class: 'hero' }, [
      h('div', { class: 'hero-label' }, '月末の着地予測'),
      h('div', { class: 'hero-value' }, [v.realSpendFmt, h('span', { class: 'hero-unit' }, ' 円')]),
      h('div', { style: { fontSize: '11px', color: 'var(--muted2)', marginTop: '8px' } }, '使用済み ' + v.usedRealFmt + '円'),
      transferNote ? h('div', { style: { fontSize: '11px', color: 'var(--green)', marginTop: '4px' } }, transferNote) : null,
      h('div', { style: { marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '14px' } }, [
        h('div', { class: 'row-flex' }, [
          h('div', { style: { fontSize: '11px', color: 'var(--muted2)', letterSpacing: '.08em' } }, '支出の目標'),
          h('div', { style: { fontSize: '13px', fontVariantNumeric: 'tabular-nums' } }, v.spendGoalFmt + '円'),
        ]),
        h('div', { class: 'progress-track', style: { marginTop: '10px' } }, [h('div', { style: { width: v.spendGoalPct, background: v.spendGoalColor } })]),
        h('div', { style: { fontSize: '11px', marginTop: '8px', color: v.spendGoalColor } }, v.spendGoalMsg),
        h('div', { class: 'link-quiet', style: { fontSize: '11px', marginTop: '8px', display: 'inline-block' }, onclick: v.goGoalSettings }, '目標を編集'),
      ]),
    ]),
    tabs, body,
  ]);
}

function screenHabit(v) {
  const tabs = segTabs([
    { label: '習慣', active: v.isHabitTab, onclick: v.setHabitTab },
    { label: '固定費見直し ' + v.subCount + '件', active: v.isSubTab, onclick: v.setSubTab },
  ]);

  let body;
  if (v.isSubTab) {
    body = h('div', {}, [
      h('div', { style: { fontSize: '12px', color: 'var(--muted2)', marginBottom: '4px' } }, 'サブスク・固定サービスの活用度を設定すると、削減プランに反映されます'),
      h('div', { class: 'list' },
        v.subRows.map(function (sub) {
          function pill(label, on, onclick) {
            return h('div', { class: 'usage-pill', style: { color: on ? sub.adviceColor : 'var(--muted2)', borderBottomColor: on ? sub.adviceColor : 'transparent' }, onclick: onclick }, label);
          }
          function cyclePill(label, on, onclick) {
            return h('div', { class: 'usage-pill', style: { color: on ? 'var(--primary2)' : 'var(--muted2)', borderBottomColor: on ? 'var(--primary2)' : 'transparent' }, onclick: onclick }, label);
          }
          return listRow([
            h('div', { class: 'row-flex' }, [
              h('div', { class: 'row-top' }, sub.name),
              h('div', { class: 'row-value' }, [sub.priceFmt, h('span', { style: { fontSize: '11px', color: 'var(--muted)' } }, sub.priceUnit)]),
            ]),
            h('div', { style: { display: 'flex', gap: '4px' } }, [
              cyclePill('月払い', sub.isMonthly, sub.setMonthlyCycle), cyclePill('年払い', sub.isAnnual, sub.setAnnualCycle),
            ]),
            h('div', { style: { display: 'flex', gap: '4px' } }, [
              pill('よく使う', sub.highOn, sub.setHigh), pill('たまに', sub.midOn, sub.setMid),
              pill('ほぼ無し', sub.lowOn, sub.setLow), pill('未使用', sub.noneOn, sub.setNone),
            ]),
            h('div', { style: { fontSize: '12px', color: sub.adviceColor } }, sub.advice),
          ]);
        })
      ),
      h('div', { class: 'hero', style: { marginTop: '8px' } }, [
        h('div', { class: 'hero-label' }, '未活用サービスの合計'),
        h('div', { class: 'hero-value', style: { fontSize: '32px', color: 'var(--red)' } }, [v.lowSubTotalFmt, h('span', { class: 'hero-unit' }, '円/月')]),
        h('div', { class: 'hero-sub' }, v.subSummaryMsg),
      ]),
    ]);
  } else {
    const addForm = v.addOpen ? h('div', { style: { padding: '16px 0', borderBottom: '1px solid var(--border)', marginBottom: '4px' } }, [
      h('div', { style: { fontSize: '13px', fontWeight: '500', marginBottom: '14px' } }, '習慣を登録'),
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: '14px' } }, [
        h('input', { class: 'field-input', 'data-field': 'formName', value: v.formName, placeholder: '例: スタバ', oninput: v.onFormName }),
        h('div', { style: { display: 'flex', gap: '16px' } }, [
          h('div', { style: { flex: '1' } }, [
            h('span', { class: 'field-label' }, '週に何回'),
            h('input', { class: 'field-input', 'data-field': 'formTimes', type: 'number', value: v.formTimes, min: '1', max: '21', oninput: v.onFormTimes }),
          ]),
          h('div', { style: { flex: '1' } }, [
            h('span', { class: 'field-label' }, '1回あたり（円）'),
            h('input', { class: 'field-input', 'data-field': 'formAmount', type: 'number', value: v.formAmount, min: '0', step: '100', oninput: v.onFormAmount }),
          ]),
        ]),
        h('div', { style: { fontSize: '12px', color: 'var(--muted)' } }, ['月換算 ', h('span', { style: { color: 'var(--fg)' } }, v.formMonthFmt + '円'), ' / 年換算 ', h('span', { style: { color: 'var(--amber)' } }, v.formYearFmt + '円')]),
        h('div', { style: { display: 'flex', gap: '8px' } }, [
          h('div', { class: 'btn-primary', onclick: v.addHabit }, '登録する'),
          h('div', { class: 'btn-cancel', onclick: v.closeAdd }, 'やめる'),
        ]),
      ]),
    ]) : null;

    const habitList = h('div', { class: 'list' }, v.habitRows.map(function (hb) {
      return listRow([
        h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px' } }, [
          h('div', { style: { flex: '1' } }, [
            h('div', { class: 'row-top' }, hb.name),
            h('div', { class: 'row-note', style: { marginTop: '2px' } }, hb.freq),
          ]),
          h('div', { class: 'switch', style: { background: hb.off ? 'var(--border2)' : 'var(--green)' }, onclick: hb.toggle }, [
            h('div', { class: 'switch-knob', style: { left: hb.off ? '2px' : '18px' } }),
          ]),
        ]),
        h('div', { style: { display: 'flex', gap: '24px' } }, [
          h('div', {}, [
            h('div', { style: { fontSize: '11px', color: 'var(--muted2)' } }, '月にすると'),
            h('div', { style: { fontSize: '15px', fontWeight: '400', marginTop: '2px', fontVariantNumeric: 'tabular-nums' } }, hb.monthFmt + '円'),
          ]),
          h('div', {}, [
            h('div', { style: { fontSize: '11px', color: 'var(--muted2)' } }, '年にすると'),
            h('div', { style: { fontSize: '15px', fontWeight: '400', marginTop: '2px', fontVariantNumeric: 'tabular-nums', color: 'var(--amber)' } }, hb.yearFmt + '円'),
          ]),
        ]),
        h('div', { class: 'row-flex' }, [
          h('div', { style: { fontSize: '12px', color: hb.off ? 'var(--green)' : 'var(--muted2)' } }, hb.msg),
          h('div', { class: 'link-quiet', style: { fontSize: '11px' }, onclick: hb.remove }, '削除'),
        ]),
      ]);
    }));

    body = h('div', {}, [
      addForm, habitList,
      h('div', { class: 'row-flex', style: { padding: '16px 0' } }, [
        h('div', { style: { fontSize: '12px', color: 'var(--muted)' } }, 'OFFにした習慣の節約額'),
        h('div', { style: { fontSize: '16px', fontWeight: '400', color: 'var(--green)', fontVariantNumeric: 'tabular-nums' } }, '月 ' + v.habitSaveFmt + '円'),
      ]),
      h('div', { style: { textAlign: 'center', marginTop: '4px' } }, [
        h('span', { class: 'btn-add', onclick: v.openAdd }, '＋ 習慣を登録'),
      ]),
    ]);
  }

  return h('div', {}, [
    h('div', { class: 'screen-title' }, '習慣トラッキング'),
    h('div', { class: 'screen-sub' }, '明細から検出+手動登録。OFFで節約額が投資プランに反映'),
    tabs, body,
  ]);
}

function screenBudget(v) {
  const budgetList = h('div', { class: 'list' },
    v.budgetRows.map(function (b) {
      return listRow([
        h('div', { class: 'row-flex' }, [
          h('div', { class: 'row-top' }, b.name),
          h('div', { style: { fontSize: '12px', color: b.color, fontVariantNumeric: 'tabular-nums' } }, b.pctLabel + '%'),
        ]),
        h('div', { class: 'progress-track' }, [h('div', { style: { width: b.pct, background: b.color } })]),
        h('div', { class: 'row-flex', style: { marginTop: '2px' } }, [
          h('div', { style: { display: 'flex', alignItems: 'baseline', gap: '4px' } }, [
            h('input', {
              class: 'budget-used-input', 'data-field': 'budgetUsed-' + b.id, type: 'number', value: b.used, min: '0', step: '100',
              oninput: b.onUsedChange,
            }),
            h('span', { class: 'row-note' }, '円 / ' + b.capFmt + '円'),
          ]),
          h('div', { class: 'link-quiet', style: { fontSize: '11px' }, onclick: b.removeCategory }, '削除'),
        ]),
      ]);
    })
  );

  const addCategoryForm = v.addCategoryOpen ? h('div', { style: { padding: '16px 0', borderBottom: '1px solid var(--border)', marginBottom: '4px' } }, [
    h('div', { style: { fontSize: '13px', fontWeight: '500', marginBottom: '14px' } }, '予算カテゴリを追加'),
    h('div', { style: { display: 'flex', flexDirection: 'column', gap: '14px' } }, [
      h('input', { class: 'field-input', 'data-field': 'formCategoryName', value: v.formCategoryName, placeholder: '例: 交際費', oninput: v.onFormCategoryName }),
      h('div', {}, [
        h('span', { class: 'field-label' }, '目標金額（円/月）'),
        h('input', { class: 'field-input', 'data-field': 'formCategoryCap', type: 'number', value: v.formCategoryCap, min: '0', step: '1000', oninput: v.onFormCategoryCap }),
      ]),
      h('div', { style: { display: 'flex', gap: '8px' } }, [
        h('div', { class: 'btn-primary', onclick: v.addCategory }, '登録する'),
        h('div', { class: 'btn-cancel', onclick: v.closeAddCategory }, 'やめる'),
      ]),
    ]),
  ]) : null;

  const eventList = h('div', { class: 'list' },
    v.eventRows.map(function (ev) {
      return listRow([
        h('div', { class: 'row-flex' }, [
          h('div', { class: 'row-top' }, [ev.name + ' ', h('span', { class: 'row-note' }, ev.when)]),
          h('div', { class: 'row-note' }, [ev.progress + ' ', h('span', { style: { color: 'var(--fg)' } }, '月' + ev.monthly)]),
        ]),
        h('div', { class: 'progress-track' }, [h('div', { style: { width: ev.pct, background: ev.barColor } })]),
        ev.fxNote ? h('div', { class: 'row-note' }, ev.fxNote) : null,
      ]);
    })
  );

  const addForm = v.addEventOpen ? h('div', { style: { padding: '16px 0', borderBottom: '1px solid var(--border)', marginBottom: '4px' } }, [
    h('div', { style: { fontSize: '13px', fontWeight: '500', marginBottom: '14px' } }, 'ライフイベントを登録'),
    h('div', { style: { display: 'flex', flexDirection: 'column', gap: '14px' } }, [
      h('input', { class: 'field-input', 'data-field': 'evName', value: v.evName, placeholder: '例: ハワイ旅行', oninput: v.onEvName }),
      h('input', { class: 'field-input', 'data-field': 'evWhen', value: v.evWhen, placeholder: '時期（例: 2027年6月）', oninput: v.onEvWhen }),
      h('div', { style: { display: 'flex', gap: '16px' } }, [
        h('div', { style: { flex: '2' } }, [
          h('span', { class: 'field-label' }, '目標金額'),
          h('input', { class: 'field-input', 'data-field': 'evAmount', type: 'number', value: v.evAmount, min: '0', oninput: v.onEvAmount }),
        ]),
        h('div', { style: { flex: '1' } }, [
          h('span', { class: 'field-label' }, '通貨'),
          h('select', { class: 'field-select', 'data-field': 'evCurrency', value: v.evCurrency, onchange: v.onEvCurrency }, [
            h('option', { value: 'JPY' }, 'JPY 円'), h('option', { value: 'USD' }, 'USD ドル'), h('option', { value: 'EUR' }, 'EUR ユーロ'),
          ]),
        ]),
        h('div', { style: { flex: '1' } }, [
          h('span', { class: 'field-label' }, '積立月数'),
          h('input', { class: 'field-input', 'data-field': 'evMonths', type: 'number', value: v.evMonths, min: '1', max: '120', oninput: v.onEvMonths }),
        ]),
      ]),
      h('div', { style: { fontSize: '12px', color: 'var(--muted)' } }, v.evMonthlyPreview),
      h('div', { style: { display: 'flex', gap: '8px' } }, [
        h('div', { class: 'btn-primary', onclick: v.addEvent }, '登録する'),
        h('div', { class: 'btn-cancel', onclick: v.closeAddEvent }, 'やめる'),
      ]),
    ]),
  ]) : null;

  return h('div', {}, [
    h('div', { class: 'screen-title' }, '予算とライフイベント'),
    monthSwitcher(v),
    h('div', { class: 'section-label', style: { marginTop: '4px' } }, v.viewMonthLabel + 'の予算実績（タップして入力）'),
    budgetList,
    addCategoryForm,
    h('div', { style: { textAlign: 'center', margin: '8px 0 0 0' } }, [h('span', { class: 'btn-add', onclick: v.openAddCategory }, '＋ カテゴリを追加')]),
    h('div', { class: 'row-flex', style: { margin: '24px 0 0 0' } }, [
      h('div', { class: 'section-label', style: { margin: '0' } }, 'ライフイベント積立'),
      h('div', { style: { fontSize: '11px', color: 'var(--muted)' } }, '月 ' + v.eventMonthlyFmt + '円 確保中'),
    ]),
    eventList,
    h('div', { style: { fontSize: '12px', color: 'var(--muted2)', margin: '12px 0 20px 0' } }, '外貨建ての予算は毎日の為替レートで自動円換算されます'),
    addForm,
    h('div', { style: { textAlign: 'center' } }, [h('span', { class: 'btn-add', onclick: v.openAddEvent }, '＋ イベントを追加')]),
  ]);
}

function screenReport(v) {
  const trendChart = v.reportTrendRows.length > 0 ? h('div', { style: { display: 'flex', alignItems: 'flex-end', gap: '6px', height: '90px', marginTop: '6px' } },
    v.reportTrendRows.map(function (m) {
      return h('div', { style: { flex: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%', justifyContent: 'flex-end' } }, [
        h('div', { style: { width: '100%', maxWidth: '28px', height: m.pct, background: m.isCurrent ? 'var(--primary)' : 'var(--border2)', borderRadius: '2px 2px 0 0' } }),
        h('div', { style: { fontSize: '10px', color: m.isCurrent ? 'var(--fg)' : 'var(--muted2)' } }, m.label),
      ]);
    })
  ) : h('div', { style: { fontSize: '12px', color: 'var(--muted2)', padding: '8px 0' } }, 'まだ記録された月がありません。予算画面や現金支出で記録すると推移が表示されます');

  const breakdownList = v.breakdownRows.length > 0 ? h('div', { class: 'list' },
    v.breakdownRows.map(function (b) {
      return listRow([
        h('div', { class: 'row-flex' }, [
          h('div', { class: 'row-top' }, ['#' + b.rank + ' ', b.name]),
          h('div', { style: { display: 'flex', gap: '10px', alignItems: 'baseline' } }, [
            h('span', { class: 'row-note' }, b.pctLabel),
            h('span', { class: 'row-value' }, b.usedFmt + '円'),
          ]),
        ]),
        h('div', { class: 'progress-track' }, [h('div', { style: { width: b.pct, background: 'var(--primary)' } })]),
      ]);
    })
  ) : h('div', { style: { fontSize: '12px', color: 'var(--muted2)', padding: '8px 0' } }, 'この月はまだ支出の記録がありません');

  const momBlock = v.momAvailable ? h('div', { class: 'hero', style: { marginTop: '16px' } }, [
    h('div', { class: 'hero-label' }, '前月比（' + v.prevMonthLabel + ' →）'),
    h('div', { class: 'hero-value', style: { fontSize: '30px', color: v.momColor } }, [v.momDiffFmt]),
    v.momPct !== null ? h('div', { style: { fontSize: '11px', color: 'var(--muted2)', marginTop: '6px' } }, (v.momPct >= 0 ? '+' : '') + v.momPct + '%') : null,
    v.momCategoryRows.length > 0 ? h('div', { style: { marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' } },
      v.momCategoryRows.map(function (r) {
        return h('div', { class: 'row-flex', style: { fontSize: '12px' } }, [
          h('div', { style: { color: 'var(--muted)' } }, r.name),
          h('div', { style: { color: r.color, fontVariantNumeric: 'tabular-nums' } }, r.diffFmt),
        ]);
      })
    ) : null,
  ]) : h('div', { class: 'hero', style: { marginTop: '16px' } }, [
    h('div', { class: 'hero-label' }, '前月比'),
    h('div', { style: { fontSize: '12px', color: 'var(--muted2)', marginTop: '8px' } }, v.prevMonthLabel + 'の記録がまだないため比較できません'),
  ]);

  const statsList = v.statsRows.length > 0 ? h('div', { class: 'list' },
    v.statsRows.map(function (c) {
      return listRow([
        h('div', { class: 'row-flex' }, [
          h('div', { class: 'row-top' }, c.name),
          h('div', { style: { fontSize: '11px', color: 'var(--muted2)' } }, 'n=' + c.n + 'ヶ月'),
        ]),
        h('div', { style: { display: 'flex', gap: '20px', fontSize: '12px' } }, [
          h('div', {}, [h('div', { style: { color: 'var(--muted2)', fontSize: '10px' } }, '平均'), h('div', { style: { fontVariantNumeric: 'tabular-nums' } }, c.avgFmt + '円')]),
          h('div', {}, [h('div', { style: { color: 'var(--muted2)', fontSize: '10px' } }, '最小'), h('div', { style: { fontVariantNumeric: 'tabular-nums' } }, c.minFmt + '円')]),
          h('div', {}, [h('div', { style: { color: 'var(--muted2)', fontSize: '10px' } }, '最大'), h('div', { style: { fontVariantNumeric: 'tabular-nums' } }, c.maxFmt + '円')]),
          h('div', {}, [h('div', { style: { color: 'var(--muted2)', fontSize: '10px' } }, '標準偏差'), h('div', { style: { fontVariantNumeric: 'tabular-nums' } }, '±' + c.sdFmt)]),
        ]),
        c.diffFmt !== null ? h('div', { style: { fontSize: '11px', color: c.diffColor } }, '今月は平均より ' + c.diffFmt) : null,
      ]);
    })
  ) : h('div', { style: { fontSize: '12px', color: 'var(--muted2)', padding: '8px 0' } }, '統計を出すには予算画面で複数ヶ月の実績を記録してください');

  const forecastBlock = v.forecastReliable ? h('div', { style: { marginTop: '16px', fontSize: '12px', color: 'var(--muted)', borderTop: '1px solid var(--border)', paddingTop: '14px' } }, [
    '統計的な年間支出予想（80%信頼区間）： ', h('span', { style: { color: 'var(--fg)' } }, v.forecastLowFmt + '円 〜 ' + v.forecastHighFmt + '円'),
    h('div', { style: { fontSize: '11px', color: 'var(--muted2)', marginTop: '4px' } }, '詳細は「年間」タブを参照'),
  ]) : null;

  const cashStatsBlock = v.cashStatsAvailable ? h('div', { style: { marginTop: '24px' } }, [
    h('div', { class: 'section-label', style: { marginTop: '0' } }, '現金支出の統計（月あたり・n=' + v.cashStats.n + 'ヶ月）'),
    h('div', { style: { display: 'flex', gap: '20px', fontSize: '12px' } }, [
      h('div', {}, [h('div', { style: { color: 'var(--muted2)', fontSize: '10px' } }, '平均'), h('div', { style: { fontVariantNumeric: 'tabular-nums' } }, v.cashStats.avgFmt + '円')]),
      h('div', {}, [h('div', { style: { color: 'var(--muted2)', fontSize: '10px' } }, '最小'), h('div', { style: { fontVariantNumeric: 'tabular-nums' } }, v.cashStats.minFmt + '円')]),
      h('div', {}, [h('div', { style: { color: 'var(--muted2)', fontSize: '10px' } }, '最大'), h('div', { style: { fontVariantNumeric: 'tabular-nums' } }, v.cashStats.maxFmt + '円')]),
      h('div', {}, [h('div', { style: { color: 'var(--muted2)', fontSize: '10px' } }, '標準偏差'), h('div', { style: { fontVariantNumeric: 'tabular-nums' } }, '±' + v.cashStats.sdFmt)]),
    ]),
  ]) : null;

  return h('div', {}, [
    h('div', { class: 'screen-title' }, 'レポート・統計'),
    monthSwitcher(v),
    h('div', { class: 'screen-sub' }, '記録された実績から支出の内訳・推移・統計をまとめて確認できます'),
    h('div', { class: 'section-label', style: { marginTop: '0' } }, '月別支出の推移'),
    trendChart,
    h('div', { class: 'section-label' }, v.viewMonthLabel + 'の内訳（ランキング）'),
    breakdownList,
    momBlock,
    h('div', { class: 'section-label' }, 'カテゴリ別統計（記録済み実績から算出）'),
    statsList,
    forecastBlock,
    cashStatsBlock,
  ]);
}

function screenAnnual(v) {
  const breakdown = h('div', { class: 'list' },
    v.annualRows.map(function (r) {
      return listRow([
        h('div', { class: 'row-flex' }, [
          h('div', { class: 'row-top' }, r.name),
          h('div', { style: { display: 'flex', gap: '8px', alignItems: 'baseline' } }, [
            h('span', { class: 'row-note' }, '月 ' + r.monthlyFmt + '円'),
            h('span', { class: 'row-value' }, '年 ' + r.annualFmt + '円'),
          ]),
        ]),
        h('div', { class: 'progress-track' }, [h('div', { style: { width: r.pct, background: 'var(--primary)' } })]),
        h('div', { class: 'row-note' }, r.note),
      ]);
    })
  );

  const forecastBlock = v.forecastReliable ? h('div', { class: 'hero', style: { marginTop: '16px' } }, [
    h('div', { class: 'hero-label' }, '統計的な年間支出予想（80%信頼区間）'),
    h('div', { style: { display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' } }, [
      h('div', { class: 'hero-value', style: { fontSize: '26px' } }, v.forecastLowFmt),
      h('div', { style: { fontSize: '13px', color: 'var(--muted2)' } }, '円 〜'),
      h('div', { class: 'hero-value', style: { fontSize: '26px' } }, v.forecastHighFmt),
      h('div', { style: { fontSize: '13px', color: 'var(--muted2)' } }, '円'),
    ]),
    h('div', { style: { fontSize: '11px', color: 'var(--muted2)', marginTop: '8px' } },
      '中心値 ' + v.annualTotalFmt + '円・年間の標準偏差 ±' + v.annualStdFmt + '円（記録済み最大' + v.forecastSampleMonths + 'ヶ月分の実績から算出）'),
    v.forecastCategoryRows.length > 0 ? h('div', { style: { marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '6px' } },
      v.forecastCategoryRows.map(function (c) {
        return h('div', { class: 'row-flex', style: { fontSize: '12px' } }, [
          h('div', { style: { color: 'var(--muted)' } }, c.name),
          h('div', { style: { fontVariantNumeric: 'tabular-nums' } }, '月 ' + c.avgFmt + '円 ± ' + c.sdFmt + '円（n=' + c.n + '）'),
        ]);
      })
    ) : null,
  ]) : h('div', { class: 'hero', style: { marginTop: '16px' } }, [
    h('div', { class: 'hero-label' }, '統計的な年間支出予想（80%信頼区間）'),
    h('div', { style: { fontSize: '12px', color: 'var(--muted2)', marginTop: '8px' } },
      '統計的な予測にはあと最低2ヶ月分の予算実績の記録が必要です（現在 ' + v.forecastSampleMonths + 'ヶ月分）。予算画面で毎月記録すると、ばらつきを考慮した予測レンジが表示されます'),
  ]);

  return h('div', {}, [
    h('div', { class: 'screen-title' }, '年間出費シミュレーション'),
    h('div', { class: 'screen-sub' }, '固定費・サブスク・習慣・流動費・ライフイベント積立から12ヶ月分を試算'),
    h('div', { class: 'hero' }, [
      h('div', { class: 'hero-label' }, '年間の支出見込み'),
      h('div', { class: 'hero-value' }, [v.annualTotalFmt, h('span', { class: 'hero-unit' }, ' 円')]),
      h('div', { class: 'hero-sub' }, '年間手取り ' + v.annualNetFmt + '円に対して'),
      h('div', { class: 'progress-track', style: { marginTop: '14px' } }, [
        h('div', { style: { width: v.annualPct, background: v.annualGapColor } }),
      ]),
      h('div', { style: { marginTop: '10px', fontSize: '12px', color: v.annualGapColor } }, v.annualGapMsg),
      h('div', { style: { marginTop: '10px', fontSize: '11px', color: 'var(--muted2)' } }, v.annualBasedNote),
    ]),
    forecastBlock,
    h('div', { class: 'section-label' }, '内訳（月額 × 12ヶ月）'),
    breakdown,
  ]);
}

function screenInvest(v) {
  const cutList = h('div', { class: 'list' },
    v.cutRows.map(function (c) {
      return h('div', { class: 'check-row', onclick: c.toggle }, [
        h('div', { class: 'check-box', style: { borderColor: c.on ? 'var(--green)' : 'var(--border2)', background: c.on ? 'var(--green)' : 'transparent' } }, c.on ? '✓' : ''),
        h('div', { style: { flex: '1' } }, [
          h('div', { class: 'row-top' }, c.label),
          h('div', { class: 'row-note', style: { marginTop: '1px' } }, c.note),
        ]),
        h('div', { style: { fontSize: '13px', color: 'var(--green)', fontVariantNumeric: 'tabular-nums' } }, '+' + c.saveFmt + '円'),
      ]);
    })
  );

  return h('div', {}, [
    h('div', { class: 'hdr-row' }, [
      h('div', { class: 'screen-title', style: { padding: '4px 0 2px 0' } }, '投資シミュレーション'),
      h('div', { class: 'link-quiet', onclick: v.goGoalSettings }, '目標を編集'),
    ]),
    h('div', { class: 'hero' }, [
      h('div', { class: 'hero-label' }, '毎月の投資目標'),
      h('div', { class: 'hero-value', style: { fontSize: '38px' } }, [v.invTargetFmt, h('span', { class: 'hero-unit' }, ' 円')]),
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', marginTop: '16px' } }, [
        h('div', { class: 'row-flex' }, [h('div', { style: { color: 'var(--muted)' } }, 'いま残せるお金'), h('div', { style: { fontVariantNumeric: 'tabular-nums' } }, v.surplusFmt + '円')]),
        h('div', { class: 'row-flex' }, [h('div', { style: { color: 'var(--muted)' } }, '選んだ削減プラン'), h('div', { style: { color: 'var(--green)', fontVariantNumeric: 'tabular-nums' } }, '+' + v.cutsTotalFmt + '円')]),
        h('div', { class: 'row-flex', style: { borderTop: '1px solid var(--border)', paddingTop: '10px' } }, [h('div', {}, 'あと必要な削減'), h('div', { style: { color: v.gapColor, fontVariantNumeric: 'tabular-nums' } }, v.gapLabel)]),
      ]),
      h('div', { class: 'progress-track', style: { marginTop: '14px' } }, [h('div', { style: { width: v.investPct, background: 'var(--green)' } })]),
      h('div', { style: { marginTop: '10px', fontSize: '12px', color: v.gapColor } }, v.investMsg),
    ]),
    h('div', { class: 'section-label' }, '削減プランを選ぶ（明細から提案）'),
    cutList,
  ]);
}

function screenSalary(v) {
  const furusatoText = document.createTextNode('上限 ' + v.furusatoFmt + '円');
  const furusatoGiftText = document.createTextNode(v.furusatoGiftValueFmt);
  const idecoText = document.createTextNode(v.idecoFmt);
  const dedTotalText = document.createTextNode(v.dedTotalFmt);

  return h('div', {}, [
    h('div', { class: 'hdr-row' }, [
      h('div', { class: 'screen-title', style: { padding: '4px 0 2px 0' } }, '給与と税金'),
      h('div', { class: 'link-quiet', onclick: v.goSalarySettings }, '設定を変更'),
    ]),
    h('div', { class: 'hero' }, [
      h('div', { class: 'hero-label' }, '今月の手取り'),
      h('div', { class: 'hero-value', style: { fontSize: '38px' } }, [v.netFmt, h('span', { class: 'hero-unit' }, ' 円')]),
      h('div', { class: 'hero-sub' }, '月収（額面） ' + v.grossFmt + '円'),
      h('div', { class: 'progress-track split', style: { marginTop: '14px', marginBottom: '16px' } }, [
        h('div', { style: { width: v.kenkoPct, background: 'var(--muted2)' } }),
        h('div', { style: { width: v.koseiPct, background: 'var(--primary)' } }),
        h('div', { style: { width: v.koyouPct, background: 'var(--muted2)' } }),
        h('div', { style: { width: v.shotokuPct, background: 'var(--red)' } }),
        h('div', { style: { width: v.juminPct, background: 'var(--amber)' } }),
        h('div', { style: { flex: '1', background: 'var(--green)' } }),
      ]),
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' } }, [
        h('div', { class: 'row-flex' }, [h('div', { style: { color: 'var(--muted)' } }, '健康保険'), h('div', { style: { fontVariantNumeric: 'tabular-nums' } }, '-' + v.kenkoFmt + '円')]),
        h('div', { class: 'row-flex' }, [h('div', { style: { color: 'var(--muted)' } }, '厚生年金'), h('div', { style: { fontVariantNumeric: 'tabular-nums' } }, '-' + v.koseiFmt + '円')]),
        h('div', { class: 'row-flex' }, [h('div', { style: { color: 'var(--muted)' } }, '雇用保険'), h('div', { style: { fontVariantNumeric: 'tabular-nums' } }, '-' + v.koyouFmt + '円')]),
        h('div', { class: 'row-flex' }, [h('div', { style: { color: 'var(--muted)' } }, '所得税（予測）'), h('div', { style: { fontVariantNumeric: 'tabular-nums' } }, '-' + v.shotokuFmt + '円')]),
        h('div', { class: 'row-flex' }, [h('div', { style: { color: 'var(--muted)' } }, '住民税（予測）'), h('div', { style: { fontVariantNumeric: 'tabular-nums' } }, '-' + v.juminFmt + '円')]),
        h('div', { class: 'row-flex', style: { borderTop: '1px solid var(--border)', paddingTop: '10px', fontSize: '15px' } }, [h('div', { style: { color: 'var(--green)' } }, '手取り'), h('div', { style: { fontVariantNumeric: 'tabular-nums' } }, v.netFmt + '円')]),
      ]),
      h('div', { style: { marginTop: '14px', fontSize: '11px', color: 'var(--muted2)' } }, '* 扶養なし・40歳未満（介護保険料なし）の概算。住民税は賞与からは源泉徴収されない前提です'),
    ]),
    h('div', { class: 'row-flex', style: { margin: '0 0 4px 0' } }, [
      h('div', { class: 'section-label', style: { margin: '0' } }, '賞与（ボーナス）'),
      h('div', { style: { fontSize: '11px', color: 'var(--green)' } }, '年間手取り合計 ' + v.bonusAnnualNetFmt + '円'),
    ]),
    h('div', { class: 'list' },
      v.bonusRows.map(function (b) {
        return listRow([
          h('div', { class: 'row-flex' }, [
            h('div', { class: 'row-top' }, [b.label + '（' + b.month + '月）', b.isThisMonth ? h('span', { style: { fontSize: '10px', color: 'var(--primary2)', marginLeft: '6px' } }, '今月') : null]),
            h('div', { style: { fontSize: '13px', fontVariantNumeric: 'tabular-nums' } }, b.amountFmt + '円'),
          ]),
          h('div', { class: 'row-note' }, '健康保険 -' + b.kenkoFmt + '円 ・ 厚生年金 -' + b.koseiFmt + '円 ・ 雇用保険 -' + b.koyouFmt + '円 ・ 所得税 -' + b.shotokuFmt + '円'),
          h('div', { class: 'row-flex' }, [
            h('div', { style: { fontSize: '12px', color: 'var(--muted)' } }, '手取り'),
            h('div', { style: { fontSize: '13px', color: 'var(--green)', fontVariantNumeric: 'tabular-nums' } }, b.netFmt + '円'),
          ]),
        ]);
      })
    ),
    h('div', { class: 'row-flex', style: { margin: '24px 0 4px 0' } }, [
      h('div', { class: 'section-label', style: { margin: '0' } }, '節税テクニック'),
      h('div', { style: { fontSize: '11px', color: 'var(--green)' } }, [dedTotalText, document.createTextNode('円/年 の節税余地')]),
    ]),
    h('div', { class: 'list' }, [
      listRow([
        h('div', { class: 'row-flex' }, [
          h('div', { class: 'row-top' }, 'ふるさと納税'),
          h('div', { style: { fontSize: '12px', color: 'var(--green)' } }, [furusatoText]),
        ]),
        h('div', { class: 'row-note' }, ['実質負担2,000円で、約', furusatoGiftText, '円分の返礼品が目安。今年はまだ未利用']),
      ]),
      listRow([
        h('div', { class: 'row-flex' }, [
          h('div', { class: 'row-top' }, 'iDeCo（月2.3万）'),
          h('div', { style: { fontSize: '12px', color: 'var(--green)' } }, ['年 ', idecoText, '円 節税']),
        ]),
        h('div', { class: 'row-note' }, '年間掛金 ' + v.idecoAnnualFmt + '円が全額所得控除。税率（所得税+住民税10%）に応じて節税額は変わります'),
      ]),
      listRow([
        h('div', { class: 'row-flex' }, [
          h('div', { class: 'row-top' }, 'NISA枠の活用'),
          h('div', { style: { fontSize: '12px', color: 'var(--muted)' } }, v.nisaYearTotalFmt + ' / ' + v.nisaLimitFmt + '円'),
        ]),
        h('div', { class: 'progress-track' }, [h('div', { style: { width: v.nisaPct, background: 'var(--primary)' } })]),
        h('div', { class: 'row-note' }, v.nisaYearTotalFmt === '0'
          ? '資金移動で「NISA枠の利用」として記録すると、今年の利用額がここに反映されます'
          : ('残り枠 ' + v.nisaRemainingFmt + '円。運用益が非課税になる枠です（節税余地には含めていません）')),
      ]),
      listRow([
        h('div', { class: 'row-flex' }, [
          h('div', { class: 'row-top' }, '医療費控除'),
          h('div', { style: { fontSize: '12px', color: v.medicalOverThreshold ? 'var(--green)' : 'var(--muted)' } }, v.medicalPaidFmt + ' / ' + v.medicalThresholdFmt + '円'),
        ]),
        h('div', { class: 'progress-track' }, [h('div', { style: { width: v.medicalPct, background: v.medicalOverThreshold ? 'var(--green)' : 'var(--muted2)' } })]),
        h('div', { class: 'row-note' }, v.medicalOverThreshold
          ? ('明細から自動集計。10万円超過分が控除対象・年 ' + v.medicalSavingFmt + '円の節税')
          : ('明細から自動集計。あと ' + v.medicalGapFmt + '円で控除対象になります')),
      ]),
    ]),
  ]);
}

function screenSalarySettings(v) {
  const grossText = document.createTextNode(v.grossFmt);
  const netText = document.createTextNode(v.netFmt + '円');

  const grossSlider = h('input', {
    type: 'range', min: '300000', max: '1200000', step: '10000', value: v.gross,
    oninput: function (e) {
      const p = v.previewSalary(+e.target.value);
      grossText.textContent = p.grossFmt;
      netText.textContent = p.netFmt + '円';
    },
    onchange: v.onGross,
  });

  const bonusList = h('div', { class: 'list' },
    v.bonusRows.map(function (b) {
      return listRow([
        h('div', { class: 'row-flex' }, [
          h('div', { class: 'row-top' }, b.label),
          h('div', { style: { fontSize: '13px', fontVariantNumeric: 'tabular-nums' } }, '手取り ' + b.netFmt + '円'),
        ]),
        h('div', { style: { display: 'flex', gap: '16px', alignItems: 'center' } }, [
          h('div', { style: { flex: '1' } }, [
            h('span', { class: 'field-label' }, '支給月'),
            h('select', { class: 'field-select', value: String(b.month), onchange: b.onMonth },
              Array.from({ length: 12 }, function (_, i) { return i + 1; }).map(function (mo) {
                return h('option', { value: String(mo) }, mo + '月');
              })
            ),
          ]),
          h('div', { style: { flex: '2' } }, [
            h('span', { class: 'field-label' }, '支給額　' + b.amountFmt + '円'),
            h('input', { type: 'range', min: '0', max: '2000000', step: '10000', value: b.amount, onchange: b.onAmount }),
          ]),
        ]),
      ]);
    })
  );

  return h('div', {}, [
    h('div', { class: 'hdr-row' }, [
      h('div', { class: 'screen-title', style: { padding: '4px 0 2px 0' } }, '給与・賞与の設定'),
      h('div', { class: 'link-quiet', onclick: v.goSalary }, '概要へ戻る'),
    ]),
    h('div', { class: 'screen-sub' }, 'ここで設定した内容が「給与」画面の表示に反映されます'),
    h('div', { class: 'hero' }, [
      h('div', { class: 'hero-label' }, '月収（額面）'),
      h('div', { class: 'hero-value', style: { fontSize: '38px' } }, [grossText, h('span', { class: 'hero-unit' }, ' 円')]),
      grossSlider,
      h('div', { class: 'hero-sub' }, ['手取り 見込み ', netText]),
    ]),
    h('div', { class: 'section-label' }, '賞与（ボーナス）'),
    bonusList,
  ]);
}

function screenGoalSettings(v) {
  const savingsGoalText = document.createTextNode(v.savingsGoalFmt);
  const savingsBarFill = h('div', { style: { width: v.savingsGoalPct, background: 'var(--green)' } });
  const savingsMsgText = document.createTextNode(v.savingsGoalMsg);
  const savingsMsgEl = h('div', { style: { fontSize: '12px', marginTop: '8px', color: v.savingsGoalColor } }, [savingsMsgText]);
  const savingsSlider = h('input', {
    type: 'range', min: '0', max: '500000', step: '10000', value: v.savingsGoal,
    oninput: function (e) {
      const p = v.previewSavingsGoal(+e.target.value);
      savingsGoalText.textContent = p.goalFmt;
      savingsBarFill.style.width = p.pct;
      savingsMsgText.textContent = p.msg;
      savingsMsgEl.style.color = p.color;
    },
    onchange: v.onSavingsGoal,
  });

  const spendGoalText = document.createTextNode(v.spendGoalFmt);
  const spendBarFill = h('div', { style: { width: v.spendGoalPct, background: v.spendGoalColor } });
  const spendMsgText = document.createTextNode(v.spendGoalMsg);
  const spendMsgEl = h('div', { style: { fontSize: '12px', marginTop: '8px', color: v.spendGoalColor } }, [spendMsgText]);
  const spendSlider = h('input', {
    type: 'range', min: '100000', max: '600000', step: '5000', value: v.spendGoal,
    oninput: function (e) {
      const p = v.previewSpendGoal(+e.target.value);
      spendGoalText.textContent = p.goalFmt;
      spendBarFill.style.width = p.pct;
      spendBarFill.style.background = p.color;
      spendMsgText.textContent = p.msg;
      spendMsgEl.style.color = p.color;
    },
    onchange: v.onSpendGoal,
  });

  const investText = document.createTextNode(v.invTargetFmt);
  const investBarFill = h('div', { style: { width: v.investPct, background: 'var(--green)' } });
  const investMsgText = document.createTextNode(v.investMsg);
  const investMsgEl = h('div', { style: { fontSize: '12px', marginTop: '8px', color: v.gapColor } }, [investMsgText]);
  const investSlider = h('input', {
    type: 'range', min: '30000', max: '200000', step: '5000', value: v.invTarget,
    oninput: function (e) {
      const p = v.previewInvest(+e.target.value);
      investText.textContent = p.targetFmt;
      investBarFill.style.width = p.investPct;
      investMsgText.textContent = p.investMsg;
      investMsgEl.style.color = p.gapColor;
    },
    onchange: v.onInvTarget,
  });

  function goalSection(label, valueText, unit, slider, barFill, msgEl) {
    return h('div', { style: { marginBottom: '28px' } }, [
      h('div', { class: 'row-flex' }, [
        h('div', { class: 'section-label', style: { margin: '0' } }, label),
        h('div', { style: { fontSize: '15px', fontVariantNumeric: 'tabular-nums' } }, [valueText, h('span', { style: { color: 'var(--muted)', fontSize: '12px' } }, unit)]),
      ]),
      slider,
      h('div', { class: 'progress-track' }, [barFill]),
      msgEl,
    ]);
  }

  return h('div', {}, [
    h('div', { class: 'hdr-row' }, [
      h('div', { class: 'screen-title', style: { padding: '4px 0 2px 0' } }, '目標の設定'),
      h('div', { class: 'link-quiet', onclick: v.goHome }, 'ホームへ戻る'),
    ]),
    h('div', { class: 'screen-sub' }, 'ここで設定した目標が、ホーム・支出・投資の各画面に反映されます'),
    goalSection('残せるお金の目標', savingsGoalText, '円', savingsSlider, savingsBarFill, savingsMsgEl),
    goalSection('支出の目標', spendGoalText, '円', spendSlider, spendBarFill, spendMsgEl),
    goalSection('毎月の投資目標', investText, '円', investSlider, investBarFill, investMsgEl),
  ]);
}

function renderTopbar(v) {
  return h('div', { class: 'topbar' }, [
    h('div', { class: 'menu-btn', onclick: v.toggleMenu }, [
      h('div', { class: 'menu-btn-line' }), h('div', { class: 'menu-btn-line' }), h('div', { class: 'menu-btn-line' }),
    ]),
    h('div', { class: 'topbar-title' }, 'KAKEIBO'),
  ]);
}

function renderMenu(v) {
  if (!v.menuOpen) return null;
  return h('div', { class: 'menu-overlay', onclick: v.closeMenu }, [
    h('div', { class: 'menu-panel', onclick: function (e) { e.stopPropagation(); } }, [
      h('div', { class: 'menu-panel-title' }, 'メニュー'),
      h('div', {}, v.tabs.map(function (t) {
        return h('div', { class: 'menu-item', style: { color: t.active ? 'var(--fg)' : 'var(--muted)' }, onclick: t.go }, t.label);
      })),
      h('div', { class: 'menu-item', style: { color: 'var(--muted)' }, onclick: signOut }, 'ログアウト'),
    ]),
  ]);
}

/* ---------- root render ---------- */
const contentEl = document.getElementById('content');
const topbarEl = document.getElementById('topbar');
const menuEl = document.getElementById('menu');

function render() {
  const active = document.activeElement;
  const field = active && contentEl.contains(active) ? active.getAttribute('data-field') : null;
  const selStart = field && 'selectionStart' in active ? active.selectionStart : null;
  const selEnd = field && 'selectionEnd' in active ? active.selectionEnd : null;
  const scrollTop = contentEl.scrollTop;

  const v = computeVals();
  let screen;
  if (v.isHome) screen = screenHome(v);
  else if (v.isExpense) screen = screenExpense(v);
  else if (v.isHabit) screen = screenHabit(v);
  else if (v.isBudget) screen = screenBudget(v);
  else if (v.isReport) screen = screenReport(v);
  else if (v.isAnnual) screen = screenAnnual(v);
  else if (v.isInvest) screen = screenInvest(v);
  else if (v.isSalarySettings) screen = screenSalarySettings(v);
  else if (v.isGoalSettings) screen = screenGoalSettings(v);
  else screen = screenSalary(v);

  contentEl.innerHTML = '';
  contentEl.appendChild(screen);
  topbarEl.innerHTML = '';
  topbarEl.appendChild(renderTopbar(v));
  menuEl.innerHTML = '';
  const menu = renderMenu(v);
  if (menu) menuEl.appendChild(menu);

  contentEl.scrollTop = scrollTop;
  if (field) {
    const next = contentEl.querySelector('[data-field="' + field + '"]');
    if (next) {
      next.focus();
      if (selStart !== null && selEnd !== null && 'setSelectionRange' in next) {
        try { next.setSelectionRange(selStart, selEnd); } catch (e) { /* not supported for this input type */ }
      }
    }
  }
}

boot();
