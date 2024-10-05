import SPELLS from 'common/SPELLS';
import Analyzer, { Options } from 'parser/core/Analyzer';
import BoringSpellValueText from 'parser/ui/BoringSpellValueText';
import ItemPercentHealingDone from 'parser/ui/ItemPercentHealingDone';
import Statistic from 'parser/ui/Statistic';
import STATISTIC_CATEGORY from 'parser/ui/STATISTIC_CATEGORY';
import STATISTIC_ORDER from 'parser/ui/STATISTIC_ORDER';

import Mastery from 'analysis/retail/druid/restoration/modules/core/Mastery';
import { TALENTS_DRUID } from 'common/TALENTS';
import { SpellLink } from 'interface';
import { explanationAndDataSubsection } from 'interface/guide/components/ExplanationRow';
import { GUIDE_CORE_EXPLANATION_PERCENT } from 'analysis/retail/druid/restoration/Guide';
import CastEfficiencyPanel from 'interface/guide/components/CastEfficiencyPanel';

/**
 * **塞纳里奥结界**
 * 专精天赋 第四层
 *
 * 保护一个友方目标，持续30秒。
 * 受到伤害时将消耗结界并在8秒内治疗该目标（治疗量基于X%的法术强度）。
 */
class CenarionWard extends Analyzer {
  static dependencies = {
    mastery: Mastery,
  };

  protected mastery!: Mastery;

  constructor(options: Options) {
    super(options);
    this.active = this.selectedCombatant.hasTalent(TALENTS_DRUID.CENARION_WARD_TALENT);
  }

  get guideSubsection() {
    const explanation = (
      <p>
        <b>
          <SpellLink spell={TALENTS_DRUID.CENARION_WARD_TALENT} />
        </b>{' '}
        是一个短冷却的天赋型HoT技能。它非常强大且高效，应该在冷却时立即施放。坦克通常是最佳目标。
      </p>
    );

    const data = <CastEfficiencyPanel spell={TALENTS_DRUID.CENARION_WARD_TALENT} useThresholds />;

    return explanationAndDataSubsection(explanation, data, GUIDE_CORE_EXPLANATION_PERCENT);
  }

  statistic() {
    const directHealing = this.mastery.getDirectHealing(SPELLS.CENARION_WARD_HEAL.id);
    const masteryHealing = this.mastery.getMasteryHealing(SPELLS.CENARION_WARD_HEAL.id);
    const totalHealing = directHealing + masteryHealing;

    return (
      <Statistic
        position={STATISTIC_ORDER.OPTIONAL(4)} // 基于天赋层数的编号
        category={STATISTIC_CATEGORY.TALENTS}
        size="flexible"
        tooltip={
          <>
            这是塞纳里奥结界的直接治疗量和通过塞纳里奥结界额外的精通层数带来的治疗量之和。
            <ul>
              <li>
                直接治疗量：<strong>{this.owner.formatItemHealingDone(directHealing)}</strong>
              </li>
              <li>
                精通治疗量：<strong>{this.owner.formatItemHealingDone(masteryHealing)}</strong>
              </li>
            </ul>
          </>
        }
      >
        <BoringSpellValueText spell={TALENTS_DRUID.CENARION_WARD_TALENT}>
          <ItemPercentHealingDone amount={totalHealing} />
          <br />
        </BoringSpellValueText>
      </Statistic>
    );
  }
}

export default CenarionWard;
