/* ---------- month helpers ---------- */
export function monthKey(d: Date): string {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}
export function shiftMonthKey(key: string, delta: number): string {
  const parts = key.split('-');
  const y = +parts[0], m = +parts[1] - 1 + delta;
  const d = new Date(y, m, 1);
  return monthKey(d);
}
export function monthLabel(key: string): string {
  const parts = key.split('-');
  return +parts[0] + '年' + (+parts[1]) + '月';
}
export function isoDate(d: Date): string {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
/** 「2027年6月」「2027-6」等の時期文字列を <input type="month"> 用の "2027-06" に正規化。読めなければ ''。 */
export function whenToMonthValue(when: string): string {
  const m = when.match(/^(\d{4})[年-](\d{1,2})月?$/);
  return m ? m[1] + '-' + m[2].padStart(2, '0') : '';
}
/** "2027-06" → 「2027年6月」。空なら「時期未定」。 */
export function monthValueToWhen(v: string): string {
  return v ? monthLabel(v) : '時期未定';
}
/** 開始月から対象月まで("YYYY-MM"同士)の積立回数。逆転や同月は最低1。 */
export function monthsBetweenMonths(startV: string, endV: string): number {
  const a = startV.split('-'), b = endV.split('-');
  return Math.max(1, (+b[0] - +a[0]) * 12 + (+b[1] - +a[1]));
}
/** 今月から対象月("YYYY-MM")までの残り月数。過去や当月は最低1。 */
export function monthsUntilMonth(v: string, from: Date = new Date()): number {
  const parts = v.split('-');
  const diff = (+parts[0] - from.getFullYear()) * 12 + (+parts[1] - (from.getMonth() + 1));
  return Math.max(1, diff);
}
export function dateShortLabel(iso?: string): string {
  if (!iso) return '';
  const parts = iso.split('-');
  return +parts[1] + '/' + +parts[2];
}

/* ---------- domain constants ---------- */
export const RATES: Record<string, number> = { JPY: 1, USD: 157.2, EUR: 170.4 };
export const SYM: Record<string, string> = { JPY: '', USD: '$', EUR: '€' };
export const COACH_ON = true;

export function fmt(n: number): string {
  return Math.round(n).toLocaleString('ja-JP');
}

/* ---------- basic stats helpers ---------- */
export function mean(arr: number[]): number {
  return arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;
}
export function stdev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const variance = arr.reduce((a, b) => a + (b - m) * (b - m), 0) / (arr.length - 1);
  return Math.sqrt(variance);
}
export const Z80 = 1.2816; /* 80%信頼区間のz値 */

/* ---------- subscription billing-cycle helpers ---------- */
export function subMonthly(sub: { cycle: string; price: number }): number {
  return sub.cycle === 'annual' ? sub.price / 12 : sub.price;
}
export function subAnnual(sub: { cycle: string; price: number }): number {
  return sub.cycle === 'annual' ? sub.price : sub.price * 12;
}

/* employee-side rates (協会けんぽ全国平均・厚生年金・雇用保険一般の目安。介護保険は40歳未満想定で除く) */
const KENKO_HOKEN_RATE = 0.0495;
const KOSEI_NENKIN_RATE = 0.0915;
const KOSEI_NENKIN_CAP_BASE = 650000; /* 標準報酬月額の上限（簡易モデル） */
const KOYOU_HOKEN_RATE = 0.006;
const BONUS_KOSEI_NENKIN_CAP_BASE = 1500000; /* 賞与ごとの厚生年金上限（簡易モデル） */

export function shakaiHoken(gross: number) {
  const kenko = Math.round(gross * KENKO_HOKEN_RATE);
  const kousei = Math.round(Math.min(gross, KOSEI_NENKIN_CAP_BASE) * KOSEI_NENKIN_RATE);
  const koyou = Math.round(gross * KOYOU_HOKEN_RATE);
  return { kenko, kousei, koyou, total: kenko + kousei + koyou };
}

export function tax(gross: number) {
  const annual = gross * 12;
  const sh = shakaiHoken(gross);
  const shakai = sh.total;
  let ded: number;
  if (annual <= 1625000) ded = 550000;
  else if (annual <= 1800000) ded = annual * 0.4 - 100000;
  else if (annual <= 3600000) ded = annual * 0.3 + 80000;
  else if (annual <= 6600000) ded = annual * 0.2 + 440000;
  else if (annual <= 8500000) ded = annual * 0.1 + 1100000;
  else ded = 1950000;
  const taxable = Math.max(0, annual - ded - shakai * 12 - 480000);
  const brackets: [number, number, number][] = [
    [1950000, .05, 0], [3300000, .10, 97500], [6950000, .20, 427500],
    [9000000, .23, 636000], [18000000, .33, 1536000], [40000000, .40, 2796000],
    [Infinity, .45, 4796000],
  ];
  const b = brackets.find((x) => taxable <= x[0])!;
  const shotoku = Math.round((taxable * b[1] - b[2]) * 1.021 / 12);
  const jumin = Math.round(taxable * 0.10 / 12);
  return {
    shakai, kenko: sh.kenko, kousei: sh.kousei, koyou: sh.koyou,
    shotoku: Math.max(0, shotoku), jumin, net: gross - shakai - Math.max(0, shotoku) - jumin,
    marginalRate: taxable > 0 ? b[1] : 0, annualTaxable: taxable,
  };
}

export function bonusTax(bonusGross: number, marginalRate: number) {
  const kenko = Math.round(bonusGross * KENKO_HOKEN_RATE);
  const kousei = Math.round(Math.min(bonusGross, BONUS_KOSEI_NENKIN_CAP_BASE) * KOSEI_NENKIN_RATE);
  const koyou = Math.round(bonusGross * KOYOU_HOKEN_RATE);
  const shakai = kenko + kousei + koyou;
  const taxable = Math.max(0, bonusGross - shakai);
  const shotoku = Math.round(taxable * marginalRate * 1.021);
  return { shakai, kenko, kousei, koyou, shotoku, net: bonusGross - shakai - shotoku };
}

/* ---------- card-statement merchant normalization ---------- */
// Card statements use full-width (zenkaku) Latin letters/punctuation/spaces
// ('ＣＬＡＵＤＥ', '．', '　'); normalize to half-width before keyword matching.
export function toHalfWidth(str: string): string {
  return str
    .replace(/[！-～]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
    .replace(/　/g, ' ');
}

/* Map a raw card-statement merchant string to a stable id + clean display
   name (+ billing cycle), so real recurring charges (Claude, Google One,
   Udemy, ...) show up by name instead of generic placeholders. */
const SUB_NAME_RULES: [RegExp, string, string, string][] = [
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
export function canonicalSubName(rawMerchant: string): { id: string; name: string; cycle: string } {
  const merchant = toHalfWidth(rawMerchant).trim();
  for (const rule of SUB_NAME_RULES) if (rule[0].test(merchant)) return { id: rule[1], name: rule[2], cycle: rule[3] };
  const id = 'sub-' + merchant.toLowerCase().replace(/[^a-z0-9ぁ-んァ-ン一-龠]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  const isAnnual = /年会費|年間登録/.test(merchant);
  return { id: id || 'sub-other', name: merchant, cycle: isAnnual ? 'annual' : 'monthly' };
}
