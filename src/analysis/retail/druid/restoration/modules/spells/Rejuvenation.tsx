import SPELLS from 'common/SPELLS';
import { SpellIcon } from 'interface';
import { SpellLink } from 'interface';
import Analyzer, { Options, SELECTED_PLAYER } from 'parser/core/Analyzer';
import Events, {
  ApplyBuffEvent,
  ApplyBuffStackEvent,
  HealEvent,
  RefreshBuffEvent,
  RemoveBuffEvent,
} from 'parser/core/Events';
import Combatants from 'parser/shared/modules/Combatants';
import HealingValue from 'parser/shared/modules/HealingValue';
import { RefreshInfo } from 'parser/shared/modules/HotTracker';
import HealingDone from 'parser/shared/modules/throughput/HealingDone';
import BoringValue from 'parser/ui/BoringValueText';
import Statistic from 'parser/ui/Statistic';
import STATISTIC_ORDER from 'parser/ui/STATISTIC_ORDER';

import { isFromHardcast } from 'analysis/retail/druid/restoration/normalizers/CastLinkNormalizer';
import HotTrackerRestoDruid from 'analysis/retail/druid/restoration/modules/core/hottracking/HotTrackerRestoDruid';
import Mastery from 'analysis/retail/druid/restoration/modules/core/Mastery';
import GradiatedPerformanceBar from 'interface/guide/components/GradiatedPerformanceBar';
import { explanationAndDataSubsection } from 'interface/guide/components/ExplanationRow';
import { GUIDE_CORE_EXPLANATION_PERCENT } from 'analysis/retail/druid/restoration/Guide';

const debug = false;

const OVERHEAL_THRESHOLD = 0.75;

/** 跟踪有关恢复的使用情况 */
class Rejuvenation extends Analyzer {
  static dependencies = {
    healingDone: HealingDone,
    mastery: Mastery,
    combatants: Combatants,
    hotTracker: HotTrackerRestoDruid,
  };

  protected healingDone!: HealingDone;
  protected mastery!: Mastery;
  protected combatants!: Combatants;
  protected hotTracker!: HotTrackerRestoDruid;

  /** 当前活跃的硬投恢复的治疗统计，以 targetID 索引 */
  activeHardcastRejuvs: { [key: number]: HealingValue } = {};
  /** 检查是否已在 HotTracker 中注册刷新回调的锁 */
  hasCallbackRegistered: boolean = false;

  /** 总共施放的恢复次数 */
  totalRejuvsCasts = 0;
  /** 刷新时剪裁持续时间的硬投恢复次数 */
  earlyRefreshments = 0;
  /** 未剪裁但在活跃时造成高过量治疗的硬投恢复次数 */
  highOverhealCasts = 0;
  /** 剪裁的总持续时间，单位：毫秒 */
  timeLost = 0;

  constructor(options: Options) {
    super(options);

    this.addEventListener(
      Events.applybuff
        .by(SELECTED_PLAYER)
        .spell([SPELLS.REJUVENATION, SPELLS.REJUVENATION_GERMINATION]),
      this.onRejuvApply,
    );
    this.addEventListener(
      Events.removebuff
        .by(SELECTED_PLAYER)
        .spell([SPELLS.REJUVENATION, SPELLS.REJUVENATION_GERMINATION]),
      this.onRejuvRemove,
    );
    this.addEventListener(
      Events.heal.by(SELECTED_PLAYER).spell([SPELLS.REJUVENATION, SPELLS.REJUVENATION_GERMINATION]),
      this.onRejuvHeal,
    );
    debug && this.addEventListener(Events.fightend, this.onFightEnd);
  }

  onRejuvApply(event: ApplyBuffEvent) {
    if (!this.hasCallbackRegistered) {
      this.hotTracker.addRefreshHook(SPELLS.REJUVENATION.id, this.onRejuvRefresh.bind(this));
      this.hotTracker.addRefreshHook(
        SPELLS.REJUVENATION_GERMINATION.id,
        this.onRejuvRefresh.bind(this),
      );
      this.hasCallbackRegistered = true;
    }
    if (isFromHardcast(event)) {
      this.totalRejuvsCasts += 1;
      this.activeHardcastRejuvs[event.targetID] = new HealingValue();
    }
  }

  onRejuvRefresh(event: RefreshBuffEvent | ApplyBuffStackEvent, info: RefreshInfo) {
    // 关闭现有活跃的恢复跟踪器
    if (this.activeHardcastRejuvs[event.targetID]) {
      this._handleFinishedRejuv(this.activeHardcastRejuvs[event.targetID]);
      delete this.activeHardcastRejuvs[event.targetID];
    }

    // 热追踪器钩子事件可以是刷新或应用堆叠，但在这种情况下我们知道它将是刷新
    if (isFromHardcast(event as RefreshBuffEvent)) {
      this.totalRejuvsCasts += 1;
      if (info.clipped > 0) {
        this.earlyRefreshments += 1;
        this.timeLost += info.clipped;
        debug &&
          console.log(
            `恢复硬投被剪裁 @ ${this.owner.formatTimestamp(
              event.timestamp,
            )} - 剩余: ${info.oldRemaining.toFixed(0)}, 剪裁: ${info.clipped.toFixed(0)}`,
          );
      } else {
        // 我们只跟踪未剪裁旧效果的硬投恢复，因此我们不会在最终统计中重复计算
        this.activeHardcastRejuvs[event.targetID] = new HealingValue();
      }
    }
  }

  onRejuvRemove(event: RemoveBuffEvent) {
    // 关闭活跃的恢复跟踪器
    if (this.activeHardcastRejuvs[event.targetID]) {
      this._handleFinishedRejuv(this.activeHardcastRejuvs[event.targetID]);
      delete this.activeHardcastRejuvs[event.targetID];
    }
  }

  onRejuvHeal(event: HealEvent) {
    if (this.activeHardcastRejuvs[event.targetID]) {
      this.activeHardcastRejuvs[event.targetID] = this.activeHardcastRejuvs[event.targetID].add(
        event.amount,
        event.absorbed,
        event.overheal,
      );
    }
  }

  _handleFinishedRejuv(val: HealingValue) {
    if (val.raw > 0) {
      const percentOverheal = val.overheal / val.raw;
      if (percentOverheal >= OVERHEAL_THRESHOLD) {
        this.highOverhealCasts += 1;
      }
    }
  }

  onFightEnd() {
    debug && console.log('总施放次数: ' + this.totalRejuvsCasts);
    debug && console.log('提前刷新次数: ' + this.earlyRefreshments);
    debug && console.log('高过量治疗次数: ' + this.highOverhealCasts);
    debug && console.log('时间损失: ' + this.timeLost);
  }

  get timeLostPerMinute() {
    return this.timeLost / (this.owner.fightDuration / 1000 / 60);
  }

  get timeLostInSeconds() {
    return this.timeLost / 1000;
  }

  get timeLostInSecondsPerMinute() {
    return this.timeLostPerMinute / 1000;
  }

  get earlyRefreshmentsPerMinute() {
    return this.earlyRefreshments / (this.owner.fightDuration / 1000 / 60);
  }

  get goodRejuvs() {
    return this.totalRejuvsCasts - this.earlyRefreshments - this.highOverhealCasts;
  }

  get avgRejuvHealing() {
    const totalRejuvHealing = this.mastery.getMultiMasteryHealing([
      SPELLS.REJUVENATION.id,
      SPELLS.REJUVENATION_GERMINATION.id,
    ]);
    return totalRejuvHealing / this.totalRejuvsCasts;
  }

  /** 指导小节描述恢复的正确用法 */
  get guideSubsection(): JSX.Element {
    const explanation = (
      <>
        <p>
          <b>
            <SpellLink spell={SPELLS.REJUVENATION} />
          </b>{' '}
          是你的主要填充法术。它可以用于受伤的团队成员，或在即将到来的团队伤害之前对满血的团队成员进行预施法。不要随意施放——这样你会耗尽法力。
        </p>
        <p>
          不要覆盖最近施放过恢复的目标——这样你会剪裁持续时间。有些高过量治疗的恢复是不可避免的，可能是由于抢治疗，但如果大部分都是这样，你可能施放过多。
        </p>
      </>
    );

    const goodRejuvs = {
      count: this.goodRejuvs,
      label: '良好的恢复',
    };
    const highOverhealRejuvs = {
      count: this.highOverhealCasts,
      label: '高过量治疗的恢复',
    };
    const clippedRejuvs = {
      count: this.earlyRefreshments,
      label: '剪裁持续时间的恢复',
    };
    const data = (
      <div>
        <strong>恢复施放分解</strong>
        <small>
          {' '}
          -
          绿色表示良好施放，黄色表示高过量治疗施放，红色表示剪裁持续时间的提前刷新。鼠标悬停以获取更多细节。
        </small>
        <GradiatedPerformanceBar good={goodRejuvs} ok={highOverhealRejuvs} bad={clippedRejuvs} />
      </div>
    );

    return explanationAndDataSubsection(explanation, data, GUIDE_CORE_EXPLANATION_PERCENT);
  }

  statistic() {
    return (
      <Statistic
        position={STATISTIC_ORDER.CORE(18)} // 选择用于一般统计的固定顺序
        size="flexible"
        tooltip={
          <>
            你提前刷新了恢复<strong>{this.earlyRefreshments} 次</strong>，损失了总共
            <strong>{this.timeLostInSeconds.toFixed(1)}秒</strong>的 HoT 持续时间 (
            {this.timeLostInSecondsPerMinute.toFixed(1)}秒每分钟)。
          </>
        }
      >
        <BoringValue
          label={
            <>
              <SpellIcon spell={SPELLS.REJUVENATION} /> 提前恢复刷新
            </>
          }
        >
          <>
            {this.earlyRefreshmentsPerMinute.toFixed(1)} <small>每分钟</small>
          </>
        </BoringValue>
      </Statistic>
    );
  }
}

export default Rejuvenation;
