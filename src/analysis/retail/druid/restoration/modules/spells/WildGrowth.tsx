import { formatPercentage } from 'common/format';
import SPELLS from 'common/SPELLS';
import { SpellIcon, SpellLink } from 'interface';
import Analyzer, { Options, SELECTED_PLAYER } from 'parser/core/Analyzer';
import Events, { AnyEvent, CastEvent, EventType, HealEvent } from 'parser/core/Events';
import AbilityTracker from 'parser/shared/modules/AbilityTracker';
import HealingValue from 'parser/shared/modules/HealingValue';
import BoringValue from 'parser/ui/BoringValueText';
import { BoxRowEntry } from 'interface/guide/components/PerformanceBoxRow';
import Statistic from 'parser/ui/Statistic';
import STATISTIC_ORDER from 'parser/ui/STATISTIC_ORDER';

import { getHeals } from 'analysis/retail/druid/restoration/normalizers/CastLinkNormalizer';
import { explanationAndDataSubsection } from 'interface/guide/components/ExplanationRow';
import { GUIDE_CORE_EXPLANATION_PERCENT } from '../../Guide';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import CastSummaryAndBreakdown from 'interface/guide/components/CastSummaryAndBreakdown';

/** 治疗三个以上目标的野性成长才是有效的 */
const RECOMMENDED_EFFECTIVE_TARGETS_THRESHOLD = 3;
/** 检测高过量治疗的最大时间间隔 */
const OVERHEAL_BUFFER = 3000;
/** 在施放后 {OVERHEAL_BUFFER} 时间内，治疗溢出的比例超过 {OVERHEAL_THRESHOLD} 将视为过量治疗 */
const OVERHEAL_THRESHOLD = 0.6;

/**
 * 追踪与野性成长相关的统计数据
 */
class WildGrowth extends Analyzer {
  static dependencies = {
    abilityTracker: AbilityTracker,
  };

  abilityTracker!: AbilityTracker;

  recentWgTimestamp: number = 0;
  /** 追踪最近一次野性成长硬施法目标的过量治疗，按目标ID索引 */
  recentWgTargetHealing: {
    [key: number]: { appliedTimestamp: number; total: number; overheal: number };
  } = {};

  /** 野性成长硬施法的总次数（在统计完成前不计入其他字段） */
  totalCasts = 0;
  /** 野性成长硬施法应用的HoTs总数 */
  totalHardcastHits = 0;
  /** 有效的野性成长HoTs数量 */
  totalEffectiveHits = 0;
  /** 无效的野性成长施法次数 */
  ineffectiveCasts = 0;
  /** 命中目标过少的施法次数 */
  tooFewHitsCasts = 0;
  /** 过量治疗过多的施法次数 */
  tooMuchOverhealCasts = 0;

  /** 每次野性成长施法的记录 */
  castEntries: BoxRowEntry[] = [];

  constructor(options: Options) {
    super(options);
    this.addEventListener(Events.cast.by(SELECTED_PLAYER).spell(SPELLS.WILD_GROWTH), this.onCastWg);
    this.addEventListener(Events.heal.by(SELECTED_PLAYER).spell(SPELLS.WILD_GROWTH), this.onHealWg);
    this.addEventListener(Events.fightend, this.onFightEnd);
  }

  onFightEnd() {
    this._tallyLastCast(); // 确保最后一次施法被记录
  }

  onCastWg(event: CastEvent) {
    this._tallyLastCast(); // 确保前一次施法被记录
    this._trackNewCast(event);
  }

  onHealWg(event: HealEvent) {
    const recentWgHealTracker = this.recentWgTargetHealing[event.targetID];
    if (recentWgHealTracker !== undefined) {
      const healVal = new HealingValue(event.amount, event.absorbed, event.overheal);
      recentWgHealTracker.total += healVal.raw;
      recentWgHealTracker.overheal += healVal.overheal;
    }
  }

  /**
   * 从施法事件中追踪每个HoT的治疗，并为每个目标初始化 `recentWgTargetHealing` 项。
   */
  _trackNewCast(event: CastEvent) {
    this.recentWgTargetHealing = {};
    this.recentWgTimestamp = event.timestamp;
    getHeals(event).forEach(
      (applyHot: AnyEvent) =>
        (applyHot.type === EventType.ApplyBuff || applyHot.type === EventType.RefreshBuff) &&
        (this.recentWgTargetHealing[applyHot.targetID] = {
          appliedTimestamp: applyHot.timestamp,
          total: 0,
          overheal: 0,
        }),
    );
  }

  /**
   * 关闭 '最近施法' 统计项（如果有未记录的施法且已过去足够时间）
   */
  _tallyLastCast() {
    this.totalCasts += 1;
    if (this.totalCasts === 1) {
      return; // 没有上一施法
    }

    const hits = Object.values(this.recentWgTargetHealing);
    const effectiveHits = hits.filter((wg) => wg.total * OVERHEAL_THRESHOLD > wg.overheal).length;
    this.totalEffectiveHits += effectiveHits;

    if (effectiveHits < RECOMMENDED_EFFECTIVE_TARGETS_THRESHOLD) {
      this.ineffectiveCasts += 1;
      if (hits.length - effectiveHits >= 2) {
        this.tooMuchOverhealCasts += 1;
      }
      if (hits.length < RECOMMENDED_EFFECTIVE_TARGETS_THRESHOLD) {
        this.tooFewHitsCasts += 1;
      }
    }

    // 添加施法表现条目
    const value = effectiveHits >= 3 ? QualitativePerformance.Good : QualitativePerformance.Fail;
    const tooltip = (
      <>
        时间 <strong>{this.owner.formatTimestamp(this.recentWgTimestamp)}</strong>, 命中:{' '}
        <strong>{hits.length}</strong>, 有效命中: <strong>{effectiveHits}</strong>
      </>
    );
    this.castEntries.push({ value, tooltip });
  }

  get averageEffectiveHits() {
    return this.totalEffectiveHits / this.totalCasts || 0;
  }

  get actualRejuvCasts() {
    return this.abilityTracker.getAbility(SPELLS.REJUVENATION.id).casts || 0;
  }

  /** 指导野性成长的正确使用方式 */
  get guideSubsection(): JSX.Element {
    const explanation = (
      <>
        <p>
          <b>
            <SpellLink spell={SPELLS.WILD_GROWTH} />
          </b>{' '}
          是你在团队成员受伤时最好的治疗法术。它可以快速治疗多个目标，但代价是高法力消耗。请在至少有3个受伤目标时使用野性成长。
        </p>
        <p>记住，只有距离主要目标30码以内的盟友才能被治疗——不要对孤立的玩家使用！</p>
      </>
    );

    const data = (
      <div>
        <CastSummaryAndBreakdown
          spell={SPELLS.WILD_GROWTH}
          castEntries={this.castEntries}
          badExtraExplanation={
            <>
              少于三个目标的有效命中。我们认为，在施法后的 {(OVERHEAL_BUFFER / 1000).toFixed(0)}{' '}
              秒内 过量治疗超过 {formatPercentage(OVERHEAL_THRESHOLD, 0)}% 的命中是无效的。
            </>
          }
        />
      </div>
    );

    return explanationAndDataSubsection(explanation, data, GUIDE_CORE_EXPLANATION_PERCENT);
  }

  statistic() {
    return (
      <Statistic
        size="flexible"
        position={STATISTIC_ORDER.CORE(19)} // 为常规统计数据选择的固定顺序
        tooltip={
          <>
            这是每次野性成长施法的平均有效命中数。由于它的治疗量在前期效果显著，我们仅将过量治疗少于{' '}
            {formatPercentage(OVERHEAL_THRESHOLD, 0)}% 的命中视为有效命中。
            <br /> <br />
            该统计仅考虑硬施法，因灵魂链接而触发的野性成长将被忽略。
          </>
        }
      >
        <BoringValue
          label={
            <>
              <SpellIcon spell={SPELLS.WILD_GROWTH} /> 平均有效野性成长命中
            </>
          }
        >
          <>{this.averageEffectiveHits.toFixed(1)}</>
        </BoringValue>
      </Statistic>
    );
  }
}

export default WildGrowth;
