import Analyzer, { Options, SELECTED_PLAYER } from 'parser/core/Analyzer';
import { TALENTS_DRUID } from 'common/TALENTS';
import SPELLS from 'common/SPELLS';
import Events, { HealEvent } from 'parser/core/Events';
import Statistic from 'parser/ui/Statistic';
import STATISTIC_ORDER from 'parser/ui/STATISTIC_ORDER';
import STATISTIC_CATEGORY from 'parser/ui/STATISTIC_CATEGORY';
import ItemPercentHealingDone from 'parser/ui/ItemPercentHealingDone';
import BoringSpellValueText from 'parser/ui/BoringSpellValueText';
import HotTrackerRestoDruid from 'analysis/retail/druid/restoration/modules/core/hottracking/HotTrackerRestoDruid';
import { calculateEffectiveHealing } from 'parser/core/EventCalculateLib';

const BOOST_PER_REJUV = 0.08;
const RATE_MULT = 1.25; // 每 4 秒而不是每 5 秒

/**
 * **醒梦**
 * 专精天赋
 *
 * 伊瑟拉的赐福现在每 4 秒治疗一次，且每个活跃的恢复法术使其治疗量增加 8%。
 */
export default class WakingDream extends Analyzer {
  static dependencies = {
    hotTracker: HotTrackerRestoDruid,
  };

  hotTracker!: HotTrackerRestoDruid;

  totalHealing = 0;

  constructor(options: Options) {
    super(options);
    this.active = this.selectedCombatant.hasTalent(TALENTS_DRUID.WAKING_DREAM_TALENT);
    this.addEventListener(
      Events.heal.by(SELECTED_PLAYER).spell([SPELLS.YSERAS_GIFT_SELF, SPELLS.YSERAS_GIFT_OTHERS]),
      this.onYserasGiftHeal,
    );
  }

  onYserasGiftHeal(event: HealEvent) {
    const rejuvCount =
      this.hotTracker.getHotCount(SPELLS.REJUVENATION.id) +
      this.hotTracker.getHotCount(SPELLS.REJUVENATION_GERMINATION.id);
    this.totalHealing += calculateEffectiveHealing(event, rejuvCount * BOOST_PER_REJUV) * RATE_MULT;
  }

  statistic() {
    return (
      <Statistic
        position={STATISTIC_ORDER.OPTIONAL(4)} // 根据天赋行的编号
        category={STATISTIC_CATEGORY.TALENTS}
        size="flexible"
        tooltip={
          <>
            该数值是根据施放恢复法术所带来的治疗增益计算得出，并通过假设治疗量线性增加来估计更快的治疗频率效果。
          </>
        }
      >
        <BoringSpellValueText spell={TALENTS_DRUID.WAKING_DREAM_TALENT}>
          <ItemPercentHealingDone amount={this.totalHealing} />
          <br />
        </BoringSpellValueText>
      </Statistic>
    );
  }
}
