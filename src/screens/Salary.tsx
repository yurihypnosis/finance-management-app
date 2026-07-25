import type { Computed } from '../hooks/useComputed';
import { ListRow } from '../components/common';

export function Salary({ v }: { v: Computed }) {
  return (
    <div>
      <div className="hdr-row">
        <div className="screen-title" style={{ padding: '4px 0 2px 0' }}>給与と税金</div>
        <div className="link-quiet" onClick={v.goSalarySettings}>設定を変更</div>
      </div>
      <div className="hero">
        <div className="hero-label">今月の手取り</div>
        <div className="hero-value" style={{ fontSize: '38px' }}>{v.netFmt}<span className="hero-unit"> 円</span></div>
        <div className="hero-sub">月収（額面） {v.grossFmt}円</div>
        <div className="progress-track split" style={{ marginTop: '14px', marginBottom: '16px' }}>
          <div style={{ width: v.kenkoPct, background: 'var(--muted2)' }} />
          <div style={{ width: v.koseiPct, background: 'var(--primary)' }} />
          <div style={{ width: v.koyouPct, background: 'var(--muted2)' }} />
          <div style={{ width: v.shotokuPct, background: 'var(--red)' }} />
          <div style={{ width: v.juminPct, background: 'var(--amber)' }} />
          <div style={{ flex: 1, background: 'var(--green)' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
          <div className="row-flex"><div style={{ color: 'var(--muted)' }}>健康保険</div><div style={{ fontVariantNumeric: 'tabular-nums' }}>-{v.kenkoFmt}円</div></div>
          <div className="row-flex"><div style={{ color: 'var(--muted)' }}>厚生年金</div><div style={{ fontVariantNumeric: 'tabular-nums' }}>-{v.koseiFmt}円</div></div>
          <div className="row-flex"><div style={{ color: 'var(--muted)' }}>雇用保険</div><div style={{ fontVariantNumeric: 'tabular-nums' }}>-{v.koyouFmt}円</div></div>
          <div className="row-flex"><div style={{ color: 'var(--muted)' }}>所得税（予測）</div><div style={{ fontVariantNumeric: 'tabular-nums' }}>-{v.shotokuFmt}円</div></div>
          <div className="row-flex"><div style={{ color: 'var(--muted)' }}>住民税（予測）</div><div style={{ fontVariantNumeric: 'tabular-nums' }}>-{v.juminFmt}円</div></div>
          <div className="row-flex" style={{ borderTop: '1px solid var(--border)', paddingTop: '10px', fontSize: '15px' }}><div style={{ color: 'var(--green)' }}>手取り</div><div style={{ fontVariantNumeric: 'tabular-nums' }}>{v.netFmt}円</div></div>
        </div>
        <div style={{ marginTop: '14px', fontSize: '11px', color: 'var(--muted2)' }}>* 扶養なし・40歳未満（介護保険料なし）の概算。住民税は賞与からは源泉徴収されない前提です</div>
      </div>

      <div className="row-flex" style={{ margin: '0 0 4px 0' }}>
        <div className="section-label" style={{ margin: 0 }}>賞与（ボーナス）</div>
        <div style={{ fontSize: '11px', color: 'var(--green)' }}>年間手取り合計 {v.bonusAnnualNetFmt}円</div>
      </div>
      <div className="list">
        {v.bonusRows.map((b) => (
          <ListRow key={b.id}>
            <div className="row-flex">
              <div className="row-top">{b.label}（{b.month}月）{b.isThisMonth && <span style={{ fontSize: '10px', color: 'var(--primary2)', marginLeft: '6px' }}>今月</span>}</div>
              <div style={{ fontSize: '13px', fontVariantNumeric: 'tabular-nums' }}>{b.amountFmt}円</div>
            </div>
            <div className="row-note">健康保険 -{b.kenkoFmt}円 ・ 厚生年金 -{b.koseiFmt}円 ・ 雇用保険 -{b.koyouFmt}円 ・ 所得税 -{b.shotokuFmt}円</div>
            <div className="row-flex">
              <div style={{ fontSize: '12px', color: 'var(--muted)' }}>手取り</div>
              <div style={{ fontSize: '13px', color: 'var(--green)', fontVariantNumeric: 'tabular-nums' }}>{b.netFmt}円</div>
            </div>
          </ListRow>
        ))}
      </div>

      <div className="row-flex" style={{ margin: '24px 0 4px 0' }}>
        <div className="section-label" style={{ margin: 0 }}>節税テクニック</div>
        <div style={{ fontSize: '11px', color: 'var(--green)' }}>{v.dedTotalFmt}円/年 の節税余地</div>
      </div>
      <div className="list">
        <ListRow>
          <div className="row-flex">
            <div className="row-top">ふるさと納税</div>
            <div style={{ fontSize: '12px', color: 'var(--green)' }}>上限 {v.furusatoFmt}円</div>
          </div>
          <div className="row-note">実質負担2,000円で、約{v.furusatoGiftValueFmt}円分の返礼品が目安。今年はまだ未利用</div>
        </ListRow>
        <ListRow>
          <div className="row-flex">
            <div className="row-top">iDeCo（月2.3万）</div>
            <div style={{ fontSize: '12px', color: 'var(--green)' }}>年 {v.idecoFmt}円 節税</div>
          </div>
          <div className="row-note">年間掛金 {v.idecoAnnualFmt}円が全額所得控除。税率（所得税+住民税10%）に応じて節税額は変わります</div>
        </ListRow>
        <ListRow>
          <div className="row-flex">
            <div className="row-top">NISA枠の活用</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{v.nisaYearTotalFmt} / {v.nisaLimitFmt}円</div>
          </div>
          <div className="progress-track"><div style={{ width: v.nisaPct, background: 'var(--primary)' }} /></div>
          <div className="row-note">
            {v.nisaYearTotalFmt === '0'
              ? '資金移動で「NISA枠の利用」として記録すると、今年の利用額がここに反映されます'
              : '残り枠 ' + v.nisaRemainingFmt + '円。運用益が非課税になる枠です（節税余地には含めていません）'}
          </div>
        </ListRow>
        <ListRow>
          <div className="row-flex">
            <div className="row-top">医療費控除</div>
            <div style={{ fontSize: '12px', color: v.medicalOverThreshold ? 'var(--green)' : 'var(--muted)' }}>{v.medicalPaidFmt} / {v.medicalThresholdFmt}円</div>
          </div>
          <div className="progress-track"><div style={{ width: v.medicalPct, background: v.medicalOverThreshold ? 'var(--green)' : 'var(--muted2)' }} /></div>
          <div className="row-note">
            {v.medicalOverThreshold
              ? '明細から自動集計。10万円超過分が控除対象・年 ' + v.medicalSavingFmt + '円の節税'
              : '明細から自動集計。あと ' + v.medicalGapFmt + '円で控除対象になります'}
          </div>
        </ListRow>
      </div>
    </div>
  );
}
