import Analyzer, { SELECTED_PLAYER } from 'parser/core/Analyzer';
import { Options } from 'parser/core/Module';
import { TALENTS_DRUID } from 'common/TALENTS';
import { REJUVENATION_BUFFS } from 'analysis/retail/druid/restoration/constants';
import SPELLS from 'common/SPELLS';
import Events, { HealEvent } from 'parser/core/Events';
import {
  calculateEffectiveHealing,
  calculateHealTargetHealthPercent,
} from 'parser/core/EventCalculateLib';
import Statistic from 'parser/ui/Statistic';
import STATISTIC_ORDER from 'parser/ui/STATISTIC_ORDER';
import STATISTIC_CATEGORY from 'parser/ui/STATISTIC_CATEGORY';
import ItemPercentHealingDone from 'parser/ui/ItemPercentHealingDone';
import { SpellLink } from 'interface';
import TalentSpellText from 'parser/ui/TalentSpellText';

const DEBUG = false;

const REJUV_MAX_BOOST_PER_RANK = 0.15;
const TRANQ_MAX_BOOST_PER_RANK = 0.15;

/**
 * **再生**
 * 专精天赋
 *
 * 回春术的治疗量提高最高(15 / 30)%，宁静的治疗量提高最高(15 / 30)%，对低血量目标的治疗效果更强。
 */
class Regenesis extends Analyzer {
  ranks: number;
  rejuvBoostHealing: number = 0;
  tranqBoostHealing: number = 0;

  constructor(options: Options) {
    super(options);

    this.ranks = this.selectedCombatant.getTalentRank(TALENTS_DRUID.REGENESIS_TALENT);
    this.active = this.ranks > 0;

    this.addEventListener(
      Events.heal.by(SELECTED_PLAYER).spell(REJUVENATION_BUFFS),
      this.onRejuvHeal,
    );
    this.addEventListener(
      Events.heal.by(SELECTED_PLAYER).spell(SPELLS.TRANQUILITY_HEAL),
      this.onTranqHeal,
    );
  }

  onRejuvHeal(event: HealEvent) {
    this.rejuvBoostHealing += this._getBoostHealing(event, REJUV_MAX_BOOST_PER_RANK * this.ranks);
  }

  onTranqHeal(event: HealEvent) {
    this.tranqBoostHealing += this._getBoostHealing(event, TRANQ_MAX_BOOST_PER_RANK * this.ranks);
  }

  _getBoostHealing(event: HealEvent, boostAmount: number): number {
    // 提升的效果是线性的，目标血量为0%时提升最大，目标满血时无提升
    const healthPercentMissingBeforeHeal = 1 - calculateHealTargetHealthPercent(event);
    const att = calculateEffectiveHealing(event, boostAmount * healthPercentMissingBeforeHeal);
    if (DEBUG && event.amount > 0) {
      console.log(
        `${event.ability.name} 治疗量为 ${
          event.amount
        }\n最大提升 ${boostAmount}\n血量缺失 ${healthPercentMissingBeforeHeal.toFixed(
          2,
        )}\n属性 ${att}\n`,
        event,
      );
    }
    return att;
  }

  get totalHealing() {
    return this.rejuvBoostHealing + this.tranqBoostHealing;
  }

  statistic() {
    return (
      <Statistic
        size="flexible"
        position={STATISTIC_ORDER.OPTIONAL(7)} // 根据天赋行编号
        category={STATISTIC_CATEGORY.TALENTS}
        tooltip={
          <>
            按提升法术的细分：
            <ul>
              <li>
                <SpellLink spell={SPELLS.REJUVENATION} />:{' '}
                <strong>{this.owner.formatItemHealingDone(this.rejuvBoostHealing)}</strong>
              </li>
              <li>
                <SpellLink spell={SPELLS.TRANQUILITY_HEAL} />:{' '}
                <strong>{this.owner.formatItemHealingDone(this.tranqBoostHealing)}</strong>
              </li>
            </ul>
          </>
        }
      >
        <TalentSpellText talent={TALENTS_DRUID.REGENESIS_TALENT}>
          <ItemPercentHealingDone amount={this.totalHealing} />
        </TalentSpellText>
      </Statistic>
    );
  }
}

export default Regenesis;
