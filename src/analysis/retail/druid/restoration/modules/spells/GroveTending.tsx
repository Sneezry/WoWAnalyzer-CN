/**
 * **林地疗愈**
 * 专精天赋
 *
 * 迅捷治愈在9秒内为目标治疗X点生命值。
 */
import Analyzer, { Options } from 'parser/core/Analyzer';
import Mastery from 'analysis/retail/druid/restoration/modules/core/Mastery';
import { TALENTS_DRUID } from 'common/TALENTS';
import SPELLS from 'common/SPELLS';
import Statistic from 'parser/ui/Statistic';
import STATISTIC_ORDER from 'parser/ui/STATISTIC_ORDER';
import STATISTIC_CATEGORY from 'parser/ui/STATISTIC_CATEGORY';
import BoringSpellValueText from 'parser/ui/BoringSpellValueText';
import ItemPercentHealingDone from 'parser/ui/ItemPercentHealingDone';

class GroveTending extends Analyzer {
  static dependencies = {
    mastery: Mastery,
  };

  protected mastery!: Mastery;

  constructor(options: Options) {
    super(options);
    this.active = this.selectedCombatant.hasTalent(TALENTS_DRUID.GROVE_TENDING_TALENT);
  }

  get directHealing() {
    return this.mastery.getDirectHealing(SPELLS.GROVE_TENDING.id);
  }

  get masteryHealing() {
    return this.mastery.getMasteryHealing(SPELLS.GROVE_TENDING.id);
  }

  get totalHealing() {
    return this.directHealing + this.masteryHealing;
  }

  statistic() {
    return (
      <Statistic
        size="flexible"
        position={STATISTIC_ORDER.OPTIONAL(3)} // 基于天赋层数的编号
        category={STATISTIC_CATEGORY.TALENTS}
        tooltip={
          <>
            这是林地疗愈的直接治疗与额外的精通治疗加成的总和。
            <ul>
              <li>
                直接治疗：<strong>{this.owner.formatItemHealingDone(this.directHealing)}</strong>
              </li>
              <li>
                精通治疗：<strong>{this.owner.formatItemHealingDone(this.masteryHealing)}</strong>
              </li>
            </ul>
          </>
        }
      >
        <BoringSpellValueText spell={TALENTS_DRUID.GROVE_TENDING_TALENT}>
          <ItemPercentHealingDone amount={this.totalHealing} />
          <br />
        </BoringSpellValueText>
      </Statistic>
    );
  }
}

export default GroveTending;
