import Analyzer, { SELECTED_PLAYER } from 'parser/core/Analyzer';
import HotTrackerRestoDruid, {
  GERMINATION_ATT_NAME,
} from 'analysis/retail/druid/restoration/modules/core/hottracking/HotTrackerRestoDruid';
import Statistic from 'parser/ui/Statistic';
import STATISTIC_ORDER from 'parser/ui/STATISTIC_ORDER';
import STATISTIC_CATEGORY from 'parser/ui/STATISTIC_CATEGORY';
import BoringSpellValueText from 'parser/ui/BoringSpellValueText';
import { TALENTS_DRUID } from 'common/TALENTS';
import ItemPercentHealingDone from 'parser/ui/ItemPercentHealingDone';
import { Options } from 'parser/core/Module';
import Events from 'parser/core/Events';
import SPELLS from 'common/SPELLS';
import { SpellIcon, SpellLink } from 'interface';
import { formatPercentage } from 'common/format';

export default class Germination extends Analyzer.withDependencies({
  hotTracker: HotTrackerRestoDruid,
}) {
  totalRejuvs = 0;
  germs = 0;

  constructor(options: Options) {
    super(options);
    this.active = this.selectedCombatant.hasTalent(TALENTS_DRUID.GERMINATION_TALENT);
    this.addEventListener(
      Events.applybuff
        .by(SELECTED_PLAYER)
        .spell([SPELLS.REJUVENATION, SPELLS.REJUVENATION_GERMINATION]),
      this.onApplyAnyRejuv,
    );
    this.addEventListener(
      Events.refreshbuff
        .by(SELECTED_PLAYER)
        .spell([SPELLS.REJUVENATION, SPELLS.REJUVENATION_GERMINATION]),
      this.onApplyAnyRejuv,
    );
    this.addEventListener(
      Events.applybuff.by(SELECTED_PLAYER).spell(SPELLS.REJUVENATION_GERMINATION),
      this.onApplyGerm,
    );
    this.addEventListener(
      Events.refreshbuff.by(SELECTED_PLAYER).spell(SPELLS.REJUVENATION_GERMINATION),
      this.onApplyGerm,
    );
  }

  onApplyAnyRejuv() {
    this.totalRejuvs += 1;
  }

  onApplyGerm() {
    this.germs += 1;
  }

  statistic() {
    const extraDurationHealing =
      this.deps.hotTracker.getAttribution(GERMINATION_ATT_NAME)?.healing || 0;
    return (
      <Statistic
        size="flexible"
        position={STATISTIC_ORDER.OPTIONAL(10)} // 基于天赋层数的编号
        category={STATISTIC_CATEGORY.TALENTS}
        tooltip={
          <>
            <p>
              在 <strong>{this.totalRejuvs}</strong> 次总共的{' '}
              <SpellLink spell={SPELLS.REJUVENATION} /> 施放中，有 <strong>{this.germs}</strong>{' '}
              次是同一个目标上的第二次施放（
              <SpellLink spell={SPELLS.REJUVENATION_GERMINATION} />）
            </p>
            <p>
              <strong>
                {formatPercentage(this.owner.getPercentageOfTotalHealingDone(extraDurationHealing))}
                %
              </strong>{' '}
              是由于额外2秒的回春术持续时间产生的治疗量占总治疗量的百分比。
            </p>
          </>
        }
      >
        <BoringSpellValueText spell={TALENTS_DRUID.GERMINATION_TALENT}>
          <SpellIcon spell={SPELLS.REJUVENATION_GERMINATION} /> {this.germs} /{' '}
          <SpellIcon spell={SPELLS.REJUVENATION} /> {this.totalRejuvs}
          <br />
          <ItemPercentHealingDone amount={extraDurationHealing} />
          <small> 来自额外的2秒</small>
        </BoringSpellValueText>
      </Statistic>
    );
  }
}
