import Analyzer, { Options } from 'parser/core/Analyzer';
import Mastery from 'analysis/retail/druid/restoration/modules/core/Mastery';
import { TALENTS_DRUID } from 'common/TALENTS';
import SPELLS from 'common/SPELLS';
import Statistic from 'parser/ui/Statistic';
import STATISTIC_ORDER from 'parser/ui/STATISTIC_ORDER';
import STATISTIC_CATEGORY from 'parser/ui/STATISTIC_CATEGORY';
import BoringSpellValueText from 'parser/ui/BoringSpellValueText';
import ItemPercentHealingDone from 'parser/ui/ItemPercentHealingDone';

/**
 * **和谐绽放**
 * 专精天赋
 *
 * 生命绽放为精通：和谐提供(2 / 3)层叠加。
 */
class HarmoniusBlooming extends Analyzer {
  static dependencies = {
    mastery: Mastery,
  };

  protected mastery!: Mastery;

  ranks: number;

  constructor(options: Options) {
    super(options);
    this.ranks = this.selectedCombatant.getTalentRank(TALENTS_DRUID.HARMONIOUS_BLOOMING_TALENT);
    this.active = this.ranks > 0;
  }

  /**
   * 仅由天赋提供的额外层数带来的治疗量。
   * 所有层数的治疗量已经由精通模块添加，因此这里只需计算由额外层数带来的部分。
   */
  get extraStacksHealing() {
    const totalMasteryHealing =
      this.mastery.getMasteryHealing(SPELLS.LIFEBLOOM_HOT_HEAL.id) +
      this.mastery.getMasteryHealing(SPELLS.LIFEBLOOM_UNDERGROWTH_HOT_HEAL.id);
    const portionFromExtraStacks = this.ranks / (this.ranks + 1);
    return totalMasteryHealing * portionFromExtraStacks;
  }

  statistic() {
    return (
      <Statistic
        size="flexible"
        position={STATISTIC_ORDER.OPTIONAL(7)} // 基于天赋层数的编号
        category={STATISTIC_CATEGORY.TALENTS}
        tooltip={
          <>
            这是由和谐绽放天赋提供的额外 {this.ranks} {this.ranks > 1 ? '层' : '层'}{' '}
            精通带来的治疗量。
          </>
        }
      >
        <BoringSpellValueText spell={TALENTS_DRUID.HARMONIOUS_BLOOMING_TALENT}>
          <ItemPercentHealingDone amount={this.extraStacksHealing} />
          <br />
        </BoringSpellValueText>
      </Statistic>
    );
  }
}

export default HarmoniusBlooming;
