import { formatNumber } from 'common/format';
import SPELLS from 'common/SPELLS';
import { SpellLink, Tooltip } from 'interface';
import { PassFailCheckmark } from 'interface/guide';
import InformationIcon from 'interface/icons/Information';
import Analyzer, { Options, SELECTED_PLAYER } from 'parser/core/Analyzer';
import Events, { CastEvent, HealEvent } from 'parser/core/Events';

import CooldownExpandable, {
  CooldownExpandableItem,
} from 'interface/guide/components/CooldownExpandable';
import { GUIDE_CORE_EXPLANATION_PERCENT } from 'analysis/retail/druid/restoration/Guide';
import { getTranquilityTicks } from 'analysis/retail/druid/restoration/normalizers/CastLinkNormalizer';
import HotTrackerRestoDruid from 'analysis/retail/druid/restoration/modules/core/hottracking/HotTrackerRestoDruid';
import { explanationAndDataSubsection } from 'interface/guide/components/ExplanationRow';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';

const MAX_TRANQ_TICKS = 5;

/**
 * 追踪宁静技能的相关统计数据
 */
class Tranquility extends Analyzer {
  static dependencies = {
    hotTracker: HotTrackerRestoDruid,
  };

  hotTracker!: HotTrackerRestoDruid;

  tranqCasts: TranquilityCast[] = [];

  constructor(options: Options) {
    super(options);
    this.addEventListener(
      Events.cast.by(SELECTED_PLAYER).spell(SPELLS.TRANQUILITY_CAST),
      this.onTranqCast,
    );
    this.addEventListener(
      Events.heal.by(SELECTED_PLAYER).spell(SPELLS.TRANQUILITY_HEAL),
      this.onTranqHeal,
    );
  }

  onTranqCast(event: CastEvent) {
    const directHealing = 0;
    const periodicHealing = 0;
    const rejuvsOnCast =
      this.hotTracker.getHotCount(SPELLS.REJUVENATION.id) +
      this.hotTracker.getHotCount(SPELLS.REJUVENATION_GERMINATION.id);
    const wgsOnCast = this.hotTracker.getHotCount(SPELLS.WILD_GROWTH.id);
    const timestamp = event.timestamp;
    const channeledTicks = getTranquilityTicks(event).length;
    this.tranqCasts.push({
      timestamp,
      directHealing,
      periodicHealing,
      wgsOnCast,
      rejuvsOnCast,
      channeledTicks,
    });
  }

  onTranqHeal(event: HealEvent) {
    const effectiveAmount = event.amount + (event.absorbed || 0);
    if (this.tranqCasts.length > 0) {
      if (event.tick) {
        this.tranqCasts[this.tranqCasts.length - 1].periodicHealing += effectiveAmount;
      } else {
        this.tranqCasts[this.tranqCasts.length - 1].directHealing += effectiveAmount;
      }
    }
  }

  /** 显示每次宁静施放的分解 */
  get guideCastBreakdown() {
    const explanation = (
      <>
        <p>
          <strong>
            <SpellLink spell={SPELLS.TRANQUILITY_CAST} />
          </strong>{' '}
          是你最独立的冷却技能之一，并且最有可能由团队领袖明确分配。通常应为特定的机制进行规划使用。
        </p>
        <p>
          宁静的大部分治疗是直接治疗，而非来自持续治疗效果。**不要**使用持续治疗效果来提前准备。施放时要注意你的站位——你需要确保自己能够在不移动的情况下完成完整引导。
        </p>
      </>
    );

    const data = (
      <div>
        <strong>每次施放分解</strong>
        <small> - 点击展开</small>
        {this.tranqCasts.map((cast, ix) => {
          const castTotalHealing = cast.directHealing + cast.periodicHealing;
          const header = (
            <>
              @ {this.owner.formatTimestamp(cast.timestamp)} &mdash;{' '}
              <SpellLink spell={SPELLS.TRANQUILITY_CAST} /> （{formatNumber(castTotalHealing)}{' '}
              治疗量）
            </>
          );

          const wgRamp = cast.wgsOnCast > 0;
          const rejuvRamp = cast.rejuvsOnCast > 0;
          const channeledMaxTicks = cast.channeledTicks === MAX_TRANQ_TICKS;
          const overallPerf =
            wgRamp && rejuvRamp && channeledMaxTicks
              ? QualitativePerformance.Good
              : QualitativePerformance.Fail;

          const checklistItems: CooldownExpandableItem[] = [];
          checklistItems.push({
            label: (
              <>
                <SpellLink spell={SPELLS.WILD_GROWTH} /> 提升
              </>
            ),
            result: <PassFailCheckmark pass={wgRamp} />,
            details: <>（{cast.wgsOnCast} 个HoT活跃）</>,
          });
          checklistItems.push({
            label: (
              <>
                <SpellLink spell={SPELLS.REJUVENATION} /> 提升
              </>
            ),
            result: <PassFailCheckmark pass={rejuvRamp} />,
            details: <>（{cast.rejuvsOnCast} 个HoT活跃）</>,
          });
          checklistItems.push({
            label: (
              <>
                完整引导{' '}
                <Tooltip
                  hoverable
                  content={
                    <>
                      宁静的每个治疗跳数都非常强大——提前规划站位，确保你能够在不被打断的情况下完成完整的引导，并且不要在最后跳数时剪断。
                    </>
                  }
                >
                  <span>
                    <InformationIcon />
                  </span>
                </Tooltip>
              </>
            ),
            result: <PassFailCheckmark pass={channeledMaxTicks} />,
            details: (
              <>
                （{cast.channeledTicks} / {MAX_TRANQ_TICKS} 跳）
              </>
            ),
          });

          const detailItems: CooldownExpandableItem[] = [];
          detailItems.push({
            label: '直接治疗',
            result: '',
            details: <>{formatNumber(cast.directHealing)}</>,
          });
          detailItems.push({
            label: '周期性治疗',
            result: '',
            details: <>{formatNumber(cast.periodicHealing)}</>,
          });

          return (
            <CooldownExpandable
              header={header}
              checklistItems={checklistItems}
              detailItems={detailItems}
              perf={overallPerf}
              key={ix}
            />
          );
        })}
      </div>
    );

    return explanationAndDataSubsection(explanation, data, GUIDE_CORE_EXPLANATION_PERCENT);
  }
}

interface TranquilityCast {
  /** 宁静引导开始的时间戳 */
  timestamp: number;
  /** 此次施放的直接治疗量 */
  directHealing: number;
  /** 此次施放的持续治疗量 */
  periodicHealing: number;
  /** 施放宁静时激活的野性成长数量 */
  wgsOnCast: number;
  /** 施放宁静时激活的愈合数量 */
  rejuvsOnCast: number;
  /** 此次引导的治疗跳数 */
  channeledTicks: number;
}

export default Tranquility;
