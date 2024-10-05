import SPELLS from 'common/SPELLS';
import Analyzer, { Options, SELECTED_PLAYER } from 'parser/core/Analyzer';
import { calculateEffectiveHealing } from 'parser/core/EventCalculateLib';
import Events, { ApplyBuffEvent, RefreshBuffEvent } from 'parser/core/Events';
import BoringSpellValueText from 'parser/ui/BoringSpellValueText';
import ItemPercentHealingDone from 'parser/ui/ItemPercentHealingDone';
import Statistic from 'parser/ui/Statistic';
import STATISTIC_CATEGORY from 'parser/ui/STATISTIC_CATEGORY';
import STATISTIC_ORDER from 'parser/ui/STATISTIC_ORDER';
import { TALENTS_DRUID } from 'common/TALENTS';
import HotTrackerRestoDruid from 'analysis/retail/druid/restoration/modules/core/hottracking/HotTrackerRestoDruid';
import { Attribution } from 'parser/shared/modules/HotTracker';
import {
  getDirectHeal,
  getHardcast,
} from 'analysis/retail/druid/restoration/normalizers/CastLinkNormalizer';
import { buffedByClearcast } from 'analysis/retail/druid/restoration/normalizers/ClearcastingNormalizer';

const REGROWTH_BOOST = 0.3;

/**
 * **清晰闪现**
 * 专精天赋 第三层
 *
 * 触发清晰预兆的愈合额外治疗30%。
 */
class FlashOfClarity extends Analyzer {
  static dependencies = {
    hotTracker: HotTrackerRestoDruid,
  };
  protected hotTracker!: HotTrackerRestoDruid;

  hotBoostAttribution: Attribution = HotTrackerRestoDruid.getNewAttribution('清晰闪现 愈合');
  directBoostHealing: number = 0;

  constructor(options: Options) {
    super(options);

    this.active = this.selectedCombatant.hasTalent(TALENTS_DRUID.FLASH_OF_CLARITY_TALENT);

    this.addEventListener(
      Events.applybuff.by(SELECTED_PLAYER).spell(SPELLS.REGROWTH),
      this.onRegrowthApply,
    );
    this.addEventListener(
      Events.refreshbuff.by(SELECTED_PLAYER).spell(SPELLS.REGROWTH),
      this.onRegrowthApply,
    );
  }

  onRegrowthApply(event: ApplyBuffEvent | RefreshBuffEvent) {
    const hardcast = getHardcast(event);
    if (!hardcast || !buffedByClearcast(hardcast)) {
      return; // 只对受到清晰预兆增益的施法应用提升
    }

    this.hotTracker.addBoostFromApply(this.hotBoostAttribution, REGROWTH_BOOST, event);
    const directHeal = getDirectHeal(hardcast);
    if (directHeal) {
      this.directBoostHealing += calculateEffectiveHealing(directHeal, REGROWTH_BOOST);
    }
  }

  get totalHealing(): number {
    return this.directBoostHealing + this.hotBoostAttribution.healing;
  }

  statistic() {
    return (
      <Statistic
        position={STATISTIC_ORDER.OPTIONAL(3)} // 基于天赋层数的编号
        size="flexible"
        category={STATISTIC_CATEGORY.TALENTS}
      >
        <BoringSpellValueText spell={TALENTS_DRUID.FLASH_OF_CLARITY_TALENT}>
          <ItemPercentHealingDone amount={this.totalHealing} />
          <br />
        </BoringSpellValueText>
      </Statistic>
    );
  }
}

export default FlashOfClarity;
