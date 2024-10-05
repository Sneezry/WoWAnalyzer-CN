import Analyzer, { SELECTED_PLAYER } from 'parser/core/Analyzer';
import { Options } from 'parser/core/Module';
import { TALENTS_DRUID } from 'common/TALENTS';
import Events, { HealEvent, RemoveBuffEvent } from 'parser/core/Events';
import { lifebloomSpell } from 'analysis/retail/druid/restoration/constants';
import SPELLS from 'common/SPELLS';
import { encodeEventTargetString } from 'parser/shared/modules/Enemies';
import { calculateEffectiveHealing } from 'parser/core/EventCalculateLib';
import Statistic from 'parser/ui/Statistic';
import STATISTIC_ORDER from 'parser/ui/STATISTIC_ORDER';
import STATISTIC_CATEGORY from 'parser/ui/STATISTIC_CATEGORY';
import TalentSpellText from 'parser/ui/TalentSpellText';
import ItemPercentHealingDone from 'parser/ui/ItemPercentHealingDone';

const DEBUG = false;

const HOT_BOOST_PER_RANK_PER_STACK = 0.03;
const MAX_STACKS = 15;
const BLOOM_BOOST_PER_RANK = 0.075;

/**
 * **萌芽叶片**
 * 专精天赋
 *
 * 生命绽放的治疗效果每次治疗都会提高(3 / 6)%，最多提高至(45 / 90)%。
 * 同时增加生命绽放最后绽放的治疗效果(7.5 / 15)%。
 * ------------------------------------
 * TODO 在正式服中似乎有问题，目前的上限是37/75% - 如果修复了这个问题，请移除此注释并根据情况修改数值
 */
export default class BuddingLeaves extends Analyzer {
  ranks: number;

  /** 记录每个目标的生命绽放增益层数 */
  stacksByTarget: Map<string, number> = new Map<string, number>();

  /** 由该天赋导致的总治疗量 */
  totalHealing: number = 0;

  constructor(options: Options) {
    super(options);

    this.ranks = this.selectedCombatant.getTalentRank(TALENTS_DRUID.BUDDING_LEAVES_TALENT);
    this.active = this.ranks > 0;

    // 确认刷新不重置堆叠，因此不需要监听刷新事件
    this.addEventListener(
      Events.removebuff.by(SELECTED_PLAYER).spell(lifebloomSpell(this.selectedCombatant)),
      this.onLbRemove,
    );
    this.addEventListener(
      Events.heal.by(SELECTED_PLAYER).spell(lifebloomSpell(this.selectedCombatant)),
      this.onLbHotHeal,
    );
    this.addEventListener(
      Events.heal.by(SELECTED_PLAYER).spell(SPELLS.LIFEBLOOM_BLOOM_HEAL),
      this.onLbBloomHeal,
    );
  }

  onLbRemove(event: RemoveBuffEvent) {
    // 当生命绽放效果消失时，重置堆叠
    DEBUG && console.log(`萌芽叶片堆叠从 ${this.owner.getTargetName(event)} 重置`);
    this.stacksByTarget.set(encodeEventTargetString(event) || '', 0);
  }

  onLbHotHeal(event: HealEvent) {
    // 根据目标的当前堆叠计算当前治疗量的增益
    const currStacks = this.stacksByTarget.get(encodeEventTargetString(event) || '') || 0;
    DEBUG &&
      console.log(
        `萌芽叶片在 ${this.owner.getTargetName(event)} 上的 ${currStacks} 层堆叠进行治疗`,
      );
    this.totalHealing += calculateEffectiveHealing(
      event,
      currStacks * this.ranks * HOT_BOOST_PER_RANK_PER_STACK,
    );

    // 增加堆叠（达到上限为止）
    const newStacks = Math.min(MAX_STACKS, currStacks + 1);
    this.stacksByTarget.set(encodeEventTargetString(event) || '', newStacks);
  }

  onLbBloomHeal(event: HealEvent) {
    DEBUG && console.log(`萌芽叶片在 ${this.owner.getTargetName(event)} 上绽放治疗`);
    this.totalHealing += calculateEffectiveHealing(event, this.ranks * BLOOM_BOOST_PER_RANK);
  }

  statistic() {
    return (
      <Statistic
        size="flexible"
        position={STATISTIC_ORDER.OPTIONAL(9)} // 基于天赋层数的编号
        category={STATISTIC_CATEGORY.TALENTS}
      >
        <TalentSpellText talent={TALENTS_DRUID.BUDDING_LEAVES_TALENT}>
          <ItemPercentHealingDone amount={this.totalHealing} />
        </TalentSpellText>
      </Statistic>
    );
  }
}
