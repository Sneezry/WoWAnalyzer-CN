import { ConvokeSpirits } from 'analysis/retail/druid/shared';
import { formatNumber, formatPercentage } from 'common/format';
import SPELLS from 'common/SPELLS';
import { SpellLink, Tooltip } from 'interface';
import { PassFailCheckmark } from 'interface/guide';
import InformationIcon from 'interface/icons/Information';
import { Options, SELECTED_PLAYER } from 'parser/core/Analyzer';
import { calculateEffectiveHealing } from 'parser/core/EventCalculateLib';
import Events, { ApplyBuffEvent, CastEvent, HealEvent, RefreshBuffEvent } from 'parser/core/Events';
import HotTracker, { Attribution } from 'parser/shared/modules/HotTracker';
import BoringSpellValueText from 'parser/ui/BoringSpellValueText';
import ItemPercentHealingDone from 'parser/ui/ItemPercentHealingDone';
import Statistic from 'parser/ui/Statistic';
import STATISTIC_CATEGORY from 'parser/ui/STATISTIC_CATEGORY';
import STATISTIC_ORDER from 'parser/ui/STATISTIC_ORDER';

import CooldownExpandable, {
  CooldownExpandableItem,
} from 'interface/guide/components/CooldownExpandable';
import { GUIDE_CORE_EXPLANATION_PERCENT } from 'analysis/retail/druid/restoration/Guide';
import { isFromHardcast } from 'analysis/retail/druid/restoration/normalizers/CastLinkNormalizer';
import HotTrackerRestoDruid from 'analysis/retail/druid/restoration/modules/core/hottracking/HotTrackerRestoDruid';
import { MutableAmount } from 'analysis/retail/druid/restoration/modules/spells/Flourish';
import { TALENTS_DRUID } from 'common/TALENTS';
import { explanationAndDataSubsection } from 'interface/guide/components/ExplanationRow';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import { isConvoking } from 'analysis/retail/druid/shared/spells/ConvokeSpirits';

const CONVOKED_HOTS = [
  SPELLS.REJUVENATION,
  SPELLS.REJUVENATION_GERMINATION,
  SPELLS.REGROWTH,
  SPELLS.WILD_GROWTH,
];
const CONVOKED_DIRECT_HEALS = [SPELLS.SWIFTMEND, SPELLS.REGROWTH];

const NATURES_SWIFTNESS_BOOST = 1;

const RECENT_FLOURISH_DURATION = 8_000;

/**
 * 恢复德鲁伊“万灵之召”扩展模块。包括治疗归属。
 * 可通过万灵之召施放的治疗技能：
 * * 回春术 - 追踪应用/刷新 - 使用HotTracker
 * * 愈合 - 追踪应用/刷新 - 使用HotTracker
 * * 迅捷治愈 - 追踪治疗 - 直接归属治疗
 * * 野性成长 - 追踪应用/刷新 - 使用HotTracker
 * * 繁茂 - 通过与繁茂模块的集成追踪应用/刷新
 */
class ConvokeSpiritsResto extends ConvokeSpirits {
  static dependencies = {
    ...ConvokeSpirits.dependencies,
    hotTracker: HotTrackerRestoDruid,
  };

  hotTracker!: HotTrackerRestoDruid;

  /** 记录每次万灵之召的追踪数据 - 注意索引0始终为空 */
  restoConvokeTracker: RestoConvokeCast[] = [];
  /** 上次繁茂施放的时间戳（如果没有则为null） */
  lastFlourishTimestamp?: number;

  constructor(options: Options) {
    super(options);

    this.addEventListener(
      Events.applybuff.by(SELECTED_PLAYER).spell(CONVOKED_HOTS),
      this.onRestoHotApply,
    );
    this.addEventListener(
      Events.refreshbuff.by(SELECTED_PLAYER).spell(CONVOKED_HOTS),
      this.onRestoHotApply,
    );
    this.addEventListener(
      Events.heal.by(SELECTED_PLAYER).spell(CONVOKED_DIRECT_HEALS),
      this.onRestoDirectHeal,
    );
    this.selectedCombatant.hasTalent(TALENTS_DRUID.FLOURISH_TALENT) &&
      this.addEventListener(
        Events.cast.by(SELECTED_PLAYER).spell(TALENTS_DRUID.FLOURISH_TALENT),
        this.onFlourishCast,
      );

    // 繁茂的治疗量通过繁茂模块追踪，该模块会调用此模块以更新归属。
  }

  onRestoHotApply(event: ApplyBuffEvent | RefreshBuffEvent) {
    if (!isFromHardcast(event) && isConvoking(this.selectedCombatant)) {
      this.hotTracker.addAttributionFromApply(this.currentConvokeAttribution, event);
      if (
        event.ability.guid === SPELLS.REGROWTH.id &&
        this.selectedCombatant.hasBuff(SPELLS.NATURES_SWIFTNESS.id)
      ) {
        this.hotTracker.addBoostFromApply(
          this.currentNsConvokeAttribution,
          NATURES_SWIFTNESS_BOOST,
          event,
        );
      }
    }
  }

  onRestoDirectHeal(event: HealEvent) {
    if (!isFromHardcast(event) && !event.tick && isConvoking(this.selectedCombatant)) {
      this.currentConvokeAttribution.healing += event.amount + (event.absorbed || 0);
      if (
        event.ability.guid === SPELLS.REGROWTH.id &&
        this.selectedCombatant.hasBuff(SPELLS.NATURES_SWIFTNESS.id)
      ) {
        this.currentNsConvokeAttribution.healing += calculateEffectiveHealing(
          event,
          NATURES_SWIFTNESS_BOOST,
        );
      }
    }
  }

  onConvoke(event: ApplyBuffEvent) {
    super.onConvoke(event);

    const totalAttribution = HotTracker.getNewAttribution('万灵之召 #' + this.cast);
    const flourishRateAttribution = { amount: 0 };
    const nsAttribution = HotTracker.getNewAttribution('自然迅捷 万灵之召 #' + this.cast);
    const rejuvsOnCast =
      this.hotTracker.getHotCount(SPELLS.REJUVENATION.id) +
      this.hotTracker.getHotCount(SPELLS.REJUVENATION_GERMINATION.id);
    const wgsOnCast = this.hotTracker.getHotCount(SPELLS.WILD_GROWTH.id);
    const recentlyFlourished =
      this.lastFlourishTimestamp !== undefined &&
      event.timestamp - this.lastFlourishTimestamp < RECENT_FLOURISH_DURATION;

    this.restoConvokeTracker[this.cast] = {
      totalAttribution,
      flourishRateAttribution,
      nsAttribution,
      rejuvsOnCast,
      wgsOnCast,
      recentlyFlourished,
    };
  }

  onFlourishCast(event: CastEvent) {
    this.lastFlourishTimestamp = event.timestamp;
  }

  get currentConvokeAttribution(): Attribution {
    return this.restoConvokeTracker[this.cast].totalAttribution;
  }

  get currentConvokeRateAttribution() {
    return this.restoConvokeTracker[this.cast].flourishRateAttribution;
  }

  get currentNsConvokeAttribution(): Attribution {
    return this.restoConvokeTracker[this.cast].nsAttribution;
  }

  get totalHealing(): number {
    return this.restoConvokeTracker.reduce(
      (sum, cast) => sum + cast.totalAttribution.healing + cast.flourishRateAttribution.amount,
      0,
    );
  }

  get convokeCount(): number {
    // 归属索引从1开始
    return this.restoConvokeTracker.length - 1;
  }

  get totalNsConvokeHealing(): number {
    return this.restoConvokeTracker.reduce((sum, cast) => sum + cast.nsAttribution.healing, 0);
  }

  get nsBoostedConvokeRegrowthCount(): number {
    return this.restoConvokeTracker.reduce((sum, cast) => sum + cast.nsAttribution.procs, 0);
  }

  get nsBoostedConvokeCount(): number {
    return this.restoConvokeTracker.filter((cast) => cast.nsAttribution.healing !== 0).length;
  }

  /** 指南片段显示每次万灵之召施放的详细情况 */
  get guideCastBreakdown() {
    const hasCenariusGuidance = this.selectedCombatant.hasTalent(
      TALENTS_DRUID.CENARIUS_GUIDANCE_TALENT,
    );
    const hasFlourish = this.selectedCombatant.hasTalent(TALENTS_DRUID.FLOURISH_TALENT);
    const hasReforestation = this.selectedCombatant.hasTalent(TALENTS_DRUID.REFORESTATION_TALENT);

    const explanation = (
      <p>
        <strong>
          <SpellLink spell={SPELLS.CONVOKE_SPIRITS} />
        </strong>{' '}
        是一个强力但带有随机性的爆发治疗技能。{' '}
        {hasCenariusGuidance && (
          <>
            由于 <SpellLink spell={TALENTS_DRUID.CENARIUS_GUIDANCE_TALENT} />
            ，它有很高的几率触发 <SpellLink spell={TALENTS_DRUID.FLOURISH_TALENT} />。
          </>
        )}{' '}
        它的短冷却时间和随机性意味着它应在冷却完成后尽快使用。它提供的直接治疗量{' '}
        {hasCenariusGuidance && '以及可能的繁茂触发 '}
        使得在使用万灵之召之前进行轻微的积累仍然是值得的。
      </p>
    );

    const data = (
      <div>
        <strong>每次施放的详细信息</strong>
        <small> - 点击展开</small>
        {this.convokeTracker.map((cast, ix) => {
          const restoCast = this.restoConvokeTracker[ix];
          const castTotalHealing =
            restoCast.totalAttribution.healing + restoCast.flourishRateAttribution.amount;

          const header = (
            <>
              @ {this.owner.formatTimestamp(cast.timestamp)} &mdash;{' '}
              <SpellLink spell={SPELLS.CONVOKE_SPIRITS} /> ({formatNumber(castTotalHealing)} 治疗量)
            </>
          );

          const wgRamp = restoCast.wgsOnCast > 0;
          const rejuvRamp = restoCast.rejuvsOnCast > 0;
          const noRecentFlourish = !restoCast.recentlyFlourished;
          const syncWithReforestation = !hasReforestation || cast.form === 'Tree of Life';
          const overallPerf =
            wgRamp && rejuvRamp && noRecentFlourish && syncWithReforestation
              ? QualitativePerformance.Good
              : QualitativePerformance.Fail;

          const checklistItems: CooldownExpandableItem[] = [];
          checklistItems.push({
            label: (
              <>
                <SpellLink spell={SPELLS.WILD_GROWTH} /> 积累
              </>
            ),
            result: <PassFailCheckmark pass={wgRamp} />,
            details: <>（{restoCast.wgsOnCast} 个HoT激活）</>,
          });
          checklistItems.push({
            label: (
              <>
                <SpellLink spell={SPELLS.REJUVENATION} /> 积累
              </>
            ),
            result: <PassFailCheckmark pass={rejuvRamp} />,
            details: <>（{restoCast.rejuvsOnCast} 个HoT激活）</>,
          });
          hasFlourish &&
            checklistItems.push({
              label: (
                <>
                  避免 <SpellLink spell={TALENTS_DRUID.FLOURISH_TALENT} /> 剪切{' '}
                  <Tooltip
                    hoverable
                    content={
                      <>
                        当你施放 <SpellLink spell={SPELLS.CONVOKE_SPIRITS} /> 和{' '}
                        <SpellLink spell={TALENTS_DRUID.FLOURISH_TALENT} />{' '}
                        时，万灵之召应始终优先。因为万灵之召可能触发繁茂并导致你剪切你的施法增益，而且万灵之召产生大量HoT，繁茂可以延长这些HoT。如果这里显示
                        <i className="glyphicon glyphicon-remove fail-mark" />
                        ，意味着你在该万灵之召之前施放了繁茂。
                      </>
                    }
                  >
                    <span>
                      <InformationIcon />
                    </span>
                  </Tooltip>
                </>
              ),
              result: <PassFailCheckmark pass={noRecentFlourish} />,
            });
          hasReforestation &&
            checklistItems.push({
              label: (
                <>
                  与 <SpellLink spell={TALENTS_DRUID.REFORESTATION_TALENT} /> 同步{' '}
                  <Tooltip
                    hoverable
                    content={
                      <>
                        <SpellLink spell={SPELLS.CONVOKE_SPIRITS} />{' '}
                        在生命之树形态下威力大幅增强。通过{' '}
                        <SpellLink spell={TALENTS_DRUID.REFORESTATION_TALENT} />{' '}
                        天赋，你可以大约每分钟触发一次，因此建议与万灵之召同步。
                      </>
                    }
                  >
                    <span>
                      <InformationIcon />
                    </span>
                  </Tooltip>
                </>
              ),
              result: <PassFailCheckmark pass={syncWithReforestation} />,
            });

          return (
            <CooldownExpandable
              header={header}
              checklistItems={checklistItems}
              perf={overallPerf}
              key={ix}
            />
          );
        })}
      </div>
    );

    return explanationAndDataSubsection(explanation, data, GUIDE_CORE_EXPLANATION_PERCENT);
  }

  statistic() {
    const hasCenariusGuidance = this.selectedCombatant.hasTalent(
      TALENTS_DRUID.CENARIUS_GUIDANCE_TALENT,
    );
    return (
      <Statistic
        wide
        position={STATISTIC_ORDER.OPTIONAL(8)} // 基于天赋层数的编号
        size="flexible"
        category={STATISTIC_CATEGORY.TALENTS}
        tooltip={
          <>
            {this.baseTooltip}
            <br />
            <br />
            治疗量是通过追踪万灵之召施放的治疗法术进行归属
            {hasCenariusGuidance && '，包括可能触发的繁茂施放'}.
            该治疗量包含通过触发的HoT获得的精通加成。
            {this.totalNsConvokeHealing !== 0 && (
              <>
                <br />
                <br />
                此外，你利用了 <SpellLink spell={SPELLS.NATURES_SWIFTNESS} />{' '}
                增强万灵之召的愈合治疗而不消耗增益的特性。自然迅捷在{' '}
                <strong>
                  {this.nsBoostedConvokeCount} 次万灵之召中的 {this.convokeCount}
                </strong>{' '}
                次处于激活状态，并且提升了{' '}
                <strong>{this.nsBoostedConvokeRegrowthCount} 次愈合</strong>，造成了{' '}
                <strong>
                  {formatPercentage(
                    this.owner.getPercentageOfTotalHealingDone(this.totalNsConvokeHealing),
                    1,
                  )}
                  %
                </strong>{' '}
                的总治疗量。该治疗量已包含在万灵之召的总治疗量中。
              </>
            )}
          </>
        }
        dropdown={
          <>
            <table className="table table-condensed">
              <thead>
                <tr>
                  <th>施放次数</th>
                  <th>时间</th>
                  <th>形态</th>
                  <th>治疗量</th>
                  <th>施放的法术</th>
                </tr>
              </thead>
              <tbody>
                {this.convokeTracker.map((convokeCast, index) => (
                  <tr key={index}>
                    <th scope="row">{index}</th>
                    <td>{this.owner.formatTimestamp(convokeCast.timestamp)}</td>
                    <td>{convokeCast.form}</td>
                    <td>
                      {formatNumber(
                        this.restoConvokeTracker[index].totalAttribution.healing +
                          this.restoConvokeTracker[index].flourishRateAttribution.amount,
                      )}
                    </td>
                    <td>
                      {convokeCast.spellIdToCasts.map((casts, spellId) => (
                        <div key={spellId}>
                          <SpellLink spell={spellId} /> {casts}
                        </div>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        }
      >
        <BoringSpellValueText spell={TALENTS_DRUID.CONVOKE_THE_SPIRITS_TALENT}>
          <ItemPercentHealingDone approximate amount={this.totalHealing} />
          <br />
        </BoringSpellValueText>
      </Statistic>
    );
  }
}

/** 追踪恢复德鲁伊在一次万灵之召施放中的特定事件 */
interface RestoConvokeCast {
  /** 此次万灵之召造成的所有治疗的归属对象 */
  totalAttribution: Attribution;
  /** 特别追踪由于繁茂触发的加速治疗 */
  flourishRateAttribution: MutableAmount;
  /** 自然迅捷增强万灵之召的愈合治疗但不消耗增益。此对象特别追踪其带来的治疗。 */
  nsAttribution: Attribution;
  /** 施放万灵之召时激活的野性成长数量 */
  wgsOnCast: number;
  /** 施放万灵之召时激活的回春术数量 */
  rejuvsOnCast: number;
  /** 如果玩家最近施放了繁茂为true（不应这么做，万灵之召应优先施放） */
  recentlyFlourished: boolean;
}

export default ConvokeSpiritsResto;
