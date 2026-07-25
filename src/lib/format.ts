import { fmt } from './calc';

/** 万円要約表記（10k未満はフル桁、10k以上は小数1桁で単位省略） */
export function fmtMan(yen: number): string {
  if (Math.abs(yen) < 10000) {
    return fmt(yen) + '円';
  }

  const isNegative = yen < 0;
  const absYen = Math.abs(yen);

  if (absYen < 100000000) {
    // 万円表記（～9999万円）
    const value = absYen / 10000;
    const rounded = Math.round(value * 10) / 10;
    const str = rounded % 1 === 0 ? Math.round(rounded).toString() : rounded.toString();
    return (isNegative ? '-' : '') + str + '万円';
  } else {
    // 億円表記（1億以上）
    const value = absYen / 100000000;
    const rounded = Math.round(value * 10) / 10;
    const str = rounded % 1 === 0 ? Math.round(rounded).toString() : rounded.toString();
    return (isNegative ? '-' : '') + str + '億円';
  }
}

/** 符号付きフル桁表記（0は「±0」） */
export function fmtSigned(yen: number): string {
  const rounded = Math.round(yen);
  if (rounded === 0) {
    return '±0';
  }
  const absStr = fmt(Math.abs(rounded));
  return (rounded > 0 ? '+' : '-') + absStr;
}

/** パーセンテージ表記（四捨五入） */
export function fmtPct(ratio: number): string {
  return Math.round(ratio * 100) + '%';
}
