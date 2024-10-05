import Analyzer, { SELECTED_PLAYER } from 'parser/core/Analyzer';
import HotTrackerRestoDruid from 'analysis/retail/druid/restoration/modules/core/hottracking/HotTrackerRestoDruid';
import HotTracker, { Attribution } from 'parser/shared/modules/HotTracker';
import { Options } from 'parser/core/Module';
import Events, { ApplyBuffEvent, HealEvent, RefreshBuffEvent } from 'parser/core/Events';
import { REJUVENATION_BUFFS } from 'analysis/retail/druid/restoration/constants';
import { TALENTS_DRUID } from 'common/TALENTS';
import Statistic from 'parser/ui/Statistic';
import STATISTIC_ORDER from 'parser/ui/STATISTIC_ORDER';
import STATISTIC_CATEGORY from 'parser/ui/STATISTIC_CATEGORY';
import BoringSpellValueText from 'parser/ui/BoringSpellValueText';
import ItemPercentHealingDone from 'parser/ui/ItemPercentHealingDone';
import { SpellLink } from 'interface';

const EXTENSION_AMOUNT = 2_000;
const REJUV_MAX = 30_000;
const MAX_PROCS = 2;

/**
 * **滋养休眠**
 * 专精天赋
 *
 * 当你的回春术为满血目标治疗时，其持续时间延长2秒，每次施法最多延长4秒。
 * 持续时间不能超过30秒。
 */
class NurturingDormancy extends Analyzer {
  static dependencies = {
    hotTracker: HotTrackerRestoDruid,
  };

  protected hotTracker!: HotTrackerRestoDruid;

  attribution: Attribution = HotTracker.getNewAttribution('Nurturing Dormancy');
  /** 追踪每个目标和法术ID的滋养休眠触发次数 */
  procsFromCastMap: { [targetId: number]: { [spellId: number]: { procs: number } } } = {};

  constructor(options: Options) {
    super(options);

    this.active = this.selectedCombatant.hasTalent(TALENTS_DRUID.NURTURING_DORMANCY_TALENT);

    this.addEventListener(
      Events.heal.by(SELECTED_PLAYER).spell(REJUVENATION_BUFFS),
      this.onRejuvHeal,
    );
    this.addEventListener(
      Events.applybuff.by(SELECTED_PLAYER).spell(REJUVENATION_BUFFS),
      this.onRejuvApply,
    );
    this.addEventListener(
      Events.refreshbuff.by(SELECTED_PLAYER).spell(REJUVENATION_BUFFS),
      this.onRejuvApply,
    );
  }

  onRejuvHeal(event: HealEvent) {
    if (event.amount === 0 && event.overheal) {
      const procsEntry = this._getEntry(event);
      if (procsEntry.procs < MAX_PROCS) {
        // '不能延长超过30秒' 只适用于此天赋 - 其他效果可以推到30秒以上
        let timeRemainingOnRejuv = 0; // 如果无法获取回春术的持续时间，假设没有上限
        if (
          this.hotTracker.hots[event.targetID] &&
          this.hotTracker.hots[event.targetID][event.ability.guid]
        ) {
          timeRemainingOnRejuv =
            this.hotTracker.hots[event.targetID][event.ability.guid].end - event.timestamp;
        }
        // 如果不超过上限则延长全部时间，已经超过上限则不延长，如果刚好达到上限则延长部分时间
        const extensionAmount = Math.max(
          Math.min(EXTENSION_AMOUNT, REJUV_MAX - timeRemainingOnRejuv),
          0,
        );
        if (extensionAmount > 0) {
          this.hotTracker.addExtension(
            this.attribution,
            extensionAmount,
            event.targetID,
            event.ability.guid,
          );
        }
        // 即使由于上限没有延长，依然消耗一次触发机会
        procsEntry.procs += 1;
      }
    }
  }

  onRejuvApply(event: ApplyBuffEvent | RefreshBuffEvent) {
    this._getEntry(event).procs = 0;
  }

  /** 初始化并返回此事件的触发追踪对象 */
  _getEntry(event: ApplyBuffEvent | RefreshBuffEvent | HealEvent): { procs: number } {
    if (!this.procsFromCastMap[event.targetID]) {
      this.procsFromCastMap[event.targetID] = {};
    }
    if (!this.procsFromCastMap[event.targetID][event.ability.guid]) {
      this.procsFromCastMap[event.targetID][event.ability.guid] = { procs: 0 };
    }
    return this.procsFromCastMap[event.targetID][event.ability.guid];
  }

  statistic() {
    return (
      <Statistic
        position={STATISTIC_ORDER.OPTIONAL(9)} // 依据天赋行的位置
        size="flexible"
        category={STATISTIC_CATEGORY.TALENTS}
        tooltip={
          <>
            这是由于 <SpellLink spell={TALENTS_DRUID.NURTURING_DORMANCY_TALENT} />{' '}
            回春术延长造成的治疗量。在整个战斗过程中，回春术总共延长了{' '}
            <strong>{(this.attribution.totalExtension / 1000).toFixed(1)}秒</strong>。
          </>
        }
      >
        <BoringSpellValueText spell={TALENTS_DRUID.NURTURING_DORMANCY_TALENT}>
          <ItemPercentHealingDone amount={this.attribution.healing} />
          <br />
        </BoringSpellValueText>
      </Statistic>
    );
  }
}

export default NurturingDormancy;
