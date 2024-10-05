import Analyzer, { SELECTED_PLAYER } from 'parser/core/Analyzer';
import { Options } from 'parser/core/Module';
import { TALENTS_DRUID } from 'common/TALENTS';
import Events, { CastEvent, DamageEvent, HealEvent } from 'parser/core/Events';
import SPELLS from 'common/SPELLS';
import STATISTIC_ORDER from 'parser/ui/STATISTIC_ORDER';
import STATISTIC_CATEGORY from 'parser/ui/STATISTIC_CATEGORY';
import { formatNumber, formatPercentage } from 'common/format';
import BoringSpellValueText from 'parser/ui/BoringSpellValueText';
import Statistic from 'parser/ui/Statistic';
import ItemDamageDone from 'parser/ui/ItemDamageDone';
import { SINGLE_TARGET_HEALING } from 'analysis/retail/druid/restoration/constants';
import { SpellLink } from 'interface';

// 专门为恢复德鲁伊设计的类，因为它将治疗转换为伤害，而不是反过来
/**
 * **自然的守护**
 * 天赋技能
 *
 * 所有单体治疗同时会对附近的敌方目标造成相当于治疗量20%的伤害。
 */
class NaturesVigil extends Analyzer {
  /** 每次施放的信息追踪器 */
  nvTracker: NaturesVigilCast[] = [];
  /** 追踪单体治疗对自然的守护造成的伤害贡献 */
  stHealingDuringNv: { [spellId: number]: { id: number; amount: number } } = {};

  constructor(options: Options) {
    super(options);

    this.active = this.selectedCombatant.hasTalent(TALENTS_DRUID.NATURES_VIGIL_TALENT);

    this.addEventListener(
      Events.cast.by(SELECTED_PLAYER).spell(TALENTS_DRUID.NATURES_VIGIL_TALENT),
      this.onNvCast,
    );
    this.addEventListener(
      Events.damage.by(SELECTED_PLAYER).spell(SPELLS.NATURES_VIGIL_DAMAGE),
      this.onNvDamage,
    );
    this.addEventListener(
      Events.heal.by(SELECTED_PLAYER).spell(SINGLE_TARGET_HEALING),
      this.onStHeal,
    );
  }

  onNvCast(event: CastEvent) {
    this.nvTracker.push({
      timestamp: event.timestamp,
      damage: 0,
    });
  }

  onNvDamage(event: DamageEvent) {
    const currTracker = this.nvTracker.at(-1);
    if (currTracker) {
      currTracker.damage += event.amount + (event.absorbed || 0);
    }
  }

  onStHeal(event: HealEvent) {
    if (this.selectedCombatant.hasBuff(TALENTS_DRUID.NATURES_VIGIL_TALENT.id)) {
      const spellId = event.ability.guid;
      const rawHealing = event.amount + (event.absorbed || 0) + (event.overheal || 0);
      const entry = this.stHealingDuringNv[spellId];
      if (entry) {
        entry.amount += rawHealing;
      } else {
        this.stHealingDuringNv[spellId] = { id: spellId, amount: rawHealing };
      }
    }
  }

  get totalDamage() {
    return this.nvTracker.reduce((acc, t) => acc + t.damage, 0);
  }

  statistic() {
    // 计算自然的守护对伤害的贡献
    const stHealingInDescendingOrder = Object.values(this.stHealingDuringNv).sort(
      (a, b) => b.amount - a.amount,
    );
    const totalAmount = stHealingInDescendingOrder.reduce((acc, a) => a.amount + acc, 0);
    const totalDps = (this.totalDamage / this.owner.fightDuration) * 1000;

    return (
      <Statistic
        size="flexible"
        position={STATISTIC_ORDER.OPTIONAL(0)} // 依据天赋行设置的位置
        category={STATISTIC_CATEGORY.TALENTS}
        tooltip={
          <>
            伤害贡献的明细：
            <ul>
              {stHealingInDescendingOrder.map((item) => {
                const itemPercent = item.amount / totalAmount;
                const itemDps = itemPercent * totalDps;
                return (
                  <li key={item.id}>
                    <SpellLink spell={item.id} /> - {formatNumber(itemDps)} DPS (
                    {formatPercentage(itemPercent, 1)}%)
                  </li>
                );
              })}
            </ul>
          </>
        }
        dropdown={
          <>
            <table className="table table-condensed">
              <thead>
                <tr>
                  <th>施法</th>
                  <th>时间戳</th>
                  <th>伤害</th>
                </tr>
              </thead>
              <tbody>
                {this.nvTracker.map((nv, index) => (
                  <tr key={index}>
                    <th scope="row">{index + 1}</th>
                    <td>{this.owner.formatTimestamp(nv.timestamp)}</td>
                    <td>{formatNumber(nv.damage)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        }
      >
        <BoringSpellValueText spell={TALENTS_DRUID.NATURES_VIGIL_TALENT}>
          <ItemDamageDone amount={this.totalDamage} />
          <br />
        </BoringSpellValueText>
      </Statistic>
    );
  }
}

export default NaturesVigil;

interface NaturesVigilCast {
  /** 施法的时间戳 */
  timestamp: number;
  /** 该次施法造成的伤害 */
  damage: number;
  // TODO 追踪治疗的贡献
}
