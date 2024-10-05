import Analyzer, { Options, SELECTED_PLAYER } from 'parser/core/Analyzer';
import BoringSpellValueText from 'parser/ui/BoringSpellValueText';
import ItemPercentHealingDone from 'parser/ui/ItemPercentHealingDone';
import Statistic from 'parser/ui/Statistic';
import STATISTIC_CATEGORY from 'parser/ui/STATISTIC_CATEGORY';
import STATISTIC_ORDER from 'parser/ui/STATISTIC_ORDER';

import { TALENTS_DRUID } from 'common/TALENTS';
import GroveGuardians from 'analysis/retail/druid/restoration/modules/spells/GroveGuardians';
import { SpellIcon } from 'interface';
import Events, {
  EventType,
  SummonEvent,
  UpdateSpellUsableEvent,
  UpdateSpellUsableType,
} from 'parser/core/Events';
import SpellUsable from 'parser/shared/modules/SpellUsable';
import EventFilter from 'parser/core/EventFilter';

const TOL_CDR_MS = 5000;

const deps = {
  groveGuardians: GroveGuardians,
  spellUsable: SpellUsable,
};

/**
 * **塞纳留斯的指引（树形态）**
 * 专精天赋 第九层
 *
 * 在化身：生命之树期间，你每10秒召唤一个丛林守护者。
 * 当丛林守护者消失时，化身：生命之树的冷却时间减少5秒。
 */
export default class CenariusGuidanceTol extends Analyzer.withDependencies(deps) {
  /** 当前树形态冷却中应用的冷却缩减 */
  cdrOnCurrCast: number = 0;
  /** 之前树形态冷却中应用的冷却缩减 */
  cdrPerCast: number[] = [];

  constructor(options: Options) {
    super(options);
    this.active =
      this.selectedCombatant.hasTalent(TALENTS_DRUID.CENARIUS_GUIDANCE_TALENT) &&
      this.selectedCombatant.hasTalent(TALENTS_DRUID.INCARNATION_TREE_OF_LIFE_TALENT);

    // TODO 这是一个占位符，直到我们可以正确地触发GG死亡事件
    this.addEventListener(
      Events.summon.by(SELECTED_PLAYER).spell(TALENTS_DRUID.GROVE_GUARDIANS_TALENT),
      this.onGGSummon,
    );
    this.addEventListener(
      new EventFilter(EventType.UpdateSpellUsable)
        .by(SELECTED_PLAYER)
        .spell(TALENTS_DRUID.INCARNATION_TREE_OF_LIFE_TALENT),
      this.onTolCdUpdate,
    );
  }

  onGGSummon(event: SummonEvent) {
    this.cdrOnCurrCast += this.deps.spellUsable.reduceCooldown(
      TALENTS_DRUID.INCARNATION_TREE_OF_LIFE_TALENT.id,
      TOL_CDR_MS,
    );
  }

  onTolCdUpdate(event: UpdateSpellUsableEvent) {
    if (
      event.updateType === UpdateSpellUsableType.EndCooldown &&
      this.owner.currentTimestamp < this.owner.fight.end_time
    ) {
      this.cdrPerCast.push(this.cdrOnCurrCast);
      this.cdrOnCurrCast = 0;
    }
  }

  get tolCdrPerCast() {
    return this.cdrPerCast.length === 0
      ? undefined
      : this.cdrPerCast.reduce((p, c) => p + c, 0) / this.cdrPerCast.length;
  }

  statistic() {
    const avgCdr = this.tolCdrPerCast;
    return (
      <Statistic
        position={STATISTIC_ORDER.OPTIONAL(9)} // 基于天赋层数的编号
        category={STATISTIC_CATEGORY.TALENTS}
        size="flexible"
        tooltip={
          <>
            <p>
              这是由该天赋效果召唤的丛林守护者造成的治疗量。治疗量不包括冷却缩减效果的额外收益。
            </p>
            <p>
              每次施放的平均冷却缩减表示你减少化身：生命之树冷却时间的平均量。{' '}
              <strong>它仅计算在所选战斗中完成的冷却时间。</strong>
              {avgCdr === undefined && (
                <strong> 显示为'N/A'是因为在战斗中没有完成的化身：生命之树冷却时间。</strong>
              )}
            </p>
            <p>
              <strong>由于追踪丛林守护者死亡事件的困难，冷却缩减仅为近似值。</strong>
            </p>
          </>
        }
      >
        <BoringSpellValueText spell={TALENTS_DRUID.CENARIUS_GUIDANCE_TALENT}>
          <SpellIcon spell={TALENTS_DRUID.GROVE_GUARDIANS_TALENT} />{' '}
          <ItemPercentHealingDone amount={this.deps.groveGuardians.cgHealing} />
          <br />
          <>
            <SpellIcon spell={TALENTS_DRUID.INCARNATION_TREE_OF_LIFE_TALENT} />{' '}
            {avgCdr === undefined ? 'N/A' : `≈${(avgCdr / 1000).toFixed(1)}秒`}{' '}
            <small>每次施放的冷却缩减</small>
          </>
        </BoringSpellValueText>
      </Statistic>
    );
  }
}
