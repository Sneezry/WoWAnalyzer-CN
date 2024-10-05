import { RoundedPanel } from 'interface/guide/components/GuideDivs';
import { CooldownBar, GapHighlight } from 'parser/ui/CooldownBar';
import CastEfficiency from 'parser/shared/modules/CastEfficiency';
import { formatPercentage } from 'common/format';
import Spell from 'common/SPELLS/Spell';
import { SpellLink } from 'interface/index';
import { BadColor, GoodColor, MediocreColor, OkColor, useAnalyzer } from 'interface/guide/index';
import Abilities from 'parser/core/modules/Abilities';

/**
 * 显示法术施放效率统计的圆角面板，以及最小的施放/冷却时间线
 * @param spell 要显示统计的法术
 * @param useSpellLink 如果为 true，面板中的法术名称将是法术链接，而不是纯文本
 * @param useThresholds 如果为 true，施放效率百分比将根据表现进行颜色编码
 *    使用法术效率要求。
 */
export default function CastEfficiencyPanel({
  spell,
  useSpellLink,
  useThresholds,
}: {
  spell: Spell;
  useSpellLink?: boolean;
  useThresholds?: boolean;
}) {
  const spellName = useSpellLink ? <SpellLink spell={spell} /> : spell.name;
  return (
    <RoundedPanel>
      <div>
        {spellName} - <CastEfficiencyStatElement spell={spell} useThresholds={useThresholds} />
      </div>
      <CastEfficiencyBarElement spell={spell} />
    </RoundedPanel>
  );
}

/**
 * CastEfficiencyPanel 的子组件，仅包括百分比和可能施放的统计文本。
 * @param spell 要显示统计的法术
 * @param useThresholds 如果为 true，施放效率百分比将根据表现进行颜色编码
 *    使用法术效率要求。
 */
export function CastEfficiencyStatElement({
  spell,
  useThresholds,
}: {
  spell: Spell;
  useThresholds?: boolean;
}) {
  const castEfficObj = useAnalyzer(CastEfficiency)!.getCastEfficiencyForSpellId(spell.id);
  let textColor: string | undefined;
  if (useThresholds && castEfficObj && castEfficObj.efficiency) {
    const effectiveUtil =
      castEfficObj.casts === castEfficObj.maxCasts ? 1 : castEfficObj.efficiency;
    if (effectiveUtil < castEfficObj.majorIssueEfficiency) {
      textColor = BadColor;
    } else if (effectiveUtil < castEfficObj.averageIssueEfficiency) {
      textColor = MediocreColor;
    } else if (effectiveUtil < castEfficObj.recommendedEfficiency) {
      textColor = OkColor;
    } else {
      textColor = GoodColor;
    }
  }
  return (
    <>
      {!castEfficObj ? (
        <>
          <i>获取施放效率数据时出错</i>
        </>
      ) : (
        <>
          <span style={{ color: textColor, fontSize: 16 }}>
            <strong>{formatPercentage(castEfficObj.efficiency || 0, 0)}%</strong>
          </span>{' '}
          施放效率 (<strong>{castEfficObj.casts}</strong> 次施放{' '}
          <strong>{castEfficObj.maxCasts}</strong> 次可能施放)
        </>
      )}
    </>
  );
}

/**
 * CastEfficiencyPanel 的子组件，仅包括带文本说明的冷却条。
 * @param spell 要显示统计的法术
 */
export function CastEfficiencyBarElement({ spell }: { spell: Spell }) {
  const ability = useAnalyzer(Abilities)!.getAbility(spell.id);
  const hasCharges = ability && ability.charges > 1;
  const gapHighlightMode = hasCharges ? GapHighlight.All : GapHighlight.FullCooldown;
  return (
    <div>
      <strong>冷却时间线</strong>
      <small>
        {hasCharges ? (
          <> - 冷却时为黄色，所有充能可用时为红色，白色线条显示施放。</>
        ) : (
          <>
            {' '}
            - 冷却时为黄色，可用时为灰色，白色线条显示施放。
            <br />
            红色高亮显示您可以插入额外施放的时间。
          </>
        )}
      </small>
      <div className="flex-main chart" style={{ padding: 5 }}>
        <CooldownBar spellId={spell.id} gapHighlightMode={gapHighlightMode} minimizeIcons />
      </div>
    </div>
  );
}
