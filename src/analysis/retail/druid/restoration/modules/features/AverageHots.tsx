import SPELLS from 'common/SPELLS';
import { SpellIcon } from 'interface';
import Analyzer from 'parser/core/Analyzer';
import BoringValue from 'parser/ui/BoringValueText';
import Statistic from 'parser/ui/Statistic';
import STATISTIC_ORDER from 'parser/ui/STATISTIC_ORDER';

import Mastery from '../core/Mastery';

class AverageHots extends Analyzer {
  static dependencies = {
    mastery: Mastery,
  };

  protected mastery!: Mastery;

  statistic() {
    const avgTotalHots = this.mastery.getAverageTotalMasteryStacks().toFixed(2);
    const avgDruidHots = this.mastery.getAverageDruidSpellMasteryStacks().toFixed(2);

    console.log(`总治疗量: ${this.mastery.totalNoMasteryHealing}`);
    console.log(`受精通影响的总治疗量: ${this.mastery.druidSpellNoMasteryHealing}`);

    return (
      <Statistic
        position={STATISTIC_ORDER.CORE(11)}
        size="flexible"
        tooltip={
          <>
            <p>这是你的治疗技能受益于精通效果的平均层数，按治疗量加权。</p>
            <p>
              这个数值不应被视为表现指标，而是天赋选择和治疗方式的体现。天赋如“栽培”或“春暖花开”会增加此数值，而在大型团队中施法通常会减少此数值。
            </p>
            <p>
              此数值包括了你的所有治疗效果，甚至那些不受精通影响的治疗（如饰品、药水、萌芽复苏等）。仅计算受精通影响的治疗时，你的精通平均层数为{' '}
              <strong>{avgDruidHots}</strong>。
            </p>
          </>
        }
      >
        <BoringValue
          label={
            <>
              <SpellIcon spell={SPELLS.MASTERY_HARMONY} /> 平均精通层数
            </>
          }
        >
          <>{avgTotalHots}</>
        </BoringValue>
      </Statistic>
    );
  }
}

export default AverageHots;
