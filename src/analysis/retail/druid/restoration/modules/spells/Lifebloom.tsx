import { formatPercentage } from 'common/format';
import SPELLS from 'common/SPELLS';
import { SpellLink } from 'interface';
import Analyzer, { Options, SELECTED_PLAYER } from 'parser/core/Analyzer';
import Events, { ApplyBuffEvent, RefreshBuffEvent, RemoveBuffEvent } from 'parser/core/Events';
import { mergeTimePeriods, OpenTimePeriod } from 'parser/core/mergeTimePeriods';
import Combatants from 'parser/shared/modules/Combatants';
import uptimeBarSubStatistic, { SubPercentageStyle } from 'parser/ui/UptimeBarSubStatistic';
import { TALENTS_DRUID } from 'common/TALENTS';
import { LIFEBLOOM_BUFFS } from 'analysis/retail/druid/restoration/constants';
import { causedBloom } from 'analysis/retail/druid/restoration/normalizers/CastLinkNormalizer';
import { RoundedPanel } from 'interface/guide/components/GuideDivs';
import { explanationAndDataSubsection } from 'interface/guide/components/ExplanationRow';
import { GUIDE_CORE_EXPLANATION_PERCENT } from '../../Guide';

const LB_COLOR = '#00bb44';
const UNDERGROWTH_COLOR = '#dd5500';

/**
 * 生命绽放组件，用于跟踪该技能的使用情况和持续时间。
 * 包含天赋“茂密生长”的持续时间统计（允许同时存在两个生命绽放）。
 */
class Lifebloom extends Analyzer {
  static dependencies = {
    combatants: Combatants,
  };

  protected combatants!: Combatants;

  /** 玩家是否拥有“茂密生长”天赋 */
  hasUndergrowth = false;
  /** 玩家当前激活的生命绽放数量 */
  activeLifeblooms: number = 0;
  /** 至少有一个生命绽放激活时的时间段列表 */
  lifebloomUptimes: OpenTimePeriod[] = [];
  /** 激活了两个生命绽放时的时间段列表 */
  undergrowthUptimes: OpenTimePeriod[] = [];

  possibleNaturalBlooms: number = 0;
  actualNaturalBlooms: number = 0;

  constructor(options: Options) {
    super(options);
    this.hasUndergrowth = this.selectedCombatant.hasTalent(TALENTS_DRUID.UNDERGROWTH_TALENT);

    this.addEventListener(
      Events.applybuff.by(SELECTED_PLAYER).spell(LIFEBLOOM_BUFFS),
      this.onApplyLifebloom,
    );
    this.addEventListener(
      Events.removebuff.by(SELECTED_PLAYER).spell(LIFEBLOOM_BUFFS),
      this.onRemoveLifebloom,
    );
    this.addEventListener(
      Events.removebuff.by(SELECTED_PLAYER).spell(LIFEBLOOM_BUFFS),
      this.onPossibleBloomTrigger,
    );
    this.addEventListener(
      Events.refreshbuff.by(SELECTED_PLAYER).spell(LIFEBLOOM_BUFFS),
      this.onPossibleBloomTrigger,
    );
  }

  onApplyLifebloom(event: ApplyBuffEvent) {
    if (this.activeLifeblooms === 0) {
      // 激活第一个生命绽放
      this.lifebloomUptimes.push({ start: event.timestamp });
    } else if (this.activeLifeblooms === 1) {
      // 激活第二个生命绽放
      this.undergrowthUptimes.push({ start: event.timestamp });
    }
    this.activeLifeblooms += 1;
  }

  onRemoveLifebloom(event: RemoveBuffEvent) {
    if (this.activeLifeblooms === 1) {
      // 从1个生命绽放变为0个
      if (this.lifebloomUptimes.length > 0) {
        this.lifebloomUptimes[this.lifebloomUptimes.length - 1].end = event.timestamp;
      }
    } else if (this.activeLifeblooms === 2) {
      // 从2个生命绽放变为1个
      if (this.undergrowthUptimes.length > 0) {
        this.undergrowthUptimes[this.undergrowthUptimes.length - 1].end = event.timestamp;
      }
    }
    this.activeLifeblooms -= 1;
  }

  onPossibleBloomTrigger(event: RemoveBuffEvent | RefreshBuffEvent) {
    this.possibleNaturalBlooms += 1;
    if (causedBloom(event)) {
      this.actualNaturalBlooms += 1;
    }
  }

  /** 统计至少有一个生命绽放激活的时间 */
  get oneLifebloomUptime() {
    return this._getTotalUptime(this.lifebloomUptimes);
  }

  /** 统计有两个生命绽放激活的时间 */
  get twoLifebloomUptime() {
    return this._getTotalUptime(this.undergrowthUptimes);
  }

  _getTotalUptime(uptimes: OpenTimePeriod[]) {
    return uptimes.reduce(
      (acc, ut) => acc + (ut.end === undefined ? this.owner.currentTimestamp : ut.end) - ut.start,
      0,
    );
  }

  /** 生命绽放激活在玩家自身的时间 */
  get selfLifebloomUptime(): number {
    return (
      this.selectedCombatant.getBuffUptime(
        SPELLS.LIFEBLOOM_HOT_HEAL.id,
        this.selectedCombatant.id,
      ) +
      this.selectedCombatant.getBuffUptime(
        SPELLS.LIFEBLOOM_UNDERGROWTH_HOT_HEAL.id,
        this.selectedCombatant.id,
      )
    );
  }

  /** 生命绽放激活在其他玩家的时间 */
  get othersLifebloomUptime(): number {
    const summedTotalLifebloomUptime = Object.values(this.combatants.players).reduce(
      (uptime, player) =>
        uptime +
        player.getBuffUptime(SPELLS.LIFEBLOOM_HOT_HEAL.id, this.selectedCombatant.id) +
        player.getBuffUptime(SPELLS.LIFEBLOOM_UNDERGROWTH_HOT_HEAL.id, this.selectedCombatant.id),
      0,
    );
    return summedTotalLifebloomUptime - this.selfLifebloomUptime;
  }

  /** 显示关于生命绽放的指南部分 */
  get guideSubsection(): JSX.Element {
    const hasPhoto = this.selectedCombatant.hasTalent(TALENTS_DRUID.PHOTOSYNTHESIS_TALENT);
    const hasUndergrowth = this.selectedCombatant.hasTalent(TALENTS_DRUID.UNDERGROWTH_TALENT);
    const hasVerdancy = this.selectedCombatant.hasTalent(TALENTS_DRUID.VERDANCY_TALENT);
    const selfUptimePercent = this.selfLifebloomUptime / this.owner.fightDuration;
    const othersUptimePercent = this.othersLifebloomUptime / this.owner.fightDuration;

    const explanation = (
      <>
        <p>
          <b>
            <SpellLink spell={SPELLS.LIFEBLOOM_HOT_HEAL} />
          </b>{' '}
          最多可同时激活 {hasUndergrowth ? '两个目标' : '一个目标'}{' '}
          {hasUndergrowth && (
            <>
              （由于 <SpellLink spell={TALENTS_DRUID.UNDERGROWTH_TALENT} /> 天赋）
            </>
          )}
          。生命绽放与回春术类似，具有良好的持续治疗量，还会产生{' '}
          <SpellLink spell={SPELLS.CLEARCASTING_BUFF} />{' '}
          触发效果，对法力效率有很大帮助。你应该努力保持生命绽放的100%激活时间。
        </p>
        {hasVerdancy && (
          <p>
            因为你选择了{' '}
            <strong>
              <SpellLink spell={TALENTS_DRUID.VERDANCY_TALENT} />
            </strong>
            ，你应该尽量让生命绽放在其自然结束时绽放。过早刷新或在持续时间结束前转移目标可能导致绽放被跳过，请避免此类操作。
            <br />
            <strong>
              自然绽放触发率：{' '}
              {formatPercentage(this.actualNaturalBlooms / this.possibleNaturalBlooms, 1)}%
            </strong>
          </p>
        )}
        {hasPhoto && (
          <p>
            因为你选择了{' '}
            <strong>
              <SpellLink spell={TALENTS_DRUID.PHOTOSYNTHESIS_TALENT} />
            </strong>
            ，高激活时间尤为重要。通常情况下，生命绽放施加在自己身上效果最佳。
            {hasVerdancy && (
              <>
                但是因为你选择了 <SpellLink spell={TALENTS_DRUID.VERDANCY_TALENT} />
                ，施加在其他目标上的绽放效果也非常强大。
              </>
            )}
            {hasUndergrowth && (
              <>
                记住，
                <SpellLink spell={TALENTS_DRUID.UNDERGROWTH_TALENT} />{' '}
                允许你同时拥有两个生命绽放，它们都能从这些效果中受益！
              </>
            )}
            <br />
            自己身上的总激活时间：<strong>{formatPercentage(selfUptimePercent, 1)}%</strong> /
            其他目标的激活时间：<strong>{formatPercentage(othersUptimePercent, 1)}%</strong>
            {selfUptimePercent + othersUptimePercent > 1 && (
              <>
                {' '}
                <small>（由于可以同时拥有多个生命绽放，总值可能超过100%）</small>
              </>
            )}
          </p>
        )}
      </>
    );

    const data = (
      <div>
        <RoundedPanel>
          <strong>生命绽放激活时间</strong>
          {this.subStatistic()}
        </RoundedPanel>
      </div>
    );

    return explanationAndDataSubsection(explanation, data, GUIDE_CORE_EXPLANATION_PERCENT);
  }

  subStatistic() {
    const subBars = [];
    if (this.hasUndergrowth) {
      subBars.push({
        spells: [TALENTS_DRUID.UNDERGROWTH_TALENT],
        uptimes: mergeTimePeriods(this.undergrowthUptimes, this.owner.currentTimestamp),
        color: UNDERGROWTH_COLOR,
      });
    }

    return uptimeBarSubStatistic(
      this.owner.fight,
      {
        spells: [SPELLS.LIFEBLOOM_HOT_HEAL],
        uptimes: mergeTimePeriods(this.lifebloomUptimes, this.owner.currentTimestamp),
        color: LB_COLOR,
      },
      subBars,
      SubPercentageStyle.ABSOLUTE,
    );
  }
}

export default Lifebloom;
