import Analyzer from 'parser/core/Analyzer';
import { Options } from 'parser/core/Module';
import { TALENTS_DRUID } from 'common/TALENTS';
import Statistic from 'parser/ui/Statistic';
import STATISTIC_ORDER from 'parser/ui/STATISTIC_ORDER';
import STATISTIC_CATEGORY from 'parser/ui/STATISTIC_CATEGORY';
import BoringSpellValueText from 'parser/ui/BoringSpellValueText';
import HotAttributor from 'analysis/retail/druid/restoration/modules/core/hottracking/HotAttributor';
import AbilityTracker from 'parser/shared/modules/AbilityTracker';
import { formatNumber } from 'common/format';
import { SpellLink } from 'interface';

/**
 * **过度生长**
 * 专精天赋
 *
 * 对一个盟友施加生命绽放、回春术、野性成长和愈合的持续治疗效果。
 */
class Overgrowth extends Analyzer {
  static dependencies = {
    hotAttributor: HotAttributor,
    abilityTracker: AbilityTracker,
  };

  hotAttributor!: HotAttributor;
  abilityTracker!: AbilityTracker;

  constructor(options: Options) {
    super(options);
    this.active = this.selectedCombatant.hasTalent(TALENTS_DRUID.OVERGROWTH_TALENT);
  }

  get averageHealingPerCast() {
    const casts = this.abilityTracker.getAbility(TALENTS_DRUID.OVERGROWTH_TALENT.id).casts;
    return casts === 0 ? 0 : this.hotAttributor.overgrowthAttrib.healing / casts;
  }

  statistic() {
    return (
      <Statistic
        position={STATISTIC_ORDER.OPTIONAL(10)} // 根据天赋行设置的位置
        category={STATISTIC_CATEGORY.TALENTS}
        size="flexible"
        tooltip={
          <>
            总体来说，这个天赋在团队副本中的表现通常很弱，建议你选择{' '}
            <SpellLink spell={TALENTS_DRUID.SPRING_BLOSSOMS_TALENT} /> 代替。它唯一的作用是在
            地下城中对坦克进行高效治疗，以争取更多的输出时间。
          </>
        }
      >
        <BoringSpellValueText spell={TALENTS_DRUID.OVERGROWTH_TALENT}>
          {formatNumber(this.averageHealingPerCast)}
          <small> 平均每次施放的有效治疗量</small>
        </BoringSpellValueText>
      </Statistic>
    );
  }
}

export default Overgrowth;
