import { formatPercentage } from 'common/format';
import SPELLS from 'common/SPELLS';
import { SpellIcon } from 'interface';
import Analyzer, { Options, SELECTED_PLAYER } from 'parser/core/Analyzer';
import Events, { CastEvent, HealEvent } from 'parser/core/Events';
import BoringValue from 'parser/ui/BoringValueText';
import Statistic from 'parser/ui/Statistic';
import STATISTIC_CATEGORY from 'parser/ui/STATISTIC_CATEGORY';
import STATISTIC_ORDER from 'parser/ui/STATISTIC_ORDER';
import { TALENTS_DRUID } from 'common/TALENTS';
import StatTracker from 'parser/shared/modules/StatTracker';
import Combatants from 'parser/shared/modules/Combatants';
import { calculateEffectiveHealingFromCritIncrease } from 'parser/core/EventCalculateLib';

const MS_BUFFER = 100;
export const ABUNDANCE_MANA_REDUCTION = 0.08;
const ABUNDANCE_INCREASED_CRIT = 0.08;
const IMP_REGROWTH_CRIT_BONUS = 0.4;

/**
 * **丰饶**
 * 天赋 第四层
 *
 * 每个你激活的回春术将使愈合的法力消耗减少8%，暴击几率提高8%，最多叠加至96%。
 */
class Abundance extends Analyzer.withDependencies({
  statTracker: StatTracker,
  combatants: Combatants,
}) {
  hasImpRegrowth: boolean;

  /** 由增加的暴击导致的总治疗量 */
  totalEffCritHealing = 0;
  /** 总暴击百分比累积（除以施法次数以获得平均值）- 受100%的限制 */
  totalEffCritGain = 0;
  /** 总堆叠数 */
  totalStacks: number = 0;
  /** 用于法力施法的总堆叠数 */
  totalManaStacks: number = 0;
  /** 非免费愈合施法次数 */
  manaCasts: number = 0;
  /** 所有愈合施法（包括清晰预兆/自然迅捷触发的免费施法） */
  allHits: number = 0;

  constructor(options: Options) {
    super(options);
    this.active = this.selectedCombatant.hasTalent(TALENTS_DRUID.ABUNDANCE_TALENT);
    this.hasImpRegrowth = this.selectedCombatant.hasTalent(TALENTS_DRUID.IMPROVED_REGROWTH_TALENT);
    this.addEventListener(Events.cast.by(SELECTED_PLAYER).spell(SPELLS.REGROWTH), this.onCast);
    this.addEventListener(Events.heal.by(SELECTED_PLAYER).spell(SPELLS.REGROWTH), this.onHit);
  }

  // 暴击加成适用于所有愈合的直接治疗
  onHit(event: HealEvent) {
    if (event.tick) {
      return; // 只统计直接治疗
    }
    const stacks = this.selectedCombatant.getOwnBuffStacks(SPELLS.ABUNDANCE_BUFF);

    this.allHits += 1;
    this.totalStacks += stacks;

    // 复杂的暴击增益计算，因为暴击不能超过100%
    let currCrit = this.deps.statTracker.currentCritPercentage;
    if (this.hasImpRegrowth) {
      const tar = this.deps.combatants.getEntity(event);
      if (tar && tar.hasOwnBuff(SPELLS.REGROWTH)) {
        currCrit += IMP_REGROWTH_CRIT_BONUS;
      }
    }
    currCrit = Math.min(1, currCrit);
    const bonusCrit = Math.min(1 - currCrit, stacks * ABUNDANCE_INCREASED_CRIT);

    this.totalEffCritGain += bonusCrit;
    this.totalEffCritHealing += calculateEffectiveHealingFromCritIncrease(
      event,
      currCrit,
      bonusCrit,
    );
  }

  // 法力消耗减少仅适用于非免费愈合施法
  onCast(event: CastEvent) {
    if (
      this.selectedCombatant.hasOwnBuff(SPELLS.CLEARCASTING_BUFF, MS_BUFFER) ||
      this.selectedCombatant.hasBuff(SPELLS.INNERVATE.id, event.timestamp, MS_BUFFER)
    ) {
      return; // 不统计已经免费的施法
    }
    const stacks = this.selectedCombatant.getBuffStacks(SPELLS.ABUNDANCE_BUFF.id);

    this.manaCasts += 1;
    this.totalManaStacks += stacks;
  }

  /** 愈合直接治疗的平均堆叠数 */
  get avgStacks() {
    return this.allHits === 0 ? 0 : this.totalStacks / this.allHits;
  }

  /** 非免费愈合施法的平均堆叠数 */
  get avgManaStacks() {
    return this.manaCasts === 0 ? 0 : this.totalManaStacks / this.manaCasts;
  }

  /** 非免费愈合施法的平均法力消耗减少 */
  get avgPercentManaSaved() {
    return ABUNDANCE_MANA_REDUCTION * this.avgManaStacks;
  }

  /** 愈合施法的平均暴击增益 */
  get avgCritGain() {
    return this.allHits === 0 ? 0 : this.totalEffCritGain / this.allHits;
  }

  statistic() {
    return (
      <Statistic
        position={STATISTIC_ORDER.OPTIONAL(4)} // 基于天赋层数的编号
        category={STATISTIC_CATEGORY.TALENTS}
        size="flexible"
        tooltip={
          <>
            <p>
              显示的平均堆叠数包括所有直接的愈合治疗。但法力部分只适用于非免费施法——你在非免费愈合施法中的平均堆叠数为{' '}
              <strong>{this.avgManaStacks.toFixed(1)}</strong>。
            </p>
            <p>
              <ul>
                <li>
                  平均法力消耗减少：{' '}
                  <strong>{formatPercentage(this.avgPercentManaSaved, 1)}%</strong>
                </li>
                <li>
                  平均暴击增益：<strong>{formatPercentage(this.avgCritGain, 1)}%</strong>
                </li>
                <li>
                  来自额外暴击的总治疗增益：{' '}
                  <strong>
                    {formatPercentage(
                      this.owner.getPercentageOfTotalHealingDone(this.totalEffCritHealing),
                      1,
                    )}
                    %
                  </strong>
                </li>
              </ul>
            </p>
            <p>显示的平均暴击增益可能低于“堆叠数乘以每堆叠加成”，因为暴击增益超过100%不会计入。</p>
          </>
        }
      >
        <BoringValue
          label={
            <>
              <SpellIcon spell={TALENTS_DRUID.ABUNDANCE_TALENT} /> 平均丰饶堆叠数
            </>
          }
        >
          <>{this.avgStacks.toFixed(1)}</>
        </BoringValue>
      </Statistic>
    );
  }
}

export default Abundance;
