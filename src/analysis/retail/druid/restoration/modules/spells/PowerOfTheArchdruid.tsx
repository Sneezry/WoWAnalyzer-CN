import { formatNth, formatPercentage } from 'common/format';
import SPELLS from 'common/SPELLS';
import Analyzer, { Options, SELECTED_PLAYER } from 'parser/core/Analyzer';
import Events, { ApplyBuffEvent, CastEvent, RefreshBuffEvent } from 'parser/core/Events';
import { binomialCDF } from 'parser/shared/modules/helpers/Probability';
import BoringSpellValueText from 'parser/ui/BoringSpellValueText';
import ItemPercentHealingDone from 'parser/ui/ItemPercentHealingDone';
import Statistic from 'parser/ui/Statistic';
import STATISTIC_CATEGORY from 'parser/ui/STATISTIC_CATEGORY';
import STATISTIC_ORDER from 'parser/ui/STATISTIC_ORDER';

import HotAttributor from 'analysis/retail/druid/restoration/modules/core/hottracking/HotAttributor';
import { TALENTS_DRUID } from 'common/TALENTS';
import { SpellLink } from 'interface';

const PROC_PROB = 0.6;

/**
 * **大德鲁伊之力**
 * 专精天赋 第10层
 *
 * 野性成长有40%的几率使你的下一个回春术或愈合对目标20码范围内的两个额外盟友生效。
 */
class PowerOfTheArchdruid extends Analyzer {
  static dependencies = {
    hotAttributor: HotAttributor,
  };

  hotAttributor!: HotAttributor;

  wgCasts = 0; // 野性成长施法次数
  procs = 0; // 触发次数

  constructor(options: Options) {
    super(options);
    this.active = this.selectedCombatant.hasTalent(TALENTS_DRUID.POWER_OF_THE_ARCHDRUID_TALENT);

    this.addEventListener(
      Events.cast.by(SELECTED_PLAYER).spell(SPELLS.WILD_GROWTH),
      this.onCastWildGrowth,
    );
    this.addEventListener(
      Events.applybuff.by(SELECTED_PLAYER).spell(SPELLS.POWER_OF_THE_ARCHDRUID),
      this.onApply,
    );
    this.addEventListener(
      Events.refreshbuff.by(SELECTED_PLAYER).spell(SPELLS.POWER_OF_THE_ARCHDRUID),
      this.onApply,
    );
  }

  onCastWildGrowth(event: CastEvent) {
    this.wgCasts += 1;
  }

  onApply(event: ApplyBuffEvent | RefreshBuffEvent) {
    if (!event.prepull) {
      this.procs += 1;
    }
  }

  get procRate() {
    return this.wgCasts === 0 ? 0 : this.procs / this.wgCasts;
  }

  get procRatePercentile() {
    return binomialCDF(this.procs, this.wgCasts, PROC_PROB);
  }

  get rejuvsCreated() {
    return this.hotAttributor.powerOfTheArchdruidRejuvAttrib.procs;
  }

  get regrowthsCreated() {
    return this.hotAttributor.powerOfTheArchdruidRegrowthAttrib.procs;
  }

  get rejuvProcHealing() {
    return this.hotAttributor.powerOfTheArchdruidRejuvAttrib.healing;
  }

  get regrowthProcHealing() {
    return this.hotAttributor.powerOfTheArchdruidRegrowthAttrib.healing;
  }

  get totalHealing() {
    return this.rejuvProcHealing + this.regrowthProcHealing;
  }

  statistic() {
    return (
      <Statistic
        position={STATISTIC_ORDER.OPTIONAL(10)} // 根据天赋行位置
        size="flexible"
        category={STATISTIC_CATEGORY.TALENTS}
        tooltip={
          <>
            这是由大德鲁伊之力天赋触发的回春术和愈合造成的治疗量，包括专精加成：
            <ul>
              <li>
                生成了 <strong>{this.rejuvsCreated}</strong> 个{' '}
                <SpellLink spell={SPELLS.REJUVENATION} /> 持续治疗，总治疗量为{' '}
                <strong>{this.owner.formatItemHealingDone(this.rejuvProcHealing)}</strong>
              </li>
              <li>
                生成了 <strong>{this.regrowthsCreated}</strong> 个{' '}
                <SpellLink spell={SPELLS.REGROWTH} /> 持续治疗和直接治疗，总治疗量为{' '}
                <strong>{this.owner.formatItemHealingDone(this.regrowthProcHealing)}</strong>
              </li>
            </ul>
            <br />
            你总共获得了 <strong>{this.procs}</strong> 次触发，基于 <strong>{this.wgCasts}</strong>{' '}
            次施放， 触发率为 <strong>{formatPercentage(this.procRate, 1)}%</strong>。这是一个{' '}
            <strong>
              {formatNth(Number(formatPercentage(this.procRatePercentile, 0)))} 百分位
            </strong>{' '}
            的结果。
          </>
        }
      >
        <BoringSpellValueText spell={TALENTS_DRUID.POWER_OF_THE_ARCHDRUID_TALENT}>
          <ItemPercentHealingDone amount={this.totalHealing} />
        </BoringSpellValueText>
      </Statistic>
    );
  }
}

export default PowerOfTheArchdruid;
