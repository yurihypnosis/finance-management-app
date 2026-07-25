import { useState } from 'react';
import type { Computed } from '../hooks/useComputed';
import { ListRow } from '../components/common';
import { ScreenHeader } from '../components/ScreenHeader';
import { StackedBar } from '../components/charts';
import { ColorChip, Badge, InfoTip } from '../components/parts';
import { Sheet } from '../components/Sheet';
import './Salary.css';

/**
 * 控除の色割り当て。muted 系のバリエーション（--cat-* は green/amber と同じ
 * 落ち着いたトーン家族）から red を避けて選ぶ — 税金は「警告」ではないため。
 * StackedBar のセグメント色とリストの ColorChip 色を同じ配列から引くことで
 * 対応関係を自明にする。
 */
const DEDUCTIONS: { key: 'kenko' | 'kosei' | 'koyou' | 'shotoku' | 'jumin'; label: string; color: string }[] = [
  { key: 'kenko', label: '健康保険', color: 'var(--cat-4)' },
  { key: 'kosei', label: '厚生年金', color: 'var(--cat-9)' },
  { key: 'koyou', label: '雇用保険', color: 'var(--cat-8)' },
  { key: 'shotoku', label: '所得税（予測）', color: 'var(--cat-6)' },
  { key: 'jumin', label: '住民税（予測）', color: 'var(--cat-2)' },
];

const SALARY_NOTE = '扶養なし・40歳未満（介護保険料なし）の概算です。住民税は賞与からは源泉徴収されない前提です';

type TechKey = 'furusato' | 'ideco' | 'nisa' | 'medical';

export function Salary({ v }: { v: Computed }) {
  const [bonusSheetId, setBonusSheetId] = useState<string | null>(null);
  const [techSheet, setTechSheet] = useState<TechKey | null>(null);

  const bonusSheetRow = v.bonusRows.find((b) => b.id === bonusSheetId) ?? null;

  return (
    <div>
      <ScreenHeader title="給与" action={{ label: '設定を変更', onClick: v.goSalarySettings }} />

      {/* ---- ヒーロー: 今月の手取り ---- */}
      <div className="hero">
        <div className="hero-label">今月の手取り</div>
        <div className="hero-value">
          {v.netFmt}
          <span className="hero-unit"> 円</span>
        </div>
        <div className="hero-sub salary-hero-sub">額面 {v.grossFmt}円から −{v.deductionTotalFmt}円</div>

        <StackedBar
          className="salary-breakdown-bar"
          height={8}
          total={v.gross}
          ariaLabel="給与の控除内訳"
          segments={DEDUCTIONS.map((d) => ({ value: v[d.key], color: d.color, label: d.label }))}
        />

        <div className="salary-breakdown-list">
          {DEDUCTIONS.map((d) => (
            <div key={d.key} className="row-flex salary-breakdown-row">
              <div className="salary-breakdown-name"><ColorChip color={d.color} />{d.label}</div>
              <div className="salary-breakdown-value">-{v[`${d.key}Fmt`]}円</div>
            </div>
          ))}
          <div className="row-flex salary-breakdown-row salary-breakdown-row--net">
            <div className="salary-breakdown-name">手取り</div>
            <div className="salary-breakdown-value">{v.netFmt}円</div>
          </div>
        </div>

        <div className="salary-hero-foot">
          <InfoTip text={SALARY_NOTE} />
        </div>
      </div>

      {/* ---- 賞与 ---- */}
      <div className="row-flex salary-section-head">
        <div className="section-label">賞与（ボーナス）</div>
        <div className="salary-section-total">年間手取り合計 {v.bonusAnnualNetFmt}円</div>
      </div>
      <div className="list">
        {v.bonusRows.map((b) => (
          <ListRow key={b.id}>
            <div className="row-flex salary-bonus-row" onClick={() => setBonusSheetId(b.id)} role="button">
              <div className="salary-bonus-title">
                <span className="row-top">{b.label}（{b.month}月）・手取り {b.netFmt}円</span>
                {b.isThisMonth && <Badge label="今月" tone="neutral" />}
              </div>
            </div>
          </ListRow>
        ))}
      </div>

      {/* ---- 節税テクニック ---- */}
      <div className="row-flex salary-section-head">
        <div className="section-label">節税テクニック</div>
        <div className="salary-section-total">合計 {v.dedTotalFmt}円/年 の節税余地</div>
      </div>
      <div className="list">
        <ListRow>
          <div className="salary-tech-row" onClick={() => setTechSheet('furusato')} role="button">
            <div className="row-flex">
              <div className="row-top">ふるさと納税</div>
              <div className="salary-tech-headline" style={{ color: 'var(--color-positive)' }}>上限 {v.furusatoFmt}円</div>
            </div>
          </div>
        </ListRow>
        <ListRow>
          <div className="salary-tech-row" onClick={() => setTechSheet('ideco')} role="button">
            <div className="row-flex">
              <div className="row-top">iDeCo（月2.3万）</div>
              <div className="salary-tech-headline" style={{ color: 'var(--color-positive)' }}>年 {v.idecoFmt}円 節税</div>
            </div>
          </div>
        </ListRow>
        <ListRow>
          <div className="salary-tech-row" onClick={() => setTechSheet('nisa')} role="button">
            <div className="row-flex">
              <div className="row-top">NISA枠の活用</div>
              <div className="salary-tech-headline">{v.nisaYearTotalFmt} / {v.nisaLimitFmt}円</div>
            </div>
          </div>
        </ListRow>
        <ListRow>
          <div className="salary-tech-row" onClick={() => setTechSheet('medical')} role="button">
            <div className="row-flex">
              <div className="row-top">医療費控除</div>
              <div className="salary-tech-headline" style={{ color: v.medicalOverThreshold ? 'var(--color-positive)' : undefined }}>
                {v.medicalPaidFmt} / {v.medicalThresholdFmt}円
              </div>
            </div>
          </div>
        </ListRow>
      </div>

      {/* ---- 賞与の控除内訳シート ---- */}
      <Sheet open={!!bonusSheetRow} onClose={() => setBonusSheetId(null)} title={bonusSheetRow ? `${bonusSheetRow.label}（${bonusSheetRow.month}月）` : undefined}>
        {bonusSheetRow && (
          <div className="salary-sheet-figures">
            <div className="row-flex salary-sheet-figrow"><div>支給額（額面）</div><div>{bonusSheetRow.amountFmt}円</div></div>
            <div className="row-flex salary-sheet-figrow"><div>健康保険</div><div>-{bonusSheetRow.kenkoFmt}円</div></div>
            <div className="row-flex salary-sheet-figrow"><div>厚生年金</div><div>-{bonusSheetRow.koseiFmt}円</div></div>
            <div className="row-flex salary-sheet-figrow"><div>雇用保険</div><div>-{bonusSheetRow.koyouFmt}円</div></div>
            <div className="row-flex salary-sheet-figrow"><div>所得税</div><div>-{bonusSheetRow.shotokuFmt}円</div></div>
            <div className="row-flex salary-sheet-figrow salary-sheet-figrow--net"><div>手取り</div><div>{bonusSheetRow.netFmt}円</div></div>
          </div>
        )}
      </Sheet>

      {/* ---- 節税テクニック詳細シート ---- */}
      <Sheet open={techSheet === 'furusato'} onClose={() => setTechSheet(null)} title="ふるさと納税">
        <div className="salary-tech-detail">
          <div className="salary-tech-detail-figure">上限目安 {v.furusatoFmt}円/年</div>
          <div className="row-note">実質負担2,000円で、約{v.furusatoGiftValueFmt}円分の返礼品が目安です。今年はまだ未利用です</div>
        </div>
      </Sheet>

      <Sheet open={techSheet === 'ideco'} onClose={() => setTechSheet(null)} title="iDeCo（月2.3万）">
        <div className="salary-tech-detail">
          <div className="salary-tech-detail-figure">年間掛金 {v.idecoAnnualFmt}円 ・ 節税額 年 {v.idecoFmt}円</div>
          <div className="row-note">年間掛金が全額所得控除になります。税率（所得税+住民税10%）に応じて節税額は変わります</div>
        </div>
      </Sheet>

      <Sheet open={techSheet === 'nisa'} onClose={() => setTechSheet(null)} title="NISA枠の活用">
        <div className="salary-tech-detail">
          <div className="salary-tech-detail-figure">{v.nisaYearTotalFmt} / {v.nisaLimitFmt}円</div>
          <StackedBar className="salary-tech-detail-bar" total={v.nisaLimitAnnual} segments={[{ value: v.nisaYearTotal, color: 'var(--primary)' }]} />
          <div className="row-note salary-tech-detail-note">
            {v.nisaYearTotalFmt === '0'
              ? '資金移動で「NISA枠の利用」として記録すると、今年の利用額がここに反映されます'
              : '残り枠 ' + v.nisaRemainingFmt + '円です。運用益が非課税になる枠で、節税余地には含めていません'}
          </div>
        </div>
      </Sheet>

      <Sheet open={techSheet === 'medical'} onClose={() => setTechSheet(null)} title="医療費控除">
        <div className="salary-tech-detail">
          <div className="salary-tech-detail-figure">{v.medicalPaidFmt} / {v.medicalThresholdFmt}円</div>
          <StackedBar className="salary-tech-detail-bar" total={v.medicalThreshold} segments={[{ value: v.medicalPaid, color: v.medicalOverThreshold ? 'var(--color-positive)' : 'var(--muted2)' }]} />
          <div className="row-note salary-tech-detail-note">
            {v.medicalOverThreshold
              ? '明細から自動集計しています。10万円超過分が控除対象で、年 ' + v.medicalSavingFmt + '円の節税になります'
              : '明細から自動集計しています。あと ' + v.medicalGapFmt + '円で控除対象になります'}
          </div>
        </div>
      </Sheet>
    </div>
  );
}
