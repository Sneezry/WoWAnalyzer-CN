import fetchWcl from 'common/fetchWclApi';
import { formatNumber, formatPercentage } from 'common/format';
import SPELLS from 'common/SPELLS';
import { WCLDamageTaken, WCLDamageTakenTableResponse } from 'common/WCL_TYPES';
import { SpellIcon } from 'interface';
import Analyzer, { Options, SELECTED_PLAYER } from 'parser/core/Analyzer';
import Combatant from 'parser/core/Combatant';
import { calculateEffectiveHealing } from 'parser/core/EventCalculateLib';
import Events, { CastEvent, EventType, HealEvent } from 'parser/core/Events';
import Combatants from 'parser/shared/modules/Combatants';
import BoringValue from 'parser/ui/BoringValueText';
import Statistic from 'parser/ui/Statistic';
import STATISTIC_ORDER from 'parser/ui/STATISTIC_ORDER';

const IRONBARK_BASE_DR = 0.2; // 基础伤害减免
const IRONBARK_HOT_BOOST = 0.2; // 治疗效果提升

/**
 * 铁木树皮 -
 * 目标的皮肤变得像铁木一样坚硬，减少受到的伤害20%，并在12秒内使你治疗效果提高20%。
 */
class Ironbark extends Analyzer {
  static dependencies = {
    combatants: Combatants,
  };

  protected combatants!: Combatants;

  ironbarkCount = 0;
  damageTakenDuringIronbark = 0;
  boostedIronbarkHealing = 0;

  constructor(options: Options) {
    super(options);
    this.addEventListener(Events.cast.by(SELECTED_PLAYER).spell(SPELLS.IRONBARK), this.onCast);
    this.addEventListener(Events.heal.by(SELECTED_PLAYER), this.onAnyHeal);
    this.loadDamageTakenDuringIronbark();
  }

  onCast(event: CastEvent) {
    this.ironbarkCount += 1;
  }

  /**
   * 检查治疗是否来自于我们的持续治疗效果，并且目标是否处于铁木树皮的增益状态，如果是则将其计入治疗总量。
   */
  onAnyHeal(event: HealEvent) {
    if (!event.tick) {
      return;
    }
    const healTarget: Combatant | null = this.combatants.getEntity(event);
    if (
      healTarget !== null &&
      healTarget.hasBuff(
        SPELLS.IRONBARK.id,
        undefined,
        undefined,
        undefined,
        this.selectedCombatant.id,
      )
    ) {
      this.boostedIronbarkHealing += calculateEffectiveHealing(event, IRONBARK_HOT_BOOST);
    }
  }

  /**
   * 我们需要获取目标在铁木树皮期间受到的伤害，以计算伤害减免。这部分数据不在主事件流中，因此需要通过自定义查询来获取。
   */
  loadDamageTakenDuringIronbark() {
    fetchWcl(`report/tables/damage-taken/${this.owner.report.code}`, {
      start: this.owner.fight.start_time,
      end: this.owner.fight.end_time,
      filter: `(IN RANGE FROM type='${EventType.ApplyBuff}' AND ability.id=${SPELLS.IRONBARK.id} AND source.name='${this.selectedCombatant.name}' TO type='${EventType.RemoveBuff}' AND ability.id=${SPELLS.IRONBARK.id} AND source.name='${this.selectedCombatant.name}' GROUP BY target ON target END)`,
    })
      .then((json) => {
        json = json as WCLDamageTakenTableResponse;
        this.damageTakenDuringIronbark = (json.entries as WCLDamageTaken[]).reduce(
          (damageTaken: number, entry: { total: number }) => damageTaken + entry.total,
          0,
        );
      })
      .catch((err) => {
        throw err;
      });
  }

  get damageReduced() {
    return (this.damageTakenDuringIronbark / (1 - IRONBARK_BASE_DR)) * IRONBARK_BASE_DR;
  }

  get damageReducedPerCast() {
    return this.damageReduced / this.ironbarkCount;
  }

  get healBoostedPerCast() {
    return this.boostedIronbarkHealing / this.ironbarkCount;
  }

  statistic() {
    if (this.ironbarkCount > 0) {
      return (
        <Statistic
          position={STATISTIC_ORDER.OPTIONAL(5)} // 基于天赋层数的编号
          size="flexible"
          tooltip={
            <>
              铁木树皮同时减少目标受到的伤害，并增加你的持续治疗效果。显示的数字为每次施放铁木树皮时，平均减少的伤害和提升的治疗效果。治疗量仅包括铁木树皮提升的部分。你在战斗中共施放了{' '}
              <strong>{this.ironbarkCount}</strong> 次铁木树皮。
              <ul>
                <li>
                  每次施放平均减少的伤害：<strong>{formatNumber(this.damageReducedPerCast)}</strong>
                </li>
                <li>
                  每次施放提升的治疗量：<strong>{formatNumber(this.healBoostedPerCast)}</strong>
                </li>
              </ul>
              总计减少的伤害和提升的治疗为{' '}
              <strong>{formatNumber(this.damageReduced + this.boostedIronbarkHealing)}</strong>
              。尽管这些量不会计入你的治疗总量，但这相当于你的总治疗量的{' '}
              <strong>
                {formatPercentage(
                  this.owner.getPercentageOfTotalHealingDone(
                    this.damageReduced + this.boostedIronbarkHealing,
                  ),
                )}
                %
              </strong>
              。
            </>
          }
        >
          <BoringValue
            label={
              <>
                <SpellIcon spell={SPELLS.IRONBARK} /> 平均减少的伤害和提升的治疗量
              </>
            }
          >
            <>
              {formatNumber(
                (this.damageReduced + this.boostedIronbarkHealing) / this.ironbarkCount,
              )}
            </>
          </BoringValue>
        </Statistic>
      );
    } else {
      return '';
    }
  }
}

export default Ironbark;
