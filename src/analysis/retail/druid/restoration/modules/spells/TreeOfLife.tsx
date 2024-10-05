import { defineMessage } from '@lingui/macro';
import { formatPercentage } from 'common/format';
import SPELLS from 'common/SPELLS';
import { SpellLink } from 'interface';
import Analyzer, { Options, SELECTED_PLAYER } from 'parser/core/Analyzer';
import { calculateEffectiveHealing } from 'parser/core/EventCalculateLib';
import Events, {
  ApplyBuffEvent,
  CastEvent,
  Event,
  HealEvent,
  RefreshBuffEvent,
} from 'parser/core/Events';
import { ThresholdStyle, When } from 'parser/core/ParseResults';
import AbilityTracker from 'parser/shared/modules/AbilityTracker';
import { Attribution } from 'parser/shared/modules/HotTracker';
import HealingDone from 'parser/shared/modules/throughput/HealingDone';
import BoringSpellValueText from 'parser/ui/BoringSpellValueText';
import ItemPercentHealingDone from 'parser/ui/ItemPercentHealingDone';
import Statistic from 'parser/ui/Statistic';
import STATISTIC_CATEGORY from 'parser/ui/STATISTIC_CATEGORY';
import STATISTIC_ORDER from 'parser/ui/STATISTIC_ORDER';

import { ABILITIES_AFFECTED_BY_HEALING_INCREASES_SPELL_OBJECTS } from 'analysis/retail/druid/restoration/constants';
import HotTrackerRestoDruid from 'analysis/retail/druid/restoration/modules/core/hottracking/HotTrackerRestoDruid';
import Rejuvenation from 'analysis/retail/druid/restoration/modules/spells/Rejuvenation';
import { isFromHardcast } from 'analysis/retail/druid/restoration/normalizers/CastLinkNormalizer';
import { TALENTS_DRUID } from 'common/TALENTS';
import { explanationAndDataSubsection } from 'interface/guide/components/ExplanationRow';
import { GUIDE_CORE_EXPLANATION_PERCENT } from 'analysis/retail/druid/restoration/Guide';

const ALL_BOOST = 0.1;
const ALL_MULT = 1 + ALL_BOOST;
const REJUV_BOOST = 0.4;
const WG_INCREASE = 8 / 6 - 1;
const TOL_DURATION = 30000;
const BUFFER = 500;

// 需要注意应用叠加增益时避免双重计算。为了简化处理，所有增益都优先应用"整体增益"
// 举例来说，在生命之树形态下，一个回春术的基础治疗为1000，但其受到1.15 * 1.5的加成，治疗量为1725
// 如果我们单独计算每个增益，得到1.15 => 225提升，1.5 => 575提升，总共800的提升。重复计算了重叠的增益
// 我们通过在计算回春术或野性成长的提升时，先除去整体增益来修正这一问题

/**
 * **化身：生命之树**
 * 专精天赋 第8层
 *
 * 变形为生命之树，增加治疗效果15%，提高护甲120%，并免疫变形效果。
 * 回春术、野性成长、愈合、纠缠根须和愤怒的功能得到增强。持续30秒。你可以在其持续时间内随意变形。
 *
 * 生命之树的治疗加成：
 *  - 整体：+15%治疗量
 *  - 回春术：+50%治疗量，法力值消耗减少30%
 *  - 愈合：瞬发
 *  - 野性成长：额外影响2个目标
 */
class TreeOfLife extends Analyzer {
  static dependencies = {
    healingDone: HealingDone,
    abilityTracker: AbilityTracker,
    rejuvenation: Rejuvenation,
    hotTracker: HotTrackerRestoDruid,
  };

  healingDone!: HealingDone;
  abilityTracker!: AbilityTracker;
  rejuvenation!: Rejuvenation;
  hotTracker!: HotTrackerRestoDruid;

  lastHardcastTimestamp: number | null = null;

  hardcast: TolAccumulator = {
    allBoostHealing: 0,
    rejuvBoostHealing: 0,
    extraWgsAttribution: HotTrackerRestoDruid.getNewAttribution('硬读条生命之树：额外野性成长'),
  };
  reforestation: TolAccumulator = {
    allBoostHealing: 0,
    rejuvBoostHealing: 0,
    extraWgsAttribution: HotTrackerRestoDruid.getNewAttribution('重植术生命之树：额外野性成长'),
  };

  constructor(options: Options) {
    super(options);

    this.addEventListener(
      Events.heal.by(SELECTED_PLAYER).spell(ABILITIES_AFFECTED_BY_HEALING_INCREASES_SPELL_OBJECTS),
      this.onBoostedHeal,
    );
    this.addEventListener(
      Events.cast.by(SELECTED_PLAYER).spell(TALENTS_DRUID.INCARNATION_TREE_OF_LIFE_TALENT),
      this.onHardcastTol,
    );
    this.addEventListener(
      Events.applybuff.by(SELECTED_PLAYER).spell(SPELLS.WILD_GROWTH),
      this.onApplyWildGrowth,
    );
    this.addEventListener(
      Events.refreshbuff.by(SELECTED_PLAYER).spell(SPELLS.WILD_GROWTH),
      this.onApplyWildGrowth,
    );
    this.addEventListener(
      Events.applybuff.by(SELECTED_PLAYER).spell(SPELLS.INCARNATION_TOL_ALLOWED),
      this.onApplyTol,
    );

    this.addEventListener(Events.fightend, this.checkActive);
  }

  // 处理这种情况，现在生命之树和重植术都可以成为天赋
  checkActive() {
    // 只有在玩家实际拥有天赋时才保持活跃状态
    this.active = this.selectedCombatant.hasTalent(TALENTS_DRUID.INCARNATION_TREE_OF_LIFE_TALENT);
  }

  onHardcastTol(event: CastEvent) {
    this.lastHardcastTimestamp = event.timestamp;
  }

  onApplyTol(event: ApplyBuffEvent) {
    if (isFromHardcast(event)) {
      this.lastHardcastTimestamp = event.timestamp; // 设定时间戳，防止事件排序错误
    }
  }

  /**
   * 获取当前生命之树的增益追踪器
   */
  _getAccumulator(event: Event<any>) {
    if (!this.selectedCombatant.hasBuff(TALENTS_DRUID.INCARNATION_TREE_OF_LIFE_TALENT.id)) {
      return null; // 生命之树未激活，返回空
    } else if (!this.selectedCombatant.hasTalent(TALENTS_DRUID.INCARNATION_TREE_OF_LIFE_TALENT)) {
      return this.reforestation; // 玩家没有生命之树天赋，来自重植术
    } else if (
      this.lastHardcastTimestamp !== null &&
      this.lastHardcastTimestamp + TOL_DURATION + BUFFER >= event.timestamp
    ) {
      return this.hardcast; // 玩家在生命之树持续时间内施放了硬读条
    } else {
      return this.reforestation; // 玩家没有在持续时间内硬读条，来自重植术
    }
  }

  onBoostedHeal(event: HealEvent) {
    const spellId = event.ability.guid;

    const accumulator = this._getAccumulator(event);
    if (!accumulator) {
      return;
    }

    accumulator.allBoostHealing += calculateEffectiveHealing(event, ALL_BOOST);
    if (spellId === SPELLS.REJUVENATION.id || spellId === SPELLS.REJUVENATION_GERMINATION.id) {
      accumulator.rejuvBoostHealing += calculateEffectiveHealing(event, REJUV_BOOST) / ALL_MULT;
    }
  }

  onApplyWildGrowth(event: ApplyBuffEvent | RefreshBuffEvent) {
    const accumulator = this._getAccumulator(event);
    if (!accumulator) {
      return;
    }
    // 生命之树会对额外目标施加野性成长 - 我们对每个在生命之树期间施加的野性成长都部分归因
    this.hotTracker.addBoostFromApply(
      accumulator.extraWgsAttribution,
      WG_INCREASE / ALL_MULT,
      event,
    );
  }

  get suggestionThresholds() {
    return {
      actual: this.owner.getPercentageOfTotalHealingDone(this._getTotalHealing(this.hardcast)),
      isLessThan: {
        minor: 0.06,
        average: 0.045,
        major: 0.025,
      },
      style: ThresholdStyle.PERCENTAGE,
    };
  }

  _getTotalHealing(accumulator: TolAccumulator) {
    return (
      accumulator.allBoostHealing +
      accumulator.rejuvBoostHealing +
      accumulator.extraWgsAttribution.healing
    );
  }

  /** 指导说明片段，展示每次化身：生命之树的使用细节 */
  get guideCastBreakdown() {
    const explanation = (
      <p>
        <strong>
          <SpellLink spell={TALENTS_DRUID.INCARNATION_TREE_OF_LIFE_TALENT} />
        </strong>{' '}
        是一个持续时间长、即时影响较低的治疗增益，应计划在高持续治疗需求期间使用。由于其持续时间较长，并且回春术的法力值折扣，它应在治疗准备阶段开始施放。
      </p>
    );

    const data = (
      <p>
        <strong>逐次使用明细功能即将上线！</strong>
      </p>
    );

    return explanationAndDataSubsection(explanation, data, GUIDE_CORE_EXPLANATION_PERCENT);
  }

  suggestions(when: When) {
    when(this.suggestionThresholds).addSuggestion((suggest, actual, recommended) =>
      suggest(
        <>
          你的
          <SpellLink spell={TALENTS_DRUID.INCARNATION_TREE_OF_LIFE_TALENT} />
          未能为你提供足够的治疗量。你可能需要更好地规划技能使用，或选择其他天赋。
        </>,
      )
        .icon(TALENTS_DRUID.INCARNATION_TREE_OF_LIFE_TALENT.icon)
        .actual(
          defineMessage({
            id: 'druid.restoration.suggestions.treeOfLife.efficiency',
            message: `${formatPercentage(actual)}% 治疗量`,
          }),
        )
        .recommended(`建议治疗量 > ${formatPercentage(recommended, 0)}%`),
    );
  }

  statistic() {
    return (
      <Statistic
        position={STATISTIC_ORDER.OPTIONAL(8)} // 基于天赋层数的数字
        category={STATISTIC_CATEGORY.TALENTS}
        size="flexible"
        tooltip={
          <>
            显示的治疗数字是以下多个增益的总和：
            <ul>
              <li>
                整体治疗量提升:{' '}
                <strong>
                  {formatPercentage(
                    this.owner.getPercentageOfTotalHealingDone(this.hardcast.allBoostHealing),
                  )}
                  %
                </strong>
              </li>
              <li>
                回春术治疗量提升:{' '}
                <strong>
                  {formatPercentage(
                    this.owner.getPercentageOfTotalHealingDone(this.hardcast.rejuvBoostHealing),
                  )}
                  %
                </strong>
              </li>
              <li>
                野性成长治疗量提升:{' '}
                <strong>
                  {formatPercentage(
                    this.owner.getPercentageOfTotalHealingDone(
                      this.hardcast.extraWgsAttribution.healing,
                    ),
                  )}
                  %
                </strong>
              </li>
            </ul>
          </>
        }
      >
        <BoringSpellValueText spell={TALENTS_DRUID.INCARNATION_TREE_OF_LIFE_TALENT}>
          <ItemPercentHealingDone amount={this._getTotalHealing(this.hardcast)} />
          <br />
        </BoringSpellValueText>
      </Statistic>
    );
  }
}

// 用于追踪归因于生命之树的增益
interface TolAccumulator {
  allBoostHealing: number;
  rejuvBoostHealing: number;
  extraWgsAttribution: Attribution;
}

export default TreeOfLife;
