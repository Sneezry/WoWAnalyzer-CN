import SPELLS from 'common/SPELLS';
import Analyzer, { Options } from 'parser/core/Analyzer';
import BoringSpellValueText from 'parser/ui/BoringSpellValueText';
import ItemPercentHealingDone from 'parser/ui/ItemPercentHealingDone';
import Statistic from 'parser/ui/Statistic';
import STATISTIC_CATEGORY from 'parser/ui/STATISTIC_CATEGORY';
import STATISTIC_ORDER from 'parser/ui/STATISTIC_ORDER';

import { TALENTS_DRUID } from 'common/TALENTS';
import Mastery from 'analysis/retail/druid/restoration/modules/core/Mastery';

/**
 * **春暖花开**
 * 专精天赋 第8层
 *
 * 每个受到百花齐放治疗的目标会在6秒内额外恢复（X%法术强度）的生命值。
 */
class SpringBlossoms extends Analyzer {
  static dependencies = {
    mastery: Mastery,
  };

  protected mastery!: Mastery;

  constructor(options: Options) {
    super(options);
    this.active = this.selectedCombatant.hasTalent(TALENTS_DRUID.SPRING_BLOSSOMS_TALENT);
  }

  get directHealing() {
    return this.mastery.getDirectHealing(SPELLS.SPRING_BLOSSOMS.id);
  }

  get masteryHealing() {
    return this.mastery.getMasteryHealing(SPELLS.SPRING_BLOSSOMS.id);
  }

  get totalHealing() {
    return this.directHealing + this.masteryHealing;
  }

  statistic() {
    return (
      <Statistic
        size="flexible"
        position={STATISTIC_ORDER.OPTIONAL(8)} // 根据天赋行编号
        category={STATISTIC_CATEGORY.TALENTS}
        tooltip={
          <>
            这是来自春暖花开的直接治疗量和其额外的精通叠加产生的治疗总和。
            <ul>
              <li>
                直接治疗: <strong>{this.owner.formatItemHealingDone(this.directHealing)}</strong>
              </li>
              <li>
                精通治疗: <strong>{this.owner.formatItemHealingDone(this.masteryHealing)}</strong>
              </li>
            </ul>
          </>
        }
      >
        <BoringSpellValueText spell={TALENTS_DRUID.SPRING_BLOSSOMS_TALENT}>
          <ItemPercentHealingDone amount={this.totalHealing} />
          <br />
        </BoringSpellValueText>
      </Statistic>
    );
  }
}

export default SpringBlossoms;
