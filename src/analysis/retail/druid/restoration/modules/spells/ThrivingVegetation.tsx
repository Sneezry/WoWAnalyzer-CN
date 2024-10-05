import HotTrackerRestoDruid, {
  THRIVING_VEG_ATT_NAME,
} from 'analysis/retail/druid/restoration/modules/core/hottracking/HotTrackerRestoDruid';
import Analyzer from 'parser/core/Analyzer';
import { Options } from 'parser/core/Module';
import { TALENTS_DRUID } from 'common/TALENTS';
import Statistic from 'parser/ui/Statistic';
import STATISTIC_ORDER from 'parser/ui/STATISTIC_ORDER';
import STATISTIC_CATEGORY from 'parser/ui/STATISTIC_CATEGORY';
import ItemPercentHealingDone from 'parser/ui/ItemPercentHealingDone';
import TalentSpellText from 'parser/ui/TalentSpellText';
import AbilityTracker from 'parser/shared/modules/AbilityTracker';
import SPELLS from 'common/SPELLS';
import { SpellLink } from 'interface';

/**
 * **蓬勃生长**
 * 专精天赋
 *
 * 恢复法术瞬间治疗目标 (15/30)% 的总周期效果，且恢复法术的持续时间增加 (3/6) 秒。
 */
export default class ThrivingVegetation extends Analyzer.withDependencies({
  hotTracker: HotTrackerRestoDruid,
  abilityTracker: AbilityTracker,
}) {
  rank: number;

  constructor(options: Options) {
    super(options);
    this.rank = this.selectedCombatant.getTalentRank(TALENTS_DRUID.THRIVING_VEGETATION_TALENT);
    this.active = this.rank > 0;
  }

  statistic() {
    const extraDurationHealing =
      this.deps.hotTracker.getAttribution(THRIVING_VEG_ATT_NAME)?.healing || 0;
    const instantRejuvHealing = this.deps.abilityTracker.getAbility(
      SPELLS.THRIVING_VEGETATION.id,
    ).healingEffective;
    return (
      <Statistic
        size="flexible"
        position={STATISTIC_ORDER.OPTIONAL(9)} // 根据天赋行的编号
        category={STATISTIC_CATEGORY.TALENTS}
        tooltip={
          <>
            这是恢复施法和恢复法术延长效果的直接治疗总和。
            <ul>
              <li>
                <SpellLink spell={SPELLS.REJUVENATION} /> 直接治疗:{' '}
                <strong>{this.owner.formatItemHealingDone(instantRejuvHealing)}</strong>
              </li>
              <li>
                <SpellLink spell={SPELLS.REGROWTH} /> 延长治疗:{' '}
                <strong>{this.owner.formatItemHealingDone(extraDurationHealing)}</strong>
              </li>
            </ul>
          </>
        }
      >
        <TalentSpellText talent={TALENTS_DRUID.THRIVING_VEGETATION_TALENT}>
          <ItemPercentHealingDone amount={extraDurationHealing + instantRejuvHealing} />
        </TalentSpellText>
      </Statistic>
    );
  }
}
