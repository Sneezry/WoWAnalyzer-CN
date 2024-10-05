import { formatPercentage } from 'common/format';
import Analyzer from 'parser/core/Analyzer';
import { Options } from 'parser/core/Module';
import BoringSpellValueText from 'parser/ui/BoringSpellValueText';
import ItemPercentHealingDone from 'parser/ui/ItemPercentHealingDone';
import { SpellLink } from 'interface';
import Statistic from 'parser/ui/Statistic';
import STATISTIC_CATEGORY from 'parser/ui/STATISTIC_CATEGORY';
import STATISTIC_ORDER from 'parser/ui/STATISTIC_ORDER';

import TreeOfLife from 'analysis/retail/druid/restoration/modules/spells/TreeOfLife';
import { TALENTS_DRUID } from 'common/TALENTS';

/**
 * **重植术**
 * 专精天赋 第10层
 *
 * 每施放3次迅捷治愈，会使你获得化身：生命之树，持续10秒。
 */
class Reforestation extends Analyzer {
  static dependencies = {
    treeOfLife: TreeOfLife,
  };

  protected treeOfLife!: TreeOfLife;

  constructor(options: Options) {
    super(options);
    this.active = this.selectedCombatant.hasTalent(TALENTS_DRUID.REFORESTATION_TALENT);
  }

  statistic() {
    return (
      <Statistic
        position={STATISTIC_ORDER.OPTIONAL(10)} // 基于天赋层数的数字
        category={STATISTIC_CATEGORY.TALENTS}
        size="flexible"
        tooltip={
          <>
            这是由
            <SpellLink spell={TALENTS_DRUID.REFORESTATION_TALENT} />
            触发的生命之树造成的治疗量。治疗量为获得生命之树形态带来的所有增益之和，具体如下：
            <ul>
              <li>
                整体治疗量提升:{' '}
                <strong>
                  {formatPercentage(
                    this.owner.getPercentageOfTotalHealingDone(
                      this.treeOfLife.reforestation.allBoostHealing,
                    ),
                  )}
                  %
                </strong>
              </li>
              <li>
                回春术治疗量提升:{' '}
                <strong>
                  {formatPercentage(
                    this.owner.getPercentageOfTotalHealingDone(
                      this.treeOfLife.reforestation.rejuvBoostHealing,
                    ),
                  )}
                  %
                </strong>
              </li>
              <li>
                野性成长额外治疗:{' '}
                <strong>
                  {formatPercentage(
                    this.owner.getPercentageOfTotalHealingDone(
                      this.treeOfLife.reforestation.extraWgsAttribution.healing,
                    ),
                  )}
                  %
                </strong>
              </li>
            </ul>
          </>
        }
      >
        <BoringSpellValueText spell={TALENTS_DRUID.REFORESTATION_TALENT}>
          <ItemPercentHealingDone
            amount={this.treeOfLife._getTotalHealing(this.treeOfLife.reforestation)}
          />
          <br />
        </BoringSpellValueText>
      </Statistic>
    );
  }
}

export default Reforestation;
