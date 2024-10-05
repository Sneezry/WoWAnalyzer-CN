import Spell from 'common/SPELLS/Spell';
import Combatant from 'parser/core/Combatant';
import { SubSection, useAnalyzer, useInfo } from 'interface/guide/index';
import CastEfficiency from 'parser/shared/modules/CastEfficiency';
import CastEfficiencyBar from 'parser/ui/CastEfficiencyBar';
import { GapHighlight } from 'parser/ui/CooldownBar';

/**
 * 代表我们希望在图表中显示的冷却技能。示例：
 *
 * @example
 *   {
 *     spell: TALENTS.WAKE_OF_ASHES_TALENT,
 *     isActive: (c) => c.hasTalent(TALENTS.WAKE_OF_ASHES_TALENT),
 *   },
 */
export type Cooldown = {
  spell: Spell;
  isActive?: (c: Combatant) => boolean;
};

type CooldownGraphSubsectionProps = {
  /**
   * 我们希望在图表中渲染的冷却技能列表。
   */
  cooldowns: Cooldown[];
  /**
   * 我们可能希望在子部分中渲染的标题。
   */
  title?: string;
  /**
   * 我们可能希望在子部分中渲染的描述。
   */
  description?: JSX.Element;
  /**
   * 施法多少次会将其图标从图表中移除？默认值为10。
   */
  tooManyCasts?: number;
};

/**
 * 渲染一个指南的子部分，其中包含在战斗中使用的冷却技能的施法效率信息。
 *
 * 需要一个{@link Cooldown}的列表，以便能够正确处理它们。
 */
const CooldownGraphSubsection = ({
  cooldowns,
  title,
  description,
  tooManyCasts = 10,
}: CooldownGraphSubsectionProps) => {
  const info = useInfo();
  const castEfficiency = useAnalyzer(CastEfficiency);
  if (!info || !castEfficiency) {
    return null;
  }

  const activeCooldowns = cooldowns.filter(
    (cooldown) => cooldown.isActive?.(info.combatant) ?? true,
  );
  const hasTooManyCasts = activeCooldowns.some((cooldown) => {
    const casts = castEfficiency.getCastEfficiencyForSpell(cooldown.spell)?.casts ?? 0;
    return casts >= tooManyCasts;
  });

  description = description ?? (
    <>
      <strong>冷却技能图表</strong> -
      此图表显示了你使用冷却技能的时间以及你再次使用它们的等待时间。灰色段显示法术可用时，黄色段显示法术正在冷却时。红色段突出显示了你可以再使用一次冷却技能的时间。
    </>
  );

  return (
    <SubSection title={title}>
      {description}
      {activeCooldowns.map((cooldownCheck) => (
        <CastEfficiencyBar
          key={cooldownCheck.spell.id}
          spell={cooldownCheck.spell}
          gapHighlightMode={GapHighlight.FullCooldown}
          minimizeIcons={hasTooManyCasts}
          useThresholds
        />
      ))}
    </SubSection>
  );
};

export default CooldownGraphSubsection;
