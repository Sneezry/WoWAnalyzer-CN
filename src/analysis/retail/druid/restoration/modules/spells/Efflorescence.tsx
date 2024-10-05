import { formatPercentage } from 'common/format';
import SPELLS from 'common/SPELLS';
import { SpellIcon, SpellLink, TooltipElement } from 'interface';
import Analyzer, { Options, SELECTED_PLAYER } from 'parser/core/Analyzer';
import Events, { CastEvent, HealEvent } from 'parser/core/Events';
import { ClosedTimePeriod, mergeTimePeriods, OpenTimePeriod } from 'parser/core/mergeTimePeriods';
import UptimeStackBar from 'parser/ui/UptimeStackBar';
import { RoundedPanel } from 'interface/guide/components/GuideDivs';
import { explanationAndDataSubsection } from 'interface/guide/components/ExplanationRow';
import { GUIDE_CORE_EXPLANATION_PERCENT } from '../../Guide';

const DURATION_MS = 30000;
const TICK_MS = 2000;
const EFFLO_TARGETS = 3;
const EFFLO_COLOR = '#881144';
const EFFLO_BG_COLOR = '#cca7a7';

class Efflorescence extends Analyzer {
  /** 繁盛激活的时间段列表 */
  effloUptimes: OpenTimePeriod[] = [];
  /** 如果已施放过至少一次繁盛为 true */
  hasCast: boolean = false;

  /** 记录繁盛治疗的时间戳及其治疗的目标数量 */
  effloTimes: EffloTime[] = [];

  constructor(options: Options) {
    super(options);
    // TODO 当玩家没有选择天赋时禁用此功能，或提示"你真的应该选择繁盛"？
    this.addEventListener(
      Events.cast.by(SELECTED_PLAYER).spell(SPELLS.EFFLORESCENCE_CAST),
      this.onCast,
    );
    this.addEventListener(
      Events.heal.by(SELECTED_PLAYER).spell(SPELLS.EFFLORESCENCE_HEAL),
      this.onHeal,
    );
  }

  onCast(event: CastEvent) {
    this.hasCast = true;
    this.effloUptimes.push({ start: event.timestamp });
    this.effloTimes.push({ timestamp: event.timestamp, targets: 0, start: true });
  }

  onHeal(event: HealEvent) {
    // 如果在第一次施放之前检测到治疗事件，推测繁盛从战斗开始就已经激活
    if (!this.hasCast) {
      if (this.effloUptimes.length === 0) {
        this.effloUptimes.push({ start: this.owner.fight.start_time });
        this.effloTimes.push({ timestamp: this.owner.fight.start_time, targets: 0, start: true });
      }
      this.effloUptimes[0].end = event.timestamp;
    }

    // 更新治疗时间记录
    if (this.effloTimes.length > 0) {
      const latestHeal = this.effloTimes[this.effloTimes.length - 1];
      if (latestHeal.timestamp === event.timestamp) {
        latestHeal.targets += 1;
      } else {
        this.effloTimes.push({ timestamp: event.timestamp, targets: 1 });
      }
    }
  }

  /** 合并相邻的激活时间段，并将结束时间设定为当前时间戳 */
  _mergeAndCapUptimes(): ClosedTimePeriod[] {
    this.effloUptimes.forEach((ut) => {
      if (ut.end === undefined) {
        ut.end = Math.min(ut.start + DURATION_MS, this.owner.currentTimestamp);
      }
    });
    return mergeTimePeriods(this.effloUptimes, this.owner.currentTimestamp);
  }

  /** 构建一个基于实际治疗目标数量的时间段数组 */
  _buildTargetsUptimes(): StackTimePeriod[] {
    const stackTimePeriods: StackTimePeriod[] = [];

    let prev: EffloTime | undefined = undefined;
    this.effloTimes.forEach((et) => {
      if (prev && !et.start) {
        const prevTime = Math.max(prev.timestamp, et.timestamp - TICK_MS);
        stackTimePeriods.push({ start: prevTime, end: et.timestamp, stacks: et.targets });
      }
      prev = et;
    });

    return stackTimePeriods;
  }

  /** 一个根据实际治疗目标数量加权的激活时间，使用 StackTimePeriods 进行计算 */
  get weightedUptime() {
    return this._buildTargetsUptimes().reduce(
      (acc, wut) => acc + ((wut.end - wut.start) * wut.stacks) / EFFLO_TARGETS,
      0,
    );
  }

  get weightedUptimePercent() {
    return this.weightedUptime / this.owner.fightDuration;
  }

  get uptime() {
    return this._mergeAndCapUptimes().reduce((acc, ut) => acc + ut.end - ut.start, 0);
  }

  get uptimePercent() {
    return this.uptime / this.owner.fightDuration;
  }

  /** 指南子部分，描述如何正确使用繁盛 */
  get guideSubsection(): JSX.Element {
    const explanation = (
      <p>
        <b>
          <SpellLink spell={SPELLS.EFFLORESCENCE_CAST} />
        </b>{' '}
        如果你将其放在团队成员站立的位置，它的法力效率极高。通常情况下，放置在首领下方是一个安全的选择。虽然在大量移动时可以暂时放弃繁盛，但除此之外，你应该始终保持它的激活。
      </p>
    );

    const data = (
      <div>
        <RoundedPanel>
          <strong>百花齐放激活时间</strong>
          {this.subStatistic()}
        </RoundedPanel>
      </div>
    );

    return explanationAndDataSubsection(explanation, data, GUIDE_CORE_EXPLANATION_PERCENT);
  }

  // 自定义统计信息，显示繁盛目标命中数量与条形图厚度
  // TODO 如果其他叠加效果也需要使用，可以泛化此功能
  subStatistic() {
    return (
      <div className="flex-main multi-uptime-bar">
        <div className="flex main-bar-big">
          <div className="flex-sub bar-label">
            <SpellIcon
              key={'Icon-' + SPELLS.EFFLORESCENCE_CAST.name}
              spell={SPELLS.EFFLORESCENCE_CAST}
            />{' '}
            <span style={{ color: EFFLO_BG_COLOR }}>
              {formatPercentage(this.uptimePercent, 0)}% <small>激活</small>
            </span>
            <br />
            <TooltipElement
              content={`'激活'百分比考虑了繁盛激活的时间，而'有效'百分比则考虑了实际治疗到的玩家数量。`}
            >
              <span style={{ color: EFFLO_COLOR }}>
                {formatPercentage(this.weightedUptimePercent, 0)}% <small>有效</small>
              </span>
            </TooltipElement>
          </div>
          <div className="flex-main chart">
            <UptimeStackBar
              stackUptimeHistory={this._buildTargetsUptimes()}
              start={this.owner.fight.start_time}
              end={this.owner.fight.end_time}
              maxStacks={EFFLO_TARGETS}
              barColor={EFFLO_COLOR}
              backgroundHistory={this._mergeAndCapUptimes()}
              backgroundBarColor={EFFLO_BG_COLOR}
              timeTooltip
            />
          </div>
        </div>
      </div>
    );
  }
}

/**
 * 记录每次繁盛的启动和每次治疗tick。
 * 第一次tick在繁盛施放后一tick时间发生，最后一次tick大约发生在繁盛结束时，
 * 因此每个tick的时间段将从发生时间向前推延。
 */
type EffloTime = {
  /** 此事件发生的时间（毫秒） */
  timestamp: number;
  /** 此事件命中的目标数量（或0表示开始事件） */
  targets: number;
  /** 如果此事件表示繁盛的开始，则为 true */
  start?: boolean;
};

type StackTimePeriod = {
  /** 时间段开始的时间戳（毫秒） */
  start: number;
  /** 时间段结束的时间戳（毫秒） */
  end: number;
  /** 此时间段内存在的层数 */
  stacks: number;
};

export default Efflorescence;
