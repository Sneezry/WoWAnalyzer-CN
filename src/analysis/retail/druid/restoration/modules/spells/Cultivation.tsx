import SPELLS from 'common/SPELLS';
import Analyzer, { Options } from 'parser/core/Analyzer';
import BoringSpellValueText from 'parser/ui/BoringSpellValueText';
import ItemPercentHealingDone from 'parser/ui/ItemPercentHealingDone';
import Statistic from 'parser/ui/Statistic';
import STATISTIC_CATEGORY from 'parser/ui/STATISTIC_CATEGORY';
import STATISTIC_ORDER from 'parser/ui/STATISTIC_ORDER';

import Mastery from 'analysis/retail/druid/restoration/modules/core/Mastery';
import { TALENTS_DRUID } from 'common/TALENTS';

/**
 * **栽培**
 * 专精天赋 第六层
 *
 * 当回春术治疗一个生命值低于60%的目标时，对其应用栽培效果，
 * 在6秒内为其恢复（X% 法术强度）的生命值。
 */
class Cultivation extends Analyzer {
  static dependencies = {
    mastery: Mastery,
  };

  protected mastery!: Mastery;

  constructor(options: Options) {
    super(options);
    this.active = this.selectedCombatant.hasTalent(TALENTS_DRUID.CULTIVATION_TALENT);
  }

  get directHealing() {
    return this.mastery.getDirectHealing(SPELLS.CULTIVATION.id);
  }

  get masteryHealing() {
    return this.mastery.getMasteryHealing(SPELLS.CULTIVATION.id);
  }

  get totalHealing() {
    return this.directHealing + this.masteryHealing;
  }

  statistic() {
    return (
      <Statistic
        position={STATISTIC_ORDER.OPTIONAL(6)} // 基于天赋层数的编号
        category={STATISTIC_CATEGORY.TALENTS}
        size="flexible"
        tooltip={
          <>
            这是栽培的直接治疗量和通过栽培触发的精通层数带来的治疗量之和。
            <ul>
              <li>
                直接治疗量：<strong>{this.owner.formatItemHealingDone(this.directHealing)}</strong>
              </li>
              <li>
                精通治疗量：<strong>{this.owner.formatItemHealingDone(this.masteryHealing)}</strong>
              </li>
            </ul>
          </>
        }
      >
        <BoringSpellValueText spell={TALENTS_DRUID.CULTIVATION_TALENT}>
          <ItemPercentHealingDone amount={this.totalHealing} />
          <br />
        </BoringSpellValueText>
      </Statistic>
    );
  }
}

export default Cultivation;
