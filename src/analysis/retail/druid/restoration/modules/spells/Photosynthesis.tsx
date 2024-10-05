import { formatPercentage } from 'common/format';
import SPELLS from 'common/SPELLS';
import Analyzer, { SELECTED_PLAYER } from 'parser/core/Analyzer';
import { calculateEffectiveHealing } from 'parser/core/EventCalculateLib';
import Events, { HealEvent } from 'parser/core/Events';
import { Options } from 'parser/core/Module';
import Combatants from 'parser/shared/modules/Combatants';
import BoringSpellValueText from 'parser/ui/BoringSpellValueText';
import ItemPercentHealingDone from 'parser/ui/ItemPercentHealingDone';
import Statistic from 'parser/ui/Statistic';
import STATISTIC_CATEGORY from 'parser/ui/STATISTIC_CATEGORY';
import STATISTIC_ORDER from 'parser/ui/STATISTIC_ORDER';

import { PHOTO_INCREASED_RATE } from 'analysis/retail/druid/restoration/constants';
import { isFromExpiringLifebloom } from 'analysis/retail/druid/restoration/normalizers/CastLinkNormalizer';
import Lifebloom from 'analysis/retail/druid/restoration/modules/spells/Lifebloom';
import { TALENTS_DRUID } from 'common/TALENTS';

const PHOTOSYNTHESIS_HOT_INCREASE = 0.1;
// 春暖花开触发两次，由Bastas确认
const PHOTOSYNTHESIS_SB_INCREASE = 0.21; //

/**
 * **光合作用**
 * 专精天赋 第10层
 *
 * 当你的生命绽放在你自己身上时，你的周期性治疗效果速度提升10%。
 * 当你的生命绽放在盟友身上时，他们的周期性治疗效果有5%的几率触发绽放效果。
 */
class Photosynthesis extends Analyzer {
  static dependencies = {
    combatants: Combatants,
    lifebloom: Lifebloom,
  };

  protected combatants!: Combatants;
  protected lifebloom!: Lifebloom;

  /** 随机触发的绽放总治疗量 */
  extraBloomHealing = 0;
  /** 由于生命绽放在自己身上而加速的持续治疗总量 */
  increasedRateHealing = 0;
  /** 随机绽放次数 */
  randomProccs = 0;

  constructor(options: Options) {
    super(options);

    this.active = this.selectedCombatant.hasTalent(TALENTS_DRUID.PHOTOSYNTHESIS_TALENT);

    this.addEventListener(
      Events.heal.by(SELECTED_PLAYER).spell(PHOTO_INCREASED_RATE),
      this.onHastedHeal,
    );
    this.addEventListener(
      Events.heal.by(SELECTED_PLAYER).spell(SPELLS.LIFEBLOOM_BLOOM_HEAL),
      this.onLifebloomProc,
    );
  }

  onLifebloomProc(event: HealEvent) {
    if (!isFromExpiringLifebloom(event)) {
      this.randomProccs += 1;
      this.extraBloomHealing += event.amount + (event.absorbed || 0);
    }
  }

  onHastedHeal(event: HealEvent) {
    if (
      this.selectedCombatant.hasBuff(
        SPELLS.LIFEBLOOM_HOT_HEAL.id,
        null,
        0,
        0,
        this.selectedCombatant.id,
      ) ||
      this.selectedCombatant.hasBuff(
        SPELLS.LIFEBLOOM_UNDERGROWTH_HOT_HEAL.id,
        null,
        0,
        0,
        this.selectedCombatant.id,
      )
    ) {
      const spellId = event.ability.guid;
      if (spellId === SPELLS.REGROWTH.id && !event.tick) {
        return; // 不计算愈合的直接治疗
      }
      const increase =
        spellId === SPELLS.SPRING_BLOSSOMS.id
          ? PHOTOSYNTHESIS_SB_INCREASE
          : PHOTOSYNTHESIS_HOT_INCREASE;
      this.increasedRateHealing += calculateEffectiveHealing(event, increase);
    }
  }

  get totalHealing(): number {
    return this.extraBloomHealing + this.increasedRateHealing;
  }

  get percentHealing(): number {
    return this.owner.getPercentageOfTotalHealingDone(this.totalHealing);
  }

  statistic() {
    return (
      <Statistic
        position={STATISTIC_ORDER.OPTIONAL(10)} // 根据天赋行位置
        category={STATISTIC_CATEGORY.TALENTS}
        size="flexible"
        tooltip={
          <>
            你的生命绽放在他人身上激活了{' '}
            <strong>
              {formatPercentage(this.lifebloom.othersLifebloomUptime / this.owner.fightDuration)}%
            </strong>{' '}
            的时间：
            <ul>
              <li>
                <strong>{this.randomProccs}</strong> 次额外绽放
              </li>
              <li>
                <strong>
                  {formatPercentage(
                    this.owner.getPercentageOfTotalHealingDone(this.extraBloomHealing),
                  )}
                  %
                </strong>{' '}
                的总治疗来自额外的绽放
              </li>
            </ul>
            你的生命绽放在你自己身上激活了{' '}
            <strong>
              {formatPercentage(this.lifebloom.selfLifebloomUptime / this.owner.fightDuration)}%
            </strong>{' '}
            的时间：
            <ul>
              <li>
                <strong>
                  {formatPercentage(
                    this.owner.getPercentageOfTotalHealingDone(this.increasedRateHealing),
                  )}
                  %
                </strong>{' '}
                的总治疗来自加速的持续治疗效果
              </li>
            </ul>
          </>
        }
      >
        <BoringSpellValueText spell={TALENTS_DRUID.PHOTOSYNTHESIS_TALENT}>
          <ItemPercentHealingDone amount={this.totalHealing} />
          <br />
        </BoringSpellValueText>
      </Statistic>
    );
  }
}

export default Photosynthesis;
